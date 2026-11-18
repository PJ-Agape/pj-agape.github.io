// Motor de los videos con personajes: arma la línea de tiempo de un guion y dibuja
// cualquier instante en un canvas (fondo, títulos, globo de diálogo, personajes y cierre).
// No toca la página: lo usan la vista previa y el exportador de MP4 del Estudio de difusión.

import { KITS } from "./videos-kits.js";

export const FPS = 30;
export const CPS = 15; // letras por segundo que aparecen en el globo
export const FORMATOS = { vertical: [1080, 1920, "Vertical (historias, reels, TikTok)"], cuadrado: [1080, 1080, "Cuadrado (feed, WhatsApp)"] };
export const ELENCO = { cami: "Cami", beto: "Beto", sam: "Padre Sam", firu: "Firu" };
export const HABLAN = ["cami", "beto", "sam"];
export const ORDEN = ["beto", "firu", "cami", "sam"];

// Poses (ángulo del brazo y del antebrazo, izquierda y derecha vistas desde quien mira).
const P = (a, b, c, d) => ({ "brazo-izq": a, "antebrazo-izq": b, "brazo-der": c, "antebrazo-der": d });
const POSE = {
  reposo: P(4, 0, -4, 0), hola: P(115, 6, -130, -8), senala: P(4, 0, -123, 0), saludo: P(4, 0, -128, -12),
  encogido: P(24, 95, -24, -95), celular: P(4, 0, 22, 78), mate: P(-16, -10, 16, 12),
};
export const POSES = {
  cami: [["reposo", "De pie"], ["senala", "Señala el globo"], ["hola", "Brazos arriba"], ["saludo", "Saluda"]],
  beto: [["reposo", "De pie"], ["celular", "Con el celular"], ["encogido", "Se encoge de hombros"], ["saludo", "Saluda"]],
  sam: [["mate", "Con el mate"], ["reposo", "De pie"], ["senala", "Señala el globo"], ["saludo", "Saluda"]],
};
export const BASE = { cami: "reposo", beto: "reposo", sam: "mate" };
export const FIRU = [["sentado", "Sentado"], ["curioso", "Curioso (cabeza ladeada)"], ["contento", "Contento (mueve la cola)"]];
const FIRU_ANG = { sentado: { cabeza: 0, "oreja-izq": 0, "oreja-der": 0 }, curioso: { cabeza: -12, "oreja-izq": -6, "oreja-der": 10 }, contento: { cabeza: 0, "oreja-izq": 4, "oreja-der": -4 } };
const SALUDAN = new Set(["saludo", "hola"]);
const BGS = ["#dcecf8", "#fbe3d8", "#fcf0d2", "#e3f1e4"];
const NAVY = "#1c2e5e", BLUE = "#1f4e9a", ORANGE = "#f0591c";
export const FONT_T = "Bricolage", FONT_B = "Jakarta";

