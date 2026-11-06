// Coordinación · agAPPe
// App del equipo de coordinación y los dirigentes: tareas, reuniones y actas, planificación,
// buzón de la comunidad, documentos clave y formación en Mi Ruta.
// Usa el mismo proyecto de Firebase y las mismas cuentas que agAPPe.
import { CONFIG } from "../js/config.js";
import { isRepeat, occurrences } from "../js/repeat.js";

const MI_RUTA = "../Mi_ruta/";
const AGAPPE = "../";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hoyIso = () => isoDe(new Date());
const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const sumar = (s, dias) => { const d = parse(s); d.setDate(d.getDate() + dias); return isoDe(d); };
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const fechaLarga = (s) => { if (!s) return ""; const d = parse(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const fechaCorta = (s) => { if (!s) return ""; const d = parse(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; };
const cuando = (ts) => { const d = ts && ts.toDate ? ts.toDate() : null; return d ? `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : ""; };

function aviso(t) {
  const a = $("#aviso"); a.textContent = t; a.classList.add("visible");
  clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove("visible"), 2600);
}

const ICON = {
  inicio: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  tareas: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  reuniones: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 3-5 6-5s4 1 4 3"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  buzon: '<path d="M4 4h16v16H4z"/><path d="M4 13h5l1 3h4l1-3h5"/>',
  mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

// ---------------------------------------------------------------------------
// Firebase
// ---------------------------------------------------------------------------
let fb, auth, db;
const E = {
  usuario: null, cuenta: null, estado: "cargando",
  tareas: [], reuniones: [], actividades: [], docs: [], buzon: [], personas: [], agenda: null,
  escuchas: [],
};
const esEquipo = () => !!(E.cuenta && E.cuenta.active !== false && ["admin", "coordinador"].includes(E.cuenta.role));
const esGuia = () => !!(E.cuenta && E.cuenta.active !== false && ["admin", "coordinador", "dirigente"].includes(E.cuenta.role));
const miNombre = () => (E.cuenta && (E.cuenta.name || E.cuenta.email)) || "";
const ROLES = { admin: "Administración", coordinador: "Coordinación", dirigente: "Dirigente" };

async function iniciar() {
  window.addEventListener("hashchange", pintar);
  if (!CONFIG.firebase) { E.estado = "sin-nube"; pintar(); return; }
  try {
    fb = await import(CONFIG.firebaseModule || "../js/vendor/firebase.mjs");
    // Mismo nombre de app que agAPPe ([DEFAULT]) para compartir la sesión iniciada en el mismo sitio.
    const app = fb.initializeApp(CONFIG.firebase);
    auth = fb.getAuth(app);
    db = fb.initializeFirestore(app, {});
    try { await fb.getRedirectResult(auth); } catch (e) { console.warn(e); }
    fb.onAuthStateChanged(auth, async (u) => {
      E.escuchas.forEach((f) => f()); E.escuchas = [];
      E.usuario = u; E.cuenta = null;
      if (u) {
        try {
          const s = await fb.getDoc(fb.doc(db, "users", u.uid));
          E.cuenta = s.exists() ? s.data() : null;
        } catch (e) { console.warn("cuenta", e); }
        if (esGuia()) escuchar();
      }
      E.estado = "listo";
      pintar();
    });
  } catch (e) {
    console.warn(e); E.estado = "error"; pintar();
  }
}

function filas(qs) { return qs.docs.map((d) => ({ id: d.id, ...d.data() })); }
function escuchar() {
  const ver = (col, clave, filtro) => {
    const ref = filtro ? fb.query(fb.collection(db, col), filtro) : fb.collection(db, col);
    E.escuchas.push(fb.onSnapshot(ref, (qs) => { E[clave] = filas(qs).filter((x) => !x.borrado); pintar(true); },
      (err) => console.warn(col, err && err.code)));
  };
  ver("coord_tareas", "tareas");
  ver("coord_reuniones", "reuniones");
  ver("coord_actividades", "actividades");
  ver("coord_docs", "docs");
  if (esEquipo()) {
    ver("buzon", "buzon");
    fb.getDocs(fb.collection(db, "users")).then((qs) => {
      E.personas = filas(qs).filter((p) => p.active !== false && ["admin", "coordinador", "dirigente"].includes(p.role))
        .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""));
      pintar(true);
    }).catch((e) => console.warn("personas", e && e.code));
  }
  cargarAgenda();
}
async function cargarAgenda() {
  try { E.agenda = filas(await fb.getDocs(fb.collection(db, "agenda"))); } catch (e) { console.warn("agenda", e); E.agenda = []; }
  pintar(true);
}
const ahora = () => fb.serverTimestamp();
async function guardar(col, id, datos) {
  const ref = id ? fb.doc(db, col, id) : fb.doc(fb.collection(db, col));
  await fb.setDoc(ref, { ...datos, actualizado: ahora(), por: miNombre().slice(0, 80) }, { merge: true });
  return ref.id;
}
const borrar = (col, id) => fb.setDoc(fb.doc(db, col, id), { borrado: true, actualizado: ahora(), por: miNombre().slice(0, 80) }, { merge: true });

// ---------------------------------------------------------------------------
// Estructura
// ---------------------------------------------------------------------------
const SECCIONES = [
  ["", "Inicio", "inicio"], ["tareas", "Tareas", "tareas"], ["reuniones", "Reuniones", "reuniones"],
  ["calendario", "Planificación", "calendario"], ["mas", "Más", "mas"],
];
function ruta() { return location.hash.replace(/^#\/?/, "").split("/"); }

function pintarCabecera() {
  const c = $("#cuenta");
  if (E.usuario) {
    c.innerHTML = `<span class="xs" title="${esc(E.usuario.email)}">${esc((miNombre() || "").split(" ")[0])}${E.cuenta && ROLES[E.cuenta.role] ? ` · ${ROLES[E.cuenta.role]}` : ""}</span>
      <button class="boton claro mini" data-accion="salir">Salir</button>`;
  } else c.innerHTML = "";
  const menu = $("#menu");
  const r = ruta()[0];
  if (esGuia() && r !== "escribenos") {
    const nuevos = E.buzon.filter((m) => m.estado === "nuevo").length;
    const mias = E.tareas.filter((t) => t.respUid === E.usuario.uid && t.estado !== "hecha").length;
    menu.hidden = false;
    menu.innerHTML = SECCIONES.map(([h, t, i]) => {
      const activo = (h === "" && r === "") || (h && r === h) || (h === "mas" && ["buzon", "documentos", "formacion", "mas"].includes(r));
      const n = h === "tareas" ? mias : h === "mas" ? nuevos : 0;
      return `<a href="#/${h}" class="${activo ? "activo" : ""}">${svg(i)}<span>${t}</span>${n ? `<span class="insignia">${n}</span>` : ""}</a>`;
    }).join("");
  } else { menu.hidden = true; menu.innerHTML = ""; }
}

let ultimoHtml = "";
function pintar(desdeDatos) {
  pintarCabecera();
  const app = $("#app");
  // No repintar mientras alguien escribe en un formulario de la página.
  if (desdeDatos && app.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (desdeDatos && $("dialog[open]")) return;
  const [r, a, b] = ruta();
  let html;
  if (r === "escribenos") html = vistaEscribenos();
  else if (E.estado === "cargando") html = '<p class="cargando">Cargando…</p>';
  else if (E.estado === "sin-nube" || E.estado === "error") html = `<div class="tarjeta"><h2>Sin conexión con la base de datos</h2><p>No se pudo conectar con agAPPe. Revisa tu conexión e intenta de nuevo.</p></div>`;
  else if (!E.usuario) html = vistaAcceso();
  else if (!esGuia()) html = vistaSinPermiso();
  else if (r === "tareas") html = vistaTareas(a);
  else if (r === "reuniones" && a) html = vistaReunion(a, b);
  else if (r === "reuniones") html = vistaReuniones();
  else if (r === "calendario") html = vistaCalendario(a);
  else if (r === "buzon") html = esEquipo() ? vistaBuzon(a) : vistaSoloEquipo();
  else if (r === "documentos") html = vistaDocumentos();
  else if (r === "formacion") html = vistaFormacion();
  else if (r === "mas") html = vistaMas();
  else html = vistaInicio();
  if (desdeDatos && html === ultimoHtml) return;
  ultimoHtml = html;
  app.innerHTML = html;
  if (r === "formacion") cargarFormacion();
}

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------
function vistaAcceso() {
  return `<div class="acceso tarjeta">
    <img class="logo" src="../icons/logo-160.webp" alt="">
    <h1>Coordinación</h1>
    <p>El espacio del equipo de coordinación y los dirigentes de la Pastoral Juvenil Ágape: tareas, reuniones, planificación y buzón.</p>
    <p class="small muted">Entra con la misma cuenta de Google que usas en agAPPe.</p>
    <div class="botones" style="justify-content:center"><button class="boton principal" data-accion="entrar">Entrar con Google</button></div>
    <p class="xs muted" style="margin-top:16px">¿Quieres escribirle al equipo? <a href="#/escribenos">Usa el buzón</a>.</p>
  </div>`;
}
function vistaSinPermiso() {
  return `<div class="acceso tarjeta">
    <h1>Solo para el equipo</h1>
    <p>Esta app es para la coordinación y los dirigentes de agAPPe. Tu cuenta (${esc(E.usuario.email)}) no tiene ese rol${E.cuenta ? "" : " o todavía no está registrada en agAPPe"}.</p>
    <p class="small muted">Si deberías tener acceso, pídeselo a un administrador en agAPPe → Gestión.</p>
    <div class="botones" style="justify-content:center"><a class="boton" href="${AGAPPE}">Ir a agAPPe</a> <a class="boton" href="#/escribenos">Escribir al equipo</a></div>
  </div>`;
}
const vistaSoloEquipo = () => `<div class="tarjeta"><h2>Solo para coordinación</h2><p>El buzón de la comunidad lo revisan la coordinación y la administración, porque contiene datos de contacto de las personas.</p></div>`;

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------
function proximos(dias = 30) {
  const h = hoyIso(), fin = sumar(h, dias);
  const lista = [];
  (E.agenda || []).filter((e) => e.date).forEach((e) => {
    const fechas = isRepeat(e) ? occurrences(e, h, fin) : (e.date >= h && e.date <= fin ? [e.date] : []);
    fechas.forEach((d) => lista.push({ fecha: d, hora: e.start || "", titulo: e.title, tipo: "agape", detalle: e.place || "", enlace: `${AGAPPE}#/agenda` }));
  });
  E.reuniones.filter((r) => r.fecha >= h && r.fecha <= fin).forEach((r) => lista.push({ fecha: r.fecha, hora: r.hora || "", titulo: r.titulo, tipo: "reunion", detalle: r.lugar || "", enlace: `#/reuniones/${r.id}` }));
  E.actividades.filter((x) => x.fecha >= h && x.fecha <= fin && !x.agendaId).forEach((x) => lista.push({ fecha: x.fecha, hora: "", titulo: x.titulo, tipo: "plan", detalle: x.respNombre ? `Responsable: ${x.respNombre}` : "", enlace: "#/calendario" }));
  return lista.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}
const TIPO_EVENTO = { agape: ["Agenda agAPPe", "#ef591c"], reunion: ["Reunión", "#1351a4"], plan: ["Planificación", "#2f7d4f"], tarea: ["Plazo de tarea", "#b4442e"] };

function filaTarea(t, compacta) {
  const vencida = t.plazo && t.estado !== "hecha" && t.plazo < hoyIso();
  return `<li><div class="cuerpo"><a class="titulo" href="#/tareas" data-accion="editar-tarea" data-id="${esc(t.id)}">${esc(t.titulo)}</a>
    <div class="meta">${[t.respNombre ? esc(t.respNombre) : "Sin responsable", t.plazo ? `${vencida ? '<span class="etiqueta vencida">Vencida</span> ' : ""}plazo ${fechaCorta(t.plazo)}` : "", t.area ? esc(t.area) : ""].filter(Boolean).join(" · ")}</div></div>
    ${compacta ? `<span class="etiqueta ${t.estado}">${ESTADOS[t.estado] || ""}</span>` : ""}</li>`;
}

function vistaInicio() {
  const h = hoyIso();
  const mias = E.tareas.filter((t) => t.respUid === E.usuario.uid && t.estado !== "hecha").sort(porPlazo);
  const vencidas = E.tareas.filter((t) => t.estado !== "hecha" && t.plazo && t.plazo < h);
  const abiertas = E.tareas.filter((t) => t.estado !== "hecha");
  const prox = proximos(21);
  const reunion = E.reuniones.filter((r) => r.fecha >= h).sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")))[0];
  const nuevos = E.buzon.filter((m) => m.estado === "nuevo").length;
  return `<div class="encabezado"><h1>Hola, ${esc((miNombre() || "").split(" ")[0])}</h1><span class="muted small">${fechaLarga(h)}</span></div>
  <div class="cifras">
    <a class="cifra" href="#/tareas"><b>${mias.length}</b><span>tareas tuyas pendientes</span></a>
    <a class="cifra ${vencidas.length ? "alerta" : ""}" href="#/tareas/vencidas"><b>${vencidas.length}</b><span>tareas vencidas</span></a>
    <a class="cifra" href="#/tareas/todas"><b>${abiertas.length}</b><span>tareas abiertas del equipo</span></a>
    ${esEquipo() ? `<a class="cifra ${nuevos ? "alerta" : ""}" href="#/buzon"><b>${nuevos}</b><span>mensajes nuevos en el buzón</span></a>` : ""}
  </div>
  <div class="rejilla dos">
    <section class="tarjeta"><h2>Tus tareas</h2>
      ${mias.length ? `<ul class="lista">${mias.slice(0, 6).map((t) => filaTarea(t, true)).join("")}</ul>` : '<p class="vacio">No tienes tareas pendientes.</p>'}
      <div class="botones"><a class="boton mini" href="#/tareas">Ver tablero</a>${esEquipo() ? '<button class="boton mini principal" data-accion="nueva-tarea">Nueva tarea</button>' : ""}</div>
    </section>
    <section class="tarjeta"><h2>Próxima reunión</h2>
      ${reunion ? `<p><a class="titulo" href="#/reuniones/${esc(reunion.id)}"><b>${esc(reunion.titulo)}</b></a><br><span class="muted small">${fechaLarga(reunion.fecha)}${reunion.hora ? `, ${esc(reunion.hora)}` : ""}${reunion.lugar ? ` · ${esc(reunion.lugar)}` : ""}</span></p>
        ${reunion.objetivo ? `<p class="small">${esc(reunion.objetivo)}</p>` : ""}` : '<p class="vacio">No hay reuniones convocadas.</p>'}
      <div class="botones"><a class="boton mini" href="#/reuniones">Reuniones</a>${esEquipo() ? '<button class="boton mini principal" data-accion="nueva-reunion">Convocar</button>' : ""}</div>
    </section>
  </div>
  <section class="tarjeta"><h2>Próximas 3 semanas</h2>
    ${prox.length ? `<ul class="lista">${prox.slice(0, 10).map((e) => `<li><div class="fecha-caja"><b>${parse(e.fecha).getDate()}</b><span>${MESES[parse(e.fecha).getMonth()].slice(0, 3)}</span></div>
      <div class="cuerpo"><a class="titulo" href="${e.enlace}">${esc(e.titulo)}</a><div class="meta"><span class="punto" style="background:${TIPO_EVENTO[e.tipo][1]}"></span>${TIPO_EVENTO[e.tipo][0]}${e.hora ? ` · ${esc(e.hora)}` : ""}${e.detalle ? ` · ${esc(e.detalle)}` : ""}</div></div></li>`).join("")}</ul>` : '<p class="vacio">No hay fechas en las próximas semanas.</p>'}
    <div class="botones"><a class="boton mini" href="#/calendario">Planificación</a><a class="boton mini" href="${AGAPPE}#/agenda">Agenda de agAPPe</a></div>
  </section>
  ${enlacesEcosistema()}`;
}

function enlacesEcosistema() {
  return `<section class="tarjeta"><h2>agAPPe y Mi Ruta</h2><div class="enlaces">
    <a class="enlace" href="${AGAPPE}#/agenda"><b>Agenda de agAPPe</b><span>Las fechas que ve toda la comunidad.</span></a>
    ${esEquipo() ? `<a class="enlace" href="${AGAPPE}#/admin"><b>Gestión de agAPPe</b><span>Cuentas, roles, contenido y familias.</span></a>` : ""}
    <a class="enlace" href="${AGAPPE}#/acompanar"><b>Acompañar</b><span>Jóvenes, fichas y familias de agAPPe.</span></a>
    <a class="enlace" href="#/formacion"><b>Formación del equipo</b><span>Las rutas de Mi Ruta para dirigentes y coordinación.</span></a>
  </div></section>`;
}

// ---------------------------------------------------------------------------
// Tareas
// ---------------------------------------------------------------------------
const ESTADOS = { pend: "Pendiente", curso: "En curso", hecha: "Hecha" };
const porPlazo = (a, b) => (a.plazo || "9999").localeCompare(b.plazo || "9999") || (a.prioridad === "alta" ? -1 : 1);
const AREAS = ["Coordinación", "Encuentros", "Liturgia", "Misiones", "Formación", "Comunicaciones", "Tesorería", "Familias", "Otra"];

function puedeMoverTarea(t) { return esEquipo() || (t.respUid && t.respUid === E.usuario.uid); }
function tarjetaTarea(t) {
  const vencida = t.plazo && t.estado !== "hecha" && t.plazo < hoyIso();
  const reu = t.reunion && E.reuniones.find((r) => r.id === t.reunion);
  const sig = { pend: ["curso", "Empezar"], curso: ["hecha", "Marcar hecha"], hecha: ["pend", "Reabrir"] }[t.estado || "pend"];
  return `<article class="tarea">
    <h3>${esc(t.titulo)}</h3>
    ${t.detalle ? `<p class="small" style="margin:0 0 6px">${esc(t.detalle)}</p>` : ""}
    <div class="meta">${t.prioridad === "alta" ? '<span class="etiqueta alta">Prioridad</span>' : ""}${vencida ? '<span class="etiqueta vencida">Vencida</span>' : ""}
      <span>${t.respNombre ? esc(t.respNombre) : "Sin responsable"}</span>${t.plazo ? `<span>· ${fechaCorta(t.plazo)}</span>` : ""}${t.area ? `<span>· ${esc(t.area)}</span>` : ""}</div>
    ${reu ? `<p class="xs muted" style="margin:4px 0 0">Acuerdo de <a href="#/reuniones/${esc(reu.id)}">${esc(reu.titulo)}</a></p>` : ""}
    ${t.nota ? `<p class="xs" style="margin:6px 0 0"><b>Avance:</b> ${esc(t.nota)}</p>` : ""}
    <div class="acciones">
      ${puedeMoverTarea(t) ? `<button class="boton mini ${t.estado === "curso" ? "principal" : ""}" data-accion="mover-tarea" data-id="${esc(t.id)}" data-a="${sig[0]}">${sig[1]}</button>
        <button class="boton mini" data-accion="avance-tarea" data-id="${esc(t.id)}">Avance</button>` : ""}
      ${esEquipo() ? `<button class="boton mini" data-accion="editar-tarea" data-id="${esc(t.id)}">Editar</button>` : ""}
    </div></article>`;
}
function vistaTareas(filtro = "mias") {
  const h = hoyIso();
  const F = {
    mias: ["Mías", (t) => t.respUid === E.usuario.uid],
    todas: ["Todo el equipo", () => true],
    vencidas: ["Vencidas", (t) => t.estado !== "hecha" && t.plazo && t.plazo < h],
    sin: ["Sin responsable", (t) => !t.respUid],
  };
  if (!F[filtro]) filtro = "mias";
  const lista = E.tareas.filter(F[filtro][1]).sort(porPlazo);
  const col = (est) => {
    const xs = lista.filter((t) => (t.estado || "pend") === est);
    const mostrar = est === "hecha" ? xs.sort((a, b) => (b.actualizado?.seconds || 0) - (a.actualizado?.seconds || 0)).slice(0, 12) : xs;
    return `<section class="columna"><h2>${ESTADOS[est]} <span class="muted">${xs.length}</span></h2>${mostrar.map(tarjetaTarea).join("") || '<p class="xs muted">Nada por aquí.</p>'}</section>`;
  };
  return `<div class="encabezado"><h1>Tareas</h1>${esEquipo() ? '<button class="boton principal" data-accion="nueva-tarea">Nueva tarea</button>' : ""}</div>
  <div class="filtros">${Object.entries(F).map(([k, [t]]) => `<button class="${k === filtro ? "activo" : ""}" data-accion="ir" data-h="#/tareas/${k}">${t}</button>`).join("")}</div>
  ${!esEquipo() ? '<p class="small muted">Puedes actualizar el estado y el avance de las tareas que tienes asignadas. La coordinación crea y asigna las tareas.</p>' : ""}
  <div class="tablero">${col("pend")}${col("curso")}${col("hecha")}</div>`;
}
function opcionesPersonas(sel) {
  return `<option value="">Sin responsable</option>${E.personas.map((p) => `<option value="${esc(p.id)}" ${p.id === sel ? "selected" : ""}>${esc(p.name || p.email)} · ${ROLES[p.role] || p.role}</option>`).join("")}`;
}
function formTarea(t = {}) {
  hoja(t.id ? "Editar tarea" : "Nueva tarea", `
    <div class="campo"><label for="tt">Tarea</label><input id="tt" name="titulo" type="text" maxlength="140" required value="${esc(t.titulo || "")}" placeholder="Ej.: Conseguir la casa para el retiro"></div>
    <div class="campo"><label for="td">Detalle</label><textarea id="td" name="detalle" maxlength="1000" placeholder="Qué hay que hacer, con quién, qué materiales…">${esc(t.detalle || "")}</textarea></div>
    <div class="fila dos">
      <div class="campo"><label for="tr">Responsable</label><select id="tr" name="resp">${opcionesPersonas(t.respUid)}</select></div>
      <div class="campo"><label for="tp">Plazo</label><input id="tp" name="plazo" type="date" value="${esc(t.plazo || "")}"></div>
    </div>
    <div class="fila tres">
      <div class="campo"><label for="ta">Área</label><select id="ta" name="area">${AREAS.map((a) => `<option ${a === (t.area || "Coordinación") ? "selected" : ""}>${a}</option>`).join("")}</select></div>
      <div class="campo"><label for="te">Estado</label><select id="te" name="estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${k === (t.estado || "pend") ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="campo"><label for="tq">Prioridad</label><select id="tq" name="prioridad"><option value="normal">Normal</option><option value="alta" ${t.prioridad === "alta" ? "selected" : ""}>Alta</option></select></div>
    </div>`, async (f) => {
    const p = E.personas.find((x) => x.id === f.resp);
    await guardar("coord_tareas", t.id, {
      titulo: f.titulo.trim(), detalle: f.detalle.trim(), respUid: p ? p.id : "", respNombre: p ? (p.name || p.email).slice(0, 80) : "",
      plazo: f.plazo || "", area: f.area, estado: f.estado, prioridad: f.prioridad, reunion: t.reunion || "", nota: t.nota || "",
      ...(t.id ? {} : { creado: ahora(), borrado: false }),
    });
    aviso(t.id ? "Tarea actualizada" : "Tarea creada");
  }, t.id ? `<button type="button" class="boton peligro" data-accion="borrar-tarea" data-id="${esc(t.id)}">Borrar tarea</button>` : "");
}

// ---------------------------------------------------------------------------
// Reuniones y actas
// ---------------------------------------------------------------------------
const TIPOS_REUNION = ["Reunión de coordinación", "Reunión de dirigentes", "Reunión con asesores", "Evaluación", "Planificación", "Otra"];
function vistaReuniones() {
  const h = hoyIso();
  const prox = E.reuniones.filter((r) => r.fecha >= h).sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));
  const pasadas = E.reuniones.filter((r) => r.fecha < h).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const fila = (r) => {
    const n = (r.acuerdos || []).length;
    return `<li><div class="fecha-caja"><b>${parse(r.fecha).getDate()}</b><span>${MESES[parse(r.fecha).getMonth()].slice(0, 3)}</span></div>
      <div class="cuerpo"><a class="titulo" href="#/reuniones/${esc(r.id)}">${esc(r.titulo)}</a>
      <div class="meta">${[r.tipo, r.hora, r.lugar].filter(Boolean).map(esc).join(" · ")}${r.fecha < h ? ` · ${r.desarrollo || n ? `acta con ${n} ${n === 1 ? "acuerdo" : "acuerdos"}` : '<span class="etiqueta pend">Falta el acta</span>'}` : ""}</div></div></li>`;
  };
  return `<div class="encabezado"><h1>Reuniones</h1>${esEquipo() ? '<button class="boton principal" data-accion="nueva-reunion">Convocar reunión</button>' : ""}</div>
  <section class="tarjeta"><h2>Próximas</h2>${prox.length ? `<ul class="lista">${prox.map(fila).join("")}</ul>` : '<p class="vacio">No hay reuniones convocadas.</p>'}</section>
  <section class="tarjeta"><h2>Anteriores</h2>${pasadas.length ? `<ul class="lista">${pasadas.slice(0, 30).map(fila).join("")}</ul>` : '<p class="vacio">Todavía no hay reuniones registradas.</p>'}</section>`;
}
function textoConvocatoria(r) {
  const tabla = (r.tabla || []).map((p, i) => `${i + 1}. ${p.t}${p.min ? ` (${p.min} min)` : ""}`).join("\n");
  return `*${r.titulo}*\n${fechaLarga(r.fecha)}${r.hora ? `, ${r.hora}` : ""}${r.lugar ? `\n${r.lugar}` : ""}\n\n${r.objetivo ? `Objetivo: ${r.objetivo}\n\n` : ""}${tabla ? `Tabla:\n${tabla}\n\n` : ""}Ver en la app de coordinación: ${location.origin}${location.pathname}#/reuniones/${r.id}`;
}
function vistaReunion(id, modo) {
  const r = E.reuniones.find((x) => x.id === id);
  if (!r) return '<div class="tarjeta"><p>No se encontró la reunión.</p><a class="boton" href="#/reuniones">Volver</a></div>';
  const anteriores = E.reuniones.filter((x) => x.fecha < r.fecha).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const previa = anteriores[0];
  const pendientesPrevios = previa ? E.tareas.filter((t) => t.reunion === previa.id) : [];
  const total = (r.tabla || []).reduce((s, p) => s + (Number(p.min) || 0), 0);
  const editar = modo === "acta" && esEquipo();
  return `<p class="small"><a href="#/reuniones">← Reuniones</a></p>
  <div class="encabezado"><div><h1>${esc(r.titulo)}</h1><p class="muted" style="margin:0">${esc(r.tipo || "")} · ${fechaLarga(r.fecha)}${r.hora ? `, ${esc(r.hora)}` : ""}${r.lugar ? ` · ${esc(r.lugar)}` : ""}</p></div>
    ${esEquipo() ? `<div class="botones" style="margin:0"><button class="boton mini" data-accion="editar-reunion" data-id="${esc(r.id)}">Editar convocatoria</button>
      <button class="boton mini" data-accion="compartir-reunion" data-id="${esc(r.id)}">Enviar por WhatsApp</button></div>` : ""}</div>
  <div class="rejilla dos">
    <section class="tarjeta"><h2>Convocatoria</h2>
      ${r.objetivo ? `<p><b>Objetivo:</b> ${esc(r.objetivo)}</p>` : ""}
      ${(r.tabla || []).length ? `<ol class="tabla-reunion">${r.tabla.map((p) => `<li><span>${esc(p.t)}</span>${p.min ? `<span class="min">${p.min} min</span>` : ""}</li>`).join("")}</ol>${total ? `<p class="xs muted">Duración estimada: ${total} minutos.</p>` : ""}` : '<p class="vacio">Sin tabla.</p>'}
      ${r.enlace ? `<p><a class="boton mini" href="${esc(r.enlace)}" target="_blank" rel="noopener">Abrir enlace de la reunión</a></p>` : ""}
    </section>
    <section class="tarjeta"><h2>Acuerdos de la reunión anterior</h2>
      ${previa ? `<p class="xs muted">De <a href="#/reuniones/${esc(previa.id)}">${esc(previa.titulo)}</a> (${fechaCorta(previa.fecha)})</p>
        ${pendientesPrevios.length ? `<ul class="lista">${pendientesPrevios.map((t) => filaTarea(t, true)).join("")}</ul>` : '<p class="vacio">Esa reunión no dejó tareas.</p>'}` : '<p class="vacio">No hay una reunión anterior.</p>'}
    </section>
  </div>
  <section class="tarjeta"><div class="encabezado"><h2 style="margin:0">Acta</h2>${esEquipo() && !editar ? `<a class="boton mini principal" href="#/reuniones/${esc(r.id)}/acta">${r.desarrollo || (r.acuerdos || []).length ? "Editar acta" : "Escribir acta"}</a>` : ""}</div>
    ${editar ? formActa(r) : `
      ${r.asistentes ? `<p><b>Asistentes:</b> ${esc(r.asistentes)}</p>` : ""}
      ${r.desarrollo ? `<div class="texto-acta">${esc(r.desarrollo)}</div>` : '<p class="vacio">Todavía no hay acta.</p>'}
      <h3 style="margin-top:14px">Acuerdos</h3>
      ${(r.acuerdos || []).length ? `<ul class="lista">${r.acuerdos.map((a) => { const t = a.tareaId && E.tareas.find((x) => x.id === a.tareaId);
        return `<li><div class="cuerpo"><b>${esc(a.t)}</b><div class="meta">${[a.respNombre, a.plazo ? `plazo ${fechaCorta(a.plazo)}` : ""].filter(Boolean).map(esc).join(" · ")}</div></div>${t ? `<span class="etiqueta ${t.estado}">${ESTADOS[t.estado]}</span>` : ""}</li>`; }).join("")}</ul>` : '<p class="vacio">Sin acuerdos registrados.</p>'}
      ${r.por ? `<p class="xs muted">Última edición: ${esc(r.por)} ${cuando(r.actualizado)}</p>` : ""}`}
  </section>`;
}
function filaAcuerdo(a = {}, i) {
  return `<div class="acuerdo" data-i="${i}">
    <div><label>Acuerdo</label><input type="text" name="ac_t" maxlength="200" value="${esc(a.t || "")}" placeholder="Qué se acordó"></div>
    <div><label>Responsable</label><select name="ac_r">${opcionesPersonas(a.respUid)}</select></div>
    <div><label>Plazo</label><input type="date" name="ac_p" value="${esc(a.plazo || "")}"></div>
    <div>${a.tareaId ? '<span class="xs muted">Ya es tarea</span>' : '<button type="button" class="boton mini peligro" data-accion="quitar-acuerdo">Quitar</button>'}<input type="hidden" name="ac_id" value="${esc(a.tareaId || "")}"></div>
  </div>`;
}
function formActa(r) {
  const acs = (r.acuerdos || []).length ? r.acuerdos : [{}];
  return `<form id="form-acta" data-id="${esc(r.id)}">
    <div class="campo"><label for="aa">Asistentes</label><input id="aa" name="asistentes" type="text" maxlength="500" value="${esc(r.asistentes || "")}" placeholder="Nombres separados por coma"></div>
    <div class="campo"><label for="ad">Desarrollo</label><textarea id="ad" name="desarrollo" maxlength="8000" style="min-height:180px" placeholder="Lo conversado en cada punto de la tabla">${esc(r.desarrollo || (r.tabla || []).map((p, i) => `${i + 1}. ${p.t}\n`).join("\n"))}</textarea></div>
    <label>Acuerdos</label><p class="ayuda" style="margin-top:0">Cada acuerdo con responsable se convierte en una tarea del tablero al guardar.</p>
    <div id="acuerdos">${acs.map(filaAcuerdo).join("")}</div>
    <button type="button" class="boton mini" data-accion="agregar-acuerdo">Agregar acuerdo</button>
    <div class="botones"><button class="boton principal" type="submit">Guardar acta</button><a class="boton" href="#/reuniones/${esc(r.id)}">Cancelar</a></div>
  </form>`;
}
async function guardarActa(form) {
  const id = form.dataset.id, r = E.reuniones.find((x) => x.id === id);
  const acuerdos = [];
  for (const el of $$(".acuerdo", form)) {
    const t = $('[name="ac_t"]', el).value.trim(); if (!t) continue;
    const p = E.personas.find((x) => x.id === $('[name="ac_r"]', el).value);
    const plazo = $('[name="ac_p"]', el).value;
    let tareaId = $('[name="ac_id"]', el).value;
    if (!tareaId && p) {
      tareaId = await guardar("coord_tareas", null, { titulo: t.slice(0, 140), detalle: `Acuerdo de «${r.titulo}» (${fechaCorta(r.fecha)}).`, respUid: p.id, respNombre: (p.name || p.email).slice(0, 80),
        plazo, area: "Coordinación", estado: "pend", prioridad: "normal", reunion: id, nota: "", creado: ahora(), borrado: false });
    }
    acuerdos.push({ t: t.slice(0, 200), respUid: p ? p.id : "", respNombre: p ? (p.name || p.email).slice(0, 80) : "", plazo, tareaId: tareaId || "" });
  }
  await guardar("coord_reuniones", id, { asistentes: form.asistentes.value.trim(), desarrollo: form.desarrollo.value.trim(), acuerdos, estado: "realizada" });
  aviso("Acta guardada");
  location.hash = `#/reuniones/${id}`;
}
function formReunion(r = {}) {
  const tabla = (r.tabla || []).length ? r.tabla : [{ t: "Oración inicial", min: 5 }, { t: "Revisión de acuerdos anteriores", min: 10 }, { t: "", min: 20 }, { t: "Acuerdos y cierre", min: 10 }];
  hoja(r.id ? "Editar convocatoria" : "Convocar reunión", `
    <div class="campo"><label for="rt">Nombre</label><input id="rt" name="titulo" type="text" maxlength="120" required value="${esc(r.titulo || "")}" placeholder="Ej.: Reunión de coordinación de marzo"></div>
    <div class="fila tres">
      <div class="campo"><label for="rf">Fecha</label><input id="rf" name="fecha" type="date" required value="${esc(r.fecha || hoyIso())}"></div>
      <div class="campo"><label for="rh">Hora</label><input id="rh" name="hora" type="time" value="${esc(r.hora || "")}"></div>
      <div class="campo"><label for="rx">Tipo</label><select id="rx" name="tipo">${TIPOS_REUNION.map((t) => `<option ${t === (r.tipo || TIPOS_REUNION[0]) ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    </div>
    <div class="fila dos">
      <div class="campo"><label for="rl">Lugar</label><input id="rl" name="lugar" type="text" maxlength="120" value="${esc(r.lugar || "")}" placeholder="Salón parroquial o «En línea»"></div>
      <div class="campo"><label for="re">Enlace (Meet, Teams…)</label><input id="re" name="enlace" type="url" maxlength="300" value="${esc(r.enlace || "")}" placeholder="https://"></div>
    </div>
    <div class="campo"><label for="ro">Objetivo</label><input id="ro" name="objetivo" type="text" maxlength="300" value="${esc(r.objetivo || "")}" placeholder="Qué queremos lograr en esta reunión"></div>
    <label>Tabla</label>
    <div id="tabla">${tabla.map((p) => `<div class="fila" style="grid-template-columns:1fr 80px;margin-bottom:6px"><input type="text" name="tb_t" maxlength="160" value="${esc(p.t)}" placeholder="Tema"><input type="number" name="tb_m" min="0" max="240" value="${esc(p.min || "")}" placeholder="min"></div>`).join("")}</div>
    <button type="button" class="boton mini" data-accion="agregar-punto">Agregar tema</button>`,
  async (f, form) => {
    const tabla = $$("#tabla > div", form).map((d) => ({ t: $('[name="tb_t"]', d).value.trim().slice(0, 160), min: Number($('[name="tb_m"]', d).value) || 0 })).filter((p) => p.t).slice(0, 20);
    const id = await guardar("coord_reuniones", r.id, { titulo: f.titulo.trim(), fecha: f.fecha, hora: f.hora || "", tipo: f.tipo, lugar: f.lugar.trim(), enlace: f.enlace.trim(), objetivo: f.objetivo.trim(), tabla,
      ...(r.id ? {} : { estado: "convocada", asistentes: "", desarrollo: "", acuerdos: [], creado: ahora(), borrado: false }) });
    aviso(r.id ? "Convocatoria actualizada" : "Reunión convocada");
    if (!r.id) location.hash = `#/reuniones/${id}`;
  }, r.id ? `<button type="button" class="boton peligro" data-accion="borrar-reunion" data-id="${esc(r.id)}">Borrar reunión</button>` : "");
}

