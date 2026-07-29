export type QuizType =
  | "meaning_recognition"
  | "kanji_recall"
  | "multiple_choice"
  | "matching"
  | "concentration"
  | "similar_kanji"
  | "reading_quiz"
  | "sumo_quiz";

export interface QuizAttempt {
  id: string;
  questionType: QuizType;
  itemId: string;
  correct: boolean;
  answeredAt: string;
}
