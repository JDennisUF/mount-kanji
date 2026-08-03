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
    id: "context_ie",
    written: "いえ",
    reading: "いえ",
    romaji: "ie",
    meaning: "house",
    targetItemIds: [id("い"), id("え")],
    explanation: "いえ is a short everyday word that uses only vowel-row hiragana.",
  },
  {
    id: "context_ue",
    written: "うえ",
    reading: "うえ",
    romaji: "ue",
    meaning: "above",
    targetItemIds: [id("う"), id("え")],
    explanation: "うえ turns two simple vowel sounds into a useful position word.",
  },
  {
    id: "context_ao",
    written: "あお",
    reading: "あお",
    romaji: "ao",
    meaning: "blue",
    targetItemIds: [id("あ"), id("お")],
    explanation: "あお keeps the sounds separate: a, then o.",
  },
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
    id: "context_kaki",
    written: "かき",
    reading: "かき",
    romaji: "kaki",
    meaning: "persimmon",
    targetItemIds: [id("か"), id("き")],
    explanation: "かき is a compact K-row word, so both sounds should feel familiar together.",
  },
  {
    id: "context_kiku",
    written: "きく",
    reading: "きく",
    romaji: "kiku",
    meaning: "listen",
    targetItemIds: [id("き"), id("く")],
    explanation: "きく shows how the K-row changes cleanly as the vowel changes.",
  },
  {
    id: "context_koko",
    written: "ここ",
    reading: "ここ",
    romaji: "koko",
    meaning: "here",
    targetItemIds: [id("こ")],
    explanation: "ここ repeats one kana to make a common place word.",
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
    id: "context_sushi",
    written: "すし",
    reading: "すし",
    romaji: "sushi",
    meaning: "sushi",
    targetItemIds: [id("す"), id("し")],
    explanation: "すし is a familiar word that keeps the S-row sounds easy to hear.",
  },
  {
    id: "context_soko",
    written: "そこ",
    reading: "そこ",
    romaji: "soko",
    meaning: "there",
    targetItemIds: [id("そ"), id("こ")],
    explanation: "そこ combines a newer S-row kana with こ from the K-row.",
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
    id: "context_tatsu",
    written: "たつ",
    reading: "たつ",
    romaji: "tatsu",
    meaning: "stand",
    targetItemIds: [id("た"), id("つ")],
    explanation: "たつ gives you two T-row kana in a short action word.",
  },
  {
    id: "context_tsuchi",
    written: "つち",
    reading: "つち",
    romaji: "tsuchi",
    meaning: "soil",
    targetItemIds: [id("つ"), id("ち")],
    explanation: "つち is good practice for the T-row sounds that do not start with a plain t in romaji.",
  },
  {
    id: "context_nani",
    written: "なに",
    reading: "なに",
    romaji: "nani",
    meaning: "what",
    targetItemIds: [id("な"), id("に")],
    explanation: "なに is one of the first question words many learners recognize.",
  },
  {
    id: "context_nuno",
    written: "ぬの",
    reading: "ぬの",
    romaji: "nuno",
    meaning: "cloth",
    targetItemIds: [id("ぬ"), id("の")],
    explanation: "ぬの gives ぬ another role outside isolated kana review.",
  },
  {
    id: "context_haha",
    written: "はは",
    reading: "はは",
    romaji: "haha",
    meaning: "mother",
    targetItemIds: [id("は")],
    explanation: "はは repeats は and is read with the regular ha sound here.",
  },
  {
    id: "context_hoshi",
    written: "ほし",
    reading: "ほし",
    romaji: "hoshi",
    meaning: "star",
    targetItemIds: [id("ほ"), id("し")],
    explanation: "ほし connects the H-row with an earlier S-row kana in a common nature word.",
  },
  {
    id: "context_mame",
    written: "まめ",
    reading: "まめ",
    romaji: "mame",
    meaning: "bean",
    targetItemIds: [id("ま"), id("め")],
    explanation: "まめ is a short M-row word with two distinct mouth shapes.",
  },
  {
    id: "context_mimi",
    written: "みみ",
    reading: "みみ",
    romaji: "mimi",
    meaning: "ear",
    targetItemIds: [id("み")],
    explanation: "みみ repeats み, which makes it useful for quick recognition practice.",
  },
  {
    id: "context_yume",
    written: "ゆめ",
    reading: "ゆめ",
    romaji: "yume",
    meaning: "dream",
    targetItemIds: [id("ゆ"), id("め")],
    explanation: "ゆめ pairs the Y-row with a familiar M-row kana.",
  },
  {
    id: "context_yomu",
    written: "よむ",
    reading: "よむ",
    romaji: "yomu",
    meaning: "read",
    targetItemIds: [id("よ"), id("む")],
    explanation: "よむ is a useful action word and a good check on よ versus ゆ.",
  },
  {
    id: "context_sora",
    written: "そら",
    reading: "そら",
    romaji: "sora",
    meaning: "sky",
    targetItemIds: [id("そ"), id("ら")],
    explanation: "そら combines an earlier S-row kana with the R-row.",
  },
  {
    id: "context_haru",
    written: "はる",
    reading: "はる",
    romaji: "haru",
    meaning: "spring",
    targetItemIds: [id("は"), id("る")],
    explanation: "はる is a common season word that practices the light R-row sound.",
  },
  {
    id: "context_wani",
    written: "わに",
    reading: "わに",
    romaji: "wani",
    meaning: "crocodile",
    targetItemIds: [id("わ"), id("に")],
    explanation: "わに gives わ a simple word form instead of only isolated practice.",
  },
  {
    id: "context_hon",
    written: "ほん",
    reading: "ほん",
    romaji: "hon",
    meaning: "book",
    targetItemIds: [id("ほ"), id("ん")],
    explanation: "ほん makes final ん visible at the end of a very common word.",
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
    id: "context_ika",
    written: "イカ",
    reading: "イカ",
    romaji: "ika",
    meaning: "squid",
    targetItemIds: [id("イ"), id("カ")],
    explanation: "イカ is a short katakana food word that bridges the vowel and K rows.",
  },
  {
    id: "context_kokoa",
    written: "ココア",
    reading: "ココア",
    romaji: "kokoa",
    meaning: "cocoa",
    targetItemIds: [id("コ"), id("ア")],
    explanation: "ココア repeats コ and ends with a clear ア sound.",
  },
  {
    id: "context_anime",
    written: "アニメ",
    reading: "アニメ",
    romaji: "anime",
    meaning: "anime",
    targetItemIds: [id("ア"), id("ニ"), id("メ")],
    explanation: "アニメ is a familiar katakana word that mixes sounds from several rows.",
  },
  {
    id: "context_tomato",
    written: "トマト",
    reading: "トマト",
    romaji: "tomato",
    meaning: "tomato",
    targetItemIds: [id("ト"), id("マ")],
    explanation: "トマト starts and ends with ト, making the shape easy to reinforce.",
  },
  {
    id: "context_banana",
    written: "バナナ",
    reading: "バナナ",
    romaji: "banana",
    meaning: "banana",
    targetItemIds: [id("バ"), id("ナ")],
    explanation: "バナナ shows dakuten on バ inside a familiar loanword.",
  },
  {
    id: "context_pan",
    written: "パン",
    reading: "パン",
    romaji: "pan",
    meaning: "bread",
    targetItemIds: [id("パ"), id("ン")],
    explanation: "パン is short, common, and useful for seeing final ン in katakana.",
  },
  {
    id: "context_memo",
    written: "メモ",
    reading: "メモ",
    romaji: "memo",
    meaning: "memo",
    targetItemIds: [id("メ"), id("モ")],
    explanation: "メモ is a simple M-row katakana word with two clean shapes.",
  },
  {
    id: "context_remon",
    written: "レモン",
    reading: "レモン",
    romaji: "remon",
    meaning: "lemon",
    targetItemIds: [id("レ"), id("モ"), id("ン")],
    explanation: "レモン combines the R-row, M-row, and final ン in one readable loanword.",
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
    id: "context_hi",
    written: "日",
    reading: "ひ",
    romaji: "hi",
    meaning: "sun; day",
    targetItemIds: [id("日")],
    explanation: "日 can stand alone as ひ when it means sun or day.",
  },
  {
    id: "context_ichinichi",
    written: "一日",
    reading: "いちにち",
    romaji: "ichinichi",
    meaning: "one day",
    targetItemIds: [id("一"), id("日")],
    explanation: "一日 is a common time word where 一 and 日 combine into a compound.",
  },
  {
    id: "context_nihon",
    written: "日本",
    reading: "にほん",
    romaji: "nihon",
    meaning: "Japan",
    targetItemIds: [id("日"), id("本")],
    explanation: "日本 shows 日 using に inside the country name Japan.",
  },
  {
    id: "context_hitori",
    written: "一人",
    reading: "ひとり",
    romaji: "hitori",
    meaning: "one person",
    targetItemIds: [id("一"), id("人")],
    explanation: "一人 is a useful counting word with a special reading.",
  },
  {
    id: "context_otona",
    written: "大人",
    reading: "おとな",
    romaji: "otona",
    meaning: "adult",
    targetItemIds: [id("大"), id("人")],
    explanation: "大人 is common and has a special reading that does not simply sound out each kanji.",
  },
  {
    id: "context_sangatsu",
    written: "三月",
    reading: "さんがつ",
    romaji: "sangatsu",
    meaning: "March",
    targetItemIds: [id("三"), id("月")],
    explanation: "三月 is a month name, where 月 is read がつ.",
  },
  {
    id: "context_gakusei",
    written: "学生",
    reading: "がくせい",
    romaji: "gakusei",
    meaning: "student",
    targetItemIds: [id("学"), id("生")],
    explanation: "学生 combines study and life into the common word for student.",
  },
  {
    id: "context_sensei",
    written: "先生",
    reading: "せんせい",
    romaji: "sensei",
    meaning: "teacher",
    targetItemIds: [id("先"), id("生")],
    explanation: "先生 is a high-value beginner word and a good example of compound readings.",
  },
  {
    id: "context_mizu",
    written: "水",
    reading: "みず",
    romaji: "mizu",
    meaning: "water",
    targetItemIds: [id("水")],
    explanation: "水 is useful as a standalone nature word with the reading みず.",
  },
  {
    id: "context_kawa",
    written: "川",
    reading: "かわ",
    romaji: "kawa",
    meaning: "river",
    targetItemIds: [id("川")],
    explanation: "川 stands alone as かわ and is easy to connect to its flowing shape.",
  },
  {
    id: "context_ame",
    written: "雨",
    reading: "あめ",
    romaji: "ame",
    meaning: "rain",
    targetItemIds: [id("雨")],
    explanation: "雨 is a common weather word that can be read directly as あめ.",
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

function rotationSeedForItems(items: StudyItem[]): number {
  return items.reduce((seed, item) => seed + item.id.charCodeAt(item.id.length - 1), 0);
}

function rotateExamples(examples: TutorContextExample[], seed: number): TutorContextExample[] {
  if (examples.length <= 1) {
    return examples;
  }

  const offset = seed % examples.length;
  return [...examples.slice(offset), ...examples.slice(0, offset)];
}

export function getContextExamplesForItems(items: StudyItem[], maximum = 3, availableItems: StudyItem[] = items): TutorContextExample[] {
  const focusItemIds = new Set(items.map((item) => item.id));
  const availableItemIds = new Set(availableItems.map((item) => item.id));
  const seed = rotationSeedForItems(items);
  const eligibleExamples = tutorContextExamples.filter(
    (example) =>
      example.targetItemIds.some((itemId) => focusItemIds.has(itemId)) &&
      example.targetItemIds.every((itemId) => availableItemIds.has(itemId)),
  );
  const exactExamples = eligibleExamples.filter((example) => example.targetItemIds.every((itemId) => focusItemIds.has(itemId)));
  const bridgeExamples = eligibleExamples.filter((example) => !exactExamples.includes(example));

  return [...rotateExamples(exactExamples, seed), ...rotateExamples(bridgeExamples, seed)].slice(0, maximum);
}
