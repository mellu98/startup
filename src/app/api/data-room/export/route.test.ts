import { beforeEach, describe, expect, it, vi } from "vitest";
import { PHASE_IDS } from "@/lib/phases";

const readState = vi.fn();
const getBrandProfile = vi.fn();
const renderPdfHtml = vi.fn();

vi.mock("@/lib/state", () => ({
  readState,
}));

vi.mock("@/lib/brand-profile", () => ({
  getBrandProfile,
}));

vi.mock("@/lib/pdf-renderer", () => ({
  renderPdfHtml,
}));

describe("POST /api/data-room/export", () => {
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
    renderPdfHtml.mockResolvedValue(new Uint8Array([1, 2, 3]));
    readState.mockResolvedValue({
      phases: PHASE_IDS.map((id) => ({
        id,
        status: "completed",
        chat_history: [],
        final_document: `# ${id}`,
        context_snapshot: null,
        updated_at: "2026-01-01T00:00:00.000Z",
      })),
    });
  });

  it("returns 409 until every phase has a final document", async () => {
    const { POST } = await import("./route");
    readState.mockResolvedValueOnce({
      phases: [{ id: "intake", status: "completed", final_document: "# Intake" }],
    });

    const res = await POST();

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Completa tutte le 9 fasi prima di esportare la data room.",
    });
  });

  it("returns a zip when all phases are completed", async () => {
    const { POST } = await import("./route");

    const res = await POST();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(100);
  });
});
