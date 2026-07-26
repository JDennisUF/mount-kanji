import { LocalStorageProgressRepository, type ProgressRepository } from "./progressRepository";

export async function createProgressRepository(): Promise<ProgressRepository> {
  return new LocalStorageProgressRepository();
}
