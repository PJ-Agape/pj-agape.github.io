// Estudio de difusión: cada miembro arma sus propias piezas para compartir en Estados,
// historias y grupos. Todo se dibuja en el teléfono: la foto de perfil nunca se sube.

import * as E from "./estudio.js";
import { sceneLabel } from "./ilustraciones.js";
import * as F from "./fondos.js";
import * as cloud from "./cloud.js";
import * as S from "./store.js";
import { esc, icon, toast } from "./util.js";
import { nextOn } from "./repeat.js";

const $ = (s, r = document) => r.querySelector(s);
// Los códigos QR siempre llevan al sitio oficial (también desde el sitio de prueba).
const LIVE = "https://pj-agape.github.io/Formacion_Monitores/";
const BASE = () => (/pj-agape\.github\.io$/.test(location.hostname) ? location.href.split("#")[0] : LIVE);
const URLS = {
  app: () => BASE(),
  puente: () => new URL("presentaciones/se-puente.html", BASE()).href,
  familias: () => new URL("familias/", BASE()).href,
};
const FORMATS = { historia: [1080, 1920, "Historia o Estado"], post: [1080, 1350, "Post"], cuadrado: [1080, 1080, "Cuadrado"] };
const ILLS = ["jesus", "emaus", "dejadlos", "buenpastor", "sagradocorazon", "virgen", "jose", "sagradafamilia", "apostoles", "sanmiguel", "sansebastian", "juanpablo", "carloacutis", "teresaandes", "albertohurtado", "santoschile", "virgencarmen", "donbosco", "teresita", "franciscoasis", "rey", "comunidad", "amigos", "acogida", "corazon", "camino", "oracion", "equipo", "juego", "biblia", "espiritu", "maria", "eucaristia", "servir", "familia", "luz", "panes", "santos", "levantate", "futuro", "flores"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

let ctx = null;
const st = { tab: "piezas", tpl: "frase", fmt: "historia", style: "cielo", qr: "app", ill: "corazon", title: "", hand: "", sub: "", kicker: "", ev: "", para: "", frame: "soy", fondo: "bomba", fsize: "celular", zoom: 1, dx: 0, dy: 0, photo: null, phrase: 0, flogo: "sin", ffrase: "" };
let events = [];

export function setup(c) { ctx = c; registerActions(); }

const pad2 = (n) => String(n).padStart(2, "0");
const isoDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const clean = (t) => String(t || "").replace(/\s*\(ejemplo\)\s*/i, "").trim();
const myName = () => ((cloud.enabled && cloud.state().account?.name) || S.getProfile()?.name || "").split(" ")[0];

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
export async function view() {
  const today = isoDay(new Date());
  events = (await cloud.listAgenda().catch(() => [])).map((e) => ({ ...e, when: nextOn(e, today) || e.date })).filter((e) => e.when && e.when >= today).sort((a, b) => a.when.localeCompare(b.when)).slice(0, 12);
  if (!st.ev && events[0]) st.ev = events[0].id;
  ctx.onAfterRender(() => { E.ready().then(paint); });
  return `<header class="page-head"><span class="eyebrow">Difusión</span><h1>Estudio de <em>difusión</em></h1>
    <p>Arma piezas con la identidad de Ágape para tus Estados, historias y grupos. Se hacen en tu teléfono y las descargas o compartes al instante.</p></header>
    <div class="dif-tabs seg" role="tablist" aria-label="Qué quieres hacer">
      ${[["piezas", "Historias y posts"], ["marco", "Marco de foto"], ["stickers", "Stickers"], ["fondos", "Fondos de pantalla"]].map(([k, l]) => `<label><input type="radio" name="difTab" value="${k}" ${st.tab === k ? "checked" : ""}><span>${l}</span></label>`).join("")}
    </div>
    <div id="difBody" style="margin-top:16px">${body()}</div>`;
}
function body() { return st.tab === "marco" ? marcoHTML() : st.tab === "stickers" ? stickersHTML() : st.tab === "fondos" ? fondosHTML() : piezasHTML(); }

// --- Historias, posts e invitaciones ---------------------------------------
const TPLS = [["frase", "Frase de Ágape"], ["evento", "Actividad de la agenda"], ["cuenta", "Cuenta regresiva"], ["invita", "Invitación personal"]];
function piezasHTML() {
  const sel = (name, opts, cur) => `<select class="input" data-dif="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const evOpts = events.length ? events.map((e) => [e.id, `${fmtDate(e.when)} · ${clean(e.title)}`]) : [["", "No hay actividades próximas"]];
  return `<div class="dif-grid">
    <div class="dif-prev"><canvas id="difCanvas" aria-label="Vista previa de la pieza"></canvas></div>
    <form class="card stack dif-form" id="difForm" onsubmit="return false">
      <div class="field"><label>Plantilla</label>${sel("tpl", TPLS, st.tpl)}</div>
      ${st.tpl === "frase" ? `<div class="field"><label>Frase</label>${sel("phrase", E.PHRASES.map((p, i) => [i, p.title.replace(/\*/g, "")]), st.phrase)}</div>` : ""}
      ${st.tpl === "evento" || st.tpl === "cuenta" ? `<div class="field"><label>Actividad</label>${sel("ev", evOpts, st.ev)}</div>` : ""}
      ${st.tpl === "invita" ? `<div class="field"><label>¿A quién invitas?</label><input class="input" data-dif="para" maxlength="24" value="${esc(st.para)}" placeholder="Su nombre (opcional)"></div>` : ""}
      <div class="field"><label>Formato</label>${sel("fmt", Object.entries(FORMATS).map(([k, v]) => [k, v[2]]), st.fmt)}</div>
      <div class="field"><label>Estilo</label><div class="dif-sw" role="radiogroup" aria-label="Estilo">${E.STYLES.map((x) => `<button type="button" role="radio" aria-checked="${st.style === x.id}" title="${esc(x.name)}" data-action="difStyle" data-v="${x.id}" style="--a:${x.bg};--b:${x.split || x.b1}"><span class="sr-only">${esc(x.name)}</span></button>`).join("")}</div></div>
      <div class="field"><label>Dibujo o foto</label>${sel("ill", [...(st.photo ? [["__foto", "Mi foto"]] : []), ...ILLS.map((k) => [k, sceneLabel(k)])], st.photo && st.ill === "__foto" ? "__foto" : st.ill)}
        ${photoBtn()}</div>
      <details class="dif-more"><summary>Cambiar los textos</summary>
        <div class="stack" style="margin-top:10px">
          <div class="field"><label>Título <span class="muted">(lo que va entre *asteriscos* lleva marcador)</span></label><input class="input" data-dif="title" maxlength="60" value="${esc(st.title)}"></div>
          <div class="field"><label>Frase a mano</label><input class="input" data-dif="hand" maxlength="34" value="${esc(st.hand)}"></div>
          <div class="field"><label>Detalle</label><input class="input" data-dif="sub" maxlength="70" value="${esc(st.sub)}"></div>
        </div></details>
      <div class="field"><label>Código QR</label>${sel("qr", [["", "Sin código"], ["app", "A la app de Ágape"], ["puente", "A «Sé puente» (para invitar)"], ["familias", "A la página para familias"]], st.qr)}</div>
      ${actionsHTML()}
    </form></div>`;
}
// Botón para usar una foto del dispositivo (se queda en el teléfono: no se sube a ninguna parte)
const photoBtn = () => `<label class="btn btn-soft btn-sm dif-file" style="margin-top:8px">${st.photo ? "Cambiar foto" : "Usar una foto mía"}<input type="file" accept="image/*" id="difPhoto" class="sr-only"></label>
  ${st.photo ? `<span class="xs muted" style="display:block;margin-top:4px">Tu foto se queda en tu dispositivo: no se sube a ninguna parte.</span>` : ""}`;
const actionsHTML = () => `<div class="row-wrap" style="gap:8px">
  <button type="button" class="btn btn-primary" data-action="difShare">${icon("send")} Compartir</button>
  <button type="button" class="btn btn-ghost" data-action="difSave">${icon("dl")} Descargar</button></div>`;

function fmtDate(iso) { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); return `${DIAS[dt.getDay()]} ${d} ${MESES[m - 1]}`; }
// Datos de la pieza según la plantilla (los textos que el usuario cambió mandan).
function pieceData() {
  let d = {};
  const e = events.find((x) => x.id === st.ev);
  if (st.tpl === "frase") { const p = E.PHRASES[st.phrase] || E.PHRASES[0]; d = { title: p.title, hand: p.hand, sub: "Parroquia San Miguel de Yungay", ill: p.ill }; }
  if (st.tpl === "evento" && e) {
    const [, m, dd] = e.when.split("-").map(Number);
    d = { kicker: fmtDate(e.when), title: clean(e.title), hand: "¡Te esperamos!", sub: [e.place, e.start && (e.end ? `${e.start} a ${e.end}` : e.start)].filter(Boolean).join(" · "), day: dd, mon: MESES[m - 1] };
  }
  if (st.tpl === "cuenta" && e) {
    const [y, m, dd] = e.when.split("-").map(Number), n = Math.max(0, Math.round((new Date(y, m - 1, dd) - new Date(new Date().toDateString())) / 864e5));
    d = { big: n, bigLabel: n === 1 ? "día" : "días", hand: n ? "Faltan…" : "¡Es hoy!", title: `para *${clean(e.title)}*`, sub: fmtDate(e.when) + (e.start ? ` · ${e.start}` : "") };
  }
  if (st.tpl === "invita") d = { kicker: "Invitación", title: st.para ? `*${st.para}*, hay un lugar para ti` : "Hay un lugar *para ti*", hand: myName() ? `${myName()} te invita` : "Te invito", sub: "Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay" };
  if ((st.tpl === "evento" || st.tpl === "cuenta") && !e) d = { title: "Pronto *nuevas actividades*", hand: "Atento a la agenda" };
  if (st.title) d.title = st.title;
  if (st.hand) d.hand = st.hand;
  if (st.sub) d.sub = st.sub;
  d.ill = st.ill === "__foto" && st.photo ? st.photo : st.ill === "__foto" ? "corazon" : st.ill;
  if (st.qr) { d.qr = URLS[st.qr](); d.qrLabel = st.qr === "familias" ? "Familias" : st.qr === "puente" ? "Mira esto" : "Súmate"; }
  return d;
}

// --- Marco de foto -----------------------------------------------------------
function marcoHTML() {
  return `<div class="dif-grid">
    <div class="dif-prev square"><canvas id="difCanvas" aria-label="Vista previa del marco"></canvas></div>
    <form class="card stack dif-form" onsubmit="return false">
      <label class="btn btn-primary dif-file">${icon("plus")} ${st.photo ? "Cambiar foto" : "Elegir mi foto"}<input type="file" accept="image/*" id="difPhoto" class="sr-only"></label>
      <p class="small muted">Tu foto se queda en tu teléfono: no se sube a ninguna parte.</p>
      <div class="field"><label>Marco</label><div class="dif-frames">${E.FRAMES.map((f) => `<button type="button" aria-pressed="${st.frame === f.id}" data-action="difFrame" data-v="${f.id}" title="${esc(f.text.replace(/·/g, "").trim())}"><canvas data-fthumb="${f.id}" width="160" height="160"></canvas></button>`).join("")}</div></div>
      ${st.photo ? `<div class="field"><label>Acercar</label><input type="range" min="1" max="3" step="0.02" value="${st.zoom}" data-dif="zoom"></div>
      <div class="field"><label>Mover</label><div class="row" style="gap:10px"><input type="range" min="-1" max="1" step="0.01" value="${st.dx}" data-dif="dx" aria-label="Mover a los lados"><input type="range" min="-1" max="1" step="0.01" value="${st.dy}" data-dif="dy" aria-label="Mover arriba o abajo"></div></div>` : ""}
      ${actionsHTML()}
    </form></div>`;
}

// --- Stickers ----------------------------------------------------------------
const STK_IGLESIA = ["leon", "francisco", "benedicto", "juanpablo", "juanpablo2", "samuel", "samuelmisa", "samuelmate", "samueloro", "samuelauto", "samueladora", "curaorando", "curapalabra", "curasaludo", "curaalba", "bendicion", "custodia", "adoracion", "campo", "parroquia", "catedral"];
const stkLit = (k) => k.startsWith("l_");
const STK_CHILE = ["virgencarmen", "teresaandes", "albertohurtado", "santoschile"];
const STK_SANTOS = ["donbosco", "carloacutis", "teresita", "franciscoasis", "sansebastian", "sanmiguel", "jose", "sagradafamilia", "apostoles"];
const STK_JESUS = ["jesus", "emaus", "buenpastor", "sagradocorazon", "dejadlos", "rey", "virgen", "maria", "espiritu", "eucaristia"];
const stkGroup = (k) => STK_IGLESIA.includes(k) ? 0 : stkLit(k) ? 1 : STK_CHILE.includes(k) ? 2 : STK_SANTOS.includes(k) ? 3 : STK_JESUS.includes(k) ? 4 : k.startsWith("pj:") ? 6 : 5;
const STK_GROUPS = ["Nuestra Iglesia", "Año litúrgico y sacramentos", "Santos de Chile", "Santos y amigos de Dios", "Jesús y María", "Para el grupo", "Personajes"];
function stickersHTML() {
  const items = E.STICKERS.map(([k, t], i) => ({ k, t, i, g: stkGroup(k) }));
  return `<div class="card" style="margin-bottom:14px"><p class="small">Toca un sticker para compartirlo o guardarlo. Para tenerlos en WhatsApp, guárdalos y súmalos con una app de stickers (por ejemplo «Sticker Maker»).</p>
    <div class="row-wrap" style="gap:6px;margin-top:8px">${STK_GROUPS.map((g, n) => `<a class="chip" href="#" data-action="difStkGo" data-g="${n}">${g}</a>`).join("")}</div></div>
    ${STK_GROUPS.map((g, n) => `<h3 class="dif-stk-h" id="stkg${n}">${g} <small class="muted">${items.filter((x) => x.g === n).length}</small></h3>
    <div class="dif-stk">${items.filter((x) => x.g === n).map(({ t, i }) => `<button type="button" data-action="difSticker" data-i="${i}" title="${esc(t)}"><canvas data-stk="${i}" width="512" height="512" aria-label="${esc(t)}"></canvas></button>`).join("")}</div>`).join("")}`;
}

// --- Fondos de pantalla ------------------------------------------------------
function fondosHTML() {
  const [tw, th] = st.fsize === "pc" ? [256, 144] : [135, 292];
  return `<div class="dif-grid">
    <div class="dif-prev ${st.fsize === "pc" ? "wide" : "tall"}"><canvas id="difCanvas" aria-label="Vista previa del fondo"></canvas></div>
    <form class="card stack dif-form" onsubmit="return false">
      <div class="field"><label>Para</label><div class="seg" role="radiogroup" aria-label="Para qué pantalla">${Object.entries(F.SIZES).map(([k, v]) => `<label><input type="radio" name="difFsize" value="${k}" ${st.fsize === k ? "checked" : ""}><span>${v[2]}</span></label>`).join("")}</div></div>
      <div class="field"><label>Diseño</label><div class="dif-fondos ${st.fsize}">${[...(st.photo ? [["foto", "Mi foto"]] : []), ...F.FONDOS].map(([k, l]) => `<button type="button" aria-pressed="${st.fondo === k}" data-action="difFondo" data-v="${k}" title="${esc(l)}"><canvas data-fondo="${k}" width="${tw}" height="${th}" aria-label="${esc(l)}"></canvas></button>`).join("")}</div></div>
      <div class="ag-form-row" style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        <div class="field"><label>Logo</label><select class="select" data-fop="logo">${F.LOGOS.map(([v, l]) => `<option value="${v}" ${st.flogo === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="field"><label>Frase</label><select class="select" data-fop="frase">${F.FRASES.map((v) => `<option value="${esc(v)}" ${st.ffrase === v ? "selected" : ""}>${v ? esc(v) : "Sin frase"}</option>`).join("")}</select></div>
      </div>
      ${photoBtn()}
      <p class="small muted">Sirven como fondo de pantalla, pantalla de bloqueo o protector de pantalla. En el celular, el logo queda bajo la hora.</p>
      ${actionsHTML()}
    </form></div>`;
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------
let painting = 0;
async function paint() {
  const id = ++painting;
  if (st.tab === "stickers") {
    await E.preload(E.STICKERS.flatMap(([k, , c]) => E.stickerIlls(k, c)));
    for (const [i, [k, t, c, sinFrase]] of E.STICKERS.entries()) {
      const cv = document.querySelector(`[data-stk="${i}"]`); if (!cv || id !== painting) return;
      E.sticker(cv.getContext("2d"), k, sinFrase ? "" : t, c);
      if (i % 6 === 5) await new Promise((r) => setTimeout(r));
    }
    return;
  }
  const cv = $("#difCanvas"); if (!cv) return;
  if (st.tab === "fondos") {
    await F.ready(); if (id !== painting) return;
    F.setOptions({ logo: st.flogo, frase: st.ffrase });
    const [W, H] = F.SIZES[st.fsize];
    cv.width = W; cv.height = H; F.fondo(cv.getContext("2d"), W, H, st.fondo, st.photo);
    for (const c of document.querySelectorAll("[data-fondo]")) {
      if (id !== painting) return;
      if (!c.dataset.done) { F.fondo(c.getContext("2d"), c.width, c.height, c.dataset.fondo, st.photo); c.dataset.done = 1; await new Promise((r) => setTimeout(r)); }
    }
    return;
  }
  if (st.tab === "marco") {
    await E.preload(E.framesIlls()); if (id !== painting) return;
    cv.width = cv.height = 1080;
    E.frame(cv.getContext("2d"), 1080, st.frame, st.photo, st);
    document.querySelectorAll("[data-fthumb]").forEach((c) => { if (!c.dataset.done) { E.frame(c.getContext("2d"), 160, c.dataset.fthumb, null); c.dataset.done = 1; } });
    return;
  }
  const [W, H] = FORMATS[st.fmt], d = pieceData();
  await E.preload(E.illsFor(st.style, d)); if (id !== painting) return;
  cv.width = W; cv.height = H;
  E.piece(cv.getContext("2d"), W, H, st.style, d);
}

function fileName() {
  if (st.tab === "marco") return `agape-marco-${st.frame}.png`;
  if (st.tab === "fondos") return `agape-fondo-${st.fsize}-${st.fondo}.png`;
  return `agape-${st.tpl}-${st.fmt}.png`;
}
const toBlob = (cv) => new Promise((ok) => cv.toBlob(ok, "image/png"));
function save(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function share(blob, name) {
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  save(blob, name); toast("Imagen descargada");
}

function registerActions() {
  const A = ctx.actions;
  A.difTab = (t) => { st.tab = t.value; $("#difBody").innerHTML = body(); paint(); };
  A.difStyle = (t) => { st.style = t.dataset.v; document.querySelectorAll(".dif-sw button").forEach((b) => b.setAttribute("aria-checked", String(b === t))); paint(); };
  A.difFondo = (t) => { st.fondo = t.dataset.v; document.querySelectorAll(".dif-fondos button").forEach((b) => b.setAttribute("aria-pressed", String(b === t))); paint(); };
  A.difFrame = (t) => { st.frame = t.dataset.v; document.querySelectorAll(".dif-frames button").forEach((b) => b.setAttribute("aria-pressed", String(b === t))); paint(); };
  A.difSave = async () => { const cv = $("#difCanvas"); if (cv) save(await toBlob(cv), fileName()); };
  A.difShare = async () => { const cv = $("#difCanvas"); if (cv) share(await toBlob(cv), fileName()); };
  A.difStkGo = (t, e) => { e && e.preventDefault && e.preventDefault(); document.getElementById("stkg" + t.dataset.g)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  A.difSticker = async (t) => { const cv = t.querySelector("canvas"); share(await toBlob(cv), `agape-sticker-${+t.dataset.i + 1}.png`); };
  // Tabs: el radio necesita su cambio de estado, así que no basta con el clic delegado
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "difTab") return A.difTab(t);
    if (t.name === "difFsize") { st.fsize = t.value; $("#difBody").innerHTML = body(); return paint(); }
    if (t.id === "difPhoto" && t.files[0]) return loadPhoto(t.files[0]);
    const k = t.dataset && t.dataset.dif; if (!k) return;
    onField(k, t.value, true);
  });
  document.addEventListener("change", (e) => {
    const k = e.target.dataset && e.target.dataset.fop; if (!k) return;
    st[k === "logo" ? "flogo" : "ffrase"] = e.target.value;
    document.querySelectorAll("[data-fondo]").forEach((c) => delete c.dataset.done);
    paint();
  });
  document.addEventListener("input", (e) => {
    const k = e.target.dataset && e.target.dataset.dif;
    if (k && (e.target.type === "range" || e.target.tagName === "INPUT")) onField(k, e.target.value, false);
  });
}
function onField(k, v, changed) {
  if (k === "zoom" || k === "dx" || k === "dy") { st[k] = +v; return paint(); }
  if (k === "phrase") st.phrase = +v;
  else st[k] = v;
  // cambiar de plantilla o de contenido base vuelve a los textos sugeridos
  if (changed && (k === "tpl" || k === "phrase" || k === "ev")) {
    st.title = st.hand = st.sub = "";
    if (k === "phrase") st.ill = (E.PHRASES[st.phrase] || {}).ill || st.ill;
    if (k === "tpl") { st.ill = { frase: (E.PHRASES[st.phrase] || {}).ill, evento: "camino", cuenta: "juego", invita: "amigos" }[v] || st.ill; st.qr = v === "invita" ? "puente" : st.qr || "app"; }
    $("#difBody").innerHTML = body();
  }
  paint();
}
function loadPhoto(file) {
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    st.photo = img; st.zoom = 1; st.dx = st.dy = 0;
    if (st.tab === "piezas") st.ill = "__foto";
    if (st.tab === "fondos") st.fondo = "foto";
    $("#difBody").innerHTML = body(); paint();
  };
  img.onerror = () => toast("No pude abrir esa imagen", "error");
  img.src = url;
}
