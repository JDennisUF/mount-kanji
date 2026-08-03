import { describe, expect, it } from "vitest";

import { verifyHandwriting, type HandwritingStroke, type HandwritingTemplate } from "../handwritingVerifier";

const aTemplate: HandwritingTemplate = {
  character: "あ",
  strokes: [
    [
      { x: 0.24, y: 0.32 },
      { x: 0.68, y: 0.27 },
    ],
    [
      { x: 0.45, y: 0.16 },
      { x: 0.42, y: 0.48 },
      { x: 0.39, y: 0.79 },
    ],
    [
      { x: 0.65, y: 0.43 },
      { x: 0.47, y: 0.45 },
      { x: 0.27, y: 0.56 },
      { x: 0.29, y: 0.76 },
      { x: 0.53, y: 0.83 },
      { x: 0.75, y: 0.68 },
      { x: 0.72, y: 0.49 },
    ],
  ],
};

const iTemplate: HandwritingTemplate = {
  character: "い",
  strokes: [
    [
      { x: 0.32, y: 0.25 },
      { x: 0.28, y: 0.48 },
      { x: 0.34, y: 0.72 },
      { x: 0.45, y: 0.61 },
    ],
    [
      { x: 0.62, y: 0.27 },
      { x: 0.72, y: 0.48 },
      { x: 0.76, y: 0.68 },
    ],
  ],
};

const kaTemplate: HandwritingTemplate = {
  character: "か",
  strokes: [
    [
      { x: 0.18, y: 0.36 },
      { x: 0.34, y: 0.34 },
      { x: 0.52, y: 0.34 },
      { x: 0.61, y: 0.38 },
      { x: 0.58, y: 0.51 },
      { x: 0.51, y: 0.66 },
      { x: 0.42, y: 0.82 },
      { x: 0.28, y: 0.72 },
    ],
    [
      { x: 0.27, y: 0.58 },
      { x: 0.18, y: 0.74 },
    ],
    [
      { x: 0.72, y: 0.36 },
      { x: 0.82, y: 0.5 },
      { x: 0.89, y: 0.69 },
      { x: 0.88, y: 0.83 },
    ],
  ],
};

function scaleStroke(stroke: HandwritingStroke, scale: number): HandwritingStroke {
  return stroke.map((point) => ({ x: point.x * scale, y: point.y * scale }));
}

describe("verifyHandwriting", () => {
  it("rejects blank drawings", () => {
    const result = verifyHandwriting({ strokes: [] }, aTemplate);

    expect(result.accepted).toBe(false);
    expect(result.score).toBe(0);
  });

  it("accepts a matching sample", () => {
    const result = verifyHandwriting({ strokes: aTemplate.strokes }, aTemplate);

    expect(result.accepted).toBe(true);
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("accepts a matching K-row sample", () => {
    const result = verifyHandwriting({ strokes: kaTemplate.strokes }, kaTemplate);

    expect(result.accepted).toBe(true);
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("rejects very small marks", () => {
    const result = verifyHandwriting({ strokes: aTemplate.strokes.map((stroke) => scaleStroke(stroke, 0.08)) }, aTemplate);

    expect(result.accepted).toBe(false);
  });

  it("scores the correct target higher than the wrong target", () => {
    const correct = verifyHandwriting({ strokes: aTemplate.strokes }, aTemplate);
    const wrong = verifyHandwriting({ strokes: iTemplate.strokes }, aTemplate);

    expect(correct.score).toBeGreaterThan(wrong.score);
    expect(wrong.accepted).toBe(false);
  });
});
