import type { UserKanjiProgress } from "../types";

export interface ProgressRepository {
  loadAll(): Promise<Record<string, UserKanjiProgress>>;
  saveAll(progress: Record<string, UserKanjiProgress>): Promise<void>;
}

const STORAGE_KEY = "mount-kanji-progress";

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
}
