import { describe, expect, it } from "vitest";

import { katakanaPool } from "../katakanaSet";

describe("katakana seed dataset", () => {
  it("contains the full basic katakana set", () => {
    expect(katakanaPool).toHaveLength(46);
  });

  it("has unique katakana characters", () => {
    const uniqueCharacters = new Set(katakanaPool.map((item) => item.character));
    expect(uniqueCharacters.size).toBe(katakanaPool.length);
  });

  it("includes final n and omits phase 2 dakuten variants", () => {
    expect(katakanaPool.some((item) => item.character === "ン" && item.romaji === "n")).toBe(true);
    expect(katakanaPool.some((item) => item.character === "ガ")).toBe(false);
    expect(katakanaPool.some((item) => item.character === "パ")).toBe(false);
  });
});
