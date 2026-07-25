import { beginnerKanjiPool } from "./beginnerSet";

export interface SeedLesson {
  id: string;
  title: string;
  focus: string;
  kanjiIds: string[];
}

const LESSON_BATCH_SIZE = 5;

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
  return beginnerKanjiPool.slice(startOffset, startOffset + LESSON_BATCH_SIZE).map((kanji) => kanji.id);
}

function buildSeedLessons(): SeedLesson[] {
  const lessons: SeedLesson[] = [];
  const lessonCount = Math.ceil(beginnerKanjiPool.length / LESSON_BATCH_SIZE);

  for (let i = 0; i < lessonCount; i += 1) {
    const offset = i * LESSON_BATCH_SIZE;
    lessons.push({
      id: `lesson_beginner_${String(i + 1).padStart(3, "0")}`,
      title: lessonTitles[i] ?? `JLPT Lesson ${i + 1}`,
      focus: "Meaning-first recognition",
      kanjiIds: buildKanjiIdsForLesson(offset),
    });
  }

  return lessons;
}

export const seedLessons: SeedLesson[] = buildSeedLessons();
