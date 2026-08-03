# Hiragana Handwriting Trail Plan

## Summary

Add a dedicated optional handwriting trail for Mount Hiragana. The learner draws the prompted hiragana on a canvas, the app runs a local visual similarity check against the rendered target glyph, and the trail gives Correct / Try Again feedback. Only correct handwriting checks advance progress.

## Product Decisions

- First implementation is Hiragana only.
- Verification is local and heuristic, not ML or a remote API.
- Jisho.org validates the draw-and-recognize UX, but the app should not depend on Jisho scraping or a live Jisho widget.
- Kanji handwriting should be a later phase using stroke/vector data such as KanjiVG.
- Failed handwriting checks are practice feedback only and do not affect accuracy or weak-symbol stats.
- Correct handwriting checks record progress toward known status.

## Implementation Checklist

- [x] Create this implementation plan and progress tracker.
- [ ] Add a `handwriting` quiz attempt type.
- [ ] Add handwriting session state to the app.
- [ ] Add a Mount Hiragana dashboard button for `Handwriting Trail`.
- [ ] Build a responsive canvas drawing UI with pointer input.
- [ ] Add controls for `Clear`, `Show Guide`, `Verify`, and next-symbol flow.
- [ ] Implement local glyph comparison against an offscreen rendered hiragana target.
- [ ] Connect correct verification to progress recording.
- [ ] Ensure failed verification does not record an attempt.
- [ ] Route the session to the existing summary/progress experience.
- [ ] Add focused verifier and flow tests.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.

## Key Implementation Notes

- Extend `Screen` in `src/App.tsx` with a handwriting screen.
- Extend `QuizType` in `src/types/quiz.ts` with `handwriting`.
- Reuse the selected Hiragana lesson segment logic so excluded and known symbols behave like existing trails.
- Use Pointer Events so mouse, touch, and stylus all work through one input path.
- Store user drawing as stroke point arrays in React state, then render to a visible canvas and to an offscreen comparison canvas.
- Render the target glyph into an offscreen canvas using the existing Japanese font stack.
- Normalize both canvases into a fixed-size grid before comparing.
- Score similarity using a weighted mix of ink overlap, bounding-box fit, center alignment, and coverage.
- Keep the acceptance threshold conservative enough to reject blank, tiny, or off-center marks.
- Show practical feedback after failed checks, such as drawing larger, centering the mark, or matching the overall shape more closely.

## UI Behavior

- Dashboard button label: `Handwriting Trail`.
- Button appears only when Mount Hiragana is active.
- Header: `Handwriting Trail - {lesson title}`.
- Prompt shows the sound/romaji first, not the target symbol by default.
- Canvas is square, responsive, and visually stable.
- A light grid is always visible.
- The target guide is hidden by default and can be toggled.
- `Verify` is disabled until the learner draws.
- Correct feedback enables advancing to the next symbol.
- Incorrect feedback keeps the learner on the same symbol and leaves progress unchanged.

## Test Plan

- Blank drawing is rejected.
- Matching rendered hiragana sample is accepted.
- Very small marks are rejected.
- Off-center marks are rejected.
- Wrong-target comparison scores lower than correct-target comparison.
- Mount Hiragana exposes the handwriting trail button.
- Mount Katakana and Mount Kanji do not expose the handwriting trail button in v1.
- Failed handwriting checks do not create quiz attempts or update progress.
- Correct handwriting checks create a `handwriting` quiz attempt and advance progress.

## Later Phases

- Add Katakana handwriting after Hiragana thresholds feel usable.
- Add licensed kana stroke reference data if available.
- Add Kanji handwriting with KanjiVG stroke paths, stroke count, stroke order, and stroke direction.
- Consider a recognition API only if local verification proves too noisy for learning.
