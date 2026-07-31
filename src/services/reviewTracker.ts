import type { StudyStatus, UserStudyProgress } from "../types";
import { applyTutorAttempt, getAdaptiveReviewQueue } from "./tutorEngine";

export const KNOWN_CORRECT_THRESHOLD = 5;

export function resolveStudyStatus(correctCount: number, incorrectCount: number, correctAnswersToKnown = KNOWN_CORRECT_THRESHOLD): StudyStatus {
  if (correctCount === 0 && incorrectCount === 0) {
    return "new";
  }

  if (correctCount >= correctAnswersToKnown) {
    return "known";
  }

  return "learning";
}

export class ReviewTracker {
  applyResult(
    progress: UserStudyProgress,
    correct: boolean,
    now: Date = new Date(),
    selectedItemId?: string | null,
    correctAnswersToKnown = KNOWN_CORRECT_THRESHOLD,
  ): UserStudyProgress {
    const correctCount = progress.correctCount + (correct ? 1 : 0);
    const incorrectCount = progress.incorrectCount + (correct ? 0 : 1);

    const updatedProgress = {
      ...progress,
      status: resolveStudyStatus(correctCount, incorrectCount, correctAnswersToKnown),
      correctCount,
      incorrectCount,
      lastAnsweredCorrect: correct,
      lastReviewedAt: now.toISOString(),
    };

    return applyTutorAttempt({
      progress: updatedProgress,
      correct,
      activityType: "recall_choice",
      selectedItemId,
      correctAnswersToKnown,
      now,
    });
  }

  getQueue(progressRows: UserStudyProgress[], correctAnswersToKnown = KNOWN_CORRECT_THRESHOLD): UserStudyProgress[] {
    return getAdaptiveReviewQueue(progressRows, correctAnswersToKnown);
  }
}
