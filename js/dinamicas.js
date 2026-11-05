// Banco de dinámicas: juegos, rompehielos, dinámicas de oración y de reflexión para
// los encuentros. Cada una dice para qué sirve (etiquetas), cuánto dura, para cuántas
// personas, dónde y qué materiales necesita. Los guías las agregan y editan.

import { esc, icon, toast, invitaMiRuta } from "./util.js";
import { BANCO } from "./dinamicas-banco.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();

export const TAGS = [
  ["rompehielos", "Rompehielos", "#8ad2fa"], ["conocernos", "Conocernos", "#9be3b0"], ["confianza", "Confianza", "#fde0d2"],
  ["equipo", "Trabajo en equipo", "#ffba03"], ["comunicacion", "Comunicación", "#8ad2fa"], ["liderazgo", "Liderazgo", "#1351a4"],
  ["energizante", "Energizante", "#ef591c"], ["oracion", "Oración", "#fff1cc"], ["reflexion", "Reflexión", "#e1edfb"],
  ["acogida", "Acogida", "#9be3b0"], ["cierre", "Cierre", "#fde0d2"], ["servicio", "Servicio", "#ffba03"],
];
const TAG = Object.fromEntries(TAGS.map(([k, l, c]) => [k, { l, c }]));
const LUGAR = { interior: "Bajo techo", exterior: "Al aire libre", ambos: "Bajo techo o al aire libre" };
const DUR = [["", "Cualquier duración"], ["10", "Hasta 10 min"], ["20", "Hasta 20 min"], ["45", "Hasta 45 min"]];

