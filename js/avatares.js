// Avatares ilustrados de Ágape (sin fotos). Tres tipos, todos guardados como una clave corta:
//  · Monito armado por la persona: «b0s1h2c0f0x3» (+ «r2» si elige ropa) → fondo, piel, peinado,
//    color de pelo, cara, detalle y ropa.
//  · Personaje juvenil: «j:llama», «j:astronauta»… (js/personajes.js)
//  · Sticker de la comunidad: «k:jesus», «k:carloacutis»… (las ilustraciones de los stickers)

import { esc, initials } from "./util.js";
import { illus, illusConCara } from "./ilustraciones.js";
import { PJ, PJ_KEYS, pjSvg } from "./personajes.js";

const NAVY = "#0b2566";
// Fondos: 6 lisos + 8 con degradado o diseño
export const BG = ["#8ad2fa", "#ffba03", "#ef591c", "#1351a4", "#fde0d2", "#9be3b0",
  "#ef591c", "#1351a4", "#f7c6d9", "#c9b8f5", "#0b2566", "#fff6e5", "#ffba03", "#9be3b0"];
const BG2 = { 6: "#ffba03", 7: "#8ad2fa", 13: "#e2f7e8", 12: "#ffd36b", 9: "#efe8ff", 8: "#fdebf2" };
const SHIRT = ["#1351a4", "#0b2566", "#fff6e5", "#ffba03", "#1351a4", "#ef591c",
  "#0b2566", "#ffba03", "#1351a4", "#ef591c", "#ffba03", "#1351a4", "#0b2566", "#ef591c"];
export const SKIN = ["#f9dcc4", "#eebf95", "#c98e63", "#8d5a3b", "#ffe9da", "#5e3a24"];
export const HAIRC = ["#2b1d14", "#6b4226", "#c58c3f", "#e6e1d6", "#0b2566", "#f28bb5", "#2ba59a", "#8e6fd8"];
export const OPTS = {
  b: { label: "Fondo", n: BG.length, names: ["Celeste", "Amarillo", "Naranjo", "Azul", "Durazno", "Menta", "Atardecer", "Océano", "Rosa con puntos", "Lila con estrellas", "Noche estrellada", "Confeti", "Rayos de sol", "Hojitas"] },
  s: { label: "Piel", n: SKIN.length },
  h: { label: "Peinado", n: 16, names: ["Rapado", "Corto", "Largo", "Rulos", "Moño", "Trenzas", "Jockey", "Parado", "Afro", "Cola de caballo", "Chasquilla", "Gorro de lana", "Ondas largas", "Capucha", "Dos moñitos", "Tupé"] },
  c: { label: "Color de pelo", n: HAIRC.length },
  f: { label: "Cara", n: 8, names: ["Sonrisa", "Feliz", "Guiño", "Lengüita", "¡Wow!", "Carcajada", "Ojos brillantes", "Relajado"] },
  x: { label: "Detalle", n: 12, names: ["Nada", "Lentes", "Audífonos", "Pañoleta", "Cruz", "Pecas", "Corona de flores", "Lentes de sol", "Curita", "Brillitos", "Rosario", "Lentes de color"] },
  r: { label: "Ropa", n: 6, names: ["Polera", "Rayas", "Polerón", "Camiseta", "Jardinera", "Camisa"] },
};
const ORDER = ["b", "s", "h", "c", "f", "x", "r"];

