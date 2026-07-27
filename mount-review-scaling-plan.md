# Mount Review Scaling Plan

## Goal

Change Mount Kanji, Mount Hiragana, and Mount Katakana so that:

1. Each symbol is reviewed until the learner answers it correctly 5 times.
2. After the 5th correct answer, the symbol is marked `known`.
3. Known symbols are removed from future testing.
4. Each symbol that becomes known advances the learner one step farther up that mount.

## Current State

The current repo has review plumbing, but it does not yet match the target behavior.

- Review progression is driven by `status`, `correctCount`, `incorrectCount`, `currentStreak`, and `reviewWeight` in [src/types/progress.ts](/home/jasondennis/code/mount-kanji/src/types/progress.ts).
- Review state transitions live in [src/services/reviewTracker.ts](/home/jasondennis/code/mount-kanji/src/services/reviewTracker.ts).
- The current status rules are still SRS-style:
  - `familiar` after 3 correct or streak 3
  - `mastered` after 8 correct, 90% accuracy, and streak 5
- Queue selection currently depends on `reviewWeight > 0`, not on a `known` cutoff.
- The repository layer persists a single progress map in localStorage at [src/repositories/progressRepository.ts](/home/jasondennis/code/mount-kanji/src/repositories/progressRepository.ts).
- The domain model is mid-transition:
  - [src/types/kanji.ts](/home/jasondennis/code/mount-kanji/src/types/kanji.ts) already has a generic `StudyItem` with `script`.
  - Progress and review naming is still mostly kanji-specific (`UserKanjiProgress`, `kanjiId`).
  - [src/types/quiz.ts](/home/jasondennis/code/mount-kanji/src/types/quiz.ts) uses `itemId`, while `progressRepository.ts` still validates `kanjiId`.

## Implementation Plan

### 1. Normalize the data model around `StudyItem`

Before adding shared mount logic, make progress types script-agnostic.

- Rename or alias `UserKanjiProgress` to a generic type such as `UserItemProgress`.
- Replace `kanjiId` with `itemId` everywhere progress is read, written, sorted, or tested.
- Keep the type and repository interfaces compatible during rollout if needed, but the end state should use one item-based model for all scripts.
- Extend `StudyTrack` in [src/types/kanji.ts](/home/jasondennis/code/mount-kanji/src/types/kanji.ts) from `"kanji" | "hiragana"` to include `"katakana"`.

Why this first:

- The 5-correct rule is supposed to work identically across three mounts.
- Keeping kanji-specific naming in the review layer will create duplication or brittle branching as Hiragana and Katakana land.

### 2. Replace the current status system with a simple known/not-known review rule

Move the review logic away from weighted familiarity tiers.

- Define a single threshold constant, for example `KNOWN_CORRECT_THRESHOLD = 5`.
- Update the progress status model so it cleanly represents the new behavior.
- A minimal option is:
  - `new`
  - `learning`
  - `known`
- On a correct answer:
  - increment `correctCount`
  - if the new `correctCount >= 5`, set status to `known`
- On an incorrect answer:
  - increment `incorrectCount`
  - keep the item eligible for review unless it is already known and the product explicitly allows known items to be reintroduced later

Important implementation note:

- The user request says “correctly review each symbol 5 times,” which reads as cumulative correct answers, not necessarily 5 in a row.
- Unless you decide otherwise, `currentStreak`, `bestStreak`, and `reviewWeight` become unnecessary for correctness and queue eligibility.

### 3. Change queue generation so known items are excluded

Update the queue rules in [src/services/reviewTracker.ts](/home/jasondennis/code/mount-kanji/src/services/reviewTracker.ts).

- Replace the current `reviewWeight > 0` filter with a direct status-based rule:
  - include items where `status !== "known"`
  - continue excluding `excludedFromLessons`
- Keep queue ordering simple and stable.
- Good default ordering:
  - lower `correctCount` first
  - then higher `incorrectCount`
  - then oldest `lastReviewedAt`

This matches the new product goal better than maintaining an SRS weight field that no longer controls completion.

### 4. Add mount-progress calculation tied to newly known symbols

Introduce an explicit mount-progress model instead of inferring it indirectly.

- Add a mount progress structure, likely one record per script:
  - `track`: `kanji | hiragana | katakana`
  - `stepsClimbed`
  - `totalSteps`
  - optional derived values such as `knownCount` and `remainingCount`
- Make `stepsClimbed` equal the number of symbols in that mount whose status is `known`.
- Increase the visible climb by one step exactly when an item crosses from not-known to known.

Recommended rule:

- Do not store `stepsClimbed` as an independently mutable counter unless the UI needs animation history.
- Prefer deriving it from progress state to avoid drift between review results and mount position.

If the UI needs to trigger a one-step animation the moment an item becomes known:

