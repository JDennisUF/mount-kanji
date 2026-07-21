# Kanji Learning App Blueprint

## 1. Product Overview

### Working Title

**Mount Kanji**

“Tomo” means friend or companion. The app acts as a friendly guide for English speakers learning kanji.

### Product Goal

Create an application that helps English speakers:

- Recognize kanji visually
- Understand their core meanings
- Learn common readings gradually
- See how kanji combine into Japanese words
- Remember kanji through repetition and context
- Learn kanji used in sumo terminology and rikishi names

The app should focus first on **recognition and meaning**, rather than forcing beginners to memorize every possible reading immediately.

---

## 2. Target Users

### Primary User

An English-speaking beginner who:

- Knows little or no kanji
- May know some hiragana or katakana
- Finds traditional kanji study overwhelming
- Wants short, focused lessons
- Learns better through examples and visual breakdowns

### Secondary User

A Japanese culture or sumo fan who wants to recognize kanji seen in:

- Sumo broadcasts
- Banzuke rankings
- Rikishi shikona
- Tournament schedules
- Match results
- Japanese websites and graphics

---

## 3. Core Learning Philosophy

### Meaning First

Every kanji should first be introduced by its most useful English meaning.

Example:

```text
山
mountain
```

Readings and vocabulary are added after the user recognizes the symbol.

### One Layer at a Time

Teach each kanji in stages:

1. Visual recognition
2. Core English meaning
3. Radical or component breakdown
4. Common Japanese readings
5. Example words
6. Example sentence
7. Writing and stroke order

### Recognition Before Recall

Early exercises should ask:

> What does 山 mean?

Later exercises should ask:

> Which kanji means mountain?

Recognition is easier and builds confidence before harder recall exercises.

### Context Over Isolation

Kanji should appear in useful words, names, signs, and themed collections.

Example:

```text
山 — mountain
富士山 — Mount Fuji
火山 — volcano
```

### Spaced Repetition

The app should review a kanji shortly before the user is likely to forget it.

Kanji should move through learning states:

- New
- Learning
- Familiar
- Mastered
- Needs Review

---

## 4. Learning Path

## Level 0: Japanese Writing Basics

Explain the roles of:

- Hiragana
- Katakana
- Kanji
- Romaji

Teach that kanji generally carry meaning, while hiragana often provides grammar and pronunciation support.

## Level 1: Simple Visual Kanji

Begin with simple, concrete kanji:

| Kanji | Meaning |
|---|---|
| 一 | one |
| 二 | two |
| 三 | three |
| 人 | person |
| 口 | mouth |
| 日 | sun, day |
| 月 | moon, month |
| 木 | tree |
| 山 | mountain |
| 川 | river |

## Level 2: Directions, Size, and Position

| Kanji | Meaning |
|---|---|
| 上 | up, above |
| 下 | down, below |
| 中 | middle, inside |
| 大 | big |
| 小 | small |
| 東 | east |
| 西 | west |
| 南 | south |
| 北 | north |

## Level 3: Common Components and Radicals

Introduce reusable parts such as:

| Component | Meaning |
|---|---|
| 亻 | person |
| 扌 | hand |
| 氵 | water |
| 忄 | heart, feeling |
| 木 | tree, wood |
| 火 | fire |
| 土 | earth |
| 力 | power |
| 口 | mouth |
| 女 | woman |

The app should explain that radicals are clues, not perfect definitions.

## Level 4: Everyday Kanji

Topics:

- Numbers
- Days and months
- Family
- Food
- Weather
- Travel
- Places
- Common verbs
- Common adjectives

## Level 5: Multi-Kanji Words

Teach how meanings combine.

Examples:

| Word | Parts | Meaning |
|---|---|---|
| 火山 | fire + mountain | volcano |
| 日本 | sun + origin | Japan |
| 大学 | big + study | university |
| 人口 | person + mouth | population |
| 東口 | east + entrance | east entrance |

## Level 6: Readings

Introduce:

- **Kun'yomi**: native Japanese readings
- **On'yomi**: Chinese-derived readings
- Okurigana
- Sound changes in compounds

