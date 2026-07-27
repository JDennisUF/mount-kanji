import { describe, expect, it } from "vitest";

import { hiraganaPool } from "../hiraganaSet";

describe("hiragana seed dataset", () => {
  it("contains the full phase 2 hiragana set", () => {
    expect(hiraganaPool).toHaveLength(108);
  });

  it("has unique hiragana characters", () => {
    const uniqueCharacters = new Set(hiraganaPool.map((item) => item.character));
    expect(uniqueCharacters.size).toBe(hiraganaPool.length);
  });

  it("includes small kana, dakuten rows, and yoon combinations", () => {
    expect(hiraganaPool.some((item) => item.character === "ん" && item.romaji === "n")).toBe(true);
    expect(hiraganaPool.some((item) => item.character === "っ" && item.tags.includes("small-kana"))).toBe(true);
    expect(hiraganaPool.some((item) => item.character === "が" && item.tags.includes("dakuten"))).toBe(true);
    expect(hiraganaPool.some((item) => item.character === "ぱ" && item.tags.includes("handakuten"))).toBe(true);
    expect(hiraganaPool.some((item) => item.character === "きゃ" && item.tags.includes("contracted"))).toBe(true);
    expect(hiraganaPool.some((item) => item.character === "じゃ" && item.tags.includes("contracted"))).toBe(true);
  });
});
