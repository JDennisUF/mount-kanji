import { describe, expect, it } from "vitest";

import { beginnerKanjiPool } from "../beginnerSet";

describe("seed kanji dataset", () => {
  it("contains the expanded N5, N4, and N3 seed pool", () => {
    expect(beginnerKanjiPool).toHaveLength(612);
  });

  it("has unique kanji characters", () => {
    const uniqueCharacters = new Set(beginnerKanjiPool.map((kanji) => kanji.character));
    expect(uniqueCharacters.size).toBe(beginnerKanjiPool.length);
  });

  it("keeps the expected per-level counts", () => {
    const counts = beginnerKanjiPool.reduce<Record<string, number>>((accumulator, kanji) => {
      const level = kanji.jlptLevel ?? "unknown";
      accumulator[level] = (accumulator[level] ?? 0) + 1;
      return accumulator;
    }, {});

    expect(counts.N5).toBe(100);
    expect(counts.N4).toBe(145);
    expect(counts.N3).toBe(367);
  });

  it("marks sumo-relevant JLPT kanji with the sumo tag", () => {
    const sumoKanji = beginnerKanjiPool.filter((kanji) => kanji.sumoRelevant);

    expect(sumoKanji.length).toBe(207);
    expect(sumoKanji.every((kanji) => kanji.tags.includes("sumo"))).toBe(true);
    expect(sumoKanji.some((kanji) => kanji.character === "横")).toBe(true);
    expect(sumoKanji.some((kanji) => kanji.character === "勝")).toBe(true);
  });
});
