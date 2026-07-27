import type { StudyStatus, UserStudyProgress } from "../types";

export const KNOWN_CORRECT_THRESHOLD = 5;

export function resolveStudyStatus(correctCount: number, incorrectCount: number): StudyStatus {
  if (correctCount === 0 && incorrectCount === 0) {
    return "new";
  }

  if (correctCount >= KNOWN_CORRECT_THRESHOLD) {
    return "known";
  }

  return "learning";
}

export class ReviewTracker {
  applyResult(progress: UserStudyProgress, correct: boolean, now: Date = new Date()): UserStudyProgress {
    const correctCount = progress.correctCount + (correct ? 1 : 0);
    const incorrectCount = progress.incorrectCount + (correct ? 0 : 1);

    return {
      ...progress,
      status: resolveStudyStatus(correctCount, incorrectCount),
      correctCount,
      incorrectCount,
      lastAnsweredCorrect: correct,
      lastReviewedAt: now.toISOString(),
    };
  }

  getQueue(progressRows: UserStudyProgress[]): UserStudyProgress[] {
    return progressRows
      .filter((row) => !row.excludedFromLessons && row.status !== "known")
      .sort((a, b) => {
        if (a.correctCount !== b.correctCount) {
          return a.correctCount - b.correctCount;
        }

        if (b.incorrectCount !== a.incorrectCount) {
          return b.incorrectCount - a.incorrectCount;
        }

        const aTime = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
        const bTime = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
        return aTime - bTime;
      });
  }
}