// ---------------------------------------------------------------------------
// Línea de tiempo
// ---------------------------------------------------------------------------
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;
// Sin audio: el globo dura lo que toma leerlo con calma (máximo 2 palabras por segundo).
export function lineDur(text, audioDur) {
  if (audioDur) return audioDur + 0.6;
  const n = String(text || "").length;
  return Math.max(n / CPS + 1.2, words(text) / 2 + 0.8, 1.8);
}
// audioOf(línea) → { dur, env } o nada (env = volumen por cuadro, para mover la boca con la voz)
export function timeline(p, audioOf = () => null) {
  const T = { scenes: [], lines: [], keys: {}, dur: 0 };
  let t = 0, prevCast = [];
  (p.scenes || []).forEach((sc, si) => {
    // Quien habla siempre está en escena, aunque no lo hayan marcado.
    const cast = ORDEN.filter((c) => (sc.cast || []).includes(c) || (sc.lines || []).some((l) => l.who === c && String(l.text || "").trim()));
    const entra = cast.some((c) => !prevCast.includes(c));
    const s = { t0: t, title: sc.title || "", sub: sc.sub || "", cast, firu: sc.firu || "sentado", bg: BGS[si % BGS.length], prevCast };
    let lt = t + (entra && si ? 1.2 : 0.8);
    (sc.lines || []).forEach((ln, li) => {
      if (!HABLAN.includes(ln.who) || !String(ln.text || "").trim()) return;
      const a = audioOf(ln) || null;
      const d = lineDur(ln.text, a && a.dur);
      const typeDur = a ? Math.min(ln.text.length / CPS, a.dur) : ln.text.length / CPS;
      T.lines.push({ t0: lt, dur: d, typeDur, who: ln.who, text: String(ln.text).trim(), pose: ln.pose || BASE[ln.who], gesto: ln.gesto || "", audio: a || null, key: `${si}-${li}`, scene: si });
      lt += d;
    });
    s.t1 = Math.max(lt + 0.4, t + 3);
    T.scenes.push(s);
    t = s.t1; prevCast = cast;
  });
  const c = p.cierre || {};
  T.endT = c.on === false ? null : t;
  T.dur = t + (c.on === false ? 0.8 : 5.5);
  // Poses: cambian al comenzar cada línea; quien no habla vuelve a su pose de siempre.
  for (const who of HABLAN) {
    const k = [[0, BASE[who]]];
    for (const ln of T.lines) k.push([ln.t0, ln.who === who ? ln.pose : BASE[who]]);
    if (T.endT != null) k.push([T.endT, "saludo"]);
    T.keys[who] = k;
  }
  return T;
}

