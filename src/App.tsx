import { useEffect, useMemo, useRef, useState } from "react";
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
import { getContextExamplesForItems, writingSystemIntro, type TutorContextExample } from "./data/seed/tutorContent";
import { createProgressRepository } from "./repositories/progressRepositoryFactory";
import type { ProgressRepository } from "./repositories/progressRepository";
import { KNOWN_CORRECT_THRESHOLD, ReviewTracker, resolveStudyStatus } from "./services/reviewTracker";
import { applyTutorAttempt, buildTutorFeedback, type TutorFeedback } from "./services/tutorEngine";
import type { QuizAttempt, QuizType, StudyItem, StudyTrack, TutorActivityType, UserStudyProgress } from "./types";

type Screen = "dashboard" | "lesson" | "quiz" | "context" | "summary" | "dictionary" | "progress" | "settings" | "sumo";

type QuizMode = "multiple_choice" | "matching" | "concentration";

interface MultipleChoiceQuestion {
  kind: "multiple_choice";
  itemId: string;
  promptLabel: string;
  options: string[];
  correctOption: string;
}

interface MatchingPair {
  itemId: string;
  symbol: string;
  description: string;
}

interface MatchingQuestion {
  kind: "matching";
  pairs: MatchingPair[];
  rightOptions: string[];
  promptLabel: string;
}

interface ConcentrationCard {
  cardId: string;
  itemId: string;
  label: string;
  side: "symbol" | "definition";
}

interface ConcentrationQuestion {
  kind: "concentration";
  pairs: MatchingPair[];
  cards: ConcentrationCard[];
  promptLabel: string;
}

type QuizQuestion = MultipleChoiceQuestion | MatchingQuestion | ConcentrationQuestion;

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

interface BeginnerTrailStep {
  id: string;
  title: string;
  detail: string;
  track?: StudyTrack;
  status: "recommended" | "available" | "complete";
}

interface MatchingFeedback {
  tone: "success" | "error" | "idle";
  message: string;
}

interface ConcentrationFeedback {
  tone: "success" | "idle";
  message: string;
}

type TextScale = 90 | 100 | 110 | 125;
type SumoCategoryFilter = "all" | SumoTerm["category"];

interface AppSettings {
  showFurigana: boolean;
  showRomaji: boolean;
  includeKnownInLessons: boolean;
  correctAnswersToKnown: number;
  reducedMotion: boolean;
  textScale: TextScale;
  quizMode: QuizMode;
  soundEffects: boolean;
}

type LessonCursorState = Record<StudyTrack, number>;

const SESSION_TARGET_MINUTES = "5-10";
const LESSON_CURSOR_STORAGE_KEY = "mount-kanji-lesson-cursor-v2";
const SETTINGS_STORAGE_KEY = "mount-kanji-settings";
const REVISIT_INSERTS = 2;
const MATCHING_BOARD_SIZE = 5;
const CONCENTRATION_GRID_SIZE = 16;
const CONCENTRATION_PAIR_COUNT = CONCENTRATION_GRID_SIZE / 2;
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
  includeKnownInLessons: false,
  correctAnswersToKnown: KNOWN_CORRECT_THRESHOLD,
  reducedMotion: false,
  textScale: 100,
  quizMode: "multiple_choice",
  soundEffects: true,
};

const DEFAULT_LESSON_CURSORS: LessonCursorState = {
  kanji: 0,
  hiragana: 0,
  katakana: 0,
};

const reviewTracker = new ReviewTracker();
const STUDY_TRACK_ORDER: StudyTrack[] = ["hiragana", "katakana", "kanji"];

const mountainImages: Record<StudyTrack, string> = {
  kanji: mountainStatusKanji,
  hiragana: mountainStatusHiragana,
  katakana: mountainStatusKatakana,
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
const KATAKANA_LOANWORD_GLOSSES: Record<string, string> = {
  ア: "app",
  イ: "image",
  エ: "energy",
  オ: "office",
  カ: "camera",
  キ: "key",
  ク: "cookie",
  ケ: "cake",
  コ: "coffee",
  サ: "salad",
  シ: "shirt",
  ス: "soup",
  セ: "center",
  ソ: "soccer",
  タ: "taxi",
  チ: "cheese",
  テ: "tennis",
  ト: "toast",
  ハ: "hamburger",
  フ: "football",
  ホ: "hotel",
  マ: "microphone",
  メ: "menu",
  ラ: "radio",
  レ: "lemon",
  ロ: "robot",
};

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

function normalizeCorrectAnswersToKnown(value: unknown): number {
  return clamp(Number.isFinite(value) ? Math.floor(value as number) : KNOWN_CORRECT_THRESHOLD, 1, 20);
}

function createDefaultProgress(itemId: string): UserStudyProgress {
  return {
    id: `progress_${itemId}`,
    itemId,
    status: "new",
    masteryStage: "teach",
    correctCount: 0,
    incorrectCount: 0,
    attemptsByActivity: {},
    correctByActivity: {},
    confusionHistory: [],
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
  correctAnswersToKnown = KNOWN_CORRECT_THRESHOLD,
): UserStudyProgress {
  const base = createDefaultProgress(itemId);
  const correctCount = typeof raw?.correctCount === "number" ? raw.correctCount : 0;
  const incorrectCount = typeof raw?.incorrectCount === "number" ? raw.incorrectCount : 0;
  const status = resolveStudyStatus(correctCount, incorrectCount, correctAnswersToKnown);
  const masteryStage =
    raw?.masteryStage === "teach" ||
    raw?.masteryStage === "recognize" ||
    raw?.masteryStage === "recall" ||
    raw?.masteryStage === "read_words" ||
    raw?.masteryStage === "read_sentences" ||
    raw?.masteryStage === "spaced_review"
      ? raw.masteryStage
      : status === "known"
        ? "spaced_review"
        : "teach";

  return {
    ...base,
    ...raw,
    itemId,
    id: typeof raw?.id === "string" ? raw.id : base.id,
    status,
    masteryStage,
    correctCount,
    incorrectCount,
    attemptsByActivity: raw?.attemptsByActivity && typeof raw.attemptsByActivity === "object" ? raw.attemptsByActivity : {},
    correctByActivity: raw?.correctByActivity && typeof raw.correctByActivity === "object" ? raw.correctByActivity : {},
    confusionHistory: Array.isArray(raw?.confusionHistory) ? raw.confusionHistory : [],
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
      kind: "multiple_choice",
      itemId: item.id,
      promptLabel: item.primaryMeaning,
      options: shuffle([item.character, ...distractors]),
      correctOption: item.character,
    };
  });
}

