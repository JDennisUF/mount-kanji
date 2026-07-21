import { useEffect, useMemo, useState } from "react";

import { beginnerKanjiPool, lessonOneKanjiIds } from "./data/seed/beginnerSet";
import { createProgressRepository } from "./repositories/progressRepositoryFactory";
import { ReviewScheduler } from "./services/reviewScheduler";
import type { ProgressRepository } from "./repositories/progressRepository";
import type { Kanji, UserKanjiProgress } from "./types";

type Screen = "dashboard" | "lesson" | "quiz" | "review" | "summary";

interface QuizQuestion {
  kanjiId: string;
  promptMeaning: string;
  options: string[];
  correctOption: string;
}

const SESSION_TARGET_MINUTES = "5-10";

const scheduler = new ReviewScheduler();

const kanjiById = new Map(beginnerKanjiPool.map((kanji) => [kanji.id, kanji]));
const lessonKanji = lessonOneKanjiIds.map((id) => kanjiById.get(id)).filter(Boolean) as Kanji[];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuizQuestions(): QuizQuestion[] {
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

function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [reviewDoneCount, setReviewDoneCount] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string>("");
  const [progressByKanji, setProgressByKanji] = useState<Record<string, UserKanjiProgress>>({});
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [reviewQueue, setReviewQueue] = useState<UserKanjiProgress[]>([]);
  const [progressRepository, setProgressRepository] = useState<ProgressRepository | null>(null);
  const [isProgressHydrated, setIsProgressHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    createProgressRepository().then(async (repository) => {
      if (!isActive) {
        return;
      }

      setProgressRepository(repository);
      const loaded = await repository.loadAll();
      if (isActive) {
        setProgressByKanji(loaded);
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

  const overallStats = useMemo(() => {
    const rows = Object.values(progressByKanji);
    const learned = rows.filter((row) => row.correctCount + row.incorrectCount > 0).length;
    const mastered = rows.filter((row) => row.status === "mastered").length;
    const due = scheduler.getDue(rows).length;
    const totalCorrect = rows.reduce((sum, row) => sum + row.correctCount, 0);
    const totalAttempts = rows.reduce((sum, row) => sum + row.correctCount + row.incorrectCount, 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    return {
      learned,
      mastered,
      due,
      accuracy,
    };
  }, [progressByKanji]);

  const currentLessonKanji = lessonKanji[lessonIndex];
  const currentQuestion = quizQuestions[quizIndex];
  const currentReviewProgress = reviewQueue[0];
  const currentReviewKanji = currentReviewProgress ? kanjiById.get(currentReviewProgress.kanjiId) : null;

  function startLesson() {
    setScreen("lesson");
    setLessonIndex(0);
    setQuizIndex(0);
    setQuizScore(0);
    setReviewDoneCount(0);
    setReviewFeedback("");
    setLastAnswerCorrect(null);
    setQuizQuestions(buildQuizQuestions());
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

  function advanceLesson() {
    if (lessonIndex + 1 >= lessonKanji.length) {
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
            <p className="mt-1 text-2xl font-bold text-cyan-950 sm:text-3xl">{lessonKanji.length}</p>
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
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {trails.map((trail) => (
                <article key={trail.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">{trail.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{trail.focus}</p>
                  <p className="mt-4 text-sm font-medium text-slate-800">Progress: {trail.progress}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {screen === "lesson" && currentLessonKanji && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
              Lesson Step {lessonIndex + 1} of {lessonKanji.length}
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
                {lessonIndex + 1 === lessonKanji.length ? "Start Quiz" : "Next Kanji"}
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
      </div>
    </div>
  );
}

export default App;
