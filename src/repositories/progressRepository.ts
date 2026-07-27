import type { QuizAttempt, UserStudyProgress } from "../types";

export interface ProgressRepository {
  loadAll(): Promise<Record<string, UserStudyProgress>>;
  saveAll(progress: Record<string, UserStudyProgress>): Promise<void>;
  loadQuizAttempts(): Promise<QuizAttempt[]>;
  saveQuizAttempts(attempts: QuizAttempt[]): Promise<void>;
}

const STORAGE_KEY = "mount-kanji-progress-v3";
const QUIZ_ATTEMPTS_STORAGE_KEY = "mount-kanji-quiz-attempts-v3";

function isQuizAttempt(value: unknown): value is QuizAttempt {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<QuizAttempt>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.questionType === "string" &&
    typeof candidate.itemId === "string" &&
    typeof candidate.correct === "boolean" &&
    typeof candidate.answeredAt === "string"
  );
}

export class LocalStorageProgressRepository implements ProgressRepository {
  async loadAll(): Promise<Record<string, UserStudyProgress>> {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return {};
    }

    try {
      const parsed = JSON.parse(serialized) as Record<string, UserStudyProgress>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return {};
    }
  }

  async saveAll(progress: Record<string, UserStudyProgress>): Promise<void> {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  async loadQuizAttempts(): Promise<QuizAttempt[]> {
    const serialized = window.localStorage.getItem(QUIZ_ATTEMPTS_STORAGE_KEY);
    if (!serialized) {
      return [];
    }

    try {
      const parsed = JSON.parse(serialized) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isQuizAttempt) : [];
    } catch {
      window.localStorage.removeItem(QUIZ_ATTEMPTS_STORAGE_KEY);
      return [];
    }
  }

  async saveQuizAttempts(attempts: QuizAttempt[]): Promise<void> {
    window.localStorage.setItem(QUIZ_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
  }
}
