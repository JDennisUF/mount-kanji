import Database from "@tauri-apps/plugin-sql";

import type { QuizAttempt, UserKanjiProgress } from "../types";
import type { ProgressRepository } from "./progressRepository";

const DATABASE_URL = "sqlite:mount-kanji.db";
const ROW_ID = "progress_state";

interface PersistedRow {
  payload: string;
}

interface QuizAttemptRow {
  id: string;
  question_type: string;
  kanji_id: string;
  correct: number;
  response_time_ms: number;
  answered_at: string;
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

  async loadQuizAttempts(): Promise<QuizAttempt[]> {
    const rows = await this.database.select<QuizAttemptRow[]>(
      "SELECT id, question_type, kanji_id, correct, response_time_ms, answered_at FROM quiz_attempt ORDER BY answered_at DESC",
    );

    return rows.map((row) => ({
      id: row.id,
      questionType: row.question_type as QuizAttempt["questionType"],
      kanjiId: row.kanji_id,
      correct: Boolean(row.correct),
      responseTimeMs: row.response_time_ms,
      answeredAt: row.answered_at,
    }));
  }

  async saveQuizAttempts(attempts: QuizAttempt[]): Promise<void> {
    await this.database.execute("DELETE FROM quiz_attempt");

    for (const attempt of attempts) {
      await this.database.execute(
        "INSERT INTO quiz_attempt (id, question_type, kanji_id, correct, response_time_ms, answered_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          attempt.id,
          attempt.questionType,
          attempt.kanjiId,
          attempt.correct ? 1 : 0,
          attempt.responseTimeMs,
          attempt.answeredAt,
        ],
      );
    }
  }

  private async ensureSchema(): Promise<void> {
    await this.database.execute(
      "CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );

    await this.database.execute(
      "CREATE TABLE IF NOT EXISTS quiz_attempt (id TEXT PRIMARY KEY, question_type TEXT NOT NULL, kanji_id TEXT NOT NULL, correct INTEGER NOT NULL, response_time_ms INTEGER NOT NULL, answered_at TEXT NOT NULL)",
    );
  }
}
