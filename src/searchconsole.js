import { google } from "googleapis";
import fs from "fs";

const SITE_URL = process.env.GSC_SITE_URL;
const KEY_PATH = process.env.GSC_KEY_PATH;

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;
  if (!SITE_URL || !KEY_PATH) return null;
  if (!fs.existsSync(KEY_PATH)) return null;

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  cachedClient = google.searchconsole({ version: "v1", auth });
  return cachedClient;
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Looks up Search Console performance for a single published page.
 * Always resolves (never throws) so a GSC hiccup can't break an audit:
 *   - returns null if GSC isn't configured (no env vars / missing key file)
 *   - returns { error } if the API call itself fails (auth, quota, etc.)
 *   - returns { found: false, startDate, endDate } if there's no data for this URL
 *   - returns { found: true, clicks, impressions, ctr, avgPosition, topQuery, topQueryPosition, startDate, endDate } on success
 *
 * Note: Search Console matches on the *exact* URL as it's indexed (https vs http,
 * www vs non-www, trailing slash all matter). Paste the canonical URL for best results.
 */
export async function getPagePerformance(pageUrl) {
  if (!pageUrl) return null;
  const client = getClient();
  if (!client) return null;

  try {
    // GSC data is typically incomplete for the most recent 2-3 days, so end the
    // window a few days back and look at a full prior month for stable numbers.
    const startDate = isoDaysAgo(31);
    const endDate = isoDaysAgo(3);

    const resp = await client.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        dimensionFilterGroups: [
          { filters: [{ dimension: "page", operator: "equals", expression: pageUrl }] },
        ],
        rowLimit: 10,
      },
    });

    const rows = resp.data.rows || [];
    if (!rows.length) {
      return { found: false, startDate, endDate };
    }

    const totals = rows.reduce(
      (acc, r) => {
        acc.clicks += r.clicks || 0;
        acc.impressions += r.impressions || 0;
        return acc;
      },
      { clicks: 0, impressions: 0 }
    );

    const avgPosition =
      rows.reduce((s, r) => s + (r.position || 0) * (r.impressions || 0), 0) /
      Math.max(totals.impressions, 1);
    const ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
    const topQuery = rows.slice().sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0];

    return {
      found: true,
      startDate,
      endDate,
      clicks: totals.clicks,
      impressions: totals.impressions,
      ctr,
      avgPosition,
      topQuery: topQuery?.keys?.[0] || null,
      topQueryPosition: topQuery?.position ?? null,
    };
  } catch (err) {
    console.error("Search Console lookup failed:", err.message);
    return { error: err.message };
  }
}
