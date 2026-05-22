import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { PHASE_IDS } from "./phases";

const DATA_DIR =
  process.env.STARTUP_VALIDATION_OS_DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "database.sqlite");
const STATE_JSON_PATH = path.join(DATA_DIR, "state.json");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
  migrateFromJson(db);

  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'locked' CHECK(status IN ('locked', 'unlocked', 'in_progress', 'completed')),
      chat_history TEXT NOT NULL DEFAULT '[]',
      final_document TEXT,
      context_snapshot TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brand_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL,
      founder_names TEXT NOT NULL DEFAULT '',
      logo_data_url TEXT,
      primary_color TEXT NOT NULL DEFAULT '#2563eb',
      industry_tagline TEXT NOT NULL DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function migrateFromJson(database: Database.Database) {
  const count = database.prepare("SELECT COUNT(*) as cnt FROM phases").get() as { cnt: number };
  if (count.cnt > 0) return;

  if (!fs.existsSync(STATE_JSON_PATH)) {
    seedInitial(database);
    return;
  }

  try {
    const raw = fs.readFileSync(STATE_JSON_PATH, "utf-8");
    const data = JSON.parse(raw) as {
      phases: Array<{
        id: string;
        status: string;
        chat_history: unknown[];
        final_document: string | null;
        context_snapshot: Record<string, unknown> | null;
        updated_at?: string;
      }>;
    };

    const insert = database.prepare(
      `INSERT INTO phases (id, status, chat_history, final_document, context_snapshot, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const migrateTxn = database.transaction(() => {
      for (const p of data.phases) {
        insert.run(
          p.id,
          p.status,
          JSON.stringify(p.chat_history ?? []),
          p.final_document ?? null,
          p.context_snapshot ? JSON.stringify(p.context_snapshot) : null,
          p.updated_at ?? new Date().toISOString()
        );
      }
    });

    migrateTxn();

    // Rename old JSON to avoid re-migration and serve as backup
    fs.renameSync(STATE_JSON_PATH, `${STATE_JSON_PATH}.backup`);
  } catch (err) {
    console.error("Migration from state.json failed:", err);
    database.prepare("DELETE FROM phases").run();
    seedInitial(database);
  }
}

function seedInitial(database: Database.Database) {
  const insert = database.prepare(
    `INSERT OR IGNORE INTO phases (id, status, chat_history, final_document, context_snapshot, updated_at)
     VALUES (?, ?, '[]', NULL, NULL, ?)`
  );

  const now = new Date().toISOString();
  const seedTxn = database.transaction(() => {
    PHASE_IDS.forEach((id, idx) => {
      insert.run(id, idx === 0 ? "unlocked" : "locked", now);
    });
  });

  seedTxn();
}
