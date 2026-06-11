import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, resources, existingBookings, currentDate, weekStart, activeResourceId } = body;

    // Get API key from headers (client-supplied) or server env
    const apiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing. Please set GEMINI_API_KEY or supply it in the chat settings." },
        { status: 400 }
      );
    }

    // Map conversation messages to Gemini contents format
    // Note: Gemini roles are 'user' and 'model'
    const contents = (messages || []).map((msg: any) => {
      const role = msg.role === "assistant" ? "model" : "user";
      
      // If there were tool calls in this model message, format them (optional, but good for history stability)
      if (role === "model" && msg.toolCalls) {
        return {
          role,
          parts: [
            { text: msg.content || "" },
            ...msg.toolCalls.map((tc: any) => ({
              functionCall: {
                name: tc.name,
                args: tc.args
              }
            }))
          ]
        };
      }
      
      return {
        role,
        parts: [{ text: msg.content }]
      };
    });

    // Construct the context system instruction
    const resourcesContext = (resources || []).map((r: any) => `- Name: "${r.name}" (ID: ${r.id})`).join("\n");
    const bookingsContext = (existingBookings || []).map((b: any) => {
      const dayNames = ["Pondělí/Monday", "Úterý/Tuesday", "Středa/Wednesday", "Čtvrtek/Thursday", "Pátek/Friday", "Sobota/Saturday", "Neděle/Sunday"];
      const dayLabel = dayNames[b.dayIndex] || `Day ${b.dayIndex}`;
      return `- Resource: "${b.resourceName || 'Plocha'}" (ID: ${b.resourceId}) on ${dayLabel} (dayIndex: ${b.dayIndex}) from ${formatDecimalHour(b.startHour)} to ${formatDecimalHour(b.startHour + b.durationHours)} (Reserved by: ${b.name || 'Private'})`;
    }).join("\n");

    const systemPrompt = `You are a helpful, high-fidelity AI reservation assistant for the ReSys booking portal.
Your job is to help the user search, highlight, draft, and confirm bookings in the system.

=== CONTEXT ===
- Current Date/Time: ${currentDate || new Date().toISOString()}
- Current Week Start (Monday): ${weekStart || "2026-06-08"}
- Active Selected Resource ID in UI: ${activeResourceId || "none"}

- Available Resources in this venue:
${resourcesContext || "- None available"}

- Existing confirmed bookings for this week (which represents OCCUPIED times you MUST NOT book over):
${bookingsContext || "- No bookings, calendar is completely free!"}

=== BEHAVIOR RULES ===
1. LANGUAGE: Always respond in the same language the user uses. If they speak Czech (e.g. "Ahoj", "rezervovat"), respond in Czech. If they speak English, respond in English.
2. CONFLICT RESOLUTION: When the user requests a booking time, check the "existing confirmed bookings" list:
   - If there is an overlap (the resource is occupied), explain the conflict politely.
   - Look for alternative options: either a different resource that is free at that time, or an earlier/later time slot on the same resource. Propose these options (e.g. "Kurt 1 je obsazený, ale Kurt 2 je volný, nebo můžeme posunout rezervaci na 17:30").
   - Highlight the slot you are suggesting or proposing using the 'highlight_slot' tool.
   - Report the conflict details by calling the 'report_booking_status' tool with hasConflict = true and details about the conflict.
3. DRAFT BOOKING: When the user indicates a specific slot they want to book (and you've verified it's free), call the 'propose_draft_booking' tool to draw it on their calendar screen in real-time. Ask them: "I've drafted this booking on your screen, does it look correct?"
4. CONFIRMATION: The booking is NOT finalized until they explicitly say "yes", "confirm", "potvrdit", "ano", etc. Once they confirm the drafted booking, call 'confirm_current_booking' to execute the booking write.
5. SCREEN NAVIGATION: If they ask to view a specific day/week (e.g., "Ukaž mi příští středu"), call the 'navigate_date' tool to scroll/navigate their screen to that date.
6. STATE SYNC: Call the 'report_booking_status' tool whenever the user mentions or updates parameters (date, time, resource, client name) to synchronize the visual Booking Console chips on the screen.

=== TOOLS ===
You have access to function calling tools to control the user's browser screen in real-time. Use them proactively!`;

    // Define function declarations for Gemini
    const tools = [
      {
        functionDeclarations: [
          {
            name: "navigate_date",
            description: "Scrolls or navigates the calendar UI to a specific date. Use when user wants to look at a specific day/week.",
            parameters: {
              type: "OBJECT",
              properties: {
                date: {
                  type: "STRING",
                  description: "The target date in UTC YYYY-MM-DD format, e.g., '2026-06-15'."
                }
              },
              required: ["date"]
            }
          },
          {
            name: "select_resource",
            description: "Filters or selects a specific resource (e.g. Court 1, Sektor A) on the screen.",
            parameters: {
              type: "OBJECT",
              properties: {
                resourceId: {
                  type: "STRING",
                  description: "The unique ID of the resource."
                }
              },
              required: ["resourceId"]
            }
          },
          {
            name: "highlight_slot",
            description: "Visually highlights a specific time range in the calendar grid with a pulsing neon outline. Use to draw attention to suggested or recommended free times.",
            parameters: {
              type: "OBJECT",
              properties: {
                resourceId: {
                  type: "STRING",
                  description: "The resource ID to highlight (optional, defaults to currently selected)."
                },
                dayIndex: {
                  type: "INTEGER",
                  description: "The day index: 0 (Monday) to 6 (Sunday)."
                },
                startHour: {
                  type: "NUMBER",
                  description: "The decimal start hour of the slot, e.g. 14.5 for 14:30."
                },
                duration: {
                  type: "NUMBER",
                  description: "The duration of the slot in hours, e.g. 1.0 or 1.5."
                }
              },
              required: ["dayIndex", "startHour", "duration"]
            }
          },
          {
            name: "propose_draft_booking",
            description: "Draws a live purple draft booking directly onto the user's calendar grid. Pre-fills the reservation form. Use when user agrees to book a specific slot.",
            parameters: {
              type: "OBJECT",
              properties: {
                resourceId: {
                  type: "STRING",
                  description: "The resource ID to book."
                },
                dayIndex: {
                  type: "INTEGER",
                  description: "The day index: 0 (Monday) to 6 (Sunday)."
                },
                startHour: {
                  type: "NUMBER",
                  description: "The decimal start hour, e.g. 16.0 for 16:00."
                },
                duration: {
                  type: "NUMBER",
                  description: "The duration in hours, e.g. 1.0."
                },
                userName: {
                  type: "STRING",
                  description: "The name of the user to log the booking for."
                },
                userEmail: {
                  type: "STRING",
                  description: "The user's email address (optional)."
                }
              },
              required: ["resourceId", "dayIndex", "startHour", "duration", "userName"]
            }
          },
          {
            name: "confirm_current_booking",
            description: "Finalizes and submits the booking to the backend database. Call this ONLY after the user explicitly says 'yes', 'confirm', or 'ano' to create the booking.",
            parameters: {
              type: "OBJECT",
              properties: {}
            }
          },
          {
            name: "report_booking_status",
            description: "Reports the current extracted booking parameters and conflict status to update the visual booking console chips on the screen. Call this whenever parameters are set/updated or a conflict is detected.",
            parameters: {
              type: "OBJECT",
              properties: {
                resourceId: {
                  type: "STRING",
                  description: "The resource ID."
                },
                dayIndex: {
                  type: "INTEGER",
                  description: "The day index: 0 (Monday) to 6 (Sunday)."
                },
                startHour: {
                  type: "NUMBER",
                  description: "Decimal start hour, e.g., 14.5 for 14:30."
                },
                duration: {
                  type: "NUMBER",
                  description: "Duration in hours, e.g., 1.5."
                },
                userName: {
                  type: "STRING",
                  description: "Client name."
                },
                userEmail: {
                  type: "STRING",
                  description: "Client email (optional)."
                },
                hasConflict: {
                  type: "BOOLEAN",
                  description: "True if there is an overlap conflict with another booking."
                },
                conflictMessage: {
                  type: "STRING",
                  description: "Reason/description of the conflict in the user's language."
                },
                suggestedAlternativeTime: {
                  type: "NUMBER",
                  description: "Decimal start hour of a free alternative slot."
                },
                suggestedAlternativeResourceId: {
                  type: "STRING",
                  description: "Resource ID of a free alternative slot."
                }
              }
            }
          }
        ]
      }
    ];

    // Call Gemini API via fetch
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          tools
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error response:", errText);
      return NextResponse.json(
        { error: `Gemini API returned an error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Parse response content and function calls
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find((p: any) => p.text);
    const functionCalls = candidate?.content?.parts
      ?.filter((p: any) => p.functionCall)
      ?.map((p: any) => ({
        name: p.functionCall.name,
        args: p.functionCall.args
      })) || [];

    const reply = textPart?.text || "";

    return NextResponse.json({
      reply,
      toolCalls: functionCalls
    });
  } catch (error: any) {
    console.error("Error in AI Assistant API route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// Helpers
function formatDecimalHour(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
