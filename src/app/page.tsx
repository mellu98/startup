import Link from "next/link";
import { readState, type PhaseStatus } from "@/lib/state";
import { PHASES } from "@/lib/phases";
import DataRoomButton from "@/components/DataRoomButton";
import IdeaValidator from "@/components/IdeaValidator";

function statusBadge(status: PhaseStatus) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Completata
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          In corso
        </span>
      );
    case "unlocked":
      return (
        <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Da iniziare
        </span>
      );
    case "locked":
      return (
        <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Bloccata
        </span>
      );
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await readState();
  const phaseMap = new Map(state.phases.map((p) => [p.id, p]));
  const allCompleted = PHASES.every(
    (phase) =>
      phaseMap.get(phase.id)?.status === "completed" &&
      Boolean(phaseMap.get(phase.id)?.final_document)
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Startup Validation OS
            </h2>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Un agente AI guidato, fase per fase, per validare la tua idea di
              startup dal concetto al pitch.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/validation"
              className="rounded-md border border-zinc-300 px-5 py-2 text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Stato di validazione
            </Link>
            <Link
              href="/settings"
              className="rounded-md border border-zinc-300 px-5 py-2 text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Impostazioni brand
            </Link>
            {allCompleted && <DataRoomButton />}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/30 dark:bg-blue-950/20"
      >
        <h3 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
          Come funziona Startup Validation OS
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-blue-800 dark:text-blue-200"
        >
          <li>
            <strong>9 fasi sequenziali</strong> — dall&apos;idea al pitch investitori. Devi completare una fase per sbloccare la successiva.
          </li>
          <li>
            <strong>AI Advisor</strong> — ogni fase è una conversazione guidata. L&apos;agente ti fa domande, approfondisce, e ti spinge a pensare.
          </li>
          <li>
            <strong>Documenti automatici</strong> — alla fine di ogni fase generiamo un documento markdown professionale che riassume tutto.
          </li>
          <li>
            <strong>Memoria totale</strong> — l&apos;AI ricorda tutto ciò che hai detto nelle fasi precedenti. Nessuna informazione si perde.
          </li>
        </ul>
      </div>

      <div className="mb-10">
        <IdeaValidator />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PHASES.map((phase, idx) => {
          const pState = phaseMap.get(phase.id);
          const isLocked = pState?.status === "locked";

          return (
            <div
              key={phase.id}
              className={`group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900 ${
                isLocked
                  ? "opacity-60"
                  : "hover:shadow-md"
              }`}
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {idx + 1}
                  </span>
                  {statusBadge(pState?.status ?? "locked")}
                </div>
                <h3 className="text-xl font-semibold">{phase.label}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {phase.description}
                </p>
              </div>
              <div className="mt-4">
                {isLocked ? (
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Completa la fase precedente per sbloccare
                  </span>
                ) : (
                  <Link
                    href={`/phase/${phase.id}`}
                    className="inline-flex items-center text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100 min-h-[44px]"
                  >
                    {pState?.status === "completed"
                      ? "Rivedi fase →"
                      : "Avvia fase →"}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
