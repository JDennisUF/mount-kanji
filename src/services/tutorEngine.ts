import type { ConfusionPair } from "../data/seed/tutorContent";
import { tutorConfusionPairs } from "../data/seed/tutorContent";
import type { StudyItem, TutorActivityType, TutorMasteryStage, UserStudyProgress } from "../types";

const DEFAULT_CORRECT_ANSWERS_TO_KNOWN = 5;

export interface TutorFeedback {
  tone: "success" | "error";
  title: string;
  message: string;
  nextAction: string;
}

export interface TutorAttemptInput {
  progress: UserStudyProgress;
  correct: boolean;
  activityType: TutorActivityType;
  selectedItemId?: string | null;
  correctAnswersToKnown?: number;
  now?: Date;
}

export const TUTOR_STAGE_ORDER: TutorMasteryStage[] = [
  "teach",
  "recognize",
  "recall",
  "read_words",
  "read_sentences",
  "spaced_review",
];

const stageRank = new Map(TUTOR_STAGE_ORDER.map((stage, index) => [stage, index]));

function maxStage(current: TutorMasteryStage, candidate: TutorMasteryStage): TutorMasteryStage {
  return (stageRank.get(candidate) ?? 0) > (stageRank.get(current) ?? 0) ? candidate : current;
}

function resolveCalculatedStatus(progress: UserStudyProgress, correctAnswersToKnown: number) {
  if (progress.correctCount === 0 && progress.incorrectCount === 0) {
    return "new";
  }

  if (progress.correctCount >= correctAnswersToKnown) {
    return "known";
  }

  return "learning";
}

export function resolveTutorMasteryStage(
  progress: UserStudyProgress,
  correctAnswersToKnown = DEFAULT_CORRECT_ANSWERS_TO_KNOWN,
): TutorMasteryStage {
  if (resolveCalculatedStatus(progress, correctAnswersToKnown) === "known") {
    return "spaced_review";
  }

  let stage = progress.masteryStage;
  const hasRecallCorrect = (progress.correctByActivity.recall_choice ?? 0) > 0;
  const hasContextCorrect = (progress.correctByActivity.context_highlight ?? 0) > 0;

  if ((progress.attemptsByActivity.teach_card ?? 0) > 0 || progress.correctCount + progress.incorrectCount > 0) {
    stage = maxStage(stage, "recognize");
  }

  if (hasRecallCorrect || progress.correctCount >= 3) {
    stage = maxStage(stage, "read_words");
  }

  if (hasContextCorrect || progress.correctCount >= 4) {
    stage = maxStage(stage, "read_sentences");
  }

  return stage;
}

export function applyTutorAttempt({
  progress,
  correct,
  activityType,
  selectedItemId,
  correctAnswersToKnown = DEFAULT_CORRECT_ANSWERS_TO_KNOWN,
  now = new Date(),
}: TutorAttemptInput): UserStudyProgress {
  const timestamp = now.toISOString();
  const attemptsByActivity = {
    ...progress.attemptsByActivity,
    [activityType]: (progress.attemptsByActivity[activityType] ?? 0) + 1,
  };
  const correctByActivity = {
    ...progress.correctByActivity,
    [activityType]: (progress.correctByActivity[activityType] ?? 0) + (correct ? 1 : 0),
  };
  const confusionHistory =
    !correct && selectedItemId && selectedItemId !== progress.itemId
      ? recordConfusion(progress.confusionHistory, selectedItemId, timestamp)
      : progress.confusionHistory;
  const nextProgress = {
    ...progress,
    attemptsByActivity,
    correctByActivity,
    confusionHistory,
  };

  return {
    ...nextProgress,
    status: resolveCalculatedStatus(nextProgress, correctAnswersToKnown),
    masteryStage: resolveTutorMasteryStage(nextProgress, correctAnswersToKnown),
  };
}

export function recordConfusion(confusionHistory: UserStudyProgress["confusionHistory"], confusedWithItemId: string, timestamp: string) {
  const existing = confusionHistory.find((entry) => entry.confusedWithItemId === confusedWithItemId);
  if (!existing) {
    return [...confusionHistory, { confusedWithItemId, count: 1, lastConfusedAt: timestamp }];
  }

  return confusionHistory.map((entry) =>
    entry.confusedWithItemId === confusedWithItemId
      ? { ...entry, count: entry.count + 1, lastConfusedAt: timestamp }
      : entry,
  );
}

export function findConfusionPair(itemId: string, confusedWithItemId: string | null | undefined): ConfusionPair | null {
  if (!confusedWithItemId) {
    return null;
  }

  return tutorConfusionPairs.find((pair) => pair.itemId === itemId && pair.confusedWithItemId === confusedWithItemId) ?? null;
}

export function buildTutorFeedback({
  item,
  selectedItem,
  correct,
}: {
  item: StudyItem;
  selectedItem?: StudyItem | null;
  correct: boolean;
}): TutorFeedback {
  if (correct) {
    return {
      tone: "success",
      title: "Correct.",
      message: `${item.character} is moving up the trail.`,
      nextAction: "Continue to the next prompt.",
    };
  }

  const confusionPair = findConfusionPair(item.id, selectedItem?.id);
  return {
    tone: "error",
    title: "Not this one.",
    message: confusionPair
      ? `You selected ${selectedItem?.character}. ${confusionPair.explanation}`
      : `You selected ${selectedItem?.character ?? "another symbol"}. The correct answer is ${item.character}.`,
    nextAction: "This will come back soon for extra practice.",
  };
}

function isKnown(row: UserStudyProgress, correctAnswersToKnown: number): boolean {
  return row.correctCount >= correctAnswersToKnown;
}

export function getAdaptiveReviewQueue(
  progressRows: UserStudyProgress[],
  correctAnswersToKnown = DEFAULT_CORRECT_ANSWERS_TO_KNOWN,
): UserStudyProgress[] {
  return progressRows
    .filter((row) => !row.excludedFromLessons && !isKnown(row, correctAnswersToKnown))
    .sort((a, b) => {
      const aMissedRecently = a.lastAnsweredCorrect === false ? 1 : 0;
      const bMissedRecently = b.lastAnsweredCorrect === false ? 1 : 0;
      if (aMissedRecently !== bMissedRecently) {
        return bMissedRecently - aMissedRecently;
      }

      const aConfusions = a.confusionHistory.reduce((sum, entry) => sum + entry.count, 0);
      const bConfusions = b.confusionHistory.reduce((sum, entry) => sum + entry.count, 0);
      if (aConfusions !== bConfusions) {
        return bConfusions - aConfusions;
      }

      const aNearStageAdvance = a.correctCount >= 3 ? 1 : 0;
      const bNearStageAdvance = b.correctCount >= 3 ? 1 : 0;
      if (aNearStageAdvance !== bNearStageAdvance) {
        return bNearStageAdvance - aNearStageAdvance;
      }

      const aTime = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
      const bTime = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return a.correctCount - b.correctCount;
    });
}
