import { describe, expect, it } from "vitest";

import { beginnerKanjiPool } from "../../data/seed/beginnerSet";
import { hiraganaPool } from "../../data/seed/hiraganaSet";
import { applyTutorAttempt, buildTutorFeedback, getAdaptiveReviewQueue } from "../tutorEngine";
import type { UserStudyProgress } from "../../types";

function progressSeed(overrides: Partial<UserStudyProgress> = {}): UserStudyProgress {
  return {
    id: "p1",
    itemId: "hiragana_001",
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

describe("tutorEngine", () => {
  it("advances from teach into recognition after a teach activity", () => {
    const updated = applyTutorAttempt({
      progress: progressSeed(),
      correct: true,
      activityType: "teach_card",
      now: new Date("2026-07-25T00:00:00.000Z"),
    });

    expect(updated.masteryStage).toBe("recognize");
    expect(updated.attemptsByActivity.teach_card).toBe(1);
  });

  it("records confusion history for incorrect selected symbols", () => {
    const updated = applyTutorAttempt({
      progress: progressSeed({ itemId: "hiragana_034", incorrectCount: 1, status: "learning" }),
      correct: false,
      activityType: "recall_choice",
      selectedItemId: "hiragana_023",
      now: new Date("2026-07-25T00:00:00.000Z"),
    });

    expect(updated.confusionHistory).toEqual([
      {
        confusedWithItemId: "hiragana_023",
        count: 1,
        lastConfusedAt: "2026-07-25T00:00:00.000Z",
      },
    ]);
  });

  it("uses authored confusion feedback when a known pair is missed", () => {
    const me = hiraganaPool.find((item) => item.character === "め");
    const nu = hiraganaPool.find((item) => item.character === "ぬ");

    expect(me).toBeTruthy();
    expect(nu).toBeTruthy();

    const feedback = buildTutorFeedback({
      item: me!,
      selectedItem: nu!,
      correct: false,
    });

    expect(feedback.tone).toBe("error");
    expect(feedback.message).toContain("extra tail");
  });

  it("prioritizes recent misses and confusions before stale ordinary rows", () => {
    const queue = getAdaptiveReviewQueue([
      progressSeed({ itemId: "ordinary", correctCount: 0, lastReviewedAt: "2026-07-20T00:00:00.000Z" }),
      progressSeed({
        itemId: "confused",
        correctCount: 1,
        confusionHistory: [{ confusedWithItemId: "other", count: 2, lastConfusedAt: "2026-07-24T00:00:00.000Z" }],
        lastReviewedAt: "2026-07-24T00:00:00.000Z",
      }),
      progressSeed({ itemId: "missed", correctCount: 2, lastAnsweredCorrect: false, lastReviewedAt: "2026-07-25T00:00:00.000Z" }),
      progressSeed({ itemId: "known", status: "known", correctCount: 5 }),
    ]);

    expect(queue.map((row) => row.itemId)).toEqual(["missed", "confused", "ordinary"]);
  });

  it("builds successful feedback without AI-generated text", () => {
    const yama = beginnerKanjiPool.find((item) => item.character === "山");

    expect(yama).toBeTruthy();

    const feedback = buildTutorFeedback({ item: yama!, correct: true });

    expect(feedback).toEqual({
      tone: "success",
      title: "Correct.",
      message: "山 is moving up the trail.",
      nextAction: "Continue to the next prompt.",
    });
  });
});
