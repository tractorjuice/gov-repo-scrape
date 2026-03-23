# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A live leaderboard of public GitHub repositories from 331 US government organizations. Vite + React, no backend — all GitHub API calls happen client-side in the browser.

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

No test framework or linter is configured.

## Architecture

All application logic lives in a single file: `src/App.jsx`. Entry point is `src/main.jsx` → renders `<App />` into `index.html`.

### src/App.jsx Structure

- **ORGS array** (~lines 53–401): Static list of 331 US gov GitHub org slugs with category and emoji. Sourced from `github/government.github.com/_data/governments.yml`. Eight categories: Federal, Military & Intelligence, States, Cities, Counties, Special Districts, Tribal Nations, Law Enforcement.
- **App component** (line 479+): Single component, all state via `useState`. No routing, no external state library, no component library.
- **Phase state machine**: `welcome` → `loading` → `done` | `fatal`. Controls which screen renders.
- **`startLoading()`**: Sequential fetch loop over all orgs, calling `GET /orgs/{org}/repos?type=public&per_page=100&sort=stars`. Excludes forks and archived repos. Updates state after each org for progressive rendering. 100ms delay between requests.
- **Filtering/sorting**: Client-side `.filter().sort()` chain. Filters: category, language, free-text (name + description). Sort: stars, forks, issues, updated. Display capped at 300 rows.
- **Styling**: All inline styles, no CSS files. Dark theme (#05080f background) with US government color accents (#b22234 red, #3c3b6e blue).

## Key Constraints

- **Rate limits**: Unauthenticated: 60 req/hr (~60 orgs). With a GitHub PAT (no scopes needed): 5,000 req/hr (all 331 orgs). Token passed via Authorization header, never persisted.
- **Single-page fetch**: Only first 100 repos per org (GitHub API max per_page). No multi-page pagination.
- **Render cap**: Top 300 filtered results displayed to keep DOM size manageable.
- **No backend**: Cannot run in sandboxed environments (e.g., Claude.ai artifacts) — must run locally.
