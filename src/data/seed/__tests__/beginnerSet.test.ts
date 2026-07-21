import { describe, expect, it } from "vitest";

import { beginnerKanjiPool } from "../beginnerSet";

describe("N5 beginner dataset", () => {
  it("contains 100 kanji for MVP", () => {
    expect(beginnerKanjiPool).toHaveLength(100);
  });

  it("has unique kanji characters", () => {
    const uniqueCharacters = new Set(beginnerKanjiPool.map((kanji) => kanji.character));
    expect(uniqueCharacters.size).toBe(beginnerKanjiPool.length);
  });

  it("marks all rows as N5", () => {
    const nonN5 = beginnerKanjiPool.filter((kanji) => kanji.jlptLevel !== "N5");
    expect(nonN5).toHaveLength(0);
  });
});
