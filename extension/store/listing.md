# Chrome Web Store listing: TV Heatmap

Everything to paste into the Chrome Web Store developer dashboard. Upload `tv-heatmap-<version>.zip` (made by `npm run zip:extension`).

## Store listing tab

**Name** (comes from the manifest): TV Heatmap

**Summary** (comes from the manifest, max 132 characters):
See how every episode of a TV show rates, season by season, as a color-coded heatmap of IMDb ratings.

**Description:**

Wondering if the episode you're about to watch is a good one? TV Heatmap shows the IMDb rating of every episode of a show in one color-coded grid, from your browser toolbar.

• Search any of 12,000+ TV shows and see every season at a glance
• Green means great, red means skip-worthy, with season averages along the bottom
• Click a season to list its episodes with titles, scores and vote counts
• Click an episode for a big view of its rating, then step through episodes with the arrows
• Your 6 most recent shows are one click away, and the popup reopens right where you left off
• Dark and light themes, plus a color-blind friendly palette

Ratings are refreshed daily from IMDb's public datasets.

No account, no ads, no tracking. TV Heatmap requests no browser permissions and doesn't read the pages you visit.

Information courtesy of IMDb (https://www.imdb.com). Used with permission. TV Heatmap is not affiliated with IMDb.

**Category:** Entertainment
**Language:** English

**Graphic assets** (in this folder):
- Store icon 128×128: `extension/public/icons/icon-128.png`
- Screenshots 1280×800: `screenshot-1.png`, `screenshot-2.png`
- Small promo tile 440×280: `promo-small.png`

**Homepage URL:** https://heatmap.aidanreaves.com
**Support URL:** https://github.com/areaves1207/better-imdb-heatmap/issues

## Privacy practices tab

**Single purpose:**
Shows IMDb ratings for every episode of a TV show as a heatmap in a toolbar popup, so you can quickly check how episodes rate.

**Permission justification:** none needed; the extension requests no permissions and no host permissions.

**Remote code:** No, I am not using remote code. (All code ships in the package; it only fetches rating data as JSON.)

**Data usage:** check none of the data types. Search text is sent to the database only to return results and isn't stored or linked to users; settings and recent shows stay in the browser's local storage.

Certify all three statements:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://heatmap.aidanreaves.com/privacy

## Distribution tab

Free, all regions (or as you prefer). Visibility: Public.

## Before each new upload

Bump `"version"` in `extension/public/manifest.json` (the store rejects a version it has already seen), then run `npm run zip:extension`.
