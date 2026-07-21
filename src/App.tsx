import { useEffect, useMemo, useState } from "react";

import { beginnerKanjiPool } from "./data/seed/beginnerSet";
import { seedLessons } from "./data/seed/lessonCatalog";
import { createProgressRepository } from "./repositories/progressRepositoryFactory";
import { ReviewScheduler } from "./services/reviewScheduler";
import type { ProgressRepository } from "./repositories/progressRepository";
import type { Kanji, QuizAttempt, UserKanjiProgress } from "./types";

type Screen = "dashboard" | "lesson" | "quiz" | "review" | "summary" | "dictionary" | "progress";

interface QuizQuestion {
  kanjiId: string;
  promptMeaning: string;
  options: string[];
  correctOption: string;
}

const SESSION_TARGET_MINUTES = "5-10";
const LESSON_CURSOR_STORAGE_KEY = "mount-kanji-lesson-cursor";

const scheduler = new ReviewScheduler();

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
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: null,
    correctCount: 0,
    incorrectCount: 0,
    consecutiveCorrect: 0,
    lastReviewedAt: null,
    meaningStatus: "new",
    meaningEaseFactor: 2.5,
    readingStatus: "new",
    readingEaseFactor: 2.5,
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
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [dictionaryRadical, setDictionaryRadical] = useState("all");
  const [dictionarySumoOnly, setDictionarySumoOnly] = useState(false);
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
        setProgressByKanji(loadedProgress);
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

  const overallStats = useMemo(() => {
    const rows = Object.values(progressByKanji);
    const learned = rows.filter((row) => row.correctCount + row.incorrectCount > 0).length;
    const mastered = rows.filter((row) => row.status === "mastered").length;
    const due = scheduler.getDue(rows).length;
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
      const charMatch = kanji.character.includes(dictionaryQuery.trim());

      return meaningMatch || readingMatch || charMatch;
    });
  }, [dictionaryQuery, dictionaryRadical, dictionarySumoOnly]);

  const selectedDictionaryKanji = useMemo(() => {
    const selected = filteredDictionaryKanji.find((kanji) => kanji.id === selectedKanjiId);
    return selected ?? filteredDictionaryKanji[0] ?? null;
  }, [filteredDictionaryKanji, selectedKanjiId]);

  function startLesson() {
    const lessonDefinition = seedLessons[lessonCursor];
    const lessonSegment = lessonDefinition ? resolveLessonKanji(lessonDefinition.kanjiIds) : [];
    const nextCursor = (lessonCursor + 1) % Math.max(1, seedLessons.length);

    setActiveLessonKanji(lessonSegment);
    setActiveLessonTitle(lessonDefinition?.title ?? "Beginner Lesson");
    setLessonCursor(nextCursor);
    setScreen("lesson");
    setLessonIndex(0);
    setQuizIndex(0);
    setQuizScore(0);
    setReviewDoneCount(0);
    setReviewFeedback("");
    setLastAnswerCorrect(null);
    setQuizQuestions(buildQuizQuestions(lessonSegment));
  }

  function startReviewQueue() {
    const rows = Object.values(progressByKanji);
    const due = scheduler.getDue(rows);
    const urgentNeedsReview = rows.filter((row) => row.status === "needs_review" && !due.some((item) => item.kanjiId === row.kanjiId));
    const queue = [...urgentNeedsReview, ...due];

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
      const updated = scheduler.applyReview(currentProgress, isCorrect ? "good" : "again");
      return {
        ...previous,
        [currentQuestion.kanjiId]: updated,
      };
    });

    if (isCorrect) {
      setQuizScore((value) => value + 1);
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

  function applyReviewGrade(grade: "again" | "hard" | "good" | "easy") {
    if (!currentReviewProgress) {
      return;
    }

    setProgressByKanji((previous) => {
      const active = previous[currentReviewProgress.kanjiId] ?? currentReviewProgress;
      const updated = scheduler.applyReview(active, grade);
      return {
        ...previous,
        [updated.kanjiId]: updated,
      };
    });

    setReviewDoneCount((count) => count + 1);
    setReviewFeedback(`Marked ${grade.toUpperCase()} for ${currentReviewKanji?.character ?? "kanji"}.`);
    setReviewQueue((queue) => queue.slice(1));
  }

  const trails = [
    { name: "Beginner Trail", progress: `${overallStats.learned} / 100 kanji`, focus: "Core recognition" },
    { name: "Radicals Trail", progress: "Locked for phase 2", focus: "Pattern clues" },
    { name: "Sumo Trail", progress: "Content loading next", focus: "Ranks and match terms" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-cyan-50 to-emerald-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 sm:px-10">
        <header className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-lg backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Mount Kanji</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">Base Camp Dashboard</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-700 sm:text-lg">
            Learn kanji one confident step at a time: meaning first, short lessons, and retention-focused reviews.
          </p>
        </header>

        <section className="grid grid-cols-4 gap-3">
          <article className="rounded-2xl border border-cyan-200 bg-cyan-100 p-3 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-800">New Kanji</h2>
            <p className="mt-1 text-2xl font-bold text-cyan-950 sm:text-3xl">{activeLessonKanji.length}</p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-100 p-3 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800">Reviews Due</h2>
            <p className="mt-1 text-2xl font-bold text-amber-950 sm:text-3xl">{overallStats.due}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-100 p-3 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Learned</h2>
            <p className="mt-1 text-2xl font-bold text-emerald-950 sm:text-3xl">{overallStats.learned}</p>
          </article>
          <article className="rounded-2xl border border-violet-200 bg-violet-100 p-3 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-800">Accuracy</h2>
            <p className="mt-1 text-2xl font-bold text-violet-950 sm:text-3xl">{overallStats.accuracy}%</p>
          </article>
        </section>

        {screen === "dashboard" && (
          <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="text-2xl font-bold text-slate-900">Trails</h2>
              <button
                type="button"
                onClick={startLesson}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Start Lesson ({SESSION_TARGET_MINUTES} min)
              </button>
              <button
                type="button"
                onClick={startReviewQueue}
                className="rounded-full border border-slate-900 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Start Reviews ({overallStats.due})
              </button>
              <button
                type="button"
                onClick={openDictionary}
                className="rounded-full border border-cyan-700 bg-cyan-50 px-5 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100"
              >
                Open Dictionary
              </button>
              <button
                type="button"
                onClick={openProgress}
                className="rounded-full border border-emerald-700 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
              >
                Open Progress
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Next lesson: {seedLessons[lessonCursor]?.title ?? "Beginner Lesson"} ({(lessonCursor % seedLessons.length) + 1}/
              {seedLessons.length})
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {trails.map((trail) => (
                <article key={trail.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">{trail.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{trail.focus}</p>
                  <p className="mt-4 text-sm font-medium text-slate-800">Progress: {trail.progress}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Study Telemetry</h3>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Attempts</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{quizAttempts.length}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Avg Response</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {averageResponseMs > 0 ? `${(averageResponseMs / 1000).toFixed(1)}s` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Mastered</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{overallStats.mastered}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Recent Attempts</h3>
                {recentAttempts.length === 0 && <p className="mt-2 text-sm text-slate-600">No attempts yet.</p>}
                {recentAttempts.length > 0 && (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {recentAttempts.map((attempt) => {
                      const kanji = kanjiById.get(attempt.kanjiId);
                      return (
                        <li key={attempt.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
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
          <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-800">{activeLessonTitle}</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
              Lesson Step {lessonIndex + 1} of {activeLessonKanji.length}
            </p>
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-white p-6">
              <p className="text-7xl font-bold text-slate-900">{currentLessonKanji.character}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-800">{currentLessonKanji.primaryMeaning}</p>
              <p className="mt-2 text-slate-600">{currentLessonKanji.mnemonic}</p>
              <p className="mt-3 text-sm text-slate-500">
                Kun: {currentLessonKanji.kunyomi.join(", ")} | On: {currentLessonKanji.onyomi.join(", ")}
              </p>
            </div>
            <div className="mt-5 flex justify-end">
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
          <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Quiz {quizIndex + 1} of {quizQuestions.length}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Which kanji means "{currentQuestion.promptMeaning}"?</h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => submitAnswer(option)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-4xl font-bold text-slate-900 transition hover:border-emerald-500 hover:bg-emerald-50"
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
          <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Session Summary</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Trail Segment Complete</h2>
            <p className="mt-3 text-slate-700">
              You answered {quizScore} out of {quizQuestions.length} correctly and updated your review schedule.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
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

            <div className="mt-6 flex flex-wrap gap-3">
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

        {screen === "review" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Review Queue</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Keep The Trail Fresh</h2>

            {!currentReviewKanji && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
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
              <div className="mt-5">
                <div className="rounded-2xl border border-amber-100 bg-white p-6 text-center">
                  <p className="text-7xl font-bold text-slate-900">{currentReviewKanji.character}</p>
                  <p className="mt-3 text-xl font-semibold text-slate-800">{currentReviewKanji.primaryMeaning}</p>
                  <p className="mt-2 text-sm text-slate-600">Pick how well this felt so we can schedule the next review.</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => applyReviewGrade("again")}
                    className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Again
                  </button>
                  <button
                    type="button"
                    onClick={() => applyReviewGrade("hard")}
                    className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500"
                  >
                    Hard
                  </button>
                  <button
                    type="button"
                    onClick={() => applyReviewGrade("good")}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Good
                  </button>
                  <button
                    type="button"
                    onClick={() => applyReviewGrade("easy")}
                    className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-500"
                  >
                    Easy
                  </button>
                </div>

                <p className="mt-3 text-sm text-slate-700">Remaining cards: {reviewQueue.length}</p>
                {reviewFeedback && <p className="mt-2 text-sm font-semibold text-slate-700">{reviewFeedback}</p>}
              </div>
            )}
          </section>
        )}

        {screen === "dictionary" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Dictionary</p>
                <h2 className="mt-1 text-3xl font-bold text-slate-900">N5 Kanji Browser</h2>
              </div>
              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Back To Base Camp
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
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

            <p className="mt-3 text-sm text-slate-600">Showing {filteredDictionaryKanji.length} kanji</p>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-5 gap-2 md:grid-cols-8 lg:grid-cols-10">
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

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                {!selectedDictionaryKanji && <p className="text-sm text-slate-600">No kanji matches current filters.</p>}
                {selectedDictionaryKanji && (
                  <>
                    <p className="text-6xl font-bold text-slate-900">{selectedDictionaryKanji.character}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">{selectedDictionaryKanji.primaryMeaning}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedDictionaryKanji.meanings.join(", ")}</p>

                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">On reading</dt>
                        <dd className="font-semibold text-slate-800">{selectedDictionaryKanji.onyomi.join(", ") || "-"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Kun reading</dt>
                        <dd className="font-semibold text-slate-800">{selectedDictionaryKanji.kunyomi.join(", ") || "-"}</dd>
                      </div>
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
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {screen === "progress" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Weakest Kanji</h3>
                {weakKanji.length === 0 && <p className="mt-2 text-sm text-slate-600">No misses recorded yet.</p>}
                {weakKanji.length > 0 && (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
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

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Strongest Kanji</h3>
                {strongKanji.length === 0 && <p className="mt-2 text-sm text-slate-600">No wins recorded yet.</p>}
                {strongKanji.length > 0 && (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
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
      </div>
    </div>
  );
}

export default App;
