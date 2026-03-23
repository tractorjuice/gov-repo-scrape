# gov-repo-scrape

A live leaderboard of public GitHub repositories from 331 US government organizations — Federal, Military, States, Cities, Counties, Special Districts, Tribal Nations, and Law Enforcement.

Built with Vite + React. No backend — all GitHub API calls happen client-side in the browser. Data loads automatically on page open.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173. Repos begin loading immediately.

## Rate Limits

| Mode | Limit | Coverage |
|------|-------|----------|
| No token | 60 req/hr | ~60 orgs |
| With GitHub PAT | 5,000 req/hr | All 331 orgs |

To use a token, create a [Personal Access Token](https://github.com/settings/tokens) with **no scopes** — it's only used for read-only public API calls in your browser and is never persisted.

## Data Source

Organization list sourced from [github/government.github.com](https://government.github.com/community/) (`_data/governments.yml`, U.S. sections). Inspired by the [UK Cross-Gov OSS Leaderboard](https://www.uk-x-gov-software-community.org.uk/xgov-opensource-repo-scraper/).
