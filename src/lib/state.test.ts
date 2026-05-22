import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import type { AppState } from "./state";

const DATA_DIR_ENV = "STARTUP_VALIDATION_OS_DATA_DIR";

async function withStateModules<T>(
  run: (modules: {
    db: import("better-sqlite3").Database;
    state: typeof import("./state");
  }) => Promise<T> | T
): Promise<T> {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "svos-state-"));
  const dataDir = path.join(tempRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const previousDataDir = process.env[DATA_DIR_ENV];
  process.env[DATA_DIR_ENV] = dataDir;
  vi.resetModules();

  const dbModule = await import("./db");
  const state = await import("./state");
  const db = dbModule.getDb();

  try {
    return await run({ db, state });
  } finally {
    db.close();
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

describe("state", () => {
  it("reads the seeded phase state in canonical order", async () => {
    await withStateModules(async ({ state }) => {
      const appState = await state.readState();

      expect(appState.phases.map((phase) => phase.id)).toEqual([
        "intake",
        "market",
        "competitor",
        "strategy",
        "premortem",
        "positioning",
        "execution",
        "gtm",
        "pitch",
      ]);
      expect(appState.phases[0].status).toBe("unlocked");
      expect(appState.phases.slice(1).every((phase) => phase.status === "locked")).toBe(true);
    });
  });

  it("round-trips written state including chat history, document, and context snapshot", async () => {
    await withStateModules(async ({ state }) => {
      const original = await state.readState();
      const nextState: AppState = {
        phases: original.phases.map((phase) =>
          phase.id === "intake"
            ? {
                ...phase,
                status: "completed",
                chat_history: [
                  { role: "user", content: "Problema" },
                  { role: "assistant", content: "Domanda scomoda" },
                ],
                final_document: "# Documento finale",
                context_snapshot: {
                  problem: "Validazione lenta",
                  competitors: ["A", "B"],
                },
                updated_at: "2026-01-02T03:04:05.000Z",
              }
            : phase
        ),
      };

      await state.writeState(nextState);
      const saved = await state.getPhase("intake");

      expect(saved).toMatchObject(nextState.phases[0]);
    });
  });

  it("gets known phases and returns undefined for unknown ids", async () => {
    await withStateModules(async ({ state }) => {
      await expect(state.getPhase("intake")).resolves.toMatchObject({
        id: "intake",
        status: "unlocked",
      });
      await expect(state.getPhase("missing")).resolves.toBeUndefined();
    });
  });

  it("updates a phase patch and stamps the update time", async () => {
    await withStateModules(async ({ state }) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-03T04:05:06.000Z"));

      const updated = await state.updatePhase("intake", {
        status: "in_progress",
        final_document: "Bozza",
      });
      const persisted = await state.getPhase("intake");

      expect(updated).toMatchObject({
        id: "intake",
        status: "in_progress",
        final_document: "Bozza",
        updated_at: "2026-02-03T04:05:06.000Z",
      });
      expect(persisted).toMatchObject(updated);
    });
  });

  it("throws when updating a missing phase", async () => {
    await withStateModules(async ({ state }) => {
      await expect(
        state.updatePhase("missing", { status: "completed" })
      ).rejects.toThrow("Phase missing not found");
    });
  });

  it("unlocks only the next locked phase and remains idempotent", async () => {
    await withStateModules(async ({ state }) => {
      await state.unlockNextPhase("intake");
      await state.unlockNextPhase("intake");

      expect(await state.getPhase("market")).toMatchObject({
        id: "market",
        status: "unlocked",
      });
      expect(await state.getPhase("competitor")).toMatchObject({
        id: "competitor",
        status: "locked",
      });
    });
  });

  it("does not overwrite a next phase that is already in progress", async () => {
    await withStateModules(async ({ state }) => {
      await state.updatePhase("market", { status: "in_progress" });
      await state.unlockNextPhase("intake");

      expect(await state.getPhase("market")).toMatchObject({
        id: "market",
        status: "in_progress",
      });
    });
  });

  it("treats the last phase and unknown phase ids as no-op unlocks", async () => {
    await withStateModules(async ({ state }) => {
      const before = await state.readState();

      await state.unlockNextPhase("pitch");
      await state.unlockNextPhase("missing");

      expect(await state.readState()).toEqual(before);
    });
  });

  it("returns previous phase ids through the canonical registry", async () => {
    await withStateModules(async ({ state }) => {
      expect(state.getPreviousPhases("intake")).toEqual([]);
      expect(state.getPreviousPhases("market")).toEqual(["intake"]);
      expect(state.getPreviousPhases("strategy")).toEqual([
        "intake",
        "market",
        "competitor",
      ]);
      expect(state.getPreviousPhases("pitch")).toHaveLength(8);
      expect(state.getPreviousPhases("missing")).toEqual([]);
    });
  });
});
