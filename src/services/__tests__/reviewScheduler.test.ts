import { describe, expect, it } from "vitest";

import { ReviewScheduler } from "../reviewScheduler";
import type { UserKanjiProgress } from "../../types";

function progressSeed(overrides: Partial<UserKanjiProgress> = {}): UserKanjiProgress {
  return {
    id: "p1",
    kanjiId: "kanji_n5_001",
    status: "learning",
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: null,
    correctCount: 0,
    incorrectCount: 0,
    consecutiveCorrect: 0,
    lastReviewedAt: null,
    meaningStatus: "learning",
    meaningEaseFactor: 2.5,
    readingStatus: "new",
    readingEaseFactor: 2.5,
    ...overrides,
  };
}

describe("ReviewScheduler mastery rule", () => {
  const scheduler = new ReviewScheduler();

  it("does not mark mastered before five consecutive correct answers", () => {
    const row = progressSeed({ correctCount: 4, incorrectCount: 0, consecutiveCorrect: 4 });
    const updated = scheduler.applyReview(row, "good", new Date("2026-07-21T00:00:00.000Z"));
    expect(updated.status).toBe("mastered");

    const preMaster = progressSeed({ correctCount: 3, incorrectCount: 0, consecutiveCorrect: 3 });
    const updatedPreMaster = scheduler.applyReview(preMaster, "good", new Date("2026-07-21T00:00:00.000Z"));
    expect(updatedPreMaster.status).not.toBe("mastered");
  });

  it("requires at least 80 percent accuracy to become mastered", () => {
    const row = progressSeed({ correctCount: 4, incorrectCount: 4, consecutiveCorrect: 4 });
    const updated = scheduler.applyReview(row, "good", new Date("2026-07-21T00:00:00.000Z"));
    expect(updated.status).not.toBe("mastered");

    const strongAccuracy = progressSeed({ correctCount: 8, incorrectCount: 1, consecutiveCorrect: 4 });
    const updatedStrong = scheduler.applyReview(strongAccuracy, "good", new Date("2026-07-21T00:00:00.000Z"));
    expect(updatedStrong.status).toBe("mastered");
  });

  it("marks missed answers as needs_review", () => {
    const row = progressSeed({ status: "familiar", correctCount: 7, incorrectCount: 1, consecutiveCorrect: 4 });
    const updated = scheduler.applyReview(row, "again", new Date("2026-07-21T00:00:00.000Z"));
    expect(updated.status).toBe("needs_review");
    expect(updated.consecutiveCorrect).toBe(0);
  });
});
