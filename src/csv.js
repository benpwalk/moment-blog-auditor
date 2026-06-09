// Turns a Google Sheets CSV export (or published-to-web CSV) into calendar posts.
// No dependencies, no API — just text parsing. Shared by scripts/build-calendar.js
// and the optional live-sync in calendar.js.

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function findCol(headers, ...needles) {
  const h = headers.map((x) => (x || "").toLowerCase().trim());
  for (const n of needles) {
    const idx = h.findIndex((x) => x.includes(n));
    if (idx !== -1) return idx;
  }
  return -1;
}

function slugFromLink(link) {
  if (!link) return null;
  const m = String(link).match(/\/post\/([^/?#\s]+)/i);
  return m ? m[1].toLowerCase() : null;
}

// cluster = "athlete" | "entrepreneur"
export function csvToPosts(csvText, cluster) {
  const rows = parseCsv(csvText).filter((r) => r.some((c) => (c || "").trim() !== ""));
  if (!rows.length) return [];
  const headers = rows[0];
  const cKeyword = findCol(headers, "keyword");
  const cHeadline = findCol(headers, "wip headline", "headline");
  const cLink = findCol(headers, "publication link", "link");
  const cShould = findCol(headers, "should link");
  const cType = findCol(headers, "article type", "type");

  const out = [];
  const seen = new Set();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const keyword = (r[cKeyword] || "").trim();
    const headline = (r[cHeadline] || "").trim();
    const link = (r[cLink] || "").trim();
    const slug = slugFromLink(link);
    // Skip blank rows and obvious section separators.
    if (!keyword && !slug) continue;
    if (!keyword && /blog topics|^\s*$/i.test(headline)) continue;
    if (slug && seen.has(slug)) continue;
    if (slug) seen.add(slug);
    const shouldLinkTo = (r[cShould] || "").trim() || null;
    out.push({
      slug: slug || null,
      keyword: keyword || headline,
      headline: headline || keyword,
      shouldLinkTo,
      cluster,
      type: cType !== -1 ? (r[cType] || "").trim() : "",
    });
  }
  return out;
}
