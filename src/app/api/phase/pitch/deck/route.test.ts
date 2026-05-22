import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getPhase = vi.fn();
const getBrandProfile = vi.fn();
const renderPdfHtml = vi.fn();

vi.mock("@/lib/state", () => ({
  getPhase,
}));

vi.mock("@/lib/brand-profile", () => ({
  getBrandProfile,
}));

vi.mock("@/lib/pdf-renderer", () => ({
  renderPdfHtml,
}));

function postRequest(body?: unknown, format?: string): NextRequest {
  return new Request(
    `http://localhost/api/phase/pitch/deck${format ? `?format=${format}` : ""}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }
  ) as NextRequest;
}

describe("POST /api/phase/pitch/deck", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getBrandProfile.mockResolvedValue({
      companyName: "Acme AI",
      founderNames: "Mario Rossi",
      logoDataUrl: null,
      primaryColor: "#2563eb",
      industryTagline: "AI per retail",
    });
    getPhase.mockResolvedValue({
      id: "pitch",
      final_document: "# Pitch\n\n## Problem\nDolore",
    });
    renderPdfHtml.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it("returns standalone HTML when format=html", async () => {
    const { POST } = await import("./route");

    const res = await POST(postRequest({ document: "# Pitch" }, "html"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    await expect(res.text()).resolves.toContain("Pitch Deck");
  });

  it("returns PDF by default", async () => {
    const { POST } = await import("./route");

    const res = await POST(postRequest({ document: "# Pitch" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect((await res.arrayBuffer()).byteLength).toBe(3);
  });

  it("falls back to the saved pitch document and rejects missing documents", async () => {
    const { POST } = await import("./route");

    getPhase.mockResolvedValueOnce({ id: "pitch", final_document: "" });
    const missing = await POST(postRequest());
    expect(missing.status).toBe(400);

    getPhase.mockResolvedValueOnce({ id: "pitch", final_document: "# Saved" });
    const saved = await POST(postRequest(undefined, "html"));
    expect(saved.status).toBe(200);
    expect(getPhase).toHaveBeenCalledWith("pitch");
  });
});
