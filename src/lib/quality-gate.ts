import { sanitizeMojibake, stripThinkTags } from "./ai-utils";

export type QualityIssue = {
  type: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
};

export type QualityReview = {
  score: number;
  issues: QualityIssue[];
};

export type QualityGateClient = {
  chat: {
    completions: {
      create: (input: {
        model: string;
        messages: Array<{ role: "system" | "user"; content: string }>;
        stream: false;
      }) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
};

export type RunQualityGateInput = {
  client: QualityGateClient;
  phaseId: string;
  document: string;
  conversation: string;
  contextSection: string;
  threshold: number;
  primaryModel: string;
  criticModel: string;
};

export type QualityGateResult = {
  document: string;
  review: QualityReview;
  regenerated: boolean;
};

const FALLBACK_REVIEW: QualityReview = {
  score: 0,
  issues: [
    {
      type: "parser",
      severity: "high",
      suggestion: "Il critic non ha restituito JSON valido.",
    },
  ],
};

export function parseQualityReview(text: string): QualityReview {
  try {
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : text) as {
      score?: unknown;
      issues?: unknown;
    };

    const score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.map((issue) => {
          const candidate = issue as Partial<QualityIssue>;
          return {
            type: String(candidate.type ?? "quality"),
            severity:
              candidate.severity === "low" ||
              candidate.severity === "medium" ||
              candidate.severity === "high"
                ? candidate.severity
                : "medium",
            suggestion: String(candidate.suggestion ?? "Migliora il documento."),
          };
        })
      : [];

    return { score, issues };
  } catch {
    return FALLBACK_REVIEW;
  }
}

export function shouldRegenerate(
  review: QualityReview,
  threshold: number
): boolean {
  return review.score < threshold;
}

function buildCriticPrompt(phaseId: string, document: string): string {
  return `Sei un critic severo per documenti startup investor-ready.
Valuta il documento della fase "${phaseId}" con score 0-100.
Controlla: chiarezza, specificità, assunzioni, citazioni/stime, tono professionale, rischi.
Se ci sono numeri di mercato senza fonte, segnala di aggiungere fonte o "[stima personale]".
Rispondi SOLO JSON valido: {"score": number, "issues": [{"type": string, "severity": "low"|"medium"|"high", "suggestion": string}]}.

DOCUMENTO:
${document}`;
}

function buildRegenerationPrompt(input: RunQualityGateInput, review: QualityReview) {
  return `Conversazione:
${input.conversation}

${input.contextSection}

Documento precedente:
${input.document}

Feedback critic:
${JSON.stringify(review, null, 2)}

Rigenera il documento finale in italiano, più specifico e investor-ready.`;
}

export async function runQualityGate(
  input: RunQualityGateInput
): Promise<QualityGateResult> {
  const critic = await input.client.chat.completions.create({
    model: input.criticModel,
    messages: [
      { role: "system", content: buildCriticPrompt(input.phaseId, input.document) },
    ],
    stream: false,
  });

  const review = parseQualityReview(
    critic.choices[0]?.message?.content ?? "{}"
  );

  if (!shouldRegenerate(review, input.threshold)) {
    return { document: input.document, review, regenerated: false };
  }

  const regeneration = await input.client.chat.completions.create({
    model: input.primaryModel,
    messages: [
      {
        role: "system",
        content:
          "Sei un editor esperto. Rigenera un documento markdown professionale, specifico, in italiano.",
      },
      { role: "user", content: buildRegenerationPrompt(input, review) },
    ],
    stream: false,
  });

  const document = sanitizeMojibake(
    stripThinkTags(regeneration.choices[0]?.message?.content ?? input.document)
  );

  return { document, review, regenerated: true };
}
