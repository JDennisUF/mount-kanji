# Mount Kanji

Web-only kanji learning app with a mountain-progression theme, built with React, TypeScript, and Vite.

## Current Status

- Project scaffolded in repository root.
- Tailwind v4 (via Vite plugin) wired and active.
- Initial Base Camp dashboard UI implemented.
- First domain model types added.
- Browser storage persistence wired for static hosting.
- Spaced repetition and review scheduling service foundations added.

## Stack

- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS v4
- Data: `localStorage`

## Run

1. Install JS dependencies:

	npm install

2. Start the dev server:

	npm run dev

3. Build the static production bundle:

	npm run build

The output is written to `dist/` and is ready for GitHub Pages deployment.

## GitHub Pages

A GitHub Actions workflow is included at `.github/workflows/deploy-pages.yml`. Enable GitHub Pages in the repository settings and set the source to GitHub Actions.

## Next Implementation Targets

1. Expand lesson content and seed coverage.
2. Add import/export for learner progress.
3. Refine review queue pacing and difficulty tuning.
4. Broaden test coverage around UI flows and persistence.
