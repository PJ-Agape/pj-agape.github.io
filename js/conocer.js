// «Quiero conocer Ágape» (#/conocer): página pública, sin cuenta, para quien todavía no es parte del grupo.
// Cuenta en pocas líneas qué es Ágape y deja un formulario corto para que el equipo lo invite por WhatsApp.
// Los menores de 18 dejan además el contacto de su mamá, papá o apoderado.
// Gestión → Personas → «Quiero conocer Ágape» muestra la lista, los enlaces de la campaña y el QR del afiche.
// Enlaces con origen: #/conocer?o=instagram (lo guarda en «campana» para saber qué canal funcionó).
import * as AP from "./apariencia.js";
import { esc, icon, toast, download } from "./util.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

export const ORIGENES = [
  ["amigo", "Me invitó un amigo o amiga"],
  ["parroquia", "En la misa o en la parroquia"],
  ["colegio", "En el colegio"],
  ["catequesis", "En la catequesis o la confirmación"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["whatsapp", "Un mensaje de WhatsApp"],
  ["afiche", "Un afiche con código QR"],
  ["otro", "Otro"],
];
const origenLabel = (k) => (ORIGENES.find(([x]) => x === k) || [k, k])[1];
const ESTADOS = [["nuevo", "Nuevo"], ["contactado", "Contactado"], ["vino", "Vino a un encuentro"], ["no", "No sigue"]];
const estadoLabel = (k) => (ESTADOS.find(([x]) => x === k) || ["", "Nuevo"])[1];
const SENT_KEY = "agape_conocer_enviado";
const LIVE = "https://pj-agape.github.io/Formacion_Monitores/";
const linkFor = (o) => `${LIVE}#/conocer${o ? "?o=" + o : ""}`;
const campanaDe = (q) => { const m = /(?:^|&)o=([a-z0-9-]{1,30})/i.exec(q || ""); return m ? m[1].toLowerCase() : ""; };

let campana = "", enviado = null; // enviado: { nombre } recién enviado en esta visita

// ---------------------------------------------------------------------------
// Página pública
// ---------------------------------------------------------------------------
export function view(q = "") {
  // Con la sesión iniciada no se muestra la página: en su lugar, la invitación para compartirla.
  if (ctx.cloud.enabled && ctx.cloud.state().ready) return inviteView();
  campana = campanaDe(q) || campana;
  const head = `<header class="page-head has-illus"><span class="eyebrow">Pastoral Juvenil Ágape · Yungay</span>
    <h1>Quiero <em>conocer</em> Ágape</h1>
    <p>Somos jóvenes de la Parroquia San Miguel de Yungay que nos juntamos para hacer amigos, conversar de la vida y crecer en la fe. Si te da curiosidad, déjanos un contacto y te invitamos al próximo encuentro.</p>
    ${illus("amigos", "head-illus")}</header>`;
  return `${head}
  <section class="cono-grid" aria-label="Qué hacemos">
    <article class="card cono-it"><span class="tile-ico">${icon("users")}</span><h3>En el salón parroquial</h3>
      <p>Nos reunimos en comunidad, rezamos y la pasamos muy bien.</p></article>
    <article class="card cono-it"><span class="tile-ico">${icon("chat")}</span><h3>Una comunidad de amigos</h3>
      <p>Un lugar para hacer amigos, conversar de la vida y sentirte parte de algo.</p></article>
    <article class="card cono-it"><span class="tile-ico">${icon("phone")}</span><h3>La fe en tu bolsillo</h3>
      <p>En agAPPe tienes el Evangelio de cada día, la Capilla, juegos y la agenda del grupo. Puedes probarla ahora mismo.</p></article>
  </section>
  <div class="row-wrap cono-try"><span class="small muted">Prueba la app:</span>
    <a class="chip-link" href="#/evangelio">${icon("book")} Evangelio de hoy</a>
    <a class="chip-link" href="#/oracion/velas">${icon("flame")} Deja tu intención</a>
    <a class="chip-link" href="#/juegos">${icon("dice")} Juegos</a></div>
  <section class="card cono-card" id="conoBox" aria-labelledby="conoFT">${enviado ? thanksHTML(enviado) : formHTML()}</section>`;
}

function formHTML() {
  if (!ctx.cloud.enabled) return `<h2 id="conoFT" class="display">Escríbenos</h2><p class="muted">Pregúntale a cualquier joven del grupo o búscanos después de misa en la Parroquia San Miguel de Yungay.</p>`;
  let antes = "";
  try { const d = localStorage.getItem(SENT_KEY); if (d) antes = d; } catch {}
  return `<h2 id="conoFT" class="display">Te invitamos</h2>
    <p class="muted cono-form-p" style="margin-top:4px">Son menos de dos minutos. Te escribimos por WhatsApp para contarte cuándo es el próximo encuentro.</p>
    ${antes ? `<div class="note accent" style="margin-top:12px">Ya nos dejaste tus datos el ${esc(new Date(antes).toLocaleDateString("es-CL", { day: "numeric", month: "long" }))}. Si quieres, puedes enviarlos de nuevo.</div>` : ""}
    <form id="conoForm" class="stack" style="--gap:14px;margin-top:16px" novalidate>
      <fieldset class="cono-quien"><legend class="label">¿Quién escribe?</legend>
        <div class="seg" role="radiogroup">
          <label><input type="radio" name="quien" value="joven" checked><span>Soy joven</span></label>
          <label><input type="radio" name="quien" value="familia"><span>Soy mamá, papá o apoderado</span></label></div></fieldset>
      <div class="field"><label for="coNom" data-l-joven="Tu nombre" data-l-familia="Tu nombre">Tu nombre</label>
        <input class="input big" id="coNom" name="nombre" required maxlength="80" autocomplete="given-name"></div>
      <div class="field"><label for="coHijo" data-only="familia" hidden>Nombre de tu hijo o hija</label>
        <input class="input" id="coHijo" name="hijo" maxlength="80" data-only="familia" hidden></div>
      <div class="field"><label for="coEdad" data-l-joven="Tu edad" data-l-familia="Edad de tu hijo o hija">Tu edad</label>
        <input class="input" id="coEdad" name="edad" type="number" inputmode="numeric" min="10" max="35" required style="max-width:140px"></div>
      <div class="field"><label for="coTel" data-l-joven="Tu WhatsApp" data-l-familia="Tu WhatsApp">Tu WhatsApp</label>
        <input class="input" id="coTel" name="telefono" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="9 1234 5678">
        <span class="hint" data-only="menor" hidden>Si no tienes, déjalo en blanco: le escribimos a tu familia.</span></div>
      <fieldset class="cono-adulto" data-only="menor" hidden><legend>${icon("lock")} Como tienes menos de 18 años</legend>
        <p class="xs muted" style="margin:0 0 8px">Necesitamos el contacto de tu mamá, papá o apoderado. Le contamos quiénes somos y le pedimos su permiso antes de que vengas.</p>
        <div class="field"><label for="coAdN">Nombre de tu mamá, papá o apoderado</label><input class="input" id="coAdN" name="adultoNombre" maxlength="80"></div>
        <div class="field"><label for="coAdT">Su WhatsApp</label><input class="input" id="coAdT" name="adultoTel" type="tel" inputmode="tel" maxlength="20" placeholder="9 1234 5678"></div>
        <label class="cono-check"><input type="checkbox" name="adultoSabe"><span>Mi mamá, papá o apoderado sabe que estoy dejando estos datos.</span></label>
      </fieldset>
      <div class="field"><label for="coOri">¿Cómo supiste de Ágape?</label>
        <select class="select" id="coOri" name="origen" required><option value="">Elige una opción</option>
          ${ORIGENES.map(([k, l]) => `<option value="${k}" ${k === campana ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      <div class="field"><label for="coMsg">¿Algo que quieras contarnos o preguntar? <span class="muted">(opcional)</span></label>
        <textarea class="textarea" id="coMsg" name="mensaje" rows="2" maxlength="300"></textarea></div>
      <div class="cono-hp" aria-hidden="true"><label>No completar <input name="web" tabindex="-1" autocomplete="off"></label></div>
      <label class="cono-check"><input type="checkbox" name="consiente" required><span>Acepto que el equipo de Ágape use estos datos solo para invitarme al grupo. Nunca se publican ni se comparten, y puedo pedir que los borren cuando quiera.</span></label>
      <button class="btn btn-primary btn-block" type="submit">${icon("send")} <span class="cono-btn-l">Quiero que me inviten</span></button>
    </form>`;
}

function thanksHTML({ nombre, menor }) {
  const first = String(nombre || "").split(" ")[0];
  return `<div style="text-align:center">${illus("acogida", "sol-il")}
    <span class="hub-cb-hand">¡gracias${first ? ", " + esc(first) : ""}!</span>
    <h2 class="display" style="margin-top:4px">Ya tenemos tus datos</h2>
    <p class="muted" style="margin:8px auto 0;max-width:46ch">${menor
      ? "Le escribiremos a tu familia por WhatsApp para contarle quiénes somos e invitarte al próximo encuentro."
      : "Te escribiremos por WhatsApp para invitarte al próximo encuentro. Mientras tanto, date una vuelta por la app."}</p>
    <div class="row-wrap" style="justify-content:center;margin-top:18px">
      <a class="btn btn-primary" href="#/evangelio">${icon("book")} Leer el Evangelio de hoy</a>
      <a class="btn btn-ghost" href="#/">Conocer la app</a></div></div>`;
}

// Muestra u oculta lo que depende de quién escribe y de la edad.
function sync(form) {
  const el = form.elements, quien = el.quien.value, edad = +el.edad.value, menor = quien === "joven" && edad > 0 && edad < 18;
  form.querySelectorAll("[data-l-joven]").forEach((l) => { l.textContent = l.dataset[quien === "familia" ? "lFamilia" : "lJoven"]; });
  form.querySelectorAll("[data-only]").forEach((el) => { el.hidden = el.dataset.only === "familia" ? quien !== "familia" : !menor; });
  return menor;
}

const digits = (t) => String(t || "").replace(/\D/g, "");
const telOk = (t) => { const d = digits(t); return d.length >= 8 && d.length <= 15; };

function registerActions() {
  document.addEventListener("input", (e) => { const f = e.target.closest?.("#conoForm"); if (f) sync(f); });
  document.addEventListener("change", (e) => { const f = e.target.closest?.("#conoForm"); if (f) sync(f); });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "conoForm") return;
    e.preventDefault();
    const f = e.target, menor = sync(f), fd = new FormData(f);
    if (String(fd.get("web") || "")) return; // relleno automático de robots: se ignora sin avisar
    const val = (k, max) => String(fd.get(k) || "").trim().replace(/\s+/g, " ").slice(0, max);
    const quien = fd.get("quien") === "familia" ? "familia" : "joven";
    const nombre = val("nombre", 80), hijo = val("hijo", 80), edad = Math.round(+fd.get("edad"));
    const telefono = val("telefono", 20), adultoNombre = menor ? val("adultoNombre", 80) : "", adultoTel = menor ? val("adultoTel", 20) : "";
    if (!nombre) return toast("Escribe tu nombre", "");
    if (!(edad >= 10 && edad <= 35)) return toast(quien === "familia" ? "Revisa la edad de tu hijo o hija" : "Revisa tu edad", "");
    if (menor) {
      if (!adultoNombre || !telOk(adultoTel)) return toast("Falta el nombre y el WhatsApp de tu mamá, papá o apoderado", "");
      if (!fd.get("adultoSabe")) return toast("Cuéntale a tu mamá, papá o apoderado antes de enviar", "");
      if (telefono && !telOk(telefono)) return toast("Revisa tu número de WhatsApp", "");
    } else if (!telOk(telefono)) return toast("Revisa tu número de WhatsApp", "");
    if (!fd.get("origen")) return toast("Cuéntanos cómo supiste de Ágape", "");
    if (!fd.get("consiente")) return toast("Para enviar, marca que aceptas el uso de tus datos", "");
    const btn = f.querySelector("[type=submit]"); btn.disabled = true;
    const data = { quien, nombre, edad, telefono, origen: String(fd.get("origen")), campana, mensaje: val("mensaje", 300), consiente: true };
    if (quien === "familia" && hijo) data.hijo = hijo;
    if (menor) Object.assign(data, { adultoNombre, adultoTel, adultoSabe: true });
    try {
      await ctx.cloud.saveInteresado(data);
      try { localStorage.setItem(SENT_KEY, new Date().toISOString()); } catch {}
      enviado = { nombre, menor };
      const box = $("#conoBox"); if (box) { box.innerHTML = thanksHTML(enviado); box.scrollIntoView?.({ behavior: "smooth", block: "start" }); }
    } catch (err) {
      console.warn(err); btn.disabled = false;
      toast("No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.", "", 4000);
    }
  });
}

// ---------------------------------------------------------------------------
// «Invitar» (Comunidad): quien ya tiene cuenta no ve la página, solo comparte el enlace por WhatsApp.
// El enlace lleva ?o=amigo, así queda marcado «Me invitó un amigo o amiga».
// ---------------------------------------------------------------------------
// El mensaje se puede cambiar en Gestión → Apariencia («Comunidad · Invita a alguien»); el enlace va siempre al final.
export const INVITE_DEF = "¡Hola! Te invito a conocer Ágape, la Pastoral Juvenil de la Parroquia San Miguel de Yungay. Nos reunimos en comunidad, rezamos y la pasamos muy bien. Mira de qué se trata y déjanos tu contacto:";
const INVITE_TXT = () => `${((AP.de("cono_invite").textos || {})["[data-wa-msg]"] || INVITE_DEF).trim()} ${linkFor("amigo")}`;
const inviteHref = () => `https://wa.me/?text=${encodeURIComponent(INVITE_TXT())}`;
export function inviteCard() {
  if (!ctx.cloud.enabled || !ctx.cloud.state().ready) return "";
  return `<section class="card cono-invite" aria-labelledby="conoInvT">
    <div class="cono-invite-txt"><h2 id="conoInvT">Invita a alguien a Ágape</h2>
      <p class="muted small">¿Tienes un amigo o amiga que podría venir? Mándale la invitación por WhatsApp: le llega una página para conocernos y dejar su contacto.</p></div>
    <a class="btn btn-primary" href="${esc(inviteHref())}" target="_blank" rel="noopener">${icon("send")} <span class="cono-inv-l">Invitar</span></a>
  </section>`;
}
function inviteView() {
  return `<header class="page-head"><span class="eyebrow">Comunidad</span><h1>Invita a <em>alguien</em></h1>
    <p>Esta página es para quienes todavía no son parte de Ágape. Tú ya estás dentro: compártela con quien quieras invitar.</p></header>
  ${inviteCard()}
  <p class="xs muted" style="margin-top:12px">Si eres del equipo y quieres verla como la ve un visitante, usa «Ver como… visitante».</p>`;
}

// ---------------------------------------------------------------------------
// Gestión → «Quiero conocer Ágape»
// ---------------------------------------------------------------------------
let rows = null, filtro = "pendientes", canal = "instagram";
const tsDate = (t) => (t && typeof t.toDate === "function" ? t.toDate() : t ? new Date(t) : null);
const fecha = (t) => { const d = tsDate(t); return d && !isNaN(d) ? d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : ""; };
// Números chilenos: 9 dígitos que empiezan con 9 → 56 9…; 8 dígitos → 56 9…
function waNum(t) {
  let d = digits(t);
  if (d.length === 8) d = "9" + d;
  if (d.length === 9 && d.startsWith("9")) d = "56" + d;
  return d;
}
function waText(r) {
  const yo = (ctx.cloud.state().account?.name || "").split(" ")[0];
  const pri = (t) => String(t || "").split(" ")[0];
  const de = yo ? `Soy ${yo}, de` : "Le escribimos de";
  if (r.adultoNombre) return `Hola, ${pri(r.adultoNombre)}. ${de} la Pastoral Juvenil Ágape de la Parroquia San Miguel de Yungay. ${pri(r.nombre)} nos dejó su contacto porque quiere conocer el grupo. Nos encantaría contarle quiénes somos y cómo cuidamos a los jóvenes en los encuentros. ¿Tiene un momento para conversar?`;
  if (r.quien === "familia") return `Hola, ${pri(r.nombre)}. ${de} la Pastoral Juvenil Ágape de la Parroquia San Miguel de Yungay. Gracias por escribirnos${r.hijo ? " por " + pri(r.hijo) : ""}. Nos encantaría contarle cómo son los encuentros. ¿Tiene un momento para conversar?`;
  return `Hola, ${pri(r.nombre)}. ${yo ? `Soy ${yo}, de` : "Te escribimos de"} la Pastoral Juvenil Ágape de Yungay. Gracias por dejarnos tu contacto. Nos reunimos en comunidad en el salón parroquial, rezamos y la pasamos muy bien. Nos encantaría que vinieras. ¿Te cuento cuándo es el próximo encuentro?`;
}
const waLink = (r) => { const n = waNum(r.adultoTel || r.telefono); return n ? `https://wa.me/${n}?text=${encodeURIComponent(waText(r))}` : ""; };

async function load(force) {
  if (rows && !force) return rows;
  rows = (await ctx.cloud.listInteresados()).sort((a, b) => (tsDate(b.createdAt) || 0) - (tsDate(a.createdAt) || 0));
  return rows;
}

export async function adminView() {
  const head = `<header class="page-head"><span class="eyebrow">Gestión</span><h1>Quiero <em>conocer</em> Ágape</h1>
    <p>Quienes dejaron su contacto en la página pública para que los invitemos. Escríbeles por WhatsApp, marca cómo va cada uno y comparte los enlaces de la campaña: cada canal tiene el suyo, así sabemos cuál funciona mejor.</p></header>`;
  let list;
  try { list = await load(); } catch (e) {
    console.warn(e);
    return `${head}<div class="note warn">No se pudo cargar la lista. Si es la primera vez, falta publicar las reglas nuevas de Firebase (la sección «interesados» de firestore.rules).</div>${linksCard()}`;
  }
  const n = (k) => list.filter((r) => (r.estado || "nuevo") === k).length;
  const shown = list.filter((r) => filtro === "todos" || (filtro === "pendientes" ? ["nuevo", "contactado"].includes(r.estado || "nuevo") : (r.estado || "nuevo") === filtro));
  const porCanal = Object.entries(list.reduce((o, r) => { const k = r.campana || r.origen || "otro"; o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  return `${head}
  <div class="cono-stats">
    <div class="card"><b>${list.length}</b><span>En total</span></div>
    <div class="card"><b>${n("nuevo")}</b><span>Por contactar</span></div>
    <div class="card"><b>${n("contactado")}</b><span>Contactados</span></div>
    <div class="card"><b>${n("vino")}</b><span>Vinieron a un encuentro</span></div>
  </div>
  ${porCanal.length ? `<p class="small muted" style="margin-top:10px">Por canal: ${porCanal.map(([k, v]) => `${esc(origenLabel(k))} <b>${v}</b>`).join(" · ")}</p>` : ""}
  <div class="card">
    <div class="row-wrap" style="justify-content:space-between">
      <div class="seg" role="radiogroup" aria-label="Mostrar">${[["pendientes", "Pendientes"], ["vino", "Vinieron"], ["no", "No siguen"], ["todos", "Todos"]].map(([k, l]) => `<label><input type="radio" name="conoFiltro" value="${k}" ${filtro === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
      <div class="row-wrap"><button class="btn btn-sm btn-ghost" data-action="conoRefresh">${icon("undo")} Actualizar</button>
        <button class="btn btn-sm btn-ghost" data-action="conoCsv" ${list.length ? "" : "disabled"}>${icon("dl")} Exportar planilla</button></div>
    </div>
    <div class="stack" style="--gap:6px;margin-top:12px">${shown.length ? shown.map(rowHTML).join("") : `<p class="muted" style="text-align:center;padding:18px">${list.length ? "No hay nadie en esta lista." : "Todavía nadie ha dejado su contacto. Comparte los enlaces de abajo."}</p>`}</div>
  </div>
  ${linksCard()}`;
}

function rowHTML(r) {
  const menor = !!r.adultoNombre, wa = waLink(r), admin = ctx.cloud.state().isAdmin;
  return `<div class="tree-item cono-row"><div class="t">
      <strong>${esc(r.nombre)}${r.hijo ? ` <span class="muted">· por ${esc(r.hijo)}</span>` : ""}</strong>
      <span>${esc(String(r.edad || "?"))} años${r.quien === "familia" ? ` <span class="chip">Familia</span>` : ""}${menor ? ` <span class="chip warn">Menor · contactar a ${esc(r.adultoNombre)}</span>` : ""}
        · ${esc(origenLabel(r.campana || r.origen))}${fecha(r.createdAt) ? " · " + fecha(r.createdAt) : ""}</span>
      ${r.mensaje ? `<span class="cono-msg">«${esc(r.mensaje)}»</span>` : ""}
    </div>
    <div class="tools">
      <select class="select select-sm" data-cono-estado="${esc(r.id)}" aria-label="Estado de ${esc(r.nombre)}">${ESTADOS.map(([k, l]) => `<option value="${k}" ${(r.estado || "nuevo") === k ? "selected" : ""}>${l}</option>`).join("")}</select>
      ${wa ? `<a class="btn btn-sm btn-primary" href="${esc(wa)}" target="_blank" rel="noopener">${icon("chat")} WhatsApp</a>` : ""}
      ${admin ? `<button class="icon-btn danger" data-action="conoDelete" data-id="${esc(r.id)}" data-name="${esc(r.nombre)}" aria-label="Borrar a ${esc(r.nombre)}" title="Borrar sus datos">${icon("trash")}</button>` : ""}
    </div></div>`;
}

function linksCard() {
  const url = linkFor(canal);
  return `<div class="card cono-links">
    <div style="flex:1;min-width:240px">
      <h3>Enlaces para la campaña</h3>
      <p class="small muted" style="margin-top:4px">Usa un enlace distinto en cada canal. Quien entre por él tendrá ese canal ya marcado y aquí verás cuántos llegaron por cada uno.</p>
      <div class="field" style="margin-top:12px"><label for="conoCanal">Canal</label>
        <select class="select" id="conoCanal">${ORIGENES.filter(([k]) => k !== "otro").map(([k, l]) => `<option value="${k}" ${k === canal ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      <div class="row-wrap" style="margin-top:10px"><input class="input" readonly value="${esc(url)}" style="flex:1;min-width:200px" id="conoUrl">
        <button class="btn btn-sm btn-primary" data-action="conoCopy">${icon("copy")} Copiar</button>
        <a class="btn btn-sm btn-ghost" href="#/conocer?o=${esc(canal)}" target="_blank" rel="noopener">${icon("eye")} Ver la página</a></div>
    </div>
    <div class="cono-qr"><div id="conoQr" aria-label="Código QR del enlace"></div>
      <button class="btn btn-sm btn-ghost" data-action="conoQrPng">${icon("dl")} QR para imprimir</button></div>
  </div>`;
}

async function paintQr() {
  const el = $("#conoQr"); if (!el) return;
  const { default: qrcode } = await import("./qr.js");
  const q = qrcode(0, "M"); q.addData(linkFor(canal)); q.make();
  el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

function csv(list) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Fecha", "Quién escribe", "Nombre", "Hijo o hija", "Edad", "WhatsApp", "Apoderado", "WhatsApp apoderado", "Cómo supo", "Enlace de campaña", "Mensaje", "Estado"].map(cell).join(",")];
  list.forEach((r) => { const d = tsDate(r.createdAt); lines.push([d && !isNaN(d) ? d.toISOString().slice(0, 10) : "", r.quien === "familia" ? "Familia" : "Joven", r.nombre, r.hijo, r.edad, r.telefono, r.adultoNombre, r.adultoTel, origenLabel(r.origen), r.campana, r.mensaje, estadoLabel(r.estado)].map(cell).join(",")); });
  download(`quiero-conocer-agape-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + lines.join("\n"), "text/csv;charset=utf-8");
}

export function registerAdmin(actions, rerender) {
  const again = () => { rerender(); };
  actions.conoRefresh = async () => { rows = null; again(); };
  actions.conoCsv = async () => csv(await load());
  actions.conoCopy = async () => { try { await navigator.clipboard.writeText(linkFor(canal)); toast("Enlace copiado", "ok"); } catch { toast("No se pudo copiar", ""); } };
  actions.conoQrPng = async () => {
    const { default: qrcode } = await import("./qr.js");
    const q = qrcode(0, "M"); q.addData(linkFor(canal)); q.make();
    const n = q.getModuleCount(), size = 1200, pad = 80, cell = (size - pad * 2) / n;
    const cv = document.createElement("canvas"); cv.width = cv.height = size;
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, size, size); g.fillStyle = "#0b2566";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) g.fillRect(pad + x * cell, pad + y * cell, Math.ceil(cell), Math.ceil(cell));
    cv.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `qr-quiero-conocer-agape-${canal}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, "image/png");
  };
  actions.conoDelete = async (el) => {
    if (!confirm(`¿Borrar los datos de ${el.dataset.name || "esta persona"}? No se pueden recuperar.`)) return;
    try { await ctx.cloud.deleteInteresado(el.dataset.id); rows = (rows || []).filter((r) => r.id !== el.dataset.id); toast("Datos borrados", "ok"); again(); }
    catch (e) { console.warn(e); toast("No se pudo borrar", ""); }
  };
  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.name === "conoFiltro") { filtro = t.value; again(); return; }
    if (t.id === "conoCanal") { canal = t.value; const u = $("#conoUrl"); if (u) u.value = linkFor(canal); const v = t.closest(".cono-links")?.querySelector("a[href^='#/conocer']"); if (v) v.setAttribute("href", `#/conocer?o=${canal}`); paintQr(); return; }
    const id = t.dataset?.conoEstado; if (!id) return;
    try { await ctx.cloud.updateInteresado(id, { estado: t.value }); const r = (rows || []).find((x) => x.id === id); if (r) r.estado = t.value; toast("Guardado", "ok"); }
    catch (err) { console.warn(err); toast("No se pudo guardar", ""); }
  });
}
// Después de dibujar Gestión → «Quiero conocer Ágape», pinta el QR.
export const afterAdmin = () => setTimeout(paintQr, 0);
