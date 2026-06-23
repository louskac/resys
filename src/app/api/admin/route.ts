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
import { sendSSEUpdate } from "@/lib/sse";

const execPromise = util.promisify(exec);

// Helper to verify if the requester has SUPERADMIN role
async function checkSuperadmin(session: any) {
  return session && session.user && session.user.role === "SUPERADMIN";
}

// Helper to verify if the requester has ADMIN role for a specific tenant or is in custom adminEmails
async function checkTenantAdmin(session: any, tenantId: string) {
  if (!session || !session.user) return false;
  
  const userRole = session.user.role;
  const userTenantId = session.user.tenantId;
  const userEmail = session.user.email || "";

  // 1. Check if user is the explicit ADMIN of this tenant
  if (userRole === "ADMIN" && userTenantId === tenantId) {
    return true;
  }

  // 2. Check if their email is in the tenant's adminEmails list
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { attributes: true }
    });
    if (tenant) {
      const attributes = (tenant.attributes as Record<string, any>) || {};
      const adminEmails = attributes.adminEmails || [];
      if (adminEmails.includes(userEmail)) {
        return true;
      }
    }
  } catch (err) {
    console.error("Error checking tenant admin authorization:", err);
  }

  return false;
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
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "ATTENDED"] },
            paymentTransactionId: { not: null }
          },
          select: {
            price: true,
            paymentCutAmount: true
          }
        }
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
    const superadminActions = ["seed_reset", "tenant_upsert", "tenant_delete", "user_list", "user_upsert", "user_delete", "simulate_stripe_webhook"];
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
      "device_delete",
      "generate_onboarding_suggestions",
      "device_generate_pairing_code",
      "audit_logs_list",
      "tenant_subscription_update"
    ];
    let targetTenantId: string | undefined = undefined;
    if (tenantAdminActions.includes(action)) {
      targetTenantId = data?.tenantId;
      if (!targetTenantId && action === "tenant_settings_update" && data?.id) {
        targetTenantId = data.id;
      }
      if (!targetTenantId && action === "device_generate_pairing_code" && data?.tenantId) {
        targetTenantId = data.tenantId;
      }
      if (!targetTenantId && action === "audit_logs_list" && data?.tenantId) {
        targetTenantId = data.tenantId;
      }
      if (!targetTenantId && action === "tenant_subscription_update" && data?.tenantId) {
        targetTenantId = data.tenantId;
      }

      if (!targetTenantId) {
        // Fallback checks for actions referencing sub-entities
        if (action === "rule_upsert") {
          if (data?.resourceId) {
            const res = await prisma.resource.findUnique({ where: { id: data.resourceId } });
            targetTenantId = res?.tenantId;
          } else if (data?.id) {
            const rule = await prisma.scheduleRule.findUnique({
              where: { id: data.id },
              include: { resource: true }
            });
            targetTenantId = rule?.resource.tenantId;
          }
        } else if (action === "rule_delete" && data?.id) {
          const rule = await prisma.scheduleRule.findUnique({
            where: { id: data.id },
            include: { resource: true }
          });
          targetTenantId = rule?.resource.tenantId;
        } else if (action === "resource_delete" && data?.id) {
          const res = await prisma.resource.findUnique({ where: { id: data.id } });
          targetTenantId = res?.tenantId;
        } else if (action === "device_delete" && data?.id) {
          const dev = await prisma.checkinDevice.findUnique({ where: { id: data.id } });
          targetTenantId = dev?.tenantId;
        }
      }

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
        const { id, name, domain, vertical, ssoClientId, ssoClientSec, paymentCut } = data;
        
        const existingTenant = await prisma.tenant.findUnique({ where: { id } });
        
        const tenant = await prisma.tenant.upsert({
          where: { id },
          update: { name, domain, vertical, ssoClientId, ssoClientSec, paymentCut: paymentCut !== undefined && paymentCut !== null ? Number(paymentCut) : 3 },
          create: { id, name, domain, vertical, ssoClientId, ssoClientSec, paymentCut: paymentCut !== undefined && paymentCut !== null ? Number(paymentCut) : 3 },
        });

        let adminCreated = false;
        let adminEmail = "";
        let adminPassword = "";

        if (!existingTenant) {
          adminEmail = `admin@${id}.cz`;
          adminPassword = id;
          
          const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
          if (!existingAdmin) {
            await prisma.user.create({
              data: {
                email: adminEmail,
                passwordHash: hashPassword(adminPassword),
                name: `${name} Administrator`,
                role: "ADMIN",
                tenantId: id,
              }
            });
            adminCreated = true;
          }
        }

        return NextResponse.json({ 
          status: "success", 
          tenant,
          adminCreated,
          adminEmail,
          adminPassword
        });
      }

      case "simulate_stripe_webhook": {
        const { id, plan, status } = data;
        if (!id || !plan || !status) {
          return NextResponse.json({ error: "id, plan and status are required" }, { status: 400 });
        }
        
        let maxResourcesLimit = 2; // FREE
        let maxDevicesLimit = 1;
        
        if (plan === "STARTER") {
          maxResourcesLimit = 5;
          maxDevicesLimit = 3;
        } else if (plan === "PRO") {
          maxResourcesLimit = 15;
          maxDevicesLimit = 10;
        } else if (plan === "ENTERPRISE") {
          maxResourcesLimit = 99;
          maxDevicesLimit = 99;
        }

        const tenant = await prisma.tenant.update({
          where: { id },
          data: {
            subscriptionPlan: plan,
            subscriptionStatus: status,
            maxResourcesLimit,
            maxDevicesLimit
          }
        });

        // Record audit log
        try {
          await prisma.auditLog.create({
            data: {
              tenantId: id,
              userId: session?.user?.id || null,
              userName: session?.user?.name || "Superadmin",
              action: "PLAN_UPGRADE",
              entity: "Tenant",
              entityId: id,
              payload: { plan, status, maxResourcesLimit, maxDevicesLimit }
            }
          });
        } catch (auditErr) {
          console.error("Audit log subscription simulation failed", auditErr);
        }

        // Broadcast real-time update to the tenant admin dashboard clients
        sendSSEUpdate(id);

        return NextResponse.json({ status: "success", tenant });
      }

      case "generate_onboarding_suggestions": {
        const { tenantName, tenantVertical } = data;
        if (!tenantName || !tenantVertical) {
          return NextResponse.json({ error: "tenantName and tenantVertical are required" }, { status: 400 });
        }

        try {
          const systemInstruction = `You are ReKeeper, an advanced AI coordinator for the reservation SaaS portal ReSys. 
You suggest optimal default configurations for a brand new portal based on its name and business vertical in JSON format.
You must return a valid JSON object matching this schema exactly:
{
  "tagline": "A single best suggested portal tagline in Czech. Max 10 words. Do not refer to sports unless vertical is SPORTS_GROUND.",
  "taglineSuggestions": ["Catchy suggestion 1", "Catchy suggestion 2", "Catchy suggestion 3"],
  "resourceName": "Name of the first resource to reserve, e.g. 'Fotbalové hřiště 3G', 'Přednáškový sál', 'Tělocvična' in Czech.",
  "resourceCapacity": 10,
  "resourcePrice": 200,
  "openTime": "HH:MM",
  "closeTime": "HH:MM"
}`;
          const prompt = `Navrhni konfiguraci pro tenant Name: "${tenantName}", Vertical: "${tenantVertical}". Vygeneruj odpověď jako JSON.`;
          
          const resultText = await callGemini(prompt, systemInstruction);
          
          // Clean possible markdown codeblock formatting from gemini
          let cleanedJsonText = resultText.trim();
          if (cleanedJsonText.startsWith("```json")) {
            cleanedJsonText = cleanedJsonText.substring(7);
          }
          if (cleanedJsonText.endsWith("```")) {
            cleanedJsonText = cleanedJsonText.substring(0, cleanedJsonText.length - 3);
          }
          cleanedJsonText = cleanedJsonText.trim();

          const suggestions = JSON.parse(cleanedJsonText);
          return NextResponse.json({ status: "success", suggestions });
        } catch (err: any) {
          console.error("Gemini suggestion error:", err);
          // Fallbacks in case Gemini fails or key is missing
          const defaultSuggestions = {
            tagline: `${tenantName} - Váš spolehlivý rezervační portál`,
            taglineSuggestions: [
              `Vítejte v ${tenantName}`,
              `Rezervujte si své místo v ${tenantName}`,
              `Moderní rezervace pro ${tenantName}`
            ],
            resourceName: tenantVertical === "EDUCATIONAL_COURSE" ? "Přednášková učebna" : tenantVertical === "SPORTS_GROUND" ? "Hřiště 1" : "Hlavní sál",
            resourceCapacity: tenantVertical === "EDUCATIONAL_COURSE" ? 20 : tenantVertical === "SPORTS_GROUND" ? 12 : 10,
            resourcePrice: tenantVertical === "SPORTS_GROUND" ? 500 : 200,
            openTime: "08:00",
            closeTime: "20:00"
          };
          return NextResponse.json({ status: "success", suggestions: defaultSuggestions });
        }
      }

      case "onboarding_chat": {
        const { messages, state, tenantName, tenantVertical } = data;
        const tenantId = data?.tenantId || data?.id || "tenant";
        
        try {
          const systemInstruction = `You are ReKeeper, a warm, professional, and intelligent AI assistant onboarding a new venue administrator to the ReSys reservation SaaS portal.
Your job is to carry out a friendly conversation in Czech to guide them step-by-step through the 6 onboarding stages.

The current portal vertical is: ${tenantVertical}
The current portal name is: "${tenantName}"
The current tenant ID is: "${tenantId}"

(Adaptive vocabulary instructions: If vertical is SPORTS_GROUND, refer to resources as "kurt" or "hřiště". If CAPACITY_CLASS, refer to them as "sál" or "lekce/ wellness". If EDUCATIONAL_COURSE, refer to them as "učebna" or "kurz". If EVENT_TICKETING, refer to them as "akce" or "vstupenka".)

=== CURRENT GATHERED STATE ===
\${JSON.stringify(state, null, 2)}

=== REQUIRED ONBOARDING STAGES AND PARAMETERS ===
1. welcome (Vítejte): Welcome the user. You must immediately suggest 3 creative, smart taglines tailored to the name "${tenantName}" and vertical "${tenantVertical}" in Czech. Do not use generic placeholders. Ask if they like any of these or have their own tagline.
2. tagline (Prezentace): Slogan/tagline for the public presentation. Update state.tagline once selected.
3. hours (Provoz): Daily operating hours. You should update the 'openingHours' array (containing Pondělí-Neděle) to capture different weekday/weekend hours if specified by the user (e.g. "od pondělí do pátku 12:00 až 22:00, o víkendu 08:00 až 22:00"). If they just provide a single range, update all days with that range. Set 'closed' to true if they mention a day is closed/non-operational. Keep state.openTime and state.closeTime as the general/fallback open/close times. Do not populate the 'openingHours' array or set days to closed: true until the user has actually discussed/provided their operating hours (keep 'openingHours' as an empty array [] until then). For each day, dayOfWeek MUST follow JavaScript standard Date conventions: 1 = Pondělí (Monday), 2 = Úterý (Tuesday), 3 = Středa (Wednesday), 4 = Čtvrtek (Thursday), 5 = Pátek (Friday), 6 = Sobota (Saturday), 0 = Neděle (Sunday). Under no circumstances use 0 for Monday or 6 for Sunday.
4. resource (Zdroje): A list of resources (state.facilities). Each facility must have name, capacity, and hourly price. Guide them to configure their resources. The system can support nested resource hierarchies (e.g., multiple branches or locations, such as "Muzeum v Praze" and "Muzeum v Ostravě", each containing their own child spaces/courses, with potential unique operating hours and pricing per branch/space). Model these hierarchies dynamically under state.facilities when they explain their structure.
5. access (Přístup): Optional check-in IoT scanner. Ask if they have one or want to skip it. If they choose to skip, set state.device to null. If they configure it, set state.device to the configured scanner name/details (name, active).
6. summary (Shrnutí): Display a friendly summary of all settings, preview their administrative account details:
   - E-mail: admin@${tenantId}.cz
   - Heslo: ${tenantId}
   Reassure them that their data is completely isolated and secure (superadmins and developers cannot access their private data). Ask for their final confirmation to launch the portal.

=== DYNAMIC SKIPPING OF STEPS ===
- Any step/stage can be skipped. Do not use any special skip/skipped boolean fields in the state.
- If the user wants to skip a parameter or leave it empty, set/keep that parameter empty in the state:
  - If tagline is skipped, keep/set tagline as an empty string "".
  - If operating hours are skipped, keep/set openingHours as an empty array [], and openTime and closeTime as empty strings "".
  - If IoT scanner (access) is skipped, keep/set device as null.
- Under no circumstances should you fill skipped parameters with placeholder words like 'Přeskočeno' or default values (e.g. '08:00' / '22:00'). Just leave them empty or null.

=== RULES FOR UPDATING THE STATE ===
- Carefully analyze the latest user message. If they mention any values for tagline, openTime, closeTime, openingHours (days, openTime, closeTime, closed), facilities (names, prices, capacities, surfaces, subfacilities, operating hours), or device, merge these values into the STATE object.
- **N-Level Hierarchies & Multiple Branches**: The user can setup multiple top-level parent locations/branches (e.g., "Praha", "Ostrava") and multiple child resources nested under each. 
  - For parent locations/branches: Add them as facilities with no parentName (or empty string "").
  - For nested sub-resources (e.g., "Gastrostudio" in Prague branch): Add them as facilities with parentName set to match the exact name of their parent facility (e.g. parentName: "Praha"). 
  - This structure should support multiple branches and multiple child items under each, allowing infinite levels of depth.
  - **Whole Building Rent / Top-Level Price Mapping**: If the user provides a price for renting the "whole building", "celá budova", or "pronájem budovy" for a specific branch (e.g., "Praha" or "Ostrava"), you must set this price directly on that parent branch/location facility itself (e.g. set the price of the facility "Praha" to 190000, and set the price of the facility "Ostrava" to 116160). Under no circumstances should you create a separate child facility/resource named "Celá budova", "Celá budova NZM", or similar.
- **Facility/Branch-Specific Hours**: If a user indicates that a branch or resource has different operating hours from the default/global ones (e.g., "v Ostrave je každý den 09 - 17, v pondělí od 10", "Praha má od 9 do 18"), you MUST parse these specific hours and set them directly on that facility's entry in 'state.facilities'. Populate that facility's 'openTime' (e.g., "09:00"), 'closeTime' (e.g., "18:00"), AND generate a complete 7-day 'openingHours' array matching the structure of the global 'openingHours' but with the specific times for this facility (using dayOfWeek standard: 1=Pondělí, 2=Úterý, 3=Středa, 4=Čtvrtek, 5=Pátek, 6=Sobota, 0=Neděle). Do NOT write branch-specific hours into the global state-wide hours (state.openingHours/state.openTime/state.closeTime); keep global hours as the general fallback.
- **Robust Table/List Parsing**: The user might copy-paste a structured text table, spreadsheet columns, a CSV list, or a raw list of spaces/resources (e.g. showing "PROSTOR Cena bez DPH Cena vč. DPH ..."). If they do:
  1. Extract all rows as resources in the 'facilities' array.
  2. Parse the name of each space/resource cleanly.
  3. Parse the price into a numeric value (clean currency symbols like "Kč", spaces like "96 000" -> 96000, and remove rate intervals like "/ den", "/ hodina"). Prefer the price including VAT (Cena vč. DPH) if available, otherwise use the base price.
  4. Deduce default capacity (e.g., if a space, capacity defaults to 10, if a seat/accessory, capacity defaults to 1).
  5. Deduce hierarchy: if a row represents a sub-space (e.g. "Gastrocentrum – galerie ve skladové hale (2. NP)" -> parentName should be "Skladová hala"), map the parentName attribute correctly to match the parent resource name.
- If they request to change or remove something, apply that change to the STATE object.
- Keep all previously gathered information in the STATE unless the user specifically overrides it.
- Set "allInformationCollected" to true ONLY after the user has explicitly confirmed the final summary step.

=== CONVERSATIONAL INSTRUCTIONS ===
- Respond in natural, polite Czech (1-3 sentences max).
- Do not show JSON formatting in your reply. Speak naturally to the administrator.
- Guide them step-by-step. Focus on one stage at a time.
- **Handling Table/List Pastes**: If the user pasted a list/table of resources, confirm what resources you successfully parsed in your Czech response, let them know you've loaded them, and then gently ask follow-up questions for the remaining parameters (e.g., tagline, operating hours, IoT readers) that haven't been configured yet. Do not skip those remaining steps!
- Once all mandatory information is gathered and the user confirms the final summary step, set "allInformationCollected" to true in your JSON output.
- Set "currentStage" to the stage that best matches the current step being discussed or evaluated: "welcome", "tagline", "hours", "resource", "access", or "summary".

You MUST respond with a JSON object matching this schema exactly (do not output any markdown codeblock wrapper around the JSON, just the raw JSON text):
{
  "state": {
    "tagline": "string or empty",
    "openTime": "HH:MM or empty",
    "closeTime": "HH:MM or empty",
    "openingHours": [
      {
        "dayOfWeek": number, // 1=Pondělí, 2=Úterý, 3=Středa, 4=Čtvrtek, 5=Pátek, 6=Sobota, 0=Neděle
        "name": "string",
        "openTime": "HH:MM",
        "closeTime": "HH:MM",
        "closed": boolean
      }
    ],
    "facilities": [
      {
        "name": "string",
        "capacity": number,
        "price": number,
        "surface": "string or empty",
        "parentName": "string or empty",
        "openTime": "HH:MM or empty",
        "closeTime": "HH:MM or empty",
        "openingHours": [
          {
            "dayOfWeek": number, // 1=Pondělí, 2=Úterý, 3=Středa, 4=Čtvrtek, 5=Pátek, 6=Sobota, 0=Neděle
            "name": "string",
            "openTime": "HH:MM",
            "closeTime": "HH:MM",
            "closed": boolean
          }
        ]
      }
    ],
    "device": {
      "name": "string",
      "active": boolean
    } // or null if skipped/not set
  },
  "currentStage": "welcome" | "tagline" | "hours" | "resource" | "access" | "summary",
  "reply": "Conversational Czech response text",
  "allInformationCollected": boolean
}`;

          // Format messages for Gemini API
          const contents = (messages || []).map((msg: any) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          }));

          if (contents.length === 0) {
            contents.push({
              role: "user",
              parts: [{ text: "Dobrý den, jsem administrátor nového portálu." }]
            });
          }

          const resultText = await callGeminiOnboarding(contents, systemInstruction);
          
          let cleanedJsonText = resultText.trim();
          if (cleanedJsonText.startsWith("```json")) {
            cleanedJsonText = cleanedJsonText.substring(7);
          }
          if (cleanedJsonText.endsWith("```")) {
            cleanedJsonText = cleanedJsonText.substring(0, cleanedJsonText.length - 3);
          }
          cleanedJsonText = cleanedJsonText.trim();

          const resultObj = JSON.parse(cleanedJsonText);
          return NextResponse.json({ status: "success", ...resultObj });
        } catch (err: any) {
          console.error("Gemini onboarding chat error:", err);
          return NextResponse.json({ 
            status: "error",
            reply: "Omlouvám se, ale nepodařilo se mi zpracovat vaši zprávu. Zkuste to prosím znovu.",
            state: state,
            allInformationCollected: false
          });
        }
      }

      case "tenant_delete": {
        const { id } = data;
        await prisma.tenant.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "Tenant deleted." });
      }

      case "tenant_settings_update": {
        const { id, attributes } = data;
        
        // Auto-widen calendar view bounds to cover the active operating hours
        const adjustedAttributes = { ...(attributes || {}) };
        const hours = adjustedAttributes.openingHours;
        if (Array.isArray(hours) && hours.length > 0) {
          const openDays = hours.filter((d: any) => !d.closed && d.openTime && d.closeTime);
          if (openDays.length > 0) {
            let earliestOpen = adjustedAttributes.openTime || "24:00";
            let latestClose = adjustedAttributes.closeTime || "00:00";
            openDays.forEach((d: any) => {
              if (d.openTime < earliestOpen) earliestOpen = d.openTime;
              if (d.closeTime > latestClose) latestClose = d.closeTime;
            });
            if (!adjustedAttributes.openTime || adjustedAttributes.openTime > earliestOpen) {
              adjustedAttributes.openTime = earliestOpen;
            }
            if (!adjustedAttributes.closeTime || adjustedAttributes.closeTime < latestClose) {
              adjustedAttributes.closeTime = latestClose;
            }
          }
        }

        const tenant = await prisma.tenant.update({
          where: { id },
          data: { attributes: adjustedAttributes },
        });

        // Record audit log
        try {
          await prisma.auditLog.create({
            data: {
              tenantId: id,
              userId: session?.user?.id || null,
              userName: session?.user?.name || "System",
              action: "TENANT_SETTINGS_UPDATE",
              entity: "Tenant",
              entityId: id,
              payload: { attributes: adjustedAttributes }
            }
          });
        } catch (auditErr) {
          console.error("Audit log tenant settings update failed", auditErr);
        }

        return NextResponse.json({ status: "success", tenant });
      }

      case "tenant_subscription_update": {
        const { tenantId, plan, status } = data;
        if (!tenantId || !plan || !status) {
          return NextResponse.json({ error: "tenantId, plan and status are required" }, { status: 400 });
        }
        
        let maxResourcesLimit = 2; // FREE
        let maxDevicesLimit = 1;
        
        if (plan === "STARTER") {
          maxResourcesLimit = 5;
          maxDevicesLimit = 3;
        } else if (plan === "PRO") {
          maxResourcesLimit = 15;
          maxDevicesLimit = 10;
        } else if (plan === "ENTERPRISE") {
          maxResourcesLimit = 99;
          maxDevicesLimit = 99;
        }

        const tenant = await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            subscriptionPlan: plan,
            subscriptionStatus: status,
            maxResourcesLimit,
            maxDevicesLimit
          }
        });

        // Record audit log
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              userId: session?.user?.id || null,
              userName: session?.user?.name || "System",
              action: "PLAN_UPGRADE",
              entity: "Tenant",
              entityId: tenantId,
              payload: { plan, status, maxResourcesLimit, maxDevicesLimit }
            }
          });
        } catch (auditErr) {
          console.error("Audit log subscription update failed", auditErr);
        }

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

        // Auto-widen calendar view bounds to cover the active operating hours
        const adjustedAttributes = { ...(attributes || {}) };
        const hours = adjustedAttributes.openingHours;
        if (Array.isArray(hours) && hours.length > 0) {
          const openDays = hours.filter((d: any) => !d.closed && d.openTime && d.closeTime);
          if (openDays.length > 0) {
            let earliestOpen = adjustedAttributes.openTime || "24:00";
            let latestClose = adjustedAttributes.closeTime || "00:00";
            openDays.forEach((d: any) => {
              if (d.openTime < earliestOpen) earliestOpen = d.openTime;
              if (d.closeTime > latestClose) latestClose = d.closeTime;
            });
            if (!adjustedAttributes.openTime || adjustedAttributes.openTime > earliestOpen) {
              adjustedAttributes.openTime = earliestOpen;
            }
            if (!adjustedAttributes.closeTime || adjustedAttributes.closeTime < latestClose) {
              adjustedAttributes.closeTime = latestClose;
            }
          }
        }

        let resource;
        if (id) {
          const existing = await prisma.resource.findUnique({ where: { id } });
          if (!existing) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
          }
          if (existing.tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Resource does not belong to this tenant" }, { status: 403 });
          }
          resource = await prisma.resource.update({
            where: { id },
            data: { name, type, maxCapacity, attributes: adjustedAttributes },
          });

          // Record audit log
          try {
            await prisma.auditLog.create({
              data: {
                tenantId: targetTenantId!,
                userId: session?.user?.id || null,
                userName: session?.user?.name || "System",
                action: "RESOURCE_UPDATE",
                entity: "Resource",
                entityId: resource.id,
                payload: { name, type, maxCapacity }
              }
            });
          } catch (auditErr) {
            console.error("Audit log resource update failed", auditErr);
          }
        } else {
          if (tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Cannot create resource for another tenant" }, { status: 403 });
          }

          // Enforce plan limits
          const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
          const currentCount = await prisma.resource.count({ where: { tenantId } });
          if (tenant && currentCount >= tenant.maxResourcesLimit) {
            return NextResponse.json({ 
              error: `Plan limit exceeded: Your ${tenant.subscriptionPlan} plan allows a maximum of ${tenant.maxResourcesLimit} resources. Upgrade your plan to add more.` 
            }, { status: 400 });
          }

          resource = await prisma.resource.create({
            data: { tenantId, name, type, maxCapacity, attributes: adjustedAttributes },
          });

          // Record audit log
          try {
            await prisma.auditLog.create({
              data: {
                tenantId: targetTenantId!,
                userId: session?.user?.id || null,
                userName: session?.user?.name || "System",
                action: "RESOURCE_CREATE",
                entity: "Resource",
                entityId: resource.id,
                payload: { name, type, maxCapacity }
              }
            });
          } catch (auditErr) {
            console.error("Audit log resource creation failed", auditErr);
          }
        }
        return NextResponse.json({ status: "success", resource });
      }

      case "resource_delete": {
        const { id } = data;
        const existing = await prisma.resource.findUnique({ where: { id } });
        if (!existing) {
          return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }
        if (existing.tenantId !== targetTenantId) {
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
          if (!existingRule) {
            return NextResponse.json({ error: "Rule not found" }, { status: 404 });
          }
          if (existingRule.resource.tenantId !== targetTenantId) {
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

          // Record audit log
          try {
            await prisma.auditLog.create({
              data: {
                tenantId: targetTenantId!,
                userId: session?.user?.id || null,
                userName: session?.user?.name || "System",
                action: "RULE_UPDATE",
                entity: "ScheduleRule",
                entityId: rule.id,
                payload: { name, startTime, endTime, price }
              }
            });
          } catch (auditErr) {
            console.error("Audit log rule update failed", auditErr);
          }

          return NextResponse.json({ status: "success", rule });
        } else {
          if (resourceId) {
            const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
            if (!resource) {
              return NextResponse.json({ error: "Resource not found" }, { status: 404 });
            }
            if (resource.tenantId !== targetTenantId) {
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

            // Record audit log
            try {
              await prisma.auditLog.create({
                data: {
                  tenantId: targetTenantId!,
                  userId: session?.user?.id || null,
                  userName: session?.user?.name || "System",
                  action: "RULE_CREATE_BATCH",
                  entity: "ScheduleRule",
                  payload: { name, startTime, endTime, price, daysCount: daysOfWeek.length }
                }
              });
            } catch (auditErr) {
              console.error("Audit log rule batch creation failed", auditErr);
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

            // Record audit log
            try {
              await prisma.auditLog.create({
                data: {
                  tenantId: targetTenantId!,
                  userId: session?.user?.id || null,
                  userName: session?.user?.name || "System",
                  action: "RULE_CREATE",
                  entity: "ScheduleRule",
                  entityId: rule.id,
                  payload: { name, startTime, endTime, price }
                }
              });
            } catch (auditErr) {
              console.error("Audit log rule creation failed", auditErr);
            }

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
        if (!existing) {
          return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }
        if (existing.resource.tenantId !== targetTenantId) {
          return NextResponse.json({ error: "Forbidden: Rule does not belong to this tenant" }, { status: 403 });
        }
        await prisma.scheduleRule.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "Schedule rule deleted." });
      }

      case "device_upsert": {
        const { id, tenantId, name, token, active, isNew } = data;
        
        let tokenHashUpdate = {};
        if (token && token.trim() !== "") {
          const hashed = crypto.createHash("sha256").update(token).digest("hex");
          tokenHashUpdate = { tokenHash: hashed };
        }

        let device;
        if (id && !isNew) {
          const existing = await prisma.checkinDevice.findUnique({ where: { id } });
          if (!existing) {
            return NextResponse.json({ error: "Device not found" }, { status: 404 });
          }
          if (existing.tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Device does not belong to this tenant" }, { status: 403 });
          }
          device = await prisma.checkinDevice.update({
            where: { id },
            data: { name, active, ...tokenHashUpdate },
          });

          // Record audit log
          try {
            await prisma.auditLog.create({
              data: {
                tenantId: targetTenantId!,
                userId: session?.user?.id || null,
                userName: session?.user?.name || "System",
                action: "DEVICE_UPDATE",
                entity: "CheckinDevice",
                entityId: device.id,
                payload: { name, active }
              }
            });
          } catch (auditErr) {
            console.error("Audit log device update failed", auditErr);
          }
        } else {
          if (tenantId !== targetTenantId) {
            return NextResponse.json({ error: "Forbidden: Cannot create device for another tenant" }, { status: 403 });
          }

          if (id) {
            const existing = await prisma.checkinDevice.findUnique({ where: { id } });
            if (existing) {
              return NextResponse.json({ error: "Zařízení s tímto ID již existuje." }, { status: 400 });
            }
          }

          // Enforce plan limits
          const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
          const currentCount = await prisma.checkinDevice.count({ where: { tenantId } });
          if (tenant && currentCount >= tenant.maxDevicesLimit) {
            return NextResponse.json({ 
              error: `Plan limit exceeded: Your ${tenant.subscriptionPlan} plan allows a maximum of ${tenant.maxDevicesLimit} devices. Upgrade your plan to add more.` 
            }, { status: 400 });
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

          // Record audit log
          try {
            await prisma.auditLog.create({
              data: {
                tenantId: targetTenantId!,
                userId: session?.user?.id || null,
                userName: session?.user?.name || "System",
                action: "DEVICE_CREATE",
                entity: "CheckinDevice",
                entityId: device.id,
                payload: { name, active }
              }
            });
          } catch (auditErr) {
            console.error("Audit log device creation failed", auditErr);
          }
        }
        return NextResponse.json({ status: "success", device });
      }

      case "device_delete": {
        const { id } = data;
        const existing = await prisma.checkinDevice.findUnique({ where: { id } });
        if (!existing) {
          return NextResponse.json({ error: "Device not found" }, { status: 404 });
        }
        if (existing.tenantId !== targetTenantId) {
          return NextResponse.json({ error: "Forbidden: Device does not belong to this tenant" }, { status: 403 });
        }
        await prisma.checkinDevice.delete({ where: { id } });
        return NextResponse.json({ status: "success", message: "Device deleted." });
      }

      case "device_generate_pairing_code": {
        const { tenantId, name } = data;
        if (!tenantId || !name) {
          return NextResponse.json({ error: "tenantId and name are required" }, { status: 400 });
        }

        // Generate 6-digit code like "123-456"
        const pCode = `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
        const pairingExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        const device = await prisma.checkinDevice.create({
          data: {
            tenantId,
            name,
            tokenHash: crypto.createHash("sha256").update("temp_" + pCode + Math.random()).digest("hex"),
            pairingCode: pCode,
            pairingExpiresAt,
            status: "OFFLINE",
            active: false
          }
        });

        // Record audit log
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              userId: session?.user?.id || null,
              userName: session?.user?.name || "System",
              action: "DEVICE_PAIRING_CODE_GEN",
              entity: "CheckinDevice",
              entityId: device.id,
              payload: { pairingCode: pCode, name }
            }
          });
        } catch (auditErr) {
          console.error("Audit log pairing generation failed", auditErr);
        }

        return NextResponse.json({ status: "success", deviceId: device.id, pairingCode: pCode });
      }

      case "audit_logs_list": {
        const { tenantId } = data;
        if (!tenantId) {
          return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
        }

        const logs = await prisma.auditLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 100
        });

        return NextResponse.json({ status: "success", logs });
      }

      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function callGemini(prompt: string, systemInstruction: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.0-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Calling Gemini in Admin Route using model: ${model}`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );
      if (res.ok) {
        const json = await res.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      lastError = await res.text();
    } catch (err: any) {
      lastError = err;
    }
  }
  throw new Error(`Gemini API failed: ${lastError?.message || lastError}`);
}

async function callGeminiOnboarding(contents: any[], systemInstruction: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.0-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Calling Gemini Onboarding using model: ${model}`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );
      if (res.ok) {
        const json = await res.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      lastError = await res.text();
    } catch (err: any) {
      lastError = err;
    }
  }
  throw new Error(`Gemini API failed: ${lastError?.message || lastError}`);
}
