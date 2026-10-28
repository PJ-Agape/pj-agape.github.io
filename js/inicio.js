// Inicio ordenado en tres bloques (Formación · Orar · Comunidad), sus páginas
// de bloque (#/formacion y #/red) y el buscador de toda la app (#/buscar).

import * as conocer from "./conocer.js";
import * as S from "./store.js";
import * as cloud from "./cloud.js";
import { esc, icon } from "./util.js";
import { illus } from "./ilustraciones.js";
import { ORACIONES } from "./devocionario.js";
import { BANCO } from "./dinamicas-banco.js";
import { songList } from "./cancionero.js";
import { SALMOS } from "./salmos.js";
import { helpFor, perfil } from "./ayuda.js";
import { todayGospel } from "./capilla.js";
import { cfg as inicioCfg, adopt as adoptInicio } from "./inicio-config.js";

let ctx = null; // { actions, onAfterRender, render }
export function setup(c) { ctx = c; registerActions(); }

// ---------------------------------------------------------------------------
// Quién eres (decide qué se muestra)
// ---------------------------------------------------------------------------
function who() {
  const s = cloud.enabled ? cloud.state() : { ready: true, role: "admin", isGuide: true };
  const joven = cloud.enabled && !!s.isJoven, asp = !!s.ready && s.role === "aspirante";
  return {
    s, joven, asp, guest: cloud.enabled && !s.ready,
    curso: S.hasVisibleCourse(), // hay un curso para esta persona (los visitantes y jóvenes ven solo los abiertos, como la guía)
    equipo: !cloud.enabled || (!!s.ready && !joven && !asp), // materiales, dinámicas, guía
    guia: !cloud.enabled || !!s.isGuide,
    cuenta: !cloud.enabled || !!s.ready,
  };
}

