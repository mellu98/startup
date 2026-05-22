import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getPhase = vi.fn();
const buildPdfHtml = vi.fn();
const getBrandProfile = vi.fn();
const renderPdfHtml = vi.fn();

vi.mock("@/lib/state", () => ({
  getPhase,
}));

vi.mock("@/lib/pdf-template", () => ({
  buildPdfHtml,
}));

vi.mock("@/lib/brand-profile", () => ({
  getBrandProfile,
}));

vi.mock("@/lib/pdf-renderer", () => ({
  renderPdfHtml,
}));

function jsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/phase/intake/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("POST /api/phase/[id]/pdf", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getPhase.mockResolvedValue(undefined);
    getBrandProfile.mockResolvedValue({
      companyName: "Acme AI",
      founderNames: "",
      logoDataUrl: null,
      primaryColor: "#2563eb",
      industryTagline: "AI per retail",
    });
    buildPdfHtml.mockReturnValue("<html></html>");
    renderPdfHtml.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it("returns 400 for invalid phase params", async () => {
    const { POST } = await import("./route");

    const res = await POST(jsonRequest({ document: "# Documento" }), {
      params: Promise.resolve({ id: "not-real" }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Richiesta non valida",
      issues: [{ path: "id" }],
    });
    expect(renderPdfHtml).not.toHaveBeenCalled();
  });

  it("returns 400 for oversized document bodies", async () => {
    const { POST } = await import("./route");

    const res = await POST(jsonRequest({ document: "x".repeat(50001) }), {
      params: Promise.resolve({ id: "intake" }),
    });

    expect(res.status).toBe(400);
    expect(renderPdfHtml).not.toHaveBeenCalled();
  });

  it("renders a PDF when a valid document is provided", async () => {
    const { POST } = await import("./route");

    const res = await POST(jsonRequest({ document: "# Documento" }), {
      params: Promise.resolve({ id: "intake" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect((await res.arrayBuffer()).byteLength).toBe(3);
    expect(buildPdfHtml).toHaveBeenCalledWith(
      "intake",
      "# Documento",
      expect.objectContaining({ companyName: "Acme AI" })
    );
    expect(renderPdfHtml).toHaveBeenCalledWith(
      "<html></html>",
      expect.objectContaining({
        headerTemplate: expect.stringContaining("Acme AI"),
      })
    );
  });
});
