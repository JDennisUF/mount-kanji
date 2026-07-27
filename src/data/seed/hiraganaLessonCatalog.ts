import { hiraganaPool } from "./hiraganaSet";

export interface SeedLesson {
  id: string;
  title: string;
  focus: string;
  itemIds: string[];
}

const itemIdByCharacter = new Map(hiraganaPool.map((item) => [item.character, item.id]));

function idsForCharacters(characters: string[]): string[] {
  return characters.map((character) => itemIdByCharacter.get(character)).filter(Boolean) as string[];
}

const lessonDefinitions: Array<{ title: string; focus: string; characters: string[] }> = [
  { title: "Vowel Ridge", focus: "Pure vowel sounds", characters: ["あ", "い", "う", "え", "お"] },
  { title: "K Row Climb", focus: "K-row recognition", characters: ["か", "き", "く", "け", "こ"] },
  { title: "S Row Switchbacks", focus: "S-row recognition", characters: ["さ", "し", "す", "せ", "そ"] },
  { title: "T Row Traverse", focus: "T-row recognition", characters: ["た", "ち", "つ", "て", "と"] },
  { title: "N Row Notch", focus: "N-row recognition", characters: ["な", "に", "ぬ", "ね", "の"] },
  { title: "H Row Hollow", focus: "H-row recognition", characters: ["は", "ひ", "ふ", "へ", "ほ"] },
  { title: "M Row Meadow", focus: "M-row recognition", characters: ["ま", "み", "む", "め", "も"] },
  { title: "Y Row Yard", focus: "Y-row recognition", characters: ["や", "ゆ", "よ"] },
  { title: "R Row Run", focus: "R-row recognition", characters: ["ら", "り", "る", "れ", "ろ"] },
  { title: "W Row Wind", focus: "W-row and final n", characters: ["わ", "を", "ん"] },
  { title: "Small Kana Pocket", focus: "Small kana support sounds", characters: ["っ", "ゃ", "ゅ", "ょ"] },
  { title: "G Row Gorge", focus: "Dakuten on the K-row", characters: ["が", "ぎ", "ぐ", "げ", "ご"] },
  { title: "Z Row Zigzag", focus: "Dakuten on the S-row", characters: ["ざ", "じ", "ず", "ぜ", "ぞ"] },
  { title: "D Row Descent", focus: "Dakuten on the T-row", characters: ["だ", "ぢ", "づ", "で", "ど"] },
  { title: "B Row Bridge", focus: "Dakuten on the H-row", characters: ["ば", "び", "ぶ", "べ", "ぼ"] },
  { title: "P Row Peak", focus: "Handakuten on the H-row", characters: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"] },
  { title: "K And G Yoon", focus: "Contracted k/g sounds", characters: ["きゃ", "きゅ", "きょ", "ぎゃ", "ぎゅ", "ぎょ"] },
  { title: "S And J Yoon", focus: "Contracted s/j sounds", characters: ["しゃ", "しゅ", "しょ", "じゃ", "じゅ", "じょ"] },
  { title: "T Yoon Traverse", focus: "Contracted t sounds", characters: ["ちゃ", "ちゅ", "ちょ"] },
  { title: "N And H Yoon", focus: "Contracted n/h sounds", characters: ["にゃ", "にゅ", "にょ", "ひゃ", "ひゅ", "ひょ"] },
  { title: "B And P Yoon", focus: "Contracted b/p sounds", characters: ["びゃ", "びゅ", "びょ", "ぴゃ", "ぴゅ", "ぴょ"] },
  { title: "M And R Yoon", focus: "Contracted m/r sounds", characters: ["みゃ", "みゅ", "みょ", "りゃ", "りゅ", "りょ"] },
];

export const hiraganaLessons: SeedLesson[] = lessonDefinitions.map((lesson, index) => ({
  id: `lesson_hiragana_${String(index + 1).padStart(3, "0")}`,
  title: lesson.title,
  focus: lesson.focus,
  itemIds: idsForCharacters(lesson.characters),
}));