// ---------------------------------------------------------------------------
// Los tres bloques y todo lo que hay dentro
// ---------------------------------------------------------------------------
export const BLOCKS = {
  formacion: { t: "Formación", hand: "para crecer", href: "#/formacion", ill: "apostoles", c: "#1351a4", soft: "#e1f3fd",
    d: "El curso de dirigentes, los cursos de la comunidad y los recursos para preparar." },
  red: { t: "Comunidad", hand: "para encontrarnos", href: "#/red", ill: "amigos", c: "#ef591c", soft: "#fde0d2",
    d: "El muro, el chat, la agenda y todo lo que compartimos como grupo." },
  espiritu: { t: "Orar", hand: "para rezar", href: "#/oracion", ill: "jesus", c: "#c98a00", soft: "#fff0c2",
    d: "La Capilla: el Evangelio del día, intenciones, oraciones, cantos y radios católicas." },
};
// e: emoji · t: título · d: descripción · kw: palabras para el buscador · ok: quién lo ve
const ITEMS = [
  { b: "formacion", e: "", t: "Cursos", d: "La guía de agAPPe y los cursos de formación.", href: "#/itinerario", kw: "curso cursos formacion itinerario unidades modulos guia tutorial bienvenido agappe manual como funciona", ok: (w) => w.curso },
  { b: "formacion", e: "", t: "Mi cuaderno", d: "Lo que escribiste en las reflexiones.", href: "#/cuaderno", kw: "cuaderno notas reflexion respuestas", ok: (w) => w.curso, hub: false },
  { b: "formacion", e: "", t: "Credenciales", d: "Tarjetas de solapa con foto, nombre y parroquia para los encuentros.", href: "#/credenciales", kw: "credenciales credencial tarjeta solapa lanyard portacredencial gafete nombre encuentro retiro", ok: (w) => w.equipo || w.asp, hub: false }, // vive en Materiales → Para imprimir
  { b: "formacion", e: "", t: "Materiales", d: "Presentaciones, guías, banco de dinámicas y todo lo que se imprime.", href: "#/materiales", kw: "materiales recursos documentos biblioteca links imprimir presentaciones guias dinamicas credenciales", ok: (w) => w.equipo || w.asp },
  { b: "formacion", e: "", t: "Materiales", d: "Difusión, cancionero, oraciones y la biblioteca digital.", href: "#/materiales", kw: "materiales recursos biblioteca difusion cancionero oremus", ok: (w) => !w.equipo && !w.asp },
  { b: "formacion", e: "", t: "Dinámicas", d: "Juegos, rompehielos y dinámicas de oración.", href: "#/dinamicas", kw: "dinamicas juegos rompehielos actividades", ok: (w) => w.equipo, hub: false },
  { b: "formacion", e: "", t: "¿Quieres ser dirigente?", d: "Presentación «Sé puente».", href: "presentaciones/se-puente.html", ext: true, kw: "dirigente se puente vocacion servir", ok: (w) => w.guest || w.joven },
  { b: "red", e: "", t: "Muro", d: "Avisos, logros y conversaciones del grupo.", href: "#/muro", kw: "muro avisos publicaciones noticias logros encuesta plaza", ok: () => true, hub: false }, // en La Plaza Ágape
  { b: "red", e: "", t: "Podcast Ágape", d: "Episodios de nuestro podcast.", href: "#/podcast", kw: "podcast episodios youtube escuchar audio canal", ok: () => true, hub: false }, // franja de radios en Inicio
  { b: "red", e: "", t: "Juegos", d: "El Impostor, ¡En la frente!, Trivia Ágape y más.", href: "#/juegos", kw: "juegos jugar trivia preguntas impostor mimica mimicas frente adivinar charadas dinamica plaza", ok: () => true, hub: false }, // en La Plaza Ágape
  { b: "red", e: "💬", t: "Chat", d: "Salas para conversar en grupo.", href: "#/chat", kw: "chat salas mensajes conversar zumbido plaza", ok: () => true, hub: false }, // en La Plaza Ágape
  { b: "red", e: "", t: "Agenda", d: "Encuentros, misas y actividades.", href: "#/agenda", kw: "agenda calendario actividades fechas misa retiro", ok: () => true, hub: false }, // franja propia en Comunidad
  { b: "red", e: "", t: "Jóvenes", d: "La lista del grupo y sus fichas privadas.", href: "#/acompanar", kw: "acompanar lista jovenes guia fichas cumpleanos", ok: (w) => w.guia && cloud.enabled, hub: false },
  // El equipo encuentra la difusión y la guía de servicio en Materiales; los jóvenes (sin Materiales) siguen viendo la difusión aquí.
  { b: "red", e: "", t: "Estudio de difusión", d: "Marco de foto, historias, fondos y stickers.", href: "#/difusion", kw: "difusion stickers fondos de pantalla marco foto historias invitacion afiche", ok: (w) => w.cuenta, hub: (w) => !w.equipo },
  { b: "red", e: "", t: "Guía de servicio", d: "Presentación: identidad, roles, cargos y reuniones.", href: "presentaciones/guia-de-servicio.html", ext: true, kw: "guia servicio pastoral identidad roles cargos reuniones comunidad presentacion", ok: (w) => w.equipo, hub: false },
  { b: "espiritu", e: "", t: "Nuestra Capilla", d: "Silencio, intenciones, la Palabra y María: un lugar para estar con Jesús.", href: "#/oracion", kw: "capilla oracion rezar velas intenciones espiritualidad", ok: () => true },
  { b: "espiritu", e: "", t: "Evangelio del día", d: "La Palabra de hoy.", href: "#/evangelio", kw: "evangelio palabra lectura hoy biblia", ok: () => true },
  { b: "espiritu", e: "", t: "Oremus", d: "Nuestras oraciones y las de siempre: Padre nuestro, Ave María, Credo y más.", href: "#/oremus", kw: "oraciones devocionario rezar oremus", ok: () => true },
  { b: "espiritu", e: "", t: "Rezar el Rosario", d: "Paso a paso, cuenta a cuenta, con María.", href: "#/oracion/rosario", kw: "maria virgen rosario misterios", ok: () => true },
  { b: "espiritu", e: "", t: "Nuestras intenciones", d: "Comparte tu intención y reza por las de otros.", href: "#/oracion/velas", kw: "vela intencion rezar por", ok: () => true },
  { b: "espiritu", e: "", t: "Oremos con los salmos", d: "Un salmo para cada momento y cómo rezarlo.", href: "#/salmos", kw: "salmos salmo orar rezar biblia lectio pastor miedo triste gracias perdon", ok: () => true },
  { b: "espiritu", e: "", t: "Cancionero", d: "Canciones con acordes para la misa.", href: "#/cancionero", kw: "cancionero canciones acordes misa cantos guitarra", ok: () => true },
  { b: "espiritu", e: "", t: "Radios católicas", d: "Radio María, El Sembrador y Regina Coeli.", href: "#/oracion/radio", kw: "radio maria sembrador regina coeli escuchar", ok: () => true },
  { b: "espiritu", e: "", t: "Un rato con Jesús", d: "Oración personal en casa o ante el Santísimo.", href: "#/oracion/silencio", kw: "silencio oracion personal mental teresa guiada adoracion santisimo", ok: () => true },
];
const descFor = (k, w) => k !== "formacion" ? BLOCKS[k].d
  : w.equipo ? BLOCKS.formacion.d
  : "Crecer en la fe y aprender a acompañar a otros.";
