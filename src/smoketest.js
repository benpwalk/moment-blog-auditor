import { parseHtml } from "./parse.js";
import { matchPost } from "./calendar.js";
import { score } from "./rubric.js";

const url = "https://www.momentprivatewealth.com/post/the-moment-guide-to-budgeting-for-professional-athletes";

const fixture = `<!doctype html><html><head>
<title>The Moment Guide To Budgeting For Professional Athletes</title>
<meta name="description" content="Learn how budgeting for professional athletes works: a clear framework for spending, saving, and protecting your wealth across a short career.">
<link rel="canonical" href="${url}">
<meta property="og:image" content="https://static.wixstatic.com/media/featured.png">
<meta property="article:author" content="Jacob Turner">
<meta property="article:published_time" content="2024-05-01T10:00:00Z">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Budgeting"}</script>
</head><body><article>
<h1>The Moment Guide To Budgeting For Professional Athletes</h1>
<p>Picture your first big check landing. It feels infinite, but budgeting for professional athletes is the discipline that turns a short career into lifelong security. This guide walks through the exact framework we use with clients, step by step, so you can spend with confidence and never wonder where the money went. Here is the story of how it works in practice.</p>
<h2>Why budgeting for professional athletes is different</h2>
<p>Your income is compressed into a few short years.</p>
<ul><li>Cash flow</li><li>Saving rate</li><li>Lifestyle creep</li></ul>
<p>We always link this back to our <a href="/post/the-moment-guide-to-financial-planning-for-professional-athletes">financial planning pillar</a>.</p>
<p>Watch this <a href="https://www.youtube.com/watch?v=abc">video on athlete budgeting</a>.</p>
<img src="https://static.wixstatic.com/media/a.avif" alt="Athlete budgeting framework">
<img src="https://static.wixstatic.com/media/b.avif" alt="">
<p><strong>Key point:</strong> build the lifestyle slowly.</p>
<h2>Frequently Asked Questions</h2>
<p><strong>Are you a fiduciary?</strong> Yes, 100% of the time.</p>
<p><strong>How does Moment make money?</strong> Only from our clients.</p>
</article></body></html>`;

const parsed = parseHtml(fixture, url);
const match = matchPost({ url, title: parsed.h1 });
const fullText = fixture.replace(/<[^>]+>/g, " ");
const result = score({ parsed, match, fullText, qualitative: null, mode: "url" });

console.log("\n=== MATCH ===");
console.log(match.post ? `${match.post.keyword}  (pillar: ${result.pillar})` : "NO MATCH");
console.log("\n=== SCORE ===", result.overall, result.grade);
for (const d of result.dims) {
  console.log(`\n[${d.key}] ${d.score === null ? "n/a" : d.score}`);
  for (const i of d.items) console.log(`  ${i.status.toUpperCase().padEnd(7)} ${i.label}`);
}
console.log("\n=== TOP FIXES ===");
for (const f of result.fixes) console.log(`  (${f.impact}) ${f.text}`);
console.log("\nSchema detected:", parsed.schemaTypes, "| FAQs:", parsed.faqCount, "| intro words:", parsed.introWordCount, "| internal slugs:", parsed.internalSlugs);
