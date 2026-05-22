import { describe, expect, it } from "vitest";
import {
  PITCH_SLIDE_TITLES,
  buildPitchDeckMarkdown,
  parsePitchDeckSlides,
  renderPitchDeckHtml,
} from "./pitch-deck";

describe("pitch-deck", () => {
  it("builds exactly the 10 standard investor slides", () => {
    const deck = buildPitchDeckMarkdown("# Pitch\n\n## Problem\nDolore\n\n## Solution\nSoluzione");
    const slides = parsePitchDeckSlides(deck);

    expect(slides.map((slide) => slide.title)).toEqual(PITCH_SLIDE_TITLES);
    expect(slides).toHaveLength(10);
  });

  it("renders standalone branded slide HTML", () => {
    const html = renderPitchDeckHtml(
      buildPitchDeckMarkdown("# Pitch\n\n## Ask\n€500k"),
      {
        companyName: "Acme AI",
        founderNames: "Mario Rossi",
        logoDataUrl: null,
        primaryColor: "#7c3aed",
        industryTagline: "AI per retail",
      }
    );

    expect(html).toContain("Acme AI");
    expect(html).toContain("slide-10");
    expect(html).toContain("AI per retail");
  });
});
