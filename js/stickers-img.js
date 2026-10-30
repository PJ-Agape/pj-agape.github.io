// Stickers de la app como imágenes livianas (<img> con SVG embebido) para los juegos:
// los personajes («pj:llama») y las escenas de las ilustraciones («jesus», «camino»…).
// Cada imagen se arma una sola vez y queda en caché.
import { illus, sceneLabel, illusConCara, stickerSrc as stickerFile } from "./ilustraciones.js";
import { PJ, pjSvg, pjImg } from "./personajes.js";
import { esc } from "./util.js";

const NAVY = "#0b2566";
export const POPS = ["#ffba03", "#ef591c", "#8ad2fa", "#1351a4"];
const cache = new Map();

export const isPj = (k) => k.startsWith("pj:");
// Fichas propias (redondas como los personajes)
const EXTRA = {
  heart: ["Corazón", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#fde0d2"/><path d="M32 50 C14 38 12 28 16 22 C20 16 28 16 32 23 C36 16 44 16 48 22 C52 28 50 38 32 50 Z" fill="#ef591c" stroke="${NAVY}" stroke-width="2.6" stroke-linejoin="round"/><path d="M22 25 q3 -4 7 -1" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="32" r="30" fill="none" stroke="${NAVY}" stroke-width="2.6"/></svg>`],
};
export const stickerName = (k) => (EXTRA[k] ? EXTRA[k][0] : isPj(k) ? PJ[k.slice(3)]?.[0] || k.slice(3) : sceneLabel(k));

function svgFor(k, pop) {
  if (EXTRA[k]) return EXTRA[k][1];
  if (isPj(k)) return pjSvg(k.slice(3)).replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" `);
  return illusConCara(k)
    .replace(/<svg class="[^"]*"/, `<svg xmlns="http://www.w3.org/2000/svg" color="${NAVY}"`)
    .replace(/var\(--il-pop,\s*[^)]+\)/g, pop)
    .replace(/var\(--il-bg,\s*[^)]+\)/g, "#fff6e5")
    .replace(/currentColor/g, NAVY);
}
// URL de la imagen del sticker (pop = color de acento de las escenas).
export function stickerSrc(k, pop = POPS[0]) {
  // Escenas con sticker propio de la PJ: la imagen tal cual (ya no el dibujo de papel).
  const file = isPj(k) ? pjImg(k.slice(3)) : !EXTRA[k] && stickerFile(k);
  if (file) return file;
  const id = k + "|" + pop;
  if (!cache.has(id)) cache.set(id, "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgFor(k, pop)));
  return cache.get(id);
}
export const stickerImg = (k, pop, cls = "") => `<img class="${cls}" src="${stickerSrc(k, pop)}" alt="${esc(stickerName(k))}" draggable="false">`;

// Celebración al terminar: un sticker, un título y los datos de la partida.
export function celebrate({ title, text = "", sticker = "bartimeo", pop = POPS[0], actions = "" }) {
  document.querySelector(".js-win")?.remove();
  const el = document.createElement("div");
  el.className = "js-win"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", title);
  el.innerHTML = `<div class="js-win-card"><span class="js-win-st">${stickerImg(sticker, pop)}</span>
    <h2>${esc(title)}</h2>${text ? `<p>${text}</p>` : ""}<div class="js-win-acts">${actions}</div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-close]")) el.remove(); });
  return el;
}
export const closeWin = () => document.querySelector(".js-win")?.remove();

// Récords guardados en este teléfono.
const KEY = "agape_solo_records";
export function record(game, level, value, lowerIsBetter = true) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { all = {}; }
  const id = game + ":" + level, prev = all[id];
  const better = prev == null || (lowerIsBetter ? value < prev : value > prev);
  if (better) { all[id] = value; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* sin almacenamiento */ } }
  return { best: better ? value : prev, isNew: better && prev != null, first: prev == null };
}
export function getRecord(game, level) {
  try { return (JSON.parse(localStorage.getItem(KEY) || "{}") || {})[game + ":" + level] ?? null; } catch { return null; }
}
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
