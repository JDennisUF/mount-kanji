export interface HandwritingPoint {
  x: number;
  y: number;
}

export type HandwritingStroke = HandwritingPoint[];

export interface HandwritingSample {
  strokes: HandwritingStroke[];
}

export interface HandwritingTemplate {
  character: string;
  strokes: HandwritingStroke[];
  aliases?: string[];
}

export interface HandwritingVerificationResult {
  accepted: boolean;
  score: number;
  coverageScore: number;
  strokeScore: number;
  aspectScore: number;
  centerScore: number;
  message: string;
}

const RESAMPLED_POINTS_PER_STROKE = 24;
const MIN_TOTAL_POINTS = 6;
const MIN_SIZE = 0.16;
const ACCEPTANCE_SCORE = 0.7;

function distance(a: HandwritingPoint, b: HandwritingPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getBounds(strokes: HandwritingStroke[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null {
  const points = strokes.flat();
  if (points.length === 0) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function normalizeStrokes(strokes: HandwritingStroke[]): HandwritingStroke[] {
  const bounds = getBounds(strokes);
  if (!bounds) {
    return [];
  }

  const scale = Math.max(bounds.width, bounds.height, 0.001);
  const offsetX = (1 - bounds.width / scale) / 2;
  const offsetY = (1 - bounds.height / scale) / 2;

  return strokes.map((stroke) =>
    stroke.map((point) => ({
      x: offsetX + (point.x - bounds.minX) / scale,
      y: offsetY + (point.y - bounds.minY) / scale,
    })),
  );
}

function pathLength(stroke: HandwritingStroke): number {
  return stroke.reduce((sum, point, index) => (index === 0 ? sum : sum + distance(stroke[index - 1], point)), 0);
}

function resampleStroke(stroke: HandwritingStroke, pointCount = RESAMPLED_POINTS_PER_STROKE): HandwritingStroke {
  if (stroke.length === 0) {
    return [];
  }

  if (stroke.length === 1) {
    return Array.from({ length: pointCount }, () => stroke[0]);
  }

  const totalLength = pathLength(stroke);
  if (totalLength === 0) {
    return Array.from({ length: pointCount }, () => stroke[0]);
  }

  const result: HandwritingStroke = [stroke[0]];
  let segmentStartIndex = 1;
  let segmentStartPoint = stroke[0];
  let remainingDistance = totalLength / (pointCount - 1);

  while (segmentStartIndex < stroke.length && result.length < pointCount) {
    const segmentEndPoint = stroke[segmentStartIndex];
    const segmentLength = distance(segmentStartPoint, segmentEndPoint);

    if (segmentLength >= remainingDistance) {
      const ratio = remainingDistance / segmentLength;
      const nextPoint = {
        x: segmentStartPoint.x + (segmentEndPoint.x - segmentStartPoint.x) * ratio,
        y: segmentStartPoint.y + (segmentEndPoint.y - segmentStartPoint.y) * ratio,
      };
      result.push(nextPoint);
      segmentStartPoint = nextPoint;
      remainingDistance = totalLength / (pointCount - 1);
    } else {
      remainingDistance -= segmentLength;
      segmentStartPoint = segmentEndPoint;
      segmentStartIndex += 1;
    }
  }

  while (result.length < pointCount) {
    result.push(stroke[stroke.length - 1]);
  }

  return result;
}

function compareStrokeShapes(userStrokes: HandwritingStroke[], templateStrokes: HandwritingStroke[]): number {
  const count = Math.min(userStrokes.length, templateStrokes.length);
  if (count === 0) {
    return 0;
  }

  let total = 0;
  for (let index = 0; index < count; index += 1) {
    const user = resampleStroke(userStrokes[index]);
    const template = resampleStroke(templateStrokes[index]);
    const meanDistance =
      user.reduce((sum, point, pointIndex) => sum + distance(point, template[pointIndex]), 0) / Math.max(user.length, 1);
    total += clamp(1 - meanDistance / 0.42, 0, 1);
  }

  return total / count;
}

function getAspectScore(userBounds: NonNullable<ReturnType<typeof getBounds>>, templateBounds: NonNullable<ReturnType<typeof getBounds>>): number {
  const userAspect = userBounds.width / Math.max(userBounds.height, 0.001);
  const templateAspect = templateBounds.width / Math.max(templateBounds.height, 0.001);
  return clamp(1 - Math.abs(userAspect - templateAspect) / Math.max(templateAspect, 0.4), 0, 1);
}

function getCenterScore(userBounds: NonNullable<ReturnType<typeof getBounds>>, templateBounds: NonNullable<ReturnType<typeof getBounds>>): number {
  const userCenter = { x: userBounds.minX + userBounds.width / 2, y: userBounds.minY + userBounds.height / 2 };
  const templateCenter = { x: templateBounds.minX + templateBounds.width / 2, y: templateBounds.minY + templateBounds.height / 2 };
  return clamp(1 - distance(userCenter, templateCenter) / 0.28, 0, 1);
}

function getSizeScore(bounds: NonNullable<ReturnType<typeof getBounds>>): number {
  const size = Math.max(bounds.width, bounds.height);
  if (size < MIN_SIZE) {
    return 0;
  }
  return clamp(size / 0.42, 0, 1);
}

export function verifyHandwriting(sample: HandwritingSample, template: HandwritingTemplate): HandwritingVerificationResult {
  const userPointCount = sample.strokes.flat().length;
  if (userPointCount < MIN_TOTAL_POINTS) {
    return {
      accepted: false,
      score: 0,
      coverageScore: 0,
      strokeScore: 0,
      aspectScore: 0,
      centerScore: 0,
      message: "Draw the character before checking it.",
    };
  }

  const rawUserBounds = getBounds(sample.strokes);
  if (!rawUserBounds || getSizeScore(rawUserBounds) === 0) {
    return {
      accepted: false,
      score: 0.1,
      coverageScore: 0,
      strokeScore: 0,
      aspectScore: 0,
      centerScore: 0,
      message: "Draw it larger inside the practice square.",
    };
  }

  const normalizedUser = normalizeStrokes(sample.strokes);
  const normalizedTemplate = normalizeStrokes(template.strokes);
  const userBounds = getBounds(normalizedUser);
  const templateBounds = getBounds(normalizedTemplate);
  if (!userBounds || !templateBounds) {
    return {
      accepted: false,
      score: 0,
      coverageScore: 0,
      strokeScore: 0,
      aspectScore: 0,
      centerScore: 0,
      message: "Draw the character before checking it.",
    };
  }

  const strokeScore = compareStrokeShapes(normalizedUser, normalizedTemplate);
  const strokeCountDelta = Math.abs(sample.strokes.length - template.strokes.length);
  const coverageScore = clamp(1 - strokeCountDelta / Math.max(template.strokes.length, 1), 0, 1);
  const aspectScore = getAspectScore(userBounds, templateBounds);
  const centerScore = getCenterScore(userBounds, templateBounds);
  const score = strokeScore * 0.58 + coverageScore * 0.18 + aspectScore * 0.14 + centerScore * 0.1;
  const accepted = score >= ACCEPTANCE_SCORE;

  let message = accepted ? `That looks like ${template.character}.` : "Match the overall shape more closely.";
  if (!accepted && coverageScore < 0.65) {
    message = `Use about ${template.strokes.length} stroke${template.strokes.length === 1 ? "" : "s"} for this character.`;
  } else if (!accepted && aspectScore < 0.55) {
    message = "Check the width and height of your drawing.";
  } else if (!accepted && centerScore < 0.55) {
    message = "Keep the drawing centered in the practice square.";
  }

  return {
    accepted,
    score,
    coverageScore,
    strokeScore,
    aspectScore,
    centerScore,
    message,
  };
}

