import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing. Please configure GEMINI_API_KEY in your environment." },
        { status: 400 }
      );
    }

    const clientFormData = await req.formData();
    const audioFile = clientFormData.get("file") as Blob;
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    // Convert Blob to Buffer, then to base64 for inlineData payload
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString("base64");

    // Clean MIME type to remove codecs info (Gemini expects clean mime types, e.g. "audio/webm" instead of "audio/webm;codecs=opus")
    let mimeType = audioFile.type.split(";")[0] || "audio/webm";
    
    // Fallback mappings if mime type is unspecific
    if (mimeType === "audio/octet-stream" || !mimeType) {
      mimeType = "audio/webm";
    }

    console.log(`Transcribing audio via Gemini (${audioFile.size} bytes, mimeType: ${mimeType})...`);

    const models = [
      "gemini-2.5-flash",
      "gemini-3.5-flash",
      "gemini-2.0-flash"
    ];

    const contents = [
      {
        parts: [
          {
            text: "Vypiš přesný přepis (transkripci) mluvené řeči v přiloženém zvukovém souboru do textu. Napiš POUZE samotný text přepsané řeči, nepřidávej žádný vlastní komentář, vysvětlení ani uvozovky."
          },
          {
            inlineData: {
              mimeType,
              data: base64Audio
            }
          }
        ]
      }
    ];

    let lastError: any = null;
    let transcriptionText = "";

    // Try models one by one
    for (const model of models) {
      try {
        console.log(`Calling Gemini API for transcription using model: ${model}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ contents })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const textPart = candidate?.content?.parts?.find((p: any) => p.text);
          transcriptionText = (textPart?.text || "").trim();
          break; // successfully transcribed
        }

        const errText = await response.text();
        console.error(`Gemini transcription error on model ${model} (status ${response.status}):`, errText);
        lastError = { status: response.status, text: errText };
      } catch (err: any) {
        console.error(`Gemini transcription exception on model ${model}:`, err);
        lastError = err;
      }
    }

    if (!transcriptionText && lastError) {
      throw new Error(
        `Gemini transcription failed. Last error: ${
          lastError.text || lastError.message || JSON.stringify(lastError)
        }`
      );
    }

    console.log("Gemini transcription completed successfully:", transcriptionText);
    return NextResponse.json({ text: transcriptionText });

  } catch (error: any) {
    console.error("Error in transcribe route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
