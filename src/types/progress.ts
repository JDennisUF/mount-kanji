export type StudyStatus = "new" | "learning" | "familiar" | "mastered";

export interface UserStudyProgress {
  id: string;
  itemId: string;
  status: StudyStatus;
  correctCount: number;
  incorrectCount: number;
  currentStreak: number;
  bestStreak: number;
  reviewWeight: number;
  excludedFromLessons: boolean;
  lastAnsweredCorrect: boolean | null;
  lastReviewedAt: string | null;
}

export type KanjiStatus = StudyStatus;
export type UserKanjiProgress = UserStudyProgress;

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalItemsIntroduced: number;
  totalItemsMastered: number;
  totalReviewsCompleted: number;
  overallAccuracy: number;
}
