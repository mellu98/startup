import { NextRequest } from "next/server";
import { getPhase } from "@/lib/state";
import { buildPdfHtml } from "@/lib/pdf-template";
import { getBrandProfile } from "@/lib/brand-profile";
import { renderPdfHtml } from "@/lib/pdf-renderer";
import {
  internalErrorResponse,
  parseOptionalJsonRequest,
  pdfRequestSchema,
  phaseParamsSchema,
  validateParams,
} from "@/lib/api-validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const routeParams = validateParams(await params, phaseParamsSchema);
    if (!routeParams.success) return routeParams.response;

    const input = await parseOptionalJsonRequest(req, pdfRequestSchema);
    if (!input.success) return input.response;

    const { id } = routeParams.data;
    let markdown = input.data.document;
    if (!markdown) {
      const phase = await getPhase(id);
      if (!phase) {
        return new Response("Fase non trovata", { status: 404 });
      }
      markdown = phase.final_document ?? "";
    }

    if (!markdown) {
      return new Response("Nessun documento disponibile", { status: 400 });
    }

    const brand = await getBrandProfile();
    const html = buildPdfHtml(id, markdown, brand);
    const pdfBuffer = await renderPdfHtml(html, {
      headerTemplate: `<div style="font-size:9pt;color:#64748b;width:100%;text-align:center;padding:10px 20px 0;font-family:Segoe UI,Roboto,sans-serif;">
        ${brand.companyName} ? ${id}
      </div>`,
      footerTemplate: `<div style="font-size:9pt;color:#64748b;width:100%;text-align:center;padding:5px 20px;font-family:Segoe UI,Roboto,sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`,
    });

    return new Response(new Uint8Array(pdfBuffer).buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${id}-documento.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("PDF generation error:", err);
    return internalErrorResponse("Errore generazione PDF");
  }
}
