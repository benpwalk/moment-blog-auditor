import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/calendar.json"), "utf8"));

const posts = raw.posts;
const bySlug = new Map(posts.map((p) => [p.slug, p]));
const byKeyword = new Map(posts.map((p) => [p.keyword.toLowerCase(), p]));
const pillarSet = new Set([...raw.pillars.athlete, ...raw.pillars.entrepreneur].map((k) => k.toLowerCase()));

export function slugFromUrl(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    const m = u.pathname.match(/\/post\/([^/?#]+)/i);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

// Match by URL slug, else fuzzy-match the headline (for draft mode).
export function matchPost({ url, title }) {
  if (url) {
    const slug = slugFromUrl(url);
    if (slug && bySlug.has(slug)) return { post: bySlug.get(slug), via: "url" };
  }
  if (title) {
    const t = normalize(title);
    let best = null, bestScore = 0;
    for (const p of posts) {
      const h = normalize(p.headline);
      const words = h.split(" ").filter((w) => w.length > 3);
      const hits = words.filter((w) => t.includes(w)).length;
      const score = words.length ? hits / words.length : 0;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (best && bestScore >= 0.5) return { post: best, via: "title", confidence: Math.round(bestScore * 100) };
  }
  return { post: null, via: "none" };
}

export function isPillar(post) {
  return post && (post.shouldLinkTo === null || pillarSet.has(post.keyword.toLowerCase()));
}

// The slug this post is supposed to link to (resolved from the shouldLinkTo keyword).
export function expectedLinkTarget(post) {
  if (!post || !post.shouldLinkTo) return null;
  const target = byKeyword.get(post.shouldLinkTo.toLowerCase());
  return target ? { slug: target.slug, keyword: target.keyword, headline: target.headline } : { slug: null, keyword: post.shouldLinkTo };
}

export const calendar = { posts, bySlug, byKeyword, pillarSet, domain: raw.domain };