- return transition metadata from `applyResult`, such as:
  - `becameKnown: boolean`
  - `updatedProgress`

That gives the UI a reliable signal for animation without making persistence more fragile.

### 5. Make lesson and mount content share one progression contract

The lesson catalogs already batch symbols into groups of 5 in:

- [src/data/seed/lessonCatalog.ts](/home/jasondennis/code/mount-kanji/src/data/seed/lessonCatalog.ts)
- [src/data/seed/hiraganaLessonCatalog.ts](/home/jasondennis/code/mount-kanji/src/data/seed/hiraganaLessonCatalog.ts)

The review rule should not depend on lesson boundaries.

- Any symbol introduced in a mount should remain in the active pool until it becomes known.
- Lesson completion and mount advancement should be separate concerns:
  - lessons control introduction order
  - known-count controls climb progress

This avoids a common failure mode where lesson completion says the learner progressed even though symbols still need review.

### 6. Add a localStorage migration path

Existing local data will not match the new shape cleanly.

Update [src/repositories/progressRepository.ts](/home/jasondennis/code/mount-kanji/src/repositories/progressRepository.ts) so it can load old progress safely and normalize it.

Migration responsibilities:

- accept older records that still use `kanjiId`
- map `kanjiId -> itemId`
- translate old statuses:
  - `mastered` -> `known`
  - `familiar` / `learning` -> `learning`
  - `new` -> `new`
- decide what to do with old counts above the new threshold
  - simplest rule: any item with `correctCount >= 5` loads as `known`
- drop fields that are no longer needed once the app no longer reads them

This migration should be handled at load time so users do not lose progress.

### 7. Update quiz-attempt persistence and validation

[src/types/quiz.ts](/home/jasondennis/code/mount-kanji/src/types/quiz.ts) already uses `itemId`, but [src/repositories/progressRepository.ts](/home/jasondennis/code/mount-kanji/src/repositories/progressRepository.ts) still validates `kanjiId`.

Fix that mismatch while touching the repository layer.

- make the validator accept `itemId`
- decide whether backward compatibility with `kanjiId` is needed for stored attempts
- ensure review analytics keep working for all three scripts

### 8. Tighten test coverage around the new rule

Replace the current `reviewTracker` tests in [src/services/__tests__/reviewTracker.test.ts](/home/jasondennis/code/mount-kanji/src/services/__tests__/reviewTracker.test.ts) with cases that match the new contract.

Required test cases:

- a new item stays `new` until first attempt
- a correct answer increments `correctCount`
- an incorrect answer increments `incorrectCount`
- an item becomes `known` exactly on the 5th correct answer
- once known, the item is excluded from the review queue
- queue generation only returns non-known items
- migration loads legacy `kanjiId` records correctly
- mount progress equals known-count for each script

### 9. UI integration work after the data model change

There is not enough checked-in UI code in this branch to map exact components, but the UI work should follow this contract:

- review result screen should indicate when a symbol becomes known
- mount display should advance one step on that transition
- known symbols should disappear from upcoming review prompts
- summary surfaces should show:
  - symbols known
  - symbols remaining
  - progress toward summit for the active mount

The UI should consume derived state from the review layer, not reimplement the 5-correct rule itself.

## Suggested Delivery Order

1. Normalize progress and repository types to `itemId`.
2. Add `katakana` to the shared script model.
3. Simplify `ReviewTracker` to the 5-correct rule.
4. Add derived mount-progress helpers per script.
5. Add migration logic for existing localStorage data.
6. Update tests.
7. Wire the UI to known transitions and mount-step updates.

## Decisions Needed

These points need confirmation before implementation:

1. Are the 5 correct answers cumulative, or do they need to be consecutive?
2. If the learner gets a symbol wrong after previously answering it correctly a few times, do earlier correct answers still count?
3. Should a known symbol stay permanently known, or can it ever be reintroduced later?
4. Should mount progress be exactly `knownCount / totalSymbolsInThatMount`, or do you want lesson-gated progress where only introduced symbols count toward the current climb?
5. Should the app review only symbols that have already been introduced by lessons, or can any mount symbol appear once the learner starts that mount?
6. Do you want the existing status names preserved in the UI, or is it acceptable to simplify them to `new`, `learning`, and `known`?

## Recommended Defaults

If you want the simplest coherent implementation, use these answers:

1. 5 correct answers are cumulative.
2. Wrong answers do not erase prior correct answers.
3. Known symbols stay known and are removed from testing.
4. Mount progress equals the number of known symbols in that mount.
5. Only introduced symbols are eligible for review.
6. Statuses are simplified to `new`, `learning`, and `known`.

That design is the cleanest fit for the product rule you described, and it keeps Kanji, Hiragana, and Katakana on one shared progression system.
