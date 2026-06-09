# Moment Blog Auditor

A self-serve SEO + checklist auditor for the Moment Private Wealth blog. Writers paste a draft or a published URL, get a score and prioritized fixes; every run logs to an owner dashboard automatically.

## What works right now (Steps 1–2, no API keys)
- **Two modes:** audit a published URL (full technical check) or paste a draft (content/structure/keyword/link check before publishing).
- **Deterministic engine** parses the page server-side and scores five weighted dimensions: Checklist compliance (30%), Technical SEO (25%), Content & E-E-A-T (20%), Topic-cluster integrity (15%), Performance (10%).
- **Calendar-aware:** matches each post to `data/calendar.json` to know its target keyword and the exact pillar it should link to, then verifies the live internal link.
- **Schema detection:** reads raw HTML JSON-LD for Article + FAQPage — no Wix API needed.
- **Owner dashboard:** auto-logs writer, post, date, and score to `data/runs.json`.

## Run locally
```bash
npm install
npm start          # http://localhost:3000
npm test           # runs the engine on a sample fixture
```
Requires Node 18+ (uses built-in fetch).

## Deploy (pick one, all free-tier friendly)
- **Render / Railway:** new Web Service from this repo. Build `npm install`, start `npm start`. Done.
- **Any VPS:** `npm install && npm start` behind nginx.
Persisting `data/runs.json` requires a persistent disk (or swap to a DB later — see below).

## Turn on Step 3 (the Claude "brain") — ~2 minutes, low risk
The qualitative checks (are the FAQs topic-specific, does the intro tell a story, is the content hyper-specific vs. generic AI) show as **pending** until you add a key:
```bash
cp .env.example .env
# edit .env:  ANTHROPIC_API_KEY=sk-ant-...
npm start
```
Get the key at console.anthropic.com. It's self-serve — no Google/Wix approval. Code in `src/qualitative.js` already handles the call; cost-tune by switching `MODEL` to a Haiku model.

## Later steps
- **Step 4 — Search Console:** populate the Performance dimension with live rank/impressions/CTR. Add a `src/searchconsole.js` module and feed results into `score()`.
- **Step 5 — Wix API:** verify the backend-only checklist items (SEO panel green, Athletes/Entrepreneurs sub-category) and optionally pull drafts directly instead of pasting.

## Maintaining the calendar
`data/calendar.json` is the source of truth. Add a post by appending an entry with `slug`, `keyword`, `headline`, `shouldLinkTo` (the keyword of the pillar it should link to), and `cluster`. Pillars have `shouldLinkTo: null`.

## Project map
```
src/server.js       Express API + static host
src/fetcher.js      server-side URL fetch (raw HTML)
src/parse.js        cheerio signal extraction (incl. JSON-LD)
src/rubric.js       five-dimension weighted scoring
src/calendar.js     calendar matching + link-target resolution
src/qualitative.js  Step 3 Claude hook (off until key added)
public/             frontend (no build step)
data/calendar.json  content calendar (edit to add posts)
data/runs.json      dashboard history (auto-written)
```
