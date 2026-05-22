import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const DATA_DIR_ENV = "STARTUP_VALIDATION_OS_DATA_DIR";

async function withIsolatedDataDir<T>(
  run: (ctx: { dataDir: string }) => Promise<T> | T
): Promise<T> {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "svos-db-"));
  const dataDir = path.join(tempRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const previousDataDir = process.env[DATA_DIR_ENV];
  process.env[DATA_DIR_ENV] = dataDir;
  vi.resetModules();

  try {
    return await run({ dataDir });
  } finally {
    vi.resetModules();
    if (previousDataDir === undefined) {
      delete process.env[DATA_DIR_ENV];
    } else {
      process.env[DATA_DIR_ENV] = previousDataDir;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("db", () => {
  it("opens the SQLite database inside the configured data directory", async () => {
    await withIsolatedDataDir(async ({ dataDir }) => {
      const { getDb } = await import("./db");
      const db = getDb();

      try {
        expect(fs.existsSync(path.join(dataDir, "database.sqlite"))).toBe(true);
      } finally {
        db.close();
      }
    });
  });

  it("returns the same singleton connection for repeated getDb calls", async () => {
    await withIsolatedDataDir(async () => {
      const { getDb } = await import("./db");
      const first = getDb();
      const second = getDb();

      try {
        expect(second).toBe(first);
      } finally {
        first.close();
      }
    });
  });

  it("seeds the 9 canonical phases when no legacy state exists", async () => {
    await withIsolatedDataDir(async () => {
      const { getDb } = await import("./db");
      const db = getDb();

      try {
        const rows = db
          .prepare("SELECT id, status FROM phases ORDER BY rowid")
          .all() as Array<{ id: string; status: string }>;

        expect(rows).toEqual([
          { id: "intake", status: "unlocked" },
          { id: "market", status: "locked" },
          { id: "competitor", status: "locked" },
          { id: "strategy", status: "locked" },
          { id: "premortem", status: "locked" },
          { id: "positioning", status: "locked" },
          { id: "execution", status: "locked" },
          { id: "gtm", status: "locked" },
          { id: "pitch", status: "locked" },
        ]);
      } finally {
        db.close();
      }
    });
  });

  it("migrates a legacy state.json and renames it to a backup", async () => {
    await withIsolatedDataDir(async ({ dataDir }) => {
      const legacyState = {
        phases: [
          {
            id: "intake",
            status: "completed",
            chat_history: [{ role: "user", content: "ciao" }],
            final_document: "# Documento",
            context_snapshot: { problem: "Problema chiaro" },
            updated_at: "2026-01-01T10:00:00.000Z",
          },
          {
            id: "market",
            status: "unlocked",
            chat_history: [],
            final_document: null,
            context_snapshot: null,
          },
        ],
      };
      fs.writeFileSync(
        path.join(dataDir, "state.json"),
        JSON.stringify(legacyState),
        "utf-8"
      );

      const { getDb } = await import("./db");
      const db = getDb();

      try {
        const rows = db
          .prepare("SELECT id, status, chat_history, final_document, context_snapshot FROM phases ORDER BY rowid")
          .all() as Array<{
          id: string;
          status: string;
          chat_history: string;
          final_document: string | null;
          context_snapshot: string | null;
        }>;

        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
          id: "intake",
          status: "completed",
          final_document: "# Documento",
        });
        expect(JSON.parse(rows[0].chat_history)).toEqual([
          { role: "user", content: "ciao" },
        ]);
        expect(JSON.parse(rows[0].context_snapshot ?? "{}")).toEqual({
          problem: "Problema chiaro",
        });
        expect(fs.existsSync(path.join(dataDir, "state.json"))).toBe(false);
        expect(fs.existsSync(path.join(dataDir, "state.json.backup"))).toBe(true);
      } finally {
        db.close();
      }
    });
  });

  it("falls back to the canonical seed if state.json migration fails", async () => {
    await withIsolatedDataDir(async ({ dataDir }) => {
      fs.writeFileSync(path.join(dataDir, "state.json"), "{bad json", "utf-8");

      const { getDb } = await import("./db");
      const db = getDb();

      try {
        const rows = db
          .prepare("SELECT id, status FROM phases ORDER BY rowid")
          .all() as Array<{ id: string; status: string }>;

        expect(rows).toHaveLength(9);
        expect(rows[0]).toEqual({ id: "intake", status: "unlocked" });
        expect(rows.slice(1).every((row) => row.status === "locked")).toBe(true);
      } finally {
        db.close();
      }
    });
  });
});
