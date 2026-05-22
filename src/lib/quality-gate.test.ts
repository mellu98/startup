import { describe, expect, it, vi } from "vitest";
import {
  parseQualityReview,
  shouldRegenerate,
  runQualityGate,
  type QualityGateClient,
} from "./quality-gate";

describe("quality-gate", () => {
  it("parses critic JSON from plain text or fenced blocks", () => {
    expect(
      parseQualityReview('```json\n{"score":82,"issues":[{"type":"facts","severity":"medium","suggestion":"Aggiungi fonti"}]}\n```')
    ).toEqual({
      score: 82,
      issues: [
        {
          type: "facts",
          severity: "medium",
          suggestion: "Aggiungi fonti",
        },
      ],
    });
  });

  it("falls back to a blocking review when critic output is malformed", () => {
    expect(parseQualityReview("non-json")).toEqual({
      score: 0,
      issues: [
        {
          type: "parser",
          severity: "high",
          suggestion: "Il critic non ha restituito JSON valido.",
        },
      ],
    });
  });

  it("regenerates only below threshold", () => {
    expect(shouldRegenerate({ score: 69, issues: [] }, 70)).toBe(true);
    expect(shouldRegenerate({ score: 70, issues: [] }, 70)).toBe(false);
  });

  it("runs critic and one regeneration pass when score is low", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                '{"score":45,"issues":[{"type":"sources","severity":"high","suggestion":"Cita fonti o dichiara stime."}]}',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "# Documento migliorato" } }],
      });

    const client: QualityGateClient = {
      chat: { completions: { create } },
    };

    const result = await runQualityGate({
      client,
      phaseId: "market",
      document: "# Documento debole",
      conversation: "Founder: idea",
      contextSection: "",
      threshold: 70,
      primaryModel: "primary",
      criticModel: "critic",
    });

    expect(result.document).toBe("# Documento migliorato");
    expect(result.regenerated).toBe(true);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
