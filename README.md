# Episode Heatmap

A heatmap of IMDb episode ratings for TV shows, season by season. Built with Vite, React and TypeScript, and hosted for free on GitHub Pages.

## How it works

There's no backend and no API key.

1. `scripts/build-data.ts` downloads IMDb's free [non-commercial datasets](https://data.imdb.com/non-commercial-datasets/) (`title.ratings`, `title.episode`, `title.basics`) and joins them.
2. It writes `public/data/index.json` (search index) and one `public/data/shows/<imdb-id>.json` per show. Shows with fewer than 1,000 votes are skipped.
3. The React app loads the search index once, then fetches a show's small JSON file when you open it. Posters come from the [TVmaze API](https://www.tvmaze.com/api) in the browser.
4. A GitHub Action reruns all of this every day and redeploys, so ratings stay current.

## Running locally

Requires Node 22+.

```bash
npm install
npm run data   # ~1 minute: downloads ~270 MB into .cache/ and writes public/data/
npm run dev    # http://localhost:5173
```

`npm run data` reuses downloads less than 20 hours old. Options: `MIN_SERIES_VOTES=500 npm run data` to include more shows, `FORCE_DOWNLOAD=1` to refetch.

## Deploying to GitHub Pages (one-time setup)

1. **Create the repo.** On github.com click **+ → New repository**. Name it (e.g. `imdb-heatmap`), make it **Public** (Pages is free for public repos), and *don't* add a README, .gitignore or license. This project already has them.
2. **Push this folder.** From this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. **Turn on Pages.** In the repo go to **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**. That's the only setting.
4. **Run the workflow.** Pushing already started it, but it fails if Pages wasn't on yet. Go to the **Actions** tab, select **Build data and deploy**, and click **Run workflow**. It takes about 3 minutes.
5. **Visit the site** at `https://<your-username>.github.io/<repo-name>/`. The link also appears on the workflow run and under Settings → Pages.

After that, every push to `main` redeploys, and the site rebuilds daily at 06:00 UTC with fresh ratings.

> GitHub pauses scheduled workflows in public repos after 60 days with no commits. If ratings stop updating, re-enable the workflow from the Actions tab (or just push a commit).

## Data license

IMDb's datasets are for personal and non-commercial use only. The footer credit ("Information courtesy of IMDb…") is required by those terms. Keep it if you change the layout.
