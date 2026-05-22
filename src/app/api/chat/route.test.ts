import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const assertApiKey = vi.fn();
const createCompletion = vi.fn();
const getPhase = vi.fn();
const readState = vi.fn();
const updatePhase = vi.fn();

const mockClient = {
  chat: {
    completions: {
      create: createCompletion,
    },
  },
};

vi.mock("@/lib/openrouter", () => ({
  assertApiKey,
  getOpenRouter: () => mockClient,
}));

vi.mock("@/lib/state", () => ({
  getPhase,
  readState,
  updatePhase,
  getPreviousPhases: vi.fn(() => []),
}));

vi.mock("@/lib/skills", () => ({
  getSkillContent: vi.fn(() => ({ content: "Guida test" })),
}));

function jsonRequest(body: unknown, ip = "127.0.0.1"): NextRequest {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

async function* streamText(text: string) {
  yield { choices: [{ delta: { content: text } }] };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertApiKey.mockImplementation(() => undefined);
    createCompletion.mockResolvedValue(streamText("Risposta"));
    getPhase.mockResolvedValue({
      id: "intake",
      status: "unlocked",
      chat_history: [],
      final_document: null,
      context_snapshot: null,
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    readState.mockResolvedValue({ phases: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 for invalid input before touching API keys or the database", async () => {
    const { POST } = await import("./route");

    const res = await POST(jsonRequest({ phaseId: "intake" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Richiesta non valida",
      issues: [{ path: "message" }],
    });
    expect(assertApiKey).not.toHaveBeenCalled();
    expect(getPhase).not.toHaveBeenCalled();
  });

  it("streams a valid chat response and persists the sanitized assistant message", async () => {
    const { POST } = await import("./route");

    const res = await POST(
      jsonRequest({ phaseId: "intake", message: "__start__" }, "127.0.0.2")
    );

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("Risposta");
    expect(assertApiKey).toHaveBeenCalledOnce();
    expect(updatePhase).toHaveBeenCalledWith("intake", {
      chat_history: [
        { role: "user", content: "Sono pronto per iniziare questa fase." },
        { role: "assistant", content: "Risposta" },
      ],
      status: "in_progress",
    });
  });
});