// Stickers de la comunidad que sirven de avatar (encuadre opcional: x, y, lado dentro de 240×180)
export const STK = {
  jesus: "Jesús", emaus: "Emaús", buenpastor: "Buen Pastor", virgen: "Virgen María", sanmiguel: "San Miguel", carloacutis: "Carlo Acutis",
  sagradocorazon: "Sagrado Corazón", jose: "San José", teresaandes: "Teresa de los Andes", albertohurtado: "Alberto Hurtado", lauravicuna: "Laura Vicuña", juanpablo: "Juan Pablo II",
  corazon: "¡Te quiero!", oracion: "Rezo por ti", amigos: "¡Amigos!", juego: "¡Vamos!", celular: "Ya llego", levantate: "¡Arriba!",
  acogida: "¡Bienvenido!", escuchar: "Te escucho", descanso: "Modo siesta", biblia: "Palabra del día", espiritu: "¡Ven, Espíritu!", eucaristia: "¡A misa!",
  servir: "¡Cuenta conmigo!", pregunta: "¿Y ahora qué?", duda: "Mmm… no sé", bartimeo: "¡Lo logré!", futuro: "¡Buenos días!", camino: "Voy en camino",
  flores: "¡Gracias!", tesoro: "¡Eres un tesoro!", luz: "¡Brilla!", equipo: "¡Equipazo!",
};
export const STK_KEYS = Object.keys(STK);
const STK_CROP = {
  jesus: [62, 58, 116], emaus: [52, 52, 136], buenpastor: [42, 58, 116], virgen: [62, 58, 116], sanmiguel: [52, 40, 136], carloacutis: [44, 58, 120],
  sagradocorazon: [62, 58, 116], jose: [52, 58, 116], teresaandes: [62, 58, 116], albertohurtado: [26, 56, 120], lauravicuna: [52, 58, 116], juanpablo: [52, 52, 120],
  corazon: [62, 58, 116], oracion: [60, 60, 120], amigos: [56, 46, 128], juego: [36, 36, 168], celular: [56, 50, 144], levantate: [36, 50, 144],
  acogida: [38, 48, 152], escuchar: [54, 52, 132], descanso: [62, 50, 128], biblia: [44, 52, 128], espiritu: [36, 26, 168], eucaristia: [24, 44, 144],
  servir: [40, 52, 152], pregunta: [60, 40, 136], duda: [34, 38, 164], bartimeo: [34, 44, 164], futuro: [30, 58, 122], camino: [38, 46, 124],
  flores: [48, 52, 132], tesoro: [44, 52, 132], luz: [46, 52, 126], equipo: [34, 40, 172],
};
const STK_BG = [["#8ad2fa", "#e1f3fd"], ["#ffd36b", "#fff3d0"], ["#fbc3ad", "#fde0d2"], ["#9be3b0", "#e2f7e8"], ["#c9b8f5", "#efe8ff"], ["#f7c6d9", "#fdebf2"]];
export { PJ, PJ_KEYS };

export function parse(key) {
  const m = /^b(\d{1,2})s(\d)h(\d{1,2})c(\d)f(\d)x(\d{1,2})(?:r(\d))?$/.exec(String(key || ""));
  if (!m) return null;
  const v = { b: +m[1], s: +m[2], h: +m[3], c: +m[4], f: +m[5], x: +m[6], r: +(m[7] || 0) };
  return ORDER.every((k) => v[k] < OPTS[k].n) ? v : null;
}
export const keyOf = (v) => ORDER.filter((k) => k !== "r" || v.r).map((k) => k + v[k]).join("");
export const randomKey = () => keyOf(Object.fromEntries(ORDER.map((k) => [k, Math.floor(Math.random() * OPTS[k].n)])));
// Solo claves propias de PJ y STK (no «constructor», «__proto__»…): una clave así rompía la pantalla de quien la viera.
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const kind = (key) => { key = String(key || "").slice(0, 40); return key.startsWith("j:") ? (own(PJ, key.slice(2)) ? "j" : "") : key.startsWith("k:") ? (own(STK, key.slice(2)) ? "k" : "") : parse(key) ? "m" : ""; };
export const isValid = (key) => !!kind(key);

const S = `stroke="${NAVY}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const s1 = `stroke="${NAVY}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
const star = (x, y, r, c) => `<path d="M${x} ${y - r} Q${x + r * .2} ${y - r * .2} ${x + r} ${y} Q${x + r * .2} ${y + r * .2} ${x} ${y + r} Q${x - r * .2} ${y + r * .2} ${x - r} ${y} Q${x - r * .2} ${y - r * .2} ${x} ${y - r} Z" fill="${c}"/>`;
let uid = 0;

