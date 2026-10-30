// Capilla Ágape: la sección de oración como una capilla virtual.
// Rincones: entrada (oración según la hora y tiempo litúrgico), «Un rato con Jesús» (oración personal),
// velas de la comunidad, la Palabra, María (misterios del día) y oraciones.

import { esc, rich, icon, toast, fetchJSON } from "./util.js";
import { ORACIONES } from "./devocionario.js";
import * as papa from "./papa.js";
import { illus } from "./ilustraciones.js";
import * as E from "./entrada.js";
import * as AD from "./agape-digital.js";
import * as F from "./fiestas.js";
import * as DS from "./descubre.js";
import * as TP from "./temporadas.js";
import { avatar } from "./avatares.js";

// Misa en vivo: la de hoy del canal de Magnificat TV (data/misa-vivo.json, la busca cada hora la
// acción del Evangelio). Si hoy no hay, el enlace que dejó el administrador (content/misaVivo) o la
// página de transmisiones del canal.
const MISA_VIVO = "https://www.youtube.com/@magnificat.tv-fm/streams";
let misaVivo = MISA_VIVO, misaAdmin = "", misaHoy = null, misaVivoAt = 0;
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
async function loadMisaVivo() {
  if (Date.now() - misaVivoAt > 10 * 60 * 1000) {
    misaVivoAt = Date.now();
    const [auto, c] = await Promise.all([
      fetchJSON("data/misa-vivo.json", 10 * 60 * 1000).catch(() => null),
      ctx.cloud.enabled ? ctx.cloud.getMisaVivo().catch(() => null) : null,
    ]);
    misaHoy = (auto && auto.days && auto.days[hoyISO()]) || null;
    misaAdmin = (c && c.url) || "";
  }
  misaVivo = misaHoy ? `https://www.youtube.com/watch?v=${misaHoy.id}` : misaAdmin || MISA_VIVO;
  const box = document.getElementById("capMisa"); if (box) box.innerHTML = misaHTML();
}
// La Misa de hoy con su vista previa (el video se carga solo al tocarlo, como el Evangelio).
function misaHTML() {
  const ok = misaHoy && /^[\w-]{6,20}$/.test(misaHoy.id);
  if (!ok) return `<a class="btn cap-oremus" href="${esc(misaVivo)}" target="_blank" rel="noopener">${icon("eye")} Misa en vivo <small>en YouTube</small></a>`;
  // «Santa Misa de Hoy | Viernes, XXIX Semana del Tiempo Ordinario (23-10-2026) | P. …» → la parte del medio.
  const sub = (misaHoy.title.split("|")[1] || "").replace(/\(\d{1,2}[-./]\d{1,2}[-./]\d{4}\)/, "").trim();
  return `<button type="button" class="ev-video" data-action="evPlay" data-id="${misaHoy.id}" data-t="La Misa de hoy" aria-label="Ver la Misa de hoy">
      <img src="https://i.ytimg.com/vi/${misaHoy.id}/hqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">
      <span class="ev-play" aria-hidden="true"></span></button>
    <p class="cap-ev-note">${sub ? `${esc(sub)} · ` : ""}Magnificat TV · <a href="${esc(misaVivo)}" target="_blank" rel="noopener">abrir en YouTube ↗</a></p>`;
}
let ctx = null; // { actions, render, onAfterRender, onLeave, cloud, content }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();

// ---------------------------------------------------------------------------
// Calendario: tiempo litúrgico aproximado (para el color y el saludo)
// ---------------------------------------------------------------------------
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export function season(now = new Date()) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()), y = t.getFullYear();
  const xmas = new Date(y, 11, 25);
  const adv = addDays(xmas, -(((xmas.getDay() + 6) % 7) + 1) - 21); // 4.º domingo antes de Navidad
  const e = easter(y), ash = addDays(e, -46), pent = addDays(e, 49);
  const ep = new Date(y, 0, 6), bapt = addDays(ep, 7 - ep.getDay() || 7); // domingo después de Epifanía (aprox.)
  if (t >= adv && t < xmas) return { key: "adviento", name: "Adviento", color: "morado", hex: "#7b4fa3", hint: "Preparamos el corazón para recibir a Jesús." };
  if (t >= xmas || t <= bapt) return { key: "navidad", name: "Navidad", color: "blanco", hex: "#ffba03", hint: "Dios se hizo uno de nosotros." };
  if (t >= ash && t < addDays(e, -3)) return { key: "cuaresma", name: "Cuaresma", color: "morado", hex: "#7b4fa3", hint: "Tiempo para volver a Dios con todo el corazón." };
  if (t >= addDays(e, -3) && t < e) return { key: "triduo", name: "Triduo Pascual", color: "rojo", hex: "#c62f2f", hint: "Acompañamos a Jesús en su entrega por amor." };
  if (t >= e && t <= pent) return { key: "pascua", name: "Pascua", color: "blanco", hex: "#ffba03", hint: "¡Cristo vive! Y nos quiere vivos." };
  return { key: "ordinario", name: "Tiempo Ordinario", color: "verde", hex: "#3f8f4e", hint: "Jesús camina con nosotros en lo de cada día." };
}

// Oración según el momento del día
const MOMENTS = [
  { from: 5, to: 12, key: "manana", label: "Oración de la mañana", hand: "buenos días, Señor",
    text: "Señor, te entrego este día que comienza.\nMis manos, para servir.\nMis ojos, para mirar con cariño.\nMi corazón, para amar como Tú.\nAmén." },
  { from: 12, to: 15, key: "mediodia", label: "Al mediodía, con María", hand: "un alto en el camino",
    text: "El ángel del Señor anunció a María,\ny concibió por obra del Espíritu Santo.\n\nMaría, enséñame a decir como tú:\n«Aquí estoy, hágase en mí según tu palabra».\nAmén." },
  { from: 15, to: 20, key: "tarde", label: "Oración de la tarde", hand: "sigue conmigo",
    text: "Señor, en medio de lo que estoy viviendo,\nquiero detenerme un momento contigo.\nDame paciencia con los demás y conmigo,\ny fuerza para terminar bien este día.\nAmén." },
  { from: 20, to: 29, key: "noche", label: "Oración de la noche", hand: "en tus manos",
    text: "Gracias, Señor, por este día.\nPerdona lo que no hice bien.\nCuida a los que amo y a los que me cuesta amar.\nDame un descanso en paz.\nEn tus manos me pongo.\nAmén." },
];
const moment = (d = new Date()) => { const h = d.getHours() < 5 ? d.getHours() + 24 : d.getHours(); return MOMENTS.find((m) => h >= m.from && h < m.to) || MOMENTS[3]; };

