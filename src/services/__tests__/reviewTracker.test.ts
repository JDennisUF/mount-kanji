import { describe, expect, it } from "vitest";

import { ReviewTracker } from "../reviewTracker";
import type { UserStudyProgress } from "../../types";

function progressSeed(overrides: Partial<UserStudyProgress> = {}): UserStudyProgress {
  return {
    id: "p1",
    itemId: "kanji_n5_001",
    status: "new",
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    reviewWeight: 0,
    excludedFromLessons: false,
    lastAnsweredCorrect: null,
    lastReviewedAt: null,
    ...overrides,
  };
}

describe("ReviewTracker", () => {
  const tracker = new ReviewTracker();

  it("increases review weight and resets streak on a miss", () => {
    const updated = tracker.applyResult(progressSeed({ currentStreak: 3 }), false, new Date("2026-07-25T00:00:00.000Z"));

    expect(updated.incorrectCount).toBe(1);
    expect(updated.currentStreak).toBe(0);
    expect(updated.reviewWeight).toBe(3);
    expect(updated.status).toBe("learning");
  });

  it("reduces review weight after a correct answer", () => {
    const updated = tracker.applyResult(
      progressSeed({ correctCount: 2, currentStreak: 2, bestStreak: 2, reviewWeight: 4 }),
      true,
      new Date("2026-07-25T00:00:00.000Z"),
    );

    expect(updated.correctCount).toBe(3);
    expect(updated.currentStreak).toBe(3);
    expect(updated.bestStreak).toBe(3);
    expect(updated.reviewWeight).toBe(3);
    expect(updated.status).toBe("familiar");
  });

  it("sorts review queue by weight and ignores excluded kanji", () => {
    const queue = tracker.getQueue([
      progressSeed({ itemId: "a", reviewWeight: 1 }),
      progressSeed({ itemId: "b", reviewWeight: 5 }),
      progressSeed({ itemId: "c", reviewWeight: 8, excludedFromLessons: true }),
    ]);

    expect(queue.map((item) => item.itemId)).toEqual(["b", "a"]);
  });
});
