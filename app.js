{
  const E = window.Engine, B = window.Bracket;
  let L = null, WORLD = null; // WORLD: unclaimed league shown on the job picker
  const S = { view: "home", tid: null, pid: null, gid: null, cid: null, rmode: "ratings", sort: {}, st: { scope: "conf", mode: "per", team: "" }, rk: { cid: "all" }, rf: { stars: "all", pos: "all", status: "open", q: "", n: 60 }, br: null, ngConf: 0, coachName: "" };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const col = (c) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : "#555");
  const T = (tid) => L.teams[tid];
  const C = (tid) => L.confs[L.teams[tid].cid];
  const full = (t) => `${t.region} ${t.name}`;
  const seasonLabel = (s) => `${s - 1}–${String(s).slice(2)}`;
  const hgt = (h) => `${Math.floor(h / 12)}'${h % 12}"`;
  const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "–");
  const pct = (m, a) => (a ? ((m / a) * 100).toFixed(1) : "–");
  const pg = (st, k) => (st && st.gp ? st[k] / st.gp : 0);
  const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const fmtDay = (d) => E.dayDate(L.season, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const stars = (n) => `<span class="stars" aria-label="${n} stars">${"★".repeat(n)}<span>${"★".repeat(5 - n)}</span></span>`;
  const isLight = (c) => { const hx = col(c).replace("#", ""); if (hx.length !== 6) return false; const l = [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return l[0] * 0.2126 + l[1] * 0.7152 + l[2] * 0.0722 > 0.36; };
  const logo = (t, sz = 42) => `<span class="logo" style="color:${isLight(t.c1) ? "#15171a" : "#fff"};background:${col(t.c1)};width:${sz}px;height:${sz}px;font-size:${Math.round(sz * (t.abbrev.length > 4 ? 0.25 : t.abbrev.length > 3 ? 0.3 : 0.36))}px">${esc(t.abbrev)}</span>`;
  const curStats = (p) => p.stats[L.season];
  const clsOf = (p) => E.classLabel(p);
  const statusPill = (p) => (p.inj ? `<span class="pill inj" title="${esc(p.inj.type)}">${p.inj.g === 99 ? "Out for season" : `Out ${p.inj.g} g`}</span>` : "") + (p.rs ? `<span class="pill rsp" title="Sitting out this season to save a year of eligibility">Redshirt</span>` : "") + (p.portal ? `<span class="pill inj" title="Entered the transfer portal">In portal</span>` : "") + (p.transfer ? `<span class="pill" title="Joined as a transfer">Transfer</span>` : "");
  const milesTxt = (tid, p) => { const d = E.distance(T(tid), p); return d == null ? "" : `${Math.round(d).toLocaleString()} mi`; };
  const nearTag = (tid, p) => { const b = E.nearBoost(T(tid), p); return b > 1.01 ? `<span class="pill near" title="Prospects value effort from nearby schools more">+${Math.round((b - 1) * 100)}% local</span>` : ""; };
  let AP = {}, NET = {};
  function refreshRanks() { AP = {}; if (L.poll) L.poll.top.forEach((tid, i) => (AP[tid] = i + 1)); NET = E.netRanks(L).rk; }
  const rkTag = (tid) => (AP[tid] ? `<span class="rk">${AP[tid]}</span>` : "");
  const tlink = (tid, o = {}) => { const t = T(tid); return `<a data-go="team:${tid}" class="tl"><span class="swatch" style="background:${col(t.c1)}"></span>${o.rank === false ? "" : rkTag(tid)}${esc(o.full ? full(t) : t.region)}</a>`; };
  const plink = (p) => `<a data-go="player:${p.pid}">${esc(p.first + " " + p.last)}</a>`;
  const heat = (v) => `<td class="rt" style="background:color-mix(in srgb,var(--hi) ${Math.max(0, Math.min(38, (v - 30) * 0.9)).toFixed(0)}%,transparent)">${v}</td>`;
  const recStr = (tid) => { const r = L.rec[tid]; return `${r.w}–${r.l}`; };

  // ---------- sortable table ----------
  function table(id, cols, rows, opt = {}) {
    const st = S.sort[id] || opt.def || null;
    let data = rows.slice();
    if (st && !opt.presorted) { const c = cols.find((c) => c.k === st.k); if (c) { const v = c.v || ((r) => r[c.k]); data.sort((a, b) => { const x = v(a), y = v(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * st.d; }); } }
    if (opt.limit) data = data.slice(0, opt.limit);
    const head = cols.map((c) => `<th class="${c.l ? "l" : ""} ${c.nos ? "" : "s"} ${st && st.k === c.k ? "sorted" : ""}" ${c.nos ? "" : `data-sort="${id}" data-k="${c.k}" tabindex="0"`} title="${esc(c.t || "")}">${c.h}${st && st.k === c.k ? (st.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("");
    const body = data.map((r, i) => `<tr class="${opt.rc ? opt.rc(r, i) : ""}">${cols.map((c) => (c.heat ? heat(c.v ? c.v(r) : r[c.k]) : `<td class="${c.l ? "l" : ""}">${c.f ? c.f(r, i) : esc(r[c.k])}</td>`)).join("")}</tr>`).join("");
    return `<div class="scroll" data-tk="${id}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  const confOptions = (sel, extra = "") => extra + L.confs.map((c) => `<option value="${c.cid}" ${String(sel) === String(c.cid) ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  const teamOptions = (sel) => L.confs.map((c) => `<optgroup label="${esc(c.name)}">${c.tids.slice().sort((a, b) => T(a).region.localeCompare(T(b).region)).map((tid) => `<option value="${tid}" ${tid === sel ? "selected" : ""}>${esc(T(tid).region)}</option>`).join("")}</optgroup>`).join("");

  // ---------- shell: sidebar + top bar ----------
  const IC = {
    home: "M3 9.5 10 4l7 5.5V17H3z M8 17v-4h4v4", roster: "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 17a5 5 0 0 1 10 0 M13.5 9a2.5 2.5 0 1 0 0-5 M14 12a4 4 0 0 1 4 5",
    schedule: "M3 5h14v12H3z M3 8.5h14 M7 3v4 M13 3v4", recruiting: "M10 2.5l2.3 4.8 5.2.7-3.8 3.7.9 5.2L10 14.4 5.4 16.9l.9-5.2-3.8-3.7 5.2-.7z",
    stats: "M4 16V10 M10 16V4 M16 16v-6", history: "M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z M10 6v4.2l2.8 1.8",
    standings: "M4 5h12 M4 10h12 M4 15h12 M2 5h.01 M2 10h.01 M2 15h.01", bracket: "M2 4h5v4h4 M2 16h5v-4h4 M11 8v4h6",
    leaders: "M6 3h8v4.5a4 4 0 0 1-8 0z M10 11.5V15 M7 17h6 M6 5H3.5a2.5 2.5 0 0 0 2.6 3 M14 5h2.5a2.5 2.5 0 0 1-2.6 3", awards: "M10 18a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M7.2 9.8 5 2.5h4l1 3 1-3h4l-2.2 7.3",
    scores: "M3 5h14v10H3z M10 5v10 M6 8.5v3 M14 8.5v3", rankings: "M3.5 16v-5h3.5v5 M8.3 16V5h3.5v11 M13 16V8.5h3.5V16", tourney: "M2 3.5h4v3h3 M2 9.5h4v-3 M2 10.5h4v3h3 M2 16.5h4v-3 M9 5v10h4 M13 10h5",
    save: "M4 3h10l3 3v11H4z M7 3v4.5h6V3 M7 17v-5h7v5",
  };
  const icon = (k) => `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k] || IC.home}"/></svg>`;
  const NAV = [
    ["Team", [["home", "Overview", "home"], ["roster", "Roster", "roster"], ["schedule", "Schedule", "schedule"], ["recruiting", "Recruiting", "recruiting"], ["portal", "Transfer portal", "recruiting"], ["tstats", "Team stats", "stats"], ["thistory", "History", "history"]]],
    ["Conference", [["standings", "Standings", "standings"], ["ctour", "Tournament", "bracket"], ["cleaders", "Leaders", "leaders"], ["cawards", "Awards & champions", "awards"]]],
    ["Nation", [["scores", "Scores", "scores"], ["rankings", "Rankings", "rankings"], ["hpi", "HPI", "stats"], ["tourney", "National Tournament", "tourney"], ["nleaders", "Leaders", "leaders"], ["nawards", "Awards & champions", "awards"], ["summary", "Season summary", "history"], ["book", "Record book", "leaders"], ["records", "Program records", "standings"]]],
  ];
  function crumb() {
    for (const [g, items] of NAV) for (const [k, n] of items) if (S.view === k) return [g === "Conference" ? L.confs[S.cid ?? T(L.userTid).cid].name : g === "Team" ? T(L.userTid).region : "National", n];
    if (S.view === "team") return ["Scouting", full(T(S.tid))];
    if (S.view === "progh") return ["Program history", full(T(S.tid))];
    if (S.view === "player") { const p = L.players.find((q) => q.pid === S.pid); return ["Player", p ? p.first + " " + p.last : "Player"]; }
    if (S.view === "box") return ["Box score", (() => { const b = L.boxes[S.gid]; return b ? `${T(b.teams[1].tid).region} at ${T(b.teams[0].tid).region}` : ""; })()];
    if (S.view === "league") return ["Settings", "Save & league"];
    if (S.view === "about") return ["Settings", "About & help"];
    return ["", ""];
  }
  function phaseLabel() {
    if (L.phase === "regular") return fmtDay(Math.min(L.day, E.DAYS.confEnd)) + (L.day >= E.DAYS.confStart ? " · Conference play" : " · Non-conference");
    if (L.phase === "conftour") return "Conference tournaments";
    if (L.phase === "ncaa") return "National Tournament · " + E.NCAA_ROUNDS[L.ncaa.stage];
    return "Offseason";
  }
  function shell() {
    const brand = `<div class="brand"><i></i>Full Court Dynasty</div>`;
    if (!L) {
      document.documentElement.style.setProperty("--tc", "#d9480f");
      $("side").innerHTML = brand + `<p class="mute small" style="margin:6px 18px">Pick a school to start your career. Every page opens once you've taken a job.</p>`;
      $("top").innerHTML = `<button id="navBtn" aria-label="Menu">${icon("standings")}</button><div class="crumb"><small>New career</small><b>Take a job</b></div>`;
      return;
    }
    const t = T(L.userTid), r = L.rec[L.userTid];
    document.documentElement.style.setProperty("--tc", col(t.c1));
    const onView = (k) => S.view === k || (k === "roster" && S.view === "roster");
    $("side").innerHTML = brand +
      `<div class="me-card" data-go="home" tabindex="0" role="button">${logo(t, 38)}<div style="min-width:0"><b>${rkTag(t.tid)}${esc(full(t))}</b><span>${r.w}–${r.l} · ${r.cw}–${r.cl} ${esc(C(t.tid).abbrev)} · NET ${NET[t.tid]}</span></div></div>` +
      NAV.map(([g, items]) => `<div class="navg"><h4>${g === "Conference" ? esc(C(t.tid).abbrev) + " · Conference" : g}</h4>${items.map(([k, n, ic]) => `<button class="nav${onView(k) ? " on" : ""}" data-go="${k}">${icon(ic)}${n}${k === "recruiting" && Object.keys(L.plan).length ? `<span class="ct">${L.recruits.filter((x) => x.commit === L.userTid).length}/${E.openSlots(L, L.userTid)}</span>` : ""}</button>`).join("")}</div>`).join("") +
      `<div class="side-foot"><button class="nav${S.view === "league" ? " on" : ""}" data-go="league">${icon("save")}Save &amp; league</button><button class="nav${S.view === "about" ? " on" : ""}" data-go="about">About &amp; help</button><div class="status" id="status">${esc(saveLine())}</div></div>`;
    const [g, n] = crumb();
    $("top").innerHTML = `<button id="navBtn" aria-label="Menu">${icon("standings")}</button><div class="crumb"><small>${esc(g)}</small><b>${esc(n)}</b></div>
      <div class="when"><b>${seasonLabel(L.season)}</b><br>${phaseLabel()}</div>
      <div class="qa">${quickButtons()}</div>
      <div class="playwrap"><button class="btn" id="playBtn" aria-haspopup="true" aria-expanded="false" aria-label="More sim options">More ▾</button><div class="menu" id="playMenu">${playItems()}</div></div>`;
  }
  const phead = (title, sub, right) => `<div class="phead"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${right ? `<div class="tools" style="margin:0">${right}</div>` : ""}</div>`;
  function quickButtons() {
    const b = (act, label, primary, cls) => `<button class="btn ${primary ? "play" : ""} ${cls || ""}" data-act="${act}">${label}</button>`;
    const alive = E.userAlive(L);
    if (L.phase === "regular") return b("next", "Play next game", 1) + b("week", "Sim week", 0, "q2") + b("toct", "To tournaments", 0, "q3");
    if (L.phase === "conftour") return (alive ? b("next", "Your next game", 1) + b("day", "Sim today", 0, "q2") : b("day", "Next game day", 1)) + b("bracket", "Bracket", 0, "q2") + b("toncaa", "To Selection Day", 0, "q3");
    if (L.phase === "ncaa") return (alive ? b("next", "Your next game", 1) + b("day", "Sim round", 0, "q2") : b("day", "Next round", 1)) + b("bracket", "Bracket", 0, "q2") + b("toend", "To title", 0, "q3");
    return b("go:portal", "Transfer portal", 0, "q2") + b("newseason", "Start next season", 1);
  }
  function playItems() {
    const it = (act, a, b) => `<button data-act="${act}">${a}<small>${b}</small></button>`;
    const alive = E.userAlive(L);
    if (L.phase === "regular") return it("next", "Next game", nextGameText()) + it("week", "Next week", "Seven days on the calendar") + it("toct", "To conference tournaments", "Finish the regular season") + it("toncaa", "To Selection Day", "Through the conference tournaments") + it("toend", "To end of season", "Through the national championship");
    const left = E.gamesLeftToday(L);
    if (L.phase === "conftour") return (alive ? it("next", "Your next game", "Conference tournament") : "") + it("one", "Next tournament game", `One game at a time · ${left} left today`) + it("day", "Finish today's games", "Every conference tournament") + it("toncaa", "To Selection Day", "Finish the conference tournaments") + it("toend", "To end of season", "Through the national championship");
    if (L.phase === "ncaa") return (alive ? it("next", "Your next game", E.NCAA_ROUNDS[L.ncaa.stage]) : "") + it("one", "Next tournament game", `${E.NCAA_ROUNDS[L.ncaa.stage]} · ${left} left`) + it("day", "Finish this round", E.NCAA_ROUNDS[L.ncaa.stage]) + it("toend", "To end of season", "Crown a national champion");
    return it("newseason", "Start next season", "Graduation, development, signing class arrives");
  }
  function nextGame() { return L.games.filter((g) => !g.played && (g.home === L.userTid || g.away === L.userTid)).sort((a, b) => a.day - b.day)[0] || null; }
  function nextGameText() { const g = nextGame(); if (!g) return ""; const h = g.home === L.userTid, o = h ? g.away : g.home; return `${fmtDay(g.day)} · ${g.neutral ? "vs" : h ? "vs" : "at"} ${esc(T(o).region)}`; }

  // ---------- dashboard ----------
  function teamLine(tid) {
    const a = L.ts[tid], o = L.os[tid], n = a.gp || 1;
    return { ppg: a.pts / n, opp: o.pts / n, fg: a.fga ? (a.fgm / a.fga) * 100 : 0, tp: a.tpa ? (a.tpm / a.tpa) * 100 : 0, reb: (a.orb + a.drb) / n, ast: a.ast / n, tov: a.tov / n, gp: a.gp };
  }
  // national rank (1 = best) of every team in each matchup stat; ties share a rank
  function natRanks() {
    const lines = L.teams.map((t) => Object.assign(teamLine(t.tid), { tid: t.tid, tr: E.teamRating(L, t.tid), pr: t.prestige }));
    const out = { n: lines.length };
    for (const [k, hi] of [["ppg", 1], ["opp", 0], ["fg", 1], ["tp", 1], ["reb", 1], ["tov", 0], ["tr", 1], ["pr", 1]]) {
      const sorted = lines.slice().sort((x, y) => (hi ? y[k] - x[k] : x[k] - y[k])), r = [];
      let prev = null, rank = 0;
      sorted.forEach((x, i) => { const v = Math.round(x[k] * 10); if (v !== prev) { rank = i + 1; prev = v; } r[x.tid] = rank; });
      out[k] = r;
    }
    return out;
  }
  function kpi(label, value, sub, cls) { return `<div class="kpi"><span>${label}</span><b class="${cls || ""}">${value}</b>${sub ? `<em>${sub}</em>` : ""}</div>`; }
  function vHome() {
    const u = L.userTid, t = T(u), ng = nextGame(), r = L.rec[u];
    const st = E.confStandings(L, t.cid), me = st.find((x) => x.tid === u), exp = E.expectations(L);
    const last10 = r.last.slice(-10), w10 = (last10.match(/W/g) || []).length;
    const strk = (() => { if (!r.last) return "–"; const c = r.last.slice(-1); let n = 0; for (let i = r.last.length - 1; i >= 0 && r.last[i] === c; i--) n++; return c + n; })();
    const rcm = L.recruits.filter((x) => x.commit === u), open = E.openSlots(L, u);
    const kpis = `<div class="kpis">${kpi("Overall", `${r.w}–${r.l}`, r.w + r.l ? `${((r.w / (r.w + r.l)) * 100).toFixed(0)}% wins` : "No games yet")}${kpi("Conference", `${r.cw}–${r.cl}`, `${ordinal(me.seed)} in ${esc(C(u).abbrev)}`)}${kpi("NET", NET[u], "of 365")}${kpi("Top 25", AP[u] ? "No. " + AP[u] : "–", AP[u] ? (L.poll.prev[u] ? (L.poll.prev[u] > AP[u] ? `Up ${L.poll.prev[u] - AP[u]}` : L.poll.prev[u] < AP[u] ? `Down ${AP[u] - L.poll.prev[u]}` : "No change") : "New this week") : "Unranked")}${kpi("Last 10", last10 ? `${w10}–${last10.length - w10}` : "–", `Streak ${strk}`)}${kpi("Signing class", `${rcm.length}/${open}`, rcm.length ? rcm.map((x) => x.stars + "★").join(" ") : "No commits yet")}</div>`;

    let main;
    if (L.phase === "offseason") {
      const h = L.history[L.history.length - 1], uh = h.user, A = (L.awards || {})[L.season] || {};
      const n = (x) => (x ? `${L.players.some((p) => p.pid === x.pid) ? `<a data-go="player:${x.pid}">${esc(x.name)}</a>` : esc(x.name)} <span class="mute">${esc(x.abbrev)}</span>` : "–");
      main = `<div class="card hero"><div class="cardh"><h3>Season complete</h3><span class="mute small">${seasonLabel(L.season)}</span></div>
        <p>${esc(t.region)} finished <b>${uh.w}–${uh.l}</b>, ${ordinal(uh.seed)} in the ${esc(C(u).name)}. ${uh.ncaa >= 0 ? `National Tournament: ${ncaaResult(uh.ncaa)} as a ${uh.nseed} seed.` : "No National Tournament bid."}</p>
        <table class="tape"><tbody><tr><td class="l mute">National champion</td><td class="l"><b>${tlink(h.champ, { rank: false })}</b> over ${tlink(h.runner, { rank: false })}</td></tr><tr><td class="l mute">Player of the Year</td><td class="l">${n(A.poy)}</td></tr><tr><td class="l mute">Freshman of the Year</td><td class="l">${n(A.foy)}</td></tr><tr><td class="l mute">Most Outstanding Player</td><td class="l">${n(A.mop)}</td></tr></tbody></table>
        <div class="tools" style="margin:14px 0 0"><button class="btn" data-go="portal">Transfer portal</button><button class="btn play" data-act="newseason">Start ${seasonLabel(L.season + 1)} season</button><button class="btn" data-go="tourney">Final bracket</button></div>${portalNote()}</div>`;
    } else if (ng) {
      const home = ng.home === u, opp = home ? ng.away : ng.home, a = teamLine(u), b = teamLine(opp);
      const where = ng.type === "ct" ? `${esc(C(u).abbrev)} tournament · ${esc(ng.round)}` : ng.type === "ncaa" ? `National Tournament · ${esc(ng.round)}` : ng.neutral ? "Neutral site" : home ? "Home" : "Away";
      const NR = natRanks();
      const rk = (key, tid) => (NR[key] ? `<span class="nrk" title="National rank of ${NR.n} teams">${ordinal(NR[key][tid])}</span>` : "");
      const row = (lab, x, y, better, fmt = f1, key) => { const xb = better === "hi" ? x > y : x < y, yb = better === "hi" ? y > x : y < x; return `<tr><td class="${xb ? "edge" : ""}">${key ? rk(key, u) : ""}${fmt(x)}</td><td class="mid">${lab}</td><td class="l ${yb ? "edge" : ""}">${fmt(y)}${key ? rk(key, opp) : ""}</td></tr>`; };
      main = `<div class="card hero"><div class="cardh"><h3>Next game</h3><span class="mute small">${fmtDay(ng.day)} · ${where}</span></div>
        <div class="score"><div class="t">${logo(t, 48)}<div><b class="big2">${rkTag(u)}${esc(t.region)}</b><div class="mute small">${recStr(u)} · NET ${NET[u]}</div></div></div><div class="vs">${home || ng.neutral ? "vs" : "at"}</div><div class="t r"><div><b class="big2">${rkTag(opp)}<a data-go="team:${opp}">${esc(T(opp).region)}</a></b><div class="mute small">${recStr(opp)} · NET ${NET[opp]}</div></div>${logo(T(opp), 48)}</div></div>
        ${a.gp && b.gp ? `<table class="tape"><tbody>${row("Points", a.ppg, b.ppg, "hi", f1, "ppg")}${row("Allowed", a.opp, b.opp, "lo", f1, "opp")}${row("FG%", a.fg, b.fg, "hi", f1, "fg")}${row("3P%", a.tp, b.tp, "hi", f1, "tp")}${row("Rebounds", a.reb, b.reb, "hi", f1, "reb")}${row("Turnovers", a.tov, b.tov, "lo", f1, "tov")}${row("Team rating", E.teamRating(L, u), E.teamRating(L, opp), "hi", (v) => v, "tr")}</tbody></table>` : `<table class="tape"><tbody>${row("Team rating", E.teamRating(L, u), E.teamRating(L, opp), "hi", (v) => v, "tr")}${row("Prestige", t.prestige, T(opp).prestige, "hi", (v) => v, "pr")}</tbody></table>`}
        ${(() => { const hm = ng.home, pr = E.predict(L, ng.home, ng.away, ng.neutral), uh = ng.home === u, us = uh ? pr.hs : pr.as, them = uh ? pr.as : pr.hs, wp = uh ? pr.pHome : 1 - pr.pHome; const fav = us >= them; return `<p class="proj"><span class="mute">HPI projection</span> <b>${esc(T(fav ? u : opp).region)}</b> ${Math.round(Math.max(us, them))}–${Math.round(Math.min(us, them))} · ${Math.round(pr.tempo)} possessions · <b class="${wp >= 0.5 ? "W" : "L"}">${Math.round(wp * 100)}%</b> chance you win</p>`; })()}
        <div class="tools" style="margin:14px 0 0"><button class="btn play" data-act="next">Play game</button><button class="btn" data-act="week">Sim a week</button><button class="btn" data-go="team:${opp}">Scout ${esc(T(opp).abbrev)}</button></div></div>`;
    } else {
      main = `<div class="card hero"><div class="cardh"><h3>${L.phase === "ncaa" && L.ncaa.seedOf[u] == null ? "Not in the field this year" : "Your season is over"}</h3></div><p class="mute">Follow the rest of the postseason one game at a time, or skip ahead.</p>${postCtl()}</div>`;
    }

    const c = L.coach, target = Math.min(st.length, exp.confRank + 1), onPace = me.seed <= target;
    const outlook = `<div class="card"><div class="cardh"><h3>Expectations</h3><a data-go="thistory">Coach history</a></div>
      <table class="tape"><tbody><tr><td class="l mute">Board goal</td><td class="l">Top-${target} in the ${esc(C(u).abbrev)}${exp.ncaa ? " and an tournament bid" : ""}</td></tr><tr><td class="l mute">Current</td><td class="l"><b class="${onPace ? "W" : "L"}">${ordinal(me.seed)} place</b> · ${onPace ? "on track" : "behind"}</td></tr><tr><td class="l mute">Coach ${esc(c.name)}</td><td class="l">${c.w}–${c.l} career · ${c.apps} tournament bid${c.apps === 1 ? "" : "s"} · ${c.titles} title${c.titles === 1 ? "" : "s"}</td></tr><tr><td class="l mute">Program prestige</td><td class="l">${t.prestige} · ${ordinal(exp.natRank)} nationally</td></tr></tbody></table>
      <p class="mute small" style="margin:10px 0 0">Job security and offers from other schools are next on the list.</p></div>`;

    const myGames = L.games.filter((g) => g.home === u || g.away === u).sort((x, y) => x.day - y.day);
    const played = myGames.filter((g) => g.played).slice(-4), upcoming = myGames.filter((g) => !g.played).slice(0, 4);
    const schedRow = (g) => { const home = g.home === u, opp = home ? g.away : g.home; if (!g.played) return `<tr><td class="l mute">${fmtDay(g.day)}</td><td class="l">${g.neutral ? "vs" : home ? "vs" : "at"} ${tlink(opp)}</td><td class="mute">NET ${NET[opp]}</td><td></td></tr>`; const us = home ? g.hs : g.as, th = home ? g.as : g.hs, w = us > th; return `<tr><td class="l mute">${fmtDay(g.day)}</td><td class="l">${g.neutral ? "vs" : home ? "vs" : "at"} ${tlink(opp)}</td><td class="${w ? "W" : "L"}">${w ? "W" : "L"}</td><td>${L.boxes[g.gid] ? `<a data-go="box:${g.gid}">${us}–${th}${g.ot ? " OT" : ""}</a>` : `${us}–${th}`}</td></tr>`; };
    const sched = `<div class="card"><div class="cardh"><h3>Schedule</h3><a data-go="schedule">Full schedule</a></div><div class="scroll"><table><tbody>${played.map(schedRow).join("")}${upcoming.length ? `<tr class="grp"><td class="l" colspan="4">Upcoming</td></tr>` + upcoming.map(schedRow).join("") : ""}</tbody></table></div>${!played.length && !upcoming.length ? `<p class="mute">No games scheduled.</p>` : ""}</div>`;

    const standings = `<div class="card"><div class="cardh"><h3>${esc(C(u).name)}</h3><a data-go="standings">Standings</a></div><div class="scroll"><table><thead><tr><th>#</th><th class="l">Team</th><th>Conf</th><th>Overall</th><th>NET</th></tr></thead><tbody>${st.map((x) => `<tr class="${x.tid === u ? "me" : ""}"><td>${x.seed}</td><td class="l">${tlink(x.tid)}</td><td>${x.cw}–${x.cl}</td><td>${x.w}–${x.l}</td><td>${NET[x.tid]}</td></tr>`).join("")}</tbody></table></div></div>`;

    const ros = E.roster(L, u).filter((p) => curStats(p) && curStats(p).gp).sort((x, y) => pg(curStats(y), "pts") - pg(curStats(x), "pts")).slice(0, 6);
    const outs = E.roster(L, u).filter((p) => p.inj || p.rs);
    const avail = outs.length ? `<p class="small" style="margin:10px 0 0"><span class="mute">Unavailable:</span> ${outs.map((p) => `${plink(p)} <span class="mute">(${p.inj ? esc(p.inj.type.toLowerCase()) + ", " + (p.inj.g === 99 ? "season" : p.inj.g + " g") : "redshirt"})</span>`).join(" · ")}</p>` : "";
    const leaders = `<div class="card"><div class="cardh"><h3>Team leaders</h3><a data-go="tstats">Team stats</a></div>${ros.length ? `<div class="scroll"><table><thead><tr><th class="l">Player</th><th>Pos</th><th>Yr</th><th>PTS</th><th>REB</th><th>AST</th><th>FG%</th></tr></thead><tbody>${ros.map((p) => { const s = curStats(p); return `<tr><td class="l">${plink(p)}</td><td>${p.pos}</td><td>${E.YR[p.yr] || ""}</td><td><b>${f1(s.pts / s.gp)}</b></td><td>${f1((s.orb + s.drb) / s.gp)}</td><td>${f1(s.ast / s.gp)}</td><td>${pct(s.fgm, s.fga)}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="mute">Stats appear after the first game.</p>`}${avail}</div>`;

    const top25 = L.poll ? `<div class="card"><div class="cardh"><h3>Top 25</h3><a data-go="rankings">Rankings</a></div><div class="scroll"><table><tbody>${L.poll.top.slice(0, 10).map((tid, i) => `<tr class="${tid === u ? "me" : ""}"><td>${i + 1}</td><td class="l">${tlink(tid, { rank: false })}</td><td class="l mute">${esc(C(tid).abbrev)}</td><td>${recStr(tid)}</td></tr>`).join("")}</tbody></table></div></div>` : "";

    const recr = `<div class="card"><div class="cardh"><h3>Recruiting</h3><a data-go="recruiting">Board</a></div>
      <table class="tape"><tbody><tr><td class="l mute">Weekly points</td><td class="l">${t.rb}${L.autoRec ? " · staff recruiting" : ""}</td></tr><tr><td class="l mute">Scholarships</td><td class="l">${rcm.length} committed of ${open} open</td></tr><tr><td class="l mute">On your board</td><td class="l">${Object.keys(L.plan).length} prospect${Object.keys(L.plan).length === 1 ? "" : "s"}</td></tr></tbody></table>
      ${rcm.length ? `<div class="scroll" style="margin-top:10px"><table><tbody>${rcm.sort((x, y) => x.rank - y.rank).map((x) => `<tr><td class="l">${esc(x.first + " " + x.last)}</td><td>${x.pos}</td><td>${stars(x.stars)}</td><td class="mute">No. ${x.rank}</td></tr>`).join("")}</tbody></table></div>` : ""}</div>`;

    const newsC = `<div class="card"><div class="cardh"><h3>News</h3></div><ul class="news">${L.news.slice(0, 8).map((x) => `<li class="${x.mine ? "mine" : ""}"><span class="mute small">${x.season === L.season && x.day ? fmtDay(Math.min(x.day, E.DAYS.last)) : seasonLabel(x.season)}</span>${esc(x.text)}</li>`).join("")}</ul></div>`;

    return teamHead(u, "Overview", `${esc(C(u).name)} · ${seasonLabel(L.season)} · ${phaseLabel()}`, "") + kpis + `
      <div class="dash"><div class="s8">${main}</div><div class="s4">${outlook}</div>
      <div class="s6">${sched}</div><div class="s6">${standings}</div>
      <div class="s8">${leaders}</div><div class="s4">${top25 || recr}</div>
      ${top25 ? `<div class="s4">${recr}</div><div class="s8">${newsC}</div>` : `<div class="s12">${newsC}</div>`}</div>`;
  }
  function teamHead(tid, title, sub, right) {
    const t = T(tid);
    return `<div class="phead th" style="--tc2:${col(t.c1)}"><div class="who">${logo(t, 56)}<div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div></div>${right ? `<div class="tools" style="margin:0">${right}</div>` : ""}</div>`;
  }
  const ncaaResult = (r) => ["lost in the Opening Round", "lost in the Round of 64", "lost in the Round of 32", "lost in the Round of 16", "lost in the Regional Final", "lost in the Final Weekend", "lost in the title game", "won the national title"][r] || "";
  function resultRow(g) {
    const u = L.userTid, home = g.home === u, opp = home ? g.away : g.home, us = home ? g.hs : g.as, them = home ? g.as : g.hs, w = us > them;
    return `<tr><td class="l mute">${fmtDay(g.day)}</td><td class="l">${g.neutral ? "vs" : home ? "vs" : "at"} ${tlink(opp)}</td><td class="${w ? "W" : "L"}">${w ? "W" : "L"}</td><td><a data-go="box:${g.gid}">${us}–${them}${g.ot ? " OT" : ""}</a></td></tr>`;
  }

  // ---------- roster / player ----------
  function vRoster(tid) {
    const t = T(tid), mine = tid === L.userTid, ps = E.roster(L, tid);
    const id = "rosterS", sorted = S.sort[id] && S.sort[id].k !== "rot";
    const base = [
      { k: "rot", h: "Rot", v: (p) => p.depth, f: (p) => (mine && !sorted ? `<span class="mv"><button data-act="up:${p.pid}" ${p.depth === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button data-act="down:${p.pid}" ${p.depth === ps.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button></span> ` : "") + (p.depth + 1) },
      { k: "name", h: "Name", l: 1, v: (p) => p.last, f: (p) => plink(p) },
      { k: "pos", h: "Pos", v: (p) => E.POS.indexOf(p.pos), f: (p) => p.pos },
      { k: "yr", h: "Yr", v: (p) => p.yr, f: (p) => clsOf(p) },
      { k: "status", h: "Status", l: 1, v: (p) => (p.inj ? 2 : 0) + (p.rs ? 1 : 0), f: (p) => statusPill(p) + (mine && L.phase === "regular" ? (p.rs ? ` <button class="btn sm rsb" data-act="rs:${p.pid}:0">Undo</button>` : E.canRedshirt(L, p) && p.yr <= 4 ? ` <button class="btn sm rsb" data-act="rs:${p.pid}:1" title="Sit him this season and keep a year of eligibility">Redshirt</button>` : "") : "") },
      { k: "hgt", h: "Ht", f: (p) => hgt(p.hgt) },
      { k: "town", h: "Hometown", l: 1, v: (p) => p.town, f: (p) => `<span class="mute">${esc(p.town)}</span>` },
      { k: "mpg", h: "Min", t: "Planned minutes from rotation spot", v: (p) => E.MINUTES[p.depth] || 0, f: (p) => E.MINUTES[p.depth] || 0 },
      { k: "ovr", h: "Ovr", f: (p) => `<b>${p.ovr}</b>` }, { k: "pot", h: "Pot" },
    ];
    const extra = [["gp", "GP"], ["min", "MPG"], ["pts", "PTS"], ["reb", "REB"], ["ast", "AST"], ["stl", "STL"], ["blk", "BLK"], ["tov", "TO"]].map(([k, h]) => ({ k, h, v: (p) => statVal(curStats(p), k), f: (p) => (k === "gp" ? curStats(p)?.gp || 0 : f1(statVal(curStats(p), k))) }))
        .concat([["fg", "FG%", "fgm", "fga"], ["tp", "3P%", "tpm", "tpa"], ["ft", "FT%", "ftm", "fta"]].map(([k, h, m, a]) => ({ k, h, v: (p) => { const s = curStats(p); return s && s[a] ? s[m] / s[a] : -1; }, f: (p) => { const s = curStats(p); return s ? pct(s[m], s[a]) : "–"; } })));
    const inc = L.recruits.filter((r) => r.commit === tid).sort((a, b) => a.rank - b.rank);
    return teamHead(tid, `${rkTag(tid)}${esc(full(t))}`, `${t.city ? esc(t.city) + " · " : ""}${esc(C(tid).name)} · ${recStr(tid)} · NET ${NET[tid]} · team rating ${E.teamRating(L, tid)} · prestige ${t.prestige}`, `<select id="teamSel" class="btn" aria-label="Team">${teamOptions(tid)}</select>`) + `
      <div class="tools"><button class="btn sm" data-act="editteam:${tid}">Edit name &amp; colors</button>${mine ? `<button class="btn sm" data-act="autosort">Auto-sort by overall</button>${sorted ? `<button class="btn sm" data-act="unsort">Back to rotation order</button>` : ""}<span class="mute small">Top 5 start. Rotation order sets minutes.</span>` : `<button class="btn sm" data-go="schedule:${tid}">Schedule</button><button class="btn sm" data-go="progh:${tid}">History</button>`}</div>
      ${table(id, base.concat(extra), ps, { rc: (p) => (p.depth < 5 ? "start" : "") + (p.depth === 4 ? " split" : "") })}
      ${inc.length ? `<h3 style="margin-top:18px">Committed for next season</h3><p>${inc.map((r) => `${stars(r.stars)} ${esc(r.first + " " + r.last)} <span class="mute">${r.pos} · No. ${r.rank}</span>`).join(" &nbsp; ")}</p>` : ""}
      <p class="mute small">Ovr is a player's current overall rating and Pot his rough ceiling; open a player for his full ratings. Stats are per game this season. Injured and redshirted players are skipped in the rotation automatically. Freshmen can be redshirted before they've played more than 4 games; a player who misses the season injured gets a medical redshirt automatically.</p>`;
  }
  function statVal(s, k) { if (!s || !s.gp) return 0; if (k === "reb") return (s.orb + s.drb) / s.gp; if (k === "gp") return s.gp; return s[k] / s.gp; }
  function vPlayer(pid) {
    const p = L.players.find((q) => q.pid === pid);
    if (!p) return vAlumnus(pid);
    const t = T(p.tid);
    const bars = E.RKEYS.map((k) => `<div class="row"><span>${E.RNAMES[k]}</span><span class="bar"><i style="width:${p.r[k]}%"></i></span><b style="text-align:right">${p.r[k]}</b></div>`).join("");
    const seasons = Object.keys(p.stats).map(Number).sort();
    const srow = (y) => { const s = p.stats[y]; return `<tr><td class="l">${seasonLabel(y)}</td><td class="l">${esc(L.teams[s.tid]?.abbrev || "")}</td><td>${s.gp}</td><td>${s.gs}</td><td>${f1(pg(s, "min"))}</td><td>${f1(pg(s, "pts"))}</td><td>${f1((s.orb + s.drb) / s.gp)}</td><td>${f1(pg(s, "ast"))}</td><td>${f1(pg(s, "stl"))}</td><td>${f1(pg(s, "blk"))}</td><td>${f1(pg(s, "tov"))}</td><td>${pct(s.fgm, s.fga)}</td><td>${pct(s.tpm, s.tpa)}</td><td>${pct(s.ftm, s.fta)}</td></tr>`; };
    const log = [];
    for (const gid in L.boxes) { const b = L.boxes[gid]; for (const bt of b.teams) { const r = bt.rows.find((x) => x.pid === pid); if (r) { const opp = b.teams.find((x) => x !== bt); log.push({ b, r, opp, w: bt.score > opp.score, sc: `${bt.score}–${opp.score}` }); } } }
    log.sort((a, b) => b.b.day - a.b.day);
    const logT = log.length ? `<div class="scroll"><table><thead><tr><th class="l">Date</th><th class="l">Opp</th><th class="l">Result</th><th>MIN</th><th>PTS</th><th>FG</th><th>3PT</th><th>FT</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th></tr></thead><tbody>${log.map(({ b, r, opp, w, sc }) => `<tr><td class="l mute">${fmtDay(b.day)}</td><td class="l">${esc(T(opp.tid).abbrev)}</td><td class="l"><span class="${w ? "W" : "L"}">${w ? "W" : "L"}</span> <a data-go="box:${b.gid}">${sc}</a></td><td>${r.min}</td><td><b>${r.pts}</b></td><td>${r.fgm}-${r.fga}</td><td>${r.tpm}-${r.tpa}</td><td>${r.ftm}-${r.fta}</td><td>${r.orb + r.drb}</td><td>${r.ast}</td><td>${r.stl}</td><td>${r.blk}</td><td>${r.tov}</td></tr>`).join("")}</tbody></table></div>` : `<p class="mute">Game logs are kept for your own team's games and the National Tournament.</p>`;
    const cur = curStats(p);
    const prof = `<table class="tape"><tbody>
      <tr><td class="l mute">Position</td><td class="l">${p.pos}</td></tr><tr><td class="l mute">Class</td><td class="l">${(p.rsUsed && !p.rs ? "Redshirt " : "") + (["", "Freshman", "Sophomore", "Junior", "Senior"][p.yr] || "Graduate")}</td></tr>
      ${p.inj || p.rs ? `<tr><td class="l mute">Status</td><td class="l">${p.inj ? `<b class="L">${esc(p.inj.type)}</b> · ${p.inj.g === 99 ? "out for the season" : `out about ${p.inj.g} more game${p.inj.g === 1 ? "" : "s"}`}` : ""}${p.rs ? "Redshirting this season" : ""}</td></tr>` : ""}
      <tr><td class="l mute">Height</td><td class="l">${hgt(p.hgt)}</td></tr><tr><td class="l mute">Hometown</td><td class="l">${esc(p.town)}${p.geo && T(p.tid).geo ? ` <span class="mute">· ${milesTxt(p.tid, p)} from campus</span>` : ""}</td></tr>
      <tr><td class="l mute">Recruit</td><td class="l">${p.stars ? stars(p.stars) + (p.rank ? ` No. ${p.rank} nationally` : "") : p.walkon ? "Walk-on" : "–"}</td></tr>
      <tr><td class="l mute">Rotation</td><td class="l">${p.depth + 1}${p.depth < 5 ? " · starter" : ""} · ${E.MINUTES[p.depth] || 0} planned min</td></tr></tbody></table>`;
    const rsBtn = p.tid === L.userTid && L.phase === "regular" ? (p.rs ? `<button class="btn sm" data-act="rs:${p.pid}:0">Remove redshirt</button>` : E.canRedshirt(L, p) ? `<button class="btn sm" data-act="rs:${p.pid}:1">Redshirt this season</button>` : "") : "";
    return teamHead(p.tid, esc(p.first + " " + p.last), `${p.pos} · ${clsOf(p)} · #${p.jersey} · ${tlink(p.tid, { full: 1 })} ${statusPill(p)}`, `${rsBtn}<button class="btn sm" data-go="team:${p.tid}">${esc(t.abbrev)} roster</button>`) + `
      ${p.awards && p.awards.length ? `<div class="awards">${p.awards.map((x) => `<span class="pill aw">${seasonLabel(x.s)} ${esc(x.a)}</span>`).join("")}</div>` : ""}
      <div class="kpis">${kpi("Overall", p.ovr, "current rating")}${kpi("Potential", p.pot, "rough ceiling")}${kpi("Points", cur && cur.gp ? f1(cur.pts / cur.gp) : "–", "per game")}${kpi("Rebounds", cur && cur.gp ? f1((cur.orb + cur.drb) / cur.gp) : "–", "per game")}${kpi("Assists", cur && cur.gp ? f1(cur.ast / cur.gp) : "–", "per game")}${kpi("Games", cur ? cur.gp : 0, cur ? `${cur.gs} starts` : "this season")}</div>
      <div class="dash"><div class="s8 stackcol"><div class="card"><h3>Season by season</h3>${seasons.length ? `<div class="scroll"><table><thead><tr><th class="l">Season</th><th class="l">Team</th><th>GP</th><th>GS</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG%</th><th>3P%</th><th>FT%</th></tr></thead><tbody>${seasons.map(srow).join("")}</tbody></table></div>` : `<p class="mute">Hasn't played yet.</p>`}</div>
      <div class="card"><h3>Game log</h3>${logT}</div></div>
      <div class="s4 stackcol"><div class="card"><h3>Profile</h3>${prof}</div><div class="card"><h3>Ratings</h3><div class="bars">${bars}</div></div></div></div>`;
  }

  // former players kept in the archive (pros, award winners and your own program's players)
  function vAlumnus(pid) {
    const a = (L.alumni || {})[pid];
    if (!a) return phead("Former player", "This player has left college. Records are kept for drafted players, award winners and players from your program.");
    const seasons = Object.keys(a.stats).map(Number).sort();
    const c = E.careerTotals(a), gp = c.gp || 1;
    const srow = (y) => { const s = a.stats[y]; return `<tr><td class="l">${seasonLabel(y)}</td><td class="l">${esc(L.teams[s.tid]?.abbrev || "")}</td><td>${s.gp}</td><td>${f1(pg(s, "min"))}</td><td>${f1(pg(s, "pts"))}</td><td>${f1((s.orb + s.drb) / (s.gp || 1))}</td><td>${f1(pg(s, "ast"))}</td><td>${pct(s.fgm, s.fga)}</td><td>${pct(s.tpm, s.tpa)}</td></tr>`; };
    const pro = a.pro ? `Drafted No. ${a.pro.pick} overall (round ${a.pro.round}) by the ${esc(a.pro.team)} in ${a.pro.season}` : a.how === "early" ? "Left early for the pros; went undrafted" : "Graduated; went undrafted";
    return teamHead(a.tid, esc(a.first + " " + a.last), `${a.pos} · ${esc(a.school)} · left ${seasonLabel(a.left)} (${a.how === "early" ? "early entry" : "graduated"})`, `<button class="btn sm" data-go="progh:${a.tid}">${esc(T(a.tid).abbrev)} history</button>`) + `
      ${a.awards && a.awards.length ? `<div class="awards">${a.awards.map((x) => `<span class="pill aw">${seasonLabel(x.s)} ${esc(x.a)}</span>`).join("")}</div>` : ""}
      <div class="kpis">${kpi("After college", a.pro ? "Pick " + a.pro.pick : "Undrafted", a.pro ? esc(a.pro.team) : "")}${kpi("Career points", c.pts, f1(c.pts / gp) + " per game")}${kpi("Rebounds", c.reb, f1(c.reb / gp) + " per game")}${kpi("Assists", c.ast, f1(c.ast / gp) + " per game")}${kpi("Games", c.gp, c.seasons + " seasons")}${kpi("Final rating", a.ovr, "potential " + a.pot)}</div>
      <div class="card"><h3>College career</h3><p class="mute small">${pro}. From ${esc(a.town)}${a.stars ? " · " + a.stars + "★ recruit" : ""}.</p><div class="scroll"><table><thead><tr><th class="l">Season</th><th class="l">Team</th><th>GP</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG%</th><th>3P%</th></tr></thead><tbody>${seasons.map(srow).join("")}</tbody></table></div></div>`;
  }
  const playerLink = (x) => { if (!x) return "–"; const live = L.players.some((p) => p.pid === x.pid) || (L.alumni && L.alumni[x.pid]); return live ? `<a data-go="player:${x.pid}">${esc(x.name)}</a>` : esc(x.name); };

  // ---------- schedule / box ----------
  function vSchedule(tid) {
    tid = tid ?? L.userTid;
    const gs = L.games.filter((g) => g.home === tid || g.away === tid).sort((a, b) => a.day - b.day);
    let w = 0, l = 0, lastType = "";
    const rows = gs.map((g) => {
      const home = g.home === tid, opp = home ? g.away : g.home;
      let res = `<td></td><td class="mute">–</td><td></td>`;
      if (g.played) { const us = home ? g.hs : g.as, them = home ? g.as : g.hs, win = us > them; win ? w++ : l++; res = `<td class="${win ? "W" : "L"}">${win ? "W" : "L"}</td><td>${L.boxes[g.gid] ? `<a data-go="box:${g.gid}">${us}–${them}${g.ot ? " OT" : ""}</a>` : `${us}–${them}${g.ot ? " OT" : ""}`}</td><td>${w}–${l}</td>`; }
      const typ = { nc: "Non-conference", conf: "Conference", ct: "Conference tournament", ncaa: "National Tournament" }[g.type];
      const head = typ !== lastType ? `<tr class="grp"><td class="l" colspan="7">${typ}</td></tr>` : ""; lastType = typ;
      return head + `<tr><td class="l">${fmtDay(g.day)}</td><td class="l">${g.neutral ? "vs" : home ? "vs" : "at"} ${tlink(opp)}${g.round ? ` <span class="mute">${esc(g.round)}</span>` : ""}</td><td>${NET[opp]}</td>${res}</tr>`;
    }).join("");
    const rr = L.rec[tid];
    return teamHead(tid, `${tid === L.userTid ? "" : esc(T(tid).region) + " "}Schedule`, `${seasonLabel(L.season)} · ${rr.w}–${rr.l} overall · ${rr.cw}–${rr.cl} conference · ${gs.length} games`, tid === L.userTid ? "" : `<button class="btn sm" data-go="team:${tid}">Roster</button><button class="btn sm" data-go="progh:${tid}">History</button>`) + `
      <div class="scroll"><table><thead><tr><th class="l">Date</th><th class="l">Opponent</th><th>Opp NET</th><th>W/L</th><th>Score</th><th>Record</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function vBox(gid) {
    const b = L.boxes[gid]; if (!b) return `<p>Box score not available.</p>`;
    const [h, a] = b.teams, nP = Math.max(h.periods.length, a.periods.length);
    const perHead = Array.from({ length: nP }, (_, i) => `<th>${i < 2 ? i + 1 + "H" : "OT" + (nP > 3 ? i - 1 : "")}</th>`).join("");
    const per = (bt) => Array.from({ length: nP }, (_, i) => `<td>${bt.periods[i] || 0}</td>`).join("");
    const teamT = (bt) => {
      const rows = bt.rows.map((r, i) => `<tr class="${i === 4 ? "split" : ""}"><td class="l"><a data-go="player:${r.pid}">${esc(r.name)}</a> <span class="mute">${r.pos}</span></td><td>${r.min}</td><td>${r.fgm}-${r.fga}</td><td>${r.tpm}-${r.tpa}</td><td>${r.ftm}-${r.fta}</td><td>${r.orb}</td><td>${r.orb + r.drb}</td><td>${r.ast}</td><td>${r.stl}</td><td>${r.blk}</td><td>${r.tov}</td><td>${r.pf}</td><td><b>${r.pts}</b></td></tr>`).join("");
      const o = bt.tot;
      return `<div class="card" style="margin-bottom:16px"><h3>${tlink(bt.tid, { full: 1 })}</h3><div class="scroll"><table><thead><tr><th class="l">Player</th><th>MIN</th><th>FG</th><th>3PT</th><th>FT</th><th>OREB</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>PTS</th></tr></thead><tbody>${rows}
        <tr class="tot"><td class="l">Totals</td><td>${o.min}</td><td>${o.fgm}-${o.fga}</td><td>${o.tpm}-${o.tpa}</td><td>${o.ftm}-${o.fta}</td><td>${o.orb}</td><td>${o.orb + o.drb}</td><td>${o.ast}</td><td>${o.stl}</td><td>${o.blk}</td><td>${o.tov}</td><td>${o.pf}</td><td>${o.pts}</td></tr>
        <tr><td class="l mute">Shooting</td><td></td><td>${pct(o.fgm, o.fga)}%</td><td>${pct(o.tpm, o.tpa)}%</td><td>${pct(o.ftm, o.fta)}%</td><td colspan="8"></td></tr></tbody></table></div></div>`;
    };
    const th = T(h.tid), ta = T(a.tid), ctx = b.type === "ncaa" ? `National Tournament · ${esc(b.round)}` : b.type === "ct" ? `${esc(C(h.tid).name)} tournament · ${esc(b.round)}` : b.neutral ? "Neutral site" : `at ${esc(th.region)}`;
    return phead(`${esc(ta.region)} ${a.score}, ${esc(th.region)} ${h.score}${b.ot ? (b.ot > 1 ? " (" + b.ot + "OT)" : " (OT)") : ""}`, `${seasonLabel(b.season)} · ${fmtDay(b.day)} · ${ctx}`, `<button class="btn sm" data-act="back">← Back</button>`) + `<div class="card" style="margin-bottom:16px"><div class="score"><div class="t">${logo(ta)}<div><b>${rkTag(a.tid)}${esc(ta.region)}</b><div class="big ${a.score > h.score ? "" : "mute"}">${a.score}</div></div></div><div class="mute">Final${b.ot ? (b.ot > 1 ? " " + b.ot + "OT" : " OT") : ""}</div><div class="t r"><div><b>${rkTag(h.tid)}${esc(th.region)}</b><div class="big ${h.score > a.score ? "" : "mute"}">${h.score}</div></div>${logo(th)}</div></div>
      <div class="scroll" style="max-width:420px;margin:0 auto"><table><thead><tr><th class="l">Team</th>${perHead}<th>T</th></tr></thead><tbody><tr><td class="l">${esc(ta.abbrev)}</td>${per(a)}<td><b>${a.score}</b></td></tr><tr><td class="l">${esc(th.abbrev)}</td>${per(h)}<td><b>${h.score}</b></td></tr></tbody></table></div></div>${teamT(a)}${teamT(h)}`;
  }

  // ---------- scores ----------
  function vScores() {
    const days = [...new Set(L.games.map((g) => g.day))].sort((x, y) => x - y);
    const playedDays = days.filter((d) => L.games.some((g) => g.day === d && g.played));
    let d = S.sday ?? (playedDays.length ? playedDays[playedDays.length - 1] : days[0]);
    if (!days.includes(d)) d = days[0];
    const i = days.indexOf(d), u = L.userTid, uc = T(u).cid;
    let gs = L.games.filter((g) => g.day === d);
    const post = gs.some((g) => g.type === "ct" || g.type === "ncaa");
    const f = S.sfil || "focus";
    if (!post && f === "focus") gs = gs.filter((g) => T(g.home).cid === uc || T(g.away).cid === uc || AP[g.home] || AP[g.away]);
    else if (f !== "all" && f !== "focus") gs = gs.filter((g) => String(T(g.home).cid) === f || String(T(g.away).cid) === f);
    const mine = (g) => g.home === u || g.away === u;
    gs.sort((x, y) => mine(y) - mine(x) || (x.type === "ncaa" ? 0 : (T(y.home).cid === uc) - (T(x.home).cid === uc)) || (Math.min(AP[x.home] || 99, AP[x.away] || 99) - Math.min(AP[y.home] || 99, AP[y.away] || 99)) || x.gid - y.gid);
    const seed = (g, t) => (g.type === "ncaa" && L.ncaa ? L.ncaa.seedOf[t] : g.type === "ct" && L.ct ? L.ct[T(t).cid].seeds.indexOf(t) + 1 : null);
    const card = (g) => {
      const side = (t, sc, won) => `<div class="ln${won ? " won" : g.played ? " lost" : ""}${t === u ? " me" : ""}"><span class="sd">${seed(g, t) ?? (AP[t] || "")}</span><span class="nm">${tlink(t, { rank: false })}</span><span class="sc">${g.played ? sc : ""}</span></div>`;
      const meta = g.type === "ncaa" ? "Nationals · " + g.round : g.type === "ct" ? esc(C(g.home).abbrev) + " tournament · " + esc(g.round) : g.type === "conf" ? esc(C(g.home).abbrev) : "Non-conference";
      return `<div class="mg score-card${mine(g) ? " has-me" : ""}"><div class="ml">${meta}${g.neutral && g.type === "nc" ? " · neutral" : ""}${g.played ? ` · ${g.gid in L.boxes ? `<a data-go="box:${g.gid}">Final${g.ot ? " OT" : ""}</a>` : "Final" + (g.ot ? " OT" : "")}` : ""}</div>${side(g.away, g.as, g.played && g.as > g.hs)}${side(g.home, g.hs, g.played && g.hs > g.as)}</div>`;
    };
    const opts = `<option value="focus" ${f === "focus" ? "selected" : ""}>${post ? "All games" : "My conference + Top 25"}</option><option value="all" ${f === "all" ? "selected" : ""}>All games</option>${L.confs.map((c) => `<option value="${c.cid}" ${f === String(c.cid) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}`;
    const label = (dd) => { const g = L.games.find((x) => x.day === dd); return fmtDay(dd) + (g && g.type === "ncaa" ? " · " + g.round : g && g.type === "ct" ? " · conference tournaments" : ""); };
    return `<div class="phead"><div><h1>Scores</h1><p>${label(d)}</p></div><div class="tools" style="margin:0"><button class="btn sm" data-act="sday:${days[i - 1] ?? d}" ${i <= 0 ? "disabled" : ""} aria-label="Previous day">←</button><select id="sdaySel" class="btn" aria-label="Day">${days.map((dd) => `<option value="${dd}" ${dd === d ? "selected" : ""}>${label(dd)}</option>`).join("")}</select><button class="btn sm" data-act="sday:${days[i + 1] ?? d}" ${i >= days.length - 1 ? "disabled" : ""} aria-label="Next day">→</button><select id="sfilSel" class="btn" aria-label="Games">${opts}</select></div></div>
      ${(L.phase === "conftour" || L.phase === "ncaa") && d >= L.day - 1 ? postCtl() : ""}
      ${gs.length ? `<div class="scoregrid">${gs.map(card).join("")}</div>` : `<p class="mute">No games on this filter${L.games.some((g) => g.day === d) ? "" : " yet"}. Postseason days appear here as each round is scheduled.</p>`}
      <p class="mute small">${gs.length} game${gs.length === 1 ? "" : "s"}. Box scores are kept for your games and every postseason game.</p>`;
  }

  // ---------- standings + conference bracket ----------
  function vStandings() {
    const cid = S.cid ?? T(L.userTid).cid, c = L.confs[cid], st = E.confStandings(L, cid);
    const cols = [
      { k: "seed", h: "#" }, { k: "name", h: "Team", l: 1, v: (r) => T(r.tid).region, f: (r) => tlink(r.tid) },
      { k: "cpct", h: "Conf", f: (r) => `${r.cw}–${r.cl}` }, { k: "gb", h: "GB", f: (r) => (r.gb ? r.gb.toFixed(1) : "–") },
      { k: "w", h: "Overall", v: (r) => r.w / Math.max(1, r.w + r.l), f: (r) => `${r.w}–${r.l}` }, { k: "hw", h: "Home", f: (r) => `${r.hw}–${r.hl}` }, { k: "aw", h: "Away", f: (r) => `${r.aw}–${r.al}` }, { k: "nw", h: "Neutral", f: (r) => `${r.nw}–${r.nl}` },
      { k: "cdiff", h: "Conf diff", f: (r) => (r.cdiff > 0 ? "+" : "") + f1(r.cdiff) }, { k: "net", h: "NET", v: (r) => NET[r.tid], f: (r) => NET[r.tid] },
      { k: "strk", h: "Last 10", nos: 1, f: (r) => r.last.slice(-10).replace(/W/g, '<span class="W">W</span>').replace(/L/g, '<span class="L">L</span>') },
      { k: "prest", h: "Prestige", heat: 1, v: (r) => T(r.tid).prestige },
    ];
    const br = L.ct && L.ct[cid];
    const nIn = Math.min(16, c.tids.length);
    const tierName = ["", "Power conference", "High major", "Mid major", "Low major"][c.tier];
    return phead(esc(c.name), `${tierName} · ${c.tids.length} teams`, confSel(cid)) + `
      ${table("stand", cols, st, { rc: (r) => (r.tid === L.userTid ? "me" : "") + (r.seed === nIn ? " split" : "") })}
      <p class="mute small">${nIn === c.tids.length ? "Every team makes" : `The top ${nIn} teams make`} the conference tournament${nIn & (nIn - 1) ? "; the top seeds get byes" : ""}. The champion earns the automatic tournament bid. <a data-go="ctour">See the bracket</a></p>`;
  }
  const confSel = (cid) => `<select id="confSel" class="btn" aria-label="Conference">${confOptions(cid)}</select>`;
  function vConfTour() {
    const cid = S.cid ?? T(L.userTid).cid, c = L.confs[cid], br = L.ct && L.ct[cid];
    const sub = br ? (br.champ != null ? `Champion: ${tlink(br.champ)}` : "In progress · winner takes the automatic tournament bid") : L.phase === "regular" ? "Projected from current standings · starts after the regular season" : "";
    const champ = br && br.champ != null ? (() => { const fin = br.rounds[br.rounds.length - 1][0], opp = fin ? (fin.a === br.champ ? fin.b : fin.a) : null, sc = fin && fin.sc ? `${Math.max(...fin.sc)}–${Math.min(...fin.sc)}` : ""; return `<div class="champ" style="margin:0 0 18px">${logo(T(br.champ), 42)}<div><b style="font-size:18px">${tlink(br.champ, { rank: false })} won the ${esc(c.abbrev)} tournament</b><div class="mute small">${opp != null ? `Beat ${esc(T(opp).region)} ${sc} in the final · ` : ""}automatic bid to the National Tournament${L.ncaa && L.ncaa.seedOf[br.champ] ? ` as a No. ${L.ncaa.seedOf[br.champ]} seed` : ""}</div></div></div>`; })() : "";
    return phead(`${esc(c.abbrev)} tournament`, sub, confSel(cid)) + (L.phase === "conftour" ? postCtl() : "") + champ + confBracket(cid, br);
  }
  function sideOf(tid, seed, m, i) {
    if (tid == null) return null;
    const won = m.w != null && m.w === tid, lost = m.w != null && m.w !== tid && !m.bye;
    return { tid, name: T(tid).region, seed, won, lost, me: tid === L.userTid, score: m.sc ? m.sc[i] : null };
  }
  function confBracket(cid, br) {
    if (!br) { const st = E.confStandings(L, cid).slice(0, 16).map((r) => r.tid); br = { seeds: st, rounds: [projRound(st)], proj: true }; }
    const size = br.rounds[0].length * 2, nR = Math.round(Math.log2(size));
    const names = Array.from({ length: nR }, (_, i) => ["", "Championship", "Semifinals", "Quarterfinals", "First round"][nR - i] || "Round " + (i + 1));
    const rounds = [];
    for (let i = 0; i < nR; i++) {
      const src = br.rounds[i] || Array.from({ length: size / 2 ** (i + 1) }, () => ({}));
      rounds.push(src.map((m, j) => {
        const id = `c${cid}-${i}-${j}`;
        if (i === 0 && m.bye) return { id, ghost: true };
        const from = i === 0 ? [] : [`c${cid}-${i - 1}-${j * 2}`, `c${cid}-${i - 1}-${j * 2 + 1}`];
        const so = (t) => br.seeds.indexOf(t) + 1;
        return { id, from, gid: m.gid, hasBox: m.gid != null && !!L.boxes[m.gid], me: m.a === L.userTid || m.b === L.userTid, a: sideOf(m.a, m.a != null ? so(m.a) : null, m, 0), b: sideOf(m.b, m.b != null ? so(m.b) : null, m, 1) };
      }));
    }
    // round 1 matches whose feeder was a bye: show the seeded team straight away
    if (rounds[1]) rounds[1].forEach((m, j) => {
      const r0 = br.rounds[0]; const f1m = r0[j * 2], f2m = r0[j * 2 + 1];
      const so = (t) => br.seeds.indexOf(t) + 1;
      if (!m.a && f1m && f1m.bye) m.a = sideOf(f1m.w, so(f1m.w), {}, 0);
      if (!m.b && f2m && f2m.bye) m.b = sideOf(f2m.w, so(f2m.w), {}, 1);
      m.from = m.from.filter((id, k) => !(k === 0 ? f1m?.bye : f2m?.bye));
    });
    return `<div class="scroll"><div class="brwrap">${B.tree(rounds, names, "ltr")}</div></div>`;
  }
  function projRound(seeds) {
    const n = seeds.length; let size = 2; while (size < n) size *= 2;
    const o = E.seedOrder(size), out = [];
    for (let i = 0; i < size; i += 2) { const a = o[i] <= n ? seeds[o[i] - 1] : null, b = o[i + 1] <= n ? seeds[o[i + 1] - 1] : null; out.push({ a, b, w: b == null ? a : a == null ? b : null, bye: a == null || b == null }); }
    return out;
  }

  // ---------- season summary ----------
  function vSummary() {
    const seasons = L.history.map((h) => h.season);
    if (!seasons.length) return phead("Season summary", "Available once the first season is finished") + `<div class="card"><p class="mute">After the national championship, this page wraps up the year: champions, awards, the pro draft, departures and records.</p></div>`;
    const s = S.sumSeason && seasons.includes(S.sumSeason) ? S.sumSeason : seasons[seasons.length - 1];
    const h = L.history.find((x) => x.season === s), A = (L.awards || {})[s] || {}, D = (L.drafts || {})[s] || [], u = L.userTid, uh = h.user;
    const nm = (x) => (x ? `${playerLink(x)} <span class="mute">${esc(x.abbrev)}</span>` : "–");
    const sel = `<select id="sumSel" class="btn" aria-label="Season">${seasons.slice().reverse().map((y) => `<option value="${y}" ${y === s ? "selected" : ""}>${seasonLabel(y)}</option>`).join("")}</select>`;
    const mineD = D.filter((d) => d.tid === u);
    const dcols = [
      { k: "pick", h: "Pick" }, { k: "team", h: "Pro team", l: 1, f: (d) => esc(d.team) },
      { k: "name", h: "Player", l: 1, v: (d) => d.name, f: (d) => `${playerLink({ pid: d.pid, name: d.name })}` }, { k: "school", h: "School", l: 1, f: (d) => tlink(d.tid, { rank: false }) },
      { k: "pos", h: "Pos" }, { k: "cls", h: "Class", f: (d) => esc(d.cls) + (d.early ? ` <span class="pill">early</span>` : "") },
      { k: "ppg", h: "PPG", f: (d) => f1(d.ppg) }, { k: "rpg", h: "RPG", f: (d) => f1(d.rpg) }, { k: "apg", h: "APG", f: (d) => f1(d.apg) }, { k: "ovr", h: "Ovr" }, { k: "pot", h: "Pot" },
    ];
    const dShow = S.sumMine ? mineD : D;
    const gone = Object.values(L.alumni || {}).filter((x) => x.left === s && x.tid === u);
    const recs = [];
    const R0 = L.rb || {};
    for (const [k, lab] of E.GSTATS) for (const [i, e] of (R0.game?.[k] || []).entries()) if (e.season === s && i < 1) recs.push(`<li>New single-game record, ${lab.toLowerCase()}: <b>${e.v}</b> by ${playerLink(e)} (${esc(e.team)}) vs. ${esc(e.opp)}</li>`);
    for (const [k, lab] of E.SSTATS) for (const [i, e] of (R0.season?.[k] || []).entries()) if (e.season === s && i < 1) recs.push(`<li>New single-season record, ${lab.toLowerCase()}: <b>${Number.isInteger(e.v) ? e.v : e.v.toFixed(1)}</b> by ${playerLink(e)} (${esc(e.team)})</li>`);
    for (const [k, lab] of [["wins", "wins"], ["streak", "win streak"]]) for (const [i, e] of (R0.team?.[k] || []).entries()) if (e.season === s && i < 1) recs.push(`<li>Most ${lab} in a season: <b>${e.v}</b> by ${esc(e.team)} (${esc(e.rec)})</li>`);
    return phead(`${seasonLabel(s)} season summary`, `${esc(T(h.champ).region)} won the national championship`, sel) + `
      <div class="dash"><div class="s6"><div class="card hero"><div class="cardh"><h3>Champions</h3></div><table class="tape"><tbody>
        <tr><td class="l mute">National champion</td><td class="l"><b>${tlink(h.champ, { rank: false })}</b> over ${tlink(h.runner, { rank: false })}</td></tr>
        <tr><td class="l mute">Final Weekend</td><td class="l">${h.ff.map((x) => tlink(x, { rank: false })).join(", ")}</td></tr>
        <tr><td class="l mute">Player of the Year</td><td class="l">${nm(A.poy)}</td></tr><tr><td class="l mute">Freshman of the Year</td><td class="l">${nm(A.foy)}</td></tr><tr><td class="l mute">Most Outstanding Player</td><td class="l">${nm(A.mop)}</td></tr></tbody></table></div></div>
      <div class="s6"><div class="card"><div class="cardh"><h3>${esc(T(uh.tid).region)}</h3><a data-go="thistory">History</a></div><table class="tape"><tbody>
        <tr><td class="l mute">Record</td><td class="l">${uh.w}–${uh.l} · ${uh.cw}–${uh.cl} conference · ${ordinal(uh.seed)}</td></tr>
        <tr><td class="l mute">Postseason</td><td class="l">${uh.ct ? "Won the conference tournament · " : ""}${uh.ncaa >= 0 ? `${uh.nseed} seed, ${ncaaResult(uh.ncaa)}` : "No tournament bid"}</td></tr>
        <tr><td class="l mute">Drafted</td><td class="l">${mineD.length ? mineD.map((d) => `${playerLink({ pid: d.pid, name: d.name })} (No. ${d.pick})`).join(", ") : "None"}</td></tr>
        <tr><td class="l mute">Leaving</td><td class="l">${gone.length ? gone.map((x) => `${playerLink({ pid: x.pid, name: x.first + " " + x.last })} <span class="mute">(${x.how === "early" ? "early entry" : "graduated"})</span>`).join(", ") : L.phase === "offseason" && s === L.season ? E.roster(L, u).filter((p) => p.leave).map((p) => `${plink(p)} <span class="mute">(${p.leave === "early" ? "early entry" : "graduating"})</span>`).join(", ") || "Nobody" : "Nobody"}</td></tr></tbody></table>
        ${L.phase === "offseason" && s === L.season ? `${portalNote()}<div class="tools" style="margin:14px 0 0"><button class="btn" data-go="portal">Transfer portal</button><button class="btn play" data-act="newseason">Start ${seasonLabel(L.season + 1)} season</button><button class="btn" data-go="tourney">Final bracket</button></div>` : ""}</div></div></div>
      <div class="card" style="margin-top:16px"><div class="cardh"><h3>Pro draft · ${s}</h3><span class="seg"><button class="${!S.sumMine ? "on" : ""}" data-act="summine:0">All 60 picks</button><button class="${S.sumMine ? "on" : ""}" data-act="summine:1">Your players</button></span></div>
        ${dShow.length ? table("draft" + s, dcols, dShow, { def: { k: "pick", d: 1 }, rc: (d) => (d.tid === u ? "me" : "") + (d.pick === 30 ? " split" : "") }) : `<p class="mute">${S.sumMine ? "None of your players were drafted." : "No draft this season."}</p>`}
        <p class="mute small">Two rounds of 30 picks by a fictional pro league. Seniors and early entrants are in the pool; teams draft on current ability, upside, age and production.</p></div>
      <div class="card" style="margin-top:16px"><h3>Records set this season</h3>${recs.length ? `<ul class="reclist">${recs.slice(0, 14).join("")}</ul>${recs.length > 14 ? `<p class="mute small">+ ${recs.length - 14} more in the record book</p>` : ""}` : `<p class="mute">No National records fell this season.</p>`}<p class="small" style="margin:8px 0 0"><a data-go="book">Open the record book</a></p></div>`;
  }

  // ---------- record book ----------
  function vBook() {
    const R0 = L.rb || { game: {}, season: {}, career: {}, team: {} }, tab = S.bookTab || "game";
    const tabs = [["game", "Single game"], ["season", "Single season"], ["career", "Career"], ["team", "Team"]];
    const list = (title, rows, fmt, sub) => `<div class="card"><h3>${title}</h3>${rows.length ? `<table class="rbk"><tbody>${rows.slice(0, 10).map((e, i) => `<tr class="${e.tid === L.userTid ? "me" : ""}"><td class="mute">${i + 1}</td><td class="v">${fmt(e.v)}</td><td class="l">${e.pid != null ? playerLink(e) : `<b>${tlink(e.tid, { rank: false })}</b>`}<div class="mute small">${sub(e)}</div></td></tr>`).join("")}</tbody></table>` : `<p class="mute">Nothing yet.</p>`}</div>`;
    const n0 = (v) => v, n1 = (v) => v.toFixed(1);
    let body = "";
    if (tab === "game") body = E.GSTATS.map(([k, lab]) => list(lab, R0.game[k] || [], n0, (e) => `${esc(e.team)} vs. ${esc(e.opp)} · ${seasonLabel(e.season)}`)).join("");
    else if (tab === "season") body = E.SSTATS.map(([k, lab]) => list(lab, R0.season[k] || [], k === "pts" || k === "tpm" ? n0 : n1, (e) => `${esc(e.team)} · ${seasonLabel(e.season)} · ${e.gp} games`)).join("");
    else if (tab === "career") {
      // archived careers plus players still in college
      body = E.CSTATS.map(([k, lab]) => {
        const done = (R0.career[k] || []).slice();
        for (const p of L.players) { const c = E.careerTotals(p); if (!c.gp) continue; done.push({ v: c[k], pid: p.pid, name: p.first + " " + p.last, tid: p.tid, team: T(p.tid).region, active: true, seasons: c.seasons }); }
        done.sort((a, b) => b.v - a.v);
        return list(lab, done, n0, (e) => `${esc(e.team)} · ${e.active ? "active" : "through " + seasonLabel(e.last)}`);
      }).join("");
    } else {
      const T0 = R0.team || {};
      body = list("Most points in a game", T0.gpts || [], n0, (e) => `${e.score} vs. ${esc(e.opp)} · ${seasonLabel(e.season)}`) + list("Biggest win", T0.margin || [], (v) => "+" + v, (e) => `${e.score} vs. ${esc(e.opp)} · ${seasonLabel(e.season)}`) + list("Most wins in a season", T0.wins || [], n0, (e) => `${e.rec} · ${seasonLabel(e.season)}`) + list("Best win % (25+ games)", T0.pct || [], (v) => (v * 100).toFixed(1) + "%", (e) => `${e.rec} · ${seasonLabel(e.season)}`) + list("Longest win streak", T0.streak || [], n0, (e) => `${seasonLabel(e.season)} · ${e.rec}`) + list("Most points per game", T0.ppg || [], n1, (e) => `${e.rec} · ${seasonLabel(e.season)}`);
    }
    return phead("Record book", "National records set in this league · season and career marks update after each season", `<span class="seg">${tabs.map(([k, n]) => `<button class="${tab === k ? "on" : ""}" data-act="booktab:${k}">${n}</button>`).join("")}</span>`) + `<div class="bookgrid">${body}</div><p class="mute small">Season records need 15 games played. Career lists include players still in college. Each program's own bests are on its History page.</p>`;
  }
  // ---------- transfer portal ----------
  function portalNote() {
    const P = L.portal; if (!P || P.done || P.season !== L.season) return "";
    const open = E.portalOpenings(L, L.userTid), mine = P.mine.length;
    return `<p class="small" style="margin:12px 0 0"><b>The transfer portal is open.</b> ${P.ids.length} players are looking for a new school${mine ? `, including ${mine} of yours` : ""}. You have ${Math.max(0, open)} open roster spot${open === 1 ? "" : "s"}. It closes when you start the next season.</p>`;
  }
  const portalChance = (offer, need) => (offer ? (offer >= need + 8 ? `<b class="W">Likely</b>` : offer >= need - 6 ? "Toss-up" : `<span class="L">Long shot</span>`) : "");
  function vPortal() {
    const P = L.portal, u = L.userTid;
    if (!P || P.season !== L.season || L.phase !== "offseason") {
      const last = P && P.done ? P.moves.filter((m) => !m.back && (m.to === u || m.from === u)) : [];
      return phead("Transfer portal", "Opens after the national championship, before the next season starts") + `<div class="card"><p>Each offseason, players looking for a new school enter the portal: good players stuck on the bench, standouts who outgrew a smaller program, and a few who want a fresh start.</p><p>You get <b>one chance to convince one of your own players to stay</b>, and a pool of portal points (three weeks of recruiting points) to make offers. Every player picks his best offer when you start the next season, based on your offer, your prestige, how much he'd play, and distance from home.</p>${last.length ? `<h3 style="margin-top:14px">Last portal</h3><ul class="reclist">${last.map((m) => `<li>${m.to === u ? "In" : "Out"}: ${playerLink({ pid: m.pid, name: m.name })} <span class="mute">${m.pos}, ${m.to === u ? "from " + esc(T(m.from).region) : "to " + esc(T(m.to).region)}</span></li>`).join("")}</ul>` : ""}</div>`;
    }
    const open = E.portalOpenings(L, u), used = Object.values(P.offers).reduce((x, y) => x + y, 0);
    const mine = P.mine.map((id) => L.players.find((p) => p.pid === id)).filter(Boolean).sort((x, y) => y.ovr - x.ovr);
    const whyTxt = (w) => (w === "bench" ? "wants more minutes" : w === "up" ? "wants a bigger stage" : "wants a fresh start");
    const mineCard = `<div class="card"><div class="cardh"><h3>Leaving your program</h3><span class="mute small">${mine.length ? "You can keep one" : ""}</span></div>${mine.length ? `<table class="tape"><tbody>${mine.map((p) => `<tr><td class="l">${plink(p)} <span class="mute">${p.pos} · ${clsOf(p)} · ovr ${p.ovr}</span><div class="mute small">${p.pid === P.keep ? "Staying" : whyTxt(p.why)}</div></td><td>${p.pid === P.keep ? `<button class="btn sm" data-act="pkeep:none">Let him go</button>` : P.keep == null ? `<button class="btn sm" data-act="pkeep:${p.pid}">Convince to stay</button>` : ""}</td></tr>`).join("")}</tbody></table>` : `<p class="mute">None of your players entered the portal.</p>`}</div>`;
    const B = E.portalBoard(L).filter((x) => !S.pf || S.pf === "all" || x.p.pos === S.pf);
    const chance = (x) => portalChance(x.offer, x.need);
    const cols = [
      { k: "name", h: "Player", l: 1, v: (x) => x.p.last, f: (x) => `${plink(x.p)}<div class="mute small">${whyTxt(x.p.why)}</div>` },
      { k: "pos", h: "Pos", v: (x) => x.p.pos, f: (x) => x.p.pos },
      { k: "yr", h: "Yr", v: (x) => x.p.yr, f: (x) => clsOf(x.p) },
      { k: "ovr", h: "Ovr", v: (x) => x.p.ovr, f: (x) => `<b>${x.p.ovr}</b>` },
      { k: "pot", h: "Pot", v: (x) => x.p.pot, f: (x) => x.p.pot },
      { k: "from", h: "From", l: 1, v: (x) => T(x.p.tid).region, f: (x) => tlink(x.p.tid, { rank: false }) },
      { k: "dist", h: "Miles", v: (x) => (x.dist == null ? 9999 : x.dist), f: (x) => (x.dist == null ? "intl" : Math.round(x.dist)) },
      { k: "need", h: "Points to lead", v: (x) => x.need, f: (x) => x.need, t: "About how many points it takes to be his top choice. Distance and how much he'd play at your school are already included." },
      { k: "offer", h: "Your offer", v: (x) => x.offer, f: (x) => `<input type="number" class="pof" min="0" step="1" inputmode="numeric" value="${x.offer || ""}" data-pid="${x.p.pid}" data-need="${x.need}" aria-label="Offer points">` },
      { k: "odds", h: "Chance", l: 1, nos: 1, f: (x) => `<span id="pch${x.p.pid}">${chance(x) || `<span class="mute">–</span>`}</span>` },
    ];
    const pos = S.pf || "all";
    return phead("Transfer portal", `${P.ids.length} players are looking for a new school. Offers are settled when you start the ${seasonLabel(L.season + 1)} season.`, `<button class="btn play" data-act="newseason">Start ${seasonLabel(L.season + 1)} season</button>`) + `
      <div class="kpis">${kpi("Open roster spots", Math.max(0, open), open > 0 ? "after graduation and signees" : "your roster is full")}${kpi("Portal points", `<output id="pLeft">${P.budget - used}</output>`, `of ${P.budget} left`)}${kpi("Offers out", Object.keys(P.offers).length, "you can offer more players than you have spots")}${kpi("Your players in", mine.length, P.keep != null ? "1 convinced to stay" : "")}</div>
      <div class="dash"><div class="s6">${mineCard}</div><div class="s6"><div class="card"><h3>How it works</h3><p class="small">Put points on the players you want. Each one picks his best offer: your points count most, then your prestige, how much he'd play behind your current roster, and how close you are to home. If more of your targets say yes than you have open spots, you get the best ones.</p><p class="small mute">"Points to lead" is an estimate. Offer a few more to be safe; rival schools vary.</p>${used ? `<button class="btn sm" data-act="pclear">Clear all offers</button>` : ""}</div></div>
      <div class="s12"><div class="card"><div class="cardh"><h3>Players in the portal</h3><span class="seg">${["all", "PG", "SG", "SF", "PF", "C"].map((x) => `<button class="${pos === x ? "on" : ""}" data-act="pos:${x}">${x === "all" ? "All" : x}</button>`).join("")}</span></div>
      ${B.length ? table("portal", cols, B, { def: { k: "ovr", d: -1 }, limit: 150, rc: (x) => (x.offer ? "me" : "") }) : `<p class="mute">No players at this position.</p>`}</div></div></div>`;
  }

  // ---------- save file ----------
  function saveFile() {
    encodeSave().then((s) => {
      const t = T(L.userTid), name = `full-court-dynasty-${t.region.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${L.season}.hlsave`;
      try {
        const url = URL.createObjectURL(new Blob([s], { type: "text/plain" }));
        const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast(`Downloaded ${name}`);
      } catch (e) { toast("Download isn't available here. Use Export instead."); }
    });
  }
  // ---------- first-time walkthrough ----------
  const TOUR = [
    { go: "home", h: "This is your program", b: "<p>The Overview shows your record, your next game with a matchup preview, team leaders and news. Your school's page is always under <b>Team</b> on the left; <b>Conference</b> and <b>Nation</b> hold standings, rankings, brackets and records.</p><p class=\"mute small\">Your coach is judged on expectations: a blue blood should contend, a rebuild just needs progress.</p>" },
    { go: "recruiting", h: "Recruiting", b: "<p>Every week you get recruiting points. Type points next to the prospects you want; the more interest you build, the more likely they commit. Recruits closer to campus are cheaper to land.</p><p>Players sign during the season, and the rest on signing day after the national championship. Prefer to skip it? Turn on <b>automatic recruiting</b> on this page.</p>" },
    { go: "home", h: "Play the season", b: "<p>Use the buttons in the top bar: <b>Play next game</b>, <b>Sim week</b>, or <b>To tournaments</b>. Conference tournaments and the National Tournament open by themselves when they start.</p><p>After the title game you get a season summary with the pro draft, then the <b>transfer portal</b>. Start the next season when you're ready.</p><p class=\"mute small\">The game saves automatically. Download a backup any time from Save &amp; league.</p>" },
  ];
  function tour(i) {
    const s = TOUR[i]; if (!s) return;
    if (S.view !== s.go) go(s.go);
    modal(`<p class="mute small" style="margin:0 0 6px">Getting started · ${i + 1} of ${TOUR.length}</p><h2>${s.h}</h2>${s.b}<div class="tools" style="margin-top:16px">${i < TOUR.length - 1 ? `<button class="btn play" data-act="tour:${i + 1}">Next</button><button class="btn" data-act="tour:end">Skip</button>` : `<button class="btn play" data-act="tour:end">Start playing</button>`}${i > 0 ? `<button class="btn" data-act="tour:${i - 1}">Back</button>` : ""}</div>`);
  }
  // ---------- about & help ----------
  const FEEDBACK = ""; // put a feedback email or form link here before sharing the game
  function vAbout() {
    return phead("About &amp; help", "Full Court Dynasty · a college basketball program sim") + `<div class="dash">
      <div class="s6"><div class="card"><h3>What this is</h3><p>Full Court Dynasty is a college basketball management game. Take over any of 365 programs, recruit, set your rotation, and sim seasons through conference tournaments, a 76-team National Tournament, the pro draft and the transfer portal. Stay for decades and build a program's history.</p><div class="tools"><button class="btn" data-act="tour:0">Replay the walkthrough</button></div></div>
      <div class="card" style="margin-top:22px"><h3>Feedback</h3>${FEEDBACK ? `<p>Found a bug or have an idea? <a href="${esc(FEEDBACK)}">${esc(FEEDBACK.replace(/^mailto:/, ""))}</a></p>` : `<p class="mute">A feedback link will be added here.</p>`}</div>
      <div class="card" style="margin-top:22px"><h3>Your data</h3><p class="small">Your league is saved in this browser${window.claude ? " and in your account" : ""}. Nothing about you is collected or sent anywhere else. Browsers can clear their storage, so download a save file from <a data-go="league">Save &amp; league</a> now and then.</p></div></div>
      <div class="s6"><div class="card"><h3>Credits and licenses</h3><table class="tape"><tbody>
        <tr><td class="l mute">Hometowns</td><td class="l"><a href="https://simplemaps.com/data/us-cities">SimpleMaps US Cities Database</a> (Basic), CC BY 4.0</td></tr>
        <tr><td class="l mute">Headline type</td><td class="l">Anton by Vernon Adams, SIL Open Font License 1.1 (<a href="fonts/OFL-Anton.txt">license</a>)</td></tr>
        <tr><td class="l mute">Text type</td><td class="l">Source Sans 3 by Paul D. Hunt for Adobe, SIL Open Font License 1.1 (<a href="fonts/OFL-SourceSans3.txt">license</a>)</td></tr></tbody></table></div>
      <div class="card" style="margin-top:22px"><h3>Disclaimer</h3><p class="small">All schools, players, conferences and pro teams in the default world are fictional. Full Court Dynasty is not affiliated with, endorsed by, or sponsored by the NCAA, any college or university, conference, or professional league. Team names you import yourself stay in your own save.</p></div></div></div>`;
  }

  // ---------- Hardwood Power Index ----------
  // [key, label, higher is better, tooltip, decimals, format]
  const HPI_COLS = {
    overview: [
      ["score", "HPI", 1, "HPI score, 0–100. 50 is an average team; the 90s are title contenders", 1],
      ["expW", "Exp. record", 1, "Record HPI expected from this schedule, game by game", 0, "rec"],
      ["adjO", "Offense", 1, "Points scored per 100 possessions against an average defense, adjusted for opponent and venue"],
      ["adjD", "Defense", 0, "Points allowed per 100 possessions against an average offense, adjusted for opponent and venue"],
      ["adjT", "Pace", 2, "Possessions per game against an average opponent"],
      ["sched", "Schedule", 1, "Average HPI score of opponents played"],
      ["ncsched", "Non-conf", 1, "Average HPI score of non-conference opponents"],
      ["fortune", "Fortune", 1, "Wins above (or below) what HPI expected game by game. Big positive numbers often regress", 1, "pm"],
      ["consist", "Consistency", 0, "How much game-to-game performance swings (points per 100 possessions). Lower is steadier", 1, "pmabs"],
      ["momentum", "Momentum", 1, "Last 10 games compared with the season as a whole (points per 100 possessions)", 1, "pm"],
      ["clutch", "Close games", 1, "Record in games decided by 5 or fewer points or in overtime", 0, "close"],
    ],
    four: [["efg", "Shooting", 1, "Effective FG%: field goal % with threes worth 1.5"], ["tov", "Ball security", 0, "Turnovers per 100 possessions"], ["orb", "Off. rebounding", 1, "Share of its own misses the offense rebounds"], ["ftr", "Free throws", 1, "Free throw attempts per 100 shots"], ["defg", "Opp. shooting", 0, "Opponents' effective FG%"], ["dtov", "Forced TOs", 1, "Opponent turnovers per 100 possessions"], ["dreb", "Def. rebounding", 1, "Share of opponents' misses the defense rebounds"], ["dftr", "Opp. free throws", 0, "Opponents' free throw attempts per 100 shots"]],
    style: [["rawT", "Possessions", 2, "Raw possessions per game"], ["tpr", "3PA share", 2, "Share of shots that are threes"], ["tp", "3P%", 1, "Three-point %"], ["twp", "2P%", 1, "Two-point %"], ["ft", "FT%", 1, "Free throw %"], ["dtp", "Opp. 3P%", 0, "Opponents' three-point %"], ["ast", "Assisted", 1, "Share of made shots that were assisted"], ["blk", "Blocks", 1, "Share of opponent twos blocked"], ["stl", "Steals", 1, "Steals per 100 opponent possessions"], ["hgt", "Height", 2, "Average height, weighted by minutes", 0, "hgt"], ["exp", "Experience", 2, "Average years in college, weighted by minutes", 2], ["bench", "Bench min.", 2, "Share of minutes played by non-starters"]],
  };
  function hpiRows() { const H = E.hpi(L); for (const r of H.rows) r.dreb = 100 - r.dorb; return H; }
  function hpiRanks(rows) {
    const rk = {}, n = rows.length;
    for (const cols of Object.values(HPI_COLS)) for (const [k, , hi] of cols) {
      if (rk[k]) continue; const s = rows.slice().sort((x, y) => (hi ? y[k] - x[k] : x[k] - y[k])), m = {};
      let prev = null, r = 0; s.forEach((x, i) => { const v = Math.round(x[k] * 100); if (v !== prev) { r = i + 1; prev = v; } m[x.tid] = r; }); rk[k] = m;
    }
    rk.n = n;
    return rk;
  }
  const band = (rank, n) => { const p = 1 - (rank - 1) / Math.max(1, n - 1); return p >= 0.9 ? 5 : p >= 0.7 ? 4 : p >= 0.3 ? 3 : p >= 0.1 ? 2 : 1; };
  const BAND_NAME = ["", "Bottom 10%", "Below average", "Average", "Top 30%", "Top 10%"];
  const NEUTRAL = new Set(Object.values(HPI_COLS).flat().filter((c) => c[2] === 2).map((c) => c[0]));
  const chip = (rank, n, k) => (NEUTRAL.has(k) ? `<span class="bnd bn" title="${ordinal(rank)} of ${n} (highest to lowest)">${rank}</span>` : `<span class="bnd b${band(rank, n)}" title="${ordinal(rank)} of ${n} · ${BAND_NAME[band(rank, n)]}">${rank}</span>`);
  function hpiVal(r, k, d, f) {
    const v = r[k];
    if (f === "rec") return `${Math.round(r.expW)}–${Math.round(r.expL)}`;
    if (f === "close") return `${r.cw}–${r.cl}`;
    if (f === "hgt") return hgt(Math.round(v));
    if (f === "pm") return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d ?? 1);
    if (f === "pmabs") return "±" + v.toFixed(d ?? 1);
    return v.toFixed(d ?? 1);
  }
  function profileBars(tid, H, rk) {
    const r = H.rows[tid], items = [["score", "HPI score", 1], ["adjO", "Offense"], ["adjD", "Defense"], ["adjT", "Pace"], ["consist", "Consistency", 1, "pmabs"], ["momentum", "Momentum", 1, "pm"], ["sched", "Schedule"]];
    return items.map(([k, lab, d, f]) => { const rank = rk[k][tid], p = 1 - (rank - 1) / Math.max(1, rk.n - 1); return `<div class="pb"><span>${lab}</span><span class="pbv">${hpiVal(r, k, d, f)}</span><span class="pbar"><i class="${NEUTRAL.has(k) ? "bn" : "b" + band(rank, rk.n)}" style="width:${Math.max(3, p * 100).toFixed(0)}%"></i></span>${chip(rank, rk.n, k)}</div>`; }).join("");
  }
  function vHPI() {
    const H = hpiRows(), rk = hpiRanks(H.rows), tab = S.hpiTab || "overview", scope = S.hpiConf ?? "all", u = L.userTid;
    const rows = H.rows.filter((r) => scope === "all" || String(T(r.tid).cid) === scope);
    const cols = [
      { k: "rk", h: "#", v: (r) => rk.score[r.tid], f: (r) => rk.score[r.tid] },
      { k: "team", h: "Team", l: 1, v: (r) => T(r.tid).region, f: (r) => tlink(r.tid) },
      { k: "conf", h: "Conf", l: 1, v: (r) => C(r.tid).abbrev, f: (r) => esc(C(r.tid).abbrev) },
      { k: "wl", h: "W–L", v: (r) => r.w / Math.max(1, r.w + r.l), f: (r) => `${r.w}–${r.l}` },
    ].concat(HPI_COLS[tab].map(([k, h, hi, t, d, f]) => ({ k, h, t, v: (r) => r[k] * (hi === 0 ? -1 : 1), f: (r) => (k === "score" ? `<b class="hs">${hpiVal(r, k, d, f)}</b>` : `<span class="hv">${hpiVal(r, k, d, f)}</span>`) + chip(rk[k][r.tid], rk.n, k) })));
    const tabs = [["overview", "Overview"], ["four", "Four factors"], ["style", "Shooting & style"]];
    const sub = H.games ? `${H.games.toLocaleString()} games · National average: ${H.avgE.toFixed(1)} points per 100 possessions, ${H.avgT.toFixed(1)} possessions per game` : "Preseason: built from roster strength until real results take over";
    const opts = `<select id="hpiConf" class="btn" aria-label="Conference"><option value="all">All teams</option>${L.confs.map((c) => `<option value="${c.cid}" ${scope === String(c.cid) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`;
    return phead("Hardwood Power Index", sub, opts) + `
      <div class="card" style="margin-bottom:16px"><div class="cardh"><h3>${esc(T(u).region)} profile</h3><span class="mute small">${ordinal(rk.score[u])} of ${rk.n} · 0–100 scale, 50 = average D1 team</span></div>${profileBars(u, H, rk)}</div>
      <div class="tools"><span class="seg">${tabs.map(([k2, n]) => `<button class="${tab === k2 ? "on" : ""}" data-act="hpitab:${k2}">${n}</button>`).join("")}</span><span class="legend">${[5, 4, 3, 2, 1].map((b) => `<span class="bnd b${b}">${BAND_NAME[b]}</span>`).join("")}</span></div>
      <div class="hpi">${table("hpi-" + tab, cols, rows, { def: { k: "rk", d: 1 }, rc: (r) => (r.tid === u ? "me" : "") })}</div>
      <details class="card gloss" style="margin-top:16px"><summary><b>How HPI works</b></summary>
        <p>HPI starts by turning every game into points per 100 possessions, so fast and slow teams can be compared fairly. Each team's offense and defense are then adjusted for the opponents it faced and for home court, and the adjustments repeat until they settle. Before the season, a roster-strength estimate fills in and fades out as results arrive.</p>
        <p>The <b>HPI score</b> turns the gap between offense and defense into a 0–100 scale: 50 is an average team, the 80s are National Tournament locks, and the 90s are title contenders. <b>Fortune</b> counts wins above or below what HPI expected game by game. <b>Consistency</b> shows how much a team's level swings from night to night, and <b>Momentum</b> compares the last 10 games with the season. The colored chips show each value's national rank, and the color shows the band it falls in. Style stats like pace, three-point share and height stay gray, since more isn't better or worse.</p></details>`;
  }
  // ---------- rankings ----------
  function vRankings() {
    const P = L.poll;
    const ap = P ? P.top.map((tid, i) => { const pr = P.prev[tid]; const mv = !pr ? `<span class="mute">new</span>` : pr === i + 1 ? `<span class="mute">–</span>` : pr > i + 1 ? `<span class="W">▲${pr - i - 1}</span>` : `<span class="L">▼${i + 1 - pr}</span>`; return `<tr class="${tid === L.userTid ? "me" : ""}"><td>${i + 1}</td><td>${mv}</td><td class="l">${tlink(tid, { rank: false })}</td><td class="l mute">${esc(C(tid).abbrev)}</td><td>${recStr(tid)}</td><td>${NET[tid]}</td></tr>`; }).join("") : "";
    const pw = E.power(L);
    const rows = L.teams.filter((t) => S.rk.cid === "all" || String(t.cid) === S.rk.cid).map((t) => ({ tid: t.tid, net: NET[t.tid], pw: pw[t.tid], w: L.rec[t.tid].w, l: L.rec[t.tid].l, conf: C(t.tid).abbrev, pr: t.prestige, tr: E.teamRating(L, t.tid) }));
    const cols = [{ k: "net", h: "NET" }, { k: "t", h: "Team", l: 1, v: (r) => T(r.tid).region, f: (r) => tlink(r.tid) }, { k: "conf", h: "Conf", l: 1 }, { k: "w", h: "W–L", v: (r) => r.w / Math.max(1, r.w + r.l), f: (r) => `${r.w}–${r.l}` }, { k: "pw", h: "Power", t: "Points better than an average D1 team", f: (r) => (r.pw > 0 ? "+" : "") + f1(r.pw) }, { k: "tr", h: "Roster", heat: 1 }, { k: "pr", h: "Prestige", heat: 1 }];
    return phead("Rankings", P ? `Top 25 poll for the week of ${fmtDay(Math.min(P.day, E.DAYS.last))} · NET for all 365 teams` : "The first poll comes out after week one") + `<div class="grid2 r"><div class="card"><h3>Top 25 poll</h3>${P ? `<div class="scroll"><table><thead><tr><th>#</th><th></th><th class="l">Team</th><th class="l">Conf</th><th>W–L</th><th>NET</th></tr></thead><tbody>${ap}</tbody></table></div><p class="mute small">Also receiving votes: ${P.others.map((t) => esc(T(t).region)).join(", ")}</p>` : `<p class="mute">The first poll comes out after week one.</p>`}</div>
      <div><div class="cardh" style="margin-bottom:10px"><h3>NET rankings</h3><select id="rkConf" class="btn" aria-label="Conference">${confOptions(S.rk.cid, `<option value="all">All 365 teams</option>`)}</select></div>
      ${table("net", cols, rows, { def: { k: "net", d: 1 }, rc: (r) => (r.tid === L.userTid ? "me" : "") })}
      <p class="mute small">NET here is a margin-based power rating adjusted for opponent and venue, blended with roster strength early in the season. It decides at-large bids and seeding.</p></div></div>`;
  }

  // ---------- recruiting ----------
  function scouted(r) { const fog = Math.max(0, 1 - (r.int[L.userTid] || 0) / 400); return { o: Math.round(r.ovr + r.no * fog), p: Math.round(r.pot + r.np * fog), exact: fog === 0 }; }
  function suitors(r) { return Object.keys(r.int).map(Number).map((tid) => [tid, E.recScore(L, r, tid)]).sort((a, b) => b[1] - a[1]); }
  function vRecruiting() {
    const u = L.userTid, t = T(u), open = E.openSlots(L, u);
    const mine = L.recruits.filter((r) => r.commit === u).sort((a, b) => a.rank - b.rank);
    const left = open - mine.length;
    const planned = Object.values(L.plan).reduce((a, b) => a + b, 0);
    const seniors = L.players.filter((p) => p.tid === u && p.yr >= 4).length;
    const board = Object.keys(L.plan).map(Number).map((id) => L.recruits.find((r) => r.pid === id)).filter(Boolean);
    const row = (r, onBoard) => {
      const s = scouted(r), su = suitors(r), myI = su.findIndex(([tid]) => tid === u);
      const status = r.commit != null ? (r.commit === u ? `<b class="W">Committed to you</b>` : `Committed: ${tlink(r.commit)}`) : su.length ? `${su.slice(0, 3).map(([tid], i) => `<span class="${tid === u ? "W" : ""}">${esc(T(tid).abbrev)}</span>`).join(" · ")}` : `<span class="mute">No offers</span>`;
      const inp = r.commit == null && !L.autoRec ? (onBoard ? `<input type="number" class="pts" min="0" step="1" inputmode="numeric" value="${L.plan[r.pid]}" data-rid="${r.pid}" aria-label="Weekly points"> <button class="btn sm" data-act="unrec:${r.pid}" aria-label="Remove">✕</button>` : `<button class="btn sm" data-act="addrec:${r.pid}">+ Board</button>`) : "";
      return `<tr class="${r.commit === u ? "me" : ""}"><td>${r.rank}</td><td class="l"><b>${esc(r.first + " " + r.last)}</b><div class="mute small">${esc(r.town)}${r.geo ? ` · ${milesTxt(u, r)}` : ""} ${nearTag(u, r)}</div></td><td>${stars(r.stars)}</td><td>${r.pos}</td><td>${hgt(r.hgt)}</td><td title="${s.exact ? "Fully scouted" : "Estimate: spend points to scout"}">${s.exact ? "" : "~"}${s.o}</td><td>${s.exact ? "" : "~"}${s.p}</td><td>${myI >= 0 ? ordinal(myI + 1) : "–"}</td><td class="l">${status}</td><td class="l nowrap">${inp}</td></tr>`;
    };
    const head = `<thead><tr><th>Rank</th><th class="l">Prospect</th><th>Stars</th><th>Pos</th><th>Ht</th><th title="Scouted overall">Ovr</th><th title="Scouted potential">Pot</th><th title="Your place among schools recruiting him">You</th><th class="l">Leaders</th><th class="l">Weekly pts</th></tr></thead>`;
    const f = S.rf, q = f.q.trim().toLowerCase();
    const maxD = f.dist && f.dist !== "any" ? +f.dist : null;
    let pool = L.recruits.filter((r) => (f.stars === "all" || String(r.stars) === f.stars) && (f.pos === "all" || r.pos === f.pos) && (maxD == null || (r.geo && E.distance(T(u), r) <= maxD)) && (f.status === "all" || r.commit == null) && (!q || (r.first + " " + r.last).toLowerCase().includes(q)) && !(r.pid in L.plan));
    const total = pool.length; pool = pool.slice(0, f.n);
    return phead("Recruiting", `${seasonLabel(L.season + 1)} class · ${t.rb} points a week · ${open} scholarship${open === 1 ? "" : "s"} open`) + `<div class="grid2 r"><div class="card"><h3>Budget</h3>
        <div class="kv"><div>Weekly points<b>${t.rb}</b></div><div>Allocated<b id="recAlloc" class="${planned > t.rb ? "L" : ""}">${planned}</b></div><div>Remaining<b id="recLeft" class="${planned > t.rb ? "L" : ""}">${t.rb - planned}</b></div><div>Scholarships open<b>${open}</b></div><div>Commits<b>${mine.length}</b></div></div>
        <div class="bar" style="margin-top:10px"><i id="recBar" style="width:${Math.min(100, (planned / Math.max(1, t.rb)) * 100)}%;background:${planned > t.rb ? "var(--loss)" : "var(--tc)"}"></i></div>
        <p class="small" id="recOver" style="margin:8px 0 0;color:var(--loss)" ${planned > t.rb ? "" : "hidden"}>Over budget by <b>${planned - t.rb}</b>. Every prospect's points are scaled down to fit.</p>
        <p class="small mute" style="margin:8px 0 0">Points = ${t.rbx[0]} base + ${t.rbx[1]} prestige + ${t.rbx[2]} from last season's results. ${seniors} senior${seniors === 1 ? "" : "s"} leaving. Your points go out automatically every week until a prospect commits.</p>
        <label class="check"><input type="checkbox" id="autoRec" ${L.autoRec ? "checked" : ""}> Let my staff handle recruiting</label></div>
      <div class="card"><h3>Your ${seasonLabel(L.season + 1)} class</h3>${mine.length ? `<div class="scroll"><table><tbody>${mine.map((r) => `<tr><td>${r.rank}</td><td class="l">${esc(r.first + " " + r.last)}</td><td>${stars(r.stars)}</td><td>${r.pos}</td><td>${hgt(r.hgt)}</td><td>~${scouted(r).o}</td></tr>`).join("")}</tbody></table></div>` : `<p class="mute">No commitments yet.</p>`}${left > 0 ? `<p class="small mute">${left} scholarship${left === 1 ? "" : "s"} still open. Anyone uncommitted on signing day picks the school he likes most with room.</p>` : `<p class="small W">Class full.</p>`}</div></div>
      <h3 style="margin-top:22px">Your board</h3>${board.length ? `<div class="scroll"><table>${head}<tbody>${board.sort((a, b) => a.rank - b.rank).map((r) => row(r, true)).join("")}</tbody></table></div>` : `<p class="mute">Add prospects below. A good rule: target about twice as many as you have open scholarships, at the star level your prestige can reach.</p>`}
      <div class="tools spread" style="margin-top:20px"><h3 style="margin:0">Prospects</h3><div class="tools" style="margin:0">
        <input type="search" id="rq" placeholder="Search name" value="${esc(f.q)}" aria-label="Search prospects">
        <select id="rstars" class="btn" aria-label="Stars"><option value="all">All stars</option>${[5, 4, 3, 2, 1].map((s) => `<option value="${s}" ${f.stars === String(s) ? "selected" : ""}>${s} star</option>`).join("")}</select>
        <select id="rpos" class="btn" aria-label="Position"><option value="all">All positions</option>${E.POS.map((p) => `<option ${f.pos === p ? "selected" : ""}>${p}</option>`).join("")}</select>
        <select id="rdist" class="btn" aria-label="Distance"><option value="any" ${f.dist === "any" || !f.dist ? "selected" : ""}>Any distance</option>${[150, 300, 500, 900].map((m) => `<option value="${m}" ${f.dist === String(m) ? "selected" : ""}>Within ${m} mi</option>`).join("")}</select>
        <select id="rstatus" class="btn" aria-label="Status"><option value="open" ${f.status === "open" ? "selected" : ""}>Uncommitted</option><option value="all" ${f.status === "all" ? "selected" : ""}>Everyone</option></select></div></div>
      <div class="scroll"><table>${head}<tbody>${pool.map((r) => row(r, false)).join("")}</tbody></table></div>
      ${total > f.n ? `<div class="tools" style="margin-top:10px"><button class="btn" data-act="recmore">Show 60 more</button><span class="mute small">Showing ${f.n} of ${total}</span></div>` : ""}<p class="mute small">Ovr and Pot are scouting estimates (~) until you've spent about 400 points on a prospect. "Leaders" shows the three schools he likes most; prestige counts for more with higher-rated prospects. Prospects value effort from schools near home more: up to +60% within 60 miles, tapering to nothing by 900 miles, plus a little extra in-state.</p>`;
  }

  // ---------- tournament ----------
  // conference tournament champions: shown on Selection Day until the first National Tournament game, and in the Field tab
  function champsCard(N, always) {
    if (!L.ct || N.projected) return "";
    if (!always && L.games.some((g) => g.type === "ncaa" && g.played)) return "";
    const u = L.userTid, mc = T(u).cid;
    const rows = L.confs.slice().sort((a, b) => (a.cid === mc ? -1 : b.cid === mc ? 1 : a.name.localeCompare(b.name))).map((c) => { const br = L.ct[c.cid]; if (!br || br.champ == null) return ""; const ch = br.champ, fin = br.rounds[br.rounds.length - 1][0]; const opp = fin ? (fin.a === ch ? fin.b : fin.a) : null; const sc = fin && fin.sc ? `${Math.max(...fin.sc)}–${Math.min(...fin.sc)}` : ""; return `<tr class="${c.cid === mc ? "me" : ""}"><td class="l"><a data-act="ctgo:${c.cid}">${esc(c.name)}</a></td><td class="l"><b>${tlink(ch, { rank: false })}</b></td><td class="l mute">${opp != null ? `beat ${esc(T(opp).region)} ${sc}` : ""}</td><td>${N.seedOf[ch] ?? "–"}</td></tr>`; }).join("");
    const mine = L.ct[mc] && L.ct[mc].champ;
    return `<div class="card" style="margin:0 0 18px"><div class="cardh"><h3>Conference tournament champions</h3><span class="mute small">Each one earned an automatic bid</span></div>${mine != null ? `<p>${mine === u ? `<b>You won the ${esc(L.confs[mc].abbrev)} tournament.</b>` : `${tlink(mine, { rank: false })} won the ${esc(L.confs[mc].abbrev)} tournament.`}</p>` : ""}<details${always ? " open" : ""}><summary class="small" style="cursor:pointer;font-weight:700">All ${L.confs.length} champions</summary><div class="scroll"><table><thead><tr><th class="l">Conference</th><th class="l">Champion</th><th class="l">Final</th><th>Seed</th></tr></thead><tbody>${rows}</tbody></table></div></details></div>`;
  }
  function vTourney() {
    const N = L.ncaa || projField();
    const u = L.userTid, us = N.seedOf[u];
    const wide = window.innerWidth >= 1700;
    const view = S.br ?? (wide ? "full" : "r" + Math.max(0, regionOf(N, u)));
    const tabs = [["full", "Full bracket"], ...E.REGIONS.map((r, i) => ["r" + i, r]), ["ff", "Final Weekend"], ["or", "Opening Round"], ["field", "Field"]];
    let body;
    if (view === "full") body = fullBracket(N);
    else if (view === "ff") body = `<div class="scroll"><div class="brwrap">${finalFour(N, true)}</div></div>`;
    else if (view === "or") body = orList(N);
    else if (view === "field") body = champsCard(N, true) + fieldList(N);
    else body = `<div class="scroll"><div class="brwrap">${regionTree(N, +view.slice(1), "ltr")}</div></div>`;
    const myLine = us ? `${esc(T(u).region)} ${N.projected ? "projects as" : "is"} a <b>${us} seed</b> in the ${E.REGIONS[regionOf(N, u)]}${N.or.some((m) => m.a === u || m.b === u) ? " (Opening Round)" : ""}.` : `${esc(T(u).region)} ${N.projected ? "is projected to miss the field" : "missed the field"}.`;
    return `<div class="phead"><div><h1>${N.projected ? "Projected field" : `${L.season} National Tournament`}</h1><p>${N.projected ? "Projected from current NET and conference leaders. The real field is picked on Selection Day. " : ""}${myLine}</p></div>${N.champ != null ? `<div class="champ">${logo(T(N.champ), 40)}<div><span class="mute small">National champion</span><br><b>${tlink(N.champ)}</b></div></div>` : ""}</div>
      ${L.ncaa ? postCtl() : ""}${view === "field" ? "" : champsCard(N)}<div class="seg wrap" role="tablist">${tabs.map(([k, n]) => `<button class="${view === k ? "on" : ""}" data-act="br:${k}">${n}</button>`).join("")}</div>
      <p class="mute small">76 teams: 32 automatic bids and 44 at-large. The 12 lowest-seeded automatic qualifiers and the 12 lowest-seeded at-large teams play six Opening Round games each; winners join the Round of 64.</p>
      ${body}`;
  }
  let projCache = null;
  function projField() { if (!projCache || projCache.day !== L.day || projCache.season !== L.season) projCache = { day: L.day, season: L.season, N: E.selectField(L, true) }; return projCache.N; }
  function regionOf(N, tid) { for (let i = 0; i < 4; i++) { for (const m of N.regions[i].rounds[0]) { if (m.a === tid || m.b === tid) return i; if (m.ora != null && (N.or[m.ora].a === tid || N.or[m.ora].b === tid)) return i; if (m.orb != null && (N.or[m.orb].a === tid || N.or[m.orb].b === tid)) return i; } } return -1; }
  function ncSide(N, m, i, tid, orIdx) {
    if (tid == null && orIdx != null) { const o = N.or[orIdx]; if (o.w == null) return { name: `${T(o.a).abbrev} / ${T(o.b).abbrev}`, title: `Opening Round: ${T(o.a).region} vs ${T(o.b).region}`, seed: o.sa, me: o.a === L.userTid || o.b === L.userTid }; tid = o.w; }
    if (tid == null) return null;
    return { tid, name: T(tid).region, seed: N.seedOf[tid], won: m.w === tid, lost: m.w != null && m.w !== tid, me: tid === L.userTid, score: m.sc ? m.sc[i] : null };
  }
  function regionTree(N, ri, dir) {
    const reg = N.regions[ri], names = ["First round", "Second round", "Round of 16", "Regional Final"];
    const rounds = [];
    for (let i = 0; i < 4; i++) {
      const src = reg.rounds[i] || Array.from({ length: 8 / 2 ** i }, () => ({}));
      rounds.push(src.map((m, j) => ({ id: `n${ri}-${i}-${j}`, from: i ? [`n${ri}-${i - 1}-${j * 2}`, `n${ri}-${i - 1}-${j * 2 + 1}`] : [], gid: m.gid, hasBox: m.gid != null && !!L.boxes[m.gid], me: [m.a, m.b].includes(L.userTid), a: ncSide(N, m, 0, m.a ?? null, i === 0 ? m.ora : null), b: ncSide(N, m, 1, m.b ?? null, i === 0 ? m.orb : null) })));
    }
    return `<div class="region"><div class="regh">${esc(reg.name)}</div>${B.tree(rounds, names, dir)}</div>`;
  }
  function finalFour(N, standalone) {
    const ff = N.ff.length ? N.ff : [{}, {}], fin = N.final || {};
    const mk = (m, id, from, label) => ({ id, from, label, gid: m.gid, hasBox: m.gid != null && !!L.boxes[m.gid], me: [m.a, m.b].includes(L.userTid), a: ncSide(N, m, 0, m.a ?? null), b: ncSide(N, m, 1, m.b ?? null) });
    const f0 = mk(ff[0], "ff-0", ["n0-3-0", "n3-3-0"], `${E.REGIONS[0]} vs ${E.REGIONS[3]}`), f1x = mk(ff[1], "ff-1", ["n1-3-0", "n2-3-0"], `${E.REGIONS[1]} vs ${E.REGIONS[2]}`);
    const fn = mk(fin, "ff-2", ["ff-0", "ff-1"], "National championship");
    if (standalone) { f0.from = []; f1x.from = []; return `<div class="ffstand">${B.box(f0)}${B.box(fn)}${B.box(f1x)}</div>`; }
    return `<div class="ffcol"><div class="regh">Final Weekend</div>${B.box(f0)}${B.box(fn)}${B.box(f1x)}</div>`;
  }
  function fullBracket(N) {
    return `<div class="scroll"><div class="brwrap full"><div class="side">${regionTree(N, 0, "ltr")}${regionTree(N, 3, "ltr")}</div>${finalFour(N, false)}<div class="side">${regionTree(N, 1, "rtl")}${regionTree(N, 2, "rtl")}</div></div></div>`;
  }
  function orList(N) {
    return `<div class="orgrid">${N.or.map((m, i) => `<div><div class="mute small">${m.kind === "auto" ? "Automatic qualifiers" : "At-large"} · ${m.sa} seed · ${E.REGIONS[m.region]}</div>${B.box({ id: "or-" + i, gid: m.gid, hasBox: m.gid != null && !!L.boxes[m.gid], me: [m.a, m.b].includes(L.userTid), a: ncSide(N, m, 0, m.a), b: ncSide(N, m, 1, m.b) })}</div>`).join("")}</div>`;
  }
  function fieldList(N) {
    const autos = new Set(N.autos);
    const rows = N.field.map((tid, i) => ({ tid, ov: i + 1, seed: N.seedOf[tid], bid: autos.has(tid) ? "Automatic" : "At-large", conf: C(tid).abbrev, rec: recStr(tid), net: NET[tid], res: N.projected ? "" : L.ncaaRes[tid] }));
    const cols = [{ k: "ov", h: "Overall" }, { k: "seed", h: "Seed" }, { k: "t", h: "Team", l: 1, v: (r) => T(r.tid).region, f: (r) => tlink(r.tid) }, { k: "conf", h: "Conf", l: 1 }, { k: "bid", h: "Bid", l: 1 }, { k: "rec", h: "W–L", nos: 1 }, { k: "net", h: "NET" }];
    if (!N.projected) cols.push({ k: "res", h: "Result", l: 1, f: (r) => (N.champ === r.tid ? "<b>Champion</b>" : ["Opening Round", "Round of 64", "Round of 32", "Round of 16", "Regional Final", "Final Weekend", "Runner-up", "Champion"][r.res] || "") });
    const pw = E.power(L), fieldSet = new Set(N.field);
    const out = L.teams.map((t) => t.tid).filter((t) => !fieldSet.has(t)).sort((a, b) => pw[b] - pw[a]).slice(0, 4);
    return table("field", cols, rows, { def: { k: "ov", d: 1 }, rc: (r) => (r.tid === L.userTid ? "me" : "") }) + `<p class="mute small">First four out: ${out.map((t) => tlink(t)).join(", ")}</p>`;
  }

  // ---------- stats ----------
  function vStats(sc) {
    const u = L.userTid;
    const inScope = (tid) => sc === "all" || (sc === "conf" ? T(tid).cid === T(u).cid : sc === "team" ? tid === u : String(T(tid).cid) === sc);
    const ps = L.players.filter((p) => curStats(p) && curStats(p).gp >= 1 && inScope(p.tid));
    const tot = S.st.mode === "tot";
    const sv = (p, k) => { const s = curStats(p); const v = k === "reb" ? s.orb + s.drb : s[k]; return tot ? v : v / s.gp; };
    const cols = [{ k: "name", h: "Name", l: 1, v: (p) => p.last, f: (p) => plink(p) }, { k: "team", h: "Team", l: 1, v: (p) => T(p.tid).abbrev, f: (p) => `<a data-go="team:${p.tid}">${esc(T(p.tid).abbrev)}</a>` }, { k: "pos", h: "Pos", v: (p) => E.POS.indexOf(p.pos), f: (p) => p.pos }, { k: "yr", h: "Yr", v: (p) => p.yr, f: (p) => E.YR[p.yr] || "GR" }, { k: "ovr", h: "Ovr" }, { k: "gp", h: "GP", v: (p) => curStats(p).gp, f: (p) => curStats(p).gp }]
      .concat(["min", "pts", "reb", "ast", "stl", "blk", "tov"].map((k) => ({ k, h: k === "tov" ? "TO" : k.toUpperCase(), v: (p) => sv(p, k), f: (p) => (tot ? Math.round(sv(p, k)) : f1(sv(p, k))) })))
      .concat([["fg", "FG%", "fgm", "fga"], ["tp", "3P%", "tpm", "tpa"], ["ft", "FT%", "ftm", "fta"]].map(([k, h, m, a]) => ({ k, h, v: (p) => { const s = curStats(p); return s[a] >= 20 ? s[m] / s[a] : -1; }, f: (p) => pct(curStats(p)[m], curStats(p)[a]) })));
    const scopeSel = sc === "team" || sc === "all" ? "" : confSel(+sc);
    const title = sc === "team" ? `${esc(T(u).region)} stats` : sc === "all" ? "National leaders" : `${esc(L.confs[+sc].abbrev)} leaders`;
    const trows = L.teams.filter((t) => inScope(t.tid)).map((t) => ({ tid: t.tid, a: L.ts[t.tid], o: L.os[t.tid] }));
    const tv = (r, k) => { const a = r.a, n = a.gp || 1; if (k === "opp") return r.o.pts / n; if (k === "fg") return a.fga ? (a.fgm / a.fga) * 100 : 0; if (k === "tp") return a.tpa ? (a.tpm / a.tpa) * 100 : 0; if (k === "ft") return a.fta ? (a.ftm / a.fta) * 100 : 0; if (k === "reb") return (a.orb + a.drb) / n; if (k === "mar") return (a.pts - r.o.pts) / n; return a[k] / n; };
    const tc = [{ k: "t", h: "Team", l: 1, v: (r) => T(r.tid).region, f: (r) => tlink(r.tid) }, { k: "gp", h: "G", v: (r) => r.a.gp, f: (r) => r.a.gp }].concat([["pts", "PTS"], ["opp", "OPP"], ["mar", "MARGIN"], ["fg", "FG%"], ["tp", "3P%"], ["tpa", "3PA"], ["ft", "FT%"], ["reb", "REB"], ["ast", "AST"], ["tov", "TO"], ["stl", "STL"], ["blk", "BLK"]].map(([k, h]) => ({ k, h, v: (r) => tv(r, k), f: (r) => f1(tv(r, k)) })));
    return phead(title, `${seasonLabel(L.season)} season · ${sc === "team" ? "every player on your roster" : "click any column to sort"}`, `<span class="seg"><button class="${!tot ? "on" : ""}" data-act="smode:per">Per game</button><button class="${tot ? "on" : ""}" data-act="smode:tot">Totals</button></span>${scopeSel}`) + `
      ${ps.length ? table("stats" + (sc === "team" ? "T" : ""), cols, ps, { def: { k: "pts", d: -1 }, limit: 100, rc: (p) => (p.tid === u && sc !== "team" ? "me" : "") }) + (ps.length > 100 ? `<p class="mute small">Top 100 of ${ps.length} players for this sort.</p>` : "") : `<p class="mute">No games played yet.</p>`}
      ${sc === "team" ? hpiCard(u) : ""}
      <h2 style="margin-top:26px">${sc === "team" ? "Your team vs. opponents" : "Team stats"}</h2>${sc === "team" ? teamVsOpp() : table("tstats", tc, trows, { def: { k: "pts", d: -1 }, limit: 120, rc: (r) => (r.tid === u ? "me" : "") })}`;
  }

  function hpiCard(tid) {
    const H = hpiRows(), rk = hpiRanks(H.rows);
    return `<div class="card" style="margin-top:16px"><div class="cardh"><h3>HPI profile</h3><a data-go="hpi">Full HPI</a></div>${profileBars(tid, H, rk)}</div>`;
  }
  function teamVsOpp() {
    const a = L.ts[L.userTid], o = L.os[L.userTid], n = a.gp || 1;
    const row = (lab, f) => `<tr><td class="l">${lab}</td><td>${f(a)}</td><td>${f(o)}</td></tr>`;
    const pg1 = (k) => (s) => f1(s[k] / n), pc = (m, at) => (s) => pct(s[m], s[at]);
    return `<div class="scroll" style="max-width:520px"><table><thead><tr><th class="l">Per game</th><th>${esc(T(L.userTid).abbrev)}</th><th>Opponents</th></tr></thead><tbody>${row("Points", pg1("pts"))}${row("FG%", pc("fgm", "fga"))}${row("3P%", pc("tpm", "tpa"))}${row("3PA", pg1("tpa"))}${row("FT%", pc("ftm", "fta"))}${row("FTA", pg1("fta"))}${row("Off. rebounds", pg1("orb"))}${row("Rebounds", (s) => f1((s.orb + s.drb) / n))}${row("Assists", pg1("ast"))}${row("Turnovers", pg1("tov"))}${row("Steals", pg1("stl"))}${row("Blocks", pg1("blk"))}</tbody></table></div>`;
  }

  // ---------- history ----------
  // career totals for any program, from its season-by-season history
  function progTotals(t) {
    const o = { tid: t.tid, seasons: t.hist.length, w: 0, l: 0, titles: 0, runner: 0, ff: 0, e8: 0, s16: 0, bids: 0, ct: 0, reg: 0, ncaaW: 0, best: -1 };
    for (const h of t.hist) {
      o.w += h.w; o.l += h.l;
      if (h.ncaa >= 0) { o.bids++; o.ncaaW += Math.max(0, h.ncaa - 1) + (h.ncaa >= 1 && h.ncaa > 0 ? 0 : 0); if (h.ncaa >= 3) o.s16++; if (h.ncaa >= 4) o.e8++; if (h.ncaa >= 5) o.ff++; if (h.ncaa === 6) o.runner++; if (h.ncaa === 7) o.titles++; o.best = Math.max(o.best, h.ncaa); }
      if (h.ct) o.ct++;
      if (h.seed === 1) o.reg++;
    }
    o.pct = o.w + o.l ? o.w / (o.w + o.l) : 0;
    return o;
  }
  function honorsFor(tid) {
    const out = [];
    for (const s of Object.keys(L.awards || {})) {
      const A = L.awards[s];
      for (const [k, lab] of [["poy", "National Player of the Year"], ["foy", "National Freshman of the Year"], ["mop", "Tournament Most Outstanding Player"]]) if (A[k] && A[k].tid === tid) out.push([+s, lab, A[k]]);
      const cc = A.conf && A.conf[T(tid).cid];
      if (cc) for (const [k, lab] of [["poy", "Conference Player of the Year"], ["foy", "Conference Freshman of the Year"]]) if (cc[k] && cc[k].tid === tid) out.push([+s, lab, cc[k]]);
    }
    return out.sort((x, y) => y[0] - x[0]);
  }
  function vProgram(tid) {
    const u = L.userTid, t = T(tid), mine = tid === u, c = L.coach, o = progTotals(t);
    const rows = t.hist.slice().reverse().map((h) => `<tr><td class="l">${seasonLabel(h.season)}</td><td>${h.w}–${h.l}</td><td>${h.cw}–${h.cl}</td><td>${ordinal(h.seed)}</td><td>${h.ct ? "Won" : ""}</td><td class="l">${h.ncaa >= 0 ? `${h.nseed} seed · ${ncaaResult(h.ncaa).replace(/^lost in the /, "Lost in ").replace(/^won the /, "Won the ")}` : "–"}</td><td>${h.prestige}</td></tr>`).join("");
    const hon = honorsFor(tid);
    const coachCard = mine ? `<div class="card" style="margin-bottom:16px"><div class="cardh"><h3>Coach ${esc(c.name)}</h3><span class="mute small">since ${seasonLabel(c.start || L.season)}</span></div><div class="kv"><div>Career<b>${c.w}–${c.l}</b></div><div>Win %<b>${c.w + c.l ? ((c.w / (c.w + c.l)) * 100).toFixed(1) : "–"}</b></div><div>Seasons<b>${c.seasons}</b></div><div>Conf tourney titles<b>${c.ctTitles}</b></div><div>Tournament bids<b>${c.apps}</b></div><div>Final Weekends<b>${c.ff}</b></div><div>National titles<b>${c.titles}</b></div></div></div>` : "";
    const right = mine ? `<button class="btn sm" data-go="records">Program records</button>` : `<button class="btn sm" data-go="team:${tid}">Roster</button><button class="btn sm" data-go="schedule:${tid}">Schedule</button><select id="histSel" class="btn" aria-label="Team">${teamOptions(tid)}</select>`;
    return phead(`${esc(full(t))} history`, `${esc(C(tid).name)} · prestige ${t.prestige}${o.seasons ? ` · ${o.seasons} season${o.seasons === 1 ? "" : "s"} on record` : ""}`, right) + coachCard + `
      <div class="card" style="margin-bottom:16px"><h3>Program totals</h3><div class="kv"><div>Record<b>${o.w}–${o.l}</b></div><div>National titles<b>${o.titles}</b></div><div>Final Weekends<b>${o.ff}</b></div><div>Regional finals<b>${o.e8}</b></div><div>Round of 16s<b>${o.s16}</b></div><div>Tournament bids<b>${o.bids}</b></div><div>Conf tourney titles<b>${o.ct}</b></div><div>Reg. season titles<b>${o.reg}</b></div></div></div>
      <div class="stackcol"><div class="card"><h3>Season by season</h3>${rows ? `<div class="scroll"><table><thead><tr><th class="l">Season</th><th>Overall</th><th>Conf</th><th>Finish</th><th>Conf tourney</th><th class="l">Nationals</th><th>Prestige</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="mute">Starts after the first completed season.</p>`}</div>
      ${programRecordsCard(t)}
      ${prosCard(tid)}
      <div class="card"><h3>Player honors</h3>${hon.length ? `<div class="scroll"><table><tbody>${hon.map(([s, lab, x]) => `<tr><td class="l">${seasonLabel(s)}</td><td class="l">${esc(lab)}</td>${awardCell(x)}</tr>`).join("")}</tbody></table></div>` : `<p class="mute">No award winners yet.</p>`}</div></div>`;
  }
  // totals for each conference, from its current members' histories
  function confRecords(seg, seasons) {
    const rows = L.confs.map((c) => {
      const o = { cid: c.cid, name: c.name, abbrev: c.abbrev, teams: c.tids.length, titles: 0, runner: 0, ff: 0, e8: 0, s16: 0, bids: 0, ncw: 0, ncl: 0, pr: 0, champs: new Set() };
      for (const tid of c.tids) {
        const t = T(tid), p = progTotals(t);
        o.titles += p.titles; o.runner += p.runner; o.ff += p.ff; o.e8 += p.e8; o.s16 += p.s16; o.bids += p.bids; o.pr += t.prestige;
        if (p.titles) o.champs.add(tid);
        for (const h of t.hist) { o.ncw += h.w - h.cw; o.ncl += h.l - h.cl; }
      }
      o.pr = o.pr / c.tids.length; o.bps = seasons ? o.bids / seasons : 0; o.ncp = o.ncw + o.ncl ? o.ncw / (o.ncw + o.ncl) : 0; o.nchamps = o.champs.size;
      return o;
    });
    const cols = [
      { k: "rank", h: "#", nos: 1, f: (r, i) => i + 1 },
      { k: "name", h: "Conference", l: 1, f: (r) => `<a data-act="recconf:${r.cid}">${esc(r.name)}</a>` }, { k: "teams", h: "Teams" },
      { k: "titles", h: "Titles" }, { k: "runner", h: "Runner-up" }, { k: "ff", h: "Final Weekends" }, { k: "e8", h: "Regional finals" }, { k: "s16", h: "Round of 16s" },
      { k: "bids", h: "Tournament bids" }, { k: "bps", h: "Bids / season", f: (r) => f1(r.bps) },
      { k: "ncp", h: "Non-conf win %", t: "Every game outside conference play, postseason included", f: (r) => (r.ncw + r.ncl ? (r.ncp * 100).toFixed(1) : "–") },
      { k: "pr", h: "Avg prestige", f: (r) => f1(r.pr) },
    ];
    const def = { k: "titles", d: -1 }, st = S.sort.crecords || def, keys = [st.k, "titles", "ff", "e8", "s16", "bids", "ncp"];
    const sorted = rows.slice().sort((a, b) => { for (const k of keys) { const x = typeof a[k] === "string" ? a[k].localeCompare(b[k]) : (a[k] ?? 0) - (b[k] ?? 0); if (x) return x * (k === st.k ? st.d : -1); } return 0; });
    const me = T(L.userTid).cid;
    return phead("Program records", seasons ? `Conference totals across the ${seasons} completed season${seasons === 1 ? "" : "s"}, counted by current members · click a conference to see its schools` : "Fills in as seasons are completed", seg) +
      (seasons ? table("crecords", cols, sorted, { def, presorted: true, rc: (r) => (r.cid === me ? "me" : "") }) : `<div class="card"><p class="mute">Finish your first season to start the record book.</p></div>`);
  }
  function prosCard(tid) {
    const pros = Object.values(L.alumni || {}).filter((a) => a.tid === tid && a.pro).sort((x, y) => y.pro.season - x.pro.season || x.pro.pick - y.pro.pick);
    return `<div class="card"><div class="cardh"><h3>Pros from this program</h3><span class="mute small">${pros.length} drafted</span></div>${pros.length ? `<div class="scroll"><table><thead><tr><th class="l">Draft</th><th>Pick</th><th class="l">Player</th><th>Pos</th><th class="l">Pro team</th><th>Career PPG</th></tr></thead><tbody>${pros.map((a) => { const c = E.careerTotals(a); return `<tr><td class="l">${a.pro.season}</td><td>${a.pro.pick}</td><td class="l"><a data-go="player:${a.pid}">${esc(a.first + " " + a.last)}</a></td><td>${a.pos}</td><td class="l">${esc(a.pro.team)}</td><td>${f1(c.pts / (c.gp || 1))}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="mute">No draft picks yet.</p>`}</div>`;
  }
  function programRecordsCard(t) {
    const b = t.best || {};
    const row = (lab, e, fmt, sub) => (e ? `<tr><td class="l mute">${lab}</td><td><b>${fmt(e.v)}</b></td><td class="l">${e.pid != null ? playerLink(e) : ""} <span class="mute small">${sub(e)}</span></td></tr>` : "");
    const n0 = (v) => v, n1 = (v) => v.toFixed(1);
    const rows = row("Points, game", b.g_pts, n0, (e) => `vs. ${esc(e.opp)}, ${seasonLabel(e.season)}`) + row("Rebounds, game", b.g_reb, n0, (e) => `vs. ${esc(e.opp)}, ${seasonLabel(e.season)}`) + row("Assists, game", b.g_ast, n0, (e) => `vs. ${esc(e.opp)}, ${seasonLabel(e.season)}`) + row("Threes, game", b.g_tpm, n0, (e) => `vs. ${esc(e.opp)}, ${seasonLabel(e.season)}`)
      + row("Points per game, season", b.s_ppg, n1, (e) => seasonLabel(e.season)) + row("Rebounds per game, season", b.s_rpg, n1, (e) => seasonLabel(e.season)) + row("Assists per game, season", b.s_apg, n1, (e) => seasonLabel(e.season))
      + row("Career points", b.c_pts, n0, (e) => `through ${seasonLabel(e.last)}`) + row("Career rebounds", b.c_reb, n0, (e) => `through ${seasonLabel(e.last)}`) + row("Career assists", b.c_ast, n0, (e) => `through ${seasonLabel(e.last)}`)
      + row("Team points, game", b.t_pts, n0, (e) => `${e.score} vs. ${esc(e.opp)}, ${seasonLabel(e.season)}`) + row("Wins, season", b.t_wins, n0, (e) => `${e.rec}, ${seasonLabel(e.season)}`) + row("Win streak", b.t_streak, n0, (e) => seasonLabel(e.season));
    return `<div class="card"><h3>Program records</h3>${rows ? `<table class="tape"><tbody>${rows}</tbody></table>` : `<p class="mute">Records start with the first game played.</p>`}</div>`;
  }
  function vRecords() {
    const scope = S.recConf ?? "all";
    const rows = L.teams.filter((t) => scope === "all" || String(t.cid) === scope).map((t) => Object.assign(progTotals(t), { name: t.region, conf: C(t.tid).abbrev, pr: t.prestige }));
    const seasons = L.history.length;
    const cols = [
      { k: "rank", h: "#", nos: 1, f: (r, i) => i + 1 },
      { k: "name", h: "School", l: 1, f: (r) => tlink(r.tid, { rank: false }) }, { k: "conf", h: "Conf", l: 1 },
      { k: "titles", h: "Titles" }, { k: "runner", h: "Runner-up" }, { k: "ff", h: "Final Weekends" }, { k: "e8", h: "Regional finals" }, { k: "s16", h: "Round of 16s" }, { k: "bids", h: "Tournament bids" },
      { k: "ct", h: "Conf tourney" }, { k: "reg", h: "Reg. season" },
      { k: "w", h: "W–L", v: (r) => r.w, f: (r) => `${r.w}–${r.l}` }, { k: "pct", h: "Win %", f: (r) => (r.w + r.l ? (r.pct * 100).toFixed(1) : "–") }, { k: "pr", h: "Prestige" },
      { k: "hist", h: "", nos: 1, f: (r) => `<a data-go="progh:${r.tid}">History</a>` },
    ];
    const def = { k: "titles", d: -1 };
    const sorted = (() => { const st = S.sort.records || def; const keys = [st.k, "titles", "ff", "e8", "s16", "bids", "pct"]; return rows.slice().sort((a, b) => { for (const k of keys) { const x = (a[k] ?? 0) - (b[k] ?? 0); if (x) return x * (k === st.k ? st.d : -1); } return a.name.localeCompare(b.name); }); })();
    const mode = S.recMode || "schools";
    const seg = `<span class="seg"><button class="${mode === "schools" ? "on" : ""}" data-act="recmode:schools">Schools</button><button class="${mode === "confs" ? "on" : ""}" data-act="recmode:confs">Conferences</button></span>`;
    if (mode === "confs") return confRecords(seg, seasons);
    const opts = seg + `<select id="recConf" class="btn" aria-label="Conference"><option value="all">All teams</option>${L.confs.map((c) => `<option value="${c.cid}" ${scope === String(c.cid) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`;
    return phead("Program records", seasons ? `Totals across the ${seasons} completed season${seasons === 1 ? "" : "s"} in this league · click a column to sort` : "Fills in as seasons are completed", opts) +
      (seasons ? table("records", cols, sorted, { def, presorted: true, rc: (r) => (r.tid === L.userTid ? "me" : "") }) : `<div class="card"><p class="mute">Finish your first season to start the record book.</p></div>`);
  }
  function awardCell(x, extra) { if (!x) return `<td class="l mute">–</td>`; const alive = L.players.some((p) => p.pid === x.pid); return `<td class="l">${alive ? `<a data-go="player:${x.pid}">${esc(x.name)}</a>` : esc(x.name)} <span class="mute">${esc(x.abbrev)} · ${x.pos} · ${E.YR[x.yr] || ""}</span><div class="small mute">${extra || `${x.ppg} ppg · ${x.rpg} rpg · ${x.apg} apg`}</div></td>`; }
  function vConfAwards() {
    const cid = S.cid ?? T(L.userTid).cid, c = L.confs[cid], A = L.awards || {};
    const seasons = Object.keys(A).map(Number).sort((x, y) => y - x);
    const aw = seasons.filter((s) => A[s].conf && A[s].conf[cid]).map((s) => `<tr><td class="l">${seasonLabel(s)}</td>${awardCell(A[s].conf[cid].poy)}${awardCell(A[s].conf[cid].foy)}</tr>`).join("");
    const ch = L.history.slice().reverse().map((h) => `<tr><td class="l">${seasonLabel(h.season)}</td><td class="l">${h.regChamps && h.regChamps[cid] != null ? tlink(h.regChamps[cid], { rank: false }) : "–"}</td><td class="l">${h.confChamps && h.confChamps[cid] != null ? tlink(h.confChamps[cid], { rank: false }) : "–"}</td></tr>`).join("");
    return phead(`${esc(c.abbrev)} awards & champions`, esc(c.name), confSel(cid)) + `
      <div class="card" style="margin-bottom:16px"><h3>Player and Freshman of the Year</h3>${aw ? `<div class="scroll"><table><thead><tr><th class="l">Season</th><th class="l">Player of the Year</th><th class="l">Freshman of the Year</th></tr></thead><tbody>${aw}</tbody></table></div>` : `<p class="mute">Announced when the regular season ends.</p>`}</div>
      <div class="card"><h3>Champions</h3>${ch ? `<div class="scroll"><table><thead><tr><th class="l">Season</th><th class="l">Regular season</th><th class="l">Tournament (auto bid)</th></tr></thead><tbody>${ch}</tbody></table></div>` : `<p class="mute">Filled in after each season.</p>`}</div>`;
  }
  function vNatAwards() {
    const A = L.awards || {}, seasons = Object.keys(A).map(Number).sort((x, y) => y - x);
    const nat = seasons.filter((s) => A[s].poy || A[s].mop).map((s) => `<tr><td class="l">${seasonLabel(s)}</td>${awardCell(A[s].poy)}${awardCell(A[s].foy)}${awardCell(A[s].mop, A[s].mop ? `${A[s].mop.tppg} ppg · ${A[s].mop.trpg} rpg in ${A[s].mop.tg} tournament games` : "")}</tr>`).join("");
    const champs = L.history.slice().reverse().map((h) => `<tr><td class="l">${seasonLabel(h.season)}</td><td class="l"><b>${tlink(h.champ, { rank: false })}</b></td><td class="l">${tlink(h.runner, { rank: false })}</td><td class="l">${h.ff.filter((t) => t !== h.champ && t !== h.runner).map((t) => tlink(t, { rank: false })).join(", ")}</td></tr>`).join("");
    return phead("National awards & champions", "National") + `
      <div class="card" style="margin-bottom:16px"><h3>National awards</h3>${nat ? `<div class="scroll"><table><thead><tr><th class="l">Season</th><th class="l">Player of the Year</th><th class="l">Freshman of the Year</th><th class="l">Tournament Most Outstanding Player</th></tr></thead><tbody>${nat}</tbody></table></div>` : `<p class="mute">Announced after the national championship game.</p>`}</div>
      <div class="card"><h3>National champions</h3>${champs ? `<div class="scroll"><table><thead><tr><th class="l">Season</th><th class="l">Champion</th><th class="l">Runner-up</th><th class="l">Final Weekend</th></tr></thead><tbody>${champs}</tbody></table></div>` : `<p class="mute">None yet.</p>`}</div>`;
  }

  // ---------- save / new ----------
  function vLeague() {
    return phead("Save &amp; league", esc(saveLine())) + `<div class="grid3">
      <div class="card"><h3>Saving</h3><p id="saveInfo">${esc(saveLine())}</p><p class="mute small">The game saves automatically after every sim. If a file download doesn't work where you're playing, Export gives you the same backup as text to copy.</p><div class="tools"><button class="btn play" data-act="savefile">Download save file</button><button class="btn" data-act="loadfile">Load save file</button><input type="file" id="saveFile" accept=".hlsave,.txt,text/plain" hidden></div><p class="mute small">Your browser can clear its storage, so download a backup now and then. Loading a file replaces your current league.</p><p class="mute small" id="fileMsg"></p><div class="tools"><button class="btn" data-act="export">Export save</button><button class="btn" data-act="import">Import save</button></div></div>
      <div class="card"><h3>New league</h3><p class="mute">Generate a new world and pick any school. This replaces your current save.</p><button class="btn" data-act="newleague">Start a new league</button></div>
      <div class="card"><h3>Team names</h3><p class="mute">Rename any school from its roster page, or edit all ${L.teams.length} at once: export the names as CSV, change them in a spreadsheet, and import them back.</p><div class="tools"><button class="btn" data-act="namesexp">Export names</button><button class="btn" data-act="namesimp">Import names</button>${S.pack ? `<button class="btn sm" data-act="namesclear">Stop using my names file for new leagues</button>` : ""}</div></div>
      <div class="card"><h3>About</h3><p class="mute small">Credits, licenses and a walkthrough of the game are on the <a data-go="about">About &amp; help</a> page.</p></div></div>`;
  }
  function vNew() {
    const W = WORLD; const cid = S.ngConf;
    const c = W.confs[cid];
    const tierName = ["", "Power conference", "High major", "Mid major", "Low major"][c.tier];
    const outlook = (p) => (p >= 85 ? "Blue blood. Title or bust." : p >= 70 ? "Contender. tournament bid expected." : p >= 55 ? "Bubble team. Push for a bid." : p >= 40 ? "Middle of the pack." : p >= 25 ? "Rebuild." : "Long rebuild.");
    const rows = c.tids.slice().sort((a, b) => W.teams[b].prestige - W.teams[a].prestige).map((tid) => { const t = W.teams[tid]; return `<tr><td class="l"><span class="swatch" style="background:${col(t.c1)}"></span><b>${esc(t.region)}</b> <span class="mute">${esc(t.name)}</span></td><td>${stars(Math.max(1, Math.min(5, Math.round(t.prestige / 20))))}</td><td>${t.prestige}</td><td class="l mute">${outlook(t.prestige)}</td><td><button class="btn sm" data-act="take:${tid}">Take job</button></td></tr>`; }).join("");
    return phead("Take a job", `${S.pack ? `${W.teams.length} schools in ${W.confs.length} conferences, from your names file.` : `A new world of ${W.teams.length} fictional schools in ${W.confs.length} conferences.`} Higher prestige means a better roster now and more recruiting points; lower prestige is a rebuild.`) + `
      <div class="tools"><label for="coachName">Your name</label><input type="text" id="coachName" value="${esc(S.coachName)}" placeholder="Coach name" maxlength="30"></div>
      <div class="tools"><select id="ngConf" class="btn" aria-label="Conference">${W.confs.map((x) => `<option value="${x.cid}" ${x.cid === cid ? "selected" : ""}>${esc(x.name)} (${x.tids.length})</option>`).join("")}</select><span class="mute small">${tierName}</span>
        <button class="btn sm" data-act="randjob:1">Random power job</button><button class="btn sm" data-act="randjob:3">Random mid-major</button><button class="btn sm" data-act="randjob:4">Random rebuild</button><button class="btn sm" data-act="reroll">New world</button><button class="btn sm" data-act="namesimp">Import team names</button>${S.pack ? `<button class="btn sm" data-act="namesclear">Use generated names</button>` : ""}</div>${S.pack ? `<p class="small mute">Built from your imported names file.</p>` : ""}
      <div class="scroll"><table><thead><tr><th class="l">School</th><th>Prestige</th><th></th><th class="l">Outlook</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ---------- render ----------
  function render() {
    if (L) refreshRanks();
    shell();
    document.body.classList.remove("navopen");
    let html;
    if (!L) html = WORLD ? vNew() : `<p class="mute">Building the world…</p>`;
    else switch (S.view) {
      case "roster": html = vRoster(L.userTid); break;
      case "team": html = vRoster(S.tid); break;
      case "player": html = vPlayer(S.pid); break;
      case "schedule": html = vSchedule(S.tid); break;
      case "box": html = vBox(S.gid); break;
      case "scores": html = vScores(); break;
      case "standings": html = vStandings(); break;
      case "ctour": html = vConfTour(); break;
      case "cleaders": html = vStats(String(S.cid ?? T(L.userTid).cid)); break;
      case "cawards": html = vConfAwards(); break;
      case "tstats": html = vStats("team"); break;
      case "nleaders": html = vStats("all"); break;
      case "nawards": html = vNatAwards(); break;
      case "thistory": html = vProgram(L.userTid); break;
      case "progh": html = vProgram(S.tid); break;
      case "records": html = vRecords(); break;
      case "hpi": html = vHPI(); break;
      case "summary": html = vSummary(); break;
      case "book": html = vBook(); break;
      case "rankings": html = vRankings(); break;
      case "recruiting": html = vRecruiting(); break;
      case "portal": html = vPortal(); break;
      case "about": html = vAbout(); break;
      case "tourney": html = vTourney(); break;
      case "league": html = vLeague(); break;
      default: html = vHome();
    }
    const same = S._lastView === S.view + ":" + (S.tid ?? "") + ":" + (S.pid ?? "") + ":" + (S.gid ?? "");
    const keepX = {}, keepY = same ? window.scrollY : 0;
    if (same) for (const el of $("main").querySelectorAll(".scroll[data-tk]")) keepX[el.dataset.tk] = el.scrollLeft;
    $("main").innerHTML = html;
    if (same) { for (const el of $("main").querySelectorAll(".scroll[data-tk]")) if (keepX[el.dataset.tk]) el.scrollLeft = keepX[el.dataset.tk]; window.scrollTo(0, keepY); }
    S._lastView = S.view + ":" + (S.tid ?? "") + ":" + (S.pid ?? "") + ":" + (S.gid ?? "");
    requestAnimationFrame(() => B.drawAll($("main")));
  }
  const histStack = [];
  function go(target, noPush) {
    const [v, id] = target.split(":");
    if (!noPush) histStack.push({ view: S.view, tid: S.tid, pid: S.pid, gid: S.gid });
    if (v === "team") { const tid = +id; if (tid === L.userTid) S.view = "roster"; else { S.view = "team"; S.tid = tid; } }
    else if (v === "player") { S.view = "player"; S.pid = +id; }
    else if (v === "box") { S.view = "box"; S.gid = +id; }
    else if (v === "schedule") { S.view = "schedule"; S.tid = id != null ? +id : null; }
    else if (v === "progh") { const tid = +id; if (tid === L.userTid) { S.view = "thistory"; } else { S.view = "progh"; S.tid = tid; } }
    else { S.view = v; S.tid = null; }
    render(); window.scrollTo(0, 0);
  }
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 2800); }
  function lastUserResult() { const g = L.games.filter((g) => g.played && (g.home === L.userTid || g.away === L.userTid)).sort((a, b) => a.day - b.day).pop(); if (!g) return ""; const h = g.home === L.userTid, us = h ? g.hs : g.as, th = h ? g.as : g.hs; return `${us > th ? "Won" : "Lost"} ${us}–${th} ${h || g.neutral ? "vs" : "at"} ${T(h ? g.away : g.home).region}`; }

  // run a sim step without freezing the page
  let busy = false;
  async function sim(stepFn, doneMsg, pass, recap) {
    if (busy) return; busy = true;
    let lastPhase = L.phase, event = null; pass = pass || [];
    const before = snapState();
    const ov = $("simov"); ov.classList.add("open"); let stop = false; $("simStop").onclick = () => (stop = true);
    const t0 = performance.now();
    try {
      let more = true, guard = 0;
      while (more && !stop && guard++ < 200) { more = stepFn();
        if (L.phase !== lastPhase) { lastPhase = L.phase; event = L.phase; if (!pass.includes(L.phase)) more = false; } $("simTxt").textContent = L.phase === "offseason" ? "Wrapping up the season…" : `Simulating · ${phaseLabel()}`; await new Promise((r) => setTimeout(r, 0)); }
    } catch (e) { console.error(e); toast("Something went wrong in the sim."); }
    ov.classList.remove("open"); busy = false;
    if (performance.now() - t0 < 0) return;
    S.sday = null; render(); persist();
    if (event && event === L.phase) { showEvent(event); return; }
    const m = typeof doneMsg === "function" ? doneMsg() : doneMsg; if (m) toast(m);
    if (L.phase === "offseason" && L._justEnded) { L._justEnded = false; }
  }
  function act(a) {
    const i = a.indexOf(":"), k = i < 0 ? a : a.slice(0, i), v = i < 0 ? "" : a.slice(i + 1);
    closeMenu();
    if (["next", "toncaa", "toend", "newseason", "one", "day", "week", "toct"].includes(k) && $("modal").classList.contains("open") && $("modalBody").querySelector(".evhead")) closeModal();
    if (k === "next") { let done = false; sim(() => { if (done) return false; const startPhase = L.phase; const r = E.playDay(L); if (r.userPlayed || L.phase === "offseason" || (!E.userAlive(L) && L.phase !== "regular")) { done = true; return false; } return true; }, lastUserResult); }
    else if (k === "day") sim(() => { E.playDay(L); return false; }, () => (L.phase === "offseason" ? `${T(L.history[L.history.length - 1].champ).region} are national champions` : "Round complete"));
    else if (k === "one") { const snap = snapState(), g = E.playOneGame(L); S.sday = null; render(); persist(); if (L.phase !== snap.phase) showEvent(L.phase); else if (g) toast(gameLine(g)); }
    else if (k === "bracket") { closeModal(); go(L.phase === "conftour" ? "ctour" : "tourney"); }
    else if (k === "evgo") { closeModal(); go(v); }
    else if (k === "week") { const end = E.dayOffset(L.day) + 7; sim(() => { E.playDay(L); return L.phase !== "offseason" && E.dayOffset(L.day) < end; }, lastUserResult); }
    else if (k === "toct") sim(() => { E.playDay(L); return L.phase === "regular"; }, "Regular season complete");
    else if (k === "toncaa") sim(() => { E.playDay(L); return L.phase === "regular" || L.phase === "conftour"; }, "", ["conftour"], false);
    else if (k === "toend") sim(() => { E.playDay(L); return L.phase !== "offseason"; }, "", ["conftour", "ncaa"], false);
    else if (k === "newseason") { E.startNextSeason(L); S.view = "home"; projCache = null; render(); persist(); showRecap(); }
    else if (k === "rmode") { S.rmode = v; render(); }
    else if (k === "go") { go(v); }
    else if (k === "ctgo") { S.cid = +v; go("ctour"); }
    else if (k === "tour") { if (v === "end") { L.tourDone = true; closeModal(); persist(); } else tour(+v); }
    else if (k === "savefile") saveFile();
    else if (k === "loadfile") $("saveFile")?.click();
    else if (k === "pkeep") { if (E.portalKeep(L, v === "none" ? null : +v)) { render(); persist(); toast(v === "none" ? "He's back in the portal" : "He's staying"); } }
    else if (k === "pclear") { L.portal.offers = {}; render(); persist(); }
    else if (k === "pos") { S.pf = v; render(); }
    else if (k === "rs") { const [pid, on] = v.split(":"); if (E.setRedshirt(L, +pid, on === "1")) { render(); persist(); toast(on === "1" ? "Redshirted: he'll sit this season and keep a year of eligibility" : "Redshirt removed"); } else toast("He can't be redshirted now (more than 4 games played, or he already used one)."); }
    else if (k === "sumseason") { S.sumSeason = +v; render(); }
    else if (k === "summine") { S.sumMine = v === "1"; render(); }
    else if (k === "booktab") { S.bookTab = v; render(); }
    else if (k === "hpitab") { S.hpiTab = v; render(); }
    else if (k === "recmode") { S.recMode = v; render(); }
    else if (k === "recconf") { S.recMode = "schools"; S.recConf = v; render(); window.scrollTo(0, 0); }
    else if (k === "sday") { S.sday = +v; render(); }
    else if (k === "editteam") { const t = T(+v); modal(`<h2>Edit team</h2><form id="teamForm" data-tid="${t.tid}" class="form"><label>School<input type="text" id="ef_region" value="${esc(t.region)}" maxlength="40"></label><label>Mascot<input type="text" id="ef_name" value="${esc(t.name)}" maxlength="30"></label><label>Abbreviation<input type="text" id="ef_ab" value="${esc(t.abbrev)}" maxlength="6"></label><label>Color<input type="color" id="ef_c1" value="${col(t.c1)}"></label><p id="efErr" class="L"></p><div class="tools"><button class="btn play" type="submit">Save</button><button class="btn" type="button" data-act="close">Cancel</button></div></form>`); }
    else if (k === "namesexp") modal(`<h2>Team names</h2><p class="mute">All ${L.teams.length} schools as CSV: conference, conference abbreviation, school, mascot, abbreviation, color, prestige. Copy it into a spreadsheet, edit, and paste it back with Import. Keep the rows in the same order.</p><textarea id="expTxt" readonly>${esc(E.exportNames(L))}</textarea><div class="tools" style="margin-top:10px"><button class="btn play" data-act="copy">Copy</button><button class="btn" data-act="close">Close</button></div>`);
    else if (k === "namesimp") modal(`<h2>Import team names</h2><p class="mute">Choose a names file (CSV) or paste one: conference, conference abbreviation, school, mascot, abbreviation, color, prestige.${L ? " To rename the schools in this league, keep the same rows and conferences as the export. A file with different conferences can start a new league." : " The file decides the conferences and who is in them."}</p><div class="tools"><label class="btn" for="namesFile" style="display:inline-flex;align-items:center">Choose file…</label><input type="file" id="namesFile" accept=".csv,text/csv,text/plain" hidden><span id="namesFileName" class="mute small"></span></div><textarea id="impNames" placeholder="…or paste the CSV here"></textarea><label class="check"><input type="checkbox" id="namesKeep" checked> Use these names for new leagues</label><p id="impErr" class="L"></p><div class="tools"><button class="btn play" data-act="doimpnames">${L ? "Apply names" : "Build league with these names"}</button><button class="btn" data-act="close">Cancel</button></div>`);
    else if (k === "doimpnames") {
      const txt = $("impNames").value.trim(), keep = $("namesKeep").checked, err = (list) => ($("impErr").innerHTML = list.map(esc).join("<br>"));
      if (!txt) return err(["Choose a file or paste the CSV first."]);
      const pk = E.validatePack(txt);
      if (!L) { if (!pk.ok) return err(pk.errors); WORLD = E.newWorld(txt); S.ngConf = 0; if (keep) { idbSet("names", txt); S.pack = txt; } closeModal(); render(); toast(`New world: ${pk.count} schools in ${pk.confs} conferences`); return; }
      const r = E.importNames(L, txt, false);
      if (r.ok) { E.importNames(L, txt, true); persist(); if (keep) { idbSet("names", txt); S.pack = txt; } closeModal(); render(); toast(`Renamed ${r.count} schools`); return; }
      if (pk.ok && !E.sameStructure(L, txt)) { idbSet("names", txt); S.pack = txt; err([`This file has ${pk.count} schools in ${pk.confs} conferences that don't line up with your current league, so it can't rename it in place. It's saved: start a new league (Save → Start a new league) and it will be built from this file.`]); render(); return; }
      err(r.errors);
    }
    else if (k === "namesclear") { idbSet("names", ""); S.pack = ""; if (!L) WORLD = E.newWorld(); render(); toast("Back to generated names for new leagues"); }
    else if (k === "smode") { S.st.mode = v; render(); }
    else if (k === "br") { S.br = v; render(); }
    else if (k === "up" || k === "down") moveDepth(+v, k === "up" ? -1 : 1);
    else if (k === "autosort") { E.autoDepth(L, L.userTid); delete S.sort.rosterR; delete S.sort.rosterS; render(); persist(); }
    else if (k === "unsort") { delete S.sort.rosterR; delete S.sort.rosterS; render(); }
    else if (k === "addrec") {
      const left = T(L.userTid).rb - Object.values(L.plan).reduce((a, b) => a + b, 0);
      L.plan[+v] = Math.max(0, Math.min(25, left));
      render(); persist();
      if (left <= 0) toast("No points left this week. He's on your board at 0; move points from another prospect.");
    }
    else if (k === "recmore") { S.rf.n += 60; render(); }
    else if (k === "unrec") { delete L.plan[+v]; render(); persist(); }
    else if (k === "take") { const name = ($("coachName")?.value || "").trim() || "Coach"; L = E.claimSchool(WORLD, +v, name); WORLD = null; S.view = "home"; S.cid = null; render(); persist(); toast(`Welcome to ${T(+v).region}, Coach ${name}`); if (!L.tourDone) tour(0); }
    else if (k === "randjob") { const tier = +v; const opts = WORLD.teams.filter((t) => WORLD.confs[t.cid].tier === tier || (tier === 3 && WORLD.confs[t.cid].tier === 2)); const t = opts[Math.floor(Math.random() * opts.length)]; S.ngConf = t.cid; S.coachName = $("coachName")?.value || S.coachName; render(); const b = document.querySelector(`[data-act="take:${t.tid}"]`); if (b) { b.closest("tr").classList.add("me"); b.focus(); } }
    else if (k === "reroll") { S.coachName = $("coachName")?.value || S.coachName; WORLD = E.newWorld(S.pack || undefined); render(); }
    else if (k === "newleague") modal(`<h2>Start a new league?</h2><p>Your current save will be replaced. Export it first if you want to keep it.</p><div class="tools"><button class="btn play" data-act="confirmnew">Start over</button><button class="btn" data-act="close">Cancel</button></div>`);
    else if (k === "confirmnew") { closeModal(); S.coachName = L.coach.name; L = null; WORLD = E.newWorld(S.pack || undefined); render(); }
    else if (k === "export") { modal(`<h2>Export save</h2><p class="mute">Preparing…</p>`); encodeSave().then((s) => modal(`<h2>Export save</h2><p class="mute">Copy this text and keep it somewhere safe (${Math.round(s.length / 1024)} KB). Paste it into Import to restore.</p><textarea id="expTxt" readonly>${esc(s)}</textarea><div class="tools" style="margin-top:10px"><button class="btn play" data-act="copy">Copy</button><button class="btn" data-act="close">Close</button></div>`)); }
    else if (k === "copy") { const tx = $("expTxt"); try { navigator.clipboard.writeText(tx.value).then(() => toast("Copied"), () => { tx.select(); toast("Select all and copy"); }); } catch (e) { tx.select(); toast("Select all and copy"); } }
    else if (k === "import") modal(`<h2>Import save</h2><p class="mute">Paste an exported save. It replaces the current league.</p><textarea id="impTxt"></textarea><p id="impErr" class="L"></p><div class="tools"><button class="btn play" data-act="doimport">Load save</button><button class="btn" data-act="close">Cancel</button></div>`);
    else if (k === "doimport") { decodeSave($("impTxt").value.trim()).then((d) => { if (!valid(d)) throw new Error(); L = d; WORLD = null; closeModal(); S.view = "home"; render(); persist(); toast("Save loaded"); }).catch(() => { $("impErr").textContent = "That doesn't look like a Full Court Dynasty save."; }); }
    else if (k === "back") { const h = histStack.pop(); if (h) { Object.assign(S, h); render(); } else go("home", true); }
    else if (k === "close") closeModal();
  }
  // ---------- postseason round recaps ----------
  function snapState() { return { phase: L.phase, day: L.day, stage: L.ncaa ? L.ncaa.stage : -1, gid: L.nextGid }; }
  function roundFinished(b) {
    if (b.phase !== L.phase) return false;
    if (L.phase === "conftour") return L.day !== b.day;
    if (L.phase === "ncaa") return L.ncaa.stage !== b.stage;
    return false;
  }
  function showRecap2(b, lastGame) {
    const u = L.userTid, t = T(u);
    const gs = L.games.filter((g) => g.played && g.day >= b.day && g.day < L.day && (g.type === "ct" || g.type === "ncaa") && g.gid >= 0);
    const mine = gs.filter((g) => g.home === u || g.away === u).pop();
    const seed = (g, tid) => (g.type === "ncaa" ? L.ncaa.seedOf[tid] : L.ct[T(tid).cid].seeds.indexOf(tid) + 1);
    const line = (g) => { const w = g.hs > g.as ? g.home : g.away, l = w === g.home ? g.away : g.home; return `<tr class="${w === u || l === u ? "me" : ""}"><td class="l"><span class="mute small">${seed(g, w)}</span> <b>${esc(T(w).region)}</b></td><td>${Math.max(g.hs, g.as)}–${Math.min(g.hs, g.as)}${g.ot ? " OT" : ""}</td><td class="l"><span class="mute small">${seed(g, l)}</span> ${esc(T(l).region)}</td><td>${g.gid in L.boxes ? `<a data-go="box:${g.gid}">Box</a>` : ""}</td></tr>`; };
    let mineHtml = "";
    if (mine) {
      const home = mine.home === u, us = home ? mine.hs : mine.as, them = home ? mine.as : mine.hs, opp = home ? mine.away : mine.home, won = us > them;
      mineHtml = `<p class="evbig"><b class="${won ? "W" : "L"}">${won ? "Won" : "Lost"}</b> ${us}–${them} vs. ${esc(T(opp).region)}${mine.ot ? " (OT)" : ""} · <a data-go="box:${mine.gid}">Box score</a></p>`;
    }
    let nextHtml = "";
    if (E.userAlive(L)) {
      E.gamesLeftToday(L);
      const ng = L.games.find((g) => !g.played && (g.home === u || g.away === u));
      if (ng) { const opp = ng.home === u ? ng.away : ng.home; nextHtml = `<p>Next: <b>${esc(ng.round || "")}</b> vs. <b>${seed(ng, opp) ? "No. " + seed(ng, opp) + " " : ""}${esc(T(opp).region)}</b> (${recStr(opp)}).</p>`; }
      else nextHtml = `<p class="mute">You're still alive. Your next opponent is decided by games still to play.</p>`;
    } else if (L.phase === "ncaa" && L.ncaa.seedOf[u] != null && !mine) nextHtml = "";
    let body, title, tag;
    if (L.phase === "ncaa" || b.phase === "ncaa") {
      const rnd = E.NCAA_ROUNDS[b.stage] || "Round";
      tag = "National Tournament"; title = `${rnd} complete`;
      const ups = gs.filter((g) => { const w = g.hs > g.as ? g.home : g.away, l = w === g.home ? g.away : g.home; return L.ncaa.seedOf[w] - L.ncaa.seedOf[l] >= 4; });
      const alive = E.stageMatches(L.ncaa, L.ncaa.stage).flatMap((m) => [m.a, m.b]).filter((x) => x != null);
      body = `${ups.length ? `<h3>Upsets</h3><div class="scroll"><table><tbody>${ups.map(line).join("")}</tbody></table></div>` : `<p class="mute">No big upsets this round.</p>`}
        ${alive.length && alive.length <= 16 ? `<h3>Still alive</h3><p class="small">${alive.map((x) => `<span class="pill${x === u ? " aw" : ""}">${L.ncaa.seedOf[x]} ${esc(T(x).region)}</span>`).join(" ")}</p>` : ""}`;
    } else {
      tag = "Conference tournaments"; title = `${fmtDay(b.day)} results`;
      const myConf = gs.filter((g) => T(g.home).cid === t.cid);
      const champs = Object.entries(L.ct).filter(([cid, br]) => br.champ != null && gs.some((g) => T(g.home).cid === +cid && g.round === "Championship")).map(([cid, br]) => ({ cid: +cid, tid: br.champ }));
      const left = Object.values(L.ct).filter((br) => br.champ == null).length;
      body = `${myConf.length ? `<h3>${esc(C(u).abbrev)} tournament</h3><div class="scroll"><table><tbody>${myConf.map(line).join("")}</tbody></table></div>` : ""}
        ${champs.length ? `<h3>Champions crowned (automatic bids)</h3><p class="small">${champs.map((c) => `<span class="pill${c.tid === u ? " aw" : ""}">${esc(L.confs[c.cid].abbrev)}: ${esc(T(c.tid).region)}</span>`).join(" ")}</p>` : ""}
        <p class="mute small">${left ? `${left} conference tournament${left === 1 ? "" : "s"} still going.` : "Every conference has its champion."}</p>`;
    }
    const alive = E.userAlive(L);
    modal(`<div class="evhead"><span class="evtag">${tag}</span><h2>${title}</h2></div>${mineHtml}${nextHtml}${body}
      <div class="tools" style="margin-top:16px">${alive ? `<button class="btn play" data-act="next">Play your next game</button>` : `<button class="btn play" data-act="day">${L.phase === "ncaa" ? "Play the " + esc(E.NCAA_ROUNDS[L.ncaa.stage]) : "Play the next day"}</button>`}<button class="btn" data-act="bracket">View the bracket</button><button class="btn" data-act="close">Close</button></div>`);
  }
  // pop-up screens when the conference tournaments start, on Selection Day, and when the season ends
  function showEvent(ph) {
    const u = L.userTid;
    if (ph === "conftour") {
      const br = L.ct[T(u).cid], seed = br.seeds.indexOf(u) + 1;
      S.cid = null; go("ctour");
      toast(seed ? `Conference tournament time: you're the No. ${seed} seed` : "Conference tournaments have started. You didn't qualify.");
    } else if (ph === "ncaa") {
      const s = L.ncaa.seedOf[u], cid = T(u).cid, ch = L.ct && L.ct[cid] ? L.ct[cid].champ : null; S.br = null; go("tourney");
      const won = ch == null ? "" : ch === u ? `You won the ${L.confs[cid].abbrev} tournament! ` : `${T(ch).region} won the ${L.confs[cid].abbrev} tournament. `;
      toast(won + (s ? `You're a No. ${s} seed in the ${E.REGIONS[regionOf(L.ncaa, u)]}` : "You're not in the National Tournament field"));
    } else if (ph === "offseason") {
      const h = L.history[L.history.length - 1]; S.sumSeason = null; go("summary");
      toast(`${T(h.champ).region} are national champions`);
    }
  }
  function showEventPopup(ph) {
    const u = L.userTid, t = T(u);
    if (ph === "conftour") {
      const br = L.ct[t.cid], seed = br.seeds.indexOf(u) + 1, r0 = br.rounds[0], m = r0.find((x) => x.a === u || x.b === u);
      let line;
      if (!seed) line = `<p>${esc(t.region)} finished ${ordinal(E.confStandings(L, t.cid).find((x) => x.tid === u).seed)} and <b>didn't qualify</b> for the ${esc(C(u).abbrev)} tournament.</p>`;
      else if (m && m.bye) line = `<p>${esc(t.region)} is the <b>No. ${seed} seed</b> and has a <b>first-round bye</b>. You'll play the winner of the game below it in the bracket.</p>`;
      else { const opp = m.a === u ? m.b : m.a; line = `<p>${esc(t.region)} is the <b>No. ${seed} seed</b> and opens against <b>No. ${br.seeds.indexOf(opp) + 1} ${esc(T(opp).region)}</b> (${recStr(opp)}).</p>`; }
      const top = br.seeds.slice(0, 4).map((tid, i) => `<tr class="${tid === u ? "me" : ""}"><td>${i + 1}</td><td class="l">${esc(T(tid).region)}</td><td>${L.rec[tid].cw}–${L.rec[tid].cl}</td><td>${recStr(tid)}</td></tr>`).join("");
      modal(`<div class="evhead"><span class="evtag">Conference tournaments</span><h2>Win and you're in</h2></div>${line}<p class="mute">All 32 conference tournaments start now. Each champion gets an automatic bid to the National Tournament.</p><div class="scroll"><table><thead><tr><th>Seed</th><th class="l">${esc(C(u).abbrev)} top seeds</th><th>Conf</th><th>Overall</th></tr></thead><tbody>${top}</tbody></table></div>
        <div class="tools" style="margin-top:16px">${seed && !(m && m.bye) ? `<button class="btn play" data-act="next">Play your first game</button>` : ""}<button class="btn ${seed && !(m && m.bye) ? "" : "play"}" data-act="evgo:ctour">View the bracket</button><button class="btn" data-act="toncaa">Sim to Selection Day</button><button class="btn" data-act="close">Close</button></div>`);
    } else if (ph === "ncaa") {
      const N = L.ncaa, s = N.seedOf[u], ri = s ? E.REGIONS[regionOfN(N, u)] : null;
      let line, first = "";
      if (s) {
        const orm = N.or.find((m) => m.a === u || m.b === u);
        if (orm) { const opp = orm.a === u ? orm.b : orm.a; first = `First up: an <b>Opening Round</b> game against <b>${esc(T(opp).region)}</b> (${recStr(opp)}), with the winner moving on as the ${s} seed.`; }
        else { const r0 = N.regions[regionOfN(N, u)].rounds[0], m = r0.find((x) => x.a === u || x.b === u); const oppSeed = m.a === u ? m.sb : m.sa, opp = m.a === u ? m.b : m.a, ori = m.a === u ? m.orb : m.ora; first = opp != null ? `First up: <b>No. ${oppSeed} ${esc(T(opp).region)}</b> (${recStr(opp)}).` : `First up: the winner of the Opening Round game between <b>${esc(T(N.or[ori].a).region)}</b> and <b>${esc(T(N.or[ori].b).region)}</b>.`; }
        line = `<p class="evbig">${esc(t.region)} is a <b>No. ${s} seed</b> in the ${ri} region.</p><p>${first}</p>`;
      } else {
        const pw = E.power(L), fs = new Set(N.field), out = L.teams.map((x) => x.tid).filter((x) => !fs.has(x)).sort((a, b) => pw[b] - pw[a]).slice(0, 4);
        line = `<p class="evbig">${esc(t.region)} is <b>not in the field</b>.</p><p class="mute">${out.includes(u) ? "You were one of the first four teams left out." : "First four out: " + out.map((x) => esc(T(x).region)).join(", ") + "."}</p>`;
      }
      const ones = N.regions.map((r, i) => { const s1 = r.rounds[0][0]; const tid = s1.a; return `<tr><td class="l">${E.REGIONS[i]}</td><td class="l">${esc(T(tid).region)}</td><td>${recStr(tid)}</td><td class="mute">${esc(C(tid).abbrev)}</td></tr>`; }).join("");
      const bids = N.field.filter((x) => T(x).cid === t.cid).length;
      modal(`<div class="evhead"><span class="evtag">Selection Day</span><h2>The field of 76 is set</h2></div>${line}<p class="mute">${esc(C(u).abbrev)}: ${bids} bid${bids === 1 ? "" : "s"}. ${esc(T(N.field[0]).region)} is the No. 1 overall seed.</p><div class="scroll"><table><thead><tr><th class="l">Region</th><th class="l">No. 1 seed</th><th>Record</th><th></th></tr></thead><tbody>${ones}</tbody></table></div>
        <div class="tools" style="margin-top:16px">${s ? `<button class="btn play" data-act="next">Play your first game</button>` : ""}<button class="btn ${s ? "" : "play"}" data-act="evgo:tourney">View the bracket</button><button class="btn" data-act="toend">Sim to the title</button><button class="btn" data-act="close">Close</button></div>`);
    } else if (ph === "offseason") {
      const h = L.history[L.history.length - 1], N = L.ncaa, f = N.final, A = (L.awards || {})[L.season] || {};
      const ws = Math.max(...f.sc), ls = Math.min(...f.sc), uh = h.user;
      const nm = (x) => (x ? `${esc(x.name)} <span class="mute">${esc(x.abbrev)}</span>` : "–");
      modal(`<div class="evhead"><span class="evtag">National championship</span><h2>${esc(T(h.champ).region)} wins it all</h2></div>
        <p class="evbig">No. ${N.seedOf[h.champ]} ${esc(T(h.champ).region)} ${ws}, No. ${N.seedOf[h.runner]} ${esc(T(h.runner).region)} ${ls}</p>
        <table class="tape"><tbody><tr><td class="l mute">Your season</td><td class="l">${uh.w}–${uh.l} · ${ordinal(uh.seed)} in the ${esc(C(u).abbrev)} · ${uh.ncaa >= 0 ? `${uh.nseed} seed, ${ncaaResult(uh.ncaa)}` : "no tournament bid"}</td></tr><tr><td class="l mute">Player of the Year</td><td class="l">${nm(A.poy)}</td></tr><tr><td class="l mute">Freshman of the Year</td><td class="l">${nm(A.foy)}</td></tr><tr><td class="l mute">Most Outstanding Player</td><td class="l">${nm(A.mop)}</td></tr></tbody></table>
        <div class="tools" style="margin-top:16px"><button class="btn play" data-act="newseason">Start ${seasonLabel(L.season + 1)} season</button><button class="btn" data-act="evgo:tourney">Final bracket</button><button class="btn" data-act="close">Close</button></div>`);
    }
  }
  function regionOfN(N, tid) { return regionOf(N, tid); }
  function gameLine(g) {
    const w = g.hs > g.as ? g.home : g.away, l = w === g.home ? g.away : g.home, ws = Math.max(g.hs, g.as), ls = Math.min(g.hs, g.as);
    const sd = (t) => (g.type === "ncaa" ? `(${L.ncaa.seedOf[t]}) ` : g.type === "ct" ? `(${L.ct[T(t).cid].seeds.indexOf(t) + 1}) ` : "");
    return `${g.round ? g.round + ": " : ""}${sd(w)}${T(w).region} ${ws}, ${sd(l)}${T(l).region} ${ls}${g.ot ? " (OT)" : ""}`;
  }
  // controls shown on the bracket pages and dashboard during the postseason
  function postCtl() {
    if (L.phase !== "conftour" && L.phase !== "ncaa") return "";
    const alive = E.userAlive(L), left = E.gamesLeftToday(L);
    const last = L.games.filter((g) => g.played && (g.type === "ct" || g.type === "ncaa")).sort((x, y) => y.gid - x.gid)[0];
    return `<div class="tools postctl">${alive ? `<button class="btn play" data-act="next">Your next game</button>` : ""}<button class="btn ${alive ? "" : "play"}" data-act="day">${L.phase === "ncaa" ? (alive ? "Sim the " : "Play the ") + esc(E.NCAA_ROUNDS[L.ncaa.stage]) : alive ? "Sim today" : "Next game day"}</button><button class="btn" data-act="${L.phase === "conftour" ? "toncaa" : "toend"}">${L.phase === "conftour" ? "To Selection Day" : "To the title game"}</button><button class="btn sm" data-act="one">One game at a time</button><span class="mute small">${left} game${left === 1 ? "" : "s"} left ${L.phase === "ncaa" ? "this round" : "today"}${last ? ` · Last: ${last.gid in L.boxes ? `<a data-go="box:${last.gid}">${esc(gameLine(last))}</a>` : esc(gameLine(last))}` : ""}</span></div>`;
  }
  function moveDepth(pid, dir) { const ps = E.roster(L, L.userTid), i = ps.findIndex((p) => p.pid === pid), j = i + dir; if (i < 0 || j < 0 || j >= ps.length) return; [ps[i].depth, ps[j].depth] = [ps[j].depth, ps[i].depth]; render(); persist(); }
  function showRecap() {
    const r = L.lastRecap; if (!r) return;
    const pn = (p) => esc(p.first + " " + p.last);
    const fr = r.recruits.map((id) => L.players.find((p) => p.pid === id)).filter(Boolean).sort((a, b) => b.ovr - a.ovr);
    modal(`<h2>Welcome to ${seasonLabel(L.season)}</h2><h3>Departures</h3><p>${r.grads.length ? "Graduated: " + r.grads.map(pn).join(", ") + "." : "No seniors graduated."} ${r.early.length ? "Left early for the pros: " + r.early.map(pn).join(", ") + "." : ""}</p>
      <h3>Biggest jumps</h3><div class="scroll"><table><tbody>${r.improved.slice(0, 5).map((x) => `<tr><td class="l">${esc(x.name)}</td><td class="${x.d >= 0 ? "W" : "L"}">${x.d >= 0 ? "+" : ""}${x.d}</td><td>now ${x.ovr}</td></tr>`).join("")}</tbody></table></div>
      <h3 style="margin-top:12px">Freshman class</h3><div class="scroll"><table><tbody>${fr.map((p) => `<tr><td class="l">${pn(p)}</td><td>${p.stars ? stars(p.stars) : ""}</td><td>${p.pos}</td><td>${hgt(p.hgt)}</td><td>Ovr ${p.ovr}</td><td>Pot ${p.pot}</td></tr>`).join("") || `<tr><td class="l mute">No signees.</td></tr>`}</tbody></table></div>
      ${(r.redshirts || []).length ? `<p class="small">Redshirt year used: ${r.redshirts.map((x) => esc(x.name) + (x.medical ? " (medical)" : "")).join(", ")}. They keep their class.</p>` : ""}
      ${(r.transfers || []).length ? `<p class="small">Transfers in to replace early departures: ${r.transfers.map((id) => { const p = L.players.find((q) => q.pid === id); return p ? esc(p.first + " " + p.last) + ` <span class="mute">${p.pos}, ovr ${p.ovr}</span>` : ""; }).join(", ")}.</p>` : ""}
      ${(r.portalIn || []).length ? `<p class="small">From the transfer portal: ${r.portalIn.map((id) => { const p = L.players.find((q) => q.pid === id); return p ? esc(p.first + " " + p.last) + ` <span class="mute">${p.pos}, ovr ${p.ovr}, from ${esc(T(p.from).region)}</span>` : ""; }).join(", ")}.</p>` : ""}
      ${(r.portalOut || []).length ? `<p class="small">Transferred out: ${r.portalOut.map((m) => esc(m.name) + ` <span class="mute">to ${esc(T(m.to).region)}</span>`).join(", ")}.</p>` : ""}
      ${r.walkons ? `<p class="small mute">${r.walkons} walk-on${r.walkons > 1 ? "s" : ""} filled the open roster spots.</p>` : ""}<p class="mute small">A new recruiting class is on the board, and your points reset for the year. Your rotation was re-sorted by overall.</p>
      <div class="tools"><button class="btn play" data-act="close">Let's go</button></div>`);
  }
  function valid(d) { return d && d.v === 2 && Array.isArray(d.teams) && Array.isArray(d.players) && Array.isArray(d.games) && typeof d.userTid === "number" && d.teams[d.userTid]; }
  function modal(html) { $("modalBody").innerHTML = html; $("modal").classList.add("open"); }
  function closeModal() { $("modal").classList.remove("open"); }
  function closeMenu() { const m = $("playMenu"); if (m) { m.classList.remove("open"); $("playBtn")?.setAttribute("aria-expanded", "false"); } }

  document.addEventListener("click", (e) => {
    if (busy) return;
    const pb = e.target.closest("#playBtn");
    if (pb) { const o = $("playMenu").classList.toggle("open"); pb.setAttribute("aria-expanded", String(o)); return; }
    if (!e.target.closest("#playMenu")) closeMenu();
    const a = e.target.closest("[data-act]"); if (a) { act(a.dataset.act); return; }
    if (e.target.closest("#navBtn")) { document.body.classList.toggle("navopen"); return; }
    if (e.target.id === "scrim") { document.body.classList.remove("navopen"); return; }
    const g = e.target.closest("[data-go]"); if (g) { e.preventDefault(); closeModal(); if (g.classList.contains("nav")) S.cid = null; go(g.dataset.go); return; }
    const th = e.target.closest("th[data-sort]"); if (th) sortBy(th);
    if (e.target === $("modal")) closeModal();
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "teamForm") return; e.preventDefault();
    const err = E.editTeam(L, +e.target.dataset.tid, { region: $("ef_region").value, name: $("ef_name").value, abbrev: $("ef_ab").value, c1: $("ef_c1").value });
    if (err.length) { $("efErr").textContent = err.join(" "); return; }
    closeModal(); render(); persist(); toast("Team updated");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeMenu(); closeModal(); document.body.classList.remove("navopen"); }
    if (e.key === "Enter" && e.target.classList && e.target.classList.contains("me-card")) { go("home"); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("th[data-sort]")) { e.preventDefault(); sortBy(e.target); }
  });
  let qTimer = 0;
  document.addEventListener("input", (e) => { if (e.target.id === "rq") { S.rf.q = e.target.value; clearTimeout(qTimer); qTimer = setTimeout(() => { render(); const el = $("rq"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250); } });
  document.addEventListener("change", (e) => {
    const id = e.target.id;
    if (id === "saveFile" && e.target.files && e.target.files[0]) {
      const f = e.target.files[0]; const msg = $("fileMsg");
      f.text().then((s) => decodeSave(s.trim())).then((d) => { if (!valid(d)) throw new Error(); if (E.ensureGeo) E.ensureGeo(d); if (E.renameTerms) E.renameTerms(d); L = d; WORLD = null; S.view = "home"; render(); persist(); toast("Save loaded"); })
        .catch(() => { if (msg) { msg.textContent = "That file isn't a Full Court Dynasty save."; msg.className = "L small"; } });
      e.target.value = ""; return;
    }
    if (id === "namesFile" && e.target.files && e.target.files[0]) { const f = e.target.files[0]; if (f.size > 2e6) { $("impErr").textContent = "That file is too big for a names file."; return; } f.text().then((t) => { $("impNames").value = t; $("namesFileName").textContent = f.name; }); return; }
    if (id === "teamSel") go("team:" + e.target.value);
    else if (id === "confSel") { S.cid = +e.target.value; render(); }
    else if (id === "histSel") { go("progh:" + e.target.value); }
    else if (id === "recConf") { S.recConf = e.target.value; render(); }
    else if (id === "hpiConf") { S.hpiConf = e.target.value; render(); }
    else if (id === "sumSel") { S.sumSeason = +e.target.value; render(); }
    else if (id === "sdaySel") { S.sday = +e.target.value; render(); }
    else if (id === "sfilSel") { S.sfil = e.target.value; render(); }
    else if (id === "awConf") { S.awc = e.target.value; render(); }
    else if (id === "rkConf") { S.rk.cid = e.target.value; render(); }
    else if (id === "stScope") { S.st.scope = e.target.value; render(); }
    else if (id === "rstars") { S.rf.stars = e.target.value; S.rf.n = 60; render(); }
    else if (id === "rpos") { S.rf.pos = e.target.value; render(); }
    else if (id === "rstatus") { S.rf.status = e.target.value; render(); }
    else if (id === "rdist") { S.rf.dist = e.target.value; S.rf.n = 60; render(); }
    else if (id === "autoRec") { L.autoRec = e.target.checked; render(); persist(); }
    else if (id === "ngConf") { S.ngConf = +e.target.value; S.coachName = $("coachName")?.value || S.coachName; render(); }
    else if (e.target.classList.contains("pts")) { setPts(e.target); }
    else if (e.target.classList.contains("pof")) { const pid = +e.target.dataset.pid, got = E.portalOffer(L, pid, +e.target.value); e.target.value = got || ""; const P = L.portal, used = Object.values(P.offers).reduce((x, y) => x + y, 0); const asked = Math.round(+e.target.value || 0); persist(); if (got < asked) toast("Not enough portal points left");
      const lf = $("pLeft"); if (lf) lf.textContent = P.budget - used; const ch = $("pch" + pid); if (ch) ch.innerHTML = portalChance(got, +e.target.dataset.need) || `<span class="mute">–</span>`; const tr = e.target.closest("tr"); if (tr) tr.classList.toggle("me", !!got); }
  });
  // update one prospect's weekly points and the budget totals without redrawing the page
  function setPts(el) {
    const v = Math.max(0, Math.round(+el.value || 0));
    el.value = v; L.plan[+el.dataset.rid] = v;
    const rb = T(L.userTid).rb, planned = Object.values(L.plan).reduce((a, b) => a + b, 0), over = planned > rb;
    const al = $("recAlloc"), lf = $("recLeft"), bar = $("recBar"), ov = $("recOver");
    if (al) { al.textContent = planned; al.className = over ? "L" : ""; }
    if (lf) { lf.textContent = rb - planned; lf.className = over ? "L" : ""; }
    if (bar) { bar.style.width = Math.min(100, (planned / Math.max(1, rb)) * 100) + "%"; bar.style.background = over ? "var(--loss)" : "var(--tc)"; }
    if (ov) { ov.hidden = !over; ov.querySelector("b").textContent = planned - rb; }
    persist();
  }
  document.addEventListener("input", (e) => { if (e.target.classList && e.target.classList.contains("pts") && e.target.value !== "") setPts(e.target); });
  document.addEventListener("focusin", (e) => { if (e.target.classList && e.target.classList.contains("pts")) e.target.select(); });
  function sortBy(th) {
    const id = th.dataset.sort, k = th.dataset.k, cur = S.sort[id];
    const asc = ["name", "team", "t", "pos", "rot", "seed", "yr", "net", "ov", "conf", "bid"].includes(k);
    S.sort[id] = cur && cur.k === k ? { k, d: -cur.d } : { k, d: asc ? 1 : -1 };
    render();
  }
  let rsz = 0; window.addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(() => B.drawAll($("main")), 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => B.drawAll($("main")));

  // ---------- saving: gzip + base64, IndexedDB locally, chunked docs in the account ----------
  const IDB = { db: null };
  function idb() { return new Promise((res) => { try { const r = indexedDB.open("hardwood-ledger", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); }
  async function idbGet(k) { const d = IDB.db || (IDB.db = await idb()); if (!d) return null; return new Promise((res) => { try { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
  async function idbSet(k, v) { const d = IDB.db || (IDB.db = await idb()); if (!d) return false; return new Promise((res) => { try { const tx = d.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); } catch (e) { res(false); } }); }
  function b64(buf) { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function encodeSave() {
    const json = JSON.stringify(E.pack(L));
    if (typeof CompressionStream === "undefined") return "HL2J:" + json;
    const buf = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
    return "HL2:" + b64(buf);
  }
  async function decodeSave(s) {
    let json;
    if (s.startsWith("HL2J:")) json = s.slice(5);
    else if (s.startsWith("HL2:")) json = await new Response(new Blob([unb64(s.slice(4))]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    else throw new Error("format");
    return E.unpack(JSON.parse(json));
  }
  let db = null, uid = null, remoteOK = null, saving = false, again = false, lastSaved = 0, saveT = 0, localOK = null;
  function saveLine() {
    if (!L) return "";
    if (remoteOK) return "Saved to your Claude account" + (lastSaved ? " · " + new Date(lastSaved).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
    if (localOK === false) return "Couldn't save in this browser. Use Export to keep your league.";
    if (remoteOK === false) return "Saved in this browser only. Use Export now and then as a backup.";
    return "Saved in this browser";
  }
  function setStatus() { const s = $("status"); if (s) s.textContent = saveLine(); const i = $("saveInfo"); if (i) i.textContent = saveLine(); }
  function persist() { if (!L) return; L.savedAt = Date.now(); clearTimeout(saveT); saveT = setTimeout(doSave, 600); }
  async function doSave() {
    if (saving) { again = true; return; }
    saving = true;
    try {
      do {
        again = false;
        const s = await encodeSave();
        localOK = await idbSet("save", s);
        if (!localOK) { try { localStorage.setItem("hardwood-ledger-v2", s); localOK = true; } catch (e) { localOK = false; } }
        if (db && uid) {
          try {
            const size = 180000, n = Math.ceil(s.length / size), c = db.collection("data/users/" + uid);
            for (let i = 0; i < n; i++) await c.doc("v2-" + i).set({ s: s.slice(i * size, (i + 1) * size) });
            await c.doc("v2-meta").set({ n, t: L.savedAt, season: L.season, team: T(L.userTid).region, v: 2 });
            remoteOK = true; lastSaved = Date.now();
          } catch (e) { remoteOK = false; }
        }
      } while (again);
    } catch (e) { console.error(e); }
    saving = false; setStatus();
  }
  async function remoteLoad() {
    const c = db.collection("data/users/" + uid), m = await c.doc("v2-meta").get();
    if (!m.exists) return null;
    const meta = m.data(); let s = "";
    for (let i = 0; i < meta.n; i++) { const d = await c.doc("v2-" + i).get(); if (!d.exists) return null; s += d.data().s; }
    const d = await decodeSave(s); return valid(d) ? d : null;
  }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
  async function connect() {
    try {
      if (!window.claude || !window.claude.use) { remoteOK = false; setStatus(); return; }
      const got = await withTimeout(Promise.all([window.claude.use("db"), window.claude.use("user")]), 10000);
      const [d, u] = got || [];
      if (!d || !u) { remoteOK = false; setStatus(); return; }
      const id = await u.id(); if (!id) { remoteOK = false; setStatus(); return; }
      db = d; uid = id;
      const remote = await withTimeout(remoteLoad(), 15000);
      if (remote && (!L || (remote.savedAt || 0) > (L.savedAt || 0))) { L = remote; WORLD = null; if (E.fixPrestige(L)) persist(); if (E.ensureGeo(L)) persist(); if (E.renameTerms(L)) persist(); render(); toast("Loaded your saved league"); remoteOK = true; setStatus(); idbSet("save", await encodeSave()); }
      else if (L) doSave(); else { remoteOK = true; setStatus(); }
    } catch (e) { remoteOK = false; setStatus(); }
  }
  async function start(data) {
    try { if (data && data.v === 2) { const d = E.unpack(data); if (valid(d)) L = d; } } catch (e) {}
    if (!L) { try { const s = (await idbGet("save")) || localStorage.getItem("hardwood-ledger-v2"); if (s) { const d = await decodeSave(s); if (valid(d)) L = d; } } catch (e) {} }
    try { S.pack = (await idbGet("names")) || ""; } catch (e) { S.pack = ""; }
    if (L && E.fixPrestige(L)) { S.presMsg = true; persist(); }
    if (L && E.ensureGeo(L)) { S.geoMsg = true; persist(); }
    if (L && E.renameTerms(L)) persist();
    if (!L) { WORLD = E.newWorld(S.pack || undefined); try { if (localStorage.getItem("hardwood-ledger-save-v1")) S.oldSave = true; } catch (e) {} }
    render();
    if (S.oldSave && !L) toast("v0.2 has a new, bigger world. Your v0.1 league can't carry over.");
    if (S.geoMsg && !S.presMsg) modal(`<h2>Schools now have locations</h2><p>Prospects now come from real US towns, weighted by population, and they value recruiting effort from schools near home.</p><p class="mute">Your schools were placed in towns near their conference's region. If you're using the real-schools names file, import the updated file (Save &amp; league → Import names) to put every school on its actual campus.</p><div class="tools"><button class="btn play" data-act="close">Got it</button></div>`);
    if (S.presMsg) modal(`<h2>Prestige rebalanced</h2><p>Your league had a lot of programs stuck at 99 prestige. Prestige now rises when a program beats expectations for its level, drifts back toward its historical level, and gets harder to raise near the top.</p><p class="mute">Programs far above their usual level were pulled back toward it. Records, titles and history are unchanged.</p><div class="tools"><button class="btn play" data-act="close">Got it</button></div>`);
    connect();
  }
  window.claude?.hot?.snapshot?.(() => (L ? E.pack(L) : null));
  if (window.claude?.hot?.ready) window.claude.hot.ready(start); else start(window.claude?.hot?.data ?? null);
}
