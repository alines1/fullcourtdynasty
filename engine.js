/* Full Court Dynasty — simulation engine v0.2. Pure logic, no DOM. Runs in the browser and in Node. */
(function (root) {
  "use strict";
  const NM = root.HLNames || (typeof require !== "undefined" ? require("./names.js") : null);
  const TW = root.HLTowns || (typeof require !== "undefined" ? require("./towns.js") : null);

  // ---------- random helpers ----------
  const R = Math.random;
  const rnd = (a, b) => a + R() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const gauss = (m = 0, sd = 1) => { let u = 0, v = 0; while (u === 0) u = R(); while (v === 0) v = R(); return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wpick = (items, wf) => {
    let tot = 0; const ws = items.map((x) => { const w = Math.max(0.0001, wf(x)); tot += w; return w; });
    let r = R() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };

  // ---------- constants ----------
  const FIRST = "Aaron Adrian Andre Anthony Bryce Caleb Cam Carter Chase Chris Cole Colin Darius Dante Davion DeShawn Devin Dylan Eli Elijah Emeka Evan Gabe Grant Hunter Isaac Isaiah Jabari Jalen Jamal Jaylen Jordan Josh Julian Justin Kai Keegan Kendall Kobe Lamar Landon Luca Malik Marcus Mason Miles Myles Nate Nico Noah Omar Owen Quinn Reggie Rhys Sam Seth Terrance Theo Trey Tyler Tyrese Victor Wes Xavier Zach Zion Ty Bo Amari Kofi Tariq Mateo Ivan Luka Sekou Brady Cooper Deandre Ethan Felix Gavin Hayden Jace Javon Keon Logan Marquis Micah Nolan Parker Rashad Ryan Shane Trevon Wyatt".split(" ");
  const LAST = "Adams Allen Bailey Baker Banks Barnes Bell Bennett Brooks Brown Bryant Carter Clark Coleman Cooper Davis Diallo Dixon Edwards Ellis Evans Fisher Foster Franklin Gibson Grant Greene Hall Harper Harris Hayes Henderson Hill Holmes Howard Hughes Jackson James Jenkins Johnson Jones Jordan Kelly King Lewis Lopez Marshall Martin Mitchell Moore Morgan Morris Murphy Nelson Okafor Owens Parker Perry Peterson Phillips Porter Price Reed Reynolds Richardson Rivera Robinson Ross Russell Sanders Scott Simmons Spencer Stewart Sullivan Taylor Thomas Thompson Turner Walker Ward Warren Washington Watson White Williams Wilson Wright Young Novak Petrovic Mensah Silva Abbott Boateng Castillo Dunn Fleming Garrett Hale Ingram Keller Lawson Mbeki Nash Oduya Pruitt Quarles Riley Sowell Tate Vance Whitfield".split(" ");
  const RKEYS = ["ins", "mid", "tp", "ft", "hdl", "pas", "reb", "per", "int", "blk", "ath"];
  const RNAMES = { ins: "Inside", mid: "Mid-range", tp: "Three", ft: "Free throw", hdl: "Handling", pas: "Passing", reb: "Rebounding", per: "Perimeter D", int: "Interior D", blk: "Shot block", ath: "Athleticism" };
  const OVR_W = { ins: 0.13, mid: 0.1, tp: 0.13, ft: 0.03, hdl: 0.1, pas: 0.1, reb: 0.1, per: 0.1, int: 0.08, blk: 0.05, ath: 0.08 };
  const POS = ["PG", "SG", "SF", "PF", "C"];
  const ARCH = {
    PG: { ins: -8, mid: 2, tp: 5, ft: 6, hdl: 16, pas: 16, reb: -14, per: 6, int: -14, blk: -18, ath: 6 },
    SG: { ins: -3, mid: 6, tp: 10, ft: 6, hdl: 6, pas: 2, reb: -8, per: 6, int: -9, blk: -12, ath: 5 },
    SF: { ins: 2, mid: 4, tp: 3, ft: 1, hdl: 0, pas: 0, reb: 0, per: 4, int: 0, blk: -3, ath: 6 },
    PF: { ins: 8, mid: -1, tp: -6, ft: -4, hdl: -9, pas: -5, reb: 10, per: -4, int: 9, blk: 7, ath: 0 },
    C: { ins: 13, mid: -6, tp: -18, ft: -8, hdl: -16, pas: -8, reb: 16, per: -9, int: 14, blk: 15, ath: -3 },
  };
  const HGT = { PG: [71, 76], SG: [74, 78], SF: [76, 80], PF: [79, 82], C: [81, 86] };
  const YR = ["", "FR", "SO", "JR", "SR"];
  const ROSTER_SIZE = 13;
  const MINUTES = [34, 32, 31, 30, 28, 17, 13, 9, 4, 2, 0, 0, 0, 0, 0];
  const STATK = ["gp", "gs", "min", "pts", "fgm", "fga", "tpm", "tpa", "ftm", "fta", "orb", "drb", "ast", "stl", "blk", "tov", "pf"];
  const TIER_MEAN = [0, 72, 55, 38, 20];

  // calendar: day index -> days after Nov 3 of the season's first year
  const DAYS = { ncEnd: 12, confStart: 13, confEnd: 34, ctStart: 35, ncaaStart: 39, last: 45 };
  const NCAA_OFF = [133, 135, 137, 142, 144, 151, 153];
  const NCAA_ROUNDS = ["Opening Round", "Round of 64", "Round of 32", "Round of 16", "Regional Final", "Final Weekend", "Championship"];
  const REGIONS = ["East", "West", "South", "Midwest"];
  function dayOffset(day) {
    if (day <= DAYS.ncEnd) return (day - 1) * 3;
    if (day <= DAYS.confEnd) return 57 + (day - DAYS.confStart) * 3;
    if (day < DAYS.ncaaStart) return 124 + (day - DAYS.ctStart);
    return NCAA_OFF[Math.min(day - DAYS.ncaaStart, 6)];
  }
  function dayDate(season, day) { const d = new Date(season - 1, 10, 3); d.setDate(d.getDate() + dayOffset(day)); return d; }


  // ---------- geography: hometowns and campus locations ----------
  // Hometowns are drawn from every US town of 1,000+ people, weighted by population, with a boost for
  // basketball hotbeds (multipliers set by feel). A small share of players come from abroad.
  const HOTBEDS = [[38.95, -76.95, 60, 1.6], [33.75, -84.39, 60, 1.5], [41.88, -87.63, 50, 1.4], [34.05, -118.24, 60, 1.3], [29.76, -95.37, 50, 1.4], [32.78, -96.8, 50, 1.4], [40.71, -74.0, 40, 1.3], [39.95, -75.17, 35, 1.4], [42.33, -83.05, 35, 1.3], [39.77, -86.16, 70, 1.35], [35.15, -90.05, 40, 1.5], [29.95, -90.07, 40, 1.3], [35.6, -79.4, 130, 1.25], [38.1, -85.2, 70, 1.2], [37.8, -122.27, 40, 1.15], [47.6, -122.33, 40, 1.1], [36.17, -115.14, 30, 1.15], [39.1, -84.51, 35, 1.15], [41.5, -81.69, 35, 1.15], [33.45, -112.07, 40, 1.05]];
  const INTL = ["Toronto, ON", "Montreal, QC", "Vancouver, BC", "Lagos, Nigeria", "Dakar, Senegal", "Yaoundé, Cameroon", "Belgrade, Serbia", "Zagreb, Croatia", "Kaunas, Lithuania", "Madrid, Spain", "Paris, France", "Berlin, Germany", "Melbourne, Australia", "Sydney, Australia", "Auckland, New Zealand", "Athens, Greece", "Istanbul, Turkey", "Nassau, Bahamas", "Kingston, Jamaica", "Ljubljana, Slovenia", "Bamako, Mali", "Tel Aviv, Israel", "Copenhagen, Denmark", "London, England", "Rome, Italy"];
  const INTL_SHARE = 0.08;
  const mi = (a, b) => { const r = Math.PI / 180, dla = (b[0] - a[0]) * r, dlo = (b[1] - a[1]) * r; const h = Math.sin(dla / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dlo / 2) ** 2; return 3959 * 2 * Math.asin(Math.min(1, Math.sqrt(h))); };
  let TOWN = null;
  function towns() {
    if (TOWN || !TW) return TOWN;
    const names = TW.n.split("|"), n = names.length, cum = new Float64Array(n);
    let tot = 0;
    for (let i = 0; i < n; i++) {
      const g = [TW.la[i] / 100, TW.lo[i] / 100];
      let m = 1; for (const [la, lo, rad, mul] of HOTBEDS) if (Math.abs(g[0] - la) < 3 && mi(g, [la, lo]) <= rad) { m = Math.max(m, mul); }
      tot += Math.min(TW.p[i], 2500000) * m; cum[i] = tot; // big-city figures are metro-wide and suburbs are listed too, so cap them
    }
    TOWN = { names, n, cum, tot, st: TW.states };
    return TOWN;
  }
  const townName = (i) => `${towns().names[i]}, ${TW.states[TW.s[i]]}`;
  const townGeo = (i) => [TW.la[i] / 100, TW.lo[i] / 100];
  function pickHome() {
    const T = towns();
    if (!T || R() < INTL_SHARE) {
      if (NM && NM.INTL) { const g = wpick(NM.INTL, (x) => x[1]); return { town: pick(g[2]), geo: null, c: g[0], nf: g[3], nl: g[4] }; }
      return { town: pick(INTL), geo: null };
    }
    const x = R() * T.tot; let lo = 0, hi = T.n - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (T.cum[m] < x) lo = m + 1; else hi = m; }
    return { town: townName(lo), geo: townGeo(lo) };
  }
  const stateOf = (place) => { const m = /, ([A-Z]{2})$/.exec(place || ""); return m ? m[1] : null; };
  function distance(t, p) { return t && p && t.geo && p.geo ? mi(t.geo, p.geo) : null; }
  // how much more a prospect values a school's recruiting effort because it's close to home
  function nearBoost(t, p) {
    const d = distance(t, p);
    if (d == null) return 1;
    let m = d < 60 ? 1.6 : d < 150 ? 1.4 : d < 300 ? 1.25 : d < 500 ? 1.1 : d < 900 ? 1 : 0.9;
    if (stateOf(t.city) && stateOf(t.city) === stateOf(p.town)) m += 0.08;
    return m;
  }
  // place schools in real towns: each conference gets a home region, schools sit in towns within a few hundred miles of it
  function placeSchools(L, onlyMissing) {
    const T = towns(); if (!T) return;
    const big = [], mid = [];
    for (let i = 0; i < T.n; i++) { if (TW.p[i] >= 150000) big.push(i); if (TW.p[i] >= 12000) mid.push(i); }
    const used = new Set(L.teams.filter((t) => t.city).map((t) => t.city));
    for (const c of L.confs) {
      const need = c.tids.filter((tid) => !onlyMissing || !L.teams[tid].geo);
      if (!need.length) continue;
      const have = c.tids.map((tid) => L.teams[tid]).filter((t) => t.geo);
      const anchor = have.length ? have[0].geo : townGeo(wpick(big, (i) => Math.sqrt(TW.p[i])));
      let radius = 350, cands = [];
      while (cands.length < need.length * 3 && radius < 3000) { cands = mid.filter((i) => { const g = townGeo(i); return Math.abs(g[0] - anchor[0]) < radius / 60 && mi(g, anchor) <= radius && !used.has(townName(i)); }); radius += 250; }
      for (const tid of need) {
        const i = wpick(cands.filter((j) => !used.has(townName(j))), (j) => Math.sqrt(TW.p[j]));
        if (i == null) continue;
        used.add(townName(i)); L.teams[tid].city = townName(i); L.teams[tid].geo = townGeo(i);
      }
    }
  }
  // older saves: give schools a location and current prospects a mapped hometown
  // one-time rename of trademarked tournament terms in older saves (news, awards, round labels)
  const TERMS = [[/NCAA Tournament Most Outstanding Player|NCAA Most Outstanding Player/g, "Tournament Most Outstanding Player"], [/NCAA tournament/gi, "National Tournament"], [/NCAA bid/g, "tournament bid"], [/Selection Sunday/g, "Selection Day"], [/Sweet 16/g, "Round of 16"], [/Elite Eight/g, "Regional Final"], [/Final Four/g, "Final Weekend"], [/Division I record/g, "National record"]];
  function renameTerms(L) {
    if (L.termsV >= 1) return false;
    const fix = (s) => { for (const [re, to] of TERMS) s = s.replace(re, to); return s; };
    const walk = (o) => { if (!o || typeof o !== "object") return; for (const k in o) { const v = o[k]; if (typeof v === "string") { if (/NCAA|Selection Sunday|Sweet 16|Elite Eight|Final Four|Division I/.test(v)) o[k] = fix(v); } else if (v && typeof v === "object") walk(v); } };
    walk(L.news); walk(L.boxes); walk(L.schedule); walk(L.awards); walk(L.alumni); for (const p of L.players) walk(p.awards);
    L.termsV = 1; return true;
  }
  function ensureGeo(L) {
    let changed = false;
    if (L.teams.some((t) => !t.geo)) { placeSchools(L, true); changed = true; }
    for (const p of L.recruits || []) if (p.geo === undefined) { const h = pickHome(); p.town = h.town; p.geo = h.geo; changed = true; }
    for (const p of L.players) if (p.geo === undefined) { p.geo = null; }
    for (const t of L.teams) if (t.pace == null) { t.pace = Math.round(clamp(gauss(0, 3.2), -8, 8) * 10) / 10; changed = true; }
    return changed;
  }

  // ---------- players ----------
  function calcOvr(r) { let s = 0; for (const k of RKEYS) s += r[k] * OVR_W[k]; return Math.round(s); }
  function makePlayer(L, tid, yr, talent, room) {
    const pos = pick(POS), r = {};
    for (const k of RKEYS) r[k] = Math.round(clamp(talent + ARCH[pos][k] + gauss(0, 7), 10, 99));
    const hr = HGT[pos];
    const home = pickHome();
    const p = { pid: L.nextPid++, tid, first: pick(home.nf || (NM && NM.US_FIRST) || FIRST), last: pick(home.nl || (NM && NM.US_LAST) || LAST), pos, yr, hgt: rint(hr[0], hr[1]), town: home.town, geo: home.geo, r, ovr: calcOvr(r), pot: 0, stats: {}, depth: 99, jersey: rint(0, 55) };
    p.pot = Math.round(clamp(p.ovr + (room ?? [0, 14, 9, 5, 2][yr]) + gauss(0, 4), p.ovr, 99));
    return p;
  }
  const teamTalent = (prestige, yr) => 27 + prestige * 0.32 + (yr - 1) * 3.5;

  // ---------- world ----------
  function schoolName(used) {
    for (let tries = 0; tries < 500; tries++) {
      const town = pick(NM.PRE) + pick(NM.SUF);
      if (used.has(town)) continue;
      const x = R();
      let name;
      if (x < 0.34) name = town;
      else if (x < 0.6) name = town + " State";
      else if (x < 0.67) name = town + " Tech";
      else if (x < 0.71) name = town + " A&M";
      else if (x < 0.78) { const s = pick(NM.SAINTS); if (used.has("St." + s)) continue; used.add("St." + s); name = "St. " + s; }
      else if (x < 0.83) name = town + " College";
      else if (x < 0.88) name = town + " Christian";
      else if (x < 0.93) name = (R() < 0.5 ? "North " : "South ") + town;
      else name = town + " Southern";
      used.add(town);
      return name;
    }
    return "School " + used.size;
  }
  function makeAbbrev(name, used) {
    const w = name.replace("&", "").replace(".", "").split(" ");
    const cands = [];
    if (w[0] === "St") cands.push("S" + w[1].slice(0, 3).toUpperCase(), "ST" + w[1].slice(0, 2).toUpperCase());
    else if (w[0] === "North" || w[0] === "South") cands.push(w[0][0] + w[1].slice(0, 3).toUpperCase(), w[0][0] + w[1].slice(0, 2).toUpperCase());
    else if (w.length > 1) { const s = { State: "S", Tech: "T", AM: "AM", College: "C", Christian: "CU", Southern: "SO" }[w[1]] || ""; cands.push(w[0].slice(0, 3).toUpperCase() + s, w[0].slice(0, 4).toUpperCase() + s, w[0].slice(0, 2).toUpperCase() + s); }
    else cands.push(w[0].slice(0, 4).toUpperCase(), w[0].slice(0, 3).toUpperCase(), w[0].slice(0, 5).toUpperCase());
    for (const c of cands) if (!used.has(c)) { used.add(c); return c; }
    let i = 2; while (used.has(cands[0] + i)) i++; used.add(cands[0] + i); return cands[0] + i;
  }
  function genWorld(L) {
    const used = new Set(), usedAb = new Set();
    NM.CONFS.forEach(([name, abbrev, size, tier], cid) => {
      const c = { cid, name, abbrev, tier, tids: [] };
      L.confs.push(c);
      const masc = shuffle(NM.MASCOTS.slice());
      for (let i = 0; i < size; i++) {
        const tid = L.teams.length, region = schoolName(used);
        let prestige = [0, gauss(70, 11), gauss(54, 10), gauss(37, 9), gauss(19, 7)][tier];
        if (tier === 1 && i < 2) prestige = rnd(88, 97);
        if (tier >= 2 && tier <= 3 && R() < 0.05) prestige += 18; // a mid-major power
        prestige = Math.round(clamp(prestige, [0, 45, 32, 14, 4][tier], [0, 97, 88, 72, 45][tier]));
        L.teams.push({ tid, cid, region, name: masc[i % masc.length], abbrev: makeAbbrev(region, usedAb), c1: pick(NM.COLORS), prestige, hist: [], rb: 0, rbx: [0, 0, 0], tg: [] });
        c.tids.push(tid);
      }
    });
  }

  function newLeague(userTid, coachName, seedLeague, pack) {
    const L = seedLeague || {
      v: 2, season: 2027, phase: "regular", day: 1, userTid: -1, coach: null, nextPid: 1, nextGid: 1,
      confs: [], teams: [], players: [], recruits: [], games: [], boxes: {}, rec: {}, ts: {}, os: {}, ct: null, ncaa: null,
      power: null, powerDay: -1, poll: null, history: [], awards: {}, presFix: 1, news: [], plan: {}, autoRec: false, week: -1, ncaaRes: {},
    };
    if (!seedLeague) {
      if (pack === "random") genWorld(L);
      else if (pack && validatePack(pack).ok) genWorldFromPack(L, pack);
      else if (NM.DEFAULT) genWorldFromPack(L, NM.DEFAULT); // default: fictional schools in real college towns
      else genWorld(L);
      placeSchools(L, true);
      for (const t of L.teams) t.pace = Math.round(clamp(gauss(0, 3.2), -8, 8) * 10) / 10;
      for (const t of L.teams) if (t.base == null) t.base = t.prestige;
      for (const t of L.teams) {
        const yrs = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, rint(1, 4)];
        for (const yr of yrs) L.players.push(makePlayer(L, t.tid, yr, teamTalent(t.prestige, yr) + gauss(0, 4)));
        autoDepth(L, t.tid);
      }
    }
    L.userTid = userTid;
    L.coach = { name: coachName || "Coach", w: 0, l: 0, seasons: 0, ctTitles: 0, apps: 0, ff: 0, titles: 0, start: L.season, schools: [userTid] };
    for (const t of L.teams) setBudget(L, t, true);
    makeSchedule(L);
    newRecruitClass(L);
    aiRedshirts(L);
    news(L, `Coach ${L.coach.name} takes over at ${L.teams[userTid].region}.`);
    return L;
  }
  // build the world once, let the person pick a school, then finish setup
  function newWorld(pack) { const L = newLeague(0, "Coach", null, pack); L.news = []; return L; }
  function claimSchool(L, tid, coachName) {
    L.userTid = tid;
    L.coach = { name: coachName || "Coach", w: 0, l: 0, seasons: 0, ctTitles: 0, apps: 0, ff: 0, titles: 0, start: L.season, schools: [tid] };
    L.news = []; news(L, `${L.coach.name && L.coach.name !== "Coach" ? "Coach " + L.coach.name : "A new coach"} takes over at ${L.teams[tid].region}.`);
    return L;
  }

  // who shoots: weighted by usage, but no one takes more than about a third of the lineup's shots
  const USE_CAP = 0.37;
  function shooter(O) {
    let tot = 0, mi = -1, mw = -1;
    for (const i of O.on) { const w = O.use[i]; tot += w; if (w > mw) { mw = w; mi = i; } }
    const rest = tot - mw, capW = rest > 0 ? (USE_CAP / (1 - USE_CAP)) * rest : mw;
    const w0 = Math.min(mw, capW), t2 = rest + w0;
    let x = R() * t2;
    for (const i of O.on) { x -= i === mi ? w0 : O.use[i]; if (x <= 0) return i; }
    return O.on[O.on.length - 1];
  }
  function news(L, text, mine) { L.news.unshift({ season: L.season, day: L.day, text, mine: !!mine }); if (L.news.length > 80) L.news.length = 80; }
  const roster = (L, tid) => L.players.filter((p) => p.tid === tid).sort((a, b) => a.depth - b.depth);
  function autoDepth(L, tid) {
    const ps = L.players.filter((p) => p.tid === tid).sort((a, b) => b.ovr - a.ovr);
    const start = ps.slice(0, 5);
    if (!start.some((p) => p.pos === "PG" || p.pos === "SG")) { const g = ps.slice(5).find((p) => p.pos === "PG" || p.pos === "SG"); if (g) { ps.splice(ps.indexOf(g), 1); ps.splice(4, 0, g); } }
    if (!start.some((p) => p.pos === "PF" || p.pos === "C")) { const b = ps.slice(5).find((p) => p.pos === "PF" || p.pos === "C"); if (b) { ps.splice(ps.indexOf(b), 1); ps.splice(4, 0, b); } }
    ps.forEach((p, i) => (p.depth = i));
  }

  // ---------- schedule ----------
  function roundRobin(tids) {
    const arr = tids.slice(); if (arr.length % 2) arr.push(null);
    const n = arr.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const g = [];
      for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; if (a != null && b != null) g.push(r % 2 === 0 ? [a, b] : [b, a]); }
      rounds.push(g); arr.splice(1, 0, arr.pop());
    }
    return rounds;
  }
  function makeSchedule(L) {
    L.games = []; L.boxes = {}; L.day = 1; L.phase = "regular"; L.ct = null; L.ncaa = null; L.ncaaRes = {}; L.week = -1; L.powerDay = -1;
    L.rec = {}; L.ts = {}; L.os = {};
    for (const t of L.teams) { L.rec[t.tid] = { w: 0, l: 0, cw: 0, cl: 0, hw: 0, hl: 0, aw: 0, al: 0, nw: 0, nl: 0, pf: 0, pa: 0, cpf: 0, cpa: 0, last: "", clast: "" }; L.ts[t.tid] = blankLine(); L.os[t.tid] = blankLine(); }
    // non-conference: 12 days of cross-conference pairings
    const met = new Set();
    for (let day = 1; day <= DAYS.ncEnd; day++) {
      const pool = shuffle(L.teams.map((t) => t.tid));
      while (pool.length > 1) {
        const a = pool.pop();
        let j = -1;
        for (let k = pool.length - 1; k >= 0 && k >= pool.length - 40; k--) { const b = pool[k]; if (L.teams[b].cid !== L.teams[a].cid && !met.has(a * 1000 + b)) { j = k; break; } }
        if (j < 0) continue;
        const b = pool.splice(j, 1)[0];
        met.add(a * 1000 + b); met.add(b * 1000 + a);
        const pa = L.teams[a].prestige, pb = L.teams[b].prestige;
        const neutral = R() < 0.15;
        const aHome = R() < clamp(0.5 + (pa - pb) / 110, 0.2, 0.88);
        L.games.push({ gid: L.nextGid++, day, home: aHome ? a : b, away: aHome ? b : a, type: "nc", neutral });
      }
    }
    // conference
    for (const c of L.confs) {
      const n = c.tids.length, cyc = roundRobin(shuffle(c.tids.slice()));
      const target = Math.min(2 * (n - 1), 20);
      const perCycle = n - 1;
      const R1 = cyc.length;
      const need = Math.min(2 * R1, Math.ceil(target / perCycle * R1));
      const second = shuffle(cyc.map((g) => g.map(([h, a]) => [a, h])));
      const rounds = cyc.concat(second).slice(0, need);
      rounds.forEach((g, ri) => { for (const [h, a] of g) L.games.push({ gid: L.nextGid++, day: DAYS.confStart + ri, home: h, away: a, type: "conf", neutral: false }); });
    }
  }

  // ---------- game sim ----------
  function blankLine() { return { gp: 0, gs: 0, min: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, orb: 0, drb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 }; }

  function simGame(L, g) {
    const sides = [g.home, g.away].map((tid, si) => {
      const ps = roster(L, tid).filter((p) => !p.inj && !p.rs).slice(0, 12);
      return {
        tid, si, ps, lines: ps.map(() => blankLine()), played: ps.map(() => 0), target: ps.map((_, i) => MINUTES[i] || 0),
        on: [0, 1, 2, 3, 4], score: 0, halves: [0, 0], tf: 0, form: gauss(0, 0.02),
        use: ps.map((p) => Math.pow((p.r.ins * 0.3 + p.r.mid * 0.2 + p.r.tp * 0.3 + p.r.hdl * 0.1 + p.r.ath * 0.1) / 50, 3.0)),
      };
    });
    sides.forEach((s) => s.on.forEach((i) => (s.lines[i].gs = 1)));
    const neutral = g.neutral;
    // pace: each program has its own tempo; the game lands between the two
    const N = Math.round(clamp(68 + ((L.teams[g.home].pace || 0) + (L.teams[g.away].pace || 0)) / 2 + gauss(0, 2), 56, 82));
    let totalTime = 40;
    const pickLineup = (s, elapsed, total) => {
      const avail = s.ps.map((_, i) => i).filter((i) => s.lines[i].pf < 5);
      const scale = elapsed / total;
      avail.sort((a, b) => (s.target[b] * scale - s.played[b]) - (s.target[a] * scale - s.played[a]) || a - b);
      s.on = avail.slice(0, 5);
    };
    const avg = (s, f) => s.on.reduce((t, i) => t + f(s.ps[i].r), 0) / s.on.length;
    const freeThrows = (O, sh, n) => {
      const p = clamp(0.45 + O.ps[sh].r.ft * 0.0048, 0.4, 0.93); let made = 0;
      for (let i = 0; i < n; i++) { O.lines[sh].fta++; if (R() < p) { made++; O.lines[sh].ftm++; O.lines[sh].pts++; } }
      return made;
    };
    const reboundOff = (O, D) => {
      const pO = clamp(0.29 + 0.004 * (avg(O, (r) => r.reb) - avg(D, (r) => r.reb)), 0.15, 0.45);
      if (R() < pO) { const w = wpick(O.on, (i) => Math.pow(O.ps[i].r.reb, 3)); O.lines[w].orb++; return true; }
      const w = wpick(D.on, (i) => Math.pow(D.ps[i].r.reb, 3)); D.lines[w].drb++; return false;
    };
    const possession = (O, D, hca) => {
      let pts = 0;
      for (let tries = 0; tries < 4; tries++) {
        const ballHdl = avg(O, (r) => (r.hdl + r.pas) / 2), pressure = avg(D, (r) => r.per * 0.6 + r.ath * 0.4);
        const pTO = clamp(0.15 + 0.0025 * (pressure - 50) - 0.003 * (ballHdl - 50), 0.08, 0.28);
        if (R() < pTO) {
          const who = wpick(O.on, (i) => O.use[i] + 0.4); O.lines[who].tov++;
          if (R() < 0.55) { const st = wpick(D.on, (i) => Math.pow(D.ps[i].r.per * 0.5 + D.ps[i].r.ath * 0.5, 2)); D.lines[st].stl++; }
          return pts;
        }
        if (R() < 0.12) {
          const f = wpick(D.on, () => 1); D.lines[f].pf++; D.tf++;
          if (D.tf >= 10) { const sh = shooter(O); return pts + freeThrows(O, sh, 2); }
          if (D.tf >= 7) { const sh = shooter(O); const m = freeThrows(O, sh, 1); pts += m; if (m) pts += freeThrows(O, sh, 1); return pts; }
          continue;
        }
        const sh = shooter(O), r = O.ps[sh].r;
        const wRim = Math.max(4, r.ins + r.ath * 0.4 - 30), wMid = Math.max(2, r.mid * 0.55 - 14), wThr = Math.max(0.5, (r.tp - 22) * 1.05);
        const x = R() * (wRim + wMid + wThr);
        const type = x < wRim ? "rim" : x < wRim + wMid ? "mid" : "three";
        let pMake, pFoul;
        if (type === "rim") { const dv = avg(D, (q) => q.int * 0.6 + q.blk * 0.4); pMake = 0.51 + 0.0034 * ((r.ins * 0.7 + r.ath * 0.3) - 50) - 0.003 * (dv - 50); pFoul = 0.21; }
        else if (type === "mid") { const dv = avg(D, (q) => q.per); pMake = 0.335 + 0.0033 * (r.mid - 50) - 0.0021 * (dv - 50); pFoul = 0.06; }
        else { const dv = avg(D, (q) => q.per); pMake = 0.302 + 0.0035 * (r.tp - 50) - 0.0017 * (dv - 50); pFoul = 0.025; }
        pMake = clamp(pMake + hca, 0.12, 0.8);
        const fouled = R() < pFoul, make = R() < (fouled ? pMake * 0.55 : pMake), L1 = O.lines[sh];
        if (fouled) { const f = wpick(D.on, (i) => (type === "rim" ? D.ps[i].r.int : D.ps[i].r.per)); D.lines[f].pf++; D.tf++; }
        if (fouled && !make) return pts + freeThrows(O, sh, type === "three" ? 3 : 2);
        L1.fga++; if (type === "three") L1.tpa++;
        if (make) {
          const v = type === "three" ? 3 : 2; L1.fgm++; if (type === "three") L1.tpm++; L1.pts += v; pts += v;
          if (R() < (type === "rim" ? 0.42 : type === "mid" ? 0.5 : 0.82)) { const others = O.on.filter((i) => i !== sh); const a = wpick(others, (i) => Math.pow(O.ps[i].r.pas, 2.5)); O.lines[a].ast++; }
          if (fouled) pts += freeThrows(O, sh, 1);
          return pts;
        }
        if (type === "rim" && R() < 0.3 * Math.pow(avg(D, (q) => q.blk) / 50, 2)) { const b = wpick(D.on, (i) => Math.pow(D.ps[i].r.blk, 3)); D.lines[b].blk++; }
        if (!reboundOff(O, D)) return pts;
      }
      return pts;
    };
    const playPeriod = (poss, mins, half) => {
      const d = mins / (poss * 2); let clock = 0, nextSub = 2;
      const startT = half === 0 ? 0 : half === 1 ? 20 : 40 + (half - 2) * 5;
      for (let k = 0; k < poss * 2; k++) {
        if (clock >= nextSub) { sides.forEach((s) => pickLineup(s, startT + clock, totalTime)); nextSub += 2; }
        const off = sides[k % 2], def = sides[1 - (k % 2)];
        const pts = possession(off, def, off.form - def.form * 0.5 + (neutral ? 0 : off.si === 0 ? 0.015 : -0.005));
        off.score += pts; off.halves[half] = (off.halves[half] || 0) + pts;
        for (const s of sides) for (const i of s.on) { s.played[i] += d; s.lines[i].min += d; }
        clock += d;
      }
    };
    playPeriod(Math.round(N / 2), 20, 0);
    sides.forEach((s) => (s.tf = 0));
    playPeriod(N - Math.round(N / 2), 20, 1);
    let ot = 0;
    while (sides[0].score === sides[1].score && ot < 6) { totalTime += 5; sides.forEach((s) => (s.tf = Math.max(s.tf, 7))); playPeriod(Math.round(8 + gauss(0, 1)), 5, 2 + ot); ot++; }
    if (sides[0].score === sides[1].score) { sides[0].score++; sides[0].halves[2] = (sides[0].halves[2] || 0) + 1; }
    const box = { gid: g.gid, day: g.day, season: L.season, type: g.type, round: g.round || null, neutral: !!g.neutral, ot, teams: [] };
    for (const s of sides) {
      const rows = s.ps.map((p, i) => { const ln = s.lines[i]; ln.min = Math.round(ln.min); ln.gp = 1; return Object.assign({ pid: p.pid, name: p.first[0] + ". " + p.last, pos: p.pos }, ln); }).filter((x) => x.min > 0 || x.gs);
      const tot = blankLine(); for (const row of rows) for (const k in tot) if (k !== "gp" && k !== "gs") tot[k] += row[k];
      box.teams.push({ tid: s.tid, score: s.score, periods: s.halves.map((x) => x || 0), rows, tot });
    }
    for (const bt of box.teams) {
      const want = 200 + ot * 25; let diff = want - bt.tot.min; const sorted = bt.rows.slice().sort((a, b) => b.min - a.min); let i = 0;
      while (diff !== 0 && sorted.length && i < 400) { const row = sorted[i % sorted.length], step = diff > 0 ? 1 : -1; if (row.min + step >= 0) { row.min += step; diff -= step; } i++; }
      bt.tot.min = want;
    }
    return box;
  }

  function applyBox(L, g, box) {
    g.hs = box.teams[0].score; g.as = box.teams[1].score; g.ot = box.ot; g.played = true;
    const posOf = (t) => t.fga - t.orb + t.tov + 0.475 * t.fta;
    g.pos = Math.round(((posOf(box.teams[0].tot) + posOf(box.teams[1].tot)) / 2) * 10) / 10;
    const u = L.userTid;
    if (g.home === u || g.away === u || g.type === "ncaa" || g.type === "ct") L.boxes[g.gid] = box;
    let pmap = PM.get(L); if (!pmap) { pmap = new Map(); PM.set(L, pmap); }
    for (let i = 0; i < 2; i++) {
      const bt = box.teams[i], ob = box.teams[1 - i];
      const ts = L.ts[bt.tid], os = L.os[bt.tid];
      ts.gp++; os.gp++;
      for (const k in bt.tot) if (k !== "gp" && k !== "gs") { ts[k] += bt.tot[k]; os[k] += ob.tot[k]; }
      for (const row of bt.rows) {
        let p = pmap.get(row.pid); if (!p || p.pid !== row.pid) { p = L.players.find((q) => q.pid === row.pid); if (p) pmap.set(row.pid, p); }
        if (!p) continue;
        const st = p.stats[L.season] || (p.stats[L.season] = Object.assign(blankLine(), { tid: p.tid }));
        for (const k of STATK) st[k] += row[k] || 0;
        gameRecords(L, g, p, row, bt.tid, ob.tid);
        if (row.min > 0 && R() < row.min * INJ_RATE) injure(L, p, g);
      }
    }
    teamGameRecords(L, g, box);
    healTick(L, g);
    const hw = g.hs > g.as, rh = L.rec[g.home], ra = L.rec[g.away];
    rh.pf += g.hs; rh.pa += g.as; ra.pf += g.as; ra.pa += g.hs;
    const res = (r, won, where) => { if (won) r.w++; else r.l++; r.last += won ? "W" : "L"; if (where === "h") won ? r.hw++ : r.hl++; else if (where === "a") won ? r.aw++ : r.al++; else won ? r.nw++ : r.nl++; };
    res(rh, hw, g.neutral ? "n" : "h"); res(ra, !hw, g.neutral ? "n" : "a");
    if (g.type === "conf") { if (hw) { rh.cw++; ra.cl++; } else { ra.cw++; rh.cl++; } rh.clast += hw ? "W" : "L"; ra.clast += hw ? "L" : "W"; rh.cpf += g.hs; rh.cpa += g.as; ra.cpf += g.as; ra.cpa += g.hs; }
    if (g.home === u || g.away === u) { if ((g.home === u) === hw) L.coach.w++; else L.coach.l++; }
  }
  const PM = new WeakMap();
  function resetPmap(L) { PM.delete(L); }

  // ---------- standings & ratings ----------
  function confStandings(L, cid) {
    const c = L.confs[cid], pw = power(L);
    const rows = c.tids.map((tid) => { const r = L.rec[tid]; const gp = r.cw + r.cl; return Object.assign({ tid, cpct: gp ? r.cw / gp : 0, cdiff: gp ? (r.cpf - r.cpa) / gp : 0, pw: pw[tid] }, r); });
    rows.sort((a, b) => b.cpct - a.cpct || (b.cw - b.cl) - (a.cw - a.cl) || b.cdiff - a.cdiff || b.pw - a.pw);
    const top = rows[0];
    rows.forEach((r, i) => { r.seed = i + 1; r.gb = ((top.cw - r.cw) + (r.cl - top.cl)) / 2; });
    return rows;
  }
  function teamRating(L, tid) {
    const ps = roster(L, tid).slice(0, 10), w = [0.15, 0.14, 0.14, 0.13, 0.12, 0.09, 0.08, 0.06, 0.05, 0.04];
    if (!ps.length) return 0;
    return Math.round(ps.reduce((s, p, i) => s + p.ovr * (w[i] || 0), 0) / w.slice(0, ps.length).reduce((a, b) => a + b, 0));
  }
  // power rating: margin-based (capped) adjusted for schedule, blended with a roster prior early in the year
  function power(L) {
    if (L.powerDay === L.day && L.power) return L.power;
    const n = L.teams.length, sum = new Float64Array(n), cnt = new Float64Array(n), opps = Array.from({ length: n }, () => []);
    for (const g of L.games) {
      if (!g.played) continue;
      const m = clamp(g.hs - g.as, -22, 22) - (g.neutral ? 0 : 3);
      sum[g.home] += m; cnt[g.home]++; opps[g.home].push(g.away);
      sum[g.away] -= m; cnt[g.away]++; opps[g.away].push(g.home);
    }
    let r = new Float64Array(n);
    for (let it = 0; it < 14; it++) {
      const nr = new Float64Array(n);
      for (let i = 0; i < n; i++) { if (!cnt[i]) continue; let os = 0; for (const o of opps[i]) os += r[o]; nr[i] = sum[i] / cnt[i] + os / cnt[i]; }
      let mean = 0; for (let i = 0; i < n; i++) mean += nr[i]; mean /= n; for (let i = 0; i < n; i++) nr[i] -= mean;
      r = nr;
    }
    const out = [];
    for (let i = 0; i < n; i++) { const prior = (teamRating(L, i) - 50) * 1.6; const k = 5; out[i] = (cnt[i] * r[i] + k * prior) / (cnt[i] + k); }
    L.power = out; L.powerDay = L.day;
    return out;
  }
  function netRanks(L) {
    const pw = power(L), order = L.teams.map((t) => t.tid).sort((a, b) => pw[b] - pw[a]), rk = [];
    order.forEach((tid, i) => (rk[tid] = i + 1));
    return { order, rk };
  }
  function updatePoll(L) {
    const pw = power(L);
    const sc = L.teams.map((t) => { const r = L.rec[t.tid], gp = r.w + r.l; return { tid: t.tid, s: pw[t.tid] + (gp ? (r.w / gp - 0.5) * 9 : 0) + t.prestige * 0.02 }; }).sort((a, b) => b.s - a.s);
    const prev = {}; if (L.poll) L.poll.top.forEach((tid, i) => (prev[tid] = i + 1));
    L.poll = { day: L.day, top: sc.slice(0, 25).map((x) => x.tid), prev, others: sc.slice(25, 33).map((x) => x.tid) };
  }

  // ---------- brackets ----------
  function seedOrder(size) { let o = [1, 2]; while (o.length < size) { const m = o.length * 2 + 1; o = o.flatMap((x) => [x, m - x]); } return o; }
  function makeBracket(seeds) {
    const n = seeds.length; let size = 2; while (size < n) size *= 2;
    const ord = seedOrder(size), r0 = [];
    for (let i = 0; i < size; i += 2) {
      const sa = ord[i], sb = ord[i + 1];
      const m = { a: sa <= n ? seeds[sa - 1] : null, b: sb <= n ? seeds[sb - 1] : null, sa, sb, w: null, gid: null };
      if (m.b == null) m.w = m.a, m.bye = true; else if (m.a == null) m.w = m.b, m.bye = true;
      r0.push(m);
    }
    return { seeds, rounds: [r0], stage: 0, champ: null };
  }
  function nextRound(prev, seedOf) {
    const out = [];
    for (let i = 0; i < prev.length; i += 2) {
      let a = prev[i].w, b = prev[i + 1].w;
      out.push({ a, b, sa: seedOf(a), sb: seedOf(b), w: null, gid: null });
    }
    return out;
  }
  function startConfTourneys(L) {
    if (!L.awards) L.awards = {};
    confAwards(L);
    L.ct = {};
    for (const c of L.confs) {
      const st = confStandings(L, c.cid).slice(0, 16).map((r) => r.tid);
      L.ct[c.cid] = makeBracket(st);
    }
    L.phase = "conftour";
    const me = L.confs[L.teams[L.userTid].cid];
    news(L, `Conference tournaments begin. ${L.teams[L.ct[me.cid].seeds[0]].region} is the top seed in the ${me.name}.`);
  }
  function scheduleMatches(L, matches, type, round, neutral) {
    for (const m of matches) if (m.a != null && m.b != null && m.w == null && m.gid == null) {
      const g = { gid: L.nextGid++, day: L.day, home: m.sa <= m.sb ? m.a : m.b, away: m.sa <= m.sb ? m.b : m.a, type, neutral, round };
      L.games.push(g); m.gid = g.gid;
    }
  }
  const GM = new WeakMap();
  function gameById(L, gid) {
    let c = GM.get(L);
    if (!c || c.n !== L.games.length || c.arr !== L.games) { c = { n: L.games.length, arr: L.games, map: new Map(L.games.map((g) => [g.gid, g])) }; GM.set(L, c); }
    return c.map.get(gid);
  }
  function settle(matches, L) {
    for (const m of matches) if (m.gid != null && m.w == null) {
      const g = gameById(L, m.gid);
      if (g && g.played) { m.w = g.hs > g.as ? g.home : g.away; m.l = m.w === m.a ? m.b : m.a; m.sc = [m.a === g.home ? g.hs : g.as, m.b === g.home ? g.hs : g.as]; }
    }
  }
  const CT_ROUNDS = ["First round", "Second round", "Quarterfinal", "Semifinal", "Championship"];
  function ctRoundName(br, i) { const left = Math.round(Math.log2(br.rounds[0].length * 2)) - i; return ["", "Championship", "Semifinal", "Quarterfinal", "First round"][left] || "Round " + (i + 1); }
  function ncaaMatches(N) { const out = N.or.slice(); for (const r of N.regions) for (const rd of r.rounds) out.push(...rd); out.push(...N.ff); if (N.final) out.push(N.final); return out; }

  // ---------- National Tournament (76 teams) ----------
  function selectField(L, projected) {
    const pw = power(L);
    let autos;
    if (projected) autos = L.confs.map((c) => confStandings(L, c.cid)[0].tid);
    else autos = L.confs.map((c) => L.ct[c.cid].champ);
    const autoSet = new Set(autos);
    const order = L.teams.map((t) => t.tid).sort((a, b) => pw[b] - pw[a]);
    const atLarge = order.filter((t) => !autoSet.has(t)).slice(0, 76 - autoSet.size);
    const byPw = (a, b) => pw[b] - pw[a];
    const autoSorted = autos.slice().sort(byPw), atSorted = atLarge.slice().sort(byPw);
    const orAuto = autoSorted.slice(-12), orAt = atSorted.slice(-12);
    const orSet = new Set(orAuto.concat(orAt));
    const pairs = [];
    for (let i = 0; i < 12; i += 2) pairs.push({ a: orAt[i], b: orAt[i + 1], kind: "at" });
    for (let i = 0; i < 12; i += 2) pairs.push({ a: orAuto[i], b: orAuto[i + 1], kind: "auto" });
    const slots = autos.concat(atLarge).filter((t) => !orSet.has(t)).map((tid) => ({ tid, r: pw[tid] }))
      .concat(pairs.map((p, i) => ({ or: i, r: (pw[p.a] + pw[p.b]) / 2 })));
    slots.sort((a, b) => b.r - a.r);
    const regions = REGIONS.map((name) => ({ name, seeds: [] }));
    slots.forEach((s, i) => { const line = Math.floor(i / 4), j = i % 4, reg = line % 2 === 0 ? j : 3 - j; s.seed = line + 1; regions[reg].seeds[line] = s; });
    pairs.forEach((p, i) => { const s = slots.find((x) => x.or === i); p.seed = s.seed; p.region = regions.findIndex((r) => r.seeds.includes(s)); });
    const field = autos.concat(atLarge).sort(byPw);
    const seedOf = {}; regions.forEach((r) => r.seeds.forEach((s) => { if (s.tid != null) seedOf[s.tid] = s.seed; }));
    pairs.forEach((p) => { seedOf[p.a] = p.seed; seedOf[p.b] = p.seed; });
    const N = { projected: !!projected, field, autos, atLarge, seedOf, or: pairs.map((p) => ({ a: p.a, b: p.b, sa: p.seed, sb: p.seed, kind: p.kind, region: p.region, w: null, gid: null })), regions: [], ff: [], final: null, champ: null, stage: 0 };
    const ORD = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];
    N.regions = regions.map((r, ri) => {
      const r0 = [];
      for (let i = 0; i < 16; i += 2) {
        const sA = r.seeds[ORD[i] - 1], sB = r.seeds[ORD[i + 1] - 1];
        r0.push({ a: sA.tid ?? null, b: sB.tid ?? null, ora: sA.or ?? null, orb: sB.or ?? null, sa: ORD[i], sb: ORD[i + 1], w: null, gid: null });
      }
      return { name: r.name, rounds: [r0] };
    });
    return N;
  }
  function startNCAA(L) {
    L.ncaa = selectField(L, false);
    L.phase = "ncaa";
    for (const tid of L.ncaa.field) L.ncaaRes[tid] = 1;
    for (const m of L.ncaa.or) { L.ncaaRes[m.a] = 0; L.ncaaRes[m.b] = 0; }
    const u = L.userTid, s = L.ncaa.seedOf[u];
    if (s) { news(L, `Selection Day: ${L.teams[u].region} is in the National Tournament as a ${s} seed.`, true); L.coach.apps++; }
    else news(L, `Selection Day: ${L.teams[u].region} is left out of the National Tournament.`, true);
    news(L, `${L.teams[L.ncaa.field[0]].region} is the No. 1 overall seed.`);
  }
  function ncaaDay(L) {
    const N = L.ncaa, st = N.stage;
    if (st >= 2) ncaaBuild(L, st);
    const ms = stageMatches(N, st);
    scheduleMatches(L, ms, "ncaa", NCAA_ROUNDS[st], true);
    return ms;
  }
  // create the matches of a stage as soon as the stage before it is complete, so the bracket fills in right away
  function ncaaBuild(L, st) {
    const N = L.ncaa, seed = (t) => N.seedOf[t];
    if (st >= 2 && st <= 4) { for (const r of N.regions) if (r.rounds.length < st) r.rounds.push(nextRound(r.rounds[st - 2], seed)); }
    else if (st === 5 && !N.ff.length) { const ew = N.regions.map((r) => r.rounds[3][0].w); N.ff = [{ a: ew[0], b: ew[3], sa: seed(ew[0]), sb: seed(ew[3]), w: null, gid: null }, { a: ew[1], b: ew[2], sa: seed(ew[1]), sb: seed(ew[2]), w: null, gid: null }]; }
    else if (st === 6 && !N.final) N.final = { a: N.ff[0].w, b: N.ff[1].w, sa: seed(N.ff[0].w), sb: seed(N.ff[1].w), w: null, gid: null };
  }
  function ncaaAfter(L, ms) {
    const N = L.ncaa; settle(ms, L);
    for (const m of ms) { if (m.l != null) L.ncaaRes[m.l] = N.stage; if (m.w != null) L.ncaaRes[m.w] = N.stage + 1; }
    if (N.stage === 6) { N.champ = N.final.w; endSeason(L); return; }
    if (N.stage === 0) for (const r of N.regions) for (const m of r.rounds[0]) { if (m.ora != null) m.a = N.or[m.ora].w; if (m.orb != null) m.b = N.or[m.orb].w; }
    N.stage++;
    if (N.stage >= 2) ncaaBuild(L, N.stage);
  }

  // ---------- recruiting ----------
  const STAR_OVR = [0, 33, 39, 46, 53, 60];
  const STAR_SHARE = [0, 0.3, 0.34, 0.25, 0.09, 0.02];
  const PK = [0, 0.5, 1.5, 3, 4.5, 6];
  const TH = [0, 150, 300, 550, 850, 1200];
  const fitStar = (p) => (p >= 85 ? 5 : p >= 66 ? 4 : p >= 46 ? 3 : p >= 26 ? 2 : 1);
  function openSlots(L, tid) { let n = 0; for (const p of L.players) if (p.tid === tid && p.yr < 4 && !p.leave) n++; return Math.max(0, ROSTER_SIZE - n); }
  function newRecruitClass(L) {
    let total = 0; const slots = {};
    for (const t of L.teams) { slots[t.tid] = openSlots(L, t.tid); total += slots[t.tid]; }
    const n = Math.round(total * 1.3), rec = [];
    for (let s = 5; s >= 1; s--) {
      const k = Math.round(n * STAR_SHARE[s]);
      for (let i = 0; i < k; i++) {
        const p = makePlayer(L, -1, 0, STAR_OVR[s] + gauss(0, 2.3), 14 + s);
        Object.assign(p, { stars: s, int: {}, commit: null, th: clamp(gauss(1, 0.28), 0.55, 1.6), no: gauss(0, 4.5), np: gauss(0, 6), comp: p.ovr * 0.6 + p.pot * 0.4 + gauss(0, 2) });
        rec.push(p);
      }
    }
    rec.sort((a, b) => b.stars - a.stars || b.comp - a.comp).forEach((p, i) => (p.rank = i + 1));
    L.recruits = rec;
    for (const t of L.teams) t.tg = [];
    L.plan = {};
  }
  function setBudget(L, t, first) {
    let perf = 12;
    const h = t.hist[t.hist.length - 1];
    if (!first && h) perf = (h.w / Math.max(1, h.w + h.l)) * 25 + (h.ncaa >= 0 ? 6 : 0) + Math.max(0, h.ncaa) * 3;
    t.rbx = [40, Math.round(t.prestige * 0.9), Math.round(perf)];
    t.rb = t.rbx[0] + t.rbx[1] + t.rbx[2];
  }
  function recScore(L, rc, tid) { return (rc.int[tid] || 0) + L.teams[tid].prestige * PK[rc.stars]; }
  function recruitWeek(L, w) {
    const left = {};
    for (const t of L.teams) left[t.tid] = openSlots(L, t.tid);
    for (const rc of L.recruits) if (rc.commit != null) left[rc.commit]--;
    const free = L.recruits.filter((r) => r.commit == null);
    const buckets = [[], [], [], [], [], []]; for (const r of free) buckets[r.stars].push(r);
    const byId = new Map(L.recruits.map((r) => [r.pid, r]));
    const give = (tid, rc, pts) => { rc.int[tid] = (rc.int[tid] || 0) + pts * nearBoost(L.teams[tid], rc); };
    for (const t of L.teams) {
      const ai = t.tid !== L.userTid || L.autoRec;
      const need = left[t.tid];
      if (!ai) continue;
      t.tg = (t.tg || []).filter((id) => { const r = byId.get(id); return r && r.commit == null; });
      if (need <= 0) { t.tg = []; continue; }
      let tries = 0;
      while (t.tg.length < need + 2 && tries++ < 40) {
        const fs = fitStar(t.prestige); let s = fs - (R() < 0.4 ? 1 : 0) + (R() < 0.1 ? 1 : 0); s = clamp(s, 1, 5);
        const b = buckets[s]; if (!b.length) continue;
        let c = null, cs = -1;
        for (let k = 0; k < 4; k++) { const x = b[Math.floor(Math.pow(R(), 1.6) * b.length * 0.9)] || pick(b); const sc = nearBoost(t, x) * (0.7 + R() * 0.6); if (sc > cs) { cs = sc; c = x; } }
        if (!t.tg.includes(c.pid)) t.tg.push(c.pid);
      }
      if (!t.tg.length) continue;
      const wts = t.tg.map((id, i) => 1 + (byId.get(id).stars >= fitStar(t.prestige) ? 0.6 : 0) - i * 0.04);
      const tw = wts.reduce((a, b) => a + b, 0);
      t.tg.forEach((id, i) => give(t.tid, byId.get(id), (t.rb * wts[i]) / tw));
    }
    if (!L.autoRec && left[L.userTid] > 0) {
      const ut = L.teams[L.userTid];
      for (const id of Object.keys(L.plan)) { const r = byId.get(+id); if (!r || r.commit != null) delete L.plan[id]; }
      const tot = Object.values(L.plan).reduce((a, b) => a + b, 0), sc = tot > ut.rb ? ut.rb / tot : 1;
      for (const id in L.plan) give(L.userTid, byId.get(+id), L.plan[id] * sc);
    }
    const f = Math.max(0.2, 1 - 0.036 * w);
    const userTargets = new Set(Object.keys(L.plan).map(Number));
    for (const rc of free) {
      const ids = Object.keys(rc.int).map(Number).filter((tid) => left[tid] > 0);
      if (!ids.length) continue;
      const sc = ids.map((tid) => [tid, recScore(L, rc, tid)]).sort((a, b) => b[1] - a[1]);
      const [bt, bs] = sc[0], ss = sc[1] ? sc[1][1] : 0;
      if (bs >= TH[rc.stars] * f * (rc.th || 1) && bs >= ss * 1.12) {
        rc.commit = bt; rc.cw = w; left[bt]--;
        if (bt === L.userTid) news(L, `${rc.stars}★ ${rc.pos} ${rc.first} ${rc.last} commits to ${L.teams[bt].region}!`, true);
        else if (userTargets.has(rc.pid) || rc.int[L.userTid]) news(L, `Recruiting target ${rc.first} ${rc.last} (${rc.stars}★) commits to ${L.teams[bt].region}.`, true);
        else if (rc.stars === 5) news(L, `5★ ${rc.pos} ${rc.first} ${rc.last} commits to ${L.teams[bt].region}.`);
      }
    }
  }
  function signingDay(L) {
    const left = {};
    for (const t of L.teams) left[t.tid] = ROSTER_SIZE;
    for (const p of L.players) if (p.yr < 4 && !p.leave) left[p.tid]--; // can go negative: a full roster stays full
    for (const rc of L.recruits) if (rc.commit != null) left[rc.commit]--;
    const free = L.recruits.filter((r) => r.commit == null).sort((a, b) => a.rank - b.rank);
    for (const rc of free) {
      // only suitors near his level: a top recruit doesn't sign with a low-major because it sent one letter
      const ids = Object.keys(rc.int).map(Number).filter((tid) => left[tid] > 0 && (tid === L.userTid || fitStar(L.teams[tid].prestige) >= rc.stars - 1));
      let tid = null;
      if (ids.length) tid = ids.sort((a, b) => recScore(L, rc, b) - recScore(L, rc, a))[0];
      else if (rc.stars >= 4) {
        // an unsigned top recruit: a program at his level finds room for him (up to two over the usual limit), favouring schools that recruited him and nearby ones
        const cands = L.teams.filter((t) => t.tid !== L.userTid && fitStar(t.prestige) >= rc.stars - 1 && left[t.tid] > -2).sort((a, b) => b.prestige - a.prestige).slice(0, 10);
        if (cands.length) tid = wpick(cands, (t) => (1 + (rc.int[t.tid] || 0) / 100) * nearBoost(t, rc) ** 3).tid;
      }
      if (tid == null && !ids.length) {
        // nobody with room recruited him: he picks the best program with room among those at his level (the person's school only if they recruited him)
        const open = L.teams.filter((t) => left[t.tid] > 0 && t.tid !== L.userTid);
        if (!open.length) continue;
        const fit = (t) => Math.abs(fitStar(t.prestige) - rc.stars);
        const best = Math.min(...open.map(fit));
        const pool = open.filter((t) => fit(t) <= best + (rc.stars >= 4 ? 0 : 1));
        const short = (rc.stars >= 4 ? pool.sort((a, b) => b.prestige - a.prestige).slice(0, 6) : pool).slice();
        tid = wpick(short, (t) => nearBoost(t, rc) ** 3).tid;
      }
      rc.commit = tid; left[tid]--;
      if (tid === L.userTid) news(L, `Signing day: ${rc.stars}★ ${rc.first} ${rc.last} signs with ${L.teams[tid].region}.`, true);
    }
  }
  function processWeeks(L) {
    const w = Math.floor(dayOffset(Math.min(L.day, DAYS.last)) / 7);
    while (L.week < w) { L.week++; recruitWeek(L, L.week); updatePoll(L); }
  }

  // ---------- advancing ----------
  function userAlive(L) {
    const u = L.userTid;
    if (L.phase === "regular") return true;
    if (L.phase === "conftour") { const br = L.ct[L.teams[u].cid]; if (!br.seeds.includes(u)) return false; return !br.rounds.some((rd) => rd.some((m) => m.l === u)) && br.champ == null; }
    if (L.phase === "ncaa") { if (L.ncaa.seedOf[u] == null || L.ncaa.champ != null) return false; return !ncaaMatches(L.ncaa).some((m) => m.l === u); }
    return false;
  }
  // A day runs in three steps so the postseason can be played one game at a time:
  // prepareDay schedules the day's games, sims happen one by one, finishDay settles brackets and moves the calendar.
  function prepareDay(L) {
    if (L.prep === L.day + ":" + L.phase) return;
    if (L.phase === "conftour") {
      for (const cid in L.ct) { const br = L.ct[cid]; if (br.champ == null) scheduleMatches(L, br.rounds[br.stage], "ct", ctRoundName(br, br.stage), true); }
    } else if (L.phase === "ncaa") ncaaDay(L);
    L.prep = L.day + ":" + L.phase;
  }
  function todaysGames(L) {
    const gs = L.games.filter((g) => g.day === L.day && !g.played);
    if (L.phase === "conftour") { const uc = L.teams[L.userTid].cid; gs.sort((a, b) => (L.teams[b.home].cid === uc) - (L.teams[a.home].cid === uc) || L.teams[a.home].cid - L.teams[b.home].cid || a.gid - b.gid); }
    return gs;
  }
  function stageMatches(N, st) {
    if (st === 0) return N.or;
    if (st <= 4) return N.regions.flatMap((r) => r.rounds[st - 1] || []);
    if (st === 5) return N.ff;
    return N.final ? [N.final] : [];
  }
  function finishDay(L) {
    if (L.phase === "regular") {
      L.day++; processWeeks(L);
      if (L.day > DAYS.confEnd) startConfTourneys(L);
    } else if (L.phase === "conftour") {
      for (const cid in L.ct) {
        const br = L.ct[cid]; if (br.champ != null) continue;
        const rd = br.rounds[br.stage]; settle(rd, L);
        if (rd.every((m) => m.w != null)) {
          if (rd.length === 1) { br.champ = rd[0].w; if (br.champ === L.userTid) { L.coach.ctTitles++; news(L, `${L.teams[br.champ].region} wins the ${L.confs[L.teams[br.champ].cid].name} tournament!`, true); } }
          else { br.rounds.push(nextRound(rd, (t) => br.seeds.indexOf(t) + 1)); br.stage++; }
        }
      }
      L.day++; processWeeks(L);
      if (Object.values(L.ct).every((b) => b.champ != null)) { L.day = DAYS.ncaaStart; startNCAA(L); }
    } else if (L.phase === "ncaa") {
      ncaaAfter(L, stageMatches(L.ncaa, L.ncaa.stage));
      if (L.phase === "ncaa") L.day++;
      processWeeks(L);
    }
    L.prep = null;
  }
  function simOne(L, g) {
    applyBox(L, g, simGame(L, g));
    // settle brackets as games finish so the bracket fills in one game at a time
    if (g.type === "ct") { const br = L.ct[L.teams[g.home].cid]; settle(br.rounds[br.stage], L); }
    if (g.type === "ncaa") settle(stageMatches(L.ncaa, L.ncaa.stage), L);
    return g;
  }
  function playDay(L) {
    let userPlayed = false;
    if (L.phase === "offseason") return { userPlayed, done: true };
    prepareDay(L);
    for (const g of todaysGames(L)) { simOne(L, g); if (g.home === L.userTid || g.away === L.userTid) userPlayed = true; }
    finishDay(L);
    return { userPlayed };
  }
  // one postseason game; returns the game played (or null when the day just closed with nothing left)
  function playOneGame(L) {
    if (L.phase !== "conftour" && L.phase !== "ncaa") { playDay(L); return null; }
    prepareDay(L);
    let gs = todaysGames(L);
    if (!gs.length) { finishDay(L); if (L.phase === "offseason") return null; prepareDay(L); gs = todaysGames(L); if (!gs.length) return null; }
    const g = simOne(L, gs[0]);
    if (!todaysGames(L).length) finishDay(L);
    return g;
  }
  function gamesLeftToday(L) { if (L.phase !== "conftour" && L.phase !== "ncaa") return 0; prepareDay(L); return todaysGames(L).length; }
  function playNextUserGame(L) { let g = 0; while (g++ < 80 && L.phase !== "offseason") { if (playDay(L).userPlayed) return true; if (!userAlive(L) && L.phase !== "regular") return false; } return false; }
  function playDays(L, n) { for (let i = 0; i < n && L.phase !== "offseason"; i++) playDay(L); }
  function playWeek(L) { const start = dayOffset(L.day); let g = 0; do { playDay(L); } while (L.phase !== "offseason" && dayOffset(L.day) < start + 7 && g++ < 20); }
  function playUntil(L, phase) { let g = 0; while (L.phase !== phase && L.phase !== "offseason" && g++ < 100) playDay(L); }
  function playToEnd(L) { let g = 0; while (L.phase !== "offseason" && g++ < 100) playDay(L); }



  // ---------- Hardwood Power Index: tempo-free, opponent- and venue-adjusted ratings ----------
  const HCA = 0.014; // home teams score about 1.4% more efficiently and allow about 1.4% less
  const possOf = (t) => t.fga - t.orb + t.tov + 0.475 * t.fta;
  const HPI_CACHE = new WeakMap();
  function hpi(L) {
    const played = L.games.filter((g) => g.played);
    const key = L.season + ":" + played.length;
    const c = HPI_CACHE.get(L); if (c && c.key === key) return c.v;
    const n = L.teams.length, rawT = new Float64Array(n), gpN = new Float64Array(n);
    for (const t of L.teams) { const a = L.ts[t.tid]; if (a.gp) { rawT[t.tid] = possOf(a) / a.gp; gpN[t.tid] = a.gp; } }
    let totPts = 0, totPos = 0;
    const G = played.map((g) => { const pos = g.pos || ((rawT[g.home] || 68) + (rawT[g.away] || 68)) / 2; totPts += g.hs + g.as; totPos += 2 * pos; return { h: g.home, a: g.away, pos, hs: g.hs, as: g.as, n: !!g.neutral, conf: g.type === "conf", ot: g.ot || 0 }; });
    const avgE = totPos ? (totPts / totPos) * 100 : 102, avgT = G.length ? G.reduce((s, x) => s + x.pos, 0) / G.length : 68;
    // per-team game lists
    const lists = Array.from({ length: n }, () => []);
    for (const x of G) {
      const hf = x.n ? 1 : 1 + HCA, af = x.n ? 1 : 1 - HCA;
      lists[x.h].push({ opp: x.a, oe: (x.hs / x.pos) * 100 / hf, de: (x.as / x.pos) * 100 * hf, pos: x.pos, conf: x.conf, won: x.hs > x.as, mg: x.hs - x.as, ot: x.ot });
      lists[x.a].push({ opp: x.h, oe: (x.as / x.pos) * 100 / af, de: (x.hs / x.pos) * 100 * af, pos: x.pos, conf: x.conf, won: x.as > x.hs, mg: x.as - x.hs, ot: x.ot });
    }
    // preseason prior from roster strength, fading as games are played
    const prior = L.teams.map((t) => (teamRating(L, t.tid) - 52) * 1.15);
    let O = new Float64Array(n).fill(avgE), D = new Float64Array(n).fill(avgE), Tp = new Float64Array(n).fill(avgT);
    for (let it = 0; it < 25; it++) {
      const nO = new Float64Array(n), nD = new Float64Array(n), nT = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const gl = lists[i];
        if (!gl.length) { nO[i] = avgE + prior[i] / 2; nD[i] = avgE - prior[i] / 2; nT[i] = avgT; continue; }
        let so = 0, sd = 0, st = 0;
        for (const x of gl) { so += x.oe * avgE / D[x.opp]; sd += x.de * avgE / O[x.opp]; st += x.pos * avgT / Tp[x.opp]; }
        const k = gl.length, w = 4; // prior worth about four games
        nO[i] = (so + w * (avgE + prior[i] / 2)) / (k + w); nD[i] = (sd + w * (avgE - prior[i] / 2)) / (k + w); nT[i] = (st + w * avgT) / (k + w);
      }
      O = nO; D = nD; Tp = nT;
    }
    const em = Array.from({ length: n }, (_, i) => O[i] - D[i]);
    // HPI score: a 0-100 scale built from the adjusted margin; 50 is an average D1 team, the 90s are title contenders
    const score = (e) => normCdf(e / 19) * 100;
    const sc = em.map(score);
    const rows = L.teams.map((t) => {
      const i = t.tid, a = L.ts[i], o = L.os[i], r = L.rec[i], gl = lists[i], gp = a.gp || 0;
      const pa = possOf(a), po = possOf(o), safe = (x, y) => (y ? x / y : 0);
      const pyth = (x, y) => (x ** 10.25) / (x ** 10.25 + y ** 10.25);
      // luck: wins beyond what each game's opponent-adjusted expectation says
      let expW = 0; for (const x of gl) { const mg = (em[i] - em[x.opp]) * (Tp[i] * Tp[x.opp] / avgT) / 100; expW += normCdf(mg / 11); }
      const sos = gl.length ? gl.reduce((s, x) => s + em[x.opp], 0) / gl.length : 0;
      const nc = gl.filter((x) => !x.conf), ncsos = nc.length ? nc.reduce((s, x) => s + em[x.opp], 0) / nc.length : 0;
      const sched = gl.length ? gl.reduce((s, x) => s + sc[x.opp], 0) / gl.length : 50, ncsched = nc.length ? nc.reduce((s, x) => s + sc[x.opp], 0) / nc.length : 50;
      // game-by-game performance, adjusted for the opponent (points per 100 possessions vs. average)
      const am = gl.map((x) => x.oe * avgE / D[x.opp] - x.de * avgE / O[x.opp]);
      const mean = am.length ? am.reduce((s2, v) => s2 + v, 0) / am.length : 0;
      const sd = am.length > 1 ? Math.sqrt(am.reduce((s2, v) => s2 + (v - mean) ** 2, 0) / (am.length - 1)) : 0;
      const last = am.slice(-10), mom = last.length >= 5 ? last.reduce((s2, v) => s2 + v, 0) / last.length - mean : 0;
      const close = gl.filter((x) => Math.abs(x.mg) <= 5 || x.ot), cw = close.filter((x) => x.won).length;
      // roster profile, weighted by minutes played this season
      let mins = 0, hsum = 0, xsum = 0, bench = 0;
      for (const p of L.players) { if (p.tid !== i) continue; const s = p.stats[L.season]; if (!s || !s.min) continue; mins += s.min; hsum += s.min * p.hgt; xsum += s.min * (p.yr - 1); if (s.gs < s.gp / 2) bench += s.min; }
      return {
        tid: i, gp, w: r.w, l: r.l, score: sc[i], expW: expW, expL: gl.length - expW, fortune: r.w - expW, sched, ncsched, consist: sd, momentum: mom, cw, cl: close.length - cw, clutch: close.length ? cw / close.length : 0.5,
        adjEM: em[i], adjO: O[i], adjD: D[i], adjT: Tp[i], rawO: safe(a.pts, pa) * 100, rawD: safe(o.pts, po) * 100, rawT: rawT[i] || 0,
        luck: gp ? (r.w - expW) / gp : 0, pyth: pyth(O[i], D[i]), sos, ncsos,
        efg: safe(a.fgm + 0.5 * a.tpm, a.fga) * 100, tov: safe(a.tov, pa) * 100, orb: safe(a.orb, a.orb + o.drb) * 100, ftr: safe(a.fta, a.fga) * 100,
        defg: safe(o.fgm + 0.5 * o.tpm, o.fga) * 100, dtov: safe(o.tov, po) * 100, dorb: safe(o.orb, o.orb + a.drb) * 100, dftr: safe(o.fta, o.fga) * 100,
        tpr: safe(a.tpa, a.fga) * 100, tp: safe(a.tpm, a.tpa) * 100, twp: safe(a.fgm - a.tpm, a.fga - a.tpa) * 100, ft: safe(a.ftm, a.fta) * 100,
        ast: safe(a.ast, a.fgm) * 100, blk: safe(a.blk, o.fga - o.tpa) * 100, stl: safe(a.stl, po) * 100, dtp: safe(o.tpm, o.tpa) * 100,
        hgt: mins ? hsum / mins : 0, exp: mins ? xsum / mins : 0, bench: mins ? (bench / mins) * 100 : 0,
      };
    });
    const v = { rows, avgE, avgT, games: G.length, O, D, T: Tp, em, sc };
    HPI_CACHE.set(L, { key, v });
    return v;
  }
  function normCdf(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  // projected score and win probability from HPI
  function predict(L, home, away, neutral) {
    const H = hpi(L), f = neutral ? 1 : 1 + HCA, tempo = (H.T[home] * H.T[away]) / H.avgT;
    const hs = (H.O[home] * H.D[away] / H.avgE) * f * tempo / 100, as = (H.O[away] * H.D[home] / H.avgE) / f * tempo / 100;
    return { hs, as, tempo, pHome: normCdf((hs - as) / 11) };
  }


  // ---------- injuries ----------
  const INJ_RATE = 0.00022; // per minute played: a starter has about a 0.7% chance per game
  const INJ = [["Ankle sprain", 1, 4], ["Bruised knee", 1, 3], ["Back spasms", 1, 3], ["Concussion", 2, 6], ["Hamstring strain", 2, 8], ["Sprained wrist", 2, 6], ["Groin strain", 3, 8], ["High ankle sprain", 4, 10], ["Broken hand", 6, 14], ["Stress fracture", 8, 18], ["Torn meniscus", 99, 99], ["Torn ACL", 99, 99], ["Broken foot", 99, 99]];
  function injure(L, p, g) {
    if (p.inj) return;
    const x = R(), pool = x < 0.62 ? INJ.slice(0, 4) : x < 0.92 ? INJ.slice(3, 10) : INJ.slice(10);
    const [type, lo, hi] = pick(pool);
    const games = lo === 99 ? 99 : rint(lo, hi);
    p.inj = { type, g: games, s: L.season, day: g.day };
    (L.injList || (L.injList = [])).push(p.pid);
    if (p.tid === L.userTid) news(L, `${p.first} ${p.last} is out ${games === 99 ? "for the season" : games === 1 ? "about a game" : `about ${games} games`} (${type.toLowerCase()}).`, true);
  }
  // each time a team plays, its injured players get one game closer to returning
  function healTick(L, g) {
    if (!L.injList || !L.injList.length) return;
    const keep = [];
    for (const pid of L.injList) {
      const p = playerById(L, pid);
      if (!p || !p.inj) continue;
      if ((p.tid === g.home || p.tid === g.away) && p.inj.day !== g.day && p.inj.g < 99) { p.inj.g--; if (p.inj.g <= 0) { delete p.inj; if (p.tid === L.userTid) news(L, `${p.first} ${p.last} is back from injury.`, true); continue; } }
      keep.push(pid);
    }
    L.injList = keep;
  }
  function playerById(L, pid) { let pmap = PM.get(L); if (!pmap) { pmap = new Map(); PM.set(L, pmap); } let p = pmap.get(pid); if (!p || p.pid !== pid) { p = L.players.find((q) => q.pid === pid); if (p) pmap.set(pid, p); } return p; }

  // ---------- redshirts ----------
  // A player can sit out one season without using a year of eligibility, if he hasn't played more than 4 games that season.
  function canRedshirt(L, p) { const s = p.stats[L.season]; return p.yr === 1 && !p.rsUsed && !p.transfer && L.phase === "regular" && (!s || s.gp <= 4); } // freshmen only; injured players of any class can still get a medical redshirt
  function setRedshirt(L, pid, on) {
    const p = playerById(L, pid); if (!p) return false;
    if (on) { if (!canRedshirt(L, p)) return false; p.rs = true; }
    else { if (L.phase !== "regular") return false; p.rs = false; }
    return true;
  }
  function aiRedshirts(L) {
    for (const t of L.teams) {
      if (t.tid === L.userTid) continue;
      const ps = roster(L, t.tid);
      for (const p of ps.slice(11)) if (p.yr === 1 && !p.rsUsed && p.pot - p.ovr >= 10 && R() < 0.12) p.rs = true;
    }
  }
  const classLabel = (p) => (p.rsUsed && !p.rs ? "RS " : "") + (YR[p.yr] || "GR");

  // ---------- record book ----------
  const GSTATS = [["pts", "Points"], ["reb", "Rebounds"], ["ast", "Assists"], ["stl", "Steals"], ["blk", "Blocks"], ["tpm", "Threes made"]];
  const SSTATS = [["ppg", "Points per game"], ["rpg", "Rebounds per game"], ["apg", "Assists per game"], ["spg", "Steals per game"], ["bpg", "Blocks per game"], ["pts", "Total points"], ["tpm", "Threes made"]];
  const CSTATS = [["pts", "Points"], ["reb", "Rebounds"], ["ast", "Assists"], ["stl", "Steals"], ["blk", "Blocks"], ["tpm", "Threes made"], ["gp", "Games played"]];
  const TOPN = 25; // single-game and record lists keep the top 25
  function rb(L) {
    if (!L.rb) L.rb = { game: {}, season: {}, career: {}, team: { gpts: [], margin: [], wins: [], pct: [], streak: [], ppg: [] } };
    return L.rb;
  }
  function pushTop(list, entry, n) {
    if (list.length >= n && entry.v <= list[list.length - 1].v) return false;
    list.push(entry); list.sort((a, b) => b.v - a.v); if (list.length > n) list.length = n;
    return list[0] === entry;
  }
  const who = (L, p, tid) => ({ pid: p.pid, name: p.first + " " + p.last, tid, team: L.teams[tid].region });
  function gameRecords(L, g, p, row, tid, opp) {
    const R0 = rb(L), t = L.teams[tid];
    const vals = { pts: row.pts, reb: row.orb + row.drb, ast: row.ast, stl: row.stl, blk: row.blk, tpm: row.tpm };
    for (const [k] of GSTATS) {
      const v = vals[k]; if (!v) continue;
      const list = R0.game[k] || (R0.game[k] = []);
      if (list.length < TOPN || v > list[list.length - 1].v) {
        const top = pushTop(list, Object.assign({ v, season: L.season, day: g.day, gid: g.gid, opp: L.teams[opp].region }, who(L, p, tid)), TOPN);
        if (top && L.history.length) news(L, `National record: ${p.first} ${p.last} of ${t.region} has ${v} ${k === "tpm" ? "threes" : GSTATS.find((x) => x[0] === k)[1].toLowerCase()} against ${L.teams[opp].region}.`, tid === L.userTid);
      }
      const b = t.best || (t.best = {});
      if (!b["g_" + k] || v > b["g_" + k].v) b["g_" + k] = Object.assign({ v, season: L.season, opp: L.teams[opp].region, gid: g.gid }, who(L, p, tid));
    }
  }
  function teamGameRecords(L, g, box) {
    const R0 = rb(L).team;
    for (let i = 0; i < 2; i++) {
      const bt = box.teams[i], ob = box.teams[1 - i], t = L.teams[bt.tid];
      const e = { tid: bt.tid, team: t.region, opp: L.teams[ob.tid].region, score: `${bt.score}–${ob.score}`, season: L.season, day: g.day, gid: g.gid };
      pushTop(R0.gpts, Object.assign({ v: bt.score }, e), TOPN);
      if (bt.score > ob.score) pushTop(R0.margin, Object.assign({ v: bt.score - ob.score }, e), TOPN);
      const b = t.best || (t.best = {});
      if (!b.t_pts || bt.score > b.t_pts.v) b.t_pts = Object.assign({ v: bt.score }, e);
      if (bt.score > ob.score && (!b.t_margin || bt.score - ob.score > b.t_margin.v)) b.t_margin = Object.assign({ v: bt.score - ob.score }, e);
    }
  }
  function seasonVals(s) { return { ppg: s.pts / s.gp, rpg: (s.orb + s.drb) / s.gp, apg: s.ast / s.gp, spg: s.stl / s.gp, bpg: s.blk / s.gp, pts: s.pts, tpm: s.tpm }; }
  function seasonRecords(L) {
    const R0 = rb(L);
    for (const p of L.players) {
      const s = p.stats[L.season]; if (!s || s.gp < 15) continue;
      const v = seasonVals(s), t = L.teams[p.tid];
      for (const [k] of SSTATS) {
        const list = R0.season[k] || (R0.season[k] = []);
        pushTop(list, Object.assign({ v: v[k], season: L.season, gp: s.gp, yr: p.yr }, who(L, p, p.tid)), TOPN);
        const b = t.best || (t.best = {});
        if (!b["s_" + k] || v[k] > b["s_" + k].v) b["s_" + k] = Object.assign({ v: v[k], season: L.season }, who(L, p, p.tid));
      }
    }
    const T0 = R0.team;
    for (const t of L.teams) {
      const r = L.rec[t.tid], gp = r.w + r.l; if (!gp) continue;
      let best = 0, cur = 0; for (const c of r.last) { cur = c === "W" ? cur + 1 : 0; best = Math.max(best, cur); }
      const e = { tid: t.tid, team: t.region, season: L.season, rec: `${r.w}–${r.l}` };
      pushTop(T0.wins, Object.assign({ v: r.w }, e), TOPN);
      if (gp >= 25) pushTop(T0.pct, Object.assign({ v: r.w / gp }, e), TOPN);
      pushTop(T0.streak, Object.assign({ v: best }, e), TOPN);
      pushTop(T0.ppg, Object.assign({ v: r.pf / gp }, e), TOPN);
      const b = t.best || (t.best = {});
      if (!b.t_wins || r.w > b.t_wins.v) b.t_wins = Object.assign({ v: r.w }, e);
      if (!b.t_streak || best > b.t_streak.v) b.t_streak = Object.assign({ v: best }, e);
    }
  }
  function careerTotals(p) {
    const c = { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tpm: 0, min: 0, seasons: 0 };
    for (const y in p.stats) { const s = p.stats[y]; c.gp += s.gp; c.pts += s.pts; c.reb += s.orb + s.drb; c.ast += s.ast; c.stl += s.stl; c.blk += s.blk; c.tpm += s.tpm; c.min += s.min; if (s.gp) c.seasons++; }
    return c;
  }
  function careerRecords(L, p) {
    const R0 = rb(L), c = careerTotals(p), t = L.teams[p.tid];
    for (const [k] of CSTATS) {
      const list = R0.career[k] || (R0.career[k] = []);
      pushTop(list, Object.assign({ v: c[k], last: L.season, seasons: c.seasons }, who(L, p, p.tid)), 25);
      const b = t.best || (t.best = {});
      if (!b["c_" + k] || c[k] > b["c_" + k].v) b["c_" + k] = Object.assign({ v: c[k], last: L.season }, who(L, p, p.tid));
    }
  }

  // ---------- life after college: departures, pro draft, alumni ----------
  // fictional pro franchises (real cities, invented names)
  const PRO_TEAMS = ["Atlanta Firebirds", "Boston Harbormen", "Brooklyn Bridges", "Charlotte Pilots", "Chicago Gale", "Cleveland Foundry", "Dallas Wranglers", "Denver Peaks", "Detroit Motormen", "Houston Launch", "Indianapolis Racers", "Kansas City Stampede", "Las Vegas Neon", "Los Angeles Surf", "Memphis Rivermen", "Miami Tides", "Milwaukee Brewcats", "Minneapolis Frost", "Nashville Sound", "New Orleans Brass", "New York Knights", "Oakland Redwoods", "Oklahoma City Twisters", "Orlando Orbit", "Philadelphia Founders", "Phoenix Flare", "Portland Rainmakers", "San Antonio Vaqueros", "Seattle Squall", "Toronto Northmen"];
  // How pro teams see a player: mostly upside and age, then current ability, size and production.
  // Like real drafts, young high-ceiling players go first; seniors are proven but have less room to grow.
  const PRO_YOUTH = [0, 4, 3, 1.5, 0, -1];
  function proScore(L, p) {
    const s = p.stats[L.season], ppg = s && s.gp ? s.pts / s.gp : 0;
    if (p.dn == null) p.dn = Math.round(gauss(0, 2.5) * 10) / 10; // scouts' lasting opinion of him
    return 0.45 * p.ovr + 0.55 * p.pot + (PRO_YOUTH[p.yr] ?? -1) + ppg * 0.12 + (p.hgt - 78) * 0.35 + p.dn;
  }
  function decideDepartures(L) {
    const u = L.userTid;
    // the draft board: every eligible player ranked the way pro teams see him
    const elig = L.players.filter((p) => { delete p.leave; if (p.rs) return false; const medical = p.inj && p.inj.g === 99 && p.inj.s === L.season && (p.stats[L.season]?.gp || 0) <= 9 && !p.rsUsed; return !medical; });
    const board = elig.map((p) => ({ p, v: proScore(L, p) })).sort((a, b) => b.v - a.v);
    board.forEach((x, i) => (x.p.proj = i + 1));
    for (const { p } of board) {
      if (p.yr >= 4) { p.leave = "grad"; continue; }
      const r = p.proj;
      // projected high picks almost always go; fringe prospects usually stay; a few leave too early anyway
      const go = r <= 5 ? 0.97 : r <= 14 ? 0.92 : r <= 30 ? 0.8 : r <= 45 ? 0.5 : r <= 60 ? 0.3 : r <= 90 ? 0.12 : r <= 150 ? 0.03 : 0;
      if (R() < go) { p.leave = "early"; if (p.tid === u) news(L, `${p.first} ${p.last} declares for the pro draft${p.yr === 1 ? " after one season" : ""}${r <= 30 ? ` (projected first-round pick)` : ""}.`, true); }
    }
    for (const p of L.players) delete p.proj;
  }
  function runDraft(L) {
    const pool = L.players.filter((p) => p.leave).map((p) => ({ p, v: proScore(L, p) + gauss(0, 1.5) })).sort((a, b) => b.v - a.v);
    const order = shuffle(PRO_TEAMS.slice());
    const picks = [];
    for (let i = 0; i < 60 && i < pool.length; i++) {
      const { p } = pool[i], s = p.stats[L.season] || blankLine(), team = order[i % 30];
      p.pro = { season: L.season, pick: i + 1, round: i < 30 ? 1 : 2, team };
      picks.push({ pick: i + 1, round: i < 30 ? 1 : 2, team, pid: p.pid, name: p.first + " " + p.last, tid: p.tid, school: L.teams[p.tid].region, pos: p.pos, cls: classLabel(p), early: p.leave === "early", ovr: p.ovr, pot: p.pot, ppg: s.gp ? +(s.pts / s.gp).toFixed(1) : 0, rpg: s.gp ? +((s.orb + s.drb) / s.gp).toFixed(1) : 0, apg: s.gp ? +(s.ast / s.gp).toFixed(1) : 0 });
      if (p.tid === L.userTid) news(L, `${p.first} ${p.last} is drafted No. ${i + 1} overall by the ${team}.`, true);
    }
    (L.drafts || (L.drafts = {}))[L.season] = picks;
    if (picks[0]) news(L, `${picks[0].name} of ${picks[0].school} goes No. 1 in the pro draft.`);
    return picks;
  }
  function archiveAlumni(L) {
    const A = L.alumni || (L.alumni = {});
    const honored = new Set(); for (const s in L.awards || {}) { const a = L.awards[s]; for (const k of ["poy", "foy", "mop"]) if (a[k]) honored.add(a[k].pid); for (const c in a.conf || {}) for (const k of ["poy", "foy"]) if (a.conf[c][k]) honored.add(a.conf[c][k].pid); }
    for (const p of L.players) if (p.leave) careerRecords(L, p);
    // record holders stay clickable too: national record book and every program's own records
    const rbk = L.rb || {};
    for (const grp of [rbk.game, rbk.season, rbk.career]) for (const k in grp || {}) for (const x of grp[k] || []) if (x && x.pid != null) honored.add(x.pid);
    for (const t of L.teams) for (const k in t.best || {}) { const x = t.best[k]; if (x && x.pid != null && (k.startsWith("s_") || k.startsWith("c_"))) honored.add(x.pid); } // program season and career records
    if (!L.past) { L.past = {}; L.pastSince = L.history.length ? L.season : 0; } // seasons before pastSince may miss role players who left earlier
    const past = L.past;
    for (const p of L.players) {
      if (!p.leave) continue;
      if (!(p.pro || p.tid === L.userTid || honored.has(p.pid))) {
        // everyone else keeps a slim line per season so past rosters stay complete: [team, games, minutes, points, rebounds, assists]
        const s = {}; for (const y in p.stats) { const x = p.stats[y]; if (x) s[y] = [x.tid, x.gp, x.min, x.pts, x.orb + x.drb, x.ast]; }
        past[p.pid] = [p.first + " " + p.last, p.pos, s, p.yr, L.season]; // class and season when he left, to work out his class in earlier years
        continue;
      }
      A[p.pid] = { pid: p.pid, first: p.first, last: p.last, pos: p.pos, hgt: p.hgt, town: p.town, tid: p.tid, school: L.teams[p.tid].region, left: L.season, how: p.leave, cls: classLabel(p), ovr: p.ovr, pot: p.pot, stars: p.stars || null, stats: p.stats, awards: p.awards || [], pro: p.pro || null };
    }
  }

  // ---------- awards ----------
  const gmsc = (s) => s.pts + 0.4 * s.fgm - 0.7 * s.fga - 0.4 * (s.fta - s.ftm) + 0.7 * s.orb + 0.3 * s.drb + s.stl + 0.7 * s.ast + 0.7 * s.blk - 0.4 * s.pf - s.tov;
  function awardScore(L, p, natl) {
    const s = p.stats[L.season]; if (!s || !s.gp) return -1e9;
    const r = L.rec[p.tid], tg = r.w + r.l;
    if (s.gp < Math.max(5, tg * 0.6)) return -1e9;
    const wp = tg ? r.w / tg : 0, net = natl ? (L.power ? 0 : 0) : 0;
    // national honors lean harder on winning: a big scorer on a losing team rarely wins Player of the Year
    return (gmsc(s) / s.gp) * (natl ? 0.35 + 1.1 * wp : 0.72 + 0.56 * wp) + (natl ? Math.max(0, power(L)[p.tid]) * 0.35 : 0) + net;
  }
  function snap(L, p, extra) {
    const s = p.stats[L.season] || blankLine(), t = L.teams[p.tid];
    return Object.assign({ pid: p.pid, name: p.first + " " + p.last, tid: p.tid, team: t.region, abbrev: t.abbrev, pos: p.pos, yr: p.yr, ppg: s.gp ? +(s.pts / s.gp).toFixed(1) : 0, rpg: s.gp ? +((s.orb + s.drb) / s.gp).toFixed(1) : 0, apg: s.gp ? +(s.ast / s.gp).toFixed(1) : 0 }, extra || {});
  }
  function give(L, p, name) { (p.awards || (p.awards = [])).push({ s: L.season, a: name }); }
  function bestOf(L, list, natl) { let best = null, bs = -1e9; for (const p of list) { const sc = awardScore(L, p, natl); if (sc > bs) { bs = sc; best = p; } } return best; }
  function confAwards(L) {
    const A = L.awards[L.season] || (L.awards[L.season] = { conf: {} });
    for (const c of L.confs) {
      const set = new Set(c.tids), ps = L.players.filter((p) => set.has(p.tid));
      const poy = bestOf(L, ps), foy = bestOf(L, ps.filter((p) => p.yr === 1));
      A.conf[c.cid] = { poy: poy ? snap(L, poy) : null, foy: foy ? snap(L, foy) : null };
      if (poy) give(L, poy, c.abbrev + " Player of the Year");
      if (foy) give(L, foy, c.abbrev + " Freshman of the Year");
      const u = L.userTid;
      if (c.tids.includes(u)) {
        if (poy) news(L, `${poy.first} ${poy.last} (${L.teams[poy.tid].region}) is ${c.name} Player of the Year.`, poy.tid === u);
        if (foy) news(L, `${foy.first} ${foy.last} (${L.teams[foy.tid].region}) is ${c.name} Freshman of the Year.`, foy.tid === u);
      }
    }
  }
  function nationalAwards(L) {
    const A = L.awards[L.season] || (L.awards[L.season] = { conf: {} });
    const poy = bestOf(L, L.players, true), foy = bestOf(L, L.players.filter((p) => p.yr === 1), true);
    if (poy) { A.poy = snap(L, poy); give(L, poy, "National Player of the Year"); news(L, `${poy.first} ${poy.last} of ${L.teams[poy.tid].region} is the National Player of the Year.`, poy.tid === L.userTid); }
    if (foy) { A.foy = snap(L, foy); give(L, foy, "National Freshman of the Year"); news(L, `${foy.first} ${foy.last} of ${L.teams[foy.tid].region} is the National Freshman of the Year.`, foy.tid === L.userTid); }
    // Most Outstanding Player: tournament production, weighted toward the champion and runner-up
    const N = L.ncaa, tot = new Map();
    for (const gid in L.boxes) {
      const b = L.boxes[gid]; if (b.type !== "ncaa" || b.season !== L.season) continue;
      const late = b.round === "Final Weekend" || b.round === "Final Four" || b.round === "Championship" ? 1.5 : 1;
      for (const bt of b.teams) for (const r of bt.rows) { const t = tot.get(r.pid) || { pid: r.pid, tid: bt.tid, g: 0, sc: 0, pts: 0, reb: 0, ast: 0 }; t.g++; t.sc += gmsc(r) * late; t.pts += r.pts; t.reb += r.orb + r.drb; t.ast += r.ast; tot.set(r.pid, t); }
    }
    let best = null, bs = -1e9;
    for (const t of tot.values()) { const w = t.tid === N.champ ? 1.3 : (N.final && (t.tid === N.final.a || t.tid === N.final.b)) ? 1.0 : 0.6; const sc = t.sc * w; if (sc > bs) { bs = sc; best = t; } }
    if (best) {
      const p = L.players.find((q) => q.pid === best.pid);
      if (p) { A.mop = snap(L, p, { tg: best.g, tppg: +(best.pts / best.g).toFixed(1), trpg: +(best.reb / best.g).toFixed(1), tapg: +(best.ast / best.g).toFixed(1) }); give(L, p, "Tournament Most Outstanding Player"); news(L, `${p.first} ${p.last} of ${L.teams[p.tid].region} is the National Tournament's Most Outstanding Player.`, p.tid === L.userTid); }
    }
  }

  // ---------- season end / offseason ----------
  function endSeason(L) {
    const N = L.ncaa, u = L.userTid;
    if (!L.awards) L.awards = {};
    nationalAwards(L);
    seasonRecords(L);
    decideDepartures(L); // before signing day, so programs losing players early have room for late signees
    signingDay(L);
    runDraft(L);
    archiveAlumni(L);
    const ffTeams = N.ff.flatMap((m) => [m.a, m.b]);
    const confChamps = {}; for (const cid in L.ct) confChamps[cid] = L.ct[cid].champ;
    const regChamps = L.confs.map((c) => confStandings(L, c.cid)[0].tid);
    for (const t of L.teams) {
      const r = L.rec[t.tid];
      const st = confStandings(L, t.cid).find((x) => x.tid === t.tid);
      t.hist.push({ season: L.season, w: r.w, l: r.l, cw: r.cw, cl: r.cl, seed: st.seed, ct: confChamps[t.cid] === t.tid, ncaa: N.seedOf[t.tid] != null ? L.ncaaRes[t.tid] : -1, nseed: N.seedOf[t.tid] ?? null, prestige: t.prestige });
    }
    const uh = L.teams[u].hist[L.teams[u].hist.length - 1];
    if (ffTeams.includes(u)) L.coach.ff++;
    if (N.champ === u) L.coach.titles++;
    L.coach.seasons++;
    L.history.push({ season: L.season, champ: N.champ, runner: N.final.w === N.final.a ? N.final.b : N.final.a, ff: ffTeams, user: Object.assign({ tid: u }, uh), confChamps, regChamps });
    L.phase = "offseason";
    news(L, `${L.teams[N.champ].region} wins the national championship!`);
    openPortal(L);
  }
  function progress(p) {
    const base = [0, 4.4, 3.2, 2.4, 1.6][p.yr] || 1, room = (p.pot - p.ovr) * 0.2, dev = gauss(0, 2.5);
    for (const k of RKEYS) p.r[k] = Math.round(clamp(p.r[k] + (base + room) * rnd(0.5, 1.5) * 0.7 + dev + gauss(0, 2.2) + (k === "ath" ? -1 : 0), 10, 99));
    const prev = p.ovr; p.ovr = calcOvr(p.r);
    p.pot = Math.round(clamp(Math.max(p.ovr, p.pot + gauss(0, 2) - 1), p.ovr, 99));
    return p.ovr - prev;
  }
  // Prestige moves when a program beats or misses what's expected of a program at its level.
  // Results are measured against programs of the same tier (so a whole tier can't drift up or down together),
  // each program drifts back toward a mix of its own historical level and its conference's usual level,
  // and gains get harder near the top, though sustained title runs can still reach the high 90s.
  function rawPrestigeDelta(t, h) {
    const p = t.prestige, wp = h.w / Math.max(1, h.w + h.l);
    const expWp = clamp(0.24 + p * 0.0064, 0.24, 0.87);
    const expRes = p >= 88 ? 3 : p >= 74 ? 2 : p >= 60 ? 1 : p >= 50 ? 0.4 : 0; // NCAA rounds index: 1 = Round of 64
    let d = (wp - expWp) * 15;
    if (h.ncaa >= 0) d += (h.ncaa - expRes) * 1.1 + (p < 55 ? 1.5 : 0);
    else if (p >= 62) d -= 1.5;
    if (h.ncaa >= 5) d += 1;      // Final Weekend
    if (h.ncaa === 7) d += 3.5;   // national title
    return d;
  }
  function updatePrestige(L) {
    const raw = new Map(), tierSum = [0, 0, 0, 0, 0], tierN = [0, 0, 0, 0, 0];
    for (const t of L.teams) { const tier = L.confs[t.cid].tier, d = rawPrestigeDelta(t, t.hist[t.hist.length - 1]); raw.set(t.tid, d); tierSum[tier] += d; tierN[tier]++; }
    const confBase = L.confs.map((c) => c.tids.reduce((s, tid) => s + (L.teams[tid].base ?? L.teams[tid].prestige), 0) / c.tids.length);
    for (const t of L.teams) {
      const c = L.confs[t.cid], tier = c.tier, p = t.prestige;
      let d = raw.get(t.tid) - (tierN[tier] ? tierSum[tier] / tierN[tier] : 0);
      if (d > 0) d *= clamp((100 - p) / 30, 0.3, 1);
      const home = (t.base ?? TIER_MEAN[tier]) * 0.88 + confBase[t.cid] * 0.12;
      let np = p + d + (home - p) * 0.12;
      if (np > 94) np = 94 + (np - 94) * 0.55;
      t.prestige = Math.round(clamp(np, 3, 98));
    }
  }
  // one-time repair for leagues saved before the prestige fix
  function fixPrestige(L) {
    if (L.presFix) return false;
    L.presFix = 1;
    const hi = L.teams.filter((t) => t.prestige >= 95).length;
    if (hi <= 6) return false;
    for (const t of L.teams) { const home = (t.base ?? TIER_MEAN[L.confs[t.cid].tier]); if (t.prestige > home + 8) t.prestige = Math.round(home + 8 + (t.prestige - home - 8) * 0.35); t.prestige = Math.min(t.prestige, 96); }
    return true;
  }

  // ---------- transfer portal (offseason, between the draft and next season) ----------
  // Simple by design: players enter for clear reasons, you get one "convince to stay", and you bid with recruiting points once.
  const PORTAL_WEEKS = 3;   // portal budget = three weeks of recruiting points
  const PORTAL_AI = 25;     // what an interested AI program is worth, in points
  const PORTAL_K = 0.6;     // how much one of your points counts
  function portalTeams(L) {
    // returning players (not graduating, not early entries, not in the portal) plus signed recruits
    const T = L.teams.map(() => ({ ovr: [], n: 0 }));
    for (const p of L.players) if (!p.leave && !p.portal) { T[p.tid].ovr.push(p.ovr); T[p.tid].n++; }
    for (const rc of L.recruits) if (rc.commit != null) T[rc.commit].n++;
    for (const x of T) x.ovr.sort((a, b) => b - a);
    return T;
  }
  function portalOpenings(L, tid, T) { T = T || portalTeams(L); return ROSTER_SIZE - T[tid].n; }
  function portalAppeal(L, p, tid, T) {
    const t = L.teams[tid], ahead = T[tid].ovr.filter((o) => o > p.ovr).length;
    // the better the player, the more the program's name matters to him
    return t.prestige * (0.45 + Math.max(0, p.ovr - 50) * 0.025) + Math.max(0, 8 - ahead) * 4 + (nearBoost(t, p) - 1) * 30;
  }
  // a player well above a school's level barely listens to its offers: each 4 rating points over its level cuts their value by 40%
  function portalMult(L, p, tid) { const gap = p.ovr - teamTalent(L.teams[tid].prestige, p.yr + 1); return gap <= 4 ? 1 : Math.pow(0.6, (gap - 4) / 4); }
  const aiFits = (L, p, tid) => { const lvl = teamTalent(L.teams[tid].prestige, p.yr + 1); return p.ovr >= lvl - 6 && p.ovr <= lvl + 14; };
  function openPortal(L) {
    const all = L.players.map((p) => p.ovr).sort((a, b) => a - b), med = all[all.length >> 1];
    const P = { season: L.season, ids: [], mine: [], keep: null, offers: {}, budget: Math.round(L.teams[L.userTid].rb * PORTAL_WEEKS), done: false, moves: [] };
    for (const t of L.teams) {
      const ros = L.players.filter((p) => p.tid === t.tid && !p.leave).sort((a, b) => b.ovr - a.ovr);
      ros.forEach((p, i) => {
        if (p.yr >= 4) return;
        const st = p.stats[L.season], mpg = st && st.gp ? st.min / st.gp : 0, lvl = teamTalent(t.prestige, p.yr);
        let pr = 0.015;
        if (i >= 7 && mpg < 14 && p.ovr >= med) { pr += 0.22; p.why = "bench"; }               // good enough to play, buried on the bench
        if (p.ovr >= lvl + 8 && t.prestige < 60) { pr += 0.12 + (p.ovr - lvl - 8) * 0.02; p.why = "up"; } // outgrew his program
        if (p.walkon) pr *= 0.3;
        if (R() < Math.min(0.6, pr)) { p.portal = true; p.why = p.why || "fresh start"; P.ids.push(p.pid); if (t.tid === L.userTid) P.mine.push(p.pid); }
        else delete p.why;
      });
    }
    L.portal = P;
    news(L, `The transfer portal opens: ${P.ids.length} players are looking for a new school.`);
    if (P.mine.length) news(L, `${P.mine.length} of your players entered the transfer portal.`, true);
  }
  function portalKeep(L, pid) {
    const P = L.portal; if (!P || P.done) return false;
    if (P.keep != null) { const old = L.players.find((p) => p.pid === P.keep); if (old) old.portal = true; P.keep = null; }
    if (pid == null) return true;
    const p = L.players.find((q) => q.pid === pid && q.tid === L.userTid && P.mine.includes(q.pid)); if (!p) return false;
    p.portal = false; P.keep = pid; return true;
  }
  function portalOffer(L, pid, pts) {
    const P = L.portal; if (!P || P.done) return 0;
    pts = Math.max(0, Math.round(pts || 0));
    const used = Object.entries(P.offers).reduce((a, [k, v]) => a + (+k === pid ? 0 : v), 0);
    pts = Math.min(pts, Math.max(0, P.budget - used));
    if (pts) P.offers[pid] = pts; else delete P.offers[pid];
    return pts;
  }
  // for the portal page: how much each player likes your school, and roughly what it takes to be his favourite
  function portalBoard(L) {
    const P = L.portal; if (!P) return [];
    const T = portalTeams(L), u = L.userTid;
    return L.players.filter((p) => p.portal && p.tid !== u).map((p) => {
      let bestAI = -1e9, by = null;
      for (const t of L.teams) { if (t.tid === p.tid || t.tid === u || !aiFits(L, p, t.tid)) continue; const s = portalAppeal(L, p, t.tid, T) + PORTAL_AI; if (s > bestAI) { bestAI = s; by = t.tid; } }
      const mine = portalAppeal(L, p, u, T), k = PORTAL_K * nearBoost(L.teams[u], p) * portalMult(L, p, u);
      const need = by == null ? 1 : Math.max(1, Math.ceil((bestAI - mine) / k));
      return { p, need, rival: by, offer: P.offers[p.pid] || 0, dist: distance(L.teams[u], p), reach: portalMult(L, p, u) };
    });
  }
  function resolvePortal(L) {
    const P = L.portal; if (!P || P.done) return;
    const u = L.userTid, T = portalTeams(L), need = L.teams.map((t) => ROSTER_SIZE - T[t.tid].n);
    const pool = L.players.filter((p) => p.portal).sort((a, b) => b.ovr - a.ovr);
    for (const p of pool) {
      const from = p.tid; let best = null, bs = -1e9;
      for (const t of L.teams) {
        if (t.tid === from || need[t.tid] <= 0) continue;
        let s;
        if (t.tid === u && !L.autoRec) { const off = P.offers[p.pid] || 0; if (!off) continue; s = portalAppeal(L, p, u, T) + off * PORTAL_K * nearBoost(t, p) * portalMult(L, p, u) + gauss(0, 6); }
        else { if (!aiFits(L, p, t.tid)) continue; s = portalAppeal(L, p, t.tid, T) + PORTAL_AI + gauss(0, 6); }
        if (s > bs) { bs = s; best = t.tid; }
      }
      p.portal = false;
      if (best == null) { P.moves.push({ pid: p.pid, name: p.first + " " + p.last, pos: p.pos, ovr: p.ovr, yr: p.yr, from, to: from, back: true }); continue; } // nobody had room: he goes back
      p.tid = best; p.transfer = true; p.from = from; p.depth = 99; need[best]--;
      T[best].ovr.push(p.ovr); T[best].ovr.sort((a, b) => b - a);
      P.moves.push({ pid: p.pid, name: p.first + " " + p.last, pos: p.pos, ovr: p.ovr, yr: p.yr, from, to: best });
      if (best === u) news(L, `Transfer ${p.first} ${p.last} (${p.pos}, ${p.ovr}) is joining ${L.teams[u].region} from ${L.teams[from].region}.`, true);
      else if (from === u) news(L, `${p.first} ${p.last} transfers from ${L.teams[u].region} to ${L.teams[best].region}.`, true);
    }
    for (const p of L.players) delete p.why;
    (L.xfers || (L.xfers = {}))[P.season] = P.moves.filter((m) => !m.back).map((m) => [m.to, m.pid, m.ovr, m.from, POS.indexOf(m.pos)]);
    P.done = true;
  }
  // ---------- recruiting class rankings ----------
  // A commit is worth its star level plus a bonus for top national ranks; a transfer is valued from his overall rating.
  // A class score adds them best-first with each one counting a little less (88% of the one before), so a few elite players beat a pile of depth.
  const recValue = (stars, rank) => [0, 20, 40, 60, 80, 100][stars] + Math.max(0, 60 - rank) / 6;
  const xferValue = (ovr) => clamp(20 + (ovr - 40) * 2.4, 10, 105);
  function classRankings(L, season, withTransfers) {
    const cur = season === L.season;
    const commits = cur ? L.recruits.filter((r) => r.commit != null).map((r) => [r.commit, r.pid, r.stars, r.rank, POS.indexOf(r.pos)]) : (L.classes || {})[season] || [];
    const xf = withTransfers ? ((L.xfers || {})[season] || []) : [];
    const T = new Map();
    const get = (tid) => T.get(tid) || (T.set(tid, { tid, rec: [], xf: [], stars: [0, 0, 0, 0, 0, 0] }), T.get(tid));
    for (const [tid, pid, st, rank, pos] of commits) { const x = get(tid); x.rec.push({ pid, stars: st, rank, pos: POS[pos], v: recValue(st, rank) }); x.stars[st]++; }
    for (const [tid, pid, ovr, from, pos] of xf) get(tid).xf.push({ pid, ovr, from, pos: POS[pos], v: xferValue(ovr) });
    const rows = [...T.values()].map((x) => {
      const all = x.rec.map((r) => r.v).concat(x.xf.map((r) => r.v)).sort((a, b) => b - a);
      const score = all.reduce((s, v, i) => s + v * Math.pow(0.88, i), 0);
      const avg = x.rec.length ? x.rec.reduce((s, r) => s + r.stars, 0) / x.rec.length : 0;
      return Object.assign(x, { n: x.rec.length, nx: x.xf.length, avg, score: Math.round(score * 10) / 10, top: x.rec.slice().sort((a, b) => a.rank - b.rank)[0] || null });
    }).filter((r) => r.n + r.nx > 0).sort((a, b) => b.score - a.score);
    rows.forEach((r, i) => (r.rk = i + 1));
    return rows;
  }
  function startNextSeason(L) {
    if (L.phase !== "offseason") return;
    resolvePortal(L);
    const u = L.userTid, recap = { season: L.season, grads: [], early: [], improved: [], recruits: [], walkons: 0 };
    updatePrestige(L);
    if (!L.players.some((p) => p.leave !== undefined)) decideDepartures(L); // saves from before this feature
    const leaving = new Set();
    for (const p of L.players) {
      if (p.leave === "grad") { leaving.add(p); if (p.tid === u) recap.grads.push(p); }
      else if (p.leave === "early") { leaving.add(p); L.teams[p.tid].earlyGone = (L.teams[p.tid].earlyGone || 0) + 1; if (p.tid === u) recap.early.push(p); }
    }
    L.players = L.players.filter((p) => !leaving.has(p));
    recap.redshirts = [];
    for (const p of L.players) {
      const medical = p.inj && p.inj.g === 99 && p.inj.s === L.season && (p.stats[L.season]?.gp || 0) <= 9 && !p.rsUsed && !p.rs;
      const d = progress(p);
      if (p.rs || medical) { p.rsUsed = true; p.rs = false; if (p.tid === u) recap.redshirts.push({ name: p.first + " " + p.last, medical }); }
      else p.yr++;
      delete p.inj; delete p.leave;
      if (p.tid === u) recap.improved.push({ pid: p.pid, name: p.first + " " + p.last, d, ovr: p.ovr });
    }
    L.injList = [];
    recap.improved.sort((a, b) => b.d - a.d);
    (L.classes || (L.classes = {}))[L.season] = L.recruits.filter((r) => r.commit != null).map((r) => [r.commit, r.pid, r.stars, r.rank, POS.indexOf(r.pos)]);
    for (const rc of L.recruits) {
      if (rc.commit == null) continue;
      const p = { pid: rc.pid, tid: rc.commit, first: rc.first, last: rc.last, pos: rc.pos, yr: 1, hgt: rc.hgt, town: rc.town, geo: rc.geo ?? null, r: rc.r, ovr: rc.ovr, pot: rc.pot, stats: {}, depth: 99, jersey: rc.jersey, stars: rc.stars, rank: rc.rank };
      L.players.push(p); if (p.tid === u) recap.recruits.push(p.pid);
    }
    for (const t of L.teams) {
      const have = L.players.filter((p) => p.tid === t.tid).length;
      // late openings (mostly early pro entries) are filled by transfers at roughly the program's level; any rest by walk-ons
      const late = Math.max(0, ROSTER_SIZE - have);
      for (let i = 0; i < late; i++) {
        if (i < (t.earlyGone || 0)) { const yr = rint(2, 3); const p = makePlayer(L, t.tid, yr, teamTalent(t.prestige, yr) - 3 + gauss(0, 3)); p.transfer = true; L.players.push(p); if (t.tid === u) (recap.transfers || (recap.transfers = [])).push(p.pid); }
        else { const p = makePlayer(L, t.tid, 1, STAR_OVR[1] - 2 + gauss(0, 2), 8); p.walkon = true; L.players.push(p); if (t.tid === u) recap.walkons++; }
      }
      delete t.earlyGone;
      autoDepth(L, t.tid);
    }
    resetPmap(L);
    L.season++;
    for (const t of L.teams) setBudget(L, t, false);
    makeSchedule(L);
    newRecruitClass(L);
    aiRedshirts(L);
    if (L.portal && L.portal.season === L.season - 1) { recap.portalIn = L.portal.moves.filter((m) => m.to === u && m.from !== u).map((m) => m.pid); recap.portalOut = L.portal.moves.filter((m) => m.from === u && m.to !== u); }
    L.lastRecap = recap;
    news(L, `The ${L.season - 1}–${String(L.season).slice(2)} season tips off.`);
  }

  function expectations(L) {
    const t = L.teams[L.userTid], c = L.confs[t.cid];
    const rank = c.tids.slice().sort((a, b) => L.teams[b].prestige - L.teams[a].prestige).indexOf(t.tid) + 1;
    const nat = L.teams.filter((x) => x.prestige > t.prestige).length + 1;
    return { confRank: rank, natRank: nat, ncaa: nat <= 50 };
  }


  // ---------- team names: CSV export / import ----------
  const NAME_HEAD = "conference,conf_abbrev,school,mascot,abbrev,color,prestige";
  function csvCell(v) { v = String(v ?? ""); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function parseCSV(text) {
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === "," || ch === "\t") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
  }
  function exportNames(L) {
    return [NAME_HEAD + ",city,lat,lng"].concat(L.teams.map((t) => { const c = L.confs[t.cid]; return [c.name, c.abbrev, t.region, t.name, t.abbrev, t.c1, t.prestige, t.city || "", t.geo ? t.geo[0] : "", t.geo ? t.geo[1] : ""].map(csvCell).join(","); })).join("\n");
  }
  // returns {ok, errors, rows}; with apply=true it writes into L
  function importNames(L, text, apply) {
    let rows = parseCSV(text), errors = [];
    if (rows.length && /^conference$/i.test(rows[0][0])) rows = rows.slice(1);
    if (rows.length !== L.teams.length) errors.push(`Expected ${L.teams.length} team rows (in the same order as the export), got ${rows.length}.`);
    else if (!sameStructure(L, text)) errors.push("This file puts teams in different conferences than your current league, so it can only be used to start a new league.");
    const seenAb = new Set();
    rows.forEach((r, i) => {
      const [conf, cab, school, mascot, ab, color, pr] = r;
      if (!school) errors.push(`Row ${i + 1}: school name is empty.`);
      if (school && school.length > 40) errors.push(`Row ${i + 1}: school name is over 40 characters.`);
      if (mascot && mascot.length > 30) errors.push(`Row ${i + 1}: mascot is over 30 characters.`);
      if (ab) { const A = ab.toUpperCase(); if (!/^[A-Z0-9&.\-]{2,6}$/.test(A)) errors.push(`Row ${i + 1}: abbreviation "${ab}" should be 2–6 letters.`); else if (seenAb.has(A)) errors.push(`Row ${i + 1}: abbreviation ${A} is used twice.`); seenAb.add(A); }
      if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) errors.push(`Row ${i + 1}: color should look like #1d3c78.`);
      if (pr && !(+pr >= 1 && +pr <= 99)) errors.push(`Row ${i + 1}: prestige should be 1–99.`);
    });
    if (errors.length || !apply) return { ok: !errors.length, errors: errors.slice(0, 12), count: rows.length };
    const confSet = {};
    rows.forEach((r, tid) => {
      const [conf, cab, school, mascot, ab, color, pr] = r, t = L.teams[tid], c = L.confs[t.cid];
      if (!confSet[c.cid]) { if (conf) c.name = conf.slice(0, 50); if (cab) c.abbrev = cab.toUpperCase().slice(0, 6); confSet[c.cid] = 1; }
      t.region = school; if (mascot) t.name = mascot; if (ab) t.abbrev = ab.toUpperCase(); if (color) t.c1 = color; if (pr) t.prestige = Math.round(+pr);
      if (r[8] && r[9] && isFinite(+r[8]) && isFinite(+r[9])) { t.geo = [+(+r[8]).toFixed(4), +(+r[9]).toFixed(4)]; t.city = (r[7] || "").slice(0, 40); }
    });
    return { ok: true, errors: [], count: rows.length };
  }
  // a names file can also define the whole world (conference membership and sizes) for a new league
  function packRows(text) { let rows = parseCSV(text); if (rows.length && /^conference$/i.test(rows[0][0])) rows = rows.slice(1); return rows; }
  function validatePack(text) {
    const rows = packRows(text), errors = [], seenAb = new Set(), confs = new Map();
    if (rows.length < 100 || rows.length > 500) errors.push(`A league needs 100–500 teams; this file has ${rows.length}.`);
    rows.forEach((r, i) => {
      const [conf, cab, school, mascot, ab, color, pr] = r;
      if (!conf) errors.push(`Row ${i + 1}: conference is empty.`);
      if (!school) errors.push(`Row ${i + 1}: school name is empty.`);
      const A = (ab || "").toUpperCase();
      if (!/^[A-Z0-9&.\-]{2,6}$/.test(A)) errors.push(`Row ${i + 1}: abbreviation "${ab || ""}" should be 2–6 letters.`); else if (seenAb.has(A)) errors.push(`Row ${i + 1}: abbreviation ${A} is used twice.`);
      seenAb.add(A);
      if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) errors.push(`Row ${i + 1}: color should look like #1d3c78.`);
      if (pr && !(+pr >= 1 && +pr <= 99)) errors.push(`Row ${i + 1}: prestige should be 1–99.`);
      if (conf) confs.set(conf, (confs.get(conf) || 0) + 1);
    });
    if (confs.size < 12 || confs.size > 40) errors.push(`A league needs 12–40 conferences; this file has ${confs.size}.`);
    for (const [c, n] of confs) if (n < 4) errors.push(`${c} has ${n} teams; conferences need at least 4.`);
    return { ok: !errors.length, errors: errors.slice(0, 12), count: rows.length, confs: confs.size };
  }
  function sameStructure(L, text) {
    const rows = packRows(text); if (rows.length !== L.teams.length) return false;
    const runs = []; let last = null;
    rows.forEach((r) => { if (r[0] !== last) { runs.push(0); last = r[0]; } runs[runs.length - 1]++; });
    return runs.length === L.confs.length && runs.every((n, i) => n === L.confs[i].tids.length) && rows.every((r, i) => i === 0 || r[0] === rows[i - 1][0] || L.teams[i].cid !== L.teams[i - 1].cid);
  }
  function genWorldFromPack(L, text) {
    const rows = packRows(text), byConf = new Map();
    for (const r of rows) { if (!byConf.has(r[0])) byConf.set(r[0], []); byConf.get(r[0]).push(r); }
    const masc = shuffle(NM.MASCOTS.slice());
    let cid = 0;
    for (const [name, list] of byConf) {
      const prs = list.map((r) => (r[6] ? +r[6] : 35)), avg = prs.reduce((a, b) => a + b, 0) / prs.length;
      const tier = avg >= 55 ? 1 : avg >= 38 ? 2 : avg >= 22 ? 3 : 4;
      const c = { cid, name: name.slice(0, 50), abbrev: (list[0][1] || name.split(" ").map((w) => w[0]).join("")).toUpperCase().slice(0, 6), tier, tids: [] };
      L.confs.push(c);
      for (const r of list) {
        const tid = L.teams.length, prestige = r[6] ? Math.round(+r[6]) : Math.round(clamp([0, 70, 54, 37, 19][tier] + gauss(0, 8), 3, 99));
        const geo = r[8] && r[9] && isFinite(+r[8]) && isFinite(+r[9]) ? [+(+r[8]).toFixed(4), +(+r[9]).toFixed(4)] : null;
        L.teams.push({ tid, cid, region: r[2].slice(0, 40), name: (r[3] || masc[tid % masc.length]).slice(0, 30), abbrev: r[4].toUpperCase(), c1: r[5] || pick(NM.COLORS), prestige, base: prestige, hist: [], rb: 0, rbx: [0, 0, 0], tg: [], city: geo ? (r[7] || "").slice(0, 40) : null, geo });
        c.tids.push(tid);
      }
      cid++;
    }
  }
  function editTeam(L, tid, f) {
    const t = L.teams[tid], err = [];
    const ab = (f.abbrev || "").toUpperCase().trim();
    if (!f.region || !f.region.trim()) err.push("School name can't be empty.");
    if (!/^[A-Z0-9&.\-]{2,6}$/.test(ab)) err.push("Abbreviation should be 2–6 letters.");
    if (L.teams.some((x) => x.tid !== tid && x.abbrev === ab)) err.push(`${ab} is already used.`);
    if (f.c1 && !/^#[0-9a-fA-F]{6}$/.test(f.c1)) err.push("Pick a color.");
    if (err.length) return err;
    t.region = f.region.trim().slice(0, 40); t.name = (f.name || "").trim().slice(0, 30) || t.name; t.abbrev = ab; if (f.c1) t.c1 = f.c1;
    return [];
  }

  // ---------- compact save format ----------
  function pack(L) {
    const P = (p) => { const o = Object.assign({}, p); o.r = RKEYS.map((k) => p.r[k]); if (p.stats) { o.stats = {}; for (const y in p.stats) o.stats[y] = [p.stats[y].tid].concat(STATK.map((k) => p.stats[y][k])); } return o; };
    const o = Object.assign({}, L); delete o.power; o.powerDay = -1;
    o.players = L.players.map(P); o.recruits = L.recruits.map(P);
    if (L.alumni) { o.alumni = {}; for (const k in L.alumni) { const a = L.alumni[k], c = Object.assign({}, a); if (a.stats) { c.stats = {}; for (const y in a.stats) c.stats[y] = Array.isArray(a.stats[y]) ? a.stats[y] : [a.stats[y].tid].concat(STATK.map((s) => a.stats[y][s])); } o.alumni[k] = c; } }
    o.boxes = L.boxes; o.games = L.games;
    return o;
  }
  function unpack(o) {
    const U = (p) => { if (Array.isArray(p.r)) { const r = {}; RKEYS.forEach((k, i) => (r[k] = p.r[i])); p.r = r; } if (p.stats) for (const y in p.stats) { const a = p.stats[y]; if (Array.isArray(a)) { const s = { tid: a[0] }; STATK.forEach((k, i) => (s[k] = a[i + 1])); p.stats[y] = s; } } return p; };
    o.players.forEach(U); (o.recruits || []).forEach(U);
    for (const k in o.alumni || {}) { const a = o.alumni[k]; if (a.stats) for (const y in a.stats) { const v = a.stats[y]; if (Array.isArray(v)) { const s = { tid: v[0] }; STATK.forEach((key, i) => (s[key] = v[i + 1])); a.stats[y] = s; } } }
    return o;
  }

  const api = { classRankings, openPortal, portalKeep, portalOffer, portalBoard, portalOpenings, resolvePortal, canRedshirt, setRedshirt, classLabel, careerTotals, GSTATS, SSTATS, CSTATS, PRO_TEAMS, hpi, predict, renameTerms, distance, nearBoost, ensureGeo, placeSchools,
    RKEYS, RNAMES, POS, YR, MINUTES, DAYS, NCAA_ROUNDS, REGIONS, STAR_OVR,
    newWorld, claimSchool, newLeague, simGame, applyBox, playDay, playOneGame, gamesLeftToday, stageMatches, playNextUserGame, playDays, playWeek, playUntil, playToEnd, startNextSeason,
    confStandings, roster, autoDepth, calcOvr, teamRating, power, netRanks, updatePoll, selectField, expectations, blankLine, dayDate, dayOffset,
    userAlive, openSlots, fixPrestige, exportNames, importNames, validatePack, sameStructure, editTeam, NAME_HEAD, ncaaMatches, resetPmap, recScore, fitStar, pack, unpack, seedOrder,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
