import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const DATA_DIR_ENV = "STARTUP_VALIDATION_OS_DATA_DIR";

async function withBrandModules<T>(
  run: (modules: {
    db: import("better-sqlite3").Database;
    brand: typeof import("./brand-profile");
  }) => Promise<T> | T
): Promise<T> {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "svos-brand-"));
  const dataDir = path.join(tempRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const previous = process.env[DATA_DIR_ENV];
  process.env[DATA_DIR_ENV] = dataDir;
  vi.resetModules();

  const dbModule = await import("./db");
  const brand = await import("./brand-profile");
  const db = dbModule.getDb();

  try {
    return await run({ db, brand });
  } finally {
    db.close();
    vi.resetModules();
    if (previous === undefined) delete process.env[DATA_DIR_ENV];
    else process.env[DATA_DIR_ENV] = previous;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("brand-profile", () => {
  it("returns an investor-ready default profile when none is saved", async () => {
    await withBrandModules(async ({ brand }) => {
      await expect(brand.getBrandProfile()).resolves.toEqual({
        companyName: "Startup Validation OS",
        founderNames: "",
        logoDataUrl: null,
        primaryColor: "#2563eb",
        industryTagline: "Investor-ready validation dossier",
      });
    });
  });

  it("upserts and normalizes a brand profile", async () => {
    await withBrandModules(async ({ brand }) => {
      const saved = await brand.updateBrandProfile({
        companyName: "  Acme AI  ",
        founderNames: "Mario Rossi",
        logoDataUrl: "",
        primaryColor: "#16A34A",
        industryTagline: "  AI per retail  ",
      });

      expect(saved).toEqual({
        companyName: "Acme AI",
        founderNames: "Mario Rossi",
        logoDataUrl: null,
        primaryColor: "#16a34a",
        industryTagline: "AI per retail",
      });
      await expect(brand.getBrandProfile()).resolves.toEqual(saved);
    });
  });

  it("rejects invalid brand colors", async () => {
    await withBrandModules(async ({ brand }) => {
      await expect(
        brand.updateBrandProfile({ primaryColor: "blue" })
      ).rejects.toThrow("Invalid brand color");
    });
  });
});
