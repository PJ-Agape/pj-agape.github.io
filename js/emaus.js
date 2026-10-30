// Emaús · El arte de encontrarnos: juego de rol de agAPPe en seis capítulos, uno por módulo del curso
// «El Arte de Encontrarnos». Llegas al pueblo sintiéndote solo, encuentras una comunidad, aprendes a
// acoger, a escuchar, a jugar y a cuidar, y terminas siendo enviado. En cada encuentro del grupo te
// acompaña un Caminante que ilumina lo vivido con la Palabra; en la misa del último capítulo, al partir
// el pan, lo reconoces (Lc 24,13-35). Se juega sin cuenta ni internet; el avance queda en este teléfono.
// Invitar a alguien es un regalo, no una obligación: suma un compañero de camino que muestra hacia dónde ir.
//
// El pueblo tiene lugares a los que se entra de verdad: la capilla San Miguel (con su Sagrario, el altar,
// el ambón, los vitrales y la pila bautismal), el salón parroquial donde se juntan los encuentros, la
// biblioteca y la casa de Don Lucho. Todo se dibuja con código (sin imágenes) y se guarda en memoria
// para que se mueva fluido en el teléfono.

import { esc } from "./util.js";
import { stickerSrc } from "./stickers-img.js";

let ctx = null;
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const APP = "https://pj-agape.github.io/";
const KEY = "agape_emaus2";

const K = { navy: "#0b2566", blue: "#1351a4", sky: "#8ad2fa", orange: "#ef591c", yellow: "#ffba03", cream: "#fff6e5", white: "#ffffff", wood: "#b5793f", wood2: "#8a5a2c" };
const OL = "#0b2566";
const T = 32;
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }

// ---------------------------------------------------------------------------
// Mapas: cada lugar se arma con rectángulos de letras (fácil de leer y de cambiar)
// ---------------------------------------------------------------------------
let W = 44, H = 34, map = [], base = [], props = [];
const GROUND_P = new Set([".", "f", ":", "s", "p", "g", "h", "d", "~", "w"]), GROUND_I = new Set(["o", "a", "P", "_", "=", "W", "V", "E"]);
let GROUND = GROUND_P;
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) { map[y][x] = c; if (GROUND.has(c)) base[y][x] = c; } };
const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
function fresh(w, h, fill) { W = w; H = h; GROUND = fill === "." ? GROUND_P : GROUND_I; map = Array.from({ length: H }, () => Array(W).fill(fill)); base = map.map((r) => r.slice()); }
const tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? "#" : map[y][x]);

const FAROLES = [[20, 10], [23, 14], [20, 21], [23, 25], [10, 9], [16, 17], [27, 17], [36, 20]];
function buildPueblo() {
  fresh(44, 34, ".");
  rect(0, 0, W, 1, "T"); rect(0, H - 1, W, 1, "T"); rect(0, 0, 1, H, "T"); rect(W - 1, 0, 1, H, "T");
  [[2, 2], [3, 9], [2, 22], [27, 3], [42, 12], [41, 30], [16, 30], [13, 9], [30, 20], [3, 31], [11, 31]].forEach(([x, y]) => set(x, y, "T"));
  rect(1, 1, 2, 2, "T"); rect(41, 1, 2, 2, "T"); rect(1, 26, 1, 4, "T");
  rect(21, 6, 2, 27, ":"); rect(3, 18, 38, 2, ":");
  [[19, 8], [24, 9], [19, 12], [25, 14], [18, 22], [25, 23], [6, 13], [14, 21], [33, 21], [10, 28], [8, 7], [15, 7]].forEach(([x, y]) => set(x, y, "f"));
  // CAPILLA SAN MIGUEL (norte), con su atrio
  rect(17, 6, 10, 2, "p");
  rect(17, 0, 10, 6, "C"); set(21, 5, "c"); set(22, 5, "c");
  // SALÓN PARROQUIAL (noroeste): aquí se juntan los encuentros
  rect(9, 2, 6, 3, "L"); set(11, 4, "l"); set(12, 4, "l"); rect(11, 5, 2, 6, ":");
  // CASAS (sur). La primera es la de Don Lucho, la de la puerta azul
  HOUSES.forEach(([x, y], i) => { rect(x, y, 4, 3, "H"); set(x + 1, y + 2, i === 0 ? "u" : "D"); });
  rect(23, 27, 6, 1, ":"); rect(8, 21, 1, 2, ":"); rect(14, 20, 1, 6, ":"); rect(34, 20, 1, 3, ":");
  rect(4, 29, 3, 2, "k"); rect(9, 30, 2, 2, "k");
  // CANCHA (sureste)
  rect(23, 29, 11, 4, "g");
  // PLAZA (oeste) con su pileta
  rect(4, 11, 11, 7, "p"); rect(8, 13, 3, 2, "F"); set(5, 12, "B"); set(13, 12, "B"); set(5, 16, "B"); set(13, 16, "B");
  // TORRE (noroeste)
  rect(3, 3, 5, 4, "R"); rect(5, 7, 1, 4, ":");
  // BIBLIOTECA (este) y su plazoleta
  rect(35, 8, 6, 3, "X"); set(37, 10, "e"); set(38, 10, "e");
  rect(29, 11, 12, 6, "p"); set(30, 15, "B"); set(40, 13, "B"); rect(34, 17, 1, 1, ":");
  // RÍO con su puente
  rect(37, 19, 2, 14, "~"); rect(37, 18, 2, 2, "w");
  // CERRO (noreste): el sendero se ve con la lámpara de la Palabra
  rect(29, 1, 12, 7, "h"); rect(33, 7, 1, 2, "d"); set(33, 6, "d"); rect(33, 4, 1, 2, "d"); rect(34, 3, 4, 1, "d");
  set(38, 2, "+"); set(37, 3, "B"); rect(29, 1, 1, 7, "T"); rect(40, 1, 1, 7, "T"); rect(30, 7, 3, 1, "T"); rect(34, 7, 6, 1, "T"); rect(30, 1, 3, 2, "T");
  rect(27, 1, 2, 7, "T"); rect(15, 1, 2, 4, "T"); rect(9, 1, 6, 1, "T");
  set(27, 8, "J"); // el carrito de completos de Don Pato
  FAROLES.forEach(([x, y]) => set(x, y, "i"));
}
const HOUSES = [[6, 23], [13, 26], [27, 24], [33, 23]];

function buildCapilla() {
  fresh(13, 22, "o");
  rect(0, 0, 13, 3, "W"); rect(0, 3, 1, 19, "W"); rect(12, 3, 1, 19, "W"); rect(0, 21, 13, 1, "W");
  for (const y of [5, 9, 13, 17]) { set(0, y, "V"); set(12, y, "V"); }
  rect(5, 21, 3, 1, "E");
  rect(1, 3, 11, 4, "P"); rect(6, 7, 1, 14, "a");
  set(6, 2, "G"); rect(5, 4, 3, 1, "A"); set(2, 3, "Y"); set(10, 3, "q"); set(9, 6, "M");
  set(1, 8, "U"); set(11, 8, "N");
  for (const y of PEWS) { rect(2, y, 4, 1, "Z"); rect(7, y, 4, 1, "Z"); }
  set(2, 19, "b");
}
const PEWS = [9, 11, 13, 15, 17];

const CHAIRS = [[6, 3], [7, 3], [4, 4], [9, 4], [4, 6], [9, 6], [6, 7], [7, 7]];
function buildSalon() {
  fresh(14, 11, "_");
  rect(0, 0, 14, 2, "W"); rect(0, 2, 1, 9, "W"); rect(13, 2, 1, 9, "W"); rect(0, 10, 14, 1, "W"); rect(6, 10, 2, 1, "E");
  rect(6, 5, 2, 1, "m"); CHAIRS.forEach(([x, y]) => set(x, y, "h"));
  rect(1, 6, 2, 2, "t"); rect(10, 2, 2, 1, "n"); set(2, 2, "R");
}

const SHELVES = [
  { x: 1, y: 2, l: "Pentateuco", d: "Los cinco primeros libros: Génesis, Éxodo, Levítico, Números y Deuteronomio." },
  { x: 4, y: 2, l: "Libros históricos", d: "Josué, Jueces, Rut, Samuel, Reyes… la historia del pueblo de Israel." },
  { x: 8, y: 2, l: "Libros sapienciales y poéticos", d: "Job, Salmos, Proverbios, Eclesiastés, Cantar de los Cantares, Sabiduría y Eclesiástico.", ok: true },
  { x: 11, y: 2, l: "Profetas", d: "Isaías, Jeremías, Ezequiel, Daniel y los doce profetas menores." },
  { x: 1, y: 5, l: "Evangelios y Hechos", d: "Mateo, Marcos, Lucas y Juan, y los Hechos de los Apóstoles." },
  { x: 11, y: 5, l: "Cartas y Apocalipsis", d: "Las cartas de Pablo, Santiago, Pedro, Juan y Judas, y el Apocalipsis." },
];
function buildBiblio() {
  fresh(14, 10, "=");
  rect(0, 0, 14, 2, "W"); rect(0, 2, 1, 8, "W"); rect(13, 2, 1, 8, "W"); rect(0, 9, 14, 1, "W"); rect(6, 9, 2, 1, "E");
  SHELVES.forEach((s) => rect(s.x, s.y, 2, 1, "S"));
  rect(5, 5, 4, 2, "t");
}

function buildCasa() {
  fresh(10, 8, "_");
  rect(0, 0, 10, 2, "W"); rect(0, 2, 1, 6, "W"); rect(9, 2, 1, 6, "W"); rect(0, 7, 10, 1, "W"); rect(4, 7, 2, 1, "E");
  rect(1, 2, 2, 1, "K"); set(3, 3, "h"); rect(5, 3, 2, 2, "t"); set(8, 2, "r"); rect(8, 4, 1, 2, "s");
}

const casaAbierta = () => S.inCh && ((CH().n === 1 && Q().bags >= 1) || CH().n === 3);
const SCN = {
  pueblo: { name: "El pueblo", bg: "#7fae68", build: buildPueblo, solid: new Set(["T", "H", "D", "u", "F", "B", "C", "c", "+", "~", "R", "X", "e", "k", "L", "l", "J", "i"]),
    doors: [{ t: [[21, 5], [22, 5]], to: "capilla", x: 6.5, y: 20.4 }, { t: [[11, 4], [12, 4]], to: "salon", x: 7, y: 9.4 },
      { t: [[37, 10], [38, 10]], to: "biblio", x: 7, y: 8.4 }, { t: [[7, 25]], to: "casa", x: 5, y: 6.4, ok: casaAbierta, no: "Es la casa de Don Lucho. Mejor no entrar si no te ha invitado." }] },
  capilla: { name: "Capilla San Miguel", bg: "#1c1410", build: buildCapilla, back: 3, wall: "#f3ece0", wallTop: "#d6c9b2", wain: "#9a6a3e",
    solid: new Set(["W", "V", "E", "G", "A", "Y", "q", "M", "U", "N", "Z", "b"]), doors: [{ t: [[5, 21], [6, 21], [7, 21]], to: "pueblo", x: 22, y: 6.7 }], exit: { x: 6, y: 21 }, entry: { x: 21.5, y: 5 } },
  salon: { name: "Salón parroquial", bg: "#1c1410", build: buildSalon, back: 2, wall: "#fff3dc", wallTop: "#dccbb0", wain: "#c9a77a",
    solid: new Set(["W", "V", "E", "m", "h", "t", "n", "R"]), doors: [{ t: [[6, 10], [7, 10]], to: "pueblo", x: 12, y: 5.6 }], exit: { x: 6.5, y: 10 }, entry: { x: 11.5, y: 4 } },
  biblio: { name: "Biblioteca del pueblo", bg: "#1c1410", build: buildBiblio, back: 2, wall: "#efe5d2", wallTop: "#d2c3a8", wain: "#7a4d2a",
    solid: new Set(["W", "V", "E", "S", "t"]), doors: [{ t: [[6, 9], [7, 9]], to: "pueblo", x: 38, y: 11.6 }], exit: { x: 6.5, y: 9 }, entry: { x: 37.5, y: 10 } },
  casa: { name: "Casa de Don Lucho", bg: "#1c1410", build: buildCasa, back: 2, wall: "#f4e6cc", wallTop: "#d8c6a6", wain: "#9a6a3e",
    solid: new Set(["W", "V", "E", "K", "h", "t", "r", "s"]), doors: [{ t: [[4, 7], [5, 7]], to: "pueblo", x: 7.5, y: 26.6 }], exit: { x: 4.5, y: 7 }, entry: { x: 7, y: 25 } },
};
const SC = () => SCN[S.scene] || SCN.pueblo;
const solid = (tx, ty) => { const c = tile(tx, ty); if (c === "#") return true; if (c === "d") return !S.lamp; return SC().solid.has(c); };
const doorAt = (tx, ty) => SC().doors.find((d) => d.t.some(([x, y]) => x === tx && y === ty));

// ---------------------------------------------------------------------------
// Dibujo: capas guardadas en memoria (suelo de cada lugar y objetos), escaladas a la pantalla
// ---------------------------------------------------------------------------
let SCL = 1, Z = 1, ground = null, groundKey = "";
const cache = new Map();
function spr(key, w, h, paint) {
  let c = cache.get(key);
  if (!c) { c = document.createElement("canvas"); c.width = Math.ceil(w * SCL); c.height = Math.ceil(h * SCL); const g = c.getContext("2d"); g.scale(SCL, SCL); g.lineJoin = "round"; g.lineCap = "round"; paint(g); cache.set(key, c); }
  return c;
}
let g2 = null;
const blit = (c, x, y, w, h) => g2.drawImage(c, x, y, w, h);

function teja(g, x, y, w, h, c1 = "#c65a32", c2 = "#9f4128") {
  g.fillStyle = c1; g.fillRect(x, y, w, h);
  g.strokeStyle = c2; g.lineWidth = 1.2;
  for (let j = 0, yy = y; yy < y + h + 8; j++, yy += 7) for (let xx = x - 10 + (j % 2) * 5; xx < x + w + 10; xx += 10) { g.beginPath(); g.arc(xx, yy, 5, 0, Math.PI); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,.07)"; for (let xx = x + 2; xx < x + w; xx += 10) g.fillRect(xx, y, 2, h);
}
function glass(g, x, y, w, h, arch) {
  g.save(); g.beginPath();
  if (arch) { g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); } else g.rect(x, y, w, h);
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, "#d6f0ff"); gr.addColorStop(.5, "#8ad2fa"); gr.addColorStop(1, "#5fb3e6");
  g.fillStyle = gr; g.fill(); g.clip();
  g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.moveTo(x + w * .15, y + h); g.lineTo(x + w * .45, y); g.lineTo(x + w * .6, y); g.lineTo(x + w * .3, y + h); g.fill();
  g.restore();
  g.strokeStyle = OL; g.lineWidth = 1.6; g.beginPath();
  if (arch) { g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); } else g.rect(x, y, w, h);
  g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + w / 2, y + (arch ? 2 : 0)); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * .55); g.lineTo(x + w, y + h * .55); g.stroke();
}
function stainedGlass(g, x, y, w, h, seed) {
  const cols = ["#1351a4", "#ffba03", "#ef591c", "#3aa57a", "#8ad2fa", "#c0397a"];
  g.save(); g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.clip();
  const s = 8;
  for (let j = 0; j * s < h + s; j++) for (let i = 0; i * s < w + s; i++) { g.fillStyle = cols[Math.floor(hash(i, j, seed) * cols.length)]; g.globalAlpha = .85; g.beginPath(); g.moveTo(x + i * s, y + j * s - s / 2); g.lineTo(x + i * s + s / 2, y + j * s); g.lineTo(x + i * s, y + j * s + s / 2); g.lineTo(x + i * s - s / 2, y + j * s); g.closePath(); g.fill(); }
  g.globalAlpha = 1; g.strokeStyle = "rgba(11,37,102,.75)"; g.lineWidth = 1;
  for (let k = -h; k < w + h; k += s) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k + h, y + h); g.moveTo(x + k + h, y); g.lineTo(x + k, y + h); g.stroke(); }
  // una cruz luminosa al centro
  g.fillStyle = "rgba(255,246,229,.9)"; g.fillRect(x + w / 2 - 2, y + 8, 4, h * .5); g.fillRect(x + w / 2 - 8, y + 16, 16, 4);
  g.restore();
  g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.stroke();
}

// ----- Suelo del pueblo
function grass(g, X, Y, x, y, c1 = "#b7dd9c", c2 = "#b0d895") {
  g.fillStyle = hash(x >> 1, y >> 1, 9) < .5 ? c1 : c2; g.fillRect(X, Y, T, T);
  g.strokeStyle = "rgba(70,130,60,.35)"; g.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) { const a = hash(x, y, 50 + k), b = hash(x, y, 60 + k); if (a > .8) continue; const px = X + 4 + a * 24, py = Y + 7 + b * 22; g.beginPath(); g.moveTo(px - 2, py); g.lineTo(px - 1, py - 4); g.moveTo(px, py); g.lineTo(px + 1, py - 5); g.moveTo(px + 2, py); g.lineTo(px + 3, py - 3); g.stroke(); }
}
function groundPueblo(g, x, y) {
  const c = base[y][x], X = x * T, Y = y * T;
  const isPath = (n) => n === ":" || n === "s" || (n === "d" && S.lamp) || n === "p" || n === "w";
  switch (c) {
    case "p": { g.fillStyle = "#ddd2bf"; g.fillRect(X, Y, T, T); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const v = hash(x * 2 + i, y * 2 + j, 3); g.fillStyle = v < .33 ? "#efe8da" : v < .66 ? "#e6dccb" : "#ebe2d2"; g.fillRect(X + i * 16 + 1, Y + j * 16 + 1, 14, 14); } break; }
    case ":": case "s": case "d": {
      if (c === "d" && !S.lamp) { // sendero cerrado por la maleza: se abre con la lámpara
        grass(g, X, Y, x, y, "#8fb27c", "#87aa74");
        for (let k = 0; k < 4; k++) { const a = hash(x, y, 80 + k), b = hash(x, y, 90 + k); g.fillStyle = k % 2 ? "#4e8a55" : "#5d9a5f"; g.strokeStyle = "rgba(11,37,102,.55)"; g.lineWidth = 1.2; g.beginPath(); g.arc(X + 6 + a * 20, Y + 6 + b * 20, 7 + a * 3, 0, 7); g.fill(); g.stroke(); }
        g.strokeStyle = "#3f6e45"; g.lineWidth = 1.2; for (let k = 0; k < 5; k++) { const a = hash(x, y, 100 + k) * 28; g.beginPath(); g.moveTo(X + a, Y + 30); g.quadraticCurveTo(X + a + 6, Y + 14, X + a - 2, Y + 4); g.stroke(); }
        break; }
      g.fillStyle = hash(x, y, 2) < .5 ? "#efd9a9" : "#ecd5a2"; g.fillRect(X, Y, T, T);
      for (let k = 0; k < 6; k++) { const a = hash(x, y, 10 + k); g.fillStyle = a < .5 ? "rgba(150,110,55,.28)" : "rgba(255,255,255,.4)"; g.beginPath(); g.arc(X + 3 + hash(x, y, 20 + k) * 26, Y + 3 + hash(x, y, 30 + k) * 26, .8 + a * 1.2, 0, 7); g.fill(); }
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], s) => {
        const n = base[y + dy] && base[y + dy][x + dx]; if (n === undefined || isPath(n)) return;
        g.fillStyle = "rgba(160,200,120,.9)";
        for (let i = 0; i < 6; i++) { const t0 = hash(x, y, 40 + i + s * 9); const px = dx ? (dx > 0 ? X + T - 1 : X + 1) : X + 2 + t0 * 28, py = dy ? (dy > 0 ? Y + T - 1 : Y + 1) : Y + 2 + t0 * 28; g.beginPath(); g.arc(px, py, 2.4 + hash(x, y, 70 + i) * 1.4, 0, 7); g.fill(); }
      });
      break;
    }
    case "g": g.fillStyle = Math.floor(x / 2) % 2 ? "#78be65" : "#82c66f"; g.fillRect(X, Y, T, T); break;
    case "h": grass(g, X, Y, x, y, "#cddba6", "#c4d39b"); if (hash(x, y, 4) < .14) { g.fillStyle = "#b8b1a3"; g.strokeStyle = "rgba(11,37,102,.5)"; g.lineWidth = 1; g.beginPath(); g.ellipse(X + 16, Y + 20, 6, 4, 0, 0, 7); g.fill(); g.stroke(); } break;
    case "~": {
      const gr = g.createLinearGradient(X, Y, X + T, Y); gr.addColorStop(0, "#5fb8e6"); gr.addColorStop(.5, "#4aa6db"); gr.addColorStop(1, "#5fb8e6"); g.fillStyle = gr; g.fillRect(X, Y, T, T);
      [[-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => { const n = base[y + dy] && base[y + dy][x + dx]; if (n === undefined || n === "~" || n === "w") return; g.fillStyle = "#d9c596"; if (dx) g.fillRect(dx < 0 ? X : X + T - 5, Y, 5, T); else g.fillRect(X, Y + T - 5, T, 5); });
      break;
    }
    case "w": {
      g.fillStyle = "#4aa6db"; g.fillRect(X, Y, T, T); g.fillStyle = "#b98149"; g.fillRect(X, Y + 2, T, T - 4);
      g.strokeStyle = "#8a5a2c"; g.lineWidth = 1.4; for (let i = 3; i < T; i += 6) { g.beginPath(); g.moveTo(X + i, Y + 2); g.lineTo(X + i, Y + T - 2); g.stroke(); }
      const up = base[y - 1] && base[y - 1][x], dn = base[y + 1] && base[y + 1][x];
      g.fillStyle = "#6b4423"; if (up !== "w") g.fillRect(X, Y + 1, T, 4); if (dn !== "w") g.fillRect(X, Y + T - 5, T, 4);
      break;
    }
    case "f": grass(g, X, Y, x, y); for (const [a, b, col] of [[8, 10, K.orange], [22, 8, K.yellow], [14, 22, "#e66b9a"], [25, 21, "#fff"]]) { g.fillStyle = "#4e9a5c"; g.fillRect(X + a - .5, Y + b, 1.2, 5); g.fillStyle = col; g.beginPath(); g.arc(X + a, Y + b, 3, 0, 7); g.fill(); g.fillStyle = K.yellow; g.beginPath(); g.arc(X + a, Y + b, 1, 0, 7); g.fill(); } break;
    default: grass(g, X, Y, x, y);
  }
}
function decorPueblo(g) {
  // la cancha: líneas y arcos
  g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2;
  g.strokeRect(23 * T + 4, 29 * T + 4, 11 * T - 8, 4 * T - 8);
  g.beginPath(); g.moveTo(28.5 * T, 29 * T + 4); g.lineTo(28.5 * T, 33 * T - 4); g.stroke();
  g.beginPath(); g.arc(28.5 * T, 31 * T, 18, 0, 7); g.stroke();
  for (const gx of [23 * T + 4, 34 * T - 4]) { g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(gx, 30.2 * T); g.lineTo(gx + (gx < 28 * T ? -8 : 8), 30.2 * T); g.lineTo(gx + (gx < 28 * T ? -8 : 8), 31.8 * T); g.lineTo(gx, 31.8 * T); g.stroke(); }
  // solera de la plaza
  g.strokeStyle = "rgba(11,37,102,.18)"; g.lineWidth = 2; g.strokeRect(4 * T + 1, 11 * T + 1, 11 * T - 2, 7 * T - 2); g.strokeRect(29 * T + 1, 11 * T + 1, 12 * T - 2, 6 * T - 2);
  // sombras suaves de los edificios
  g.fillStyle = "rgba(11,37,102,.10)";
  [[17 * T, 6 * T, 10 * T], [9 * T, 5 * T, 6 * T], [35 * T, 11 * T, 6 * T], ...HOUSES.map(([x, y]) => [x * T, (y + 3) * T, 4 * T])].forEach(([x, y, w]) => { g.beginPath(); g.ellipse(x + w / 2 + 6, y + 2, w / 2 + 4, 6, 0, 0, 7); g.fill(); });
}

