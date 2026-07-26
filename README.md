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
- Hosting target: GitHub Pages at `/mount-kanji/`

## Run

1. Install JS dependencies:

	npm install

2. Start the dev server:

	npm run dev

3. Build the static production bundle:

	npm run build

The output is written to `dist/` and is ready for GitHub Pages deployment.

4. Run the test suite:

	npm run test

## GitHub Pages

A GitHub Actions workflow is included at `.github/workflows/deploy-pages.yml`.

To publish from this repository:

1. Ensure the default branch is `main`, or update the workflow branch list if it is not.
2. In GitHub, open `Settings -> Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main` or trigger the workflow manually from the `Actions` tab.

The Vite base path is configured for hosting at `https://<user>.github.io/mount-kanji/`. If the repository name changes, update `base` in `vite.config.ts`.

## Next Implementation Targets

1. Expand lesson content and seed coverage.
2. Add import/export for learner progress.
3. Refine review queue pacing and difficulty tuning.
4. Broaden test coverage around UI flows and persistence.
