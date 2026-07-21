import Database from "@tauri-apps/plugin-sql";

import type { UserKanjiProgress } from "../types";
import type { ProgressRepository } from "./progressRepository";

const DATABASE_URL = "sqlite:mount-kanji.db";
const ROW_ID = "progress_state";

interface PersistedRow {
  payload: string;
}

export class SqliteProgressRepository implements ProgressRepository {
  private constructor(private readonly database: Database) {}

  static async create(): Promise<SqliteProgressRepository> {
    const database = await Database.load(DATABASE_URL);
    const repository = new SqliteProgressRepository(database);
    await repository.ensureSchema();
    return repository;
  }

  async loadAll(): Promise<Record<string, UserKanjiProgress>> {
    const rows = await this.database.select<PersistedRow[]>(
      "SELECT payload FROM app_state WHERE id = $1 LIMIT 1",
      [ROW_ID],
    );

    if (rows.length === 0 || !rows[0]?.payload) {
      return {};
    }

    try {
      const parsed = JSON.parse(rows[0].payload) as Record<string, UserKanjiProgress>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  async saveAll(progress: Record<string, UserKanjiProgress>): Promise<void> {
    const payload = JSON.stringify(progress);
    await this.database.execute(
      "INSERT INTO app_state (id, payload, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP",
      [ROW_ID, payload],
    );
  }

  private async ensureSchema(): Promise<void> {
    await this.database.execute(
      "CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );
  }
}
