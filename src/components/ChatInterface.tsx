"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { markdownToHtml } from "@/lib/markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  phaseId: string;
  initialMessages: Message[];
  onExchangeComplete?: () => void;
}

export default function ChatInterface({
  phaseId,
  initialMessages,
  onExchangeComplete,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMsg, setLastUserMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [input]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const isAutoStart = text === "__start__";
      if (!isAutoStart) {
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setLastUserMsg(text);
      }
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phaseId, message: text }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `❌ Errore: ${err.error}` },
          ]);
          setLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setLoading(false);
          return;
        }

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last.role !== "assistant") return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunkText,
              };
              return updated;
            });
          }
        }
        onExchangeComplete?.();
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("L'agente ha impiegato troppo tempo a rispondere. Riprova.");
        } else {
          const message = err instanceof Error ? err.message : "Errore sconosciuto";
          setError(`Errore di rete: ${message}`);
        }
        // Remove the empty assistant message if streaming failed
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.content === "") {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [loading, onExchangeComplete, phaseId]
  );

  // Auto-start conversation when empty
  useEffect(() => {
    if (messages.length === 0 && !loading && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      sendMessage("__start__");
    }
  }, [loading, messages.length, sendMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const handleRetry = () => {
    if (lastUserMsg) {
      // Remove the previous error assistant message if present
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content.startsWith("❌")) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      sendMessage(lastUserMsg);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[60vh] min-h-[300px] flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {messages.length === 0 && !loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Inizia la conversazione con l&apos;agente AI...
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="prose prose-zinc prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(msg.content),
                  }}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400 delay-100" />
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400 delay-200" />
              <span className="ml-1 text-xs text-zinc-500">L&apos;agente sta pensando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
            <p>{error}</p>
            <button
              onClick={handleRetry}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 min-h-[44px]"
            >
              Riprova
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio all'agente..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Invia
        </button>
      </form>
    </div>
  );
}
