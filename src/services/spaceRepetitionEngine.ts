import type { ReviewGrade } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewResult {
  nextReviewAt: string;
  intervalDays: number;
  easeFactor: number;
  consecutiveCorrect: number;
}

export class SpaceRepetitionEngine {
  private static readonly MIN_EASE = 1.3;

  nextReview(
    grade: ReviewGrade,
    currentEaseFactor: number,
    consecutiveCorrect: number,
    now: Date = new Date(),
  ): ReviewResult {
    if (grade === "again") {
      const nextReviewAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      return {
        nextReviewAt,
        intervalDays: 0,
        easeFactor: Math.max(SpaceRepetitionEngine.MIN_EASE, currentEaseFactor - 0.2),
        consecutiveCorrect: 0,
      };
    }

    const adjustedEase = this.adjustEaseFactor(grade, currentEaseFactor);
    const updatedStreak = consecutiveCorrect + 1;
    const intervalDays = this.resolveIntervalDays(grade, updatedStreak, adjustedEase);
    const nextReviewAt = new Date(now.getTime() + intervalDays * DAY_MS).toISOString();

    return {
      nextReviewAt,
      intervalDays,
      easeFactor: adjustedEase,
      consecutiveCorrect: updatedStreak,
    };
  }

  private adjustEaseFactor(grade: Exclude<ReviewGrade, "again">, currentEaseFactor: number): number {
    if (grade === "easy") {
      return currentEaseFactor + 0.15;
    }

    if (grade === "hard") {
      return Math.max(SpaceRepetitionEngine.MIN_EASE, currentEaseFactor - 0.05);
    }

    return currentEaseFactor;
  }

  private resolveIntervalDays(
    grade: Exclude<ReviewGrade, "again">,
    streak: number,
    easeFactor: number,
  ): number {
    if (streak === 1) {
      return grade === "hard" ? 1 : 3;
    }

    if (streak === 2) {
      if (grade === "hard") {
        return 3;
      }
      if (grade === "good") {
        return 7;
      }
      return 14;
    }

    const multiplier = grade === "hard" ? 0.8 : grade === "good" ? 1 : 1.25;
    return Math.max(1, Math.round(streak * easeFactor * multiplier));
  }
}
