/**
 * Canonical registry of the 9 sequential phases.
 *
 * Single source of truth — all consumers (state, db, UI, PDF, sidebar, API)
 * MUST import from here instead of duplicating phase data inline.
 *
 * Pure TypeScript. No project imports, no runtime dependencies — safe to
 * import from both server modules and "use client" components.
 */

export const PHASES = [
  {
    id: "intake",
    label: "Idea Intake",
    description:
      "Definisci il problema, la soluzione e il contesto del founder.",
    skillId: "startup-design",
  },
  {
    id: "market",
    label: "Ricerca di Mercato",
    description:
      "Comprendi il panorama di mercato e i segmenti di clientela.",
    skillId: "market-sizing",
  },
  {
    id: "competitor",
    label: "Analisi Competitor",
    description:
      "Mappa i competitor, le battle cards e il panorama dei prezzi.",
    skillId: "startup-competitors",
  },
  {
    id: "strategy",
    label: "Strategia & Canvas",
    description: "Costruisci il Lean Canvas e la Strategia di Prodotto.",
    skillId: "lean-canvas",
  },
  {
    id: "premortem",
    label: "Controllo Rischi (Pre-Mortem)",
    description: "Stress-test del piano prima dell'esecuzione.",
    skillId: "pre-mortem",
  },
  {
    id: "positioning",
    label: "Posizionamento",
    description:
      "Definisci il posizionamento di mercato e il messaging.",
    skillId: "startup-positioning",
  },
  {
    id: "execution",
    label: "Piano di Esecuzione",
    description: "Scrivi il PRD, la roadmap e le user stories.",
    skillId: "create-prd",
  },
  {
    id: "gtm",
    label: "Go-to-Market",
    description:
      "Progetta il segmento beachhead, l'ICP e i growth loops.",
    skillId: "gtm-strategy",
  },
  {
    id: "pitch",
    label: "Pitch per Investitori",
    description: "Prepara il pitch deck e la narrazione.",
    skillId: "startup-pitch",
  },
] as const;

export type Phase = (typeof PHASES)[number];
export type PhaseId = Phase["id"];

export const PHASE_IDS: readonly PhaseId[] = PHASES.map((p) => p.id);

export function getPhase(id: string): Phase | undefined {
  return PHASES.find((p) => p.id === id);
}

export function getPhaseLabel(id: string): string {
  return getPhase(id)?.label ?? id;
}

export function getNextPhaseId(id: string): PhaseId | null {
  const idx = PHASE_IDS.indexOf(id as PhaseId);
  if (idx === -1 || idx >= PHASE_IDS.length - 1) return null;
  return PHASE_IDS[idx + 1];
}

export function getPreviousPhaseIds(id: string): readonly PhaseId[] {
  const idx = PHASE_IDS.indexOf(id as PhaseId);
  if (idx <= 0) return [];
  return PHASE_IDS.slice(0, idx);
}
