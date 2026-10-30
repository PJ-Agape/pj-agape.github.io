// Panel de Gestión: edición de itinerarios, evaluaciones, materiales, oraciones
// y guía de comunidad. Todo se edita en un borrador y se publica al final.

import * as hoy from "./gestion-hoy.js";
import * as evAdmin from "./evangelio-admin.js";
import * as gEq from "./gestion-equipo.js";
import * as agenda from "./agenda.js";
import * as acompanar from "./acompanar.js";
import * as grupo from "./grupo.js";
import * as novedades from "./novedades.js";
import * as saludos from "./saludos.js";
import * as conocer from "./conocer.js";
import * as papa from "./papa.js";
import * as S from "./store.js";
import * as portada from "./portada.js";
import * as inicioAdmin from "./inicio-admin.js";
import * as familiasAdmin from "./familias-admin.js";
import * as cursosCom from "./cursos-comunidad.js";
import * as apAdmin from "./apariencia-admin.js";
import { esc, icon, toast, sha256, download, clone, slug, getPath, setPath, plain } from "./util.js";

const $ = (s, r = document) => r.querySelector(s);
let api;          // { actions, render, onAfterRender }
let undo = null;  // copia del borrador antes de la última eliminación

let cloudOn = false, apReady = false;
const THEMES = [["amanecer", "Amanecer · luz y calidez"], ["cenaculo", "Cenáculo · oración"], ["esperanza", "Esperanza · vida"]];

// ---------------------------------------------------------------------------
// «Quiero conocer Ágape»: la lista de interesados; el QR se pinta después de dibujar.
async function conocerView() { const h = await conocer.adminView(); conocer.afterAdmin(); return h; }

// Pantallas que viven en la app y se muestran también dentro de Gestión (mismo contenido, con el menú al lado)
const EMBED = {
  agenda: () => agenda.viewAgenda(),
  acompanar: () => acompanar.viewMain(),
};
export async function renderAdmin(sub, _api) {
  api = _api;
  bindActions();
  if (!apReady) { apAdmin.setup({ actions: api.actions, cloud: api.cloud, render: () => api.render() }); apReady = true; }
  cloudOn = !!(api.cloud && api.cloud.enabled);
  if (cloudOn) {
    const st = api.cloud.state();
    if (!st.ready) return cloudGate(st);
    // Gestión se ajusta al rol: coordinación ve casi todo; los dirigentes, su tablero «Hoy» y sus jóvenes.
    if (!st.isAdmin) {
      const pg0 = sub.split("/").filter(Boolean)[0] || "";
      if (st.canCourses && (pg0 === "formacion" || !st.isGuide)) return shell("formacion", await cursosCom.view(pg0 === "formacion" ? sub : "formacion"));
      if (!st.isGuide) return `<div class="card" style="max-width:480px;margin:6vh auto 0;text-align:center;padding:32px">
        <div class="tile-ico" style="margin:0 auto 12px">${icon("lock")}</div>
        <h1 class="display" style="font-size:1.6rem">Gestión es para el equipo</h1>
        <p class="muted" style="margin-top:8px">Si necesitas acceso, pídelo al equipo coordinador.</p>
        <a class="btn btn-primary" style="margin-top:16px" href="#/">Volver al inicio</a></div>`;
      const pg = sub.split("/").filter(Boolean)[0] || "hoy";
      const COORD = { apariencia: () => apAdmin.adminView(), hoy: () => hoy.html(), portada: () => portada.adminView(), inicio: () => inicioAdmin.adminView(), familias: () => familiasAdmin.adminView(), saludos: () => saludos.adminView(), enviar: () => saludos.enviarView(sub.split("/").filter(Boolean)[1]), conocer: () => conocerView(), asignar: () => asignarView(),
        moderacion: () => gEq.moderacionHTML(), ...EMBED };
      const GUIA = { hoy: COORD.hoy, acompanar: EMBED.acompanar };
      const ok = st.isStaff ? COORD[pg] : GUIA[pg];
      return shell(ok ? pg : "hoy", await (ok || COORD.hoy)());
    }
  } else if (!S.isAdmin()) return loginView();
  // Mirar Gestión no crea un borrador: se crea recién al editar algo (así no queda una copia vieja guardada).
  const draft = S.getDraft() || S.publishedContent();
  const parts = sub.split("/").filter(Boolean);
  const page = parts[0] || (cloudOn ? "hoy" : "resumen");
  let body = "";
  switch (page) {
    case "hoy": body = cloudOn ? hoy.html() : await summaryView(draft); break;
    case "resumen": body = await summaryView(draft); break;
    case "dirigentes": body = cloudOn ? await (parts[1] ? personView(parts[1]) : peopleView()) : summaryView(draft); break;
    case "asignar": body = cloudOn ? await asignarView() : summaryView(draft); break;
    case "itinerarios": body = parts[1] != null ? courseView(draft, +parts[1]) : coursesView(draft); break;
    case "formacion": body = cloudOn ? await cursosCom.view(sub) : summaryView(draft); break;
    case "portada": body = portada.adminView(); break;
    case "apariencia": body = cloudOn ? await apAdmin.adminView() : summaryView(draft); break;
    case "inicio": body = cloudOn ? inicioAdmin.adminView() : summaryView(draft); break;
    case "saludos": body = await saludos.adminView(); break;
    case "enviar": body = await saludos.enviarView(parts[1]); break;
    case "conocer": body = cloudOn ? await conocerView() : summaryView(draft); break;
    case "familias": body = cloudOn ? familiasAdmin.adminView() : summaryView(draft); break;
    case "moderacion": body = cloudOn ? gEq.moderacionHTML() : summaryView(draft); break;
    case "consentimientos": body = cloudOn ? gEq.consentHTML() : summaryView(draft); break;
    case "agenda": case "acompanar": body = await EMBED[page](); break;
    case "evangelio": body = cloudOn ? await evAdmin.adminView() : summaryView(draft); break;
    case "materiales": body = cardsView(draft, "materials"); break;
    case "oracion": body = cardsView(draft, "devotional"); break;
    case "comunidad": location.replace("#/admin"); return ""; // ya no se usa: la guía de servicio es una presentación
    case "publicar": body = publishView(draft); break;
    case "ajustes": body = settingsView(); break;
    default: body = summaryView(draft);
  }
  return shell(page, body);
}

// Menú de Gestión, uno solo para todos los roles: cada uno ve lo que le toca.
// Lo que todavía vive en su propia pantalla (Agenda, Acompañar, Muro…) se abre con ↗.
function navGroups() {
  const st = cloudOn ? api.cloud.state() : { isAdmin: true, isStaff: true, isGuide: true };
  const A = st.isAdmin, C = st.isStaff;
  const g = [
    ["", [["hoy", "#/admin", "Hoy", "sparkle", cloudOn]]],
    ["Personas", [
      ["dirigentes", "#/admin/dirigentes", "Cuentas e invitaciones", "users", cloudOn && A],
      ["conocer", "#/admin/conocer", "Quiero conocer Ágape", "send", cloudOn && C],
      ["asignar", "#/admin/asignar", "Asignar jóvenes", "check", cloudOn && C],
      ["consentimientos", "#/admin/consentimientos", "Consentimientos", "lock", cloudOn && A],
    ]],
    ["Seguimiento", [
      ["acompanar", "#/admin/acompanar", "Jóvenes y fichas", "check", cloudOn],
      ["resumen", "#/admin/resumen", "Ajustes, estadísticas e intención del Papa", "grid", A],
    ]],
    ["Comunicación", [
      ["apariencia", "#/admin/apariencia", "Apariencia: fondos, stickers, textos y colores", "eye", cloudOn && C],
      ["portada", "#/admin/portada", "Portada de Inicio", "sparkle", cloudOn && C],
      ["inicio", "#/admin/inicio", "Inicio y enlaces", "home", cloudOn && C],
      ["agenda", "#/admin/agenda", "Agenda", "grid", C],
      ["saludos", "#/admin/saludos", "Saludos WhatsApp", "send", C],
      ["", "#/avisos", "Avisos del equipo", "check", cloudOn && C, true],
      ["moderacion", "#/admin/moderacion", "Moderación de muro y chat", "chat", cloudOn && C],
      ["familias", "#/admin/familias", "Página para familias", "users", cloudOn && C],
    ]],
    ["Contenidos", [
      ["itinerarios", "#/admin/itinerarios", "Cursos", "route", A],
      ["formacion", "#/admin/formacion", "Cursos de la comunidad", "route", cloudOn && !!st.canCourses],
      ["materiales", "#/admin/materiales", "Materiales", "book", A],
      ["oracion", "#/admin/oracion", "Oración", "flame", A],
      ["evangelio", "#/admin/evangelio", "Evangelio y fiestas", "book", cloudOn && A],
      ["", "#/cancionero", "Cancionero", "flame", C, true],
      ["", "#/dinamicas", "Dinámicas", "sparkle", true, true],
    ]],
  ];
  return g.map(([t, xs]) => [t, xs.filter((x) => x[4])]).filter(([, xs]) => xs.length);
}
function shell(page, body) {
  const dirty = S.draftIsDirty();
  const st = cloudOn ? api.cloud.state() : { isAdmin: true };
  return `
  <div class="admin-shell">
    ${navHTML(page, dirty, st)}
    <div class="stack" style="--gap:18px;min-width:0">
      ${st.isAdmin ? draftBar(dirty) : ""}
      ${body}
    </div>
  </div>`;
}
function navHTML(page, dirty, st) {
  const link = ([k, href, label, ic, , ext]) => `<a href="${href}" ${k && page === k ? 'aria-current="page"' : ""}>${icon(ic)} ${label}${ext ? ' <span class="nav-ext" aria-label="abre su pantalla">↗</span>' : ""}</a>`;
  const groups = navGroups(), cur = groups.flatMap(([, xs]) => xs).find((x) => x[0] && x[0] === page);
  const mobile = typeof matchMedia === "function" && matchMedia("(max-width: 860px)").matches;
  return `<nav class="admin-side" aria-label="Gestión"><details class="adm-menu" ${mobile ? "" : "open"}>
      <summary>${icon("grid")} Menú de Gestión${cur ? ` · <span class="muted">${esc(cur[2])}</span>` : page === "publicar" ? ' · <span class="muted">Publicar</span>' : ""}</summary><div class="adm-links">
      ${groups.map(([t, xs]) => `${t ? `<span class="side-grp">${t}</span>` : ""}${xs.map(link).join("")}`).join("")}
      ${st.isAdmin ? `<span class="side-grp">Publicar</span><a href="#/admin/publicar" ${page === "publicar" ? 'aria-current="page"' : ""}>${icon("send")} Publicar cambios${dirty ? '<span class="count">!</span>' : ""}</a>` : ""}
      ${cloudOn ? "" : `<a href="#/admin/ajustes" ${page === "ajustes" ? 'aria-current="page"' : ""}>${icon("gear")} Ajustes</a>`}
      <div class="side-extra">
        ${cloudOn && st.isStaff ? `<a href="#" data-action="vaOpen">${icon("eye")} Ver la app como…</a>` : ""}
        ${st.isAdmin ? `<a href="#" data-action="aPreview">${icon("eye")} Vista previa del borrador</a>` : ""}
        <a href="#" data-action="aLogout">${icon("out")} Salir de Gestión</a>
      </div></div></details>
    </nav>`;
}