Do not require every reading. Prioritize readings found in common words.

## Level 7: Intermediate Recognition

Add:

- Similar-looking kanji
- Kanji with multiple meanings
- Less literal compounds
- Common signs and interface text
- JLPT-aligned collections

## Level 8: Advanced Study

Add:

- Rare readings
- Name readings
- Historical forms
- Etymology
- Formal and literary vocabulary
- Advanced handwriting practice

---

## 5. Sumo Learning Track

The app should include a dedicated **Sumo Mode**.

### Essential Sumo Kanji

| Kanji or Word | Reading | Meaning |
|---|---|---|
| 相撲 | sumō | sumo |
| 力士 | rikishi | sumo wrestler |
| 場所 | basho | tournament |
| 土俵 | dohyō | sumo ring |
| 番付 | banzuke | ranking sheet |
| 取組 | torikumi | bout or match |
| 勝 | kachi | win |
| 負 | make | loss |
| 東 | higashi | east |
| 西 | nishi | west |
| 白星 | shiroboshi | win, white star |
| 黒星 | kuroboshi | loss, black star |

### Sumo Ranks

| Rank | Reading | Meaning |
|---|---|---|
| 横綱 | yokozuna | highest rank |
| 大関 | ōzeki | second-highest rank |
| 関脇 | sekiwake | senior champion rank |
| 小結 | komusubi | junior champion rank |
| 前頭 | maegashira | ranked top-division wrestler |
| 十両 | jūryō | second division |
| 幕下 | makushita | third division |
| 三段目 | sandanme | fourth division |
| 序二段 | jonidan | fifth division |
| 序ノ口 | jonokuchi | lowest division |

### Shikona Breakdown Mode

Allow users to enter or select a rikishi's ring name and see it broken down.

Example:

```text
藤凌駕

藤 — wisteria
凌 — surpass, endure, overcome
駕 — ride above, overtake

Combined impression:
A powerful name suggesting surpassing or rising above others.
```

The app should clearly distinguish between:

- Literal kanji meanings
- Possible name imagery
- Official or intended meaning, when known
- Speculative interpretation

### Banzuke Trainer

Show simplified ranking layouts and ask users to identify:

- East and west
- Rank names
- Wrestler names
- Wins and losses
- Division names

### Broadcast Recognition Mode

Present kanji commonly seen on sumo broadcasts:

- East and west labels
- Rank abbreviations
- Win-loss records
- Bout order
- Tournament day numbers
- Champion and prize terminology

---

## 6. Core Features

## 6.1 Daily Lesson

A daily lesson contains:

- 3 to 5 new kanji
- Meaning introduction
- Visual breakdown
- One or two example words
- Short quiz
- Review of older kanji

Target session length: **5 to 10 minutes**.

## 6.2 Kanji Card

Each kanji has a detail card containing:

```text
Kanji: 山
Primary meaning: mountain
Kun reading: やま
On reading: サン
Radical: 山
Stroke count: 3
JLPT level: N5
Grade level: 1
```

Also include:

- Stroke-order animation
- Mnemonic
- Example vocabulary
- Example sentence
- Similar kanji
- Sumo relevance
- User notes
- Mastery status

## 6.3 Quiz Modes

### Meaning Recognition

Show a kanji and ask for its English meaning.

### Kanji Recall

Show an English meaning and ask the user to select the kanji.

### Multiple Choice

Choose the correct meaning from four choices.

### Matching

Match kanji to meanings.

### Word Builder

Combine kanji into a word.

### Similar Kanji

Choose between visually similar characters.

Examples:

- 土 and 士
- 人 and 入
- 日 and 目
- 大 and 犬
- 未 and 末

### Reading Quiz

Choose the correct reading for a word.

### Sumo Quiz

Identify a rank, term, direction, or shikona component.

## 6.4 Review Queue

The home screen should show:

- New kanji available
- Reviews due
- Weak kanji
- Current streak
- Recently mastered kanji

## 6.5 Search and Dictionary

Search by:

- Kanji
- English meaning
- Japanese reading
- Romaji
- Radical
- Stroke count
- Sumo term
- JLPT level

