// Motor de diseño de Ágape en canvas: arma piezas de difusión (historias, posts, afiches,
// portadas, fondos, marcos de foto, invitaciones y stickers) con la identidad zine del grupo.
// Lo usa el Estudio de difusión de la app y el exportador del paquete de archivos.

import { illus, illusConCara, stickerSrc } from "./ilustraciones.js";
import { pjSvg } from "./personajes.js";
import qrcode from "./qr.js";

export const C = { navy: "#0b2566", blue: "#1351a4", sun: "#ffba03", coral: "#ef591c", sky: "#8ad2fa", cream: "#fff6e5", white: "#ffffff", rose: "#fde0d2", butter: "#fff1c7", ice: "#e1f3fd" };
const BASE = new URL("../", import.meta.url).href;

// ---------------------------------------------------------------------------
// Recursos
// ---------------------------------------------------------------------------
let LOGO = null;
const IMG = new Map();
const loadImg = (src) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
export async function ready() {
  await Promise.all(["800 80px Bricolage", "700 80px Caveat", "700 40px Jakarta", "500 40px Jakarta"].map((f) => document.fonts.load(f).catch(() => {})));
  if (!LOGO) LOGO = await loadImg(BASE + "icons/logo-320.webp").catch(() => null);
}
function svgFor(key, color, bg, pop, outline, bare) {
  // Personajes juveniles (los mismos de los avatares): un sello redondo dentro del cuadro 240×180
  if (String(key).startsWith("pj:")) {
    const head = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 240 180">';
    if (outline) return head + '<circle cx="120" cy="90" r="85" fill="#ffffff"/></svg>';
    const inner = pjSvg(key.slice(3)); if (!inner) return "";
    return head + inner.replace("<svg ", '<svg x="34" y="4" width="172" height="172" ') + "</svg>";
  }
  let s = illusConCara(key);
  if (!s) return "";
  if (bare) { s = s.replace(/<path d="M\d+ 168 q30 -3 60 0[^"]*"[^>]*\/>/g, ""); if (!outline) s = s.replace(/stroke-width="[0-9.]+"/, 'stroke-width="3.6"'); }
  s = s.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" ')
    .replace(/var\(--il-bg,\s*#fff\)/g, bg).replace(/var\(--il-pop,\s*#ffba03\)/g, pop).replace(/currentColor/g, color);
  if (outline) s = s.replace(/stroke-width="[0-9.]+"/, `stroke-width="${outline}"`).replace(/stroke="[^"]*"/, `stroke="${outline ? "#ffffff" : color}"`);
  return s;
}
// Carga previa de ilustraciones (clave|color|fondo|acento|contorno) para dibujar sin esperas.
export async function preload(list) {
  await Promise.all(list.filter(([k]) => typeof k === "string").map(async ([k, color = C.navy, bg = C.white, pop = C.sun, outline = 0, bare = 0]) => {
    const id = [k, color, bg, pop, outline, bare].join("|");
    if (IMG.has(id)) return;
    // Escenas con sticker propio: se usa la imagen (ya trae su borde blanco), centrada en el cuadro 4:3.
    const src = stickerSrc(k);
    if (src) {
      if (outline) return;
      const im = await loadImg(BASE + src).catch(() => null); if (!im) return;
      const cv = document.createElement("canvas"); cv.width = 960; cv.height = 720;
      const sc = Math.min(960 / im.width, 720 / im.height), w = im.width * sc, h = im.height * sc;
      cv.getContext("2d").drawImage(im, (960 - w) / 2, (720 - h) / 2, w, h);
      IMG.set(id, cv); return;
    }
    const svg = svgFor(k, color, bg, pop, outline, bare);
    if (!svg) return;
    IMG.set(id, await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)).catch(() => null));
  }));
}

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export function card(ctx, x, y, w, h, { r = 40, fill = C.white, border = C.navy, bw = 6, shadow = 14, shadowColor = C.navy, rot = 0 } = {}) {
  ctx.save();
  if (rot) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate((rot * Math.PI) / 180); ctx.translate(-x - w / 2, -y - h / 2); }
  if (shadow) { rr(ctx, x + shadow, y + shadow, w, h, r); ctx.fillStyle = shadowColor; ctx.fill(); }
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (bw) { ctx.lineWidth = bw; ctx.strokeStyle = border; ctx.stroke(); }
  ctx.restore();
}
export const blob = (ctx, x, y, r, color) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
// Foto propia en lugar del dibujo: llena el recuadro (recorte centrado) con esquinas redondeadas.
function photoBox(ctx, im, x, y, w, h, rot) {
  const pw = im.naturalWidth || im.width, ph = im.naturalHeight || im.height, sc = Math.max(w / pw, h / ph);
  ctx.save();
  if (rot) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate((rot * Math.PI) / 180); ctx.translate(-x - w / 2, -y - h / 2); }
  rr(ctx, x, y, w, h, w * 0.06); ctx.clip();
  ctx.drawImage(im, x + (w - pw * sc) / 2, y + (h - ph * sc) / 2, pw * sc, ph * sc);
  ctx.restore();
}
export const isPhoto = (k) => !!k && typeof k === "object";
export function ill(ctx, key, x, y, w, { color = C.navy, bg = C.white, pop = C.sun, outline = 0, rot = 0, bare = 0 } = {}) {
  if (isPhoto(key)) return photoBox(ctx, key, x, y, w, (w * 180) / 240, rot);
  const im = IMG.get([key, color, bg, pop, outline, bare].join("|"));
  if (!im) return;
  const h = (w * 180) / 240;
  ctx.save();
  if (rot) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate((rot * Math.PI) / 180); ctx.translate(-x - w / 2, -y - h / 2); }
  ctx.drawImage(im, x, y, w, h); ctx.restore();
}
export function illCard(ctx, key, x, y, w, { fill = C.white, bg = C.cream, pop = C.sun, rot = 0, shadow = 14, r = 40, color = C.navy } = {}) {
  const h = (w * 180) / 240 + w * 0.06;
  ctx.save();
  if (rot) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate((rot * Math.PI) / 180); ctx.translate(-x - w / 2, -y - h / 2); }
  card(ctx, x, y, w, h, { fill: bg, r, shadow, bw: Math.max(4, w * 0.012) });
  ill(ctx, key, x + w * 0.03, y + w * 0.03, w * 0.94, { bg, pop, color });
  ctx.restore();
  return h;
}
export function logo(ctx, x, y, s) { if (LOGO) ctx.drawImage(LOGO, x, y, s, s); }
export function qr(ctx, text, x, y, s, { dark = C.navy, light = C.white, pad = 0.08 } = {}) {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), p = s * pad, cell = (s - p * 2) / n;
  card(ctx, x, y, s, s, { r: s * 0.08, fill: light, bw: Math.max(3, s * 0.015), shadow: s * 0.04 });
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x + p + c * cell, y + p + r * cell, Math.ceil(cell), Math.ceil(cell));
}
const font = (ctx, f) => { ctx.font = f; try { ctx.fontStretch = /Bricolage/.test(f) ? "condensed" : "normal"; } catch {} };
// Texto con marcador: «Amor que *transforma.*» — lo que va entre asteriscos lleva el subrayado grueso.
export function headline(ctx, text, x, y, maxW, size, { color = C.navy, mark = C.sun, lh = 0.92, align = "left", family = "Bricolage", weight = 800, maxLines = 6, dry = false } = {}) {
  font(ctx, `${weight} ${size}px ${family}`);
  const words = []; let on = false;
  String(text).split(/(\*)/).forEach((p) => { if (p === "*") { on = !on; return; } p.split(/\s+/).filter(Boolean).forEach((w) => words.push({ w, m: on })); });
  const lines = []; let cur = [], cw = 0; const sp = ctx.measureText(" ").width;
  for (const t of words) { const ww = ctx.measureText(t.w).width; if (cur.length && cw + sp + ww > maxW) { lines.push(cur); cur = []; cw = 0; } cur.push({ ...t, ww }); cw += (cur.length > 1 ? sp : 0) + ww; }
  if (cur.length) lines.push(cur);
  const L = lines.slice(0, maxLines);
  if (dry) return L.length * size * lh;
  ctx.textBaseline = "alphabetic";
  L.forEach((ln, i) => {
    const lw = ln.reduce((a, t, k) => a + t.ww + (k ? sp : 0), 0);
    let cx = align === "center" ? x - lw / 2 : align === "right" ? x - lw : x;
    const base = y + size * 0.82 + i * size * lh;
    // marcador
    let k = 0;
    while (k < ln.length) {
      if (!ln[k].m) { cx += ln[k].ww + sp; k++; continue; }
      let mw = 0, s0 = cx; while (k < ln.length && ln[k].m) { mw += ln[k].ww + (mw ? sp : 0); cx += ln[k].ww + sp; k++; }
      ctx.fillStyle = mark; ctx.fillRect(s0 - size * 0.04, base - size * 0.36, mw + size * 0.08, size * 0.34);
    }
    cx = align === "center" ? x - lw / 2 : align === "right" ? x - lw : x;
    ctx.fillStyle = color;
    ln.forEach((t) => { ctx.fillText(t.w, cx, base); cx += t.ww + sp; });
  });
  return L.length * size * lh;
}
export function hand(ctx, text, x, y, size, { color = C.coral, rot = -3, align = "left" } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate((rot * Math.PI) / 180);
  font(ctx, `700 ${size}px Caveat`); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillText(text, 0, size * 0.8);
  ctx.restore(); ctx.textAlign = "left";
}
export function body(ctx, text, x, y, maxW, size, { color = C.navy, weight = 600, lh = 1.4, align = "left", maxLines = 8, dry = false } = {}) {
  font(ctx, `${weight} ${size}px Jakarta`); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  const words = String(text).split(/\s+/); const lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  if (dry) { ctx.textAlign = "left"; return Math.min(lines.length, maxLines) * size * lh; }
  lines.slice(0, maxLines).forEach((l, i) => ctx.fillText(l, x, y + size + i * size * lh));
  ctx.textAlign = "left";
  return Math.min(lines.length, maxLines) * size * lh;
}
export function label(ctx, text, x, y, size, { fill = C.cream, color = C.navy, rot = -2 } = {}) {
  font(ctx, `800 ${size}px Jakarta`);
  const t = text.toUpperCase().split("").join(String.fromCharCode(8202)), w = ctx.measureText(t).width + size * 1.6, h = size * 2;
  ctx.save(); ctx.translate(x, y); ctx.rotate((rot * Math.PI) / 180);
  card(ctx, 0, 0, w, h, { r: size * 0.5, fill, bw: Math.max(3, size * 0.14), shadow: size * 0.22 });
  ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.fillText(t, size * 0.8, h / 2 + size * 0.06); ctx.restore();
  return w;
}
export function stars(ctx, w, h, n, color = C.sun, seed = 3) {
  font(ctx, "700 30px Jakarta"); ctx.fillStyle = color;
  for (let i = 0; i < n; i++) { const x = (i * 397 + seed * 91) % w, y = (i * 613 + seed * 53) % h, s = 14 + ((i * 7) % 4) * 8; ctx.globalAlpha = 0.35 + (i % 3) * 0.22; font(ctx, `700 ${s}px Jakarta`); ctx.fillText("✦", x, y); }
  ctx.globalAlpha = 1;
}
export function dottedPath(ctx, pts, { color = C.cream, width = 12, dash = [4, 26] } = {}) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 3) ctx.bezierCurveTo(...pts[i], ...pts[i + 1], ...pts[i + 2]);
  ctx.stroke(); ctx.restore();
}
export function footer(ctx, x, y, size, color = C.navy, align = "left") {
  font(ctx, `800 ${size}px Jakarta`); ctx.fillStyle = color; ctx.globalAlpha = 0.85; ctx.textAlign = align;
  ctx.fillText("PASTORAL JUVENIL ÁGAPE · PARROQUIA SAN MIGUEL DE YUNGAY".split("").join(String.fromCharCode(8202)), x, y);
  ctx.globalAlpha = 1; ctx.textAlign = "left";
}
export function dateBlock(ctx, x, y, s, day, mon, { fill = C.coral, color = C.white } = {}) {
  card(ctx, x, y, s, s * 1.08, { r: s * 0.18, fill, bw: s * 0.04, shadow: s * 0.07 });
  font(ctx, `800 ${s * 0.52}px Bricolage`); ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText(String(day), x + s / 2, y + s * 0.62);
  font(ctx, `800 ${s * 0.17}px Jakarta`); ctx.fillText(String(mon).toUpperCase(), x + s / 2, y + s * 0.9); ctx.textAlign = "left";
}

