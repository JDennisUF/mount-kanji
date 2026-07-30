export type StudyStatus = "new" | "learning" | "known";
export type TutorMasteryStage = "teach" | "recognize" | "recall" | "read_words" | "read_sentences" | "spaced_review";
export type TutorActivityType = "teach_card" | "recall_choice" | "context_highlight";

export interface ConfusionRecord {
  confusedWithItemId: string;
  count: number;
  lastConfusedAt: string;
}

export interface UserStudyProgress {
  id: string;
  itemId: string;
  status: StudyStatus;
  masteryStage: TutorMasteryStage;
  correctCount: number;
  incorrectCount: number;
  attemptsByActivity: Partial<Record<TutorActivityType, number>>;
  correctByActivity: Partial<Record<TutorActivityType, number>>;
  confusionHistory: ConfusionRecord[];
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