// Palabra para el silencio (una por día)
const VERSES = [
  ["Vengan a mí todos los que están cansados, y yo los aliviaré.", "Mt 11,28"],
  ["Permanezcan en mi amor.", "Jn 15,9"],
  ["No temas, porque yo estoy contigo.", "Is 41,10"],
  ["Yo estoy con ustedes todos los días.", "Mt 28,20"],
  ["El Señor es mi pastor, nada me falta.", "Sal 23,1"],
  ["Ya no los llamo siervos, los llamo amigos.", "Jn 15,15"],
  ["Quédate con nosotros, Señor.", "Lc 24,29"],
  ["Ustedes son la luz del mundo.", "Mt 5,14"],
  ["Ámense los unos a los otros como yo los he amado.", "Jn 13,34"],
  ["Habla, Señor, que tu siervo escucha.", "1 Sam 3,9"],
];
const dayIndex = (n) => { const d = new Date(); return (d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % n; };

// Misterios del Rosario según el día
const MYST = {
  gozosos: { name: "Misterios gozosos", items: ["La Anunciación del ángel a María", "La Visitación de María a su prima Isabel", "El Nacimiento de Jesús en Belén", "La Presentación de Jesús en el Templo", "Jesús perdido y hallado en el Templo"] },
  luminosos: { name: "Misterios luminosos", items: ["El Bautismo de Jesús en el Jordán", "Jesús en las bodas de Caná", "Jesús anuncia el Reino de Dios", "La Transfiguración", "Jesús nos deja la Eucaristía"] },
  dolorosos: { name: "Misterios dolorosos", items: ["Jesús ora en el huerto", "Jesús es azotado", "Jesús es coronado de espinas", "Jesús carga la cruz", "Jesús muere en la cruz"] },
  gloriosos: { name: "Misterios gloriosos", items: ["La Resurrección de Jesús", "La Ascensión de Jesús al cielo", "La venida del Espíritu Santo", "La Asunción de María", "María, Reina del cielo y de la tierra"] },
};
const MYST_BY_DAY = ["gloriosos", "gozosos", "dolorosos", "gloriosos", "luminosos", "dolorosos", "gozosos"]; // dom..sáb
const DAYNAME = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Oraciones base (las usa el Rosario virtual)
const CLASSIC = [
  ["Padre nuestro", "Padre nuestro, que estás en el cielo,\nsantificado sea tu Nombre;\nvenga a nosotros tu reino;\nhágase tu voluntad en la tierra como en el cielo.\nDanos hoy nuestro pan de cada día;\nperdona nuestras ofensas,\ncomo también nosotros perdonamos a los que nos ofenden;\nno nos dejes caer en la tentación,\ny líbranos del mal.\nAmén."],
  ["Ave María", "Dios te salve, María, llena eres de gracia,\nel Señor es contigo.\nBendita tú eres entre todas las mujeres,\ny bendito es el fruto de tu vientre, Jesús.\nSanta María, Madre de Dios,\nruega por nosotros, pecadores,\nahora y en la hora de nuestra muerte.\nAmén."],
  ["Gloria", "Gloria al Padre, y al Hijo, y al Espíritu Santo.\nComo era en el principio, ahora y siempre,\npor los siglos de los siglos.\nAmén."],
  ["Ven, Espíritu Santo", "Ven, Espíritu Santo,\nllena los corazones de tus fieles\ny enciende en ellos el fuego de tu amor.\nEnvía tu Espíritu, y todo será creado,\ny renovarás la faz de la tierra."],
  ["Ángel de la guarda", "Ángel de mi guarda,\ndulce compañía,\nno me desampares\nni de noche ni de día.\nNo me dejes solo,\nque me perdería."],
  ["Salve", "Dios te salve, Reina y Madre de misericordia,\nvida, dulzura y esperanza nuestra.\nDios te salve.\nA ti llamamos los desterrados hijos de Eva;\na ti suspiramos, gimiendo y llorando\nen este valle de lágrimas.\nEa, pues, Señora, abogada nuestra,\nvuelve a nosotros esos tus ojos misericordiosos;\ny después de este destierro muéstranos a Jesús,\nfruto bendito de tu vientre.\n¡Oh clementísima, oh piadosa, oh dulce Virgen María!\nRuega por nosotros, santa Madre de Dios,\npara que seamos dignos de alcanzar\nlas promesas de nuestro Señor Jesucristo.\nAmén."],
];

// Devocionario completo (js/devocionario.js), en el orden de Vatican News
const prayerHTML = (x) => esc(x).split("\n").map((l) => l === "" ? "<span class=\"cap-gap\"></span>"
  : /^[VR]\. /.test(l) ? `<span class="cap-vr"><b>${l[0]}.</b> ${l.slice(3)}</span>` : /^Oremos: /.test(l) ? `<span class="cap-vr"><b>Oremos:</b> ${l.slice(8)}</span>` : `${l}<br>`).join("");
// Radios católicas (se muestran en Inicio): siempre enlazamos a la página oficial de cada una (no a señales de terceros).
export const RADIOS = [
  { name: "Radio María Chile", short: "Radio María", where: "89.3 FM Santiago · a todo Chile por internet", url: "https://radiomaria.cl/" },
  { name: "Radio El Sembrador", short: "El Sembrador", where: "104.7 FM Chillán · Diócesis de Chillán · en su Facebook", url: "https://www.facebook.com/ElSembrador1047/" },
  { name: "Radio Regina Coeli", short: "Regina Coeli", where: "Los Ángeles · Diócesis Santa María de Los Ángeles", url: "https://reinadelcielo.cl/radio/" },
];

// Las oraciones de siempre se agrupan por tema para elegirlas en una lista (una sola tarjeta abierta a la vez).
const DEV_GROUPS = [
  ["Las de cada día", ["Padre nuestro", "Ave María", "Gloria al Padre", "Credo", "Ángel de Dios", "Acto de Contrición"]],
  ["Con Jesús", ["Alma de Cristo", "Comunión espiritual", "Coronilla de la Divina Misericordia", "Acto de caridad", "Benedictus", "Te Deum", "El eterno reposo"]],
  ["Con María", ["Rosario", "Salve Regina", "Bajo tu amparo", "Acordaos", "Ángelus", "Regina Coeli", "Magnificat", "Acto de Consagración al Corazón Inmaculado de María"]],
  ["Al Espíritu Santo", ["Ven Santo Espíritu", "Veni Creator"]],
  ["Por la Iglesia y los santos", ["Oración por el Papa", "Oración a San José", "Oración a la Sagrada Familia", "San Miguel Arcángel"]],
];
// Las oraciones propias de la comunidad (Gestión → Oración) van en el mismo selector, con su etiqueta.
let OWN = [];
// Oraciones propias (Gestión → Oración), sin la guía «Orar con la Palabra», que ahora es una presentación.
function loadOwn() {
  const cards = ((ctx.content().devotional || {}).cards) || [];
  const lectio = cards.find((c) => c.type === "list" && /palabra|biblia/i.test((c.title || "") + (c.tag || "")));
  OWN = cards.filter((c) => c !== lectio && c.title).map((c) => ({ t: c.title, own: c }));
}
const OWN_LABEL = "Nuestras oraciones";
const devAll = () => [...OWN, ...ORACIONES];
const devFind = (t) => devAll().find((o) => o.t === t);
const devGroups = () => {
  const used = new Set(), out = [[OWN_LABEL, OWN], ...DEV_GROUPS.map(([g, ts]) => [g, ts.map((t) => ORACIONES.find((o) => o.t === t)).filter(Boolean)])];
  out.forEach(([, xs]) => xs.forEach((o) => used.add(o.t)));
  const rest = ORACIONES.filter((o) => !used.has(o.t)); // si se agrega una oración nueva, igual aparece
  if (rest.length) out.push(["Otras", rest]);
  return out.filter(([, xs]) => xs.length);
};
const DEV_KEY = "agape_cap_oracion";
const devCurrent = () => { let t = ""; try { t = sessionStorage.getItem(DEV_KEY) || ""; } catch {} return devFind(t) ? t : "Padre nuestro"; };
const projBtn = (o) => (devSlides(o).length > 1 ? `<button type="button" class="btn btn-sm btn-primary cap-dev-proj" data-action="capProject">${icon("eye")} Proyectar</button>` : "");
function devCardHTML(o) {
  if (!o) return "";
  return devCardInner(o) + projBtn(o);
}
function devCardInner(o) {
  const grp = (devGroups().find(([, xs]) => xs.includes(o)) || [""])[0];
  if (o.own) {
    const c = o.own;
    return `<span class="eyebrow">${esc(OWN_LABEL)}${c.tag ? ` · ${esc(c.tag)}` : ""}</span><h3>${esc(o.t)}</h3>
      ${c.type === "list" ? `<ol class="cap-steps">${(c.items || []).map((i) => `<li>${rich(String(i).replace(/<strong>\s*\d+\.\s*/i, "<strong>"))}</li>`).join("")}</ol>`
        : `<p class="cap-prayer">${rich(String(c.text || "").replace(/^«|»$/g, "")).replace(/\n/g, "<br>")}</p>`}`;
  }
  return `<span class="eyebrow">${esc(grp)}</span><h3>${esc(o.t)}</h3>
    ${o.note ? `<p class="cap-pr-note">${esc(o.note)}</p>` : ""}
    ${o.x ? `<p class="cap-prayer">${prayerHTML(o.x)}</p>` : ""}
    ${o.url || o.go ? `<div class="row-wrap">
      ${o.url ? `<a class="btn btn-sm btn-soft" href="${o.url}" target="_blank" rel="noopener">${icon("book")} Rezarla en Vatican News</a>` : ""}
      ${o.go ? `<button type="button" class="btn btn-sm btn-gold" data-action="capRosario">${icon("right")} Rezarlo con el rosario virtual</button>` : ""}
    </div>` : ""}`;
}
function devocionarioHTML() {
  const cur = devCurrent();
  return `<div class="cap-devpick">
      <label class="cap-devsel"><span>Elige una oración</span>
        <select class="input" id="capDevSel">${devGroups().map(([g, xs]) => `<optgroup label="${esc(g)}">${xs.map((o) => `<option value="${esc(o.t)}" ${o.t === cur ? "selected" : ""}>${esc(o.t)}</option>`).join("")}</optgroup>`).join("")}</select>
      </label>
    </div>
    <article class="card cap-devcard" id="capDevCard" aria-live="polite">${devCardHTML(devFind(cur))}</article>
    <p class="muted small" style="margin-top:12px">${OWN.length ? `${OWN.length} oraciones nuestras y ` : ""}${ORACIONES.length} del devocionario de <a href="https://www.vaticannews.va/es/oraciones.html" target="_blank" rel="noopener">Vatican News</a>.</p>`;
}
// Oremus: página propia con el selector de oraciones (está en Materiales y se abre desde la Capilla).
export function oremusView(t) {
  loadOwn();
  if (t && devFind(t)) { try { sessionStorage.setItem(DEV_KEY, t); } catch {} }
  if (t) ctx.onAfterRender(() => setTimeout(() => document.getElementById("capDevCard")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80));
  const CHIPS = ["Padre nuestro", "Ave María", "Gloria al Padre", "Credo", "Ven Santo Espíritu", "Ángel de Dios", "Salve Regina", "Acto de Contrición", "Alma de Cristo", "Bajo tu amparo"].filter((x) => devFind(x));
  return `<div class="oremus">
    ${E.head({ id: "oremus", back: ["#/oracion", "Capilla"], crumb: "Oremus", ico: E.ICO.oremus,
      hand: "recemos juntos", title: "*Oremus*",
      sub: "Nuestras oraciones, para antes y después de cada encuentro, y las que rezamos en toda la Iglesia. Elige una y rézala con calma.",
      side: { hand: "¿Qué quieres rezar?", text: "Las de siempre, a un toque. Abajo están todas.", chips: CHIPS.map((x) => [x, `href="#/oremus/${encodeURIComponent(x)}"`]) },
      guide: { ill: "img/ilus/s086.webp", hand: "para rezar en papel", title: "El librito de *Oremus*", text: "Todas las oraciones, para hojear con calma o imprimir.", btn: ["#/oremus/libro", "Abrir el librito"] } })}
    <section class="ent-lista">
    <h2 class="ent-h">Todas las oraciones</h2>
    ${devocionarioHTML()}
    </section>
    ${E.foot(["Señor, enséñanos a orar", "Lc 11,1"])}
    ${E.volver(undefined, "is-end")}
  </div>`;
}
// Para el librito de Oremus (js/oremus.js): las oraciones por grupo, con el texto en líneas.
// Las que solo se abren en Vatican News (textos con derechos protegidos) no van en el libro.
export function oremusLibro() {
  loadOwn();
  return devGroups().map(([g, xs]) => [g, xs.map((o) => {
    if (o.own) {
      const c = o.own;
      const x = c.type === "list" ? (c.items || []).map((i, k) => `${k + 1}. ${devPlain(rich(String(i))).replace(/^\d+\.\s*/, "")}`).join("\n")
        : devPlain(rich(String(c.text || "").replace(/^«|»$/g, "")).replace(/<br>/g, "\n"));
      return { t: o.t, x, note: c.tag || "", own: true };
    }
    return o.x ? { t: o.t, x: o.x, note: o.note || "" } : null;
  }).filter((o) => o && o.x)]).filter(([, xs]) => xs.length);
}
// Proyectar una oración (como el cancionero): portada con el título y luego el texto en partes cortas.
function devPlain(html) { const d = document.createElement("div"); d.innerHTML = String(html || ""); return d.textContent.trim(); }
function devSlides(o) {
  if (!o) return [];
  let blocks = [];
  if (o.own) {
    const c = o.own;
    blocks = c.type === "list" ? (c.items || []).map((i) => [devPlain(rich(String(i))).replace(/^\d+\.\s*/, "")])
      : String(c.text || "").replace(/^«|»$/g, "").split(/\n\s*\n/).map((b) => b.split("\n"));
  } else if (o.x) blocks = String(o.x).split(/\n\s*\n/).map((b) => b.split("\n"));
  const slides = [];
  for (const b of blocks) {
    const lines = b.map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i += 5) slides.push({ lines: lines.slice(i, i + 5) });
  }
  if (!slides.length) return [];
  const grp = o.own ? OWN_LABEL : (devGroups().find(([, xs]) => xs.includes(o)) || [""])[0];
  return [{ title: o.t, sub: grp }, ...slides];
}
let pj = null; // { slides, i }
function devProject(t) {
  const sl = devSlides(devFind(t)); if (sl.length < 2) return;
  pj = { slides: sl, i: 0 };
  let ov = document.getElementById("capProj");
  if (!ov) { ov = document.createElement("div"); ov.id = "capProj"; document.body.appendChild(ov); }
  ov.className = "can-proj"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Proyección de la oración");
  document.body.classList.add("cap-quiet");
  try { ov.requestFullscreen && ov.requestFullscreen().catch(() => {}); } catch {}
  devProjPaint();
}
function devProjPaint() {
  const ov = document.getElementById("capProj"); if (!ov || !pj) return;
  const s = pj.slides[pj.i] || {};
  const line = (l) => (/^[VR]\. /.test(l) ? `<b>${l[0]}.</b> ${esc(l.slice(3))}` : esc(l));
  ov.innerHTML = `<div class="can-proj-in">
    ${s.title ? `<span class="can-proj-mom">${esc(s.sub || "Oremus")}</span><h2 class="can-proj-title">${esc(s.title)}</h2>`
      : `<p class="can-proj-txt">${(s.lines || []).map(line).join("<br>")}</p>`}
  </div>
  <div class="can-proj-ctrl"><button class="icon-btn" data-action="capProjPrev" aria-label="Anterior">${icon("left")}</button>
    <span>${pj.i + 1} / ${pj.slides.length}</span>
    <button class="icon-btn" data-action="capProjNext" aria-label="Siguiente">${icon("right")}</button>
    <button class="btn btn-sm btn-glass" data-action="capProjClose">Salir</button></div>`;
}
function devProjMove(d) { if (!pj) return; pj.i = Math.max(0, Math.min(pj.slides.length - 1, pj.i + d)); devProjPaint(); }
function devProjClose() {
  pj = null; document.getElementById("capProj")?.remove();
  document.body.classList.remove("cap-quiet");
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
}
function devShow(t) {
  if (!devFind(t)) return;
  try { sessionStorage.setItem(DEV_KEY, t); } catch {}
  const card = document.getElementById("capDevCard"); if (card) card.innerHTML = devCardHTML(devFind(t));
  const sel = document.getElementById("capDevSel"); if (sel && sel.value !== t) sel.value = t;
}