// ---------------------------------------------------------------------------
// Estilos de pieza (sirven para historia, post, cuadrado, afiche y horizontal)
// data: { kicker, title (con *marcador*), sub, hand, ill, qr, qrLabel, day, mon, big, bigLabel }
// ---------------------------------------------------------------------------
export const STYLES = [
  { id: "cielo", name: "Cielo", bg: C.sky, fg: C.navy, mark: C.sun, b1: C.cream, b2: C.sun, b3: C.coral, illBg: C.cream },
  { id: "crema", name: "Crema", bg: C.cream, fg: C.navy, mark: C.sun, b1: C.coral, b2: C.sky, b3: C.sun, illBg: C.white },
  { id: "coral", name: "Coral", bg: C.coral, fg: C.cream, mark: C.navy, markText: C.cream, b1: C.sun, b2: C.sky, b3: C.cream, illBg: C.cream },
  { id: "noche", name: "Noche", bg: C.navy, fg: C.cream, mark: C.coral, b1: C.blue, b2: C.sun, b3: C.sky, illBg: C.cream, stars: true },
  { id: "sol", name: "Sol", bg: C.sun, fg: C.navy, mark: C.cream, b1: C.cream, b2: C.coral, b3: C.sky, illBg: C.cream },
  { id: "stickers", name: "Stickers", bg: C.cream, fg: C.navy, mark: C.sun, b1: C.sky, b2: C.coral, b3: C.sun, illBg: C.white, collage: true },
  { id: "azul", name: "Azul", bg: C.blue, fg: C.cream, mark: C.sun, markText: C.navy, b1: C.sky, b2: C.sun, b3: C.coral, illBg: C.cream },
  { id: "papel", name: "Papel", bg: C.white, fg: C.navy, mark: C.coral, markText: C.navy, b1: C.butter, b2: C.ice, b3: C.coral, illBg: C.cream, tape: true },
  { id: "duo", name: "Dúo", bg: C.sky, fg: C.navy, mark: C.sun, b1: C.coral, b2: C.cream, b3: C.sun, illBg: C.cream, split: C.cream },
  { id: "rosa", name: "Rosa", bg: C.rose, fg: C.navy, mark: C.sun, b1: C.coral, b2: C.white, b3: C.sky, illBg: C.white },
];
const COLLAGE = ["corazon", "oracion", "amigos", "biblia", "espiritu", "maria", "juego", "servir", "familia", "luz", "semilla", "escuchar"];
export function illsFor(style, data) {
  const s = STYLES.find((x) => x.id === style) || STYLES[0];
  const l = [[data.ill || "comunidad", C.navy, s.illBg, C.sun]];
  if (s.collage) COLLAGE.forEach((k) => l.push([k, C.navy, C.white, C.sun]));
  if (data.ill2 || data.layout === "center") l.push([data.ill2 || "amigos", C.navy, s.illBg, C.sun]);
  return l;
}