export const itemsFor = (b) => { const w = who(); return ITEMS.filter((x) => x.b === b && x.ok(w)); };
const inHub = (x) => { const h = x.hub; return h === undefined ? true : typeof h === "function" ? h(who()) : h; };
const itemCard = (x) => x.links ? `<div class="card hub-item hub-multi">
    <span class="hub-e" aria-hidden="true">${icon({ formacion: "route", red: "users", espiritu: "flame" }[x.b] || "sparkle")}</span><span><strong>${esc(x.t)}</strong><span class="muted small">${esc(x.d)}</span>
    <span class="hub-links">${x.links.filter((l) => !l[2] || l[2](who())).map(([l, h]) => `<a class="chip-link" href="${esc(h)}">${esc(l)} ${icon("right")}</a>`).join("")}</span></span></div>`
  : `<a class="card link hub-item" href="${esc(x.href)}" ${x.ext ? 'target="_blank" rel="noopener"' : ""}>
    <span class="hub-e" aria-hidden="true">${icon({ formacion: "route", red: "users", espiritu: "flame" }[x.b] || "sparkle")}</span><span><strong>${esc(x.t)}</strong><span class="muted small">${esc(x.d)}</span></span>${icon("right")}</a>`;

// ---------------------------------------------------------------------------
// Inicio: saludo + buscador + los tres bloques
// ---------------------------------------------------------------------------
// Cita del Evangelio del día bajo el saludo
export async function paintGospel() {
  const el = document.getElementById("homeGospel"); if (!el) return;
  const g = await todayGospel().catch(() => null);
  if (!g || !g.cita) return;
  const f = String(g.frase || "").trim().replace(/^[«"“]+|[»"”]+$/g, "");
  el.classList.toggle("is-long", f.length > 110);
  el.innerHTML = `<i class="hg-mark" aria-hidden="true">“</i>
    <span class="hg-k">${icon("book")} Evangelio de hoy <b>${esc(g.cita)}</b></span>
    ${f ? `<span class="hg-f">${esc(f)}</span>` : `<span class="hg-f">Escucha hoy la Palabra de Jesús</span>`}
    <span class="hg-go">Leer el Evangelio ${icon("arrowR")}</span>`;
  el.hidden = false;
}
export function greetHTML() {
  const w = who();
  const name = (cloud.enabled ? (w.s.account || {}).name : S.getProfile().name) || "";
  const first = String(name).split(" ")[0];
  const h = new Date().getHours(), saludo = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
  return `<section class="home-hi">
    <span class="home-hand">${esc(w.guest ? inicioCfg().saludo.visita : inicioCfg().saludo.cuenta)}</span>
    <h1>${esc(saludo)}${first ? `, <em>${esc(first)}</em>` : ""}</h1>
    <a class="home-gospel" id="homeGospel" href="#/evangelio" hidden></a>
  </section>`;
}
const searchBox = (id, val = "") => `<form class="home-search" role="search" data-search="${id}" onsubmit="return false">
    ${icon("search")}<input id="${id}" type="search" placeholder="Buscar en agAPPe: canción, oración, unidad…" autocomplete="off" value="${esc(val)}" aria-label="Buscar en la app">
  </form><div class="search-res" id="${id}Res" aria-live="polite"></div>`;

