import { katakanaPool } from "./katakanaSet";
import type { SeedLesson } from "./lessonCatalog";

const itemIdByCharacter = new Map(katakanaPool.map((item) => [item.character, item.id]));

function idsForCharacters(characters: string[]): string[] {
  return characters.map((character) => itemIdByCharacter.get(character)).filter(Boolean) as string[];
}

const lessonDefinitions: Array<{ title: string; focus: string; characters: string[] }> = [
  { title: "Vowel Ridge", focus: "Pure vowel sounds", characters: ["ア", "イ", "ウ", "エ", "オ"] },
  { title: "K Row Climb", focus: "K-row recognition", characters: ["カ", "キ", "ク", "ケ", "コ"] },
  { title: "S Row Switchbacks", focus: "S-row recognition", characters: ["サ", "シ", "ス", "セ", "ソ"] },
  { title: "T Row Traverse", focus: "T-row recognition", characters: ["タ", "チ", "ツ", "テ", "ト"] },
  { title: "N Row Notch", focus: "N-row recognition", characters: ["ナ", "ニ", "ヌ", "ネ", "ノ"] },
  { title: "H Row Hollow", focus: "H-row recognition", characters: ["ハ", "ヒ", "フ", "ヘ", "ホ"] },
  { title: "M Row Meadow", focus: "M-row recognition", characters: ["マ", "ミ", "ム", "メ", "モ"] },
  { title: "Y Row Yard", focus: "Y-row recognition", characters: ["ヤ", "ユ", "ヨ"] },
  { title: "R Row Run", focus: "R-row recognition", characters: ["ラ", "リ", "ル", "レ", "ロ"] },
  { title: "W Row Wind", focus: "W-row and final n", characters: ["ワ", "ヲ", "ン"] },
  { title: "Small Kana Pocket", focus: "Small kana support sounds", characters: ["ッ", "ャ", "ュ", "ョ"] },
  { title: "G Row Gorge", focus: "Dakuten on the K-row", characters: ["ガ", "ギ", "グ", "ゲ", "ゴ"] },
  { title: "Z Row Zigzag", focus: "Dakuten on the S-row", characters: ["ザ", "ジ", "ズ", "ゼ", "ゾ"] },
  { title: "D Row Descent", focus: "Dakuten on the T-row", characters: ["ダ", "ヂ", "ヅ", "デ", "ド"] },
  { title: "B Row Bridge", focus: "Dakuten on the H-row", characters: ["バ", "ビ", "ブ", "ベ", "ボ"] },
  { title: "P Row Peak", focus: "Handakuten on the H-row", characters: ["パ", "ピ", "プ", "ペ", "ポ"] },
  { title: "K And G Yoon", focus: "Contracted k/g sounds", characters: ["キャ", "キュ", "キョ", "ギャ", "ギュ", "ギョ"] },
  { title: "S And J Yoon", focus: "Contracted s/j sounds", characters: ["シャ", "シュ", "ショ", "ジャ", "ジュ", "ジョ"] },
  { title: "T Yoon Traverse", focus: "Contracted t sounds", characters: ["チャ", "チュ", "チョ"] },
  { title: "N And H Yoon", focus: "Contracted n/h sounds", characters: ["ニャ", "ニュ", "ニョ", "ヒャ", "ヒュ", "ヒョ"] },
  { title: "B And P Yoon", focus: "Contracted b/p sounds", characters: ["ビャ", "ビュ", "ビョ", "ピャ", "ピュ", "ピョ"] },
  { title: "M And R Yoon", focus: "Contracted m/r sounds", characters: ["ミャ", "ミュ", "ミョ", "リャ", "リュ", "リョ"] },
];

export const katakanaLessons: SeedLesson[] = lessonDefinitions.map((lesson, index) => ({
  id: `lesson_katakana_${String(index + 1).padStart(3, "0")}`,
  title: lesson.title,
  focus: lesson.focus,
  itemIds: idsForCharacters(lesson.characters),
}));
