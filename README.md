# gov-repo-scrape

A leaderboard of public GitHub repositories from 331 US government organizations — Federal, Military, States, Cities, Counties, Special Districts, Tribal Nations, and Law Enforcement.

Built with Vite + React. Styled after the GOV.UK Design System.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## How It Works

A daily Vercel cron job fetches repo data from all 331 government GitHub organizations, paginates through all pages, and caches the result in Vercel Blob. When a visitor loads the site, the React app makes a single API call to `/api/repos` to get the cached data — no GitHub API calls from the browser, no token needed.

## Deployment

### Vercel (recommended)

1. Connect the repo to Vercel
2. Add a Blob store in the Vercel dashboard and link it to the project
3. Set environment variables: `GH_TOKEN` (GitHub PAT, no scopes), `CRON_SECRET` (any random string)
4. Deploy
5. Manually trigger the cron to seed initial data:
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/fetch-repos
   ```

### GitHub Pages (fallback)

The GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys on push to `main`. This version fetches data client-side (no caching), so visitors need a GitHub token for full coverage of all 331 orgs.

Enable at: **Settings → Pages → Source → GitHub Actions**

## Data Source

Organization list sourced from [github/government.github.com](https://government.github.com/community/) (`_data/governments.yml`, U.S. sections). Inspired by the [UK Cross-Gov OSS Leaderboard](https://www.uk-x-gov-software-community.org.uk/xgov-opensource-repo-scraper/).
