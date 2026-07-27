export type StudyTrack = "kanji" | "hiragana" | "katakana";

export interface StudyItem {
  id: string;
  character: string;
  script: StudyTrack;
  primaryMeaning: string;
  meanings: string[];
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
  radical?: string;
  jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1";
  gradeLevel?: number;
  frequencyRank?: number;
  mnemonic?: string;
  sumoRelevant: boolean;
  tags: string[];
  row?: string;
  column?: string;
  romaji?: string;
  lessonHint?: string;
}

export type Kanji = StudyItem;

export interface Vocabulary {
  id: string;
  writtenForm: string;
  reading: string;
  romaji?: string;
  meanings: string[];
  kanjiIds: string[];
  tags: string[];
  exampleSentence?: string;
}