function background(v, id) {
  const b = v.b;
  if (BG2[b] && b !== 8 && b !== 9) return `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="${b === 12 ? 0 : 1}" y2="1"><stop offset="0" stop-color="${BG[b]}"/><stop offset="1" stop-color="${BG2[b]}"/></linearGradient></defs>
    <circle cx="32" cy="32" r="30" fill="url(#${id}g)"/>` + (b === 12 ? Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M32 32 L${(32 + 34 * Math.cos(a - .13)).toFixed(1)} ${(32 + 34 * Math.sin(a - .13)).toFixed(1)} L${(32 + 34 * Math.cos(a + .13)).toFixed(1)} ${(32 + 34 * Math.sin(a + .13)).toFixed(1)} Z" fill="#fff" opacity=".28"/>`; }).join("")
    : b === 13 ? `<path d="M8 22 q6 -6 10 0 q-6 4 -10 0 Z M48 12 q6 -4 9 2 q-6 3 -9 -2 Z M50 40 q6 -2 8 4 q-6 2 -8 -4 Z" fill="#4fbf74" opacity=".55"/>`
    : b === 6 ? star(13, 18, 3, "#fff6e5") + star(52, 14, 2.4, "#fff6e5") : b === 7 ? `<path d="M4 20 q7 -4 14 0 t14 0 M40 12 q6 -3 12 0 t10 0" fill="none" stroke="#fff" stroke-width="1.8" opacity=".6"/>` : "");
  let out = `<circle cx="32" cy="32" r="30" fill="${BG[b]}"/>`;
  if (b === 8) out += [[12, 16], [22, 9], [48, 12], [55, 24], [9, 30], [52, 36], [14, 44], [6, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff"/>`).join("");
  if (b === 9) out += star(12, 16, 3.5, "#ffba03") + star(52, 13, 3, "#fff") + star(55, 34, 2.5, "#ffba03") + star(9, 36, 2.2, "#fff");
  if (b === 10) out += `<path d="M50 9 a7 7 0 1 0 6 10 a5.5 5.5 0 1 1 -6 -10 Z" fill="#ffba03"/>` + star(12, 16, 2.6, "#fff") + star(22, 7, 1.8, "#ffba03") + star(8, 34, 1.6, "#fff") + star(56, 34, 2, "#fff") + [[16, 26], [44, 8], [53, 46], [10, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#fff"/>`).join("");
  if (b === 11) out += [["#ef591c", 10, 18, 20], ["#1351a4", 20, 8, -30], ["#ffba03", 46, 9, 40], ["#2ba59a", 55, 22, -10], ["#f28bb5", 8, 34, 60], ["#ffba03", 56, 38, 15], ["#1351a4", 12, 48, -45], ["#ef591c", 52, 50, 30]].map(([c, x, y, a]) => `<rect x="${x - 2.4}" y="${y - 1}" width="4.8" height="2.2" rx="1" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join("");
  return out;
}

function hairBack(v, hc, shirt) {
  switch (v.h) {
    case 2: return `<path d="M14 30 C12 12 52 12 50 30 L51 49 C46 51 42 50 40 47 L40 34 L24 34 L24 47 C22 50 18 51 13 49 Z" fill="${hc}" ${S}/>`;
    case 5: return `<path d="M15 33 q-3 7 0 14 q3 4 6 0 q2 -7 -1 -14 Z M49 33 q3 7 0 14 q-3 4 -6 0 q-2 -7 1 -14 Z" fill="${hc}" ${S}/>`;
    case 8: return `<circle cx="32" cy="25" r="20" fill="${hc}" ${S}/>`;
    case 9: return `<path d="M46 18 C56 18 58 30 55 40 C53 46 50 47 49 44 C52 36 51 27 45 24 Z" fill="${hc}" ${S}/><circle cx="47.5" cy="20" r="3.2" fill="#ef591c" ${s1}/>`;
    case 10: return `<path d="M15 28 C13 12 51 12 49 28 L50 42 C46 44 42 43 42 40 L22 40 C22 43 18 44 14 42 Z" fill="${hc}" ${S}/>`;
    case 12: return `<path d="M14 28 C12 10 52 10 50 28 C53 33 49 37 52 42 C54 47 50 52 46 50 L42 36 L22 36 L18 50 C14 52 10 47 12 42 C15 37 11 33 14 28 Z" fill="${hc}" ${S}/>`;
    case 13: return `<path d="M12 40 C9 18 20 8 32 8 C44 8 55 18 52 40 C50 46 14 46 12 40 Z" fill="${shirt}" ${S}/>`;
    case 14: return `<circle cx="18" cy="13" r="6.5" fill="${hc}" ${S}/><circle cx="46" cy="13" r="6.5" fill="${hc}" ${S}/>`;
    default: return "";
  }
}
function hairFront(v, hc) {
  switch (v.h) {
    case 0: return `<path d="M17.5 25 C18 15 46 15 46.5 25 C42 20 22 20 17.5 25 Z" fill="${hc}" ${S}/>`;
    case 1: case 2: case 5: case 9: case 12: case 14: return `<path d="M16 29 C13 13 51 13 48 29 C46 22 41 19 35 21 C30 22 26 20 22 21 C19 23 17 26 16 29 Z" fill="${hc}" ${S}/>`;
    case 3: return [[19, 22], [23, 16], [30, 13], [37, 13], [43, 16], [46, 22], [17, 28], [47, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2" fill="${hc}" ${S}/>`).join("");
    case 4: return `<circle cx="32" cy="10" r="6" fill="${hc}" ${S}/><path d="M16.5 27 C15 14 49 14 47.5 27 C44 20 20 20 16.5 27 Z" fill="${hc}" ${S}/>`;
    case 6: return `<path d="M16 25 C16 10 48 10 48 25 Z" fill="#ef591c" ${S}/><path d="M46 23 L58 25 L47 27.5 Z" fill="#ef591c" ${S}/><circle cx="32" cy="11" r="2" fill="${NAVY}"/>`;
    case 7: return `<path d="M17 25 L19 12 L24 19 L28 8 L33 18 L38 9 L41 19 L46 12 L47 25 C42 21 22 21 17 25 Z" fill="${hc}" ${S}/>`;
    case 8: return `<path d="M17 25 C19 18 24 17 27 19 C29 16 35 16 37 19 C40 17 45 18 47 25 C42 22 22 22 17 25 Z" fill="${hc}" ${S}/>`;
    case 10: return `<path d="M16.5 30 C14 12 50 12 47.5 30 L46 30 C45.5 26 44 24 42 24 L22 24 C20 24 18.5 26 18 30 Z" fill="${hc}" ${S}/>`;
    case 11: return `<path d="M15 27 C14 8 50 8 49 27 Z" fill="#ef591c" ${S}/><path d="M22 12 v13 M32 9.5 v15 M42 12 v13" stroke="#ffba03" stroke-width="2.4"/><rect x="13" y="23.5" width="38" height="6.5" rx="3.2" fill="#fff6e5" ${S}/><circle cx="32" cy="7" r="4.2" fill="#fff6e5" ${S}/>`;
    case 13: return `<path d="M18 25 C19 18 45 18 46 25 C40 22 24 22 18 25 Z" fill="${hc}" ${S}/>`;
    case 15: return `<path d="M17 27 C15 16 22 12 30 12 C36 6 50 8 49 16 C46 14 42 15 41 18 C44 20 47 23 47 27 C42 22 22 22 17 27 Z" fill="${hc}" ${S}/>`;
    default: return "";
  }
}
function face(v) {
  const sparkEye = (x) => `<circle cx="${x}" cy="29" r="2.7" fill="${NAVY}"/><circle cx="${x + 1}" cy="28" r="1" fill="#fff"/><circle cx="${x - .9}" cy="30.1" r=".5" fill="#fff"/>`;
  const dot = (x) => `<circle cx="${x}" cy="29" r="1.7" fill="${NAVY}"/>`;
  const closed = (x) => `<path d="M${x - 2} 29 q2 -2 4 0" fill="none" ${S}/>`;
  let eyes, mouth;
  switch (v.f) {
    case 1: eyes = closed(27) + closed(37); mouth = `<path d="M26.5 34 Q32 40 37.5 34 Z" fill="#fff6e5" ${S}/>`; break;
    case 2: eyes = dot(27) + closed(37); mouth = `<path d="M27 34 Q32 38.5 37 34" fill="none" ${S}/>`; break;
    case 3: eyes = dot(27) + dot(37); mouth = `<path d="M27 34 Q32 38.5 37 34" fill="none" ${S}/><path d="M31 36.2 q0 4 2.2 3.6 q1.8 -.4 1.2 -3.9" fill="#f28bb5" ${s1}/>`; break;
    case 4: eyes = sparkEye(27) + sparkEye(37); mouth = `<ellipse cx="32" cy="36" rx="2.2" ry="2.8" fill="${NAVY}"/>`; break;
    case 5: eyes = `<path d="M25 30 l2 -2 l2 2 M35 30 l2 -2 l2 2" fill="none" ${S}/>`; mouth = `<path d="M25.5 33.5 Q32 42.5 38.5 33.5 Z" fill="#fff6e5" ${S}/><path d="M28.5 37.6 Q32 40.4 35.5 37.6 Q32 36.5 28.5 37.6 Z" fill="#ef591c"/>`; break;
    case 6: eyes = sparkEye(27) + sparkEye(37); mouth = `<path d="M27.5 34 Q32 38 36.5 34" fill="none" ${S}/>`; break;
    case 7: eyes = `<path d="M25 29.5 h4 M35 29.5 h4" ${S}/>`; mouth = `<path d="M28 35 Q32 37 37 34" fill="none" ${S}/>`; break;
    default: eyes = dot(27) + dot(37); mouth = `<path d="M27 34 Q32 38.5 37 34" fill="none" ${S}/>`;
  }
  return eyes + mouth + `<circle cx="23.5" cy="33.5" r="2" fill="#ef591c" opacity=".25"/><circle cx="40.5" cy="33.5" r="2" fill="#ef591c" opacity=".25"/>`;
}
function extra(v) {
  switch (v.x) {
    case 1: return `<circle cx="27" cy="29" r="4.3" fill="none" ${S}/><circle cx="37" cy="29" r="4.3" fill="none" ${S}/><path d="M31.3 29 h1.4" ${S}/>`;
    case 2: return `<path d="M14.5 31 C13 9 51 9 49.5 31" fill="none" stroke="${NAVY}" stroke-width="3"/><rect x="11" y="27" width="6" height="10" rx="3" fill="#ef591c" ${S}/><rect x="47" y="27" width="6" height="10" rx="3" fill="#ef591c" ${S}/>`;
    case 3: return `<path d="M22 45 L42 45 L32 55 Z" fill="${v.b === 1 || v.b === 12 ? "#ef591c" : "#ffba03"}" ${S}/><circle cx="32" cy="46.5" r="2.2" fill="#fff6e5" ${S}/>`;
    case 4: return `<path d="M32 50 v8 M29 53 h6" stroke="#ffba03" stroke-width="2.6" stroke-linecap="round"/>`;
    case 5: return [[22, 31.5], [24.5, 33.5], [21.5, 34.5], [42, 31.5], [39.5, 33.5], [42.5, 34.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".75" fill="#8d5a3b"/>`).join("");
    case 6: return [[19, 19, "#f28bb5"], [25, 15, "#ffba03"], [32, 13.5, "#ef591c"], [39, 15, "#fff6e5"], [45, 19, "#f28bb5"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${c}" ${s1}/><circle cx="${x}" cy="${y}" r="1.2" fill="${c === "#ffba03" ? "#ef591c" : "#ffba03"}"/>`).join("") + `<path d="M22 17.5 l1 -2.5 M28.5 14 l1 -2.5 M35.5 14 l1.5 -2 M42 17 l1.5 -2" stroke="#2fb35a" stroke-width="1.8" stroke-linecap="round"/>`;
    case 7: return `<path d="M21 26 h11.5 v3 c0 4 -2 6 -5.8 6 c-3.8 0 -5.7 -2 -5.7 -6 Z M31.5 26 h11.5 v3 c0 4 -2 6 -5.7 6 c-3.8 0 -5.8 -2 -5.8 -6 Z" fill="${NAVY}" ${s1}/><path d="M24 28 l3 0" stroke="#8ad2fa" stroke-width="1.4" stroke-linecap="round"/><path d="M35 28 l3 0" stroke="#8ad2fa" stroke-width="1.4" stroke-linecap="round"/>`;
    case 8: return `<g transform="rotate(-25 41 35)"><rect x="37" y="33" width="9" height="4" rx="2" fill="#f7c6d9" ${s1}/><path d="M40.5 34.4 v1.2 M42.5 34.4 v1.2" stroke="${NAVY}" stroke-width=".9"/></g>`;
    case 9: return star(12, 20, 3.6, "#ffba03") + star(53, 16, 2.8, "#fff") + star(51, 40, 2.2, "#ffba03") + star(10, 38, 2, "#fff");
    case 10: return Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.15 + i * 0.0875); return `<circle cx="${(32 + 13 * Math.cos(a)).toFixed(1)}" cy="${(42 + 9 * Math.sin(a)).toFixed(1)}" r="1.3" fill="#fff6e5" stroke="${NAVY}" stroke-width=".9"/>`; }).join("") + `<path d="M32 51 v8 M29 54 h6" stroke="#ffba03" stroke-width="2.4" stroke-linecap="round"/>`;
    case 11: return `<rect x="21.5" y="24.5" width="10" height="9" rx="3.5" fill="#fff" fill-opacity=".25" stroke="#ef591c" stroke-width="2.4"/><rect x="32.5" y="24.5" width="10" height="9" rx="3.5" fill="#fff" fill-opacity=".25" stroke="#ef591c" stroke-width="2.4"/><path d="M31.5 28 h1" stroke="#ef591c" stroke-width="2.4"/>`;
    default: return "";
  }
}
// Ropa (encima de la polera base)
function clothes(v, shirt, id) {
  const light = shirt === "#fff6e5" || shirt === "#ffba03";
  const acc = light ? NAVY : "#fff6e5";
  switch (v.r) {
    case 1: return `<defs><clipPath id="${id}r"><path d="M11 66 C11 51 20 45 32 45 C44 45 53 51 53 66 Z"/></clipPath></defs><g clip-path="url(#${id}r)"><path d="M8 51 H56 M8 56.5 H56 M8 62 H56" stroke="${light ? "#ef591c" : "#fff6e5"}" stroke-width="2.6"/></g><path d="M11 66 C11 51 20 45 32 45 C44 45 53 51 53 66" fill="none" ${S}/>`;
    case 2: return `<path d="M19 50 C20 44 26 42 32 46 C38 42 44 44 45 50 C40 48 36 50 32 50 C28 50 24 48 19 50 Z" fill="${shirt}" ${S}/><path d="M29 50 v7 M35 50 v7" stroke="${acc}" stroke-width="1.6" stroke-linecap="round"/><circle cx="29" cy="58" r="1.2" fill="${acc}"/><circle cx="35" cy="58" r="1.2" fill="${acc}"/><path d="M24 64 h16" stroke="${NAVY}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>`;
    case 3: return `<path d="M27 45.5 L32 51 L37 45.5" fill="none" stroke="${acc}" stroke-width="2.4" stroke-linejoin="round"/><text x="32" y="62" text-anchor="middle" font-family="Bricolage, sans-serif" font-weight="800" font-size="9" fill="${acc}">10</text><path d="M15 54 v10 M49 54 v10" stroke="${light ? "#ef591c" : "#ffba03"}" stroke-width="2.4"/>`;
    case 4: return `<path d="M22 66 V54 H42 V66 Z" fill="#4f8fe0" ${S}/><path d="M23 54 L20 46 M41 54 L44 46" stroke="#4f8fe0" stroke-width="3.4" stroke-linecap="round"/><rect x="28" y="57" width="8" height="5" rx="1.5" fill="none" ${s1}/><circle cx="23.5" cy="54.5" r="1.2" fill="#ffba03"/><circle cx="40.5" cy="54.5" r="1.2" fill="#ffba03"/>`;
    case 5: return `<path d="M24 45 L32 49 L28 53 Z M40 45 L32 49 L36 53 Z" fill="#fff" ${s1}/><circle cx="32" cy="55" r="1.1" fill="${acc}"/><circle cx="32" cy="60" r="1.1" fill="${acc}"/>`;
    default: return "";
  }
}

function monito(v) {
  const id = "av" + (++uid), hc = HAIRC[v.c], shirt = SHIRT[v.b];
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><clipPath id="${id}"><circle cx="32" cy="32" r="30"/></clipPath></defs>
    <g clip-path="url(#${id})">
      ${background(v, id)}
      ${hairBack(v, hc, shirt)}
      <path d="M11 66 C11 51 20 45 32 45 C44 45 53 51 53 66 Z" fill="${shirt}" ${S}/>
      ${clothes(v, shirt, id)}
      <path d="M28 41 h8 v6 q-4 3 -8 0 Z" fill="${SKIN[v.s]}" ${S}/>
      <circle cx="32" cy="29" r="15" fill="${SKIN[v.s]}" ${S}/>
      ${hairFront(v, hc)}${face(v)}${extra(v)}
    </g>
    <circle cx="32" cy="32" r="30" fill="none" stroke="${NAVY}" stroke-width="2.6"/></svg>`;
}
function sticker(k) {
  const id = "av" + (++uid), [c1, c2] = STK_BG[STK_KEYS.indexOf(k) % STK_BG.length];
  const [x, y, w] = STK_CROP[k] || [38, 4, 164];
  const raw = illusConCara(k), inner = raw.slice(raw.indexOf(">") + 1, raw.lastIndexOf("</svg>")), sc = 56 / w;
  const art = `<g transform="translate(4 4) scale(${sc.toFixed(4)}) translate(${-x} ${-y})" style="color:${NAVY};--il-bg:#fff;--il-pop:#ffba03" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><clipPath id="${id}"><circle cx="32" cy="32" r="30"/></clipPath></defs>
    <circle cx="32" cy="32" r="30" fill="url(#${id}g)"/><g clip-path="url(#${id})">${art}</g>
    <circle cx="32" cy="32" r="30" fill="none" stroke="${NAVY}" stroke-width="2.6"/></svg>`;
}

export function svg(key) {
  switch (kind(key)) {
    case "m": return monito(parse(key));
    case "j": return pjSvg(key.slice(2));
    case "k": return sticker(key.slice(2));
    default: return "";
  }
}
export const label = (key) => { const k = kind(key); return k === "j" ? PJ[key.slice(2)][0] : k === "k" ? STK[key.slice(2)] : k === "m" ? "Mi monito" : ""; };

// Avatar listo para usar: el dibujo si la persona eligió uno, si no sus iniciales.
export function avatar(key, name, cls = "") {
  const s = svg(key);
  return s ? `<span class="avatar av-ill ${cls}" title="${esc(name || "")}">${s}</span>`
    : `<span class="avatar ${cls}" title="${esc(name || "")}">${esc(initials(name || "?"))}</span>`;
}
