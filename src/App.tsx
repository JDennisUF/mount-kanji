import { useEffect, useMemo, useState } from "react";
import { toRomaji } from "wanakana";

import mountainStatusKanji from "./assets/mount-kanji.svg";
import mountainStatusHiragana from "./assets/mount-hiragana.svg";
import mountainStatusKatakana from "./assets/mount-katakana.svg";
import { beginnerKanjiPool } from "./data/seed/beginnerSet";
import { hiraganaLessons } from "./data/seed/hiraganaLessonCatalog";
import { hiraganaPool } from "./data/seed/hiraganaSet";
import { katakanaLessons } from "./data/seed/katakanaLessonCatalog";
import { katakanaPool } from "./data/seed/katakanaSet";
import { seedLessons, type SeedLesson } from "./data/seed/lessonCatalog";
import { sumoTerms, type SumoTerm } from "./data/seed/sumoTerms";
import { createProgressRepository } from "./repositories/progressRepositoryFactory";
import type { ProgressRepository } from "./repositories/progressRepository";
import { KNOWN_CORRECT_THRESHOLD, ReviewTracker, resolveStudyStatus } from "./services/reviewTracker";
import type { QuizAttempt, StudyItem, StudyTrack, UserStudyProgress } from "./types";

type Screen = "dashboard" | "lesson" | "quiz" | "summary" | "dictionary" | "progress" | "settings" | "sumo";

interface QuizQuestion {
  itemId: string;
  promptLabel: string;
  options: string[];
  correctOption: string;
}

interface MountProgress {
  track: StudyTrack;
  label: string;
  knownCount: number;
  remainingCount: number;
  totalSteps: number;
  percentComplete: number;
}

interface KnownEvent {
  itemId: string;
  track: StudyTrack;
  timestamp: number;
}

type TextScale = 90 | 100 | 110 | 125;
type SumoCategoryFilter = "all" | SumoTerm["category"];

interface AppSettings {
  showFurigana: boolean;
  showRomaji: boolean;
  reducedMotion: boolean;
  textScale: TextScale;
}

type LessonCursorState = Record<StudyTrack, number>;

const SESSION_TARGET_MINUTES = "5-10";
const LESSON_CURSOR_STORAGE_KEY = "mount-kanji-lesson-cursor-v2";
const SETTINGS_STORAGE_KEY = "mount-kanji-settings";
const REVISIT_INSERTS = 2;
const TRAIL_POINTS: Array<{ x: number; y: number }> = [
  { x: 38, y: 92 },
  { x: 52, y: 82 },
  { x: 44, y: 68 },
  { x: 58, y: 56 },
  { x: 49, y: 44 },
  { x: 56, y: 32 },
  { x: 49, y: 21 },
];

const DEFAULT_SETTINGS: AppSettings = {
  showFurigana: true,
  showRomaji: false,
  reducedMotion: false,
  textScale: 100,
};

const DEFAULT_LESSON_CURSORS: LessonCursorState = {
  kanji: 0,
  hiragana: 0,
  katakana: 0,
};

const reviewTracker = new ReviewTracker();

const mountainImages: Record<StudyTrack, string> = {
  kanji: mountainStatusKanji,
  hiragana: mountainStatusHiragana,
  katakana: mountainStatusKatakana,
};

const trackArtThemes: Record<
  StudyTrack,
  {
    accent: string;
    campReachedFill: string;
    campReachedStroke: string;
    campPendingFill: string;
    campPendingStroke: string;
    climberFill: string;
    climberStroke: string;
    climberText: string;
  }
> = {
  kanji: {
    accent: "#0f766e",
    campReachedFill: "#06b6d4",
    campReachedStroke: "#155e75",
    campPendingFill: "#cbd5e1",
    campPendingStroke: "#ffffff",
    climberFill: "#ecfeff",
    climberStroke: "#155e75",
    climberText: "#083344",
  },
  hiragana: {
    accent: "#be185d",
    campReachedFill: "#f43f5e",
    campReachedStroke: "#9f1239",
    campPendingFill: "#cbd5e1",
    campPendingStroke: "#ffffff",
    climberFill: "#fff1f2",
    climberStroke: "#9f1239",
    climberText: "#881337",
  },
  katakana: {
    accent: "#b45309",
    campReachedFill: "#f59e0b",
    campReachedStroke: "#92400e",
    campPendingFill: "#cbd5e1",
    campPendingStroke: "#ffffff",
    climberFill: "#fffbeb",
    climberStroke: "#92400e",
    climberText: "#78350f",
  },
};

const trackConfigs: Record<
  StudyTrack,
  {
    label: string;
    dashboardTitle: string;
    dashboardSubtitle: string;
    trailName: string;
    introFocus: string;
    unitSingular: string;
    unitPlural: string;
    promptLabel: string;
    dictionaryTitle: string;
    lessons: SeedLesson[];
    pool: StudyItem[];
  }
> = {
  kanji: {
    label: "Mount Kanji",
    dashboardTitle: "Base Camp Dashboard",
    dashboardSubtitle: "Meaning-first recognition and steady summit progress",
    trailName: "Kanji Trail",
    introFocus: "Core recognition",
    unitSingular: "kanji",
    unitPlural: "kanji",
    promptLabel: "Which kanji means",
    dictionaryTitle: "JLPT Kanji Browser",
    lessons: seedLessons,
    pool: beginnerKanjiPool,
  },
  hiragana: {
    label: "Mount Hiragana",
    dashboardTitle: "Hiragana Base Camp",
    dashboardSubtitle: "Sound-first recognition and steady summit progress",
    trailName: "Hiragana Trail",
    introFocus: "Kana sound mapping",
    unitSingular: "character",
    unitPlural: "characters",
    promptLabel: "Which hiragana sounds like",
    dictionaryTitle: "Hiragana Reference Chart",
    lessons: hiraganaLessons,
    pool: hiraganaPool,
  },
  katakana: {
    label: "Mount Katakana",
    dashboardTitle: "Katakana Base Camp",
    dashboardSubtitle: "Loanword and name recognition through repetition",
    trailName: "Katakana Trail",
    introFocus: "Angular kana mapping",
    unitSingular: "character",
    unitPlural: "characters",
    promptLabel: "Which katakana sounds like",
    dictionaryTitle: "Katakana Reference Chart",
    lessons: katakanaLessons,
    pool: katakanaPool,
  },
};

