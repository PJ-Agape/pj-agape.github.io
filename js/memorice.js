// Memorice con los stickers de la app: da vuelta dos cartas y encuentra las parejas.
// Se juega solo, sin internet; el récord queda en este teléfono.
import { esc, icon } from "./util.js";
import { stickerImg, stickerName, celebrate, closeWin, record, getRecord, fmtTime, shuffle, POPS } from "./stickers-img.js";

let ctx = null; // { actions, onAfterRender, onLeave }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

export const SETS = {
  pj: { l: "Personajes", k: ["pj:llama", "pj:zorro", "pj:pinguino", "pj:gato", "pj:quiltro", "pj:oso", "pj:pudu", "pj:panda", "pj:conejo", "pj:buho", "pj:ballena", "pj:abeja", "pj:paloma", "pj:dino", "pj:astronauta", "pj:robot", "pj:sol", "pj:cactus", "pj:taza", "pj:guitarra"] },
  santos: { l: "Santos", k: ["sanmiguel", "albertohurtado", "teresaandes", "carloacutis", "franciscoasis", "donbosco", "juanpablo", "virgencarmen", "jose", "teresita", "sansebastian", "virgen"] },
  jesus: { l: "Jesús y la Biblia", k: ["jesus", "emaus", "buenpastor", "dejadlos", "sagradocorazon", "panes", "bartimeo", "tormenta", "mesa", "apostoles", "anunciacion", "sagradafamilia", "espiritu", "eucaristia", "biblia", "rey", "trigo", "vid"] },
};
export const LEVELS = { facil: { l: "Fácil", pairs: 6, cols: 3 }, medio: { l: "Medio", pairs: 8, cols: 4 }, dificil: { l: "Difícil", pairs: 12, cols: 4 } };

let cfg = { set: "pj", level: "medio" };
try { cfg = { ...cfg, ...(JSON.parse(localStorage.getItem("agape_memorice") || "{}") || {}) }; } catch { /* */ }
let g = null, tick = null;

export { memArt as artSvg } from "./juegos-arte.js";
import { memArt as artSvg } from "./juegos-arte.js";

export function view() {
  ctx.onAfterRender(() => document.body.classList.add("solo-on"));
  ctx.onLeave(() => { document.body.classList.remove("solo-on"); stop(); closeWin(); });
  ctx.onAfterRender(paint);
  return `<div class="solo" id="memRoot"></div>`;
}
function stop() { if (tick) clearInterval(tick); tick = null; }
const secs = () => (g && g.start ? Math.floor(((g.end || Date.now()) - g.start) / 1000) : 0);

function newGame() {
  stop(); closeWin();
  const L = LEVELS[cfg.level], keys = shuffle(SETS[cfg.set].k.slice()).slice(0, L.pairs);
  const cards = shuffle(keys.flatMap((k, i) => [{ k, pop: POPS[i % 3] }, { k, pop: POPS[i % 3] }])).map((c, i) => ({ ...c, i, up: false, done: false }));
  g = { cards, open: [], moves: 0, found: 0, start: 0, end: 0, lock: false };
}
function paint() {
  const root = $("#memRoot"); if (!root) return;
  if (!g) newGame();
  const L = LEVELS[cfg.level], best = getRecord("memorice", cfg.set + "-" + cfg.level);
  root.innerHTML = `<a class="imp-back" href="#/juegos">${icon("left")} Juegos</a>
    <header class="solo-head"><h1>Memorice</h1><p>Da vuelta dos cartas y encuentra las parejas.</p></header>
    <div class="solo-opts">
      <div class="solo-seg" role="group" aria-label="Stickers">${Object.entries(SETS).map(([k, s]) => `<button class="${cfg.set === k ? "on" : ""}" data-action="memSet" data-k="${k}">${esc(s.l)}</button>`).join("")}</div>
      <div class="solo-seg" role="group" aria-label="Nivel">${Object.entries(LEVELS).map(([k, s]) => `<button class="${cfg.level === k ? "on" : ""}" data-action="memLevel" data-k="${k}">${esc(s.l)}</button>`).join("")}</div>
    </div>
    <div class="solo-bar"><span>Parejas <b id="memFound">${g.found}/${L.pairs}</b></span><span>Intentos <b id="memMoves">${g.moves}</b></span><span>Tiempo <b id="memTime">${fmtTime(secs())}</b></span>
      <button class="btn btn-ghost btn-sm" data-action="memNew">${icon("undo")} Nuevo</button></div>
    ${best != null ? `<p class="xs muted solo-best">Tu récord en este nivel: ${best} intentos</p>` : ""}
    <div class="mem-grid" style="--cols:${L.cols}">${g.cards.map(cardHTML).join("")}</div>`;
  startTick();
}
const cardHTML = (c) => `<button class="mem-card${c.up || c.done ? " up" : ""}${c.done ? " done" : ""}" data-action="memFlip" data-i="${c.i}" aria-label="${c.up || c.done ? esc(stickerName(c.k)) : "Carta tapada"}">
  <span class="mem-in"><span class="mem-back" aria-hidden="true"></span><span class="mem-front">${stickerImg(c.k, c.pop)}<small>${esc(stickerName(c.k))}</small></span></span></button>`;
