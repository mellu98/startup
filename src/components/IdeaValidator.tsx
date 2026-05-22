"use client";

import { useState } from "react";
import Link from "next/link";

type Dimension = {
  name: string;
  score: number;
  comment: string;
};

type ValidationResult = {
  overallScore: number;
  verdict: string;
  dimensions: Dimension[];
  redFlags: string[];
  recommendations: string[];
};

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

export default function IdeaValidator() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || idea.trim().length < 10) {
      setError("Descrivi l'idea con almeno 10 caratteri.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/validate-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Errore durante la validazione.");
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-2 text-xl font-semibold">
        Validazione rapida dell&apos;idea
      </h3>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Descrivi la tua idea in 2-3 righe. L&apos;AI ti darà un punteggio e un
        feedback immediato, prima di iniziare il processo completo.
      </p>

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Es: Un'app che connette freelance con piccole aziende che hanno bisogno di siti web veloci..."
            rows={4}
            className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 min-h-[44px] active:scale-[0.98]"
          >
            {loading ? "Valutazione in corso..." : "Valida idea"}
          </button>
        </form>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div
              className={`text-4xl font-bold ${scoreTextColor(
                result.overallScore
              )}`}
            >
              {result.overallScore}
              <span className="text-lg text-zinc-400">/100</span>
            </div>
            <div>
              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {result.verdict}
              </p>
              <p className="text-xs text-zinc-500">
                Questo è un pre-check: puoi comunque iniziare il processo
                completo.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {result.dimensions.map((dim) => (
              <div key={dim.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {dim.name}
                  </span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                    {dim.score}/100
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-2 rounded-full ${scoreColor(dim.score)}`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">{dim.comment}</p>
              </div>
            ))}
          </div>

          {result.redFlags.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
              <h4 className="mb-2 text-sm font-semibold text-red-800 dark:text-red-200">
                Red flag
              </h4>
              <ul className="list-disc space-y-1 pl-4 text-sm text-red-700 dark:text-red-300">
                {result.redFlags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
              <h4 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                Raccomandazioni
              </h4>
              <ul className="list-disc space-y-1 pl-4 text-sm text-blue-700 dark:text-blue-300">
                {result.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setResult(null);
                setIdea("");
              }}
              className="rounded-md border border-zinc-300 px-5 py-2 text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 min-h-[44px] active:scale-[0.98]"
            >
              Valuta un&apos;altra idea
            </button>
            <Link
              href="/phase/intake"
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 min-h-[44px] active:scale-[0.98]"
            >
              Inizia il processo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
