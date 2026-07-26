import { useEffect, useMemo, useState } from "react";
import { toRomaji } from "wanakana";

import { beginnerKanjiPool } from "./data/seed/beginnerSet";
import { seedLessons } from "./data/seed/lessonCatalog";
import { sumoTerms, type SumoTerm } from "./data/seed/sumoTerms";
import { createProgressRepository } from "./repositories/progressRepositoryFactory";
import { ReviewTracker, resolveKanjiStatus } from "./services/reviewTracker";
import type { ProgressRepository } from "./repositories/progressRepository";
import type { Kanji, QuizAttempt, UserKanjiProgress } from "./types";

type Screen =
  | "dashboard"
  | "lesson"
  | "quiz"
  | "review"
  | "summary"
  | "dictionary"
  | "progress"
  | "settings"
  | "sumo";

interface QuizQuestion {
  kanjiId: string;
  promptMeaning: string;
  options: string[];
  correctOption: string;
}

const SESSION_TARGET_MINUTES = "5-10";
const LESSON_CURSOR_STORAGE_KEY = "mount-kanji-lesson-cursor";
const SETTINGS_STORAGE_KEY = "mount-kanji-settings";
const TRAIL_BATCH_SIZE = 5;
const REVIEW_TRAIL_INSERTS = 2;

type TextScale = 90 | 100 | 110 | 125;

interface AppSettings {
  showFurigana: boolean;
  showRomaji: boolean;
  reducedMotion: boolean;
  textScale: TextScale;
}

type SumoCategoryFilter = "all" | SumoTerm["category"];

const DEFAULT_SETTINGS: AppSettings = {
  showFurigana: true,
  showRomaji: false,
  reducedMotion: false,
  textScale: 100,
};

const reviewTracker = new ReviewTracker();

const kanjiById = new Map(beginnerKanjiPool.map((kanji) => [kanji.id, kanji]));

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function resolveLessonKanji(kanjiIds: string[]): Kanji[] {
  return kanjiIds.map((id) => kanjiById.get(id)).filter(Boolean) as Kanji[];
}

function buildQuizQuestions(lessonKanji: Kanji[]): QuizQuestion[] {
  return lessonKanji.map((kanji) => {
    const distractors = shuffle(beginnerKanjiPool.filter((item) => item.id !== kanji.id))
      .slice(0, 3)
      .map((item) => item.character);
    const options = shuffle([kanji.character, ...distractors]);
    return {
      kanjiId: kanji.id,
      promptMeaning: kanji.primaryMeaning,
      options,
      correctOption: kanji.character,
    };
  });
}

function createDefaultProgress(kanjiId: string): UserKanjiProgress {
  return {
    id: `progress_${kanjiId}`,
    kanjiId,
    status: "new",
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    reviewWeight: 0,
    excludedFromLessons: false,
    lastAnsweredCorrect: null,
    lastReviewedAt: null,
  };
}

function normalizeProgressRow(
  kanjiId: string,
  raw?: Partial<UserKanjiProgress> & {
    status?: string;
    consecutiveCorrect?: number;
  },
): UserKanjiProgress {
  const base = createDefaultProgress(kanjiId);
  const correctCount = typeof raw?.correctCount === "number" ? raw.correctCount : 0;
  const incorrectCount = typeof raw?.incorrectCount === "number" ? raw.incorrectCount : 0;
  const currentStreak =
    typeof raw?.currentStreak === "number"
      ? raw.currentStreak
      : typeof raw?.consecutiveCorrect === "number"
        ? raw.consecutiveCorrect
        : 0;
  const bestStreak = typeof raw?.bestStreak === "number" ? raw.bestStreak : currentStreak;
  const reviewWeight =
    typeof raw?.reviewWeight === "number"
      ? raw.reviewWeight
      : (raw?.status as string | undefined) === "needs_review"
        ? 3
        : 0;

  return {
    ...base,
    ...raw,
    kanjiId,
    id: typeof raw?.id === "string" ? raw.id : base.id,
    status: resolveKanjiStatus(correctCount, incorrectCount, currentStreak),
    correctCount,
    incorrectCount,
    currentStreak,
    bestStreak,
    reviewWeight,
    excludedFromLessons: Boolean(raw?.excludedFromLessons),
    lastAnsweredCorrect: typeof raw?.lastAnsweredCorrect === "boolean" ? raw.lastAnsweredCorrect : null,
    lastReviewedAt: typeof raw?.lastReviewedAt === "string" ? raw.lastReviewedAt : null,
  };
}