function update(i) {
  const el = document.querySelector(`.mem-card[data-i="${i}"]`); if (!el) return;
  const c = g.cards[i];
  el.classList.toggle("up", c.up || c.done); el.classList.toggle("done", c.done);
  el.setAttribute("aria-label", c.up || c.done ? stickerName(c.k) : "Carta tapada");
}
function bar() {
  const f = $("#memFound"), m = $("#memMoves");
  if (f) f.textContent = `${g.found}/${LEVELS[cfg.level].pairs}`;
  if (m) m.textContent = g.moves;
}
function startTick() { if (tick || !g.start || g.end) return; tick = setInterval(() => { const t = $("#memTime"); if (!t) return stop(); t.textContent = fmtTime(secs()); }, 1000); }
function flip(i) {
  const c = g.cards[i];
  if (!c || c.up || c.done || g.lock) return;
  if (!g.start) { g.start = Date.now(); startTick(); }
  c.up = true; update(i); g.open.push(i);
  if (g.open.length < 2) return;
  g.moves++;
  const [a, b] = g.open.map((x) => g.cards[x]);
  g.open = [];
  if (a.k === b.k) {
    a.done = b.done = true; g.found++;
    setTimeout(() => { update(a.i); update(b.i); }, 250);
    bar();
    if (g.found === LEVELS[cfg.level].pairs) win();
  } else {
    g.lock = true; bar();
    setTimeout(() => { a.up = b.up = false; update(a.i); update(b.i); g.lock = false; }, 900);
  }
}
function win() {
  g.end = Date.now(); stop();
  const r = record("memorice", cfg.set + "-" + cfg.level, g.moves);
  setTimeout(() => celebrate({
    title: "¡Encontraste todas!", sticker: "bartimeo",
    text: `${g.moves} intentos · ${fmtTime(secs())}${r.isNew ? "<br><b>¡Nuevo récord!</b>" : r.first ? "" : `<br>Tu récord: ${r.best} intentos`}`,
    actions: `<button class="btn btn-primary" data-action="memNew" data-close>Jugar otra vez</button><a class="btn btn-ghost" href="#/juegos" data-close>Otros juegos</a>`,
  }), 600);
}
const saveCfg = () => { try { localStorage.setItem("agape_memorice", JSON.stringify(cfg)); } catch { /* */ } };

function registerActions() {
  const A = ctx.actions;
  A.memFlip = (el) => flip(+el.dataset.i);
  A.memNew = () => { newGame(); paint(); };
  A.memSet = (el) => { cfg.set = el.dataset.k; saveCfg(); newGame(); paint(); };
  A.memLevel = (el) => { cfg.level = el.dataset.k; saveCfg(); newGame(); paint(); };
}
