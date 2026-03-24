# gov-repo-scrape

A leaderboard of public GitHub repositories from 331 US government organizations — Federal, Military, States, Cities, Counties, Special Districts, Tribal Nations, and Law Enforcement.

**Live site:** https://gov-repo-scrape.vercel.app

Built with Vite + React. Styled after the GOV.UK Design System.

## How It Works

A daily Vercel cron job fetches repo data from all 331 government GitHub organizations, paginates through all pages, and caches the result in Vercel Blob (~10,000 repos). When a visitor loads the site, the React app makes a single API call to `/api/repos` to get the cached data — no GitHub API calls from the browser, no token needed, instant load.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173. Note: local dev requires `vercel dev` instead of `npm run dev` to access the API routes — or connect to the production `/api/repos` endpoint.

## Deployment

### Vercel

1. Connect the repo to Vercel
2. Add a Blob store in the Vercel dashboard and link it to the project
3. Set environment variables: `GH_TOKEN` (GitHub PAT, no scopes needed), `CRON_SECRET` (any random string)
4. Deploy
5. Manually trigger the cron to seed initial data:
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/fetch-repos
   ```

The cron runs daily at 6am UTC. Data is edge-cached for 1 hour.

## Data Source

Organization list sourced from [github/government.github.com](https://government.github.com/community/) (`_data/governments.yml`, U.S. sections). Inspired by the [UK Cross-Gov OSS Leaderboard](https://www.uk-x-gov-software-community.org.uk/xgov-opensource-repo-scraper/).
