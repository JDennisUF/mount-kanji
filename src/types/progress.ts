export type KanjiStatus = "new" | "learning" | "familiar" | "mastered" | "needs_review";

export interface UserKanjiProgress {
  id: string;
  kanjiId: string;
  status: KanjiStatus;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string | null;
  correctCount: number;
  incorrectCount: number;
  consecutiveCorrect: number;
  lastReviewedAt: string | null;
  meaningStatus: KanjiStatus;
  meaningEaseFactor: number;
  readingStatus: KanjiStatus;
  readingEaseFactor: number;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalKanjiIntroduced: number;
  totalKanjiMastered: number;
  totalReviewsCompleted: number;
  overallAccuracy: number;
}