const allItems = [...beginnerKanjiPool, ...hiraganaPool, ...katakanaPool];
const itemById = new Map(allItems.map((item) => [item.id, item]));

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createDefaultProgress(itemId: string): UserStudyProgress {
  return {
    id: `progress_${itemId}`,
    itemId,
    status: "new",
    correctCount: 0,
    incorrectCount: 0,
    excludedFromLessons: false,
    lastAnsweredCorrect: null,
    lastReviewedAt: null,
  };
}

function normalizeProgressRow(
  itemId: string,
  raw?: Partial<UserStudyProgress> & {
    status?: string;
    kanjiId?: string;
  },
): UserStudyProgress {
  const base = createDefaultProgress(itemId);
  const correctCount = typeof raw?.correctCount === "number" ? raw.correctCount : 0;
  const incorrectCount = typeof raw?.incorrectCount === "number" ? raw.incorrectCount : 0;

  return {
    ...base,
    ...raw,
    itemId,
    id: typeof raw?.id === "string" ? raw.id : base.id,
    status: resolveStudyStatus(correctCount, incorrectCount),
    correctCount,
    incorrectCount,
    excludedFromLessons: Boolean(raw?.excludedFromLessons),
    lastAnsweredCorrect: typeof raw?.lastAnsweredCorrect === "boolean" ? raw.lastAnsweredCorrect : null,
    lastReviewedAt: typeof raw?.lastReviewedAt === "string" ? raw.lastReviewedAt : null,
  };
}

