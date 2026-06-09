import { isPillar, expectedLinkTarget } from "./calendar.js";

const W = { pass: 1, warn: 0.5, fail: 0 };

function norm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function containsKeyword(text, keyword) {
  if (!keyword) return false;
  const t = norm(text);
  const k = norm(keyword);
  if (t.includes(k)) return true;
  const toks = k.split(" ").filter((w) => w.length > 3);
  return toks.length > 0 && toks.every((w) => t.includes(w));
}

const DIMENSIONS = [
  { key: "Checklist compliance", weight: 30 },
  { key: "Technical SEO", weight: 25 },
  { key: "Content depth & E-E-A-T", weight: 20 },
  { key: "Topic-cluster integrity", weight: 15 },
  { key: "Performance", weight: 10 },
];

export function score({ parsed, match, fullText = "", qualitative = null, mode = "url" }) {
  const post = match.post;
  const keyword = post ? post.keyword : null;
  const pillar = isPillar(post);
  const target = expectedLinkTarget(post);
  const items = {
    "Checklist compliance": [],
    "Technical SEO": [],
    "Content depth & E-E-A-T": [],
    "Topic-cluster integrity": [],
    Performance: [],
  };
  const add = (dim, label, status, evidence, fix) => items[dim].push({ label, status, evidence, fix });

  /* ---------- Checklist compliance ---------- */
  if (post) {
    add("Checklist compliance", "Title matches a calendar headline", "pass",
      `Matched to "${post.headline}" (${match.via}${match.confidence ? `, ${match.confidence}% confidence` : ""}).`);
  } else {
    add("Checklist compliance", "Title matches a calendar headline", "warn",
      "Couldn't match this post to a calendar row — keyword-specific checks are skipped. Add it to data/calendar.json.");
  }

  const iw = parsed.introWordCount;
  add("Checklist compliance", "Intro is a 100–200 word story",
    iw >= 100 && iw <= 200 ? "pass" : iw >= 60 && iw <= 260 ? "warn" : "fail",
    `Opening ran ~${iw} words.`,
    iw < 100 ? "Expand the intro to 100–200 words and open with a story." : iw > 200 ? "Tighten the intro toward 200 words." : null);

  if (keyword) {
    add("Checklist compliance", "Target keyphrase appears in the intro",
      containsKeyword(parsed.introText, keyword) ? "pass" : "fail",
      `Target keyword: "${keyword}".`,
      "Work the exact keyphrase naturally into the first paragraph.");
    const inH1 = containsKeyword(parsed.h1, keyword);
    const inAnyHeading = parsed.headings.some((h) => containsKeyword(h.text, keyword));
    add("Checklist compliance", "Keyword used as the main header",
      inH1 ? "pass" : inAnyHeading ? "warn" : "fail",
      inH1 ? "Exact keyword is in the H1." : inAnyHeading ? "Keyword appears in a subheading but not the H1." : "Keyword not found in any heading.",
      inH1 ? null : "Make sure the exact keyphrase appears in the H1 or very first heading.");
  }

  add("Checklist compliance", "Scannable formatting (bold + lists)",
    parsed.hasBold && parsed.hasLists ? "pass" : parsed.hasBold || parsed.hasLists ? "warn" : "fail",
    `Bold: ${parsed.hasBold ? "yes" : "no"}, lists: ${parsed.hasLists ? "yes" : "no"}.`);

  add("Checklist compliance", "Five+ FAQs at the bottom",
    parsed.faqHeading && parsed.faqCount >= 5 ? "pass" : parsed.faqHeading ? "warn" : "fail",
    parsed.faqHeading ? `Found an FAQ section with ~${parsed.faqCount} questions.` : "No FAQ section detected.",
    parsed.faqHeading && parsed.faqCount >= 5 ? null : "Add at least 5 questions specific to this post's topic.");

  add("Checklist compliance", "External link to a relevant YouTube video",
    parsed.youtube ? "pass" : "fail",
    parsed.youtube ? "A YouTube link is present." : "No YouTube link found.",
    parsed.youtube ? null : "Add one relevant YouTube video that flows with the content.");

  add("Checklist compliance", "Featured image set",
    parsed.ogImage ? "pass" : "warn",
    parsed.ogImage ? "Open Graph featured image is set." : "No featured image detected.");

  add("Checklist compliance", "Alt text on every image",
    parsed.imageCount > 0 && parsed.imagesMissingAlt === 0 ? "pass" : parsed.imageCount === 0 ? "warn" : "warn",
    parsed.imageCount === 0 ? "No in-body images found." : `${parsed.imageCount} images, ${parsed.imagesMissingAlt} missing alt text.`,
    parsed.imagesMissingAlt > 0 ? "Add descriptive alt text to every image." : null);

  /* ---------- Technical SEO ---------- */
  const md = parsed.metaDescription || "";
  const mdLen = md.length;
  add("Technical SEO", "Meta description length & keyword",
    mdLen === 0 ? "fail" : mdLen >= 120 && mdLen <= 170 && (!keyword || containsKeyword(md, keyword)) ? "pass" : "warn",
    mdLen === 0 ? "No meta description found." : `${mdLen} chars${keyword ? `; keyword ${containsKeyword(md, keyword) ? "present" : "missing"}` : ""}.`,
    mdLen === 0 ? "Write a ~150–160 char meta description." : (mdLen < 120 || mdLen > 170) ? "Aim for ~150–160 characters." : (keyword && !containsKeyword(md, keyword)) ? "Include the exact keyword." : null);

  if (mode === "url") {
    add("Technical SEO", "Canonical tag", parsed.canonical ? "pass" : "warn",
      parsed.canonical ? "Self-referencing canonical present." : "No canonical tag found.");
  }

  const h1Count = parsed.headings.filter((h) => h.tag === "h1").length;
  add("Technical SEO", "Heading hierarchy",
    h1Count === 1 && parsed.headings.some((h) => h.tag === "h2") ? "pass" : h1Count === 0 ? "fail" : "warn",
    `${h1Count} H1, ${parsed.headings.filter((h) => h.tag === "h2").length} H2.`);

  if (mode === "url") {
    add("Technical SEO", "Image format (next-gen)",
      parsed.nextGenImages > 0 ? "pass" : parsed.imageCount === 0 ? "warn" : "warn",
      parsed.nextGenImages > 0 ? "Serving AVIF/WebP." : "Images not detected as AVIF/WebP.");

    const hasArticle = parsed.schemaTypes.some((t) => /Article|BlogPosting/i.test(t));
    const hasFaq = parsed.schemaTypes.some((t) => /FAQPage/i.test(t));
    add("Technical SEO", "Structured data (Article + FAQPage schema)",
      hasArticle && hasFaq ? "pass" : hasArticle || hasFaq ? "warn" : "fail",
      `Detected: ${parsed.schemaTypes.length ? parsed.schemaTypes.join(", ") : "none"}.`,
      hasArticle && hasFaq ? null : "Add FAQPage + Article schema — highest-impact untapped SEO lever (drives rich results).");
  } else {
    add("Technical SEO", "Structured data, canonical, image format", "pending",
      "Generated by Wix at publish — re-audit the live URL after publishing to confirm these.");
  }

  /* ---------- Content depth & E-E-A-T ---------- */
  add("Content depth & E-E-A-T", "Named author byline",
    parsed.author ? "pass" : "warn",
    parsed.author ? `Author: ${parsed.author}.` : "No author metadata found.",
    parsed.author ? null : "Ensure a credentialed author byline links to a bio page.");

  add("Content depth & E-E-A-T", "Sufficient depth",
    parsed.totalWords >= 1200 ? "pass" : parsed.totalWords >= 700 ? "warn" : "fail",
    `~${parsed.totalWords} words (~${parsed.readMinutes} min read).`,
    parsed.totalWords < 1200 ? "Expand toward 1,200+ words for a competitive finance article." : null);

  const hasDisclaimer = /consult (an |a )?(attorney|tax|legal)|not (provide|intended as)|informational purposes|tax and legal advice/i.test(fullText);
  add("Content depth & E-E-A-T", "YMYL disclaimer present",
    hasDisclaimer ? "pass" : "warn",
    hasDisclaimer ? "A tax/legal disclaimer was found." : "No disclaimer detected.",
    hasDisclaimer ? null : "Add a short tax/legal disclaimer — important for financial (YMYL) content.");

  // Qualitative (Step 3 / Claude)
  const q = qualitative || {};
  const qItem = (label, key, fixHint) =>
    add("Content depth & E-E-A-T", label,
      q[key]?.status || "pending",
      q[key]?.evidence || "Enable the Claude layer (Step 3) to score this automatically.",
      q[key]?.fix || (q[key] ? null : fixHint));
  qItem("FAQs are specific to this post (not generic)", "faqSpecificity", null);
  qItem("Intro tells a genuine story", "introStory", null);
  qItem("Content is hyper-specific, not generic AI", "contentSpecificity", null);

  /* ---------- Topic-cluster integrity ---------- */
  if (!post) {
    add("Topic-cluster integrity", "Mapped to the content calendar", "warn", "Post not found in the calendar.");
  } else if (pillar) {
    add("Topic-cluster integrity", "Pillar / hub page", "info",
      `This is a ${post.cluster} pillar. As a hub it should be linked to by its cluster posts (verified by a site crawl in Step 2.5).`);
  } else if (target) {
    const linked = target.slug && parsed.internalSlugs.includes(target.slug);
    add("Topic-cluster integrity", "Links to its assigned pillar",
      mode === "draft" && !parsed.internalSlugs.length ? "pending" : linked ? "pass" : "fail",
      linked ? `Links to the "${target.keyword}" pillar as intended.` : `Should link to "${target.keyword}"${target.slug ? ` (/post/${target.slug})` : ""}.`,
      linked ? null : `Add an internal link to the ${target.keyword} pillar.`);
  }

  /* ---------- Performance ---------- */
  add("Performance", "Live keyword rank, impressions & CTR", "pending",
    "Connect Google Search Console (Step 4) to score real performance.");

  /* ---------- Roll up ---------- */
  const dims = DIMENSIONS.map((d) => {
    const its = items[d.key];
    const scored = its.filter((i) => i.status in W);
    const raw = scored.reduce((s, i) => s + W[i.status], 0);
    const dimScore = scored.length ? Math.round((raw / scored.length) * 100) : null;
    return { ...d, score: dimScore, items: its };
  });

  const measurable = dims.filter((d) => d.score !== null);
  const totalW = measurable.reduce((s, d) => s + d.weight, 0);
  const overall = totalW ? Math.round(measurable.reduce((s, d) => s + d.score * d.weight, 0) / totalW) : 0;
  const grade = overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "F";

  // Prioritized fixes
  const order = { fail: 0, warn: 1 };
  const fixes = dims
    .flatMap((d) => d.items.filter((i) => i.fix && (i.status === "fail" || i.status === "warn")).map((i) => ({ ...i, dim: d.key })))
    .sort((a, b) => order[a.status] - order[b.status])
    .slice(0, 6)
    .map((i) => ({ impact: i.status === "fail" ? "High" : "Med", text: i.fix, dim: i.dim }));

  return { overall, grade, dims, fixes, matched: !!post, pillar };
}
