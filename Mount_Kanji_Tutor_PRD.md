# Mount Kanji Tutor PRD

## Summary

Mount Kanji will evolve from a memory quiz into a rules-based Japanese tutor for beginners. The product will guide learners through a recommended path: Japanese writing basics, Hiragana, Katakana, starter Kanji, then simple real Japanese reading.

The first release should be a phased tutor roadmap. V1 uses deterministic coaching from learner behavior and keeps the app web-only with local progress storage. Content access remains flexible: the app strongly recommends the beginner trail but does not hard-lock curious users out of reference material or other tracks.

No AI will be used by this app ever.  There is no need.  Just deterministic code that fails when something
goes wrong instead of implementing workarounds and fallbacks which confuse things.

## Product Goals

- Teach learners how Japanese writing works, not just test isolated symbols.
- Make every lesson follow a tutor-like flow: teach, guided practice, recall, context reading.
- Track mastery per symbol across meaningful stages instead of a single "known after quiz count" mental model.
- Explain mistakes with beginner-friendly feedback, especially common visual confusions.
- Recommend the next lesson or review set from observed weaknesses.
- Preserve the mountain progression theme as the primary navigation metaphor.

## Target Users

- Primary: English-speaking beginners learning Japanese scripts from zero or near-zero.
- Secondary: learners interested in kanji recognition for sumo vocabulary, rankings, names, and broadcasts.
- V1 assumes users are self-guided and using short sessions of about 5-10 minutes.

## Roadmap

### V1: Rules-Based Beginner Tutor

- Add a "Beginner Trail" dashboard state that recommends this order:
  1. Japanese writing basics
  2. Hiragana core kana
  3. Katakana core kana
  4. Starter Kanji and radicals
  5. Simple word reading
- Keep existing track switching and reference browsing available, but visually mark the recommended next step.
- Tutorize the existing lesson flow into four phases:
  - Teach: character, sound or meaning, mnemonic, why it matters.
  - Guided Practice: recognition exercises before recall.
  - Recall: existing quiz-style testing.
  - Context: words or short phrases containing the learned symbol.
- V1 content scope:
  - Basic Hiragana and Katakana core rows.
  - Starter Kanji set focused on concrete N5 symbols and reusable radicals.
  - A small curated context-word set for kana and starter kanji.
- Defer real stroke-order animations and audio pronunciation from V1.
- Replace generic wrong feedback with rules-based tutor feedback:
  - show selected answer and correct answer;
  - explain known confusion pairs where available;
  - schedule missed/confused items sooner.
- Add a learner-facing "Tutor Notes" panel with deterministic coaching such as:
  - "You are mixing up め and ぬ."
  - "You know the meaning of 山, but still need reading practice."
  - "Your next best step is Katakana K Row."
- Add mini quizzes after each section using real words, not only isolated characters.

### V2: Adaptive Trail And Context Reading

- Expand tutorized coverage to all current kana variants: dakuten, handakuten, small kana, and yoon.
- Add richer reading-in-context exercises for common words and beginner sentences.
- Add prerequisite-aware lesson recommendations based on mastery stages.
- Add optional Sumo Learning Trail after basic kana exposure.
- Add progress analytics by skill: recognition, recall, word reading, sentence reading.

### Later

- Spaced repetition scheduling with due dates.
- Real stroke-order drawing and handwriting practice.
- Native/recorded audio and speech recognition.
- Furigana controls in reading exercises.
- Story mode, JLPT paths, offline support, and achievements.

## Key Requirements

### Beginner Trail

- Dashboard shows the learner's recommended next trail step.
- Trail progress uses mountain/campsite language:
  - Base Camp: writing-system intro.
  - Camps: kana rows or kanji/radical clusters.
  - Summit: completion of a track or major beginner milestone.
- Users may still open other tracks and references.
- Lessons should explain purpose, for example: "Today you'll learn symbols used in 12 common words."

### Writing System Intro

