import { NextRequest } from "next/server";
import { getOpenRouter, assertApiKey } from "@/lib/openrouter";
import { stripThinkTags, sanitizeMojibake } from "@/lib/ai-utils";
import { internalErrorResponse, parseJsonRequest } from "@/lib/api-validation";
import { saveValidation } from "@/lib/validation";
import { z } from "zod";

const validateIdeaSchema = z.object({
  idea: z.string().min(10).max(2000),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const input = await parseJsonRequest(req, validateIdeaSchema);
    if (!input.success) return input.response;

    assertApiKey();
    const { idea } = input.data;

    const completion = await getOpenRouter().chat.completions.create({
      model: "deepseek/deepseek-v4-pro",
      messages: [
        {
          role: "system",
          content: `Sei un venture analyst esperto. Valuta l'idea di startup che ti viene presentata.

Restituisci SEMPRE un oggetto JSON valido con questa struttura esatta:
{
  "overallScore": number (0-100),
  "verdict": string (max 150 caratteri, in italiano),
  "dimensions": [
    { "name": "Problem-Solution Fit", "score": number (0-100), "comment": string (max 200 caratteri) },
    { "name": "Dimensione Mercato", "score": number (0-100), "comment": string (max 200 caratteri) },
    { "name": "Fattibilità Tecnica", "score": number (0-100), "comment": string (max 200 caratteri) },
    { "name": "Competizione", "score": number (0-100), "comment": string (max 200 caratteri) },
    { "name": "Unicità / Moat", "score": number (0-100), "comment": string (max 200 caratteri) }
  ],
  "redFlags": string[] (max 3 elementi, in italiano),
  "recommendations": string[] (max 3 elementi, in italiano)
}

Regole:
- Sii onesto e diretto. Se l'idea è debole, dillo.
- I punteggi devono essere realistici, non tutti alti.
- Le red flag sono problemi concreti che vedrai nell'idea.
- Le recommendations sono azioni specifiche per migliorare.
- Rispondi SOLO con il JSON, nient'altro.`,
        },
        {
          role: "user",
          content: idea,
        },
      ],
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = sanitizeMojibake(stripThinkTags(raw));

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
    const result = JSON.parse(jsonStr);

    saveValidation(idea, result);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Validate idea error:", err);
    return internalErrorResponse("Errore nella validazione dell'idea");
  }
}
