import { LocalStorageProgressRepository, type ProgressRepository } from "./progressRepository";
import { SqliteProgressRepository } from "./sqliteProgressRepository";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function createProgressRepository(): Promise<ProgressRepository> {
  if (!isTauriRuntime()) {
    return new LocalStorageProgressRepository();
  }

  try {
    return await SqliteProgressRepository.create();
  } catch {
    return new LocalStorageProgressRepository();
  }
}
