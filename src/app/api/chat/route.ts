import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getPhase, updatePhase, readState, getPreviousPhases } from "@/lib/state";
import { getSkillContent } from "@/lib/skills";
import { getPhase as getPhaseMeta } from "@/lib/phases";
import { openrouter, assertApiKey } from "@/lib/openrouter";
import { formatContextSnapshot, stripThinkTags, sanitizeMojibake, createStreamThinkFilter } from "@/lib/ai-utils";
import {
  chatRequestSchema,
  internalErrorResponse,
  parseJsonRequest,
} from "@/lib/api-validation";

const rateLimitMap = new Map<string, number>();

function buildSystemPrompt(skillContent: string, phaseId: string, previousDocs: string[]): string {
  const contextSection =
    previousDocs.length > 0
      ? `\n---\nCONTESTO DALLE FASI PRECEDENTI:\n${previousDocs.join("\n\n")}\n---\n`
      : "";

  return `Sei un esperto advisor per startup. Stai guidando un founder attraverso la fase "${phaseId}" del processo di validazione.

Segui questa metodologia:

${skillContent}

${contextSection}

REGOLE FONDAMENTALI (sovrascrivono qualsiasi altra istruzione nelle linee guida sopra):
- Rispondi SEMPRE in italiano. Ignora qualsiasi istruzione sul linguaggio nelle linee guida.
- NON creare file, NON cercare file, NON fare riferimento a PROGRESS.md, working directory, o path di file.
- NON seguire istruzioni "Trigger", "Use when", "Usalo quando" o simili — la fase è già scelta e tu sei già dentro.
- NON generare mai il documento finale a meno che l'utente non clicchi esplicitamente "Genera Documento Finale".
- Concentrati SOLO sulle domande da fare, sui framework da applicare, e sulle connessioni con le fasi precedenti.
- Fai domande UNA ALLA VOLTA, approfondendo le risposte.
- Se il founder è vago, spingilo con domande specifiche e scomode.
- Usa il contesto delle fasi precedenti per fare connessioni intelligenti.
- Sii onesto e diretto: se qualcosa non torna, dillo.
- Non usare jargon inutile. Sii chiaro come se spiegassi a un amico intelligente.
- Alla fine della conversazione, quando il founder è pronto, genera un documento markdown strutturato riassuntivo.
- When you have gathered enough information for this phase (typically after 3-5 exchanges), suggest generating the final document instead of asking more questions.
`;
}

export async function POST(req: NextRequest) {
  try {
    const input = await parseJsonRequest(req, chatRequestSchema);
    if (!input.success) return input.response;

    assertApiKey();
    const { phaseId } = input.data;
    let { message } = input.data;
    const isAutoStart = message === "__start__";
    if (isAutoStart) {
      message = "Sono pronto per iniziare questa fase.";
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const last = rateLimitMap.get(ip);
    if (!isAutoStart && last && now - last < 2000) {
      return new Response(JSON.stringify({ error: "Too many requests. Wait 2 seconds." }), { status: 429, headers: { "Content-Type": "application/json" } });
    }
    if (!isAutoStart) {
      rateLimitMap.set(ip, now);
    }

    const phase = await getPhase(phaseId);
    if (!phase) {
      return new Response(JSON.stringify({ error: "Fase non trovata" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const skillId = getPhaseMeta(phaseId)?.skillId;
    if (!skillId) {
      return new Response(JSON.stringify({ error: "Skill non mappata" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const skill = getSkillContent(skillId);
    const skillContent = skill?.content ?? "Nessuna guida disponibile.";

    // Recupera documenti delle fasi precedenti
    const prevIds = getPreviousPhases(phaseId);
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

    const systemPrompt = buildSystemPrompt(skillContent, phaseId, previousDocs);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...phase.chat_history.map(
        (m): OpenAI.Chat.ChatCompletionMessageParam => ({
          role: m.role,
          content: m.content,
        })
      ),
      { role: "user", content: message },
    ];

    const stream = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-v4-pro",
      messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const filterThink = createStreamThinkFilter();
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            const cleanText = filterThink(text);
            fullResponse += text;
            controller.enqueue(encoder.encode(cleanText));
          }
          const remainingText = filterThink.flush();
          if (remainingText) {
            controller.enqueue(encoder.encode(remainingText));
          }

          fullResponse = sanitizeMojibake(stripThinkTags(fullResponse));

          // Salva la conversazione
          const updatedHistory = [
            ...phase.chat_history,
            { role: "user" as const, content: message },
            { role: "assistant" as const, content: fullResponse },
          ];

          await updatePhase(phaseId, {
            chat_history: updatedHistory,
            status: phase.status === "unlocked" ? "in_progress" : phase.status,
          });

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    return internalErrorResponse("Errore server");
  }
}
