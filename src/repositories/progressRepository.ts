import type { QuizAttempt, UserKanjiProgress } from "../types";

export interface ProgressRepository {
  loadAll(): Promise<Record<string, UserKanjiProgress>>;
  saveAll(progress: Record<string, UserKanjiProgress>): Promise<void>;
  loadQuizAttempts(): Promise<QuizAttempt[]>;
  saveQuizAttempts(attempts: QuizAttempt[]): Promise<void>;
}

const STORAGE_KEY = "mount-kanji-progress";
const QUIZ_ATTEMPTS_STORAGE_KEY = "mount-kanji-quiz-attempts";

export class LocalStorageProgressRepository implements ProgressRepository {
  async loadAll(): Promise<Record<string, UserKanjiProgress>> {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return {};
    }

    try {
      const parsed = JSON.parse(serialized) as Record<string, UserKanjiProgress>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return {};
    }
  }

  async saveAll(progress: Record<string, UserKanjiProgress>): Promise<void> {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  async loadQuizAttempts(): Promise<QuizAttempt[]> {
    const serialized = window.localStorage.getItem(QUIZ_ATTEMPTS_STORAGE_KEY);
    if (!serialized) {
      return [];
    }

    try {
      const parsed = JSON.parse(serialized) as QuizAttempt[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      window.localStorage.removeItem(QUIZ_ATTEMPTS_STORAGE_KEY);
      return [];
    }
  }

  async saveQuizAttempts(attempts: QuizAttempt[]): Promise<void> {
    window.localStorage.setItem(QUIZ_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
  }
}
