import Link from "next/link";
import { getValidation, computeValidationStatus } from "@/lib/validation";
import { readState } from "@/lib/state";

export const dynamic = "force-dynamic";

function scoreColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function scoreTextColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

export default async function ValidationPage() {
  const { idea_text, scorecard } = getValidation();
  const state = await readState();

  const status = computeValidationStatus(
    scorecard,
    state.phases.map((p) => ({
      id: p.id,
      status: p.status,
      final_document: p.final_document ?? null,
    }))
  );

  const completedCount = status.dimensions.filter((d) => d.source === "phase").length;
  const totalCount = status.dimensions.length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Torna alla Dashboard
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Stato di Validazione
      </h1>
      {idea_text && (
        <p className="mb-6 text-sm text-zinc-500">
          Idea validata: <span className="italic">{idea_text}</span>
        </p>
      )}

      {!scorecard ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Non hai ancora validato la tua idea.
          </p>
          <Link
            href="/"
            className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Valida la tua idea →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`text-5xl font-bold ${scoreTextColor(
                    status.overallScore
                  )}`}
                >
                  {status.overallScore}
                  <span className="text-xl text-zinc-400">/100</span>
                </div>
                <div>
                  <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {status.verdict}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {completedCount}/{totalCount} dimensioni confermate dai
                    dati delle fasi
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {status.dimensions.map((dim) => (
                <div key={dim.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {dim.name}
                      </span>
                      {dim.source === "phase" ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Validato
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Stima iniziale
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      {dim.score}/100
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-2.5 rounded-full ${scoreColor(dim.score)}`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{dim.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {status.redFlags.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-950/20">
              <h3 className="mb-3 text-sm font-semibold text-red-800 dark:text-red-200">
                Red Flag
              </h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-red-700 dark:text-red-300">
                {status.redFlags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {status.recommendations.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/30 dark:bg-blue-950/20">
              <h3 className="mb-3 text-sm font-semibold text-blue-800 dark:text-blue-200">
                Raccomandazioni
              </h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-blue-700 dark:text-blue-300">
                {status.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