// Dinámicas iniciales (descritas con palabras propias de la pastoral)
const BASE = [
  { id: "d-ovillo", builtin: true, title: "El ovillo de lana", objetivo: "Conocerse y descubrir que estamos unidos.", tags: ["conocernos", "cierre"], duracion: 15, personas: "6 a 25", lugar: "ambos",
    materiales: "Un ovillo de lana.",
    pasos: "Sentados en círculo, quien tiene el ovillo dice su nombre y algo que le gusta.\nSujeta la punta y lanza el ovillo a otra persona, que hace lo mismo.\nAl final queda una red: ¿qué pasa si alguien suelta su hilo?\nCerrar: «Cada uno sostiene a los demás; así es la comunidad».",
    variante: "Para cerrar el año: al lanzar, cada uno agradece algo a quien recibe el ovillo." },
  { id: "d-dosverdades", builtin: true, title: "Dos verdades y una mentira", objetivo: "Romper el hielo y conocer detalles divertidos de cada uno.", tags: ["rompehielos", "conocernos"], duracion: 15, personas: "5 a 20", lugar: "interior",
    materiales: "Ninguno.",
    pasos: "Cada persona dice tres frases sobre sí misma: dos verdaderas y una falsa.\nEl grupo adivina cuál es la mentira.\nQuien la cuenta revela la respuesta y explica una de las verdades.",
    variante: "En grupos grandes, se hace en grupos de 5 y cada grupo elige la mejor para contarla a todos." },
  { id: "d-lazarillo", builtin: true, title: "El lazarillo", objetivo: "Vivir la confianza y el cuidado del otro.", tags: ["confianza"], duracion: 20, personas: "En parejas", lugar: "ambos",
    materiales: "Pañuelos para vendar los ojos. Un recorrido despejado y seguro.",
    pasos: "En parejas, uno se venda los ojos y el otro lo guía solo con la voz (o tomándolo del brazo).\nRecorren un camino con pequeños obstáculos seguros.\nCambian los roles.\nConversar: ¿qué sentiste al guiar y al ser guiado? ¿En quién confías tú?",
    variante: "Unir con el Evangelio del ciego Bartimeo (Mc 10,46-52)." },
  { id: "d-torre", builtin: true, title: "La torre de papel", objetivo: "Trabajar en equipo y descubrir cómo nos organizamos.", tags: ["equipo", "liderazgo", "comunicacion"], duracion: 25, personas: "Equipos de 4 a 6", lugar: "interior",
    materiales: "Por equipo: 10 hojas, cinta adhesiva y tijeras.",
    pasos: "Cada equipo tiene 12 minutos para construir la torre más alta que se sostenga sola.\nSe miden las torres.\nConversar en cada equipo: ¿quién tomó la iniciativa? ¿Escuchamos todas las ideas? ¿Qué haríamos distinto?\nPuesta en común breve.",
    variante: "A mitad de tiempo, prohibir hablar: solo se pueden comunicar con gestos." },
  { id: "d-telefono", builtin: true, title: "Teléfono descompuesto", objetivo: "Ver cómo se deforma un mensaje y la importancia de escuchar bien.", tags: ["comunicacion", "energizante"], duracion: 10, personas: "8 a 30", lugar: "ambos",
    materiales: "Ninguno.",
    pasos: "En fila o círculo, el primero dice al oído una frase a quien sigue, una sola vez.\nCada uno la repite al siguiente.\nEl último la dice en voz alta y se compara con la original.\nConversar: ¿pasa esto con los rumores? ¿Cómo cuidamos lo que decimos de otros?",
    variante: "Usar una frase del Evangelio del día y terminar leyéndola juntos." },
  { id: "d-semaforo", builtin: true, title: "El semáforo de la semana", objetivo: "Acoger a cada uno y saber cómo llega al encuentro.", tags: ["acogida", "reflexion"], duracion: 10, personas: "Cualquier grupo", lugar: "interior",
    materiales: "Tarjetas o papeles de color verde, amarillo y rojo (opcional).",
    pasos: "Cada uno muestra o dice un color: verde (me fue bien), amarillo (más o menos), rojo (semana difícil).\nQuien quiera cuenta en una frase por qué.\nNadie está obligado a explicar; basta con el color.\nEl guía toma nota de quién está en rojo para acercarse después con cariño.",
    variante: "Terminar con una oración breve por quienes están en amarillo y rojo." },
  { id: "d-carta", builtin: true, title: "Carta a Jesús", objetivo: "Hablar con Jesús desde el corazón.", tags: ["oracion", "reflexion"], duracion: 20, personas: "Cualquier grupo", lugar: "interior",
    materiales: "Papel, lápices, música suave. Una vela.",
    pasos: "Ambientar con la vela encendida y música suave.\nCada uno escribe una carta a Jesús: qué le agradece, qué le preocupa, qué le pide.\nLa carta es personal: nadie la lee.\nAl final, se dejan las cartas dobladas a los pies de una cruz o junto a la vela.",
    variante: "Guardar las cartas en sobres cerrados y devolverlas a fin de año." },
  { id: "d-nudo", builtin: true, title: "El nudo humano", objetivo: "Resolver un problema juntos con paciencia.", tags: ["equipo", "energizante"], duracion: 15, personas: "8 a 14 por nudo", lugar: "ambos",
    materiales: "Ninguno.",
    pasos: "De pie en círculo, cada uno toma con cada mano la mano de dos personas distintas que no estén a su lado.\nSin soltarse, el grupo debe desenredarse hasta formar un círculo.\nConversar: ¿qué ayudó? ¿Quién guió? ¿Hubo que tener paciencia con alguien?",
    variante: "Con grupos pequeños, hacerlo con los ojos cerrados y un solo guía con los ojos abiertos." },
  { id: "d-palabra", builtin: true, title: "La Palabra que me toca", objetivo: "Orar con el Evangelio de forma sencilla y personal.", tags: ["oracion", "reflexion"], duracion: 20, personas: "Cualquier grupo", lugar: "interior",
    materiales: "El Evangelio del domingo impreso o en el teléfono.",
    pasos: "Leer el Evangelio despacio, dos veces.\nCada uno elige una palabra o frase que le llamó la atención y la dice en voz alta, sin explicar.\nSe lee una tercera vez.\nQuien quiera comparte por qué le tocó esa frase.\nTerminar con un Padre Nuestro.",
    variante: "Escribir la frase en una tarjeta y llevarla durante la semana." },
  { id: "d-lluvia", builtin: true, title: "Lluvia de cualidades", objetivo: "Valorar lo bueno de cada uno y cerrar con alegría.", tags: ["cierre", "acogida"], duracion: 20, personas: "6 a 20", lugar: "interior",
    materiales: "Hojas y lápices. Cinta adhesiva.",
    pasos: "Cada uno se pega una hoja en la espalda.\nTodos pasan escribiendo en la espalda de los demás una cualidad o algo que agradecen de esa persona.\nAl final, cada uno lee su hoja en silencio.\nCerrar: «Así nos mira Dios: con cariño»."
  },
];

