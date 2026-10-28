// Página pública para las familias (familias/): quiénes somos, próximas
// actividades (con autorizaciones para descargar), cómo cuidamos,
// preguntas frecuentes y contacto. Solo lectura: no pide cuenta ni muestra datos personales.

import { CONFIG } from "./config.js";
import { esc } from "./util.js";
import { illus } from "./ilustraciones.js";
import { occurrences, isRepeat, describe as repeatText } from "./repeat.js";
import { merge } from "./familias-contenido.js";
import * as autz from "./autorizacion.js";
import * as cuenta from "./cuenta.js";

const $ = (s) => document.querySelector(s);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const shift = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const today = iso(new Date());
const BASE = new URL("../", import.meta.url).href; // raíz del sitio

let db = null, fb = null;
async function initDb() {
  if (!CONFIG.firebase || !CONFIG.firebase.apiKey) return;
  try {
    fb = await import(CONFIG.firebaseModule ? new URL(CONFIG.firebaseModule, import.meta.url).href : "./vendor/firebase.mjs");
    db = fb.initializeFirestore(fb.initializeApp(CONFIG.firebase, "familias"), {});
  } catch (e) { console.warn("Familias: sin conexión a la base", e); }
}
const timeout = (p, ms = 7000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
async function content(name) {
  if (!db) return null;
  try { const s = await timeout(fb.getDoc(fb.doc(db, "content", name))); return s.exists() ? JSON.parse(s.data().json || "null") : null; } catch { return null; }
}
async function eventos() {
  if (!db) return [];
  try {
    const qs = await timeout(fb.getDocs(fb.query(fb.collection(db, "agenda"), fb.where("familias", "==", true))));
    return qs.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}
// ---------------------------------------------------------------------------
const longDate = (s) => { const d = parse(s); return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }); };
let EVS = [];
function proximas(list) {
  const to = shift(today, 120);
  return list.flatMap((e) => (isRepeat(e) ? occurrences(e, today, to).slice(0, 3).map((d) => ({ ...e, key: `${e.id}@${d}`, base: e, date: d })) : e.date >= today ? [{ ...e, key: e.id }] : []))
    .sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || ""))).slice(0, 10);
}
function evHTML(e) {
  const d = parse(e.date);
  const evId = (e.base && e.base.id) || e.id;
  return `<article class="fam-ev" id="ev-${esc(evId)}">
    <span class="fam-date"><b>${d.getDate()}</b><small>${MESES[d.getMonth()].slice(0, 3)}</small></span>
    <div class="fam-ev-main">
      <span class="fam-ev-day">${esc(longDate(e.date))}${e.start ? ` · ${esc(e.start)}${e.end ? `–${esc(e.end)}` : ""} h` : ""}</span>
      <h3>${esc(e.title)}</h3>
      ${e.place ? `<p class="fam-ev-where">📍 ${esc(e.place)}</p>` : ""}
      ${e.desc ? `<p class="fam-ev-desc">${esc(e.desc)}</p>` : ""}
      ${e.base && isRepeat(e.base) ? `<p class="fam-ev-where">↻ ${esc(repeatText(e.base))}</p>` : ""}
      ${autz.hasAuth(e) ? `<div class="fam-auth"><span>✍️ <b>Requiere autorización</b>${e.auth.plazo ? ` · entregar a más tardar el ${esc(autz.fecha(e.auth.plazo))}` : ""}</span>
        <button class="btn btn-sm btn-gold" data-auth="${esc(e.key)}">Descargar autorización (PDF)</button></div>` : ""}
      ${e.invFam ? confHTML(e, evId) : ""}
    </div></article>`;
}
// Confirmar asistencia (sin cuenta): nombre del joven y cuántos van. Solo el equipo ve las respuestas.
const confKey = (e) => `agape_conf_${e.key}`;
function confHTML(e, evId) {
  let done = null; try { done = JSON.parse(localStorage.getItem(confKey(e)) || "null"); } catch {}
  if (done) return `<div class="fam-conf is-done"><b>¡Gracias! Confirmaron su asistencia.</b><span>${esc(done.joven)} · ${done.personas} persona${done.personas === 1 ? "" : "s"}</span>
    <button class="btn btn-sm btn-ghost" data-conf-again="${esc(e.key)}">Confirmar por otro joven</button></div>`;
  return `<form class="fam-conf" data-conf-form="${esc(e.key)}" data-ev="${esc(evId)}">
    <b>¿Vienen? Confirmen su asistencia</b>
    <div class="fam-conf-row">
      <label><span>Nombre del joven</span><input name="joven" required maxlength="60" placeholder="Nombre y apellido"></label>
      <label><span>¿Cuántos vienen?</span><select name="personas">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}">${n}</option>`).join("")}</select></label>
    </div>
    <button class="btn btn-sm btn-primary" type="submit">Confirmamos</button>
  </form>`;
}
document.addEventListener("submit", async (ev) => {
  const f = ev.target.closest("[data-conf-form]"); if (!f) return;
  ev.preventDefault();
  const e = EVS.find((x) => x.key === f.dataset.confForm); if (!e || !db) { alert("No pudimos enviar la confirmación. Revisa tu conexión."); return; }
  const joven = String(new FormData(f).get("joven") || "").trim().replace(/\s+/g, " "), personas = +new FormData(f).get("personas") || 1;
  if (joven.length < 2) return;
  const btn = f.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Enviando…";
  try {
    await timeout(fb.addDoc(fb.collection(db, "agenda", f.dataset.ev, "confirmaciones"), { joven: joven.slice(0, 60), personas, fecha: e.date, createdAt: fb.serverTimestamp() }));
    try { localStorage.setItem(confKey(e), JSON.stringify({ joven, personas })); } catch {}
    f.outerHTML = confHTML(e, f.dataset.ev);
  } catch (err) { console.warn(err); btn.disabled = false; btn.textContent = "Confirmamos"; alert("No pudimos enviar la confirmación. Inténtalo de nuevo."); }
});
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-conf-again]"); if (!b) return;
  const e = EVS.find((x) => x.key === b.dataset.confAgain); if (!e) return;
  try { localStorage.removeItem(confKey(e)); } catch {}
  b.closest(".fam-conf").outerHTML = confHTML(e, (e.base && e.base.id) || e.id);
});
const SUB = () => {
  const url = BASE + "familias.ics", webcal = url.replace(/^https?:/, "webcal:");
  return `<div class="fam-sub">
    <a class="btn btn-sm btn-primary" href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}" target="_blank" rel="noopener">📅 Google Calendar</a>
    <a class="btn btn-sm btn-ghost" href="${webcal}">📅 iPhone</a>
    <button class="btn btn-sm btn-ghost" data-copy="${esc(url)}">Copiar enlace</button>
  </div><p class="xs muted" style="margin-top:6px">Te suscribes una vez y las actividades aparecen solas en el calendario del celular.</p>`;
};

function contactHTML(c) {
  const tel = c.telefono && c.telefono.replace(/[^\d+]/g, "");
  const wa = (c.whatsapp || "").replace(/\D/g, "");
  const items = [
    tel ? `<a class="fam-c" href="tel:${esc(tel)}">📞 <span><b>Teléfono</b>${esc(c.telefono)}</span></a>` : "",
    wa ? `<a class="fam-c" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">💬 <span><b>WhatsApp</b>${esc(c.whatsapp)}</span></a>` : "",
    c.correo ? `<a class="fam-c" href="mailto:${esc(c.correo)}">✉️ <span><b>Correo</b>${esc(c.correo)}</span></a>` : "",
    c.direccion ? `<a class="fam-c" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.direccion + ", Yungay, Chile")}" target="_blank" rel="noopener">📍 <span><b>Dónde estamos</b>${esc(c.direccion)}</span></a>` : "",
    c.instagram ? `<a class="fam-c" href="https://instagram.com/${esc(c.instagram.replace(/^@|.*instagram\.com\//g, "").replace(/\/.*/, ""))}" target="_blank" rel="noopener">📸 <span><b>Instagram</b>${esc(c.instagram)}</span></a>` : "",
    c.facebook ? `<a class="fam-c" href="${esc(/^https?:/.test(c.facebook) ? c.facebook : "https://facebook.com/" + c.facebook)}" target="_blank" rel="noopener">👍 <span><b>Facebook</b>${esc(c.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, ""))}</span></a>` : "",
  ].filter(Boolean);
  return `<p class="fam-lead">${esc(c.nombre || "Coordinación")}</p>
    <div class="fam-cs">${items.join("") || `<p class="muted">Pregunta por nosotros en la secretaría parroquial.</p>`}</div>`;
}

