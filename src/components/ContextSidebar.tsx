"use client";

import React, { useEffect, useState } from "react";
import { getPhaseLabel } from "@/lib/phases";

interface PhaseState {
  id: string;
  status: string;
  context_snapshot: Record<string, unknown> | null;
  final_document: string | null;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function SnapshotValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-zinc-400">—</span>;
  if (typeof value === "string") return <span>{value}</span>;
  if (Array.isArray(value)) {
    return (
      <ul className="ml-4 list-disc text-sm">
        {value.map((item, idx) => (
          <li key={idx}>{String(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="ml-2 border-l-2 border-zinc-200 pl-2 text-sm dark:border-zinc-700">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="mb-1">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatKey(k)}:</span>{" "}
            <SnapshotValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

export default function ContextSidebar() {
  const [phases, setPhases] = useState<PhaseState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/phases")
      .then((r) => r.json())
      .then((data: PhaseState[]) => {
        setPhases(data.filter((p) => p.status === "completed"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">Caricamento contesto...</p>
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Cosa sappiamo finora
        </h3>
        <p className="text-sm text-zinc-500">
          Completa la prima fase per vedere qui i dati raccolti.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Cosa sappiamo finora
      </h3>

      {phases.map((phase) => (
        <details
          key={phase.id}
          className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                ✓
              </span>
              {getPhaseLabel(phase.id)}
            </span>
            <span className="text-xs text-zinc-400 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>

          <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
            {phase.context_snapshot ? (
              <div className="flex flex-col gap-2">
                {Object.entries(phase.context_snapshot).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {formatKey(key)}
                    </span>
                    <div className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">
                      <SnapshotValue value={value} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Documento completato ma dati non strutturati.
              </p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
