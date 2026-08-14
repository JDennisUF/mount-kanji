# URL Parameterization Plan

## Goal

Make Mount Kanji navigation refresh-safe and shareable enough that a user can reload the browser without losing their current app location.

The first version should preserve durable navigation state in the URL:

- Active mount: Base Camp, Hiragana, Katakana, or Kanji
- Active screen: dashboard, Base Camp intro, lesson, quiz, handwriting, context, summary, dictionary, progress, settings, Heya
- Selected Base Camp intro
- Selected lesson camp per mount
- In-session step indexes where practical
- Dictionary and Heya filters

Learning progress and settings should remain in localStorage as they do today.

## Current Problem

`src/App.tsx` keeps nearly all UI navigation in React state:

- `screen`
- `activeMount`
- `activeTrack`
- `baseStudyIndex`
- `lessonIndex`
- `quizIndex`
- `handwritingIndex`
- `contextIndex`
- `activeLessonItems`
- `activeLessonTitle`
- `contextExamples`
- `quizQuestions`
- dictionary and Heya filter state

On browser refresh, React initializes back to default state, so the app returns to the Base Camp dashboard even though progress is still saved.

## Recommended Approach

Use browser History API directly instead of adding React Router for the first pass.

Reasons:

- This app is currently a single-component state machine, not a route-tree app.
- `react-router` is not installed.
- The Vite app is served under `/mount-kanji/`, so direct browser paths would require deployment/server fallback configuration.
- Query parameters work with the current deployment shape and avoid server rewrite requirements.

Use canonical URLs shaped like:

```text
/mount-kanji/?mount=base
/mount-kanji/?mount=base&screen=intro&intro=6
/mount-kanji/?mount=hiragana
/mount-kanji/?mount=hiragana&screen=lesson&camp=3&step=2
/mount-kanji/?mount=hiragana&screen=quiz&camp=3&q=4
/mount-kanji/?mount=katakana&screen=handwriting&camp=2&step=5
/mount-kanji/?mount=kanji&screen=dictionary&q=mountain&radical=山&tags=n5,nature
/mount-kanji/?screen=progress&mount=kanji
/mount-kanji/?screen=sumo&q=yokozuna&category=ranks
/mount-kanji/?screen=settings
```

Decision: query parameters are acceptable for this app. Direct path routing can stay out of scope unless the app later needs a larger route tree or server-backed deep links.

## Route Model

Create a small typed route model:

```ts
type AppRoute =
  | { screen: "dashboard"; mount: MountSelection; track?: StudyTrack; camp?: number }
  | { screen: "baseStudy"; mount: "base"; intro: number }
  | { screen: "lesson"; mount: StudyTrack; camp: number; step: number }
  | { screen: "quiz"; mount: StudyTrack; camp: number; q: number }
  | { screen: "handwriting"; mount: "hiragana" | "katakana"; camp: number; step: number }
  | { screen: "context"; mount: StudyTrack; camp: number; step: number }
  | { screen: "summary"; mount: StudyTrack; camp: number }
  | { screen: "dictionary"; mount: StudyTrack; q?: string; radical?: string; sumoOnly?: boolean; tags?: string[] }
  | { screen: "progress"; mount?: StudyTrack }
  | { screen: "sumo"; q?: string; category?: SumoCategoryFilter }
  | { screen: "settings" };
```

Keep the external parameter names short and stable:

- `mount=base|hiragana|katakana|kanji`
- `screen=dashboard|intro|lesson|quiz|handwriting|context|summary|dictionary|progress|sumo|settings`
- `intro=1..N`
- `camp=1..N`
- `step=1..N`
- `q=search text`
- `radical=...`
- `sumo=1`
- `tags=tag-a,tag-b`
- `category=all|basics|events|ranks|match|record`

Use 1-based indexes in the URL for human readability, then convert to 0-based indexes inside React state.

## Implementation Steps

1. Add route utilities.

Create `src/routing/appRoute.ts` with:

- `parseAppRoute(search: string): AppRoute`
- `serializeAppRoute(route: AppRoute): string`
- Clamp/validation helpers for mount, screen, intro, camp, and step values
- A fallback route of `{ screen: "dashboard", mount: "base" }`

2. Add a route application function in `App.tsx`.

Add `applyRoute(route: AppRoute)` that updates the existing state safely:

- Base dashboard: set `activeMount` to `base`, `screen` to `dashboard`
- Base intro: set `activeMount` to `base`, clamp `baseStudyIndex`, set `screen` to `baseStudy`
- Mount dashboard: set `activeMount` and `activeTrack`, select camp, set `screen` to `dashboard`
- Dictionary: set `activeTrack`, `activeMount`, filters, selected item fallback, set `screen`
- Progress/settings/sumo: set the appropriate screen and restore filters

3. Add session reconstruction for study flows.

Current lesson, quiz, context, handwriting, and summary screens depend on generated arrays:

- `activeLessonItems`
- `quizQuestions`
- `contextExamples`

On refresh, these arrays are empty unless rebuilt. Add a helper like:

