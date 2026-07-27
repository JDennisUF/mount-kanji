import { describe, expect, it } from "vitest";

import { hiraganaPool } from "../hiraganaSet";

describe("hiragana seed dataset", () => {
  it("contains the full basic hiragana set", () => {
    expect(hiraganaPool).toHaveLength(46);
  });

  it("has unique hiragana characters", () => {
    const uniqueCharacters = new Set(hiraganaPool.map((item) => item.character));
    expect(uniqueCharacters.size).toBe(hiraganaPool.length);
  });

  it("includes the final standalone n and omits dakuten variants for phase 1", () => {
    expect(hiraganaPool.some((item) => item.character === "ん" && item.romaji === "n")).toBe(true);
    expect(hiraganaPool.some((item) => item.character === "が")).toBe(false);
    expect(hiraganaPool.some((item) => item.character === "ぱ")).toBe(false);
  });
});
