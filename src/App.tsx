import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
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
import {
  furiganaExamples,
  getContextExamplesForItems,
  kanaLore,
  kanjiLore,
  onlineLearningResources,
  writingSystemIntro,
  type TutorContextExample,
} from "./data/seed/tutorContent";
import { createProgressRepository } from "./repositories/progressRepositoryFactory";
import type { ProgressRepository } from "./repositories/progressRepository";
import type { HandwritingStroke } from "./services/handwritingVerifier";
import { KNOWN_CORRECT_THRESHOLD, ReviewTracker, resolveStudyStatus } from "./services/reviewTracker";
import { applyTutorAttempt, buildTutorFeedback, type TutorFeedback } from "./services/tutorEngine";
import type { QuizAttempt, QuizType, StudyItem, StudyTrack, TutorActivityType, UserStudyProgress } from "./types";

type Screen = "dashboard" | "baseStudy" | "lesson" | "quiz" | "handwriting" | "context" | "summary" | "dictionary" | "progress" | "settings" | "sumo";
type MountSelection = "base" | StudyTrack;

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

interface MatchingFeedback {
  tone: "success" | "error" | "idle";
  message: string;
}

interface ConcentrationFeedback {
  tone: "success" | "idle";
  message: string;
}

interface HandwritingFeedback {
  tone: "success" | "error" | "idle";
  message: string;
  score: number;
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

const LESSON_CURSOR_STORAGE_KEY = "mount-kanji-lesson-cursor-v2";
const SETTINGS_STORAGE_KEY = "mount-kanji-settings";
const REVISIT_INSERTS = 2;
const MATCHING_BOARD_SIZE = 5;
const CONCENTRATION_GRID_SIZE = 16;
const CONCENTRATION_PAIR_COUNT = CONCENTRATION_GRID_SIZE / 2;
const HANDWRITING_TRAIL_TRACKS = new Set<StudyTrack>(["hiragana", "katakana"]);
const HANDWRITING_RASTER_SIZE = 256;
const HANDWRITING_GUIDE_FONT_STACK = `"BIZ UDPGothic", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif`;
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

const supportedHandwritingCharacters = new Set([...hiraganaPool, ...katakanaPool].map((item) => item.character));

const DEFAULT_LESSON_CURSORS: LessonCursorState = {
  kanji: 0,
  hiragana: 0,
  katakana: 0,
};

const baseCampStudies = [
  {
    id: "base_intro_001",
    title: "Intro 1: How Japanese Writing Works",
    focus: "Hiragana, Katakana, and Kanji work together",
  },
  {
    id: "base_intro_002",
    title: "Intro 2: Kanji Lore",
    focus: "Where kanji came from and how Japan adapted Chinese characters",
  },
  {
    id: "base_intro_003",
    title: "Intro 3: Kana Lore",
    focus: "How Hiragana and Katakana developed from kanji sounds",
  },
  {
    id: "base_intro_004",
    title: "Intro 4: Furigana",
    focus: "Small kana that show how to pronounce kanji",
  },
  {
    id: "base_intro_005",
    title: "Intro 5: Online References",
    focus: "Useful outside resources for dictionaries, kana, grammar, and reading",
  },
];

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

function getProgressStatus(row: UserStudyProgress | undefined, correctAnswersToKnown: number) {
  return resolveStudyStatus(row?.correctCount ?? 0, row?.incorrectCount ?? 0, correctAnswersToKnown);
}

function campProgressTone(knownCount: number, totalCount: number, isSelected: boolean): string {
  if (isSelected) {
    return "border-cyan-600 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-100";
  }

  if (totalCount > 0 && knownCount >= totalCount) {
    return "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-cyan-300 hover:bg-cyan-50";
  }

  const percentKnown = totalCount === 0 ? 0 : knownCount / totalCount;

  if (percentKnown >= 0.5) {
    return "border-sky-200 bg-sky-50 text-slate-900 hover:border-cyan-300 hover:bg-cyan-50";
  }

  if (percentKnown > 0) {
    return "border-amber-200 bg-amber-50 text-slate-900 hover:border-cyan-300 hover:bg-cyan-50";
  }

  return "border-slate-200 bg-white text-slate-900 hover:border-cyan-300 hover:bg-cyan-50";
}

function buildQuizQuestions(items: StudyItem[], pool: StudyItem[]): QuizQuestion[] {
  return shuffle(items).map((item) => {
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

function buildMountProgress(
  track: StudyTrack,
  progressByItem: Record<string, UserStudyProgress>,
  correctAnswersToKnown: number,
): MountProgress {
  const pool = trackConfigs[track].pool;
  const totalSteps = pool.length;
  const knownCount = pool.reduce(
    (count, item) => count + (getProgressStatus(progressByItem[item.id], correctAnswersToKnown) === "known" ? 1 : 0),
    0,
  );

  return {
    track,
    label: trackConfigs[track].label,
    knownCount,
    remainingCount: Math.max(0, totalSteps - knownCount),
    totalSteps,
    percentComplete: totalSteps === 0 ? 0 : Math.round((knownCount / totalSteps) * 100),
  };
}

function highlightContextText(example: TutorContextExample, items: StudyItem[]): string[] {
  const targets = new Set(items.filter((item) => example.targetItemIds.includes(item.id)).map((item) => item.character));
  return Array.from(example.written).map((character) => (targets.has(character) ? `[${character}]` : character));
}

function introSegmentClass(text: string): string {
  switch (text) {
    case "私":
    case "I":
      return "bg-blue-900 text-white ring-blue-950";
    case "食":
    case "べます":
    case "eat":
      return "bg-emerald-900 text-white ring-emerald-950";
    case "ラーメン":
    case "ramen":
      return "bg-violet-900 text-white ring-violet-950";
    case "は":
    case "を":
      return "bg-slate-800 text-white ring-slate-950";
    default:
      return "bg-slate-100 text-slate-950 ring-slate-300";
  }
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
            {active ? "Current Mount" : "Select"}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <MountainTrail progress={progress} active={active} reducedMotion={reducedMotion} />
        <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1">
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

function strokeToPath(stroke: HandwritingStroke): string {
  return stroke
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 100} ${point.y * 100}`)
    .join(" ");
}

function getMaskBounds(mask: Uint8Array, size: number): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null {
  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (mask[y * size + x] === 0) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || maxY < 0) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function createAlphaMask(context: CanvasRenderingContext2D, size: number): Uint8Array {
  const image = context.getImageData(0, 0, size, size).data;
  const mask = new Uint8Array(size * size);

  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = image[index * 4 + 3] > 24 ? 1 : 0;
  }

  return mask;
}

function dilateMask(mask: Uint8Array, size: number, radius: number): Uint8Array {
  const dilated = new Uint8Array(mask.length);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (mask[y * size + x] === 0) {
        continue;
      }

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > radius * radius) {
            continue;
          }

          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX >= 0 && nextX < size && nextY >= 0 && nextY < size) {
            dilated[nextY * size + nextX] = 1;
          }
        }
      }
    }
  }

  return dilated;
}

function createHandwritingCanvas(size = HANDWRITING_RASTER_SIZE): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  return context ? { canvas, context } : null;
}

function drawHandwritingGlyph(context: CanvasRenderingContext2D, character: string, size: number) {
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#000";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.round(size * 0.72)}px ${HANDWRITING_GUIDE_FONT_STACK}`;
  context.fillText(character, size / 2, size * 0.56);
}

function drawHandwritingStrokes(context: CanvasRenderingContext2D, strokes: HandwritingStroke[], size: number) {
  context.clearRect(0, 0, size, size);
  context.strokeStyle = "#000";
  context.lineWidth = size * 0.05;
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.length === 0) {
      continue;
    }

    context.beginPath();
    context.moveTo(stroke[0].x * size, stroke[0].y * size);
    for (const point of stroke.slice(1)) {
      context.lineTo(point.x * size, point.y * size);
    }
    context.stroke();
  }
}

function verifyHandwritingAgainstGlyph(character: string, strokes: HandwritingStroke[]): HandwritingFeedback {
  const pointCount = strokes.flat().length;
  if (pointCount < 6) {
    return { tone: "error", message: "Draw the character before checking it.", score: 0 };
  }

  const userRaster = createHandwritingCanvas();
  const targetRaster = createHandwritingCanvas();
  if (!userRaster || !targetRaster) {
    return { tone: "error", message: "Handwriting verification is not available in this browser.", score: 0 };
  }

  drawHandwritingStrokes(userRaster.context, strokes, HANDWRITING_RASTER_SIZE);
  drawHandwritingGlyph(targetRaster.context, character, HANDWRITING_RASTER_SIZE);

  const userMask = createAlphaMask(userRaster.context, HANDWRITING_RASTER_SIZE);
  const targetMask = createAlphaMask(targetRaster.context, HANDWRITING_RASTER_SIZE);
  const isSimpleKo = character === "こ";
  const tolerantTargetMask = dilateMask(targetMask, HANDWRITING_RASTER_SIZE, isSimpleKo ? 18 : 11);
  const userBounds = getMaskBounds(userMask, HANDWRITING_RASTER_SIZE);
  const targetBounds = getMaskBounds(targetMask, HANDWRITING_RASTER_SIZE);

  if (!userBounds || !targetBounds) {
    return { tone: "error", message: "Draw the character before checking it.", score: 0 };
  }

  const userInk = userMask.reduce((sum, value) => sum + value, 0);
  let overlappingInk = 0;
  for (let index = 0; index < userMask.length; index += 1) {
    if (userMask[index] && tolerantTargetMask[index]) {
      overlappingInk += 1;
    }
  }

  const overlapScore = userInk === 0 ? 0 : overlappingInk / userInk;
  const userSize = Math.max(userBounds.width, userBounds.height) / HANDWRITING_RASTER_SIZE;
  const targetSize = Math.max(targetBounds.width, targetBounds.height) / HANDWRITING_RASTER_SIZE;
  const sizeScore = clamp(1 - Math.abs(userSize - targetSize * 0.72) / 0.36, 0, 1);
  const userCenter = { x: userBounds.minX + userBounds.width / 2, y: userBounds.minY + userBounds.height / 2 };
  const targetCenter = { x: targetBounds.minX + targetBounds.width / 2, y: targetBounds.minY + targetBounds.height / 2 };
  const centerScore = clamp(1 - Math.hypot(userCenter.x - targetCenter.x, userCenter.y - targetCenter.y) / (HANDWRITING_RASTER_SIZE * 0.24), 0, 1);
  const score = overlapScore * 0.76 + sizeScore * 0.14 + centerScore * 0.1;
  const acceptanceScore = isSimpleKo ? 0.56 : 0.68;

  if (score >= acceptanceScore) {
    return { tone: "success", message: `That looks like ${character}.`, score };
  }

  if (overlapScore < 0.55) {
    return { tone: "error", message: "Keep your strokes inside the guide shape.", score };
  }

  if (sizeScore < 0.55) {
    return { tone: "error", message: "Match the guide size more closely.", score };
  }

  return { tone: "error", message: "Match the guide position more closely.", score };
}

function App() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [activeMount, setActiveMount] = useState<MountSelection>("base");
  const [baseStudyIndex, setBaseStudyIndex] = useState(0);
  const [activeTrack, setActiveTrack] = useState<StudyTrack>("hiragana");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [handwritingIndex, setHandwritingIndex] = useState(0);
  const [contextIndex, setContextIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<TutorFeedback | null>(null);
  const [matchingFeedback, setMatchingFeedback] = useState<MatchingFeedback>({ tone: "idle", message: "" });
  const [concentrationFeedback, setConcentrationFeedback] = useState<ConcentrationFeedback>({ tone: "idle", message: "" });
  const [handwritingFeedback, setHandwritingFeedback] = useState<HandwritingFeedback>({ tone: "idle", message: "" , score: 0 });
  const [handwritingStrokes, setHandwritingStrokes] = useState<HandwritingStroke[]>([]);
  const [activeHandwritingStroke, setActiveHandwritingStroke] = useState<HandwritingStroke | null>(null);
  const [showHandwritingGuide, setShowHandwritingGuide] = useState(false);
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
  const isBaseMount = activeMount === "base";
  const selectedBaseStudy = baseCampStudies[baseStudyIndex] ?? baseCampStudies[0];
  const dashboardTitle = isBaseMount ? "Base Camp" : currentTrackConfig.dashboardTitle;
  const dashboardSubtitle = isBaseMount ? "Start with how Japanese writing systems fit together" : "";
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
        kanji: buildMountProgress("kanji", progressByItem, settings.correctAnswersToKnown),
        hiragana: buildMountProgress("hiragana", progressByItem, settings.correctAnswersToKnown),
        katakana: buildMountProgress("katakana", progressByItem, settings.correctAnswersToKnown),
      }) satisfies Record<StudyTrack, MountProgress>,
    [progressByItem, settings.correctAnswersToKnown],
  );

  const activeMountProgress = mountProgressByTrack[activeTrack];

  const currentTrailItems = useMemo(
    () => currentPool.filter((item) => !(progressByItem[item.id]?.excludedFromLessons ?? false)),
    [currentPool, progressByItem],
  );

  const currentPendingItems = useMemo(
    () => currentTrailItems.filter((item) => getProgressStatus(progressByItem[item.id], settings.correctAnswersToKnown) !== "known"),
    [currentTrailItems, progressByItem, settings.correctAnswersToKnown],
  );

  const currentLessonEligibleItems = useMemo(
    () => (settings.includeKnownInLessons ? currentTrailItems : currentPendingItems),
    [currentPendingItems, currentTrailItems, settings.includeKnownInLessons],
  );

  const trailLessonCount = Math.max(1, currentLessons.length);
  const currentLessonCursor = lessonCursorByTrack[activeTrack] % Math.max(1, currentLessons.length);
  const currentLessonDefinition = currentLessons[currentLessonCursor];
  const currentLessonItem = activeLessonItems[lessonIndex];
  const currentHandwritingItem = activeLessonItems[handwritingIndex];
  const isCurrentHandwritingSupported = currentHandwritingItem ? supportedHandwritingCharacters.has(currentHandwritingItem.character) : false;
  const currentQuestion = quizQuestions[quizIndex];
  const currentContextExample = contextExamples[contextIndex];
  const currentLessonKnownCount =
    currentLessonDefinition?.itemIds.filter((itemId) => getProgressStatus(progressByItem[itemId], settings.correctAnswersToKnown) === "known").length ?? 0;
  const currentLessonTotalCount = currentLessonDefinition?.itemIds.length ?? 0;

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
    const known = activeRows.filter((row) => getProgressStatus(row, settings.correctAnswersToKnown) === "known").length;
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
  }, [currentTrailItems, progressByItem, settings.correctAnswersToKnown, trackAttempts]);

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
  const sessionUnitTotal = quizQuestions.length > 0 ? totalQuizUnits : activeLessonItems.length;
  const isHandwritingSessionSummary = quizQuestions.length === 0 && activeLessonItems.length > 0;
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
  const selectedDictionaryStatus = selectedDictionaryProgress
    ? getProgressStatus(selectedDictionaryProgress, settings.correctAnswersToKnown)
    : "new";

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

  function buildLessonSegment(lesson: SeedLesson | undefined, eligibleItems = currentLessonEligibleItems): StudyItem[] {
    if (eligibleItems.length === 0) {
      return [];
    }

    const baseLessonItems =
      lesson?.itemIds
        .map((itemId) => itemById.get(itemId))
        .filter((item): item is StudyItem => Boolean(item))
        .filter((item) => !(progressByItem[item.id]?.excludedFromLessons ?? false))
        .filter((item) => settings.includeKnownInLessons || getProgressStatus(progressByItem[item.id], settings.correctAnswersToKnown) !== "known") ?? [];

    const revisitRows = reviewTracker
      .getQueue(
        currentTrailItems
          .filter((item) => {
            const progress = progressByItem[item.id] ?? createDefaultProgress(item.id);
            return progress.correctCount + progress.incorrectCount > 0 && getProgressStatus(progress, settings.correctAnswersToKnown) !== "known";
          })
          .map((item) => progressByItem[item.id] ?? createDefaultProgress(item.id)),
        settings.correctAnswersToKnown,
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
      return eligibleItems.slice(0, Math.min(5, eligibleItems.length));
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
    setActiveMount(track);
    setActiveTrack(track);
    setScreen("dashboard");
    setLessonIndex(0);
    setQuizIndex(0);
    setHandwritingIndex(0);
    setContextIndex(0);
    setQuizScore(0);
    setDashboardMessage("");
    setAnswerFeedback(null);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setHandwritingFeedback({ tone: "idle", message: "", score: 0 });
    setHandwritingStrokes([]);
    setActiveHandwritingStroke(null);
    setShowHandwritingGuide(false);
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
    setSessionMissedItemIds([]);
    setKnownEvent(null);
  }

  function switchToBaseCamp() {
    setActiveMount("base");
    setScreen("dashboard");
    setLessonIndex(0);
    setQuizIndex(0);
    setHandwritingIndex(0);
    setContextIndex(0);
    setQuizScore(0);
    setDashboardMessage("");
    setAnswerFeedback(null);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setHandwritingFeedback({ tone: "idle", message: "", score: 0 });
    setHandwritingStrokes([]);
    setActiveHandwritingStroke(null);
    setShowHandwritingGuide(false);
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
    setSessionMissedItemIds([]);
    setKnownEvent(null);
  }

  function selectLessonCamp(index: number) {
    setLessonCursorByTrack((previous) => ({
      ...previous,
      [activeTrack]: clamp(index, 0, Math.max(0, currentLessons.length - 1)),
    }));
    setDashboardMessage("");
  }

  function startLesson(lessonIndexOverride = currentLessonCursor) {
    const lessonIndex = clamp(lessonIndexOverride, 0, Math.max(0, currentLessons.length - 1));
    const lessonDefinition = currentLessons[lessonIndex];
    const eligibleItems = settings.includeKnownInLessons ? currentTrailItems : currentPendingItems;

    if (eligibleItems.length === 0) {
      setDashboardMessage(`${currentTrackConfig.label} is at the summit. Every symbol on this mount is known.`);
      setScreen("dashboard");
      return;
    }

    const lessonSegment = buildLessonSegment(lessonDefinition, eligibleItems);
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
    setLessonCursorByTrack((previous) => ({
      ...previous,
      [activeTrack]: lessonIndex,
    }));
    setActiveLessonItems(preparedLessonSegment);
    setActiveLessonTitle(lessonDefinition?.title ?? `${currentTrackConfig.label} Lesson`);
    setScreen("lesson");
    setLessonIndex(0);
    setQuizIndex(0);
    setHandwritingIndex(0);
    setContextIndex(0);
    setQuizScore(0);
    setSessionMissedItemIds([]);
    setAnswerFeedback(null);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setHandwritingFeedback({ tone: "idle", message: "", score: 0 });
    setHandwritingStrokes([]);
    setActiveHandwritingStroke(null);
    setShowHandwritingGuide(false);
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
    setKnownEvent(null);
    setContextExamples(
      getContextExamplesForItems(
        preparedLessonSegment,
        3,
        currentTrailItems.filter(
          (item) =>
            preparedLessonSegment.some((lessonItem) => lessonItem.id === item.id) ||
            getProgressStatus(progressByItem[item.id], settings.correctAnswersToKnown) === "known",
        ),
      ),
    );
    setQuizQuestions(buildQuestionsForMode(preparedLessonSegment, eligibleItems, settings.quizMode));
  }

  function startHandwritingTrail() {
    if (!HANDWRITING_TRAIL_TRACKS.has(activeTrack)) {
      setDashboardMessage("Handwriting Trail is available for Mount Hiragana and Mount Katakana.");
      return;
    }

    if (currentLessonEligibleItems.length === 0) {
      setDashboardMessage(`${currentTrackConfig.label} is at the summit. Every character on this mount is known.`);
      setScreen("dashboard");
      return;
    }

    const selectedCampItems =
      currentLessonDefinition?.itemIds
        .map((itemId) => itemById.get(itemId))
        .filter((item): item is StudyItem => Boolean(item))
        .filter((item) => !(progressByItem[item.id]?.excludedFromLessons ?? false))
        .filter((item) => settings.includeKnownInLessons || getProgressStatus(progressByItem[item.id], settings.correctAnswersToKnown) !== "known") ?? [];
    const lessonSegment = selectedCampItems.filter((item) => supportedHandwritingCharacters.has(item.character));
    if (lessonSegment.length === 0) {
      setDashboardMessage(`Handwriting verification is not available for this ${currentTrackConfig.label} camp yet.`);
      setScreen("dashboard");
      return;
    }

    setDashboardMessage("");
    setActiveLessonItems(lessonSegment);
    setActiveLessonTitle(currentLessonDefinition?.title ?? `${currentTrackConfig.label} Handwriting`);
    setScreen("handwriting");
    setLessonIndex(0);
    setQuizIndex(0);
    setHandwritingIndex(0);
    setContextIndex(0);
    setQuizScore(0);
    setSessionMissedItemIds([]);
    setAnswerFeedback(null);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setHandwritingFeedback({ tone: "idle", message: "", score: 0 });
    setHandwritingStrokes([]);
    setActiveHandwritingStroke(null);
    setShowHandwritingGuide(false);
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
    setKnownEvent(null);
    setContextExamples([]);
    setQuizQuestions([]);
  }

  function startBaseStudy(index: number) {
    setBaseStudyIndex(clamp(index, 0, Math.max(0, baseCampStudies.length - 1)));
    setScreen("baseStudy");
    setDashboardMessage("");
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
          correctAnswersToKnown: settings.correctAnswersToKnown,
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
    const previousStatus = getProgressStatus(currentProgress, settings.correctAnswersToKnown);
    const nextStatus = getProgressStatus(updatedProgress, settings.correctAnswersToKnown);
    const becameKnown = previousStatus !== "known" && nextStatus === "known";

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

  function resetHandwritingDrawing() {
    setHandwritingStrokes([]);
    setActiveHandwritingStroke(null);
    setHandwritingFeedback({ tone: "idle", message: "", score: 0 });
  }

  function getHandwritingPoint(event: PointerEvent<SVGSVGElement>): { x: number; y: number } {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
    };
  }

  function startHandwritingStroke(event: PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setHandwritingFeedback({ tone: "idle", message: "", score: 0 });
    setActiveHandwritingStroke([getHandwritingPoint(event)]);
  }

  function continueHandwritingStroke(event: PointerEvent<SVGSVGElement>) {
    if (!activeHandwritingStroke) {
      return;
    }

    const nextPoint = getHandwritingPoint(event);
    const previousPoint = activeHandwritingStroke[activeHandwritingStroke.length - 1];
    if (previousPoint && Math.hypot(previousPoint.x - nextPoint.x, previousPoint.y - nextPoint.y) < 0.008) {
      return;
    }

    setActiveHandwritingStroke((stroke) => (stroke ? [...stroke, nextPoint] : stroke));
  }

  function finishHandwritingStroke() {
    if (!activeHandwritingStroke || activeHandwritingStroke.length === 0) {
      setActiveHandwritingStroke(null);
      return;
    }

    setHandwritingStrokes((strokes) => [...strokes, activeHandwritingStroke]);
    setActiveHandwritingStroke(null);
  }

  function verifyCurrentHandwriting() {
    if (!currentHandwritingItem) {
      return;
    }

    if (!isCurrentHandwritingSupported) {
      setHandwritingFeedback({ tone: "error", message: "This character is not available in handwriting mode yet.", score: 0 });
      return;
    }

    const result = verifyHandwritingAgainstGlyph(currentHandwritingItem.character, handwritingStrokes);
    if (result.tone !== "success") {
      setHandwritingFeedback(result);
      playFeedbackSound("error");
      return;
    }

    setQuizScore((value) => value + 1);
    setHandwritingFeedback(result);
    playFeedbackSound("success");
  }

  function advanceHandwritingTrail() {
    resetHandwritingDrawing();
    if (handwritingIndex + 1 >= activeLessonItems.length) {
      setScreen("summary");
      return;
    }

    setHandwritingIndex((value) => value + 1);
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

  function markItemUnknown(itemId: string) {
    setProgressByItem((previous) => {
      const currentProgress = previous[itemId] ?? createDefaultProgress(itemId);
      return {
        ...previous,
        [itemId]: {
          ...currentProgress,
          status: currentProgress.incorrectCount > 0 ? "learning" : "new",
          masteryStage: "teach",
          correctCount: 0,
          lastAnsweredCorrect: false,
          lastReviewedAt: new Date().toISOString(),
        },
      };
    });
  }

  function returnToDashboard() {
    setScreen("dashboard");
    setLessonIndex(0);
    setQuizIndex(0);
    setHandwritingIndex(0);
    setContextIndex(0);
    setQuizScore(0);
    setAnswerFeedback(null);
    setMatchingFeedback({ tone: "idle", message: "" });
    setConcentrationFeedback({ tone: "idle", message: "" });
    setHandwritingFeedback({ tone: "idle", message: "", score: 0 });
    setHandwritingStrokes([]);
    setActiveHandwritingStroke(null);
    setShowHandwritingGuide(false);
    setSelectedMatchingItemId(null);
    setMatchedItemIds([]);
    setIncorrectMatchItemIds([]);
    setFlippedCardIds([]);
    setConcentrationMatchedItemIds([]);
    setIsResolvingConcentrationTurn(false);
  }

  const overviewStats = isBaseMount
    ? []
    : [
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
	                {dashboardSubtitle && <span className="text-xs text-slate-500">{dashboardSubtitle}</span>}
              </div>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{dashboardTitle}</h1>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
	              {overviewStats.length > 0 && (
	                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[25rem]">
	                  {overviewStats.map((stat) => (
                    <article key={stat.label} className={`rounded-xl border px-3 py-2 shadow-sm ${stat.tone}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide">{stat.label}</p>
                      <p className="mt-0.5 text-xl font-bold">{stat.value}</p>
                    </article>
	                  ))}
	                </div>
	              )}
	              <button
	                type="button"
	                onClick={() => setScreen("progress")}
	                aria-label="Progress"
	                title="Progress"
	                className="inline-flex size-11 items-center justify-center rounded-xl border border-emerald-700 bg-emerald-50 text-emerald-900 shadow-sm transition hover:bg-emerald-100"
	              >
	                <img src={mountainStatusKanji} alt="" aria-hidden="true" className="size-7 rounded-full object-cover" />
	              </button>
	              <button
	                type="button"
	                onClick={() => setScreen("sumo")}
	                aria-label="Heya"
	                title="Heya"
	                className="inline-flex size-11 items-center justify-center rounded-xl border border-amber-700 bg-amber-50 text-amber-900 shadow-sm transition hover:bg-amber-100"
	              >
	                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
	                  <path d="M3 10.5 12 3l9 7.5" />
	                  <path d="M5 9.5V21h14V9.5" />
	                  <path d="M9 21v-7h6v7" />
	                  <path d="M8 12h8" />
	                </svg>
	              </button>
	              <button
	                type="button"
	                onClick={() => setScreen("settings")}
	                aria-label="Settings"
                title="Settings"
                className="inline-flex size-11 items-center justify-center rounded-xl border border-violet-700 bg-violet-50 text-violet-900 shadow-sm transition hover:bg-violet-100"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {screen === "dashboard" && (
          <section className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-lg backdrop-blur">
            <div className="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)]">
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Choose Mount</h2>
                <p className="mt-1 text-xs text-slate-600">Pick the type of study.</p>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={switchToBaseCamp}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isBaseMount
                        ? "border-cyan-600 bg-cyan-50 text-cyan-950"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-400 hover:bg-cyan-50"
                    }`}
                  >
                    <p className="text-sm font-semibold">Base Camp</p>
                    <p className="mt-1 text-xs text-slate-600">Introductory explanations before memorization</p>
                    <p className="mt-2 text-xs font-semibold text-slate-800">{baseCampStudies.length} study available</p>
                  </button>
                  {STUDY_TRACK_ORDER.map((track) => (
                    <button
                      key={track}
                      type="button"
                      onClick={() => switchTrack(track)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        activeMount === track
                          ? "border-cyan-600 bg-cyan-50 text-cyan-950"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-400 hover:bg-cyan-50"
                      }`}
                    >
                      <p className="text-sm font-semibold">{trackConfigs[track].label}</p>
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
	                      <h2 className="text-lg font-bold text-slate-900">Choose Study</h2>
	                      {!isBaseMount && (
	                        <p className="text-sm text-slate-600">
	                          {currentTrackConfig.label} - {currentLessonDefinition?.title ?? "Trail Lesson"}
	                        </p>
	                      )}
	                    </div>
	                    {isBaseMount && <p className="mt-1 text-sm text-slate-600">Base Camp - Intro {baseStudyIndex + 1}</p>}
	                    {!isBaseMount && (
	                      <p className="mt-1 text-sm text-slate-600">
	                        Selected study {currentLessonCursor + 1} of {trailLessonCount}: {currentLessonKnownCount}/{currentLessonTotalCount} known
	                      </p>
	                    )}
	                    {dashboardMessage && <p className="mt-2 text-sm font-semibold text-emerald-800">{dashboardMessage}</p>}
	                  </div>
	
	                  <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-2">
	                    {!isBaseMount && HANDWRITING_TRAIL_TRACKS.has(activeTrack) && (
	                      <button type="button" onClick={startHandwritingTrail} className="rounded-xl border border-slate-700 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
	                        Handwriting Trail
                      </button>
                    )}
                    {!isBaseMount && (
                      <button type="button" onClick={() => setScreen("dictionary")} className="rounded-xl border border-cyan-700 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100">
                        {activeTrack === "kanji" ? "Dictionary" : "Reference Chart"}
                      </button>
                    )}
	                  </div>
	                </div>

	                <div className={`mt-3 grid gap-3 ${isBaseMount ? "" : "xl:grid-cols-[minmax(0,1fr)_18rem]"}`}>
	                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
	                    <div className="flex flex-wrap items-center justify-between gap-2">
	                      <div>
	                        <h3 className="text-sm font-semibold text-slate-900">Choose Study</h3>
	                        <p className="mt-1 text-xs text-slate-600">
	                          {isBaseMount
	                            ? "Start with explanations, then move into Hiragana when ready."
	                            : "Studies group similar sounds or related symbols. Pick one, then start the selected study."}
	                        </p>
	                      </div>
	                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
	                        {isBaseMount ? "intro" : currentTrackConfig.unitPlural}
	                      </span>
	                    </div>
	                    <div className="mt-3 max-h-[calc(100vh-14rem)] min-h-96 space-y-2 overflow-y-auto pr-1">
	                      {isBaseMount ? (
	                        baseCampStudies.map((study, index) => {
	                          const isSelected = index === baseStudyIndex;
	                          return (
	                          <article
	                            key={study.id}
	                            className={`flex items-center gap-2 rounded-xl border bg-white transition ${
	                              isSelected
	                                ? "border-cyan-600 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-100"
	                                : "border-slate-200 bg-white text-slate-900 hover:border-cyan-300 hover:bg-cyan-50"
	                            }`}
	                          >
	                            <button type="button" onClick={() => setBaseStudyIndex(index)} className="min-w-0 flex-1 px-3 py-2 text-left">
	                              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
	                                <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Intro {index + 1}</p>
	                                <p className="min-w-0 text-sm font-bold leading-tight">{study.title}</p>
	                                {isSelected && <span className="rounded-full bg-cyan-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Selected</span>}
	                              </div>
	                            </button>
	                            <button
	                              type="button"
	                              onClick={() => startBaseStudy(index)}
	                              aria-label={`Start Intro ${index + 1}`}
	                              title={`Start Intro ${index + 1}`}
	                              className="mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700"
	                            >
	                              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
	                                <path d="M8 5v14l11-7Z" />
	                              </svg>
	                            </button>
	                          </article>
	                        )})
	                      ) : currentLessons.map((lesson, index) => {
	                        const lessonKnown = lesson.itemIds.filter((itemId) => getProgressStatus(progressByItem[itemId], settings.correctAnswersToKnown) === "known").length;
	                        const isSelected = index === currentLessonCursor;
	                        const isComplete = lesson.itemIds.length > 0 && lessonKnown >= lesson.itemIds.length;
	                        return (
	                          <article
	                            key={lesson.id}
	                            className={`flex items-center gap-2 rounded-xl border transition ${campProgressTone(lessonKnown, lesson.itemIds.length, isSelected)}`}
	                          >
	                            <button type="button" onClick={() => selectLessonCamp(index)} className="min-w-0 flex-1 px-3 py-2 text-left">
	                              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
	                                <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Camp {index + 1}</p>
	                                <p className="min-w-0 text-sm font-bold leading-tight">{lesson.title}</p>
	                                <p className="shrink-0 text-xs font-semibold text-slate-700">
	                                  {lessonKnown}/{lesson.itemIds.length} known
	                                </p>
	                                {isSelected && <span className="rounded-full bg-cyan-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Selected</span>}
	                                {!isSelected && isComplete && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Done</span>}
	                              </div>
	                            </button>
	                            <button
	                              type="button"
	                              onClick={() => startLesson(index)}
	                              aria-label={`Start Camp ${index + 1}`}
	                              title={`Start Camp ${index + 1}`}
	                              className="mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700"
	                            >
	                              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
	                                <path d="M8 5v14l11-7Z" />
	                              </svg>
	                            </button>
	                          </article>
	                        );
	                      })}
	                    </div>
	                  </div>

	                  {!isBaseMount && (
	                    <aside className="space-y-3">
	                      <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
	                        <h3 className="text-sm font-semibold text-slate-900">Current Climb</h3>
	                        <div className="mt-3 flex justify-center">
	                          <MountProgressCard
	                            progress={activeMountProgress}
	                            active
	                            reducedMotion={settings.reducedMotion}
	                            correctAnswersToKnown={settings.correctAnswersToKnown}
	                          />
	                        </div>
	                      </article>

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
	                    </aside>
	                  )}
	                </div>
              </div>
            </div>
          </section>
        )}

        {screen === "baseStudy" && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-800">Base Camp - Intro {baseStudyIndex + 1}</p>
                <h2 className="mt-1 text-3xl font-bold text-slate-900">{selectedBaseStudy.title}</h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-700">{selectedBaseStudy.focus}</p>
              </div>
              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Back To Choose Study
              </button>
            </div>

            {baseStudyIndex === 0 ? (
              <div className="mt-4 rounded-2xl border border-cyan-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example Sentence</p>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-4xl font-bold leading-tight sm:text-6xl">
                  {writingSystemIntro.labels.map((label) => (
                    <span key={`sentence-${label.text}`} className={`rounded-xl px-2 py-1 ring-2 ${introSegmentClass(label.text)}`}>
                      {label.text}
                    </span>
                  ))}
                </p>
                <p className="mt-4 flex flex-wrap items-center gap-2 text-2xl font-bold">
                  {["I", "eat", "ramen"].map((word) => (
                    <span key={`meaning-${word}`} className={`rounded-lg px-2 py-1 ring-2 ${introSegmentClass(word)}`}>
                      {word}
                    </span>
                  ))}
                  <span className="text-slate-800">.</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  The dark gray Japanese particles mark grammar, so they do not become separate English words here.
                </p>
                <p className="mt-3 max-w-3xl text-sm text-slate-700">{writingSystemIntro.purpose}</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {writingSystemIntro.labels.map((label) => (
                    <article key={`${label.text}-${label.role}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-3xl font-bold text-slate-900">{label.text}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                            label.script === "kanji"
                              ? "bg-emerald-100 text-emerald-900"
                              : label.script === "katakana"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-cyan-100 text-cyan-900"
                          }`}
                        >
                          {label.script}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-700">{label.role}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : baseStudyIndex === 3 ? (
              <div className="mt-4 rounded-2xl border border-cyan-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Furigana</p>
                <p className="mt-2 max-w-3xl text-sm text-slate-700">
                  Furigana are small kana placed above or beside kanji to show pronunciation. They help children, beginners, and readers encountering unfamiliar kanji.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {furiganaExamples.map((example) => (
                    <article key={example.written} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-center">
                        <p className="text-sm font-bold text-cyan-800">{example.furigana}</p>
                        <p className="text-5xl font-bold text-slate-900">{example.written}</p>
                      </div>
                      <p className="mt-3 text-lg font-bold text-slate-900">{example.meaning}</p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">{example.note}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : baseStudyIndex === 4 ? (
              <div className="mt-4 rounded-2xl border border-cyan-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Online References</p>
                <p className="mt-2 max-w-3xl text-sm text-slate-700">
                  These resources are good companions for Mount Kanji. Use dictionaries when you encounter a word, kana tools for extra script practice, grammar guides when particles or verb forms become confusing, and easy readers after you know enough kana to start reading.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {onlineLearningResources.map((resource) => (
                    <article key={resource.url} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-slate-900">{resource.title}</h3>
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-900">{resource.category}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{resource.description}</p>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Open Resource
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-cyan-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {baseStudyIndex === 1 ? "Kanji Lore" : "Kana Lore"}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(baseStudyIndex === 1 ? kanjiLore : kanaLore).map((section) => (
                    <article key={section.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{section.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-bold text-slate-900">What To Study Next</h3>
              <p className="mt-2 text-sm text-slate-700">
                Start Mount Hiragana first. Hiragana gives you the basic Japanese sound system, then Katakana helps you read loanwords and names, and Kanji adds meaning-based symbols.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => switchTrack("hiragana")}
                  className="rounded-full bg-cyan-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
                >
                  Choose Mount Hiragana
                </button>
                <button
                  type="button"
                  onClick={returnToDashboard}
                  className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Stay At Base Camp
                </button>
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

        {screen === "handwriting" && currentHandwritingItem && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Handwriting Trail {handwritingIndex + 1} of {activeLessonItems.length}
                </p>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Draw the {activeTrack} for "{currentHandwritingItem.romaji ?? currentHandwritingItem.primaryMeaning}"</h2>
                <p className="mt-2 text-sm text-slate-600">{activeLessonTitle}</p>
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

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="mx-auto w-full max-w-xl">
                <svg
                  role="img"
                  aria-label={`Drawing pad for ${currentHandwritingItem.romaji ?? currentHandwritingItem.primaryMeaning}`}
                  viewBox="0 0 100 100"
                  className="aspect-square w-full touch-none rounded-2xl border border-slate-300 bg-white shadow-inner"
                  onPointerDown={startHandwritingStroke}
                  onPointerMove={continueHandwritingStroke}
                  onPointerUp={finishHandwritingStroke}
                  onPointerCancel={finishHandwritingStroke}
                >
                  <path d="M 50 4 L 50 96 M 4 50 L 96 50" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="2 2" />
                  <rect x="12" y="12" width="76" height="76" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                  {showHandwritingGuide && (
                    <text
                      x="50"
                      y="56"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="select-none fill-slate-200 text-[4.5rem] font-bold"
                    >
                      {currentHandwritingItem.character}
                    </text>
                  )}
                  {handwritingStrokes.map((stroke, index) => (
                    <path key={`stroke-${index}`} d={strokeToPath(stroke)} fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                  {activeHandwritingStroke && (
                    <path d={strokeToPath(activeHandwritingStroke)} fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              </div>

              <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{currentHandwritingItem.romaji ?? currentHandwritingItem.primaryMeaning}</p>
                <p className="mt-1 text-sm text-slate-600">{currentHandwritingItem.strokeCount} strokes listed</p>

                <label className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-sm font-medium text-slate-800">Show Guide</span>
                  <input
                    type="checkbox"
                    checked={showHandwritingGuide}
                    onChange={(event) => setShowHandwritingGuide(event.currentTarget.checked)}
                    className="h-5 w-5 accent-slate-900"
                  />
                </label>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={resetHandwritingDrawing} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={verifyCurrentHandwriting}
                    disabled={handwritingStrokes.length === 0 || handwritingFeedback.tone === "success"}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      handwritingStrokes.length === 0 || handwritingFeedback.tone === "success"
                        ? "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    Verify
                  </button>
                </div>

                <div
                  className={`mt-4 rounded-xl border p-3 ${
                    handwritingFeedback.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                      : handwritingFeedback.tone === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-950"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {handwritingFeedback.message || "Draw the character, then verify it."}
                  </p>
                  {handwritingFeedback.score > 0 && <p className="mt-1 text-xs">Match score: {Math.round(handwritingFeedback.score * 100)}%</p>}
                </div>

                <button
                  type="button"
                  onClick={advanceHandwritingTrail}
                  disabled={handwritingFeedback.tone !== "success"}
                  className={`mt-4 w-full rounded-full px-5 py-2 text-sm font-semibold transition ${
                    handwritingFeedback.tone !== "success"
                      ? "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400"
                      : "bg-cyan-700 text-white hover:bg-cyan-600"
                  }`}
                >
                  {handwritingIndex + 1 >= activeLessonItems.length ? "Finish Trail" : "Next Character"}
                </button>
              </aside>
            </div>
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
              <p className="mt-4 text-2xl font-bold text-slate-900">{currentContextExample.meaning}</p>
              {currentContextExample.reading !== currentContextExample.written && (
                <p className="mt-2 text-sm font-semibold text-slate-600">Reading: {currentContextExample.reading}</p>
              )}
              {settings.showRomaji && <p className="mt-1 text-sm font-semibold text-slate-500">Romaji: {currentContextExample.romaji}</p>}
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
              {isHandwritingSessionSummary
                ? `You completed ${quizScore} out of ${sessionUnitTotal} handwriting prompts. Handwriting practice does not change known counts or summit progress.`
                : `You got ${quizScore} out of ${sessionUnitTotal} clean on the first try. Every correct answer moved a symbol closer to known, and every newly known symbol advanced the climb by one step.`}
            </p>
            {!isHandwritingSessionSummary && sessionMissedItemIds.length > 0 && (
              <p className="mt-2 text-sm text-slate-600">
                {sessionMissedItemIds.length} missed {sessionMissedItemIds.length === 1 ? "symbol" : "symbols"} will return during later quizzes until they reach {settings.correctAnswersToKnown} correct answers.
              </p>
            )}
            {!isHandwritingSessionSummary && knownEventItem && (
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
	              <button type="button" onClick={() => startLesson()} className="rounded-full bg-cyan-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600">
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
	                <h2 className="mt-1 text-3xl font-bold text-slate-900">Heya</h2>
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
	                  {filteredDictionaryItems.map((item) => {
	                    const isSelected = selectedDictionaryItem?.id === item.id;
	                    const isKnown = getProgressStatus(progressByItem[item.id], settings.correctAnswersToKnown) === "known";
	                    return (
	                      <button
	                        key={item.id}
	                        type="button"
	                        onClick={() => setSelectedItemId(item.id)}
	                        className={`rounded-xl border px-2 py-3 text-2xl font-bold transition ${
	                          isSelected
	                            ? "border-cyan-600 bg-cyan-100 text-cyan-950"
	                            : isKnown
	                              ? "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-cyan-400 hover:bg-cyan-50"
	                              : "border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-400 hover:bg-cyan-50"
	                        }`}
	                      >
	                        {item.character}
	                      </button>
	                    );
	                  })}
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
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{selectedDictionaryStatus}</p>
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
	                          onClick={() => {
	                            if (selectedDictionaryStatus === "known") {
	                              markItemUnknown(selectedDictionaryItem.id);
	                              return;
	                            }

	                            markItemKnown(selectedDictionaryItem.id);
	                          }}
	                          className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold transition ${
	                            selectedDictionaryStatus === "known"
	                              ? "border border-amber-700 bg-amber-50 text-amber-900 hover:bg-amber-100"
	                              : "border border-cyan-700 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
	                          }`}
	                        >
	                          {selectedDictionaryStatus === "known" ? "Mark Unknown" : "Mark Known"}
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