## 6.6 Collections

Examples:

- First 25 Kanji
- Numbers
- Nature
- Directions
- People
- Actions
- Sumo Basics
- Sumo Ranks
- Banzuke Kanji
- Common Shikona Kanji
- JLPT N5
- JLPT N4

## 6.7 Progress Tracking

Track:

- Kanji introduced
- Kanji recognized
- Kanji mastered
- Review accuracy
- Current streak
- Longest streak
- Sumo vocabulary learned
- Difficult kanji
- Time spent studying

---

## 7. Suggested Screens

## 7.1 Home Dashboard

Display:

- Continue Lesson
- Reviews Due
- Daily Goal
- Current Streak
- Recent Progress
- Sumo Mode shortcut

## 7.2 Lesson Screen

Flow:

1. Introduce kanji
2. Show meaning
3. Explain components
4. Show example words
5. Perform a quick check
6. Move to next kanji
7. Complete review quiz

## 7.3 Review Screen

A focused flashcard interface with:

- Kanji
- Reveal button
- Again
- Hard
- Good
- Easy

## 7.4 Kanji Detail Screen

Sections:

- Meaning
- Readings
- Components
- Stroke order
- Vocabulary
- Sentences
- Similar kanji
- Sumo usage
- Notes

## 7.5 Collection Browser

Allow filtering by:

- Difficulty
- Topic
- JLPT level
- Radical
- Mastery
- Sumo relevance

## 7.6 Sumo Hub

Include:

- Sumo Basics
- Rank Trainer
- Banzuke Trainer
- Shikona Explorer
- Tournament Vocabulary
- Broadcast Recognition Quiz

## 7.7 Progress Screen

Show:

- Mastery totals
- Accuracy trends
- Weakest kanji
- Strongest categories
- Study calendar
- Recommended next lesson

---

## 8. Data Model

## Kanji

```json
{
  "id": "kanji_yama",
  "character": "山",
  "meanings": ["mountain"],
  "primaryMeaning": "mountain",
  "onyomi": ["サン", "セン"],
  "kunyomi": ["やま"],
  "strokeCount": 3,
  "radical": "山",
  "jlptLevel": "N5",
  "gradeLevel": 1,
  "frequencyRank": 131,
  "mnemonic": "Three mountain peaks rise from the ground.",
  "sumoRelevant": false,
  "tags": ["nature", "beginner"]
}
```

## Vocabulary

```json
{
  "id": "word_fujisan",
  "writtenForm": "富士山",
  "reading": "ふじさん",
  "romaji": "Fujisan",
  "meanings": ["Mount Fuji"],
  "kanjiIds": ["kanji_fu", "kanji_shi", "kanji_yama"],
  "tags": ["place", "nature"]
}
```

## Lesson

```json
{
  "id": "lesson_beginner_001",
  "title": "Numbers and Simple Shapes",
  "level": 1,
  "kanjiIds": [
    "kanji_one",
    "kanji_two",
    "kanji_three",
    "kanji_person",
    "kanji_mouth"
  ],
  "prerequisites": []
}
```

## User Kanji Progress

```json
{
  "userId": "user_123",
  "kanjiId": "kanji_yama",
  "status": "learning",
  "easeFactor": 2.4,
  "intervalDays": 4,
  "nextReviewAt": "2026-07-24T12:00:00Z",
  "correctCount": 8,
  "incorrectCount": 2,
  "lastReviewedAt": "2026-07-20T12:00:00Z"
}
```

## Quiz Attempt

```json
{
  "userId": "user_123",
  "questionType": "meaning_recognition",
  "kanjiId": "kanji_yama",
  "correct": true,
  "responseTimeMs": 2800,
  "answeredAt": "2026-07-20T12:05:00Z"
}
```

---

## 9. Spaced-Repetition Rules

A simple first version can use these intervals:

| Rating | Next Review |
|---|---|
| Again | 10 minutes |
| Hard | 1 day |
| Good | 3 days |
| Easy | 7 days |

Later intervals should increase based on successful reviews.

Example progression:

```text
10 minutes
1 day
3 days
7 days
14 days
30 days
60 days
120 days
```

Incorrect answers should reduce the interval and mark the kanji as needing review.

The app should track meaning recognition separately from reading recognition because a user may know what a kanji means without knowing its pronunciation.

---

## 10. Content Guidelines

### Prioritize Useful Meanings

Avoid overwhelming beginners with every dictionary definition.

Example:

```text
生
Primary beginner meanings:
life, birth, raw

Do not initially show every possible reading and usage.
```

### Explain Uncertainty

Kanji combinations, especially names, may not have a simple literal English translation.

The app should use phrases such as:

- “Literal components”
- “Possible imagery”
- “Common interpretation”
- “Name reading”
- “Exact intended meaning unknown”

### Use Romaji Carefully

Romaji helps beginners but should gradually become optional.

Suggested progression:

1. Kanji + hiragana + romaji
2. Kanji + hiragana
3. Kanji only during recognition exercises

### Avoid Treating Kanji as Pictures

Visual mnemonics are helpful, but the app should explain that modern kanji are writing symbols, not always literal drawings.

---

## 11. Accessibility and User Experience

The app should support:

- Large kanji display
- Dark and light themes
- High contrast
- Adjustable text size
- Optional furigana
- Optional romaji
- Keyboard navigation
- Screen-reader labels
- Color-independent correctness indicators
- Reduced animation mode

Kanji should use a Japanese-capable font so the glyph shapes appear correctly.

Possible fonts:

- Noto Sans JP
- Noto Serif JP
- BIZ UDPGothic
- Shippori Mincho

---

## 12. Technical Architecture

## Recommended Initial Stack

A practical cross-platform option:

- **Frontend:** React + TypeScript
- **Desktop shell:** Tauri
- **Styling:** Tailwind CSS
- **Local database:** SQLite
- **State management:** Zustand or React Context
- **Testing:** Vitest + Playwright
- **Backend:** Optional for MVP
- **Cloud sync later:** Supabase or a custom API

A local-first application is suitable because lessons and reviews should work offline.

## Suggested Application Layers

```text
UI Components
    ↓
Lesson and Quiz Services
    ↓
Spaced-Repetition Engine
    ↓
Repositories
    ↓
SQLite Database
```

## Suggested Project Structure

```text
src/
├── components/
│   ├── KanjiCard.tsx
│   ├── ProgressBar.tsx
│   ├── QuizChoice.tsx
│   └── StrokeOrderViewer.tsx
├── features/
│   ├── lessons/
│   ├── reviews/
│   ├── dictionary/
│   ├── progress/
│   └── sumo/
├── services/
│   ├── lessonService.ts
│   ├── quizService.ts
│   ├── reviewScheduler.ts
│   └── progressService.ts
├── repositories/
│   ├── kanjiRepository.ts
│   ├── vocabularyRepository.ts
│   └── progressRepository.ts
├── data/
│   ├── kanji/
│   ├── vocabulary/
│   ├── lessons/
│   └── sumo/
├── types/
│   ├── kanji.ts
│   ├── lesson.ts
│   ├── quiz.ts
│   └── progress.ts
└── pages/
    ├── HomePage.tsx
    ├── LessonPage.tsx
    ├── ReviewPage.tsx
    ├── KanjiPage.tsx
    ├── CollectionsPage.tsx
    ├── SumoPage.tsx
    └── ProgressPage.tsx
```

---

## 13. Content Sources

Potential data sources include:

- KANJIDIC2 for kanji meanings and readings
- JMdict for vocabulary
- KanjiVG for stroke-order data
- JLPT-aligned public datasets
- Official or reliable sumo terminology references

Before distributing the app, verify the license and attribution requirements for every dataset.

Store custom editorial content separately from imported dictionary data.

---

## 14. Minimum Viable Product

The first release should stay small.

### MVP Scope

- 100 beginner kanji
- 20 structured lessons
- Meaning-first flashcards
- Multiple-choice quizzes
- Basic spaced repetition
- Kanji search
- Progress tracking
- 25 essential sumo terms
- 10 sumo rank names
- Local SQLite storage
- Dark and light themes