async function main() {
  await initDb();
  const [saved, evs, gos] = await Promise.all([content("familias"), eventos(),
    fetch("../data/evangelio.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)]);
  const ev = gos && gos.days ? gos.days[today] : null;
  const C = merge(saved);
  EVS = proximas(evs);
  const carta = C.carta.texto && (!C.carta.hasta || today <= C.carta.hasta);

  $("#fam").innerHTML = `
  <section class="fam-hero">
    <div>
      <span class="fam-k">Para las familias</span>
      <h1>Caminamos junto a <span class="mk">sus hijos.</span></h1>
      <p>${esc(C.bienvenida)}</p>
      <div class="fam-hero-btns"><a class="btn btn-primary" href="#actividades">Próximas actividades</a><a class="btn btn-gold" href="#rezar">Recen con nosotros</a><a class="btn btn-ghost" href="#contacto">Contacto</a></div>
    </div>
    <div class="fam-hero-ill">${illus("familia")}</div>
  </section>

  ${(() => { const c = cuenta.pick(evs); return c ? cuenta.html(c) : ""; })()}

  <section class="fam-sec fam-rezar" id="rezar">
    <div><span class="fam-k">Capilla Ágape</span><h2>Recen con <span class="mk">nosotros.</span></h2>
      <p>Muchas familias acompañan a Ágape con su oración. La Capilla Ágape está abierta para ustedes, sin cuenta: el Evangelio de cada día, el Santo Rosario y oraciones para rezar en casa.</p>
      ${ev && ev.frase ? `<a class="fam-ev" href="../capilla/"><small>Evangelio de hoy · ${esc(ev.cita)}</small><b>«${esc(ev.frase)}»</b></a>` : ""}
      <div class="fam-hero-btns"><a class="btn btn-primary" href="../capilla/">Entrar a la Capilla Ágape</a><a class="btn btn-ghost" href="../#/oracion/rosario">Rezar el Rosario</a></div>
      <details class="fam-oracion"><summary>Una oración por los jóvenes de Ágape</summary>
        <p>Señor Jesús, te encomendamos a los jóvenes de la Pastoral Juvenil Ágape y a quienes los acompañan. Que en el grupo encuentren amigos verdaderos y, sobre todo, te encuentren a Ti. Cuídalos en su camino, bendice a nuestras familias y haz de nuestra parroquia un hogar para todos. María, Madre nuestra, ruega por ellos. Amén.</p></details>
    </div>${illus("jesus")}</section>
  ${carta ? `<section class="fam-sec fam-carta"><span class="fam-k alt">Carta a las familias</span>
    ${C.carta.titulo ? `<h2>${esc(C.carta.titulo)}</h2>` : ""}<div class="fam-carta-t">${esc(C.carta.texto).replace(/\n/g, "<br>")}</div>
    ${C.carta.firma ? `<p class="fam-firma">${esc(C.carta.firma)}</p>` : ""}</section>` : ""}

  <section class="fam-sec" id="actividades">
    <span class="fam-k">Agenda</span><h2>Próximas actividades</h2>
    ${EVS.length ? `<div class="fam-evs">${EVS.map(evHTML).join("")}</div>` : `<p class="muted">Pronto publicaremos las próximas actividades.</p>`}
    <h3 class="fam-h3">Llévalas en tu calendario</h3>${SUB()}
  </section>

  <section class="fam-sec">
    <span class="fam-k">Quiénes somos</span><h2>Un grupo que es <span class="mk">hogar.</span></h2>
    <p class="fam-lead">${esc(C.horario)}</p>
  </section>

  <section class="fam-sec fam-cuidado">
    <div><span class="fam-k alt">Cómo cuidamos</span><h2>Su confianza es lo primero.</h2>
      <ul>${C.cuidado.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    ${illus("acogida")}
  </section>

  <section class="fam-sec">
    <span class="fam-k">Preguntas frecuentes</span><h2>Lo que más nos preguntan</h2>
    <div class="fam-faq">${C.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>
  </section>

  <section class="fam-sec fam-contacto" id="contacto">
    <span class="fam-k alt">Contacto</span><h2>Conversemos.</h2>${contactHTML(C.contacto)}
  </section>`;
  cuenta.start();
  // Si llegaron desde la invitación (…/familias/#ev-…), se va directo a esa actividad.
  if (/^#ev-/.test(location.hash)) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-auth]");
  if (b) {
    const ev = EVS.find((x) => x.key === b.dataset.auth); if (!ev) return;
    const old = b.textContent; b.disabled = true; b.textContent = "Preparando…";
    try {
      const a = { ...ev.auth };
      if (ev.base && isRepeat(ev.base)) { const gap = a.regresoF && a.salidaF ? Math.round((parse(a.regresoF) - parse(a.salidaF)) / 86400000) : 0; a.salidaF = ev.date; a.regresoF = shift(ev.date, gap); }
      await autz.download({ ...ev, auth: a });
    } catch (err) { console.warn(err); alert("No se pudo crear el PDF. Inténtalo de nuevo."); }
    b.disabled = false; b.textContent = old;
  }
  const c = e.target.closest("[data-copy]");
  if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); c.textContent = "¡Copiado!"; } catch { prompt("Copia este enlace:", c.dataset.copy); } }
});

main();