function uniqueByKanjiId(rows: UserKanjiProgress[]): UserKanjiProgress[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.kanjiId)) {
      return false;
    }
    seen.add(row.kanjiId);
    return true;
  });
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
  for (let i = 1; i < uniqueDays.length; i += 1) {
    const prev = new Date(`${uniqueDays[i - 1]}T00:00:00Z`).getTime();
    const cur = new Date(`${uniqueDays[i]}T00:00:00Z`).getTime();
    const diffDays = (cur - prev) / (24 * 60 * 60 * 1000);
    if (diffDays === 1) {
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

function accuracyPercent(row: UserKanjiProgress): number {
  const total = row.correctCount + row.incorrectCount;
  if (total === 0) {
    return 0;
  }
  return Math.round((row.correctCount / total) * 100);
}

function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [reviewDoneCount, setReviewDoneCount] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string>("");
  const [progressByKanji, setProgressByKanji] = useState<Record<string, UserKanjiProgress>>({});
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [sessionMissedKanjiIds, setSessionMissedKanjiIds] = useState<string[]>([]);
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
  const [selectedKanjiId, setSelectedKanjiId] = useState<string>(beginnerKanjiPool[0]?.id ?? "");
  const [activeLessonKanji, setActiveLessonKanji] = useState<Kanji[]>(() => {
    const firstLesson = seedLessons[0];
    return firstLesson ? resolveLessonKanji(firstLesson.kanjiIds) : [];
  });
  const [activeLessonTitle, setActiveLessonTitle] = useState<string>(seedLessons[0]?.title ?? "Beginner Lesson");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [reviewQueue, setReviewQueue] = useState<UserKanjiProgress[]>([]);
  const [progressRepository, setProgressRepository] = useState<ProgressRepository | null>(null);
  const [isProgressHydrated, setIsProgressHydrated] = useState(false);
  const [questionStartedAtMs, setQuestionStartedAtMs] = useState<number>(Date.now());
  const [lessonCursor, setLessonCursor] = useState<number>(() => {
    const saved = window.localStorage.getItem(LESSON_CURSOR_STORAGE_KEY);
    if (!saved) {
      return 0;
    }

    const parsed = Number(saved);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return Math.floor(parsed) % Math.max(1, seedLessons.length);
  });

  useEffect(() => {
    let isActive = true;

    createProgressRepository().then(async (repository) => {
      if (!isActive) {
        return;
      }

      setProgressRepository(repository);
      const [loadedProgress, loadedAttempts] = await Promise.all([
        repository.loadAll(),
        repository.loadQuizAttempts(),
      ]);
      if (isActive) {
        const normalizedProgress = Object.fromEntries(
          Object.entries(loadedProgress).map(([kanjiId, row]) => [kanjiId, normalizeProgressRow(kanjiId, row)]),
        );
        setProgressByKanji(normalizedProgress);
        setQuizAttempts(loadedAttempts);
        setIsProgressHydrated(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!progressRepository || !isProgressHydrated) {
      return;
    }

    progressRepository.saveAll(progressByKanji);
  }, [isProgressHydrated, progressByKanji, progressRepository]);

  useEffect(() => {
    if (!progressRepository || !isProgressHydrated) {
      return;
    }

    progressRepository.saveQuizAttempts(quizAttempts);
  }, [isProgressHydrated, progressRepository, quizAttempts]);

  useEffect(() => {
    window.localStorage.setItem(LESSON_CURSOR_STORAGE_KEY, String(lessonCursor));
  }, [lessonCursor]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const overallStats = useMemo(() => {
    const rows = Object.values(progressByKanji);
    const activeKanjiIds = new Set(
      beginnerKanjiPool
        .filter((kanji) => !(progressByKanji[kanji.id]?.excludedFromLessons ?? false))
        .map((kanji) => kanji.id),
    );
    const activeRows = rows.filter((row) => activeKanjiIds.has(row.kanjiId));
    const learned = activeRows.filter((row) => row.correctCount + row.incorrectCount > 0).length;
    const mastered = activeRows.filter((row) => row.status === "mastered").length;
    const due = reviewTracker.getQueue(rows).length;
    const totalCorrect = rows.reduce((sum, row) => sum + row.correctCount, 0);
    const totalAttempts = rows.reduce((sum, row) => sum + row.correctCount + row.incorrectCount, 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const streaks = computeStreaks(quizAttempts);

    return {
      learned,
      mastered,
      due,
      accuracy,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    };
  }, [progressByKanji, quizAttempts]);

  const currentLessonKanji = activeLessonKanji[lessonIndex];
  const currentQuestion = quizQuestions[quizIndex];
  const recentAttempts = quizAttempts.slice(0, 5);
  const activeTrailKanji = useMemo(() => {
    return beginnerKanjiPool.filter((kanji) => !(progressByKanji[kanji.id]?.excludedFromLessons ?? false));
  }, [progressByKanji]);
  const totalTrailKanjiCount = activeTrailKanji.length;
  const trailLessonCount = Math.max(1, Math.ceil(Math.max(1, totalTrailKanjiCount) / TRAIL_BATCH_SIZE));
  const averageResponseMs =
    quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.responseTimeMs, 0) / quizAttempts.length)
      : 0;
  const weakKanji = useMemo(() => {
    return Object.values(progressByKanji)
      .filter((row) => row.incorrectCount > 0)
      .sort((a, b) => b.incorrectCount - a.incorrectCount)
      .slice(0, 8)
      .map((row) => ({ row, kanji: kanjiById.get(row.kanjiId) }))
      .filter((item) => item.kanji);
  }, [progressByKanji]);
  const strongKanji = useMemo(() => {
    return Object.values(progressByKanji)
      .filter((row) => row.correctCount > 0)
      .sort((a, b) => b.correctCount - a.correctCount)
      .slice(0, 8)
      .map((row) => ({ row, kanji: kanjiById.get(row.kanjiId) }))
      .filter((item) => item.kanji);
  }, [progressByKanji]);

  useEffect(() => {
    if (screen === "quiz" && currentQuestion) {
      setQuestionStartedAtMs(Date.now());
    }
  }, [currentQuestion, quizIndex, screen]);

  const currentReviewProgress = reviewQueue[0];
  const currentReviewKanji = currentReviewProgress ? kanjiById.get(currentReviewProgress.kanjiId) : null;

  const availableRadicals = useMemo(() => {
    const unique = new Set(beginnerKanjiPool.map((kanji) => kanji.radical));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredDictionaryKanji = useMemo(() => {
    const query = dictionaryQuery.trim().toLowerCase();

    return beginnerKanjiPool.filter((kanji) => {
      if (dictionarySumoOnly && !kanji.sumoRelevant) {
        return false;
      }

      if (dictionaryRadical !== "all" && kanji.radical !== dictionaryRadical) {
        return false;
      }

      if (!query) {
        return true;
      }

      const meaningMatch =
        kanji.primaryMeaning.toLowerCase().includes(query) ||
        kanji.meanings.some((meaning) => meaning.toLowerCase().includes(query));
      const readingMatch = [...kanji.onyomi, ...kanji.kunyomi].some((reading) => reading.toLowerCase().includes(query));
      const tagMatch = kanji.tags.some((tag) => tag.toLowerCase().includes(query));
      const charMatch = kanji.character.includes(dictionaryQuery.trim());

      return meaningMatch || readingMatch || tagMatch || charMatch;
    });
  }, [dictionaryQuery, dictionaryRadical, dictionarySumoOnly]);

  const selectedDictionaryKanji = useMemo(() => {
    const selected = filteredDictionaryKanji.find((kanji) => kanji.id === selectedKanjiId);
    return selected ?? filteredDictionaryKanji[0] ?? null;
  }, [filteredDictionaryKanji, selectedKanjiId]);
  const selectedDictionaryProgress = selectedDictionaryKanji
    ? progressByKanji[selectedDictionaryKanji.id] ?? createDefaultProgress(selectedDictionaryKanji.id)
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

  function buildLessonSegment(startOffset: number): Kanji[] {
    if (activeTrailKanji.length === 0) {
      return [];
    }

    const priorityKanji = activeTrailKanji
      .filter((kanji) => (progressByKanji[kanji.id]?.reviewWeight ?? 0) > 0)
      .sort((a, b) => {
        const aProgress = progressByKanji[a.id] ?? createDefaultProgress(a.id);
        const bProgress = progressByKanji[b.id] ?? createDefaultProgress(b.id);

        if (bProgress.reviewWeight !== aProgress.reviewWeight) {
          return bProgress.reviewWeight - aProgress.reviewWeight;
        }

        return bProgress.incorrectCount - aProgress.incorrectCount;
      })
      .slice(0, REVIEW_TRAIL_INSERTS);

    const picked = [...priorityKanji];
    for (let i = 0; picked.length < Math.min(TRAIL_BATCH_SIZE, activeTrailKanji.length) && i < activeTrailKanji.length; i += 1) {
      const index = (startOffset + i) % activeTrailKanji.length;
      const kanji = activeTrailKanji[index];
      if (!picked.some((item) => item.id === kanji.id)) {
        picked.push(kanji);
      }
    }

    return picked;
  }

  function startLesson() {
    if (activeTrailKanji.length === 0) {
      setReviewFeedback("All kanji are currently excluded from future trails.");
      setScreen("dashboard");
      return;
    }

    const lessonCount = Math.max(1, Math.ceil(Math.max(1, activeTrailKanji.length) / TRAIL_BATCH_SIZE));
    const lessonDefinition = seedLessons[lessonCursor];
    const lessonSegment = buildLessonSegment(lessonCursor * TRAIL_BATCH_SIZE);
    const nextCursor = (lessonCursor + 1) % lessonCount;

    setActiveLessonKanji(lessonSegment);
    setActiveLessonTitle(lessonDefinition?.title ?? `Trail Lesson ${lessonCursor + 1}`);
    setLessonCursor(nextCursor);
    setScreen("lesson");
    setLessonIndex(0);
    setQuizIndex(0);
    setQuizScore(0);
    setReviewDoneCount(0);
    setSessionMissedKanjiIds([]);
    setReviewFeedback("");
    setLastAnswerCorrect(null);
    setQuizQuestions(buildQuizQuestions(lessonSegment));
  }

  function startReviewQueue(seedKanjiIds: string[] = []) {
    const seeded = seedKanjiIds
      .map((kanjiId) => progressByKanji[kanjiId] ?? createDefaultProgress(kanjiId))
      .filter((row) => !row.excludedFromLessons);
    const queue = uniqueByKanjiId([...seeded, ...reviewTracker.getQueue(Object.values(progressByKanji))]);

    setReviewQueue(queue);
    setReviewDoneCount(0);
    setReviewFeedback("");
    setScreen("review");
  }

  function openDictionary() {
    setScreen("dictionary");
  }

  function openProgress() {
    setScreen("progress");
  }

  function openSumo() {
    setScreen("sumo");
  }

  function openReviewQueue() {
    startReviewQueue();
  }

  function openSettings() {
    setScreen("settings");
  }

  function advanceLesson() {
    if (lessonIndex + 1 >= activeLessonKanji.length) {
      setScreen("quiz");
      return;
    }

    setLessonIndex((value) => value + 1);
  }

  function submitAnswer(option: string) {
    if (!currentQuestion) {
      return;
    }

    const isCorrect = option === currentQuestion.correctOption;
    setLastAnswerCorrect(isCorrect);
    const responseTimeMs = Math.max(250, Date.now() - questionStartedAtMs);

    const attempt: QuizAttempt = {
      id: `attempt_${Date.now()}_${currentQuestion.kanjiId}_${quizIndex}`,
      questionType: "kanji_recall",
      kanjiId: currentQuestion.kanjiId,
      correct: isCorrect,
      responseTimeMs,
      answeredAt: new Date().toISOString(),
    };

    setQuizAttempts((existing) => [attempt, ...existing].slice(0, 1000));

    setProgressByKanji((previous) => {
      const currentProgress = previous[currentQuestion.kanjiId] ?? createDefaultProgress(currentQuestion.kanjiId);
      const updated = reviewTracker.applyResult(currentProgress, isCorrect);
      return {
        ...previous,
        [currentQuestion.kanjiId]: updated,
      };
    });

    if (isCorrect) {
      setQuizScore((value) => value + 1);
    } else {
      setSessionMissedKanjiIds((existing) => {
        if (existing.includes(currentQuestion.kanjiId)) {
          return existing;
        }
        return [...existing, currentQuestion.kanjiId];
      });
    }

    if (quizIndex + 1 >= quizQuestions.length) {
      setScreen("summary");
      return;
    }

    setQuizIndex((value) => value + 1);
  }

  function returnToDashboard() {
    setScreen("dashboard");
    setLessonIndex(0);
    setQuizIndex(0);
    setQuizScore(0);
    setReviewDoneCount(0);
    setReviewFeedback("");
    setLastAnswerCorrect(null);
  }

  function applyReviewResult(correct: boolean) {
    if (!currentReviewProgress) {
      return;
    }

    const activeProgress = progressByKanji[currentReviewProgress.kanjiId] ?? currentReviewProgress;
    const updatedProgress = reviewTracker.applyResult(activeProgress, correct);

    setProgressByKanji((previous) => {
      return {
        ...previous,
        [updatedProgress.kanjiId]: updatedProgress,
      };
    });

    setReviewDoneCount((count) => count + 1);
    setReviewFeedback(
      `${correct ? "Logged a hit" : "Logged a miss"} for ${currentReviewKanji?.character ?? "kanji"}. Review weight is now ${updatedProgress.reviewWeight}.`,
    );
    setReviewQueue((queue) => queue.slice(1));
  }

  function setKanjiExcluded(kanjiId: string, excludedFromLessons: boolean) {
    setProgressByKanji((previous) => {
      const currentProgress = previous[kanjiId] ?? createDefaultProgress(kanjiId);
      return {
        ...previous,
        [kanjiId]: {
          ...currentProgress,
          excludedFromLessons,
          reviewWeight: excludedFromLessons ? 0 : currentProgress.reviewWeight,
        },
      };
    });

    setReviewQueue((queue) => queue.filter((row) => row.kanjiId !== kanjiId || !excludedFromLessons));
  }

  const trails = [
    { name: "Beginner Trail", progress: `${overallStats.learned} / ${totalTrailKanjiCount} kanji`, focus: "Core recognition" },
    { name: "Radicals Trail", progress: "Locked for phase 2", focus: "Pattern clues" },
    { name: "Sumo Trail", progress: "Content loading next", focus: "Ranks and match terms" },
  ];

  const overviewStats = [
    { label: "New", value: activeLessonKanji.length, tone: "border-cyan-200 bg-cyan-50 text-cyan-900" },
    { label: "Due", value: overallStats.due, tone: "border-amber-200 bg-amber-50 text-amber-900" },
    { label: "Learned", value: overallStats.learned, tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
    { label: "Accuracy", value: `${overallStats.accuracy}%`, tone: "border-violet-200 bg-violet-50 text-violet-900" },
  ];

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
                <span className="text-xs text-slate-500">Meaning-first recognition and review</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">Base Camp Dashboard</h1>
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
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Trails</h2>
                  <p className="text-sm text-slate-600">
                    Next lesson: {seedLessons[lessonCursor]?.title ?? "Beginner Lesson"} ({(lessonCursor % trailLessonCount) + 1}/
                    {trailLessonCount})
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-3">
                <button
                  type="button"
                  onClick={startLesson}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Start Lesson ({SESSION_TARGET_MINUTES} min)
                </button>
                <button
                  type="button"
                  onClick={openReviewQueue}
                  className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Start Reviews ({overallStats.due})
                </button>
                <button
                  type="button"
                  onClick={openDictionary}
                  className="rounded-xl border border-cyan-700 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100"
                >
                  Dictionary
                </button>
                <button
                  type="button"
                  onClick={openProgress}
                  className="rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
                >
                  Progress
                </button>
                <button
                  type="button"
                  onClick={openSettings}
                  className="rounded-xl border border-violet-700 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-100"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={openSumo}
                  className="rounded-xl border border-amber-700 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                >
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

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Study Telemetry</h3>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Attempts</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{quizAttempts.length}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Avg Response</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {averageResponseMs > 0 ? `${(averageResponseMs / 1000).toFixed(1)}s` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Mastered</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{overallStats.mastered}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Recent Attempts</h3>
                {recentAttempts.length === 0 && <p className="mt-1 text-sm text-slate-600">No attempts yet.</p>}
                {recentAttempts.length > 0 && (
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {recentAttempts.map((attempt) => {
                      const kanji = kanjiById.get(attempt.kanjiId);
                      return (
                        <li key={attempt.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                          <span className="font-semibold text-slate-900">{kanji?.character ?? "?"}</span>
                          <span>{attempt.correct ? "Correct" : "Miss"}</span>
                          <span>{(attempt.responseTimeMs / 1000).toFixed(1)}s</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            </div>
          </section>
        )}

        {screen === "lesson" && currentLessonKanji && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-800">{activeLessonTitle}</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
              Lesson Step {lessonIndex + 1} of {activeLessonKanji.length}
            </p>
            <div className="mt-3 rounded-2xl border border-cyan-100 bg-white p-4">
              <p className="text-7xl font-bold text-slate-900">{currentLessonKanji.character}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-800">{currentLessonKanji.primaryMeaning}</p>
              <p className="mt-2 text-slate-600">{currentLessonKanji.mnemonic}</p>
              {settings.showFurigana && (
                <p className="mt-3 text-sm text-slate-500">
                  Kun: {formatReadings(currentLessonKanji.kunyomi, settings.showRomaji)} | On: {formatReadings(currentLessonKanji.onyomi, settings.showRomaji)}
                </p>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={advanceLesson}
                className="rounded-full bg-cyan-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                {lessonIndex + 1 === activeLessonKanji.length ? "Start Quiz" : "Next Kanji"}
              </button>
            </div>
          </section>
        )}

        {screen === "quiz" && currentQuestion && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Quiz {quizIndex + 1} of {quizQuestions.length}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Which kanji means "{currentQuestion.promptMeaning}"?</h2>

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
              <p className={`mt-4 text-sm font-semibold ${lastAnswerCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                {lastAnswerCorrect ? "Correct. Nice climb." : "Not this one. You will see it again soon."}
              </p>
            )}
          </section>
        )}

        {screen === "summary" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Session Summary</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Trail Segment Complete</h2>
            <p className="mt-3 text-slate-700">
              You answered {quizScore} out of {quizQuestions.length} correctly and updated each kanji's hit, miss, and review weight.
            </p>
            <p className="mt-1 text-sm text-slate-600">Wrong answers raise review weight. Correct answers lower it and build streaks.</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm uppercase tracking-wide text-slate-500">Mastered</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{overallStats.mastered}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm uppercase tracking-wide text-slate-500">Reviews Due Now</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{overallStats.due}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm uppercase tracking-wide text-slate-500">Overall Accuracy</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{overallStats.accuracy}%</p>
              </article>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {sessionMissedKanjiIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => startReviewQueue(sessionMissedKanjiIds)}
                  className="rounded-full bg-amber-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  Review Missed ({sessionMissedKanjiIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Back To Base Camp
              </button>
              <button
                type="button"
                onClick={startLesson}
                className="rounded-full bg-cyan-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
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
              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
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
              <p className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                {filteredSumoTerms.length} terms
              </p>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredSumoTerms.map((term) => (
                <article key={term.id} className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-3xl font-bold text-slate-900">{term.term}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                      {term.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{term.readingKana}</p>
                  {settings.showRomaji && <p className="text-xs text-slate-500">{term.readingRomaji}</p>}
                  <p className="mt-2 text-sm text-slate-800">{term.meaning}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {screen === "review" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Review Queue</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Trouble Spot Review</h2>

            {!currentReviewKanji && (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-lg font-semibold text-emerald-900">Queue complete.</p>
                <p className="mt-2 text-emerald-800">You finished {reviewDoneCount} review cards in this session.</p>
                <button
                  type="button"
                  onClick={returnToDashboard}
                  className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Back To Base Camp
                </button>
              </div>
            )}

            {currentReviewKanji && (
              <div className="mt-3">
                <div className="rounded-2xl border border-amber-100 bg-white p-4 text-center">
                  <p className="text-7xl font-bold text-slate-900">{currentReviewKanji.character}</p>
                  <p className="mt-3 text-xl font-semibold text-slate-800">{currentReviewKanji.primaryMeaning}</p>
                  {settings.showFurigana && (
                    <p className="mt-2 text-xs text-slate-500">
                      Kun: {formatReadings(currentReviewKanji.kunyomi, settings.showRomaji)} | On: {formatReadings(currentReviewKanji.onyomi, settings.showRomaji)}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-600">Mark whether you got it or missed it. Misses raise review weight so this kanji comes back sooner.</p>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => applyReviewResult(false)}
                    className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Missed It
                  </button>
                  <button
                    type="button"
                    onClick={() => applyReviewResult(true)}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Got It
                  </button>
                </div>

                <p className="mt-3 text-sm text-slate-700">Remaining cards: {reviewQueue.length}</p>
                {reviewFeedback && <p className="mt-2 text-sm font-semibold text-slate-700">{reviewFeedback}</p>}
              </div>
            )}
          </section>
        )}

        {screen === "dictionary" && (
          <section className="rounded-2xl border border-white/70 bg-white/85 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Dictionary</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">JLPT Kanji Browser</h2>
              </div>
              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Back To Base Camp
              </button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <input
                type="text"
                value={dictionaryQuery}
                onChange={(event) => setDictionaryQuery(event.currentTarget.value)}
                placeholder="Search by kanji, meaning, or reading"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-400 focus:ring-2 md:col-span-2"
              />
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
                <input
                  type="checkbox"
                  checked={dictionarySumoOnly}
                  onChange={(event) => setDictionarySumoOnly(event.currentTarget.checked)}
                  className="h-4 w-4 accent-cyan-700"
                />
                Sumo only
              </label>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600">
              <p>Showing {filteredDictionaryKanji.length} kanji</p>
              {selectedDictionaryKanji && <p className="hidden lg:block">Selected: {selectedDictionaryKanji.character}</p>}
            </div>

            <div className="mt-3 grid gap-3 lg:h-[calc(100vh-12rem)] lg:grid-cols-[minmax(0,1.55fr)_22rem]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 lg:min-h-0">
                <div className="grid grid-cols-5 gap-2 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-10 lg:max-h-full lg:overflow-y-auto lg:pr-1">
                  {filteredDictionaryKanji.map((kanji) => (
                    <button
                      key={kanji.id}
                      type="button"
                      onClick={() => setSelectedKanjiId(kanji.id)}
                      className={`rounded-xl border px-2 py-3 text-2xl font-bold transition ${
                        selectedDictionaryKanji?.id === kanji.id
                          ? "border-cyan-600 bg-cyan-100 text-cyan-950"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-400 hover:bg-cyan-50"
                      }`}
                    >
                      {kanji.character}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-3 lg:max-h-[calc(100vh-12rem)] lg:self-start lg:overflow-y-auto">
                {!selectedDictionaryKanji && <p className="text-sm text-slate-600">No kanji matches current filters.</p>}
                {selectedDictionaryKanji && (
                  <>
                    <p className="text-6xl font-bold text-slate-900">{selectedDictionaryKanji.character}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">{selectedDictionaryKanji.primaryMeaning}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedDictionaryKanji.meanings.join(", ")}</p>

                    <dl className="mt-4 space-y-2 text-sm">
                      {settings.showFurigana && (
                        <>
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">On reading</dt>
                            <dd className="font-semibold text-slate-800">{formatReadings(selectedDictionaryKanji.onyomi, settings.showRomaji)}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Kun reading</dt>
                            <dd className="font-semibold text-slate-800">{formatReadings(selectedDictionaryKanji.kunyomi, settings.showRomaji)}</dd>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Radical</dt>
                        <dd className="font-semibold text-slate-800">{selectedDictionaryKanji.radical}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Strokes</dt>
                        <dd className="font-semibold text-slate-800">{selectedDictionaryKanji.strokeCount}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">JLPT</dt>
                        <dd className="font-semibold text-slate-800">{selectedDictionaryKanji.jlptLevel ?? "-"}</dd>
                      </div>
                    </dl>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedDictionaryKanji.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {selectedDictionaryProgress && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Study Status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{selectedDictionaryProgress.status}</p>
                        <p className="text-xs text-slate-600">
                          Current streak: {selectedDictionaryProgress.currentStreak}, Best streak: {selectedDictionaryProgress.bestStreak}
                        </p>
                        <p className="text-xs text-slate-600">Review weight: {selectedDictionaryProgress.reviewWeight}, Accuracy: {accuracyPercent(selectedDictionaryProgress)}%</p>
                        <button
                          type="button"
                          onClick={() =>
                            setKanjiExcluded(selectedDictionaryKanji.id, !selectedDictionaryProgress.excludedFromLessons)
                          }
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
                <h2 className="mt-1 text-3xl font-bold text-slate-900">Trail Performance</h2>
              </div>
              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Back To Base Camp
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="mt-2 text-3xl font-bold text-violet-950">{quizAttempts.length}</p>
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700">Overall Accuracy</p>
                <p className="mt-2 text-3xl font-bold text-amber-950">{overallStats.accuracy}%</p>
              </article>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Weakest Kanji</h3>
                {weakKanji.length === 0 && <p className="mt-2 text-sm text-slate-600">No misses recorded yet.</p>}
                {weakKanji.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {weakKanji.map(({ row, kanji }) => (
                      <li key={row.kanjiId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-2xl font-bold text-slate-900">{kanji?.character}</span>
                        <span>{kanji?.primaryMeaning}</span>
                        <span className="font-semibold text-rose-700">misses: {row.incorrectCount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Strongest Kanji</h3>
                {strongKanji.length === 0 && <p className="mt-2 text-sm text-slate-600">No wins recorded yet.</p>}
                {strongKanji.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {strongKanji.map(({ row, kanji }) => (
                      <li key={row.kanjiId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-2xl font-bold text-slate-900">{kanji?.character}</span>
                        <span>{kanji?.primaryMeaning}</span>
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
              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Back To Base Camp
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Reading Display</h3>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Show Furigana Readings</span>
                    <input
                      type="checkbox"
                      checked={settings.showFurigana}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setSettings((previous) => ({ ...previous, showFurigana: checked }));
                      }}
                      className="h-5 w-5 accent-violet-700"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Show Romaji</span>
                    <input
                      type="checkbox"
                      checked={settings.showRomaji}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setSettings((previous) => ({ ...previous, showRomaji: checked }));
                      }}
                      disabled={!settings.showFurigana}
                      className="h-5 w-5 accent-violet-700 disabled:opacity-50"
                    />
                  </label>

                  {!settings.showFurigana && (
                    <p className="text-xs text-slate-500">Enable furigana first to show romaji.</p>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Accessibility</h3>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Reduced Motion</span>
                    <input
                      type="checkbox"
                      checked={settings.reducedMotion}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setSettings((previous) => ({ ...previous, reducedMotion: checked }));
                      }}
                      className="h-5 w-5 accent-violet-700"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Text Size</span>
                    <select
                      value={settings.textScale}
                      onChange={(event) => {
                        const nextScale = Number(event.currentTarget.value) as TextScale;
                        setSettings((previous) => ({
                          ...previous,
                          textScale: nextScale,
                        }));
                      }}
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
