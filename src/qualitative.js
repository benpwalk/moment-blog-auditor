// ============================================================================
// STEP 3 HOOK — the qualitative "brain".
// Until ANTHROPIC_API_KEY is set, this returns `pending` for every judgment item
// and the rest of the tool works fully. To switch Step 3 on, add one line to .env:
//     ANTHROPIC_API_KEY=sk-ant-...
// No code changes needed. The key is a self-serve key from console.anthropic.com.
// ============================================================================

const MODEL = "claude-opus-4-8"; // swap to a cheaper model (e.g. claude-haiku-4-5) to cut cost

export async function analyzeQualitative({ keyword, cluster, faqQuestions = [], introText = "", bodyText = "" }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null; // -> rubric shows these items as "pending (enable Step 3)"
  }

  const prompt = `You are auditing a blog post from Moment Private Wealth, a firm serving professional ${cluster === "entrepreneur" ? "entrepreneurs/business owners" : "athletes"}. Target keyword: "${keyword}".

Score THREE things. Respond with ONLY a JSON object, no prose, no markdown fences:
{
  "faqSpecificity": {"status":"pass|warn|fail","evidence":"<=20 words","fix":"<=25 words or null"},
  "introStory": {"status":"pass|warn|fail","evidence":"<=20 words","fix":"<=25 words or null"},
  "contentSpecificity": {"status":"pass|warn|fail","evidence":"<=20 words","fix":"<=25 words or null"}
}

Rules:
- faqSpecificity: PASS only if FAQs are specific to this post's topic. FAIL if they are generic firm questions (e.g. "Are you a fiduciary?", "How do you make money?").
- introStory: PASS if the intro opens with a genuine narrative/story rather than a dry definition.
- contentSpecificity: PASS if the writing is hyper-specific to this audience with concrete detail; FAIL if it reads like generic AI filler.

FAQ questions found: ${JSON.stringify(faqQuestions.slice(0, 12))}
Intro: """${introText.slice(0, 1200)}"""
Body excerpt: """${bodyText.slice(0, 4000)}"""`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error("Anthropic API " + res.status);
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("Qualitative analysis failed:", err.message);
    return null; // fail safe -> items stay pending, tool still returns a score
  }
}
