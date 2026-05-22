import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const assertApiKey = vi.fn();
const createCompletion = vi.fn();
const getPhase = vi.fn();
const readState = vi.fn();

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
  getPreviousPhases: vi.fn(() => []),
}));

function postRequest(headers?: HeadersInit): NextRequest {
  return new Request("http://localhost/api/phase/intake/document", {
    method: "POST",
    headers: {
      "x-forwarded-for": "127.0.0.10",
      ...headers,
    },
  }) as NextRequest;
}

describe("POST /api/phase/[id]/document", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    assertApiKey.mockImplementation(() => undefined);
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: "# Documento" } }],
    });
    getPhase.mockResolvedValue({
      id: "intake",
      status: "in_progress",
      chat_history: [{ role: "user", content: "Idea" }],
      final_document: null,
      context_snapshot: null,
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    readState.mockResolvedValue({ phases: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 for invalid phase params before API key checks", async () => {
    const { POST } = await import("./route");

    const res = await POST(postRequest(), {
      params: Promise.resolve({ id: "not-real" }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Richiesta non valida",
      issues: [{ path: "id" }],
    });
    expect(assertApiKey).not.toHaveBeenCalled();
  });

  it("returns the generated document when params are valid", async () => {
    const { POST } = await import("./route");

    const res = await POST(postRequest(), {
      params: Promise.resolve({ id: "intake" }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ document: "# Documento" });
    expect(assertApiKey).toHaveBeenCalledOnce();
  });
});