// Puertas a los tres bloques (Inicio): grandes, de color, a un toque
export function doorsHTML() {
  return `<nav class="doors" aria-label="Bloques de agAPPe">${["formacion", "red", "espiritu"].map((k) => { const b = BLOCKS[k];
    return `<a class="door" href="${b.href}" style="--bc:${b.c};--bs:${b.soft}"><span class="door-ill">${illus(b.ill, "")}</span><span class="door-h">${esc(b.hand)}</span><strong>${esc(b.t)}</strong></a>`; }).join("")}</nav>`;
}
export function blocksHTML() {
  const w = who(), course = S.activeCourse(), st = S.courseState(course);
  const status = {
    formacion: w.curso ? `<span class="blk-bar"><i style="width:${st.totalSessions ? Math.round((st.readSessions / st.totalSessions) * 100) : 0}%"></i></span>${st.readSessions}/${st.totalSessions} unidades del curso`
      : "Ingresa para empezar tu camino",
    red: `<span id="blkRed">${w.cuenta ? "Lo que pasa en el grupo" : "La agenda está abierta para todos"}</span>`,
    espiritu: `<span id="blkGospel">Pasa, Él te espera</span>`,
  };
  ctx.onAfterRender(async () => {
    const g = await todayGospel().catch(() => null);
    const el = document.getElementById("blkGospel"); if (el && g && g.cita) el.textContent = `Evangelio de hoy · ${g.cita}`;
  });
  return `<div class="blocks">${Object.entries(BLOCKS).map(([k, b]) => {
    const chips = itemsFor(k).slice(0, 4);
    return `<section class="blk" style="--bc:${b.c};--bs:${b.soft}">
      <a class="blk-main" href="${b.href}">
        <span class="blk-ill">${illus(b.ill)}</span>
        <span class="blk-txt"><span class="blk-hand">${esc(b.hand)}</span><strong class="blk-t">${esc(b.t)}</strong>
        <span class="blk-d">${esc(descFor(k, w))}</span><span class="blk-st">${status[k]}</span></span>
        <span class="blk-go" aria-hidden="true">${icon("arrowR")}</span>
      </a>
      <nav class="blk-chips" aria-label="${esc(b.t)}">${chips.map((x) => `<a href="${esc(x.href)}" ${x.ext ? 'target="_blank" rel="noopener"' : ""}>${esc(x.t)}</a>`).join("")}</nav>
    </section>`;
  }).join("")}</div>`;
}

