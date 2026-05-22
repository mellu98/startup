import { getDb } from "./db";
import { getNextPhaseId, getPreviousPhaseIds } from "./phases";

export type PhaseStatus = "locked" | "unlocked" | "in_progress" | "completed";

export type PhaseState = {
  id: string;
  status: PhaseStatus;
  chat_history: { role: "user" | "assistant"; content: string }[];
  final_document: string | null;
  context_snapshot: Record<string, unknown> | null;
  updated_at: string;
};

export type AppState = {
  phases: PhaseState[];
};

type PhaseRow = {
  id: string;
  status: string;
  chat_history: string | null;
  final_document: string | null;
  context_snapshot: string | null;
  updated_at: string;
};

function rowToPhase(row: unknown): PhaseState {
  const phaseRow = row as PhaseRow;
  return {
    id: phaseRow.id,
    status: phaseRow.status as PhaseStatus,
    chat_history: JSON.parse(phaseRow.chat_history ?? "[]") as PhaseState["chat_history"],
    final_document: phaseRow.final_document ?? null,
    context_snapshot: phaseRow.context_snapshot
      ? (JSON.parse(phaseRow.context_snapshot) as Record<string, unknown>)
      : null,
    updated_at: phaseRow.updated_at,
  };
}

export async function readState(): Promise<AppState> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM phases ORDER BY rowid").all();
  return {
    phases: rows.map(rowToPhase),
  };
}

export async function writeState(state: AppState): Promise<void> {
  const db = getDb();
  const insert = db.prepare(
    `INSERT OR REPLACE INTO phases (id, status, chat_history, final_document, context_snapshot, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const txn = db.transaction(() => {
    for (const p of state.phases) {
      insert.run(
        p.id,
        p.status,
        JSON.stringify(p.chat_history),
        p.final_document,
        p.context_snapshot ? JSON.stringify(p.context_snapshot) : null,
        p.updated_at
      );
    }
  });

  txn();
}

export async function getPhase(id: string): Promise<PhaseState | undefined> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM phases WHERE id = ?").get(id);
  if (!row) return undefined;
  return rowToPhase(row);
}

export async function updatePhase(
  id: string,
  patch: Partial<Omit<PhaseState, "id">>
): Promise<PhaseState> {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM phases WHERE id = ?").get(id);
  if (!existing) throw new Error(`Phase ${id} not found`);

  const current = rowToPhase(existing);
  const updated: PhaseState = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const stmt = db.prepare(
    `UPDATE phases SET
      status = ?,
      chat_history = ?,
      final_document = ?,
      context_snapshot = ?,
      updated_at = ?
     WHERE id = ?`
  );

  stmt.run(
    updated.status,
    JSON.stringify(updated.chat_history),
    updated.final_document,
    updated.context_snapshot ? JSON.stringify(updated.context_snapshot) : null,
    updated.updated_at,
    id
  );

  return updated;
}

export async function unlockNextPhase(completedId: string): Promise<void> {
  const nextId = getNextPhaseId(completedId);
  if (!nextId) return;

  const db = getDb();
  const stmt = db.prepare(
    "UPDATE phases SET status = 'unlocked', updated_at = ? WHERE id = ? AND status = 'locked'"
  );
  stmt.run(new Date().toISOString(), nextId);
}

export function getPreviousPhases(id: string): string[] {
  return [...getPreviousPhaseIds(id)];
}
