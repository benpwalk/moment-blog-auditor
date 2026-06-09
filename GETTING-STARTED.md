# Moment Blog Auditor — Getting It Off the Ground

A step-by-step rollout. It's sequenced so the tool is useful at every stage and the API access you're worried about comes as late as possible. You can have writers auditing their own posts **today** (Step 1) and a self-serve website with an accountability dashboard live **this week** (Step 2) — neither needs a single API key.

---

## What you already have (built and tested)
- **`claude-project-instructions.md`** — paste-in instructions that turn a Claude Project into a full auditor. Works today, zero setup.
- **`moment-blog-auditor.zip`** — the real web app. Deterministic engine, both audit modes, calendar-aware internal-link checking, JSON-LD schema detection, and an owner dashboard. Runs with no API keys. The Claude "brain" is pre-wired and switches on with one line in a config file. *(I smoke-tested the engine and the live API end to end — it correctly matches posts to your calendar, verifies pillar links, and catches missing FAQPage schema.)*

---

## Step 1 — Stand up the Claude Project (today, ~10 minutes)
This gives every writer world-class feedback immediately, with no engineering.
1. In Claude, create a new **Project** called "Moment Blog Auditor."
2. Open the project's **Custom instructions** and paste in the full text of `claude-project-instructions.md`.
3. Upload two files to the project's **knowledge**: your blog creation checklist and your content calendar.
4. Tell the team: open the project, paste your draft (or your published URL), and it returns a score and a prioritized fix list.
- **Accountability for now:** ask writers to drop their final score into a shared sheet. (Step 2 makes this automatic.)

## Step 2 — Deploy the self-serve web app (this week, no keys)
This is the dream version: a website your team visits, both modes, plus the automatic owner dashboard.
1. Unzip `moment-blog-auditor.zip`.
2. Locally: `npm install` then `npm start`, and open `http://localhost:3000` to try it.
3. Deploy it where your team can reach it — **Render** or **Railway** are the fastest (new Web Service, build `npm install`, start `npm start`). Point a subdomain like `audit.momentprivatewealth.com` at it if you want.
4. Add a persistent disk so the dashboard history (`data/runs.json`) survives restarts.
- **Result:** writers self-serve; you open the **Owner Dashboard** tab to see who audited what and which posts scored low — accountability with zero time from you.

## Step 3 — Turn on the Claude brain (low risk, ~2 minutes)
Until this is on, the qualitative judgments (are the FAQs topic-specific, does the intro tell a story, is the writing hyper-specific vs. generic AI) show as *pending*. To enable:
1. Get a key at console.anthropic.com (self-serve — no Google or Wix approval needed).
2. Rename `.env.example` to `.env` and set `ANTHROPIC_API_KEY=...`.
3. Restart. That's it — the code is already written.
This is the one piece I pushed back on deferring: it's the difference between a checklist linter and a world-class assessor, and it carries none of the third-party access risk.

## Step 4 — Connect Search Console (when access is sorted)
Fills the Performance dimension with live rank, impressions, and CTR — turning a compliance score into a true SEO score. Add a `searchconsole.js` module and feed its data into the scorer. The tool is fully useful without this; it just shows last-known rank from the calendar in the meantime.

## Step 5 — Connect the Wix API (last)
Verifies the few backend-only checklist items (SEO panel all green, Athletes/Entrepreneurs sub-category) and can pull drafts directly instead of pasting. Lowest priority because it's the fiddliest access and covers the fewest items.

---

## Keeping it in sync with your Google Sheet
The tool reads its calendar from `data/calendar.json` — a snapshot, not a live link to the sheet. You keep editing the sheet as always; you just need a way to push changes into the tool. Three options, easiest first:

1. **Re-export when you make changes (no API).** In Sheets: File → Download → CSV for each tab, then run `node scripts/build-calendar.js athlete=./athlete.csv entrepreneur=./entrepreneur.csv`. Regenerates the whole calendar in seconds. Good if the calendar changes occasionally.
2. **Publish-to-web, auto-current (no API, recommended).** In Sheets: File → Share → Publish to web → publish each tab as CSV. That gives a plain URL the tool can read with no key, no OAuth — same low-risk tier as fetching a blog page. Run the build script with those URLs, or set them as env vars so the app refreshes itself. Now editing the sheet flows straight through.
3. **Live Google Sheets API.** Always in sync, but it's a third-party API with the setup friction you wanted to defer — and option 2 gets you 95% of the benefit without it. Only worth it if you outgrow publish-to-web.

The one-time `pillars` list (which 6+6 topics are hubs) lives in `scripts/build-calendar.js` since it rarely changes; everything that changes often comes from the sheet. The build script handles messy rows for you: it skips blank/section rows, keeps planned posts that don't have URLs yet, and tolerates capitalization drift in the "should link to" column.

## The decisions that still help (your "tomorrow" answers)
These don't block Steps 1–3, but they sharpen the tool:
1. **Scoring thresholds** — current grading is A 90+ / B 80+ / C 70+ / D 60+ / F. Want a hard pass/fail bar (e.g., "must score 80 before publishing"), or any auto-fail item (e.g., wrong pillar link)? Easy to set in `rubric.js`.
2. **Dimension weights** — currently 30 / 25 / 20 / 15 / 10. Adjust once you've run a few real posts through it.
3. **Search Console access** — confirm the property and I'll wire Step 4.
4. **Wix API access** — confirm and I'll wire Step 5.

## At a glance: what needs access, and when
| Capability | Needs | Stage |
|---|---|---|
| All checklist + structure + link checks | nothing (server-side fetch) | Steps 1–2 ✅ |
| Schema / structured-data detection | nothing (raw HTML) | Step 2 ✅ |
| FAQ specificity, story, AI-generic judgment | Anthropic key (self-serve) | Step 3 |
| Live rank / impressions / CTR | Search Console | Step 4 |
| SEO-panel-green, sub-category, draft pull | Wix API | Step 5 |

**Fastest path to value:** do Step 1 today, Step 2 this week, Step 3 the moment you have an Anthropic key. You'll have the full self-serve + accountability tool running before Search Console or Wix access is even sorted.
