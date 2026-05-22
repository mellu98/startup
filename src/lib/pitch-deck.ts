import { markdownToHtml } from "./markdown";
import type { BrandProfile } from "./brand-profile";
import { DEFAULT_BRAND_PROFILE } from "./brand-profile";

export const PITCH_SLIDE_TITLES = [
  "Title",
  "Problem",
  "Solution",
  "Market",
  "Business Model",
  "Traction",
  "Competition",
  "Team",
  "Financial Projections",
  "Ask",
] as const;

export type PitchSlide = {
  title: (typeof PITCH_SLIDE_TITLES)[number];
  content: string;
};

const SECTION_ALIASES: Record<string, (typeof PITCH_SLIDE_TITLES)[number]> = {
  title: "Title",
  titolo: "Title",
  problem: "Problem",
  problema: "Problem",
  solution: "Solution",
  soluzione: "Solution",
  market: "Market",
  mercato: "Market",
  "business model": "Business Model",
  monetizzazione: "Business Model",
  traction: "Traction",
  trazione: "Traction",
  competition: "Competition",
  competitor: "Competition",
  team: "Team",
  "financial projections": "Financial Projections",
  finanza: "Financial Projections",
  ask: "Ask",
  richiesta: "Ask",
};

function normalizeHeading(heading: string): string {
  return heading
    .replace(/^\d+[\).]\s*/, "")
    .trim()
    .toLowerCase();
}

export function buildPitchDeckMarkdown(markdown: string): string {
  const sections = new Map<string, string>();
  const lines = markdown.split(/\r?\n/);
  let current: string | null = null;
  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/)?.[1];
    if (heading) {
      const alias = SECTION_ALIASES[normalizeHeading(heading)];
      if (alias) {
        current = alias;
        if (!sections.has(alias)) sections.set(alias, "");
        continue;
      }
    }
    if (current) sections.set(current, `${sections.get(current) ?? ""}${line}\n`);
  }

  return PITCH_SLIDE_TITLES.map((title, index) => {
    const content = sections.get(title)?.trim();
    const fallback =
      title === "Title"
        ? markdown.split(/\r?\n/).find((line) => line.trim()) ?? "Pitch"
        : "_Da completare con evidenze e assunzioni._";
    return `## ${index + 1}. ${title}\n\n${content || fallback}`;
  }).join("\n\n---\n\n");
}

export function parsePitchDeckSlides(markdown: string): PitchSlide[] {
  return markdown.split(/\n---+\n/).map((chunk, index) => {
    const title = PITCH_SLIDE_TITLES[index] ?? "Title";
    const content = chunk.replace(/^##\s+\d+\.\s+.+\n?/, "").trim();
    return { title, content };
  }).slice(0, PITCH_SLIDE_TITLES.length);
}

export function renderPitchDeckHtml(
  markdown: string,
  brand: BrandProfile = DEFAULT_BRAND_PROFILE
): string {
  const slides = parsePitchDeckSlides(markdown);
  const accent = brand.primaryColor;
  const slideHtml = slides
    .map(
      (slide, index) => `<section class="slide slide-${index + 1}">
        <div class="slide-kicker">${index + 1} / ${slides.length}</div>
        <h1>${escapeHtml(slide.title)}</h1>
        <div class="slide-content">${markdownToHtml(slide.content)}</div>
      </section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(brand.companyName)} — Pitch Deck</title>
  <style>
    @page { size: 16in 9in; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, "Segoe UI", Arial, sans-serif; color: #111827; background: #0f172a; }
    .deck-cover { width: 100vw; min-height: 100vh; padding: 72px; color: white; background: radial-gradient(circle at top right, ${accent}, #111827 48%); page-break-after: always; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
    .tagline { margin-top: 12px; color: #dbeafe; font-size: 24px; }
    .deck-title { margin-top: 180px; font-size: 84px; line-height: .95; max-width: 980px; }
    .founders { margin-top: 32px; font-size: 22px; color: #cbd5e1; }
    .slide { width: 100vw; min-height: 100vh; padding: 64px 80px; background: #ffffff; page-break-after: always; position: relative; }
    .slide:before { content: ""; position: absolute; inset: 0 0 auto; height: 14px; background: ${accent}; }
    .slide-kicker { color: ${accent}; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: 14px; }
    .slide h1 { font-size: 58px; margin: 24px 0 28px; letter-spacing: -0.04em; }
    .slide-content { font-size: 28px; line-height: 1.35; max-width: 1100px; }
    .slide-content li { margin: 10px 0; }
    .slide-content table { width: 100%; border-collapse: collapse; font-size: 20px; }
    .slide-content th, .slide-content td { border: 1px solid #e5e7eb; padding: 12px; }
  </style>
</head>
<body>
  <section class="deck-cover">
    <div class="brand">${escapeHtml(brand.companyName)}</div>
    <div class="tagline">${escapeHtml(brand.industryTagline)}</div>
    <h1 class="deck-title">Pitch Deck</h1>
    <div class="founders">${escapeHtml(brand.founderNames || "Founder team")}</div>
  </section>
  ${slideHtml}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
