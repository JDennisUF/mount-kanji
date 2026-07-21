export type QuizType =
  | "meaning_recognition"
  | "kanji_recall"
  | "multiple_choice"
  | "matching"
  | "similar_kanji"
  | "reading_quiz"
  | "sumo_quiz";

export interface QuizAttempt {
  id: string;
  questionType: QuizType;
  kanjiId: string;
  correct: boolean;
  responseTimeMs: number;
  answeredAt: string;
}

export type ReviewGrade = "again" | "hard" | "good" | "easy";
