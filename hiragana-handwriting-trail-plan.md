# Kana Handwriting Trail Plan

## Summary

Add a dedicated optional handwriting trail for Mount Hiragana and Mount Katakana. The learner draws the prompted kana on a canvas, the app runs a local visual similarity check against the rendered target glyph, and the trail gives Correct / Try Again feedback. Handwriting practice does not affect known counts or summit progress.

## Product Decisions

- Handwriting support covers Hiragana and Katakana.
- Verification is local and heuristic, not ML or a remote API.
- Jisho.org validates the draw-and-recognize UX, but the app should not depend on Jisho scraping or a live Jisho widget.
- Kanji handwriting should be a later phase using stroke/vector data such as KanjiVG.
- Handwriting checks are practice feedback only and do not affect accuracy, weak-symbol stats, known counts, or summit progress.

## Implementation Checklist

- [x] Create this implementation plan and progress tracker.
- [x] Add a `handwriting` quiz attempt type.
- [x] Add handwriting session state to the app.
- [x] Add a Mount Hiragana and Mount Katakana dashboard button for `Handwriting Trail`.
- [x] Build a responsive drawing UI with pointer input.
- [x] Add controls for `Clear`, `Show Guide`, `Verify`, and next-symbol flow.
- [x] Implement local raster comparison against the rendered kana guide.
- [x] Keep handwriting verification separate from mastery progress.
- [x] Ensure handwriting verification does not record quiz attempts.
- [x] Route the session to the existing summary/progress experience.
- [x] Add focused verifier tests.
- [x] Run `npm test`.
- [x] Run `npm run build`.

## Key Implementation Notes

- Extend `Screen` in `src/App.tsx` with a handwriting screen.
- Extend `QuizType` in `src/types/quiz.ts` with `handwriting`.
- Reuse the selected kana lesson segment logic so excluded and known symbols behave like existing trails.
- Use Pointer Events so mouse, touch, and stylus all work through one input path.
- Store user drawing as stroke point arrays in React state, then render to a visible canvas and to an offscreen comparison canvas.
- V1 uses rendered glyph verification for supported kana camps.
- Supported camps: all Hiragana and Katakana camps, from Vowel Ridge through M And R Yoon.
- Rasterize the visible guide glyph and user strokes into the same square before comparing.
- Score similarity using a weighted mix of ink overlap, drawing size, and center alignment.
- Keep the acceptance threshold conservative enough to reject blank, tiny, or off-center marks.
- Show practical feedback after failed checks, such as drawing larger, centering the mark, or matching the overall shape more closely.

## UI Behavior

- Dashboard button label: `Handwriting Trail`.
- Button appears when Mount Hiragana or Mount Katakana is active.
- Header: `Handwriting Trail - {lesson title}`.
- Prompt shows the sound/romaji first, not the target symbol by default.
- Canvas is square, responsive, and visually stable.
- A light grid is always visible.
- The target guide is hidden by default and can be toggled.
- `Verify` is disabled until the learner draws.
- Correct feedback enables advancing to the next symbol without changing progress.
- Incorrect feedback keeps the learner on the same symbol without changing progress.

## Test Plan

- Blank drawing is rejected.
- Matching rendered kana sample is accepted.
- Very small marks are rejected.
- Off-center marks are rejected.
- Wrong-target comparison scores lower than correct-target comparison.
- Mount Hiragana and Mount Katakana expose the handwriting trail button.
- Mount Kanji does not expose the handwriting trail button in v1.
- Handwriting checks do not create quiz attempts or update progress.

## Current Status

- Implemented and verified with `npm test` and `npm run build`.
- Automatic verification currently covers all Hiragana and Katakana camps.
- Verification now uses the same rendered glyph shown by `Show Guide`, so tracing the guide should produce a passing score.
- Unsupported tracks show a dashboard message.

## Later Phases

- Add licensed kana stroke reference data if available.
- Add Kanji handwriting with KanjiVG stroke paths, stroke count, stroke order, and stroke direction.
- Consider a recognition API only if local verification proves too noisy for learning.
