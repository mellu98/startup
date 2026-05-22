import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const assertApiKey = vi.fn();
const createCompletion = vi.fn();
const getPhase = vi.fn();
const updatePhase = vi.fn();
const unlockNextPhase = vi.fn();

vi.mock("@/lib/openrouter", () => ({
  assertApiKey,
  openrouter: {
    chat: {
      completions: {
        create: createCompletion,
      },
    },
  },
}));

vi.mock("@/lib/state", () => ({
  getPhase,
  updatePhase,
  unlockNextPhase,
}));

function jsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/phase/intake/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("POST /api/phase/[id]/complete", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertApiKey.mockImplementation(() => undefined);
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: '{"problem":"Problema"}' } }],
    });
    getPhase.mockResolvedValue({
      id: "intake",
      status: "in_progress",
      chat_history: [],
      final_document: null,
      context_snapshot: null,
      updated_at: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns 400 for missing document before API key checks", async () => {
    const { POST } = await import("./route");

    const res = await POST(jsonRequest({}), {
      params: Promise.resolve({ id: "intake" }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Richiesta non valida",
      issues: [{ path: "document" }],
    });
    expect(assertApiKey).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid phase params before API key checks", async () => {
    const { POST } = await import("./route");

    const res = await POST(jsonRequest({ document: "# Documento" }), {
      params: Promise.resolve({ id: "not-real" }),
    });

    expect(res.status).toBe(400);
    expect(assertApiKey).not.toHaveBeenCalled();
  });

  it("completes an unlocked phase with a context snapshot", async () => {
    const { POST } = await import("./route");

    const res = await POST(jsonRequest({ document: "# Documento" }), {
      params: Promise.resolve({ id: "intake" }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(updatePhase).toHaveBeenCalledWith("intake", {
      final_document: "# Documento",
      status: "completed",
      context_snapshot: { problem: "Problema" },
    });
    expect(unlockNextPhase).toHaveBeenCalledWith("intake");
  });
});
