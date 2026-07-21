export interface Kanji {
  id: string;
  character: string;
  primaryMeaning: string;
  meanings: string[];
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
  radical: string;
  jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1";
  gradeLevel?: number;
  frequencyRank?: number;
  mnemonic?: string;
  sumoRelevant: boolean;
  tags: string[];
}

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
