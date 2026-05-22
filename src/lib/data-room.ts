import JSZip from "jszip";
import type { BrandProfile } from "./brand-profile";
import type { PhaseState } from "./state";
import { getPhaseLabel } from "./phases";

export type CreateDataRoomInput = {
  brand: BrandProfile;
  phases: PhaseState[];
  pdfs: Map<string, Uint8Array>;
  pitchDeckPdf?: Uint8Array;
};

export function buildDataRoomIndexHtml(
  brand: BrandProfile,
  phases: PhaseState[]
): string {
  const links = phases
    .filter((phase) => phase.status === "completed" && phase.final_document)
    .map(
      (phase) =>
        `<li><a href="documents/${phase.id}-documento.pdf">${escapeHtml(
          getPhaseLabel(phase.id)
        )}</a></li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(brand.companyName)} — Data Room</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 48px; color: #111827; }
    h1 { font-size: 42px; letter-spacing: -0.04em; }
    a { color: ${brand.primaryColor}; font-weight: 700; }
    .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 24px; max-width: 760px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(brand.companyName)} Data Room</h1>
    <p>${escapeHtml(brand.industryTagline)}</p>
    <p><strong>Founder:</strong> ${escapeHtml(brand.founderNames || "N/D")}</p>
    <h2>Deliverable</h2>
    <ul>
      <li><a href="pitch-deck.pdf">Pitch deck</a></li>
      ${links}
    </ul>
  </div>
</body>
</html>`;
}

export async function createDataRoomZip(
  input: CreateDataRoomInput
): Promise<Uint8Array> {
  const zip = new JSZip();
  const completed = input.phases.filter(
    (phase) => phase.status === "completed" && phase.final_document
  );

  zip.file("index.html", buildDataRoomIndexHtml(input.brand, completed));
  zip.file(
    "00-README.md",
    `# ${input.brand.companyName} Data Room

Confidenziale. Materiale generato per due diligence preliminare.

Contatto founder: ${input.brand.founderNames || "N/D"}
`
  );

  for (const phase of completed) {
    zip.file(`documents/${phase.id}-documento.md`, phase.final_document ?? "");
    const pdf = input.pdfs.get(phase.id);
    if (pdf) zip.file(`documents/${phase.id}-documento.pdf`, pdf);
  }

  if (input.pitchDeckPdf) {
    zip.file("pitch-deck.pdf", input.pitchDeckPdf);
  }

  return zip.generateAsync({ type: "uint8array" });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
