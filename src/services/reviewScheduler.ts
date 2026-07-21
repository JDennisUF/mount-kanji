import type { ReviewGrade, UserKanjiProgress } from "../types";
import { SpaceRepetitionEngine } from "./spaceRepetitionEngine";

const MASTERY_MIN_STREAK = 5;
const MASTERY_MIN_ACCURACY = 0.8;

export class ReviewScheduler {
  private readonly engine = new SpaceRepetitionEngine();

  applyReview(progress: UserKanjiProgress, grade: ReviewGrade, now: Date = new Date()): UserKanjiProgress {
    const result = this.engine.nextReview(grade, progress.meaningEaseFactor, progress.consecutiveCorrect, now);
    const correct = grade !== "again";

    const correctCount = progress.correctCount + (correct ? 1 : 0);
    const incorrectCount = progress.incorrectCount + (correct ? 0 : 1);

    const attempts = correctCount + incorrectCount;
    const accuracy = attempts > 0 ? correctCount / attempts : 0;

    const meaningStatus = this.resolveStatus(result.consecutiveCorrect, accuracy, correct);

    return {
      ...progress,
      status: meaningStatus,
      meaningStatus,
      meaningEaseFactor: result.easeFactor,
      intervalDays: result.intervalDays,
      nextReviewAt: result.nextReviewAt,
      correctCount,
      incorrectCount,
      consecutiveCorrect: result.consecutiveCorrect,
      lastReviewedAt: now.toISOString(),
    };
  }

  getDue(progressRows: UserKanjiProgress[], now: Date = new Date()): UserKanjiProgress[] {
    return progressRows
      .filter((row) => row.nextReviewAt && new Date(row.nextReviewAt) <= now)
      .sort((a, b) => {
        const aTime = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }

  private resolveStatus(consecutiveCorrect: number, accuracy: number, wasCorrect: boolean) {
    if (!wasCorrect) {
      return "needs_review" as const;
    }

    if (consecutiveCorrect >= MASTERY_MIN_STREAK && accuracy >= MASTERY_MIN_ACCURACY) {
      return "mastered" as const;
    }

    if (consecutiveCorrect >= 3) {
      return "familiar" as const;
    }

    return "learning" as const;
  }
}
