import type { StudyItem } from "../../types";

type HiraganaSeedRow = {
  character: string;
  romaji: string;
  row: string;
  column: string;
  strokeCount: number;
  mnemonic: string;
  lessonHint: string;
  tags: string[];
};

const hiraganaSeedRows: HiraganaSeedRow[] = [
  { character: "あ", romaji: "a", row: "a-row", column: "a", strokeCount: 3, mnemonic: "Looks like an apple with a stem. Think 'a' for apple.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "い", romaji: "i", row: "a-row", column: "i", strokeCount: 2, mnemonic: "Two simple strokes standing together. A clean 'i' sound.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "う", romaji: "u", row: "a-row", column: "u", strokeCount: 2, mnemonic: "A curved top and sweep below. Keep it short: 'u'.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "え", romaji: "e", row: "a-row", column: "e", strokeCount: 2, mnemonic: "The lower stroke stretches out. Hear the flat 'e' sound.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "お", romaji: "o", row: "a-row", column: "o", strokeCount: 3, mnemonic: "The loop helps it stand apart. Hold the round 'o' sound.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "か", romaji: "ka", row: "k-row", column: "a", strokeCount: 3, mnemonic: "The right side kicks out. Think 'ka' with a sharp start.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "き", romaji: "ki", row: "k-row", column: "i", strokeCount: 4, mnemonic: "Three horizontal lines with a curve. 'Ki' has more structure.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "く", romaji: "ku", row: "k-row", column: "u", strokeCount: 1, mnemonic: "One hooked stroke like an open beak. 'Ku'.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "け", romaji: "ke", row: "k-row", column: "e", strokeCount: 3, mnemonic: "A vertical line with a side branch. Think 'ke' and keep it clean.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "こ", romaji: "ko", row: "k-row", column: "o", strokeCount: 2, mnemonic: "Two parallel strokes. Short and direct: 'ko'.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "さ", romaji: "sa", row: "s-row", column: "a", strokeCount: 3, mnemonic: "A crossing shape that feels brisk. 'Sa'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "し", romaji: "shi", row: "s-row", column: "i", strokeCount: 1, mnemonic: "A single curve like a smile. 'Shi'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "す", romaji: "su", row: "s-row", column: "u", strokeCount: 2, mnemonic: "Loop then line. 'Su' has a little spin to it.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "せ", romaji: "se", row: "s-row", column: "e", strokeCount: 3, mnemonic: "Several strokes and a crossing line. 'Se'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "そ", romaji: "so", row: "s-row", column: "o", strokeCount: 1, mnemonic: "One flowing stroke. Keep the sound short: 'so'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "た", romaji: "ta", row: "t-row", column: "a", strokeCount: 4, mnemonic: "It has a strong top and a drop below. 'Ta'.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "ち", romaji: "chi", row: "t-row", column: "i", strokeCount: 2, mnemonic: "A loop and trailing line. 'Chi' stands out from the row.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "つ", romaji: "tsu", row: "t-row", column: "u", strokeCount: 1, mnemonic: "A soft wave in one stroke. 'Tsu'.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "て", romaji: "te", row: "t-row", column: "e", strokeCount: 1, mnemonic: "One clear sweep. Think 'te' as in hand, て.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "と", romaji: "to", row: "t-row", column: "o", strokeCount: 2, mnemonic: "A dot and long curve. 'To'.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "な", romaji: "na", row: "n-row", column: "a", strokeCount: 4, mnemonic: "A fuller shape with a long finish. 'Na'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "に", romaji: "ni", row: "n-row", column: "i", strokeCount: 3, mnemonic: "Three short strokes. 'Ni' is compact.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "ぬ", romaji: "nu", row: "n-row", column: "u", strokeCount: 2, mnemonic: "It loops back on itself. 'Nu'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "ね", romaji: "ne", row: "n-row", column: "e", strokeCount: 4, mnemonic: "A tall left side and loop to finish. 'Ne'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "の", romaji: "no", row: "n-row", column: "o", strokeCount: 1, mnemonic: "A single loop. One of the easiest to spot: 'no'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
];

export const hiraganaPool: StudyItem[] = hiraganaSeedRows.map((row, index) => ({
  id: `hiragana_${String(index + 1).padStart(3, "0")}`,
  character: row.character,
  script: "hiragana",
  primaryMeaning: row.romaji,
  meanings: [`${row.romaji} sound`],
  onyomi: [],
  kunyomi: [row.character],
  strokeCount: row.strokeCount,
  mnemonic: row.mnemonic,
  sumoRelevant: false,
  tags: ["hiragana", row.row, ...row.tags],
  row: row.row,
  column: row.column,
  romaji: row.romaji,
  lessonHint: row.lessonHint,
}));
