import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";

const execPromise = util.promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        resources: {
          include: {
            scheduleRules: true,
          },
        },
        devices: true,
      },
    });
    return NextResponse.json(tenants);
  } catch (error: any) {
    console.error("Admin API GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    switch (action) {
      // --- SUPERADMIN / HOST PORTAL ACTIONS ---
      case "seed_reset": {
        try {
          const seedPath = `${process.cwd()}/prisma/seed.js`;
          await execPromise(`node ${seedPath}`);
          return NextResponse.json({ status: "success", message: "Database re-seeded successfully." });
        } catch (err: any) {
          console.error("Re-seed execution error:", err);
          return NextResponse.json({ error: "Failed to seed database: " + err.message }, { status: 500 });
        }
      }
      
      case "tenant_upsert": {
        const { id, name, domain, vertical, ssoClientId, ssoClientSec } = data;
        const tenant = await prisma.tenant.upsert({
          where: { id },
          update: { name, domain, vertical, ssoClientId, ssoClientSec },
          create: { id, name, domain, vertical, ssoClientId, ssoClientSec },
        });
        return NextResponse.json({ status: "success", tenant });
      }

      case "tenant_delete": {
        const { id } = data;
        await prisma.tenant.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "Tenant deleted." });
      }

      case "tenant_settings_update": {
        const { id, attributes } = data;
        const tenant = await prisma.tenant.update({
          where: { id },
          data: { attributes },
        });
        return NextResponse.json({ status: "success", tenant });
      }

      // --- TENANT ADMIN PORTAL ACTIONS ---
      case "resource_upsert": {
        const { id, tenantId, name, type, maxCapacity, attributes } = data;
        const resource = await prisma.resource.upsert({
          where: { id: id || "temp-uuid-placeholder-non-existent" },
          update: { name, type, maxCapacity, attributes },
          create: { tenantId, name, type, maxCapacity, attributes },
        });
        return NextResponse.json({ status: "success", resource });
      }

      case "resource_delete": {
        const { id } = data;
        await prisma.resource.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "Resource deleted." });
      }

      case "image_upload": {
        const { tenantId, base64Data } = data;
        if (!tenantId || !base64Data) {
          return NextResponse.json({ error: "Missing tenantId or base64Data" }, { status: 400 });
        }

        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let cleanBase64 = base64Data;
        let ext = "png";
        if (matches && matches.length === 3) {
          cleanBase64 = matches[2];
          const mimeType = matches[1];
          if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
          else if (mimeType.includes("gif")) ext = "gif";
          else if (mimeType.includes("webp")) ext = "webp";
        }

        const buffer = Buffer.from(cleanBase64, "base64");
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${tenantId}-banner.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        
        fs.writeFileSync(filePath, buffer);
        const imageUrl = `/uploads/${fileName}`;

        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId }
        });

        const currentAttributes = (tenant?.attributes as Record<string, any>) || {};
        const updatedAttributes = {
          ...currentAttributes,
          bannerImage: imageUrl
        };

        await prisma.tenant.update({
          where: { id: tenantId },
          data: { attributes: updatedAttributes }
        });

        return NextResponse.json({ status: "success", imageUrl });
      }

      case "rule_upsert": {
        const { id, resourceId, name, dayOfWeek, startTime, endTime, price, maxCapacity, daysOfWeek } = data;
        
        if (id) {
          const rule = await prisma.scheduleRule.update({
            where: { id },
            data: { 
              name, 
              dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? parseInt(dayOfWeek, 10) : null, 
              startTime, 
              endTime, 
              price: parseFloat(price), 
              maxCapacity: parseInt(maxCapacity, 10) 
            },
          });
          return NextResponse.json({ status: "success", rule });
        } else if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
          const createdRules = [];
          for (const dIndex of daysOfWeek) {
            const rule = await prisma.scheduleRule.create({
              data: {
                resourceId,
                name,
                dayOfWeek: parseInt(dIndex, 10),
                startTime,
                endTime,
                price: parseFloat(price),
                maxCapacity: parseInt(maxCapacity, 10),
              }
            });
            createdRules.push(rule);
          }
          return NextResponse.json({ status: "success", rules: createdRules });
        } else {
          const rule = await prisma.scheduleRule.create({
            data: { 
              resourceId, 
              name, 
              dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? parseInt(dayOfWeek, 10) : null, 
              startTime, 
              endTime, 
              price: parseFloat(price), 
              maxCapacity: parseInt(maxCapacity, 10) 
            },
          });
          return NextResponse.json({ status: "success", rule });
        }
      }

      case "rule_delete": {
        const { id } = data;
        await prisma.scheduleRule.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "Schedule rule deleted." });
      }

      case "device_upsert": {
        const { id, tenantId, name, token, active } = data;
        
        let tokenHashUpdate = {};
        if (token && token.trim() !== "") {
          const hashed = crypto.createHash("sha256").update(token).digest("hex");
          tokenHashUpdate = { tokenHash: hashed };
        }

        const device = await prisma.checkinDevice.upsert({
          where: { id: id || "temp-uuid-placeholder-non-existent" },
          update: { name, active, ...tokenHashUpdate },
          create: { 
            id: id || undefined, 
            tenantId, 
            name, 
            tokenHash: token ? crypto.createHash("sha256").update(token).digest("hex") : crypto.createHash("sha256").update("default_tok_" + Math.random()).digest("hex"), 
            active: active ?? true 
          },
        });
        return NextResponse.json({ status: "success", device });
      }

      case "device_delete": {
        const { id } = data;
        await prisma.checkinDevice.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "Check-in device deleted." });
      }

      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
