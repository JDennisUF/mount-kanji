import { describe, expect, it } from "vitest";

import { katakanaPool } from "../katakanaSet";

describe("katakana seed dataset", () => {
  it("contains the full phase 2 katakana set", () => {
    expect(katakanaPool).toHaveLength(108);
  });

  it("has unique katakana characters", () => {
    const uniqueCharacters = new Set(katakanaPool.map((item) => item.character));
    expect(uniqueCharacters.size).toBe(katakanaPool.length);
  });

  it("includes small kana, dakuten rows, and yoon combinations", () => {
    expect(katakanaPool.some((item) => item.character === "ン" && item.romaji === "n")).toBe(true);
    expect(katakanaPool.some((item) => item.character === "ッ" && item.tags.includes("small-kana"))).toBe(true);
    expect(katakanaPool.some((item) => item.character === "ガ" && item.tags.includes("dakuten"))).toBe(true);
    expect(katakanaPool.some((item) => item.character === "パ" && item.tags.includes("handakuten"))).toBe(true);
    expect(katakanaPool.some((item) => item.character === "キャ" && item.tags.includes("contracted"))).toBe(true);
    expect(katakanaPool.some((item) => item.character === "ジャ" && item.tags.includes("contracted"))).toBe(true);
  });
});
