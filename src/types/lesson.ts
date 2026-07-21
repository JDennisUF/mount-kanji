export interface Lesson {
  id: string;
  title: string;
  level: number;
  kanjiIds: string[];
  vocabularyIds: string[];
  prerequisites: string[];
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  completedAt: string;
  accuracy: number;
  quizAttemptIds: string[];
}
