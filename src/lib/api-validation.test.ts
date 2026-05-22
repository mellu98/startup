import { describe, expect, it, vi } from "vitest";
import {
  chatRequestSchema,
  completePhaseRequestSchema,
  parseJsonRequest,
  pdfRequestSchema,
  phaseParamsSchema,
  requireDocumentGenerationToken,
  validateParams,
} from "./api-validation";

function postJson(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return (await response.json()) as {
    error: string;
    issues?: Array<{ path: string; message: string }>;
  };
}

describe("api-validation schemas", () => {
  it("accepts a valid chat request", () => {
    expect(
      chatRequestSchema.safeParse({
        phaseId: "intake",
        message: "Ho un'idea da validare",
      }).success
    ).toBe(true);
  });

  it("rejects invalid phase ids and oversized chat messages", () => {
    const result = chatRequestSchema.safeParse({
      phaseId: "bad-phase",
      message: "x".repeat(4001),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
        "phaseId",
        "message",
      ]);
    }
  });

  it("requires a non-empty final document capped at 50000 characters", () => {
    expect(completePhaseRequestSchema.safeParse({ document: "# OK" }).success).toBe(
      true
    );
    expect(completePhaseRequestSchema.safeParse({ document: "" }).success).toBe(
      false
    );
    expect(
      completePhaseRequestSchema.safeParse({ document: "x".repeat(50001) })
        .success
    ).toBe(false);
  });

  it("allows an optional PDF document but caps it when present", () => {
    expect(pdfRequestSchema.safeParse({}).success).toBe(true);
    expect(pdfRequestSchema.safeParse({ document: "# Documento" }).success).toBe(
      true
    );
    expect(pdfRequestSchema.safeParse({ document: "x".repeat(50001) }).success).toBe(
      false
    );
  });

  it("validates dynamic phase route params against the canonical registry", () => {
    expect(validateParams({ id: "pitch" }, phaseParamsSchema).success).toBe(true);

    const invalid = validateParams({ id: "not-real" }, phaseParamsSchema);

    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.response.status).toBe(400);
    }
  });
});

describe("parseJsonRequest", () => {
  it("returns parsed data for valid JSON", async () => {
    const result = await parseJsonRequest(
      postJson({ phaseId: "intake", message: "__start__" }),
      chatRequestSchema
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ phaseId: "intake", message: "__start__" });
    }
  });

  it("returns a stable 400 envelope for schema failures", async () => {
    const result = await parseJsonRequest(
      postJson({ phaseId: "intake" }),
      chatRequestSchema
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      await expect(readJson(result.response)).resolves.toEqual({
        error: "Richiesta non valida",
        issues: [{ path: "message", message: expect.any(String) }],
      });
    }
  });

  it("returns a stable 400 envelope for malformed JSON", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });

    const result = await parseJsonRequest(req, chatRequestSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      await expect(readJson(result.response)).resolves.toEqual({
        error: "JSON non valido",
      });
    }
  });

  it("treats an empty body as an empty object when requested", async () => {
    const { parseOptionalJsonRequest } = await import("./api-validation");
    const req = new Request("http://localhost/api/test", {
      method: "POST",
    });

    const result = await parseOptionalJsonRequest(req, pdfRequestSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });
});

describe("requireDocumentGenerationToken", () => {
  it("does nothing when DOCUMENT_GENERATION_TOKEN is not configured", () => {
    vi.stubEnv("DOCUMENT_GENERATION_TOKEN", "");

    expect(requireDocumentGenerationToken(new Request("http://localhost"))).toBeNull();

    vi.unstubAllEnvs();
  });

  it("returns 401 when the shared secret is missing or wrong", async () => {
    vi.stubEnv("DOCUMENT_GENERATION_TOKEN", "secret");

    const missing = requireDocumentGenerationToken(new Request("http://localhost"));
    const wrong = requireDocumentGenerationToken(
      new Request("http://localhost", {
        headers: { "x-document-generation-token": "wrong" },
      })
    );

    expect(missing?.status).toBe(401);
    expect(wrong?.status).toBe(401);
    await expect(readJson(missing as Response)).resolves.toEqual({
      error: "Non autorizzato",
    });

    vi.unstubAllEnvs();
  });

  it("accepts the shared secret as a bearer token or explicit header", () => {
    vi.stubEnv("DOCUMENT_GENERATION_TOKEN", "secret");

    expect(
      requireDocumentGenerationToken(
        new Request("http://localhost", {
          headers: { Authorization: "Bearer secret" },
        })
      )
    ).toBeNull();
    expect(
      requireDocumentGenerationToken(
        new Request("http://localhost", {
          headers: { "x-document-generation-token": "secret" },
        })
      )
    ).toBeNull();

    vi.unstubAllEnvs();
  });
});