// ---------------------------------------------------------------------------
// Dibujos
// ---------------------------------------------------------------------------
function roseWindow() {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const fill = ["#8ad2fa", "#ffba03", "#1351a4", "#ef591c"][i % 4];
    return `<path d="M100 100 C 86 72, 86 40, 100 22 C 114 40, 114 72, 100 100 Z" fill="${fill}" transform="rotate(${i * 45} 100 100)"/>`;
  }).join("");
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5 + 11.25) * Math.PI / 180;
    return `<circle cx="${100 + Math.sin(a) * 84}" cy="${100 - Math.cos(a) * 84}" r="6" fill="${i % 2 ? "#fff6e5" : "#8ad2fa"}"/>`;
  }).join("");
  return `<svg class="cap-rose" viewBox="0 0 200 200" aria-hidden="true">
    <defs><radialGradient id="capGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6e5"/><stop offset="1" stop-color="#fde7b0"/></radialGradient></defs>
    <circle cx="100" cy="100" r="96" fill="url(#capGlow)" stroke="#0b2566" stroke-width="4"/>
    <circle cx="100" cy="100" r="74" fill="#fff6e5" stroke="#0b2566" stroke-width="3"/>
    <g stroke="#0b2566" stroke-width="3" stroke-linejoin="round">${petals}</g>
    <g stroke="#0b2566" stroke-width="2.5">${dots}</g>
    <circle cx="100" cy="100" r="20" fill="#fff6e5" stroke="#0b2566" stroke-width="3"/>
    <path d="M100 86 L100 114 M89 96 L111 96" stroke="#0b2566" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}
const candleSVG = (lit = true, cls = "") => `<svg class="cap-candle ${lit ? "lit" : ""} ${cls}" viewBox="0 0 60 120" aria-hidden="true">
    <ellipse class="glow" cx="30" cy="30" rx="26" ry="30" fill="#ffba03" opacity=".22"/>
    <path class="flame" d="M30 8 C 38 22, 40 32, 30 44 C 20 32, 22 22, 30 8 Z" fill="#ffba03" stroke="#ef591c" stroke-width="2.5"/>
    <path class="flame-in" d="M30 24 C 34 31, 34 36, 30 41 C 26 36, 26 31, 30 24 Z" fill="#fff6e5"/>
    <path d="M30 44 L30 52" stroke="#0b2566" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="17" y="52" width="26" height="58" rx="5" fill="#fff6e5" stroke="#0b2566" stroke-width="3"/>
    <path d="M17 64 Q 24 70 26 62" fill="none" stroke="#0b2566" stroke-width="2"/>
    <rect x="10" y="108" width="40" height="8" rx="4" fill="#1351a4" stroke="#0b2566" stroke-width="3"/>
  </svg>`;

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
let velas = null, velasRed = [], velasFiesta = [], focusVela = null, focusDone = false;
let altarOpen = (() => { try { return sessionStorage.getItem("agape_altar") === "1"; } catch { return false; } })();
function setAltar(open) {
  altarOpen = open; try { sessionStorage.setItem("agape_altar", open ? "1" : "0"); } catch {}
  const sec = document.getElementById("cap-velas"); if (!sec) return;
  sec.classList.toggle("is-open", open);
  sec.querySelector(".cap-altar-top")?.setAttribute("aria-expanded", String(open));
  const body = document.getElementById("capAltarBody"); if (body) body.hidden = !open;
  const t = sec.querySelector(".cap-altar-btn span"); if (t) t.textContent = open ? "Ocultar las intenciones" : "Deja aquí tus intenciones";
  if (open) setTimeout(() => document.getElementById("velaText")?.focus({ preventScroll: true }), 50);
}
// ---------------------------------------------------------------------------
// Para rezar: íconos dorados sobre azul, de a tres por fila. Un toque abre ese lugar;
// si tiene dos formas (Un rato con Jesús), aparecen debajo para elegir.
// ---------------------------------------------------------------------------
const WI = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const WICO = {
  evangelio: WI('<path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5v13"/>'),
  rato: WI('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  rosario: WI('<circle cx="12" cy="8.5" r="6"/><path d="M12 14.5v3M12 18v4M10 20h4"/><circle cx="12" cy="2.5" r=".7" fill="currentColor"/><circle cx="6" cy="8.5" r=".7" fill="currentColor"/><circle cx="18" cy="8.5" r=".7" fill="currentColor"/>'),
  salmos: WI('<path d="M7 4c-2 4-2 9 1 12h8c3-3 3-8 1-12"/><path d="M6.5 6h11M10 6v10M12 6v10M14 6v10M9 20h6M12 16v4"/>'),
  oremus: WI('<path d="M12 3v18M7 8h10"/>'),
  cancionero: WI('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  intenciones: WI('<path d="M12 3c2 2.5 3 4.2 3 5.8a3 3 0 0 1-6 0C9 7.2 10 5.5 12 3z"/><rect x="9" y="12" width="6" height="9" rx="1"/>'),
  misa: WI('<path d="M7 3h10l-1.5 7a3.5 3.5 0 0 1-7 0z"/><path d="M12 13.5V19M8 21h8"/>'),
  radio: WI('<rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M7 8 17 3.5"/><circle cx="15.5" cy="14" r="2.6"/><path d="M6.5 12.5h4M6.5 15.5h4"/>'),
};
let wheelItems = [];
function wheelHTML(mk, my, now) {
  const scrollTo = (id, block = "start") => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block });
  wheelItems = [
    { k: "evangelio", t: "Evangelio", go: [["Leer", () => { if (vidSel !== "ev") ctx.actions.capVid({ dataset: { v: "ev" } }); scrollTo("capHoy")(); }]] },
    { k: "rosario", t: "Rosario", go: [["Rezar", () => ctx.actions.capRosario({ dataset: { set: mk } })]] },
    { k: "rato", t: "Con Jesús", go: [["En casa o donde estés", () => ctx.actions.capGuide({ dataset: { k: "casa" } })], ["Ante el Santísimo", () => ctx.actions.capGuide({ dataset: { k: "adoracion" } })]] },
    { k: "salmos", t: "Salmos", go: [["Entrar", "#/salmos"]] },
    { k: "oremus", t: "Oremus", go: [["Entrar", "#/oremus"]] },
    { k: "cancionero", t: "Cancionero", go: [["Entrar", "#/cancionero"]] },
    { k: "intenciones", t: "Intenciones", go: [["Entrar", () => { if (!altarOpen) setAltar(true); setTimeout(scrollTo("cap-velas"), 60); }]] },
  ];
  return `<div class="cg" role="list">${wheelItems.map((x, i) => `<button class="cg-it" data-cg="${i}" role="listitem" aria-label="${esc(x.t)}">
      <span class="cg-ico">${WICO[x.k]}</span><span class="cg-lbl">${esc(x.t)}</span></button>`).join("")}</div>
    <div class="cg-more" id="cgMore" hidden></div>`;
}
function wheelInit() {
  const box = document.querySelector(".cg"); if (!box) return;
  const more = document.getElementById("cgMore");
  const run = (g) => (typeof g[1] === "function" ? g[1]() : (location.hash = g[1]));
  box.addEventListener("click", (e) => {
    const b = e.target.closest(".cg-it"); if (!b) return;
    const x = wheelItems[+b.dataset.cg];
    box.querySelectorAll(".cg-it").forEach((y) => y.classList.toggle("on", y === b && x.go.length > 1));
    if (x.go.length === 1) { more.hidden = true; run(x.go[0]); return; }
    more.hidden = false;
    more.innerHTML = x.go.map(([l], j) => `<button class="cw-go" data-j="${j}">${esc(l)}</button>`).join("");
    more.onclick = (ev) => { const c = ev.target.closest("[data-j]"); if (c) run(x.go[+c.dataset.j]); };
  });
}

export function view(opt = {}) {
  focusVela = opt.vela || null; focusDone = false;
  if (opt.focus === "velas" || opt.vela) altarOpen = true;
  const d = ctx.content().devotional || { title: "", desc: "", cards: [] };
  const s = season(), m = moment(), now = new Date();
  const mk = MYST_BY_DAY[now.getDay()], my = MYST[mk];
  const cards = d.cards || [];
  loadOwn();
  const member = st().ready;
  const delMensaje = AD.llegoDelMensaje(); // llegó por el saludo: se queda arriba, en la bienvenida
  ctx.onAfterRender(() => {
    if (opt.focus === "rosario") setTimeout(() => openRosary(), 50);
    loadMisaVivo();
    Promise.all([loadGospel(), loadPropio()]).then(() => {
      paintGospel();
      if (!opt.focus || opt.vela || opt.focus === "rosario" || (delMensaje && document.getElementById("adBienv"))) return;
      const box = document.getElementById(opt.focus === "gospel" ? "capGospel" : "cap-" + opt.focus); if (!box) return;
      if (opt.focus !== "gospel") { box.scrollIntoView({ behavior: "auto", block: "start" }); return; }
      box.scrollIntoView({ behavior: "auto", block: "center" });
      box.classList.add("cap-flash"); setTimeout(() => box.classList.remove("cap-flash"), 2600);
    });
    if (!member) return;
    const stop = ctx.cloud.watchVelas((rows) => { velas = rows; paintVelas(); }, () => { velas = velas || []; paintVelas(true); });
    ctx.onLeave(stop);
    // Las intenciones que dejan los visitantes del Ágape digital, como velas de la comunidad
    const stopRed = ctx.cloud.watchIntencionesRed((rows) => { velasRed = rows; paintVelas(); }, () => {});
    ctx.onLeave(stopRed);
    // Cumpleaños y fechas Ágape de hoy: una vela especial de la comunidad
    F.velasHoy().then((l) => { velasFiesta = l; paintVelas(); }).catch(() => {});
    paintVelas();
  });
  ctx.onAfterRender(() => { wheelInit(); });
  const row = (attrs, ico, t, sub) => `<${attrs.startsWith("href") ? "a" : "button"} class="cap-row" ${attrs}>
      <span class="cap-row-ico" aria-hidden="true">${ico}</span>
      <span class="cap-row-txt"><b>${t}</b>${sub ? `<small>${sub}</small>` : ""}</span>${icon("right")}</${attrs.startsWith("href") ? "a" : "button"}>`;
  let num = 0; // los rincones se numeran solos, en orden
  return `${AD.bienvenidaHTML()}
  ${TP.tarjetaHTML() ? `<div class="tp-cap">${TP.tarjetaHTML()}</div>` : ""}
  <section class="cap-a-hero" style="--season:${s.hex}">
    <div class="cap-arch">
      ${roseWindow()}
      <span class="cap-hand">pasa, Él te espera</span>
      <h1 class="cap-title">Capilla <em>Ágape</em></h1>
      <div class="cap-chips">
        <span class="cap-season"><i></i>${esc(s.name)} · color ${esc(s.color)}</span>
        <span class="cap-date">${esc(now.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }))}</span>
      </div>
    </div>
  </section>

  <section class="cap-fila" aria-labelledby="cgTitle">
    <div class="cap-fila-h"><h2 class="cw-h" id="cgTitle">Para rezar</h2><span class="xs muted">desliza para ver más</span></div>
    ${wheelHTML(mk, my, now)}
  </section>

  <section class="cap-a-misa" id="capHoy">
    <span class="cap-hand cap-a-hand">la Misa de hoy</span>
    <div class="cap-vsel" role="group" aria-label="Video">
      <button type="button" data-action="capVid" data-v="misa" aria-pressed="${vidSel === "misa"}">Misa de hoy</button>
      <button type="button" data-action="capVid" data-v="ev" aria-pressed="${vidSel === "ev"}">Evangelio en video</button>
    </div>
    <div class="cap-vbox" id="capMisa" ${vidSel === "misa" ? "" : "hidden"}>${misaHTML()}</div>
    <div class="cap-vbox" id="capEvVid" ${vidSel === "ev" ? "" : "hidden"}>${evVideoHTML()}</div>
    <div class="cap-a-ev" id="capGospel">${gospelHead(s)}</div>
    <a class="cap-hoy-link" id="capEvLink" href="${esc(evUrl())}" target="_blank" rel="noopener">Leer el Evangelio completo en Vatican News ${icon("arrowR")}</a>
    ${ctx.cloud.enabled && st().isAdmin ? `<button class="btn btn-sm btn-ghost cap-mv-edit" data-action="capMisaVivo">${icon("edit")} Cambiar el enlace de la Misa en vivo</button>` : ""}
  </section>

  <article class="cap-moment">
    <span class="eyebrow">${esc(m.label)}</span>
    <span class="cap-hand sm">${esc(m.hand)}</span>
    <p class="cap-prayer">${esc(m.text).replace(/\n/g, "<br>")}</p>
  </article>

  <section class="cap-room cap-altar${altarOpen ? " is-open" : ""}" id="cap-velas">
    <div class="cap-altar-top" data-action="capAltar" role="button" tabindex="0" aria-expanded="${altarOpen}" aria-controls="capAltarBody">
      <span class="cap-hand">aquí nadie reza solo</span>
      <div class="cap-room-head"><h2>Nuestras <em>intenciones</em></h2></div>
      <p class="cap-lead">Enciende una vela por quien quieras y acompaña con tu oración las de los demás. Cada vela brilla una semana, y sus intenciones las llevamos a la misa del grupo.</p>
      ${member ? `<div class="cap-altar-row" id="velaAltar" aria-hidden="true"></div>
      <p class="cap-altar-sum" id="velaSum"></p>` : ""}
      <span class="btn cap-altar-btn">${icon("flame")} <span>${altarOpen ? "Ocultar las intenciones" : "Deja aquí tus intenciones"}</span></span>
    </div>
    <div class="cap-altar-body" id="capAltarBody" ${altarOpen ? "" : "hidden"}>
    ${member ? `<form class="cap-light" id="velaForm">
        ${candleSVG(false, "cap-light-c")}
        <div class="cap-light-body">
          <label for="velaText"><strong>Enciende tu vela</strong><span>¿Por quién o por qué quieres rezar? Si prefieres, déjala en silencio.</span></label>
          <textarea id="velaText" class="textarea cap-light-ta" rows="3" maxlength="1500" placeholder="Por mi abuela… Por mi curso… Por la paz…"></textarea>
          <div class="cap-light-foot"><span>La ve solo la comunidad con cuenta. Lo muy personal, mejor conversarlo con tu acompañante.</span><span id="velaN">0/1500</span></div>
          <button class="btn cap-light-btn" type="submit">${icon("flame")} Encender mi vela</button>
        </div>
      </form>
      ${AD.botonMisaHTML() ? `<div class="row-wrap" style="justify-content:flex-end;margin:4px 0 8px">${AD.botonMisaHTML()}</div>` : ""}
      <div class="cap-velas" id="velaList"><p class="cap-empty">Encendiendo las velas…</p></div>`
    : `<div class="cap-light cap-vela-guest">${candleSVG(true, "cap-light-c")}<div class="cap-light-body"><strong>Deja tu intención</strong>
        <span>Se enciende como una vela en nuestra Capilla: la comunidad reza por ella y la llevamos a la misa del grupo. Eres parte del Ágape digital, una red de internautas que rezan.</span>
        ${AD.formHTML("adForm2")}
        ${ctx.cloud.enabled ? `<p class="xs muted" style="margin-top:8px">¿Eres de la comunidad? <button class="sal-link" data-action="signIn">Ingresa</button> para encender tu vela y rezar por las de los demás.</p>` : ""}</div></div>`}
    </div>
  </section>


