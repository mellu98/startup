import { describe, expect, it } from "vitest";
import {
  createStreamThinkFilter,
  formatContextSnapshot,
  sanitizeMojibake,
  stripThinkTags,
} from "./ai-utils";

describe("formatContextSnapshot", () => {
  it("returns an empty string for null snapshots and empty objects", () => {
    expect(formatContextSnapshot(null)).toBe("");
    expect(formatContextSnapshot({})).toBe("");
  });

  it("formats strings, numbers, booleans, arrays, and objects", () => {
    expect(
      formatContextSnapshot({
        problem: "Validazione lenta",
        score: 8,
        risky: false,
        competitors: ["A", "B"],
        metadata: { confidence: 0.8 },
        skipped: null,
      })
    ).toBe(
      'problem: Validazione lenta, score: 8, risky: false, competitors: A, B, metadata: {"confidence":0.8}'
    );
  });
});

describe("stripThinkTags", () => {
  it("strips a basic think block and trims the result", () => {
    expect(stripThinkTags("Prima <think>ragiono</think> Dopo")).toBe(
      "Prima  Dopo"
    );
  });

  it("strips multiple think blocks", () => {
    expect(stripThinkTags("<think>a</think>Uno<think>b</think>Due")).toBe(
      "UnoDue"
    );
  });

  it("leaves malformed open think tags untouched except for trimming", () => {
    expect(stripThinkTags(" A <think>senza chiusura ")).toBe(
      "A <think>senza chiusura"
    );
  });

  it("returns an empty string for non-string inputs", () => {
    expect(stripThinkTags(null)).toBe("");
    expect(stripThinkTags({ text: "ciao" })).toBe("");
  });
});

describe("createStreamThinkFilter", () => {
  it("returns non-think content after flushing the retained suffix", () => {
    const filter = createStreamThinkFilter();

    const streamed = filter("Ciao mondo");

    expect(streamed).toBe("Cia");
    expect(filter.flush()).toBe("o mondo");
  });

  it("filters think tags split across chunks", () => {
    const filter = createStreamThinkFilter();

    const output =
      filter("Ciao <thi") +
      filter("nk>segreto</think> mondo") +
      filter.flush();

    expect(output).toBe("Ciao  mondo");
  });

  it("filters multiple think blocks from a stream", () => {
    const filter = createStreamThinkFilter();

    const output =
      filter("A <think>uno</think> B <think>due</think> C") +
      filter.flush();

    expect(output).toBe("A  B  C");
  });

  it("drops an unterminated think block when the stream ends", () => {
    const filter = createStreamThinkFilter();

    const output = filter("Visibile <think>nascosto") + filter.flush();

    expect(output).toBe("Visibile ");
  });
});

describe("sanitizeMojibake", () => {
  it("removes replacement characters and collapses whitespace", () => {
    expect(sanitizeMojibake(" Ciao �  mondo ï¿½  ! ")).toBe("Ciao mondo !");
  });

  it("returns an empty string for non-string inputs", () => {
    expect(sanitizeMojibake(undefined)).toBe("");
    expect(sanitizeMojibake(42)).toBe("");
  });
});
