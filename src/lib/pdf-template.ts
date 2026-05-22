import { markdownToHtml } from "@/lib/markdown";
import { getPhaseLabel } from "@/lib/phases";
import type { BrandProfile } from "@/lib/brand-profile";
import { DEFAULT_BRAND_PROFILE } from "@/lib/brand-profile";

const COPYRIGHT = "\u00A9";

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s+on\w+\s*=\s*[^>\s]+/gi, "")
    .replace(/javascript:/gi, "");
}

export function buildPdfHtml(
  phaseId: string,
  markdown: string,
  brand: BrandProfile = DEFAULT_BRAND_PROFILE
): string {
  const title = getPhaseLabel(phaseId);
  const date = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const rawHtml = markdownToHtml(markdown);
  const bodyHtml = sanitizeHtml(rawHtml);
  const tocHtml = buildTableOfContents(markdown);
  const summaryHtml = buildExecutiveSummary(markdown);
  const visualHtml = buildPhaseVisual(phaseId, brand.primaryColor);
  const logoHtml = brand.logoDataUrl
    ? `<img class="brand-logo-img" src="${escapeHtml(brand.logoDataUrl)}" alt="${escapeHtml(brand.companyName)} logo" />`
    : `<div class="brand-logo-mark">${escapeHtml(initials(brand.companyName))}</div>`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(brand.companyName)} ? ${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 22mm 18mm 26mm 18mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.8pt; line-height: 1.62; color: #111827; margin: 0; padding: 0; }
    .cover { min-height: 92vh; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; padding: 20mm 0 12mm; }
    .cover-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .brand-lockup { display: flex; gap: 14px; align-items: center; }
    .brand-logo-img { width: 54px; height: 54px; object-fit: contain; }
    .brand-logo-mark { width: 54px; height: 54px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; color: white; background: ${brand.primaryColor}; font-weight: 800; font-size: 18pt; }
    .company { font-size: 18pt; font-weight: 800; letter-spacing: -0.03em; }
    .tagline { color: #64748b; font-size: 10pt; margin-top: 3px; }
    .confidential { color: ${brand.primaryColor}; border: 1px solid ${brand.primaryColor}; border-radius: 999px; padding: 6px 12px; font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
    .cover-title { font-size: 36pt; line-height: 1.02; max-width: 620px; letter-spacing: -0.05em; margin: 70px 0 16px; }
    .cover-meta { color: #475569; font-size: 12pt; }
    .cover-rule { width: 90px; height: 5px; background: ${brand.primaryColor}; border-radius: 999px; margin: 26px 0; }
    .founder { color: #334155; font-weight: 600; }
    .toc, .executive-summary, .phase-visual-card { page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 18px; padding: 20px; margin: 0 0 18px; background: #f8fafc; }
    .toc h2, .executive-summary h2, .phase-visual-card h2 { margin-top: 0; color: #0f172a; }
    .toc ol { columns: 2; padding-left: 20px; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .summary-item { background: white; border: 1px solid #e5e7eb; border-left: 4px solid ${brand.primaryColor}; border-radius: 12px; padding: 10px 12px; }
    .market-visual, .strategy-visual, .risk-visual, .generic-visual { width: 100%; min-height: 170px; display: grid; place-items: center; }
    .visual-row { display: flex; gap: 14px; width: 100%; }
    .visual-box { flex: 1; border-radius: 16px; padding: 18px; color: white; background: ${brand.primaryColor}; font-weight: 800; text-align: center; }
    .risk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 80%; }
    .risk-grid div { min-height: 42px; border-radius: 10px; background: #e2e8f0; }
    .risk-grid div:nth-child(3), .risk-grid div:nth-child(6), .risk-grid div:nth-child(9) { background: ${brand.primaryColor}; }
    h1 { font-size: 20pt; font-weight: 800; color: #0f172a; margin: 30px 0 10px; letter-spacing: -0.03em; page-break-after: avoid; }
    h2 { font-size: 14.5pt; font-weight: 750; color: #111827; margin: 22px 0 8px; page-break-after: avoid; }
    h3 { font-size: 12pt; font-weight: 700; color: #1f2937; margin: 16px 0 7px; page-break-after: avoid; }
    p { margin: 0 0 10px; orphans: 3; widows: 3; }
    strong { color: #020617; }
    a { color: ${brand.primaryColor}; text-decoration: none; }
    ul, ol { margin: 0 0 12px; padding-left: 22px; }
    li { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 9.8pt; page-break-inside: avoid; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 800; }
    tr:nth-child(even) { background: #f8fafc; }
    blockquote { margin: 12px 0; padding: 10px 14px; border-left: 4px solid ${brand.primaryColor}; background: #f8fafc; color: #334155; font-style: italic; }
    code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 9.5pt; background: #f1f5f9; padding: 2px 5px; border-radius: 5px; }
    pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 10px; overflow-x: auto; font-size: 9pt; line-height: 1.5; page-break-inside: avoid; }
    pre code { background: transparent; color: inherit; padding: 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .footer-note { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 8.8pt; }
  </style>
</head>
<body>
  <section class="cover">
    <div class="cover-top">
      <div class="brand-lockup">${logoHtml}<div><div class="company">${escapeHtml(brand.companyName)}</div><div class="tagline">${escapeHtml(brand.industryTagline)}</div></div></div>
      <div class="confidential">Confidenziale</div>
    </div>
    <div>
      <div class="cover-rule"></div>
      <h1 class="cover-title">${escapeHtml(title)}</h1>
      <div class="cover-meta">Fase ${escapeHtml(phaseId)} ? ${escapeHtml(date)}</div>
      ${brand.founderNames ? `<p class="founder">Founder: ${escapeHtml(brand.founderNames)}</p>` : ""}
    </div>
    <div class="footer-note">${COPYRIGHT} ${escapeHtml(brand.companyName)} - Confidential</div>
  </section>

  ${summaryHtml}
  ${tocHtml}
  ${visualHtml}

  <main class="content">${bodyHtml}</main>
  <div class="footer-note">${COPYRIGHT} ${escapeHtml(brand.companyName)} - Confidential</div>
</body>
</html>`;
}

function buildExecutiveSummary(markdown: string): string {
  const bullets = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*+]\s+/.test(line))
    .map((line) => line.replace(/^[-*+]\s+/, ""))
    .slice(0, 5);
  const items = (bullets.length ? bullets : ["Documento generato dalle evidenze raccolte nella fase."])
    .map((item) => `<div class="summary-item">${escapeHtml(item)}</div>`)
    .join("");
  return `<section class="executive-summary"><h2>Executive Summary</h2><div class="summary-grid">${items}</div></section>`;
}

function buildTableOfContents(markdown: string): string {
  const headings = markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 12);
  if (headings.length === 0) return "";
  return `<section class="toc"><h2>Indice</h2><ol>${headings.map((heading) => `<li>${escapeHtml(heading)}</li>`).join("")}</ol></section>`;
}

function buildPhaseVisual(phaseId: string, accent: string): string {
  if (phaseId === "market") {
    return `<section class="phase-visual-card market-visual"><h2>Vista mercato</h2><svg width="360" height="180" viewBox="0 0 360 180" role="img" aria-label="TAM SAM SOM"><circle cx="180" cy="90" r="80" fill="${accent}" opacity="0.18"/><circle cx="180" cy="90" r="52" fill="${accent}" opacity="0.35"/><circle cx="180" cy="90" r="24" fill="${accent}" opacity="0.78"/><text x="180" y="32" text-anchor="middle" font-size="18" font-weight="800">TAM</text><text x="180" y="86" text-anchor="middle" font-size="16" font-weight="800">SAM</text><text x="180" y="96" text-anchor="middle" font-size="11" fill="white">SOM</text></svg></section>`;
  }
  if (phaseId === "strategy") {
    return `<section class="phase-visual-card strategy-visual"><h2>Canvas strategico</h2><div class="visual-row"><div class="visual-box">Problema</div><div class="visual-box">Soluzione</div><div class="visual-box">Go-to-market</div></div></section>`;
  }
  if (phaseId === "premortem") {
    return `<section class="phase-visual-card risk-visual"><h2>Matrice rischio</h2><div class="risk-grid"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></section>`;
  }
  return `<section class="phase-visual-card generic-visual"><h2>Framework fase</h2><div class="visual-row"><div class="visual-box">Insight</div><div class="visual-box">Decisioni</div><div class="visual-box">Prossime azioni</div></div></section>`;
}

function initials(companyName: string): string {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SV";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
