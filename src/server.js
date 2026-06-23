import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchHtml } from "./fetcher.js";
import { parseHtml } from "./parse.js";
import { matchPost } from "./calendar.js";
import { score } from "./rubric.js";
import { analyzeQualitative } from "./qualitative.js";
import { getPagePerformance } from "./searchconsole.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNS = path.join(__dirname, "../data/runs.json");
const app = express();
app.use(express.json({ limit: "4mb" }));
app.use(express.static(path.join(__dirname, "../public")));
function loadRuns() {
  try { return JSON.parse(fs.readFileSync(RUNS, "utf8")); } catch { return []; }
}
function saveRun(run) {
  const runs = loadRuns();
  runs.unshift(run);
  fs.writeFileSync(RUNS, JSON.stringify(runs.slice(0, 500), null, 2));
}
app.post("/api/audit", async (req, res) => {
  try {
    const { mode = "url", url = "", html = "", title = "", writer = "Anonymous" } = req.body;
    let pageHtml = html;
    let sourceUrl = url;
    if (mode === "url") {
      if (!url) return res.status(400).json({ error: "A URL is required for URL mode." });
      pageHtml = await fetchHtml(url);
    } else if (!html) {
      return res.status(400).json({ error: "Paste your draft HTML or text for draft mode." });
    }
    const parsed = parseHtml(pageHtml, sourceUrl);
    const match = matchPost({ url: mode === "url" ? url : "", title: title || parsed.h1 || parsed.titleTag });
    const fullText = [parsed.introText, (parsed.faqQuestions || []).join(" "), parsed.bodyText].join(" ");
    const qualitative = await analyzeQualitative({
      keyword: match.post?.keyword,
      cluster: match.post?.cluster,
      faqQuestions: parsed.faqQuestions,
      introText: parsed.introText,
      bodyText: parsed.bodyText,
    });
    const performance = mode === "url" ? await getPagePerformance(sourceUrl) : null;
    const result = score({ parsed, match, fullText, qualitative, performance, mode });
    const run = {
      id: Date.now().toString(36),
      at: new Date().toISOString(),
      writer,
      mode,
      url: sourceUrl,
      title: match.post?.headline || parsed.h1 || parsed.titleTag || "(untitled)",
      keyword: match.post?.keyword || null,
      overall: result.overall,
      grade: result.grade,
    };
    saveRun(run);
    res.json({ ...result, meta: run, signals: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message || "Audit failed." });
  }
});
app.get("/api/runs", (_req, res) => res.json(loadRuns()));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Moment Blog Auditor running on http://localhost:${PORT}`));
