// Sopa de letras con palabras de la fe y de la comunidad.
// Se marca arrastrando el dedo de la primera a la última letra (o tocando ambas).
import { esc, icon } from "./util.js";
import { SOPA, norm } from "./palabras.js";
import { stickerImg, celebrate, closeWin, record, getRecord, fmtTime, shuffle, rnd, POPS } from "./stickers-img.js";

let ctx = null; // { actions, onAfterRender, onLeave }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

export const LEVELS = { facil: { l: "Fácil", n: 9, words: 6, dirs: [[1, 0], [0, 1]] }, medio: { l: "Medio", n: 11, words: 8, dirs: [[1, 0], [0, 1], [1, 1], [1, -1]] }, dificil: { l: "Difícil", n: 12, words: 10, dirs: [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]] } };
const FILL = "AAAAABCCDDEEEEEFGHIIIIJLLLMMNNÑOOOOPPQRRRSSSSTTTUUUVYZ";
const HL = ["#ffc93c", "#9fd8ff", "#f4562a", "#3d6bf0"];

let cfg = { tema: "santos", level: "medio" };
try { cfg = { ...cfg, ...(JSON.parse(localStorage.getItem("agape_sopa") || "{}") || {}) }; } catch { /* */ }
if (!SOPA[cfg.tema]) cfg.tema = "santos";
let g = null, tick = null, drag = null;

export { sopaArt as artSvg } from "./juegos-arte.js";
import { sopaArt as artSvg } from "./juegos-arte.js";

export function view() {
  ctx.onAfterRender(() => document.body.classList.add("solo-on"));
  ctx.onLeave(() => { document.body.classList.remove("solo-on"); stop(); closeWin(); });
  ctx.onAfterRender(paint);
  return `<div class="solo" id="spRoot"></div>`;
}
function stop() { if (tick) clearInterval(tick); tick = null; }
const secs = () => (g && g.start ? Math.floor(((g.end || Date.now()) - g.start) / 1000) : 0);
function startTick() { if (tick || !g.start || g.end) return; tick = setInterval(() => { const t = $("#spTime"); if (!t) return stop(); t.textContent = fmtTime(secs()); }, 1000); }