- Add an introductory lesson explaining Hiragana, Katakana, Kanji, and Romaji.
- Include a mixed-script sentence such as `私はラーメンを食べます`.
- Visually label each script's role:
  - Kanji carries core meaning.
  - Hiragana handles grammar and native word endings.
  - Katakana handles loanwords and emphasis.

### Four-Stage Lesson Model

- Each lesson is represented as an ordered set of phase activities.
- Required V1 activity types:
  - `teach_card`
  - `guided_recognition`
  - `recall_choice`
  - `context_highlight`
- Existing multiple choice, matching, and concentration modes can remain, but the primary beginner flow should use the four-stage sequence.

### Mastery Model

- Extend progress beyond `new | learning | known` with tutor-stage state:
  - `teach`
  - `recognize`
  - `recall`
  - `read_words`
  - `read_sentences`
  - `spaced_review`
- V1 may map these stages onto the existing progress model internally, but the product behavior should expose stages to the learner.
- Track per item:
  - attempts by activity type;
  - correct and incorrect counts;
  - last reviewed timestamp;
  - current mastery stage;
  - confusion history where the learner selected one symbol for another.

### Adaptive Review

- Review queue should prioritize:
  - recently missed items;
  - frequent confusion pairs;
  - items not seen recently;
  - items close to advancing a mastery stage.
- Avoid random-only review.
- Missed items should reappear in guided practice or recall before the session ends when practical.

### Tutor Feedback

- Wrong answers should not only say "wrong."
- Feedback should include:
  - what the learner selected;
  - what the correct answer was;
  - a short explanation when a confusion rule exists;
  - the next immediate practice action.
- V1 uses authored confusion data, not generated AI.

### Kanji Teaching

- Kanji lessons must not introduce kanji as isolated drawings.
- Each starter kanji teach card includes:
  - meaning;
  - mnemonic;
  - radical/component clue;
  - onyomi and kunyomi where useful;
  - vocabulary example;
  - short example sentence when available.
- Radicals are introduced as clues, not guaranteed definitions.

### Sumo Trail

- Sumo content remains optional.
- Unlock/recommend it after learners have started both Hiragana and Katakana.
- The trail should teach vocabulary as a progression from simple kanji to meaningful terms:
  - `山`, `富士`, `富士山`, `力士`, `土俵`, `横綱`, `勝`, `負`, `行司`.

## Interface And Data Changes

- Add a PRD-backed lesson schema capable of representing phased activities instead of only `title`, `focus`, and `itemIds`.
- Add context examples with:
  - written Japanese;
  - reading;
  - romaji if enabled;
  - English meaning;
  - highlighted target item IDs.
- Add authored confusion pairs for kana and starter kanji.
- Add tutor progress fields for mastery stage and confusion history.
- Preserve localStorage persistence for V1; bump storage keys or migrate safely if progress shape changes.

## Success Metrics

- A new learner can complete the writing-system intro and first Hiragana lesson without needing outside explanation.
- Learners see guided practice before recall in beginner lessons.
- Session summaries identify specific weaknesses and recommend a next step.
- Review queues demonstrably include recently missed/confused items before random new items.
- By the end of the Beginner Trail, users can:
  - read basic Hiragana;
  - read basic Katakana;
  - understand basic kanji structure;
  - recognize common radicals;
  - read simple Japanese words with confidence.

## Test Plan

- Unit test mastery-stage transitions per symbol.
- Unit test adaptive review ordering for misses, confusion pairs, stale items, and near-stage-advance items.
- Unit test confusion feedback selection.
- Unit test lesson schema validation and activity ordering.
- UI test the beginner trail from first launch through first lesson summary.
- UI test that soft guidance does not block reference browsing or manual track switching.
- UI test context-highlight exercises for kana and kanji.
- Regression test existing progress persistence and quiz modes.

## Assumptions

- V1 is rules-first and does not call an LLM.
- V1 defers stroke-order animation and audio pronunciation.
- V1 focuses on core Hiragana/Katakana plus starter Kanji, not every seeded item.
- Soft guidance is preferred over hard content locks.
- The PRD is saved separately from the original vision document so the vision can remain a higher-level source artifact.
