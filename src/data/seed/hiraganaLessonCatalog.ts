import { hiraganaPool } from "./hiraganaSet";

export interface SeedLesson {
  id: string;
  title: string;
  focus: string;
  itemIds: string[];
}

const LESSON_BATCH_SIZE = 5;

const lessonTitles = [
  "Vowel Ridge",
  "K Row Climb",
  "S Row Switchbacks",
  "T Row Traverse",
  "N Row Notch",
  "H Row Hollow",
  "M Row Meadow",
  "Y Row Yard",
  "R Row Run",
  "W Row Wind",
];

function buildItemIdsForLesson(startOffset: number): string[] {
  return hiraganaPool.slice(startOffset, startOffset + LESSON_BATCH_SIZE).map((item) => item.id);
}

export const hiraganaLessons: SeedLesson[] = Array.from({
  length: Math.ceil(hiraganaPool.length / LESSON_BATCH_SIZE),
}).map((_, index) => ({
  id: `lesson_hiragana_${String(index + 1).padStart(3, "0")}`,
  title: lessonTitles[index] ?? `Hiragana Lesson ${index + 1}`,
  focus: "Sound-first recognition",
  itemIds: buildItemIdsForLesson(index * LESSON_BATCH_SIZE),
}));
