import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildDataRoomIndexHtml, createDataRoomZip } from "./data-room";
import type { PhaseState } from "./state";

const completedPhase: PhaseState = {
  id: "intake",
  status: "completed",
  chat_history: [],
  final_document: "# Intake\nDocumento",
  context_snapshot: null,
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("data-room", () => {
  it("builds an index page with company and deliverable links", () => {
    const html = buildDataRoomIndexHtml({
      companyName: "Acme AI",
      founderNames: "Mario Rossi",
      logoDataUrl: null,
      primaryColor: "#2563eb",
      industryTagline: "AI per retail",
    }, [completedPhase]);

    expect(html).toContain("Acme AI");
    expect(html).toContain("intake-documento.pdf");
  });

  it("creates a zip with index, readme, markdown and provided binary deliverables", async () => {
    const zipBuffer = await createDataRoomZip({
      brand: {
        companyName: "Acme AI",
        founderNames: "Mario Rossi",
        logoDataUrl: null,
        primaryColor: "#2563eb",
        industryTagline: "AI per retail",
      },
      phases: [completedPhase],
      pdfs: new Map([["intake", new Uint8Array([1, 2, 3])]]),
      pitchDeckPdf: new Uint8Array([4, 5, 6]),
    });

    const zip = await JSZip.loadAsync(zipBuffer);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        "index.html",
        "00-README.md",
        "documents/intake-documento.md",
        "documents/intake-documento.pdf",
        "pitch-deck.pdf",
      ])
    );
  });
});