// ---------------------------------------------------------------------------
// Páginas de bloque
// ---------------------------------------------------------------------------
// Materiales, en grande como el curso: lo que trae cada uno según si tiene cuenta.
function matBanner(w) {
  const team = w.equipo || w.asp; // los aspirantes también ven los materiales completos
  const L = { Difusión: "#/difusion", Cancionero: "#/cancionero", Oremus: "#/oremus", Dinámicas: "#/dinamicas" };
  const parts = team ? ["Presentaciones", "Difusión", "Cancionero", "Oremus", "Dinámicas", "Para imprimir", "Biblioteca digital"]
    : ["Difusión", "Cancionero", "Oremus", "Biblioteca digital"];
  return `<section class="hub-cbanner is-mat" aria-labelledby="hubMT">
    <div class="hub-cb-txt">
      <span class="eyebrow">${team ? "Herramientas de la pastoral" : "Para todos"}</span>
      <span class="hub-cb-hand">${team ? "para preparar cada encuentro" : "para invitar, cantar y rezar"}</span>
      <h2 id="hubMT">Materiales</h2>
      <p class="hub-cb-meta">${team ? "Todo lo que necesitas para preparar, animar e invitar, en un solo lugar." : "Arma invitaciones, canta con el cancionero, reza con Oremus y conoce los documentos de la Iglesia."}</p>
      <div class="hub-mat-tags">${parts.map((t) => `<a href="${L[t] || "#/materiales"}">${esc(t)}</a>`).join("")}</div>
      <div class="hub-cb-btns"><a class="btn btn-gold" href="#/materiales"><span class="hub-btn-l">Abrir Materiales</span> ${icon("arrowR")}</a><a class="btn btn-ghost" href="#/difusion">Estudio de difusión</a></div>
    </div>
    <div class="hub-cb-art" aria-hidden="true"><i class="hub-cb-sun"></i>${illus("biblia", "hub-cb-il")}</div>
  </section>`;
}
// El curso, en grande: como las diapositivas de Inicio (ilustración, título y el paso que sigue).
function courseBanner(course, st) {
  const pct = st.totalSessions ? Math.round((st.readSessions / st.totalSessions) * 100) : 0;
  const nx = st.next, ses = nx && nx.type === "session" ? nx.session : null;
  const ph = nx ? (course.phases[nx.phase] || {}) : {};
  const ab = !!course.abierto;
  const main = st.complete ? (ab ? { href: "#/itinerario", label: "Volver a recorrerla" } : { href: "#/constancia", label: "Ver mi constancia" })
    : ses ? { href: `#/vivir/${nx.phase}/${encodeURIComponent(ses.id)}`, label: st.readSessions ? "Seguir donde quedé" : ab ? "Comenzar" : "Comenzar el curso" }
    : nx ? { href: "#/itinerario", label: `Rendir la evaluación del módulo ${ph.phaseNum || nx.phase + 1}` } : { href: "#/itinerario", label: "Ver el curso" };
  const now = st.complete ? (ab ? "¡Ya conoces la casa! Te esperamos en el próximo encuentro." : "¡Completaste el curso! Gracias por tu entrega.") : ses ? `Ahora: ${ses.id ? esc(ses.id) + " · " : ""}${esc(ses.title)}` : nx ? `Te falta la evaluación de «${esc(ph.title || "este módulo")}»` : "";
  return `<section class="hub-cbanner hub-curso${st.complete ? " is-done" : ""}" data-curso-id="${esc(course.id)}" aria-labelledby="hubCT-${esc(course.id)}">
    <div class="hub-cb-txt">
      <span class="eyebrow">${ab ? "Para todos" : "Curso de formación de dirigentes"}</span>
      <span class="hub-cb-hand">${st.complete ? (ab ? "bienvenido a casa" : "¡lo lograste!") : ab ? "empieza por aquí" : "tu camino de dirigente"}</span>
      <h2 id="hubCT-${esc(course.id)}">${esc(course.title)}</h2>
      <div class="hub-cb-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Avance del curso"><i style="width:${pct}%"></i></div>
      <p class="hub-cb-meta"><b>${st.readSessions} de ${st.totalSessions}</b> unidades · <b>${st.donePhases} de ${course.phases.length}</b> módulos</p>
      ${now ? `<p class="hub-cb-now">${now}</p>` : ""}
      <div class="hub-cb-btns"><a class="btn btn-gold" href="${main.href}" data-curso="${esc(course.id)}">${esc(main.label)} ${icon("arrowR")}</a><a class="btn btn-ghost" href="#/itinerario" data-curso="${esc(course.id)}">Ver el itinerario</a></div>
    </div>
    <div class="hub-cb-art" aria-hidden="true"><i class="hub-cb-sun"></i>${illus(ab ? "acogida" : st.complete ? "envio" : "camino", "hub-cb-il")}</div>
  </section>`;
}
// Todos los cursos que la persona puede hacer, juntos en una tarjeta que se desliza.
function cursosHTML(active) {
  const list = S.content().courses.filter((x) => !x.hidden || x.id === active.id);
  if (list.length < 2) return `<div class="hub-cursos is-one">${courseBanner(active, S.courseState(active))}</div>`;
  const i0 = Math.max(0, list.findIndex((x) => x.id === active.id));
  ctx.onAfterRender(() => cursosInit(i0));
  return `<div class="hub-cursos" aria-roledescription="carrusel" aria-label="Tus cursos">
    <div class="hub-cur-track" id="hubCurTrack">${list.map((x) => courseBanner(x, S.courseState(x))).join("")}</div>
    <div class="hub-cur-ctrl">
      <button type="button" class="icon-btn" data-curgo="-1" aria-label="Curso anterior">${icon("left")}</button>
      <div class="hub-cur-dots">${list.map((x, i) => `<button type="button" data-curto="${i}" aria-label="${esc(x.title)}" class="${i === i0 ? "on" : ""}"></button>`).join("")}</div>
      <span class="hub-cur-n" id="hubCurN">${i0 + 1} de ${list.length}</span>
      <button type="button" class="icon-btn" data-curgo="1" aria-label="Curso siguiente">${icon("right")}</button>
    </div>
  </div>`;
}
function cursosInit(i0) {
  const tr = document.getElementById("hubCurTrack"); if (!tr) return;
  const n = tr.children.length, box = tr.closest(".hub-cursos");
  const cur = () => Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth));
  const go = (i, smooth = true) => tr.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * tr.clientWidth, behavior: smooth ? "smooth" : "auto" });
  const paint = () => {
    const i = cur();
    box.querySelectorAll("[data-curto]").forEach((d, j) => d.classList.toggle("on", j === i));
    const lbl = document.getElementById("hubCurN"); if (lbl) lbl.textContent = `${i + 1} de ${n}`;
    box.querySelector('[data-curgo="-1"]').disabled = i === 0; box.querySelector('[data-curgo="1"]').disabled = i === n - 1;
  };
  go(i0, false); paint();
  tr.addEventListener("scroll", () => requestAnimationFrame(paint), { passive: true });
  box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-curgo], [data-curto]"); if (!b) return;
    go(b.dataset.curto != null ? +b.dataset.curto : cur() + +b.dataset.curgo);
  });
}
// Al abrir un curso desde su tarjeta, ese queda como el curso activo
if (typeof document !== "undefined") document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[data-curso]"); if (a) S.setActiveCourse(a.dataset.curso);
}, true);
export function viewFormacion() {
  const w = who(), course = S.activeCourse(), st = S.courseState(course);
  const b = BLOCKS.formacion;
  return `<header class="page-head hub-head" style="--bc:${b.c}"><span class="eyebrow">Bloque 1 · ${esc(b.hand)}</span><h1>Formación</h1><p>${esc(descFor("formacion", w))}</p></header>
  ${w.curso ? cursosHTML(course) : ""}
  ${matBanner(w)}
  <div class="hub-grid">${itemsFor("formacion").filter((x) => inHub(x) && x.href !== "#/itinerario" && x.href !== "#/materiales").map(itemCard).join("")}</div>
`;
}
// La Plaza Ágape: nuestra red social. Junta lo que vivimos (Momentos), lo que conversamos (Muro)
// y lo que nos decimos (Chat). Cada parte sigue funcionando igual; esto es solo la puerta de entrada.
const emT = (t) => esc(t || "").replace(/\*(.+?)\*/g, "<em>$1</em>");
const pdoor = (d, href, cls, ico, slot = "") => !d || d.on === false ? "" : `<a class="plaza-door ${cls}" href="${href}">
      <span class="plaza-ico" aria-hidden="true">${ico}</span>
      <span class="plaza-dt"><small>${esc(d.kicker)}</small><b>${esc(d.title)}</b><span>${esc(d.text)}</span></span>${slot}${icon("right")}</a>`;
