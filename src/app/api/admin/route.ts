import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { ensureDefaultData } from "@/lib/dbInit";

const execPromise = util.promisify(exec);

// Helper to verify if the requester has SUPERADMIN role
async function checkSuperadmin(session: any) {
  return session && session.user && session.user.role === "SUPERADMIN";
}

// Helper to verify if the requester has ADMIN/SUPERADMIN role for a specific tenant
async function checkTenantAdmin(session: any, tenantId: string) {
  if (!session || !session.user) return false;
  if (session.user.role === "SUPERADMIN") return true;
  return session.user.role === "ADMIN" && session.user.tenantId === tenantId;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultData();
    const session = await getServerSession(authOptions);
    if (!await checkSuperadmin(session)) {
      return NextResponse.json({ error: "Forbidden: Superadmin access required" }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        resources: {
          orderBy: {
            name: "asc",
          },
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
    await ensureDefaultData();
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // --- SUPERADMIN / HOST PORTAL ACTIONS ---
    const superadminActions = ["seed_reset", "tenant_upsert", "tenant_delete", "user_list", "user_upsert", "user_delete"];
    if (superadminActions.includes(action)) {
      if (!await checkSuperadmin(session)) {
        return NextResponse.json({ error: "Forbidden: Superadmin access required" }, { status: 403 });
      }
    }

    // --- TENANT ADMIN PORTAL ACTIONS ---
    const tenantAdminActions = [
      "tenant_settings_update",
      "resource_upsert",
      "resource_delete",
      "image_upload",
      "rule_upsert",
      "rule_delete",
      "device_upsert",
      "device_delete"
    ];
    let targetTenantId: string | undefined = undefined;
    if (tenantAdminActions.includes(action)) {
      targetTenantId = data?.tenantId || data?.id;
      if (!targetTenantId) {
        return NextResponse.json({ error: "tenantId or tenant id is required for this action" }, { status: 400 });
      }
      if (!await checkTenantAdmin(session, targetTenantId)) {
        return NextResponse.json({ error: "Forbidden: Unauthorized access to tenant settings" }, { status: 403 });
      }
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

      case "user_list": {
        const users = await prisma.user.findMany({
          include: {
            tenant: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            email: "asc"
          }
        });
        const sanitizedUsers = users.map(u => {
          const { passwordHash, ...rest } = u;
          return rest;
        });
        return NextResponse.json({ status: "success", users: sanitizedUsers });
      }

      case "user_upsert": {
        const { id, email, password, name, role, tenantId, phone } = data;
        
        const updateData: any = {
          email,
          name,
          role,
          tenantId: tenantId || null,
          phone: phone || null,
        };

        if (password && password.trim() !== "") {
          updateData.passwordHash = hashPassword(password);
        }

        let user;
        if (id) {
          user = await prisma.user.update({
            where: { id },
            data: updateData
          });
        } else {
          if (!password || password.trim() === "") {
            return NextResponse.json({ error: "Password is required for new users" }, { status: 400 });
          }
          // Check if user already exists
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) {
            return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
          }

          user = await prisma.user.create({
            data: {
              ...updateData,
              passwordHash: hashPassword(password)
            }
          });
        }

        const { passwordHash, ...sanitized } = user;
        return NextResponse.json({ status: "success", user: sanitized });
      }

      case "user_delete": {
        const { id } = data;
        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "User deleted." });
      }

      // --- TENANT ADMIN PORTAL ACTIONS ---
      case "resource_upsert": {
        const { id, tenantId, name, type, maxCapacity, attributes } = data;
        let resource;
        if (id) {
          const existing = await prisma.resource.findUnique({ where: { id } });
          if (!existing || existing.tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Resource does not belong to this tenant" }, { status: 403 });
          }
          resource = await prisma.resource.update({
            where: { id },
            data: { name, type, maxCapacity, attributes },
          });
        } else {
          if (tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Cannot create resource for another tenant" }, { status: 403 });
          }
          resource = await prisma.resource.create({
            data: { tenantId, name, type, maxCapacity, attributes },
          });
        }
        return NextResponse.json({ status: "success", resource });
      }

      case "resource_delete": {
        const { id } = data;
        const existing = await prisma.resource.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== targetTenantId) {
          return NextResponse.json({ error: "Forbidden: Resource does not belong to this tenant" }, { status: 403 });
        }
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
          const existingRule = await prisma.scheduleRule.findUnique({
            where: { id },
            include: { resource: true }
          });
          if (!existingRule || existingRule.resource.tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Rule does not belong to this tenant" }, { status: 403 });
          }
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
        } else {
          if (resourceId) {
            const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
            if (!resource || resource.tenantId !== targetTenantId) {
              return NextResponse.json({ error: "Forbidden: Resource does not belong to this tenant" }, { status: 403 });
            }
          }
          if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
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
      }

      case "rule_delete": {
        const { id } = data;
        const existing = await prisma.scheduleRule.findUnique({
          where: { id },
          include: { resource: true }
        });
        if (!existing || existing.resource.tenantId !== targetTenantId) {
          return NextResponse.json({ error: "Forbidden: Rule does not belong to this tenant" }, { status: 403 });
        }
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

        let device;
        if (id) {
          const existing = await prisma.checkinDevice.findUnique({ where: { id } });
          if (!existing || existing.tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Device does not belong to this tenant" }, { status: 403 });
          }
          device = await prisma.checkinDevice.update({
            where: { id },
            data: { name, active, ...tokenHashUpdate },
          });
        } else {
          if (tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Cannot create device for another tenant" }, { status: 403 });
          }
          device = await prisma.checkinDevice.create({
            data: { 
              id: id || undefined, 
              tenantId, 
              name, 
              tokenHash: token ? crypto.createHash("sha256").update(token).digest("hex") : crypto.createHash("sha256").update("default_tok_" + Math.random()).digest("hex"), 
              active
            },
          });
        }
        return NextResponse.json({ status: "success", device });
      }

      case "device_delete": {
        const { id } = data;
        const existing = await prisma.checkinDevice.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== targetTenantId) {
          return NextResponse.json({ error: "Forbidden: Device does not belong to this tenant" }, { status: 403 });
        }
        await prisma.checkinDevice.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "Device deleted." });
      }

      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
