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
];

export const katakanaLessons: SeedLesson[] = lessonDefinitions.map((lesson, index) => ({
  id: `lesson_katakana_${String(index + 1).padStart(3, "0")}`,
  title: lesson.title,
  focus: lesson.focus,
  itemIds: idsForCharacters(lesson.characters),
}));
