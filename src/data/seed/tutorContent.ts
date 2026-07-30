import type { StudyItem, StudyTrack } from "../../types";
import { beginnerKanjiPool } from "./beginnerSet";
import { hiraganaPool } from "./hiraganaSet";
import { katakanaPool } from "./katakanaSet";

export interface ScriptLabel {
  text: string;
  script: StudyTrack | "grammar";
  role: string;
}

export interface WritingSystemIntro {
  title: string;
  purpose: string;
  sentence: string;
  labels: ScriptLabel[];
}

export interface TutorContextExample {
  id: string;
  written: string;
  reading: string;
  romaji: string;
  meaning: string;
  targetItemIds: string[];
  explanation: string;
}

export interface ConfusionPair {
  itemId: string;
  confusedWithItemId: string;
  explanation: string;
}

export const writingSystemIntro: WritingSystemIntro = {
  title: "Base Camp: Japanese Writing",
  purpose: "Japanese uses three scripts together. Learning them in order makes real reading less mysterious.",
  sentence: "私はラーメンを食べます",
  labels: [
    { text: "私", script: "kanji", role: "Kanji carries core meaning: I/me." },
    { text: "は", script: "hiragana", role: "Hiragana marks grammar." },
    { text: "ラーメン", script: "katakana", role: "Katakana often marks loanwords, names, and emphasis." },
    { text: "を", script: "hiragana", role: "Hiragana marks the object of the sentence." },
    { text: "食", script: "kanji", role: "Kanji carries the meaning: eat." },
    { text: "べます", script: "hiragana", role: "Hiragana completes the word ending and politeness." },
  ],
};

const itemIdByCharacter = new Map(
  [...hiraganaPool, ...katakanaPool, ...beginnerKanjiPool].map((item) => [item.character, item.id]),
);

function id(character: string): string {
  const itemId = itemIdByCharacter.get(character);
  if (!itemId) {
    throw new Error(`Missing tutor content item for ${character}`);
  }
  return itemId;
}

export const tutorContextExamples: TutorContextExample[] = [
  {
    id: "context_arigatou",
    written: "ありがとう",
    reading: "ありがとう",
    romaji: "arigatou",
    meaning: "thank you",
    targetItemIds: [id("あ"), id("り"), id("が"), id("と"), id("う")],
    explanation: "This common word starts with あ and lets you see kana working together as sounds.",
  },
  {
    id: "context_sakana",
    written: "さかな",
    reading: "さかな",
    romaji: "sakana",
    meaning: "fish",
    targetItemIds: [id("さ"), id("か"), id("な")],
    explanation: "Reading words like さかな turns symbol recognition into real Japanese reading.",
  },
  {
    id: "context_konnichiwa",
    written: "こんにちは",
    reading: "こんにちは",
    romaji: "konnichiwa",
    meaning: "hello",
    targetItemIds: [id("こ"), id("ん"), id("に"), id("ち"), id("は")],
    explanation: "This greeting shows familiar hiragana in a complete word.",
  },
  {
    id: "context_ramen",
    written: "ラーメン",
    reading: "ラーメン",
    romaji: "raamen",
    meaning: "ramen",
    targetItemIds: [id("ラ"), id("メ"), id("ン")],
    explanation: "Katakana helps you read borrowed words and food names like ラーメン.",
  },
  {
    id: "context_camera",
    written: "カメラ",
    reading: "カメラ",
    romaji: "kamera",
    meaning: "camera",
    targetItemIds: [id("カ"), id("メ"), id("ラ")],
    explanation: "Loanwords often become readable once you know the katakana sounds.",
  },
  {
    id: "context_yama",
    written: "山",
    reading: "やま",
    romaji: "yama",
    meaning: "mountain",
    targetItemIds: [id("山")],
    explanation: "山 is useful alone as a word and as a building block in larger words.",
  },
  {
    id: "context_fujisan",
    written: "富士山",
    reading: "ふじさん",
    romaji: "fujisan",
    meaning: "Mount Fuji",
    targetItemIds: [id("山")],
    explanation: "In 富士山, 山 uses the reading さん because it appears in a compound name.",
  },
  {
    id: "context_kyuukei",
    written: "休けい",
    reading: "きゅうけい",
    romaji: "kyuukei",
    meaning: "rest break",
    targetItemIds: [id("休")],
    explanation: "休 combines the person radical 亻 and tree 木: a person resting by a tree.",
  },
];

function pair(item: string, confusedWith: string, explanation: string): ConfusionPair[] {
  return [
    { itemId: id(item), confusedWithItemId: id(confusedWith), explanation },
    { itemId: id(confusedWith), confusedWithItemId: id(item), explanation },
  ];
}

export const tutorConfusionPairs: ConfusionPair[] = [
  ...pair("め", "ぬ", "Many beginners confuse め and ぬ because both loop through the center. Look for the extra tail on ぬ."),
  ...pair("わ", "れ", "わ and れ share a similar left stroke. わ closes into a rounder loop, while れ has a longer rightward finish."),
  ...pair("さ", "ち", "さ and ち both cross near the top. さ opens lower, while ち curves into a fuller lower shape."),
  ...pair("シ", "ツ", "シ and ツ are separated by stroke direction: シ leans more sideways, while ツ drops more vertically."),
  ...pair("ソ", "ン", "ソ and ン are easy to mix up. ソ has a more vertical long stroke, while ン sweeps more horizontally."),
  ...pair("ク", "ケ", "ク is compact and angled. ケ adds a longer vertical stroke and feels more open."),
  ...pair("人", "入", "人 and 入 are mirror-like simple kanji. 人 spreads like a person standing; 入 leans into entering."),
  ...pair("大", "小", "大 and 小 are opposites, but both are common size kanji. 大 spreads wide; 小 is compact with small side marks."),
];

export function getContextExamplesForItems(items: StudyItem[], maximum = 3): TutorContextExample[] {
  const itemIds = new Set(items.map((item) => item.id));
  return tutorContextExamples
    .filter((example) => example.targetItemIds.some((itemId) => itemIds.has(itemId)))
    .slice(0, maximum);
}
