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
  meaning: string;
  labels: ScriptLabel[];
}

export interface WritingSystemLoreSection {
  title: string;
  body: string;
}

export interface OnlineLearningResource {
  title: string;
  url: string;
  category: string;
  description: string;
}

export interface FuriganaExample {
  written: string;
  furigana: string;
  romaji: string;
  meaning: string;
  note: string;
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
  meaning: "I eat ramen.",
  labels: [
    { text: "私", script: "kanji", role: "Kanji carries core meaning: I/me." },
    { text: "は", script: "hiragana", role: "Topic marker: 私は means 'as for me' or simply 'I' here. Written は, pronounced wa." },
    { text: "ラーメン", script: "katakana", role: "Katakana often marks loanwords, names, and emphasis." },
    { text: "を", script: "hiragana", role: "Hiragana marks the object of the sentence." },
    { text: "食", script: "kanji", role: "Kanji carries the meaning: eat." },
    { text: "べます", script: "hiragana", role: "Hiragana completes the word ending and politeness." },
  ],
};

export const kanjiLore: WritingSystemLoreSection[] = [
  {
    title: "Characters From China",
    body: "Kanji began as Chinese characters brought to Japan through contact with the continent. Japan already had a spoken language, but Chinese writing gave scholars and officials a powerful written system.",
  },
  {
    title: "Adapted To Japanese",
    body: "Japanese readers adapted characters in two ways: for meaning and for sound. 山 kept a meaning like mountain, but could be read やま in native Japanese words or さん in many compound words.",
  },
  {
    title: "Example: Mountain",
    body: "山 means mountain. By itself it is often read やま. In 富士山, Mount Fuji, it is read さん. The symbol carries meaning, while the word decides the reading.",
  },
  {
    title: "Example: Eat",
    body: "食 carries the idea of eating. In 食べます, the kanji gives the core meaning and the kana べます tells you the verb form and pronunciation.",
  },
  {
    title: "Brush, Ink, And Paper",
    body: "Traditional documents were written with a brush called a fude. Writers used sumi, black ink made from soot and binder, often ground with water on an inkstone before writing on paper.",
  },
  {
    title: "Traditional Documents",
    body: "Classical Japanese documents were commonly written vertically in columns, read top to bottom, with columns ordered from right to left. Modern Japanese also uses horizontal left-to-right writing, especially on screens.",
  },
];

export const kanaLore: WritingSystemLoreSection[] = [
  {
    title: "Kana Came From Kanji",
    body: "Hiragana and Katakana both developed from kanji used for sound. Instead of using a character mainly for meaning, writers used simplified forms to represent Japanese syllables.",
  },
  {
    title: "Hiragana: Flowing Forms",
    body: "Hiragana grew from cursive, flowing ways of writing whole kanji. Its rounded shapes made it useful for native Japanese words, grammar particles, and verb endings.",
  },
  {
    title: "Katakana: Cut Pieces",
    body: "Katakana developed from pieces of kanji, often used by monks and scholars as reading marks beside Chinese texts. Its shapes are straighter and more angular.",
  },
  {
    title: "Example: あ",
    body: "The hiragana あ comes from a cursive form of the kanji 安, used for its sound. Over time the flowing shorthand became a standard kana symbol.",
  },
  {
    title: "Example: カ",
    body: "The katakana カ comes from part of the kanji 加. Katakana often preserves the feeling of a clipped or abbreviated component.",
  },
  {
    title: "How Kana Is Used Today",
    body: "Hiragana is used for grammar, word endings, and many native words. Katakana is used for loanwords, foreign names, sound effects, technical terms, and emphasis.",
  },
];

export const furiganaExamples: FuriganaExample[] = [
  {
    written: "山",
    furigana: "やま",
    romaji: "yama",
    meaning: "mountain",
    note: "Furigana tells you to read this kanji as やま (yama) when it appears as the word mountain.",
  },
  {
    written: "富士山",
    furigana: "ふじさん",
    romaji: "fujisan",
    meaning: "Mount Fuji",
    note: "The same 山 is read さん (san) here because it appears inside a compound name.",
  },
  {
    written: "食べます",
    furigana: "たべます",
    romaji: "tabemasu",
    meaning: "eat / will eat",
    note: "Furigana shows how to pronounce the kanji plus its hiragana ending as たべます (tabemasu), one complete word.",
  },
];

export const onlineLearningResources: OnlineLearningResource[] = [
  {
    title: "Jisho",
    url: "https://jisho.org/",
    category: "Dictionary",
    description: "Look up Japanese words, kanji, readings, example sentences, radicals, and common usage notes.",
  },
  {
    title: "JapanDict",
    url: "https://www.japandict.com/",
    category: "Dictionary",
    description: "Another searchable Japanese dictionary with English meanings, example sentences, kanji tools, and radical lookup.",
  },
  {
    title: "Japan Foundation Minato",
    url: "https://minato-jf.jp/",
    category: "Structured Courses",
    description: "Free self-study courses from The Japan Foundation, including beginner Japanese and kana-focused courses.",
  },
  {
    title: "Tofugu Learn Japanese",
    url: "https://www.tofugu.com/learn-japanese/",
    category: "Beginner Roadmap",
    description: "A detailed beginner roadmap that explains what to study first and how kana, kanji, vocabulary, and grammar fit together.",
  },
  {
    title: "Tofugu Hiragana Guide",
    url: "https://www.tofugu.com/japanese/learn-hiragana/",
    category: "Kana Guide",
    description: "A focused hiragana guide with mnemonics and practice advice for learning the first kana script.",
  },
  {
    title: "Tofugu Kana Quiz",
    url: "https://kana-quiz.tofugu.com/",
    category: "Kana Practice",
    description: "A free hiragana and katakana quiz tool for drilling main kana, dakuten, and combination sounds.",
  },
  {
    title: "Tae Kim's Guide To Japanese",
    url: "https://guidetojapanese.org/learn/",
    category: "Grammar",
    description: "A free grammar guide that builds Japanese grammar from the ground up and avoids relying only on English phrase matching.",
  },
  {
    title: "NHK News Web Easy",
    url: "https://www3.nhk.or.jp/news/easy/",
    category: "Reading Practice",
    description: "Simplified Japanese news with furigana. Best after you know kana and some beginner grammar.",
  },
  {
    title: "NHK Easier",
    url: "https://nhkeasier.com/",
    category: "Reading Practice",
    description: "A learner-friendly reader for NHK Easy articles with furigana controls and dictionary-style support.",
  },
];

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