// ----- Suelo de los interiores
function groundIn(g, x, y) {
  const c = base[y][x], X = x * T, Y = y * T, sc = SC();
  switch (c) {
    case "o": for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { g.fillStyle = (x * 2 + i + y * 2 + j) % 2 ? "#c9876a" : "#f1e7d5"; g.fillRect(X + i * 16, Y + j * 16, 16, 16); } g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(X, Y, T, 2); break;
    case "a": g.fillStyle = "#9c2f3a"; g.fillRect(X, Y, T, T); g.fillStyle = "#d9a520"; g.fillRect(X + 3, Y, 2, T); g.fillRect(X + T - 5, Y, 2, T); g.fillStyle = "rgba(0,0,0,.08)"; for (let i = 0; i < T; i += 4) g.fillRect(X + 6, Y + i, T - 12, 1); break;
    case "P": { g.fillStyle = hash(x, y, 5) < .5 ? "#f4eee3" : "#efe7da"; g.fillRect(X, Y, T, T); g.strokeStyle = "rgba(150,130,110,.12)"; g.lineWidth = 1; g.beginPath(); g.moveTo(X + hash(x, y, 6) * T, Y); g.quadraticCurveTo(X + 16, Y + 16, X + hash(x, y, 7) * T, Y + T); g.stroke(); g.strokeStyle = "rgba(11,37,102,.08)"; g.strokeRect(X + .5, Y + .5, T - 1, T - 1); break; }
    case "_": { const wood = S.scene === "casa" ? ["#c99566", "#c28d5e"] : ["#d8ad7e", "#d2a574"]; for (let j = 0; j < 4; j++) { g.fillStyle = wood[(j + y) % 2]; g.fillRect(X, Y + j * 8, T, 8); g.fillStyle = "rgba(90,50,20,.25)"; g.fillRect(X, Y + j * 8 + 7, T, 1); const cut = Math.floor(hash(x, y * 4 + j, 8) * T); g.fillRect(X + cut, Y + j * 8, 1, 8); } break; }
    case "=": for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = (i + j) % 2 ? "#b98656" : "#c99a6a"; if ((i + j) % 2) g.fillRect(X + i * 8, Y + j * 8, 8, 8); else { g.fillRect(X + i * 8, Y + j * 8, 8, 8); g.fillStyle = "rgba(90,50,20,.2)"; g.fillRect(X + i * 8, Y + j * 8 + 3, 8, 1); } } break;
    case "W": case "V": case "E": {
      const floor = { capilla: "o", salon: "_", biblio: "=", casa: "_" }[S.scene];
      if (c === "E") { base[y][x] = floor; groundIn(g, x, y); base[y][x] = "E"; g.fillStyle = "rgba(255,246,210,.85)"; g.fillRect(X, Y + 4, T, T - 4); g.fillStyle = K.wood2; g.fillRect(X, Y, T, 4); break; }
      if (y < sc.back) { g.fillStyle = sc.wall; g.fillRect(X, Y, T, T); if (y === 0) { g.fillStyle = "rgba(11,37,102,.12)"; g.fillRect(X, Y, T, 6); } if (y === sc.back - 1) { g.fillStyle = sc.wain; g.fillRect(X, Y + T - 12, T, 12); g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(X, Y + T - 12, T, 2); } break; }
      g.fillStyle = sc.wallTop; g.fillRect(X, Y, T, T);
      g.fillStyle = "rgba(11,37,102,.18)"; if (x === 0) g.fillRect(X + T - 3, Y, 3, T); if (x === W - 1) g.fillRect(X, Y, 3, T); if (y === H - 1) g.fillRect(X, Y, T, 3);
      if (c === "V") { const cols = ["#1351a4", "#ffba03", "#ef591c", "#3aa57a"]; for (let i = 0; i < 4; i++) { g.fillStyle = cols[(i + y) % 4]; g.fillRect(X + 12, Y + 2 + i * 7, 8, 7); } g.strokeStyle = OL; g.lineWidth = 1.5; g.strokeRect(X + 12, Y + 2, 8, 28); }
      break;
    }
    default: g.fillStyle = "#ddd"; g.fillRect(X, Y, T, T);
  }
}
function decorCapilla(g) {
  // Retablo: cortina granate, marco de madera y el Cristo crucificado
  const cx = 6.5 * T;
  g.fillStyle = "#7a4d2a"; rr(g, cx - 62, 6, 124, 90, 10); g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#9c2f3a"; g.beginPath(); g.moveTo(cx - 50, 92); g.lineTo(cx - 50, 30); g.arc(cx, 30, 50, Math.PI, 0); g.lineTo(cx + 50, 92); g.closePath(); g.fill();
  g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1.5; for (let i = -40; i <= 40; i += 10) { g.beginPath(); g.moveTo(cx + i, 30 - Math.sqrt(Math.max(0, 2500 - i * i)) + 20); g.lineTo(cx + i, 92); g.stroke(); }
  g.strokeStyle = "#d9a520"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 50, 92); g.lineTo(cx - 50, 30); g.arc(cx, 30, 50, Math.PI, 0); g.lineTo(cx + 50, 92); g.stroke();
  // cruz y Cristo
  g.fillStyle = "#5a3820"; g.strokeStyle = OL; g.lineWidth = 1.5; g.fillRect(cx - 3, 12, 6, 58); g.strokeRect(cx - 3, 12, 6, 58); g.fillRect(cx - 22, 24, 44, 6); g.strokeRect(cx - 22, 24, 44, 6);
  g.strokeStyle = "#e9c29b"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 19, 27); g.lineTo(cx, 32); g.lineTo(cx + 19, 27); g.moveTo(cx, 30); g.lineTo(cx, 50); g.lineTo(cx - 1, 60); g.moveTo(cx, 50); g.lineTo(cx + 1, 60); g.stroke();
  g.fillStyle = "#f3efe6"; g.fillRect(cx - 4, 44, 8, 6);
  g.fillStyle = "#e9c29b"; g.beginPath(); g.arc(cx, 23, 4, 0, 7); g.fill(); g.strokeStyle = "#d9a520"; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, 23, 6.5, 0, 7); g.stroke();
  g.fillStyle = "#fff"; g.fillRect(cx - 5, 9, 10, 4);
  // vitrales del fondo
  stainedGlass(g, 1.6 * T, 10, 38, 66, 1); stainedGlass(g, 10.2 * T, 10, 38, 66, 2);
  // Sagrario dorado sobre su pedestal
  const sx = 6.5 * T, sy = 2 * T;
  g.fillStyle = "#cfc6b6"; g.fillRect(sx - 14, sy + 14, 28, 18); g.strokeStyle = OL; g.lineWidth = 1.5; g.strokeRect(sx - 14, sy + 14, 28, 18);
  const gg = g.createLinearGradient(sx - 12, 0, sx + 12, 0); gg.addColorStop(0, "#b9861a"); gg.addColorStop(.5, "#ffd76a"); gg.addColorStop(1, "#b9861a");
  g.fillStyle = gg; g.beginPath(); g.moveTo(sx - 12, sy + 15); g.lineTo(sx - 12, sy - 2); g.lineTo(sx, sy - 10); g.lineTo(sx + 12, sy - 2); g.lineTo(sx + 12, sy + 15); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "#7a5a10"; g.strokeRect(sx - 7, sy, 14, 13); g.fillStyle = "#fff6e5"; g.fillRect(sx - 1, sy + 2, 2, 9); g.fillRect(sx - 4, sy + 5, 8, 2);
  // vía crucis en los muros laterales
  for (const y of [4, 7, 11, 15, 19]) for (const x of [0, 12]) { const X = x * T + (x ? 8 : 16), Y = y * T + 8; g.fillStyle = "#6b4423"; g.fillRect(X + 3, Y, 2.5, 14); g.fillRect(X, Y + 4, 8.5, 2.5); }
  // luz de colores de los vitrales sobre el suelo
  const VC = ["rgba(19,81,164,.13)", "rgba(255,186,3,.15)", "rgba(239,89,28,.12)", "rgba(58,165,122,.13)"];
  [5, 9, 13, 17].forEach((y, i) => {
    g.fillStyle = VC[i % 4]; g.beginPath(); g.moveTo(T, y * T + 4); g.lineTo(T, y * T + 28); g.lineTo(T + 110, y * T + 78); g.lineTo(T + 110, y * T + 40); g.closePath(); g.fill();
    g.fillStyle = VC[(i + 2) % 4]; g.beginPath(); g.moveTo(12 * T, y * T + 4); g.lineTo(12 * T, y * T + 28); g.lineTo(12 * T - 110, y * T + 78); g.lineTo(12 * T - 110, y * T + 40); g.closePath(); g.fill();
  });
  // grada del presbiterio
  g.fillStyle = "rgba(11,37,102,.22)"; g.fillRect(T, 7 * T - 5, 11 * T, 5); g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(T, 7 * T - 6, 11 * T, 1.5);
  // alfombra del pasillo sube al presbiterio
  g.fillStyle = "#9c2f3a"; g.fillRect(6 * T, 5 * T + 4, T, 2 * T - 4); g.fillStyle = "#d9a520"; g.fillRect(6 * T + 3, 5 * T + 4, 2, 2 * T - 4); g.fillRect(7 * T - 5, 5 * T + 4, 2, 2 * T - 4);
}
function winCurtain(g, x, y, w, h) {
  glass(g, x, y, w, h);
  g.fillStyle = K.yellow; g.strokeStyle = OL; g.lineWidth = 1.2;
  for (const s of [0, 1]) { g.beginPath(); const cx = s ? x + w + 4 : x - 4, d = s ? -1 : 1; g.moveTo(cx, y - 4); g.lineTo(cx + d * 12, y - 4); g.quadraticCurveTo(cx + d * 4, y + h / 2, cx + d * 10, y + h + 4); g.lineTo(cx, y + h + 4); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = K.wood2; g.fillRect(x - 8, y - 6, w + 16, 3);
}
function decorSalon(g) {
  winCurtain(g, 3 * T + 4, 10, 2 * T - 8, 34); winCurtain(g, 9 * T + 4, 10, 2 * T - 8, 34);
  // tablero de servicios
  const bx = 6 * T + 2, by = 8;
  g.fillStyle = "#c9935e"; g.strokeStyle = OL; g.lineWidth = 2; rr(g, bx, by, 2 * T - 4, 44, 3); g.fill(); g.stroke();
  g.fillStyle = K.navy; g.fillRect(bx + 4, by + 4, 2 * T - 12, 8); g.fillStyle = "#fff"; g.font = "bold 6px sans-serif"; g.textAlign = "center"; g.fillText("SERVICIOS", bx + T - 2, by + 10.2);
  [[6, 16, K.yellow], [22, 15, K.sky], [38, 17, "#ff8f6b"], [12, 29, "#fff"], [30, 30, K.yellow], [46, 28, "#3aa57a"]].forEach(([a, b, c]) => { g.fillStyle = c; g.fillRect(bx + a, by + b, 12, 10); g.fillStyle = K.orange; g.beginPath(); g.arc(bx + a + 6, by + b + 1, 1.5, 0, 7); g.fill(); });
  // cruz de madera sobre el tablero y afiche del grupo
  g.fillStyle = K.wood2; g.fillRect(1 * T + 14, 6, 4, 22); g.fillRect(1 * T + 8, 12, 16, 4);
  g.fillStyle = "#fff"; g.strokeStyle = OL; g.lineWidth = 1.5; g.fillRect(11 * T + 6, 8, 22, 30); g.strokeRect(11 * T + 6, 8, 22, 30); g.fillStyle = K.orange; g.beginPath(); g.arc(11 * T + 17, 20, 6, 0, 7); g.fill(); g.fillStyle = K.navy; g.fillRect(11 * T + 9, 30, 16, 3);
  // botiquín
  g.fillStyle = "#fff"; g.fillRect(12 * T + 6, 26, 20, 16); g.strokeRect(12 * T + 6, 26, 20, 16); g.fillStyle = "#d33"; g.fillRect(12 * T + 14, 29, 4, 10); g.fillRect(12 * T + 11, 32, 10, 4);
  // alfombra del círculo
  g.fillStyle = "rgba(255,186,3,.35)"; g.beginPath(); g.ellipse(7 * T, 5.5 * T, 2.6 * T, 2.2 * T, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(239,89,28,.4)"; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.ellipse(7 * T, 5.5 * T, 2.4 * T, 2 * T, 0, 0, 7); g.stroke(); g.setLineDash([]);
  // paño del centro con la Biblia y la cruz
  g.fillStyle = K.orange; g.strokeStyle = OL; g.lineWidth = 1.5; rr(g, 6 * T + 2, 5 * T + 4, 2 * T - 4, T - 8, 6); g.fill(); g.stroke();
  g.fillStyle = K.yellow; g.beginPath(); g.moveTo(6 * T + 8, 5 * T + 8); g.lineTo(8 * T - 8, 6 * T - 8); g.lineTo(8 * T - 8, 5 * T + 8); g.lineTo(6 * T + 8, 6 * T - 8); g.closePath(); g.fill();
  g.fillStyle = "#6b2b1a"; g.fillRect(6 * T + 10, 5 * T + 10, 14, 11); g.strokeRect(6 * T + 10, 5 * T + 10, 14, 11); g.fillStyle = "#d9a520"; g.fillRect(6 * T + 16, 5 * T + 12, 2, 7); g.fillRect(6 * T + 14, 5 * T + 14, 6, 2);
  g.fillStyle = "#fff"; g.fillRect(7 * T + 10, 5 * T + 10, 6, 12); g.strokeRect(7 * T + 10, 5 * T + 10, 6, 12);
}
function decorBiblio(g) {
  glass(g, 2 * T + 4, 8, 2 * T - 8, 40); glass(g, 10 * T + 4, 8, 2 * T - 8, 40);
  g.fillStyle = "#fff"; g.strokeStyle = OL; g.lineWidth = 2; g.fillRect(6 * T + 4, 10, 2 * T - 8, 34); g.strokeRect(6 * T + 4, 10, 2 * T - 8, 34);
  g.fillStyle = K.navy; g.font = "bold 7px sans-serif"; g.textAlign = "center"; g.fillText("«Tu Palabra", 7 * T, 24); g.fillText("es lámpara»", 7 * T, 33); g.fillStyle = K.orange; g.fillText("Sal 119", 7 * T, 41);
  g.fillStyle = "rgba(19,81,164,.25)"; rr(g, 4 * T, 4 * T + 6, 6 * T, 4 * T - 6, 8); g.fill();
  g.strokeStyle = "rgba(255,186,3,.6)"; g.lineWidth = 3; rr(g, 4 * T + 6, 4 * T + 12, 6 * T - 12, 4 * T - 18, 6); g.stroke();
}
function decorCasa(g) {
  for (let x = 0; x < W * T; x += 10) { g.fillStyle = "rgba(239,89,28,.07)"; g.fillRect(x, 0, 4, 2 * T - 12); }
  winCurtain(g, 4 * T + 6, 10, 2 * T - 12, 30);
  // fotos y crucifijo
  g.strokeStyle = OL; g.lineWidth = 1.5;
  [[6 * T + 10, 12, 14, 16], [7 * T + 6, 8, 18, 14], [7 * T + 28, 16, 12, 14]].forEach(([x, y, w, h]) => { g.fillStyle = K.wood2; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle = "#efe1c6"; g.fillRect(x, y, w, h); g.fillStyle = "#c9a27e"; g.beginPath(); g.arc(x + w / 2, y + h / 2, 3, 0, 7); g.fill(); });
  g.fillStyle = K.wood2; g.fillRect(3 * T + 14, 8, 3, 20); g.fillRect(3 * T + 9, 13, 13, 3);
  // el tubo de la cocina sube por el muro
  g.fillStyle = "#3a3a44"; g.fillRect(1.5 * T - 4, 0, 8, 2 * T); g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(1.5 * T - 3, 0, 2, 2 * T);
  // alfombra
  g.fillStyle = "#c0397a"; g.globalAlpha = .55; rr(g, 3 * T + 10, 5 * T, 4 * T - 20, 2 * T - 10, 6); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = "rgba(255,186,3,.8)"; g.lineWidth = 2; rr(g, 3 * T + 14, 5 * T + 4, 4 * T - 28, 2 * T - 18, 4); g.stroke();
}
function ensureGround() {
  const key = S.scene + "|" + SCL + "|" + (S.lamp ? 1 : 0);
  if (ground && groundKey === key) return;
  ground = document.createElement("canvas"); ground.width = Math.ceil(W * T * SCL); ground.height = Math.ceil(H * T * SCL);
  const g = ground.getContext("2d"); g.scale(SCL, SCL); g.lineJoin = "round"; g.lineCap = "round";
  const paint = S.scene === "pueblo" ? groundPueblo : groundIn;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) paint(g, x, y);
  ({ pueblo: decorPueblo, capilla: decorCapilla, salon: decorSalon, biblio: decorBiblio, casa: decorCasa })[S.scene](g);
  groundKey = key;
}

// ----- Objetos y edificios (cada uno se pinta una vez y se guarda)
function paintTree(g, v) { // 56×70, la base queda en (28,64)
  g.fillStyle = "rgba(11,37,102,.18)"; g.beginPath(); g.ellipse(30, 63, 17, 5, 0, 0, 7); g.fill();
  g.fillStyle = "#8a5a2c"; g.strokeStyle = OL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(24, 64); g.lineTo(25.5, 38); g.lineTo(30.5, 38); g.lineTo(32, 64); g.closePath(); g.fill(); g.stroke();
  if (v === 2) {
    const cols = ["#2f7a55", "#3a8a5f", "#4a9c6a"];
    for (let i = 0; i < 3; i++) { const y0 = 50 - i * 14, w = 24 - i * 5; g.fillStyle = cols[i]; g.beginPath(); g.moveTo(28 - w, y0); g.quadraticCurveTo(28, y0 + 4, 28 + w, y0); g.lineTo(28, y0 - 24); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.moveTo(28, y0 - 22); g.lineTo(28 - w * .5, y0 - 2); g.lineTo(28 - w * .2, y0 - 2); g.closePath(); g.fill(); }
    return;
  }
  const dark = v ? "#4a9459" : "#55a361", mid = v ? "#61ad68" : "#6bb86e", light = v ? "#8ccb83" : "#97d48d";
  const blobs = [[28, 31, 19], [14, 37, 12], [42, 37, 12], [21, 19, 13], [36, 20, 12]];
  g.strokeStyle = OL; g.lineWidth = 3; for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a, b, r, 0, 7); g.stroke(); }
  g.fillStyle = dark; for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); }
  g.fillStyle = mid; for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a - 2, b - 3, r * .72, 0, 7); g.fill(); }
  g.fillStyle = light; for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a - 4, b - 6, r * .33, 0, 7); g.fill(); }
  if (v === 1) for (const [a, b] of [[20, 30], [36, 26], [30, 40]]) { g.fillStyle = "#e66b9a"; g.beginPath(); g.arc(a, b, 2, 0, 7); g.fill(); }
}
function paintBush(g) { // 36×32
  g.fillStyle = "rgba(11,37,102,.16)"; g.beginPath(); g.ellipse(18, 28, 15, 4, 0, 0, 7); g.fill();
  const b = [[10, 18, 9], [24, 17, 10], [17, 11, 9]];
  g.strokeStyle = OL; g.lineWidth = 2.6; for (const [a, c, r] of b) { g.beginPath(); g.arc(a, c, r, 0, 7); g.stroke(); }
  g.fillStyle = "#5ea865"; for (const [a, c, r] of b) { g.beginPath(); g.arc(a, c, r, 0, 7); g.fill(); }
  g.fillStyle = "#7cc27a"; for (const [a, c, r] of b) { g.beginPath(); g.arc(a - 2, c - 3, r * .55, 0, 7); g.fill(); }
}
function paintBench(g) { // 32×24
  g.strokeStyle = OL; g.lineWidth = 1.5;
  g.fillStyle = "#3a3f55"; g.fillRect(5, 12, 3, 10); g.fillRect(24, 12, 3, 10);
  g.fillStyle = K.wood; for (let i = 0; i < 3; i++) { g.fillRect(2, 4 + i * 4, 28, 3); g.strokeRect(2, 4 + i * 4, 28, 3); }
  g.fillStyle = "#c98e58"; g.fillRect(2, 15, 28, 4); g.strokeRect(2, 15, 28, 4);
}
function paintFarol(g) { // 20×56, base (10,54)
  g.fillStyle = "rgba(11,37,102,.18)"; g.beginPath(); g.ellipse(10, 54, 6, 2, 0, 0, 7); g.fill();
  g.fillStyle = "#2b3550"; g.fillRect(8.5, 14, 3, 40); g.fillRect(6, 50, 8, 4);
  g.strokeStyle = OL; g.lineWidth = 1.4; g.fillStyle = "#ffe7a3"; g.beginPath(); g.moveTo(4, 4); g.lineTo(16, 4); g.lineTo(14, 16); g.lineTo(6, 16); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#2b3550"; g.fillRect(3, 2, 14, 3); g.fillRect(6, 16, 8, 2);
}
function paintCruz(g) { // 32×52
  g.fillStyle = "rgba(11,37,102,.18)"; g.beginPath(); g.ellipse(16, 50, 9, 3, 0, 0, 7); g.fill();
  g.fillStyle = K.wood; g.strokeStyle = OL; g.lineWidth = 1.6; g.fillRect(13, 4, 6, 46); g.strokeRect(13, 4, 6, 46); g.fillRect(4, 14, 24, 6); g.strokeRect(4, 14, 24, 6);
  g.fillStyle = "#c9c0b2"; g.fillRect(9, 44, 14, 6); g.strokeRect(9, 44, 14, 6);
}
function archWin(g, x, y, w, h) { g.fillStyle = "#e2d6c0"; rr(g, x - 3, y - 3, w + 6, h + 6, w / 2); g.fill(); glass(g, x, y, w, h, true); }
function paintCapilla(g) { // 320×204, en (17T, 0)
  g.fillStyle = "rgba(11,37,102,.14)"; g.beginPath(); g.ellipse(166, 198, 160, 9, 0, 0, 7); g.fill();
  g.save(); g.beginPath(); g.rect(10, 20, 300, 98); g.clip(); teja(g, 10, 20, 300, 98); g.fillStyle = "rgba(0,0,0,.10)"; g.fillRect(10, 20, 150, 98); g.restore();
  g.strokeStyle = OL; g.lineWidth = 2; g.strokeRect(10, 20, 300, 98);
  g.strokeStyle = "#8f3a22"; g.lineWidth = 4; g.beginPath(); g.moveTo(160, 20); g.lineTo(160, 118); g.stroke();
  // fachada de adobe blanqueado
  g.fillStyle = "#f8f3ea"; g.strokeStyle = OL; g.lineWidth = 2;
  g.beginPath(); g.moveTo(4, 196); g.lineTo(4, 118); g.lineTo(120, 88); g.lineTo(200, 88); g.lineTo(316, 118); g.lineTo(316, 196); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "#d9cdb6"; g.lineWidth = 4; g.beginPath(); g.moveTo(8, 123); g.lineTo(120, 94); g.moveTo(200, 94); g.lineTo(312, 123); g.stroke();
  g.fillStyle = "#e4d8c3"; g.fillRect(5, 184, 310, 11);
  g.fillStyle = "rgba(11,37,102,.05)"; [[6, 10], [106, 10], [204, 10], [304, 10]].forEach(([x, w]) => g.fillRect(x, 120, w, 64));
  archWin(g, 42, 134, 24, 40); archWin(g, 254, 134, 24, 40);
  // torre campanario sobre la puerta
  g.fillStyle = "#faf6ee"; g.fillRect(122, 30, 76, 166); g.strokeStyle = OL; g.lineWidth = 2; g.strokeRect(122, 30, 76, 166);
  g.fillStyle = "rgba(11,37,102,.07)"; g.fillRect(122, 30, 10, 166);
  g.fillStyle = "#e4d8c3"; g.fillRect(118, 28, 84, 6); g.strokeRect(118, 28, 84, 6);
  g.save(); g.beginPath(); g.moveTo(116, 30); g.lineTo(160, 4); g.lineTo(204, 30); g.closePath(); g.clip(); teja(g, 116, 2, 88, 30); g.restore();
  g.beginPath(); g.moveTo(116, 30); g.lineTo(160, 4); g.lineTo(204, 30); g.closePath(); g.strokeStyle = OL; g.stroke();
  g.fillStyle = "#d9a520"; g.fillRect(158.5, -2, 3, 9); g.fillRect(155, 1, 10, 2.5);
  g.fillStyle = "#24304f"; g.beginPath(); g.moveTo(141, 76); g.lineTo(141, 54); g.arc(160, 54, 19, Math.PI, 0); g.lineTo(179, 76); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#e4d8c3"; g.fillRect(137, 76, 46, 5); g.strokeRect(137, 76, 46, 5);
  g.fillStyle = K.sky; g.beginPath(); g.arc(160, 100, 9, 0, 7); g.fill(); g.stroke(); g.lineWidth = 1; g.beginPath(); g.moveTo(151, 100); g.lineTo(169, 100); g.moveTo(160, 91); g.lineTo(160, 109); g.stroke();
  g.fillStyle = K.navy; rr(g, 130, 115, 60, 11, 2); g.fill(); g.fillStyle = "#fff"; g.font = "bold 7px sans-serif"; g.textAlign = "center"; g.fillText("SAN MIGUEL", 160, 123.5);
  // puerta de madera con arco
  g.fillStyle = "#e4d8c3"; g.beginPath(); g.moveTo(132, 196); g.lineTo(132, 152); g.arc(160, 152, 28, Math.PI, 0); g.lineTo(188, 196); g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#7a4a26"; g.beginPath(); g.moveTo(138, 196); g.lineTo(138, 154); g.arc(160, 154, 22, Math.PI, 0); g.lineTo(182, 196); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1; for (let x = 144; x < 182; x += 6) { g.beginPath(); g.moveTo(x, 196); g.lineTo(x, 140); g.stroke(); }
  g.strokeStyle = OL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(160, 196); g.lineTo(160, 132); g.stroke();
  g.fillStyle = "#d9a520"; [[155, 172], [165, 172]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 1.8, 0, 7); g.fill(); });
  g.fillStyle = "#d9d4cc"; g.strokeStyle = "rgba(11,37,102,.5)"; g.fillRect(124, 196, 72, 4); g.strokeRect(124, 196, 72, 4); g.fillRect(118, 200, 84, 4); g.strokeRect(118, 200, 84, 4);
}
const HOUSE_COL = [["#e9f1f7", K.blue], ["#f6e3c4", "#7a4a26"], ["#f2d6b3", "#3aa57a"], ["#f4ead8", "#9c2f3a"]];
function paintHouse(g, i) { // 136×108, en (xT-4, yT-12)
  const [wall, door] = HOUSE_COL[i];
  g.fillStyle = "rgba(11,37,102,.14)"; g.beginPath(); g.ellipse(70, 104, 66, 6, 0, 0, 7); g.fill();
  g.fillStyle = wall; g.strokeStyle = OL; g.lineWidth = 2; g.fillRect(6, 50, 124, 56); g.strokeRect(6, 50, 124, 56);
  g.fillStyle = "rgba(11,37,102,.08)"; g.fillRect(7, 96, 122, 9);
  g.save(); g.beginPath(); g.moveTo(0, 56); g.lineTo(10, 6); g.lineTo(126, 6); g.lineTo(136, 56); g.closePath(); g.clip(); teja(g, 0, 4, 136, 54, i % 2 ? "#c65a32" : "#b9512f"); g.restore();
  g.beginPath(); g.moveTo(0, 56); g.lineTo(10, 6); g.lineTo(126, 6); g.lineTo(136, 56); g.closePath(); g.stroke();
  g.strokeStyle = "#7e3420"; g.lineWidth = 4; g.beginPath(); g.moveTo(10, 6); g.lineTo(126, 6); g.stroke();
  g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(6, 56, 124, 5);
  if (i === 0) { g.fillStyle = "#cfc6b6"; g.strokeStyle = OL; g.lineWidth = 1.6; g.fillRect(98, 0, 12, 22); g.strokeRect(98, 0, 12, 22); g.fillStyle = "#3a3a44"; g.fillRect(97, -2, 14, 4); }
  g.fillStyle = door; g.strokeStyle = OL; g.lineWidth = 2; g.fillRect(40, 66, 24, 40); g.strokeRect(40, 66, 24, 40);
  g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 1; g.strokeRect(44, 70, 16, 14); g.strokeRect(44, 88, 16, 14);
  g.fillStyle = "#d9a520"; g.beginPath(); g.arc(59, 88, 1.8, 0, 7); g.fill();
  g.fillStyle = door; g.strokeStyle = OL; g.lineWidth = 1.4; g.fillRect(80, 64, 8, 26); g.strokeRect(80, 64, 8, 26); g.fillRect(116, 64, 8, 26); g.strokeRect(116, 64, 8, 26);
  glass(g, 88, 64, 28, 26); g.fillStyle = "#e4d8c3"; g.fillRect(84, 90, 36, 4); g.strokeRect(84, 90, 36, 4);
  for (const [px, col] of [[28, K.orange], [72, "#e66b9a"]]) { g.fillStyle = "#b8653a"; g.strokeStyle = OL; g.lineWidth = 1.2; g.fillRect(px - 5, 98, 10, 8); g.strokeRect(px - 5, 98, 10, 8); g.fillStyle = "#4e9a5c"; g.beginPath(); g.arc(px, 95, 6, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(px - 2, 93, 2, 0, 7); g.arc(px + 3, 95, 2, 0, 7); g.fill(); }
}
function paintSalon(g) { // 192×112, en (9T, 1.5T)
  g.fillStyle = "rgba(11,37,102,.14)"; g.beginPath(); g.ellipse(98, 110, 94, 5, 0, 0, 7); g.fill();
  g.fillStyle = "#b9c4d0"; g.fillRect(2, 2, 188, 42);
  for (let x = 4; x < 190; x += 6) { g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x, 2, 2, 42); g.fillStyle = "rgba(11,37,102,.1)"; g.fillRect(x + 3, 2, 1.5, 42); }
  g.strokeStyle = OL; g.lineWidth = 2; g.strokeRect(2, 2, 188, 42); g.fillStyle = "#8e9aa8"; g.fillRect(0, 40, 192, 5); g.strokeRect(0, 40, 192, 5);
  g.fillStyle = "#fff6e5"; g.fillRect(4, 45, 184, 66); g.strokeRect(4, 45, 184, 66);
  g.fillStyle = K.yellow; g.fillRect(5, 46, 182, 6);
  g.fillStyle = "rgba(11,37,102,.08)"; g.fillRect(5, 101, 182, 9);
  glass(g, 14, 62, 40, 28); glass(g, 138, 62, 40, 28);
  g.fillStyle = K.navy; g.fillRect(66, 66, 60, 45); g.strokeRect(66, 66, 60, 45);
  glass(g, 70, 70, 24, 40); glass(g, 98, 70, 24, 40);
  g.fillStyle = "#fff"; g.fillRect(91, 88, 2, 8); g.fillRect(99, 88, 2, 8);
  g.fillStyle = K.navy; rr(g, 52, 53, 88, 11, 2); g.fill(); g.fillStyle = "#fff"; g.font = "bold 6.5px sans-serif"; g.textAlign = "center"; g.fillText("SALÓN PARROQUIAL", 96, 61);
  g.fillStyle = K.orange; g.beginPath(); g.arc(58, 58.5, 2.4, 0, 7); g.arc(134, 58.5, 2.4, 0, 7); g.fill();
}
function paintBiblio(g) { // 192×120, en (35T, 11T-120)
  g.fillStyle = "rgba(11,37,102,.14)"; g.beginPath(); g.ellipse(98, 118, 94, 5, 0, 0, 7); g.fill();
  g.fillStyle = "#c46a49"; g.fillRect(2, 16, 188, 104);
  for (let y = 18, r = 0; y < 120; y += 8, r++) { g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(2, y, 188, 1.2); for (let x = 2 + (r % 2) * 8; x < 190; x += 16) g.fillRect(x, y, 1.2, 8); }
  g.strokeStyle = OL; g.lineWidth = 2; g.strokeRect(2, 16, 188, 104);
  g.fillStyle = "#d8d1c3"; g.fillRect(0, 2, 192, 16); g.strokeRect(0, 2, 192, 16); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(1, 3, 190, 3);
  g.fillStyle = "#efe6d6"; g.fillRect(8, 38, 52, 46); g.fillRect(132, 38, 52, 46); glass(g, 12, 42, 44, 38); glass(g, 136, 42, 44, 38);
  g.fillStyle = "#efe6d6"; g.fillRect(62, 60, 68, 60); g.strokeRect(62, 60, 68, 60);
  g.fillStyle = "#7a4a26"; g.fillRect(68, 66, 27, 54); g.fillRect(97, 66, 27, 54); g.strokeRect(68, 66, 27, 54); g.strokeRect(97, 66, 27, 54);
  glass(g, 72, 70, 19, 20); glass(g, 101, 70, 19, 20);
  g.fillStyle = K.navy; rr(g, 56, 24, 80, 13, 2); g.fill(); g.fillStyle = "#fff"; g.font = "bold 8px sans-serif"; g.textAlign = "center"; g.fillText("BIBLIOTECA", 96, 33.5);
  for (const x of [58, 134]) { g.fillStyle = "#2b3550"; g.fillRect(x - 2, 70, 4, 10); g.fillStyle = "#ffe7a3"; g.beginPath(); g.arc(x, 68, 4, 0, 7); g.fill(); g.stroke(); }
}
function paintTorre(g) { // 160×190, en (3T, 7T-190)
  g.fillStyle = "rgba(11,37,102,.16)"; g.beginPath(); g.ellipse(86, 186, 58, 7, 0, 0, 7); g.fill();
  const gr = g.createLinearGradient(30, 0, 130, 0); gr.addColorStop(0, "#b9b1a2"); gr.addColorStop(.45, "#e6dfd2"); gr.addColorStop(1, "#c9c1b2");
  g.fillStyle = gr; g.beginPath(); g.moveTo(30, 52); g.lineTo(30, 182); g.ellipse(80, 182, 50, 7, 0, Math.PI, 0, true); g.lineTo(130, 52); g.closePath(); g.fill();
  g.strokeStyle = "rgba(11,37,102,.18)"; g.lineWidth = 1;
  for (let y = 62, r = 0; y < 182; y += 11, r++) { g.beginPath(); g.ellipse(80, y, 50, 6, 0, 0, Math.PI); g.stroke(); for (let k = 0; k < 5; k++) { const a = (k + (r % 2) * .5) / 5 * Math.PI, px = 80 - Math.cos(a) * 50; g.beginPath(); g.moveTo(px, y + Math.sin(a) * 6 - 11); g.lineTo(px, y + Math.sin(a) * 6); g.stroke(); } }
  g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.moveTo(30, 52); g.lineTo(30, 182); g.ellipse(80, 182, 50, 7, 0, Math.PI, 0, true); g.lineTo(130, 52); g.stroke();
  g.save(); g.beginPath(); g.moveTo(22, 58); g.lineTo(80, 2); g.lineTo(138, 58); g.ellipse(80, 58, 58, 8, 0, 0, Math.PI); g.closePath(); g.clip(); teja(g, 20, 0, 120, 70, "#b9512f"); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(20, 0, 50, 70); g.restore();
  g.beginPath(); g.moveTo(22, 58); g.lineTo(80, 2); g.lineTo(138, 58); g.ellipse(80, 58, 58, 8, 0, 0, Math.PI); g.closePath(); g.stroke();
  g.fillStyle = "#24304f"; g.beginPath(); g.moveTo(72, 116); g.lineTo(72, 100); g.arc(80, 100, 8, Math.PI, 0); g.lineTo(88, 116); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#7a4a26"; g.beginPath(); g.moveTo(68, 186); g.lineTo(68, 160); g.arc(80, 160, 12, Math.PI, 0); g.lineTo(92, 186); g.closePath(); g.fill(); g.stroke();
}
// Interiores
function paintPewSeat(g) { // 128×34: el asiento (queda debajo de quien se sienta)
  g.strokeStyle = OL; g.lineWidth = 1.5;
  g.fillStyle = "#a8703f"; g.fillRect(4, 6, 120, 12); g.strokeRect(4, 6, 120, 12);
  g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1; for (let y = 9; y < 18; y += 3) { g.beginPath(); g.moveTo(5, y); g.lineTo(123, y); g.stroke(); }
}
function paintPewBack(g) { // 128×34: el respaldo y los costados (tapan la espalda de quien se sienta)
  g.strokeStyle = OL; g.lineWidth = 1.5; g.fillStyle = "#8f5c32"; g.fillRect(4, 18, 120, 11); g.strokeRect(4, 18, 120, 11);
  g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(5, 19, 118, 2);
  g.fillStyle = "#6e4426"; rr(g, 0, 2, 7, 30, 3); g.fill(); g.stroke(); rr(g, 121, 2, 7, 30, 3); g.fill(); g.stroke();
}
function paintAltar(g) { // 96×46, en (5T, 4T-14)
  g.fillStyle = "rgba(11,37,102,.18)"; g.fillRect(4, 42, 90, 4);
  g.fillStyle = "#e7e1d6"; g.strokeStyle = OL; g.lineWidth = 2; g.fillRect(2, 8, 92, 36); g.strokeRect(2, 8, 92, 36);
  g.fillStyle = "#fff"; g.fillRect(0, 4, 96, 12); g.strokeRect(0, 4, 96, 12);
  g.fillStyle = "#fbfaf6"; g.fillRect(6, 16, 84, 22); g.strokeStyle = "#d9a520"; g.lineWidth = 2; g.strokeRect(9, 18, 78, 18);
  g.fillStyle = "#d9a520"; g.fillRect(46, 20, 4, 14); g.fillRect(41, 24, 14, 4);
  for (const x of [12, 84]) { g.fillStyle = "#d9a520"; g.strokeStyle = OL; g.lineWidth = 1.2; g.fillRect(x - 4, 6, 8, 3); g.fillRect(x - 1.5, -6, 3, 12); g.fillStyle = "#fffdf6"; g.fillRect(x - 2.5, -16, 5, 11); g.strokeRect(x - 2.5, -16, 5, 11); }
}
function paintAmbon(g) { // 32×46
  g.fillStyle = "rgba(11,37,102,.18)"; g.beginPath(); g.ellipse(16, 44, 12, 3, 0, 0, 7); g.fill();
  g.strokeStyle = OL; g.lineWidth = 1.6; g.fillStyle = K.wood; g.fillRect(9, 16, 14, 28); g.strokeRect(9, 16, 14, 28); g.fillRect(5, 40, 22, 5); g.strokeRect(5, 40, 22, 5);
  g.fillStyle = "#c98e58"; g.beginPath(); g.moveTo(2, 18); g.lineTo(30, 18); g.lineTo(27, 6); g.lineTo(5, 6); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#d9a520"; g.fillRect(14, 24, 4, 12); g.fillRect(11, 28, 10, 3);
}
function paintSede(g) { // 32×36
  g.strokeStyle = OL; g.lineWidth = 1.5; g.fillStyle = "#8f5c32"; g.fillRect(6, 0, 20, 18); g.strokeRect(6, 0, 20, 18); g.fillStyle = "#9c2f3a"; g.fillRect(9, 3, 14, 12);
  g.fillStyle = "#a8703f"; g.fillRect(4, 18, 24, 12); g.strokeRect(4, 18, 24, 12); g.fillStyle = "#9c2f3a"; g.fillRect(7, 20, 18, 7);
}
function paintCredencia(g) { // 32×36
  g.strokeStyle = OL; g.lineWidth = 1.5; g.fillStyle = K.wood; g.fillRect(6, 18, 3, 16); g.fillRect(23, 18, 3, 16);
  g.fillStyle = "#fff"; g.fillRect(2, 12, 28, 8); g.strokeRect(2, 12, 28, 8);
  g.fillStyle = "#e8b931"; g.beginPath(); g.moveTo(12, 2); g.lineTo(20, 2); g.lineTo(17, 8); g.lineTo(17, 11); g.lineTo(20, 12); g.lineTo(12, 12); g.lineTo(15, 11); g.lineTo(15, 8); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "rgba(200,230,255,.9)"; g.fillRect(4, 5, 4, 7); g.strokeRect(4, 5, 4, 7); g.fillStyle = "rgba(156,47,58,.8)"; g.fillRect(24, 5, 4, 7); g.strokeRect(24, 5, 4, 7);
}
function paintVirgen(g) { // 32×60, base (16,58)
  g.strokeStyle = OL; g.lineWidth = 1.5; g.fillStyle = "#cfc6b6"; g.fillRect(4, 44, 24, 14); g.strokeRect(4, 44, 24, 14);
  for (const [x, c] of [[8, "#fff"], [24, "#fff"], [16, K.yellow]]) { g.fillStyle = "#4e9a5c"; g.beginPath(); g.arc(x, 44, 4, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, 42, 2.4, 0, 7); g.fill(); }
  g.fillStyle = "#fbfaf6"; g.beginPath(); g.moveTo(10, 44); g.lineTo(12, 18); g.lineTo(20, 18); g.lineTo(22, 44); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = K.blue; g.beginPath(); g.moveTo(16, 6); g.quadraticCurveTo(4, 14, 7, 44); g.lineTo(11, 44); g.quadraticCurveTo(10, 24, 16, 14); g.quadraticCurveTo(22, 24, 21, 44); g.lineTo(25, 44); g.quadraticCurveTo(28, 14, 16, 6); g.fill(); g.stroke();
  g.fillStyle = "#f2d2b3"; g.beginPath(); g.arc(16, 13, 4.5, 0, 7); g.fill(); g.stroke(); g.fillRect(14, 24, 4, 5);
  g.strokeStyle = "#d9a520"; g.lineWidth = 1.5; g.beginPath(); g.arc(16, 12, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
}
function paintMiguel(g) { // 32×60
  g.strokeStyle = OL; g.lineWidth = 1.5; g.fillStyle = "#cfc6b6"; g.fillRect(4, 44, 24, 14); g.strokeRect(4, 44, 24, 14);
  g.fillStyle = "#fff"; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(16, 22); g.quadraticCurveTo(16 + s * 16, 6, 16 + s * 13, 30); g.quadraticCurveTo(16 + s * 8, 26, 16, 26); g.fill(); g.stroke(); }
  g.fillStyle = "#9c2f3a"; g.beginPath(); g.moveTo(10, 20); g.lineTo(6, 44); g.lineTo(26, 44); g.lineTo(22, 20); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#c8cbd4"; g.fillRect(11, 20, 10, 14); g.strokeRect(11, 20, 10, 14); g.fillStyle = "#e8b931"; g.fillRect(11, 31, 10, 3);
  g.fillStyle = "#f2d2b3"; g.beginPath(); g.arc(16, 14, 4.5, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#c2732f"; g.beginPath(); g.arc(16, 12.5, 4.6, Math.PI, 0); g.fill();
  g.strokeStyle = "#c8cbd4"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(23, 22); g.lineTo(27, 0); g.stroke(); g.strokeStyle = "#e8b931"; g.lineWidth = 2; g.beginPath(); g.moveTo(21, 21); g.lineTo(26, 23); g.stroke();
}
function paintPila(g) { // 32×36
  g.fillStyle = "rgba(11,37,102,.18)"; g.beginPath(); g.ellipse(16, 34, 12, 3, 0, 0, 7); g.fill();
  g.strokeStyle = OL; g.lineWidth = 1.5; g.fillStyle = "#d8d1c3"; g.fillRect(12, 16, 8, 16); g.strokeRect(12, 16, 8, 16); g.fillRect(8, 30, 16, 4); g.strokeRect(8, 30, 16, 4);
  g.beginPath(); g.ellipse(16, 12, 14, 7, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#7cc8ef"; g.beginPath(); g.ellipse(16, 11, 10, 4.5, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.ellipse(13, 10, 3, 1.2, 0, 0, 7); g.fill();
}
function paintChair(g, dir) { // 32×32
  g.strokeStyle = OL; g.lineWidth = 1.4; g.fillStyle = "rgba(11,37,102,.15)"; g.fillRect(7, 26, 18, 3);
  g.fillStyle = K.wood; g.fillRect(7, 10, 18, 14); g.strokeRect(7, 10, 18, 14);
  g.fillStyle = "#8f5c32";
  if (dir === 0) { g.fillRect(6, 2, 20, 8); g.strokeRect(6, 2, 20, 8); }
  else if (dir === 3) { g.fillRect(6, 22, 20, 8); g.strokeRect(6, 22, 20, 8); }
  else { const x = dir === 2 ? 4 : 24; g.fillRect(x, 4, 5, 22); g.strokeRect(x, 4, 5, 22); }
}
function paintMesaOnce(g) { // 64×64
  g.fillStyle = "rgba(11,37,102,.15)"; g.fillRect(6, 56, 54, 5);
  g.strokeStyle = OL; g.lineWidth = 1.6; g.fillStyle = "#fff"; g.fillRect(4, 8, 56, 46); g.strokeRect(4, 8, 56, 46);
  g.fillStyle = "rgba(239,89,28,.25)"; for (let i = 0; i < 56; i += 8) { g.fillRect(4 + i, 8, 4, 46); g.fillRect(4, 8 + i, 56, 4); }
  g.fillStyle = "#3a3f55"; g.beginPath(); g.ellipse(20, 26, 8, 7, 0, 0, 7); g.fill(); g.stroke(); g.fillRect(26, 22, 6, 3);
  for (const [x, y] of [[40, 18], [48, 30], [14, 42]]) { g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#a0602b"; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
  g.fillStyle = "#e3a857"; g.beginPath(); g.ellipse(36, 42, 9, 6, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(32, 39); g.lineTo(34, 44); g.moveTo(37, 38); g.lineTo(39, 43); g.stroke();
}
function paintMeson(g) { // 64×40
  g.strokeStyle = OL; g.lineWidth = 1.6; g.fillStyle = "#e9eef2"; g.fillRect(2, 14, 60, 24); g.strokeRect(2, 14, 60, 24);
  g.fillStyle = "#c8d0d8"; g.fillRect(0, 8, 64, 8); g.strokeRect(0, 8, 64, 8);
  g.fillStyle = "#9fb0c0"; rr(g, 8, 9, 22, 6, 2); g.fill(); g.stroke(); g.strokeStyle = "#5b6878"; g.beginPath(); g.moveTo(19, 9); g.lineTo(19, 2); g.lineTo(23, 2); g.stroke();
  g.strokeStyle = OL; g.fillStyle = "#fff"; g.fillRect(40, 0, 12, 10); g.strokeRect(40, 0, 12, 10); g.fillStyle = K.orange; g.fillRect(42, 3, 8, 2);
  g.strokeStyle = "rgba(11,37,102,.4)"; g.beginPath(); g.moveTo(32, 16); g.lineTo(32, 38); g.stroke();
}
function paintPapelografo(g) { // 32×58
  g.strokeStyle = "#5a3820"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(6, 56); g.lineTo(14, 6); g.moveTo(26, 56); g.lineTo(18, 6); g.moveTo(16, 50); g.lineTo(16, 30); g.stroke();
  g.fillStyle = "#fff"; g.strokeStyle = OL; g.lineWidth = 1.4; g.fillRect(3, 4, 26, 32); g.strokeRect(3, 4, 26, 32);
  [[K.orange, 9], [K.blue, 16], [K.yellow, 23], ["#3aa57a", 30]].forEach(([c, y]) => { g.fillStyle = c; g.fillRect(7, y, 18, 3); });
}
function paintShelf(g, i) { // 64×42
  g.strokeStyle = OL; g.lineWidth = 1.6; g.fillStyle = "#7a4d2a"; g.fillRect(1, 0, 62, 40); g.strokeRect(1, 0, 62, 40);
  const cols = ["#1351a4", "#ef591c", "#ffba03", "#3aa57a", "#9c2f3a", "#8ad2fa", "#f3efe6", "#555b6e"];
  for (let r = 0; r < 3; r++) { g.fillStyle = "#5a3820"; g.fillRect(4, 3 + r * 12, 56, 11); let x = 5; while (x < 58) { const w = 3 + Math.floor(hash(i, x, r) * 4), h = 7 + Math.floor(hash(x, i, r) * 4); g.fillStyle = cols[Math.floor(hash(x, r, i + 3) * cols.length)]; g.fillRect(x, 14 + r * 12 - h, w, h); x += w + 1; } }
  g.fillStyle = "#e9dcc2"; g.fillRect(16, 34, 32, 6); g.strokeRect(16, 34, 32, 6);
}
function paintTablaLectura(g) { // 128×64
  g.fillStyle = "rgba(11,37,102,.15)"; g.fillRect(8, 58, 112, 5);
  g.strokeStyle = OL; g.lineWidth = 1.6; g.fillStyle = "#9a6a3e"; g.fillRect(4, 8, 120, 46); g.strokeRect(4, 8, 120, 46); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(6, 10, 116, 4);
  for (const x of [28, 100]) { g.fillStyle = "#d9a520"; g.fillRect(x - 1, 14, 2, 10); g.fillStyle = "#2f7a55"; g.beginPath(); g.moveTo(x - 9, 16); g.lineTo(x + 9, 16); g.lineTo(x + 5, 8); g.lineTo(x - 5, 8); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = "#fff"; g.fillRect(52, 26, 24, 16); g.strokeRect(52, 26, 24, 16); g.beginPath(); g.moveTo(64, 26); g.lineTo(64, 42); g.stroke();
  g.fillStyle = K.blue; g.fillRect(14, 34, 16, 10); g.strokeRect(14, 34, 16, 10); g.fillStyle = K.orange; g.fillRect(94, 32, 14, 12); g.strokeRect(94, 32, 14, 12);
}
function paintCocina(g) { // 64×44
  g.strokeStyle = OL; g.lineWidth = 1.6; g.fillStyle = "#2e3038"; g.fillRect(2, 8, 60, 34); g.strokeRect(2, 8, 60, 34);
  g.fillStyle = "#4a4d58"; g.fillRect(0, 4, 64, 8); g.strokeRect(0, 4, 64, 8); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(2, 5, 60, 2);
  g.fillStyle = "#555"; g.fillRect(6, 18, 22, 16); g.strokeRect(6, 18, 22, 16);
  g.fillStyle = "#d9a520"; g.fillRect(40, 20, 16, 3); g.fillRect(40, 30, 16, 3);
  g.fillStyle = "#3a3a44"; g.fillRect(20, -4, 8, 10);
  g.fillStyle = "#6b6f7a"; g.beginPath(); g.ellipse(46, 2, 9, 6, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(54, 2); g.lineTo(60, -2); g.stroke();
}
function paintMesaCasa(g) { // 64×64
  g.fillStyle = "rgba(11,37,102,.15)"; g.fillRect(6, 56, 54, 5);
  g.strokeStyle = OL; g.lineWidth = 1.5;
  for (const [x, y, w, h] of [[24, 0, 16, 8], [24, 56, 16, 8], [0, 24, 8, 16], [56, 24, 8, 16]]) { g.fillStyle = K.wood2; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h); }
  g.fillStyle = "#e9f0f7"; g.fillRect(6, 8, 52, 48); g.strokeRect(6, 8, 52, 48);
  g.fillStyle = "rgba(19,81,164,.22)"; for (let i = 0; i < 52; i += 8) { g.fillRect(6 + i, 8, 4, 48); g.fillRect(6, 8 + i, 52, 4); }
  g.fillStyle = "#c98e58"; g.beginPath(); g.ellipse(32, 32, 11, 8, 0, 0, 7); g.fill(); g.stroke();
  for (const [a, b] of [[28, 30], [35, 29], [32, 35]]) { g.fillStyle = "#d33"; g.beginPath(); g.arc(a, b, 3.5, 0, 7); g.fill(); }
}
function paintAparador(g) { // 32×46
  g.strokeStyle = OL; g.lineWidth = 1.6; g.fillStyle = K.wood2; g.fillRect(2, 14, 28, 30); g.strokeRect(2, 14, 28, 30);
  g.strokeRect(5, 20, 10, 20); g.strokeRect(17, 20, 10, 20);
  g.fillStyle = "#d9a520"; g.fillRect(6, 0, 14, 16); g.fillStyle = "#efe1c6"; g.fillRect(8, 2, 10, 12); g.fillStyle = "#c9a27e"; g.beginPath(); g.arc(11, 8, 2.5, 0, 7); g.arc(15, 8, 2.5, 0, 7); g.fill();
  g.fillStyle = "#4e9a5c"; g.beginPath(); g.arc(25, 8, 5, 0, 7); g.fill(); g.fillStyle = "#b8653a"; g.fillRect(22, 10, 6, 5);
}
function paintSofa(g) { // 32×64
  g.strokeStyle = OL; g.lineWidth = 1.6; g.fillStyle = "#3aa57a"; rr(g, 4, 2, 26, 60, 6); g.fill(); g.stroke();
  g.fillStyle = "#4fbb8d"; rr(g, 4, 8, 16, 48, 4); g.fill(); g.stroke(); g.beginPath(); g.moveTo(4, 32); g.lineTo(20, 32); g.stroke();
  g.fillStyle = K.yellow; rr(g, 8, 12, 9, 9, 3); g.fill(); g.stroke();
}
function paintSillon(g) { // 32×32 (mimbre, mirando a la derecha)
  g.strokeStyle = OL; g.lineWidth = 1.5; g.fillStyle = "#d8b57a"; rr(g, 4, 4, 24, 24, 6); g.fill(); g.stroke();
  g.fillStyle = "#c49a5c"; rr(g, 3, 4, 8, 24, 4); g.fill(); g.stroke();
  g.strokeStyle = "rgba(90,50,20,.3)"; g.lineWidth = 1; for (let i = 8; i < 28; i += 4) { g.beginPath(); g.moveTo(12, i); g.lineTo(27, i); g.stroke(); }
}

// Animaciones que van encima de los objetos
function flame(x, y, t, s = 1) {
  const f = Math.sin(t * 9 + x) * .8;
  g2.fillStyle = "rgba(255,200,80,.35)"; g2.beginPath(); g2.arc(x, y - 2 * s, 6 * s, 0, 7); g2.fill();
  g2.fillStyle = "#ffba03"; g2.beginPath(); g2.moveTo(x - 2.4 * s, y); g2.quadraticCurveTo(x + f, y - 9 * s, x + 2.4 * s, y); g2.closePath(); g2.fill();
  g2.fillStyle = "#fff6e5"; g2.beginPath(); g2.ellipse(x, y - 1.5 * s, 1 * s, 2.2 * s, 0, 0, 7); g2.fill();
}
function smoke(x, y, t) { for (let i = 0; i < 4; i++) { const p = ((t * .35 + i / 4) % 1); g2.fillStyle = `rgba(230,230,235,${.55 * (1 - p)})`; g2.beginPath(); g2.arc(x + Math.sin(p * 6 + i) * 5 + p * 10, y - p * 40, 4 + p * 8, 0, 7); g2.fill(); } }
function fountain(t) {
  const cx = 9.5 * T, cy = 14.1 * T;
  g2.fillStyle = "rgba(11,37,102,.16)"; g2.beginPath(); g2.ellipse(cx + 4, cy + 26, 48, 9, 0, 0, 7); g2.fill();
  g2.strokeStyle = OL; g2.lineWidth = 2; g2.fillStyle = "#d8d1c3"; g2.beginPath(); g2.ellipse(cx, cy + 6, 48, 26, 0, 0, 7); g2.fill(); g2.stroke();
  g2.fillStyle = "#c9c1b2"; g2.fillRect(cx - 48, cy + 6, 96, 10); g2.beginPath(); g2.ellipse(cx, cy + 16, 48, 26, 0, 0, Math.PI); g2.fill(); g2.stroke();
  g2.fillStyle = "#68bce9"; g2.beginPath(); g2.ellipse(cx, cy + 5, 40, 20, 0, 0, 7); g2.fill();
  g2.strokeStyle = "rgba(255,255,255,.6)"; g2.lineWidth = 1.2;
  for (let i = 0; i < 2; i++) { const p = (t * .5 + i / 2) % 1; g2.globalAlpha = 1 - p; g2.beginPath(); g2.ellipse(cx, cy + 5, 8 + p * 30, 4 + p * 15, 0, 0, 7); g2.stroke(); }
  g2.globalAlpha = 1;
  g2.fillStyle = "#d8d1c3"; g2.strokeStyle = OL; g2.lineWidth = 1.6; g2.fillRect(cx - 4, cy - 22, 8, 28); g2.strokeRect(cx - 4, cy - 22, 8, 28);
  g2.beginPath(); g2.ellipse(cx, cy - 22, 13, 5, 0, 0, 7); g2.fill(); g2.stroke();
  g2.strokeStyle = "rgba(138,210,250,.95)"; g2.lineWidth = 2;
  for (const s of [-1, 1]) { g2.beginPath(); g2.moveTo(cx + s * 4, cy - 28); g2.quadraticCurveTo(cx + s * 18, cy - 38, cx + s * 22, cy); g2.stroke(); }
  g2.fillStyle = "#cfefff"; for (let i = 0; i < 6; i++) { const p = (t * 1.2 + i / 6) % 1, s = i % 2 ? 1 : -1; g2.beginPath(); g2.arc(cx + s * (6 + p * 18), cy - 30 + p * 30 + (p * p) * 6, 1.4, 0, 7); g2.fill(); }
  g2.beginPath(); g2.moveTo(cx, cy - 26); g2.lineTo(cx, cy - 34 - Math.sin(t * 6) * 2); g2.strokeStyle = "#cfefff"; g2.stroke();
}
function bell(t) {
  const ring = S.inCh && CH().n === 6 && !goalsLeftSafe(), a = ring ? Math.sin(t * 4) * .45 : 0;
  g2.save(); g2.translate(17 * T + 160, 42); g2.rotate(a);
  g2.fillStyle = "#e8b931"; g2.strokeStyle = OL; g2.lineWidth = 1.6; g2.beginPath(); g2.moveTo(-6, 4); g2.quadraticCurveTo(-7, 18, -12, 22); g2.lineTo(12, 22); g2.quadraticCurveTo(7, 18, 6, 4); g2.quadraticCurveTo(0, -1, -6, 4); g2.fill(); g2.stroke();
  g2.fillStyle = "#8a6510"; g2.beginPath(); g2.arc(0, 23, 2.5, 0, 7); g2.fill(); g2.restore();
  if (ring) { g2.strokeStyle = "rgba(255,186,3,.7)"; g2.lineWidth = 2; for (let i = 0; i < 2; i++) { const p = (t * .8 + i / 2) % 1; g2.globalAlpha = 1 - p; g2.beginPath(); g2.arc(17 * T + 160, 56, 22 + p * 40, Math.PI * 1.1, Math.PI * 1.9); g2.stroke(); } g2.globalAlpha = 1; }
}
function capillaDoorGlow(t) {
  if (!(S.inCh && CH().n === 6 && !goalsLeftSafe())) return;
  const a = .35 + Math.sin(t * 3) * .15; g2.fillStyle = `rgba(255,186,3,${a})`; g2.beginPath(); g2.moveTo(17 * T + 138, 196); g2.lineTo(17 * T + 138, 154); g2.arc(17 * T + 160, 154, 22, Math.PI, 0); g2.lineTo(17 * T + 182, 196); g2.closePath(); g2.fill();
}

// Lista de objetos de cada lugar (se ordenan por altura para que se tapen bien)
const P_ = (y, bb, d) => ({ y, bb, d });
function buildProps() {
  const L = [];
  if (S.scene === "pueblo") {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = map[y][x], X = x * T, Y = y * T;
      if (c === "T") { const v = hash(x, y, 11) < .22 ? 2 : hash(x, y, 12) < .3 ? 1 : 0; L.push(P_(Y + 28, [X - 12, Y - 36, X + 44, Y + 34], () => blit(spr("tree" + v, 56, 70, (g) => paintTree(g, v)), X - 12, Y - 36, 56, 70))); }
      else if (c === "k") L.push(P_(Y + 26, [X - 2, Y - 4, X + 34, Y + 28], () => blit(spr("bush", 36, 32, paintBush), X - 2, Y - 4, 36, 32)));
      else if (c === "B") L.push(P_(Y + 26, [X, Y, X + 32, Y + 32], () => blit(spr("bench", 32, 24, paintBench), X, Y + 6, 32, 24)));
      else if (c === "i") L.push(P_(Y + 26, [X, Y - 30, X + 32, Y + 30], () => blit(spr("farol", 20, 56, paintFarol), X + 6, Y - 28, 20, 56)));
      else if (c === "+") L.push(P_(Y + 28, [X, Y - 22, X + 32, Y + 32], () => blit(spr("cruz", 32, 52, paintCruz), X, Y - 22, 32, 52)));
      else if (c === "J") L.push(P_(Y + 28, [X - 30, Y - 30, X + 60, Y + 40], () => cart(X + 16, Y + 16)));
    }
    L.push(P_(6 * T, [17 * T, 0, 27 * T, 6.5 * T], (t) => { blit(spr("capilla", 320, 204, paintCapilla), 17 * T, 0, 320, 204); bell(t); capillaDoorGlow(t); }));
    L.push(P_(5 * T, [9 * T, T, 15 * T, 5 * T], () => blit(spr("salon", 192, 112, paintSalon), 9 * T, 1.5 * T, 192, 112)));
    HOUSES.forEach(([x, y], i) => L.push(P_((y + 3) * T, [x * T - 4, y * T - 50, (x + 4) * T + 4, (y + 3) * T], (t) => { blit(spr("casa" + i, 136, 108, (g) => paintHouse(g, i)), x * T - 4, y * T - 12, 136, 108); if (i === 0) smoke(x * T + 100, y * T - 12, t); })));
    L.push(P_(7 * T, [3 * T, 0, 8 * T, 7 * T], () => blit(spr("torre", 160, 190, paintTorre), 3 * T, 7 * T - 190, 160, 190)));
    L.push(P_(11 * T, [35 * T, 7 * T, 41 * T, 11 * T], () => blit(spr("biblio", 192, 120, paintBiblio), 35 * T, 11 * T - 120, 192, 120)));
    L.push(P_(15 * T, [7 * T, 12 * T, 12 * T, 16 * T], (t) => fountain(t)));
  } else if (S.scene === "capilla") {
    for (const y of PEWS) for (const x of [2, 7]) {
      L.push(P_(y * T, [x * T, y * T - 2, (x + 4) * T, (y + 1) * T + 4], () => blit(spr("pewS", 128, 34, paintPewSeat), x * T, y * T - 2, 128, 34)));
      L.push(P_(y * T + 30, [x * T, y * T - 2, (x + 4) * T, (y + 1) * T + 4], () => blit(spr("pewB", 128, 34, paintPewBack), x * T, y * T - 2, 128, 34)));
    }
    L.push(P_(5 * T, [5 * T, 3 * T, 8 * T, 5 * T], (t) => { blit(spr("altar", 96, 62, (g) => { g.translate(0, 16); paintAltar(g); }), 5 * T, 4 * T - 30, 96, 62); const n = altarLit(); if (n > 0) flame(5 * T + 12, 4 * T - 30, t); if (n > 1) flame(5 * T + 84, 4 * T - 30, t); }));
    L.push(P_(7 * T - 2, [9 * T, 5 * T, 10 * T, 7 * T], () => { blit(spr("ambon", 32, 46, paintAmbon), 9 * T, 6 * T - 14, 32, 46); if (S.inCh && CH().n === 6 && Q().lecc) { g2.fillStyle = "#fff"; g2.strokeStyle = OL; g2.lineWidth = 1; g2.fillRect(9 * T + 8, 6 * T - 12, 16, 9); g2.strokeRect(9 * T + 8, 6 * T - 12, 16, 9); g2.fillStyle = "#9c2f3a"; g2.fillRect(9 * T + 15.5, 6 * T - 12, 1, 12); } }));
    L.push(P_(4 * T - 2, [2 * T, 2 * T, 3 * T, 4 * T], () => blit(spr("sede", 32, 36, paintSede), 2 * T, 3 * T - 6, 32, 36)));
    L.push(P_(4 * T - 2, [10 * T, 2 * T, 11 * T, 4 * T], () => blit(spr("credencia", 32, 36, paintCredencia), 10 * T, 3 * T - 6, 32, 36)));
    L.push(P_(9 * T - 2, [T, 6 * T, 2 * T, 9 * T], () => blit(spr("virgen", 32, 60, paintVirgen), T, 9 * T - 60, 32, 60)));
    L.push(P_(9 * T - 2, [11 * T, 6 * T, 12 * T, 9 * T], () => blit(spr("miguel", 32, 60, paintMiguel), 11 * T, 9 * T - 60, 32, 60)));
    L.push(P_(20 * T - 2, [2 * T, 19 * T, 3 * T, 20 * T], () => blit(spr("pila", 32, 36, paintPila), 2 * T, 19 * T - 6, 32, 36)));
  } else if (S.scene === "salon") {
    CHAIRS.forEach(([x, y]) => { const d = chairDir(x, y); L.push(P_(d === 3 ? y * T + 30 : y * T + 2, [x * T, y * T, (x + 1) * T, (y + 1) * T], () => blit(spr("silla" + d, 32, 32, (g) => paintChair(g, d)), x * T, y * T, 32, 32))); });
    L.push(P_(8 * T, [T, 6 * T, 3 * T, 8 * T], () => blit(spr("mesaonce", 64, 64, paintMesaOnce), T, 6 * T, 64, 64)));
    L.push(P_(3 * T, [10 * T, T, 12 * T, 3 * T], () => blit(spr("meson", 64, 40, paintMeson), 10 * T, 2 * T - 8, 64, 40)));
    L.push(P_(3 * T, [2 * T, 0, 3 * T, 3 * T], () => blit(spr("papel", 32, 58, paintPapelografo), 2 * T, 3 * T - 58, 32, 58)));
  } else if (S.scene === "biblio") {
    SHELVES.forEach((s, i) => L.push(P_((s.y + 1) * T, [s.x * T, s.y * T - 12, (s.x + 2) * T, (s.y + 1) * T], () => blit(spr("shelf" + i, 64, 42, (g) => paintShelf(g, i)), s.x * T, s.y * T - 10, 64, 42))));
    L.push(P_(7 * T, [5 * T, 5 * T, 9 * T, 7 * T], () => blit(spr("tabla", 128, 64, paintTablaLectura), 5 * T, 5 * T, 128, 64)));
  } else if (S.scene === "casa") {
    L.push(P_(3 * T, [T, T, 3 * T, 3 * T], (t) => { blit(spr("cocina", 64, 44, paintCocina), T, 2 * T - 12, 64, 44); smoke(2.4 * T + 6, 2 * T - 16, t * .7); const f = .5 + Math.sin(t * 8) * .2; g2.fillStyle = `rgba(255,140,40,${f})`; g2.fillRect(T + 8, 2 * T + 8, 20, 14); }));
    L.push(P_(5 * T, [5 * T, 3 * T, 7 * T, 5 * T], () => blit(spr("mesacasa", 64, 64, paintMesaCasa), 5 * T, 3 * T, 64, 64)));
    L.push(P_(3 * T, [8 * T, T, 9 * T, 3 * T], () => blit(spr("aparador", 32, 46, paintAparador), 8 * T, 3 * T - 46, 32, 46)));
    L.push(P_(6 * T, [8 * T, 4 * T, 9 * T, 6 * T], () => blit(spr("sofa", 32, 64, paintSofa), 8 * T, 4 * T, 32, 64)));
    L.push(P_(3 * T + 2, [3 * T, 3 * T, 4 * T, 4 * T], () => blit(spr("sillon", 32, 32, paintSillon), 3 * T, 3 * T, 32, 32)));
  }
  props = L;
}
const chairDir = (x, y) => { const dx = 6.5 - x, dy = 5 - y; return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0; };
const altarLit = () => (S.inCh && CH().n === 6 ? (Q().misa ? 2 : Q().cir || 0) : 0);

function cart(x, y) { // carrito de completos con su quitasol
  g2.save(); g2.translate(x, y); g2.lineWidth = 2; g2.strokeStyle = OL;
  g2.fillStyle = "rgba(11,37,102,.16)"; g2.beginPath(); g2.ellipse(2, 18, 22, 4, 0, 0, 7); g2.fill();
  g2.fillStyle = "#e8e8ee"; g2.fillRect(-18, -6, 36, 18); g2.strokeRect(-18, -6, 36, 18);
  g2.fillStyle = K.orange; g2.fillRect(-18, -6, 36, 6); g2.strokeRect(-18, -6, 36, 6);
  g2.fillStyle = K.white; g2.font = "bold 7px sans-serif"; g2.textAlign = "center"; g2.fillText("COMPLETOS", 0, 9);
  g2.fillStyle = "#555"; g2.beginPath(); g2.arc(-11, 14, 4, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.arc(11, 14, 4, 0, 7); g2.fill(); g2.stroke();
  g2.beginPath(); g2.moveTo(0, -6); g2.lineTo(0, -22); g2.stroke();
  for (let i = 0; i < 4; i++) { g2.fillStyle = i % 2 ? K.yellow : K.orange; g2.beginPath(); g2.moveTo(0, -30); g2.lineTo(-22 + i * 11, -20); g2.lineTo(-11 + i * 11, -20); g2.closePath(); g2.fill(); g2.stroke(); }
  g2.restore();
}

// ---------------------------------------------------------------------------
// Personajes del pueblo
// ---------------------------------------------------------------------------
const PEOPLE = {
  sofi: { n: "Sofi", look: { hair: "#6b3a22", skin: "#f1c7a1", shirt: K.sky, pants: "#2f4f8a", hs: "long" } },
  tomas: { n: "Tomás", look: { hair: "#222", skin: "#d8a77e", shirt: "#7d6bd6", pants: "#3b3b4f", hs: "short" } },
  ana: { n: "Ana", look: { hair: "#c2732f", skin: "#f6d3b3", shirt: "#e66b9a", pants: "#2f4f8a", hs: "pony" } },
  lucho: { n: "Don Lucho", look: { hair: "#e8e8e8", skin: "#e2b48c", shirt: "#8a6b4a", pants: "#5a5248", hs: "bald" }, old: true },
  marta: { n: "Profe Marta", look: { hair: "#4a2f20", skin: "#c48a64", shirt: "#3aa57a", pants: "#3b3b4f", hs: "bun" } },
  benja: { n: "Benja", look: { hair: "#111", skin: "#b9805a", shirt: "#555b6e", pants: "#2b2f3a", hs: "short", hood: true } },
  martina: { n: "Martina", look: { hair: "#e0b04a", skin: "#f6d3b3", shirt: "#ff8f6b", pants: "#2f4f8a", hs: "long" } },
  nico: { n: "Nico", look: { hair: "#7a4a2a", skin: "#f0c49a", shirt: "#2f8fd8", pants: "#3b3b4f", hs: "short" } },
  joaco: { n: "Joaquín", look: { hair: "#3b2a1f", skin: "#e9b98f", shirt: K.yellow, pants: "#2f4f8a", hs: "short" }, kid: true },
  carmen: { n: "Tía Carmen", look: { hair: "#5a3a26", skin: "#d7a77c", shirt: "#c0397a", pants: "#3b3b4f", hs: "bun" }, old: true },
  padre: { n: "Padre Andrés", look: { hair: "#444", skin: "#e2b48c", shirt: "#222", pants: "#222", hs: "short" }, priest: true },
  pepe: { n: "Pepe, el sacristán", look: { hair: "#777", skin: "#e2b48c", shirt: K.navy, pants: "#3b3b4f", hs: "bald" }, old: true },
  pato: { n: "Don Pato, el de los completos", look: { hair: "#5b4636", skin: "#d9a57b", shirt: "#ffffff", pants: "#3b3b4f", hs: "short", apron: true }, old: true },
  camin: { n: "Caminante", look: { hair: "#4b3426", skin: "#d7a77c", shirt: "#f3efe6", hs: "long", beard: true }, robe: true },
};
const LOOKS = [
  { hair: "#3b2a1f", skin: "#f2c9a0", shirt: K.orange, pants: "#2f4f8a", hs: "short" },
  { hair: "#1d1d2b", skin: "#c98e63", shirt: K.blue, pants: "#3b3b4f", hs: "short" },
  { hair: "#a8622e", skin: "#f6d3b3", shirt: K.yellow, pants: "#2f4f8a", hs: "long" },
  { hair: "#5a3a26", skin: "#8d5b3d", shirt: "#3aa57a", pants: "#3b3b4f", hs: "pony" },
];

function person(x, y, look, o = {}) {
  const g = g2, dir = o.dir || 0, w = o.walk || 0, moving = !!o.walk, s = o.kid ? .8 : 1;
  const bob = moving ? Math.abs(Math.sin(w)) * 1.5 : 0, side = dir === 1 || dir === 2, fx = dir === 1 ? -1 : dir === 2 ? 1 : 0, sw = moving ? Math.sin(w) * 3 : 0;
  g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(s, s); g.lineJoin = "round"; g.lineCap = "round";
  if (!o.sit) { g.fillStyle = "rgba(11,37,102,.22)"; g.beginPath(); g.ellipse(0, 13, 9, 3.2, 0, 0, 7); g.fill(); }
  g.translate(0, -bob);
  if (o.robe || o.alb) {
    g.fillStyle = o.alb ? "#fbfaf6" : look.shirt; g.strokeStyle = OL; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-7, -4); g.lineTo(7, -4); g.lineTo(10, o.sit ? 8 : 13); g.lineTo(-10, o.sit ? 8 : 13); g.closePath(); g.fill(); g.stroke();
    if (o.alb) { g.fillStyle = "#fffdf4"; g.beginPath(); g.moveTo(-10, -3); g.lineTo(10, -3); g.lineTo(9, 9); g.quadraticCurveTo(0, 12, -9, 9); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = "#d9a520"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 10); g.moveTo(-5, 2); g.lineTo(5, 2); g.stroke(); }
    else { g.strokeStyle = "#c98e63"; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, 3); g.lineTo(7, 3); g.stroke(); }
    if (moving) { g.fillStyle = "#6b4423"; g.fillRect(-5 + sw, 12, 4, 2); g.fillRect(1 - sw, 12, 4, 2); }
    const ax = side ? [0] : [-7, 7];
    for (const a of ax) { g.strokeStyle = OL; g.lineWidth = 5.4; g.beginPath(); g.moveTo(a * .9, -2); g.lineTo(a + (side ? -sw : 0), 5 + (side ? 0 : (a < 0 ? sw : -sw) * .4)); g.stroke(); g.strokeStyle = o.alb ? "#fbfaf6" : look.shirt; g.lineWidth = 3.6; g.stroke(); }
  } else {
    g.strokeStyle = look.pants || "#34405f"; g.lineWidth = 4.2; g.beginPath();
    if (o.sit) { if (dir !== 3) { if (side) { g.moveTo(-1, 5); g.lineTo(fx * 7, 7); g.moveTo(1, 5); g.lineTo(fx * 8, 8); } else { g.moveTo(-3, 5); g.lineTo(-3, 9); g.moveTo(3, 5); g.lineTo(3, 9); } } }
    else if (o.kneel) { g.moveTo(-3, 5); g.lineTo(-3, 8); g.moveTo(3, 5); g.lineTo(3, 8); }
    else if (side) { g.moveTo(0, 5); g.lineTo(sw * 1.3, 12); g.moveTo(0, 5); g.lineTo(-sw * 1.3, 12); }
    else { g.moveTo(-3, 5); g.lineTo(-3, 12 - Math.max(0, sw)); g.moveTo(3, 5); g.lineTo(3, 12 - Math.max(0, -sw)); }
    g.stroke();
    if (!o.sit && !o.kneel) { g.fillStyle = "#2b2f3a"; if (side) { g.fillRect(sw * 1.3 - 2 + fx, 11, 5, 2.4); g.fillRect(-sw * 1.3 - 2 + fx, 11, 5, 2.4); } else { g.fillRect(-5, 11 - Math.max(0, sw), 4, 2.4); g.fillRect(1, 11 - Math.max(0, -sw), 4, 2.4); } }
    const arm = (sx, sw2) => { const hx = side ? sw2 * 1.3 + fx : sx * 1.2, hy = side ? 5 : 5 + sw2 * .45; g.strokeStyle = OL; g.lineWidth = 5.4; g.beginPath(); g.moveTo(sx, -2); g.lineTo(hx, hy); g.stroke(); g.strokeStyle = look.shirt; g.lineWidth = 3.4; g.stroke(); g.fillStyle = look.skin; g.beginPath(); g.arc(hx, hy + 1, 1.9, 0, 7); g.fill(); };
    if (dir === 3 && !side) { arm(-6, sw); arm(6, -sw); }
    g.fillStyle = look.shirt; g.strokeStyle = OL; g.lineWidth = 1.6; rr(g, -7, -4, 14, 11, 4); g.fill(); g.stroke();
    g.fillStyle = "rgba(11,37,102,.12)"; rr(g, -7, 3, 14, 4, 3); g.fill();
    if (look.apron) { g.fillStyle = "#fff"; g.fillRect(-5, 0, 10, 7); g.strokeStyle = K.orange; g.lineWidth = 1; g.strokeRect(-5, 0, 10, 7); }
    if (o.priest) { g.fillStyle = "#fff"; g.fillRect(-2, -4, 4, 2.5); }
    if (side) arm(0, -sw); else if (dir !== 3) { arm(-6, sw); arm(6, -sw); }
  }
  head(g, look, dir, o, fx, side);
  g.restore();
}
function head(g, look, dir, o, fx, side) {
  const hy = -12, hs = look.hs || "short";
  g.strokeStyle = OL; g.lineWidth = 1.5;
  if (look.hood) { g.fillStyle = look.shirt; g.beginPath(); g.arc(0, hy, 10, 0, 7); g.fill(); g.stroke(); }
  if (!look.hood && (hs === "long" || (hs === "pony" && dir === 3))) { g.fillStyle = look.hair; rr(g, -9, hy - 3, 18, dir === 3 ? 17 : 15, 7); g.fill(); g.stroke(); }
  g.fillStyle = look.skin; g.beginPath(); g.arc(0, hy, 8, 0, 7); g.fill(); g.stroke();
  g.fillStyle = look.hair;
  if (hs === "bald") { g.beginPath(); g.arc(0, hy, 8.2, Math.PI * .85, Math.PI * 1.15); g.arc(0, hy, 8.2, Math.PI * 1.85, Math.PI * 2.15); g.fill(); if (dir === 3) { g.beginPath(); g.arc(0, hy + 2, 8, .2, Math.PI - .2); g.fill(); } }
  else if (dir === 3) { g.beginPath(); g.arc(0, hy, 8.3, 0, 7); g.fill(); g.stroke(); }
  else {
    g.beginPath(); g.moveTo(-8.4, hy + (hs === "long" ? 4 : 0)); g.arc(0, hy, 8.4, Math.PI, Math.PI * 2);
    if (side) { g.lineTo(8.4 * -fx, hy + 2); } else { g.quadraticCurveTo(4, hy - 1, 1, hy - 4); g.quadraticCurveTo(-4, hy - 2, -8.4, hy + (hs === "long" ? 4 : 0)); }
    g.fill();
    if (side && hs !== "short") { g.beginPath(); g.ellipse(-fx * 6, hy + 2, 3.5, 6, 0, 0, 7); g.fill(); }
  }
  if (hs === "pony" && dir !== 3) { g.beginPath(); g.ellipse(side ? -fx * 9 : 7, hy - 1, 3, 5, side ? 0 : .4, 0, 7); g.fill(); g.stroke(); }
  if (hs === "bun") { g.beginPath(); g.arc(0, hy - 8, 3.6, 0, 7); g.fill(); g.stroke(); }
  if (look.hood && dir !== 3) { g.strokeStyle = look.shirt; g.lineWidth = 2.4; g.beginPath(); g.arc(0, hy, 9, Math.PI * .9, Math.PI * 2.1); g.stroke(); }
  if (dir === 3) return;
  const ex = fx * 2.6;
  g.fillStyle = OL;
  if (side) { g.beginPath(); g.ellipse(fx * 4, hy + .5, 1.3, 1.8, 0, 0, 7); g.fill(); }
  else { g.beginPath(); g.ellipse(-3 + ex, hy + .5, 1.3, 1.8, 0, 0, 7); g.ellipse(3 + ex, hy + .5, 1.3, 1.8, 0, 0, 7); g.fill(); }
  g.fillStyle = "rgba(239,89,28,.28)"; g.beginPath(); g.arc(-4.6 + ex, hy + 3.4, 1.6, 0, 7); g.arc(4.6 + ex, hy + 3.4, 1.6, 0, 7); g.fill();
  g.strokeStyle = OL; g.lineWidth = 1.1; g.beginPath();
  if (o.sad) g.arc(ex * .8, hy + 7, 2, Math.PI + .4, -.4); else g.arc(ex * .8, hy + 3.2, 2, .25, Math.PI - .25);
  g.stroke();
  if (look.beard) { const a0 = Math.PI * .12, a1 = Math.PI * .88; g.fillStyle = look.hair; g.beginPath(); g.arc(0, hy, 8, a0, a1); g.quadraticCurveTo(ex * .6, hy + 4.2, Math.cos(a0) * 8, hy + Math.sin(a0) * 8); g.fill(); g.strokeStyle = "#f3efe6"; g.lineWidth = 1; g.beginPath(); g.arc(ex * .8, hy + 5, 1.6, .3, Math.PI - .3); g.stroke(); }
  if (o.old) { g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(-6 + ex, hy - 1, 4.4, 3.2); g.strokeRect(1.6 + ex, hy - 1, 4.4, 3.2); }
}
function dog(x, y, t, still) {
  const wag = Math.sin(t * 14) * .6, bob = still ? 0 : Math.abs(Math.sin(t * 10)) * 1.2;
  g2.save(); g2.translate(x, y - bob); g2.lineWidth = 1.6; g2.strokeStyle = OL; g2.lineJoin = "round";
  g2.fillStyle = "rgba(11,37,102,.18)"; g2.beginPath(); g2.ellipse(0, 10 + bob, 10, 3, 0, 0, 7); g2.fill();
  g2.strokeStyle = "#8a5a2c"; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(-8, 0); g2.lineTo(-13, -4 + wag * 4); g2.stroke();
  g2.strokeStyle = OL; g2.lineWidth = 1.6; g2.fillStyle = "#b5793f";
  for (const lx of [-6, -2, 3, 7]) { g2.fillRect(lx, 4, 2.5, 6); }
  g2.beginPath(); g2.ellipse(0, 2, 10, 6, 0, 0, 7); g2.fill(); g2.stroke();
  g2.beginPath(); g2.arc(9, -4, 5.5, 0, 7); g2.fill(); g2.stroke();
  g2.fillStyle = "#7a4a26"; g2.beginPath(); g2.ellipse(6, -7, 2.4, 4, -.5, 0, 7); g2.fill();
  g2.fillStyle = OL; g2.beginPath(); g2.arc(11, -5, 1.1, 0, 7); g2.arc(14.2, -3, 1.2, 0, 7); g2.fill();
  g2.fillStyle = K.orange; g2.fillRect(4, -1, 6, 2);
  g2.restore();
}
function sparkle(x, y, t, col = K.yellow) { g2.save(); g2.translate(x, y - 6 + Math.sin(t * 3) * 3); g2.fillStyle = col; g2.strokeStyle = OL; g2.lineWidth = 1.5; g2.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 3 : 8, a = (i * Math.PI) / 4; g2.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g2.closePath(); g2.fill(); g2.stroke(); g2.restore(); }
function pageIco(x, y, t) { g2.save(); g2.translate(x, y + Math.sin(t * 3) * 2); g2.rotate(-.15 + Math.sin(t * 2) * .1); g2.fillStyle = K.white; g2.strokeStyle = OL; g2.lineWidth = 2; g2.fillRect(-7, -9, 14, 18); g2.strokeRect(-7, -9, 14, 18); g2.strokeStyle = K.blue; g2.lineWidth = 1; for (let i = -5; i < 6; i += 3) { g2.beginPath(); g2.moveTo(-4, i); g2.lineTo(4, i); g2.stroke(); } g2.restore(); }
function food(x, y, t, fish) {
  g2.save(); g2.translate(x, y + Math.sin(t * 3) * 2); g2.lineWidth = 2; g2.strokeStyle = OL;
  g2.fillStyle = "rgba(11,37,102,.15)"; g2.beginPath(); g2.ellipse(0, 11, 8, 2.5, 0, 0, 7); g2.fill();
  if (fish) { g2.fillStyle = K.sky; g2.beginPath(); g2.ellipse(-2, 0, 9, 5, 0, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.moveTo(6, 0); g2.lineTo(12, -5); g2.lineTo(12, 5); g2.closePath(); g2.fill(); g2.stroke(); g2.fillStyle = OL; g2.beginPath(); g2.arc(-7, -1, 1.2, 0, 7); g2.fill(); }
  else { g2.fillStyle = "#e3a857"; g2.beginPath(); g2.ellipse(0, 0, 10, 7, 0, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.moveTo(-4, -4); g2.lineTo(-2, 2); g2.moveTo(2, -5); g2.lineTo(4, 1); g2.stroke(); }
  g2.restore();
}
function guitarCase(x, y) { g2.save(); g2.translate(x, y); g2.rotate(-.5); g2.fillStyle = "#2b2f3a"; g2.strokeStyle = OL; g2.lineWidth = 1.6; g2.beginPath(); g2.ellipse(0, 6, 7, 8, 0, 0, 7); g2.fill(); g2.stroke(); g2.fillRect(-3, -14, 6, 14); g2.strokeRect(-3, -14, 6, 14); g2.fillStyle = K.yellow; g2.beginPath(); g2.arc(-2, 6, 2, 0, 7); g2.fill(); g2.fillStyle = K.orange; g2.fillRect(1, 3, 3, 3); g2.restore(); }
function bubble(x, y) { g2.fillStyle = K.white; g2.strokeStyle = OL; g2.lineWidth = 2; g2.beginPath(); g2.arc(x + 12, y - 28, 8, 0, 7); g2.fill(); g2.stroke(); g2.fillStyle = OL; g2.font = "bold 11px sans-serif"; g2.textAlign = "center"; g2.fillText("…", x + 12, y - 25); }

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
const START = { x: 28.5 * T, y: 27.5 * T };
const FRESH = () => ({ v: 2, name: "", look: 0, ch: 1, cd: [], q: {}, x: START.x, y: START.y, dir: 0, started: false, invited: "", ally: false, lamp: false, inCh: false, scene: "pueblo" });
let S = FRESH();
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 2) S = { ...FRESH(), ...s }; if (!SCN[S.scene]) S.scene = "pueblo"; } catch { /* */ } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }
const Q = () => S.q;
const party = () => Q().party || (Q().party = []);
const join = (id) => { if (!party().includes(id)) party().push(id); };

// ---------------------------------------------------------------------------
// Diálogos (líneas, elecciones, silencio y ordenar)
// ---------------------------------------------------------------------------
let dlg = null;
const L = (who, t, extra = {}) => ({ who, t, ...extra });
const P = (id) => ({ id, ...PEOPLE[id] });
const N = null; // narrador
const meW = () => ({ n: S.name || "Tú", look: LOOKS[S.look] });
function say(lines, done) { dlg = { q: lines, i: 0, done, pick: [] }; paintDlg(); }
function next() {
  if (!dlg) return;
  const l = dlg.q[dlg.i]; if (l && (l.ch || l.order)) return;
  dlg.i++;
  if (dlg.i >= dlg.q.length) { const d = dlg.done; dlg = null; paintDlg(); save(); paintHud(); d && d(); return; }
  paintDlg();
}
function choose(n) {
  const l = dlg && dlg.q[dlg.i]; if (!l || !l.ch) return;
  const fn = l.ch[n][1]; dlg = null; paintDlg(); fn && fn(); save(); paintHud();
}
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// Una elección: las opciones salen desordenadas. Si no es la buena, se escucha la consecuencia y la
// conversación termina (hay que volver a hablar). Con «retry» se vuelve a preguntar de inmediato.
function ask(who, t, opts, good, after, retry = false) {
  const again = () => ask(who, t, opts, good, after, retry);
  say([{ who, t, ch: shuffle(opts.map((o, i) => [o[0], () => (i === good ? say(o[1], after) : say(o[1], retry ? again : null))])) }]);
}
// Ordenar: tocar las opciones en el orden correcto (las de «extra» no van)
function order(who, t, items, ok, hint, extra = []) { say([{ who, t, order: items, extra, hint }], ok); }

// ---------------------------------------------------------------------------
// Capítulos: uno por módulo de «El Arte de Encontrarnos»
// ---------------------------------------------------------------------------
const AT = (o) => ({ x: (o.x + 0.5) * T, y: (o.y + 0.5) * T });
const goalsLeft = () => CH().quests.filter((q) => !q.done()).length;
const goalsLeftSafe = () => { try { return goalsLeft(); } catch { return 1; } };
const qt = (q) => (typeof q.t === "function" ? q.t() : q.t);
const SP = (sc, x, y, label, f, o = {}) => ({ sc, x, y, label, f, r: o.r || 1.2, verb: o.verb || "Mirar" });

const CHAPTERS = [
  // ------------------------------------------------------------------ 1
  { n: 1, title: "Puente y amigo", mod: "Módulo 1 · Identidad del dirigente y mirada de fe", st: "emaus", badge: "Puente",
    intro: [L(N, "Es sábado. Llegaste hace poco al pueblo y todavía no conoces a casi nadie."), L(N, "Sofi, tu vecina, te está esperando cerca de tu casa.")],
    npcs: () => [{ id: "sofi", x: 26, y: 28 }, { id: "benja", x: 13, y: 16, sit: true, hide: party().includes("benja") }, { id: "ana", x: 6, y: 15, hide: party().includes("ana") },
      { id: "lucho", x: 11, y: 19, hide: party().includes("lucho") }, { id: "pato", x: 26, y: 8 }, { id: "camin", x: 23, y: 17 }],
    items: () => [{ x: 14, y: 17, kind: "case", show: !party().includes("benja") }, { x: 5, y: 30, kind: "dog", show: Q().dog === 1 }],
    spots: () => [
      ...(!party().includes("benja") ? [SP("pueblo", 14, 17, "Funda de guitarra", () => { Q().guit = 1; say([L(N, "Una funda de guitarra gastada, llena de stickers. Se nota que alguien la cuida mucho."), L(N, "Quien cuida así su guitarra seguramente la toca bastante.")]); })] : []),
      ...(Q().dog === 1 ? [SP("pueblo", 5, 30, "Los arbustos", () => {
        if (!Q().pan) return say([L(N, "Ves a Canela entre los arbustos. Te mira… y se esconde más adentro. Está asustada."), L(N, "Ana dijo que solo se acerca si le ofrecen pan.")]);
        Q().dog = 2; say([L(N, "Te agachas despacio y le ofreces el pan. Canela se acerca, mueve la cola y se deja tomar."), L(N, "Llévala con Ana, en la plaza. Como el pastor que sale a buscar a la oveja perdida (Lc 15,4-7).")]);
      }, { r: 2.1, verb: "Buscar" })] : []),
      ...(Q().bags === 1 ? [SP("casa", 5.5, 3.5, "La mesa de la cocina", () => { Q().bags = 2; say([L(N, "Dejas las bolsas en la mesa. La casa es sencilla y ordenada; la cocina a leña todavía está tibia."), L(N, "En el aparador hay una foto: Don Lucho, joven, abrazado a una señora muy sonriente."), L(N, "Vuelve a contarle a Don Lucho.")]); }, { r: 1.7, verb: "Dejar" })] : []),
    ],
    quests: [
      { t: "Mira a Benja con los ojos de Jesús", u: "1.2", done: () => party().includes("benja"), at: { x: 13, y: 16 } },
      { t: () => (Q().dog === 2 ? "Lleva a Canela con Ana" : Q().dog === 1 ? (Q().pan ? "Busca a Canela en los arbustos del sur" : "Canela solo se acerca si le ofrecen pan") : "Escucha a Ana"), u: "1.3", done: () => party().includes("ana"),
        at: () => (Q().dog === 1 ? (Q().pan ? { x: 5, y: 30 } : { x: 26, y: 8 }) : { x: 6, y: 15 }) },
      { t: () => (Q().bags === 1 ? "Deja las bolsas en la mesa de Don Lucho" : Q().bags === 2 ? "Cuéntale a Don Lucho" : "Ayuda a Don Lucho"), u: "1.4", done: () => party().includes("lucho"),
        at: () => (Q().bags === 1 ? { sc: "casa", x: 5.5, y: 3.5 } : { x: 11, y: 19 }) },
    ],
    start: () => !Q().met && { t: "Habla con Sofi, aquí cerca.", at: { x: 26, y: 28 } },
    talk: {
      sofi: () => { if (Q().met) return say([L(P("sofi"), goalsLeft() ? "En la plaza hay gente que anda sola. ¡Vamos a invitarlos!" : "¡Vamos al salón, ya empieza el encuentro!")]);
        Q().met = 1; say([L(P("sofi"), `¡Hola${S.name ? ", " + S.name : ""}! Hoy en la tarde hay encuentro del grupo en el salón parroquial, al noroeste.`),
          L(P("sofi"), "¿Me acompañas a invitar a los que andan solos? Un buen amigo es como un puente: acerca a los demás.")]); },
      benja: () => {
        if (!Q().warned) { Q().warned = 1; return say([L(N, "Un chico con capucha está sentado solo en una banca, mirando el suelo. Alguien pasa y murmura: «Ese es el Benja, dicen que es problemático»."), L(N, "Antes de hablarle, mira bien: ¿qué trae consigo?")]); }
        const opts = [
          ["«Hola, ¿cómo estás?»", [L(P("benja"), "Bien."), L(N, "Responde corto y vuelve a mirar el suelo. A veces la puerta para conversar está en algo que la persona trae consigo.")]],
          ["«Oye, hay encuentro del grupo en la tarde. ¿Vienes?»", [L(P("benja"), "No me interesa."), L(N, "Invitar sin conocer suena a trámite. Primero acércate a él como persona.")]],
          ["Mejor no acercarse: dicen que es problemático.", [L(P("camin"), "Dios lo conoce por su nombre y lo mira con cariño. ¿Le darías una oportunidad?")]],
        ];
        if (Q().guit) opts.unshift([`«Hola, soy ${S.name || "nuevo aquí"}. ¿Esa funda es tuya? ¿Qué estás tocando?»`, [L(P("benja"), "…Una canción que estoy sacando de oído."), L(P("benja"), "Nadie me había preguntado eso. ¿Hay encuentro del grupo? Bueno, voy."), L(N, "Detrás de una capucha había alguien con un don. «El Señor mira el corazón» (1 Sam 16,7).")]]);
        ask(P("benja"), "¿Qué quieres?", opts, Q().guit ? 0 : -1, () => join("benja"));
      },
      ana: () => {
        const d = Q().dog || 0;
        if (d === 2) { Q().dog = 3; join("ana"); return say([L(P("ana"), "¡Canela! ¡La encontraste!"), L(P("ana"), "Gracias por escucharme de verdad y por no rendirte. Voy con ustedes al encuentro.")]); }
        if (d === 1) return say([L(P("ana"), Q().pan ? "Se fue hacia los arbustos del sur. ¡Ojalá te deje acercarte!" : "Es muy asustadiza: solo se acerca si alguien le ofrece pan.")]);
        ask(P("ana"), "Estoy muy preocupada… mi perrita Canela se escapó y no la encuentro.", [
          ["«Cuéntame qué pasó. ¿Cómo es ella? ¿Hacia dónde se fue?»", [L(P("ana"), "Gracias por preguntar. Es café, chiquitita… Se fue corriendo hacia los arbustos del sur."), L(P("ana"), "Es muy asustadiza: solo se acerca si alguien le ofrece pan."), L(N, "Escuchar es más que oír: es dejar lo tuyo y hacerle espacio al otro.")]],
          ["«Tranquila, ya va a aparecer.»", [L(P("ana"), "…Sí, puede ser."), L(N, "Ana sigue preocupada. A veces la prisa por consolar no deja escuchar.")]],
          ["«A mí una vez se me perdió un gato y volvió solo.»", [L(P("ana"), "Ah… qué bueno."), L(N, "Terminaste hablando de ti. Escuchar es poner al otro en el centro.")]],
        ], 0, () => { Q().dog = 1; });
      },
      pato: () => {
        if (Q().dog === 1 && !Q().pan) { Q().pan = 1; return say([L(P("pato"), "¿Pan para una perrita asustada? ¡Claro! Toma este pedacito de pan amasado."), L(P("pato"), "Acércate despacio y agáchate. Los animales asustados se calman cuando uno se pone a su altura.")]); }
        say([L(P("pato"), "¡Hola! El carrito abre el domingo, después de misa. Ahí te espero.")]);
      },
      lucho: () => {
        const b = Q().bags || 0;
        if (b === 2) { join("lucho"); return say([L(P("lucho"), "¿Las dejaste en la mesa? ¡Gracias!"), L(P("lucho"), "¿Viste la foto del aparador? Es mi Elena. Ella también iba al grupo cuando era joven."), L(P("lucho"), "Los jóvenes de antes y los de ahora se necesitan. Voy al encuentro con ustedes.")]); }
        if (b === 1) return say([L(P("lucho"), "Mi casa es la de la puerta azul, al suroeste. Está sin llave: deja las bolsas en la mesa de la cocina.")]);
        Q().bags = 1; say([L(P("lucho"), "Estas bolsas pesan mucho para mis años. ¿Me las llevas a mi casa? Es la de la puerta azul."), L(P("lucho"), "Está sin llave. Déjalas en la mesa de la cocina, por favor."), L(N, "Nadie hace todo solo: en una comunidad cada uno aporta lo suyo.")]);
      },
      camin: () => say([L(P("camin"), "Hola. ¿De qué vienes conversando por el camino? Te noto pensativo."), L(meW(), "Llegué hace poco. A veces siento que me falta algo."), L(P("camin"), "Sigue caminando. Nos vemos en el encuentro.")]),
    },
    end: { word: "Lc 24,13-35", lines: [L(P("camin"), "En el camino a Emaús, Jesús no llegó dando un discurso: caminó al lado, preguntó y escuchó."),
      L(P("camin"), "Eso es ser puente: acercarse, mirar con cariño, escuchar y no dejar a nadie solo.")],
      idea: "Un dirigente es puente y amigo: se acerca, mira con los ojos de Jesús y escucha de verdad." } },

  // ------------------------------------------------------------------ 2
  { n: 2, title: "Un hogar acogedor", mod: "Módulo 2 · Un hogar acogedor y fraterno", st: "acogida", badge: "Hogar",
    intro: [L(N, "Otro sábado. Ya conoces a varios del grupo y empiezas a sentirte en casa."), L(N, "Sofi te llama: llega alguien nueva al salón.")],
    npcs: () => [{ id: "sofi", x: 26, y: 28 }, { id: "martina", x: 13, y: 6, hide: party().includes("martina") }, { id: "benja", x: 17, y: 19 }, { id: "ana", x: 7, y: 16 }, { id: "tomas", x: 25, y: 19 }, { id: "nico", x: 13, y: 9, tree: true, hide: party().includes("nico") }],
    spots: () => [SP("salon", 6.5, 2, "Tablero de servicios", tablero, { r: 1.6, verb: "Armar" })],
    quests: [
      { t: "Acoge a Martina en los primeros minutos", u: "2.2", done: () => party().includes("martina"), at: { x: 13, y: 6 } },
      { t: () => (hintsAll() ? "Arma el tablero de servicios en el salón" : "Descubre el don de Benja, Ana y Tomás"), u: "2.3", done: () => (Q().tasks || 0) >= 3,
        at: () => { const h = Q().h || {}; return !h.benja ? { x: 17, y: 19 } : !h.ana ? { x: 7, y: 16 } : !h.tomas ? { x: 25, y: 19 } : { sc: "salon", x: 6.5, y: 2 }; } },
      { t: "Mira hacia arriba: alguien observa desde un árbol", u: "2.4", done: () => party().includes("nico"), at: { x: 13, y: 9 } },
    ],
    start: () => !Q().met && { t: "Habla con Sofi, aquí cerca.", at: { x: 26, y: 28 } },
    talk: {
      sofi: () => { if (Q().met) return say([L(P("sofi"), party().includes("martina") ? "Ahora, conoce bien a Benja, Ana y Tomás: cada uno tiene un don." : "¡Rápido, que Martina no se vaya sola!")]);
        Q().met = 1; Q().timer = Date.now() + 70000;
        say([L(P("sofi"), "¡Hoy llega Martina al salón por primera vez y no conoce a nadie!"), L(P("sofi"), "Los primeros minutos son clave. ¡Corre a recibirla, antes de que se vaya!"),
          L(P("sofi"), "Después hay que armar el tablero de servicios del salón: qué hará cada uno en el encuentro. Pero ojo: primero conócelos."), L(N, "Tienes poco más de un minuto para llegar a Martina. Primerear es tomar la iniciativa del amor.")]); },
      martina: () => ask(P("martina"), "Hola… ¿aquí es el grupo? No conozco a nadie.", [
        [`«¡Hola, bienvenida! Soy ${S.name || "del grupo"}. ¿Cómo te llamas? Ven, te presento a los demás.»`, [L(P("martina"), "¡Martina! Gracias… ya me siento mejor."), L(N, "Saludar por el nombre y presentar a otros: así se siente uno en casa.")]],
        ["«Sí, espera ahí que ya van a llegar.»", [L(P("martina"), "Ah… bueno."), L(N, "Martina queda sola en la puerta. ¿Cómo te gustaría que te recibieran a ti?")]],
        ["«¡Hola! Pasa, siéntate donde quieras.»", [L(N, "Martina entra y se sienta sola en un rincón. Faltó algo: su nombre, y presentarle a alguien.")]],
      ], 0, () => { join("martina"); Q().timer = 0; }),
      benja: () => gift("benja", [L(P("benja"), "Anoche me quedé hasta tarde sacando los acordes de una canción nueva. ¡Por fin me salió!"), L(N, "Benja tararea bajito mientras habla.")]),
      ana: () => gift("ana", [L(P("ana"), "¿Sabes qué es lo primero que hago cuando llego a un lugar? Me fijo si alguien está solo."), L(P("ana"), "Me acuerdo de cuando yo era la nueva.")]),
      tomas: () => gift("tomas", [L(P("tomas"), "Mira, lo hice en clases. (Te muestra su cuaderno.) ¿Se nota que es la capilla?"), L(N, "El dibujo es precioso: hasta se ven las tejas del techo y la campana.")]),
      nico: () => ask(P("nico"), "(Desde arriba del árbol) …Solo estaba mirando.", [
        ["«¡Nico, baja! Hoy queremos que estés con nosotros.»", [L(P("nico"), "¿Yo? ¿En serio?"), L(N, "Nico baja del árbol. Jesús miró hacia arriba, llamó a Zaqueo por su nombre y fue a su casa (Lc 19,1-10).")]],
        ["Seguir de largo: si quisiera, vendría.", [L(N, "Muchos miran desde lejos esperando que alguien los invite. Jesús se detuvo y miró hacia arriba.")]],
        ["«¿Qué haces ahí arriba? Te vas a caer.»", [L(P("nico"), "…"), L(N, "Nico se encoge de hombros y no baja. Jesús no retó a Zaqueo: lo llamó por su nombre y quiso estar con él.")]],
      ], 0, () => join("nico")),
    },
    timer: () => {
      if (!party().includes("martina") && Q().timer && Date.now() > Q().timer) {
        Q().timer = Date.now() + 70000;
        say([L(N, "Martina se fue a su casa sin que nadie la saludara."), L(N, "El próximo sábado vuelve a intentarlo. Esta vez, sal a su encuentro. Tienes otro minuto.")]);
      }
    },
    end: { word: "Jn 13,1-15 · Lc 19,1-10", lines: [L(P("camin"), "Jesús se agachó a lavar los pies de sus amigos y miró hacia arriba para llamar a Zaqueo."),
      L(P("camin"), "Un hogar se hace así: saliendo primero al encuentro, conociendo el don de cada uno y no dejando a nadie mirando desde lejos.")],
      idea: "El grupo es un hogar: se acoge en los primeros minutos, cada uno tiene un servicio según su don y nadie queda afuera." } },

  // ------------------------------------------------------------------ 3
  { n: 3, title: "Mirar, sentir y escuchar", mod: "Módulo 3 · El arte de mirar, sentir y escuchar", st: "bartimeo", badge: "Mirada",
    intro: [L(N, "Un sábado distinto. En el pueblo hay gente que lo está pasando mal."), L(N, "La Profe Marta, además, anda buscando unas páginas de su Biblia que se llevó el viento.")],
    npcs: () => [{ id: "joaco", x: 18, y: 25, sit: Q().joaco !== 2, sad: Q().joaco !== 2, hide: Q().joaco === 2 && !!Q().jgone }, { id: "ana", x: 13, y: 15, sit: true, sad: !Q().ana }, { id: "marta", x: 35, y: 16 },
      { id: "lucho", sc: "casa", x: 3, y: 3, sit: true, dir: 2, sad: !Q().lucho }, { id: "carmen", x: 10, y: 6 }],
    items: () => PAGES.filter((p) => p.x && !(Q().pages || []).includes(p.id)).map((p) => ({ ...p, kind: "page", show: !!Q().mt })),
    spots: () => [
      ...(Q().joaco === 1 && !Q().kit ? [SP("salon", 12, 2, "El botiquín", () => { Q().kit = 1; say([L(N, "Abres el botiquín: agua, gasa y parches. Te llevas lo necesario para Joaquín.")]); }, { r: 1.1, verb: "Abrir" })] : []),
      ...(!(Q().pages || []).includes(0) ? SHELVES.map((s) => SP("biblio", s.x + .5, s.y + 1, s.l, () => shelfSearch(s), { r: 1.05, verb: "Buscar" })) : []),
    ],
    quests: [
      { t: () => (Q().joaco === 1 ? (Q().kit ? "Cura la rodilla de Joaquín" : "Busca el botiquín del salón parroquial") : "Ayuda a Joaquín, que se cayó"), u: "3.1", done: () => Q().joaco === 2, at: () => (Q().joaco === 1 && !Q().kit ? { sc: "salon", x: 12, y: 2 } : { x: 18, y: 25 }) },
      { t: "Pregúntale a Ana qué le pasa", u: "3.2", done: () => !!Q().ana, at: { x: 13, y: 15 } },
      { t: () => { const n = (Q().pages || []).length; return !Q().mt ? "Habla con la Profe Marta, en la plazoleta de la biblioteca" : n < 3 ? `Encuentra las páginas de la Biblia (${n} de 3)` : "Lleva las páginas a la Profe Marta"; }, u: "3.3", done: () => S.lamp,
        at: () => { const got = Q().pages || []; if (!Q().mt || got.length >= 3) return { x: 35, y: 16 }; if (!got.includes(0)) return { sc: "biblio", x: 6.5, y: 7 }; const p = PAGES.find((x) => x.x && !got.includes(x.id)); return p || { x: 35, y: 16 }; } },
      { t: "Visita a Don Lucho en su casa", u: "3.4", done: () => !!Q().lucho, at: { sc: "casa", x: 3, y: 3 } },
    ],
    talk: {
      joaco: () => {
        const j = Q().joaco || 0;
        if (j === 2) return say([L(P("joaco"), "¡Ya no me duele! Gracias.")]);
        if (j === 1 && !Q().kit) return say([L(P("joaco"), "Me arde la rodilla…"), L(N, "En el salón parroquial hay un botiquín.")]);
        if (j === 1) { Q().joaco = 2; return say([L(N, "Te arrodillas a su lado. Le limpias la herida con agua, con cuidado, y le pones un parche."), L(P("joaco"), "¡Gracias! Ya no me arde tanto."), L(N, "Jesús se conmovió, extendió la mano y tocó al leproso (Mc 1,41). Los gestos sencillos dicen mucho.")]); }
        ask(P("joaco"), "(Llorando) Me caí de la bici…", [
          ["Agacharte a su altura y preguntarle: «¿Te duele? ¿Dónde te pegaste?»", [L(P("joaco"), "Aquí, en la rodilla. Me raspé mucho…"), L(N, "Tiene la rodilla raspada. En el salón parroquial hay un botiquín: ve a buscarlo.")]],
          ["Decirle desde lejos: «¡Arriba, no fue nada!»", [L(P("joaco"), "…"), L(N, "Joaquín sigue en el suelo. A veces hace falta acercarse más.")]],
          ["Levantar la bici y revisar si se rompió.", [L(N, "La bici está bien… pero Joaquín sigue llorando. Primero la persona, después las cosas.")]],
        ], 0, () => { Q().joaco = 1; });
      },
      ana: () => {
        if (Q().ana) return say([L(P("ana"), "Gracias por preguntar. Ya hablé con la Tía Carmen y me siento más acompañada.")]);
        say([L(P("ana"), "…"), L(meW(), "Te noto callada. ¿Qué quieres que haga por ti?"), L(P("ana"), "En mi casa mis papás discuten mucho. No puedo concentrarme en nada.")], () =>
          ask(meW(), "¿Qué crees que siente Ana?", [
            ["Preocupación y pena", [L(P("ana"), "Sí… es eso. Me hace bien ponerle nombre."), L(N, "Las emociones no son buenas ni malas: ponerles nombre ayuda. Como Jesús con Bartimeo: «¿Qué quieres que haga por ti?» (Mc 10,51)."),
              L(meW(), "¿Quieres que lo conversemos con la Tía Carmen? Ella nos puede ayudar."), L(P("ana"), "Sí, me gustaría.")]],
            ["Está exagerando", [L(N, "Lo que alguien siente no se discute: se acoge. Vuelve a escucharla.")]],
            ["Rabia con sus papás", [L(P("ana"), "No… no es rabia."), L(N, "Ponerle a otro una emoción que no tiene lo aleja. Mejor pregúntale y escúchala.")]],
          ], 0, () => { Q().ana = 1; }));
      },
      marta: () => {
        if (S.lamp) return say([L(P("marta"), "La Palabra ilumina el camino. Con la lámpara se ve el sendero del cerro.")]);
        const got = (Q().pages || []).length;
        if (!Q().mt) { Q().mt = 1; return say([L(P("marta"), "¡Qué bueno que llegaste! El viento se llevó tres páginas de mi Biblia."), L(P("marta"), "Una entró por la ventana de la biblioteca. Creo que quedó entre los libros que la Biblia usa para rezar y cantar."), L(P("marta"), "Otra voló al otro lado del río, pasado el puente. Y la última, al pie de la torre.")]); }
        if (got < 3) return say([L(P("marta"), `Llevas ${got} de 3. Una en la biblioteca, entre los libros para rezar y cantar; otra al otro lado del río; otra al pie de la torre.`)]);
        quiz();
      },
      lucho: () => {
        if (Q().lucho) return say([L(P("lucho"), "Gracias por quedarte conmigo. Vuelve cuando quieras: siempre hay té.")]);
        say([L(N, "Don Lucho está sentado junto a la cocina a leña, con la foto de su señora en las manos."), L(P("lucho"), "Pasa, pasa. Hoy se cumple un año desde que partió mi Elena. La echo mucho de menos.")], () =>
          ask(meW(), "¿Qué le dices?", [
            ["«Lo siento mucho, Don Lucho. ¿Me cuenta cómo era ella?» Y te sientas a su lado.", [L(P("lucho"), "Era alegre, cantaba todo el día mientras cocinaba… Gracias por preguntar."), { who: N, t: "", quiet: 6, msg: "Se quedan un rato juntos, en silencio. La tetera hierve despacio." },
              L(N, "Jesús lloró por su amigo Lázaro (Jn 11,35). Acompañar no es tener respuestas: es estar.")]],
            ["«No esté triste, ella está mejor ahora.»", [L(P("lucho"), "…Sí, eso dicen."), L(N, "Las frases hechas a veces apuran el dolor. Quédate, escucha y pregunta.")]],
            ["«Tiene que distraerse. ¿Por qué no sale a caminar?»", [L(P("lucho"), "…Puede ser."), L(N, "Un consejo rápido puede sonar a «no quiero ver tu pena». Primero, quédate con él.")]],
          ], 0, () => { Q().lucho = 1; }));
      },
      carmen: () => say([L(P("carmen"), "Hola. Soy asesora del grupo. Si alguien necesita conversar algo difícil, aquí estoy.")]),
    },
    tile: (tx, ty) => {
      if (!Q().mt) return;
      for (const p of PAGES) if (p.x && !(Q().pages || []).includes(p.id) && Math.hypot(p.x - tx, p.y - ty) < 1) {
        (Q().pages = Q().pages || []).push(p.id);
        say([L(N, `Encontraste una página (${Q().pages.length} de 3): «${PAGE_TXT[p.id].t}»`)]);
      }
    },
    end: { word: "Mc 10,46-52", lines: [L(P("camin"), "Jesús se detuvo ante Bartimeo y le preguntó: «¿Qué quieres que haga por ti?»."),
      L(P("camin"), "Mirar lo que no se dice, ponerle nombre a lo que sentimos y quedarse con el que sufre: así mira el corazón de Dios.")],
      idea: "Compasión es acercarse, preguntar y acompañar; y cuando algo es difícil, buscar juntos a un adulto de confianza." } },

  // ------------------------------------------------------------------ 4
  { n: 4, title: "Aprender jugando", mod: "Módulo 4 · Aprender jugando y viviendo", st: "panes", badge: "Alegría",
    intro: [L(N, "Hoy el grupo arma una once en la cancha, al sureste del pueblo."), L(N, "Pero cada uno trajo muy poquito…")],
    npcs: () => [{ id: "sofi", x: 28, y: 30 }, { id: "marta", x: 35, y: 16 }, { id: "benja", x: 31, y: 31 }, { id: "nico", x: 25, y: 31 }],
    items: () => FOOD.filter((f) => !(Q().food || []).includes(f.id)).map((f) => ({ ...f, show: !!Q().met })),
    quests: [
      { t: () => `Junta los panes y los peces que trajo cada uno (${(Q().food || []).length} de ${FOOD.length})`, u: "4.2", done: () => (Q().food || []).length >= FOOD.length, at: () => FOOD.find((f) => !(Q().food || []).includes(f.id)) || { x: 28, y: 30 } },
      { t: "Repartan y celebren juntos en la cancha", u: "4.1", done: () => !!Q().party1, at: { x: 28, y: 30 } },
      { t: "Planifica el próximo encuentro con la Profe Marta", u: "4.3", done: () => !!Q().plan, at: { x: 35, y: 16 } },
      { t: "Al atardecer, sube al cerro a mirar el día", u: "4.4", done: () => !!Q().examen, at: { x: 36, y: 3 } },
    ],
    start: () => !Q().met && { t: "Habla con Sofi en la cancha.", at: { x: 28, y: 30 } },
    talk: {
      sofi: () => {
        if (!Q().met) { Q().met = 1; return say([L(P("sofi"), "¡Bienvenido a la once! El problema: cada uno trajo poquito."), L(P("sofi"), "Repartidos por el pueblo hay cinco panes y dos peces que dejaron los chicos. Si juntamos lo de todos, alcanza."), L(N, "Como el muchacho de los cinco panes y dos peces (Jn 6,9).")]); }
        if ((Q().food || []).length < FOOD.length) return say([L(P("sofi"), `Llevas ${(Q().food || []).length} de ${FOOD.length}. ¡Nadie se queda sin comer!`)]);
        if (!Q().party1) return ask(P("sofi"), "¡Juntamos todo! Ahora, ¿cómo lo repartimos?", [
          ["Ponerlo todo al centro, partirlo y que coman todos, empezando por los más chicos.", [L(P("sofi"), "¡Alcanzó para todos y sobró!"), { who: { n: "", st: "panes", big: true }, t: "Comen, ríen y juegan a la pinta. Hasta Don Lucho se suma. «Comamos y celebremos» (Lc 15,23)." },
            L(N, "Dios celebra. La alegría y el juego también son camino para encontrarse.")]],
          ["Que cada uno coma lo que trajo.", [L(P("sofi"), "Así algunos comen mucho y otros nada…"), L(N, "Lo que se comparte se multiplica. Piensa en todos.")]],
          ["Guardar lo que sobre para la próxima vez.", [L(P("sofi"), "Primero que coman todos, ¿no?"), L(N, "Jesús dio de comer a todos… y después juntaron lo que sobró (Jn 6,12).")]],
        ], 0, () => { Q().party1 = 1; });
        return say([L(P("sofi"), "Qué rico estuvo. ¡Ahora a preparar el próximo encuentro!")]);
      },
      benja: () => say([L(P("benja"), "En los juegos cooperativos nadie pierde. Me gusta eso: nadie se queda atrás.")]),
      nico: () => say([L(P("nico"), "Antes no me gustaba jugar porque siempre perdía. Aquí jugamos juntos.")]),
      marta: () => {
        if (Q().plan) return say([L(P("marta"), "Con ese orden, el encuentro parte de la vida y vuelve a la vida.")]);
        order(P("marta"), "Preparemos el próximo encuentro con el método del grupo. Toca los pasos en orden. Ojo: hay dos que no van.",
          ["Partir de lo que el grupo está viviendo", "Conversarlo en pequeños grupos", "Iluminarlo con la Palabra de Dios", "Elegir un compromiso concreto para la semana"],
          () => { Q().plan = 1; say([L(P("marta"), "¡Así es! Vivir, conversar, iluminar y actuar: partimos de lo que vivimos y volvemos a la vida."), L(N, "Como Jesús en Emaús: primero escuchó, después explicó las Escrituras (Lc 24,25-27)."), L(N, "Está atardeciendo. Desde el cerro se ve todo el pueblo.")]); },
          "El encuentro parte de la vida del grupo y termina en un compromiso. Nadie da una charla larga y no se compite.",
          ["Empezar con una charla larga del dirigente", "Ver quién participó mejor"]);
      },
    },
    tile: (tx, ty) => {
      for (const f of FOOD) if (Q().met && !(Q().food || []).includes(f.id) && Math.hypot(f.x - tx, f.y - ty) < 1) {
        (Q().food = Q().food || []).push(f.id); say([L(N, `${f.kind === "fish" ? "Un pez" : "Un pan"} (${Q().food.length} de ${FOOD.length}). Poco, pero juntos alcanza.`)]);
      }
      if (S.lamp && !Q().examen && tx >= 36 && tx <= 38 && ty <= 4) { if (!Q().plan) return; examen(); }
    },
    end: { word: "Jn 6,1-13", lines: [L(P("camin"), "Cinco panes y dos peces parecían nada. En manos de Jesús alcanzó para miles."),
      L(P("camin"), "Cuando el juego une y nadie queda atrás, cuando partimos de la vida, Dios se deja descubrir en lo que vivimos.")],
      idea: "Jugar y celebrar también es camino: cooperar para que nadie quede atrás y descubrir a Dios en lo vivido." } },

  // ------------------------------------------------------------------ 5
  { n: 5, title: "Cuidado y envío", mod: "Módulo 5 · Cuidado personal, cuidado mutuo y envío", st: "levantate", badge: "Enviado",
    intro: [L(N, "Llevas semanas sirviendo en el grupo. Estás contento… y bien cansado."), L(N, "Hoy el Padre Andrés quiere enviar a los nuevos dirigentes.")],
    npcs: () => [{ id: "sofi", x: 19, y: 18 }, { id: "tomas", x: 30, y: 19 }, { id: "benja", x: 34, y: 22 }, { id: "nico", x: 6, y: 28, sit: true, sad: true, hide: !!Q().nico }, { id: "ana", x: 15, y: 25 }, { id: "padre", x: 13, y: 6 }],
    spots: () => [
      ...(!Q().rest ? [SP("capilla", 6, 3, "El Sagrario", rest, { r: 1.2, verb: "Rezar" })] : []),
      ...(Q().bread && !Q().agua ? [SP("salon", 10.5, 2, "El lavaplatos", () => { Q().agua = 1; say([L(N, "Llenas la botella con agua fresca. Ahora sí: a buscar a Nico.")]); }, { r: 1.3, verb: "Llenar" })] : []),
    ],
    quests: [
      { t: "Descansa en el Señor frente al Sagrario", u: "5.1", done: () => !!Q().rest, at: { sc: "capilla", x: 6, y: 3 } },
      { t: "Ayuda a Sofi a sostener la carga", u: "5.2", done: () => !!Q().held, at: () => ((Q().help || []).length >= 2 || !Q().asked ? { x: 19, y: 18 } : (Q().help || []).includes("tomas") ? { x: 34, y: 22 } : { x: 30, y: 19 }) },
      { t: () => (!Q().nicoSeen ? "Nico volvió agotado de la misión: búscalo" : !Q().bread ? "Pídele a Ana algo para Nico" : !Q().agua ? "Llena la botella en el salón parroquial" : "Lleva el pan y el agua a Nico"), u: "5.4", done: () => !!Q().nico,
        at: () => (!Q().nicoSeen ? { x: 6, y: 28 } : !Q().bread ? { x: 15, y: 25 } : !Q().agua ? { sc: "salon", x: 10.5, y: 2 } : { x: 6, y: 28 }) },
    ],
    talk: {
      sofi: () => {
        if (Q().held) return say([L(P("sofi"), "Gracias. Sola no podía.")]);
        if ((Q().help || []).length >= 2) { Q().held = 1; return say([L(P("sofi"), "¡Llegaron Tomás y Benja! Entre todos se puede."), L(N, "Cuando a Moisés se le cansaban los brazos, Aarón y Jur se los sostuvieron (Éx 17,12). En comunidad nos sostenemos.")]); }
        if (!Q().asked) { Q().asked = 1; return say([L(P("sofi"), "Uf, me ofrecí para llevar todos los materiales de la misión y no puedo más."), L(N, "Busca a Tomás y a Benja, al este del pueblo, para que ayuden a Sofi.")]); }
        return say([L(P("sofi"), "Busca a Tomás y a Benja, al este.")]);
      },
      tomas: () => { if (!Q().asked) return say([L(P("tomas"), "¡Hola! Hoy es el envío.")]); (Q().help = Q().help || []).includes("tomas") || Q().help.push("tomas"); say([L(P("tomas"), "¿Sofi necesita ayuda? ¡Voy ahora mismo!")]); },
      benja: () => { if (!Q().asked) return say([L(P("benja"), "Estoy ensayando la canción del envío.")]); (Q().help = Q().help || []).includes("benja") || Q().help.push("benja"); say([L(P("benja"), "Dejo la guitarra y voy a ayudar.")]); },
      nico: () => {
        if (Q().bread && Q().agua) {
          Q().nico = 1; join("nico");
          return say([L(P("nico"), "¿Pan y agua? ¡Gracias! Con la misión se me olvidó comer."), L(P("nico"), "Uno a veces se olvida de cuidarse. Ya me siento mejor: ¿vamos juntos al envío?"),
            L(N, "El ángel le dijo a Elías: «Levántate y come, que el camino es largo» (1 Re 19,7). Cuidarnos también es fijarnos en el cansancio del otro.")]);
        }
        if (Q().bread) return say([L(P("nico"), "…"), L(N, "Te falta el agua. En el salón parroquial hay un lavaplatos.")]);
        Q().nicoSeen = 1;
        say([L(N, "Nico está sentado a la sombra de un arbusto, como el profeta Elías en el camino."), L(P("nico"), "Estoy agotado. Cargué cosas toda la mañana para la misión y no he comido nada."), L(N, "Ana, en el pueblo, seguro tiene algo para compartir.")]);
      },
      ana: () => { if (Q().nicoSeen && !Q().bread) { Q().bread = 1; return say([L(P("ana"), "¿Para Nico? Toma este pan. Y esta botella: llénala en el lavaplatos del salón parroquial."), L(P("ana"), "¡Y que descanse un rato!")]); } say([L(P("ana"), "Hoy es el envío. ¡Qué emoción!")]); },
      padre: () => {
        if (goalsLeft()) return say([L(P("padre"), `El envío es en el encuentro, en el salón. Antes, termina lo que falta (${goalsLeft()}).`)]);
        say([L(P("padre"), "¡Ya están todos! Vamos al salón para el envío.")]);
      },
    },
    end: { word: "Jn 20,19-23", lines: [L(P("padre"), "Jesús resucitado se puso en medio de sus discípulos y les dijo: «Como el Padre me envió, así los envío yo»."),
      L(P("camin"), "Para ser enviado hay que descansar en Él, dejarse sostener y cuidar a los demás. Nadie es enviado solo."),
      { who: { n: "", st: "levantate", big: true }, t: "El Padre Andrés te entrega una pequeña cruz. Desde hoy eres dirigente de Ágape." }],
      idea: "Cuidarse y cuidarnos es parte de la misión: descansar en el Señor, sostenernos y fijarnos en el cansancio del otro." } },

  // ------------------------------------------------------------------ 6
  { n: 6, title: "Lo reconocieron al partir el pan", mod: "Módulo 6 · La Eucaristía, corazón de nuestra Pastoral Juvenil", st: "eucaristia", badge: "Eucaristía",
    intro: [L(N, "Es domingo, tercer domingo de Pascua. Hoy el grupo anima la misa en la capilla San Miguel."), L(N, "Pepe, el sacristán, ya está adentro preparando todo. Pero no todos tienen ganas de ir…")],
    npcs: () => (Q().misa ? MISA : [{ id: "tomas", x: 26, y: 28 }, { id: "pepe", sc: "capilla", x: 9, y: 3 }, { id: "pato", x: 26, y: 8 }, { id: "ana", x: 19, y: 9 }, { id: "benja", x: 24, y: 10 }, { id: "martina", x: 19, y: 13 }, { id: "nico", x: 25, y: 13 }, { id: "camin", x: 23, y: 17 }]),
    spots: () => [
      ...(Q().color && (Q().cir || 0) < 2 ? [SP("capilla", 6, 5, "Los cirios del altar", () => { Q().cir = (Q().cir || 0) + 1; say([L(N, Q().cir === 1 ? "Enciendes el primer cirio. La llama tiembla y después se queda quieta." : "Enciendes el segundo cirio. El altar está listo."), ...(Q().cir === 2 ? [L(N, "«Jesús es la luz del mundo» (cf. Jn 8,12).")] : [])]); }, { verb: "Encender" })] : []),
      ...(Q().color && !Q().lecc ? [SP("capilla", 9, 7, "El leccionario en el ambón", leccionario, { r: 1.15, verb: "Abrir" })] : []),
      SP("capilla", 4, 8, "La primera banca", door, { r: 1.4, verb: "Sentarte" }),
    ],
    quests: [
      { t: "Tomás dice que la misa es aburrida: acompáñalo", u: "6.1", done: () => party().includes("tomas"), at: { x: 26, y: 28 } },
      { t: () => (!Q().color ? "Ayuda a Pepe a preparar la misa en la capilla" : (Q().cir || 0) < 2 ? "Enciende los dos cirios del altar" : !Q().lecc ? "Abre el leccionario en el Evangelio de hoy" : "Repasa con Pepe las partes de la misa"), u: "6.2", done: () => !!Q().steps,
        at: () => (!Q().color ? { sc: "capilla", x: 9, y: 3 } : (Q().cir || 0) < 2 ? { sc: "capilla", x: 6, y: 5 } : !Q().lecc ? { sc: "capilla", x: 9, y: 7 } : { sc: "capilla", x: 9, y: 3 }) },
      { t: "Cada uno anima un servicio", u: "6.3", done: () => (Q().roles || 0) >= 4, at: () => [{ x: 19, y: 9 }, { x: 24, y: 10 }, { x: 19, y: 13 }, { x: 25, y: 13 }][Q().roles || 0] },
    ],
    talk: {
      tomas: () => ask(P("tomas"), "¿Misa? No… es aburrida, no entiendo nada.", [
        ["«A veces a mí también me cuesta. ¿Vamos juntos y después conversamos qué te pareció?»", [L(P("tomas"), "Bueno… si vamos juntos."), L(N, "También a Jesús lo dejaron algunos. Pedro respondió: «Señor, ¿a quién iremos?» (Jn 6,68). Acompañar convence más que sermonear.")]],
        ["«Tienes que ir: es obligación.»", [L(P("tomas"), "…Ya, otro sermón."), L(N, "Tomás se cierra. ¿Y si lo invitas a ir contigo?")]],
        ["«Ya, no vayas. Otro día será.»", [L(P("tomas"), "…"), L(N, "Respetar no es lo mismo que soltar. A veces basta con ofrecerle tu compañía.")]],
      ], 0, () => join("tomas")),
      pepe: () => {
        const q = Q();
        if (!q.color) return ask(P("pepe"), "¡Qué bueno que llegaste! Hoy es el tercer domingo de Pascua. ¿De qué color preparo la casulla del Padre?", [
          ["Blanco", [L(P("pepe"), "¡Eso! El blanco es el color de la Pascua y de las fiestas del Señor: la alegría de la Resurrección."), L(P("pepe"), "Ahora enciende los dos cirios del altar y deja el leccionario abierto en el ambón, en el Evangelio de hoy.")]],
          ["Morado", [L(P("pepe"), "El morado es para Adviento y Cuaresma, tiempos de preparación. Hoy es otra cosa: ¡Jesús resucitó!")]],
          ["Verde", [L(P("pepe"), "El verde es del Tiempo Ordinario. Pero estamos en Pascua…")]],
          ["Rojo", [L(P("pepe"), "El rojo es para Pentecostés, el Viernes Santo y los mártires. Piensa en la alegría de la Pascua.")]],
        ], 0, () => { q.color = 1; });
        if ((q.cir || 0) < 2 || !q.lecc) return say([L(P("pepe"), `Todavía falta ${[(q.cir || 0) < 2 ? "encender los cirios del altar" : "", !q.lecc ? "abrir el leccionario en el ambón" : ""].filter(Boolean).join(" y ")}.`)]);
        if (!q.steps) return order(P("pepe"), "Última cosa: repasemos la misa para que cada uno sepa cuándo le toca. Toca las partes en orden:", MISA_PARTES,
          () => { q.steps = 1; say([L(P("pepe"), "¡Perfecto! El Señor nos reúne, nos perdona, nos habla, se entrega y nos envía."), L(P("pepe"), "Ahora, que cada uno asuma su servicio. Están afuera, en el atrio.")]); },
          "Primero el Señor nos reúne y nos perdona; después nos habla; luego se entrega; al final nos envía.");
        say([L(P("pepe"), "Todo listo. Ahora, que cada uno asuma su servicio.")]);
      },
      ana: () => role(0, "ana", "Ana lee muy claro y despacio.", ["Proclamar la primera lectura", "Llevar las ofrendas", "Recibir en la puerta"]),
      benja: () => role(1, "benja", "Benja toca la guitarra.", ["Recibir en la puerta", "Animar el canto", "Proclamar la lectura"]),
      martina: () => role(2, "martina", "Martina quiere ayudar, pero es tímida.", ["Llevar las ofrendas de pan y vino", "Hacer la homilía", "Animar el canto"]),
      nico: () => role(3, "nico", "Nico sabe lo que es llegar y no conocer a nadie.", ["Proclamar la lectura", "Animar el canto", "Recibir a los que llegan en la puerta"]),
      camin: () => say([L(P("camin"), goalsLeft() ? "Ya casi es la hora. Te acompaño hasta la capilla." : "¿Entramos? Quédate conmigo, que ya es tarde.")]),
      pato: () => say([L(P("pato"), "¡Hola! Los completos son después de la misa, como siempre. Italianos, con mucha palta."), L(P("pato"), "Primero lo primero: el Pan de la misa. Después, el pan de los completos. ¡Los espero a todos!")]),
    },
    end: null, // la escena final es la misa
  },
];
const MISA_PARTES = ["Canto de entrada y saludo", "Acto penitencial", "Lecturas y Evangelio", "Homilía", "Presentación de las ofrendas", "Plegaria eucarística", "Padre nuestro y comunión", "Bendición y envío"];
const MISA = [
  { id: "padre", sc: "capilla", x: 6, y: 3, alb: true }, { id: "pepe", sc: "capilla", x: 10, y: 4, dir: 1 },
  ...[["camin", 3, 9], ["tomas", 5, 9], ["martina", 7, 9], ["nico", 8, 9], ["benja", 10, 9], ["ana", 2, 11], ["sofi", 3, 11], ["lucho", 4, 11], ["carmen", 7, 11], ["marta", 8, 11], ["joaco", 9, 11], ["pato", 3, 13]]
    .map(([id, x, y]) => ({ id, sc: "capilla", x, y, sit: true, dir: 3 })),
];
const ROLE_GOOD = [0, 1, 0, 2];
function role(i, id, intro, opts) {
  const done = Q().roles || 0;
  if (i < done) return say([L(P(id), "¡Listo! Ya sé qué me toca.")]);
  if (!Q().steps) return say([L(P(id), "Primero hay que ayudar a Pepe a preparar la misa. Está adentro, en la capilla.")]);
  if (i > done) return say([L(N, "Propón los servicios en orden: Ana, Benja, Martina y Nico.")]);
  ask(P(id), intro + " ¿Qué servicio le propones?", opts.map((o, k) => [o, k === ROLE_GOOD[i]
    ? [L(P(id), "¡Me gusta! Lo hago con gusto."), L(N, "Participar plena, consciente y activamente: cada uno pone su don al servicio de la celebración.")]
    : [L(P(id), "Mmm… no sé si eso es lo mío."), L(N, "¿Y si aprovechas lo que le gusta o lo que vive?")]]), ROLE_GOOD[i], () => { Q().roles = done + 1; });
}
// Capítulo 2: conocer el don de cada uno y armar el tablero de servicios
const hintsAll = () => { const h = Q().h || {}; return h.benja && h.ana && h.tomas; };
function gift(id, lines) {
  if (!Q().met) return say([L(P(id), "¡Hola! ¿Viste a Sofi?")]);
  if ((Q().tasks || 0) >= 3) return say([L(P(id), "¡Ya sé qué me toca en el encuentro!")]);
  (Q().h = Q().h || {})[id] = 1; say(lines);
}
const SERVICIOS = ["Animar los cantos", "Recibir a los que llegan", "Hacer el afiche del próximo encuentro", "Llevar la cuenta de la colecta", "Dirigir la oración final"];
function tablero() {
  if (!Q().met) return say([L(N, "El tablero de servicios está vacío. Sofi te va a explicar.")]);
  if ((Q().tasks || 0) >= 3) return say([L(N, "Benja anima los cantos, Ana recibe a los que llegan y Tomás hace el afiche. ¡Cada uno con su don!")]);
  const who = [["Benja", 0], ["Ana", 1], ["Tomás", 2]], pick = [];
  const step = (i) => {
    if (i >= 3) {
      const ok = pick.filter((p, k) => p === who[k][1]).length;
      if (ok === 3) { Q().tasks = 3; return say([L(N, "Benja anima los cantos, Ana recibe a los que llegan y Tomás hace el afiche del próximo encuentro."), L(N, "Cuando cada uno pone su don, el grupo se vuelve comunidad. Jesús lavó los pies: servir es el camino (Jn 13).")]); }
      return say([L(N, `${["Ninguno", "Solo uno", "Dos"][ok]} de los tres servicios calza con el don de cada uno.`), L(N, hintsAll() ? "Piensa en lo que te contó cada uno. Puedes volver a intentarlo." : "Todavía no los conoces bien. Conversa con ellos: en lo que cuentan está su don.")]);
    }
    say([{ who: N, t: `¿Qué servicio le das a ${who[i][0]}?`, ch: SERVICIOS.map((o, k) => [o, () => { pick.push(k); step(i + 1); }]) }]);
  };
  say([L(N, "En el tablero hay que anotar qué hará cada uno en el encuentro. Elige con cuidado: solo al final sabrás cuántos calzan.")], () => step(0));
}
// Capítulo 3: las páginas de la Biblia
const PAGES = [{ id: 0 }, { id: 1, x: 40, y: 27 }, { id: 2, x: 5, y: 8 }];
const PAGE_TXT = [
  { ref: "Salmo 119,105", t: "Tu Palabra es una lámpara para mis pasos y una luz en mi camino.", refs: ["Salmo 119,105", "Génesis 1,3", "Juan 8,12", "Isaías 60,1"], hint: "Fíjate: la frase le habla a Dios, como una oración cantada.",
    q: "¿Qué es la Palabra de Dios para nuestros pasos, según el Salmo?", o: ["Una lámpara que ilumina", "Un mapa con atajos", "Una muralla que protege"], c: 0 },
  { ref: "Juan 15,15", t: "Ya no los llamo servidores, los llamo amigos.", refs: ["Juan 15,15", "Marcos 10,45", "Éxodo 33,11", "Mateo 28,20"], hint: "Es Jesús quien habla a sus discípulos, en la Última Cena.",
    q: "¿Cómo nos llama Jesús en el Evangelio de Juan?", o: ["Servidores", "Amigos", "Desconocidos"], c: 1 },
  { ref: "Mateo 18,20", t: "Donde dos o tres se reúnen en mi nombre, ahí estoy yo en medio de ellos.", refs: ["Mateo 18,20", "Hechos 2,42", "Juan 17,21", "Mateo 28,20"], hint: "Está en el Evangelio de Mateo, cuando Jesús habla de la vida en comunidad.",
    q: "¿Dónde está Jesús, según Mateo 18,20?", o: ["Solo en los templos grandes", "Donde dos o tres se reúnen en su nombre", "Muy lejos, en el cielo"], c: 1 },
];
function shelfSearch(s) {
  if (s.ok) { (Q().pages = Q().pages || []).push(0); return say([L(N, `Revisas el estante «${s.l}». Entre el libro de Job y los Proverbios… ¡ahí está!`), L(N, `Encontraste una página (${Q().pages.length} de 3): «${PAGE_TXT[0].t}»`)]); }
  Q().miss = (Q().miss || 0) + 1;
  say([L(N, `Revisas el estante «${s.l}». ${s.d}`), L(N, "La página no está aquí."), ...(Q().miss >= 2 ? [L(N, "Pista: los libros para rezar y cantar son los Salmos. Están junto a Job y los Proverbios.")] : [])]);
}
const FOOD = [{ id: 0, x: 8, y: 20, kind: "bread" }, { id: 1, x: 17, y: 28, kind: "bread" }, { id: 2, x: 40, y: 22, kind: "fish" }, { id: 3, x: 31, y: 13, kind: "bread" },
  { id: 4, x: 12, y: 7, kind: "bread" }, { id: 5, x: 26, y: 12, kind: "fish" }, { id: 6, x: 35, y: 27, kind: "bread" }];

function quiz() {
  const M = P("marta");
  const q = (i) => {
    if (i >= 3) { S.lamp = true; return say([L(M, "¡Muy bien! La Palabra no es solo para saberla: es para orarla y vivirla."), L(M, "Toma esta lámpara. Con ella se ve el sendero del cerro, al noreste."), L(N, "Recibes la Lámpara de la Palabra.")]); }
    const p = PAGE_TXT[i];
    say([L(M, `Página ${i + 1}: «${p.t}»`)], () => ask(M, "¿De qué libro de la Biblia es?", p.refs.map((r, k) => [r, k === 0 ? [L(M, `¡Exacto! ${p.ref}.`)] : [L(M, `Casi. ${p.hint}`)]]), 0,
      () => ask(M, p.q, p.o.map((o, k) => [o, k === p.c ? [L(M, "¡Eso!")] : [L(M, "Léela otra vez con calma.")]]), p.c, () => q(i + 1), true), true));
  };
  say([L(M, "¡Encontraste las tres páginas! Gracias. Leámoslas juntos, despacio, como en la lectura orante.")], () => q(0));
}
function examen() {
  Q().examen = 1;
  say([L(N, "Desde el cerro se ve todo el pueblo al atardecer: el techo de la capilla, la plaza, la cancha. Frente a la cruz, miras el día con Jesús."),
    { who: N, t: "¿Dónde viste a Dios hoy?", ch: ["En la alegría de la once", "En que alcanzó para todos", "En los amigos que juegan juntos"].map((o) => [o, () => say([L(N, "Dios se deja descubrir en lo que vivimos. Dale gracias por eso."), { who: N, t: "", quiet: 6, msg: "Te quedas un momento con Él, mirando el día." }, L(N, "«Gracias, Señor, por este día.»")])]) }]);
}
function sagrario() {
  say([L(N, "El Sagrario. Aquí se guarda la Eucaristía: Jesús vivo y presente. La lámpara roja encendida lo recuerda."), { who: N, t: "", quiet: 6, msg: "Te quedas un momento frente a Él. No hace falta decir mucho: Él te mira con cariño." }]);
}
function rest() {
  Q().rest = 1; S.kneel = true;
  say([L(N, "Entras a la capilla. Está en silencio. Te arrodillas frente al Sagrario: la lámpara roja está encendida. Jesús está aquí."),
    L(N, "Jesús dijo a sus amigos: «Vengan a un lugar apartado y descansen un poco» (Mc 6,31)."),
    { who: N, t: "", quiet: 8, msg: "Le entregas a Jesús tu cansancio. No hay que hacer nada más: Él te sostiene." },
    L(N, "Te levantas con más paz. Servir también es saber descansar en Él.")], () => { S.kneel = false; });
}
function leccionario() {
  ask(N, "En el ambón está el leccionario. El Evangelio de hoy cuenta cómo dos discípulos caminaban tristes hacia una aldea y un forastero se les unió. ¿Dónde lo abres?", [
    ["Lucas 24,13-35", [L(N, "Abres el leccionario en Lucas 24: «Ese mismo día, dos de los discípulos iban a un pequeño pueblo llamado Emaús…»"), L(N, "Te quedas pensando en el Caminante.")]],
    ["Juan 2,1-11", [L(N, "Ese es el de las bodas de Caná, donde Jesús convierte el agua en vino. Hoy es otro.")]],
    ["Marcos 6,30-44", [L(N, "Ese es el de la multiplicación de los panes. Precioso, pero hoy es otro.")]],
    ["Juan 20,19-23", [L(N, "Ese es cuando Jesús resucitado se aparece a los discípulos encerrados. Piensa en un camino hacia una aldea.")]],
  ], 0, () => { Q().lecc = 1; }, true);
}

// ---------------------------------------------------------------------------
// Capítulo en curso
// ---------------------------------------------------------------------------
const CH = () => CHAPTERS[(S.ch || 1) - 1];
function circle() { // el grupo sentado en círculo en el salón, al terminar el encuentro
  const ids = ["camin", ...party(), "sofi", ...(CH().n >= 2 ? ["ana", "benja", "tomas", "martina", "nico"] : ["ana", "benja"])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 7);
  const seats = CHAIRS.filter(([x, y]) => !(x === 6 && y === 7));
  return ids.map((id, i) => ({ id, sc: "salon", x: seats[i][0], y: seats[i][1], sit: true, dir: chairDir(...seats[i]) }));
}
function npcsNow() {
  if (!S.q) return [];
  let l;
  if (Q().enc) l = circle();
  else if (Q().misa) l = MISA;
  else if (!S.inCh) return [];
  else { l = CH().npcs().filter((n) => !n.hide); if (CH().n < 6) l.push({ id: "camin", sc: "salon", x: 9, y: 6, sit: true, dir: 1 }); }
  return l.filter((n) => (n.sc || "pueblo") === S.scene);
}
function spotsNow() {
  if (!S.inCh || Q().enc || Q().misa) return [];
  return [...(CH().spots ? CH().spots() : []), ...baseSpots()].filter((s) => s.sc === S.scene);
}
function itemsNow() { return S.inCh && CH().items ? CH().items().filter((i) => i.show && (i.sc || "pueblo") === S.scene) : []; }
function baseSpots() {
  const s = [], d = (sc, x, y, label, lines, o = {}) => s.push(SP(sc, x, y, label, o.f || (() => say(lines)), o));
  d("pueblo", 9, 13.6, "La pileta", [L(N, "El agua de la pileta corre sin parar."), L(N, "Jesús dijo: «Si alguien tiene sed, venga a mí y beba» (Jn 7,37).")], { r: 2.3 });
  if (!npcsNow().some((n) => n.id === "pato")) d("pueblo", 27, 8, "Carrito de completos", [L(N, "El carrito de completos de Don Pato. Abre los domingos, después de misa.")], { r: 1.4 });
  d("pueblo", 38, 2, "La cruz del cerro", [L(N, "Una cruz de madera mira hacia el pueblo. Desde aquí se ve todo: la capilla, la plaza, las casas."), L(N, "«Yo estoy con ustedes todos los días, hasta el fin del mundo» (Mt 28,20).")], { r: 1.6 });
  d("capilla", 6, 3, "El Sagrario", null, { verb: "Rezar", r: 1.15, f: sagrario });
  d("capilla", 6, 5, "El altar", [L(N, "El altar es la mesa donde Jesús se entrega en cada misa. Por eso se cubre con un mantel blanco, como para una fiesta."), L(N, "«Tomen y coman, esto es mi Cuerpo» (cf. Mt 26,26).")]);
  d("capilla", 9, 7, "El ambón", [L(N, "El ambón: desde aquí se proclama la Palabra de Dios."), L(N, "Cuando se lee el Evangelio, todos se ponen de pie: es Jesús mismo quien nos habla.")], { r: 1.1 });
  d("capilla", 2, 8, "La Virgen María", [L(N, "Una imagen de María, la mamá de Jesús, con su manto azul y flores a sus pies."), L(N, "«María guardaba todas estas cosas en su corazón» (Lc 2,19).")], { r: 1.1 });
  d("capilla", 10, 8, "San Miguel Arcángel", [L(N, "San Miguel Arcángel, patrono de la parroquia. Su nombre significa «¿Quién como Dios?»."), L(N, "Lo representan con una espada: el bien vence cuando dejamos que Dios sea el centro.")], { r: 1.1 });
  d("capilla", 2, 18, "La pila bautismal", [L(N, "La pila bautismal: aquí comienza la vida cristiana."), L(N, "Por el bautismo eres hija o hijo de Dios, y parte de su familia, la Iglesia.")], { r: 1.2 });
  for (const y of [5, 13]) d("capilla", 1, y, "Un vitral", [L(N, "La luz del sol entra por el vitral y se llena de colores."), L(N, "Así pasa con la luz de Dios cuando entra en nuestra vida: no nos borra, nos llena de color.")], { r: 1.0 });
  d("capilla", 10, 4, "La credencia", [L(N, "La credencia: una mesita junto al altar. Aquí esperan el cáliz, la patena y las vinajeras con el agua y el vino.")], { r: 1.0 });
  d("salon", 6.5, 5, "El círculo del encuentro", null, { verb: "Sentarte", r: 2.5, f: door });
  d("salon", 6.5, 2, "Tablero de servicios", [L(N, "El tablero de servicios: aquí se anota quién anima los cantos, quién recibe a los que llegan, quién prepara la oración…"), L(N, "En el grupo cada uno pone su don.")], { r: 1.6 });
  d("salon", 2, 2, "El papelógrafo", [L(N, "En el papelógrafo dice, con letra grande: VIVIR · CONVERSAR · ILUMINAR · ACTUAR."), L(N, "Es el camino de cada encuentro del grupo.")], { r: 1.3 });
  d("salon", 12, 2, "El botiquín", [L(N, "El botiquín del salón: gasa, agua y parches. Ojalá no se use mucho.")], { r: 1.0 });
  d("salon", 10.5, 2, "El lavaplatos", [L(N, "Después de cada once alguien lava las tazas. Servir también es esto.")], { r: 1.3 });
  d("salon", 1.5, 6.5, "La mesa de la once", [L(N, "Una tetera, tazas y pan amasado. En el grupo siempre hay algo para compartir con el que llega.")], { r: 1.7 });
  for (const sh of SHELVES) d("biblio", sh.x + .5, sh.y + 1, sh.l, [L(N, `Estante: ${sh.l}.`), L(N, sh.d)], { r: 1.05 });
  d("biblio", 6.5, 7, "La mesa de lectura", [L(N, "Una mesa larga con lámparas verdes. Alguien dejó una Biblia abierta en el Salmo 23: «El Señor es mi pastor, nada me falta»."), L(N, "La Biblia no es un solo libro: son 73, ordenados en los estantes de esta sala.")], { r: 1.6 });
  d("casa", 8, 3, "La foto del aparador", [L(N, "Una foto antigua: Don Lucho, joven, abrazado a su señora el día de su matrimonio. Los dos se ríen.")], { r: 1.1 });
  d("casa", 1.5, 3, "La cocina a leña", [L(N, "La cocina a leña está tibia. Encima, una tetera de fierro.")], { r: 1.3 });
  d("casa", 5.5, 3.5, "La mesa", [L(N, "Un mantel de hule a cuadros y un frutero con manzanas.")], { r: 1.7 });
  return s;
}
function nextGoal() {
  if (!S.inCh) return { t: "", at: null };
  const c = CH(), st = c.start && c.start();
  if (st) return st;
  const q = c.quests.find((x) => !x.done());
  if (q) { const at = typeof q.at === "function" ? q.at() : q.at; return { t: qt(q), at, u: q.u }; }
  if (c.n === 6) return { t: "Todo listo: entra a la capilla y siéntate en la primera banca.", at: { sc: "capilla", x: 4, y: 8 } };
  return { t: "Entra al salón parroquial y siéntate en el círculo: empieza el encuentro.", at: { sc: "salon", x: 6.5, y: 5 } };
}
function startChapter(n) {
  S.ch = n; S.q = {}; S.inCh = true; S.lamp = n > 3; // la lámpara se recibe en el capítulo 3
  S.scene = "pueblo"; S.x = START.x; S.y = START.y; S.dir = 0; S.kneel = false; trail = []; target = null;
  buildScene(); save(); hideCards(); paintHud();
  say(CH().intro);
}
function finishChapter() {
  const c = CH();
  if (!S.cd.includes(c.n)) S.cd.push(c.n);
  if (c.n === 6) return finale();
  Q().enc = 1; S.x = 6.5 * T; S.y = 7.5 * T; S.dir = 3; target = null; trail = []; save();
  say([L(N, "Se sientan en círculo. Alguien enciende la vela del centro. El Caminante también está ahí, escuchando."), ...c.end.lines], () => { S.inCh = false; save(); paintHud(); chapterCard(c); });
}
// Escena final: la misa, dentro de la capilla
function finale() {
  Q().misa = 1; S.x = 4.5 * T; S.y = 9.5 * T; S.dir = 3; target = null; trail = []; save();
  const B = (st, t) => ({ who: { n: "", st, big: true }, t });
  say([
    L(N, "Suenan las campanas. La capilla se llena: Sofi, Tomás, Ana, Benja, Martina, Nico, Don Lucho, la Tía Carmen… El Caminante se sienta a tu lado."),
    B("biblia", "Ana proclama la lectura. Benja anima el canto. Todo lo que el grupo vivió en estos sábados parece encajar."),
    B("eucaristia", "Martina lleva el pan y el vino al altar. El Padre Andrés toma el pan, da gracias, lo parte y lo reparte."),
    B("emaus", "Entonces se te abren los ojos y lo reconoces: el Caminante era Jesús. Estuvo contigo en cada encuentro, en cada camino."),
    B("jesus", "«¿No ardía nuestro corazón mientras nos hablaba en el camino?» (cf. Lc 24,32)"),
    B("eucaristia", "Después de la comunión se quedan un momento en silencio. Lo miras y te dejas mirar por Él."),
    B("amigos", "«Pueden ir en paz.» Y como los discípulos de Emaús, salen a contarlo y a servir a los demás."),
    B("comunidad", "Afuera, Don Pato ya tiene listo el carrito de completos. Italianos para todos, conversación, risas y un par de abrazos: después de la misa, a los completos."),
    B("amigos", "Porque la comunidad que se reúne en torno al altar sigue compartiendo la mesa afuera. Así se vive Ágape."),
  ], () => { S.inCh = false; save(); paintHud(); endScreen(); });
}

// ---------------------------------------------------------------------------
// Movimiento y lugares
// ---------------------------------------------------------------------------
const keys = new Set();
let pad = { x: 0, y: 0 }, target = null, last = 0, raf = 0, trail = [], anim = 0, canvas = null, vp = { w: 0, h: 0 }, dpr = 1, fade = null, banner = null, lockMsg = 0, lc = null;
const R = 10;
function buildScene() { SC().build(); buildProps(); ground = null; setZoom(); }
function setZoom() {
  if (!vp.w) return;
  const bz = vp.w >= 1000 ? 1.4 : vp.w >= 640 ? 1.2 : 1;
  Z = S.scene === "pueblo" ? bz : clamp(Math.min((vp.h * .82) / (H * T), vp.w < 640 ? 1.4 : 1.8), bz, 1.8);
  const s = Math.min(2, Math.round(dpr * Z * 4) / 4);
  if (s !== SCL) { SCL = s; cache.clear(); ground = null; }
}
const sitting = () => !!(Q().enc || Q().misa);
function free(px, py) {
  for (const [dx, dy] of [[-R, -R], [R, -R], [-R, R], [R, R], [0, R], [0, -R]]) if (solid(Math.floor((px + dx) / T), Math.floor((py + dy) / T))) return false;
  for (const n of npcsNow()) { if (n.tree) continue; const p = AT(n); if (Math.hypot(p.x - px, p.y - py) < R + 9) return false; }
  return true;
}
function goScene(sc, x, y) {
  if (fade) return;
  fade = { t0: performance.now(), mid: () => { S.scene = sc; S.x = x * T; S.y = y * T; S.dir = sc === "pueblo" ? 0 : 3; trail = []; target = null; keys.clear(); buildScene(); banner = { t: SCN[sc].name, t0: performance.now() }; save(); paintHud(); } };
}
function useDoor(d) {
  if (d.ok && !d.ok()) { if (Date.now() - lockMsg > 2500) { lockMsg = Date.now(); toastEm(d.no); } target = null; return; }
  goScene(d.to, d.x, d.y);
}
function step(dt) {
  if (dlg || fade || !S.started || !S.inCh || sitting() || S.kneel || $(".em-start")) { anim = 0; return; }
  CH().timer && CH().timer();
  let vx = 0, vy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) vx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) vx += 1;
  if (keys.has("ArrowUp") || keys.has("w")) vy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) vy += 1;
  vx += pad.x; vy += pad.y;
  if (!vx && !vy && target) { const dx = target.x - S.x, dy = target.y - S.y, d = Math.hypot(dx, dy); if (d < 4) target = null; else { vx = dx / d; vy = dy / d; } }
  else if (vx || vy) target = null;
  const m = Math.hypot(vx, vy);
  if (!m) { anim = 0; return; }
  vx /= m; vy /= m;
  S.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 1 : 2) : vy < 0 ? 3 : 0;
  const pd = doorAt(Math.floor((S.x + vx * (R + 6)) / T), Math.floor((S.y + vy * (R + 6)) / T));
  if (pd) return useDoor(pd);
  const sp = 130 * dt, nx = S.x + vx * sp, ny = S.y + vy * sp;
  let moved = false;
  if (free(nx, S.y)) { S.x = nx; moved = true; }
  if (free(S.x, ny)) { S.y = ny; moved = true; }
  if (!moved && target) target = null;
  anim += dt * 9;
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 160) trail.length = 160;
  if (S.scene === "pueblo" && CH().tile) CH().tile(Math.floor(S.x / T), Math.floor(S.y / T));
}
function interactable() {
  if (!S.inCh || sitting() || dlg) return null;
  let best = null, bd = 9;
  for (const n of npcsNow()) { const p = AT(n), r = (n.tree ? 2.2 : 1.7) * T, d = Math.hypot(p.x - S.x, p.y - S.y); if (d < r && d / r < bd) { bd = d / r; best = { npc: n }; } }
  for (const s of spotsNow()) { const p = AT(s), r = s.r * T, d = Math.hypot(p.x - S.x, p.y - S.y); if (d < r && d / r < bd) { bd = d / r; best = { spot: s }; } }
  return best;
}
function action() {
  if (dlg) return next();
  if (fade || !S.inCh) return;
  const it = interactable();
  if (it && it.npc) return talkTo(it.npc.id);
  if (it && it.spot) return it.spot.f();
}
function talkTo(id) {
  if (S.scene === "salon" && id === "camin") return say([L(P("camin"), goalsLeft() ? "Aquí te espero. Termina lo que falta y vuelve con los demás." : "Ya están todos. Siéntate, que empezamos.")]);
  const f = CH().talk[id]; if (f) f();
}
function door() {
  const left = goalsLeft(), c = CH();
  if (c.n === 6 && S.scene === "salon") return say([L(N, "Hoy el encuentro es en la capilla: la misa del domingo.")]);
  if (c.start && c.start()) return say([L(N, "Primero habla con quien te está esperando.")]);
  if (left) return say([L(N, c.n === 6 ? `La misa todavía no empieza: falta preparar ${left === 1 ? "una cosa" : left + " cosas"}.` : `El encuentro empieza cuando estén todos. Falta ${left === 1 ? "una cosa" : left + " cosas"}.`)]);
  finishChapter();
}