// ---------------------------------------------------------------------------
// Dibujo de los kits (árbol [etiqueta, atributos, hijos]) en canvas
// ---------------------------------------------------------------------------
const PATHS = new WeakMap();
const nums = (s) => String(s).trim().split(/[\s,]+/).map(Number);
function applyTf(ctx, tf) {
  if (!tf) return;
  for (const m of String(tf).matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = nums(m[2]);
    if (m[1] === "translate") ctx.translate(v[0], v[1] || 0);
    else if (m[1] === "scale") ctx.scale(v[0], v.length > 1 ? v[1] : v[0]);
    else if (m[1] === "rotate") {
      const r = (v[0] * Math.PI) / 180;
      if (v.length > 2) { ctx.translate(v[1], v[2]); ctx.rotate(r); ctx.translate(-v[1], -v[2]); } else ctx.rotate(r);
    }
  }
}
const pivotOf = (a) => { const m = /rotate\(([^)]*)\)/.exec(a.transform || ""); if (!m) return null; const v = nums(m[1]); return v.length > 2 ? [v[1], v[2]] : null; };
function drawNode(ctx, n, ov) {
  const [tag, a, kids] = n;
  const id = a.id;
  const show = id && id in ov.show ? ov.show[id] : !a.hidden;
  if (!show) return;
  ctx.save();
  if (id && ov.tf[id] != null) applyTf(ctx, ov.tf[id]);
  else if (id && ov.rot[id] != null) { const pv = pivotOf(a); applyTf(ctx, pv ? `rotate(${ov.rot[id]} ${pv[0]} ${pv[1]})` : a.transform); }
  else applyTf(ctx, a.transform);
  if (a.opacity != null) ctx.globalAlpha *= a.opacity;
  if (tag === "g") { for (const k of kids || []) drawNode(ctx, k, ov); ctx.restore(); return; }
  let path = PATHS.get(n);
  if (!path) {
    path = new Path2D();
    if (tag === "path") path.addPath(new Path2D(a.d));
    else if (tag === "rect") { if (a.rx) path.roundRect(a.x || 0, a.y || 0, a.width, a.height, a.rx); else path.rect(a.x || 0, a.y || 0, a.width, a.height); }
    else if (tag === "circle") path.arc(a.cx, a.cy, a.r, 0, Math.PI * 2);
    else if (tag === "ellipse") path.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2);
    PATHS.set(n, path);
  }
  const fill = a.fill == null ? "#000" : a.fill;
  if (fill !== "none") { ctx.fillStyle = fill; ctx.fill(path); }
  if (a.stroke && a.stroke !== "none") {
    ctx.strokeStyle = a.stroke; ctx.lineWidth = a["stroke-width"] || 1;
    ctx.lineCap = a["stroke-linecap"] || "butt"; ctx.lineJoin = a["stroke-linejoin"] || "miter";
    ctx.stroke(path);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Utilidades de tiempo y diseño
// ---------------------------------------------------------------------------
export const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function keyed(keys, t, dur = 0.45) {
  let prev = keys[0][1], cur = keys[0][1], t0 = keys[0][0];
  for (let i = 0; i < keys.length; i++) if (keys[i][0] <= t) { prev = i ? keys[i - 1][1] : keys[i][1]; cur = keys[i][1]; t0 = keys[i][0]; }
  return { prev, cur, b: ease((t - t0) / dur), since: t - t0 };
}
const mixAng = (a, b, k) => { const o = {}; for (const key in b) o[key] = (a[key] || 0) * (1 - k) + b[key] * k; return o; };
function sceneAt(T, t) { let s = T.scenes[0]; for (const x of T.scenes) if (x.t0 <= t) s = x; return s; }
function lineAt(T, t) { let l = null; for (const x of T.lines) if (x.t0 <= t) l = x; return l; }

function layout(W, H) {
  const v = H > W;
  return {
    W, H, v,
    headerY: v ? 110 : 62, headerFs: v ? 34 : 28,
    titleY: v ? 610 : 168, titleFs: v ? 88 : 66, subY: v ? 676 : 214, subFs: v ? 38 : 30,
    bubTop: v ? 780 : 252, bubX: 60, bubW: W - 120, fs: v ? 54 : 44, lh: v ? 74 : 58, pad: v ? 46 : 40,
    cap: v ? 1.25 : 1.05,
  };
}
function slots(cast, L) {
  const n = Math.max(1, cast.length), s = Math.min(L.cap, L.W / n / 232), o = {};
  cast.forEach((c, i) => { o[c] = [((i + 0.5) * L.W) / n, s]; });
  return o;
}
function charPos(T, name, t, L) {
  const sc = sceneAt(T, t);
  const a = slots(sc.prevCast, L), b = slots(sc.cast, L), k = ease((t - sc.t0) / 1.1);
  const inA = name in a, inB = name in b;
  if (!inA && !inB) return null;
  if (!inB) { // sale por la derecha
    if (k >= 1) return null;
    const [x0, s0] = a[name]; return { x: x0 + (L.W + 300 * s0 - x0) * k, s: s0, hop: Math.abs(Math.sin((t - sc.t0) * Math.PI * 3.6)) * 14 };
  }
  const [x1, s1] = b[name];
  const [x0, s0] = inA ? a[name] : [L.W + 280 * s1, s1];
  const moving = k < 1 && Math.abs(x1 - x0) > 1;
  return { x: x0 + (x1 - x0) * k, s: s0 + (s1 - s0) * k, hop: moving ? Math.abs(Math.sin((t - sc.t0) * Math.PI * 3.6)) * 14 : 0 };
}
function fitFont(ctx, text, size, maxW, fam, w = 800) {
  ctx.font = `${w} ${size}px ${fam}`;
  const m = ctx.measureText(text).width;
  return m <= maxW ? size : Math.floor((size * maxW) / m);
}
function wrap(ctx, text, maxW) {
  const out = []; let cur = "";
  for (const w of String(text).split(" ")) {
    const tt = cur ? cur + " " + w : w;
    if (ctx.measureText(tt).width <= maxW || !cur) cur = tt; else { out.push(cur); cur = w; }
  }
  out.push(cur); return out;
}
// Texto con *partes marcadas* en naranjo, centrado
function markedText(ctx, text, x, y, color, mark) {
  const parts = String(text).split("*"); let total = 0;
  for (const p of parts) total += ctx.measureText(p).width;
  let cx = x - total / 2; ctx.textAlign = "left";
  parts.forEach((p, i) => { ctx.fillStyle = i % 2 ? mark : color; ctx.fillText(p, cx, y); cx += ctx.measureText(p).width; });
  ctx.textAlign = "center";
}

// ---------------------------------------------------------------------------
// Un cuadro del video
// ---------------------------------------------------------------------------
export function draw(ctx, W, H, t, p, T, { logo = null } = {}) {
  const L = layout(W, H);
  ctx.save();
  ctx.textBaseline = "alphabetic";
  background(ctx, L, T, t);
  header(ctx, L);
  if (L.v && logo) {
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(W / 2, 320, 150, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(W / 2, 320, 132, 0, 7); ctx.fill();
    ctx.drawImage(logo, W / 2 - 124, 196, 248, 248);
  }
  const end = T.endT != null && t >= T.endT;
  if (!end || t < T.endT + 0.6) titles(ctx, L, T, t);
  if (T.endT != null) endcard(ctx, L, T, t, p.cierre || {});
  const last = T.scenes[T.scenes.length - 1];
  for (const name of ORDEN) {
    const pos = charPos(T, name, t, L);
    if (pos) drawChar(ctx, name, t, pos, L, T, last);
  }
  bubble(ctx, L, T, t);
  let fade = 1;
  if (t < 0.5) fade = ease(t / 0.5);
  if (t > T.dur - 0.7) fade = 1 - ease((t - (T.dur - 0.7)) / 0.7);
  if (fade < 1) { ctx.globalAlpha = 1 - fade; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  ctx.restore();
}

function hex(c) { return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); }
function background(ctx, L, T, t) {
  const sc = sceneAt(T, t), i = T.scenes.indexOf(sc);
  const a = hex(i ? T.scenes[i - 1].bg : sc.bg), b = hex(sc.bg), k = ease((t - sc.t0) / 0.9);
  ctx.fillStyle = `rgb(${a.map((v, j) => Math.round(v * (1 - k) + b[j] * k)).join(",")})`;
  ctx.fillRect(0, 0, L.W, L.H);
  const circ = [[0.48, 0.3, 0.42, "246,180,156", 0.45, 0.13], [0.02, 0.55, 0.3, "140,207,245", 0.4, 0.17], [0.86, 0.86, 0.34, "255,224,138", 0.45, 0.11], [1.02, 0.22, 0.2, "255,255,255", 0.75, 0.19]];
  circ.forEach(([px, py, r, c, o, sp], j) => {
    const cx = px * L.W + Math.sin(t * sp + j) * 30, cy = py * L.H + Math.cos(t * sp * 0.8 + j * 2) * 24;
    const R = r * Math.max(L.W, L.H) * (L.v ? 0.9 : 1);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, `rgba(${c},${o})`); g.addColorStop(0.72, `rgba(${c},${o * 0.85})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  });
}
function header(ctx, L) {
  ctx.font = `800 ${L.headerFs}px ${FONT_B}`;
  try { ctx.letterSpacing = `${(L.headerFs * 0.12).toFixed(1)}px`; } catch {}
  const a = "PASTORAL JUVENIL ÁGAPE · ", b = "YUNGAY";
  const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, x = L.W / 2 - (wa + wb) / 2;
  ctx.textAlign = "left"; ctx.fillStyle = BLUE; ctx.fillText(a, x, L.headerY); ctx.fillStyle = ORANGE; ctx.fillText(b, x + wa, L.headerY);
  try { ctx.letterSpacing = "0px"; } catch {}
}
function titles(ctx, L, T, t) {
  const sc = sceneAt(T, t), i = T.scenes.indexOf(sc), nxt = T.scenes[i + 1] ? T.scenes[i + 1].t0 : T.endT != null ? T.endT + 0.35 : 1e9;
  ctx.textAlign = "center";
  if (sc.title) {
    const k = ease((t - sc.t0 - 0.15) / 0.5) * (1 - ease((t - (nxt - 0.35)) / 0.35)), dy = (1 - ease((t - sc.t0 - 0.15) / 0.5)) * 24;
    ctx.globalAlpha = k;
    const fs = fitFont(ctx, sc.title, L.titleFs, L.W - 100, FONT_T);
    ctx.font = `800 ${fs}px ${FONT_T}`; ctx.fillStyle = NAVY; ctx.fillText(sc.title, L.W / 2, L.titleY + dy);
    if (sc.sub) {
      const sf = fitFont(ctx, sc.sub, L.subFs, L.W - 100, FONT_B, 700);
      ctx.font = `700 ${sf}px ${FONT_B}`; ctx.fillStyle = ORANGE; ctx.fillText(sc.sub, L.W / 2, L.subY + dy);
    }
    ctx.globalAlpha = 1;
  }
}
function endcard(ctx, L, T, t, c) {
  const t0 = T.endT; if (t < t0) return;
  const k = ease((t - t0) / 0.6), v = L.v, W = L.W;
  const [ty, fs0, ly, lfs, step, fy] = v ? [610, 88, 740, 50, 84, 1040] : [168, 66, 252, 40, 60, 470];
  ctx.globalAlpha = k; ctx.textAlign = "center";
  const title = c.title || "";
  const fs = fitFont(ctx, title.replace(/\*/g, ""), fs0, W - 100, FONT_T);
  ctx.font = `800 ${fs}px ${FONT_T}`; markedText(ctx, title, W / 2, ty, NAVY, ORANGE);
  const items = (c.items || []).filter((x) => String(x || "").trim()).slice(0, 3);
  ctx.font = `700 ${lfs}px ${FONT_B}`;
  const wmax = Math.max(0, ...items.map((s) => ctx.measureText(s).width)) + lfs * 1.4, x0 = W / 2 - wmax / 2;
  items.forEach((s, j) => {
    const kk = ease((t - t0 - 0.3 - j * 0.35) / 0.4); ctx.globalAlpha = kk;
    const y = ly + j * step, cx = x0 + lfs * 0.45, cy = y - lfs * 0.33;
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(cx, cy, lfs * 0.45, 0, 7); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = lfs * 0.1; ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x0 + lfs * 0.25, cy); ctx.lineTo(x0 + lfs * 0.4, cy + lfs * 0.15); ctx.lineTo(x0 + lfs * 0.67, cy - lfs * 0.15); ctx.stroke();
    ctx.textAlign = "left"; ctx.fillStyle = NAVY; ctx.fillText(s, x0 + lfs * 1.25, y);
  });
  ctx.textAlign = "center";
  const kk = ease((t - t0 - 1.5) / 0.5), ffs = v ? 44 : 32;
  if (c.pie) { ctx.globalAlpha = kk; ctx.font = `800 ${fitFont(ctx, c.pie.replace(/\*/g, ""), ffs, W - 100, FONT_B)}px ${FONT_B}`; markedText(ctx, c.pie, W / 2, fy, BLUE, ORANGE); }
  if (c.web) { ctx.globalAlpha = kk; ctx.font = `700 ${Math.round(ffs * 0.85)}px ${FONT_B}`; ctx.fillStyle = NAVY; ctx.fillText(c.web, W / 2, fy + ffs * 1.35); }
  ctx.globalAlpha = 1;
}

function speakingNow(T, who, t) {
  for (const ln of T.lines) if (ln.who === who && ln.t0 <= t && t < ln.t0 + (ln.audio ? ln.audio.dur : ln.typeDur)) return ln;
  return null;
}
function drawChar(ctx, name, t, pos, L, T, lastScene) {
  const ph = { cami: 0, beto: 1.3, sam: 2.1, firu: 0.7 }[name];
  const ov = { rot: {}, show: {}, tf: {} };
  const blink = (t + ph * 1.7) % 3.6 < 0.14;
  ov.show["ojos-abiertos"] = !blink; ov.show["ojos-cerrados"] = blink;
  const end = T.endT != null && t >= T.endT;
  if (name === "firu") {
    const sc = sceneAt(T, t), i = T.scenes.indexOf(sc), prev = i ? T.scenes[i - 1].firu : sc.firu;
    const mode = end ? "contento" : sc.firu;
    Object.assign(ov.rot, mixAng(FIRU_ANG[prev] || FIRU_ANG.sentado, FIRU_ANG[mode] || FIRU_ANG.sentado, ease((t - sc.t0) / 0.6)));
    const happy = mode === "contento";
    ov.rot.cola = Math.sin(t * 9) * (happy ? 16 : 6);
    const jadeo = happy && (t * 2.4) % 1 < 0.5;
    ov.show["boca-jadeo"] = jadeo; ov.show["boca-cerrada"] = !jadeo;
  } else {
    const kp = keyed(T.keys[name], t);
    const ang = mixAng(POSE[kp.prev] || POSE.reposo, POSE[kp.cur] || POSE.reposo, kp.b);
    if (SALUDAN.has(kp.cur) && kp.since > 0.3) ang["antebrazo-der"] += Math.sin((kp.since - 0.3) * 7) * 18 * ease((kp.since - 0.3) / 0.4);
    if (kp.cur === "hola" && kp.since > 0.3) ang["antebrazo-izq"] -= Math.sin((kp.since - 0.3) * 7) * 18 * ease((kp.since - 0.3) / 0.4);
    const talk = speakingNow(T, name, t);
    ang.cabeza = talk ? Math.sin(t * 2.2 + ph) * 2.2 : 0;
    Object.assign(ov.rot, ang);
    let mouth = "sonrisa";
    if (talk) {
      if (talk.audio && talk.audio.env) { const f = Math.floor((t - talk.t0) * FPS); mouth = (talk.audio.env[f] || 0) > 0.5 ? "abierta" : "cerrada"; }
      else mouth = (t * 6) % 1 < 0.5 ? "abierta" : "cerrada";
    }
    const ln = lineAt(T, t);
    const esceptico = name === "beto" && !end && ln && ln.who === "beto" && ln.gesto === "esceptico";
    if (esceptico && !talk) mouth = "mmm";
    for (const m of ["sonrisa", "abierta", "cerrada", "mmm"]) ov.show["boca-" + m] = m === mouth;
    if (name === "beto") {
      ov.tf["ceja-der"] = esceptico ? "translate(0 -8) rotate(-16 221 143)" : "translate(0 0)";
      ov.show.celular = kp.cur === "celular" ? kp.since > 0.25 : kp.prev === "celular" && kp.since < 0.2;
    }
    if (name === "sam") ov.show.mate = kp.cur === "mate" ? kp.since > 0.3 || kp.prev === "mate" : kp.prev === "mate" && kp.since < 0.15;
  }
  const s = pos.s, w = 400 * s, h = 560 * s;
  const bob = Math.sin(t * 2.1 + ph) * 3 - pos.hop;
  ctx.save();
  ctx.translate(pos.x - w / 2, L.H - h + 14 * s);
  ctx.scale(s, s); ctx.translate(10, 40);
  ctx.translate(190, 500); ctx.scale(1.1, 1.1); ctx.translate(-190, -500); ctx.translate(0, bob);
  for (const n of KITS[name]) drawNode(ctx, n, ov);
  ctx.restore();
}

function bubble(ctx, L, T, t) {
  const ln = lineAt(T, t);
  if (!ln) return;
  if (T.endT != null && t >= T.endT + 0.4) return;
  const pop = ease((t - ln.t0) / 0.22), sc = 0.92 + 0.08 * pop;
  const op = pop * (T.endT != null ? 1 - ease((t - T.endT) / 0.4) : 1);
  ctx.font = `700 ${L.fs}px ${FONT_B}`;
  const lines = wrap(ctx, ln.text, L.bubW - 2 * L.pad);
  const speed = ln.text.length / Math.max(0.3, ln.typeDur);
  const n = Math.floor(Math.max(0, t - ln.t0) * speed);
  const hgt = 2 * L.pad + L.lh * lines.length - (L.lh - L.fs) + 6;
  const x = L.bubX, y = L.bubTop, w = L.bubW;
  const pos = charPos(T, ln.who, t, L);
  const hx = pos ? pos.x : L.W / 2, hy = pos ? L.H - 560 * pos.s + 64 * pos.s : L.H;
  const tx = Math.max(x + 90, Math.min(x + w - 90, hx));
  const tipX = tx + (hx - tx) * 0.5, tipY = Math.min(y + hgt + (L.v ? 70 : 52), hy - 20);
  ctx.save();
  ctx.globalAlpha = op;
  ctx.translate(x + w / 2, y + hgt / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + hgt / 2));
  ctx.fillStyle = "rgba(28,53,96,.08)"; ctx.beginPath(); ctx.roundRect(x + 4, y + 10, w, hgt, 46); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(tx - 34, y + hgt - 2); ctx.lineTo(tipX, tipY); ctx.lineTo(tx + 26, y + hgt - 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x, y, w, hgt, 46); ctx.fill();
  ctx.fillStyle = NAVY; ctx.textAlign = "left";
  let left = n, cur = null;
  lines.forEach((l, i) => {
    const shown = l.slice(0, Math.max(0, left)); left -= l.length + 1;
    const by = y + L.pad + L.fs * 0.82 + i * L.lh;
    if (shown) { ctx.fillText(shown, x + L.pad, by); if (left < 0 || i === lines.length - 1) cur = cur || [x + L.pad + ctx.measureText(shown).width, by]; }
  });
  if (t - ln.t0 < ln.typeDur + 0.6 && cur && (t * 2.5) % 1 < 0.6) { ctx.fillStyle = BLUE; ctx.fillRect(cur[0] + 4, cur[1] - L.fs * 0.8, 3.5, L.fs * 0.95); }
  ctx.restore();
}

// Volumen de la voz por cuadro (0 a 1), para abrir la boca cuando suena.
export function envelope(buffer) {
  const data = buffer.getChannelData(0), step = Math.floor(buffer.sampleRate / FPS), out = [];
  let max = 0;
  for (let i = 0; i < data.length; i += step) {
    let s = 0; const end = Math.min(data.length, i + step);
    for (let j = i; j < end; j++) s += data[j] * data[j];
    const r = Math.sqrt(s / Math.max(1, end - i)); out.push(r); if (r > max) max = r;
  }
  return Float32Array.from(out, (r) => (max ? r / max : 0) * 1.6);
}

// Guion de ejemplo: «Comunicar también es cuidar» (Mi Ruta, Módulo 6).
export const EJEMPLO = {
  title: "Comunicar también es cuidar", fmt: "vertical",
  scenes: [
    { title: "Antes de publicar", sub: "Mi Ruta · Módulo 6 · Comunicación", cast: ["beto", "firu"], firu: "curioso", lines: [
      { who: "beto", text: "Hice un video del grupo.", pose: "celular" }, { who: "beto", text: "¿Lo subo así no más?", pose: "celular" }] },
    { title: "¿Para qué comunicar?", sub: "", cast: ["beto", "firu", "cami"], firu: "sentado", lines: [
      { who: "cami", text: "Espera, míralo primero.", pose: "hola" }, { who: "cami", text: "Publicar sirve para invitar y para acompañar a quien no pudo venir.", pose: "senala" }] },
    { title: "Lo que no se sube", sub: "Permiso de cada persona. Y de los padres, si es menor.", cast: ["beto", "firu", "cami"], firu: "curioso", lines: [
      { who: "cami", text: "Pero hay cosas que no se suben.", pose: "reposo" }, { who: "cami", text: "Caras, nombres o datos de menores sin permiso.", pose: "senala" },
      { who: "beto", text: "Mmm… ¿y si alguien no quiere salir?", pose: "encogido", gesto: "esceptico" }, { who: "cami", text: "Entonces no sale. Se pide permiso, siempre.", pose: "reposo" }] },
    { title: "Inteligencia artificial", sub: "y mensajes privados", cast: ["beto", "firu", "cami", "sam"], firu: "sentado", lines: [
      { who: "sam", text: "Y algo más.", pose: "mate" }, { who: "sam", text: "Si la voz o la imagen se hizo con inteligencia artificial, se dice.", pose: "mate" },
      { who: "sam", text: "Cada red tiene su etiqueta.", pose: "mate" }, { who: "sam", text: "Y los mensajes privados los responde siempre una persona real.", pose: "mate" }] },
    { title: "El tono", sub: "", cast: ["beto", "firu", "cami", "sam"], firu: "contento", lines: [
      { who: "cami", text: "Sin apuro. Una idea por mensaje.", pose: "senala" }, { who: "beto", text: "Y que suene a nosotros.", pose: "reposo" },
      { who: "cami", text: "Comunicar también es cuidar.", pose: "hola" }] },
  ],
  cierre: { on: true, title: "Comunicar también es *cuidar*", items: ["Permiso antes de publicar", "Sin datos de menores", "Etiqueta si hay IA"], pie: "Aprende más en Mi Ruta · *agAPPe*", web: "pj-agape.github.io" },
};