// ---------------------------------------------------------------------------
// Planificación (calendario)
// ---------------------------------------------------------------------------
const ESTADOS_ACT = { idea: "Idea", preparando: "En preparación", lista: "Lista", realizada: "Realizada", cancelada: "Cancelada" };
const TIPOS_AGAPE = { encuentro: "Encuentro", retiro: "Retiro", misa: "Misa", liturgia: "Liturgia", festividad: "Festividad", curso: "Curso", taller: "Taller", lectura: "Lectura" };
function vistaCalendario(mesTxt) {
  const hoy = hoyIso();
  const mes = /^\d{4}-\d{2}$/.test(mesTxt || "") ? mesTxt : hoy.slice(0, 7);
  const [y, m] = mes.split("-").map(Number);
  const desde = `${mes}-01`, hasta = isoDe(new Date(y, m, 0));
  const prev = isoDe(new Date(y, m - 2, 1)).slice(0, 7), next = isoDe(new Date(y, m, 1)).slice(0, 7);
  const ev = [];
  (E.agenda || []).filter((e) => e.date).forEach((e) => {
    const fechas = isRepeat(e) ? occurrences(e, desde, hasta) : (e.date >= desde && e.date <= hasta ? [e.date] : []);
    fechas.forEach((d) => ev.push({ fecha: d, html: `<div class="evento"><span class="tipo" style="color:${TIPO_EVENTO.agape[1]}">agAPPe · ${esc(TIPOS_AGAPE[e.type] || "Agenda")}</span><br><b>${esc(e.title)}</b>${e.start ? ` <span class="muted small">${esc(e.start)}</span>` : ""}${e.place ? ` <span class="muted small">· ${esc(e.place)}</span>` : ""}</div>`, orden: e.start || "" }));
  });
  E.actividades.filter((x) => x.fecha >= desde && x.fecha <= hasta).forEach((x) => ev.push({ fecha: x.fecha, orden: "", html: `<div class="evento"><span class="tipo" style="color:${TIPO_EVENTO.plan[1]}">Planificación · ${ESTADOS_ACT[x.estado] || ""}</span>${x.agendaId ? ' <span class="etiqueta agape">En agAPPe</span>' : ""}<br>
    <b>${esc(x.titulo)}</b>${x.respNombre ? ` <span class="muted small">· ${esc(x.respNombre)}</span>` : ""}${x.notas ? `<div class="xs muted">${esc(x.notas)}</div>` : ""}
    ${esEquipo() || x.respUid === E.usuario.uid ? `<div><button class="boton mini" data-accion="editar-actividad" data-id="${esc(x.id)}">Editar</button>${esEquipo() && !x.agendaId ? ` <button class="boton mini" data-accion="publicar-actividad" data-id="${esc(x.id)}">Publicar en agAPPe</button>` : ""}</div>` : ""}</div>` }));
  E.reuniones.filter((r) => r.fecha >= desde && r.fecha <= hasta).forEach((r) => ev.push({ fecha: r.fecha, orden: r.hora || "", html: `<div class="evento"><span class="tipo" style="color:${TIPO_EVENTO.reunion[1]}">Reunión</span><br><a href="#/reuniones/${esc(r.id)}"><b>${esc(r.titulo)}</b></a>${r.hora ? ` <span class="muted small">${esc(r.hora)}</span>` : ""}</div>` }));
  E.tareas.filter((t) => t.plazo >= desde && t.plazo <= hasta && t.estado !== "hecha").forEach((t) => ev.push({ fecha: t.plazo, orden: "~", html: `<div class="evento"><span class="tipo" style="color:${TIPO_EVENTO.tarea[1]}">Plazo de tarea</span><br>${esc(t.titulo)} <span class="muted small">· ${esc(t.respNombre || "sin responsable")}</span></div>` }));
  const dias = [...new Set(ev.map((e) => e.fecha))].sort();
  return `<div class="encabezado"><h1>Planificación</h1>${esEquipo() ? '<button class="boton principal" data-accion="nueva-actividad">Nueva actividad</button>' : ""}</div>
  <div class="mes-nav"><a class="boton mini" href="#/calendario/${prev}" aria-label="Mes anterior">‹</a><h2>${MESES[m - 1]} ${y}</h2><a class="boton mini" href="#/calendario/${next}" aria-label="Mes siguiente">›</a>${mes !== hoy.slice(0, 7) ? '<a class="boton mini" href="#/calendario">Hoy</a>' : ""}</div>
  <div class="leyenda">${Object.values(TIPO_EVENTO).map(([t, c]) => `<span><span class="punto" style="background:${c}"></span>${t}</span>`).join("")}</div>
  <section class="tarjeta">${dias.length ? dias.map((d) => `<div class="dia ${d === hoy ? "hoy" : ""}"><div class="fecha-caja"><b>${parse(d).getDate()}</b><span>${DIAS[parse(d).getDay()]}</span></div><div class="cuerpo">${ev.filter((e) => e.fecha === d).sort((a, b) => a.orden.localeCompare(b.orden)).map((e) => e.html).join("")}</div></div>`).join("") : '<p class="vacio">No hay nada planificado este mes.</p>'}</section>
  <p class="small muted">La planificación es interna del equipo. Cuando una actividad está lista para la comunidad, «Publicar en agAPPe» la agrega a la Agenda que ven todos.</p>`;
}
function formActividad(x = {}) {
  hoja(x.id ? "Editar actividad" : "Nueva actividad", `
    <div class="campo"><label for="xt">Actividad</label><input id="xt" name="titulo" type="text" maxlength="140" required value="${esc(x.titulo || "")}" placeholder="Ej.: Retiro de Semana Santa"></div>
    <div class="fila dos">
      <div class="campo"><label for="xf">Fecha</label><input id="xf" name="fecha" type="date" required value="${esc(x.fecha || hoyIso())}"></div>
      <div class="campo"><label for="xe">Estado</label><select id="xe" name="estado">${Object.entries(ESTADOS_ACT).map(([k, v]) => `<option value="${k}" ${k === (x.estado || "idea") ? "selected" : ""}>${v}</option>`).join("")}</select></div>
    </div>
    ${esEquipo() ? `<div class="fila dos">
      <div class="campo"><label for="xr">Responsable</label><select id="xr" name="resp">${opcionesPersonas(x.respUid)}</select></div>
      <div class="campo"><label for="xa">Área</label><select id="xa" name="area">${AREAS.map((a) => `<option ${a === (x.area || "Encuentros") ? "selected" : ""}>${a}</option>`).join("")}</select></div>
    </div>` : ""}
    <div class="campo"><label for="xn">Notas de preparación</label><textarea id="xn" name="notas" maxlength="1000" placeholder="Lugar, materiales, pendientes, ideas…">${esc(x.notas || "")}</textarea></div>`,
  async (f) => {
    const datos = { titulo: f.titulo.trim(), fecha: f.fecha, estado: f.estado, notas: f.notas.trim() };
    if (esEquipo()) {
      const p = E.personas.find((y) => y.id === f.resp);
      Object.assign(datos, { respUid: p ? p.id : "", respNombre: p ? (p.name || p.email).slice(0, 80) : "", area: f.area });
      if (!x.id) Object.assign(datos, { agendaId: "", creado: ahora(), borrado: false });
    }
    await guardar("coord_actividades", x.id, datos);
    aviso("Actividad guardada");
  }, x.id && esEquipo() ? `<button type="button" class="boton peligro" data-accion="borrar-actividad" data-id="${esc(x.id)}">Borrar</button>` : "");
}
function formPublicar(x) {
  hoja("Publicar en la Agenda de agAPPe", `
    <p class="small">Se agregará a la Agenda que ve toda la comunidad en agAPPe. Después puedes completarla allá (repetición, invitación a familias, autorización…).</p>
    <div class="campo"><label for="pt">Título</label><input id="pt" name="title" type="text" maxlength="80" required value="${esc(x.titulo.slice(0, 80))}"></div>
    <div class="fila tres">
      <div class="campo"><label for="pf">Fecha</label><input id="pf" name="date" type="date" required value="${esc(x.fecha)}"></div>
      <div class="campo"><label for="ps">Inicio</label><input id="ps" name="start" type="time"></div>
      <div class="campo"><label for="pe">Término</label><input id="pe" name="end" type="time"></div>
    </div>
    <div class="fila dos">
      <div class="campo"><label for="py">Tipo</label><select id="py" name="type">${Object.entries(TIPOS_AGAPE).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
      <div class="campo"><label for="pa">Para quiénes</label><input id="pa" name="audience" type="text" maxlength="80" placeholder="Todos, Dirigentes…"></div>
    </div>
    <div class="campo"><label for="pl">Lugar</label><input id="pl" name="place" type="text" maxlength="120"></div>
    <div class="campo"><label for="pd">Descripción</label><textarea id="pd" name="desc" maxlength="1500"></textarea></div>`,
  async (f) => {
    const ref = fb.doc(fb.collection(db, "agenda"));
    await fb.setDoc(ref, { title: f.title.trim(), date: f.date, start: f.start || "", end: f.end || "", type: f.type, audience: f.audience.trim(), place: f.place.trim(), desc: f.desc.trim(),
      repeat: "", until: "", invFam: false, familias: false, count: false, countFrom: "", countBg: "", auth: null, feat: false, featFrom: "", featTo: "", featHand: "", featIllus: "",
      updatedBy: E.usuario.email, updatedAt: fb.serverTimestamp() });
    await guardar("coord_actividades", x.id, { agendaId: ref.id, estado: x.estado === "idea" ? "preparando" : x.estado });
    aviso("Publicada en la Agenda de agAPPe");
    cargarAgenda();
  });
}

