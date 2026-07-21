# Mount Kanji

Desktop-first kanji learning app with a mountain-progression theme, built with Tauri, React, and TypeScript.

## Current Status

- Project scaffolded in repository root.
- Tailwind v4 (via Vite plugin) wired and active.
- Initial Base Camp dashboard UI implemented.
- First domain model types added.
- Initial SQLite schema drafted.
- Spaced repetition and review scheduling service foundations added.

## Stack

- Frontend: React + TypeScript + Vite
- Desktop shell: Tauri v2
- Styling: Tailwind CSS v4
- Data: SQLite (schema in src/data/sql/schema.sql)

## Run

1. Install JS dependencies:

	npm install

2. Start web dev server:

	npm run dev

3. Start desktop app:

	npm run tauri dev

## Linux Prerequisites For Tauri

If desktop build fails, install required packages such as WebKitGTK and librsvg. See:

https://tauri.app/start/prerequisites/

## Next Implementation Targets

1. Add repositories and database initialization flow.
2. Import first 100 N5 kanji + lessons as seed data.
3. Build daily lesson and review queue pages.
4. Add tests for spaced repetition and progress calculations.