function buildMatchingDescription(item: StudyItem): string {
  if (item.script === "kanji") {
    return item.primaryMeaning;
  }

  return `${item.romaji ?? item.primaryMeaning} sound`;
}

function buildConcentrationDescription(item: StudyItem): string {
  if (item.script === "kanji") {
    return item.primaryMeaning;
  }

  if (item.script === "hiragana") {
    return item.romaji ?? item.primaryMeaning;
  }

  return KATAKANA_LOANWORD_GLOSSES[item.character] ?? item.romaji ?? item.primaryMeaning;
}

function supportsConcentration(item: StudyItem): boolean {
  if (item.script !== "katakana") {
    return true;
  }

  return item.character in KATAKANA_LOANWORD_GLOSSES;
}

function buildMatchingQuestions(items: StudyItem[]): QuizQuestion[] {
  const labelCounts = items.reduce<Record<string, number>>((counts, item) => {
    const label = buildMatchingDescription(item);
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});

  const pairs = items.map((item) => {
    const baseDescription = buildMatchingDescription(item);
    const needsDisambiguation = (labelCounts[baseDescription] ?? 0) > 1;
    const qualifier = item.lessonHint ?? item.row?.replace(/-/g, " ") ?? item.character;

    return {
      itemId: item.id,
      symbol: item.character,
      description: needsDisambiguation ? `${baseDescription} (${qualifier})` : baseDescription,
    };
  });

  return [
    {
      kind: "matching",
      pairs,
      rightOptions: shuffle(pairs.map((pair) => pair.description)),
      promptLabel: "Match each symbol to its English description.",
    },
  ];
}

function buildConcentrationQuestions(items: StudyItem[]): QuizQuestion[] {
  const pairs = items.map((item) => ({
    itemId: item.id,
    symbol: item.character,
    description: buildConcentrationDescription(item),
  }));

  const cards = shuffle(
    pairs.flatMap((pair) => [
      { cardId: `${pair.itemId}_symbol`, itemId: pair.itemId, label: pair.symbol, side: "symbol" as const },
      { cardId: `${pair.itemId}_definition`, itemId: pair.itemId, label: pair.description, side: "definition" as const },
    ]),
  );

  return [
    {
      kind: "concentration",
      pairs,
      cards,
      promptLabel: "Flip cards and match each pair.",
    },
  ];
}