`.replace(/<span class="cap-num">\d+<\/span>/g, () => `<span class="cap-num">${String(++num).padStart(2, "0")}</span>`);
}

// ---------------------------------------------------------------------------
// Evangelio del día (data/evangelio.json, lo actualiza cada día una acción de GitHub)
// ---------------------------------------------------------------------------
let gospel = null;
try { gospel = JSON.parse(localStorage.getItem("agape_evangelio") || "null"); } catch {}
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
let gospelAt = 0; // cuándo se pidió por última vez (el video del día puede llegar durante la mañana)
const gospelFresh_ = () => Date.now() - gospelAt < 15 * 60 * 1000;
async function loadGospel() {
  gospelAt = Date.now();
  try {
    const g = await fetchJSON("data/evangelio.json", 60 * 1000).catch(() => null);
    if (g && g.days) { gospel = g; try { localStorage.setItem("agape_evangelio", JSON.stringify(g)); } catch {} }
  } catch {}
}
const READ_URL = "https://www.vaticannews.va/es/evangelio-de-hoy.html";
// Fiesta propia de Chile o de la parroquia (Gestión → Evangelio y fiestas): manda sobre la fuente automática
let propio = null;
async function loadPropio() {
  if (propio === null) propio = (ctx && ctx.cloud && ctx.cloud.enabled ? await ctx.cloud.getEvPropio().catch(() => null) : null) || {};
  return propio;
}
export function aplicarPropio(iso, base) {
  const o = propio && propio.dias && propio.dias[iso];
  return o && o.cita ? { ...(base || {}), ...o, propio: true } : base;
}
const pick = () => aplicarPropio(todayKey(), (gospel && gospel.days && gospel.days[todayKey()]) || null);
// Para Inicio: la cita y la frase del Evangelio de hoy (o null)
export async function todayGospel() {
  await loadPropio();
  if (gospelFresh_() && pick() && (pick().propio || (gospel && gospel.days && gospel.days[todayKey()]))) return pick();
  await loadGospel(); return pick();
}
// ---------------------------------------------------------------------------
// Evangelio del día en la Capilla (abierta a todos, sin cuenta): el video del día del
// P. Pedro Brassesco (se carga solo al tocarlo) y el enlace al texto completo en Vatican News.
// ---------------------------------------------------------------------------
const CANAL_VIDEOS = "https://www.youtube.com/channel/UCmHasgewuTBMTMAvT6_ghNw/videos";
function evExtras(g) {
  const ok = (v) => (!g.propio && v && /^[\w-]{6,20}$/.test(v) ? v : "");
  const vid = ok(g.video) || ok(g.reflexion), ref = ok(g.video) && ok(g.reflexion) ? g.reflexion : "";
  return `<div class="cap-ev">
    ${vid ? `<button type="button" class="ev-video" data-action="evPlay" data-id="${vid}" aria-label="Ver el Evangelio de hoy en video">
        <img src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">
        <span class="ev-play" aria-hidden="true"></span></button>
      <p class="cap-ev-note">En video con el P. Pedro Brassesco${ref ? ` · <button type="button" class="linklike" data-action="evPlay" data-id="${ref}" data-swap="1">ver su breve reflexión</button>` : ""}</p>`
      : `<p class="cap-ev-note"><a href="${CANAL_VIDEOS}" target="_blank" rel="noopener">Ver en video con el P. Pedro Brassesco ↗</a></p>`}
    <a class="btn btn-soft btn-sm ev-full" href="${esc(g.url || READ_URL)}" target="_blank" rel="noopener">Leer el Evangelio completo en Vatican News ↗</a></div>`;
}

// Tarjeta de hoy (Capilla): la cita y la frase arriba; el video del Evangelio, aparte, en su pestaña.
function gospelHead(s) {
  const g = pick();
  if (!g || !g.frase) return `<p class="cap-hint">${esc(s.hint)}</p>`;
  return `<span class="cap-hoy-k">${esc(g.titulo && g.propio ? g.titulo : "Evangelio de hoy")} · ${esc(g.cita)}</span>
    <p class="cap-hoy-f">${esc(g.frase)}</p>`;
}
const evUrl = () => { const g = pick(); return (g && g.url) || READ_URL; };
function evVideoHTML() {
  const g = pick() || {};
  const ok = (v) => (!g.propio && v && /^[\w-]{6,20}$/.test(v) ? v : "");
  const vid = ok(g.video) || ok(g.reflexion), ref = ok(g.video) && ok(g.reflexion) ? g.reflexion : "";
  return `<div class="cap-ev">${vid ? `<button type="button" class="ev-video" data-action="evPlay" data-id="${vid}" aria-label="Ver el Evangelio de hoy en video">
        <img src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">
        <span class="ev-play" aria-hidden="true"></span></button>
      <p class="cap-ev-note">Con el P. Pedro Brassesco${ref ? ` · <button type="button" class="linklike" data-action="evPlay" data-id="${ref}" data-swap="1">ver su breve reflexión</button>` : ""}</p>`
    : `<p class="cap-ev-note"><a href="${CANAL_VIDEOS}" target="_blank" rel="noopener">Ver en video con el P. Pedro Brassesco ↗</a></p>`}</div>`;
}
let vidSel = "misa";
export const propioDe = async (iso) => { await loadPropio(); return (propio.dias || {})[iso] || null; };
export const resetPropio = () => { propio = null; };
function gospelHTML(s) {
  const g = pick();
  if (!g || !g.frase) return `<p class="cap-hint">${esc(s.hint)}</p>`;
  return `<div class="cap-gq">
      <span class="cap-gq-t">${esc(g.titulo || "Evangelio del día")}</span>
      <span class="cap-gq-f">«${esc(g.frase)}»</span>
      <span class="cap-gq-r">${esc(g.cita)}</span></div>
    ${evExtras(g)}`;
}
function paintGospel() {
  const box = document.getElementById("capGospel"); if (box) box.innerHTML = gospelHead(season());
  const vb = document.getElementById("capEvVid"); if (vb) vb.innerHTML = evVideoHTML();
  const ln = document.getElementById("capEvLink"); if (ln) ln.href = evUrl();
  const g = pick();
}

// ---------------------------------------------------------------------------
// Velas
// ---------------------------------------------------------------------------
// Quiénes rezan por una vela: { uid: {n, a} } (las antiguas guardaban solo «true»).
function prayers(v, me) {
  return Object.entries(v.prays || {}).map(([uid, x]) => ({ uid, me: uid === me, n: x && x.n ? x.n : "", a: x && x.a ? x.a : "" }))
    .sort((p, q) => (q.me - p.me) || (!!q.n - !!p.n));
}
function whoText(ps) {
  if (!ps.length) return "";
  const names = ps.filter((p) => p.me || p.n).slice(0, 2).map((p) => (p.me ? "Tú" : p.n));
  const rest = ps.length - names.length;
  const list = rest > 0 ? `${names.join(", ")} y ${rest} más` : names.length === 2 ? `${names[0]} y ${names[1]}` : names[0] || `${ps.length} personas`;
  if (ps.length === 1) return ps[0].me ? "Tú rezas por esto" : `${list} reza por esto`;
  return `${list} rezan por esto`;
}
const DIAS = ["el domingo", "el lunes", "el martes", "el miércoles", "el jueves", "el viernes", "el sábado"];
function dayLabel(t) {
  const d = t && t.toDate ? t.toDate() : new Date(), now = new Date();
  const days = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
  return days <= 0 ? "hoy" : days === 1 ? "ayer" : DIAS[d.getDay()];
}
const hashN = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
function paintVelas(err) {
  const box = $("#velaList"); if (!box) return;
  if (!velas) return;
  const week = Date.now() - 7 * 86400000;
  const red = (velasRed || []).map((r) => ({ id: "red:" + r.id, red: true, text: r.t || "", authorName: "Un internauta del Ágape digital", prays: r.prays || {}, createdAt: r.createdAt }));
  const ts = (v) => (v.createdAt && v.createdAt.toDate ? v.createdAt.toDate().getTime() : Date.now());
  const list = [...velasFiesta, ...[...velas, ...red].sort((a, b) => ts(b) - ts(a))].filter((v) => { const d = v.createdAt && v.createdAt.toDate ? v.createdAt.toDate() : new Date(); return d.getTime() >= week; });
  const me = ctx.cloud.myUid(), staff = st().isStaff;
  // El altar: todas las velas de la semana juntas; la llama crece con cada persona que reza.
  const altar = $("#velaAltar"), sum = $("#velaSum");
  const total = list.reduce((a, v) => a + Object.keys(v.prays || {}).length, 0);
  if (altar) altar.innerHTML = list.slice(0, 48).map((v) => { const n = Object.keys(v.prays || {}).length;
    return `<span class="cap-altar-c" style="--h:${hashN(v.id) % 4};--f:${(1 + Math.min(n, 12) * 0.07).toFixed(2)}">${candleSVG(true)}</span>`; }).join("");
  if (sum) sum.textContent = list.length ? `${list.length} ${list.length > 1 ? "velas encendidas" : "vela encendida"} esta semana${total ? ` · ${total} ${total > 1 ? "veces" : "vez"} alguien se unió a rezar` : ""}` : "";
  if (err && !list.length) { box.innerHTML = `<p class="cap-empty">No pudimos cargar las intenciones. Revisa tu conexión.</p>`; return; }
  if (!list.length) { box.innerHTML = `<p class="cap-empty">Esta semana todavía no hay velas encendidas. ¿Enciendes la primera?</p>`; return; }
  box.innerHTML = list.map((v, i) => {
    const ps = prayers(v, me), n = ps.length, mine = ps.some((p) => p.me);
    const focus = focusVela === v.id, long = v.text && v.text.length > 260, clamp = long && !focus;
    const author = ps.find((p) => p.uid === v.authorUid) || {};
    return `<article class="cap-vela${focus ? " cap-vela-focus" : ""}${v.red ? " cap-vela-red" : ""}${v.fiesta ? " cap-vela-fiesta" : ""}" data-vela="${esc(v.id)}" style="--r:${[-0.8, 0.6, -0.3, 0.9][i % 4]}deg;--f:${(1 + Math.min(n, 12) * 0.06).toFixed(2)}">
      <div class="cap-vela-c">${candleSVG(true)}</div>
      <div class="cap-vela-body">
        ${v.text ? `<p class="cap-vela-t${clamp ? " cap-clamp" : ""}">${esc(v.text)}</p>${long ? `<button class="cap-more" data-action="velaMore">${clamp ? "Leer todo" : "Mostrar menos"}</button>` : ""}`
          : `<p class="cap-vela-t is-silent">Una intención en silencio</p>`}
        <div class="cap-vela-by">${v.fiesta ? `<span class="cap-av cap-av-red" aria-hidden="true">${AD.SELLO()}</span><span><b>La comunidad Ágape</b> la encendió hoy</span>` : v.red ? `<span class="cap-av cap-av-red" aria-hidden="true">${AD.SELLO()}</span><span><b>Un internauta del Ágape digital</b> la dejó ${dayLabel(v.createdAt)}</span>` : `${avatar(author.a || "", v.authorName || "Alguien", "cap-av")}<span><b>${esc(v.authorName || "Alguien")}</b> la encendió ${dayLabel(v.createdAt)}</span>`}</div>
        <div class="cap-vela-act">
          <button class="cap-pray${mine ? " on" : ""}" data-action="capPray" data-id="${esc(v.id)}" data-on="${mine ? 0 : 1}" aria-pressed="${mine}">${icon("flame")} ${mine ? "Estás rezando" : "Rezo contigo"}</button>
          ${n ? `<span class="cap-pray-who"><span class="cap-stack" aria-hidden="true">${ps.slice(0, 5).map((p) => avatar(p.a, p.me ? "Tú" : p.n || "Alguien", "cap-av")).join("")}</span><span>${esc(whoText(ps))}</span></span>` : ""}
        </div>
        ${!v.fiesta && (v.authorUid === me || staff) ? `<button class="cap-vela-del" data-action="capVelaDel" data-id="${esc(v.id)}">Retirar ${v.authorUid === me ? "mi" : "esta"} vela</button>` : ""}
      </div>
    </article>`;
  }).join("");
  // Llegaste desde la campanita: muestra esa vela, completa y destacada
  if (focusVela && !focusDone) {
    const el = box.querySelector(`[data-vela="${CSS.escape(focusVela)}"]`);
    if (el) { focusDone = true; setTimeout(() => el.scrollIntoView({ behavior: "auto", block: "center" }), 60); }
  }
}


// ---------------------------------------------------------------------------
// Silencio guiado
// ---------------------------------------------------------------------------
let silTimer = null, audio = null;
function bell() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    [523.25, 784, 1046.5].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18 / (i + 1), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.start(t); o.stop(t + 4.1);
    });
  } catch {}
}
// Oración guiada «Un rato con Jesús»: oración personal al estilo de Santa Teresa de Jesús
// (oración mental: prepararse, ponerse en su presencia, leer, pensar, conversar, quedarse con Él,
// agradecer, ofrecer y pedir). En casa (o donde estés) o ante el Santísimo.
// No usa técnicas de respiración ni de concentración: el centro es siempre Jesús.
const COMUNION = (ORACIONES.find((o) => o.t === "Comunión espiritual") || {}).x || "";
function guideSteps(k) {
  const [vt, vr] = VERSES[dayIndex(VERSES.length)];
  const palabra = { t: "Escucha su Palabra", txt: "Jesús te habla. Lee esta frase despacio, dos o tres veces.", verse: [vt, vr] };
  const piensa = { t: "Piénsala con Él", txt: "No es para estudiar: es para conocerlo y quererlo más. Pregúntate: ¿qué me dice Jesús con esto?, ¿qué palabra me toca?, ¿qué me pide hoy?" };
  const habla = { t: "Háblale como a un amigo", txt: "Cuéntale lo que pensaste, lo que te alegra y lo que te pesa. No necesitas palabras bonitas: Él te conoce y te quiere.",
    pr: "Orar es «tratar de amistad, estando muchas veces tratando a solas con quien sabemos nos ama».", ref: "Santa Teresa de Jesús, Libro de la Vida 8,5",
    note: "Si algo te pesa mucho, cuéntaselo también a alguien de confianza: tu dirigente o tu familia. No estás solo ni sola." };
  const agradece = { t: "Agradece, ofrece y pide", txt: "Termina tu conversación con tres frases:", pr: "Gracias, Jesús, por…\nTe ofrezco…\nTe pido por…" };
  if (k === "adoracion") return [
    { t: "Al llegar", txt: "Haz una genuflexión (o una inclinación) y busca un lugar tranquilo. Jesús está realmente presente en la Eucaristía: estás frente a Él.", candle: true },
    { t: "Adóralo", txt: "Haz la señal de la cruz y reza despacio, con el corazón:", pr: "Dios mío, yo creo, adoro, espero y te amo.\nTe pido perdón por los que no creen, no adoran, no esperan y no te aman.", ref: "Oración del Ángel de Fátima" },
    { t: "Míralo y déjate mirar", txt: "Mira a Jesús en la Hostia. Santa Teresa decía: «No os pido más de que le miréis» (Camino de perfección 26,3). Y un campesino le contó al santo cura de Ars: «Yo lo miro y Él me mira». Quédate así, en silencio.", quiet: 60 },
    palabra, piensa, habla,
    { t: "Comunión espiritual", txt: "Pídele que entre en tu corazón:", pr: COMUNION },
    agradece,
    { t: "Despídete", txt: "Antes de salir, agradécele y haz una genuflexión.", pr: "Gracias, Jesús, por este rato contigo.\nQuédate conmigo hoy.\nQue lo que haga y lo que diga hable de Ti.\nAmén.", end: true },
  ];
  return [
    { t: "Prepárate", txt: "Busca un lugar tranquilo: tu pieza, la micro, una plaza. Silencia las notificaciones. Vas a encontrarte con Alguien que te quiere.", candle: true },
    { t: "Ponte en su presencia", txt: "Haz la señal de la cruz. Jesús está contigo ahora mismo. Dile:", pr: "Jesús, aquí estoy.\nCreo que estás conmigo.\nPerdóname lo que hice mal\ny enséñame a orar.", ref: "En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén." },
    palabra, piensa, habla,
    { t: "Quédate con Él", txt: "Ya no hacen falta más palabras. Quédate un momento con Jesús, como con un amigo. Si te distraes, no te preocupes: vuelve a Él diciéndole despacio «Jesús».", quiet: 60 },
    agradece,
    { t: "Despídete", txt: "Reza un Padre nuestro y despídete:", pr: "Gracias, Jesús, por este rato contigo.\nQuédate conmigo hoy.\nQue lo que haga y lo que diga hable de Ti.\nAmén.", note: "Llévate la palabra que te tocó y repítela durante el día.", end: true },
  ];
}
let gd = null; // { k, steps, i }
function openGuide(k) {
  DS.marcar("rato");
  gd = { k, steps: guideSteps(k), i: 0 };
  let ov = document.getElementById("capOverlay");
  if (!ov) { ov = document.createElement("div"); ov.id = "capOverlay"; document.body.appendChild(ov); }
  ov.className = "cap-overlay cap-gd";
  ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
  ov.setAttribute("aria-label", k === "adoracion" ? "Adoración ante el Santísimo" : "Un rato con Jesús");
  document.body.classList.add("cap-quiet");
  bell(); guidePaint();
}
function guidePaint() {
  const ov = document.getElementById("capOverlay"); if (!ov || !gd) return;
  clearInterval(silTimer); silTimer = null;
  const s = gd.steps[gd.i], n = gd.steps.length;
  ov.innerHTML = `<div class="cap-ov-in cap-gd-in">
    <div class="cap-gd-top"><span>${gd.k === "adoracion" ? "Ante el Santísimo" : "Un rato con Jesús"} · ${gd.i + 1} de ${n}</span>
      <button class="cap-gd-x" data-action="capStop" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="cap-gd-bar" aria-hidden="true"><i style="width:${((gd.i + 1) / n) * 100}%"></i></div>
    ${s.candle ? candleSVG(true, "big") : ""}
    <h2 class="cap-gd-t">${esc(s.t)}</h2>
    <p class="cap-gd-txt">${esc(s.txt)}</p>
    ${s.verse ? `<p class="cap-verse">«${esc(s.verse[0])}»</p><span class="cap-ref">${esc(s.verse[1])}</span>` : ""}
    ${s.pr ? `<p class="cap-gd-pr">${esc(s.pr).replace(/\n/g, "<br>")}</p>` : ""}
    ${s.ref ? `<p class="cap-gd-ref">${esc(s.ref)}</p>` : ""}
    ${s.note ? `<p class="cap-gd-note">${esc(s.note)}</p>` : ""}
    ${s.quiet ? `<p class="cap-left" id="capLeft"></p>` : ""}
    <div class="cap-gd-nav">
      ${gd.i ? `<button class="btn btn-glass" data-action="capGdPrev">${icon("left")} Atrás</button>` : ""}
      ${s.end ? `<button class="btn btn-gold" data-action="capGdEnd">Amén ${icon("right")}</button>` : `<button class="btn btn-gold" data-action="capGdNext" id="capGdNext">Seguir ${icon("right")}</button>`}
    </div></div>`;
  ov.scrollTop = 0;
  (ov.querySelector("#capGdNext") || ov.querySelector("[data-action=capGdEnd]"))?.focus();
  if (s.quiet) {
    const end = Date.now() + s.quiet * 1000;
    const tick = () => {
      const left = Math.max(0, end - Date.now()), sec = Math.ceil(left / 1000);
      const el = document.getElementById("capLeft"); if (el) el.textContent = left ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : "";
      if (!left && el) el.textContent = "Cuando quieras, sigue.";
      if (!left) { clearInterval(silTimer); silTimer = null; bell(); }
    };
    silTimer = setInterval(tick, 1000); tick();
  }
}
function guideMove(d) { if (!gd) return; gd.i = Math.max(0, Math.min(gd.steps.length - 1, gd.i + d)); guidePaint(); }
function stopSilence(done) {
  clearInterval(silTimer); silTimer = null;
  const ov = document.getElementById("capOverlay");
  if (done) {
    bell();
    gd = null;
    if (ov) ov.querySelector(".cap-ov-in").innerHTML = `${candleSVG(true, "big")}<p class="cap-verse">Gracias por este momento.</p><p class="muted" style="color:#fff6e5;opacity:.85">Lleva esta paz a lo que viene.</p><button class="btn btn-gold" data-action="capStop">Volver a la capilla</button>`;
    return;
  }
  gd = null;
  if (ov) ov.remove();
  document.body.classList.remove("cap-quiet");
}

// ---------------------------------------------------------------------------
// Rosario virtual (popup): un rosario dibujado; en el centro se lee el misterio
// y la oración de cada cuenta. Se avanza tocando el centro o «Siguiente».
// ---------------------------------------------------------------------------
const ROS_CITES = {
  gozosos: ["Lc 1,26-38", "Lc 1,39-56", "Lc 2,1-20", "Lc 2,22-40", "Lc 2,41-52"],
  luminosos: ["Mt 3,13-17", "Jn 2,1-11", "Mc 1,14-15", "Lc 9,28-36", "Lc 22,14-20"],
  dolorosos: ["Mt 26,36-46", "Jn 19,1", "Mt 27,27-31", "Jn 19,16-17", "Lc 23,33-46"],
  gloriosos: ["Lc 24,1-12", "Hch 1,6-11", "Hch 2,1-13", "Lc 1,46-55", "Ap 12,1"],
};
// El versículo de cada misterio: queda a un costado del rosario mientras se reza la decena.
const ROS_VERSOS = {
  gozosos: [["He aquí la esclava del Señor; hágase en mí según tu palabra.", "Lc 1,38"], ["Bendita tú entre las mujeres y bendito el fruto de tu vientre.", "Lc 1,42"], ["Dio a luz a su hijo primogénito, lo envolvió en pañales y lo acostó en un pesebre.", "Lc 2,7"], ["Mis ojos han visto a tu Salvador.", "Lc 2,30"], ["¿No sabían que yo debo estar en la casa de mi Padre?", "Lc 2,49"]],
  luminosos: [["Este es mi Hijo amado, en quien me complazco.", "Mt 3,17"], ["Hagan todo lo que él les diga.", "Jn 2,5"], ["El Reino de Dios está cerca: conviértanse y crean en el Evangelio.", "Mc 1,15"], ["Este es mi Hijo, el Elegido; escúchenlo.", "Lc 9,35"], ["Esto es mi cuerpo, que se entrega por ustedes. Hagan esto en memoria mía.", "Lc 22,19"]],
  dolorosos: [["Padre, si es posible, que pase de mí este cáliz; pero que no se haga como yo quiero, sino como quieres tú.", "Mt 26,39"], ["Entonces Pilato tomó a Jesús y lo mandó azotar.", "Jn 19,1"], ["Trenzaron una corona de espinas y se la pusieron en la cabeza.", "Mt 27,29"], ["Jesús, cargando él mismo la cruz, salió hacia el lugar llamado de la Calavera.", "Jn 19,17"], ["Padre, en tus manos encomiendo mi espíritu.", "Lc 23,46"]],
  gloriosos: [["¿Por qué buscan entre los muertos al que está vivo? No está aquí: ha resucitado.", "Lc 24,5-6"], ["Fue elevado al cielo a la vista de ellos, y una nube lo ocultó de sus ojos.", "Hch 1,9"], ["Todos quedaron llenos del Espíritu Santo.", "Hch 2,4"], ["Desde ahora me llamarán feliz todas las generaciones.", "Lc 1,48"], ["Una mujer vestida del sol, con la luna bajo sus pies y una corona de doce estrellas en la cabeza.", "Ap 12,1"]],
};
const ORD = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto"];
const ADJ = { gozosos: "gozoso", luminosos: "luminoso", dolorosos: "doloroso", gloriosos: "glorioso" };
const PR = {
  cruz: ["Señal de la cruz", "Por la señal de la Santa Cruz,\nde nuestros enemigos líbranos, Señor, Dios nuestro.\nEn el nombre del Padre, y del Hijo, y del Espíritu Santo.\nAmén."],
  credo: ["Credo", "Creo en Dios, Padre todopoderoso, Creador del cielo y de la tierra.\nCreo en Jesucristo, su único Hijo, nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato, fue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos y está sentado a la derecha de Dios, Padre todopoderoso. Desde allí ha de venir a juzgar a vivos y muertos.\nCreo en el Espíritu Santo, la santa Iglesia católica, la comunión de los santos, el perdón de los pecados, la resurrección de la carne y la vida eterna.\nAmén."],
  pn: ["Padre nuestro", CLASSIC[0][1]],
  am: ["Ave María", CLASSIC[1][1]],
  gl: ["Gloria", CLASSIC[2][1]],
  oj: ["Oh Jesús mío", "Oh Jesús mío, perdona nuestros pecados,\nlíbranos del fuego del infierno,\nlleva al cielo a todas las almas,\nespecialmente a las más necesitadas de tu misericordia."],
  sa: ["Salve", CLASSIC[5][1]],
  fin: ["¡Rezaste el Rosario!", "María lleva tus intenciones a Jesús.\n\nEn el nombre del Padre, y del Hijo, y del Espíritu Santo.\nAmén."],
};

function rosSteps(set) {
  const S = [{ b: "cross", k: "cruz" }, { b: "cross", k: "credo" }, { b: "p0", k: "pn" }];
  ["por la fe", "por la esperanza", "por la caridad"].forEach((n, i) => S.push({ b: "p" + (i + 1), k: "am", note: n, i: i + 1, of: 3 }));
  S.push({ b: "p3", k: "gl" });
  for (let d = 0; d < 5; d++) {
    S.push({ b: "B" + d, k: "mys", d }, { b: "B" + d, k: "pn", d });
    for (let i = 1; i <= 10; i++) S.push({ b: `d${d}-${i}`, k: "am", d, i, of: 10 });
    S.push({ b: `d${d}-10`, k: "gl", d }, { b: `d${d}-10`, k: "oj", d });
  }
  S.push({ b: "medal", k: "sa" }, { b: "medal", k: "fin" });
  return S;
}

const RW = 360, RH = 524, RCX = 180, RCY = 176, RR = 158;
function rosarySVG() {
  // Vuelta del rosario: la medalla abajo; las decenas suben por la derecha.
  const loop = [];
  for (let d = 0; d < 5; d++) { if (d) loop.push({ id: "B" + d, big: true }); for (let i = 1; i <= 10; i++) loop.push({ id: `d${d}-${i}` }); }
  const gap = 3.4, total = loop.reduce((s, x) => s + (x.big ? 1.9 : 1), 0) + gap, u = 360 / total;
  let acc = gap / 2;
  const beads = loop.map((x) => {
    const w = x.big ? 1.9 : 1, a = (90 - (acc + w / 2) * u) * Math.PI / 180; acc += w;
    return { ...x, x: RCX + RR * Math.cos(a), y: RCY + RR * Math.sin(a) };
  });
  const my = RCY + RR;
  const pend = [{ id: "B0", big: true, y: my + 34 }, { id: "p3", y: my + 60 }, { id: "p2", y: my + 80 }, { id: "p1", y: my + 100 }, { id: "p0", big: true, y: my + 128 }]
    .map((b) => ({ ...b, x: RCX }));
  const bead = (b) => `<g class="rb ${b.big ? "big" : ""}" data-b="${b.id}" role="button" tabindex="-1" aria-label="${b.big ? "Padre nuestro" : "Ave María"}">
      <circle class="hit" cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${b.big ? 13 : 9}"/>
      <circle class="dot" cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${b.big ? 9.5 : 6.4}"/></g>`;
  const cy = my + 150;
  return `<svg class="ros-svg" viewBox="0 0 ${RW} ${RH}" aria-hidden="false">
    <defs><radialGradient id="rosGlow"><stop offset="0" stop-color="#ffba03" stop-opacity=".55"/><stop offset="1" stop-color="#ffba03" stop-opacity="0"/></radialGradient></defs>
    <circle class="ros-chain" cx="${RCX}" cy="${RCY}" r="${RR}"/>
    <path class="ros-chain" d="M${RCX} ${my} V${cy}"/>
    ${beads.map(bead).join("")}${pend.map(bead).join("")}
    <g class="rb medal" data-b="medal" role="button" tabindex="-1" aria-label="Medalla · Salve">
      <ellipse class="hit" cx="${RCX}" cy="${my}" rx="17" ry="20"/>
      <ellipse class="dot" cx="${RCX}" cy="${my}" rx="12.5" ry="15.5"/>
      <text x="${RCX}" y="${my + 5.5}" text-anchor="middle">M</text></g>
    <g class="rb cross" data-b="cross" role="button" tabindex="-1" aria-label="Cruz · Credo">
      <rect class="hit" x="${RCX - 22}" y="${cy - 4}" width="44" height="58"/>
      <path class="dot" d="M${RCX - 5} ${cy} h10 v12 h12 v10 h-12 v26 h-10 v-26 h-12 v-10 h12 Z"/></g>
  </svg>`;
}

