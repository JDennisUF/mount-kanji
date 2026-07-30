import { describe, expect, it } from "vitest";

import { ReviewTracker } from "../reviewTracker";
import type { UserStudyProgress } from "../../types";

function progressSeed(overrides: Partial<UserStudyProgress> = {}): UserStudyProgress {
  return {
    id: "p1",
    itemId: "kanji_n5_001",
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
    ...overrides,
  };
}

describe("ReviewTracker", () => {
  const tracker = new ReviewTracker();

  it("records a miss without erasing prior correct answers", () => {
    const updated = tracker.applyResult(progressSeed({ correctCount: 3 }), false, new Date("2026-07-25T00:00:00.000Z"));

    expect(updated.incorrectCount).toBe(1);
    expect(updated.correctCount).toBe(3);
    expect(updated.status).toBe("learning");
  });

  it("marks an item known on the fifth correct answer", () => {
    const updated = tracker.applyResult(
      progressSeed({ correctCount: 4, incorrectCount: 2, status: "learning" }),
      true,
      new Date("2026-07-25T00:00:00.000Z"),
    );

    expect(updated.correctCount).toBe(5);
    expect(updated.status).toBe("known");
  });

  it("uses a caller-provided threshold for known status", () => {
    const updated = tracker.applyResult(
      progressSeed({ correctCount: 2, status: "learning" }),
      true,
      new Date("2026-07-25T00:00:00.000Z"),
      null,
      3,
    );

    expect(updated.correctCount).toBe(3);
    expect(updated.status).toBe("known");
  });

  it("queues non-known items first by lower correct count and ignores excluded items", () => {
    const queue = tracker.getQueue([
      progressSeed({ itemId: "a", correctCount: 2, incorrectCount: 1, status: "learning" }),
      progressSeed({ itemId: "b", correctCount: 0, incorrectCount: 3, status: "learning" }),
      progressSeed({ itemId: "c", correctCount: 5, status: "known" }),
      progressSeed({ itemId: "d", correctCount: 1, excludedFromLessons: true, status: "learning" }),
    ]);

    expect(queue.map((item) => item.itemId)).toEqual(["b", "a"]);
  });
});