function draftBar(dirty) {
  if (!dirty && !undo) return "";
  return `<div class="draft-bar">
    ${dirty ? (S.draftIsOutdated() ? `${icon("edit")} Tienes un borrador anterior a la versión publicada ahora. Revísalo en Publicar antes de usarlo.` : `${icon("edit")} Tienes cambios sin publicar. Los dirigentes aún ven la versión anterior.`) : "Cambio aplicado."}
    <span class="spacer"></span>
    ${undo ? `<button class="btn btn-sm btn-ghost" data-action="aUndo">${icon("undo")} Deshacer</button>` : ""}
    ${dirty ? `<button class="btn btn-sm btn-ghost" data-action="aPreview">${icon("eye")} Vista previa</button>
    ${cloudOn && !S.draftIsOutdated() ? `<button class="btn btn-sm btn-primary" data-action="aPublishCloud">${icon("send")} Publicar ahora</button>` : `<a class="btn btn-sm btn-primary" href="#/admin/publicar">Publicar</a>`}` : ""}
  </div>`;
}

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------
function loginView() {
  api.onAfterRender(() => $("#adminPass")?.focus());
  return `<div style="max-width:420px;margin:6vh auto 0">
    <form class="card stack" id="loginForm" style="--gap:14px;padding:28px">
      <div class="tile-ico" style="margin:0 auto">${icon("lock")}</div>
      <div style="text-align:center"><h1 class="display" style="font-size:1.7rem">Gestión de la pastoral</h1>
        <p class="muted small" style="margin-top:6px">Espacio del equipo coordinador para editar cursos, evaluaciones, materiales y oraciones.</p></div>
      <div class="field"><label for="adminPass">Contraseña</label>
        <input class="input big" type="password" id="adminPass" autocomplete="current-password" required></div>
      <button class="btn btn-primary btn-block" type="submit">Entrar</button>
      <a class="xs muted" style="text-align:center" href="#/">Volver al inicio</a>
    </form></div>`;
}
async function doLogin(pass) {
  const h = await sha256(pass);
  let ok = h === S.adminHash();
  const old = S.oldAdminPin();
  if (!ok && old && pass === old) { ok = true; S.setAdminHash(h); }
  if (old) S.clearOldAdminPin();
  if (!ok) { toast("Contraseña incorrecta", ""); return; }
  S.setAdmin(true);
  api.render();
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
async function summaryView(d) {
  const phases = d.courses.reduce((a, c) => a + c.phases.length, 0);
  const sessions = d.courses.reduce((a, c) => a + c.phases.reduce((b, p) => b + p.sessions.length, 0), 0);
  const questions = d.courses.reduce((a, c) => a + c.phases.reduce((b, p) => b + (p.quiz?.questions?.length || 0), 0), 0);
  const legacy = legacyDiff(d);
  const stat = (n, l) => `<div class="card stat"><b>${n}</b><span class="muted small">${l}</span></div>`;
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Resumen</h1>
    <p>Todo lo que edites queda en un borrador en este dispositivo. Cuando esté listo, lo publicas y todos los dirigentes lo verán.</p></header>
  ${cloudOn ? await followSummary() : ""}
  ${cloudOn ? await visitsCard() : ""}
  ${cloudOn ? await grupo.adminHTML() : ""}
  ${cloudOn ? await novedades.adminHTML() : ""}
  ${cloudOn ? await papa.adminHTML() : ""}
  ${legacy ? `<div class="card" style="border-color:var(--gold)">
    <h3>Encontramos contenido editado con la versión anterior</h3>
    <p class="muted small" style="margin-top:6px">Este navegador guarda cambios hechos con el panel antiguo (${legacy.join(", ")}). ¿Quieres traerlos al borrador para publicarlos?</p>
    <div class="row-wrap" style="margin-top:12px"><button class="btn btn-sm btn-primary" data-action="aImportLegacy">Traer al borrador</button>
    <button class="btn btn-sm btn-ghost" data-action="aDropLegacy">Ignorar</button></div></div>` : ""}
  <div class="grid grid-4">
    ${stat(d.courses.length, "cursos")}${stat(phases, "módulos")}${stat(sessions, "unidades")}${stat(questions, "preguntas de evaluación")}
  </div>
  <div class="card">
    <h3>Cómo publicar cambios</h3>
    <ol class="steps muted">
      <li><b>Edita</b> en Cursos, Materiales, Oración o Comunidad. Se guarda solo.</li>
      <li><b>Revisa</b> con «Vista previa»: ves la página tal como la verán los dirigentes.</li>
      <li><b>Publica</b>: ${cloudOn ? "con un botón, desde «Publicar»" : `descargas <span class="kbd">contenido.json</span> y lo subes a la carpeta <span class="kbd">data</span> del repositorio`}.</li>
    </ol>
  </div>
  ${cloudOn ? "" : `<div class="card" style="background:var(--surface-2)">
    <span class="chip">Opcional</span>
    <h3 style="margin-top:10px">Cuentas y seguimiento</h3>
    <p class="muted small" style="margin-top:6px">Para invitar dirigentes con su cuenta de Google y ver el avance de todos, conecta Firebase siguiendo la guía <span class="kbd">CONFIGURAR-FIREBASE.md</span> del repositorio.</p>
  </div>`}`;
}
function legacyDiff(d) {
  const l = S.legacyContent();
  if (!l) return null;
  const pub = S.publishedContent();
  const out = [];
  if (l.catalog && JSON.stringify(l.catalog) !== JSON.stringify(pub.courses)) out.push("cursos");
  if (l.materials && JSON.stringify(l.materials) !== JSON.stringify(pub.materials)) out.push("materiales");
  if (l.devotional && JSON.stringify(l.devotional) !== JSON.stringify(pub.devotional)) out.push("oraciones");
  if (!out.length) { S.clearLegacy(); return null; }
  return out;
}

// ---------------------------------------------------------------------------
// Itinerarios
// ---------------------------------------------------------------------------
function coursesView(d) {
  return `
  <header class="page-head row-wrap" style="align-items:flex-end">
    <div><span class="eyebrow">Gestión</span><h1>Cursos</h1><p>Cada curso tiene módulos, unidades de estudio y una evaluación por módulo. Los cursos <b>ocultos</b> solo los ven los administradores: puedes prepararlos con calma y publicarlos cuando se necesiten. En «Editar» → «Dirigido a» eliges para quiénes es cada formación (asesores, coordinadores, dirigentes o aspirantes).</p></div>
    <span class="spacer"></span>
    <div class="row-wrap" style="gap:8px"><a class="btn btn-soft" href="#/admin/formacion">${icon("ul")} Cursos de la comunidad (Word o PDF)</a>
    <button class="btn btn-primary" data-action="aNewCourse">${icon("plus")} Nuevo curso</button></div>
  </header>
  <div class="note" style="margin-bottom:14px"><b>Novedades en los cursos.</b> Hay contenido nuevo en el sitio: <b>«Bienvenido a agAPPe»</b>, la guía de la app para todos (también para visitantes sin cuenta y para los jóvenes); los cursos <b>«Asesorar es acompañar»</b> (para asesores) y <b>«Coordinar es servir»</b> (para coordinadores), de 5 módulos cada uno, y en el curso de dirigentes las oraciones finales de acción de gracias, las unidades 1.5 y 1.6, el Módulo 6 sobre la Eucaristía y ajustes en las unidades 1.4, 5.1 y 5.5. Tráelo a tu borrador (lo demás que hayas editado queda igual), revísalo y publica.
    <div style="margin-top:8px"><button class="btn btn-sm btn-soft" data-action="aSyncCourse">${icon("ul")} Traer las novedades</button></div></div>
  <div class="stack" style="--gap:12px">
    ${d.courses.map((c, i) => {
      const n = c.phases.reduce((a, p) => a + p.sessions.length, 0);
      return `<div class="card row" style="padding:16px 18px">
        <span class="tile-ico" style="margin:0;background:var(--accent-soft);color:var(--accent-text)">${icon("route")}</span>
        <a href="#/admin/itinerarios/${i}" style="flex:1;min-width:0;text-decoration:none;color:inherit">
          <strong style="display:block">${esc(c.title)} ${c.hidden ? `<span class="chip warn" style="vertical-align:middle">Oculto</span>` : `<span class="chip ok" style="vertical-align:middle">Público</span>`}</strong>
          <span class="muted small">${c.phases.length} módulos · ${n} unidades · ${c.abierto ? "abierto a todos, también sin cuenta" : S.paraDe(c).length ? `para ${esc(S.paraDe(c).map((k) => S.PARA.find((x) => x[0] === k)[1].replace(/ \(.*\)/, "").toLowerCase()).join(", "))}` : "para todos"}</span></a>
        <div class="row" style="gap:4px">
          ${iconBtn("up", "aMoveCourse", `data-i="${i}" data-d="-1"`, "Subir", i === 0)}
          ${iconBtn("down", "aMoveCourse", `data-i="${i}" data-d="1"`, "Bajar", i === d.courses.length - 1)}
          <button class="btn btn-sm ${c.hidden ? "btn-primary" : "btn-ghost"}" data-action="aHideCourse" data-i="${i}" title="${c.hidden ? "Hacerlo visible para todos" : "Ocultarlo (solo lo verán los administradores)"}">${icon(c.hidden ? "eye" : "lock")} ${c.hidden ? "Publicar curso" : "Ocultar"}</button>
          ${iconBtn("copy", "aDupCourse", `data-i="${i}"`, "Duplicar")}
          ${d.courses.length > 1 ? iconBtn("trash", "aDelCourse", `data-i="${i}"`, "Eliminar", false, "danger") : ""}
          <a class="btn btn-sm btn-soft" href="#/admin/itinerarios/${i}">Editar</a>
        </div></div>`;
    }).join("")}
  </div>
  ${reqCardHTML(d)}`;
}
// ---------- Formación requerida por rol ----------
// Qué cursos debe tener aprobados cada rol. Los de «Dirigente» se exigen para acompañar jóvenes
// (Gestión → Asignar jóvenes), también a coordinadores y administradores que acompañan.
const REQ_ROLES = [["dirigente", "Dirigente", "Para acompañar jóvenes: solo aparecen en «Asignar jóvenes» quienes los tienen aprobados."],
  ["coordinador", "Coordinador", ""], ["asesor", "Asesor", ""], ["admin", "Administrador", ""]];
const reqContent = () => S.getDraft() || S.publishedContent() || { courses: [] };
const reqs = () => reqContent().requisitos || {};
const reqCourses = (role) => (reqs()[role] || []).map((id) => (reqContent().courses || []).find((c) => c.id === id)).filter(Boolean);
const meetsReq = (u, role) => reqCourses(role).every((c) => rowFor(u, c).complete);
function reqCardHTML(d) {
  const courses = d.courses.filter((c) => !c.abierto);
  const R = d.requisitos || {};
  return `<div class="card req-card" style="margin-top:18px"><h3>Formación requerida por rol</h3>
    <p class="muted small" style="margin-top:4px">Marca qué cursos debe tener aprobados cada rol. Los de <b>Dirigente</b> se piden para acompañar jóvenes: en «Asignar jóvenes» solo aparecen quienes los tienen, también coordinadores y administradores. En cada ficha se ve qué le falta a cada persona. Recuerda publicar los cambios.</p>
    <div class="stack" style="--gap:12px;margin-top:12px">${REQ_ROLES.map(([k, l, help]) => `<div class="req-row"><b>${esc(l)}</b>${help ? `<span class="xs muted">${esc(help)}</span>` : ""}
      <div class="row-wrap" style="gap:6px;margin-top:6px">${courses.map((c) => `<label class="chip ${(R[k] || []).includes(c.id) ? "accent" : ""}" style="cursor:pointer;padding:6px 10px">
        <input type="checkbox" data-action="aReq" data-r="${k}" data-id="${esc(c.id)}" ${(R[k] || []).includes(c.id) ? "checked" : ""}> ${esc(c.title)}</label>`).join("")}
        ${(R[k] || []).length ? "" : `<span class="xs muted">Sin requisito</span>`}</div></div>`).join("")}</div>
  </div>`;
}
function reqFichaHTML(u) {
  const roles = [u.role || "dirigente", ...(guideRoles(u) ? ["dirigente"] : []), ...(u.asesor ? ["asesor"] : [])].filter((r, i, a) => a.indexOf(r) === i && reqCourses(r).length);
  if (!roles.length) return "";
  return `<div class="card"><h3>Formación requerida</h3>
    ${roles.map((r) => `<p class="small" style="margin-top:8px"><b>${r === "dirigente" && (u.role || "dirigente") !== "dirigente" ? "Para acompañar jóvenes" : esc((REQ_ROLES.find((x) => x[0] === r) || [r, r])[1])}:</b></p>
      <div class="row-wrap" style="gap:6px;margin-top:4px">${reqCourses(r).map((c) => rowFor(u, c).complete ? `<span class="chip ok">${icon("check")} ${esc(c.title)}</span>` : `<span class="chip warn">Falta: ${esc(c.title)}</span>`).join("")}</div>`).join("")}
  </div>`;
}
function iconBtn(ic, action, attrs, label, disabled = false, cls = "") {
  return `<button class="icon-btn ${cls}" data-action="${action}" ${attrs} title="${label}" aria-label="${label}" ${disabled ? "disabled style='opacity:.3'" : ""}>${icon(ic)}</button>`;
}

function courseView(d, ci) {
  const c = d.courses[ci];
  if (!c) { location.hash = "#/admin/itinerarios"; return ""; }
  return `
  <nav class="crumbs"><a href="#/admin/itinerarios">Cursos</a>${icon("right")}<span>${esc(c.title)}</span></nav>
  <div class="card">
    <div class="row-wrap" style="align-items:flex-start">
      <div style="flex:1;min-width:220px">
        <span class="chip accent">Tema ${esc(c.theme)}</span>
        <h1 class="display" style="font-size:1.9rem;margin-top:8px">${esc(c.title)}</h1>
        <p class="muted small" style="margin-top:6px">${esc(S.courseDesc(c))}</p>
      </div>
      <button class="btn btn-sm btn-soft" data-action="aEditCourse" data-ci="${ci}">${icon("edit")} Editar datos</button>
    </div>
  </div>

  <div class="tree">
    ${c.phases.map((p, pi) => `
    <section class="tree-phase">
      <div class="tree-phase-head">
        <span class="badge">${esc(p.phaseNum)}</span>
        <div class="ttl"><strong>${esc(p.title)}</strong><span class="xs muted">${esc(p.desc)}</span></div>
        <div class="tools">
          ${iconBtn("up", "aMovePhase", `data-ci="${ci}" data-pi="${pi}" data-d="-1"`, "Subir módulo", pi === 0)}
          ${iconBtn("down", "aMovePhase", `data-ci="${ci}" data-pi="${pi}" data-d="1"`, "Bajar módulo", pi === c.phases.length - 1)}
          ${iconBtn("edit", "aEditPhase", `data-ci="${ci}" data-pi="${pi}"`, "Editar módulo")}
          ${c.phases.length > 1 ? iconBtn("trash", "aDelPhase", `data-ci="${ci}" data-pi="${pi}"`, "Eliminar módulo", false, "danger") : ""}
        </div>
      </div>
      <div class="tree-items">
        ${p.sessions.map((s, si) => `
        <div class="tree-item">
          <span class="session-num" style="width:36px;height:36px;font-size:.75rem">${esc(s.id)}</span>
          <div class="t" data-action="aEditSession" data-ci="${ci}" data-pi="${pi}" data-si="${si}">
            <strong>${esc(s.title)}</strong><span>${esc(plain(s.objective).slice(0, 90))}</span></div>
          <div class="tools">
            ${iconBtn("up", "aMoveSession", `data-ci="${ci}" data-pi="${pi}" data-si="${si}" data-d="-1"`, "Subir", si === 0)}
            ${iconBtn("down", "aMoveSession", `data-ci="${ci}" data-pi="${pi}" data-si="${si}" data-d="1"`, "Bajar", si === p.sessions.length - 1)}
            ${iconBtn("copy", "aDupSession", `data-ci="${ci}" data-pi="${pi}" data-si="${si}"`, "Duplicar")}
            ${p.sessions.length > 1 ? iconBtn("trash", "aDelSession", `data-ci="${ci}" data-pi="${pi}" data-si="${si}"`, "Eliminar", false, "danger") : ""}
          </div>
        </div>`).join("")}
      </div>
      <div class="tree-add">
        <button class="btn btn-sm btn-ghost" data-action="aAddSession" data-ci="${ci}" data-pi="${pi}">${icon("plus")} Unidad</button>
        <button class="btn btn-sm btn-soft" data-action="aEditQuiz" data-ci="${ci}" data-pi="${pi}">${icon("check")} Evaluación · ${p.quiz?.questions?.length || 0} pregunta${(p.quiz?.questions?.length || 0) === 1 ? "" : "s"}</button>
      </div>
    </section>`).join("")}
  </div>
  <button class="btn btn-ghost btn-block" data-action="aAddPhase" data-ci="${ci}">${icon("plus")} Agregar módulo</button>`;
}

// Mantiene la numeración coherente: módulo N → unidades N.1, N.2…
function renumber(course) {
  const base = course.phases[0] && Number(course.phases[0].phaseNum) === 1 ? 1 : 0;
  course.phases.forEach((p, i) => {
    p.phaseNum = i + base;
    p.sessions.forEach((s, j) => { s.id = `${p.phaseNum}.${j + 1}`; });
  });
}
const blankSession = () => ({ id: "", title: "Nueva unidad", time: "45 min", objective: "", intro: "", sections: [{ title: "", body: "" }],
  bible: { ref: "", comment: "" }, church: [], questions: [""], activity: "", prayer: "", resources: [] });
// Adapta unidades con el formato anterior (encuentros) al formato de aula virtual.
function normalizeUnit(u) {
  const o = clone(u);
  if (typeof o.bible === "string") o.bible = { ref: "", comment: o.bible };
  o.bible = o.bible || { ref: "", comment: "" };
  o.sections = o.sections || [];
  if (o.dynamic) { o.sections.push({ title: "Clave para comprender a los jóvenes", body: o.dynamic }); delete o.dynamic; }
  ["church", "resources"].forEach((k) => { o[k] = o[k] || []; });
  ["intro", "activity"].forEach((k) => { o[k] = o[k] || ""; });
  return o;
}
const blankQuestion = () => ({ q: "", options: ["", "", ""], correct: 0, feedback: "" });
const blankPhase = (n) => ({ phaseNum: n, title: "Nuevo módulo", desc: "", intro: "", sessions: [blankSession()], quiz: { badge: `Evaluación módulo ${n}`, title: "Discernimiento", questions: [blankQuestion()] } });

// ---------------------------------------------------------------------------
// Materiales y Oración
// ---------------------------------------------------------------------------
const TYPE_LABEL = { text: "Texto", list: "Lista de puntos", crisis: "Semáforo de ayuda", action: "Botón / enlace" };
function cardsView(d, key) {
  const box = d[key];
  const isMat = key === "materials";
  return `
  <header class="page-head row-wrap" style="align-items:flex-end">
    <div><span class="eyebrow">Gestión</span><h1>${isMat ? "Materiales" : "Oración"}</h1>
    <p>${isMat ? "Guías, esquemas y fichas para todas las reuniones." : "Oraciones y métodos de oración para el equipo."}</p></div>
    <span class="spacer"></span>
    <button class="btn btn-ghost" data-action="aEditBox" data-k="${key}">${icon("edit")} Título de la sección</button>
    <button class="btn btn-primary" data-action="aAddCard" data-k="${key}">${icon("plus")} ${isMat ? "Nuevo recurso" : "Nueva oración"}</button>
  </header>
  <div class="card" style="padding:6px">
    ${box.cards.map((c, i) => `
    <div class="tree-item">
      <span class="chip ${c.type === "crisis" ? "danger" : "accent"}" style="min-width:108px;justify-content:center">${TYPE_LABEL[c.type] || "Texto"}</span>
      <div class="t" data-action="aEditCard" data-k="${key}" data-i="${i}"><strong>${esc(c.title)}</strong><span>${esc(c.tag || "")}</span></div>
      <div class="tools">
        ${iconBtn("up", "aMoveCard", `data-k="${key}" data-i="${i}" data-d="-1"`, "Subir", i === 0)}
        ${iconBtn("down", "aMoveCard", `data-k="${key}" data-i="${i}" data-d="1"`, "Bajar", i === box.cards.length - 1)}
        ${box.cards.length > 1 ? iconBtn("trash", "aDelCard", `data-k="${key}" data-i="${i}"`, "Eliminar", false, "danger") : ""}
      </div>
    </div>`).join("")}
  </div>
  <p class="xs muted">Tip: en los textos puedes usar <span class="kbd">&lt;strong&gt;negrita&lt;/strong&gt;</span> para destacar palabras.</p>`;
}

// ---------------------------------------------------------------------------
// Comunidad
// ---------------------------------------------------------------------------
const aboutArr = (d, k) => (k === "roles" ? d.roles : d.about[k]);

// ---------------------------------------------------------------------------
// Publicar
// ---------------------------------------------------------------------------
function publishView(d) {
  const dirty = S.draftIsDirty();
  const pub = S.publishedContent();
  const repoUpload = "https://github.com/PJ-Agape/pj-agape.github.io/upload/main/data";
  const outdated = S.draftIsOutdated(), lost = dirty ? S.draftRemovals() : [];
  const warn = outdated || lost.length ? `<div class="card" style="border-left:4px solid var(--warn, #e8892b)">
    <h3>${outdated ? "Este borrador quedó atrás" : "Ojo: publicar quitaría contenido"}</h3>
    <p class="small" style="margin-top:6px">${outdated ? "Se empezó antes de la versión que está publicada ahora. Si lo publicas, se pierde lo que se agregó después. Si no hiciste cambios que quieras guardar, lo mejor es descartarlo." : "Tu borrador no tiene lo siguiente, que sí está publicado:"}</p>
    ${lost.length ? `<ul class="small" style="margin:8px 0 0 18px">${lost.slice(0, 12).map((x) => `<li>${esc(x)}</li>`).join("")}${lost.length > 12 ? `<li>y ${lost.length - 12} más</li>` : ""}</ul>` : ""}
    <div class="row-wrap" style="margin-top:12px"><button class="btn btn-sm btn-primary" data-action="aDiscard">${icon("undo")} Descartar borrador</button></div>
  </div>` : "";
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Publicar cambios</h1>
    <p>${cloudOn ? "Al publicar, todos los dirigentes ven los cambios la próxima vez que abran la app." : `La página lee su contenido desde <span class="kbd">data/contenido.json</span>. Publicar es reemplazar ese archivo por tu borrador.`}</p></header>
  ${warn}
  <div class="card">
    <div class="row-wrap"><span class="chip ${dirty ? "warn" : "ok"}">${dirty ? "Borrador con cambios" : "Sin cambios pendientes"}</span>
      <span class="xs muted">Versión publicada: ${esc(pub.version || 1)} · ${esc(pub.updatedAt || "")}</span></div>
    <ol class="steps" style="margin-top:16px">
      <li><button class="btn btn-sm btn-ghost" data-action="aPreview">${icon("eye")} Revisar en vista previa</button></li>
      ${cloudOn
        ? `<li><button class="btn btn-sm btn-primary" data-action="aPublishCloud" ${dirty ? "" : "disabled"}>${icon("send")} Publicar para todos</button></li>`
        : `<li><button class="btn btn-sm btn-primary" data-action="aDownload">${icon("dl")} Descargar contenido.json</button></li>
      <li>Abre <a href="${repoUpload}" target="_blank" rel="noopener">la carpeta data en GitHub</a>, arrastra el archivo y confirma con «Commit changes». En uno o dos minutos todos verán los cambios.</li>`}
    </ol>
  </div>
  <div class="card">
    <h3>Otras acciones</h3>
    <div class="row-wrap" style="margin-top:12px">
      ${cloudOn ? `<button class="btn btn-sm btn-ghost" data-action="aDownload">${icon("dl")} Descargar respaldo (.json)</button>` : ""}
      <label class="btn btn-sm btn-ghost">${icon("ul")} Importar un contenido.json<input type="file" accept="application/json,.json" id="importFile" hidden></label>
      <button class="btn btn-sm btn-danger" data-action="aDiscard" ${dirty ? "" : "disabled"}>${icon("undo")} Descartar borrador</button>
    </div>
    <p class="xs muted" style="margin-top:10px">Importar sirve para retomar un respaldo o seguir editando en otro computador.</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Cuentas: acceso y seguimiento de dirigentes (con Firebase)
// ---------------------------------------------------------------------------
function cloudGate(st) {
  return `<div class="card" style="max-width:440px;margin:6vh auto 0;text-align:center;padding:32px">
    <div class="tile-ico" style="margin:0 auto 12px">${icon("lock")}</div>
    <h1 class="display" style="font-size:1.6rem">Gestión de la pastoral</h1>
    <p class="muted small" style="margin-top:8px">Ingresa con tu cuenta de Google de administrador.</p>
    ${st.status === "loading" ? `<p class="muted" style="margin-top:16px">Conectando…</p>`
      : st.status === "guest" || st.status === "error"
        ? `<button class="btn btn-primary btn-block" style="margin-top:18px" data-action="signIn">Continuar con Google</button>`
        : `<p class="muted" style="margin-top:14px">Tu cuenta aún no tiene acceso.</p><a class="btn btn-ghost" style="margin-top:12px" href="#/perfil">Ver mi cuenta</a>`}
  </div>`;
}

let people = null;          // cache del panel
let peopleCourse = null;    // curso seleccionado en el panel
let peopleFilter = "";
const tsDate = (t) => (t && typeof t.toDate === "function" ? t.toDate() : t ? new Date(t) : null);
function ago(t) {
  const d = tsDate(t); if (!d || isNaN(d)) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  if (days <= 0) return "hoy"; if (days === 1) return "ayer"; if (days < 30) return `hace ${days} días`;
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}
let peopleAt = 0, peopleUid = "", keepPeople = false, peopleMode = "cuadros", jovenesAll = null;
async function loadJovenes(force) {
  if (!jovenesAll || force) { try { jovenesAll = await api.cloud.listJovenes(); } catch { jovenesAll = []; } }
  return jovenesAll;
}
async function loadPeople(force) {
  const uid = api.cloud.state().account?.uid || "";
  const reuse = keepPeople; keepPeople = false;
  if (!people || force || peopleUid !== uid || !reuse) {
    people = await api.cloud.adminData(); peopleAt = Date.now(); peopleUid = uid;
    await loadJovenes(true);
  }
  return people;
}
function courseTotals(course) {
  return { units: course.phases.reduce((a, p) => a + p.sessions.length, 0), modules: course.phases.length };
}
function rowFor(u, course) {
  const s = (u.progress && u.progress.summary && u.progress.summary[course.id]) || {};
  return { units: s.units || 0, modules: s.modules || 0, complete: !!s.complete, cert: s.certCode || "", last: u.progress?.updatedAt || u.lastSeen };
}

async function followSummary() {
  let data;
  try { data = await loadPeople(); } catch { return `<div class="note warn">No se pudo cargar el seguimiento. Revisa la conexión.</div>`; }
  const course = S.content().courses[0];
  const t = courseTotals(course);
  const dir = data.users.filter((u) => u.active !== false);
  const rows = dir.map((u) => rowFor(u, course));
  const started = rows.filter((r) => r.units > 0).length;
  const done = rows.filter((r) => r.complete).length;
  const week = dir.filter((u) => { const d = tsDate(u.progress?.updatedAt || u.lastSeen); return d && Date.now() - d.getTime() < 7 * 864e5; }).length;
  const stat = (n, l) => `<div class="card stat"><b>${n}</b><span class="muted small">${l}</span></div>`;
  return `<div class="grid grid-4">${stat(dir.length, "personas con cuenta")}${stat(started, "comenzaron el curso")}${stat(done, "completaron el curso")}${stat(week, "activas esta semana")}</div>
    <a class="btn btn-soft" href="#/admin/dirigentes" style="align-self:flex-start">${icon("users")} Ver seguimiento de dirigentes · ${t.units} unidades por curso</a>`;
}

// Visitas (contador anónimo por día) y actividad de las cuentas (última vez que entraron)
async function visitsCard() {
  const [st, vs, data] = await Promise.all([api.cloud.visitStats(30).catch(() => []), api.cloud.viewStats(30).catch(() => []), loadPeople().catch(() => null)]);
  const sum = (xs, k) => xs.reduce((a, x) => a + (+x[k] || 0), 0);
  const last7 = st.slice(-7), prev7 = st.slice(-14, -7), today = st[st.length - 1] || { v: 0, c: 0, g: 0 };
  const max = Math.max(1, ...st.slice(-14).map((x) => x.v));
  const DIAS = ["do", "lu", "ma", "mi", "ju", "vi", "sá"], MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fecha = (k) => { const d = new Date(k + "T12:00:00"); return `${DIAS[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()]}`; };
  const bars = st.slice(-14).map((x) => { const d = new Date(x.dia + "T12:00:00"), h = Math.round((x.v / max) * 100), hc = x.v ? Math.round((x.c / x.v) * h) : 0;
    return `<div class="vis-col" title="${x.dia}: ${x.v} visitas (${x.c} con cuenta, ${x.g} visitantes)"><span class="vis-n">${x.v || ""}</span><div class="vis-bar" style="height:${h}%"><i style="height:${hc ? (hc / h) * 100 : 0}%"></i></div><small>${DIAS[d.getDay()]}<br>${d.getDate()}</small></div>`; }).join("");
  const users = data ? data.users.filter((u) => u.active !== false) : [];
  // La propia cuenta acaba de entrar: su «última vez» se está guardando recién (llega vacía), así que cuenta como ahora.
  const meUid = api.cloud.myUid();
  const since = (n) => users.filter((u) => { const d = (u.uid || u.id) === meUid ? new Date() : tsDate(u.lastSeen); return d && Date.now() - d.getTime() < n * 864e5; }).length;
  const stat = (n, l, sub = "") => `<div class="card stat"><b>${n}</b><span class="muted small">${l}</span>${sub ? `<span class="xs muted">${sub}</span>` : ""}</div>`;
  const none = !sum(st, "v");
  // Comparación con la semana anterior y el mejor día del mes
  const a7 = sum(last7, "v"), p7 = sum(prev7, "v");
  const trend = p7 ? `${a7 >= p7 ? "+" : "−"}${Math.abs(Math.round(((a7 - p7) / p7) * 100))}% vs. la semana anterior` : "";
  const best = st.reduce((b, x) => (x.v > (b ? b.v : 0) ? x : b), null);
  const avg = Math.round(sum(st, "v") / Math.max(1, st.filter((x) => x.v).length));
  // Lo más visto: suma de cada sección en el período
  const NAMES = api.cloud.VISTAS || {};
  const rank = (days) => {
    const tot = {};
    vs.slice(-days).forEach((d) => Object.keys(NAMES).forEach((k) => { tot[k] = (tot[k] || 0) + (+d[k] || 0); }));
    return Object.entries(tot).filter(([, n]) => n).sort((x, y) => y[1] - x[1]);
  };
  const list = (rows) => {
    if (!rows.length) return `<p class="muted small">Todavía no hay datos de este período.</p>`;
    const top = rows[0][1];
    const row = ([k, n]) => `<li class="vis-rk"><span class="vis-rk-n">${esc(NAMES[k] || k)}</span><span class="mini-bar"><i style="width:${Math.max(4, Math.round((n / top) * 100))}%"></i></span><b>${n}</b></li>`;
    return `<ol class="vis-rank">${rows.slice(0, 8).map(row).join("")}</ol>
      ${rows.length > 8 ? `<details class="vis-more"><summary class="small">Ver las otras ${rows.length - 8}</summary><ol class="vis-rank" start="9">${rows.slice(8).map(row).join("")}</ol></details>` : ""}`;
  };
  const r7 = rank(7), r30 = rank(30), noViews = !r30.length;
  const quiet = r30.length ? Object.keys(NAMES).filter((k) => !r30.some(([x]) => x === k)) : [];
  return `<section class="card vis-card"><h3>Visitas a la app</h3>
    <p class="muted small" style="margin-top:4px">Se cuenta una visita por celular o computador al día. No se guarda quién es: solo cuántos entraron, con cuenta o como visitantes.</p>
    <div class="grid grid-4" style="margin-top:12px">${stat(today.v, "visitas hoy")}${stat(a7, "últimos 7 días", trend)}${stat(sum(st, "v"), "últimos 30 días", none ? "" : `${avg} al día en promedio`)}${stat(best && best.v ? best.v : 0, "mejor día del mes", best && best.v ? fecha(best.dia) : "")}</div>
    ${none ? `<p class="note" style="margin-top:12px">Aún no hay visitas registradas. Empiezan a contarse cuando se publiquen las reglas de Firebase con el contador.</p>` : `<div class="vis-chart" aria-label="Visitas de los últimos 14 días">${bars}</div>
    <p class="xs muted"><span class="vis-key c"></span> con cuenta <span class="vis-key g"></span> visitantes · ${sum(st, "g")} visitas sin cuenta en 30 días</p>`}
    <h4 style="margin-top:18px">Lo más visto</h4>
    <p class="muted small" style="margin-top:2px">Cuántos celulares o computadores abrieron cada sección. Cada sección cuenta una vez por día en cada uno.</p>
    ${noViews ? `<p class="note" style="margin-top:10px">${vs && vs.denied
      ? "Firebase todavía no deja leer este contador: falta publicar las reglas nuevas (la parte <b>vistas</b>)."
      : "Las reglas ya están publicadas, pero todavía no hay secciones contadas. Se van sumando a medida que la gente abre la app: vuelve a mirar en un rato."}</p>` : `
    <div class="row-wrap" style="gap:6px;margin:10px 0 6px"><button class="chip accent" data-action="aVisPer" data-p="7">7 días</button><button class="chip" data-action="aVisPer" data-p="30">30 días</button></div>
    <div data-vis-per="7">${list(r7)}</div><div data-vis-per="30" hidden>${list(r30)}</div>
    ${quiet.length ? `<p class="xs muted" style="margin-top:8px">Sin visitas en 30 días: ${esc(quiet.map((k) => NAMES[k]).join(", "))}.</p>` : ""}`}
    <h4 style="margin-top:18px">Cuentas que entraron</h4>
    <div class="grid grid-4" style="margin-top:8px">${stat(since(1), "hoy")}${stat(since(7), "en 7 días")}${stat(since(30), "en 30 días")}${stat(users.length - since(30), "hace más de 30 días o nunca")}</div>
  </section>`;
}

async function peopleView() {
  let data;
  try { data = await loadPeople(); }
  catch (e) { return `<div class="note warn">No se pudo cargar el seguimiento (${esc(e.code || e.message)}). Revisa la conexión y las reglas de Firestore.</div>`; }
  const courses = S.content().courses;
  const course = courses.find((c) => c.id === peopleCourse) || courses[0];
  const t = courseTotals(course);
  const q = peopleFilter.toLowerCase();
  const list = data.users
    .filter((u) => !q || [u.name, u.email, u.parish].join(" ").toLowerCase().includes(q))
    .map((u) => ({ u, r: rowFor(u, course) }))
    .sort((a, b) => (a.u.active === false) - (b.u.active === false) || b.r.units - a.r.units || String(a.u.name).localeCompare(b.u.name));
  return `
  <header class="page-head row-wrap" style="align-items:flex-end">
    <div><span class="eyebrow">Gestión</span><h1>Dirigentes</h1><p>Invita por correo a quienes harán el curso y sigue su avance. El cuaderno personal de cada uno es privado y no aparece aquí.</p></div>
    <span class="spacer"></span>
    <button class="btn btn-primary" data-action="aInvite">${icon("plus")} Invitar</button>
  </header>

  <div class="row-wrap">
    ${courses.length > 1 ? `<select class="select" style="width:auto" id="peopleCourse">${courses.map((c) => `<option value="${esc(c.id)}" ${c.id === course.id ? "selected" : ""}>${esc(c.title)}</option>`).join("")}</select>` : ""}
    <input class="input" id="peopleSearch" style="flex:1;min-width:200px" placeholder="Buscar por nombre, correo o parroquia" value="${esc(peopleFilter)}">
    <button class="btn btn-sm btn-ghost" data-action="aPeopleRefresh">${icon("undo")} Actualizar</button>
    <button class="btn btn-sm btn-ghost" data-action="aPeopleCsv">${icon("dl")} Exportar planilla</button>
  </div>

  <div class="seg people-mode" role="radiogroup" aria-label="Cómo ver">${[["cuadros", "Cuadros por rol"], ["tabla", "Tabla"]].map(([k, l]) => `<label><input type="radio" name="peopleMode" value="${k}" ${peopleMode === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>

  ${solicitudesCard(data.solicitudes || [])}

  ${inactiveCard(data.users, course)}

  ${peopleMode === "cuadros" ? peopleCards(list, course, t) : `<div class="card people-table">
    <table>
      <thead><tr><th>Dirigente</th><th>Avance en unidades</th><th>Módulos</th><th>Última actividad</th><th>Constancia</th></tr></thead>
      <tbody>
      ${list.length ? list.map(({ u, r }) => `<tr class="${u.active === false ? "paused" : ""}">
        <td><a href="#/admin/dirigentes/${esc(u.uid)}"><b>${esc(u.name || u.email)}</b></a>
          <span class="sub">${esc(u.parish || "")}${u.role && u.role !== "dirigente" ? ` · <span class="chip ${api.cloud.isStaffRole(u.role) ? "warn" : "accent"}">${esc(api.cloud.roleLabel(u.role))}</span>` : ""}${u.asesor ? ` · <span class="chip">Asesor</span>` : ""}${u.formador ? ` · <span class="chip">Formación</span>` : ""}${u.cantor ? ` · <span class="chip" title="Apostolado del cancionero">Cancionero</span>` : ""}${u.active === false ? ` · <span class="chip">En pausa</span>` : ""}</span></td>
        <td><div class="cell-bar"><div class="mini-bar"><i style="width:${t.units ? (r.units / t.units) * 100 : 0}%"></i></div><span>${r.units}/${t.units}</span></div></td>
        <td>${r.modules}/${t.modules}</td>
        <td>${ago(r.last)}</td>
        <td>${r.complete ? `<a href="#/verificar/${encodeURIComponent(r.cert)}" class="chip ok">${icon("award")} ${esc(r.cert)}</a>` : `<span class="muted">—</span>`}</td>
      </tr>`).join("") : `<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">${data.users.length ? "Nadie coincide con la búsqueda." : "Aún no hay dirigentes con cuenta. Invita al primero."}</td></tr>`}
      </tbody>
    </table>
  </div>`}

  ${data.invites.length ? `<div class="card">
    <h3>Invitaciones pendientes · ${data.invites.length}</h3>
    <p class="muted small" style="margin-top:4px">Aún no han ingresado. Envíales el enlace de la app para que entren con ese correo de Google.</p>
    <div class="stack" style="--gap:6px;margin-top:12px">${data.invites.map((i) => `
      <div class="tree-item"><div class="t"><strong>${esc(i.name || i.id)}</strong><span>${esc(i.id)} · ${esc(api.cloud.roleLabel(i.role))}${i.parish ? " · " + esc(i.parish) : ""}${consentChip(i)}</span></div>
        <div class="tools"><button class="btn btn-sm btn-soft" data-action="aInviteShare" data-email="${esc(i.id)}" data-name="${esc(i.name || "")}" data-role="${esc(i.role || "")}">${icon("chat")} Enviar enlace</button>
        ${iconBtn("trash", "aInviteDelete", `data-email="${esc(i.id)}"`, "Anular invitación", false, "danger")}</div></div>`).join("")}</div>
  </div>` : ""}`;
}

// ---------- Solicitudes de cuenta (Inicio → «Solicitar mi cuenta») ----------
// Todas las cuentas nuevas parten como Joven · Ingreso; después se ajusta el rol en la ficha.
function solicitudesCard(list) {
  if (!list.length) return "";
  const fecha = (t) => { const d = tsDate(t); return d && !isNaN(d) ? d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : ""; };
  return `<div class="card sol-admin">
    <h3>Solicitudes de cuenta · ${list.length}</h3>
    <p class="muted small" style="margin-top:4px">Personas que pidieron su cuenta desde Inicio. Al aprobar, entran como <b>Joven · Ingreso</b>; después puedes cambiar su rol en su ficha. A los menores de 18 años primero regístrales el consentimiento firmado de su familia: con «Consentimiento» descargas el PDF con sus datos para que lo firmen (el joven también lo puede descargar desde su solicitud).</p>
    <div class="stack" style="--gap:6px;margin-top:12px">${list.map((s) => `
      <div class="tree-item"><div class="t"><strong>${esc(s.name || s.email)}</strong>
        <span>${esc(s.email)} · ${esc(String(s.edad || "?"))} años${s.parish ? " · " + esc(s.parish) : ""}${fecha(s.createdAt) ? " · " + fecha(s.createdAt) : ""}${+s.edad < 18 ? ` <span class="chip warn">Menor de edad</span>` : ""}</span></div>
        <div class="tools">${+s.edad < 18 ? `<button class="btn btn-sm btn-soft" data-action="aSolPdf" data-uid="${esc(s.uid || s.id)}" title="Para que la familia lo firme">${icon("dl")} Consentimiento</button>` : ""}
        <button class="btn btn-sm btn-primary" data-action="aSolApprove" data-uid="${esc(s.uid || s.id)}">${icon("check")} Aprobar</button>
        ${iconBtn("trash", "aSolDelete", `data-uid="${esc(s.uid || s.id)}" data-name="${esc(s.name || "")}"`, "Descartar solicitud", false, "danger")}</div></div>`).join("")}</div>
  </div>`;
}

// ---------- Quién lleva días sin entrar ----------
const LIVE_URL = "https://pj-agape.github.io/";
const daysSince = (t) => { const d = tsDate(t); return d && !isNaN(d) ? Math.floor((Date.now() - d.getTime()) / 864e5) : null; };
function reminderText(u, kind) {
  const n = String(u.name || "").split(" ")[0];
  return kind === "curso"
    ? `¡Hola${n ? " " + n : ""}! 💙 ¿Cómo vas? Tu formación en Ágape te espera: unos minutos hoy en «El Arte de Encontrarnos» y das un paso más. ¡Tú puedes! ${LIVE_URL}`
    : `¡Hola${n ? " " + n : ""}! 💙 Te extrañamos en la app de Ágape. Hay novedades, la Capilla y tu comunidad te esperan 🙌 ${LIVE_URL}`;
}
function inactiveCard(users, course) {
  const rows = [];
  users.filter((u) => u.active !== false && !api.cloud.isStaffRole(u.role)).forEach((u) => {
    const dApp = daysSince(u.lastSeen), r = rowFor(u, course);
    const formRole = ["dirigente", "aspirante"].includes(u.role || "dirigente");
    const dCur = daysSince(u.progress?.updatedAt);
    if (dApp != null && dApp >= 2) rows.push({ u, kind: "app", d: dApp });
    else if (formRole && !r.complete && (dCur == null || dCur >= 2)) rows.push({ u, kind: "curso", d: dCur });
  });
  if (!rows.length) return "";
  rows.sort((a, b) => (b.d ?? 999) - (a.d ?? 999));
  return `<details class="card inact-card"><summary><b>Para dar un empujoncito · ${rows.length}</b> <span class="small muted">— llevan 2 días o más sin entrar a la app o sin avanzar en la formación</span></summary>
    <div class="inact-list">${rows.map(({ u, kind, d }) => {
      const txt = reminderText(u, kind);
      return `<div class="inact-row"><div style="flex:1;min-width:180px"><b>${esc(u.name || u.email)}</b>
        <span class="xs muted">${kind === "app" ? `Sin entrar a la app hace ${d} días` : d == null ? "Aún no comienza la formación" : `Sin avanzar en la formación hace ${d} días`} · ${esc(api.cloud.roleLabel(u.role))}</span></div>
        <a class="btn btn-sm btn-soft" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}" title="Abre WhatsApp con el mensaje listo; tú eliges a quién">WhatsApp</a>
        ${u.email ? `<a class="btn btn-sm btn-ghost" href="mailto:${encodeURIComponent(u.email)}?subject=${encodeURIComponent(kind === "curso" ? "Tu formación te espera" : "¡Te extrañamos en Ágape!")}&body=${encodeURIComponent(txt)}">Correo</a>` : ""}</div>`;
    }).join("")}</div>
    <p class="xs muted" style="margin-top:8px">WhatsApp se abre con el mensaje listo y tú eliges el contacto: la app no guarda números de teléfono. Un mensaje de alguien que lo conoce vale más que cualquier aviso automático.</p></details>`;
}

// ---------- Cuadros por rol ----------
const GROUPS = [
  { k: "equipo", l: "Equipo coordinador", roles: ["admin", "coordinador"], c: "#ffba03" },
  { k: "dirigente", l: "Dirigentes", roles: ["dirigente"], c: "#1351a4" },
  { k: "aspirante", l: "Aspirantes (predirigentes)", roles: ["aspirante"], c: "#ef591c" },
  { k: "joven", l: "Jóvenes", roles: ["ingreso", "madurez"], c: "#8ad2fa" },
];
const ETAPA_L = { ingreso: "Ingreso", madurez: "Madurez", aspirante: "Aspirante", equipo: "Equipo" };
// Quién acompaña a cada uno (según la lista de Acompañar)
function guideLoad() {
  const load = {};
  (jovenesAll || []).filter((j) => j.activo !== false).forEach((j) => { [j.guia, j.guia2].filter(Boolean).forEach((g) => { (load[g] = load[g] || []).push(j); }); });
  return load;
}
function peopleCards(list, course, t) {
  const load = guideLoad(), byUid = Object.fromEntries((jovenesAll || []).filter((j) => j.uid).map((j) => [j.uid, j]));
  const names = Object.fromEntries((people?.users || []).map((u) => [u.uid, u.name || u.email]));
  const card = ({ u, r }, g) => {
    const paused = u.active === false, j = byUid[u.uid], mine = load[u.uid] || [];
    const prog = `<div class="pc-prog"><div class="mini-bar"><i style="width:${t.units ? (r.units / t.units) * 100 : 0}%"></i></div><span class="xs">${r.units}/${t.units} unidades · ${r.modules}/${t.modules} módulos</span></div>`;
    let body = "";
    if (g.k === "joven") {
      const gs = j ? [j.guia, j.guia2].filter(Boolean).map((x) => names[x] || j[x === j.guia ? "guiaNombre" : "guia2Nombre"] || "—") : [];
      body = `<span class="chip">${esc(api.cloud.roleLabel(u.role))}</span>
        <p class="xs muted">Activo ${ago(r.last)}</p>
        <p class="small">${gs.length ? `Lo acompaña: <b>${esc(gs.join(" y "))}</b>` : `<span class="muted">Sin dirigente asignado</span>`}</p>`;
    } else {
      body = `${prog}
        <p class="small">${r.complete ? `<span class="chip ok">${icon("award")} Curso aprobado</span>` : `<span class="chip">Curso en camino</span>`}
        ${g.k !== "aspirante" ? ` <span class="chip ${mine.length ? "accent" : ""}">${mine.length} joven${mine.length === 1 ? "" : "es"}</span>` : ""}</p>
        <p class="xs muted">Última actividad: ${ago(r.last)}</p>`;
    }
    return `<a class="card link pc-card ${paused ? "paused" : ""}" href="#/admin/dirigentes/${esc(u.uid)}" style="--gc:${g.c}">
      <span class="pc-head"><b>${esc(u.name || u.email)}</b>${u.cantor ? ` <span class="chip">Cancionero</span>` : ""}${paused ? ` <span class="chip">En pausa</span>` : ""}</span>
      ${u.parish ? `<span class="xs muted">${esc(u.parish)}</span>` : ""}${body}</a>`;
  };
  const html = GROUPS.map((g) => {
    const xs = list.filter(({ u }) => g.roles.includes(u.role || "dirigente"));
    if (!xs.length) return "";
    return `<section class="pc-group"><h3 class="mag-hub-sub"><span class="ac-dot" style="background:${g.c}"></span>${g.l} · ${xs.length}</h3>
      <div class="pc-grid">${xs.map((x) => card(x, g)).join("")}</div></section>`;
  }).join("");
  return html || `<div class="card muted" style="text-align:center;padding:24px">${people?.users?.length ? "Nadie coincide con la búsqueda." : "Aún no hay personas con cuenta. Invita a la primera."}</div>`;
}

// ---------- Asignar jóvenes a dirigentes ----------
let asg = null; // borrador { [jovenId]: { guia, guia2 } }
// Pueden acompañar jóvenes los dirigentes, coordinadores y administradores con cuenta activa que tengan
// aprobados los cursos requeridos para «Dirigente» (Gestión → Cursos → Formación requerida por rol).
const guideRoles = (u) => u.active !== false && ["dirigente", "coordinador", "admin"].includes(u.role || "dirigente");
function eligibleGuides() {
  return (people?.users || []).filter((u) => guideRoles(u) && meetsReq(u, "dirigente"))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
}
// Asignar es «pintar»: eliges un dirigente arriba y tocas a los jóvenes que acompañará. Cada toque se guarda solo.
let asgSel = "", asgMode = "guia", asgFilter = "";
const ASG_COL = ["#1351a4", "#ef591c", "#0f7a52", "#c98a00", "#8a3fb0", "#0b6fb3", "#b4233c", "#3d6b2a"];
const ini = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
const first = (n) => String(n || "").split(" ")[0];
// Las cuentas de jóvenes y aspirantes entran solas a la lista de Acompañar (vinculadas a su cuenta),
// y si cambió su rol, su etapa se pone al día. Así todos aparecen para asignar.
async function syncJovenesCuentas() {
  const users = (people?.users || []).filter((u) => u.active !== false && YOUTH.includes(u.role));
  let n = 0;
  for (const u of users) {
    const j = (jovenesAll || []).find((x) => x.uid === u.uid);
    try {
      if (!j) { await api.cloud.saveJoven(null, { nombre: u.name || u.email, etapa: u.role, cumple: "", publico: false, activo: true, uid: u.uid,
        fechas: [], sellos: {}, auto: {}, desde: new Date().toISOString().slice(0, 10), lema: "", portada: 0, avatar: "" }); n++; }
      else if (j.etapa !== u.role) { await api.cloud.patchJoven(j.id, { nombre: j.nombre, etapa: u.role }); n++; }
    } catch (e) { console.warn(e); }
  }
  if (n) await loadJovenes(true);
  return n;
}
async function asignarView() {
  let nuevos = 0;
  try { await loadPeople(); await loadJovenes(); nuevos = await syncJovenesCuentas(); } catch (e) { return `<div class="note warn">No se pudieron cargar los datos (${esc(e.code || e.message)}).</div>`; }
  if (nuevos) setTimeout(() => toast(`${nuevos} cuenta${nuevos === 1 ? "" : "s"} de jóvenes quedaron al día en la lista`, "ok"), 300);
  asg = null;
  const guides = eligibleGuides();
  const faltan = (people?.users || []).filter((u) => guideRoles(u) && !meetsReq(u, "dirigente"));
  const reqD = reqCourses("dirigente");
  const all = (people?.users || []), nameOf = (uid) => { const u = all.find((x) => x.uid === uid); return u ? u.name || u.email : ""; };
  const color = Object.fromEntries(guides.map((g, i) => [g.uid, ASG_COL[i % ASG_COL.length]]));
  if (asgSel && !guides.some((g) => g.uid === asgSel)) asgSel = "";
  const js = (jovenesAll || []).filter((j) => j.activo !== false && ["ingreso", "madurez", "aspirante"].includes(j.etapa));
  const sin = js.filter((j) => !j.guia).length;
  const cnt = (uid, k) => js.filter((j) => j[k] === uid).length;
  const list = js.filter((j) => asgFilter !== "sin" || !j.guia);
  const chip = (j) => {
    const on = asgSel && j[asgMode] === asgSel, g = j.guia, g2 = j.guia2;
    return `<button class="asg-j${on ? " on" : ""}${g ? "" : " free"}" data-action="aAsgTap" data-id="${esc(j.id)}" style="${on ? `--gc:${color[asgSel]}` : g && color[g] ? `--gc:${color[g]}` : ""}" aria-pressed="${!!on}">
      <strong>${esc(j.nombre)}</strong>
      <span class="asg-tags">${g ? `<span class="asg-tag" style="--gc:${color[g] || "#7f90aa"}">${esc(first(nameOf(g)))}</span>` : `<span class="asg-tag none">Sin dirigente</span>`}${g2 ? `<span class="asg-tag sup" style="--gc:${color[g2] || "#7f90aa"}">apoyo: ${esc(first(nameOf(g2)))}</span>` : ""}</span></button>`;
  };
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Asignar <em>jóvenes</em></h1>
    <p><b>1.</b> Elige un dirigente. <b>2.</b> Toca a los jóvenes que acompañará. Se guarda solo; vuelve a tocar para quitarlo.</p></header>
  ${reqD.length ? `<p class="xs muted" style="margin:-6px 0 12px">Solo aparecen quienes tienen aprobado ${reqD.map((c) => `«${esc(c.title)}»`).join(" y ")}.${faltan.length ? ` Les falta: ${faltan.map((u) => esc(first(u.name || u.email))).join(", ")}.` : ""} <a href="#/admin/itinerarios">Cambiar</a></p>` : ""}
  ${!guides.length ? `<div class="note warn">Todavía no hay dirigentes disponibles para asignar.</div>` : `
  <div class="asg-guides" role="radiogroup" aria-label="Dirigente">${guides.map((g) => `<button class="asg-g${asgSel === g.uid ? " on" : ""}" role="radio" aria-checked="${asgSel === g.uid}" data-action="aAsgPick" data-uid="${esc(g.uid)}" style="--gc:${color[g.uid]}">
      <span class="asg-av">${esc(ini(g.name || g.email))}</span><span class="asg-gn"><b>${esc(String(g.name || g.email).split(" ").slice(0, 2).join(" "))}</b><small>${cnt(g.uid, "guia")} a cargo${cnt(g.uid, "guia2") ? ` · ${cnt(g.uid, "guia2")} de apoyo` : ""}</small></span></button>`).join("")}</div>
  <div class="asg-bar">
    <div class="seg asg-mode" role="radiogroup" aria-label="Cómo lo acompaña">${[["guia", "A cargo"], ["guia2", "De apoyo"]].map(([k, l]) => `<label><input type="radio" name="asgMode" value="${k}" ${asgMode === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
    <div class="row-wrap" style="gap:6px"><button class="chip ${asgFilter ? "" : "accent"}" data-action="aAsgFilter" data-f="">Todos · ${js.length}</button><button class="chip ${asgFilter === "sin" ? "accent" : ""}" data-action="aAsgFilter" data-f="sin">Sin dirigente · ${sin}</button></div>
    <span class="spacer"></span>
    ${sin ? `<button class="btn btn-sm btn-soft" data-action="aAsgSuggest">${icon("sparkle")} Repartir a los ${sin} sin dirigente</button>` : ""}
  </div>
  ${asgSel ? `<p class="small asg-hint" style="--gc:${color[asgSel]}">Tocando jóvenes para <b>${esc(nameOf(asgSel))}</b> · ${asgMode === "guia" ? "a cargo" : "de apoyo"}</p>` : `<p class="small muted asg-hint">Elige primero un dirigente arriba.</p>`}
  ${["ingreso", "madurez", "aspirante"].map((e) => { const xs = list.filter((j) => j.etapa === e).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
    return xs.length ? `<section class="asg-sec2"><h3>${ETAPA_L[e]}${e === "aspirante" ? " (predirigentes)" : ""} · ${xs.length}</h3><div class="asg-grid">${xs.map(chip).join("")}</div></section>` : ""; }).join("")
    || `<div class="note">${asgFilter === "sin" ? "Todos los jóvenes tienen dirigente." : `No hay jóvenes activos en la lista de Acompañar. <a href="#/acompanar">Agrégalos ahí</a>.`}</div>`}`}
  <p class="xs muted" style="margin-top:14px">La lista de jóvenes es la de Acompañar (con o sin cuenta). Cada dirigente ve a «sus» jóvenes en Acompañar.</p>`;
}
// Reparto parejo, por etapa, de los jóvenes sin dirigente a cargo. Devuelve { idJoven: uidDirigente }.
function suggestAsg() {
  const guides = eligibleGuides().map((g) => g.uid);
  const out = {};
  if (!guides.length) return out;
  const js = (jovenesAll || []).filter((j) => j.activo !== false && ["ingreso", "madurez", "aspirante"].includes(j.etapa));
  const total = {}, byStage = {};
  guides.forEach((g) => (total[g] = 0));
  js.forEach((j) => { if (j.guia && total[j.guia] != null) { total[j.guia]++; byStage[j.etapa + j.guia] = (byStage[j.etapa + j.guia] || 0) + 1; } });
  ["ingreso", "madurez", "aspirante"].forEach((e) => {
    js.filter((j) => j.etapa === e && !j.guia).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es")).forEach((j) => {
      // menos jóvenes de esta etapa primero; a igualdad, menos jóvenes en total
      const g = [...guides].sort((a, b) => (byStage[e + a] || 0) - (byStage[e + b] || 0) || total[a] - total[b])[0];
      out[j.id] = g; total[g]++; byStage[e + g] = (byStage[e + g] || 0) + 1;
    });
  });
  return out;
}

async function personView(uid) {
  const data = await loadPeople();
  const u = data.users.find((x) => x.uid === uid);
  if (!u) return `<div class="note warn">No se encontró a esta persona. <a href="#/admin/dirigentes">Volver</a></div>`;
  const detail = api.cloud.userProgressDetail(u.progress);
  const me = api.cloud.state().account;
  return `
  <nav class="crumbs"><a href="#/admin/dirigentes">Dirigentes</a>${icon("right")}<span>${esc(u.name)}</span></nav>
  <div class="card row-wrap" style="align-items:flex-start">
    <div style="flex:1;min-width:220px">
      <h1 class="display" style="font-size:1.8rem">${esc(u.name)}</h1>
      <p class="muted small" style="margin-top:4px">${esc(u.email)}${u.parish ? " · " + esc(u.parish) : ""}</p>
      <div class="row-wrap" style="margin-top:10px"><span class="chip ${api.cloud.isStaffRole(u.role) ? "warn" : "accent"}">${esc(api.cloud.roleLabel(u.role))}</span>${api.cloud.isProtected(u.email) ? ` <span class="chip">${icon("lock")} Cuenta protegida</span>` : ""}${consentChip(u)}
        ${u.active === false ? `<span class="chip">En pausa</span>` : `<span class="chip ok">Activa</span>`}
        <span class="chip">Última actividad: ${ago(u.progress?.updatedAt || u.lastSeen)}</span></div>
    </div>
    ${u.uid !== me.uid && !api.cloud.isProtected(u.email) ? `<div class="row-wrap">
      <label class="field" style="margin:0"><span class="xs muted">Rol</span>
        <select class="select" id="aRoleSel" data-uid="${esc(u.uid)}" style="width:auto">${api.cloud.ROLES.map((r) => `<option value="${r.key}" ${(u.role || "dirigente") === r.key ? "selected" : ""}>${esc(r.label)}</option>`).join("")}</select></label>
      <button class="btn btn-sm ${u.active === false ? "btn-soft" : "btn-danger"}" data-action="aUserActive" data-uid="${esc(u.uid)}" data-active="${u.active === false ? "1" : "0"}">${u.active === false ? "Reactivar cuenta" : "Poner en pausa"}</button>
      ${api.cloud.state().isAdmin ? `<button class="btn btn-sm btn-danger" data-action="aUserDelete" data-uid="${esc(u.uid)}" data-email="${esc(u.email)}" data-name="${esc(u.name)}">${icon("trash")} Eliminar cuenta</button>` : ""}
    </div>` : ""}
  </div>
  ${(() => { const jv = (jovenesAll || []).find((j) => j.uid === u.uid); return jv ? `<div class="card"><h3>Ficha privada</h3>
    <p class="muted small" style="margin-top:4px">RUT, edad, dirección, contacto de emergencia, alergias y lo que la familia quiera informar. No se publica: la ven el equipo, sus dirigentes y la propia persona.</p>
    <div class="row-wrap" style="margin-top:12px"><a class="btn btn-sm btn-primary" href="#/ficha/${encodeURIComponent(jv.id)}">${icon("lock")} Abrir la ficha privada</a>
      <a class="btn btn-sm btn-ghost" href="#/acompanar/joven/${encodeURIComponent(jv.id)}">Ver en la lista de jóvenes</a></div></div>`
    : YOUTH.includes(u.role) ? `<div class="card"><h3>Ficha privada</h3><p class="muted small" style="margin-top:4px">Para tener su ficha privada, agrégalo a la lista de jóvenes en <a href="#/acompanar">Acompañar</a> y vincula su cuenta.</p></div>` : ""; })()}
  ${reqFichaHTML(u)}
  ${YOUTH.includes(u.role) || u.consent ? `<div class="card"><h3>Consentimiento de la familia</h3>
    <p class="muted small" style="margin-top:4px">El papel firmado se guarda en la carpeta de consentimientos de la pastoral; aquí queda registrado qué autorizó la familia. Si cambia algo (por ejemplo, ya no autoriza fotos), edítalo aquí.</p>
    <div class="row-wrap" style="margin-top:10px">${consentChip(u)}</div>
    <div class="row-wrap" style="margin-top:12px"><button class="btn btn-sm btn-primary" data-action="aUserConsent" data-uid="${esc(u.uid)}">${icon("edit")} ${u.consent ? "Editar el consentimiento" : "Registrar el consentimiento"}</button>
      <button class="btn btn-sm btn-soft" data-action="aUserConsentPdf" data-uid="${esc(u.uid)}">${icon("dl")} Descargar el PDF con sus datos</button></div>
  </div>` : ""}
  <div class="card"><h3>Asesor de la pastoral</h3>
    <p class="muted small" style="margin-top:4px">Los asesores ven las formaciones dirigidas a asesores, además de las de su rol.</p>
    <label class="chip ${u.asesor ? "accent" : ""}" style="cursor:pointer;padding:8px 12px;margin-top:12px">
      <input type="checkbox" data-action="aUserAsesor" data-uid="${esc(u.uid)}" ${u.asesor ? "checked" : ""}> Es asesor o asesora de Ágape</label>
  </div>
  <div class="card"><h3>Formación</h3>
    ${u.role === "admin" ? `<p class="muted small" style="margin-top:4px">Como administrador, ya puede importar y publicar cursos.</p>`
      : `<p class="muted small" style="margin-top:4px">Puede importar cursos desde un Word o PDF, revisarlos y publicarlos en «Cursos de la comunidad». No toca el resto de la app.</p>
      <label class="chip ${u.formador ? "accent" : ""}" style="cursor:pointer;padding:8px 12px;margin-top:12px">
        <input type="checkbox" data-action="aUserFormador" data-uid="${esc(u.uid)}" ${u.formador ? "checked" : ""}> Prepara cursos de formación</label>`}
  </div>
  <div class="card"><h3>Apostolado del cancionero</h3>
    ${api.cloud.isStaffRole(u.role) ? `<p class="muted small" style="margin-top:4px">Como ${esc(api.cloud.roleLabel(u.role).toLowerCase())}, ya puede agregar y editar canciones y celebraciones.</p>`
      : `<p class="muted small" style="margin-top:4px">Puede agregar y editar canciones y armar los repertorios de las misas. Borrar sigue siendo del equipo.</p>
      <label class="chip ${u.cantor ? "accent" : ""}" style="cursor:pointer;padding:8px 12px;margin-top:12px">
        <input type="checkbox" data-action="aUserCantor" data-uid="${esc(u.uid)}" ${u.cantor ? "checked" : ""}> Ayuda a construir el cancionero</label>`}
  </div>
  ${(() => {
    const salas = Array.isArray(u.salas) ? u.salas : api.cloud.defaultSalas(u.role);
    return `<div class="card"><h3>Salas de chat</h3>
      <p class="muted small" style="margin-top:4px">La sala general es de todos.${api.cloud.isStaffRole(u.role) ? " Administradores y coordinadores están en todas las salas para moderar." : ""}</p>
      <div class="row-wrap" style="margin-top:12px">${api.cloud.SALAS.filter((x) => x.key !== "general").map((x) =>
        `<label class="chip ${salas.includes(x.key) || api.cloud.isStaffRole(u.role) ? "accent" : ""}" style="cursor:pointer;padding:8px 12px">
          <input type="checkbox" data-action="aUserSala" data-uid="${esc(u.uid)}" data-sala="${x.key}" ${salas.includes(x.key) || api.cloud.isStaffRole(u.role) ? "checked" : ""} ${api.cloud.isStaffRole(u.role) ? "disabled" : ""}> ${esc(x.name)}</label>`).join("")}</div></div>`;
  })()}
  ${S.content().courses.map((course) => {
    const p = detail[course.id] || { read: {}, phases: {}, scores: {} };
    const any = Object.keys(p.read || {}).length || Object.keys(p.phases || {}).length;
    if (!any && course !== S.content().courses[0]) return "";
    return `<div class="card">
      <div class="row-wrap"><h3>${esc(course.title)}</h3><span class="spacer"></span>
        ${p.completedDate ? `<span class="chip ok">${icon("award")} Completado ${esc(new Date(p.completedDate).toLocaleDateString("es-CL"))}</span>` : ""}</div>
      <div class="stack" style="--gap:14px;margin-top:14px">
      ${course.phases.map((ph, i) => {
        const read = ph.sessions.filter((se) => p.read?.[S.sessionKey(i, se)]).length;
        const sc = p.scores?.[i];
        return `<div>
          <div class="row-wrap"><b class="small">Módulo ${esc(ph.phaseNum)} · ${esc(ph.title)}</b><span class="spacer"></span>
            ${p.phases?.[i] ? `<span class="chip ok">Aprobado${sc ? ` · ${sc.right}/${sc.total}` : ""}</span>` : sc ? `<span class="chip warn">Evaluación ${sc.right}/${sc.total}</span>` : ""}
            <span class="xs muted">${read}/${ph.sessions.length} unidades</span></div>
          <div class="unit-dots">${ph.sessions.map((se) => `<span class="${p.read?.[S.sessionKey(i, se)] ? "on" : ""}" title="${esc(se.id + " · " + se.title)}">${esc(se.id)}</span>`).join("")}</div>
        </div>`;
      }).join("")}
      </div></div>`;
  }).join("")}`;
}

function peopleCsv() {
  const courses = S.content().courses;
  const course = courses.find((c) => c.id === peopleCourse) || courses[0];
  const t = courseTotals(course);
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Nombre", "Correo", "Parroquia", "Rol", "Estado", "Unidades completadas", "Total unidades", "Módulos aprobados", "Última actividad", "Constancia"].map(cell).join(",")];
  people.users.forEach((u) => {
    const r = rowFor(u, course), d = tsDate(r.last);
    lines.push([u.name, u.email, u.parish, api.cloud.roleLabel(u.role), u.active === false ? "En pausa" : "Activa",
      r.units, t.units, r.modules, d && !isNaN(d) ? d.toISOString().slice(0, 10) : "", r.complete ? r.cert : ""].map(cell).join(","));
  });
  download(`seguimiento-${slug(course.title)}.csv`, "﻿" + lines.join("\n"), "text/csv;charset=utf-8");
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------
function settingsView() {
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Ajustes</h1></header>
  <form class="card stack" id="passForm" style="--gap:14px;max-width:480px">
    <h3>Cambiar contraseña</h3>
    <div class="field"><label>Contraseña actual</label><input class="input" type="password" name="cur" required autocomplete="current-password"></div>
    <div class="field"><label>Nueva contraseña</label><input class="input" type="password" name="n1" required minlength="6" autocomplete="new-password"><span class="hint">Mínimo 6 caracteres.</span></div>
    <div class="field"><label>Repetir nueva contraseña</label><input class="input" type="password" name="n2" required minlength="6" autocomplete="new-password"></div>
    <button class="btn btn-primary" type="submit">Guardar contraseña</button>
    <p class="xs muted">La contraseña se guarda en este dispositivo. Hasta conectar una base de datos, el panel evita ediciones accidentales, pero no es una protección fuerte.</p>
  </form>`;
}

// ---------------------------------------------------------------------------
// Editor genérico (diálogo) con formularios descritos por "specs"
// ---------------------------------------------------------------------------
const SPECS = {
  course: () => [["title", "Título del curso", "text"], ["theme", "Tema de color", "select", THEMES], ["description", "Descripción / propósito", "textarea"],
    ["", "Dirigido a", "heading"], ["", "Marca a quiénes está dirigida esta formación. Si no marcas ninguno, la ven todos. Los administradores siempre ven todos los cursos.", "note"],
    ...S.PARA.map(([k, l]) => [`para.${k}`, l, "check"])],
  phase: () => [["title", "Título del módulo", "text"], ["desc", "Descripción breve", "text", null, "Ej: 4 unidades · Acogida y confianza"],
    ["intro", "Presentación del módulo", "textarea"]],
  session: () => [
    ["title", "Título de la unidad", "text"], ["time", "Tiempo de estudio", "text", null, "Ej: 45 min"],
    ["objective", "Objetivo de aprendizaje", "textarea"], ["intro", "Introducción", "textarea"],
    ["sections", "Contenido de estudio (secciones)", "objlist", [["title", "Título de la sección", "text"], ["body", "Texto", "textarea"]], "Sección", "Separa párrafos con una línea en blanco. Una línea que empieza con «- » se muestra como lista. Usa &lt;strong&gt;…&lt;/strong&gt; para destacar."],
    ["", "Palabra de Dios", "heading"],
    ["bible.ref", "Cita bíblica", "text", null, "Ej: Lucas 24,13-35 · Los discípulos de Emaús"], ["bible.comment", "Comentario", "textarea"],
    ["church", "La Iglesia nos dice", "objlist", [["source", "Documento y número", "text", "Ej: Christus vivit 206"], ["text", "Idea o cita breve", "textarea"], ["url", "Enlace a la fuente", "text", "https://www.vatican.va/…"]], "Referencia"],
    ["questions", "Preguntas para la reflexión personal (cuaderno)", "list", null, "Pregunta"],
    ["activity", "Llévalo a tu grupo (práctica)", "textarea"],
    ["prayer", "Oración", "textarea"],
    ["resources", "Para profundizar (recursos)", "objlist", [["title", "Título", "text"], ["url", "Enlace", "text", "https://…"], ["note", "Nota breve", "text"]], "Recurso"]],
  quiz: () => [["badge", "Etiqueta", "text"], ["title", "Título de la evaluación", "text"], ["questions", "Preguntas", "questions"]],
  card: (o, key) => {
    const types = key === "materials" ? Object.entries(TYPE_LABEL) : [["text", "Texto de oración"], ["list", "Pasos (uno por línea)"]];
    const f = [["tag", "Etiqueta", "text"], ["title", "Título", "text"], ["type", "Tipo de contenido", "select", types]];
    if (o.type === "list" || o.type === "crisis") f.push(["items", o.type === "crisis" ? "Niveles (verde, amarillo, rojo)" : "Puntos", "list", null, "Punto"]);
    else f.push(["text", "Texto", "textarea"]);
    if (o.type === "action") f.push(["btnText", "Texto del botón", "text"], ["url", "Enlace (https://…)", "text", null, "https://drive.google.com/…"]);
    return f;
  },
  box: () => [["title", "Título de la sección", "text"], ["desc", "Descripción", "textarea"]],
  invite: (o) => [["email", "Correo de Google", "text", null, "nombre@gmail.com"], ["name", "Nombre y apellido", "text"], ["parish", "Capilla o parroquia", "text"],
    ["role", "Rol", "select", [["ingreso", "Joven · Ingreso"], ["madurez", "Joven · Madurez"], ["aspirante", "Aspirante (curso y sala Aspirantes)"], ["dirigente", "Dirigente (hace el curso)"], ["coordinador", "Coordinador (agenda, portada y moderación)"], ["admin", "Administrador (gestión completa)"]]],
    ...(YOUTH.includes(o.role) ? [
      ["", "Consentimiento de la familia", "heading"],
      ["", "Antes de crear la cuenta de un joven, su papá, mamá o apoderado/a firma el consentimiento. Guárdalo en la carpeta de consentimientos; aquí solo queda registrado.", "note"],
      ["", "Descargar el consentimiento (PDF)", "button", "aConsentPdf"],
      ["consent.mayor", "Es mayor de 18 años (no necesita consentimiento de su familia)", "check"],
      ...(o.consent && o.consent.mayor ? [] : [
        ["consent.ok", "Recibí el consentimiento firmado", "check"],
        ["consent.fecha", "Fecha de la firma", "date"],
        ["consent.honor", "Autorizó: cuadro de honor", "check"],
        ["consent.cumple", "Autorizó: cumpleaños visible en la app", "check"],
        ["consent.fotos", "Autorizó: fotos en canales oficiales", "check"],
        ["consent.ficha", "Autorizó: guardar su ficha privada (datos de la página 2)", "check"],
        ["consent.avisos", "Autorizó: usar su teléfono de contacto para avisos de la pastoral", "check"],
      ]),
    ] : [])],
  consent: (o) => [
    ["", "Marca lo que dice el papel firmado por su papá, mamá o apoderado/a.", "note"],
    ["consent.mayor", "Es mayor de 18 años (no necesita consentimiento de su familia)", "check"],
    ...(o.consent && o.consent.mayor ? [] : [
      ["consent.ok", "Recibí el consentimiento firmado", "check"],
      ["consent.fecha", "Fecha de la firma", "date"],
      ["consent.honor", "Autorizó: cuadro de honor", "check"],
      ["consent.cumple", "Autorizó: cumpleaños visible en la app", "check"],
      ["consent.fotos", "Autorizó: fotos en canales oficiales", "check"],
      ["consent.ficha", "Autorizó: guardar su ficha privada (datos de la página 2)", "check"],
      ["consent.avisos", "Autorizó: usar su teléfono de contacto para avisos de la pastoral", "check"],
    ]),
  ],
  intro: () => [["intro", "Introducción de la guía", "textarea"]],
  identity: () => [["tag", "Etiqueta", "text"], ["title", "Título", "text"], ["text", "Texto", "textarea"]],
  methods: () => [["icon", "Emoji", "text", null, ""], ["tag", "Etiqueta", "text"], ["title", "Título", "text"], ["text", "Texto", "textarea"]],
  cargos: () => [["tag", "Duración / etiqueta", "text"], ["title", "Cargo", "text"], ["text", "Descripción", "textarea"], ["note", "Requisito o nota", "text"]],
  meetings: () => [["freq", "Frecuencia", "text", null, "Mensual"], ["title", "Título", "text"], ["text", "Descripción", "textarea"], ["who", "Participantes", "text"]],
  roles: () => [["title", "Rol", "text"], ["subtitle", "Subtítulo", "text"], ["tag", "Etiqueta", "text"], ["duration", "Duración", "text"], ["badge", "Requisito / distintivo", "text"],
    ["responsibility", "Responsabilidad", "textarea"], ["functions", "Tareas principales", "list", null, "Tarea"]],
};

const YOUTH = ["ingreso", "madurez", "aspirante"];
// Registro del consentimiento de la familia (solo fecha y lo autorizado; el papel queda en la carpeta de consentimientos).
function consentChip(u) {
  const c = u && u.consent; if (!c) return YOUTH.includes(u && u.role) ? ` <span class="chip danger">Sin consentimiento registrado</span>` : "";
  if (c.mayor) return ` <span class="chip">Mayor de edad</span>`;
  const f = c.fecha ? c.fecha.split("-").reverse().join("/") : "";
  const ok = [c.honor && "honor", c.cumple && "cumpleaños", c.fotos && "fotos", c.ficha && "ficha", c.avisos && "avisos"].filter(Boolean).join(", ");
  return ` <span class="chip ok" title="Registrado por ${esc(c.registradoPor || "")}">✓ Consentimiento ${esc(f)}${ok ? " · " + esc(ok) : ""}</span>`;
}
let E = null; // { title, spec, specArgs, obj, onSave, isNew }
function openEditor({ title, spec, specArg, obj, onSave, onDelete }) {
  E = { title, spec, specArg, obj: clone(obj), onSave, onDelete };
  const d = $("#editDialog");
  d.querySelector("[data-e-title]").textContent = title;
  renderEditor();
  d.showModal();
  autosize(d);
  setTimeout(() => d.querySelector(".sheet-body input, .sheet-body textarea")?.focus(), 50);
}
function renderEditor() {
  const d = $("#editDialog");
  const fields = SPECS[E.spec](E.obj, E.specArg);
  d.querySelector(".sheet-body").innerHTML = `<div class="stack" style="--gap:16px">${fields.map((f) => fieldHTML(f)).join("")}</div>`;
  d.querySelector(".sheet-foot").innerHTML = `
    ${E.onDelete ? `<button class="btn btn-sm btn-danger" data-action="eDelete">${icon("trash")} Eliminar</button>` : ""}
    <span class="spacer"></span>
    <button class="btn btn-ghost" data-action="eCancel">Cancelar</button>
    <button class="btn btn-primary" data-action="eSave">Guardar</button>`;
  autosize(d);
}
function autosize(root) {
  root.querySelectorAll("textarea").forEach((t) => { t.style.height = "auto"; t.style.height = Math.max(t.scrollHeight + 2, 44) + "px"; });
}
function fieldHTML([key, label, type, opts, ph, hint]) {
  const v = key ? getPath(E.obj, key) : null;
  const id = "f_" + key.replace(/\./g, "_");
  if (type === "heading") return `<h3 class="ed-heading">${label}</h3>`;
  if (type === "note") return `<p class="small muted">${esc(label)}</p>`;
  if (type === "button") return `<button type="button" class="btn btn-sm btn-ghost" data-action="${esc(opts)}" style="justify-self:start">${icon("dl")} ${esc(label)}</button>`;
  if (type === "check") return `<label class="row" style="gap:8px;align-items:flex-start"><input type="checkbox" id="${id}" data-fc="${key}" ${v ? "checked" : ""} style="margin-top:3px"> <span>${esc(label)}</span></label>`;
  if (type === "date") return `<div class="field"><label for="${id}">${label}</label><input class="input" type="date" id="${id}" data-f="${key}" value="${esc(v ?? "")}"></div>`;
  if (type === "objlist") {
    const arr = Array.isArray(v) ? v : [];
    return `<div class="stack" style="--gap:10px"><h3 class="ed-heading">${label}</h3>${hint ? `<span class="hint xs muted">${hint}</span>` : ""}
      ${arr.map((item, i) => `<div class="qcard stack" style="--gap:8px">
        <div class="row"><strong class="small">${esc(ph || "Elemento")} ${i + 1}</strong><span class="spacer"></span>${listTools(key, i, arr.length)}</div>
        ${opts.map(([sk, sl, st, sph]) => st === "textarea"
          ? `<div class="field"><label>${sl}</label><textarea class="textarea" rows="${sk === "body" ? 6 : 2}" data-f="${key}.${i}.${sk}">${esc(item[sk] ?? "")}</textarea></div>`
          : `<div class="field"><label>${sl}</label><input class="input" data-f="${key}.${i}.${sk}" value="${esc(item[sk] ?? "")}" placeholder="${esc(sph || "")}"></div>`).join("")}
      </div>`).join("")}
      <button class="btn btn-sm btn-soft" data-action="eAdd" data-l="${key}" data-kind="obj" data-keys="${opts.map((o) => o[0]).join(",")}" style="justify-self:start">${icon("plus")} Agregar ${esc((ph || "elemento").toLowerCase())}</button></div>`;
  }
  if (type === "text") return `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" data-f="${key}" value="${esc(v ?? "")}" placeholder="${esc(ph || "")}"></div>`;
  if (type === "textarea") return `<div class="field"><label for="${id}">${label}</label><textarea class="textarea" id="${id}" data-f="${key}" rows="3">${esc(v ?? "")}</textarea></div>`;
  if (type === "select") return `<div class="field"><label for="${id}">${label}</label><select class="select" id="${id}" data-f="${key}" data-rerender="1">
      ${opts.map(([val, l]) => `<option value="${esc(val)}" ${v === val ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
  if (type === "list") {
    const arr = Array.isArray(v) ? v : [];
    return `<div class="field"><span class="label">${label}</span><div class="list-editor">
      ${arr.map((x, i) => `<div class="li"><textarea class="textarea" rows="1" data-f="${key}.${i}" placeholder="${esc(ph || "")} ${i + 1}">${esc(x)}</textarea>
        ${listTools(key, i, arr.length)}</div>`).join("")}
      <button class="btn btn-sm btn-ghost" data-action="eAdd" data-l="${key}" style="justify-self:start">${icon("plus")} Agregar</button></div></div>`;
  }
  if (type === "questions") {
    const qs = v || [];
    return `<div class="stack" style="--gap:12px"><span class="label">${label} · marca con el círculo la respuesta adecuada</span>
      ${qs.map((q, qi) => `<div class="qcard stack" style="--gap:10px">
        <div class="row"><strong>Pregunta ${qi + 1}</strong><span class="spacer"></span>${listTools(key, qi, qs.length)}</div>
        <textarea class="textarea" rows="2" data-f="${key}.${qi}.q" placeholder="Escribe la pregunta o situación…">${esc(q.q.replace(/^\s*\d+\.\s*/, ""))}</textarea>
        <div class="stack" style="--gap:8px">
          ${q.options.map((o, oi) => `<div class="opt-editor">
            <input type="radio" name="correct_${qi}" ${q.correct === oi ? "checked" : ""} data-correct="${qi}" value="${oi}" title="Respuesta adecuada" aria-label="Marcar opción ${oi + 1} como adecuada">
            <input class="input" data-f="${key}.${qi}.options.${oi}" value="${esc(o)}" placeholder="Opción ${"ABCDEF"[oi]}">
            ${q.options.length > 2 ? `<button class="icon-btn danger" data-action="eDel" data-l="${key}.${qi}.options" data-i="${oi}" title="Quitar opción" aria-label="Quitar opción">${icon("x")}</button>` : ""}
          </div>`).join("")}
          ${q.options.length < 6 ? `<button class="btn btn-sm btn-ghost" data-action="eAdd" data-l="${key}.${qi}.options" style="justify-self:start">${icon("plus")} Opción</button>` : ""}
        </div>
        <div class="field"><label>Orientación pastoral (se muestra al responder)</label>
          <textarea class="textarea" rows="2" data-f="${key}.${qi}.feedback">${esc(q.feedback)}</textarea></div>
      </div>`).join("")}
      <button class="btn btn-soft" data-action="eAdd" data-l="${key}" data-kind="question">${icon("plus")} Agregar pregunta</button></div>`;
  }
  return "";
}
function listTools(path, i, n) {
  return `<div class="row" style="gap:4px">
    ${iconBtn("up", "eMove", `data-l="${path}" data-i="${i}" data-d="-1"`, "Subir", i === 0)}
    ${iconBtn("down", "eMove", `data-l="${path}" data-i="${i}" data-d="1"`, "Bajar", i === n - 1)}
    ${iconBtn("trash", "eDel", `data-l="${path}" data-i="${i}"`, "Quitar", false, "danger")}</div>`;
}

document.addEventListener("input", (e) => {
  if (!E) return;
  const t = e.target;
  if (t.dataset.f) { setPath(E.obj, t.dataset.f, t.value); if (t.tagName === "TEXTAREA") autosize(t.parentElement); }
});
document.addEventListener("change", (e) => {
  if (!E) return;
  const t = e.target;
  if (t.dataset.correct != null) E.obj.questions[+t.dataset.correct].correct = +t.value;
  if (t.dataset.rerender) { setPath(E.obj, t.dataset.f, t.value); renderEditor(); }
  if (t.dataset.fc) { setPath(E.obj, t.dataset.fc, t.checked); if (t.dataset.fc === "consent.mayor") renderEditor(); }
});

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
function commit(mutator, { snapshot = false, msg } = {}) {
  const d = S.ensureDraft();
  undo = snapshot ? clone(d) : null;
  mutator(d);
  S.saveDraft(d);
  if (msg) toast(msg);
  api.render();
}
// «Dirigido a»: solo las marcas encendidas (sin ninguna = para todos)
const cleanPara = (p) => { const o = {}; for (const [k] of S.PARA) if (p && p[k]) o[k] = true; return Object.keys(o).length ? o : undefined; };
const move = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

let bound = false;
function bindActions() {
  if (bound) return; bound = true;
  const A = api.actions;
  saludos.registerActions(A, () => api.render());
  conocer.registerAdmin(A, () => api.render());
  cursosCom.setup(api);
  evAdmin.registerActions(A, () => api.render());

  document.addEventListener("submit", async (e) => {
    if (e.target.id === "loginForm") { e.preventDefault(); await doLogin($("#adminPass").value); }
    if (e.target.id === "passForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      if ((await sha256(f.get("cur"))) !== S.adminHash()) return toast("La contraseña actual no coincide", "");
      if (f.get("n1") !== f.get("n2")) return toast("Las contraseñas nuevas no coinciden", "");
      S.setAdminHash(await sha256(f.get("n1"))); e.target.reset(); toast("Contraseña actualizada");
    }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "peopleMode") { peopleMode = t.value; keepPeople = true; api.render(); return; }
    if (t.name === "asgMode") { asgMode = t.value === "guia2" ? "guia2" : "guia"; keepPeople = true; api.render(); return; }
    if (t.dataset && t.dataset.asg && asg) {
      const a = asg[t.dataset.asg] = asg[t.dataset.asg] || { guia: "", guia2: "" };
      a[t.dataset.k] = t.value;
      if (a.guia && a.guia2 === a.guia) a.guia2 = "";
      keepPeople = true; api.render();
    }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "importFile") return;
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const c = data.courses ? data : data.catalog ? { ...S.publishedContent(), courses: data.catalog, materials: data.materials || S.publishedContent().materials, devotional: data.devotional || S.publishedContent().devotional } : null;
      if (!c || !Array.isArray(c.courses)) throw new Error();
      if (!confirm("¿Reemplazar tu borrador con el archivo importado?")) return;
      S.saveDraft(c); toast("Contenido importado al borrador"); api.render();
    } catch { toast("El archivo no tiene un formato válido", ""); }
  });

  A.aLogout = () => { S.setAdmin(false); location.hash = "#/"; };

  // Publicar en la nube
  A.aPublishCloud = async (el) => {
    const lost = S.draftRemovals();
    const aviso = (S.draftIsOutdated() ? "ATENCIÓN: este borrador es anterior a la versión publicada ahora.\n\n" : "")
      + (lost.length ? `Al publicar se quitará:\n- ${lost.slice(0, 10).join("\n- ")}${lost.length > 10 ? `\n- y ${lost.length - 10} más` : ""}\n\n` : "");
    if (aviso && !confirm(aviso + "¿Seguro que quieres quitarlo?")) return;
    if (!confirm("¿Publicar el borrador para todos los dirigentes?")) return;
    el.disabled = true;
    try {
      const d = S.ensureDraft();
      const pub = S.publishedContent();
      d.version = (Number(pub.version) || 1) + 1;
      d.updatedAt = new Date().toISOString(); // fecha y hora: así gana siempre a la copia del sitio
      await api.cloud.publishContent(d);
      S.setPublished(d); S.discardDraft(); undo = null;
      toast("Publicado. Los dirigentes ya ven los cambios.", "ok", 4000); api.render();
    } catch (e) { el.disabled = false; toast("No se pudo publicar: " + (e.code || e.message), "", 5000); }
  };

  // Seguimiento de dirigentes
  A.aVisPer = (el) => {
    const card = el.closest(".vis-card"); if (!card) return;
    card.querySelectorAll("[data-action=aVisPer]").forEach((b) => b.classList.toggle("accent", b === el));
    card.querySelectorAll("[data-vis-per]").forEach((d) => { d.hidden = d.dataset.visPer !== el.dataset.p; });
  };
  A.aPeopleRefresh = async () => { await loadPeople(true); api.render(); toast("Datos actualizados"); };
  // Guarda a cargo / apoyo de un joven.
  const asgWrite = async (j, guia, guia2) => {
    const names = Object.fromEntries((people?.users || []).map((u) => [u.uid, u.name || u.email]));
    const g2 = guia2 && guia2 !== guia ? guia2 : "";
    const prev = { guia: j.guia || "", guia2: j.guia2 || "", guiaNombre: j.guiaNombre || "", guia2Nombre: j.guia2Nombre || "" };
    Object.assign(j, { guia, guiaNombre: guia ? names[guia] || "" : "", guia2: g2, guia2Nombre: g2 ? names[g2] || "" : "" });
    try { await api.cloud.patchJoven(j.id, { nombre: j.nombre, etapa: j.etapa, guia: j.guia, guiaNombre: j.guiaNombre, guia2: j.guia2, guia2Nombre: j.guia2Nombre }); }
    catch (e) { Object.assign(j, prev); throw e; }
  };
  const asgRender = () => { const y = window.scrollY; keepPeople = true; Promise.resolve(api.render()).then(() => window.scrollTo(0, y)); };
  A.aAsgPick = (el) => { asgSel = asgSel === el.dataset.uid ? "" : el.dataset.uid; asgRender(); };
  A.aAsgFilter = (el) => { asgFilter = el.dataset.f || ""; asgRender(); };
  A.aAsgTap = async (el) => {
    const j = (jovenesAll || []).find((x) => x.id === el.dataset.id); if (!j) return;
    if (!asgSel) { toast("Primero elige arriba al dirigente", ""); document.querySelector(".asg-guides")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    let guia = j.guia || "", guia2 = j.guia2 || "";
    if (asgMode === "guia") { if (guia === asgSel) guia = ""; else { guia = asgSel; if (guia2 === asgSel) guia2 = ""; } }
    else { if (guia2 === asgSel) guia2 = ""; else if (guia === asgSel) { toast("Ya lo acompaña a cargo", ""); return; } else guia2 = asgSel; }
    try { await asgWrite(j, guia, guia2); asgRender(); novedades.refresh(true); } // la campanita se pone al día al tiro
    catch (e) { console.warn(e); toast("No se pudo guardar. Revisa la conexión.", ""); asgRender(); }
  };
  A.aAsgSuggest = async (el) => {
    const plan = suggestAsg(), ids = Object.keys(plan);
    if (!ids.length) { toast("Todos ya tienen dirigente a cargo."); return; }
    const names = Object.fromEntries((people?.users || []).map((u) => [u.uid, first(u.name || u.email)]));
    const resumen = Object.entries(ids.reduce((a, id) => ((a[plan[id]] = (a[plan[id]] || 0) + 1), a), {})).map(([g, n]) => `${names[g]}: ${n}`).join(", ");
    if (!confirm(`Repartir ${ids.length} joven${ids.length === 1 ? "" : "es"} sin dirigente, parejo y por etapa:\n\n${resumen}\n\nDespués puedes cambiar a cualquiera tocándolo.`)) return;
    el.disabled = true;
    try { for (const id of ids) { const j = jovenesAll.find((x) => x.id === id); await asgWrite(j, plan[id], j.guia2 || ""); } toast(`Listo: ${ids.length} asignado${ids.length === 1 ? "" : "s"}`, "ok"); }
    catch (e) { console.warn(e); toast("No se pudo terminar el reparto. Revisa la conexión.", ""); }
    asgRender(); novedades.refresh(true);
  };
  A.aPeopleCsv = () => peopleCsv();
  A.aInvite = () => openInvite();
  // Aprobar una solicitud: abre la misma invitación, ya completa, como Joven · Ingreso.
  const shortName = (n) => { const w = String(n || "").trim().split(/\s+/); return w.length > 1 ? `${w[0]} ${w[1].charAt(0).toUpperCase()}.` : w[0] || ""; };
  A.aSolApprove = async (el) => {
    const s = ((await loadPeople()).solicitudes || []).find((x) => (x.uid || x.id) === el.dataset.uid); if (!s) return;
    openInvite({ email: s.email, name: shortName(s.name), parish: s.parish || "", role: "ingreso", consent: +s.edad >= 18 ? { mayor: true } : {} },
      { title: `Aprobar a ${s.name}`, done: async (consent) => {
        // Queda en la lista de jóvenes (vinculado a su cuenta) y con su ficha privada ya iniciada.
        const uid = s.uid || s.id, js = await loadJovenes(true);
        let jid = (js.find((j) => j.uid === uid) || {}).id;
        if (!jid) jid = await api.cloud.saveJoven(null, { nombre: s.name, etapa: "ingreso", cumple: "", publico: false, activo: true, uid,
          fechas: [], sellos: {}, auto: {}, desde: new Date().toISOString().slice(0, 10), lema: "", portada: 0, avatar: "" }).catch(() => "");
        // La ficha con los datos que escribió el joven solo se guarda si es mayor de edad o su familia lo autorizó.
        const full = !consent || consent.mayor || consent.ficha;
        const datos = full ? Object.fromEntries(["nacimiento", "rut", "direccion", "emergNombre", "emergTel", "alergias", "notas"].map((k) => [k, String(s[k] || "")])) : {};
        if (jid && !(await api.cloud.getFicha(jid))) await api.cloud.saveFicha(jid, { nombre: s.name, email: s.email || "", ...datos }).catch(() => {});
        await api.cloud.deleteSolicitud(uid);
      } });
  };
  A.aSolPdf = async (el) => {
    const s = ((await loadPeople()).solicitudes || []).find((x) => (x.uid || x.id) === el.dataset.uid); if (!s) return;
    try { const m = await import("./consentimiento.js"); await m.download({ nombre: s.name || "", etapa: "Ingreso", correo: s.email || "", ficha: { ...s, nombre: s.name || "" } }); }
    catch (e) { console.warn(e); toast("No se pudo crear el PDF", ""); }
  };
  const etapaDe = (r) => ({ ingreso: "Ingreso", madurez: "Madurez", aspirante: "Aspirante" }[r] || "");
  A.aUserConsentPdf = async (el) => {
    const u = (await loadPeople()).users.find((x) => x.uid === el.dataset.uid); if (!u) return;
    const jv = (jovenesAll || []).find((j) => j.uid === u.uid), ficha = jv ? (await api.cloud.getFicha(jv.id)) || {} : {};
    try { const m = await import("./consentimiento.js"); await m.download({ nombre: u.name || "", etapa: etapaDe(u.role), correo: u.email || "", ficha }); }
    catch (e) { console.warn(e); toast("No se pudo crear el PDF", ""); }
  };
  A.aUserConsent = async (el) => {
    const u = (await loadPeople()).users.find((x) => x.uid === el.dataset.uid); if (!u) return;
    const c0 = u.consent || {};
    openEditor({ title: `Consentimiento de ${u.name || u.email}`, spec: "consent",
      obj: { name: u.name, email: u.email, role: u.role, consent: { ...c0, ok: !!u.consent && !c0.mayor } },
      onSave: (o) => {
        const c = o.consent || {};
        if (!c.mayor && (!c.ok || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha || ""))) { toast("Marca que recibiste el consentimiento firmado y su fecha", "", 4500); return false; }
        const consent = { ...(c.mayor ? { mayor: true } : { mayor: false, fecha: c.fecha, honor: !!c.honor, cumple: !!c.cumple, fotos: !!c.fotos, ficha: !!c.ficha, avisos: !!c.avisos }), registradoPor: api.cloud.state().account?.email || "" };
        api.cloud.updateUser(u.uid, { consent })
          .then(async () => { await loadPeople(true); api.render(); toast("Consentimiento registrado"); })
          .catch((e) => toast("No se pudo guardar: " + (e.code || e.message), "", 5000));
      } });
  };
  A.aSolDelete = async (el) => {
    if (!confirm(`¿Descartar la solicitud de ${el.dataset.name || "esta persona"}? No se le avisa; si vuelve a pedirla, aparecerá de nuevo.`)) return;
    try { await api.cloud.deleteSolicitud(el.dataset.uid); await loadPeople(true); api.render(); toast("Solicitud descartada"); }
    catch (e) { toast("No se pudo descartar: " + (e.code || e.message), ""); }
  };
  const openInvite = (pre = {}, opt = {}) => openEditor({
    title: opt.title || "Invitar a una persona", spec: "invite", obj: { email: "", name: "", parish: "", role: "dirigente", consent: {}, ...pre },
    onSave: (o) => {
      const email = String(o.email || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast("Escribe un correo válido", ""); return false; }
      if (!String(o.name || "").trim()) { toast("Escribe el nombre", ""); return false; }
      let consent = null;
      if (YOUTH.includes(o.role)) {
        const c = o.consent || {};
        if (!c.mayor && (!c.ok || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha || ""))) { toast("Primero registra el consentimiento firmado y su fecha", "", 4500); return false; }
        consent = c.mayor ? { mayor: true } : { mayor: false, fecha: c.fecha, honor: !!c.honor, cumple: !!c.cumple, fotos: !!c.fotos, ficha: !!c.ficha, avisos: !!c.avisos };
      }
      api.cloud.invite({ email, name: o.name.trim(), parish: (o.parish || "").trim(), role: o.role, consent })
        .then(async () => {
          if (opt.done) await opt.done(consent).catch((e) => console.warn(e));
          await loadPeople(true); api.render();
          if (opt.done) toast(`Listo: ${o.name.trim()} ya tiene acceso. Entrará la próxima vez que abra la app.`, "ok", 5000);
          else { toast(`Invitación creada para ${email}`); shareInvite(email, o.name.trim(), o.role); }
        })
        .catch((e) => toast("No se pudo invitar: " + (e.code || e.message), "", 5000));
    },
  });
  // Mensaje de bienvenida para WhatsApp: el mismo para todas las cuentas nuevas.
  const inviteMsg = (email, name) => {
    const url = location.origin + location.pathname, n = name ? " " + name.split(" ")[0] : "";
    const que = "Aquí vas a encontrar la Capilla para rezar, el muro y el chat del grupo, juegos y mucho más.";
    return `¡Hola${n}! Te damos la bienvenida a *agAPPe*, la casa virtual de la Pastoral Juvenil Ágape.

Ya tienes tu cuenta. ${que}

Para entrar, abre este enlace, toca «Ingresar» y elige «Continuar con Google» con tu correo ${email}:
${url}

Te recomendamos partir por «Bienvenido a agAPPe», en Formación: es un recorrido corto para conocer la app.

¡Qué alegría tenerte en la comunidad!`;
  };
  const shareInvite = (email, name, role) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMsg(email, name))}`, "_blank", "noopener");
  };
  A.aConsentPdf = async () => {
    const o = (E && E.obj) || {};
    const et = { ingreso: "Ingreso", madurez: "Madurez", aspirante: "Aspirante" }[o.role] || "";
    try { const m = await import("./consentimiento.js"); await m.download({ nombre: o.name || "", etapa: et, correo: o.email || "" }); }
    catch (e) { console.warn(e); toast("No se pudo crear el PDF", ""); }
  };
  A.aInviteShare = (el) => shareInvite(el.dataset.email, el.dataset.name, el.dataset.role);
  A.aInviteDelete = async (el) => {
    if (!confirm(`¿Anular la invitación de ${el.dataset.email}?`)) return;
    try { await api.cloud.deleteInvite(el.dataset.email); await loadPeople(true); api.render(); toast("Invitación anulada"); }
    catch (e) { toast("No se pudo anular: " + (e.code || e.message), ""); }
  };
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "aRoleSel") return;
    const sel = e.target, role = sel.value, r = api.cloud.ROLES.find((x) => x.key === role);
    const u = (await loadPeople()).users.find((x) => x.uid === sel.dataset.uid);
    if (!u || !r) return;
    if (!confirm(`¿Cambiar el rol de ${u.name || u.email} a ${r.label}?\n\n${r.desc}`)) { sel.value = u.role || "dirigente"; return; }
    // Al cambiar de rol se vuelven a usar las salas por defecto del nuevo rol.
    try {
      await api.cloud.updateUser(u.uid, { role, salas: api.cloud.defaultSalas(role) });
      // Su ficha de la lista de jóvenes sigue el rol: joven o aspirante → esa etapa; equipo → «equipo» (ya no se asigna).
      const j = (await loadJovenes(true)).find((x) => x.uid === u.uid);
      const et = YOUTH.includes(role) ? role : "equipo";
      if (j && j.etapa !== et) await api.cloud.patchJoven(j.id, { nombre: j.nombre, etapa: et }).catch(() => {});
      await loadPeople(true); api.render(); toast("Rol actualizado");
    }
    catch (err) { sel.value = u.role || "dirigente"; toast("No se pudo cambiar: " + (err.code || err.message), ""); }
  });
  A.aUserSala = async (el) => {
    const data = await loadPeople();
    const u = data.users.find((x) => x.uid === el.dataset.uid);
    if (!u) return;
    const cur = new Set(Array.isArray(u.salas) ? u.salas : api.cloud.defaultSalas(u.role));
    el.checked = !cur.has(el.dataset.sala);
    if (el.checked) cur.add(el.dataset.sala); else cur.delete(el.dataset.sala);
    try { await api.cloud.updateUser(u.uid, { salas: [...cur] }); await loadPeople(true); api.render(); toast("Salas actualizadas"); }
    catch (e) { toast("No se pudo cambiar: " + (e.code || e.message), ""); }
  };
  A.aUserAsesor = async (el) => {
    const data = await loadPeople();
    const u = data.users.find((x) => x.uid === el.dataset.uid);
    if (!u) return;
    const on = !u.asesor; el.checked = on;
    try { await api.cloud.updateUser(u.uid, { asesor: on }); await loadPeople(true); api.render(); toast(on ? "Marcado como asesor" : "Ya no figura como asesor"); }
    catch (e) { el.checked = !on; toast("No se pudo cambiar: " + (e.code || e.message), ""); }
  };
  A.aUserFormador = async (el) => {
    const data = await loadPeople();
    const u = data.users.find((x) => x.uid === el.dataset.uid);
    if (!u) return;
    const on = !u.formador; el.checked = on;
    try { await api.cloud.updateUser(u.uid, { formador: on }); await loadPeople(true); api.render(); toast(on ? "Ya puede preparar y publicar cursos" : "Ya no prepara cursos"); }
    catch (e) { el.checked = !on; toast("No se pudo cambiar: " + (e.code || e.message), ""); }
  };
  A.aUserCantor = async (el) => {
    const data = await loadPeople();
    const u = data.users.find((x) => x.uid === el.dataset.uid);
    if (!u) return;
    const on = !u.cantor; el.checked = on;
    try { await api.cloud.updateUser(u.uid, { cantor: on }); await loadPeople(true); api.render(); toast(on ? "Ya puede editar el cancionero" : "Ya no edita el cancionero"); }
    catch (e) { el.checked = !on; toast("No se pudo cambiar: " + (e.code || e.message), ""); }
  };
  A.aUserDelete = async (el) => {
    const { uid, email, name } = el.dataset;
    if (!confirm(`¿Eliminar la cuenta de ${name}?\n\nSe borran su ficha, su avance y su invitación. No podrá volver a entrar a menos que la invites de nuevo. Esto no se puede deshacer.`)) return;
    try { await api.cloud.deleteUser(uid, email); await loadPeople(true); location.hash = "#/admin/dirigentes"; toast("Cuenta eliminada"); }
    catch (e) { toast("No se pudo eliminar: " + (e.code || e.message), ""); }
  };
  A.aUserActive = async (el) => {
    const on = el.dataset.active === "1";
    if (!on && !confirm("¿Poner en pausa esta cuenta? No podrá seguir registrando avance hasta que la reactives.")) return;
    try { await api.cloud.updateUser(el.dataset.uid, { active: on }); await loadPeople(true); api.render(); toast(on ? "Cuenta reactivada" : "Cuenta en pausa"); }
    catch (e) { toast("No se pudo cambiar: " + (e.code || e.message), ""); }
  };
  document.addEventListener("input", (e) => {
    if (e.target.id !== "peopleSearch") return;
    peopleFilter = e.target.value;
    const pos = e.target.selectionStart;
    clearTimeout(e.target._t);
    e.target._t = setTimeout(async () => { keepPeople = true; await api.render(); const i = document.getElementById("peopleSearch"); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }, 250);
  });
  document.addEventListener("change", (e) => { if (e.target.id === "peopleCourse") { peopleCourse = e.target.value; keepPeople = true; api.render(); } });
  A.aPreview = () => { S.ensureDraft(); S.setPreview(true); location.hash = "#/"; };
  A.aUndo = () => { if (!undo) return; S.saveDraft(undo); undo = null; toast("Cambio deshecho"); api.render(); };
  A.aDiscard = () => {
    if (!confirm("¿Descartar todos los cambios sin publicar? Esta acción no se puede deshacer.")) return;
    S.discardDraft(); undo = null; toast("Borrador descartado"); api.render();
  };
  A.aDownload = () => {
    const d = S.ensureDraft();
    const pub = S.publishedContent();
    d.version = (Number(pub.version) || 1) + 1;
    d.updatedAt = new Date().toISOString().slice(0, 10);
    S.saveDraft(d);
    download("contenido.json", JSON.stringify(d, null, 2));
    toast("Descargado. Ahora súbelo a la carpeta data en GitHub.", "ok", 4500);
  };
  A.aImportLegacy = () => commit((d) => {
    const l = S.legacyContent();
    if (Array.isArray(l.catalog)) d.courses = l.catalog;
    if (l.materials?.cards) d.materials = l.materials;
    if (l.devotional?.cards) d.devotional = l.devotional;
    S.clearLegacy();
  }, { msg: "Contenido anterior traído al borrador" });
  A.aDropLegacy = () => { S.clearLegacy(); api.render(); };

  // Itinerarios
  A.aNewCourse = () => openEditor({
    title: "Nuevo curso", spec: "course", obj: { title: "", theme: "amanecer", description: "", para: {} },
    onSave: (o) => commit((d) => {
      const c = { id: slug(o.title) + "-" + Date.now().toString(36), title: o.title || "Curso sin título", theme: o.theme, description: o.description, para: cleanPara(o.para), phases: [blankPhase(1)] };
      renumber(c); d.courses.push(c);
      setTimeout(() => (location.hash = `#/admin/itinerarios/${d.courses.length - 1}`));
    }, { msg: "Curso creado" }),
  });
  A.aEditCourse = (el) => {
    const ci = +el.dataset.ci, c = S.ensureDraft().courses[ci];
    openEditor({ title: "Datos del curso", spec: "course", obj: { ...c, para: { ...(c.para || {}) } }, onSave: (o) => commit((d) => { Object.assign(d.courses[ci], { title: o.title, theme: o.theme, description: o.description, para: cleanPara(o.para) }); if (!d.courses[ci].para) delete d.courses[ci].para; }) });
  };
  A.aReq = (el) => {
    const r = el.dataset.r, id = el.dataset.id;
    commit((d) => {
      d.requisitos = d.requisitos || {};
      const list = new Set(d.requisitos[r] || []);
      if (list.has(id)) list.delete(id); else list.add(id);
      d.requisitos[r] = [...list];
    }, { msg: "Formación requerida actualizada. Publica los cambios para que quede firme." });
  };
  A.aHideCourse = (el) => {
    const d0 = S.getDraft() || S.publishedContent(), c = d0.courses[+el.dataset.i]; if (!c) return;
    commit((d) => { d.courses[+el.dataset.i].hidden = !c.hidden; }, { msg: c.hidden ? "Curso público: se verá al publicar los cambios" : "Curso oculto: se aplicará al publicar los cambios. Si no queda ninguno público, Formación muestra solo la Guía de agAPPe." });
  };
  // Trae al borrador las novedades del sitio (data/contenido.json) sin pisar lo editado en Gestión:
  // unidades y módulos que falten, oraciones finales, y solo las secciones que se corrigieron en el sitio.
  const SECTION_UPDATES = { "curso-dirigentes-agape": [["1.4", "La primera comunidad como modelo"], ["5.1", "Tu vida de oración"], ["5.5", "Tu compromiso"]] };
  const PHASE_TEXT_UPDATES = { "curso-dirigentes-agape": [1] }; // phaseNum con descripción e introducción nuevas
  const NEW_COURSES = ["formacion-coordinadores", "formacion-asesores", "guia-agappe"]; // cursos nuevos del sitio que se agregan enteros si faltan
  const FIRST_COURSES = ["guia-agappe"]; // estos quedan primeros en la lista
  function mergeCourseNews(d, repo) {
    let n = 0;
    for (const rc of repo.courses || []) {
      const c = d.courses.find((x) => x.id === rc.id);
      if (!c) { if (NEW_COURSES.includes(rc.id)) { if (FIRST_COURSES.includes(rc.id)) d.courses.unshift(clone(rc)); else d.courses.push(clone(rc)); n++; } continue; }
      // Curso nuevo ya traído antes: si el sitio tiene una revisión más reciente, se reemplaza entero
      // (conservando si está oculto y a quién va dirigido, que se eligen en Gestión).
      if (NEW_COURSES.includes(rc.id) && (rc.rev || 1) > (c.rev || 1)) {
        const keep = { hidden: c.hidden, para: c.para };
        d.courses[d.courses.indexOf(c)] = Object.assign(clone(rc), keep.para ? { para: keep.para } : {}, keep.hidden ? { hidden: true } : {});
        n++; continue;
      }
      if (c.description && c.description.includes("5 módulos y 21 unidades") && rc.description !== c.description) { c.description = rc.description; n++; }
      rc.phases.forEach((rp) => {
        let ph = c.phases.find((x) => x.phaseNum === rp.phaseNum);
        if (!ph) { c.phases.push(clone(rp)); n += 1 + rp.sessions.length; return; }
        if ((PHASE_TEXT_UPDATES[rc.id] || []).includes(rp.phaseNum)) for (const k of ["desc", "intro"]) if (rp[k] && ph[k] !== rp[k]) { ph[k] = rp[k]; n++; }
        rp.sessions.forEach((rs, k) => {
          const se = ph.sessions.find((x) => x.id === rs.id);
          if (!se) { ph.sessions.splice(Math.min(k, ph.sessions.length), 0, clone(rs)); n++; return; }
          if (rs.prayer && se.prayer !== rs.prayer) { se.prayer = rs.prayer; n++; }
          for (const [sid, title] of SECTION_UPDATES[rc.id] || []) {
            if (sid !== rs.id) continue;
            const rsec = rs.sections.find((x) => x.title === title), sec = (se.sections || []).find((x) => x.title === title);
            if (rsec && sec && sec.body !== rsec.body) { sec.body = rsec.body; n++; }
          }
        });
      });
    }
    return n;
  }
  A.aSyncCourse = async (el) => {
    el.disabled = true;
    try {
      const repo = await (await fetch("data/contenido.json", { cache: "no-store" })).json();
      const n = mergeCourseNews(clone(S.getDraft() || S.publishedContent()), repo);
      if (!n) { toast("Los cursos ya están al día"); el.disabled = false; return; }
      commit((d) => { mergeCourseNews(d, repo); }, { snapshot: true, msg: `${n} cambios traídos al borrador. Revísalos y publica.` });
    } catch (e) { console.warn(e); toast("No se pudieron traer las novedades", ""); el.disabled = false; }
  };
  A.aMoveCourse = (el) => commit((d) => move(d.courses, +el.dataset.i, +el.dataset.d));
  A.aDupCourse = (el) => commit((d) => {
    const c = clone(d.courses[+el.dataset.i]); c.id = slug(c.title) + "-" + Date.now().toString(36); c.title += " (copia)";
    d.courses.splice(+el.dataset.i + 1, 0, c);
  }, { msg: "Curso duplicado" });
  A.aDelCourse = (el) => {
    const c = S.ensureDraft().courses[+el.dataset.i];
    if (confirm(`¿Eliminar el curso "${c.title}" con todos sus módulos?`)) commit((d) => d.courses.splice(+el.dataset.i, 1), { snapshot: true, msg: "Curso eliminado" });
  };

  // Módulos
  A.aAddPhase = (el) => commit((d) => { const c = d.courses[+el.dataset.ci]; c.phases.push(blankPhase(c.phases.length)); renumber(c); }, { msg: "Módulo agregado" });
  A.aEditPhase = (el) => {
    const ci = +el.dataset.ci, pi = +el.dataset.pi, p = S.ensureDraft().courses[ci].phases[pi];
    openEditor({ title: `Módulo ${p.phaseNum}`, spec: "phase", obj: { title: p.title, desc: p.desc, intro: p.intro || "" }, onSave: (o) => commit((d) => Object.assign(d.courses[ci].phases[pi], { title: o.title, desc: o.desc, intro: o.intro })) });
  };
  A.aMovePhase = (el) => commit((d) => { const c = d.courses[+el.dataset.ci]; move(c.phases, +el.dataset.pi, +el.dataset.d); renumber(c); });
  A.aDelPhase = (el) => {
    const p = S.ensureDraft().courses[+el.dataset.ci].phases[+el.dataset.pi];
    if (confirm(`¿Eliminar el módulo "${p.title}" con sus ${p.sessions.length} unidades y su evaluación?`))
      commit((d) => { const c = d.courses[+el.dataset.ci]; c.phases.splice(+el.dataset.pi, 1); renumber(c); }, { snapshot: true, msg: "Módulo eliminado" });
  };

  // Unidades
  const sessionEditor = (ci, pi, si, isNew) => {
    const p = S.ensureDraft().courses[ci].phases[pi];
    const s = isNew ? blankSession() : normalizeUnit(p.sessions[si]);
    openEditor({
      title: isNew ? "Nueva unidad" : `Unidad ${s.id}`, spec: "session", obj: s,
      onSave: (o) => commit((d) => {
        const c = d.courses[ci]; o.questions = (o.questions || []).filter((x) => x.trim());
        o.sections = (o.sections || []).filter((x) => x.title.trim() || x.body.trim());
        o.church = (o.church || []).filter((x) => x.source.trim() || x.text.trim());
        o.resources = (o.resources || []).filter((x) => x.title.trim() && x.url.trim());
        if (isNew) c.phases[pi].sessions.push(o); else c.phases[pi].sessions[si] = o;
        renumber(c);
      }, { msg: isNew ? "Unidad agregada" : "Unidad guardada" }),
      onDelete: !isNew && p.sessions.length > 1 ? () => commit((d) => { const c = d.courses[ci]; c.phases[pi].sessions.splice(si, 1); renumber(c); }, { snapshot: true, msg: "Unidad eliminada" }) : null,
    });
  };
  A.aEditSession = (el) => sessionEditor(+el.dataset.ci, +el.dataset.pi, +el.dataset.si, false);
  A.aAddSession = (el) => sessionEditor(+el.dataset.ci, +el.dataset.pi, -1, true);
  A.aMoveSession = (el) => commit((d) => { const c = d.courses[+el.dataset.ci]; move(c.phases[+el.dataset.pi].sessions, +el.dataset.si, +el.dataset.d); renumber(c); });
  A.aDupSession = (el) => commit((d) => {
    const c = d.courses[+el.dataset.ci], arr = c.phases[+el.dataset.pi].sessions, s = clone(arr[+el.dataset.si]);
    s.title += " (copia)"; arr.splice(+el.dataset.si + 1, 0, s); renumber(c);
  }, { msg: "Unidad duplicada" });
  A.aDelSession = (el) => {
    const s = S.ensureDraft().courses[+el.dataset.ci].phases[+el.dataset.pi].sessions[+el.dataset.si];
    if (confirm(`¿Eliminar la unidad "${s.title}"?`))
      commit((d) => { const c = d.courses[+el.dataset.ci]; c.phases[+el.dataset.pi].sessions.splice(+el.dataset.si, 1); renumber(c); }, { snapshot: true, msg: "Unidad eliminada" });
  };

  // Evaluación
  A.aEditQuiz = (el) => {
    const ci = +el.dataset.ci, pi = +el.dataset.pi, p = S.ensureDraft().courses[ci].phases[pi];
    const quiz = p.quiz || { badge: `Evaluación módulo ${p.phaseNum}`, title: "Discernimiento", questions: [] };
    if (!quiz.questions.length) quiz.questions.push(blankQuestion());
    openEditor({
      title: `Evaluación · Módulo ${p.phaseNum}`, spec: "quiz", obj: quiz,
      onSave: (o) => {
        const bad = o.questions.findIndex((q) => !q.q.trim() || q.options.some((x) => !x.trim()));
        if (bad >= 0) { toast(`Completa la pregunta ${bad + 1} y todas sus opciones`, ""); return false; }
        o.questions.forEach((q, i) => { q.q = `${i + 1}. ${q.q.replace(/^\s*\d+\.\s*/, "").trim()}`; if (q.correct >= q.options.length) q.correct = 0; });
        commit((d) => { d.courses[ci].phases[pi].quiz = o; }, { msg: "Evaluación guardada" });
      },
    });
  };

  // Materiales / Oración
  A.aEditBox = (el) => {
    const k = el.dataset.k, b = S.ensureDraft()[k];
    openEditor({ title: "Encabezado de la sección", spec: "box", obj: { title: b.title, desc: b.desc }, onSave: (o) => commit((d) => Object.assign(d[k], o)) });
  };
  const cardEditor = (k, i, isNew) => {
    const box = S.ensureDraft()[k];
    const c = isNew ? { tag: "", title: "", type: "text", text: "", items: [] } : box.cards[i];
    openEditor({
      title: isNew ? (k === "materials" ? "Nuevo recurso" : "Nueva oración") : c.title, spec: "card", specArg: k, obj: c,
      onSave: (o) => commit((d) => {
        if (o.items) o.items = o.items.filter((x) => x.trim());
        if (isNew) d[k].cards.push(o); else d[k].cards[i] = o;
      }, { msg: "Guardado en el borrador. Para que todos lo vean, toca «Publicar ahora»." }),
      onDelete: !isNew && box.cards.length > 1 ? () => commit((d) => d[k].cards.splice(i, 1), { snapshot: true, msg: "Eliminado" }) : null,
    });
  };
  A.aAddCard = (el) => cardEditor(el.dataset.k, -1, true);
  A.aEditCard = (el) => cardEditor(el.dataset.k, +el.dataset.i, false);
  A.aMoveCard = (el) => commit((d) => move(d[el.dataset.k].cards, +el.dataset.i, +el.dataset.d));
  A.aDelCard = (el) => {
    const c = S.ensureDraft()[el.dataset.k].cards[+el.dataset.i];
    if (confirm(`¿Eliminar "${c.title}"?`)) commit((d) => d[el.dataset.k].cards.splice(+el.dataset.i, 1), { snapshot: true, msg: "Eliminado" });
  };

  // Comunidad
  A.aEditIntro = () => openEditor({ title: "Introducción", spec: "intro", obj: { intro: S.ensureDraft().about.intro }, onSave: (o) => commit((d) => { d.about.intro = o.intro; }) });
  const aboutEditor = (k, i, isNew) => {
    const arr = aboutArr(S.ensureDraft(), k);
    const blank = k === "roles" ? { key: "rol-" + Date.now().toString(36), title: "", subtitle: "", tag: "", duration: "", badge: "", responsibility: "", functions: [""] } : {};
    openEditor({
      title: isNew ? "Agregar" : (arr[i].title || "Editar"), spec: k, obj: isNew ? blank : arr[i],
      onSave: (o) => commit((d) => {
        if (o.functions) o.functions = o.functions.filter((x) => x.trim());
        const a = aboutArr(d, k); if (isNew) a.push(o); else a[i] = o;
      }, { msg: "Guardado" }),
    });
  };
  A.aAddAbout = (el) => aboutEditor(el.dataset.k, -1, true);
  A.aEditAbout = (el) => aboutEditor(el.dataset.k, +el.dataset.i, false);
  A.aMoveAbout = (el) => commit((d) => move(aboutArr(d, el.dataset.k), +el.dataset.i, +el.dataset.d));
  A.aDelAbout = (el) => {
    const x = aboutArr(S.ensureDraft(), el.dataset.k)[+el.dataset.i];
    if (confirm(`¿Eliminar "${x.title}"?`)) commit((d) => aboutArr(d, el.dataset.k).splice(+el.dataset.i, 1), { snapshot: true, msg: "Eliminado" });
  };

  // Diálogo del editor
  A.eCancel = () => { $("#editDialog").close(); };
  A.eSave = () => {
    if (!E) return;
    const r = E.onSave(E.obj);
    if (r === false) return;
    $("#editDialog").close();
  };
  A.eDelete = () => {
    if (!E?.onDelete) return;
    if (!confirm("¿Eliminar este elemento?")) return;
    const f = E.onDelete; $("#editDialog").close(); f();
  };
  A.eAdd = (el) => {
    const arr = getPath(E.obj, el.dataset.l) || (setPath(E.obj, el.dataset.l, []), getPath(E.obj, el.dataset.l));
    arr.push(el.dataset.kind === "question" ? blankQuestion()
      : el.dataset.kind === "obj" ? Object.fromEntries(el.dataset.keys.split(",").map((k) => [k, ""])) : "");
    renderEditor();
    const n = getPath(E.obj, el.dataset.l).length - 1;
    const sel = el.dataset.kind === "question" ? `[data-f="${el.dataset.l}.${n}.q"]`
      : el.dataset.kind === "obj" ? `[data-f^="${el.dataset.l}.${n}."]` : `[data-f="${el.dataset.l}.${n}"]`;
    const f = $("#editDialog .sheet-body").querySelector(sel);
    f?.focus(); f?.scrollIntoView({ block: "center" });
  };
  A.eDel = (el) => {
    const arr = getPath(E.obj, el.dataset.l), i = +el.dataset.i;
    arr.splice(i, 1);
    // Ajustar la respuesta correcta al quitar una opción
    const m = el.dataset.l.match(/^questions\.(\d+)\.options$/);
    if (m) { const q = E.obj.questions[+m[1]]; if (q.correct === i) q.correct = 0; else if (q.correct > i) q.correct--; }
    renderEditor();
  };
  A.eMove = (el) => { move(getPath(E.obj, el.dataset.l), +el.dataset.i, +el.dataset.d); renderEditor(); };

  $("#editDialog").addEventListener("close", () => { E = null; });
  $("#editDialog").addEventListener("cancel", (e) => { if (E && !confirm("¿Cerrar sin guardar?")) e.preventDefault(); });
}
