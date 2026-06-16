import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import crypto from "crypto";

async function checkTenantAdmin(session: any, tenantId: string) {
  if (!session || !session.user) return false;
  if (session.user.role === "SUPERADMIN") return true;
  return session.user.role === "ADMIN" && session.user.tenantId === tenantId;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { 
      messages, 
      tenantId, 
      resources, 
      bookings, 
      devices, 
      checkinLogs, 
      activeDate,
      weekStart,
      activeTab,
      settingsForm,
      tenantName,
      tenantVertical,
      tenantTagline,
      tenantAiInstructions
    } = body;

    // 1. Enforce strict session checks
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden: Administrative access required" }, { status: 403 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing. Please configure GEMINI_API_KEY in the server environment." },
        { status: 400 }
      );
    }

    // 2. Format database context for administrative assistance
    const resourcesContext = (resources || []).map((r: any) => 
      `- Resource Name: "${r.name}" (ID: ${r.id}, Type: ${r.type}, Capacity: ${r.maxCapacity})${r.attributes?.room ? `, Room: ${r.attributes.room}` : ""}${r.attributes?.instructor ? `, Instructor: ${r.attributes.instructor}` : ""}`
    ).join("\n");

    const rulesContext = (resources || []).flatMap((r: any) => 
      (r.scheduleRules || []).map((rule: any) => 
        `- Rule for Resource "${r.name}": "${rule.name}" (ID: ${rule.id}, Day Index: ${rule.dayOfWeek} (0=Sun, 1=Mon, ..., 6=Sat), Time: ${rule.startTime}-${rule.endTime}, Price: ${rule.price} CZK, Capacity: ${rule.maxCapacity})`
      )
    ).join("\n");

    const bookingsContext = (bookings || []).slice(0, 15).map((b: any) => 
      `- Booking ID: "${b.id}" for "${b.userName}" on Resource "${b.resourceName}" from ${formatISOToDateTime(b.reservedFrom)} to ${formatISOToDateTime(b.reservedTo)} (Status: ${b.status})`
    ).join("\n");

    const devicesContext = (devices || []).map((d: any) => 
      `- IoT Device: "${d.name}" (ID: ${d.id}, Active: ${d.active}, Scanned Logs count: ${d.logsCount})`
    ).join("\n");

    const logsSummary = (checkinLogs || []).slice(0, 8).map((log: any) => 
      `- Scanned: ${formatISOToDateTime(log.scannedAt)} by ${log.userName} (${log.userEmail}) on device "${log.deviceName}" for resource "${log.resourceName}" -> Result: ${log.result}`
    ).join("\n");

    let verticalDescription = "";
    if (tenantVertical === "SPORTS_GROUND") {
      verticalDescription = `This venue is a sports ground facility (sports courts, playing fields, sectors).
You should speak to the user using sports ground terms in their language (e.g. in Czech: 'kurt', 'hřiště', 'sektor', 'plocha').`;
    } else if (tenantVertical === "CAPACITY_CLASS") {
      verticalDescription = `This venue is a group capacity class or wellness facility (e.g., saunas, yoga studios, fitness sessions, group entries).
You should speak to the user using wellness/capacity terms in their language (e.g. in Czech: 'sál', 'lekce', 'vstup', 'rezervace místa').
Never assume or refer to resources as tennis courts (kurty) or sports fields.`;
    } else if (tenantVertical === "EDUCATIONAL_COURSE") {
      verticalDescription = `This venue is an educational institution or training center (courses, lessons, classes).
You should speak using educational terms in their language (e.g. in Czech: 'lekce', 'kurz', 'výuka', 'třída').
Do not mention sports grounds or courts.`;
    } else if (tenantVertical === "EVENT_TICKETING") {
      verticalDescription = `This venue manages event ticketing (concerts, theater seats, events, entry slots).
You should speak using event ticketing terms in their language (e.g. in Czech: 'vstupenka', 'místo', 'sezení', 'akce').
Do not mention sports fields or classes.`;
    }

    // 3. Construct the administrative assistant prompt
    const systemPrompt = `You are ReKeeper, a warm, highly professional, and extremely intelligent AI timekeeper and gatekeeper for the ReSys Tenant Admin Panel.
You are currently helping the administrator of the venue "${tenantName || "ReSys Portal"}"${tenantTagline ? ` (tagline: "${tenantTagline}")` : ""}.

=== VENUE TYPE & TERMINOLOGY ===
${verticalDescription || "Use the resource names exactly as defined in the context."}
${tenantAiInstructions ? `\n=== CUSTOM VENUE INSTRUCTIONS & RULES ===\n${tenantAiInstructions}\n` : ""}
Your job is to assist the property manager (administrator) with configuring their venue, setting reservation rules, overseeing check-ins, and altering portal themes.

=== SAFETY & SECURITY GUARDRAILS ===
1. NO DELETIONS: You are strictly forbidden from deleting resources, deleting schedule rules, deleting IoT devices, or cancelling bookings directly. 
2. IF DELETION REQUESTED: You must politely refuse. Explain that for security reasons, deletions of resources, slots, or devices must be done manually by the admin in the UI using the red delete (trash) icons. 
3. DRAFTING MODALS UX: To add or edit resources, schedule rules, or devices, do not modify the database directly. Instead, call the drafting tools (like 'draft_resource', 'draft_rule', 'draft_device'). This will open the corresponding form modal in the admin's browser and pre-populate the fields for their final review and confirmation.
4. VALIDATIONS: 
   - Capacity values must be positive numbers between 1 and 1000.
   - Prices must be non-negative.
   - Start times must be before end times, formatted as HH:MM.

=== CONTEXT ===
- Tenant ID: "${tenantId}"
- Active Tab on Administrator Screen: "${activeTab || "overview"}"
- Active Date context: ${activeDate || "today"}
- Current Date/Time: ${new Date().toISOString()}
- Existing Resources:
${resourcesContext || "- None registered yet"}
- Configured Schedule Rules (Time Slots):
${rulesContext || "- None registered yet"}
- Active IoT Devices:
${devicesContext || "- None configured"}
- Recent Bookings context:
${bookingsContext || "- No recent bookings"}
- Recent Checkin Logs:
${logsSummary || "- No check-ins yet"}

=== BEHAVIOR & CONVERSATIONAL RULES ===
1. LANGUAGE: Always respond in the same language the user uses (e.g., Czech or English).
2. CONCISE & PROFESSIONAL (MAX 2-3 SENTENCES): Keep your replies brief, clear, and reassuring. Speak like a competent assistant. Avoid markdown tags like *, **, or bold headers in voice output.
3. ALWAYS GENERATE A TEXT REPLY: You must always provide a friendly, helpful conversational text response in every turn. The text reply must NEVER be empty or missing.
4. NAVIGATION: Proactively switch tabs using the 'navigate_tab' tool if the user asks questions about a specific area (e.g., "Ukaž mi zařízeni" -> call 'navigate_tab' with tab = "devices").
5. TWO-PASS COMPILATION: If you emit a tool call, you must also return a conversational reply indicating what action you drafted in the UI (e.g., "Otevřel jsem formulář pro vytvoření nového zdroje Sektor C. Zkontrolujte ho a klikněte na Uložit.").

=== TOOLS ===
You have access to tools to control the admin screen layout and form modals:`;

    const tools = [
      {
        functionDeclarations: [
          {
            name: "navigate_tab",
            description: "Switches the active tab in the admin panel dashboard screen.",
            parameters: {
              type: "OBJECT",
              properties: {
                tab: {
                  type: "STRING",
                  description: "The target tab: 'overview', 'resources', 'rules', 'bookings', 'devices', 'settings'."
                }
              },
              required: ["tab"]
            }
          },
          {
            name: "draft_resource",
            description: "Opens the Resource Creation/Editing modal and pre-fills form fields for the admin to review and save.",
            parameters: {
              type: "OBJECT",
              properties: {
                mode: {
                  type: "STRING",
                  description: "Either 'add' (to create a new resource) or 'edit' (to modify an existing one)."
                },
                id: {
                  type: "STRING",
                  description: "The unique ID of the resource (required if mode is 'edit')."
                },
                name: {
                  type: "STRING",
                  description: "The name of the resource, e.g. 'Kurt 3' or 'Sektor C'."
                },
                type: {
                  type: "STRING",
                  description: "The type of the resource: 'SPACE' (default) or 'EQUIPMENT'."
                },
                maxCapacity: {
                  type: "INTEGER",
                  description: "The maximum capacity of the resource (default is 10)."
                },
                instructor: {
                  type: "STRING",
                  description: "The name of the instructor/coach associated with this resource, if any."
                },
                room: {
                  type: "STRING",
                  description: "The room number/location identifier, if any."
                },
                parentId: {
                  type: "STRING",
                  description: "The parent resource ID if this is a sub-resource (e.g. Sektor A inside Celá plocha)."
                },
                surface: {
                  type: "STRING",
                  description: "Surface type: e.g. 'antuka', 'parkety', 'umělka'."
                },
                equipment: {
                  type: "STRING",
                  description: "Included equipment description."
                },
                price: {
                  type: "STRING",
                  description: "Default price attribute description."
                }
              },
              required: ["mode", "name"]
            }
          },
          {
            name: "draft_rule",
            description: "Opens the Schedule Rule (time slot) modal and pre-fills form fields.",
            parameters: {
              type: "OBJECT",
              properties: {
                mode: {
                  type: "STRING",
                  description: "Either 'add' or 'edit'."
                },
                id: {
                  type: "STRING",
                  description: "Rule ID (required if mode is 'edit')."
                },
                resourceId: {
                  type: "STRING",
                  description: "ID of the target resource this rule applies to."
                },
                name: {
                  type: "STRING",
                  description: "Descriptive name of the time slot, e.g. 'Odpolední trénink'."
                },
                daysOfWeek: {
                  type: "ARRAY",
                  items: { type: "INTEGER" },
                  description: "Array of days of week (0=Sunday, 1=Monday, ..., 6=Saturday) for bulk scheduling."
                },
                dayOfWeek: {
                  type: "INTEGER",
                  description: "Single day of week (required if mode is 'edit')."
                },
                startTime: {
                  type: "STRING",
                  description: "Start time in HH:MM format, e.g., '14:30'."
                },
                endTime: {
                  type: "STRING",
                  description: "End time in HH:MM format, e.g., '16:00'."
                },
                price: {
                  type: "NUMBER",
                  description: "Hourly or flat price in CZK."
                },
                maxCapacity: {
                  type: "INTEGER",
                  description: "Capacity limit for this slot."
                }
              },
              required: ["mode", "resourceId", "name", "startTime", "endTime"]
            }
          },
          {
            name: "draft_device",
            description: "Opens the IoT device modal and pre-fills details.",
            parameters: {
              type: "OBJECT",
              properties: {
                mode: {
                  type: "STRING",
                  description: "Either 'add' or 'edit'."
                },
                id: {
                  type: "STRING",
                  description: "The hardware slug ID of the reader device (required if mode is 'edit' or if configuring slug for new device)."
                },
                name: {
                  type: "STRING",
                  description: "Human-readable location title, e.g., 'Brána Jih'."
                },
                token: {
                  type: "STRING",
                  description: "API access token for the scanner."
                },
                active: {
                  type: "BOOLEAN",
                  description: "Whether the reader scanner is active."
                }
              },
              required: ["mode", "name"]
            }
          },
          {
            name: "draft_settings",
            description: "Updates the settings parameters form in the active UI layout (admin must click save to commit changes).",
            parameters: {
              type: "OBJECT",
              properties: {
                tagline: {
                  type: "STRING",
                  description: "Tenant tagline."
                },
                openTime: {
                  type: "STRING",
                  description: "Opening time of the facility, e.g. '08:00'."
                },
                closeTime: {
                  type: "STRING",
                  description: "Closing time of the facility, e.g. '22:00'."
                },
                adminEmails: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "List of administrator emails."
                }
              }
            }
          }
        ]
      }
    ];

    // 4. Map conversational messages to Gemini API format
    const contents: any[] = [];
    (messages || []).forEach((msg: any) => {
      const role = msg.role === "assistant" ? "model" : "user";
      
      if (role === "model" && msg.toolCalls && msg.toolCalls.length > 0) {
        contents.push({
          role: "model",
          parts: [
            { text: msg.content || "" },
            ...msg.toolCalls.map((tc: any) => ({
              functionCall: {
                name: tc.name,
                args: tc.args
              }
            }))
          ]
        });
        
        contents.push({
          role: "user",
          parts: msg.toolCalls.map((tc: any) => ({
            functionResponse: {
              name: tc.name,
              response: { result: "success" }
            }
          }))
        });
      } else {
        contents.push({
          role,
          parts: [{ text: msg.content || "" }]
        });
      }
    });

    // 5. Query Gemini with model fallbacks
    const response = await fetchWithRetry(geminiApiKey, contents, systemPrompt, tools);
    const data = await response.json();

    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find((p: any) => p.text);
    let functionCalls = candidate?.content?.parts
      ?.filter((p: any) => p.functionCall)
      ?.map((p: any) => ({
        name: p.functionCall.name,
        args: p.functionCall.args
      })) || [];

    let reply = textPart?.text || "";

    // 6. Conversational Two-Pass execution if reply was empty alongside a tool call
    if (functionCalls.length > 0 && !reply && candidate?.content?.parts) {
      console.log("Admin Assistant: tool calls returned with empty reply. Executing Pass 2...");
      
      contents.push({
        role: "model",
        parts: candidate.content.parts
      });

      contents.push({
        role: "user",
        parts: functionCalls.map((fc: any) => ({
          functionResponse: {
            name: fc.name,
            response: { result: "success" }
          }
        }))
      });

      try {
        const response2 = await fetchWithRetry(geminiApiKey, contents, systemPrompt, tools);
        const data2 = await response2.json();
        const candidate2 = data2.candidates?.[0];
        const textPart2 = candidate2?.content?.parts?.find((p: any) => p.text);
        
        reply = textPart2?.text || reply;
      } catch (err) {
        console.error("Error in Admin Pass 2 call:", err);
      }
    }

    if (!reply) {
      reply = "Rozumím, upravil jsem formuláře na obrazovce. Můžete je zkontrolovat a uložit.";
    }

    return NextResponse.json({
      reply,
      toolCalls: functionCalls
    });

  } catch (error: any) {
    console.error("Error in Admin AI Assistant API:", error);
    return NextResponse.json({
      reply: "Omlouvám se, ale při komunikaci s AI došlo k chybě. Zkuste to prosím znovu za okamžik.",
      toolCalls: []
    });
  }
}

// Helpers
async function fetchWithRetry(
  apiKey: string,
  contents: any,
  systemPrompt: string,
  tools: any
): Promise<Response> {
  const models = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-2.0-flash"
  ];
  
  let lastError: any = null;
  
  for (const model of models) {
    try {
      console.log(`Calling Gemini Admin Assistant using model: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools
          })
        }
      );
      
      if (response.ok) {
        return response;
      }
      const errText = await response.text();
      lastError = { status: response.status, text: errText };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(
    lastError ? `Gemini API failed. Last error: ${lastError.text || lastError.message}` : "Gemini API failed on all models."
  );
}

function formatISOToDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const day = d.getUTCDate();
    const month = d.getUTCMonth() + 1;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${day}.${month}. v ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  } catch (e) {
    return isoStr;
  }
}