function plazaHTML() {
  const c = inicioCfg().plaza, d = c.doors;
  return `<section class="plaza" aria-labelledby="plazaT">
    <div class="plaza-scene">${illus("plaza", "plaza-ill")}</div>
    <div class="plaza-head">
      ${c.hand ? `<span class="plaza-hand">${esc(c.hand)}</span>` : ""}
      <h2 id="plazaT">${emT(c.title)}</h2>
      ${c.text ? `<p>${esc(c.text)}</p>` : ""}
    </div>
    <div class="plaza-doors">
      ${pdoor(d.muro, "#/muro", "is-muro", icon("grid"), `<span class="plaza-pics" id="plazaPics" aria-hidden="true"></span>`)}
      ${pdoor(d.chat, "#/chat", "is-chat", icon("chat"))}
      ${pdoor(d.juegos, "#/juegos", "is-jg", icon("dice"))}
    </div>
  </section>`;
}
// Trae los cambios del equipo (textos y radios) y vuelve a pintar si algo cambió.
export function refreshInicioCfg(repaint) {
  cloud.getInicioCfg?.().then((v) => { if (v && adoptInicio(v) && repaint) repaint(); }).catch(() => {});
}
export function viewRed() {
  const b = BLOCKS.red;
  return `<header class="page-head hub-head" style="--bc:${b.c}"><span class="eyebrow">Bloque 2 · ${esc(b.hand)}</span><h1>Comunidad</h1><p>${esc(b.d)}</p></header>
  <div id="desafioSlot" class="red-desafio"></div>
  <div class="ag-panel-slot" data-ag-panel="todas"></div>
  ${plazaHTML()}
  <div class="hub-grid">${itemsFor("red").filter(inHub).map(itemCard).join("")}</div>
  <div class="red-end">${conocer.inviteCard()}<div id="waSlot"></div></div>
`;
}

