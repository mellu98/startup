import { describe, it, expect } from "vitest";
import {
  PHASES,
  PHASE_IDS,
  getPhase,
  getPhaseLabel,
  getNextPhaseId,
  getPreviousPhaseIds,
  type PhaseId,
} from "./phases";

describe("phases registry", () => {
  // REQ-1
  it("has exactly 9 phases in canonical order", () => {
    expect(PHASE_IDS).toEqual([
      "intake",
      "market",
      "competitor",
      "strategy",
      "premortem",
      "positioning",
      "execution",
      "gtm",
      "pitch",
    ]);
  });

  it("every phase has non-empty id, label, description, skillId", () => {
    for (const p of PHASES) {
      expect(p.id, `phase ${p.id} id`).toBeTruthy();
      expect(p.label, `phase ${p.id} label`).toBeTruthy();
      expect(p.description, `phase ${p.id} description`).toBeTruthy();
      expect(p.skillId, `phase ${p.id} skillId`).toBeTruthy();
    }
  });

  it("getPhase returns the phase object for a known id", () => {
    const intake = getPhase("intake");
    expect(intake?.id).toBe("intake");
    expect(intake?.label).toBe("Idea Intake");
    expect(intake?.skillId).toBe("startup-design");
  });

  it("getPhase returns undefined for unknown id", () => {
    expect(getPhase("nonexistent")).toBeUndefined();
  });

  // REQ-2 — canonical labels (drift fix)
  it("uses the longer canonical labels for premortem and pitch", () => {
    expect(getPhaseLabel("premortem")).toBe("Controllo Rischi (Pre-Mortem)");
    expect(getPhaseLabel("pitch")).toBe("Pitch per Investitori");
  });

  it("getPhaseLabel echoes input on unknown id (graceful fallback)", () => {
    expect(getPhaseLabel("nonexistent")).toBe("nonexistent");
  });

  // REQ-3 — sequential navigation
  it("getNextPhaseId returns the next phase or null", () => {
    expect(getNextPhaseId("intake")).toBe("market");
    expect(getNextPhaseId("strategy")).toBe("premortem");
    expect(getNextPhaseId("pitch")).toBeNull();
    expect(getNextPhaseId("nonexistent")).toBeNull();
  });

  it("getPreviousPhaseIds returns the prefix slice or empty", () => {
    expect(getPreviousPhaseIds("intake")).toEqual([]);
    expect(getPreviousPhaseIds("market")).toEqual(["intake"]);
    expect(getPreviousPhaseIds("strategy")).toEqual([
      "intake",
      "market",
      "competitor",
    ]);
    expect(getPreviousPhaseIds("pitch")).toHaveLength(8);
    expect(getPreviousPhaseIds("nonexistent")).toEqual([]);
  });

  // REQ-4 — skill mapping is intrinsic
  it("maps every phase id to its canonical skill id", () => {
    const expected: Record<string, string> = {
      intake: "startup-design",
      market: "market-sizing",
      competitor: "startup-competitors",
      strategy: "lean-canvas",
      premortem: "pre-mortem",
      positioning: "startup-positioning",
      execution: "create-prd",
      gtm: "gtm-strategy",
      pitch: "startup-pitch",
    };
    for (const [id, skillId] of Object.entries(expected)) {
      expect(getPhase(id)?.skillId, `${id} → skillId`).toBe(skillId);
    }
  });

  // REQ-6 — type safety
  it("PHASE_IDS is a readonly PhaseId[] derived from the const", () => {
    const check: readonly PhaseId[] = PHASE_IDS;
    expect(check.length).toBe(9);
    // Each element must be a known PhaseId at compile time — this line
    // would fail to compile if PHASE_IDS widened to string[].
    const first: PhaseId = PHASE_IDS[0];
    expect(first).toBe("intake");
  });
});
