# IMDb Heatmap

A heatmap of IMDb episode ratings for TV shows, season by season. Built with Vite, React and TypeScript, with data in Supabase and the site hosted on GitHub Pages.

## How it works

```
"Refresh data" workflow (daily)                    "Deploy site" workflow (on push)
  download IMDb datasets                             build the React app
  join them (scripts/build-data.ts)                  publish to GitHub Pages
  replace the data in Supabase
              │                                                │
              ▼                                                ▼
        Supabase Postgres  ◄──── browser queries data ──── GitHub Pages site
```

- **Data:** IMDb's free [non-commercial datasets](https://data.imdb.com/non-commercial-datasets/) (`title.ratings`, `title.episode`, `title.basics`). Shows with fewer than 1,000 votes are skipped, which leaves ~12.7k shows and ~525k episodes.
- **Database:** two tables (`shows`, `episodes`) plus three read-only functions the site calls: `search_shows`, `get_show`, `popular_shows`. See [`supabase/schema.sql`](supabase/schema.sql).
- **Refresh:** each night the script deletes the old rows and bulk-loads fresh ones inside a single transaction. Visitors keep seeing the previous data until the new data is fully loaded, and a failed run changes nothing.
- **Site:** static files on GitHub Pages. The browser talks to Supabase directly with the public key, which can only read. Posters come from the [TVmaze API](https://www.tvmaze.com/api).

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste the contents of `supabase/schema.sql` and run it.
3. From **Connect → Session pooler**, copy the connection URI and fill in your database password. If the password has special characters, URL-encode them (`@` → `%40`, `#` → `%23`, `/` → `%2F`).

### 2. GitHub

1. **Secret for the data job:** repo **Settings → Secrets and variables → Actions → New repository secret**, named `SUPABASE_DB_URL`, with the URI from above.
2. **Public settings for the site:** on the same page, switch to the **Variables** tab and add `VITE_SUPABASE_URL` (`https://<project-ref>.supabase.co`) and `VITE_SUPABASE_KEY` (the publishable key, `sb_publishable_…`). Both are under Supabase **Project Settings → API Keys**. They're public by design; the database rules only allow reading. For local development, put the same two lines in `.env`.
3. **Pages:** **Settings → Pages → Source: GitHub Actions**.
4. **Load the data:** **Actions → Refresh data → Run workflow** (takes a few minutes). After that it runs daily at 06:00 UTC.
5. **Deploy:** happens on every push to `main`, or **Actions → Deploy site → Run workflow**. The site is at `https://<your-username>.github.io/<repo-name>/`.

> GitHub pauses scheduled workflows in public repos after 60 days with no commits, and Supabase pauses free projects after a week without activity. The daily refresh keeps Supabase active; if ratings stop updating, re-enable the workflow from the Actions tab.

## Running locally

Requires Node 22+.

```bash
npm install
npm run dev    # http://localhost:5173, uses the Supabase settings in .env
```

To load data from your machine, put the connection string in `.env.local` (gitignored):

```
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

then run `npm run data`. It downloads ~270 MB into `.cache/` (reused for 20 hours). Options: `DRY_RUN=1` to build without touching the database, `MIN_SERIES_VOTES=500` to include more shows, `FORCE_DOWNLOAD=1` to refetch.

## Chrome extension

A compact toolbar popup (fixed 360×480) for checking episode ratings while you watch. It lives in [`extension/`](extension/) with its own layout and components; it shares only the colors/fonts (`src/tokens.css`), the data client, the color scale and the search box with the site.

- The start page shows your 6 most recent shows in a 3×2 grid. The logo opens the website; ← on a show goes back to the start page.
- Click a season label (S1, S2…) to show only that season, as a list with episode titles.
- Click an episode for a large view of its score, with ‹ › (or the arrow keys) to step through episodes and a link to IMDb.
- Each show remembers the season you last selected.
- It needs no browser permissions; it only talks to Supabase (and the IMDb/site links you click).

**Build and install (unpacked):**

```bash
npm run build:extension   # writes dist-extension/, using the Supabase URL/key from .env
```

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose the `dist-extension` folder.
3. Pin it from the puzzle-piece menu so the icon stays in the toolbar.

After rebuilding, click the reload icon on the extension's card in `chrome://extensions`. It also works in Edge and Brave the same way.

`npm run dev:extension` serves the popup at http://localhost:5174/popup.html for quick styling work.

**Chrome Web Store:** `npm run zip:extension` builds and packs `tv-heatmap-<version>.zip` for upload. The listing text, screenshots and promo tile are in [`extension/store/`](extension/store/listing.md); the privacy policy is the website's `/privacy` page.

## Data license

IMDb's datasets are for personal and non-commercial use only. The footer credit ("Information courtesy of IMDb…") is required by those terms. Keep it if you change the layout.
