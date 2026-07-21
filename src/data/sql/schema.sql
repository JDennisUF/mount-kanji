CREATE TABLE IF NOT EXISTS kanji (
  id TEXT PRIMARY KEY,
  character TEXT NOT NULL UNIQUE,
  primary_meaning TEXT NOT NULL,
  meanings_json TEXT NOT NULL,
  onyomi_json TEXT NOT NULL,
  kunyomi_json TEXT NOT NULL,
  stroke_count INTEGER NOT NULL,
  radical TEXT NOT NULL,
  jlpt_level TEXT,
  grade_level INTEGER,
  frequency_rank INTEGER,
  mnemonic TEXT,
  sumo_relevant INTEGER NOT NULL DEFAULT 0,
  tags_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id TEXT PRIMARY KEY,
  written_form TEXT NOT NULL,
  reading TEXT NOT NULL,
  romaji TEXT,
  meanings_json TEXT NOT NULL,
  kanji_ids_json TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  example_sentence TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  level INTEGER NOT NULL,
  kanji_ids_json TEXT NOT NULL,
  vocabulary_ids_json TEXT NOT NULL,
  prerequisites_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_kanji_progress (
  id TEXT PRIMARY KEY,
  kanji_id TEXT NOT NULL,
  status TEXT NOT NULL,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  meaning_status TEXT NOT NULL DEFAULT 'new',
  meaning_ease_factor REAL NOT NULL DEFAULT 2.5,
  reading_status TEXT NOT NULL DEFAULT 'new',
  reading_ease_factor REAL NOT NULL DEFAULT 2.5,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kanji_id) REFERENCES kanji (id)
);

CREATE TABLE IF NOT EXISTS quiz_attempt (
  id TEXT PRIMARY KEY,
  question_type TEXT NOT NULL,
  kanji_id TEXT NOT NULL,
  correct INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  answered_at TEXT NOT NULL,
  FOREIGN KEY (kanji_id) REFERENCES kanji (id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  accuracy REAL NOT NULL,
  quiz_attempt_ids_json TEXT NOT NULL,
  FOREIGN KEY (lesson_id) REFERENCES lessons (id)
);

CREATE INDEX IF NOT EXISTS idx_user_kanji_progress_next_review
  ON user_kanji_progress (next_review_at);

CREATE INDEX IF NOT EXISTS idx_user_kanji_progress_status
  ON user_kanji_progress (status);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_kanji_id
  ON quiz_attempt (kanji_id);