// ---------------------------------------------------------------------------
// Dibujo de cada cuadro
// ---------------------------------------------------------------------------
function cam() {
  const sw = W * T * Z, sh = H * T * Z;
  const cx = sw <= vp.w ? (sw - vp.w) / 2 : clamp(S.x * Z - vp.w / 2, 0, sw - vp.w);
  const cy = sh <= vp.h ? (sh - vp.h) / 2 : clamp(S.y * Z - vp.h / 2, 0, sh - vp.h);
  return { cx, cy };
}
function underlay(t, v) {
  if (S.scene === "pueblo") {
    g2.strokeStyle = "rgba(255,255,255,.55)"; g2.lineWidth = 1.4;
    for (let y = Math.max(0, Math.floor(v.y0 / T)); y < Math.min(H, v.y1 / T); y++) for (let x = Math.max(0, Math.floor(v.x0 / T)); x < Math.min(W, v.x1 / T); x++) {
      if (base[y][x] !== "~") continue;
      for (let k = 0; k < 2; k++) { const o = Math.sin(t * 1.6 + x * 1.3 + y * .7 + k * 2) * 4, yy = y * T + 9 + k * 13 + ((t * 10 + k * 7) % 6); g2.beginPath(); g2.moveTo(x * T + 6 + o, yy); g2.quadraticCurveTo(x * T + 12 + o, yy - 3, x * T + 18 + o, yy); g2.stroke(); }
    }
    if (S.inCh && CH().n === 1 && Q().dog === 1) { // huellas de Canela hacia los arbustos
      const pts = [[6.5, 17.2], [7, 19], [7.6, 21], [5.6, 22.6], [5, 24.5], [4.6, 26.4], [5, 28.2], [5.4, 29.3]];
      g2.fillStyle = "rgba(90,60,30,.4)";
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = 4; for (let k = 0; k < n; k++) { const f = k / n, px = (ax + (bx - ax) * f) * T, py = (ay + (by - ay) * f) * T, s = (i * n + k) % 2 ? 4 : -4; g2.beginPath(); g2.ellipse(px + s, py, 2.2, 1.6, 0, 0, 7); g2.fill(); } }
    }
  } else if (S.scene === "capilla") { // lámpara del Santísimo
    const x = 7.5 * T + 2, y = 2 * T + 2, f = Math.sin(t * 7) * .6;
    g2.strokeStyle = "#8a6510"; g2.lineWidth = 1.5; g2.beginPath(); g2.moveTo(x, y - 30); g2.lineTo(x, y - 10); g2.stroke();
    g2.fillStyle = "#d9a520"; g2.fillRect(x - 5, y - 10, 10, 3);
    g2.fillStyle = "#c0242e"; g2.strokeStyle = OL; g2.lineWidth = 1.2; g2.beginPath(); g2.moveTo(x - 5, y - 7); g2.lineTo(x + 5, y - 7); g2.lineTo(x + 3, y + 5); g2.lineTo(x - 3, y + 5); g2.closePath(); g2.fill(); g2.stroke();
    g2.fillStyle = "#ffd76a"; g2.beginPath(); g2.ellipse(x + f * .4, y - 2, 1.4, 2.6, 0, 0, 7); g2.fill();
  } else if (S.scene === "salon") flame(7 * T + 13, 5 * T + 11, t, .8);
}
function itemDraw(it, t) {
  const a = AT(it);
  if (it.kind === "dog") dog(a.x, a.y, t, true); else if (it.kind === "page") pageIco(a.x, a.y, t); else if (it.kind === "case") guitarCase(a.x, a.y + 4);
  else if (it.kind === "spark") sparkle(a.x, a.y, t, K.sky); else food(a.x, a.y, t, it.kind === "fish");
}
function draw(t) {
  if (!g2 || !vp.w) return;
  ensureGround();
  const { cx, cy } = cam();
  g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.globalCompositeOperation = "source-over";
  g2.fillStyle = SC().bg; g2.fillRect(0, 0, vp.w, vp.h);
  g2.save(); g2.translate(-Math.round(cx), -Math.round(cy)); g2.scale(Z, Z);
  g2.drawImage(ground, 0, 0, W * T, H * T);
  const v = { x0: cx / Z - 2 * T, y0: cy / Z - 2 * T, x1: (cx + vp.w) / Z + 2 * T, y1: (cy + vp.h) / Z + 4 * T };
  underlay(t, v);
  const list = [];
  for (const p of props) if (p.bb[2] >= v.x0 && p.bb[0] <= v.x1 && p.bb[3] >= v.y0 && p.bb[1] <= v.y1) list.push(p);
  for (const it of itemsNow()) list.push({ y: AT(it).y + (it.kind === "dog" ? -1 : 8), d: () => itemDraw(it, t) });
  const it0 = interactable();
  for (const n of npcsNow()) {
    const p = PEOPLE[n.id], a = AT(n), yy = n.tree ? a.y - 16 : a.y, sitY = n.sit ? yy - 3 : yy;
    list.push({ y: a.y + (n.sit ? 1 : 0), d: () => { person(a.x, sitY, p.look, { robe: p.robe, old: p.old, kid: p.kid, priest: p.priest, alb: n.alb, sit: n.sit, sad: n.sad, dir: n.dir || 0 }); if (it0 && it0.npc === n) bubble(a.x, sitY); } });
  }
  if (!sitting() && S.inCh) {
    const fol = [...(S.ally ? ["ally"] : []), ...party()];
    if (CH().n === 1 && Q().dog === 2) fol.push("dog");
    fol.forEach((id, i) => {
      const p = trail.length > 14 * (i + 1) ? trail[14 * (i + 1)] : { x: S.x - 12 * (i + 1) * (S.dir === 2 ? 1 : S.dir === 1 ? -1 : 0), y: S.y + 14 * (i + 1) * (S.dir === 3 ? 1 : S.dir === 0 ? -1 : 0) };
      const pp = trail.length > 14 * (i + 1) + 3 ? trail[14 * (i + 1) + 3] : p, fd = Math.abs(p.x - pp.x) > Math.abs(p.y - pp.y) ? (p.x < pp.x ? 1 : 2) : p.y < pp.y ? 3 : 0;
      if (id === "dog") return list.push({ y: p.y, d: () => dog(p.x, p.y + 4, t, !anim) });
      const look = id === "ally" ? { hair: "#3b2a1f", skin: "#e9b98f", shirt: K.yellow, pants: "#2f4f8a", hs: "short" } : PEOPLE[id].look;
      list.push({ y: p.y, d: () => person(p.x, p.y, look, { walk: anim ? anim + i : 0, old: PEOPLE[id] && PEOPLE[id].old, robe: PEOPLE[id] && PEOPLE[id].robe, kid: PEOPLE[id] && PEOPLE[id].kid, dir: anim ? fd : S.dir }) });
    });
  }
  const sit = sitting();
  list.push({ y: S.y + (sit ? 1 : 0), d: () => person(S.x, sit ? S.y - 3 : S.y, LOOKS[S.look] || LOOKS[0], { walk: anim, dir: S.dir, sit, kneel: S.kneel }) });
  list.sort((a, b) => a.y - b.y).forEach((o) => o.d(t));
  // etiqueta de lo que se puede mirar
  if (it0 && it0.spot) { const a = AT(it0.spot), txt = it0.spot.label; g2.font = "bold 10px system-ui, sans-serif"; const w = g2.measureText(txt).width + 14; g2.fillStyle = "rgba(11,37,102,.88)"; rr(g2, a.x - w / 2, a.y - 34, w, 17, 8); g2.fill(); g2.fillStyle = "#fff"; g2.textAlign = "center"; g2.fillText(txt, a.x, a.y - 22.5); }
  // con un compañero de camino: flecha hacia la meta (o hacia la puerta que lleva a ella)
  if (S.ally && !dlg && S.inCh && !sit) {
    const goal = nextGoal(); let at = goal && goal.at;
    if (at) { const gs = at.sc || "pueblo"; if (gs !== S.scene) at = S.scene !== "pueblo" ? SC().exit : SCN[gs].entry; }
    if (at) { const a = Math.atan2((at.y + .5) * T - S.y, (at.x + .5) * T - S.x);
      g2.save(); g2.translate(S.x + Math.cos(a) * 26, S.y + Math.sin(a) * 26 - 4); g2.rotate(a); g2.fillStyle = K.yellow; g2.strokeStyle = OL; g2.lineWidth = 1.5;
      g2.beginPath(); g2.moveTo(8, 0); g2.lineTo(-5, -6); g2.lineTo(-5, 6); g2.closePath(); g2.fill(); g2.stroke(); g2.restore(); }
  }
  g2.restore();
  lighting(t, cx, cy);
  overlays();
}
function lightsFor(t) {
  const n = S.inCh || Q().enc || Q().misa ? CH().n : 0, f = 1 + Math.sin(t * 7) * .05 + Math.sin(t * 13) * .03;
  if (S.scene === "pueblo") {
    if (n === 4 && Q().plan) return { amb: "rgba(40,22,80,.30)", tint: "rgba(255,130,50,.13)", lights: [...FAROLES.map(([x, y]) => ({ x: (x + .5) * T, y: y * T - 18, r: 80, a: .9, col: "rgba(255,200,110,.32)" })), { x: 38 * T, y: 3 * T, r: 150, a: .6 }] };
    if (n === 6) return { tint: "rgba(255,236,190,.07)" };
    return { tint: n === 3 ? "rgba(120,140,170,.07)" : null };
  }
  if (S.scene === "capilla") {
    const Lg = [{ x: 6.5 * T, y: 12 * T, r: 300, a: .5 }, { x: 6.5 * T, y: 21 * T, r: 130, a: .9, col: "rgba(255,240,200,.15)" }, { x: 7.5 * T, y: 2 * T, r: 70 * f, a: .8, col: "rgba(255,50,40,.32)" }, { x: 6.5 * T, y: 1.5 * T, r: 110, a: .5 }];
    const VC = ["rgba(19,81,164,.14)", "rgba(255,186,3,.14)", "rgba(239,89,28,.12)", "rgba(58,165,122,.12)"];
    [5, 9, 13, 17].forEach((y, i) => { Lg.push({ x: 2 * T, y: (y + 1) * T, r: 90, a: .55, col: VC[i] }); Lg.push({ x: 11 * T, y: (y + 1) * T, r: 90, a: .55, col: VC[(i + 2) % 4] }); });
    Lg.push({ x: 2.2 * T, y: 1.4 * T, r: 80, a: .55, col: "rgba(255,186,3,.1)" }, { x: 10.8 * T, y: 1.4 * T, r: 80, a: .55, col: "rgba(19,81,164,.12)" });
    const lit = altarLit(); if (lit) { Lg.push({ x: 5 * T + 12, y: 4 * T - 32, r: 70 * f, a: .8, col: "rgba(255,190,90,.3)" }); if (lit > 1) Lg.push({ x: 5 * T + 84, y: 4 * T - 32, r: 70 * f, a: .8, col: "rgba(255,190,90,.3)" }); }
    return { amb: "rgba(28,16,8,.36)", lights: Lg };
  }
  if (S.scene === "salon") return { amb: "rgba(30,20,10,.16)", lights: [{ x: 4 * T, y: 2 * T, r: 120, a: .7, col: "rgba(138,210,250,.10)" }, { x: 10 * T, y: 2 * T, r: 120, a: .7, col: "rgba(138,210,250,.10)" }, { x: 7 * T, y: 5.4 * T, r: 75 * f, a: .8, col: "rgba(255,170,60,.28)" }, { x: 7 * T, y: 9.5 * T, r: 90, a: .6 }] };
  if (S.scene === "biblio") return { amb: "rgba(25,18,10,.26)", lights: [{ x: 3 * T, y: 2 * T, r: 110, a: .7, col: "rgba(138,210,250,.10)" }, { x: 11 * T, y: 2 * T, r: 110, a: .7, col: "rgba(138,210,250,.10)" }, { x: 5.9 * T, y: 5.5 * T, r: 70, a: .85, col: "rgba(255,220,130,.25)" }, { x: 8.1 * T, y: 5.5 * T, r: 70, a: .85, col: "rgba(255,220,130,.25)" }, { x: 7 * T, y: 8.6 * T, r: 80, a: .6 }] };
  if (S.scene === "casa") return { amb: "rgba(30,15,5,.30)", lights: [{ x: 2 * T, y: 2.8 * T, r: 95 * f, a: .85, col: "rgba(255,130,40,.30)" }, { x: 5 * T, y: 1.6 * T, r: 110, a: .7, col: "rgba(255,240,210,.10)" }, { x: 5 * T, y: 6.6 * T, r: 70, a: .5 }] };
  return {};
}
function lighting(t, cx, cy) {
  const Lt = lightsFor(t), toS = (l) => ({ x: l.x * Z - cx, y: l.y * Z - cy, r: l.r * Z });
  if (Lt.amb) {
    if (!lc) lc = document.createElement("canvas");
    if (lc.width !== Math.ceil(vp.w / 2) || lc.height !== Math.ceil(vp.h / 2)) { lc.width = Math.ceil(vp.w / 2); lc.height = Math.ceil(vp.h / 2); }
    const g = lc.getContext("2d"); g.setTransform(.5, 0, 0, .5, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, vp.w, vp.h);
    g.fillStyle = Lt.amb; g.fillRect(0, 0, vp.w, vp.h); g.globalCompositeOperation = "destination-out";
    for (const l of Lt.lights || []) { const s = toS(l), gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r); gr.addColorStop(0, `rgba(0,0,0,${l.a})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); }
    g2.drawImage(lc, 0, 0, vp.w, vp.h);
  }
  g2.globalCompositeOperation = "lighter";
  for (const l of Lt.lights || []) { if (!l.col) continue; const s = toS(l), gr = g2.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r); gr.addColorStop(0, l.col); gr.addColorStop(1, "rgba(0,0,0,0)"); g2.fillStyle = gr; g2.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); }
  g2.globalCompositeOperation = "source-over";
  if (Lt.tint) { g2.fillStyle = Lt.tint; g2.fillRect(0, 0, vp.w, vp.h); }
  const vg = g2.createRadialGradient(vp.w / 2, vp.h / 2, Math.min(vp.w, vp.h) * .35, vp.w / 2, vp.h / 2, Math.max(vp.w, vp.h) * .75);
  vg.addColorStop(0, "rgba(11,37,102,0)"); vg.addColorStop(1, "rgba(11,37,102,.22)"); g2.fillStyle = vg; g2.fillRect(0, 0, vp.w, vp.h);
}
function overlays() {
  const now = performance.now();
  if (banner) {
    const p = (now - banner.t0) / 2200;
    if (p >= 1) banner = null;
    else { const a = p < .15 ? p / .15 : p > .75 ? (1 - p) / .25 : 1; g2.globalAlpha = a; g2.font = "800 15px system-ui, sans-serif"; const w = g2.measureText(banner.t).width + 34, y = Math.min(vp.h * .3, 150); g2.fillStyle = "rgba(255,246,229,.96)"; g2.strokeStyle = OL; g2.lineWidth = 2.5; rr(g2, vp.w / 2 - w / 2, y, w, 34, 17); g2.fill(); g2.stroke(); g2.fillStyle = OL; g2.textAlign = "center"; g2.fillText(banner.t, vp.w / 2, y + 22); g2.globalAlpha = 1; }
  }
  if (fade) {
    const p = (now - fade.t0) / 420;
    if (p >= .5 && !fade.did) { fade.did = 1; fade.mid(); }
    if (p >= 1) fade = null;
    else { g2.fillStyle = `rgba(11,22,51,${p < .5 ? p * 2 : (1 - p) * 2})`; g2.fillRect(0, 0, vp.w, vp.h); }
  }
}
function loop(ts) { const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; step(dt); draw(ts / 1000); raf = requestAnimationFrame(loop); }

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------
export { emausArt as artSvg } from "./juegos-arte.js";
import { emausArt as artSvg } from "./juegos-arte.js";

export function view(q = "") {
  load();
  const de = new URLSearchParams(q).get("de");
  if (de !== null) { const who = de.replace(/[^\p{L} ]/gu, "").trim().slice(0, 20); if (!S.started) { S.invited = who || "un amigo"; S.ally = true; save(); } }
  ctx.onAfterRender(() => { document.body.classList.add("solo-on"); mount(); });
  ctx.onLeave(() => { document.body.classList.remove("solo-on"); unmount(); });
  return `<div class="em" id="emRoot">
    <canvas id="emCanvas" aria-label="Mapa del juego Emaús"></canvas>
    <div class="em-hud" id="emHud"></div>
    <div class="em-pad" id="emPad" aria-hidden="true"><span data-d="u"></span><span data-d="l"></span><span data-d="r"></span><span data-d="d"></span></div>
    <button class="em-act" id="emAct" aria-label="Hablar">Hablar</button>
    <div class="em-dlg" id="emDlg" hidden></div>
    <div class="em-menu" id="emMenu" hidden></div>
    <div id="emStart"></div>
  </div>`;
}
function resize() {
  const root = $("#emRoot"); if (!root || !canvas) return;
  dpr = Math.min(2, window.devicePixelRatio || 1); vp.w = root.clientWidth; vp.h = root.clientHeight;
  canvas.width = vp.w * dpr; canvas.height = vp.h * dpr; canvas.style.width = vp.w + "px"; canvas.style.height = vp.h + "px";
  setZoom();
}
function mount() {
  const rootEl = $("#emRoot"); if (rootEl && rootEl.parentElement !== document.body) document.body.appendChild(rootEl);
  canvas = $("#emCanvas"); g2 = canvas.getContext("2d");
  SC().build(); resize(); buildScene();
  window.addEventListener("resize", resize); window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
  const padEl = $("#emPad");
  const padSet = (e) => { const r = padEl.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = Math.hypot(dx, dy) || 1; pad = m < 8 ? { x: 0, y: 0 } : { x: dx / m, y: dy / m }; };
  padEl.addEventListener("pointerdown", (e) => { padEl.setPointerCapture(e.pointerId); padSet(e); });
  padEl.addEventListener("pointermove", (e) => { if (e.buttons) padSet(e); });
  const padEnd = () => { pad = { x: 0, y: 0 }; };
  padEl.addEventListener("pointerup", padEnd); padEl.addEventListener("pointercancel", padEnd);
  canvas.addEventListener("pointerdown", (e) => {
    if (dlg) return next();
    if (!S.inCh || sitting()) return;
    const r = canvas.getBoundingClientRect(), { cx, cy } = cam();
    const wx = (e.clientX - r.left + cx) / Z, wy = (e.clientY - r.top + cy) / Z;
    const it = interactable();
    if (it && it.npc && Math.hypot(AT(it.npc).x - wx, AT(it.npc).y - wy) < 24) return talkTo(it.npc.id);
    if (it && it.spot && Math.hypot(AT(it.spot).x - wx, AT(it.spot).y - wy) < 30) return it.spot.f();
    target = { x: wx, y: wy };
  });
  $("#emAct").addEventListener("click", action);
  $("#emDlg").addEventListener("click", (e) => { if (!e.target.closest("button")) next(); });
  paintHud(); paintDlg();
  if (!S.started) startScreen(); else if (!S.inCh) chaptersScreen();
  last = 0; raf = requestAnimationFrame(loop);
  window.__emaus = { get S() { return S; }, talk: talkTo, next, choose, act: action, start: startChapter, goal: nextGoal, door, it: interactable,
    tp: (x, y, sc) => { if (sc && sc !== S.scene) { S.scene = sc; buildScene(); } S.x = (x + .5) * T; S.y = (y + .5) * T; trail = []; if (S.scene === "pueblo" && CH().tile) CH().tile(Math.floor(x), Math.floor(y)); } };
}
function unmount() {
  cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
  keys.clear(); pad = { x: 0, y: 0 }; dlg = null; fade = null; S.kneel = false; save(); delete window.__emaus; cache.clear(); ground = null;
  document.querySelectorAll("body > #emRoot").forEach((n) => n.remove());
}
function kd(e) {
  if (!$("#emRoot") || $(".em-start")) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(k)) e.preventDefault();
  if (k === " " || k === "Enter" || k === "e") { action(); return; }
  if (dlg && dlg.q[dlg.i] && dlg.q[dlg.i].ch && /^[1-5]$/.test(k)) { const n = +k - 1; if (n < dlg.q[dlg.i].ch.length) choose(n); return; }
  if (k === "Escape") { toggleMenu(); return; }
  keys.add(k);
}
const ku = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);

function paintHud() {
  const h = $("#emHud"); if (!h) return;
  if (!S.inCh) { h.innerHTML = `<button class="em-menu-btn" data-action="emMenu" aria-label="Menú">Menú</button>`; return; }
  const c = CH(), g = nextGoal(), tleft = Q().timer ? Math.max(0, Math.ceil((Q().timer - Date.now()) / 1000)) : 0;
  h.innerHTML = `<div class="em-chap"><b>Capítulo ${c.n}</b> · ${esc(c.title)}
      <span class="em-qs">${c.quests.map((q) => `<i class="${q.done() ? "on" : ""}" title="${esc(qt(q))}"></i>`).join("")}</span></div>
    <p class="em-goal" ${sitting() ? "hidden" : ""}>${esc(g.t)}${tleft ? ` <span class="em-timer">${tleft} s</span>` : ""}</p>
    <button class="em-menu-btn" data-action="emMenu" aria-label="Menú">Menú</button>`;
}
let lastHud = "";
setInterval(() => {
  const act = $("#emAct");
  if (act) { const it = S.inCh ? interactable() : null, lb = dlg ? "Seguir" : it && it.spot ? it.spot.verb : "Hablar"; if (act.textContent !== lb) act.textContent = lb; act.classList.toggle("dim", !dlg && !it); act.setAttribute("aria-label", lb); }
  if (!$("#emHud") || !S.inCh) return;
  const k = JSON.stringify([nextGoal().t, CH().quests.map((q) => q.done()), Q().timer && Math.ceil((Q().timer - Date.now()) / 1000)]);
  if (k !== lastHud) { lastHud = k; paintHud(); }
}, 250);

function portrait(w) {
  if (!w || w.big) return "";
  if (w.dog) return `<span class="em-face em-dog"></span>`;
  const look = w.look; if (!look) return "";
  return `<span class="em-face" style="--skin:${look.skin};--hair:${look.hair};--shirt:${look.shirt}"><i></i></span>`;
}
function paintDlg() {
  const d = $("#emDlg"); if (!d) return;
  if (!dlg) { d.hidden = true; d.innerHTML = ""; return; }
  const l = dlg.q[dlg.i]; d.hidden = false;
  const w = l.who;
  if (l.quiet) {
    d.innerHTML = `<div class="em-quiet"><p>${esc(l.msg || "En silencio, con Él.")}</p><div class="em-bar"><i style="animation-duration:${l.quiet}s"></i></div></div>`;
    setTimeout(() => { if (dlg && dlg.q[dlg.i] === l) next(); }, l.quiet * 1000); return;
  }
  if (l.order) {
    if (!l.shuffled) { l.shuffled = shuffle([...l.order, ...(l.extra || [])].map((x, i) => [x, i])); if (l.shuffled.every(([, i], k) => i === k)) l.shuffled.reverse(); }
    const got = dlg.pick;
    d.innerHTML = `<div class="em-box">${portrait(w)}<div class="em-txt">${w && w.n ? `<b>${esc(w.n)}</b>` : ""}<p>${esc(l.t)}</p>
      <ol class="em-ord">${got.map((i) => `<li>${esc(l.order[i])}</li>`).join("")}</ol>
      <div class="em-ch em-ch-grid">${l.shuffled.filter(([, i]) => !got.includes(i)).map(([x, i]) => `<button data-action="emOrder" data-i="${i}">${esc(x)}</button>`).join("")}</div>
      ${dlg.miss ? `<p class="em-hint">${esc(l.hint || "Inténtalo otra vez.")}</p>` : ""}</div></div>`;
    return;
  }
  d.innerHTML = `${w && w.big ? `<img class="em-scene" src="${stickerSrc(w.st, "#ffba03")}" alt="">` : ""}
    <div class="em-box">${portrait(w)}<div class="em-txt">${w && w.n ? `<b>${esc(w.n)}</b>` : ""}<p>${esc(l.t)}</p>
    ${l.ch ? `<div class="em-ch">${l.ch.map((c, i) => `<button data-action="emChoose" data-i="${i}">${esc(c[0])}</button>`).join("")}</div>` : `<span class="em-more">Toca para seguir</span>`}</div></div>`;
}
function pickOrder(i) {
  const l = dlg && dlg.q[dlg.i]; if (!l || !l.order) return;
  const want = dlg.pick.length;
  if (i !== want) { dlg.pick = []; dlg.miss = true; paintDlg(); return; }
  dlg.pick.push(i); dlg.miss = false;
  if (dlg.pick.length === l.order.length) { paintDlg(); setTimeout(() => { const d = dlg.done; dlg = null; paintDlg(); save(); paintHud(); d && d(); }, 500); return; }
  paintDlg();
}

const hideCards = () => { const el = $("#emStart"); if (el) el.innerHTML = ""; };
function startScreen() {
  $("#emStart").innerHTML = `<div class="em-start"><div class="em-card">
    <img src="${stickerSrc("emaus", "#ffba03")}" alt="" class="em-hero">
    <h1>Emaús</h1><p class="em-k">El arte de encontrarnos · 6 capítulos</p>
    <p class="em-sub">Llegas a un pueblo donde no conoces a nadie. Sábado a sábado encuentras amigos, aprendes a acoger, a escuchar y a cuidar… y un Caminante te acompaña en cada encuentro.</p>
    ${S.invited ? `<p class="em-inv">Te invitó ${esc(S.invited)}: empiezas con un compañero de camino que te muestra hacia dónde ir.</p>` : ""}
    <label class="em-lbl">Tu nombre <small>(solo el nombre, queda en este teléfono)</small><input id="emName" maxlength="16" value="${esc(S.name)}" placeholder="Ej: Cami"></label>
    <div class="em-looks">${LOOKS.map((l, i) => `<button data-action="emLook" data-i="${i}" class="${S.look === i ? "on" : ""}" aria-label="Personaje ${i + 1}"><span class="em-face" style="--skin:${l.skin};--hair:${l.hair};--shirt:${l.shirt}"><i></i></span></button>`).join("")}</div>
    <button class="btn btn-primary" data-action="emGo">Comenzar el camino</button>
    <p class="em-help">Muévete con las flechas, el control de la pantalla o tocando donde quieres ir. Puedes entrar a la capilla, al salón, a la biblioteca… Para hablar o mirar algo, acércate y toca el botón amarillo.</p>
    <a class="em-back" href="#/juegos">Volver a los juegos</a></div></div>`;
}
function chaptersScreen() {
  const nextN = Math.min(6, (S.cd.length ? Math.max(...S.cd) : 0) + 1);
  $("#emStart").innerHTML = `<div class="em-start"><div class="em-card em-chaps">
    <h1>Emaús</h1><p class="em-k">El arte de encontrarnos</p>
    <ol class="em-list">${CHAPTERS.map((c) => {
      const done = S.cd.includes(c.n), open = done || c.n <= nextN;
      return `<li><button data-action="emChap" data-n="${c.n}" ${open ? "" : "disabled"} class="${done ? "done" : ""} ${c.n === nextN && !done ? "next" : ""}">
        <img src="${stickerSrc(c.st, done ? "#ffba03" : "#8ad2fa")}" alt=""><span><small>Capítulo ${c.n}${done ? " · completado" : open ? "" : " · bloqueado"}</small><b>${esc(c.title)}</b><em>${esc(c.mod)}</em></span></button></li>`;
    }).join("")}</ol>
    <button class="btn btn-gold btn-sm" data-action="emInvite">Invitar a alguien a jugar</button>
    <a class="em-back" href="#/juegos">Volver a los juegos</a></div></div>`;
}
function chapterCard(c) {
  const nxt = CHAPTERS[c.n];
  $("#emStart").innerHTML = `<div class="em-start"><div class="em-card">
    <img src="${stickerSrc(c.st, "#ffba03")}" alt="" class="em-hero">
    <p class="em-k">Capítulo ${c.n} completado · ${esc(c.badge)}</p>
    <h1 class="em-h2">${esc(c.title)}</h1>
    <p class="em-sub">${esc(c.end.idea)}</p>
    <p class="small">Palabra: ${esc(c.end.word)}. Basado en el ${esc(c.mod.split(" · ")[0].toLowerCase())} del curso «El Arte de Encontrarnos».</p>
    ${nxt ? `<button class="btn btn-primary" data-action="emChap" data-n="${nxt.n}">Capítulo ${nxt.n}: ${esc(nxt.title)}</button>` : ""}
    <button class="btn btn-soft btn-sm" data-action="emChapters">Ver los capítulos</button>
    <button class="btn btn-gold btn-sm" data-action="emInvite">Invitar a alguien a jugar</button></div></div>`;
}
function endScreen() {
  $("#emStart").innerHTML = `<div class="em-start em-end"><div class="em-card">
    <img src="${stickerSrc("eucaristia", "#ffba03")}" alt="" class="em-hero">
    <h1 class="em-h2">Lo reconocieron al partir el pan</h1>
    <p class="em-sub">Jesús camina contigo aunque no siempre lo reconozcas. Lo encuentras en la misa, en su Palabra y en una comunidad que no deja a nadie solo. Y desde ahí, te envía.</p>
    <p class="small">Inspirado en Lucas 24,13-35 y en el curso «El Arte de Encontrarnos».</p>
    <a class="btn btn-primary" href="#/oracion">Entrar a la Capilla Ágape</a>
    <button class="btn btn-gold" data-action="emInvite">Invitar a alguien a hacer el camino</button>
    <a class="btn btn-soft" href="familias/">Conocer la Pastoral Juvenil Ágape</a>
    <button class="btn btn-ghost btn-sm" data-action="emChapters">Ver los capítulos</button></div></div>`;
}
function toggleMenu() {
  const m = $("#emMenu"); if (!m) return;
  if (!m.hidden) { m.hidden = true; return; }
  m.hidden = false;
  m.innerHTML = `<div class="em-card"><h2>Emaús</h2>
    ${S.inCh ? `<p class="small">Capítulo ${CH().n}: ${esc(CH().title)}</p><ul class="em-ql">${CH().quests.map((q) => `<li class="${q.done() ? "on" : ""}">${esc(qt(q))} <small>(unidad ${esc(q.u)})</small></li>`).join("")}</ul>` : ""}
    <button class="btn btn-gold" data-action="emInvite">Invitar a alguien a jugar</button>
    <p class="xs muted">${S.ally ? "Ya tienes un compañero de camino: la flecha amarilla te muestra hacia dónde ir." : "Al invitar a alguien se suma un compañero de camino que muestra hacia dónde ir. Es un regalo: no hace falta para terminar."}</p>
    <button class="btn btn-soft" data-action="emMenu">Seguir jugando</button>
    <button class="btn btn-ghost btn-sm" data-action="emChapters">Capítulos</button>
    <a class="btn btn-ghost btn-sm" href="#/juegos">Salir</a></div>`;
}

function registerActions() {
  const A = ctx.actions;
  A.emChoose = (el) => choose(+el.dataset.i);
  A.emOrder = (el) => pickOrder(+el.dataset.i);
  A.emLook = (el) => { S.look = +el.dataset.i; save(); document.querySelectorAll(".em-looks button").forEach((b, i) => b.classList.toggle("on", i === S.look)); };
  A.emGo = () => { S.name = ($("#emName")?.value || "").replace(/[^\p{L} ]/gu, "").trim().slice(0, 16); S.started = true; save(); startChapter(1); };
  A.emChap = (el) => { $("#emMenu").hidden = true; startChapter(+el.dataset.n); };
  A.emChapters = () => { $("#emMenu").hidden = true; dlg = null; paintDlg(); S.inCh = false; save(); paintHud(); chaptersScreen(); };
  A.emMenu = () => toggleMenu();
  A.emInvite = async () => {
    const url = `${APP}emaus/${S.name ? "?de=" + encodeURIComponent(S.name) : ""}`;
    const text = "Te invito a jugar «Emaús», el juego de la Pastoral Juvenil Ágape: un camino para encontrarte con Jesús y con amigos.";
    let ok = false;
    try { if (navigator.share) { await navigator.share({ title: "Emaús · agAPPe", text, url }); ok = true; } } catch (e) { if (e && e.name === "AbortError") return; }
    if (!ok) { try { await navigator.clipboard.writeText(`${text}\n${url}`); ok = true; toastEm("Enlace copiado. Pégalo en WhatsApp para invitar."); } catch { toastEm(url); } }
    if (ok && !S.ally) { S.ally = true; save(); toastEm("Se suma un compañero de camino: la flecha amarilla te muestra hacia dónde ir."); }
    const m = $("#emMenu"); if (m) m.hidden = true;
  };
}
function toastEm(t) { const d = document.createElement("div"); d.className = "em-toast"; d.textContent = t; $("#emRoot")?.appendChild(d); setTimeout(() => d.remove(), 3200); }
