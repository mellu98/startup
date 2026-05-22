import { NextRequest } from "next/server";
import { getPhase, updatePhase, unlockNextPhase } from "@/lib/state";
import { getOpenRouter, assertApiKey } from "@/lib/openrouter";
import { stripThinkTags, sanitizeMojibake } from "@/lib/ai-utils";
import {
  completePhaseRequestSchema,
  internalErrorResponse,
  parseJsonRequest,
  phaseParamsSchema,
  validateParams,
} from "@/lib/api-validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const routeParams = validateParams(await params, phaseParamsSchema);
    if (!routeParams.success) return routeParams.response;

    const input = await parseJsonRequest(req, completePhaseRequestSchema);
    if (!input.success) return input.response;

    assertApiKey();
    const { id } = routeParams.data;
    const { document } = input.data;
    const cleanDocument = sanitizeMojibake(stripThinkTags(document));

    const phase = await getPhase(id);
    if (!phase) {
      return new Response(JSON.stringify({ error: "Fase non trovata" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (phase.status === "locked") {
      return new Response(JSON.stringify({ error: "Fase ancora bloccata" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Genera context snapshot JSON dal documento
    let contextSnapshot: Record<string, unknown> | null = null;
    try {
      const extraction = await getOpenRouter().chat.completions.create({
        model: "deepseek/deepseek-v4-pro",
        messages: [
          {
            role: "system",
            content:
              "Sei un estrattore di dati strutturati. Leggi il documento e estrai i fatti chiave in un oggetto JSON. Le chiavi devono essere descrittive in inglese (es. problem, solution, targetCustomer, tam, sam, trends, competitors). I valori devono essere stringhe o array di stringhe (max 5 elementi) e DEVONO essere scritti in ITALIANO. Non includere testo prima o dopo il JSON. Restituisci SOLO l'oggetto JSON valido.",
          },
          { role: "user", content: cleanDocument },
        ],
        max_tokens: 2000,
      });

      const text = extraction.choices[0]?.message?.content ?? "{}";
      const jsonMatch =
        text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : "{}";
      contextSnapshot = JSON.parse(jsonStr);
    } catch (snapErr: unknown) {
      console.error("Snapshot extraction failed:", snapErr);
      contextSnapshot = null;
    }

    await updatePhase(id, {
      final_document: cleanDocument,
      status: "completed",
      context_snapshot: contextSnapshot,
    });

    await unlockNextPhase(id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Complete phase error:", err);
    return internalErrorResponse("Errore server");
  }
}
