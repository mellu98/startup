import { notFound } from "next/navigation";
import { getSkillContent } from "@/lib/skills";
import { getPhase } from "@/lib/state";
import { getPhase as getPhaseMeta } from "@/lib/phases";
import PhaseWorkspace from "@/components/PhaseWorkspace";
import Link from "next/link";

interface PhasePageProps {
  params: Promise<{ id: string }>;
}

export default async function PhasePage({ params }: PhasePageProps) {
  const { id } = await params;
  const skillId = getPhaseMeta(id)?.skillId;
  if (!skillId) return notFound();

  const phase = await getPhase(id);
  if (!phase) return notFound();

  if (phase.status === "locked") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-500"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Fase Bloccata</h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Devi completare la fase precedente per sbloccare questa.
        </p>
        <Link
          href="/"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Torna alla Dashboard
        </Link>
      </div>
    );
  }

  const skill = getSkillContent(skillId);
  if (!skill) return notFound();

  return (
    <div className="mx-auto flex w-full flex-1 flex-col px-6 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Torna alla Dashboard
        </Link>
      </div>

      <PhaseWorkspace phaseId={id} skillContent={skill.content} />
    </div>
  );
}