function build() {
  const L = LEVELS[cfg.level], n = L.n;
  for (let tries = 0; tries < 60; tries++) {
    const grid = Array.from({ length: n }, () => Array(n).fill("")), placed = [];
    const words = shuffle(SOPA[cfg.tema].w.map((w) => [w, norm(w)]).filter(([, u]) => u.length <= n && u.length >= 3));
    for (const [w, u] of words) {
      if (placed.length >= L.words) break;
      let done = false;
      for (let a = 0; a < 120 && !done; a++) {
        const [dx, dy] = L.dirs[rnd(L.dirs.length)], x0 = rnd(n), y0 = rnd(n), x1 = x0 + dx * (u.length - 1), y1 = y0 + dy * (u.length - 1);
        if (x1 < 0 || x1 >= n || y1 < 0 || y1 >= n) continue;
        let ok = true;
        for (let i = 0; i < u.length; i++) { const c = grid[y0 + dy * i][x0 + dx * i]; if (c && c !== u[i]) { ok = false; break; } }
        if (!ok) continue;
        for (let i = 0; i < u.length; i++) grid[y0 + dy * i][x0 + dx * i] = u[i];
        placed.push({ w, u, x0, y0, dx, dy, found: false }); done = true;
      }
    }
    if (placed.length < Math.min(L.words, 5)) continue;
    for (const row of grid) for (let x = 0; x < n; x++) if (!row[x]) row[x] = FILL[rnd(FILL.length)];
    return { grid, words: placed.sort((a, b) => a.u.localeCompare(b.u)), n };
  }
  return null;
}
function newGame() { stop(); closeWin(); g = { ...build(), start: 0, end: 0, marks: [], tap: null }; }
function paint() {
  const root = $("#spRoot"); if (!root) return;
  if (!g) newGame();
  const T = SOPA[cfg.tema], best = getRecord("sopa", cfg.level);
  root.innerHTML = `<a class="imp-back" href="#/juegos">${icon("left")} Juegos</a>
    <header class="solo-head has-st"><span class="solo-st">${stickerImg(T.st, POPS[1])}</span><div><h1>Sopa de letras</h1><p>Arrastra el dedo sobre cada palabra escondida, o toca su primera y su última letra.</p></div></header>
    <div class="solo-opts">
      <label class="sp-tema"><span class="xs muted">Tema</span><select class="select" id="spTema">${Object.entries(SOPA).map(([k, t]) => `<option value="${k}" ${k === cfg.tema ? "selected" : ""}>${esc(t.l)}</option>`).join("")}</select></label>
      <div class="solo-seg" role="group" aria-label="Nivel">${Object.entries(LEVELS).map(([k, s]) => `<button class="${cfg.level === k ? "on" : ""}" data-action="spLevel" data-k="${k}">${esc(s.l)}</button>`).join("")}</div>
    </div>
    <div class="solo-bar"><span>Encontradas <b id="spFound"></b></span><span>Tiempo <b id="spTime">${fmtTime(secs())}</b></span>${best != null ? `<span>Récord <b>${fmtTime(best)}</b></span>` : ""}
      <button class="btn btn-ghost btn-sm" data-action="spNew">${icon("undo")} Nueva</button></div>
    <div class="sp-board" id="spBoard" style="--n:${g.n}">
      <svg class="sp-marks" id="spMarks" viewBox="0 0 ${g.n} ${g.n}" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="sp-grid" id="spGrid">${g.grid.map((row, y) => row.map((c, x) => `<span class="sp-c" data-x="${x}" data-y="${y}">${c}</span>`).join("")).join("")}</div>
    </div>
    <ul class="sp-words" id="spWords"></ul>`;
  marks(); words(); bind(); startTick();
}
function words() {
  const ul = $("#spWords"); if (!ul) return;
  ul.innerHTML = g.words.map((w, i) => `<li class="${w.found ? "ok" : ""}" style="--hl:${HL[i % HL.length]}">${esc(w.w)}</li>`).join("");
  const f = $("#spFound"); if (f) f.textContent = `${g.words.filter((w) => w.found).length}/${g.words.length}`;
}
const line = (x0, y0, x1, y1, color, cls = "") => `<line class="${cls}" x1="${x0 + 0.5}" y1="${y0 + 0.5}" x2="${x1 + 0.5}" y2="${y1 + 0.5}" stroke="${color}" stroke-width=".78" stroke-linecap="round"/>`;
function marks(tmp) {
  const s = $("#spMarks"); if (!s) return;
  s.innerHTML = g.words.map((w, i) => w.found ? line(w.x0, w.y0, w.x0 + w.dx * (w.u.length - 1), w.y0 + w.dy * (w.u.length - 1), HL[i % HL.length], "f") : "").join("") + (tmp ? line(...tmp, "#1e1f3b", "t") : "");
}
// Celda bajo el dedo
function cellAt(ev) {
  const el = document.elementFromPoint(ev.clientX, ev.clientY);
  return el && el.classList.contains("sp-c") ? [+el.dataset.x, +el.dataset.y] : null;
}
// Ajusta el final a una de las 8 direcciones
function snap(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (!dx && !dy) return b;
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)), ux = Math.round(Math.cos(ang * Math.PI / 4)), uy = Math.round(Math.sin(ang * Math.PI / 4));
  const len = Math.max(Math.abs(dx), Math.abs(dy));
  let x = a[0] + ux * len, y = a[1] + uy * len;
  x = Math.max(0, Math.min(g.n - 1, x)); y = Math.max(0, Math.min(g.n - 1, y));
  return [x, y];
}
function tryWord(a, b) {
  const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]), len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) + 1;
  if (len < 2) return false;
  let s = ""; for (let i = 0; i < len; i++) s += g.grid[a[1] + dy * i][a[0] + dx * i];
  const r = s.split("").reverse().join("");
  const w = g.words.find((w) => !w.found && (w.u === s || w.u === r));
  if (!w) return false;
  w.found = true; w.x0 = a[0]; w.y0 = a[1]; w.dx = dx; w.dy = dy;
  if (w.u !== s) { w.x0 = b[0]; w.y0 = b[1]; w.dx = -dx; w.dy = -dy; }
  marks(); words();
  if (g.words.every((x) => x.found)) win();
  return true;
}
function bind() {
  const grid = $("#spGrid"); if (!grid) return;
  grid.addEventListener("pointerdown", (e) => {
    const c = cellAt(e); if (!c) return;
    e.preventDefault();
    if (!g.start) { g.start = Date.now(); startTick(); }
    drag = { a: c, b: c, moved: false };
    try { grid.setPointerCapture(e.pointerId); } catch { /* */ }
    marks([...c, ...c]);
  });
  grid.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const c = cellAt(e); if (!c) return;
    const b = snap(drag.a, c);
    if (b[0] !== drag.b[0] || b[1] !== drag.b[1]) { drag.b = b; drag.moved = true; marks([...drag.a, ...b]); }
  });
  const end = () => {
    if (!drag) return;
    const { a, b, moved } = drag; drag = null;
    if (moved) { if (!tryWord(a, b)) flash(); g.tap = null; marks(); hiTap(); return; }
    // toque: primera letra y luego última
    if (!g.tap) { g.tap = a; marks(); hiTap(); return; }
    const t = g.tap; g.tap = null;
    if (t[0] === a[0] && t[1] === a[1]) { marks(); hiTap(); return; }
    const b2 = snap(t, a);
    if (!tryWord(t, b2)) flash();
    marks(); hiTap();
  };
  grid.addEventListener("pointerup", end);
  grid.addEventListener("pointercancel", () => { drag = null; marks(); });
}
function hiTap() {
  document.querySelectorAll(".sp-c.tap").forEach((el) => el.classList.remove("tap"));
  if (g.tap) document.querySelector(`.sp-c[data-x="${g.tap[0]}"][data-y="${g.tap[1]}"]`)?.classList.add("tap");
}
function flash() { const b = $("#spBoard"); if (!b) return; b.classList.remove("no"); void b.offsetWidth; b.classList.add("no"); }
function win() {
  g.end = Date.now(); stop();
  const r = record("sopa", cfg.level, secs());
  setTimeout(() => celebrate({ title: "¡Las encontraste todas!", sticker: SOPA[cfg.tema].st, pop: POPS[1], text: `Tiempo: ${fmtTime(secs())}${r.isNew ? "<br><b>¡Nuevo récord!</b>" : r.first ? "" : `<br>Tu récord: ${fmtTime(r.best)}`}`,
    actions: `<button class="btn btn-primary" data-action="spNew" data-close>Otra sopa</button><a class="btn btn-ghost" href="#/juegos" data-close>Otros juegos</a>` }), 400);
}
const saveCfg = () => { try { localStorage.setItem("agape_sopa", JSON.stringify(cfg)); } catch { /* */ } };

function registerActions() {
  const A = ctx.actions;
  A.spNew = () => { newGame(); paint(); };
  A.spLevel = (el) => { cfg.level = el.dataset.k; saveCfg(); newGame(); paint(); };
  document.addEventListener("change", (e) => { if (e.target.id !== "spTema") return; cfg.tema = e.target.value; saveCfg(); newGame(); paint(); });
}
