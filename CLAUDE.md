# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A leaderboard of public GitHub repositories from 331 US government organizations. Vite + React frontend, with server-side data caching via Vercel serverless functions and Vercel Blob.

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

No test framework or linter is configured.

## Architecture

### Data flow

```
Vercel Cron (daily) → api/cron/fetch-repos.js → GitHub API (all 331 orgs, all pages) → Vercel Blob (repos.json)
Browser → api/repos.js → reads Vercel Blob → returns cached JSON (edge-cached 1hr)
React app → single fetch("/api/repos") on mount → renders table with client-side filters/sort
```

### Key files

- **`lib/orgs.js`**: Shared data module — exports `ORGS` (331 org slugs with category/emoji) and `CATEGORIES`. Used by both the cron function and the React app.
- **`api/cron/fetch-repos.js`**: Vercel serverless function. Fetches all orgs in parallel batches of 10, paginates through all pages, excludes forks/archived repos, writes result to Vercel Blob. Authenticated via `CRON_SECRET`.
- **`api/repos.js`**: Vercel serverless function. Reads `repos.json` from Vercel Blob, returns it with edge caching headers.
- **`src/App.jsx`**: React UI. Single component, all state via `useState`. Fetches from `/api/repos` on mount, then filters/sorts client-side. GOV.UK Design System styling (Source Sans 3 font, white background, blue links, green buttons).
- **`src/main.jsx`**: Entry point, renders `<App />` into `index.html`.

### Deployment

- **Vercel** (primary): Auto-deploys from main. Cron runs daily at 6am UTC. Env vars: `GH_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`.
- **GitHub Pages** (fallback): `.github/workflows/deploy.yml` builds and deploys on push. `vite.config.js` conditionally sets `base: '/gov-repo-scrape/'` when `GITHUB_ACTIONS` is set. Note: GitHub Pages version has no server-side caching.

## Key Constraints

- **Render cap**: Top 300 filtered results displayed to keep DOM size manageable.
- **Cron data**: Updated once daily. `lastUpdated` timestamp shown in the UI.
- **Serverless functions**: Use Node.js `(req, res)` pattern (not Next.js). Located in `api/` directory.
