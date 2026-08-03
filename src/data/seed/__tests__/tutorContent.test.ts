import { describe, expect, it } from "vitest";

import { hiraganaPool } from "../hiraganaSet";
import { getContextExamplesForItems, tutorContextExamples } from "../tutorContent";

function hiragana(characters: string[]) {
  return characters.map((character) => {
    const item = hiraganaPool.find((candidate) => candidate.character === character);
    expect(item).toBeTruthy();
    return item!;
  });
}

describe("tutor context examples", () => {
  it("keeps a broad read-the-word pool", () => {
    expect(tutorContextExamples.length).toBeGreaterThanOrEqual(40);
  });

  it("prefers exact trail-segment words before bridge words", () => {
    const examples = getContextExamplesForItems(hiragana(["か", "き", "く", "け", "こ"]), 3);

    expect(examples.map((example) => example.id)).toEqual(["context_kaki", "context_kiku", "context_koko"]);
  });

  it("does not show bridge words until every targeted symbol is available", () => {
    const focusItems = hiragana(["そ"]);

    expect(getContextExamplesForItems(focusItems, 3).map((example) => example.id)).not.toContain("context_soko");
    expect(getContextExamplesForItems(focusItems, 3, [...focusItems, ...hiragana(["こ"])]).map((example) => example.id)).toContain("context_soko");
  });
});
