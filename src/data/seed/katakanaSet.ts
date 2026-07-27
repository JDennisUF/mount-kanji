import type { StudyItem } from "../../types";

type KatakanaSeedRow = {
  character: string;
  romaji: string;
  row: string;
  column: string;
  strokeCount: number;
  mnemonic: string;
  lessonHint: string;
  tags: string[];
};

const katakanaSeedRows: KatakanaSeedRow[] = [
  { character: "ア", romaji: "a", row: "a-row", column: "a", strokeCount: 2, mnemonic: "A sharp angled opening. Think 'a' with clean edges.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "イ", romaji: "i", row: "a-row", column: "i", strokeCount: 2, mnemonic: "Two clean lines. A direct katakana 'i'.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "ウ", romaji: "u", row: "a-row", column: "u", strokeCount: 3, mnemonic: "Top marks over a vertical body. Short 'u'.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "エ", romaji: "e", row: "a-row", column: "e", strokeCount: 3, mnemonic: "Horizontal bars with a center line. Flat 'e'.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "オ", romaji: "o", row: "a-row", column: "o", strokeCount: 3, mnemonic: "Like ア with one more stroke. Round 'o'.", lessonHint: "Pure vowel", tags: ["vowel", "basic"] },
  { character: "カ", romaji: "ka", row: "k-row", column: "a", strokeCount: 2, mnemonic: "One short and one sweeping stroke. 'Ka'.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "キ", romaji: "ki", row: "k-row", column: "i", strokeCount: 3, mnemonic: "Three strong lines. Structured 'ki'.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "ク", romaji: "ku", row: "k-row", column: "u", strokeCount: 2, mnemonic: "A small angle opening outward. 'Ku'.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "ケ", romaji: "ke", row: "k-row", column: "e", strokeCount: 3, mnemonic: "A long line with a small side mark. 'Ke'.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "コ", romaji: "ko", row: "k-row", column: "o", strokeCount: 2, mnemonic: "Two horizontal bars, square and simple. 'Ko'.", lessonHint: "K-row", tags: ["k-row", "basic"] },
  { character: "サ", romaji: "sa", row: "s-row", column: "a", strokeCount: 3, mnemonic: "Crossing lines with a clean right edge. 'Sa'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "シ", romaji: "shi", row: "s-row", column: "i", strokeCount: 3, mnemonic: "Three marks with the longer sweep below. 'Shi'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "ス", romaji: "su", row: "s-row", column: "u", strokeCount: 2, mnemonic: "A top tick and long drop. 'Su'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "セ", romaji: "se", row: "s-row", column: "e", strokeCount: 2, mnemonic: "Crossing line and long baseline. 'Se'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "ソ", romaji: "so", row: "s-row", column: "o", strokeCount: 2, mnemonic: "Two marks with the longer sweep rising. 'So'.", lessonHint: "S-row", tags: ["s-row", "basic"] },
  { character: "タ", romaji: "ta", row: "t-row", column: "a", strokeCount: 3, mnemonic: "A compact top with a longer tail. 'Ta'.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "チ", romaji: "chi", row: "t-row", column: "i", strokeCount: 3, mnemonic: "Top bar and descending shape. 'Chi'.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "ツ", romaji: "tsu", row: "t-row", column: "u", strokeCount: 3, mnemonic: "Three marks with the longest drop on the right. 'Tsu'.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "テ", romaji: "te", row: "t-row", column: "e", strokeCount: 3, mnemonic: "Three bars stacked cleanly. 'Te'.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "ト", romaji: "to", row: "t-row", column: "o", strokeCount: 2, mnemonic: "One vertical stroke with a dot beside it. 'To'.", lessonHint: "T-row", tags: ["t-row", "basic"] },
  { character: "ナ", romaji: "na", row: "n-row", column: "a", strokeCount: 2, mnemonic: "A crossing pair of lines. 'Na'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "ニ", romaji: "ni", row: "n-row", column: "i", strokeCount: 2, mnemonic: "Two horizontal bars only. 'Ni'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "ヌ", romaji: "nu", row: "n-row", column: "u", strokeCount: 2, mnemonic: "A cross and sweep finish. 'Nu'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "ネ", romaji: "ne", row: "n-row", column: "e", strokeCount: 4, mnemonic: "A vertical line with a split finish. 'Ne'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "ノ", romaji: "no", row: "n-row", column: "o", strokeCount: 1, mnemonic: "A single diagonal stroke. 'No'.", lessonHint: "N-row", tags: ["n-row", "basic"] },
  { character: "ハ", romaji: "ha", row: "h-row", column: "a", strokeCount: 2, mnemonic: "Two diverging strokes. 'Ha'.", lessonHint: "H-row", tags: ["h-row", "basic"] },
  { character: "ヒ", romaji: "hi", row: "h-row", column: "i", strokeCount: 2, mnemonic: "A top line with a curved drop. 'Hi'.", lessonHint: "H-row", tags: ["h-row", "basic"] },
  { character: "フ", romaji: "fu", row: "h-row", column: "u", strokeCount: 1, mnemonic: "One angular curve. 'Fu'.", lessonHint: "H-row", tags: ["h-row", "basic"] },
  { character: "ヘ", romaji: "he", row: "h-row", column: "e", strokeCount: 1, mnemonic: "One simple angle. Standalone katakana 'he'.", lessonHint: "H-row", tags: ["h-row", "basic"] },
  { character: "ホ", romaji: "ho", row: "h-row", column: "o", strokeCount: 4, mnemonic: "Crossing bars with a center stem. 'Ho'.", lessonHint: "H-row", tags: ["h-row", "basic"] },
  { character: "マ", romaji: "ma", row: "m-row", column: "a", strokeCount: 2, mnemonic: "A top line and angled finish. 'Ma'.", lessonHint: "M-row", tags: ["m-row", "basic"] },
  { character: "ミ", romaji: "mi", row: "m-row", column: "i", strokeCount: 3, mnemonic: "Three slanted lines stacked apart. 'Mi'.", lessonHint: "M-row", tags: ["m-row", "basic"] },
  { character: "ム", romaji: "mu", row: "m-row", column: "u", strokeCount: 2, mnemonic: "A pointed angle with a trailing line. 'Mu'.", lessonHint: "M-row", tags: ["m-row", "basic"] },
  { character: "メ", romaji: "me", row: "m-row", column: "e", strokeCount: 2, mnemonic: "A crossing slash pair. 'Me'.", lessonHint: "M-row", tags: ["m-row", "basic"] },
  { character: "モ", romaji: "mo", row: "m-row", column: "o", strokeCount: 3, mnemonic: "Horizontal bars with a center line. 'Mo'.", lessonHint: "M-row", tags: ["m-row", "basic"] },
  { character: "ヤ", romaji: "ya", row: "y-row", column: "a", strokeCount: 2, mnemonic: "Short top mark with a long right branch. 'Ya'.", lessonHint: "Y-row", tags: ["y-row", "basic"] },
  { character: "ユ", romaji: "yu", row: "y-row", column: "u", strokeCount: 2, mnemonic: "A squared top over a lower base. 'Yu'.", lessonHint: "Y-row", tags: ["y-row", "basic"] },
  { character: "ヨ", romaji: "yo", row: "y-row", column: "o", strokeCount: 3, mnemonic: "A vertical spine with three bars. 'Yo'.", lessonHint: "Y-row", tags: ["y-row", "basic"] },
  { character: "ラ", romaji: "ra", row: "r-row", column: "a", strokeCount: 2, mnemonic: "Top mark with a clean drop. 'Ra'.", lessonHint: "R-row", tags: ["r-row", "basic"] },
  { character: "リ", romaji: "ri", row: "r-row", column: "i", strokeCount: 2, mnemonic: "Two separate drops. 'Ri'.", lessonHint: "R-row", tags: ["r-row", "basic"] },
  { character: "ル", romaji: "ru", row: "r-row", column: "u", strokeCount: 2, mnemonic: "A left line and hooked right stroke. 'Ru'.", lessonHint: "R-row", tags: ["r-row", "basic"] },
  { character: "レ", romaji: "re", row: "r-row", column: "e", strokeCount: 1, mnemonic: "One angled descending stroke. 'Re'.", lessonHint: "R-row", tags: ["r-row", "basic"] },
  { character: "ロ", romaji: "ro", row: "r-row", column: "o", strokeCount: 3, mnemonic: "A clean square outline. 'Ro'.", lessonHint: "R-row", tags: ["r-row", "basic"] },
  { character: "ワ", romaji: "wa", row: "w-row", column: "a", strokeCount: 2, mnemonic: "A top line and open right side. 'Wa'.", lessonHint: "W-row", tags: ["w-row", "basic"] },
  { character: "ヲ", romaji: "wo", row: "w-row", column: "o", strokeCount: 3, mnemonic: "Katakana wo appears mostly in special contexts. Sound it as 'wo'.", lessonHint: "W-row", tags: ["w-row", "basic"] },
  { character: "ン", romaji: "n", row: "n-final", column: "n", strokeCount: 2, mnemonic: "Two angled strokes. Final standalone 'n'.", lessonHint: "Standalone final sound", tags: ["n-final", "basic"] },
];

export const katakanaPool: StudyItem[] = katakanaSeedRows.map((row, index) => ({
  id: `katakana_${String(index + 1).padStart(3, "0")}`,
  character: row.character,
  script: "katakana",
  primaryMeaning: row.romaji,
  meanings: [`${row.romaji} sound`],
  onyomi: [],
  kunyomi: [row.character],
  strokeCount: row.strokeCount,
  mnemonic: row.mnemonic,
  sumoRelevant: false,
  tags: ["katakana", row.row, ...row.tags],
  row: row.row,
  column: row.column,
  romaji: row.romaji,
  lessonHint: row.lessonHint,
}));