```ts
prepareStudySessionFromRoute(track, camp, mode)
```

It should reuse the same logic as `startLesson` and `startHandwritingTrail` to rebuild the selected lesson segment and derived quiz/context data. Then apply `step`, `q`, or context step after arrays are rebuilt and clamped.

Important: quiz questions currently use `shuffle`, so a refresh may produce a different order unless we add deterministic seeding. For refresh-safe quiz position, add a route/session seed.

Recommended query:

```text
seed=1734123456789
```

Then replace session shuffling with seeded shuffling when a route seed is present.

Decision: deterministic seeded quiz order can wait. The first implementation should restore the current lesson position and top-level app location. Mid-quiz reconstruction can be best-effort or deferred to Phase 2.

4. Add URL writing.

Do not call `history.pushState` on every keystroke or every transient answer state.

Use:

- `pushState` for user navigation: clicking nav buttons, choosing mount, starting intro, starting lesson, opening dictionary/progress/settings/sumo
- `replaceState` for in-flow progress: next teach card, next quiz question, next handwriting prompt, filter changes
- Committed filter updates only for dictionary and Heya search text. Do not update the URL on every keystroke.

Examples:

- `switchTrack("kanji")` pushes `?mount=kanji`
- `startBaseStudy(5)` pushes `?mount=base&screen=intro&intro=6`
- `startLesson(2)` pushes `?mount=hiragana&screen=lesson&camp=3&step=1&seed=...`
- `advanceFromTeach()` replaces `step=2`, or pushes/replaces `screen=quiz&q=1` when teach ends
- Dictionary search replaces `q=...`

5. Handle browser back and forward.

Add a `popstate` listener:

```ts
useEffect(() => {
  const onPopState = () => applyRoute(parseAppRoute(window.location.search));
  window.addEventListener("popstate", onPopState);
  return () => window.removeEventListener("popstate", onPopState);
}, [applyRoute]);
```

Guard against update loops:

- Applying a route should not immediately write the same route back.
- Use a ref such as `isApplyingRouteRef`.

6. Initial hydration order.

On first app load:

1. Load settings from localStorage.
2. Hydrate progress from repository.
3. Parse the URL.
4. Apply route after progress is hydrated if the route needs lesson eligibility.

Routes that do not depend on progress, such as Base Camp intros, settings, progress, dictionary, and Heya, can apply immediately. Lesson and quiz routes should wait until progress is hydrated so eligible item reconstruction matches the current learner state.

7. Add tests.

Add unit tests for `src/routing/appRoute.ts`:

- Parses valid Base Camp intro route
- Clamps bad intro/camp/step values
- Falls back from unknown mount/screen values
- Round-trips dictionary filters
- Round-trips Heya filters
- Serializes with 1-based indexes

Add a focused React-level smoke test only if the existing test setup grows a component test environment. Otherwise keep this first pass covered by pure route utility tests and TypeScript build.

## Deep-Link Behavior Matrix

| Screen | Refresh-safe in first pass? | Notes |
| --- | --- | --- |
| Base dashboard | Yes | Simple route state |
| Base intro | Yes | `intro` maps directly to `baseStudyIndex` |
| Mount dashboard | Yes | `mount` and `camp` map to active track and lesson cursor |
| Dictionary/reference | Yes | Restore search/filter params |
| Progress | Yes | Restore selected mount context |
| Heya | Yes | Restore search/category params |
| Settings | Yes | Screen only; settings values remain localStorage-backed |
| Lesson teach cards | Yes | Rebuild lesson segment from selected camp, then apply `step` |
| Handwriting | Yes | Rebuild handwriting segment, then apply `step`; drawing strokes are not restored |
| Quiz | Deferred | Restore top-level/current lesson location first; deterministic quiz state waits for Phase 2 |
| Context | Yes | Rebuild context examples from selected session, then apply `step` |
| Summary | Partial | Summary depends on session score/misses unless these are persisted or encoded |

## Recommended Scope For First Implementation

Phase 1 should include:

- URL parse/serialize utilities
- URL-backed navigation for all top-level screens
- Refresh-safe Base Camp intro, mount dashboard, dictionary, progress, Heya, and settings
- Refresh-safe selected lesson camp
- Refresh-safe current lesson teach-card position
- Dictionary and Heya query params updated after commit, such as pressing Enter or leaving the field
- Tests for route utilities

Phase 2 should include:

- Reconstructable handwriting, quiz, context, and summary routes
- Seeded session generation for quiz/matching/concentration order
- Optional sessionStorage backup for transient score, misses, and feedback state

This split gets the highest-value refresh behavior working quickly while avoiding brittle restoration of mid-quiz state before the session model is deterministic.

## Open Questions

1. Resolved: query parameters are acceptable.
2. Resolved: restore the current lesson position; full mid-quiz transient state is not required in Phase 1.
3. Resolved: shareable URL behavior is not a priority, so use the simplest learner-local reconstruction.
4. Resolved: deterministic seeded quiz order can wait.
5. Resolved: dictionary and Heya search text should update the URL only after commit, such as pressing Enter or leaving the field.