const rosaryIcon = () => `<svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="6"/><path d="M12 14.5v3M12 18v4M10 20h4"/><circle cx="12" cy="2.5" r=".6" fill="currentColor"/><circle cx="6" cy="8.5" r=".6" fill="currentColor"/><circle cx="18" cy="8.5" r=".6" fill="currentColor"/></svg>`;
let ros = null; // { set, steps, i, el }
const ROS_KEY = "agape_rosario_v1";
function rosSave() { try { localStorage.setItem(ROS_KEY, JSON.stringify({ set: ros.set, i: ros.i, day: todayKey() })); } catch {} }
function rosLoad(set) {
  try { const s = JSON.parse(localStorage.getItem(ROS_KEY) || "null"); if (s && s.set === set && s.day === todayKey()) return +s.i || 0; } catch {}
  return 0;
}
// María con el Niño, en línea fina (dibujo propio de la app). Las aureolas usan --halo.
function virgenLinea(cls = "") {
  return `<svg class="virgen-linea ${cls}" viewBox="0 0 300 340" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g transform="rotate(6 130 330)">
    <path class="vl-halo" d="M70 128 C 62 64, 108 22, 160 26 C 206 30, 232 70, 226 118" stroke-width="3.6"/>
    <path d="M142 44 C 106 46, 86 76, 82 116 C 78 160, 66 204, 44 246 C 28 276, 18 306, 12 338" stroke-width="5.2"/>
    <path d="M142 44 C 182 42, 206 70, 208 108 C 210 132, 204 152, 196 168" stroke-width="5.2"/>
    <path d="M118 74 C 100 98, 96 132, 100 164 C 104 200, 98 244, 82 296 C 78 312, 74 326, 72 338"/>
    <path d="M118 74 C 138 60, 168 62, 182 80 C 190 92, 192 108, 190 124"/>
    <path d="M90 214 C 78 250, 62 290, 52 334" stroke-width="3"/>
    <path d="M126 96 C 120 122, 126 148, 142 162 C 152 170, 164 168, 172 158 C 180 146, 184 124, 180 104"/>
    <path d="M138 166 C 138 176, 134 184, 126 190 M126 190 C 140 198, 158 198, 172 192 M190 124 C 192 150, 184 172, 172 192 M126 190 C 124 230, 130 270, 140 300"/>
  </g>
  <path class="vl-halo" d="M184 214 C 182 184, 204 164, 230 166 C 258 168, 274 192, 270 218 C 268 232, 260 244, 250 250" stroke-width="3.6"/>
  <path d="M204 220 C 200 200, 214 188, 230 190 C 246 192, 254 206, 250 222 C 246 236, 236 244, 224 242 C 212 240, 206 232, 204 220 Z"/>
  <path d="M206 207 q2 -9 10 -8 q3 -7 11 -5 q7 -3 12 3 q7 3 7 10 M251 214 q5 3 2 8" stroke-width="3.2"/>
  <path d="M212 241 C 200 256, 192 278, 194 300 M240 243 C 256 260, 262 284, 256 304 M212 252 C 200 236, 190 214, 182 196"/>
  <path d="M182 196 q-6 -7 -10 -1 q-2 6 5 7" stroke-width="3.4"/>
  <path d="M238 262 C 234 276, 224 284, 212 286" stroke-width="3.6"/>
  <path d="M136 302 C 160 296, 186 298, 204 306 C 222 314, 244 314, 256 304" stroke-width="4.6"/>
  <path d="M256 304 C 266 300, 270 290, 266 282 M248 312 C 258 312, 266 306, 268 298 M150 338 C 156 320, 170 310, 190 308" stroke-width="3.4"/>
</svg>`;
}
function openRosary(set) {
  DS.marcar("rosario");
  set = MYST[set] ? set : MYST_BY_DAY[new Date().getDay()];
  closeRosary();
  const el = document.createElement("div");
  el.className = "ros-ov"; el.id = "rosOverlay";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Santo Rosario");
  const today = MYST_BY_DAY[new Date().getDay()];
  el.innerHTML = `<div class="ros-in">
    <div class="ros-top">
      <div><span class="ros-hand">reza con María</span><h2>Santo Rosario</h2></div>
      <button class="ros-x" data-action="rosClose" aria-label="Cerrar el Rosario">${icon("x")}</button>
    </div>
    <div class="ros-sets" role="tablist" aria-label="Misterios">${Object.keys(MYST).map((k) =>
      `<button role="tab" data-action="rosSet" data-set="${k}" aria-selected="${k === set}">${esc(MYST[k].name.replace("Misterios ", ""))}${k === today ? " · hoy" : ""}</button>`).join("")}</div>
    <div class="ros-main">
      <div class="ros-stage">
        <div class="ros-maria" aria-hidden="true">${virgenLinea()}</div>
        ${rosarySVG()}
        <div class="ros-center" data-action="rosNext" aria-live="polite"></div>
      </div>
      <aside class="ros-cita" id="rosCita" hidden aria-label="La Palabra de este misterio"></aside>
    </div>
    <div class="ros-ctl">
      <button class="btn btn-glass" data-action="rosPrev">${icon("left")} Anterior</button>
      <span class="ros-prog" id="rosProg"></span>
      <button class="btn btn-gold" data-action="rosNext" id="rosNextBtn">Siguiente ${icon("right")}</button>
    </div>
    <div class="ros-opts" role="group" aria-label="Cómo rezar">
      ${"speechSynthesis" in window ? `<button class="ros-opt" data-action="rosVoz" aria-pressed="${voz.on}">Voz que guía</button>
      <button class="ros-opt" data-action="rosAuto" aria-pressed="${voz.auto}" ${voz.on ? "" : "disabled"}>Avanzar solo</button>` : ""}
      <button class="ros-opt" data-action="rosRemote" aria-pressed="false">Control remoto</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  document.body.classList.add("cap-quiet");
  ros = { set, steps: rosSteps(set), i: rosLoad(set), el };
  el.querySelectorAll(".rb").forEach((g) => g.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = g.dataset.b, idx = ros.steps.findIndex((s) => s.b === id);
    if (idx >= 0) { ros.i = idx; rosPaint(); }
  }));
  rosPaint();
  el.querySelector("#rosNextBtn").focus();
}
function closeRosary() {
  remoteOff(); vozStop();
  document.getElementById("rosOverlay")?.remove();
  if (!document.getElementById("capOverlay")) document.body.classList.remove("cap-quiet");
  ros = null;
}
function rosPaint() {
  if (!ros) return;
  const { steps, i, el, set } = ros, s = steps[i], my = MYST[set];
  // Cuentas: rezadas, la actual y las que faltan.
  const last = {}; steps.forEach((x, n) => { last[x.b] = n; });
  el.querySelectorAll(".rb").forEach((g) => {
    const id = g.dataset.b;
    g.classList.toggle("now", s.b === id);
    g.classList.toggle("done", last[id] < i || (s.k === "fin"));
  });
  const [title, text] = s.k === "mys" ? [my.items[s.d], ""] : PR[s.k];
  let eyebrow = "", extra = "";
  if (s.d != null) eyebrow = `${ORD[s.d]} misterio ${ADJ[set]}`;
  else if (s.k === "credo" || s.k === "cruz") eyebrow = "Para comenzar";
  else if (s.k === "sa") eyebrow = "Para terminar";
  else if (s.k !== "fin") eyebrow = "Introducción";
  if (s.k === "mys") extra = `<span class="ros-cite">${esc(ROS_CITES[set][s.d])}</span><p class="ros-txt">Contemplamos este misterio en silencio, junto a María. Puedes ofrecer esta decena por alguien.</p>`;
  // Al llegar a la última Ave María (y luego al Gloria) aparece el botón de la oración que sigue.
  const nk = steps[i + 1] && steps[i + 1].k, nextK = (s.k === "am" && s.i === s.of && nk === "gl") || (s.k === "gl" && nk === "oj") ? nk : "";
  const count = s.k === "am" ? `<span class="ros-count">${s.i} de ${s.of}${s.note ? " · " + esc(s.note) : ""}</span>` : "";
  const mystLine = s.d != null && s.k !== "mys" ? `<span class="ros-myl">${esc(my.items[s.d])}</span>` : "";
  el.querySelector(".ros-center").innerHTML = `<div class="ros-c-in ${nextK ? "has-next" : ""} ${s.k === "mys" ? "is-mys" : ""} ${s.k === "fin" ? "is-fin" : ""}">
      ${eyebrow ? `<span class="ros-eb">${esc(eyebrow)}</span>` : ""}${mystLine}
      <strong class="ros-t">${esc(title)}</strong>${count}${extra}
      ${text ? txtHTML(s.k, text) : ""}
      ${nextK ? `<button class="ros-next-pr" data-action="rosNext">${esc(PR[nextK][0])} ${icon("right")}</button>` : ""}
      ${s.k === "fin" ? papa.finHTML() : ""}
    </div>`;
  el.querySelector(".ros-center").scrollTop = 0;
  // La cita del misterio, a un costado, durante toda la decena
  const cita = el.querySelector("#rosCita");
  if (cita) {
    const on = s.d != null && ROS_VERSOS[set];
    cita.hidden = !on;
    el.querySelector(".ros-in").classList.toggle("has-cita", !!on);
    if (on && cita.dataset.k !== `${set}-${s.d}`) {
      const [v, r] = ROS_VERSOS[set][s.d];
      cita.dataset.k = `${set}-${s.d}`;
      cita.innerHTML = `<span class="rc-eb">${esc(ORD[s.d])} misterio ${esc(ADJ[set])}</span>
        <strong class="rc-t">${esc(my.items[s.d])}</strong>
        <blockquote class="rc-v">«${esc(v)}»</blockquote>
        <span class="rc-ref">${esc(r)}</span>
        <span class="rc-leer">Para leer y meditar: ${esc(ROS_CITES[set][s.d])}</span>`;
    }
  }
  el.querySelector(".ros-maria")?.classList.toggle("is-fin", s.k === "fin");
  const decade = s.d != null ? `Decena ${s.d + 1} de 5` : s.k === "fin" ? "Terminado" : s.k === "sa" ? "Salve" : "Inicio";
  el.querySelector("#rosProg").textContent = decade;
  el.querySelector("[data-action=rosPrev]").disabled = i === 0;
  const nb = el.querySelector("#rosNextBtn");
  nb.innerHTML = s.k === "fin" ? `Otra vez ${icon("undo")}` : `${nextK ? esc(PR[nextK][0]) : "Siguiente"} ${icon("right")}`;
  rosSave();
  if (voz.on) guiar(s, title);
  if (remote) { remoteMeta(); keepAlive(); }
}
const flat = (t) => t.replace(/\n\n/g, "¶").replace(/\n/g, " ").replace(/¶/g, "\n\n");
// Con la voz que guía, se marca la parte que responde quien reza.
const RESP = { pn: "Danos hoy", am: "Santa María", gl: "Como era" };
function partes(k, text) { const i = RESP[k] ? text.indexOf(RESP[k]) : -1; return i > 0 ? [text.slice(0, i), text.slice(i)] : [text, ""]; }
function txtHTML(k, text) {
  if (k === "fin") return `<p class="ros-txt">${esc(text).replace(/\n/g, "<br>")}</p>`;
  const [g, r] = partes(k, text);
  if (!voz.on || !r) return `<p class="ros-txt">${esc(flat(text)).replace(/\n/g, "<br>")}</p>`;
  return `<p class="ros-txt">${esc(flat(g)).replace(/\n/g, "<br>")}</p><p class="ros-txt ros-tu"><span>Tú respondes</span>${esc(flat(r)).replace(/\n/g, "<br>")}</p>`;
}

// ---------------------------------------------------------------------------
// Voz que guía: el teléfono dirige el Rosario como en la capilla. Dice la primera parte de
// cada oración y deja el espacio para que quien reza responda. Con «Avanzar solo» pasa a la
// cuenta siguiente después de la respuesta; si no, espera un toque (o el control remoto).
// ---------------------------------------------------------------------------
const VK = "agape_rosario_voz";
let voz = { on: false, auto: true };
try { voz = { ...voz, ...JSON.parse(localStorage.getItem(VK) || "{}") }; } catch {}
let vozTok = 0, vozTimer = 0;
const vozSave = () => { try { localStorage.setItem(VK, JSON.stringify(voz)); } catch {} };
function vozVoice() {
  const v = speechSynthesis.getVoices();
  return v.find((x) => /^es[-_]CL/i.test(x.lang)) || v.find((x) => /^es[-_](419|MX|AR|CO|US)/i.test(x.lang)) || v.find((x) => /^es/i.test(x.lang)) || null;
}
function vozStop() { vozTok++; clearTimeout(vozTimer); try { speechSynthesis.cancel(); } catch {} }
function decir(text, done) {
  const tok = vozTok, v = vozVoice(), u = new SpeechSynthesisUtterance(text.replace(/([,;:.!?»])\s*\n+\s*/g, "$1 ").replace(/\s*\n+\s*/g, ". ").trim());
  u.lang = v ? v.lang : "es-CL"; if (v) u.voice = v; u.rate = 0.9;
  u.onend = () => { if (remote) remote.audio.play().catch(() => {}); if (tok === vozTok && done) done(); };
  speechSynthesis.speak(u);
}
function guiar(s, title) {
  vozStop();
  if (!("speechSynthesis" in window)) return;
  const tok = vozTok, next = (ms) => { if (voz.auto && s.k !== "fin") vozTimer = setTimeout(() => { if (tok === vozTok) rosMove(1); }, ms); };
  if (s.k === "mys") {
    const my = MYST[ros.set];
    decir(`${ORD[s.d]} misterio ${ADJ[ros.set]}. ${my.items[s.d]}.`, () => next(6000)); // un momento de silencio para contemplar
    return;
  }
  const [g, r] = partes(s.k, PR[s.k][1]);
  const words = r ? r.split(/\s+/).length : 0;
  decir((s.k === "fin" ? title + ". " : "") + g, () => next(r ? Math.round(words * 480 + 1200) : 1500));
}
function rosMove(n) {
  if (!ros) return;
  if (remote && navigator.vibrate) { const nx = ros.steps[Math.max(0, Math.min(ros.steps.length - 1, ros.i + n))]; try { navigator.vibrate(nx && (nx.k === "mys" || nx.k === "fin") ? [70, 90, 70] : 35); } catch {} }
  const cur = ros.steps[ros.i];
  if (n > 0 && cur.k === "am") rosas(cur.i === cur.of && cur.of === 10 ? 10 : 1); // una rosa por Ave María; al cerrar la decena, una corona
  if (n > 0 && cur.k === "fin") ros.i = 0;
  else ros.i = Math.max(0, Math.min(ros.steps.length - 1, ros.i + n));
  rosPaint();
}
// Rosas que suben desde la cuenta rezada: «rosario» viene de «corona de rosas» ofrecida a María.
const ROSA = `<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 30 C 20 40, 18 46, 16 51" fill="none" stroke="#3f8f4a" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M18 42 q-9 -2 -11 -9 q8 0 11 7 Z" fill="#5fae5a" stroke="#2d6b36" stroke-width="1.2"/>
  <path d="M20 31 C 9 31, 6 21, 9 14 C 12 18, 15 18, 20 13 C 25 18, 28 18, 31 14 C 34 21, 31 31, 20 31 Z" fill="#e0405a" stroke="#8f1f33" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M20 13 C 15 8, 12 12, 13 17 C 16 15, 18 15, 20 18 C 22 15, 24 15, 27 17 C 28 12, 25 8, 20 13 Z" fill="#f2637a" stroke="#8f1f33" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M15 22 q5 4 10 0 M17 18 q3 2 6 0" fill="none" stroke="#8f1f33" stroke-width="1.2" stroke-linecap="round"/></svg>`;
function rosas(cuantas) {
  if (!ros || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const stage = ros.el.querySelector(".ros-stage"), bead = ros.el.querySelector(".rb.now");
  if (!stage) return;
  const sr = stage.getBoundingClientRect(), br = bead ? bead.getBoundingClientRect() : { left: sr.left + sr.width / 2, top: sr.top + sr.height / 2, width: 0, height: 0 };
  for (let k = 0; k < cuantas; k++) {
    const r = document.createElement("span");
    r.className = "ros-rosa"; r.innerHTML = ROSA;
    const x = br.left - sr.left + br.width / 2, y = br.top - sr.top + br.height / 2;
    r.style.left = x + "px"; r.style.top = y + "px";
    r.style.setProperty("--dx", `${Math.round((Math.random() - .5) * (cuantas > 1 ? 220 : 90))}px`);
    r.style.setProperty("--rot", `${Math.round((Math.random() - .5) * 70)}deg`);
    r.style.setProperty("--s", (0.75 + Math.random() * 0.5).toFixed(2));
    r.style.animationDelay = `${k * 110}ms`;
    stage.appendChild(r);
    setTimeout(() => r.remove(), 3200 + k * 110);
  }
}

// ---------------------------------------------------------------------------
// Rezar el Rosario con un control remoto: el disparador Bluetooth de un palo de selfie, un
// control de presentaciones o los botones de unos audífonos. Los disparadores en modo Android
// envían «Enter»; los de presentaciones, flechas o «Av Pág»; los audífonos, «siguiente» o
// «play/pausa» (eso necesita un audio activo: se reproduce silencio). Con cada cuenta, el
// teléfono vibra suave; al empezar un misterio, vibra dos veces. Así se puede rezar sin mirar.
// ---------------------------------------------------------------------------
let remote = null, lastKey = 0;
// Chrome en Android solo muestra los controles multimedia (y recibe «siguiente») con audios de 5 s o más.
function silentWav() {
  const sr = 8000, n = sr * 20, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
function remoteOn() {
  const audio = new Audio(silentWav()); audio.loop = true; audio.volume = 0.01;
  remote = { audio };
  audio.play().catch(() => {});
  // Si otra cosa toma el audio (la voz que guía, una notificación), Android pausa este audio y deja
  // de enviar los toques del control. Se retoma solo.
  audio.addEventListener("pause", () => { setTimeout(() => { if (remote && remote.audio === audio) audio.play().catch(() => {}); }, 400); });
  const ms = navigator.mediaSession;
  if (ms) {
    try { ms.metadata = new MediaMetadata({ title: "Santo Rosario", artist: "Capilla Ágape", album: "Pastoral Juvenil Ágape" }); } catch {}
    const next = () => { rosMove(1); keepAlive(); }, prev = () => { rosMove(-1); keepAlive(); };
    [["nexttrack", next], ["play", next], ["pause", next], ["previoustrack", prev], ["seekforward", next], ["seekbackward", prev]].forEach(([a, f]) => { try { ms.setActionHandler(a, f); } catch {} });
  }
  // Vigía: cada 3 segundos revisa que el audio siga sonando y que Android siga viendo el reproductor.
  remote.watch = setInterval(keepAlive, 3000);
  remoteMeta();
  try { navigator.vibrate && navigator.vibrate(40); } catch {}
}
function keepAlive() {
  if (!remote) return;
  const a = remote.audio;
  if (a.paused) a.play().then(() => remoteState(true)).catch(() => remoteState(false)); else remoteState(true);
  try { navigator.mediaSession.playbackState = "playing"; } catch {}
}
// En la notificación se ve dónde va el Rosario (y así Android mantiene vivo el reproductor).
function remoteMeta() {
  if (!remote || !ros || !navigator.mediaSession) return;
  const s = ros.steps[ros.i], my = MYST[ros.set];
  const where = s.d != null ? `${ORD[s.d]} misterio · ${my.items[s.d]}` : s.k === "sa" || s.k === "fin" ? "Para terminar" : "Para comenzar";
  const what = s.k === "am" ? `Ave María ${s.i} de ${s.of}` : s.k === "mys" ? "Misterio" : PR[s.k][0];
  try { navigator.mediaSession.metadata = new MediaMetadata({ title: what, artist: where, album: "Santo Rosario · Capilla Ágape" }); } catch {}
}
function remoteState(ok) {
  const b = document.querySelector("[data-action=rosRemote]"); if (!b) return;
  b.classList.toggle("ros-opt-warn", !ok);
  b.textContent = ok ? "Control remoto" : "Control en pausa · tocar";
}
function remoteOff() {
  if (!remote) return;
  clearInterval(remote.watch);
  try { remote.audio.pause(); URL.revokeObjectURL(remote.audio.src); } catch {}
  const ms = navigator.mediaSession;
  if (ms) ["nexttrack", "play", "pause", "previoustrack", "seekforward", "seekbackward"].forEach((a) => { try { ms.setActionHandler(a, null); } catch {} });
  remote = null;
}
// Teclas que envían los controles (con una pausa corta, porque algunos mandan dos señales por toque)
const NEXT_KEYS = ["Enter", "NumpadEnter", "ArrowRight", "ArrowDown", "PageDown", "MediaTrackNext", "AudioVolumeUp", "VolumeUp", "MediaPlayPause", " "];
const PREV_KEYS = ["ArrowLeft", "ArrowUp", "PageUp", "MediaTrackPrevious", "AudioVolumeDown", "VolumeDown"];
window.addEventListener("keydown", (e) => {
  const ov = document.getElementById("rosOverlay"); if (!ov) return;
  const t = e.target;
  // Enter o espacio sobre otro botón del rosario (cerrar, elegir misterios) hacen lo suyo.
  if ((e.key === "Enter" || e.key === " ") && t && t.closest && t.closest("button") && !t.closest("#rosNextBtn, .ros-next-pr")) return;
  const d = NEXT_KEYS.includes(e.key) ? 1 : PREV_KEYS.includes(e.key) ? -1 : 0;
  if (!d) return;
  e.preventDefault(); e.stopPropagation();
  const now = Date.now(); if (now - lastKey < 300) return; lastKey = now;
  rosMove(d);
}, true);

function registerActions() {
  const A = ctx.actions;
  A.capMisaVivo = async () => {
    const u = prompt("Enlace de respaldo para la Misa en vivo (se usa los días en que no aparece la Misa del canal de Magnificat TV):", misaAdmin || MISA_VIVO);
    if (u === null) return;
    const url = u.trim() || MISA_VIVO;
    if (!/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url)) { toast("Tiene que ser un enlace de YouTube", ""); return; }
    try { await ctx.cloud.saveMisaVivo({ url }); misaVivoAt = 0; loadMisaVivo(); toast(misaHoy ? "Guardado. Hoy se muestra la Misa del día del canal; tu enlace se usa cuando no la encuentre" : "Enlace guardado"); }
    catch { toast("No se pudo guardar", ""); }
  };
  const vozBtns = () => { document.querySelectorAll("[data-action=rosVoz]").forEach((b) => b.setAttribute("aria-pressed", String(voz.on)));
    document.querySelectorAll("[data-action=rosAuto]").forEach((b) => { b.setAttribute("aria-pressed", String(voz.auto)); b.disabled = !voz.on; }); };
  A.rosVoz = () => { voz.on = !voz.on; vozSave(); vozBtns(); if (!voz.on) vozStop(); rosPaint();
    if (voz.on) toast(voz.auto ? "La voz guía y avanza sola. Responde tú la segunda parte." : "La voz guía; tú avanzas con un toque o con el control."); };
  A.rosAuto = () => { voz.auto = !voz.auto; vozSave(); vozBtns(); rosPaint(); };
  A.rosRemote = (el) => {
    if (remote && el.classList.contains("ros-opt-warn")) { remote.audio.play().then(() => remoteState(true)).catch(() => {}); return; }
    if (remote) { remoteOff(); el.setAttribute("aria-pressed", "false"); el.textContent = "Control remoto"; return; }
    remoteOn(); el.setAttribute("aria-pressed", "true");
    toast("Listo: cada toque del control pasa a la cuenta siguiente");
  };
  A.capVid = (el) => {
    vidSel = el.dataset.v === "ev" ? "ev" : "misa";
    document.querySelectorAll("[data-action=capVid]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === vidSel));
    const m = document.getElementById("capMisa"), e = document.getElementById("capEvVid");
    if (m) m.hidden = vidSel !== "misa"; if (e) e.hidden = vidSel !== "ev";
    // el video que queda oculto se detiene: vuelve a su miniatura
    if (vidSel === "misa" && e && e.querySelector("iframe")) e.innerHTML = evVideoHTML();
    if (vidSel === "ev" && m && m.querySelector("iframe")) m.innerHTML = misaHTML();
  };
  A.evPlay = (el) => {
    const id = el.dataset.id; if (!/^[\w-]{6,20}$/.test(id)) return;
    const w = document.createElement("div"); w.className = "ev-video";
    w.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" title="${el.dataset.t ? "La Misa de hoy" : "Evangelio del día en video"}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    const cur = el.dataset.swap ? document.querySelector(".cap-ev .ev-video") : el;
    if (el.dataset.swap) el.remove();
    (cur || el).replaceWith(w);
  };

  // Devocionario: un selector y una sola tarjeta con la oración elegida
  document.addEventListener("change", (e) => { if (e.target.id === "capDevSel") devShow(e.target.value); });
  A.capProject = () => devProject(document.getElementById("capDevSel")?.value || devCurrent());
  A.capProjPrev = () => devProjMove(-1);
  A.capProjNext = () => devProjMove(1);
  A.capProjClose = () => devProjClose();
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("capProj")) return;
    if (e.key === "Escape") { e.preventDefault(); devProjClose(); }
    else if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); devProjMove(1); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); devProjMove(-1); }
  });
  let psx = null;
  document.addEventListener("touchstart", (e) => { if (document.getElementById("capProj")) psx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener("touchend", (e) => { if (psx == null || !document.getElementById("capProj")) return; const dx = e.changedTouches[0].clientX - psx; psx = null; if (Math.abs(dx) > 60) devProjMove(dx < 0 ? 1 : -1); }, { passive: true });
  A.capRosario = (el) => openRosary(el.dataset.set);
  A.rosClose = () => closeRosary();
  A.rosNext = () => rosMove(1);
  A.rosPrev = () => rosMove(-1);
  A.rosSet = (el) => { if (!ros || el.dataset.set === ros.set) return; ros.set = el.dataset.set; ros.steps = rosSteps(ros.set); ros.i = 0;
    ros.el.querySelectorAll(".ros-sets button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.set === ros.set))); rosPaint(); };
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("rosOverlay")) return;
    if (e.key === "Escape") { e.preventDefault(); closeRosary(); }
  });
  A.capAltar = (el) => { if (el.closest && el.closest(".cap-altar-body")) return; setAltar(!altarOpen); };
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("cap-altar-top")) { e.preventDefault(); setAltar(!altarOpen); } });
  A.velaMore = (el) => { const p = el.previousElementSibling; const open = p.classList.toggle("cap-clamp"); el.textContent = open ? "Leer todo" : "Mostrar menos"; };
  A.capGuide = (el) => openGuide(el.dataset.k);
  A.capGdNext = () => guideMove(1);
  A.capGdPrev = () => guideMove(-1);
  A.capGdEnd = () => stopSilence(true);
  A.capStop = () => stopSilence(false);
  A.capPray = (el) => {
    const on = el.dataset.on === "1";
    if (on) el.closest(".cap-vela")?.classList.add("cap-vela-joined");
    const id = el.dataset.id;
    if (id.startsWith("fiesta:")) {
      ctx.cloud.prayFiesta(id.slice(7), on).then(() => {
        const v = velasFiesta.find((x) => x.id === id), me = ctx.cloud.myUid(), acc = st().account || {};
        if (v) { v.prays = { ...v.prays }; if (on) v.prays[me] = { n: ctx.cloud.shortName(acc.name || ""), a: acc.avatar || "" }; else delete v.prays[me]; }
        paintVelas(); if (on) toast("Gracias por rezar con la comunidad");
      }).catch(() => toast("No se pudo guardar", ""));
      return;
    }
    (id.startsWith("red:") ? ctx.cloud.prayIntencionRed(id.slice(4), on) : ctx.cloud.prayVela(id, on)).then(() => { if (on) toast("Gracias por rezar con la comunidad"); }).catch(() => toast("No se pudo guardar", ""));
  };
  A.capVelaDel = (el) => {
    if (!confirm("¿Retirar esta vela? Ya no se verá en la Capilla.")) return;
    const id = el.dataset.id;
    (id.startsWith("red:") ? ctx.cloud.deleteIntencionRed(id.slice(4)) : ctx.cloud.deleteVela(id)).catch(() => toast("No se pudo retirar", ""));
  };
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("capOverlay")) return;
    if (e.key === "Escape") stopSilence(false);
    else if (gd && e.key === "ArrowRight") { e.preventDefault(); gd.i === gd.steps.length - 1 ? stopSilence(true) : guideMove(1); }
    else if (gd && e.key === "ArrowLeft") { e.preventDefault(); guideMove(-1); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "velaText") return;
    const n = $("#velaN"); if (n) n.textContent = `${e.target.value.length}/1500`;
    $("#velaForm .cap-candle")?.classList.toggle("lit", e.target.value.trim().length > 0);
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "velaForm") return;
    e.preventDefault();
    const ta = $("#velaText"), btn = e.target.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      await ctx.cloud.lightVela(ta.value.trim());
      ta.value = ""; toast("Tu vela ya está encendida. La comunidad reza contigo.");
      e.target.querySelector(".cap-candle")?.classList.add("lit");
      const n = $("#velaN"); if (n) n.textContent = "0/1500";
    } catch (err) {
      console.warn(err);
      const denied = /permission|insufficient/i.test(String(err && (err.code || err.message)));
      toast(denied && ta.value.trim().length > 140 ? "Por ahora la intención puede tener hasta 140 caracteres. Acórtala un poquito" : "No se pudo compartir. Revisa tu conexión.", "");
    }
    btn.disabled = false;
  });
}