// ---------------------------------------------------------------------------
let items = null, q = "", tag = "", dur = "", lastList = [];
let favs = {};
try { favs = JSON.parse(localStorage.getItem("agape_dinfavs") || "{}"); } catch {}
const saveFavs = () => { try { localStorage.setItem("agape_dinfavs", JSON.stringify(favs)); } catch {} };
const all = () => [...BASE, ...BANCO, ...(items || [])].sort((a, b) => (favs[b.id] ? 1 : 0) - (favs[a.id] ? 1 : 0) || a.title.localeCompare(b.title, "es"));
const byId = (id) => all().find((x) => x.id === id);
let repaint = () => {};
function watch() {
  if (!st().ready) return;
  const stop = ctx.cloud.watchDinamicas((r) => { items = r; repaint(); }, () => { items = items || []; repaint(); });
  ctx.onLeave(stop);
}
const chips = (d) => (d.tags || []).map((t) => `<span class="chip din-tag" style="--tc:${(TAG[t] || {}).c || "#e1edfb"}">${esc((TAG[t] || {}).l || t)}</span>`).join("");
const meta = (d) => [d.duracion ? `⏱ ${d.duracion} min` : "", d.personas ? `👥 ${esc(d.personas)}` : "", d.lugar ? `📍 ${esc(LUGAR[d.lugar] || d.lugar)}` : ""].filter(Boolean).join(" · ");

export function viewList() {
  ctx.onAfterRender(() => { repaint = paintList; watch(); paintList(); });
  return `
  <header class="page-head"><span class="eyebrow">Para preparar los encuentros</span><h1>Banco de <em>dinámicas</em></h1>
    <p>Juegos, rompehielos y dinámicas de oración y reflexión, con lo que necesitas para hacerlas. Elige según para qué te sirve.</p></header>
  <div class="row-wrap" style="margin:10px 0">
    ${st().isGuide ? `<button class="btn btn-gold btn-sm" data-action="dinNew">${icon("plus")} Nueva dinámica</button>` : ""}
  </div>
  <div class="can-tools">
    <input class="input" id="dinSearch" placeholder="Buscar: confianza, ovillo, oración…" value="${esc(q)}" aria-label="Buscar dinámica">
    <div class="can-chips" role="group" aria-label="Para qué sirve">
      <button class="chip ${tag ? "" : "accent"}" data-action="dinTag" data-t="">Todas</button>
      ${TAGS.map(([k, l]) => `<button class="chip ${tag === k ? "accent" : ""}" data-action="dinTag" data-t="${k}">${esc(l)}</button>`).join("")}
    </div>
    <div class="can-chips">${DUR.map(([k, l]) => `<button class="chip ${dur === k ? "accent" : ""}" data-action="dinDur" data-d="${k}">${esc(l)}</button>`).join("")}</div>
  </div>
  <div class="row-wrap" style="margin:6px 0 10px"><span class="small muted" id="dinCount"></span><span class="spacer"></span>
    <button class="btn btn-sm btn-ghost" data-action="dinRandom">🎲 Una al azar</button></div>
  <div id="dinList" class="din-list"></div>
  ${invitaMiRuta("dinamicas-y-juegos", "Dinámicas y juegos")}`;
}
function paintList() {
  const box = $("#dinList"); if (!box) return;
  const s = q.trim().toLowerCase();
  const list = all().filter((d) => (!tag || (d.tags || []).includes(tag)) && (!dur || (+d.duracion || 0) <= +dur)
    && (!s || [d.title, d.objetivo, d.materiales, d.pasos, (d.tags || []).map((t) => (TAG[t] || {}).l).join(" ")].join(" ").toLowerCase().includes(s)));
  const cnt = $("#dinCount"); if (cnt) cnt.textContent = `${list.length} ${list.length === 1 ? "dinámica" : "dinámicas"}`;
  lastList = list;
  box.innerHTML = list.length ? list.map((d) => `<a class="card link din-item" href="#/dinamicas/${encodeURIComponent(d.id)}">
      <div class="din-top"><strong>${favs[d.id] ? "⭐ " : ""}${esc(d.title)}</strong>${d.duracion ? `<span class="din-dur">${esc(d.duracion)}′</span>` : ""}</div>
      <span class="muted small">${esc(d.objetivo || "")}</span>
      <div class="can-moms">${chips(d)}</div>
      <span class="xs muted">${meta(d)}</span></a>`).join("")
    : `<div class="card" style="text-align:center;padding:28px"><p class="muted">No hay dinámicas con ese filtro.</p></div>`;
}

