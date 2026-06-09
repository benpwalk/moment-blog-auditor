const $ = (s) => document.querySelector(s);
const COLORS = { pass: "var(--pass)", warn: "var(--warn)", fail: "var(--fail)", pending: "var(--pending)", info: "var(--slate)" };
const PILL = { pass: "Pass", warn: "Improve", fail: "Fail", pending: "Pending", info: "Note" };
let mode = "url";

// Tabs
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const tab = t.dataset.tab;
    $("#view-audit").classList.toggle("hidden", tab !== "audit");
    $("#view-dash").classList.toggle("hidden", tab !== "dash");
    if (tab === "dash") loadDash();
  })
);

// Modes
document.querySelectorAll(".mode").forEach((m) =>
  m.addEventListener("click", () => {
    document.querySelectorAll(".mode").forEach((x) => x.classList.remove("active"));
    m.classList.add("active");
    mode = m.dataset.mode;
    $("#urlBox").classList.toggle("hidden", mode !== "url");
    $("#draftBox").classList.toggle("hidden", mode !== "draft");
  })
);

$("#run").addEventListener("click", runAudit);

async function runAudit() {
  const writer = $("#writer").value.trim() || "Anonymous";
  const body = { mode, writer };
  if (mode === "url") {
    body.url = $("#url").value.trim();
    if (!body.url) return setStatus("Enter a published URL first.", true);
  } else {
    body.html = $("#draftHtml").value.trim();
    body.title = $("#draftTitle").value.trim();
    if (!body.html) return setStatus("Paste your draft first.", true);
  }
  $("#run").disabled = true;
  setStatus("Fetching page, parsing structure & schema, matching the calendar…", false);
  $("#results").classList.add("hidden");
  try {
    const res = await fetch("/api/audit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Audit failed.");
    render(data);
    $("#status").classList.add("hidden");
  } catch (e) {
    setStatus(e.message, true);
  } finally {
    $("#run").disabled = false;
  }
}

function setStatus(msg, isError) {
  const el = $("#status");
  el.textContent = msg;
  el.style.color = isError ? "var(--fail)" : "var(--ink2)";
  el.classList.remove("hidden");
}

function ring(score, grade) {
  const r = 52, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  const col = score >= 85 ? "var(--pass)" : score >= 70 ? "var(--warn)" : "var(--fail)";
  return `<svg class="ring" width="128" height="128" viewBox="0 0 132 132">
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="rgba(27,26,23,.12)" stroke-width="9"/>
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 66 66)"/>
    <text x="66" y="60" text-anchor="middle" class="serif" font-size="34" font-weight="600" fill="var(--ink)">${score}</text>
    <text x="66" y="84" text-anchor="middle" font-size="12" letter-spacing="1.5" fill="var(--ink2)">GRADE ${grade}</text>
  </svg>`;
}

function render(d) {
  const m = d.meta;
  const verdict = d.overall >= 85 ? "Strong — minor polish only." : d.overall >= 70 ? "Solid, with a few fixable gaps capping its ranking ceiling." : "Needs work before it will compete in search.";
  const dims = d.dims.map((dim, i) => {
    const v = dim.score;
    const col = v === null ? "var(--slate)" : v >= 85 ? "var(--pass)" : v >= 70 ? "var(--warn)" : "var(--fail)";
    return `<div class="card dim fade" style="animation-delay:${i * 55}ms">
      <div class="name">${dim.key}</div>
      <div class="val"><span class="num">${v === null ? "–" : v}</span><span class="wt">${v === null ? "not yet measured" : "/100 · " + dim.weight + "% wt"}</span></div>
      <div class="track"><div class="fill" style="width:${v || 4}%;background:${col}"></div></div>
    </div>`;
  }).join("");

  const fixes = d.fixes.length ? d.fixes.map((f) =>
    `<div class="fix"><span class="tag ${f.impact}">${f.impact.toUpperCase()}</span>
      <div><div class="ftext">${f.text}</div><div class="fdim">${f.dim}</div></div></div>`).join("")
    : `<div class="fix"><div class="ftext">No blocking issues found. Nicely done.</div></div>`;

  const blocks = d.dims.map((dim) => `
    <div class="card block fade">
      <div class="block-head"><span class="bt">${dim.key}</span><span class="bs">${dim.score === null ? "" : dim.score + "/100"}</span></div>
      ${dim.items.map((it) => `
        <div class="item">
          <span class="dot" style="background:${COLORS[it.status]}"></span>
          <div>
            <span class="ilabel">${it.label}</span><span class="pill" style="color:${COLORS[it.status]}">${PILL[it.status]}</span>
            <div class="iev">${it.evidence || ""}</div>
            ${it.fix ? `<div class="ifix"><b>Fix:</b> ${it.fix}</div>` : ""}
          </div>
        </div>`).join("")}
    </div>`).join("");

  $("#results").innerHTML = `
    <div class="card overview fade">
      ${ring(d.overall, d.grade)}
      <div style="flex:1;min-width:260px">
        <div class="ov-title">${m.title}</div>
        <div class="ov-meta">
          ${m.keyword ? `<span><b>Keyword:</b> ${m.keyword}</span>` : `<span><b>Unmatched</b> — add to calendar</span>`}
          <span><b>Mode:</b> ${m.mode === "url" ? "Published URL" : "Draft"}</span>
          ${d.pillar ? `<span><b>Type:</b> pillar/hub</span>` : ""}
        </div>
        <div class="verdict">${verdict}</div>
      </div>
    </div>
    <div class="dimgrid">${dims}</div>
    <div class="sec-title"><span class="t serif">Fix these first</span></div>
    <div class="card fixes fade">${fixes}</div>
    <div class="sec-title"><span class="t serif">Full breakdown</span></div>
    ${blocks}`;
  $("#results").classList.remove("hidden");
}

async function loadDash() {
  const runs = await (await fetch("/api/runs")).json();
  const week = runs.filter((r) => Date.now() - new Date(r.at).getTime() < 7 * 864e5);
  const avg = week.length ? Math.round(week.reduce((s, r) => s + r.overall, 0) / week.length) : "–";
  const low = week.filter((r) => r.overall < 70).length;
  const stats = [["Avg. score this week", avg], ["Posts below 70", low], ["Audits this week", week.length], ["Total runs", runs.length]];
  $("#stats").innerHTML = stats.map((s) => `<div class="card stat"><div class="sl">${s[0]}</div><div class="sv">${s[1]}</div></div>`).join("");

  if (!runs.length) { $("#runs").innerHTML = `<div class="row"><span class="p">No audits yet — run one to populate this.</span></div>`; return; }
  const head = `<div class="row head"><span>Writer</span><span>Post</span><span>When</span><span style="text-align:right">Score</span></div>`;
  const rows = runs.slice(0, 50).map((r) => {
    const col = r.overall >= 85 ? "var(--pass)" : r.overall >= 70 ? "var(--warn)" : "var(--fail)";
    const when = new Date(r.at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `<div class="row"><span class="w">${r.writer}</span><span class="p">${r.title}</span><span class="p">${when}</span><span class="sc" style="color:${col}">${r.overall}</span></div>`;
  }).join("");
  $("#runs").innerHTML = head + rows;
}
