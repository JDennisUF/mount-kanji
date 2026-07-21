import { beginnerKanjiPool } from "./beginnerSet";

export interface SeedLesson {
  id: string;
  title: string;
  focus: string;
  kanjiIds: string[];
}

const LESSON_BATCH_SIZE = 5;
const LESSON_COUNT = 20;
const LESSON_OFFSET_STRIDE = 3;

const lessonTitles = [
  "Strength and People",
  "Nature Markers",
  "Time and Sky",
  "Openings and Direction",
  "Movement Basics",
  "Core Symbols I",
  "Core Symbols II",
  "Foundation Review",
  "Quick Recognition I",
  "Quick Recognition II",
  "Mountain Trail Mix",
  "River and Moon Mix",
  "Power and Size Mix",
  "People and Time Mix",
  "Trail Sprint I",
  "Trail Sprint II",
  "Accuracy Builder I",
  "Accuracy Builder II",
  "Base Camp Checkpoint",
  "Summit Warmup",
];

function buildKanjiIdsForLesson(startOffset: number): string[] {
  if (beginnerKanjiPool.length === 0) {
    return [];
  }

  const picked: string[] = [];
  for (let i = 0; i < Math.min(LESSON_BATCH_SIZE, beginnerKanjiPool.length); i += 1) {
    const index = (startOffset + i) % beginnerKanjiPool.length;
    picked.push(beginnerKanjiPool[index].id);
  }

  return picked;
}

function buildSeedLessons(): SeedLesson[] {
  const lessons: SeedLesson[] = [];

  for (let i = 0; i < LESSON_COUNT; i += 1) {
    const offset = (i * LESSON_OFFSET_STRIDE) % Math.max(1, beginnerKanjiPool.length);
    lessons.push({
      id: `lesson_beginner_${String(i + 1).padStart(3, "0")}`,
      title: lessonTitles[i] ?? `Beginner Lesson ${i + 1}`,
      focus: "Meaning-first recognition",
      kanjiIds: buildKanjiIdsForLesson(offset),
    });
  }

  return lessons;
}

export const seedLessons: SeedLesson[] = buildSeedLessons();
