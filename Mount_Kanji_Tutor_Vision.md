# Mount Kanji Tutor Vision

## Goal

Transform Mount Kanji from a flashcard application into an intelligent
Japanese tutor that teaches beginners **how to learn**, not just **what
to memorize**.

The app should guide users through the natural learning order:

1.  Hiragana
2.  Katakana
3.  Kanji
4.  Reading real Japanese

The experience should feel like climbing a mountain with a knowledgeable
guide rather than flipping through flash cards.

------------------------------------------------------------------------

# Learning Philosophy

Traditional flashcard apps primarily test memory.

Mount Kanji should instead:

-   Teach concepts
-   Explain why something matters
-   Detect weaknesses
-   Adapt future lessons
-   Build confidence
-   Transition learners into reading real Japanese

The application should feel like a personal tutor.

------------------------------------------------------------------------

# Beginner Trail

``` text
Base Camp
├── What is Japanese writing?
├── Hiragana
├── Katakana
├── Kanji
└── Reading real Japanese
```

New users should complete the trail in order.

Do not allow beginners to skip directly to Kanji.

------------------------------------------------------------------------

# Explain the Three Writing Systems

Early in the tutorial, explain why Japanese uses three writing systems.

Example:

``` text
私はラーメンを食べます

私      ← Kanji
は を    ← Hiragana (grammar)
ラーメン ← Katakana (loanword)
食       ← Kanji
べます   ← Hiragana
```

This teaches how all three systems work together.

------------------------------------------------------------------------

# Four-Stage Lesson Model

Every lesson should have four phases.

## 1. Teach

Display:

-   Character
-   Pronunciation
-   Stroke order animation
-   Mnemonic
-   Audio pronunciation

Example:

``` text
あ

Sound:
"a"

Mnemonic:
Looks like someone opening their mouth saying
"Ahhh!"
```

------------------------------------------------------------------------

## 2. Guided Practice

Before expecting memorization, provide recognition exercises.

Examples:

-   Tap every あ
-   Which symbol is "a"?
-   Find every さ

This builds confidence before recall.

------------------------------------------------------------------------

## 3. Recall

Traditional flash cards.

Examples:

``` text
あ

What sound?
```

or

``` text
"a"

Which symbol?
```

------------------------------------------------------------------------

## 4. Recognition in Context

Show real Japanese.

Example:

``` text
ありがとう
```

Highlight:

``` text
あ
```

Explain:

"This is the first character in arigatou."

The goal is reading---not memorizing isolated symbols.

------------------------------------------------------------------------

# Intelligent Weakness Detection

Track mastery per symbol.

Example:

``` text
あ 100%
い 95%
ぬ 48%
め 41%
```

Instead of saying:

❌ Wrong

Explain:

"You selected わ.

Many beginners confuse わ and れ because of their similar loop."

Then immediately schedule additional practice.

------------------------------------------------------------------------

# Adaptive Review

Review should prioritize:

-   Recently missed characters
-   Frequently confused characters
-   Long-unseen characters
-   Characters nearing mastery

Avoid random review.

------------------------------------------------------------------------

# Mountain Progression

Represent progress visually.

``` text
Base Camp

✓ Vowels

✓ K Row

✓ S Row

→ T Row

Locked

Dakuten
Combination Sounds
Small Kana
```

Every checkpoint should feel like reaching another campsite.

------------------------------------------------------------------------

# Mini Quizzes

After every section, test actual reading.

Instead of:

"What is さ?"

Use:

``` text
さかな
```

or

``` text
こんにちは
```

Reading words is the real objective.

------------------------------------------------------------------------

# Kanji Teaching Strategy

Never introduce a Kanji by itself.

Example:

``` text
山

Meaning:
Mountain

Looks Like:
Three mountain peaks

Readings

さん
やま

Words

山
やま

富士山
ふじさん
```

Always include:

-   Meaning
-   Mnemonic
-   Stroke order
-   Onyomi
-   Kunyomi
-   Example vocabulary
-   Example sentence

------------------------------------------------------------------------

# Teach Radicals Early

Example:

``` text
休

亻 Person

木 Tree

↓

Person resting against a tree

Meaning:
Rest
```

Teach students to recognize building blocks rather than memorize
drawings.

------------------------------------------------------------------------

# Lesson Motivation

Every lesson should explain why it exists.

Instead of:

Lesson 12

Display:

"Today you'll learn the symbols needed to read 35 common Japanese
words."

Purpose increases motivation.

------------------------------------------------------------------------

# AI Tutor

The application should generate personalized coaching.

Examples:

-   You're remembering meanings but forgetting readings.
-   You're confusing め and ぬ.
-   You answer quickly but often misread Katakana.
-   You haven't reviewed small ゃ in five days.
-   You're ready for your first complete Japanese sentence.

The app should feel like an instructor.

------------------------------------------------------------------------

# Sumo Learning Trail

After Hiragana and Katakana, unlock optional themed trails.

Example progression:

``` text
山
↓

富士

↓

富士山

↓

力士

↓

土俵

↓

横綱

↓

勝

↓

負

↓

行司
```

Users interested in Grand Sumo immediately learn vocabulary they care
about.

------------------------------------------------------------------------

# Tutor Brain

Every character progresses through mastery stages.

``` text
Teach
    ↓
Recognize
    ↓
Recall
    ↓
Read Words
    ↓
Read Sentences
    ↓
Write
    ↓
Spaced Review
```

Each symbol advances independently.

The tutor always knows:

-   What the learner knows
-   What they confuse
-   What should be reviewed next
-   What lesson should come next

------------------------------------------------------------------------

# Future Enhancements

-   Spaced repetition scheduling
-   Stroke-order drawing practice
-   Speech recognition
-   Handwriting recognition
-   Furigana toggle
-   Difficulty adaptation
-   Daily goals
-   Achievement system
-   JLPT-aligned learning paths
-   Reading comprehension challenges
-   Story mode
-   Offline learning
-   Progress analytics

------------------------------------------------------------------------

# Success Metric

The goal is not that users memorize characters.

The goal is that users gradually become comfortable reading authentic
Japanese.

When users finish the Beginner Trail, they should be able to:

-   Read all Hiragana
-   Read all Katakana
-   Understand basic Kanji structure
-   Recognize common radicals
-   Read simple Japanese words
-   Begin reading beginner-level Japanese with confidence

Mount Kanji should feel like climbing a mountain with an experienced
guide beside you---not studying a stack of flash cards.