export function viewOne(id) {
  ctx.onAfterRender(() => { repaint = () => paintOne(id); watch(); paintOne(id); });
  return `<div id="dinOne"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function paintOne(id) {
  const box = $("#dinOne"); if (!box) return;
  const d = byId(id);
  if (!d) { box.innerHTML = items === null && st().ready ? `<p class="muted" style="padding:30px;text-align:center">Cargando…</p>` : `<div class="card" style="text-align:center;padding:30px"><h2 class="display">No encontramos esta dinámica</h2><a class="btn btn-primary" style="margin-top:12px" href="#/dinamicas">Volver al banco</a></div>`; return; }
  const steps = String(d.pasos || "").split("\n").map((x) => x.trim()).filter(Boolean);
  box.innerHTML = `
  <nav class="crumbs no-print"><a href="#/dinamicas">Banco de dinámicas</a>${icon("right")}<span>${esc(d.title)}</span></nav>
  <article class="card din-sheet">
    <div class="din-head"><div style="flex:1"><div class="can-moms">${chips(d)}</div><h1>${esc(d.title)}</h1>
      ${d.objetivo ? `<p class="din-obj"><b>Para qué:</b> ${esc(d.objetivo)}</p>` : ""}</div>
      <button class="icon-btn no-print din-fav ${favs[d.id] ? "on" : ""}" data-action="dinFav" data-id="${esc(d.id)}" aria-pressed="${!!favs[d.id]}" aria-label="Marcar como favorita">${favs[d.id] ? "⭐" : "☆"}</button></div>
    <div class="din-meta">${d.duracion ? `<span><b>⏱</b> ${esc(d.duracion)} min</span>` : ""}${d.personas ? `<span><b>👥</b> ${esc(d.personas)}</span>` : ""}${d.lugar ? `<span><b>📍</b> ${esc(LUGAR[d.lugar] || d.lugar)}</span>` : ""}</div>
    ${d.materiales ? `<div class="din-box"><h3>🧰 Materiales</h3><p>${esc(d.materiales)}</p></div>` : ""}
    <h3 class="din-h">Paso a paso</h3>
    <ol class="cap-steps">${steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
    ${d.variante ? `<div class="din-box alt"><h3>💡 Variante</h3><p>${esc(d.variante)}</p></div>` : ""}
    ${d.author ? `<p class="xs muted" style="margin-top:12px">Agregada por ${esc(d.author)}</p>` : d.builtin ? `<p class="xs muted" style="margin-top:12px">Dinámica base de la pastoral.</p>` : ""}
  </article>
  <div class="row-wrap no-print" style="margin-top:12px">
    <button class="btn btn-sm btn-ghost" data-action="print">${icon("print")} Imprimir</button>
    ${st().isGuide && !d.builtin ? `<span class="spacer"></span><button class="btn btn-sm btn-soft" data-action="dinEdit" data-id="${esc(d.id)}">${icon("edit")} Editar</button>
      ${st().isStaff || d.authorUid === ctx.cloud.myUid() ? `<button class="btn btn-sm btn-danger" data-action="dinDel" data-id="${esc(d.id)}">${icon("trash")} Borrar</button>` : ""}` : ""}
  </div>`;
}

function editor(d) {
  let dlg = document.getElementById("dinDlg");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "dinDlg"; dlg.className = "sheet p-sheet"; document.body.appendChild(dlg); }
  const v = d || { title: "", objetivo: "", tags: [], duracion: 15, personas: "", lugar: "interior", materiales: "", pasos: "", variante: "" };
  dlg.innerHTML = `<form method="dialog" id="dinForm" data-id="${esc(d ? d.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Banco de dinámicas</span><h2>${d ? "Editar dinámica" : "Nueva dinámica"}</h2></div>
      <button type="button" class="icon-btn" data-action="dinClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Nombre</label><input class="input" name="title" required maxlength="80" value="${esc(v.title)}"></div>
      <div class="field"><label>Para qué sirve</label><input class="input" name="objetivo" maxlength="160" value="${esc(v.objetivo || "")}" placeholder="En una frase: qué logra esta dinámica"></div>
      <fieldset class="p-dates"><legend>Etiquetas</legend><div class="can-chips">${TAGS.map(([k, l]) => `<label class="chip"><input type="checkbox" name="tags" value="${k}" ${(v.tags || []).includes(k) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div></fieldset>
      <div class="ag-form-row">
        <div class="field"><label>Duración (minutos)</label><input class="input" type="number" min="1" max="240" name="duracion" value="${esc(v.duracion || "")}"></div>
        <div class="field"><label>Personas</label><input class="input" name="personas" maxlength="40" value="${esc(v.personas || "")}" placeholder="6 a 25, en parejas…"></div>
        <div class="field"><label>Lugar</label><select class="select" name="lugar">${Object.entries(LUGAR).map(([k, l]) => `<option value="${k}" ${v.lugar === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label>Materiales</label><input class="input" name="materiales" maxlength="300" value="${esc(v.materiales || "")}"></div>
      <div class="field"><label>Paso a paso</label><textarea class="textarea" name="pasos" rows="7" maxlength="4000" placeholder="Un paso por línea">${esc(v.pasos || "")}</textarea><span class="xs muted">Escribe un paso por línea; se numeran solos.</span></div>
      <div class="field"><label>Variante o consejo (opcional)</label><textarea class="textarea" name="variante" rows="2" maxlength="600">${esc(v.variante || "")}</textarea></div>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="dinClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  dlg.showModal();
}

function registerActions() {
  const A = ctx.actions;
  A.dinRandom = () => { const l = lastList.length ? lastList : all(); const d = l[Math.floor(Math.random() * l.length)]; if (d) location.hash = "#/dinamicas/" + encodeURIComponent(d.id); };
  A.dinTag = (el) => { tag = el.dataset.t; document.querySelectorAll("[data-action=dinTag]").forEach((b) => b.classList.toggle("accent", b.dataset.t === tag)); paintList(); };
  A.dinDur = (el) => { dur = el.dataset.d; document.querySelectorAll("[data-action=dinDur]").forEach((b) => b.classList.toggle("accent", b.dataset.d === dur)); paintList(); };
  A.dinFav = (el) => { const id = el.dataset.id; if (favs[id]) delete favs[id]; else favs[id] = 1; saveFavs(); paintOne(id); toast(favs[id] ? "⭐ Guardada en tus favoritas" : "Quitada de favoritas"); };
  A.dinNew = () => editor(null);
  A.dinEdit = (el) => editor(byId(el.dataset.id));
  A.dinClose = () => document.getElementById("dinDlg")?.close();
  A.dinDel = async (el) => {
    if (!confirm("¿Borrar esta dinámica del banco?")) return;
    try { await ctx.cloud.deleteDinamica(el.dataset.id); toast("Dinámica borrada"); location.hash = "#/dinamicas"; } catch { toast("No se pudo borrar", ""); }
  };
  document.addEventListener("input", (e) => { if (e.target.id === "dinSearch") { q = e.target.value; paintList(); } });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "dinForm") return;
    e.preventDefault();
    const f = new FormData(e.target), g = (k) => String(f.get(k) || "").trim();
    const old = e.target.dataset.id && byId(e.target.dataset.id);
    const data = { title: g("title"), objetivo: g("objetivo"), tags: f.getAll("tags").map(String), duracion: Math.max(0, Math.min(240, +g("duracion") || 0)),
      personas: g("personas"), lugar: g("lugar"), materiales: g("materiales"), pasos: g("pasos"), variante: g("variante"),
      author: old && old.author ? old.author : ctx.cloud.shortName(st().account.name), authorUid: old && old.authorUid ? old.authorUid : ctx.cloud.myUid() };
    if (!data.title || !data.pasos) { toast("Falta el nombre o el paso a paso", ""); return; }
    try { const id = await ctx.cloud.saveDinamica(e.target.dataset.id || null, data); document.getElementById("dinDlg")?.close(); toast("Dinámica guardada"); location.hash = "#/dinamicas/" + encodeURIComponent(id); }
    catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
  });
}
