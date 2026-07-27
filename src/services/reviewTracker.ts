import type { StudyStatus, UserStudyProgress } from "../types";

const MAX_REVIEW_WEIGHT = 10;
const WRONG_REVIEW_PENALTY = 3;
const CORRECT_REVIEW_REDUCTION = 1;

export function resolveKanjiStatus(correctCount: number, incorrectCount: number, currentStreak: number): StudyStatus {
  if (correctCount === 0 && incorrectCount === 0) {
    return "new";
  }

  const totalAttempts = correctCount + incorrectCount;
  const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;

  if (correctCount >= 8 && accuracy >= 0.9 && currentStreak >= 5) {
    return "mastered";
  }

  if (correctCount >= 3 || currentStreak >= 3) {
    return "familiar";
  }

  return "learning";
}

export class ReviewTracker {
  applyResult(progress: UserStudyProgress, correct: boolean, now: Date = new Date()): UserStudyProgress {
    const correctCount = progress.correctCount + (correct ? 1 : 0);
    const incorrectCount = progress.incorrectCount + (correct ? 0 : 1);
    const currentStreak = correct ? progress.currentStreak + 1 : 0;
    const bestStreak = correct ? Math.max(progress.bestStreak, currentStreak) : progress.bestStreak;
    const reviewWeight = correct
      ? Math.max(0, progress.reviewWeight - CORRECT_REVIEW_REDUCTION)
      : Math.min(MAX_REVIEW_WEIGHT, progress.reviewWeight + WRONG_REVIEW_PENALTY);

    return {
      ...progress,
      status: resolveKanjiStatus(correctCount, incorrectCount, currentStreak),
      correctCount,
      incorrectCount,
      currentStreak,
      bestStreak,
      reviewWeight,
      lastAnsweredCorrect: correct,
      lastReviewedAt: now.toISOString(),
    };
  }

  getQueue(progressRows: UserStudyProgress[]): UserStudyProgress[] {
    return progressRows
      .filter((row) => !row.excludedFromLessons && row.reviewWeight > 0)
      .sort((a, b) => {
        if (b.reviewWeight !== a.reviewWeight) {
          return b.reviewWeight - a.reviewWeight;
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