// ---------------------------------------------------------------------------
// Buzón
// ---------------------------------------------------------------------------
const TEMAS = { consulta: "Consulta", inscripcion: "Quiero participar", familia: "Familia o apoderado", sugerencia: "Sugerencia", oracion: "Petición de oración", otro: "Otro" };
const EST_BUZON = { nuevo: "Nuevo", leido: "Leído", respondido: "Respondido", archivado: "Archivado" };
function vistaBuzon(filtro = "abiertos") {
  const F = { abiertos: (m) => ["nuevo", "leido"].includes(m.estado), respondidos: (m) => m.estado === "respondido", archivados: (m) => m.estado === "archivado" };
  if (!F[filtro]) filtro = "abiertos";
  const lista = E.buzon.filter(F[filtro]).sort((a, b) => (b.creado?.seconds || 0) - (a.creado?.seconds || 0));
  const enlace = `${location.origin}${location.pathname}#/escribenos`;
  return `<div class="encabezado"><h1>Buzón</h1><button class="boton" data-accion="copiar" data-t="${esc(enlace)}">Copiar enlace del buzón</button></div>
  <p class="small muted">Lo que la comunidad escribe en <a href="#/escribenos">el formulario público</a>. Responde por correo o WhatsApp desde tu teléfono y marca el mensaje como respondido.</p>
  <div class="filtros">${Object.keys(F).map((k) => `<button class="${k === filtro ? "activo" : ""}" data-accion="ir" data-h="#/buzon/${k}">${k[0].toUpperCase() + k.slice(1)} (${E.buzon.filter(F[k]).length})</button>`).join("")}</div>
  ${lista.length ? lista.map((m) => {
    const tel = m.via === "whatsapp" ? String(m.contacto || "").replace(/[^\d+]/g, "").replace(/^\+/, "") : "";
    const saludo = encodeURIComponent(`Hola ${String(m.nombre || "").split(" ")[0]}, te escribimos del equipo de la Pastoral Juvenil Ágape por tu mensaje: `);
    const responder = m.via === "whatsapp" && tel ? `https://wa.me/${tel}?text=${saludo}` : m.via === "correo" && m.contacto ? `mailto:${encodeURIComponent(m.contacto)}?subject=${encodeURIComponent("Respuesta de la Pastoral Juvenil Ágape")}&body=${saludo}` : "";
    return `<article class="tarjeta mensaje ${m.estado === "nuevo" ? "nuevo" : ""}">
      <div class="encabezado" style="margin:0"><div><b>${esc(m.nombre)}</b> <span class="etiqueta">${esc(TEMAS[m.tema] || m.tema)}</span>${m.estado === "nuevo" ? ' <span class="etiqueta alta">Nuevo</span>' : ""}</div><span class="xs muted">${cuando(m.creado)}</span></div>
      <p class="texto">${esc(m.mensaje)}</p>
      <p class="xs muted" style="margin:0">${m.via === "ninguno" ? "No pidió respuesta" : `Responder por ${m.via === "whatsapp" ? "WhatsApp" : "correo"}: ${esc(m.contacto)}`}${m.asignadoNombre ? ` · A cargo: ${esc(m.asignadoNombre)}` : ""}</p>
      ${m.nota ? `<p class="xs" style="margin:6px 0 0"><b>Nota interna:</b> ${esc(m.nota)}</p>` : ""}
      <div class="botones">
        ${responder ? `<a class="boton mini principal" href="${responder}" target="_blank" rel="noopener" data-accion="marcar-leido" data-id="${esc(m.id)}">Responder</a>` : ""}
        ${m.estado !== "respondido" ? `<button class="boton mini" data-accion="estado-buzon" data-id="${esc(m.id)}" data-e="respondido">Marcar respondido</button>` : ""}
        ${m.estado === "nuevo" ? `<button class="boton mini" data-accion="estado-buzon" data-id="${esc(m.id)}" data-e="leido">Marcar leído</button>` : ""}
        <button class="boton mini" data-accion="nota-buzon" data-id="${esc(m.id)}">Asignar o anotar</button>
        ${m.tema === "inscripcion" || m.tema === "consulta" ? `<button class="boton mini" data-accion="tarea-buzon" data-id="${esc(m.id)}">Crear tarea</button>` : ""}
        ${m.estado !== "archivado" ? `<button class="boton mini" data-accion="estado-buzon" data-id="${esc(m.id)}" data-e="archivado">Archivar</button>` : ""}
      </div></article>`;
  }).join("") : '<p class="vacio tarjeta">No hay mensajes aquí.</p>'}`;
}
function vistaEscribenos() {
  return `<div class="publico">
    <div class="intro"><h1>Escríbenos</h1><p style="margin:0">¿Tienes una consulta, quieres participar, eres apoderado o quieres dejarnos una sugerencia o una intención de oración? Escríbele al equipo de la Pastoral Juvenil Ágape.</p></div>
    <form id="form-buzon" class="tarjeta">
      <div class="campo"><label for="bn">Tu nombre</label><input id="bn" name="nombre" type="text" maxlength="80" required autocomplete="name"></div>
      <div class="campo"><label for="bt">Tema</label><select id="bt" name="tema">${Object.entries(TEMAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
      <div class="campo"><label for="bm">Mensaje</label><textarea id="bm" name="mensaje" maxlength="2000" required></textarea></div>
      <div class="campo"><label for="bv">¿Cómo te respondemos?</label><select id="bv" name="via"><option value="whatsapp">Por WhatsApp</option><option value="correo">Por correo</option><option value="ninguno">No necesito respuesta</option></select></div>
      <div class="campo" id="campo-contacto"><label for="bc">Tu WhatsApp o correo</label><input id="bc" name="contacto" type="text" maxlength="120" placeholder="+56 9 1234 5678"></div>
      <label class="check small"><input type="checkbox" name="acepto" required> Acepto que el equipo de coordinación use estos datos solo para responder mi mensaje.</label>
      <input type="text" name="sitio" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <div class="botones"><button class="boton acento" type="submit">Enviar mensaje</button></div>
      <p class="xs muted">Tu mensaje lo leen solo la coordinación y la administración de la pastoral.${CONFIG.firebase ? "" : " (Sin conexión: no se puede enviar.)"}</p>
    </form>
    <p class="small" style="text-align:center"><a href="${AGAPPE}">Volver a agAPPe</a></p>
  </div>`;
}
async function enviarBuzon(form) {
  const f = Object.fromEntries(new FormData(form));
  if (f.sitio) return; // trampa para robots
  if (!db) { aviso("Todavía conectando… intenta de nuevo en unos segundos."); return; }
  if (f.via !== "ninguno" && !String(f.contacto || "").trim()) { aviso("Escribe tu WhatsApp o correo para poder responderte."); return; }
  const btn = $('button[type="submit"]', form); btn.disabled = true;
  try {
    const ref = fb.doc(fb.collection(db, "buzon"));
    await fb.setDoc(ref, { nombre: f.nombre.trim().slice(0, 80), tema: f.tema, mensaje: f.mensaje.trim().slice(0, 2000), via: f.via,
      contacto: f.via === "ninguno" ? "" : String(f.contacto).trim().slice(0, 120), estado: "nuevo", creado: fb.serverTimestamp() });
    form.outerHTML = `<div class="tarjeta"><h2>¡Gracias! Recibimos tu mensaje</h2><p>${f.via === "ninguno" ? "Lo leeremos con cariño." : "Alguien del equipo te responderá pronto."}</p><a class="boton" href="${AGAPPE}">Volver a agAPPe</a></div>`;
  } catch (e) { console.warn(e); aviso("No se pudo enviar. Revisa tu conexión e intenta de nuevo."); btn.disabled = false; }
}

// ---------------------------------------------------------------------------
// Documentos, formación y más
// ---------------------------------------------------------------------------
const CATS = ["Planificación", "Actas y reuniones", "Tesorería", "Formularios", "Plantillas", "Protocolos", "Otros"];
function vistaDocumentos() {
  const por = CATS.map((c) => [c, E.docs.filter((d) => (d.categoria || "Otros") === c).sort((a, b) => a.titulo.localeCompare(b.titulo))]).filter(([, xs]) => xs.length);
  return `<p class="small"><a href="#/mas">← Más</a></p>
  <div class="encabezado"><h1>Documentos clave</h1>${esEquipo() ? '<button class="boton principal" data-accion="nuevo-doc">Agregar enlace</button>' : ""}</div>
  <p class="small muted">Enlaces a las carpetas, planillas y documentos importantes (Drive, OneDrive, formularios). Los archivos siguen en su lugar: aquí solo se ordenan los accesos.</p>
  ${por.length ? por.map(([c, xs]) => `<section class="tarjeta"><h2>${c}</h2><ul class="lista">${xs.map((d) => `<li><div class="cuerpo"><a class="titulo" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.titulo)}</a>${d.desc ? `<div class="meta">${esc(d.desc)}</div>` : ""}</div>
    ${esEquipo() ? `<button class="boton mini" data-accion="editar-doc" data-id="${esc(d.id)}">Editar</button>` : ""}</li>`).join("")}</ul></section>`).join("") : '<p class="vacio tarjeta">Todavía no hay documentos. Empiecen por la carpeta principal de la pastoral y la planilla de tesorería.</p>'}`;
}
function formDoc(d = {}) {
  hoja(d.id ? "Editar enlace" : "Agregar enlace", `
    <div class="campo"><label for="dt">Nombre</label><input id="dt" name="titulo" type="text" maxlength="120" required value="${esc(d.titulo || "")}" placeholder="Ej.: Tesorería 2026"></div>
    <div class="campo"><label for="du">Enlace</label><input id="du" name="url" type="url" maxlength="500" required value="${esc(d.url || "")}" placeholder="https://"></div>
    <div class="fila dos">
      <div class="campo"><label for="dc">Categoría</label><select id="dc" name="categoria">${CATS.map((c) => `<option ${c === (d.categoria || "Planificación") ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="campo"><label for="dd">Descripción</label><input id="dd" name="desc" type="text" maxlength="200" value="${esc(d.desc || "")}" placeholder="Opcional"></div>
    </div>
    <p class="ayuda">Si el documento tiene datos personales, compártelo solo con las personas que corresponde (no con «cualquiera con el enlace»).</p>`,
  async (f) => {
    if (!/^https:\/\//.test(f.url.trim())) { aviso("El enlace debe empezar con https://"); throw new Error("url"); }
    await guardar("coord_docs", d.id, { titulo: f.titulo.trim(), url: f.url.trim(), categoria: f.categoria, desc: f.desc.trim(), ...(d.id ? {} : { borrado: false }) });
    aviso("Enlace guardado");
  }, d.id ? `<button type="button" class="boton peligro" data-accion="borrar-doc" data-id="${esc(d.id)}">Quitar</button>` : "");
}

let formacion = null;
const RECOMENDADOS = ["llamados", "dirigente-juvenil", "herramientas-digitales", "buen-trato-y-prevencion", "diplomado"];
function vistaFormacion() {
  const f = formacion;
  const tarjetas = (xs) => xs.map((c) => `<a class="enlace" href="${MI_RUTA}#/curso/${esc(c.id)}"><b>${esc(c.titulo)}</b><span>${esc(c.subtitulo || c.duracion || "")}</span></a>`).join("");
  return `<p class="small"><a href="#/mas">← Más</a></p>
  <div class="encabezado"><h1>Formación del equipo</h1><a class="boton" href="${MI_RUTA}">Abrir Mi Ruta</a></div>
  <p class="small muted">Las formaciones de Mi Ruta, el aula virtual de agAPPe. La inscripción y el avance se gestionan en Mi Ruta${esEquipo() ? `, en su <a href="${MI_RUTA}#/gestion">Gestión</a>` : ""}.</p>
  ${!f ? '<p class="cargando">Cargando formaciones…</p>' : f.error ? '<p class="vacio tarjeta">No se pudieron cargar las formaciones de Mi Ruta.</p>' : `
    <section class="tarjeta"><h2>Recomendadas para dirigentes y coordinación</h2><div class="enlaces">${tarjetas(f.recomendadas)}</div></section>
    <section class="tarjeta"><h2>Todas las formaciones</h2><div class="enlaces">${tarjetas(f.otras)}</div></section>`}`;
}
async function cargarFormacion() {
  if (formacion) return;
  try {
    const sitio = await (await fetch(`${MI_RUTA}datos/sitio.json`, { cache: "no-cache" })).json();
    const ids = [...new Set([...(sitio.propedeutico ? [sitio.propedeutico] : []), ...(sitio.cursos || [])])];
    const cursos = (await Promise.all(ids.map((id) => fetch(`${MI_RUTA}datos/curso-${id}.json`).then((r) => r.ok ? r.json() : null).catch(() => null)))).filter(Boolean);
    const de = (id) => cursos.find((c) => c.id === id);
    formacion = { recomendadas: RECOMENDADOS.map(de).filter(Boolean), otras: cursos.filter((c) => !RECOMENDADOS.includes(c.id)) };
  } catch (e) { console.warn(e); formacion = { error: true }; }
  if (ruta()[0] === "formacion") { ultimoHtml = ""; pintar(); }
}

function vistaMas() {
  const nuevos = E.buzon.filter((m) => m.estado === "nuevo").length;
  return `<h1>Más</h1><div class="enlaces">
    ${esEquipo() ? `<a class="enlace" href="#/buzon"><b>Buzón ${nuevos ? `<span class="insignia">${nuevos}</span>` : ""}</b><span>Mensajes de la comunidad.</span></a>` : ""}
    <a class="enlace" href="#/documentos"><b>Documentos clave</b><span>Carpetas, planillas y formularios del equipo.</span></a>
    <a class="enlace" href="#/formacion"><b>Formación del equipo</b><span>Rutas de Mi Ruta para dirigentes y coordinación.</span></a>
    <a class="enlace" href="#/escribenos"><b>Formulario público del buzón</b><span>Lo que ve la comunidad al escribirnos.</span></a>
  </div><div style="margin-top:14px">${enlacesEcosistema()}</div>`;
}

// ---------------------------------------------------------------------------
// Ventana de formularios
// ---------------------------------------------------------------------------
function hoja(titulo, cuerpo, alGuardar, extra = "") {
  $("dialog.hoja")?.remove();
  const d = document.createElement("dialog");
  d.className = "hoja";
  d.innerHTML = `<div class="hoja-cab"><h2>${esc(titulo)}</h2><button class="cerrar" type="button" aria-label="Cerrar" data-accion="cerrar-hoja">×</button></div>
    <form method="dialog">${cuerpo}<div class="botones"><button class="boton principal" type="submit">Guardar</button><button class="boton" type="button" data-accion="cerrar-hoja">Cancelar</button>${extra ? `<span style="margin-left:auto">${extra}</span>` : ""}</div></form>`;
  document.body.appendChild(d);
  const form = $("form", d);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $('button[type="submit"]', form); btn.disabled = true;
    try { await alGuardar(Object.fromEntries(new FormData(form)), form); d.close(); d.remove(); ultimoHtml = ""; pintar(); }
    catch (err) { if (err && err.message !== "url") { console.warn(err); aviso("No se pudo guardar. Revisa tu conexión o tus permisos."); } btn.disabled = false; }
  });
  d.addEventListener("close", () => d.remove());
  d.showModal();
  $("input, textarea, select", form)?.focus();
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-accion]"); if (!el) return;
  const a = el.dataset.accion, id = el.dataset.id;
  const tarea = () => E.tareas.find((t) => t.id === id);
  const sinEspera = ["marcar-leido"].includes(a);
  if (!sinEspera && el.tagName !== "A") e.preventDefault();
  try {
    switch (a) {
      case "entrar": {
        const p = new fb.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
        try { await fb.signInWithPopup(auth, p); } catch (err) { if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(err.code)) await fb.signInWithRedirect(auth, p); else if (err.code !== "auth/popup-closed-by-user") aviso("No se pudo entrar."); }
        break;
      }
      case "salir": await fb.signOut(auth); location.hash = "#/"; break;
      case "ir": location.hash = el.dataset.h; break;
      case "cerrar-hoja": el.closest("dialog")?.close(); break;
      case "nueva-tarea": formTarea(); break;
      case "editar-tarea": e.preventDefault(); if (tarea()) (esEquipo() ? formTarea(tarea()) : (location.hash = "#/tareas")); break;
      case "borrar-tarea": if (confirm("¿Borrar esta tarea?")) { await borrar("coord_tareas", id); el.closest("dialog")?.close(); aviso("Tarea borrada"); } break;
      case "mover-tarea": await guardar("coord_tareas", id, { estado: el.dataset.a }); aviso(el.dataset.a === "hecha" ? "¡Tarea hecha!" : "Tarea actualizada"); break;
      case "avance-tarea": {
        const t = tarea();
        hoja("Avance de la tarea", `<p><b>${esc(t.titulo)}</b></p><div class="campo"><label for="na">¿Cómo va?</label><textarea id="na" name="nota" maxlength="500">${esc(t.nota || "")}</textarea></div>`,
          async (f) => { await guardar("coord_tareas", id, { nota: f.nota.trim() }); aviso("Avance guardado"); });
        break;
      }
      case "nueva-reunion": formReunion(); break;
      case "editar-reunion": formReunion(E.reuniones.find((r) => r.id === id)); break;
      case "borrar-reunion": if (confirm("¿Borrar esta reunión y su acta? Las tareas creadas se mantienen.")) { await borrar("coord_reuniones", id); el.closest("dialog")?.close(); location.hash = "#/reuniones"; } break;
      case "compartir-reunion": { const r = E.reuniones.find((x) => x.id === id); window.open(`https://wa.me/?text=${encodeURIComponent(textoConvocatoria(r))}`, "_blank", "noopener"); break; }
      case "agregar-punto": $("#tabla").insertAdjacentHTML("beforeend", '<div class="fila" style="grid-template-columns:1fr 80px;margin-bottom:6px"><input type="text" name="tb_t" maxlength="160" placeholder="Tema"><input type="number" name="tb_m" min="0" max="240" placeholder="min"></div>'); $("#tabla > div:last-child input").focus(); break;
      case "agregar-acuerdo": $("#acuerdos").insertAdjacentHTML("beforeend", filaAcuerdo({}, $$("#acuerdos .acuerdo").length)); $("#acuerdos .acuerdo:last-child input").focus(); break;
      case "quitar-acuerdo": el.closest(".acuerdo").remove(); break;
      case "nueva-actividad": formActividad(); break;
      case "editar-actividad": formActividad(E.actividades.find((x) => x.id === id)); break;
      case "borrar-actividad": if (confirm("¿Borrar esta actividad de la planificación?")) { await borrar("coord_actividades", id); el.closest("dialog")?.close(); } break;
      case "publicar-actividad": formPublicar(E.actividades.find((x) => x.id === id)); break;
      case "marcar-leido": { const m = E.buzon.find((x) => x.id === id); if (m && m.estado === "nuevo") guardar("buzon", id, { estado: "leido" }).catch(() => {}); break; }
      case "estado-buzon": await guardar("buzon", id, { estado: el.dataset.e }); aviso(`Mensaje: ${EST_BUZON[el.dataset.e].toLowerCase()}`); break;
      case "nota-buzon": {
        const m = E.buzon.find((x) => x.id === id);
        hoja("Asignar o anotar", `<div class="campo"><label for="ma">A cargo de</label><select id="ma" name="resp">${opcionesPersonas(m.asignadoUid)}</select></div>
          <div class="campo"><label for="mn">Nota interna</label><textarea id="mn" name="nota" maxlength="500">${esc(m.nota || "")}</textarea></div>`,
          async (f) => { const p = E.personas.find((x) => x.id === f.resp); await guardar("buzon", id, { asignadoUid: p ? p.id : "", asignadoNombre: p ? (p.name || p.email).slice(0, 80) : "", nota: f.nota.trim(), estado: m.estado === "nuevo" ? "leido" : m.estado }); aviso("Guardado"); });
        break;
      }
      case "tarea-buzon": { const m = E.buzon.find((x) => x.id === id); formTarea({ titulo: `Responder a ${m.nombre}`.slice(0, 140), detalle: `${TEMAS[m.tema] || ""}: ${m.mensaje}`.slice(0, 1000), area: "Coordinación" }); break; }
      case "nuevo-doc": formDoc(); break;
      case "editar-doc": formDoc(E.docs.find((d) => d.id === id)); break;
      case "borrar-doc": if (confirm("¿Quitar este enlace?")) { await borrar("coord_docs", id); el.closest("dialog")?.close(); } break;
      case "copiar": await navigator.clipboard.writeText(el.dataset.t); aviso("Enlace copiado"); break;
    }
  } catch (err) { console.warn(err); aviso("No se pudo completar. Revisa tu conexión o tus permisos."); }
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "form-acta") { e.preventDefault(); guardarActa(e.target).catch((err) => { console.warn(err); aviso("No se pudo guardar el acta."); }); }
  if (e.target.id === "form-buzon") { e.preventDefault(); enviarBuzon(e.target); }
});
document.addEventListener("change", (e) => {
  if (e.target.name === "via" && e.target.closest("#form-buzon")) {
    const c = $("#campo-contacto"); c.hidden = e.target.value === "ninguno";
    $("#bc").placeholder = e.target.value === "correo" ? "tucorreo@ejemplo.cl" : "+56 9 1234 5678";
  }
});

iniciar();