// ---------------------------------------------------------------------------
// Buscador
// ---------------------------------------------------------------------------
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
let agendaCache = null;
function index() {
  const w = who(), out = [];
  const add = (g, e, t, d, href, kw = "", ext = false) => out.push({ g, e, t, d, href, ext, s: norm(`${t} ${kw}`), sd: norm(d) });
  ITEMS.filter((x) => x.ok(w)).forEach((x) => add("Secciones", x.e, x.t, `${BLOCKS[x.b].t} · ${x.d}`, x.href, x.kw, x.ext));
  add("Secciones", "", "Mi perfil y avatar", "Tu cuenta, tu avatar y tu tema.", "#/perfil", "perfil cuenta avatar foto nombre tema oscuro");
  add("Secciones", "", "Ayuda", "Respuestas cortas: ¿cómo hago…?", "#/ayuda", "ayuda como hago tutorial");
  add("Secciones", "", "Accesibilidad", "Tamaño de letra y lectura en voz alta.", "#/accesibilidad", "accesibilidad letra grande leer voz");
  if (w.curso) {
    const c = S.activeCourse();
    (c.phases || []).forEach((p, pi) => (p.sessions || []).forEach((s) => add("Unidades del curso", "", `${s.id} ${s.title}`, p.title, `#/unidad/${pi}/${encodeURIComponent(s.id)}`, s.summary || "")));
  }
  ORACIONES.forEach((o) => add("Oraciones", "", o.t, o.note || "Oremus", `#/oremus/${encodeURIComponent(o.t)}`));
  SALMOS.forEach((s) => add("Salmos", "", `Salmo ${s.n} · ${s.t}`, `«${s.v}»`, `#/salmos/${s.n}`, s.intro));
  try { songList().forEach((s) => add("Canciones", "", s.title, s.author || "Cancionero", `#/cancionero/${encodeURIComponent(s.id)}`, (s.momentos || []).join(" "))); } catch {}
  if (w.equipo) BANCO.forEach((d) => add("Dinámicas", "", d.title, d.objetivo, `#/dinamicas/${encodeURIComponent(d.id)}`, (d.tags || []).join(" ")));
  helpFor(perfil()).forEach((h) => add("Ayuda", "", h.q, h.a[0] || "", `#/ayuda?t=${h.t}`));
  (agendaCache || []).forEach((e) => add("Agenda", "", e.title, `${e.date || ""}${e.place ? " · " + e.place : ""}`, e.date ? `#/agenda/${e.date}` : "#/agenda", `${e.type || ""} ${e.desc || ""}`));
  return out;
}
export function search(q, max = 40) {
  const words = norm(q).split(/\s+/).filter((x) => x.length > 1);
  if (!words.length) return [];
  return index().map((x) => {
    let sc = 0;
    for (const wd of words) {
      const start = x.s.startsWith(wd) || x.s.includes(" " + wd), inT = start || (wd.length > 3 && x.s.includes(wd));
      const inD = x.sd.startsWith(wd) || x.sd.includes(" " + wd) || (wd.length > 3 && x.sd.includes(wd));
      if (inT) sc += start ? 3 : 2; else if (inD) sc += 1; else return null;
    }
    return { ...x, sc: sc + (x.g === "Secciones" ? 2 : 0) };
  }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, max);
}
function resultsHTML(q, list, full) {
  if (!q.trim()) return "";
  if (!list.length) return `<p class="search-empty">No encontramos «${esc(q)}». Prueba con otra palabra, o mira la <a href="#/ayuda">Ayuda</a>.</p>`;
  const groups = {};
  list.forEach((x) => (groups[x.g] = groups[x.g] || []).push(x));
  const rows = Object.entries(groups).map(([g, xs]) => `<div class="sr-g"><span class="sr-gt">${esc(g)}</span>${xs.slice(0, full ? 20 : 4).map((x) => `<a class="sr-i" href="${esc(x.href)}" ${x.ext ? 'target="_blank" rel="noopener"' : ""}>
      <span><b>${esc(x.t)}</b><small>${esc(String(x.d).slice(0, 90))}</small></span></a>`).join("")}</div>`).join("");
  return rows + (full ? "" : `<a class="sr-all" href="#/buscar?q=${encodeURIComponent(q)}">Ver todos los resultados ${icon("arrowR")}</a>`);
}
async function loadAgenda() {
  if (agendaCache) return;
  try { agendaCache = (await cloud.listAgenda()).filter((e) => e.title); } catch { agendaCache = []; }
}
export function viewBuscar(q = "") {
  ctx.onAfterRender(() => { const i = document.getElementById("pageQ"); if (i) { i.focus(); paint("pageQ", true); } });
  return `<header class="page-head"><span class="eyebrow">Buscar</span><h1>¿Qué estás <em>buscando</em>?</h1>
    <p>Secciones, unidades del curso, canciones, oraciones, dinámicas, actividades y ayuda.</p></header>
    <div class="search-page">${searchBox("pageQ", q)}</div>`;
}
function paint(id, full) {
  const i = document.getElementById(id), box = document.getElementById(id + "Res");
  if (!i || !box) return;
  const q = i.value;
  box.innerHTML = resultsHTML(q, search(q, full ? 80 : 30), full);
  box.classList.toggle("on", !!q.trim());
}
function registerActions() {
  let t = null;
  document.addEventListener("input", (e) => {
    const f = e.target.closest && e.target.closest("[data-search]"); if (!f) return;
    const id = f.dataset.search;
    loadAgenda().then(() => paint(id, id === "pageQ"));
    clearTimeout(t); t = setTimeout(() => paint(id, id === "pageQ"), 120);
    if (id === "pageQ") history.replaceState(null, "", `#/buscar?q=${encodeURIComponent(e.target.value)}`);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const f = e.target.closest && e.target.closest("[data-search]"); if (!f) return;
    e.target.value = ""; paint(f.dataset.search, false);
  });
}
