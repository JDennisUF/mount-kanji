export type KanjiStatus = "new" | "learning" | "familiar" | "mastered";

export interface UserKanjiProgress {
  id: string;
  kanjiId: string;
  status: KanjiStatus;
  correctCount: number;
  incorrectCount: number;
  currentStreak: number;
  bestStreak: number;
  reviewWeight: number;
  excludedFromLessons: boolean;
  lastAnsweredCorrect: boolean | null;
  lastReviewedAt: string | null;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalKanjiIntroduced: number;
  totalKanjiMastered: number;
  totalReviewsCompleted: number;
  overallAccuracy: number;
}
