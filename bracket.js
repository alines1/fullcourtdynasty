/* Full Court Dynasty — bracket trees with connector lines. */
(function (root) {
  "use strict";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // side: {name, seed, score, won, me, tid} | null ; m: {id, from:[ids], a, b, gid, ghost, label}
  function line(s, m) {
    if (!s) return `<div class="ln tbd"><span class="sd"></span><span class="nm">${m.ghost ? "" : "TBD"}</span><span class="sc"></span></div>`;
    return `<div class="ln${s.won ? " won" : ""}${s.lost ? " lost" : ""}${s.me ? " me" : ""}" title="${esc(s.title || s.name)}"><span class="sd">${s.seed ?? ""}</span><span class="nm">${s.tid != null ? `<a data-go="team:${s.tid}">${esc(s.name)}</a>` : esc(s.name)}</span><span class="sc">${s.score != null ? (m.gid != null && m.hasBox ? `<a data-go="box:${m.gid}">${s.score}</a>` : s.score) : ""}</span></div>`;
  }
  function box(m) {
    if (m.ghost) return `<div class="mg ghost" id="${m.id}"></div>`;
    return `<div class="mg${m.me ? " has-me" : ""}" id="${m.id}"${m.from && m.from.length ? ` data-from="${m.from.join(",")}"` : ""}>${m.label ? `<div class="ml">${esc(m.label)}</div>` : ""}${line(m.a, m)}${line(m.b, m)}</div>`;
  }
  // rounds: [[m...], ...], names: [str], dir: "ltr"|"rtl"
  function tree(rounds, names, dir, rows) {
    const n = rows || rounds[0].length;
    return `<div class="tree ${dir || "ltr"}" style="--rows:${n}">${rounds.map((rd, i) => `<div class="col"><div class="colh">${esc(names[i] || "")}</div><div class="slots">${rd.map(box).join("")}</div></div>`).join("")}</div>`;
  }
  function draw(wrap) {
    const old = wrap.querySelector(":scope > svg.lines"); if (old) old.remove();
    const W = wrap.scrollWidth, H = wrap.scrollHeight, base = wrap.getBoundingClientRect();
    if (!W || !H) return;
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "lines"); svg.setAttribute("width", W); svg.setAttribute("height", H);
    let d = "", dm = "";
    for (const to of wrap.querySelectorAll(".mg[data-from]")) {
      const tr = to.getBoundingClientRect();
      for (const id of to.dataset.from.split(",")) {
        const fe = document.getElementById(id); if (!fe || fe.classList.contains("ghost") || !wrap.contains(fe)) continue;
        const fr = fe.getBoundingClientRect();
        const ltr = fr.left + fr.width / 2 < tr.left + tr.width / 2;
        const x1 = (ltr ? fr.right : fr.left) - base.left, x2 = (ltr ? tr.left : tr.right) - base.left;
        const y1 = fr.top + fr.height / 2 - base.top, y2 = tr.top + tr.height / 2 - base.top, mx = (x1 + x2) / 2;
        const seg = `M${x1.toFixed(1)} ${y1.toFixed(1)}H${mx.toFixed(1)}V${y2.toFixed(1)}H${x2.toFixed(1)}`;
        if (fe.classList.contains("has-me") && fe.querySelector(".ln.me.won")) dm += seg; else d += seg;
      }
    }
    svg.innerHTML = `<path d="${d}" class="lk"/><path d="${dm}" class="lk me"/>`;
    wrap.prepend(svg);
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver((es) => { for (const e of es) draw(e.target); }) : null;
  function drawAll(scope) {
    for (const w of (scope || document).querySelectorAll(".brwrap")) { draw(w); if (ro) ro.observe(w); }
  }
  root.Bracket = { tree, box, drawAll, draw };
})(window);
