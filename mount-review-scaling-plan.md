# Mount Review Scaling Plan

## Goal

Change Mount Kanji, Mount Hiragana, and Mount Katakana so that:

1. Each symbol is reviewed until the learner answers it correctly 5 times.
2. The 5 correct answers are cumulative, not consecutive.
3. Wrong answers do not subtract from prior correct answers.
4. After the 5th correct answer, the symbol is marked `known`.
5. Known symbols are removed from future testing unless we explicitly choose to reintroduce them later.
6. Each symbol that becomes known advances the learner one step farther up that mount.

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
- The current UI also has a separate review mode in [src/App.tsx](/home/jasondennis/code/mount-kanji/src/App.tsx):
  - dashboard `Start Reviews`
  - a `reviewQueue`
  - a `Trouble Spot Review` screen with manual `Got It` / `Missed It` buttons

## Implementation Plan

### 1. Normalize the data model around `StudyItem`

Before adding shared mount logic, make progress types script-agnostic.

- Rename or alias `UserKanjiProgress` to a generic type such as `UserItemProgress`.
- Replace `kanjiId` with `itemId` everywhere progress is read, written, sorted, or tested.
- End with one item-based model for all scripts.
- Extend `StudyTrack` in [src/types/kanji.ts](/home/jasondennis/code/mount-kanji/src/types/kanji.ts) from `"kanji" | "hiragana"` to include `"katakana"`.

Why this first:

- The 5-correct rule needs to work identically across all three mounts.
- Keeping kanji-specific naming in the review layer will create duplication as Hiragana and Katakana land.

### 2. Replace the current status system with a simple 5-correct known rule

Move the review logic away from weighted familiarity tiers.

- Define a single threshold constant, for example `KNOWN_CORRECT_THRESHOLD = 5`.
- Update the progress status model to something minimal:
  - `new`
  - `learning`
  - `known`
- On a correct answer:
  - increment `correctCount`
  - if the new `correctCount >= 5`, set status to `known`
- On an incorrect answer:
  - increment `incorrectCount`
  - do not subtract from `correctCount`
  - do not apply any penalty multiplier or streak reset rule beyond recording the miss

Implementation consequence:

- `currentStreak`, `bestStreak`, and `reviewWeight` are no longer needed for correctness or completion.

### 3. Remove weighted review logic and reevaluate the standalone Review flow

The current standalone review flow exists to support:

- `reviewWeight`
- “due now” behavior
- a separate manual retry loop

Those assumptions weaken once the product rule becomes “5 cumulative correct answers, no penalties for misses.”

Recommended direction:

- remove `reviewWeight`
- remove due-queue behavior
- remove any logic that depends on misses making cards come back sooner

The product decision is now:

- delete the standalone Review screen
- do not keep a second persistent review mode
- if users still need extra practice, return missed symbols during the next quiz flow instead of sending them to a separate page

KISS view:

- a second persistent screen with `Got It` / `Missed It` controls is hard to justify if the main quiz already records correct and incorrect attempts
- unless review is doing something materially different, it is probably duplication

### 4. Keep any remaining queue logic status-based and simple

If any retry or practice queue remains, it should be simple.

- include items where `status !== "known"`
- continue excluding `excludedFromLessons`
- prefer ordering by:
  - lower `correctCount` first
  - then higher `incorrectCount`
  - then oldest `lastReviewedAt`

With the standalone Review screen removed, any queue helper becomes quiz support logic rather than a full review subsystem.

### 5. Add mount-progress calculation tied to newly known symbols

Introduce an explicit mount-progress model instead of inferring it indirectly.

- Add a mount progress structure, likely one record per script:
  - `track`: `kanji | hiragana | katakana`
  - `stepsClimbed`
  - `totalSteps`
  - optional derived values such as `knownCount` and `remainingCount`
- Make `stepsClimbed` equal the number of symbols in that mount whose status is `known`.
- Increase the visible climb by one step exactly when an item crosses from not-known to known.

Recommended rule:

- do not store `stepsClimbed` as an independently mutable counter unless the UI needs animation history
- prefer deriving it from progress state to avoid drift

If the UI needs to trigger a one-step animation the moment an item becomes known:

- return transition metadata from `applyResult`, such as:
  - `becameKnown: boolean`
  - `updatedProgress`

### 6. Make lesson and mount content share one progression contract

The lesson catalogs already batch symbols into groups of 5 in:

- [src/data/seed/lessonCatalog.ts](/home/jasondennis/code/mount-kanji/src/data/seed/lessonCatalog.ts)
- [src/data/seed/hiraganaLessonCatalog.ts](/home/jasondennis/code/mount-kanji/src/data/seed/hiraganaLessonCatalog.ts)

Rules for the new design:

- mount progress is based on all symbols in the mount, not only introduced symbols
- lessons still control introduction order
- lesson completion and mount advancement remain separate concerns
- known-count controls climb progress

Possible extension:

- add milestone markers such as:
  - basic Hiragana complete
  - basic Katakana complete
  - N5 Kanji complete
  - later Kanji bands

Use mountain-climbing terminology for these milestone markers.

Recommended naming:

- `Base Camp` for the starting point
- `Camp` markers for intermediate milestones
- `Summit` for full completion

These camps should be display milestones layered on top of full-mount progress, not replacements for full summit progress.

### 7. Reset persistence shape instead of migrating old progress

You explicitly do not care about preserving existing progress, so the implementation can stay simpler.

Recommended approach:

- switch the stored progress format to the new `itemId`-based model
- if existing localStorage data does not match the new shape, discard it and start fresh
- if useful, bump the storage key name so the app naturally ignores old persisted data
- remove compatibility code that would only exist to support the old kanji-specific schema

### 8. Update quiz-attempt persistence and validation

[src/types/quiz.ts](/home/jasondennis/code/mount-kanji/src/types/quiz.ts) already uses `itemId`, but [src/repositories/progressRepository.ts](/home/jasondennis/code/mount-kanji/src/repositories/progressRepository.ts) still validates `kanjiId`.

Fix that mismatch while touching the repository layer.

- make the validator accept `itemId`
- drop backward compatibility with `kanjiId` if we are intentionally resetting stored progress
- ensure attempt persistence works for all three scripts

### 9. Tighten test coverage around the new rule

Replace the current `reviewTracker` tests in [src/services/__tests__/reviewTracker.test.ts](/home/jasondennis/code/mount-kanji/src/services/__tests__/reviewTracker.test.ts) with cases that match the new contract.

Required test cases:

- a new item stays `new` until first attempt
- a correct answer increments `correctCount`
- an incorrect answer increments `incorrectCount`
- no miss ever reduces `correctCount`
- an item becomes `known` exactly on the 5th correct answer
- once known, the item is excluded from any remaining practice queue
- mount progress equals known-count for each script
- storage reset behavior ignores old incompatible progress payloads

### 10. Add an explicit mount-progress visualization on the Progress page

The Progress page should show all three mounts at once and make overall climb state legible immediately.

Implementation requirements:

- show dedicated progress visuals for:
  - Mount Kanji
  - Mount Hiragana
  - Mount Katakana
- the visual must show both:
  - completed climb
  - remaining climb
- the visual must respond directly to derived mount progress across all symbols in that mount
- each newly known symbol should move the indicator forward by one step

Recommended UI contract:

- quiz result UI should indicate when a symbol becomes known
- mount progress should animate forward immediately on that transition
- known symbols should disappear from future testing
- the Progress page should show:
  - symbols known
  - symbols remaining
  - percentage to summit
  - current step and total steps
  - a visual mountain indicator with a clear current position marker

Recommended visual approach:

- use a simple, stylistic mountain path or trail for each mount
- place a climber marker at the current position
- visibly differentiate completed and remaining segments
- label the base and summit so direction is obvious
- show camp markers for milestone goals like basic kana complete or N5 complete
- keep the component data-driven so the same UI pattern works for Kanji, Hiragana, and Katakana

Suggested component shape:

- `MountProgressCard`
  - accepts `track`, `knownCount`, `remainingCount`, `totalSteps`, and `percentComplete`
- optional `MountProgressTrail`
  - renders the visual path and current marker based on those values

## Suggested Delivery Order

1. Normalize progress and repository types to `itemId`.
2. Add `katakana` to the shared script model.
3. Simplify `ReviewTracker` to the 5-correct rule.
4. Remove `reviewWeight`, due-now behavior, and other penalty-driven review logic.
5. Delete the standalone Review screen and route misses back into future quizzes.
6. Add derived mount-progress helpers per script.
7. Reset persistence to the new storage shape.
8. Update tests.
9. Build the Progress page mount visualization and wire it to known transitions and mount-step updates.

## Decisions Made

These are now fixed product decisions:

1. The 5 correct answers are cumulative.
2. Wrong answers do not erase prior correct answers.
3. Mount progress is based on all symbols in the mount.
4. The Progress page should show all three mounts at once.
5. The visual should be a simple, stylistic mountain with a climber advancing up it.
6. No miss penalty should exist if it creates a frustrating user experience.
7. The standalone Review screen should be removed.
8. Known is permanent.
9. Missed symbols should return during later quizzes, not in a separate review mode.
10. Status labels can be simplified to `new`, `learning`, and `known`.
11. The climber should animate forward immediately when a symbol becomes `known`.

## Open Questions

These still need confirmation before implementation:

1. Do you want the camp names to stay generic, or do you want custom names per mount after the first implementation?

## Recommended Defaults

If you want the simplest coherent implementation, use these answers:

1. Use generic camp names first, then add custom mount-specific camp names later if needed.

That design is the cleanest fit for the product rule you described, and it keeps Kanji, Hiragana, and Katakana on one shared progression system.