// Todo se dibuja en «unidades»: el lado corto de la pieza mide 1080.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const onDark = (s) => [C.coral, C.navy, C.blue].includes(s.bg);
const handColor = (s) => (s.bg === C.coral || s.bg === C.sun ? C.navy : s.bg === C.navy || s.bg === C.blue ? C.sun : C.coral);
// Bloque de texto: etiqueta, frase a mano, titular y bajada. Devuelve su alto.
function block(ctx, s, d, x, y, maxW, hs, { dry = false, align = "left", flow = true, fg = s.fg, mark = s.mark } = {}) {
  let yy = y;
  if (flow && d.kicker) { if (!dry) { const lw = label(ctx, d.kicker, 0, -999, 26, {}); label(ctx, d.kicker, align === "center" ? x - lw / 2 : x, yy, 26, { fill: s.bg === C.cream || s.bg === C.white || s.bg === C.rose ? C.sun : C.cream }); } yy += 80; }
  if (flow && d.hand) { const hz = clamp(hs * 0.52, 52, 84); if (!dry) hand(ctx, d.hand, x, yy, hz, { color: handColor(s), rot: -3, align }); yy += hz * 1.15; }
  yy += headline(ctx, d.title || "", x, yy, maxW, hs, { color: fg, mark, maxLines: 5, align, dry }) + hs * 0.18;
  if (d.sub) yy += body(ctx, d.sub, x, yy, maxW, clamp(hs * 0.3, 32, 48), { color: fg, weight: 700, align, maxLines: 4, dry }) + 10;
  return yy - y;
}
function fit(ctx, s, d, maxW, avail, max, opt) { let hs = max; while (hs > 56 && block(ctx, s, d, 0, 0, maxW, hs, { ...opt, dry: true }) > avail) hs -= 4; return hs; }
function bigNumber(ctx, s, d, x, y, size) {
  font(ctx, `800 ${size}px Bricolage`); ctx.fillStyle = s.fg; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  const t = String(d.big); ctx.fillText(t, x - size * 0.03, y + size * 0.8);
  const tw = ctx.measureText(t).width;
  if (d.bigLabel) hand(ctx, d.bigLabel, x + tw + 20, y + size * 0.3, clamp(size * 0.24, 50, 110), { color: handColor(s), rot: -6 });
  return tw;
}

