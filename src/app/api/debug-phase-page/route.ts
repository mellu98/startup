import { getPhase } from "@/lib/state";
import { getPhase as getPhaseMeta } from "@/lib/phases";
import { getSkillContent } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const id = "intake";
    const meta = getPhaseMeta(id);
    const skillId = meta?.skillId;
    if (!skillId) {
      return Response.json({ ok: false, step: "meta", error: "no skillId" });
    }

    const phase = await getPhase(id);
    if (!phase) {
      return Response.json({ ok: false, step: "phase", error: "no phase" });
    }

    const skill = getSkillContent(skillId);
    if (!skill) {
      return Response.json({ ok: false, step: "skill", error: "no skill" });
    }

    return Response.json({ ok: true, skillId, phaseStatus: phase.status });
  } catch (err: unknown) {
    const details = err instanceof Error ? { message: err.message, stack: err.stack, name: err.name } : String(err);
    return Response.json({ ok: false, step: "exception", error: details }, { status: 500 });
  }
}
