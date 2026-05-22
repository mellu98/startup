"use client";

import React, { useCallback, useEffect, useState } from "react";
import ChatInterface from "./ChatInterface";
import ContextSidebar from "./ContextSidebar";
import SkillRenderer from "./SkillRenderer";
import { markdownToHtml } from "@/lib/markdown";
import Link from "next/link";

interface PhaseWorkspaceProps {
  phaseId: string;
  skillContent: string;
}

export default function PhaseWorkspace({
  phaseId,
  skillContent,
}: PhaseWorkspaceProps) {
  const [phaseData, setPhaseData] = useState<{
    chat_history: { role: "user" | "assistant"; content: string }[];
    final_document: string | null;
    status: string;
  } | null>(null);
  const [documentDraft, setDocumentDraft] = useState<string | null>(null);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDeck, setExportingDeck] = useState(false);

  const refreshPhaseData = useCallback(() => {
    fetch(`/api/phase/${phaseId}`)
      .then((r) => r.json())
      .then(setPhaseData)
      .catch(console.error);
  }, [phaseId]);

  useEffect(() => {
    refreshPhaseData();
  }, [refreshPhaseData]);

  const handleGenerateDocument = async () => {
    setGeneratingDoc(true);
    try {
      const res = await fetch(`/api/phase/${phaseId}/document`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.document) {
        setDocumentDraft(data.document);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingDoc(false);
    }
  };

  const handleComplete = async () => {
    if (!documentDraft) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/phase/${phaseId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: documentDraft }),
      });
      const data = await res.json();
      if (data.success) {
        setPhaseData((prev) =>
          prev ? { ...prev, status: "completed", final_document: documentDraft } : prev
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const handleDownload = () => {
    if (!documentDraft) return;
    const blob = new Blob([documentDraft], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${phaseId}-documento.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async (sourceDoc?: string) => {
    const doc = sourceDoc ?? documentDraft;
    if (!doc) return;
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/phase/${phaseId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${phaseId}-documento.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Errore durante la generazione del PDF. Riprova.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportDeck = async (sourceDoc?: string) => {
    const doc = sourceDoc ?? documentDraft ?? phaseData?.final_document;
    if (!doc || phaseId !== "pitch") return;
    setExportingDeck(true);
    try {
      const res = await fetch("/api/phase/pitch/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pitch-deck.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Deck export failed:", err);
      alert("Errore durante la generazione del pitch deck.");
    } finally {
      setExportingDeck(false);
    }
  };

  if (!phaseData) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row lg:gap-6">
      {/* Colonna principale */}
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        {/* Skill Guide espandibile */}
        <details className="group rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-bold">
            <span>Guida Skill</span>
            <span className="text-sm text-zinc-500 transition-transform duration-200 group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="mt-4">
            <SkillRenderer content={skillContent} />
          </div>
        </details>

        {/* Chat o Documento */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {phaseData.status === "completed" && phaseData.final_document ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Fase Completata ✅</h3>
                <Link
                  href="/"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  ← Torna alla Dashboard
                </Link>
              </div>
              <div
                className="max-h-96 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(phaseData.final_document),
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const blob = new Blob([phaseData.final_document!], {
                      type: "text/markdown",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${phaseId}-documento.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Scarica .md
                </button>
                <button
                  onClick={() => handleExportPdf(phaseData.final_document!)}
                  disabled={exportingPdf}
                  className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {exportingPdf ? "Generando PDF..." : "Salva come PDF"}
                </button>
                {phaseId === "pitch" && (
                  <button
                    onClick={() => handleExportDeck(phaseData.final_document!)}
                    disabled={exportingDeck}
                    className="flex-1 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    {exportingDeck ? "Generando deck..." : "Genera Pitch Deck"}
                  </button>
                )}
              </div>
            </div>
          ) : documentDraft ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold">Documento Generato</h3>
              <div
                className="max-h-96 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(documentDraft),
                }}
              />
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="flex-1 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-50"
                  >
                    {completing ? "Completando..." : "✅ Approva & Completa Fase"}
                  </button>
                  <button
                    onClick={() => setDocumentDraft(null)}
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Modifica
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Scarica .md
                  </button>
                  <button
                    onClick={() => handleExportPdf()}
                    disabled={exportingPdf}
                    className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    {exportingPdf ? "Generando PDF..." : "Salva come PDF"}
                  </button>
                  {phaseId === "pitch" && (
                    <button
                      onClick={() => handleExportDeck()}
                      disabled={exportingDeck}
                      className="flex-1 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                    >
                      {exportingDeck ? "Generando deck..." : "Genera Pitch Deck"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <ChatInterface
                phaseId={phaseId}
                initialMessages={phaseData.chat_history}
                onExchangeComplete={refreshPhaseData}
              />

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleGenerateDocument}
                  disabled={generatingDoc || phaseData.chat_history.length < 4}
                  className="rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {generatingDoc
                    ? "Generando documento..."
                    : "📄 Genera Documento Finale"}
                </button>
                {phaseData.chat_history.length < 4 && (
                  <p className="text-xs text-zinc-500">Continua la conversazione per almeno 2 scambi prima di generare il documento.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar contesto */}
      <aside className="w-full shrink-0 lg:w-80">
        <ContextSidebar />
      </aside>
    </div>
  );
}
