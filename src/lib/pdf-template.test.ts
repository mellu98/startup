import { describe, expect, it } from "vitest";
import { buildPdfHtml } from "./pdf-template";

describe("buildPdfHtml investor template", () => {
  it("renders a branded confidential cover, TOC, executive summary, and phase visual", () => {
    const html = buildPdfHtml(
      "market",
      "# Market\n\n## TAM\n\n- TAM: €1B\n- SAM: €100M\n\n## Trend\nCrescita forte",
      {
        companyName: "Acme AI",
        founderNames: "Mario Rossi",
        logoDataUrl: "data:image/png;base64,abc",
        primaryColor: "#16a34a",
        industryTagline: "AI per retail",
      }
    );

    expect(html).toContain("Acme AI");
    expect(html).toContain("Mario Rossi");
    expect(html).toContain("Confidenziale");
    expect(html).toContain("Executive Summary");
    expect(html).toContain("Indice");
    expect(html).toContain("market-visual");
    expect(html).toContain("© Acme AI - Confidential");
    expect(html).not.toContain("Startup Validation OS — market");
  });

  it("keeps dangerous HTML out of the investor PDF body", () => {
    const html = buildPdfHtml("pitch", '<script>alert("x")</script>\n# Pitch');

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
