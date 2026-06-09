// Server-side fetch of a published page. No API needed — just HTTP.
// Returns raw HTML, which is what makes JSON-LD / schema detection possible.
export async function fetchHtml(url) {
  const target = url.startsWith("http") ? url : "https://" + url;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; MomentBlogAuditor/1.0; +https://www.momentprivatewealth.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`Page returned ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}