### Do Not Include in the First Release

- Social features
- Competitive leaderboards
- AI-generated lessons
- Full handwriting recognition
- Thousands of kanji
- Cloud synchronization
- User-created public decks
- Complex gamification

These features can distract from proving whether the core learning loop works.

---

## 15. Development Roadmap

## Phase 1: Foundation

- Create project
- Define TypeScript models
- Set up SQLite
- Import first 100 kanji
- Build kanji detail screen
- Build collection browser

## Phase 2: Learning Loop

- Create lesson engine
- Create quiz engine
- Add progress records
- Add basic spaced repetition
- Build review queue

## Phase 3: Sumo Mode

- Add sumo vocabulary
- Add rank lessons
- Add east-west trainer
- Add banzuke recognition exercises
- Add shikona breakdown format

## Phase 4: User Experience

- Add daily goals
- Add streaks
- Add accessibility settings
- Add dark mode
- Add optional romaji and furigana
- Improve feedback and animations

## Phase 5: Expanded Content

- Expand to 500 kanji
- Add JLPT N5 and N4 collections
- Add more vocabulary
- Add example sentences
- Add similar-kanji lessons

## Phase 6: Advanced Features

- Handwriting practice
- Cloud synchronization
- Mobile version
- Custom study decks
- Audio pronunciation
- AI-assisted explanations with source controls

---

## 16. Success Metrics

Useful product metrics include:

- Daily lesson completion rate
- Review completion rate
- Seven-day retention
- Thirty-day retention
- Average review accuracy
- Number of mastered kanji
- Time required to master a kanji
- Sumo lesson completion rate
- Percentage of users returning after their first lesson

The strongest measure of success is whether users can recognize learned kanji later in real-world contexts.

---

## 17. Example Beginner Lesson

# Lesson: Strength, People, and Size

## Kanji 1

```text
力
Meaning: power, strength
Reading: ちから
Mnemonic: A strong arm applying force.
Sumo connection: Used in 力士, meaning sumo wrestler.
```

## Kanji 2

```text
人
Meaning: person
Reading: ひと
Mnemonic: A person walking on two legs.
```

## Kanji 3

```text
大
Meaning: big
Reading: おお
Mnemonic: A person stretching their arms wide.
Sumo connection: Used in 大関, the ōzeki rank.
```

## Vocabulary

```text
力士
りきし
rikishi
sumo wrestler
```

```text
大関
おおぜき
ōzeki
sumo's second-highest rank
```

## Quiz

1. Which kanji means strength?
2. What does 人 mean?
3. Which kanji appears in 大関?
4. What does 力士 mean?

---

## 18. Product Principles

1. Never overload beginners with readings.
2. Teach kanji in useful contexts.
3. Make reviews short and consistent.
4. Clearly separate literal meanings from interpretations.
5. Treat sumo content as a full learning path, not a novelty.
6. Reward actual retention, not meaningless screen taps.
7. Keep the MVP small enough to finish.
8. Build offline-first.
9. Use trusted, licensed language data.
10. Make every lesson help the user recognize real Japanese.


---

# 19. Brand Identity

## Product Name

**Mount Kanji**

### Core Theme

Learning kanji is a mountain to climb—not because it should feel overwhelming, but because every step upward represents meaningful progress.

The application should consistently reinforce this metaphor.

Examples:

- Base Camp
- Trail
- Camp
- Ridge
- Peak
- Summit

Users should always feel they are climbing rather than grinding.

---

# 20. Trail System

Instead of one linear course, the app should offer themed Trails.

Each Trail is an independent learning path with its own completion progress.

## Suggested Trails

### 🏕 Beginner Trail

The first 100 essential kanji.

### 🔤 Radicals Trail

Learn the most useful building blocks first.

### 🇯🇵 Everyday Japanese Trail

Common vocabulary seen in daily life.

### 🏯 JLPT Trail

Organized by JLPT N5 through N1.

### 🥋 Sumo Trail

Kanji appearing in:

- ranks
- banzuke
- tournament terms
- kimarite
- shikona
- broadcasts