export function piece(ctx, W, H, styleId, d) {
  const s = STYLES.find((x) => x.id === styleId) || STYLES[0];
  const U = Math.min(W, H) / 1080, w = W / U, h = H / U, land = w > h * 1.15, story = h > 1600;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.setTransform(U, 0, 0, U, 0, 0);
  ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h);
  const mode = d.layout || (s.collage ? "collage" : land ? "land" : "port");
  // geometría de la ilustración (antes del fondo partido)
  let pad = 80, illW = 0, illH = 0, illX = 0, illY = 0;
  if (mode === "port") { illW = clamp((h - 760) * 0.8, 380, w * 0.66); illH = illW * 0.81; illX = w - pad - illW; illY = story ? 150 : pad; }
  if (mode === "land") { pad = 100; illW = Math.min(w * 0.32, 600, (h - 200 - (d.qr ? 260 : 0)) / 0.81); illH = illW * 0.81; illX = w - pad - illW; illY = 100; }
  if (s.split) { ctx.fillStyle = s.split; if (mode === "land") ctx.fillRect(w * 0.62, 0, w, h); else if (mode === "port") ctx.fillRect(0, illY + illH * 0.62, w, h); else ctx.fillRect(0, h * 0.5, w, h); }
  // decoración
  if (s.stars) stars(ctx, w, h * 0.92, Math.round((w * h) / 52000), C.sun, styleId.length);
  if (!s.collage) {
    blob(ctx, w * (land ? 0.95 : 0.96), h * 0.04, 330, s.b1);
    blob(ctx, w * 0.01, h * 0.99, 260, s.b2);
    if (mode === "port") blob(ctx, illX - 46, illY + 40, 34, s.b3);
    if (mode === "land") blob(ctx, illX - 60, illY + illH + 40, 40, s.b3);
  } else collageBg(ctx, w, h, land);
  if (s.tape) { ctx.save(); ctx.fillStyle = "rgba(255,186,3,.55)"; ctx.translate(w * 0.5, 50); ctx.rotate(-0.05); ctx.fillRect(-160, -26, 320, 52); ctx.restore(); }

  if (mode === "collage") collageBox(ctx, s, d, w, h, land, story);
  else if (mode === "center") centerLayout(ctx, s, d, w, h);
  else if (mode === "fondo") fondoLayout(ctx, s, d, w, h);
  else if (mode === "port") {
    const qs = d.qr ? clamp(h * 0.16, 200, 300) : 0, bottom = h - (story ? 190 : 110), rowTop = bottom - Math.max(qs, 170);
    const leftCol = illX - pad - 90, side = leftCol >= 220;
    if (d.big != null) bigNumber(ctx, s, d, pad, illY, Math.min(illH * 1.1, 640));
    else illCard(ctx, d.ill || "comunidad", illX, illY, illW, { bg: s.illBg, rot: 2, shadow: 14, r: 38 });
    let ty = illY + illH + 70;
    if (side && d.big == null) {
      let sy = illY + 20;
      const need = (d.day ? 250 : 0) + (d.kicker ? 80 : 0) + (d.hand ? 80 : 0);
      if (illY + 20 + need + 30 > ty) ty = illY + 20 + need + 30;
      if (d.day) { dateBlock(ctx, pad, sy, 190, d.day, d.mon, { fill: s.bg === C.coral ? C.navy : C.coral }); sy += 250; }
      if (d.kicker) { const lw = label(ctx, d.kicker, 0, -999, 24, {}), ls = Math.min(24, (24 * leftCol) / lw); label(ctx, d.kicker, pad, sy, ls, { fill: s.bg === C.cream || s.bg === C.white || s.bg === C.rose ? C.sun : C.cream }); sy += ls * 2 + 32; }
      if (d.hand) { font(ctx, "700 64px Caveat"); const hz = Math.min(64, (64 * leftCol) / ctx.measureText(d.hand).width); hand(ctx, d.hand, pad, sy, hz, { color: handColor(s), rot: -4 }); }
    } else if (d.day) dateBlock(ctx, pad - 10, illY + illH - 150, 190, d.day, d.mon, { fill: s.bg === C.coral ? C.navy : C.coral });
    const opt = { flow: !side || d.big != null }, maxW = w - pad * 2;
    const hs = fit(ctx, s, d, maxW, rowTop - 40 - ty, clamp(h * 0.115, 110, 220), opt);
    block(ctx, s, d, pad, ty, maxW, hs, opt);
    if (qs) {
      qr(ctx, d.qr, pad, rowTop, qs);
      if (d.qrLabel) hand(ctx, d.qrLabel, pad + qs + 34, rowTop + qs * 0.32, clamp(qs * 0.26, 54, 76), { color: handColor(s), rot: -5 });
    }
    logo(ctx, w - pad - 170, bottom - 170, 170);
    footer(ctx, pad, h - (story ? 120 : 46), 21, s.fg);
  } else {
    const qs = d.qr ? 230 : 0;
    if (d.big != null) bigNumber(ctx, s, d, illX - 40, illY, Math.min(illH, 380));
    else illCard(ctx, d.ill || "comunidad", illX, illY, illW, { bg: s.illBg, rot: 2, shadow: 14, r: 38 });
    let ty = 110; const maxW = illX - pad * 2 + (d.big != null ? -120 : 0);
    if (d.day) { dateBlock(ctx, pad, ty, 170, d.day, d.mon, { fill: s.bg === C.coral ? C.navy : C.coral }); ty += 220; }
    const hs = fit(ctx, s, d, maxW, h - 260 - ty, 140, {});
    block(ctx, s, d, pad, ty, maxW, hs, {});
    if (qs) {
      const qx = w - pad - qs, qy = h - 90 - qs; qr(ctx, d.qr, qx, qy, qs);
      if (d.qrLabel) hand(ctx, d.qrLabel, qx - 30, qy + qs * 0.38, 66, { color: handColor(s), rot: -5, align: "right" });
    }
    logo(ctx, pad, h - 220, 150);
    footer(ctx, pad + 180, h - 135, 21, s.fg);
  }
  ctx.restore();
}
function collageBg(ctx, w, h, land) {
  const cols = land ? 7 : 4, cw = w / cols, bgs = [C.sky, C.sun, C.white, C.coral, C.rose, C.ice]; let k = 0;
  for (let y = 0; y * cw * 0.82 < h + cw; y++) for (let x = 0; x < cols + 1; x++) {
    const off = y % 2 ? cw / 2 : 0, px = x * cw - off + cw * 0.11, py = y * cw * 0.82 - cw * 0.25;
    card(ctx, px, py, cw * 0.78, cw * 0.62, { r: cw * 0.08, fill: bgs[(x + y * 2) % 6], bw: 4, shadow: 8, rot: ((x * 7 + y * 3) % 9) - 4 });
    ill(ctx, COLLAGE[k++ % COLLAGE.length], px + cw * 0.04, py + cw * 0.03, cw * 0.7, { bg: C.white });
  }
}
function collageBox(ctx, s, d, w, h, land, story) {
  const bw = land ? Math.min(w * 0.52, 1100) : w - 120, bh = land ? h * 0.8 : story ? h * 0.6 : h * 0.78;
  const bx = (w - bw) / 2, by = (h - bh) / 2 - (story ? 20 : 0);
  card(ctx, bx, by, bw, bh, { r: 50, fill: C.cream, bw: 7, shadow: 18 });
  const ls = clamp(bh * 0.17, 120, 200), qs = d.qr ? clamp(bh * 0.2, 170, 250) : 0;
  let yy = by + 50; logo(ctx, w / 2 - ls / 2, yy, ls); yy += ls + 20;
  const t = { ...s, fg: C.navy, mark: C.sun, bg: C.cream }, avail = by + bh - 50 - (qs ? qs + 30 : 0) - yy;
  const hs = fit(ctx, t, { ...d, kicker: null, hand: d.hand || d.kicker }, bw - 120, avail, story ? 190 : 150, { align: "center" });
  yy += block(ctx, t, { ...d, kicker: null, hand: d.hand || d.kicker }, w / 2, yy, bw - 120, hs, { align: "center" });
  if (qs) qr(ctx, d.qr, w / 2 - qs / 2, by + bh - 50 - qs, qs);
  ctx.font = "800 21px Jakarta"; const fw = 760;
  card(ctx, w / 2 - fw / 2, h - 92, fw, 52, { r: 26, fill: C.cream, bw: 4, shadow: 5 });
  footer(ctx, w / 2, h - 58, 19, C.navy, "center");
}
// Portadas (Facebook, YouTube, canal): todo lo importante dentro de una zona segura centrada.
function centerLayout(ctx, s, d, w, h) {
  const sw = (d.safe?.[0] || 0.6) * w, sh = (d.safe?.[1] || 0.6) * h, sx = (w - sw) / 2, sy = (h - sh) / 2;
  const iw = Math.min((w - sw) / 2 - 60, 560);
  if (iw > 200) {
    illCard(ctx, d.ill || "comunidad", sx - iw - 30, h / 2 - iw * 0.45, iw, { bg: s.illBg, rot: -4, r: 34 });
    illCard(ctx, d.ill2 || "amigos", sx + sw + 30, h / 2 - iw * 0.3, iw, { bg: s.illBg, rot: 4, r: 34 });
  }
  const ls = Math.min(sh * 0.9, 300); logo(ctx, sx, sy + (sh - ls) / 2, ls);
  const tx = sx + ls + 50, tw = sw - ls - 50;
  const hs = fit(ctx, s, { ...d, sub: d.sub, kicker: null }, tw, sh, 150, {});
  const bh = block(ctx, s, { ...d, kicker: null }, 0, 0, tw, hs, { dry: true });
  block(ctx, s, { ...d, kicker: null }, tx, sy + (sh - bh) / 2, tw, hs, {});
}
// Fondos para videollamada: el centro queda despejado para la persona.
function fondoLayout(ctx, s, d, w, h) {
  logo(ctx, 70, 60, 150);
  headline(ctx, d.title || "Pastoral Juvenil *Ágape*", 240, 82, 900, 58, { color: s.fg, mark: s.mark, maxLines: 2 });
  if (d.hand) hand(ctx, d.hand, w - 110, 90, 70, { color: s.fg, rot: -4, align: "right" });
  illCard(ctx, d.ill || "comunidad", w - 470, h - 400, 380, { bg: s.illBg, rot: 3, r: 30 });
  if (d.ill2) illCard(ctx, d.ill2, 60, h - 360, 320, { bg: s.illBg, rot: -4, r: 30 });
  footer(ctx, d.ill2 ? 420 : 80, h - 50, 19, s.fg);
}

