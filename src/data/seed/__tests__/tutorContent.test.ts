import { describe, expect, it } from "vitest";

import { beginnerKanjiPool } from "../beginnerSet";
import { hiraganaPool } from "../hiraganaSet";
import { katakanaPool } from "../katakanaSet";
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
    expect(tutorContextExamples.length).toBeGreaterThanOrEqual(250);
  });

  it("targets visible study symbols", () => {
    const itemById = new Map([...hiraganaPool, ...katakanaPool, ...beginnerKanjiPool].map((item) => [item.id, item]));

    for (const example of tutorContextExamples) {
      for (const itemId of example.targetItemIds) {
        const item = itemById.get(itemId);

        expect(item, `${example.id} targets a seeded study item`).toBeTruthy();
        expect(example.written, `${example.id} includes ${item!.character}`).toContain(item!.character);
      }
    }
  });

  it("prefers exact trail-segment words before bridge words", () => {
    const focusItems = hiragana(["か", "き", "く", "け", "こ"]);
    const focusItemIds = new Set(focusItems.map((item) => item.id));
    const examples = getContextExamplesForItems(focusItems, 8, [...focusItems, ...hiragana(["あ", "い", "お", "さ"])]);

    expect(examples.slice(0, 4).every((example) => example.targetItemIds.every((itemId) => focusItemIds.has(itemId)))).toBe(true);
    expect(examples.slice(4).some((example) => example.targetItemIds.some((itemId) => !focusItemIds.has(itemId)))).toBe(true);
  });

  it("does not show bridge words until every targeted symbol is available", () => {
    const focusItems = hiragana(["そ"]);

    expect(getContextExamplesForItems(focusItems, 3).map((example) => example.id)).not.toContain("context_soko");
    expect(getContextExamplesForItems(focusItems, 3, [...focusItems, ...hiragana(["こ"])]).map((example) => example.id)).toContain("context_soko");
  });
});