### 👤 Name Kanji Trail

Common kanji used in Japanese names.

### 🌸 Nature Trail

Mountains, rivers, trees, weather, seasons, animals and plants.

### 🍣 Food Trail

Food and restaurant vocabulary.

### ✈️ Travel Trail

Transportation, hotels, stations, signs and directions.

### 🧠 Difficult Kanji Trail

Automatically generated from kanji the learner struggles with.

---

# 21. Mountain Progression

The mountain itself should become a visual progress map.

Example:

Base Camp
↓
Foothills
↓
Forest Trail
↓
High Ridge
↓
Cloud Line
↓
Snow Peak
↓
Summit

Each region unlocks as the learner reaches mastery milestones.

Progress should be driven by retained knowledge rather than total lessons completed.

---

# 22. Achievement Ideas

Instead of generic badges, award mountain-themed achievements.

Examples:

- First Step
- Trail Walker
- Camp Builder
- Ridge Runner
- Peak Explorer
- Summit Seeker
- Mountain Guide

Special achievements:

- 100 consecutive correct reviews
- Complete the Sumo Trail
- Master every beginner radical
- Finish every kanji in a JLPT level
- Recognize every rank in a banzuke

---

# 23. Design Principles

- Local-first and offline by default.
- Meaning before memorization.
- Recognition before recall.
- Every lesson should connect to real Japanese usage.
- Avoid information overload.
- Reward consistency over marathon study sessions.
- The mountain theme should support learning without becoming distracting.
- Every new feature should answer the question: "Does this help someone climb the mountain?"

---

# 24. Build Progress Checklist

Use this checklist to track implementation progress as we build Mount Kanji.

## Foundation (Current)

- [x] Scaffold project in repo root with Tauri + React + TypeScript.
- [x] Install dependencies and verify production build succeeds.
- [x] Set up Tailwind CSS (v4 Vite plugin).
- [x] Replace starter template with Mount Kanji Base Camp dashboard shell.
- [x] Add initial TypeScript domain types for kanji, lessons, quiz, and progress.
- [x] Add initial SQLite schema draft.
- [x] Add first spaced-repetition service and review scheduler service.
- [x] Add unit test setup (Vitest) and first scheduler tests.
- [x] Add first interactive prototype flow: dashboard -> lesson -> quiz -> summary.

## MVP Core Loop

- [x] Implement database initialization and repository layer.
- [ ] Add seed import pipeline for 100 JLPT N5 kanji.
- [ ] Add lesson data for first 20 structured lessons.
- [ ] Build Home -> Lesson -> Quiz -> Review flow end-to-end.
- [ ] Persist quiz attempts and progress updates in SQLite.
- [x] Implement review queue using Again/Hard/Good/Easy grading.
- [ ] Enforce mastery rule: 5 correct meaning reviews and 80%+ accuracy.

## MVP Features

- [ ] Build Kanji Detail screen (meanings, readings, radicals, examples).
- [ ] Build Dictionary/Search (kanji, meaning, radical, JLPT, sumo relevance).
- [ ] Build Progress screen (streaks, mastered count, weak kanji, accuracy).
- [ ] Add settings: furigana default on, romaji optional toggle.
- [ ] Add accessibility controls: text size, reduced motion, contrast-safe feedback.

## Sumo Content (MVP Data + Phase 2 Interactions)

- [ ] Add curated sumo seed content (25 terms + 10 rank names).
- [ ] Tag sumo-relevant kanji and vocabulary in data.
- [ ] Phase 2: build Sumo Hub interactive modes (rank trainer, banzuke trainer, shikona explorer, broadcast recognition).

## Quality Gates

- [ ] Add repository and progress-service unit tests.
- [ ] Add integration tests for lesson-to-review lifecycle.
- [ ] Add Playwright happy-path tests for study flow.
- [ ] Verify app behavior in desktop shell once Linux prerequisites are installed.

## Release Readiness

- [ ] Verify licensing and attribution requirements for language datasets.
- [ ] Freeze MVP scope and defer non-MVP items.
- [ ] Ship first local-first desktop MVP.
