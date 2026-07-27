export type StudyStatus = "new" | "learning" | "known";

export interface UserStudyProgress {
  id: string;
  itemId: string;
  status: StudyStatus;
  correctCount: number;
  incorrectCount: number;
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
  totalItemsKnown: number;
  totalReviewsCompleted: number;
  overallAccuracy: number;
}