function toUtcDateKey(input: string): string {
  const date = new Date(input);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computeStreaks(attempts: QuizAttempt[]): { currentStreak: number; longestStreak: number } {
  if (attempts.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const uniqueDays = Array.from(new Set(attempts.map((attempt) => toUtcDateKey(attempt.answeredAt)))).sort();
  let longest = 1;
  let running = 1;

  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previous = new Date(`${uniqueDays[index - 1]}T00:00:00Z`).getTime();
    const current = new Date(`${uniqueDays[index]}T00:00:00Z`).getTime();
    if ((current - previous) / (24 * 60 * 60 * 1000) === 1) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  const daySet = new Set(uniqueDays);
  let current = 0;
  let cursor = new Date();
  for (;;) {
    const key = toUtcDateKey(cursor.toISOString());
    if (!daySet.has(key)) {
      break;
    }
    current += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return { currentStreak: current, longestStreak: longest };
}

function formatReadings(readings: string[], showRomaji: boolean): string {
  if (readings.length === 0) {
    return "-";
  }

  return readings
    .map((reading) => {
      if (!showRomaji || reading === "-") {
        return reading;
      }

      return `${reading} (${toRomaji(reading)})`;
    })
    .join(", ");
}

function accuracyPercent(row: UserStudyProgress): number {
  const total = row.correctCount + row.incorrectCount;
  if (total === 0) {
    return 0;
  }
  return Math.round((row.correctCount / total) * 100);
}

function buildQuizQuestions(items: StudyItem[], pool: StudyItem[]): QuizQuestion[] {
  return items.map((item) => {
    const distractors = shuffle(pool.filter((candidate) => candidate.id !== item.id))
      .slice(0, 3)
      .map((candidate) => candidate.character);

    return {
      itemId: item.id,
      promptLabel: item.primaryMeaning,
      options: shuffle([item.character, ...distractors]),
      correctOption: item.character,
    };
  });
}

function buildMountProgress(track: StudyTrack, progressByItem: Record<string, UserStudyProgress>): MountProgress {
  const pool = trackConfigs[track].pool;
  const totalSteps = pool.length;
  const knownCount = pool.reduce((count, item) => count + ((progressByItem[item.id]?.status === "known" ? 1 : 0)), 0);

  return {
    track,
    label: trackConfigs[track].label,
    knownCount,
    remainingCount: Math.max(0, totalSteps - knownCount),
    totalSteps,
    percentComplete: totalSteps === 0 ? 0 : Math.round((knownCount / totalSteps) * 100),
  };
}

function interpolateTrailPoint(progressRatio: number): { x: number; y: number } {
  const clampedRatio = clamp(progressRatio, 0, 1);

  if (clampedRatio <= 0) {
    return { ...TRAIL_POINTS[0] };
  }

  if (clampedRatio >= 1) {
    return { ...TRAIL_POINTS[TRAIL_POINTS.length - 1] };
  }

  const scaled = clampedRatio * (TRAIL_POINTS.length - 1);
  const index = Math.floor(scaled);
  const remainder = scaled - index;
  const start = TRAIL_POINTS[index];
  const end = TRAIL_POINTS[index + 1];

  return {
    x: start.x + (end.x - start.x) * remainder,
    y: start.y + (end.y - start.y) * remainder,
  };
}

function MountainTrail({
  progress,
  active,
  reducedMotion,
}: {
  progress: MountProgress;
  active: boolean;
  reducedMotion: boolean;
}) {
  const progressRatio = progress.totalSteps === 0 ? 0 : progress.knownCount / progress.totalSteps;
  const climberPoint = interpolateTrailPoint(progressRatio);
  const artTheme = trackArtThemes[progress.track];
  const mountainImage = mountainImages[progress.track];

  return (
    <div className="relative isolate h-56 w-56 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-sky-50 shadow-sm">
      <img src={mountainImage} alt="" className="block h-full w-full object-cover" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[8%] -translate-x-1/2 rounded-full border border-amber-600 bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 shadow-sm">
          Summit
        </div>
        <div
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${reducedMotion ? "" : "transition-all duration-500 ease-out"}`}
          style={{
            left: `${climberPoint.x}%`,
            top: `${climberPoint.y}%`,
          }}
        >
          <div
            className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm"
            style={{
              backgroundColor: active ? artTheme.climberFill : "#ffffff",
              borderColor: artTheme.climberStroke,
              color: artTheme.climberText,
            }}
          >
            You
          </div>
        </div>
      </div>
    </div>
  );
}

function MountProgressCard({
  progress,
  active,
  reducedMotion,
  onSelect,
}: {
  progress: MountProgress;
  active: boolean;
  reducedMotion: boolean;
  onSelect?: () => void;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${active ? "border-cyan-400 ring-2 ring-cyan-100" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{progress.label}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">
            {progress.knownCount} / {progress.totalSteps}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{progress.percentComplete}% to the summit</p>
          <p className="mt-1 text-sm text-slate-600">{progress.remainingCount} symbols left</p>
        </div>

        {onSelect && (
          <button
            type="button"
            onClick={onSelect}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              active ? "bg-cyan-700 text-white hover:bg-cyan-600" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
            }`}
          >
            {active ? "Current Mount" : "Focus"}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <MountainTrail progress={progress} active={active} reducedMotion={reducedMotion} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Position</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Step {progress.knownCount} of {progress.totalSteps}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Known Threshold</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{KNOWN_CORRECT_THRESHOLD} correct answers per symbol</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [activeTrack, setActiveTrack] = useState<StudyTrack>("kanji");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [progressByItem, setProgressByItem] = useState<Record<string, UserStudyProgress>>({});
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [sessionMissedItemIds, setSessionMissedItemIds] = useState<string[]>([]);
  const [knownEvent, setKnownEvent] = useState<KnownEvent | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const serialized = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!serialized) {
      return DEFAULT_SETTINGS;
    }

    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(serialized) as Partial<AppSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [dictionaryRadical, setDictionaryRadical] = useState("all");
  const [dictionarySumoOnly, setDictionarySumoOnly] = useState(false);
  const [sumoQuery, setSumoQuery] = useState("");
  const [sumoCategory, setSumoCategory] = useState<SumoCategoryFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>(trackConfigs.kanji.pool[0]?.id ?? "");
  const [activeLessonItems, setActiveLessonItems] = useState<StudyItem[]>(() => {
    const firstLesson = trackConfigs.kanji.lessons[0];
    return firstLesson ? firstLesson.itemIds.map((id) => itemById.get(id)).filter(Boolean) as StudyItem[] : [];
  });
  const [activeLessonTitle, setActiveLessonTitle] = useState<string>(trackConfigs.kanji.lessons[0]?.title ?? "Trail Lesson");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [progressRepository, setProgressRepository] = useState<ProgressRepository | null>(null);
  const [isProgressHydrated, setIsProgressHydrated] = useState(false);
  const [lessonCursorByTrack, setLessonCursorByTrack] = useState<LessonCursorState>(() => {
    const serialized = window.localStorage.getItem(LESSON_CURSOR_STORAGE_KEY);
    if (!serialized) {
      return DEFAULT_LESSON_CURSORS;
    }

    try {
      const parsed = JSON.parse(serialized) as Partial<LessonCursorState>;
      return {
        kanji: Number.isFinite(parsed.kanji) && (parsed.kanji ?? 0) >= 0 ? Math.floor(parsed.kanji ?? 0) : 0,
        hiragana: Number.isFinite(parsed.hiragana) && (parsed.hiragana ?? 0) >= 0 ? Math.floor(parsed.hiragana ?? 0) : 0,
        katakana: Number.isFinite(parsed.katakana) && (parsed.katakana ?? 0) >= 0 ? Math.floor(parsed.katakana ?? 0) : 0,
      };
    } catch {
      return DEFAULT_LESSON_CURSORS;
    }
  });

  const currentTrackConfig = trackConfigs[activeTrack];
  const currentPool = currentTrackConfig.pool;
  const currentLessons = currentTrackConfig.lessons;
  const isKanaTrack = activeTrack === "hiragana" || activeTrack === "katakana";

  useEffect(() => {
    let isActive = true;

    createProgressRepository().then(async (repository) => {
      if (!isActive) {
        return;
      }

      setProgressRepository(repository);
      const [loadedProgress, loadedAttempts] = await Promise.all([repository.loadAll(), repository.loadQuizAttempts()]);

      if (!isActive) {
        return;
      }

      const normalizedProgress = Object.fromEntries(
        Object.entries(loadedProgress).map(([itemId, row]) => [itemId, normalizeProgressRow(itemId, row)]),
      );
      setProgressByItem(normalizedProgress);
      setQuizAttempts(loadedAttempts);
      setIsProgressHydrated(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!progressRepository || !isProgressHydrated) {
      return;
    }

    progressRepository.saveAll(progressByItem);
  }, [isProgressHydrated, progressByItem, progressRepository]);

  useEffect(() => {
    if (!progressRepository || !isProgressHydrated) {
      return;
    }

    progressRepository.saveQuizAttempts(quizAttempts);
  }, [isProgressHydrated, progressRepository, quizAttempts]);

  useEffect(() => {
    window.localStorage.setItem(LESSON_CURSOR_STORAGE_KEY, JSON.stringify(lessonCursorByTrack));
  }, [lessonCursorByTrack]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setDictionaryQuery("");
    setDictionaryRadical("all");
    setDictionarySumoOnly(false);
    setSelectedItemId(currentPool[0]?.id ?? "");
  }, [activeTrack, currentPool]);

  const mountProgressByTrack = useMemo(
    () =>
      ({
        kanji: buildMountProgress("kanji", progressByItem),
        hiragana: buildMountProgress("hiragana", progressByItem),
        katakana: buildMountProgress("katakana", progressByItem),
      }) satisfies Record<StudyTrack, MountProgress>,
    [progressByItem],
  );

  const activeMountProgress = mountProgressByTrack[activeTrack];

  const currentTrailItems = useMemo(
    () => currentPool.filter((item) => !(progressByItem[item.id]?.excludedFromLessons ?? false)),
    [currentPool, progressByItem],
  );

  const currentPendingItems = useMemo(
    () => currentTrailItems.filter((item) => (progressByItem[item.id]?.status ?? "new") !== "known"),
    [currentTrailItems, progressByItem],
  );

  const trailLessonCount = Math.max(1, currentLessons.length);
  const currentLessonCursor = lessonCursorByTrack[activeTrack] % Math.max(1, currentLessons.length);
  const currentLessonDefinition = currentLessons[currentLessonCursor];
  const currentLessonItem = activeLessonItems[lessonIndex];
  const currentQuestion = quizQuestions[quizIndex];

  const trackAttempts = useMemo(
    () =>
      quizAttempts.filter((attempt) => {
        const item = itemById.get(attempt.itemId);
        return item?.script === activeTrack;
      }),
    [activeTrack, quizAttempts],
  );

  const overallStats = useMemo(() => {
    const activeIds = new Set(currentTrailItems.map((item) => item.id));
    const activeRows = Object.values(progressByItem).filter((row) => activeIds.has(row.itemId));
    const studied = activeRows.filter((row) => row.correctCount + row.incorrectCount > 0).length;
    const known = activeRows.filter((row) => row.status === "known").length;
    const totalCorrect = activeRows.reduce((sum, row) => sum + row.correctCount, 0);
    const totalAttempts = activeRows.reduce((sum, row) => sum + row.correctCount + row.incorrectCount, 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const streaks = computeStreaks(trackAttempts);

    return {
      studied,
      known,
      attempts: totalAttempts,
      accuracy,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    };
  }, [currentTrailItems, progressByItem, trackAttempts]);

  const weakItems = useMemo(() => {
    const currentIds = new Set(currentPool.map((item) => item.id));
    return Object.values(progressByItem)
      .filter((row) => currentIds.has(row.itemId) && row.incorrectCount > 0)
      .sort((a, b) => b.incorrectCount - a.incorrectCount || a.correctCount - b.correctCount)
      .slice(0, 8)
      .map((row) => ({ row, item: itemById.get(row.itemId) }))
      .filter((entry) => entry.item);
  }, [currentPool, progressByItem]);

  const strongItems = useMemo(() => {
    const currentIds = new Set(currentPool.map((item) => item.id));
    return Object.values(progressByItem)
      .filter((row) => currentIds.has(row.itemId) && row.correctCount > 0)
      .sort((a, b) => b.correctCount - a.correctCount || a.incorrectCount - b.incorrectCount)
      .slice(0, 8)
      .map((row) => ({ row, item: itemById.get(row.itemId) }))
      .filter((entry) => entry.item);
  }, [currentPool, progressByItem]);

  const recentAttempts = trackAttempts.slice(0, 5);

  const availableRadicals = useMemo(() => {
    if (activeTrack !== "kanji") {
      return [];
    }
    const radicals = beginnerKanjiPool
      .map((item) => item.radical)
      .filter((radical): radical is string => Boolean(radical));
    return Array.from(new Set(radicals)).sort((a, b) => a.localeCompare(b));
  }, [activeTrack]);

  const filteredDictionaryItems = useMemo(() => {
    const query = dictionaryQuery.trim().toLowerCase();

    return currentPool.filter((item) => {
      if (activeTrack === "kanji") {
        if (dictionarySumoOnly && !item.sumoRelevant) {
          return false;
        }
        if (dictionaryRadical !== "all" && item.radical !== dictionaryRadical) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const readingPool = [...item.onyomi, ...item.kunyomi, item.romaji ?? ""];
      return (
        item.character.includes(dictionaryQuery.trim()) ||
        item.primaryMeaning.toLowerCase().includes(query) ||
        item.meanings.some((meaning) => meaning.toLowerCase().includes(query)) ||
        readingPool.some((reading) => reading.toLowerCase().includes(query)) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        (item.row?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [activeTrack, currentPool, dictionaryQuery, dictionaryRadical, dictionarySumoOnly]);

  const selectedDictionaryItem = useMemo(() => {
    const selected = filteredDictionaryItems.find((item) => item.id === selectedItemId);
    return selected ?? filteredDictionaryItems[0] ?? null;
  }, [filteredDictionaryItems, selectedItemId]);

  const selectedDictionaryProgress = selectedDictionaryItem
    ? progressByItem[selectedDictionaryItem.id] ?? createDefaultProgress(selectedDictionaryItem.id)
    : null;

  const filteredSumoTerms = useMemo(() => {
    const query = sumoQuery.trim().toLowerCase();
    return sumoTerms.filter((term) => {
      if (sumoCategory !== "all" && term.category !== sumoCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        term.term.includes(sumoQuery.trim()) ||
        term.meaning.toLowerCase().includes(query) ||
        term.readingKana.toLowerCase().includes(query) ||
        term.readingRomaji.toLowerCase().includes(query)
      );
    });
  }, [sumoCategory, sumoQuery]);

  function buildLessonSegment(lesson: SeedLesson | undefined): StudyItem[] {
    if (currentPendingItems.length === 0) {
      return [];
    }

    const baseLessonItems =
      lesson?.itemIds
        .map((itemId) => itemById.get(itemId))
        .filter((item): item is StudyItem => Boolean(item))
        .filter((item) => !(progressByItem[item.id]?.excludedFromLessons ?? false))
        .filter((item) => (progressByItem[item.id]?.status ?? "new") !== "known") ?? [];

    const revisitRows = reviewTracker
      .getQueue(
        currentTrailItems
          .filter((item) => {
            const progress = progressByItem[item.id] ?? createDefaultProgress(item.id);
            return progress.correctCount + progress.incorrectCount > 0 && progress.status !== "known";
          })
          .map((item) => progressByItem[item.id] ?? createDefaultProgress(item.id)),
      )
      .slice(0, Math.max(REVISIT_INSERTS, baseLessonItems.length === 0 ? 5 : REVISIT_INSERTS));

    const picked: StudyItem[] = [];
    for (const row of revisitRows) {
      const item = itemById.get(row.itemId);
      if (item && !picked.some((candidate) => candidate.id === item.id)) {
        picked.push(item);
      }
    }

    for (const item of baseLessonItems) {
      if (!picked.some((candidate) => candidate.id === item.id)) {
        picked.push(item);
      }
    }

    if (picked.length === 0) {
      return currentPendingItems.slice(0, Math.min(5, currentPendingItems.length));
    }

    return picked;
  }

  function switchTrack(track: StudyTrack) {
    setActiveTrack(track);
    setScreen("dashboard");
    setLessonIndex(0);
    setQuizIndex(0);
    setQuizScore(0);
    setDashboardMessage("");
    setLastAnswerCorrect(null);
    setSessionMissedItemIds([]);
    setKnownEvent(null);
  }

  function startLesson() {
    if (currentPendingItems.length === 0) {
      setDashboardMessage(`${currentTrackConfig.label} is at the summit. Every symbol on this mount is known.`);
      setScreen("dashboard");
      return;
    }

    const lessonSegment = buildLessonSegment(currentLessonDefinition);
    if (lessonSegment.length === 0) {
      setDashboardMessage(`No eligible ${currentTrackConfig.unitPlural} are available for the next trail segment.`);
      setScreen("dashboard");
      return;
    }

    setDashboardMessage("");
    setActiveLessonItems(lessonSegment);
    setActiveLessonTitle(currentLessonDefinition?.title ?? `${currentTrackConfig.label} Lesson`);
    setLessonCursorByTrack((previous) => ({
      ...previous,
      [activeTrack]: (previous[activeTrack] + 1) % Math.max(1, currentLessons.length),
    }));
    setScreen("lesson");
    setLessonIndex(0);
    setQuizIndex(0);
    setQuizScore(0);
    setSessionMissedItemIds([]);
    setLastAnswerCorrect(null);
    setKnownEvent(null);
    setQuizQuestions(buildQuizQuestions(lessonSegment, currentPendingItems));
  }

  function submitAnswer(option: string) {
    if (!currentQuestion) {
      return;
    }

    const isCorrect = option === currentQuestion.correctOption;
    setLastAnswerCorrect(isCorrect);

    const attempt: QuizAttempt = {
      id: `attempt_${Date.now()}_${currentQuestion.itemId}_${quizIndex}`,
      questionType: activeTrack === "kanji" ? "kanji_recall" : "reading_quiz",
      itemId: currentQuestion.itemId,
      correct: isCorrect,
      answeredAt: new Date().toISOString(),
    };

    const currentProgress = progressByItem[currentQuestion.itemId] ?? createDefaultProgress(currentQuestion.itemId);
    const updatedProgress = reviewTracker.applyResult(currentProgress, isCorrect);
    const becameKnown = currentProgress.status !== "known" && updatedProgress.status === "known";

    setQuizAttempts((existing) => [attempt, ...existing].slice(0, 1000));
    setProgressByItem((previous) => ({
      ...previous,
      [currentQuestion.itemId]: updatedProgress,
    }));

    if (becameKnown) {
      setKnownEvent({
        itemId: currentQuestion.itemId,
        track: activeTrack,
        timestamp: Date.now(),
      });
    }

    if (isCorrect) {
      setQuizScore((value) => value + 1);
    } else {
      setSessionMissedItemIds((existing) => (existing.includes(currentQuestion.itemId) ? existing : [...existing, currentQuestion.itemId]));
    }

    if (quizIndex + 1 >= quizQuestions.length) {
      setScreen("summary");
      return;
    }

    setQuizIndex((value) => value + 1);
  }

  function setItemExcluded(itemId: string, excludedFromLessons: boolean) {
    setProgressByItem((previous) => {
      const currentProgress = previous[itemId] ?? createDefaultProgress(itemId);
      return {
        ...previous,
        [itemId]: {
          ...currentProgress,
          excludedFromLessons,
        },
      };
    });
  }

  function returnToDashboard() {
    setScreen("dashboard");
    setLessonIndex(0);
    setQuizIndex(0);
    setQuizScore(0);
    setLastAnswerCorrect(null);
  }

  const trails = [
    {
      name: currentTrackConfig.trailName,
      progress: `${activeMountProgress.knownCount} / ${activeMountProgress.totalSteps} known`,
      focus: currentTrackConfig.introFocus,
    },
    {
      name: "Progress Route",
      progress: `${activeMountProgress.percentComplete}% complete`,
      focus: "Steady ascent",
    },
    {
      name: activeTrack === "kanji" ? "Summit Route" : "Practice Route",
      progress:
        currentPendingItems.length === 0
          ? "Summit reached"
          : `${currentPendingItems.length} ${currentTrackConfig.unitPlural} still climbing`,
      focus: activeTrack === "kanji" ? "N5 and beyond" : "Full script mastery",
    },
  ];

  const overviewStats = [
    { label: "Known", value: activeMountProgress.knownCount, tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
    { label: "Remaining", value: activeMountProgress.remainingCount, tone: "border-amber-200 bg-amber-50 text-amber-900" },
    { label: "Attempts", value: overallStats.attempts, tone: "border-cyan-200 bg-cyan-50 text-cyan-900" },
    { label: "Accuracy", value: `${overallStats.accuracy}%`, tone: "border-violet-200 bg-violet-50 text-violet-900" },
  ];

  const knownEventItem = knownEvent ? itemById.get(knownEvent.itemId) : null;

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-sky-50 via-cyan-50 to-emerald-50 text-slate-900 ${settings.reducedMotion ? "reduced-motion" : ""}`}
      style={{ fontSize: `${settings.textScale}%` }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4">
        <header className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-md backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Mount Kanji</p>
                <span className="text-xs text-slate-500">{currentTrackConfig.dashboardSubtitle}</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{currentTrackConfig.dashboardTitle}</h1>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[25rem]">
              {overviewStats.map((stat) => (
                <article key={stat.label} className={`rounded-xl border px-3 py-2 shadow-sm ${stat.tone}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{stat.label}</p>
                  <p className="mt-0.5 text-xl font-bold">{stat.value}</p>
                </article>
              ))}
            </div>
          </div>
        </header>

        {screen === "dashboard" && (
          <section className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-lg backdrop-blur">
            <div className="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)]">
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Climbs</h2>
                <div className="mt-3 space-y-2">
                  {(["kanji", "hiragana", "katakana"] as StudyTrack[]).map((track) => (
                    <button
                      key={track}
                      type="button"
                      onClick={() => switchTrack(track)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        activeTrack === track
                          ? "border-cyan-600 bg-cyan-50 text-cyan-950"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-400 hover:bg-cyan-50"
                      }`}
                    >
                      <p className="text-sm font-semibold">{trackConfigs[track].label}</p>
                      <p className="mt-1 text-xs text-slate-600">{trackConfigs[track].dashboardSubtitle}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-800">
                        {mountProgressByTrack[track].knownCount}/{mountProgressByTrack[track].totalSteps} known
                      </p>
                    </button>
                  ))}
                </div>
              </article>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">Trails</h2>
                      <p className="text-sm text-slate-600">
                        Next lesson: {currentLessonDefinition?.title ?? "Trail Lesson"} ({(currentLessonCursor % trailLessonCount) + 1}/{trailLessonCount})
                      </p>
                    </div>
                    {dashboardMessage && <p className="mt-2 text-sm font-semibold text-emerald-800">{dashboardMessage}</p>}
                  </div>

                  <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-3">
                    <button type="button" onClick={startLesson} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                      Start Lesson ({SESSION_TARGET_MINUTES} min)
                    </button>
                    <button type="button" onClick={() => setScreen("dictionary")} className="rounded-xl border border-cyan-700 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100">
                      {activeTrack === "kanji" ? "Dictionary" : "Reference Chart"}
                    </button>
                    <button type="button" onClick={() => setScreen("progress")} className="rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100">
                      Progress
                    </button>
                    <button type="button" onClick={() => setScreen("settings")} className="rounded-xl border border-violet-700 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-100">
                      Settings
                    </button>
                    <button type="button" onClick={() => setScreen("sumo")} className="rounded-xl border border-amber-700 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100">
                      Sumo Terms
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {trails.map((trail) => (
                    <article key={trail.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{trail.name}</h3>
                          <p className="mt-1 text-xs text-slate-600">{trail.focus}</p>
                        </div>
                        <p className="text-xs font-medium text-slate-800">{trail.progress}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-3">
                  <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900">Current Climb</h3>
                    <div className="mt-3">
                      <MountProgressCard progress={activeMountProgress} active reducedMotion={settings.reducedMotion} />
                    </div>
                  </article>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900">Recent Attempts</h3>
                    {recentAttempts.length === 0 && <p className="mt-1 text-sm text-slate-600">No attempts yet.</p>}
                    {recentAttempts.length > 0 && (
                      <ul className="mt-1 space-y-1 text-sm text-slate-700">
                        {recentAttempts.map((attempt) => {
                          const item = itemById.get(attempt.itemId);
                          return (
                            <li key={attempt.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                              <span className="font-semibold text-slate-900">{item?.character ?? "?"}</span>
                              <span>{attempt.correct ? "Correct" : "Miss"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>

                  <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900">Mount Rule</h3>
                    <p className="mt-2 text-sm text-slate-700">
                      A symbol becomes known after {KNOWN_CORRECT_THRESHOLD} cumulative correct answers. Misses still count as misses, but they never erase earlier progress.
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Known symbols leave future quizzes, and every newly known symbol moves you one step closer to the summit.
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </section>
        )}

        {screen === "lesson" && currentLessonItem && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-800">{activeLessonTitle}</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
              Lesson Step {lessonIndex + 1} of {activeLessonItems.length}
            </p>
            <div className="mt-3 rounded-2xl border border-cyan-100 bg-white p-4">
              <p className="text-7xl font-bold text-slate-900">{currentLessonItem.character}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-800">{currentLessonItem.primaryMeaning}</p>
              {currentLessonItem.lessonHint && <p className="mt-2 text-sm font-medium text-cyan-700">{currentLessonItem.lessonHint}</p>}
              <p className="mt-2 text-slate-600">{currentLessonItem.mnemonic}</p>
              {activeTrack === "kanji" && settings.showFurigana && (
                <p className="mt-3 text-sm text-slate-500">
                  Kun: {formatReadings(currentLessonItem.kunyomi, settings.showRomaji)} | On: {formatReadings(currentLessonItem.onyomi, settings.showRomaji)}
                </p>
              )}
              {isKanaTrack && (
                <p className="mt-3 text-sm text-slate-500">
                  Sound: <span className="font-semibold text-slate-800">{currentLessonItem.romaji}</span>
                  {settings.showRomaji && currentLessonItem.kunyomi[0] ? ` | Kana: ${currentLessonItem.kunyomi[0]}` : ""}
                </p>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (lessonIndex + 1 >= activeLessonItems.length) {
                    setScreen("quiz");
                    return;
                  }
                  setLessonIndex((value) => value + 1);
                }}
                className="rounded-full bg-cyan-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                {lessonIndex + 1 === activeLessonItems.length ? "Start Quiz" : `Next ${activeTrack === "kanji" ? "Kanji" : "Character"}`}
              </button>
            </div>
          </section>
        )}

        {screen === "quiz" && currentQuestion && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Quiz {quizIndex + 1} of {quizQuestions.length}
                </p>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">
                  {currentTrackConfig.promptLabel} "{currentQuestion.promptLabel}"?
                </h2>
              </div>
              <div className="w-full max-w-md">
                <MountProgressCard progress={activeMountProgress} active reducedMotion={settings.reducedMotion} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => submitAnswer(option)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-5 text-4xl font-bold text-slate-900 transition hover:border-emerald-500 hover:bg-emerald-50"
                >
                  {option}
                </button>
              ))}
            </div>

            {lastAnswerCorrect !== null && (
              <div className="mt-4 space-y-1">
                <p className={`text-sm font-semibold ${lastAnswerCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                  {lastAnswerCorrect ? "Correct." : "Not this one. It will return in a later quiz."}
                </p>
                {knownEventItem?.id === currentQuestion.itemId && (
                  <p className="text-sm font-semibold text-cyan-800">
                    {knownEventItem.character} is now known. Your climber moved one step higher on {trackConfigs[activeTrack].label}.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {screen === "summary" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Session Summary</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Trail Segment Complete</h2>
            <p className="mt-3 text-slate-700">
              You answered {quizScore} out of {quizQuestions.length} correctly. Every correct answer moved a symbol closer to known, and every newly known symbol advanced the climb by one step.
            </p>
            {sessionMissedItemIds.length > 0 && (
              <p className="mt-2 text-sm text-slate-600">
                {sessionMissedItemIds.length} missed {sessionMissedItemIds.length === 1 ? "symbol" : "symbols"} will return during later quizzes until they reach {KNOWN_CORRECT_THRESHOLD} correct answers.
              </p>
            )}
            {knownEventItem && (
              <p className="mt-2 text-sm font-semibold text-cyan-800">
                Latest climb: {knownEventItem.character} reached known status on {knownEvent ? trackConfigs[knownEvent.track].label : currentTrackConfig.label}.
              </p>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm uppercase tracking-wide text-slate-500">Known</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{activeMountProgress.knownCount}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm uppercase tracking-wide text-slate-500">Remaining</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{activeMountProgress.remainingCount}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm uppercase tracking-wide text-slate-500">Overall Accuracy</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{overallStats.accuracy}%</p>
              </article>
            </div>

            <div className="mt-4">
              <MountProgressCard progress={activeMountProgress} active reducedMotion={settings.reducedMotion} />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={returnToDashboard} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Back To Base Camp
              </button>
              <button type="button" onClick={() => setScreen("progress")} className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600">
                View Progress
              </button>
              <button type="button" onClick={startLesson} className="rounded-full bg-cyan-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600">
                Climb Another Segment
              </button>
            </div>
          </section>
        )}

        {screen === "sumo" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Sumo</p>
                <h2 className="mt-1 text-3xl font-bold text-slate-900">Tournament Terms Browser</h2>
              </div>
              <button type="button" onClick={returnToDashboard} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Back To Base Camp
              </button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <input
                type="text"
                value={sumoQuery}
                onChange={(event) => setSumoQuery(event.currentTarget.value)}
                placeholder="Search by term, reading, or meaning"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-400 focus:ring-2 md:col-span-2"
              />
              <select
                value={sumoCategory}
                onChange={(event) => setSumoCategory(event.currentTarget.value as SumoCategoryFilter)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-400 focus:ring-2"
              >
                <option value="all">All categories</option>
                <option value="basics">Basics</option>
                <option value="ranks">Ranks</option>
                <option value="record">Record</option>
                <option value="match">Match techniques</option>
                <option value="events">Events & prizes</option>
              </select>
              <p className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{filteredSumoTerms.length} terms</p>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredSumoTerms.map((term) => (
                <article key={term.id} className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-3xl font-bold text-slate-900">{term.term}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{term.category}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{term.readingKana}</p>
                  {settings.showRomaji && <p className="text-xs text-slate-500">{term.readingRomaji}</p>}
                  <p className="mt-2 text-sm text-slate-800">{term.meaning}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {screen === "dictionary" && (
          <section className="rounded-2xl border border-white/70 bg-white/85 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">{activeTrack === "kanji" ? "Dictionary" : "Reference"}</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{currentTrackConfig.dictionaryTitle}</h2>
              </div>
              <button type="button" onClick={returnToDashboard} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Back To Base Camp
              </button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <input
                type="text"
                value={dictionaryQuery}
                onChange={(event) => setDictionaryQuery(event.currentTarget.value)}
                placeholder={activeTrack === "kanji" ? "Search by kanji, meaning, or reading" : "Search by kana, romaji, row, or tag"}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-400 focus:ring-2 md:col-span-2"
              />
              {activeTrack === "kanji" ? (
                <>
                  <select
                    value={dictionaryRadical}
                    onChange={(event) => setDictionaryRadical(event.currentTarget.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-400 focus:ring-2"
                  >
                    <option value="all">All radicals</option>
                    {availableRadicals.map((radical) => (
                      <option key={radical} value={radical}>
                        Radical: {radical}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={dictionarySumoOnly} onChange={(event) => setDictionarySumoOnly(event.currentTarget.checked)} className="h-4 w-4 accent-cyan-700" />
                    Sumo only
                  </label>
                </>
              ) : (
                <p className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 md:col-span-2">
                  {activeTrack === "hiragana"
                    ? "Full hiragana chart with voiced and contracted sounds."
                    : "Full katakana chart with voiced and contracted sounds."}
                </p>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600">
              <p>Showing {filteredDictionaryItems.length} {currentTrackConfig.unitPlural}</p>
              {selectedDictionaryItem && <p className="hidden lg:block">Selected: {selectedDictionaryItem.character}</p>}
            </div>

            <div className="mt-3 grid gap-3 lg:h-[calc(100vh-12rem)] lg:grid-cols-[minmax(0,1.55fr)_22rem]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 lg:min-h-0">
                <div className={`grid gap-2 lg:max-h-full lg:overflow-y-auto lg:pr-1 ${activeTrack === "kanji" ? "grid-cols-5 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-10" : "grid-cols-5 md:grid-cols-5"}`}>
                  {filteredDictionaryItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className={`rounded-xl border px-2 py-3 text-2xl font-bold transition ${
                        selectedDictionaryItem?.id === item.id
                          ? "border-cyan-600 bg-cyan-100 text-cyan-950"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-400 hover:bg-cyan-50"
                      }`}
                    >
                      {item.character}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-3 lg:max-h-[calc(100vh-12rem)] lg:self-start lg:overflow-y-auto">
                {!selectedDictionaryItem && <p className="text-sm text-slate-600">No matches for the current filters.</p>}
                {selectedDictionaryItem && (
                  <>
                    <p className="text-6xl font-bold text-slate-900">{selectedDictionaryItem.character}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">{selectedDictionaryItem.primaryMeaning}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedDictionaryItem.meanings.join(", ")}</p>

                    <dl className="mt-4 space-y-2 text-sm">
                      {activeTrack === "kanji" && settings.showFurigana && (
                        <>
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">On reading</dt>
                            <dd className="font-semibold text-slate-800">{formatReadings(selectedDictionaryItem.onyomi, settings.showRomaji)}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Kun reading</dt>
                            <dd className="font-semibold text-slate-800">{formatReadings(selectedDictionaryItem.kunyomi, settings.showRomaji)}</dd>
                          </div>
                        </>
                      )}
                      {isKanaTrack && (
                        <>
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Romaji</dt>
                            <dd className="font-semibold text-slate-800">{selectedDictionaryItem.romaji}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Row</dt>
                            <dd className="font-semibold capitalize text-slate-800">{selectedDictionaryItem.row?.replace("-", " ")}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Column</dt>
                            <dd className="font-semibold text-slate-800">{selectedDictionaryItem.column}</dd>
                          </div>
                        </>
                      )}
                      {selectedDictionaryItem.radical && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Radical</dt>
                          <dd className="font-semibold text-slate-800">{selectedDictionaryItem.radical}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Strokes</dt>
                        <dd className="font-semibold text-slate-800">{selectedDictionaryItem.strokeCount}</dd>
                      </div>
                      {selectedDictionaryItem.jlptLevel && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">JLPT</dt>
                          <dd className="font-semibold text-slate-800">{selectedDictionaryItem.jlptLevel}</dd>
                        </div>
                      )}
                    </dl>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedDictionaryItem.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {selectedDictionaryProgress && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Study Status</p>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{selectedDictionaryProgress.status}</p>
                        <p className="text-xs text-slate-600">
                          Correct answers: {selectedDictionaryProgress.correctCount}/{KNOWN_CORRECT_THRESHOLD}
                        </p>
                        <p className="text-xs text-slate-600">Accuracy: {accuracyPercent(selectedDictionaryProgress)}%</p>
                        <button
                          type="button"
                          onClick={() => setItemExcluded(selectedDictionaryItem.id, !selectedDictionaryProgress.excludedFromLessons)}
                          className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            selectedDictionaryProgress.excludedFromLessons
                              ? "border border-emerald-700 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                              : "border border-rose-700 bg-rose-50 text-rose-900 hover:bg-rose-100"
                          }`}
                        >
                          {selectedDictionaryProgress.excludedFromLessons ? "Include In Future Trails" : "Exclude From Future Trails"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {screen === "progress" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Progress</p>
                <h2 className="mt-1 text-3xl font-bold text-slate-900">All Three Mounts</h2>
              </div>
              <button type="button" onClick={returnToDashboard} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Back To Base Camp
              </button>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {(["kanji", "hiragana", "katakana"] as StudyTrack[]).map((track) => (
                <MountProgressCard
                  key={track}
                  progress={mountProgressByTrack[track]}
                  active={track === activeTrack}
                  reducedMotion={settings.reducedMotion}
                  onSelect={() => setActiveTrack(track)}
                />
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Current Streak</p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">{overallStats.currentStreak}</p>
              </article>
              <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-700">Longest Streak</p>
                <p className="mt-2 text-3xl font-bold text-cyan-950">{overallStats.longestStreak}</p>
              </article>
              <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-xs uppercase tracking-wide text-violet-700">Total Attempts</p>
                <p className="mt-2 text-3xl font-bold text-violet-950">{overallStats.attempts}</p>
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700">Overall Accuracy</p>
                <p className="mt-2 text-3xl font-bold text-amber-950">{overallStats.accuracy}%</p>
              </article>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Weakest {activeTrack === "kanji" ? "Kanji" : "Characters"}</h3>
                {weakItems.length === 0 && <p className="mt-2 text-sm text-slate-600">No misses recorded yet.</p>}
                {weakItems.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {weakItems.map(({ row, item }) => (
                      <li key={row.itemId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-2xl font-bold text-slate-900">{item?.character}</span>
                        <span>{item?.primaryMeaning}</span>
                        <span className="font-semibold text-rose-700">misses: {row.incorrectCount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Strongest {activeTrack === "kanji" ? "Kanji" : "Characters"}</h3>
                {strongItems.length === 0 && <p className="mt-2 text-sm text-slate-600">No wins recorded yet.</p>}
                {strongItems.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {strongItems.map(({ row, item }) => (
                      <li key={row.itemId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-2xl font-bold text-slate-900">{item?.character}</span>
                        <span>{item?.primaryMeaning}</span>
                        <span className="font-semibold text-emerald-700">hits: {row.correctCount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </section>
        )}

        {screen === "settings" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Settings</p>
                <h2 className="mt-1 text-3xl font-bold text-slate-900">Study Preferences</h2>
              </div>
              <button type="button" onClick={returnToDashboard} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Back To Base Camp
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Reading Display</h3>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Show Furigana Readings</span>
                    <input type="checkbox" checked={settings.showFurigana} onChange={(event) => setSettings((previous) => ({ ...previous, showFurigana: event.currentTarget.checked }))} className="h-5 w-5 accent-violet-700" />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Show Romaji</span>
                    <input type="checkbox" checked={settings.showRomaji} onChange={(event) => setSettings((previous) => ({ ...previous, showRomaji: event.currentTarget.checked }))} disabled={!settings.showFurigana} className="h-5 w-5 accent-violet-700 disabled:opacity-50" />
                  </label>

                  {!settings.showFurigana && <p className="text-xs text-slate-500">Enable furigana first to show romaji.</p>}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Accessibility</h3>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Reduced Motion</span>
                    <input type="checkbox" checked={settings.reducedMotion} onChange={(event) => setSettings((previous) => ({ ...previous, reducedMotion: event.currentTarget.checked }))} className="h-5 w-5 accent-violet-700" />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Text Size</span>
                    <select
                      value={settings.textScale}
                      onChange={(event) => setSettings((previous) => ({ ...previous, textScale: Number(event.currentTarget.value) as TextScale }))}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                      <option value={90}>Compact</option>
                      <option value={100}>Default</option>
                      <option value={110}>Large</option>
                      <option value={125}>Extra Large</option>
                    </select>
                  </label>
                </div>
              </article>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
