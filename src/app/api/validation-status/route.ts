import { getValidation, computeValidationStatus } from "@/lib/validation";
import { readState } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { scorecard } = getValidation();
    const state = await readState();

    const status = computeValidationStatus(
      scorecard,
      state.phases.map((p) => ({
        id: p.id,
        status: p.status,
        final_document: p.final_document ?? null,
      }))
    );

    return Response.json(status);
  } catch (err: unknown) {
    console.error("Validation status error:", err);
    return Response.json(
      { error: "Errore nel caricamento dello stato di validazione" },
      { status: 500 }
    );
  }
}
