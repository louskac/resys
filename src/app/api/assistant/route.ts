import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, resources, existingBookings, currentDate, weekStart, activeResourceId, loggedInUser } = body;

    // Get API keys from headers (client-supplied) or server env
    const clientKey = req.headers.get("x-gemini-api-key") || req.headers.get("x-openai-api-key");
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Auto-detect if we should use OpenAI:
    // 1. If the client supplied a key starting with "sk-"
    // 2. If no client key, but we have OPENAI_API_KEY in env
    // 3. If the env GEMINI_API_KEY starts with "sk-" (misconfiguration backup)
    const useOpenAI = (clientKey && clientKey.startsWith("sk-")) || 
                     (!clientKey && !!openaiApiKey) || 
                     (geminiApiKey && geminiApiKey.startsWith("sk-"));

    const activeApiKey = useOpenAI
      ? (clientKey?.startsWith("sk-") ? clientKey : openaiApiKey)
      : (clientKey || geminiApiKey);

    if (!activeApiKey) {
      return NextResponse.json(
        { error: "API key is missing. Please configure GEMINI_API_KEY or OPENAI_API_KEY." },
        { status: 400 }
      );
    }

    // Construct the context system instruction
    const resourcesContext = (resources || []).map((r: any) => `- Name: "${r.name}" (ID: ${r.id})`).join("\n");
    const bookingsContext = (existingBookings || []).map((b: any) => {
      const dayNames = ["Pondělí/Monday", "Úterý/Tuesday", "Středa/Wednesday", "Čtvrtek/Thursday", "Pátek/Friday", "Sobota/Saturday", "Neděle/Sunday"];
      const dayLabel = dayNames[b.dayIndex] || `Day ${b.dayIndex}`;
      const isUserBooking = loggedInUser?.email && b.instructor === loggedInUser.email;
      const ownerLabel = isUserBooking ? `The logged-in user (email: ${loggedInUser.email})` : (b.name || 'Private');
      return `- Booking ID: "${b.id}" on Resource: "${b.resourceName || 'Plocha'}" (ID: ${b.resourceId}) on ${dayLabel} (dayIndex: ${b.dayIndex}) from ${formatDecimalHour(b.startHour)} to ${formatDecimalHour(b.startHour + b.durationHours)} (Reserved by: ${ownerLabel})`;
    }).join("\n");

    const systemPrompt = `You are ReKeeper, a warm, highly professional, and extremely intelligent AI reservation assistant and timekeeper for the ReSys booking portal.
Your job is to guide the user step-by-step through the reservation process in a natural, friendly manner, asking for only ONE parameter at a time to prevent overwhelming them.

=== CONTEXT ===
- Current Date/Time: ${currentDate || new Date().toISOString()}
- Current Week Start (Monday): ${weekStart || "2026-06-08"}
- Active Selected Resource ID in UI: ${activeResourceId || "none"}
- Logged-in User (active session): ${loggedInUser ? `Name: "${loggedInUser.name}", Email: "${loggedInUser.email}"` : "None (anonymous guest)"}

- Available Resources in this venue:
${resourcesContext || "- None available"}

- Existing confirmed bookings for this week (occupied time slots you MUST NOT book over):
${bookingsContext || "- No bookings, calendar is completely free!"}

=== BEHAVIOR & CONVERSATIONAL RULES ===
1. LANGUAGE: Always respond in the same language the user uses (e.g., Czech or English).
2. ALWAYS GENERATE A TEXT REPLY: You must always provide a friendly, helpful conversational text response to the user in every turn. The text reply must NEVER be empty or missing, even if you are calling a function/tool.
3. CONCISE & HUMAN-LIKE (MAX 2-3 SENTENCES): Avoid long paragraphs, bulleted lists, and raw markdown symbols (like '*', '**', '###'). Speak naturally, like a human receptionist.
4. STEP-BY-STEP ONBOARDING (ONE QUESTION AT A TIME):
   - Never ask for multiple missing parameters in a single response.
   - Follow this strict parameter sequence: Resource (Plocha) ➔ Day (Datum) ➔ Time/Duration (Čas) ➔ Client Name (Klient).
   - If the user selects/asks for "polovina", "polovinu", "half", or "half a pitch", DO NOT ask them to choose Sektor A or Sektor B. Instead:
     - Check the list of existing confirmed bookings for the requested time/day:
       - If Sektor A has an overlap/conflict, select Sektor B.
       - If Sektor B has an overlap/conflict, select Sektor A.
       - If both are free (or if the date/time is not yet resolved), select Sektor A by default.
     - Proceed directly with the chosen resource (Sektor A or Sektor B) and call 'propose_draft_booking' or 'report_booking_status' with this resource selected, without asking the user to make a choice.
   - If the user says "Chci si rezervovat umělku" or makes a general request:
     - Greet them warmly and ask ONLY for the resource first, listing only the main choices: "Rád vám s rezervací pomohu. Chcete Celou plochu, nebo jen polovinu?"
   - Once the resource is chosen, ask ONLY for the day: "Na jaký den byste si přál rezervaci?" (Suggest concrete options: e.g. "dnešek", "zítřek", "pondělí").
   - Once the day is chosen, ask ONLY for the time and duration: "V kolik hodin byste chtěl začít a na jak dlouho to bude?" (Suggest a free slot if visible).
   - Once the time is chosen:
     - If a Logged-in User is present in CONTEXT, you already have their name and email, so you DO NOT need to ask for their name. Skip that prompt entirely, set userName to the Logged-in User's name, and immediately call 'propose_draft_booking' and ask: "Navrhl jsem to na obrazovku. Souhlasí to tak?"
     - Otherwise (if no Logged-in User), ask ONLY for their name: "Na jaké jméno mám rezervaci připravit?"
5. CONFLICT RESOLUTION: If they request an occupied slot:
   - Politely tell them who occupies it.
   - Suggest exactly 2 clear free options (different resource or nearby time).
   - Highlight the first option on their calendar using the 'highlight_slot' tool.
   - Call 'report_booking_status' with hasConflict = true.
6. DRAFT BOOKING: Once resource, dayIndex, and startHour are chosen and free, call 'propose_draft_booking' to draw the draft slot in purple on the grid. Ask: "Navrhl jsem to na obrazovku. Souhlasí to tak?"
7. CONFIRMATION: Wait for explicit user confirmation before calling 'confirm_current_booking'.
8. STATE SYNC: Call 'report_booking_status' only when a booking parameter (resource, day, start hour, duration, or client name) is newly resolved, updated, or if there is a conflict. If no parameters have been resolved or changed in this turn, do not call this tool.
9. RECURRING RESERVATIONS: If the user mentions that they want the booking to repeat or be recurring (e.g., 'každý týden', 'každé dva týdny', 'opakovat', 'každý měsíc'), set the recurrencePattern ('weekly', 'bi-weekly', 'monthly') and recurrenceCount (default to 4 if not specified by user). If they don't mention recurrence, default to 'none' for pattern and null for count. Pass these parameters in propose_draft_booking and report_booking_status.
10. RESCHEDULING & CANCELLATION:
   - If the user asks to cancel, delete, or remove their booking, identify their booking ID from the confirmed bookings list (where they are the owner, e.g. "Reserved by: The logged-in user") and call the 'cancel_booking' tool.
   - If the user asks to reschedule, move, or change their booking, identify their booking ID, resolve the new parameters (resource, day index, start hour, duration), and call the 'reschedule_booking' tool.

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
                },
                recurrencePattern: {
                  type: "STRING",
                  description: "The pattern of booking recurrence: 'none', 'weekly', 'bi-weekly', 'monthly'. Default is 'none'."
                },
                recurrenceCount: {
                  type: "INTEGER",
                  description: "The number of total recurrences to create, including the initial one, e.g. 4."
                }
              },
              required: ["resourceId", "dayIndex", "startHour", "duration"]
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
                },
                recurrencePattern: {
                  type: "STRING",
                  description: "The pattern of booking recurrence: 'none', 'weekly', 'bi-weekly', 'monthly'."
                },
                recurrenceCount: {
                  type: "INTEGER",
                  description: "The number of total recurrences to create, including the initial one, e.g. 4."
                }
              }
            }
          },
          {
            name: "cancel_booking",
            description: "Cancels or deletes an existing booking. Use when user explicitly asks to cancel or remove their reservation.",
            parameters: {
              type: "OBJECT",
              properties: {
                bookingId: {
                  type: "STRING",
                  description: "The unique ID of the booking to cancel."
                },
                cancelSeries: {
                  type: "BOOLEAN",
                  description: "If true, cancels all bookings in the recurrence group/series. Default is false."
                }
              },
              required: ["bookingId"]
            }
          },
          {
            name: "reschedule_booking",
            description: "Reschedules or moves an existing booking to a new day, time, duration, or resource.",
            parameters: {
              type: "OBJECT",
              properties: {
                bookingId: {
                  type: "STRING",
                  description: "The unique ID of the booking to reschedule."
                },
                resourceId: {
                  type: "STRING",
                  description: "The ID of the new resource (optional)."
                },
                dayIndex: {
                  type: "INTEGER",
                  description: "The new day index: 0 (Monday) to 6 (Sunday) (optional)."
                },
                startHour: {
                  type: "NUMBER",
                  description: "The new start hour in decimal, e.g. 14.5 for 14:30 (optional)."
                },
                duration: {
                  type: "NUMBER",
                  description: "The new duration of the booking in hours, e.g. 1.5 (optional)."
                }
              },
              required: ["bookingId"]
            }
          }
        ]
      }
    ];

    let reply = "";
    let functionCalls: any[] = [];

    if (useOpenAI) {
      // 1. Map conversation messages to OpenAI format
      const openAIMessages: any[] = [];
      openAIMessages.push({ role: "system", content: systemPrompt });

      (messages || []).forEach((msg: any, index: number) => {
        if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
          // Build assistant message with tool calls
          const toolCalls = msg.toolCalls.map((tc: any, tcIdx: number) => ({
            id: `call_${index}_${tcIdx}`,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args)
            }
          }));
          openAIMessages.push({
            role: "assistant",
            content: msg.content || "",
            tool_calls: toolCalls
          });
          // Immediately push matching tool responses to satisfy schema
          toolCalls.forEach((tc: any) => {
            openAIMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify({ result: "success" })
            });
          });
        } else {
          openAIMessages.push({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content || ""
          });
        }
      });

      // Convert tools to OpenAI format
      const openAITools = tools[0].functionDeclarations.map((fd: any) => ({
        type: "function",
        function: {
          name: fd.name,
          description: fd.description,
          parameters: convertToOpenAISchema(fd.parameters)
        }
      }));

      console.log("Calling OpenAI API using model: gpt-4o-mini");
      const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openAIMessages,
          tools: openAITools,
          tool_choice: "auto"
        })
      });

      if (!openAIResponse.ok) {
        const errText = await openAIResponse.text();
        throw new Error(`OpenAI API failed: ${errText}`);
      }

      const data = await openAIResponse.json();
      const choice = data.choices?.[0];
      const message = choice?.message;
      reply = message?.content || "";
      functionCalls = message?.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments)
      })) || [];

      // PASS 2: If the model generated tool calls but left the conversational reply empty,
      // we perform a fast second-pass call to get the guided conversational response.
      if (functionCalls.length > 0 && !reply && message) {
        console.log("OpenAI returned tool calls with empty reply. Initiating Pass 2 on backend...");
        openAIMessages.push(message);

        message.tool_calls.forEach((tc: any) => {
          openAIMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify({ result: "success" })
          });
        });

        try {
          const response2 = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${activeApiKey}`
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: openAIMessages
            })
          });
          
          if (response2.ok) {
            const data2 = await response2.json();
            const choice2 = data2.choices?.[0];
            reply = choice2?.message?.content || reply;
          }
        } catch (err) {
          console.error("Error in OpenAI Pass 2 call:", err);
        }
      }
    } else {
      // Map conversation messages to Gemini contents format
      // Note: Gemini roles are 'user' and 'model'
      const contents: any[] = [];
      (messages || []).forEach((msg: any) => {
        const role = msg.role === "assistant" ? "model" : "user";
        
        if (role === "model" && msg.toolCalls && msg.toolCalls.length > 0) {
          // 1. Push the model message with the function calls
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
          
          // 2. Immediately push a simulated function response turn to satisfy the API schema
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

      // Call Gemini API via fetch with retry and model fallback (Pass 1)
      const response = await fetchWithRetry(activeApiKey, contents, systemPrompt, tools);
      const data = await response.json();
      
      // Parse response content and function calls
      const candidate = data.candidates?.[0];
      const textPart = candidate?.content?.parts?.find((p: any) => p.text);
      functionCalls = candidate?.content?.parts
        ?.filter((p: any) => p.functionCall)
        ?.map((p: any) => ({
          name: p.functionCall.name,
          args: p.functionCall.args
        })) || [];

      reply = textPart?.text || "";

      // PASS 2: If the model generated tool calls but left the conversational reply empty,
      // we perform a fast second-pass call to get the guided conversational response.
      if (functionCalls.length > 0 && !reply && candidate?.content?.parts) {
        console.log("Gemini returned tool calls with empty reply. Initiating Pass 2 on backend...");
        
        // Append the model's function calls to contents
        contents.push({
          role: "model",
          parts: candidate.content.parts
        });

        // Append the corresponding simulated function responses
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
          const response2 = await fetchWithRetry(activeApiKey, contents, systemPrompt, tools);
          const data2 = await response2.json();
          const candidate2 = data2.candidates?.[0];
          const textPart2 = candidate2?.content?.parts?.find((p: any) => p.text);
          
          reply = textPart2?.text || reply;

          // Merge any additional function calls if returned (unlikely)
          const functionCalls2 = candidate2?.content?.parts
            ?.filter((p: any) => p.functionCall)
            ?.map((p: any) => ({
              name: p.functionCall.name,
              args: p.functionCall.args
            })) || [];

          if (functionCalls2.length > 0) {
            functionCalls = [...functionCalls, ...functionCalls2];
          }
        } catch (err) {
          console.error("Error in Gemini Pass 2 call:", err);
        }
      }
    }

    // Default fallback reply if empty to ensure the assistant always says something conversational
    if (!reply) {
      reply = "Rozumím. Provedl jsem úpravu na obrazovce. Jak vám mohu dále pomoci?";
    }

    return NextResponse.json({
      reply,
      toolCalls: functionCalls
    });
  } catch (error: any) {
    console.error("Error in AI Assistant API route:", error);
    
    // Graceful user-facing fallback for API rate limits / quota issues instead of crashing
    const isRateLimit = error.message.includes("429") || error.message.includes("quota") || error.message.includes("limit") || error.message.includes("exhausted");
    const friendlyMessage = isRateLimit 
      ? "Omlouvám se, ale asistent je momentálně přetížen (byl překročen limit požadavků API). Zkuste to prosím znovu za 1 minutu."
      : "Omlouvám se, ale došlo k chybě při komunikaci s AI. Zkuste to prosím za chvíli.";
      
    return NextResponse.json({
      reply: friendlyMessage,
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
  
  // Try each model once without waiting or retrying to resolve rate limits fast
  for (const model of models) {
    try {
      console.log(`Calling Gemini API using model: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      
      if (response.ok) {
        return response;
      }
      
      const errText = await response.text();
      console.error(`Gemini API error on model ${model} (status ${response.status}):`, errText);
      lastError = { status: response.status, text: errText };
    } catch (err: any) {
      console.error(`Fetch exception on model ${model}:`, err);
      lastError = err;
    }
  }
  
  // Only if ALL models failed in the first pass, do a short sleep and one backup retry round
  console.log("All models failed in the first pass. Initiating backup retry round...");
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  for (const model of models) {
    try {
      console.log(`Retrying Gemini API using model: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
    lastError 
      ? `Gemini API failed on all models. Last error: ${lastError.text || lastError.message || JSON.stringify(lastError)}` 
      : "Gemini API failed on all models."
  );
}

function formatDecimalHour(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function convertToOpenAISchema(params: any): any {
  if (!params) return undefined;
  const newParams = { ...params };
  if (newParams.type) {
    newParams.type = newParams.type.toLowerCase();
  }
  if (newParams.properties) {
    const newProps: any = {};
    for (const [key, val] of Object.entries(newParams.properties)) {
      newProps[key] = convertToOpenAISchema(val);
    }
    newParams.properties = newProps;
  }
  if (newParams.items) {
    newParams.items = convertToOpenAISchema(newParams.items);
  }
  return newParams;
}

