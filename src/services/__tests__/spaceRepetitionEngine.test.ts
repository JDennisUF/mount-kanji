import { describe, expect, it } from "vitest";

import { SpaceRepetitionEngine } from "../spaceRepetitionEngine";

describe("SpaceRepetitionEngine", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");
  const engine = new SpaceRepetitionEngine();

  it("schedules again as a short retry", () => {
    const result = engine.nextReview("again", 2.5, 3, now);
    expect(result.intervalDays).toBe(0);
    expect(result.consecutiveCorrect).toBe(0);
    expect(new Date(result.nextReviewAt).toISOString()).toBe("2026-07-20T12:10:00.000Z");
  });

  it("schedules first good answer as 3 days", () => {
    const result = engine.nextReview("good", 2.5, 0, now);
    expect(result.intervalDays).toBe(3);
    expect(result.consecutiveCorrect).toBe(1);
  });

  it("grows interval for sustained easy answers", () => {
    const result = engine.nextReview("easy", 2.5, 5, now);
    expect(result.intervalDays).toBeGreaterThan(10);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });
});
