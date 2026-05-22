import { readState } from "@/lib/state";
import { PHASE_IDS } from "@/lib/phases";
import { getBrandProfile } from "@/lib/brand-profile";
import { buildPdfHtml } from "@/lib/pdf-template";
import { renderPdfHtml } from "@/lib/pdf-renderer";
import { createDataRoomZip } from "@/lib/data-room";
import { buildPitchDeckMarkdown, renderPitchDeckHtml } from "@/lib/pitch-deck";
import { internalErrorResponse } from "@/lib/api-validation";

export async function POST() {
  try {
    const state = await readState();
    const phaseMap = new Map(state.phases.map((phase) => [phase.id, phase]));
    const allCompleted = PHASE_IDS.every((id) => {
      const phase = phaseMap.get(id);
      return phase?.status === "completed" && Boolean(phase.final_document);
    });

    if (!allCompleted) {
      return Response.json(
        { error: "Completa tutte le 9 fasi prima di esportare la data room." },
        { status: 409 }
      );
    }

    const brand = await getBrandProfile();
    const pdfs = new Map<string, Uint8Array>();
    for (const id of PHASE_IDS) {
      if (id === "pitch") continue;
      const phase = phaseMap.get(id);
      const html = buildPdfHtml(id, phase?.final_document ?? "", brand);
      pdfs.set(id, await renderPdfHtml(html));
    }

    const pitch = phaseMap.get("pitch");
    const pitchDeckHtml = renderPitchDeckHtml(
      buildPitchDeckMarkdown(pitch?.final_document ?? ""),
      brand
    );
    const pitchDeckPdf = await renderPdfHtml(pitchDeckHtml, {
      landscape: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    const zip = await createDataRoomZip({
      brand,
      phases: state.phases,
      pdfs,
      pitchDeckPdf,
    });

    return new Response(new Uint8Array(zip).buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="data-room.zip"`,
      },
    });
  } catch (err: unknown) {
    console.error("Data room export error:", err);
    return internalErrorResponse("Errore esportazione data room");
  }
}
