import { getDb } from "./db";

export type ValidationScorecard = {
  overallScore: number;
  verdict: string;
  dimensions: Array<{
    name: string;
    score: number;
    comment: string;
    phaseId?: string;
  }>;
  redFlags: string[];
  recommendations: string[];
};

export type ValidatedDimension = {
  name: string;
  score: number;
  comment: string;
  source: "initial" | "phase";
  phaseId?: string;
};

const PHASE_DIMENSION_MAP: Record<string, string> = {
  intake: "Problem-Solution Fit",
  market: "Dimensione Mercato",
  competitor: "Competizione",
  positioning: "Unicità / Moat",
  execution: "Fattibilità Tecnica",
};

export function getValidation(): {
  idea_text: string;
  scorecard: ValidationScorecard | null;
} {
  const db = getDb();
  const row = db
    .prepare("SELECT idea_text, initial_scorecard FROM idea_validation WHERE id = 1")
    .get() as { idea_text: string; initial_scorecard: string } | undefined;

  if (!row || !row.idea_text) {
    return { idea_text: "", scorecard: null };
  }

  try {
    const scorecard = JSON.parse(row.initial_scorecard) as ValidationScorecard;
    return { idea_text: row.idea_text, scorecard };
  } catch {
    return { idea_text: row.idea_text, scorecard: null };
  }
}

export function saveValidation(ideaText: string, scorecard: ValidationScorecard) {
  const db = getDb();
  db.prepare(
    `INSERT INTO idea_validation (id, idea_text, initial_scorecard, updated_at)
     VALUES (1, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       idea_text = excluded.idea_text,
       initial_scorecard = excluded.initial_scorecard,
       updated_at = CURRENT_TIMESTAMP`
  ).run(ideaText, JSON.stringify(scorecard));
}

export function computeValidationStatus(
  initial: ValidationScorecard | null,
  phases: Array<{ id: string; status: string; final_document: string | null }>
): {
  overallScore: number;
  verdict: string;
  dimensions: ValidatedDimension[];
  redFlags: string[];
  recommendations: string[];
} {
  if (!initial) {
    return {
      overallScore: 0,
      verdict: "Nessuna validazione iniziale. Inserisci la tua idea per iniziare.",
      dimensions: [],
      redFlags: [],
      recommendations: ["Inserisci la tua idea nella homepage per ottenere una valutazione iniziale."],
    };
  }

  const completedPhaseIds = new Set(
    phases.filter((p) => p.status === "completed" && p.final_document).map((p) => p.id)
  );

  const dimensions: ValidatedDimension[] = initial.dimensions.map((dim) => {
    const phaseId = Object.entries(PHASE_DIMENSION_MAP).find(([, name]) => name === dim.name)?.[0];
    if (phaseId && completedPhaseIds.has(phaseId)) {
      return {
        ...dim,
        source: "phase" as const,
        phaseId,
        comment: `Validato dai dati raccolti nella fase "${phaseId}".`,
      };
    }
    return { ...dim, source: "initial" as const };
  });

  const completedCount = dimensions.filter((d) => d.source === "phase").length;
  const totalCount = dimensions.length;

  let overallScore = initial.overallScore;
  if (completedCount > 0) {
    const phaseScores = dimensions
      .filter((d) => d.source === "phase")
      .map((d) => d.score);
    const initialScores = dimensions
      .filter((d) => d.source === "initial")
      .map((d) => d.score);
    const avgPhase = phaseScores.reduce((a, b) => a + b, 0) / phaseScores.length;
    const avgInitial = initialScores.length
      ? initialScores.reduce((a, b) => a + b, 0) / initialScores.length
      : avgPhase;
    overallScore = Math.round((avgPhase * completedCount + avgInitial * (totalCount - completedCount)) / totalCount);
  }

  let verdict = initial.verdict;
  if (completedCount === totalCount) {
    verdict = "Validazione completa basata sui dati raccolti in tutte le fasi.";
  } else if (completedCount > 0) {
    verdict = `Validazione parziale: ${completedCount}/${totalCount} dimensioni confermate dai dati delle fasi.`;
  }

  return {
    overallScore,
    verdict,
    dimensions,
    redFlags: initial.redFlags,
    recommendations: initial.recommendations,
  };
}