function buildQuestionsForMode(items: StudyItem[], pool: StudyItem[], quizMode: QuizMode): QuizQuestion[] {
  if (quizMode === "matching") {
    return buildMatchingQuestions(items);
  }

  if (quizMode === "concentration") {
    return buildConcentrationQuestions(items);
  }

  return buildQuizQuestions(items, pool);
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

function recomputeProgressStatuses(
  progressByItem: Record<string, UserStudyProgress>,
  correctAnswersToKnown: number,
): Record<string, UserStudyProgress> {
  return Object.fromEntries(
    Object.entries(progressByItem).map(([itemId, row]) => {
      const status = resolveStudyStatus(row.correctCount, row.incorrectCount, correctAnswersToKnown);
      return [
        itemId,
        {
          ...row,
          status,
          masteryStage: status === "known" ? "spaced_review" : row.masteryStage === "spaced_review" ? "read_sentences" : row.masteryStage,
        },
      ];
    }),
  );
}

function buildBeginnerTrailSteps(progressByItem: Record<string, UserStudyProgress>): BeginnerTrailStep[] {
  const coreHiraganaIds = new Set(hiraganaLessons.slice(0, 10).flatMap((lesson) => lesson.itemIds));
  const coreKatakanaIds = new Set(katakanaLessons.slice(0, 10).flatMap((lesson) => lesson.itemIds));
  const starterKanjiIds = new Set(seedLessons.slice(0, 4).flatMap((lesson) => lesson.itemIds));

  const countKnown = (itemIds: Set<string>) =>
    Array.from(itemIds).filter((itemId) => progressByItem[itemId]?.status === "known").length;
  const statusFor = (known: number, total: number, priorComplete: boolean): BeginnerTrailStep["status"] => {
    if (total > 0 && known >= total) {
      return "complete";
    }
    return priorComplete ? "recommended" : "available";
  };

  const hiraganaKnown = countKnown(coreHiraganaIds);
  const katakanaKnown = countKnown(coreKatakanaIds);
  const kanjiKnown = countKnown(starterKanjiIds);
  const hiraganaComplete = hiraganaKnown >= coreHiraganaIds.size;
  const katakanaComplete = katakanaKnown >= coreKatakanaIds.size;
  const kanjiComplete = kanjiKnown >= starterKanjiIds.size;

  return [
    {
      id: "writing-basics",
      title: writingSystemIntro.title,
      detail: "Understand why Hiragana, Katakana, and Kanji appear together.",
      status: "recommended",
    },
    {
      id: "hiragana-core",
      title: "Hiragana Camps",
      detail: `${hiraganaKnown}/${coreHiraganaIds.size} core hiragana known`,
      track: "hiragana",
      status: statusFor(hiraganaKnown, coreHiraganaIds.size, true),
    },
    {
      id: "katakana-core",
      title: "Katakana Camps",
      detail: `${katakanaKnown}/${coreKatakanaIds.size} core katakana known`,
      track: "katakana",
      status: statusFor(katakanaKnown, coreKatakanaIds.size, hiraganaComplete),
    },
    {
      id: "starter-kanji",
      title: "Starter Kanji Ridge",
      detail: `${kanjiKnown}/${starterKanjiIds.size} starter kanji known`,
      track: "kanji",
      status: statusFor(kanjiKnown, starterKanjiIds.size, hiraganaComplete && katakanaComplete),
    },
    {
      id: "real-reading",
      title: "Read Real Japanese",
      detail: "Practice words and short phrases with highlighted symbols.",
      status: kanjiComplete ? "recommended" : "available",
    },
  ];
}

function pickTutorNote(progressRows: UserStudyProgress[], pool: StudyItem[], currentLessonTitle: string): string {
  const itemByCurrentId = new Map(pool.map((item) => [item.id, item]));
  const confused = progressRows
    .filter((row) => itemByCurrentId.has(row.itemId) && row.confusionHistory.length > 0)
    .sort((a, b) => {
      const aConfusions = a.confusionHistory.reduce((sum, entry) => sum + entry.count, 0);
      const bConfusions = b.confusionHistory.reduce((sum, entry) => sum + entry.count, 0);
      return bConfusions - aConfusions;
    })[0];

  if (confused) {
    const item = itemByCurrentId.get(confused.itemId);
    const topConfusion = [...confused.confusionHistory].sort((a, b) => b.count - a.count)[0];
    const confusedWith = topConfusion ? itemById.get(topConfusion.confusedWithItemId) : null;
    if (item && confusedWith) {
      return `Tutor note: you are mixing up ${item.character} and ${confusedWith.character}. Expect extra recognition practice.`;
    }
  }

  const readingWeakness = progressRows
    .map((row) => ({ row, item: itemByCurrentId.get(row.itemId) }))
    .find(({ row, item }) => item && row.correctCount >= 3 && row.masteryStage === "read_words");
  if (readingWeakness?.item) {
    return `Tutor note: you recognize ${readingWeakness.item.character}. Next we will place it inside real words.`;
  }

  return `Tutor note: your next best step is ${currentLessonTitle}.`;
}

function highlightContextText(example: TutorContextExample, items: StudyItem[]): string[] {
  const targets = new Set(items.filter((item) => example.targetItemIds.includes(item.id)).map((item) => item.character));
  return Array.from(example.written).map((character) => (targets.has(character) ? `[${character}]` : character));
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
  const mountainImage = mountainImages[progress.track];
  const summitMarker = progress.knownCount >= progress.totalSteps && progress.totalSteps > 0 ? "🏆" : "🎌";

  return (
    <div className="relative isolate h-56 w-56 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-sky-50 shadow-sm">
      <img src={mountainImage} alt="" className="block h-full w-full object-cover" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[5%] -translate-x-1/2 text-3xl leading-none drop-shadow-sm">
          <span aria-label={summitMarker === "🏆" ? "Summit complete" : "Summit marker"}>{summitMarker}</span>
        </div>
        <div
          className={`absolute -translate-y-1/2 ${reducedMotion ? "" : "transition-all duration-500 ease-out"}`}
          style={{
            left: `calc(${climberPoint.x}% + 10px)`,
            top: `${climberPoint.y}%`,
          }}
        >
          <div className="text-2xl leading-none drop-shadow-sm" aria-label={active ? "Current climber position" : "Climber position"}>
            🔴
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
  correctAnswersToKnown,
  onSelect,
}: {
  progress: MountProgress;
  active: boolean;
  reducedMotion: boolean;
  correctAnswersToKnown: number;
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
            <p className="mt-1 text-sm font-semibold text-slate-900">{correctAnswersToKnown} correct answers per symbol</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function App() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [activeTrack, setActiveTrack] = useState<StudyTrack>("hiragana");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [contextIndex, setContextIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<TutorFeedback | null>(null);
  const [matchingFeedback, setMatchingFeedback] = useState<MatchingFeedback>({ tone: "idle", message: "" });
  const [concentrationFeedback, setConcentrationFeedback] = useState<ConcentrationFeedback>({ tone: "idle", message: "" });
  const [selectedMatchingItemId, setSelectedMatchingItemId] = useState<string | null>(null);
  const [matchedItemIds, setMatchedItemIds] = useState<string[]>([]);
  const [incorrectMatchItemIds, setIncorrectMatchItemIds] = useState<string[]>([]);
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [concentrationMatchedItemIds, setConcentrationMatchedItemIds] = useState<string[]>([]);
  const [isResolvingConcentrationTurn, setIsResolvingConcentrationTurn] = useState(false);
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
      const parsed = JSON.parse(serialized) as Partial<AppSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        correctAnswersToKnown: normalizeCorrectAnswersToKnown(parsed.correctAnswersToKnown),
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [dictionaryRadical, setDictionaryRadical] = useState("all");
  const [dictionarySumoOnly, setDictionarySumoOnly] = useState(false);
  const [sumoQuery, setSumoQuery] = useState("");
  const [sumoCategory, setSumoCategory] = useState<SumoCategoryFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>(trackConfigs.hiragana.pool[0]?.id ?? "");
  const [activeLessonItems, setActiveLessonItems] = useState<StudyItem[]>(() => {
    const firstLesson = trackConfigs.hiragana.lessons[0];
    return firstLesson ? firstLesson.itemIds.map((id) => itemById.get(id)).filter(Boolean) as StudyItem[] : [];
  });
  const [activeLessonTitle, setActiveLessonTitle] = useState<string>(trackConfigs.hiragana.lessons[0]?.title ?? "Trail Lesson");
  const [contextExamples, setContextExamples] = useState<TutorContextExample[]>([]);
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
  const totalQuizUnits = useMemo(
    () =>
      quizQuestions.reduce((sum, question) => {
        if (question.kind === "matching") {
          return sum + question.pairs.length;
        }
        if (question.kind === "concentration") {
          return sum + question.pairs.length;
        }
        return sum + 1;
      }, 0),
    [quizQuestions],
  );

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
        Object.entries(loadedProgress).map(([itemId, row]) => [itemId, normalizeProgressRow(itemId, row, settings.correctAnswersToKnown)]),
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
    if (!isProgressHydrated) {
      return;
    }

    setProgressByItem((previous) => recomputeProgressStatuses(previous, settings.correctAnswersToKnown));
  }, [isProgressHydrated, settings.correctAnswersToKnown]);

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

  const currentLessonEligibleItems = useMemo(
    () => (settings.includeKnownInLessons ? currentTrailItems : currentPendingItems),
    [currentPendingItems, currentTrailItems, settings.includeKnownInLessons],
  );

  const trailLessonCount = Math.max(1, currentLessons.length);
  const currentLessonCursor = lessonCursorByTrack[activeTrack] % Math.max(1, currentLessons.length);
  const currentLessonDefinition = currentLessons[currentLessonCursor];
  const currentLessonItem = activeLessonItems[lessonIndex];
  const currentQuestion = quizQuestions[quizIndex];
  const currentContextExample = contextExamples[contextIndex];

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
  const beginnerTrailSteps = useMemo(() => buildBeginnerTrailSteps(progressByItem), [progressByItem]);
  const tutorNote = useMemo(
    () => pickTutorNote(Object.values(progressByItem), currentPool, currentLessonDefinition?.title ?? "the next trail segment"),
    [currentLessonDefinition?.title, currentPool, progressByItem],
  );

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
    if (currentLessonEligibleItems.length === 0) {
      return [];
    }

    const baseLessonItems =
      lesson?.itemIds
        .map((itemId) => itemById.get(itemId))
        .filter((item): item is StudyItem => Boolean(item))
        .filter((item) => !(progressByItem[item.id]?.excludedFromLessons ?? false))
        .filter((item) => settings.includeKnownInLessons || (progressByItem[item.id]?.status ?? "new") !== "known") ?? [];

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
      return currentLessonEligibleItems.slice(0, Math.min(5, currentLessonEligibleItems.length));
    }

    return picked;
  }

  function buildMatchingLessonSegment(items: StudyItem[]): StudyItem[] {
    const uniqueItems = items.filter((item, index, collection) => collection.findIndex((candidate) => candidate.id === item.id) === index);

    if (uniqueItems.length >= MATCHING_BOARD_SIZE) {
      return uniqueItems.slice(0, MATCHING_BOARD_SIZE);
    }

    const fallbackItems = shuffle(currentTrailItems)
      .filter((item) => !uniqueItems.some((candidate) => candidate.id === item.id))
      .slice(0, MATCHING_BOARD_SIZE - uniqueItems.length);

    return [...uniqueItems, ...fallbackItems].slice(0, MATCHING_BOARD_SIZE);
  }

  function buildConcentrationLessonSegment(items: StudyItem[]): StudyItem[] {
    const concentrationEligibleTrailItems = currentTrailItems.filter(supportsConcentration);
    const uniqueItems = items
      .filter(supportsConcentration)
      .filter((item, index, collection) => collection.findIndex((candidate) => candidate.id === item.id) === index);

    if (uniqueItems.length >= CONCENTRATION_PAIR_COUNT) {
      return uniqueItems.slice(0, CONCENTRATION_PAIR_COUNT);
    }

    const fallbackItems = shuffle(concentrationEligibleTrailItems)
      .filter((item) => !uniqueItems.some((candidate) => candidate.id === item.id))
      .slice(0, CONCENTRATION_PAIR_COUNT - uniqueItems.length);

    return [...uniqueItems, ...fallbackItems].slice(0, CONCENTRATION_PAIR_COUNT);
  }

  function switchTrack(track: StudyTrack) {
    setActiveTrack(track);
    setScreen("dashboard");
    setLessonIndex(0);
    setQuizIndex(0);
    setContextIndex(0);
    setQuizScore(0);
    setDashboardMessage("");
    setAnswerFeedback(null);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
    setSessionMissedItemIds([]);
    setKnownEvent(null);
  }

  function startLesson() {
    if (currentLessonEligibleItems.length === 0) {
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

    const preparedLessonSegment =
      settings.quizMode === "matching"
        ? buildMatchingLessonSegment(lessonSegment)
        : settings.quizMode === "concentration"
          ? buildConcentrationLessonSegment(lessonSegment)
          : lessonSegment;

    if (settings.quizMode === "matching" && preparedLessonSegment.length < MATCHING_BOARD_SIZE) {
      setDashboardMessage(`Matching mode needs ${MATCHING_BOARD_SIZE} available ${currentTrackConfig.unitPlural}.`);
      setScreen("dashboard");
      return;
    }

    if (settings.quizMode === "concentration" && preparedLessonSegment.length < CONCENTRATION_PAIR_COUNT) {
      setDashboardMessage(`Concentration needs ${CONCENTRATION_PAIR_COUNT} available ${currentTrackConfig.unitPlural}.`);
      setScreen("dashboard");
      return;
    }

    setDashboardMessage("");
    setActiveLessonItems(preparedLessonSegment);
    setActiveLessonTitle(currentLessonDefinition?.title ?? `${currentTrackConfig.label} Lesson`);
    setLessonCursorByTrack((previous) => ({
      ...previous,
      [activeTrack]: (previous[activeTrack] + 1) % Math.max(1, currentLessons.length),
    }));
    setScreen("lesson");
    setLessonIndex(0);
    setQuizIndex(0);
    setContextIndex(0);
    setQuizScore(0);
    setSessionMissedItemIds([]);
    setAnswerFeedback(null);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
    setKnownEvent(null);
    setContextExamples(getContextExamplesForItems(preparedLessonSegment));
    setQuizQuestions(buildQuestionsForMode(preparedLessonSegment, currentLessonEligibleItems, settings.quizMode));
  }

  function recordTutorActivity(itemId: string, activityType: TutorActivityType, isCorrect = true, selectedItemId?: string | null) {
    setProgressByItem((previous) => {
      const currentProgress = previous[itemId] ?? createDefaultProgress(itemId);
      return {
        ...previous,
        [itemId]: applyTutorAttempt({
          progress: currentProgress,
          correct: isCorrect,
          activityType,
          selectedItemId,
        }),
      };
    });
  }

  function recordQuizResult(itemId: string, isCorrect: boolean, questionType: QuizType, selectedItemId?: string | null): boolean {
    const attempt: QuizAttempt = {
      id: `attempt_${Date.now()}_${itemId}_${quizIndex}_${questionType}`,
      questionType,
      itemId,
      correct: isCorrect,
      answeredAt: new Date().toISOString(),
    };

    const currentProgress = progressByItem[itemId] ?? createDefaultProgress(itemId);
    const updatedProgress = reviewTracker.applyResult(
      currentProgress,
      isCorrect,
      new Date(),
      selectedItemId,
      settings.correctAnswersToKnown,
    );
    const becameKnown = currentProgress.status !== "known" && updatedProgress.status === "known";

    setQuizAttempts((existing) => [attempt, ...existing].slice(0, 1000));
    setProgressByItem((previous) => ({
      ...previous,
      [itemId]: updatedProgress,
    }));

    if (becameKnown) {
      setKnownEvent({
        itemId,
        track: activeTrack,
        timestamp: Date.now(),
      });
    }

    if (!isCorrect) {
      setSessionMissedItemIds((existing) => (existing.includes(itemId) ? existing : [...existing, itemId]));
    }

    return isCorrect;
  }

  function advanceFromTeach() {
    if (currentLessonItem) {
      recordTutorActivity(currentLessonItem.id, "teach_card");
    }

    if (lessonIndex + 1 >= activeLessonItems.length) {
      setScreen("quiz");
      return;
    }

    setLessonIndex((value) => value + 1);
  }

  function advanceContext() {
    if (currentContextExample) {
      for (const itemId of currentContextExample.targetItemIds) {
        if (activeLessonItems.some((item) => item.id === itemId)) {
          recordTutorActivity(itemId, "context_highlight");
        }
      }
    }

    if (contextIndex + 1 >= contextExamples.length) {
      setScreen("summary");
      return;
    }

    setContextIndex((value) => value + 1);
  }

  function advanceQuiz() {
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
    setAnswerFeedback(null);

    if (quizIndex + 1 >= quizQuestions.length) {
      setScreen(contextExamples.length > 0 ? "context" : "summary");
      return;
    }

    setQuizIndex((value) => value + 1);
  }

  function submitAnswer(option: string) {
    if (!currentQuestion || currentQuestion.kind !== "multiple_choice" || answerFeedback) {
      return;
    }

    const isCorrect = option === currentQuestion.correctOption;
    const selectedItem = allItems.find((item) => item.character === option && item.script === activeTrack) ?? null;
    const targetItem = itemById.get(currentQuestion.itemId);

    const scored = recordQuizResult(
      currentQuestion.itemId,
      isCorrect,
      activeTrack === "kanji" ? "kanji_recall" : "reading_quiz",
      selectedItem?.id,
    );
    if (scored) {
      setQuizScore((value) => value + 1);
    }

    if (targetItem) {
      setAnswerFeedback(buildTutorFeedback({ item: targetItem, selectedItem, correct: isCorrect }));
    } else {
      advanceQuiz();
    }
  }

  function playFeedbackSound(tone: "success" | "error") {
    if (!settings.soundEffects || typeof window === "undefined" || !("AudioContext" in window)) {
      return;
    }

    const audioContext = audioContextRef.current ?? new window.AudioContext();
    audioContextRef.current = audioContext;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = tone === "success" ? "sine" : "square";
    oscillator.frequency.value = tone === "success" ? 880 : 220;
    gainNode.gain.value = 0.0001;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + (tone === "success" ? 0.14 : 0.2));
    oscillator.start(now);
    oscillator.stop(now + (tone === "success" ? 0.16 : 0.22));
  }

  function tryMatchingPair(itemId: string, description: string) {
    if (!currentQuestion || currentQuestion.kind !== "matching") {
      return;
    }

    const pair = currentQuestion.pairs.find((entry) => entry.itemId === itemId);
    if (!pair || matchedItemIds.includes(itemId)) {
      return;
    }

    const isCorrect = pair.description === description;

    if (!isCorrect) {
      if (!incorrectMatchItemIds.includes(itemId)) {
        recordQuizResult(itemId, false, "matching");
        setIncorrectMatchItemIds((existing) => [...existing, itemId]);
      }
      setMatchingFeedback({ tone: "error", message: `${pair.symbol} does not match "${description}".` });
      playFeedbackSound("error");
      return;
    }

    const scored = recordQuizResult(itemId, true, "matching");
    if (scored && !incorrectMatchItemIds.includes(itemId)) {
      setQuizScore((value) => value + 1);
    }

    const nextMatchedItemIds = [...matchedItemIds, itemId];
    setMatchedItemIds(nextMatchedItemIds);
    setSelectedMatchingItemId(null);
    setMatchingFeedback({ tone: "success", message: `${pair.symbol} matched ${description}.` });
    playFeedbackSound("success");

    if (nextMatchedItemIds.length >= currentQuestion.pairs.length) {
      setMatchingFeedback({ tone: "success", message: "Board cleared. Continue to the next set." });
    }
  }

  function handleConcentrationCardClick(cardId: string) {
    if (!currentQuestion || currentQuestion.kind !== "concentration" || isResolvingConcentrationTurn) {
      return;
    }

    const card = currentQuestion.cards.find((entry) => entry.cardId === cardId);
    if (!card || concentrationMatchedItemIds.includes(card.itemId) || flippedCardIds.includes(cardId)) {
      return;
    }

    const nextFlippedCardIds = [...flippedCardIds, cardId];
    setFlippedCardIds(nextFlippedCardIds);

    if (nextFlippedCardIds.length < 2) {
      setConcentrationFeedback({ tone: "idle", message: "Find the matching card." });
      return;
    }

    const [firstCardId, secondCardId] = nextFlippedCardIds;
    const firstCard = currentQuestion.cards.find((entry) => entry.cardId === firstCardId);
    const secondCard = currentQuestion.cards.find((entry) => entry.cardId === secondCardId);
    if (!firstCard || !secondCard) {
      setFlippedCardIds([]);
      return;
    }

    const isMatch = firstCard.itemId === secondCard.itemId && firstCard.side !== secondCard.side;

    if (isMatch) {
      if (!concentrationMatchedItemIds.includes(firstCard.itemId)) {
        const scored = recordQuizResult(firstCard.itemId, true, "concentration");
        if (scored) {
          setQuizScore((value) => value + 1);
        }
      }

      const nextMatchedItemIds = [...concentrationMatchedItemIds, firstCard.itemId];
      setConcentrationMatchedItemIds(nextMatchedItemIds);
      setFlippedCardIds([]);
      setConcentrationFeedback({ tone: "success", message: `${firstCard.label} matched ${secondCard.label}.` });
      playFeedbackSound("success");

      if (nextMatchedItemIds.length >= currentQuestion.pairs.length) {
        setConcentrationFeedback({ tone: "success", message: "Board cleared. Continue to the next set." });
      }
      return;
    }

    setIsResolvingConcentrationTurn(true);
    setConcentrationFeedback({ tone: "idle", message: "Not a pair. Try again." });
    window.setTimeout(() => {
      setFlippedCardIds([]);
      setIsResolvingConcentrationTurn(false);
    }, 700);
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

  function markItemKnown(itemId: string) {
    setProgressByItem((previous) => {
      const currentProgress = previous[itemId] ?? createDefaultProgress(itemId);
      return {
        ...previous,
        [itemId]: {
          ...currentProgress,
          status: "known",
          masteryStage: "spaced_review",
          correctCount: Math.max(currentProgress.correctCount, settings.correctAnswersToKnown),
          lastAnsweredCorrect: true,
          lastReviewedAt: new Date().toISOString(),
        },
      };
    });
  }

  function returnToDashboard() {
    setScreen("dashboard");
    setLessonIndex(0);
    setQuizIndex(0);
    setContextIndex(0);
    setQuizScore(0);
    setAnswerFeedback(null);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
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
            <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
              <article className="rounded-xl border border-cyan-100 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Beginner Trail</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">Base Camp Route</h2>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900">Soft guidance</span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  {beginnerTrailSteps.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (step.track) {
                          switchTrack(step.track);
                        }
                      }}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        step.status === "complete"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                          : step.status === "recommended"
                            ? "border-cyan-400 bg-cyan-50 text-cyan-950"
                            : "border-slate-200 bg-slate-50 text-slate-800 hover:border-cyan-300 hover:bg-cyan-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Camp {index}</p>
                      <p className="mt-1 text-sm font-bold">{step.title}</p>
                      <p className="mt-1 text-xs leading-snug">{step.detail}</p>
                    </button>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tutor Notes</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{tutorNote}</p>
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{writingSystemIntro.sentence}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {writingSystemIntro.labels.map((label) => (
                      <span key={`${label.text}-${label.role}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {label.text}: {label.script}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </div>
            <div className="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)]">
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Climbs</h2>
                <div className="mt-3 space-y-2">
                  {STUDY_TRACK_ORDER.map((track) => (
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
                      Start {settings.quizMode === "matching" ? "Match" : settings.quizMode === "concentration" ? "Concentration" : "Quiz"} Lesson ({SESSION_TARGET_MINUTES} min)
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
                      <MountProgressCard
                        progress={activeMountProgress}
                        active
                        reducedMotion={settings.reducedMotion}
                        correctAnswersToKnown={settings.correctAnswersToKnown}
                      />
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
                      A symbol becomes known after {settings.correctAnswersToKnown} cumulative correct answers. Misses still count as misses, but they never erase earlier progress.
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
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-800">Teach Phase - {activeLessonTitle}</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
              Lesson Step {lessonIndex + 1} of {activeLessonItems.length}
            </p>
            <div className="mt-3 rounded-2xl border border-cyan-100 bg-white p-4">
              <p className="text-7xl font-bold text-slate-900">{currentLessonItem.character}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-800">{currentLessonItem.primaryMeaning}</p>
              {currentLessonItem.lessonHint && <p className="mt-2 text-sm font-medium text-cyan-700">{currentLessonItem.lessonHint}</p>}
              <p className="mt-2 text-slate-600">{currentLessonItem.mnemonic}</p>
              <p className="mt-3 text-sm font-semibold text-emerald-800">
                Why this matters: this symbol appears in your upcoming recognition and reading practice.
              </p>
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
                onClick={advanceFromTeach}
                className="rounded-full bg-cyan-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                {lessonIndex + 1 === activeLessonItems.length ? "Start Recall" : `Next ${activeTrack === "kanji" ? "Kanji" : "Character"}`}
              </button>
            </div>
          </section>
        )}

        {screen === "quiz" && currentQuestion && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  {currentQuestion.kind === "matching" ? "Match Board" : currentQuestion.kind === "concentration" ? "Concentration Board" : "Quiz"} {quizIndex + 1} of {quizQuestions.length}
                </p>
                {currentQuestion.kind === "multiple_choice" ? (
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">
                    {currentTrackConfig.promptLabel} "{currentQuestion.promptLabel}"?
                  </h2>
                ) : currentQuestion.kind === "concentration" ? (
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">
                    {currentQuestion.promptLabel}
                  </h2>
                ) : (
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">{currentQuestion.promptLabel}</h2>
                )}
              </div>
              <div className="w-full max-w-md">
                <MountProgressCard
                  progress={activeMountProgress}
                  active
                  reducedMotion={settings.reducedMotion}
                  correctAnswersToKnown={settings.correctAnswersToKnown}
                />
              </div>
            </div>

            {currentQuestion.kind === "multiple_choice" && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => submitAnswer(option)}
                      disabled={Boolean(answerFeedback)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-5 text-4xl font-bold text-slate-900 transition hover:border-emerald-500 hover:bg-emerald-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {answerFeedback && (
                  <div
                    className={`mt-4 rounded-2xl border p-4 ${
                      answerFeedback.tone === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : "border-rose-200 bg-rose-50 text-rose-950"
                    }`}
                  >
                    <p className="text-sm font-bold">{answerFeedback.title}</p>
                    <p className="mt-1 text-sm">{answerFeedback.message}</p>
                    <p className="mt-1 text-sm font-semibold">{answerFeedback.nextAction}</p>
                    {knownEventItem?.id === currentQuestion.itemId && (
                      <p className="text-sm font-semibold text-cyan-800">
                        {knownEventItem.character} is now known. Your climber moved one step higher on {trackConfigs[activeTrack].label}.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={advanceQuiz}
                      className="mt-3 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      {quizIndex + 1 >= quizQuestions.length ? (contextExamples.length > 0 ? "Start Context Reading" : "Finish Trail") : "Continue"}
                    </button>
                  </div>
                )}
              </>
            )}

            {currentQuestion.kind === "matching" && (
              <>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Symbols</p>
                    <div className="mt-3 space-y-2">
                      {currentQuestion.pairs.map((pair) => {
                        const isMatched = matchedItemIds.includes(pair.itemId);
                        const isSelected = selectedMatchingItemId === pair.itemId;
                        return (
                          <button
                            key={pair.itemId}
                            type="button"
                            draggable={!isMatched}
                            onClick={() => setSelectedMatchingItemId(isMatched ? null : pair.itemId)}
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", pair.itemId);
                              setSelectedMatchingItemId(pair.itemId);
                            }}
                            className={`flex min-h-20 w-full items-center justify-center rounded-2xl border px-4 py-4 text-4xl font-bold transition ${
                              isMatched
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                : isSelected
                                  ? "border-cyan-500 bg-cyan-50 text-cyan-950"
                                  : "border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-400 hover:bg-cyan-50"
                            }`}
                          >
                            {pair.symbol}
                          </button>
                        );
                      })}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">English Descriptions</p>
                    <div className="mt-3 space-y-2">
                      {currentQuestion.rightOptions.map((description) => {
                        const matchedItemId = currentQuestion.pairs.find((entry) => entry.description === description)?.itemId;
                        const isMatched = matchedItemIds.includes(matchedItemId ?? "");
                        return (
                          <button
                            key={description}
                            type="button"
                            onClick={() => {
                              if (selectedMatchingItemId) {
                                tryMatchingPair(selectedMatchingItemId, description);
                              }
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              const itemId = event.dataTransfer.getData("text/plain");
                              if (itemId) {
                                tryMatchingPair(itemId, description);
                              }
                            }}
                            className={`flex min-h-20 w-full items-center rounded-2xl border px-4 py-4 text-left text-base font-semibold transition ${
                              isMatched
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                : "border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-400 hover:bg-cyan-50"
                            }`}
                          >
                            {description}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className={`text-sm font-semibold ${matchingFeedback.tone === "error" ? "text-rose-700" : matchingFeedback.tone === "success" ? "text-emerald-700" : "text-slate-600"}`}>
                      {matchingFeedback.message || "Tap a symbol, then tap its meaning. Drag and drop also works on desktop."}
                    </p>
                    <p className="text-sm text-slate-600">
                      Matched {matchedItemIds.length} of {currentQuestion.pairs.length}
                    </p>
                    {knownEventItem && matchedItemIds.includes(knownEventItem.id) && (
                      <p className="text-sm font-semibold text-cyan-800">
                        {knownEventItem.character} is now known. Your climber moved one step higher on {trackConfigs[activeTrack].label}.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={advanceQuiz}
                    disabled={matchedItemIds.length < currentQuestion.pairs.length}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                      matchedItemIds.length < currentQuestion.pairs.length
                        ? "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400"
                        : "bg-cyan-700 text-white hover:bg-cyan-600"
                    }`}
                  >
                    {quizIndex + 1 >= quizQuestions.length ? "Finish Trail" : "Next Board"}
                  </button>
                </div>
              </>
            )}

            {currentQuestion.kind === "concentration" && (
              <>
                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-2 sm:gap-3">
                    {currentQuestion.cards.map((card) => {
                      const isMatched = concentrationMatchedItemIds.includes(card.itemId);
                      const isFaceUp = isMatched || flippedCardIds.includes(card.cardId);

                      return (
                        <button
                          key={card.cardId}
                          type="button"
                          onClick={() => handleConcentrationCardClick(card.cardId)}
                          disabled={isMatched || isResolvingConcentrationTurn}
                          className={`aspect-[0.92] rounded-xl border px-2 py-2 text-center transition sm:px-3 sm:py-3 ${
                            isMatched
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : isFaceUp
                                ? "border-cyan-400 bg-cyan-50 text-cyan-950"
                                : "border-slate-200 bg-slate-900 text-white hover:border-cyan-400 hover:bg-slate-800"
                          } ${isFaceUp ? "" : "shadow-sm"}`}
                        >
                          <div className="flex h-full items-center justify-center">
                            {isFaceUp ? (
                              <span className={`font-semibold ${card.side === "symbol" ? "text-4xl sm:text-5xl" : "text-base leading-tight sm:text-lg"}`}>{card.label}</span>
                            ) : (
                              <span className="text-3xl sm:text-4xl">?</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Board</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {concentrationMatchedItemIds.length} / {currentQuestion.pairs.length}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">Pairs matched</p>

                    <div className="mt-4 space-y-2">
                      <p className={`text-sm font-semibold ${concentrationFeedback.tone === "success" ? "text-emerald-700" : "text-slate-700"}`}>
                        {concentrationFeedback.message || "Flip two cards at a time and find the pairs."}
                      </p>
                      <p className="text-sm text-slate-600">Misses do not count against progress in this mode.</p>
                      {knownEventItem && concentrationMatchedItemIds.includes(knownEventItem.id) && (
                        <p className="text-sm font-semibold text-cyan-800">
                          {knownEventItem.character} is now known. Your climber moved one step higher on {trackConfigs[activeTrack].label}.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={advanceQuiz}
                      disabled={concentrationMatchedItemIds.length < currentQuestion.pairs.length}
                      className={`mt-4 w-full rounded-full px-5 py-2 text-sm font-semibold transition ${
                        concentrationMatchedItemIds.length < currentQuestion.pairs.length
                          ? "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400"
                          : "bg-cyan-700 text-white hover:bg-cyan-600"
                      }`}
                    >
                      {quizIndex + 1 >= quizQuestions.length ? "Finish Trail" : "Next Board"}
                    </button>
                  </aside>
                </div>
              </>
            )}
          </section>
        )}

        {screen === "context" && currentContextExample && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Recognition In Context - {activeLessonTitle}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Read The Word</h2>

            <div className="mt-4 rounded-2xl border border-violet-100 bg-white p-5">
              <p className="flex flex-wrap gap-1 text-6xl font-bold leading-tight text-slate-900">
                {highlightContextText(currentContextExample, activeLessonItems).map((piece, index) =>
                  piece.startsWith("[") && piece.endsWith("]") ? (
                    <span key={`${piece}-${index}`} className="rounded-xl bg-amber-100 px-1 text-amber-950">
                      {piece.slice(1, -1)}
                    </span>
                  ) : (
                    <span key={`${piece}-${index}`}>{piece}</span>
                  ),
                )}
              </p>
              <p className="mt-4 text-xl font-semibold text-slate-800">{currentContextExample.reading}</p>
              {settings.showRomaji && <p className="mt-1 text-sm font-semibold text-slate-500">{currentContextExample.romaji}</p>}
              <p className="mt-2 text-sm text-slate-700">{currentContextExample.meaning}</p>
              <p className="mt-3 text-sm font-semibold text-violet-800">{currentContextExample.explanation}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                Context card {contextIndex + 1} of {contextExamples.length}
              </p>
              <button
                type="button"
                onClick={advanceContext}
                className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-600"
              >
                {contextIndex + 1 >= contextExamples.length ? "Finish Trail" : "Next Word"}
              </button>
            </div>
          </section>
        )}

        {screen === "summary" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Session Summary</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Trail Segment Complete</h2>
            <p className="mt-3 text-slate-700">
              You got {quizScore} out of {totalQuizUnits} clean on the first try. Every correct answer moved a symbol closer to known, and every newly known symbol advanced the climb by one step.
            </p>
            {sessionMissedItemIds.length > 0 && (
              <p className="mt-2 text-sm text-slate-600">
                {sessionMissedItemIds.length} missed {sessionMissedItemIds.length === 1 ? "symbol" : "symbols"} will return during later quizzes until they reach {settings.correctAnswersToKnown} correct answers.
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
              <MountProgressCard
                progress={activeMountProgress}
                active
                reducedMotion={settings.reducedMotion}
                correctAnswersToKnown={settings.correctAnswersToKnown}
              />
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
                          Correct answers: {selectedDictionaryProgress.correctCount}/{settings.correctAnswersToKnown}
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
                        <button
                          type="button"
                          onClick={() => markItemKnown(selectedDictionaryItem.id)}
                          disabled={selectedDictionaryProgress.status === "known"}
                          className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            selectedDictionaryProgress.status === "known"
                              ? "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400"
                              : "border border-cyan-700 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
                          }`}
                        >
                          {selectedDictionaryProgress.status === "known" ? "Already Known" : "Mark Known"}
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
              {STUDY_TRACK_ORDER.map((track) => (
                <MountProgressCard
                  key={track}
                  progress={mountProgressByTrack[track]}
                  active={track === activeTrack}
                  reducedMotion={settings.reducedMotion}
                  correctAnswersToKnown={settings.correctAnswersToKnown}
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

                  {!settings.showFurigana && <p className="text-xs text-slate-500">Enable furigana first to show romaji.</p>}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Lesson Content</h3>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Include Known Symbols In Lessons</span>
                    <input
                      type="checkbox"
                      checked={settings.includeKnownInLessons}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setSettings((previous) => ({ ...previous, includeKnownInLessons: checked }));
                      }}
                      className="h-5 w-5 accent-violet-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Correct Answers To Become Known</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.correctAnswersToKnown}
                      onChange={(event) => {
                        const correctAnswersToKnown = normalizeCorrectAnswersToKnown(event.currentTarget.valueAsNumber);
                        setSettings((previous) => ({ ...previous, correctAnswersToKnown }));
                      }}
                      className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-900"
                    />
                  </label>
                  <p className="text-xs text-slate-500">Applies to Mount Hiragana, Mount Katakana, and Mount Kanji.</p>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Quiz Mode</h3>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Activity Type</span>
                    <select
                      value={settings.quizMode}
                      onChange={(event) => {
                        const quizMode = event.currentTarget.value as QuizMode;
                        setSettings((previous) => ({ ...previous, quizMode }));
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="matching">Match 5 Pairs</option>
                      <option value="concentration">Concentration 4x4</option>
                    </select>
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">Sound Effects</span>
                    <input
                      type="checkbox"
                      checked={settings.soundEffects}
                      onChange={(event) => {
                        const soundEffects = event.currentTarget.checked;
                        setSettings((previous) => ({ ...previous, soundEffects }));
                      }}
                      className="h-5 w-5 accent-violet-700"
                    />
                  </label>
                  <p className="text-xs text-slate-500">Matching supports tap-to-pair on touch devices and drag and drop on desktop. Concentration uses a 4x4 board and only credits successful pairs.</p>
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
                        const textScale = Number(event.currentTarget.value) as TextScale;
                        setSettings((previous) => ({ ...previous, textScale }));
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
