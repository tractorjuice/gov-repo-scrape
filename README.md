# gov-repo-scrape

A leaderboard of public GitHub repositories from **977 government organisations across 67 countries** — national governments, ministries, agencies, states, cities, and public institutions worldwide.

**Live site:** https://gov-repo-scrape.vercel.app

Built with Vite + React. Styled after the GOV.UK Design System.

## Features

- **Worldwide coverage** — organisations sourced from GitHub's official government community registry.
- **Filter by** country, sector (domain), type (function), language, GitHub topic, and free-text search on repo name / description.
- **Sort by** stars, forks, open issues, or last updated.
- **Keyword-based classification** assigns each repo a domain (e.g. Healthcare, Defence, Geospatial) and a function (e.g. Library, CLI Tool, API).
- Forks and archived repos are excluded. Top 300 results rendered per view.

## How It Works

```
Vercel Cron (daily 06:00 UTC, 2 concurrent jobs) 
  → api/cron/fetch-repos.js  
  → GitHub API (977 orgs, paginated)  
  → Vercel Blob (repos-0.json, repos-1.json)

Browser → /api/repos → merged blob JSON (edge-cached 1hr) → React table
```

The org list is partitioned across **two cron jobs** running in parallel (`?part=0&parts=2` and `?part=1&parts=2`) to stay within the 300s serverless timeout. Each job writes its own blob; `/api/repos` merges them on read. Forks, archived repos, and rate-limited responses are handled server-side, so the browser makes a single fetch with no GitHub token.

## Development

```bash
npm install
npm run dev        # Vite dev server (frontend only, http://localhost:5173)
vercel dev         # Full local dev with API routes
npm run build      # Production build to dist/
```

No test framework or linter is configured.

## Regenerating the Organisation List

The org list in `lib/orgs.js` is generated from GitHub's upstream `governments.yml`:

```bash
node scripts/generate-orgs.js
```

Re-run this when upstream adds new government organisations.

## Deployment

Deployed on Vercel. To set up your own instance:

1. Connect the repo to Vercel.
2. Add a Blob store in the Vercel dashboard and link it to the project.
3. Set environment variables:
   - `GH_TOKEN` — GitHub PAT (no scopes needed; raises the rate limit to 5000/hr).
   - `BLOB_READ_WRITE_TOKEN` — auto-provisioned when you link the Blob store.
   - `CRON_SECRET` — any random string; authenticates cron invocations.
4. Deploy.
5. Manually trigger both cron partitions to seed initial data:
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     "https://your-app.vercel.app/api/cron/fetch-repos?part=0&parts=2"
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     "https://your-app.vercel.app/api/cron/fetch-repos?part=1&parts=2"
   ```

Cron runs daily at 06:00 UTC. Data is edge-cached for 1 hour with `stale-while-revalidate` of 24 hours.

## Project Layout

| Path | Purpose |
|---|---|
| `src/App.jsx` | Single-component React UI — fetches `/api/repos`, renders filters, sort, and table. |
| `src/main.jsx` | Vite entry point. |
| `api/cron/fetch-repos.js` | Daily cron (`maxDuration: 300`) — fetches one partition of orgs and writes `repos-N.json` to Blob. |
| `api/repos.js` | Reads partitioned blobs and returns merged JSON to the browser. |
| `lib/orgs.js` | Generated list of 977 orgs with country / category / emoji. |
| `lib/classify.js` | Keyword-based domain + function classifier. |
| `scripts/generate-orgs.js` | Regenerates `lib/orgs.js` from `governments.yml`. |
| `vercel.json` | Cron schedule (two partitions) and framework declaration. |

## Data Source & Credits

- Organisation list: [github/government.github.com](https://government.github.com/community/) (`_data/governments.yml`).
- Inspired by the [UK Cross-Gov OSS Leaderboard](https://www.uk-x-gov-software-community.org.uk/xgov-opensource-repo-scraper/).
- Language colours from [ozh/github-colors](https://github.com/ozh/github-colors).
