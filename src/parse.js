import * as cheerio from "cheerio";

function wordCount(s) {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

// Extract all signals the rubric needs from a raw HTML string.
export function parseHtml(html, sourceUrl = "") {
  const $ = cheerio.load(html);

  const titleTag = $("title").first().text().trim();
  const h1 = $("h1").first().text().trim();

  const headings = [];
  $("h1,h2,h3,h4").each((_, el) => {
    headings.push({ tag: el.tagName.toLowerCase(), text: $(el).text().trim() });
  });

  const metaDescription =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";

  const author =
    $('meta[property="article:author"]').attr("content") ||
    $('meta[name="author"]').attr("content") ||
    "";
  const publishedTime = $('meta[property="article:published_time"]').attr("content") || "";
  const modifiedTime = $('meta[property="article:modified_time"]').attr("content") || "";

  // Body container heuristic: Wix blog content sits in the article/main region.
  const $body = $("article").length ? $("article").first() : $("main").length ? $("main").first() : $("body");

  // Intro = paragraphs before the first H2.
  let introText = "";
  const firstParas = [];
  $body.find("p").each((_, el) => {
    if (firstParas.length < 4) firstParas.push($(el).text().trim());
  });
  introText = firstParas.join(" ");

  const fullText = $body.text().replace(/\s+/g, " ").trim();
  const totalWords = wordCount(fullText);

  const hasBold = $body.find("strong, b").length > 0;
  const hasLists = $body.find("ul, ol").length > 0;

  // Images
  const images = [];
  $body.find("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    const alt = ($(el).attr("alt") || "").trim();
    if (src && !src.startsWith("data:")) images.push({ src, alt });
  });
  const imagesMissingAlt = images.filter((i) => !i.alt).length;
  const nextGenImages = images.filter((i) => /avif|webp/i.test(i.src)).length;

  // Links
  const domain = "momentprivatewealth.com";
  const internalSlugs = [];
  let youtube = false;
  let externalLinks = 0;
  $body.find("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/youtube\.com|youtu\.be/i.test(href)) youtube = true;
    const isInternal = href.startsWith("/") || href.includes(domain);
    if (isInternal) {
      const m = href.match(/\/post\/([^/?#]+)/i);
      if (m) internalSlugs.push(m[1].toLowerCase());
    } else if (/^https?:\/\//i.test(href)) {
      externalLinks++;
    }
  });

  // FAQ detection
  let faqHeading = false;
  let faqCount = 0;
  let faqQuestions = [];
  $body.find("h1,h2,h3,h4,h5").each((_, el) => {
    if (/frequently asked questions|^faqs?$/i.test($(el).text().trim())) faqHeading = true;
  });
  if (faqHeading) {
    // Collect question-like strings (often bold/italic lines ending in ? or list items).
    $body.find("li, strong, em, b, i, p").each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 8 && t.length < 200 && t.includes("?") && faqQuestions.length < 15) {
        if (!faqQuestions.includes(t)) faqQuestions.push(t);
      }
    });
    faqCount = faqQuestions.length;
  }

  // JSON-LD structured data
  const schemaTypes = new Set();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const nodes = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const n of nodes) {
        const t = n && n["@type"];
        if (Array.isArray(t)) t.forEach((x) => schemaTypes.add(x));
        else if (t) schemaTypes.add(t);
      }
    } catch {
      /* ignore malformed */
    }
  });

  return {
    sourceUrl,
    titleTag,
    h1,
    headings,
    metaDescription,
    canonical,
    ogImage,
    author,
    publishedTime,
    modifiedTime,
    introText,
    introWordCount: wordCount(introText),
    totalWords,
    readMinutes: Math.max(1, Math.round(totalWords / 200)),
    hasBold,
    hasLists,
    images,
    imageCount: images.length,
    imagesMissingAlt,
    nextGenImages,
    internalSlugs,
    externalLinks,
    youtube,
    faqHeading,
    faqCount,
    faqQuestions,
    schemaTypes: [...schemaTypes],
  };
}