// ---------------------------------------------------------------------------
// Marcos de foto de perfil (1080 × 1080): foto en círculo + aro con texto curvo
// ---------------------------------------------------------------------------
export const FRAMES = [
  { id: "soy", text: "SOY ÁGAPE · AMOR QUE TRANSFORMA ·", ring: C.sun, ink: C.navy, badge: "corazon" },
  { id: "puente", text: "SÉ PUENTE · PASTORAL JUVENIL ÁGAPE ·", ring: C.coral, ink: C.cream, badge: "amigos" },
  { id: "retiro", text: "VOY AL RETIRO · ¡NOS VEMOS ALLÁ! ·", ring: C.sky, ink: C.navy, badge: "camino" },
  { id: "maria", text: "MES DE MARÍA · CON MARÍA, PUENTE A JESÚS ·", ring: C.blue, ink: C.cream, badge: "maria" },
  { id: "caminamos", text: "CAMINAMOS JUNTOS · CAMINO ÁGAPE ·", ring: C.navy, ink: C.sun, badge: "camino" },
  { id: "casa", text: "BIENVENIDO A CASA · ÁGAPE ·", ring: C.cream, ink: C.navy, badge: "acogida" },
  { id: "dirigente", text: "SOY DIRIGENTE ÁGAPE · AL SERVICIO ·", ring: C.navy, ink: C.cream, badge: "servir" },
  { id: "solidaridad", text: "MES DE LA SOLIDARIDAD · EL PAN QUE SE COMPARTE ·", ring: C.coral, ink: C.navy, badge: "panes" },
  { id: "rezo", text: "REZO POR TI · CAPILLA ÁGAPE ·", ring: C.sky, ink: C.navy, badge: "oracion" },
  { id: "vive", text: "¡ÉL VIVE Y TE QUIERE VIVO! ·", ring: C.sun, ink: C.coral, badge: "levantate" },
];
export const framesIlls = () => FRAMES.map((f) => [f.badge, C.navy, C.cream, C.sun]);
function arcText(ctx, text, cx, cy, r, size, color, gapAt = Math.PI / 4, gap = 0.62) {
  font(ctx, `800 ${size}px Jakarta`); ctx.fillStyle = color; ctx.textBaseline = "middle";
  const unit = [...(text + " ")], uw = unit.map((c) => ctx.measureText(c).width + size * 0.12), one = uw.reduce((x, y) => x + y, 0);
  const span = (2 * Math.PI - gap * 2) * r, k = Math.max(1, Math.round(span / one));
  const all = [].concat(...Array(k).fill(unit)), aw = [].concat(...Array(k).fill(uw));
  if (all[all.length - 1] === " ") { all.pop(); aw.pop(); }
  // quita el separador final para que el texto termine limpio antes de la insignia
  while (all.length && /[\s·]/.test(all[all.length - 1])) { all.pop(); aw.pop(); }
  const tot = aw.reduce((x, y) => x + y, 0), scale = Math.min(1.25, span / tot);
  let a = gapAt + gap + (span / r - (tot * scale) / r) / 2;
  all.forEach((c, i) => { const w = aw[i] * scale; a += w / 2 / r; ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.rotate(a + Math.PI / 2); ctx.textAlign = "center"; ctx.fillText(c, 0, 0); ctx.restore(); a += w / 2 / r; });
  ctx.textAlign = "left";
}
// photo: HTMLImageElement/ImageBitmap o null (vista previa con monito); zoom y desplazamiento opcionales
export function frame(ctx, S, frameId, photo, { zoom = 1, dx = 0, dy = 0, centro = null } = {}) {
  const f = FRAMES.find((x) => x.id === frameId) || FRAMES[0], U = S / 1080, cx = S / 2, cy = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = f.ring; ctx.fillRect(0, 0, S, S);
  const R = S * 0.5, inner = S * 0.405;
  // foto
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.clip();
  if (photo) {
    const pw = photo.width || photo.naturalWidth, phh = photo.height || photo.naturalHeight;
    const sc = Math.max((inner * 2) / pw, (inner * 2) / phh) * zoom, w = pw * sc, h = phh * sc;
    ctx.drawImage(photo, cx - w / 2 + dx * inner, cy - h / 2 + dy * inner, w, h);
  } else if (centro) {
    // un sticker elegido, entero y centrado dentro del círculo
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, S, S);
    const cw = centro.width || centro.naturalWidth || 512, chh = centro.height || centro.naturalHeight || 512;
    const box = inner * 1.5 * zoom, sc = Math.min(box / cw, box / chh), w = cw * sc, h = chh * sc;
    ctx.drawImage(centro, cx - w / 2 + dx * inner, cy - h / 2 + dy * inner, w, h);
  } else { ctx.fillStyle = C.cream; ctx.fillRect(0, 0, S, S); ill(ctx, f.badge, cx - inner * 0.9, cy - inner * 0.62, inner * 1.8, { bg: C.cream }); }
  ctx.restore();
  // aros
  ctx.lineWidth = 10 * U; ctx.strokeStyle = C.navy;
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - 8 * U, 0, Math.PI * 2); ctx.stroke();
  arcText(ctx, f.text, cx, cy, (inner + R) / 2 - 2 * U, 46 * U, f.ink);
  // insignias
  const bs = 230 * U;
  ctx.save(); ctx.beginPath(); ctx.arc(S * 0.83, S * 0.83, bs / 2, 0, Math.PI * 2); ctx.fillStyle = C.cream; ctx.fill(); ctx.lineWidth = 9 * U; ctx.strokeStyle = C.navy; ctx.stroke(); ctx.clip();
  logo(ctx, S * 0.83 - bs * 0.46, S * 0.83 - bs * 0.46, bs * 0.92); ctx.restore();
}

