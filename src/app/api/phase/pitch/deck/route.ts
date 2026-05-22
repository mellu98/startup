import { NextRequest } from "next/server";
import { getPhase } from "@/lib/state";
import { getBrandProfile } from "@/lib/brand-profile";
import {
  buildPitchDeckMarkdown,
  renderPitchDeckHtml,
} from "@/lib/pitch-deck";
import { internalErrorResponse, parseOptionalJsonRequest } from "@/lib/api-validation";
import { z } from "zod";
import { renderPdfHtml } from "@/lib/pdf-renderer";

const pitchDeckRequestSchema = z.object({
  document: z.string().max(50000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const format =
      new URL(req.url).searchParams.get("format") === "html" ? "html" : "pdf";
    const input = await parseOptionalJsonRequest(req, pitchDeckRequestSchema);
    if (!input.success) return input.response;

    let markdown = input.data.document;
    if (!markdown) {
      const pitch = await getPhase("pitch");
      markdown = pitch?.final_document ?? "";
    }
    if (!markdown.trim()) {
      return Response.json(
        { error: "Nessun documento pitch disponibile" },
        { status: 400 }
      );
    }

    const brand = await getBrandProfile();
    const deckMarkdown = buildPitchDeckMarkdown(markdown);
    const html = renderPitchDeckHtml(deckMarkdown, brand);

    if (format === "html") {
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const pdf = await renderPdfHtml(html, {
      landscape: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return new Response(new Uint8Array(pdf).buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pitch-deck.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("Pitch deck generation error:", err);
    return internalErrorResponse("Errore generazione pitch deck");
  }
}
