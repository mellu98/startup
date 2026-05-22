import { NextRequest } from "next/server";
import { getPhase, readState, getPreviousPhases } from "@/lib/state";
import { openrouter, assertApiKey } from "@/lib/openrouter";
import { formatContextSnapshot, stripThinkTags, sanitizeMojibake } from "@/lib/ai-utils";
import { runQualityGate } from "@/lib/quality-gate";
import {
  internalErrorResponse,
  phaseParamsSchema,
  requireDocumentGenerationToken,
  validateParams,
} from "@/lib/api-validation";

const rateLimitMap = new Map<string, number>();
const DEFAULT_MODEL = "deepseek/deepseek-v4-pro";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const routeParams = validateParams(await params, phaseParamsSchema);
    if (!routeParams.success) return routeParams.response;

    const unauthorized = requireDocumentGenerationToken(req);
    if (unauthorized) return unauthorized;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const last = rateLimitMap.get(ip);
    if (last && now - last < 2000) {
      return new Response(JSON.stringify({ error: "Too many requests. Wait 2 seconds." }), { status: 429, headers: { "Content-Type": "application/json" } });
    }
    rateLimitMap.set(ip, now);

    assertApiKey();
    const { id } = routeParams.data;
    const phase = await getPhase(id);
    if (!phase) {
      return new Response(JSON.stringify({ error: "Fase non trovata" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prevIds = getPreviousPhases(id);
    const state = await readState();
    const previousDocs: string[] = [];
    for (const prevId of prevIds) {
      const prev = state.phases.find((p) => p.id === prevId);
      if (prev) {
        const snapshotText = formatContextSnapshot(prev.context_snapshot);
        if (snapshotText) {
          previousDocs.push(`[Fase: ${prevId}]\n${snapshotText}`);
        } else if (prev.final_document) {
          previousDocs.push(`[Fase: ${prevId}]\n${prev.final_document}`);
        }
      }
    }

    const contextSection = previousDocs.length > 0
      ? `\n---\nCONTESTO DALLE FASI PRECEDENTI:\n${previousDocs.join("\n\n")}\n---\n`
      : "";

    const messages = [
      {
        role: "system" as const,
        content:
          `Sei un editor esperto. Leggi la seguente conversazione tra un founder e un advisor AI. Genera un documento markdown strutturato, professionale e completo che riassuma tutto ciò che è emerso. Usa titoli, sezioni, elenchi puntati. Non aggiungere frasi introduttive tipo 'Ecco il documento'. Inizia direttamente con il titolo. Rispondi in ITALIANO.${contextSection}`,
      },
      {
        role: "user" as const,
        content: `Conversazione:\n${phase.chat_history
          .map((m) => `${m.role === "user" ? "Founder" : "Advisor"}: ${m.content}`)
          .join("\n\n")}\n\nGenera il documento finale strutturato.`,
      },
    ];

    const primaryModel = process.env.OPENROUTER_MODEL_PRIMARY ?? DEFAULT_MODEL;
    const criticModel = process.env.OPENROUTER_MODEL_CRITIC ?? primaryModel;
    const threshold = Number(process.env.QUALITY_GATE_THRESHOLD ?? 75);

    const completion = await openrouter.chat.completions.create({
      model: primaryModel,
      messages,
      stream: false,
    });

    const document = completion.choices[0]?.message?.content ?? "";
    const cleanDocument = sanitizeMojibake(stripThinkTags(document));
    const quality = await runQualityGate({
      client: openrouter,
      phaseId: id,
      document: cleanDocument,
      conversation: messages[1].content,
      contextSection,
      threshold: Number.isFinite(threshold) ? threshold : 75,
      primaryModel,
      criticModel,
    });

    return new Response(JSON.stringify({
      document: quality.document,
      quality: {
        score: quality.review.score,
        issues: quality.review.issues,
        regenerated: quality.regenerated,
      },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Document generation error:", err);
    return internalErrorResponse("Errore server");
  }
}