// ---------------------------------------------------------------------------
// Stickers (512 × 512, fondo transparente): monito con borde blanco + frase en globo
// ---------------------------------------------------------------------------
let TMP = null;
export const stickerIlls = (key, color = C.sun) => [[key, C.navy, C.white, color, 0, 1], [key, "#ffffff", "#ffffff", "#ffffff", 22, 1]];
export function sticker(ctx, key, text, color = C.sun) {
  const S = 512; ctx.clearRect(0, 0, S, S);
  // 1) monito + contorno blanco en un lienzo grande, 2) recorte al contenido, 3) encaje en el sticker
  const TW = 960, TH = 720;
  TMP = TMP || document.createElement("canvas"); TMP.width = TW; TMP.height = TH;
  const t = TMP.getContext("2d", { willReadFrequently: true }); t.clearRect(0, 0, TW, TH);
  const out = IMG.get([key, "#ffffff", "#ffffff", "#ffffff", 22, 1].join("|"));
  if (out) for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2; t.drawImage(out, Math.cos(an) * 12, Math.sin(an) * 12, TW, TH); }
  ill(t, key, 0, 0, TW, { bg: C.white, pop: color, bare: 1 });
  const px = t.getImageData(0, 0, TW, TH).data; let x0 = TW, y0 = TH, x1 = 0, y1 = 0;
  for (let y = 0; y < TH; y += 2) for (let x = 0; x < TW; x += 2) if (px[(y * TW + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0) return;
  const capH = text ? 120 : 0, bw = S - 24, bh = S - 24 - capH;
  const sc = Math.min(bw / (x1 - x0), bh / (y1 - y0)), dw = (x1 - x0) * sc, dh = (y1 - y0) * sc;
  ctx.drawImage(TMP, x0, y0, x1 - x0, y1 - y0, (S - dw) / 2, 12 + (bh - dh) / 2 + (text ? 6 : 0), dw, dh);
  if (!text) return;
  // globo con la frase
  let size = 64; font(ctx, `800 ${size}px Bricolage`);
  while (ctx.measureText(text).width > 430 && size > 34) { size -= 2; font(ctx, `800 ${size}px Bricolage`); }
  const tw = ctx.measureText(text).width, cw = tw + 46, ch = size * 1.25 + 18, cx = (S - cw) / 2, cy = S - ch - 20;
  ctx.save(); ctx.translate(S / 2, cy + ch / 2); ctx.rotate(-0.035); ctx.translate(-S / 2, -(cy + ch / 2));
  rr(ctx, cx - 10, cy - 10, cw + 20 + 7, ch + 20 + 7, 32); ctx.fillStyle = "#fff"; ctx.fill();
  card(ctx, cx, cy, cw, ch, { r: 24, fill: color, bw: 6, shadow: 7 });
  ctx.fillStyle = color === C.navy || color === C.coral || color === C.blue ? C.cream : C.navy; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.fillText(text, S / 2, cy + ch / 2 + size * 0.06); ctx.restore(); ctx.textAlign = "left";
}

// ---------------------------------------------------------------------------
// Contenidos listos: stickers y frases del grupo
// ---------------------------------------------------------------------------
export const STICKERS = [
  ["jesus", "Jesús te ama", C.sun], ["emaus", "¡Camina conmigo!", C.sky], ["buenpastor", "Él te cuida", C.coral], ["virgen", "María, ruega por nosotros", C.sky], ["sanmiguel", "¿Quién como Dios?", C.sun], ["carloacutis", "Mi autopista al cielo", C.coral],
  ["corazon", "¡Te quiero!", C.sun], ["oracion", "Rezo por ti", C.sky], ["amigos", "¡Amigos!", C.coral], ["juego", "¡Vamos!", C.sun],
  ["celular", "Ya llego", C.sky], ["levantate", "¡Arriba!", C.coral], ["acogida", "¡Bienvenido!", C.sun], ["comunidad", "¡Nos vemos!", C.sky],
  ["equipo", "¡Equipazo!", C.coral], ["amar", "Amor que transforma", C.sun], ["escuchar", "Te escucho", C.sky], ["descanso", "Modo siesta", C.sky],
  ["biblia", "Palabra del día", C.sun], ["espiritu", "¡Ven, Espíritu!", C.coral], ["maria", "Con María", C.sky], ["eucaristia", "¡A misa!", C.sun],
  ["servir", "¡Cuenta conmigo!", C.coral], ["pregunta", "¿Y ahora qué?", C.sky], ["duda", "Mmm… no sé", C.sun], ["bartimeo", "¡Lo logré!", C.coral],
  ["futuro", "¡Buenos días!", C.sun], ["santos", "¡Seamos santos!", C.sky], ["familia", "¡Familia!", C.coral], ["camino", "Voy en camino", C.sky],
  ["flores", "¡Gracias!", C.coral], ["panes", "¿Hay once?", C.sun], ["tesoro", "¡Eres un tesoro!", C.coral], ["mesa", "¡A comer!", C.sky],
  ["envio", "¡Misión cumplida!", C.sun], ["luz", "¡Brilla!", C.sun],
  // Personajes juveniles
  ["pj:llama", "¡Al tiro!", C.coral], ["pj:zorro", "¡Bacán!", C.sun], ["pj:pinguino", "¡Qué frío!", C.sky], ["pj:gato", "Modo gamer", C.coral],
  ["pj:quiltro", "¡Fiel hasta el final!", C.sun], ["pj:oso", "Abrazo de oso", C.sky], ["pj:pudu", "Chiquito pero valiente", C.coral], ["pj:panda", "Modo zen", C.sun],
  ["pj:conejo", "¡Voy saltando!", C.sky], ["pj:buho", "Estudiando…", C.coral], ["pj:ballena", "¡Te extrañé!", C.sky], ["pj:abeja", "¡A trabajar!", C.sun],
  ["pj:paloma", "Paz a ti", C.sky], ["pj:dino", "¡Rawr!", C.coral], ["pj:astronauta", "¡Al infinito!", C.sun], ["pj:robot", "Procesando…", C.sky],
  ["pj:sol", "¡Arriba ese ánimo!", C.sun], ["pj:cactus", "Aquí aguantando", C.coral], ["pj:taza", "¿Un tecito?", C.sky], ["pj:guitarra", "¡A cantar!", C.sun],
  // Nuestra Iglesia: el Papa, nuestros sacerdotes, la parroquia y la catedral (los que traen su nombre van sin frase)
  ["leon", "León XIV", C.coral, 1],
  ["francisco", "Papa Francisco", C.sky, 1],
  ["benedicto", "Benedicto XVI", C.sun, 1],
  ["juanpablo", "¡No tengan miedo!", C.sun],
  ["juanpablo2", "¡Abran las puertas a Cristo!", C.sun],
  ["samuel", "P. Samuel", C.coral, 1],
  ["samuelmisa", "P. Samuel en Misa", C.sky, 1],
  ["samuelmate", "P. Samuel y el mate", C.sun, 1],
  ["samueloro", "P. Samuel reza", C.coral, 1],
  ["samuelauto", "P. Samuel al campo", C.sky, 1],
  ["samueladora", "Bendito sea Dios", C.sun],
  ["curaorando", "Oremos", C.sky],
  ["curapalabra", "Palabra del Señor", C.coral],
  ["curasaludo", "¡Bienvenidos!", C.sun],
  ["curaalba", "La paz esté con ustedes", C.sky],
  ["bendicion", "¡Bendiciones!", C.coral],
  ["custodia", "¡Adoremos!", C.sun],
  ["adoracion", "Él está aquí", C.coral],
  ["campo", "¡Vamos al campo!", C.sky, 1],
  ["parroquia", "Parroquia San Miguel de Yungay", C.coral, 1],
  ["catedral", "Catedral de Chillán", C.sky, 1],
  // Año litúrgico y sacramentos (sin texto)
  ["l_confirmacion", "Confirmación", C.sun, 1],
  ["l_eucaristia", "Eucaristía", C.sky, 1],
  ["l_uncion", "Unción de los enfermos", C.coral, 1],
  ["l_reconciliacion", "Reconciliación", C.sun, 1],
  ["l_orden", "Orden sagrado", C.sky, 1],
  ["l_matrimonio", "Matrimonio", C.coral, 1],
  ["l_vocaciones", "Vocaciones", C.sun, 1],
  ["l_bautismo", "Bautismo", C.sky, 1],
  ["l_pila", "Pila bautismal", C.coral, 1],
  ["l_corpus", "Corpus Christi", C.sun, 1],
  ["l_caliz", "Cáliz y hostia", C.sky, 1],
  ["l_cuaresma", "Cuaresma", C.coral, 1],
  ["l_cruzpalma", "Cruz y palma", C.sun, 1],
  ["l_ramos", "Domingo de Ramos", C.sky, 1],
  ["l_cirio", "Cirio pascual", C.coral, 1],
  ["l_pascua", "Pascua", C.sun, 1],
  ["l_pentecostes", "Pentecostés", C.sky, 1],
  ["l_navidad", "Navidad", C.coral, 1],
  ["l_ordinario", "Tiempo Ordinario", C.sun, 1],
  ["l_asuncion", "Asunción de María", C.sky, 1],
  ["l_virgen", "La Virgen", C.coral, 1],
  ["l_guadalupe", "Virgen de Guadalupe", C.sun, 1],
  ["l_familia", "Sagrada Familia", C.sky, 1],
  ["l_corazon", "Sagrado Corazón de Jesús", C.coral, 1],
  ["l_jose", "San José Obrero", C.sun, 1],
  ["l_rosa", "Santa Rosa de Lima", C.sky, 1],
  ["l_biblia", "Biblia", C.coral, 1],
  // Santos de Chile
  ["virgencarmen", "Reina y Patrona de Chile", C.sky], ["teresaandes", "Dios es alegría infinita", C.sun], ["albertohurtado", "¡Contento, Señor, contento!", C.coral],
  ["santoschile", "¡Santos de Chile!", C.sky],
  // Santos jóvenes y amigos de Dios
  ["donbosco", "¡Estén siempre alegres!", C.sun], ["teresita", "Amar es darlo todo", C.coral], ["franciscoasis", "Paz y bien", C.sun], ["sansebastian", "Firme en la fe", C.coral], ["jose", "San José, cuídanos", C.sun],
  ["sagradafamilia", "Jesús, María y José", C.coral], ["apostoles", "¡Síganme!", C.sky], ["sagradocorazon", "En ti confío", C.coral], ["dejadlos", "Dejen que vengan a mí", C.sun], ["rey", "¡Viva Cristo Rey!", C.sun],
];
export const PHRASES = [
  { title: "Amor que *transforma*", hand: "Pastoral Juvenil Ágape", ill: "corazon" },
  { title: "Sé *puente*", hand: "Hay un lugar para ti", ill: "amigos" },
  { title: "Bienvenido *a casa*", hand: "Aquí te esperamos", ill: "acogida" },
  { title: "Caminamos *juntos*", hand: "Camino Ágape", ill: "camino" },
  { title: "¡Él vive y te quiere *vivo!*", hand: "Christus vivit 1", ill: "levantate" },
  { title: "Aquí nadie es *espectador*", hand: "Súmate", ill: "equipo" },
  { title: "Hay un lugar *para ti*", hand: "Ven a conocernos", ill: "comunidad" },
  { title: "Rezo *por ti*", hand: "Capilla Ágape", ill: "oracion" },
];
