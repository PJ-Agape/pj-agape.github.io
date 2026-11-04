// Capa de datos. Hoy guarda todo en este dispositivo (localStorage) y lee el
// contenido publicado desde data/contenido.json. Cuando se conecte una base de
// datos, solo este archivo tendrá que cambiar.

import { CONFIG } from "./config.js";
import { clone } from "./util.js";

const K = {
  profile: "agape_candidate",
  progress: "agape_progress_v2",
  oldProgress: "agape_all_progress",
  activeCourse: "agape_active_course_id",
  draft: "agape_draft_content",
  adminHash: "agape_admin_hash",
  oldAdminPin: "agape_admin_pin",
  mode: "agape_color_mode",
  cache: "agape_content_cache",
  notes: "agape_notes_v1",
  owner: "agape_local_owner",
};

// Aviso a la nube cuando cambia el avance o el cuaderno (lo registra cloud.js).
let syncHandler = null;
export const setSync = (f) => { syncHandler = f; };
const synced = (kind) => { if (syncHandler) syncHandler(kind); };

const read = (k, fallback = null) => {
  try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
  catch { return fallback; }
};
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const del = (k) => { try { localStorage.removeItem(k); } catch {} };

// ---------------- Contenido ----------------
let published = null;

// El archivo del sitio se empieza a pedir apenas abre la app, en paralelo con la conexión a la nube.
let fileP = null;
const fetchFile = () => fetch(CONFIG.contentUrl, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
export function prefetchContent() { fileP = fetchFile(); }
// Si este teléfono ya tiene una copia guardada, la app la muestra de inmediato y lo nuevo llega por detrás.
export function quickStart() { const c = read(K.cache); if (!okContent(c)) return false; published = c; return true; }
export const current = () => published;
export async function loadContent(fromCloud) {
  // Hay tres fuentes: lo publicado desde Gestión (nube), data/contenido.json (el sitio) y la última copia
  // que este dispositivo ya vio. Gana la más nueva: si la nube tarda o responde con una copia vieja,
  // el teléfono no vuelve a una versión anterior (antes caía al archivo del sitio y «perdía» lo publicado).
  const [c, f] = await Promise.all([
    fromCloud ? fromCloud().catch(() => null) : null,
    fileP || fetchFile(),
  ]);
  fileP = null;
  const n = newest([c, f, read(K.cache)]);
  if (n && (!published || isNewer(n, published))) published = n; // si no hay nada más nuevo, se mantiene lo que ya se muestra
  if (!published) throw new Error("Sin contenido");
  write(K.cache, published);
  return published;
}
const okContent = (x) => !!(x && Array.isArray(x.courses));
// Fecha completa (las publicaciones antiguas guardaban solo el día) y, si empatan, el número de versión.
const stamp = (x) => [Date.parse(x.updatedAt || "") || 0, Number(x.version) || 0];
const isNewer = (a, b) => { const [ta, va] = stamp(a), [tb, vb] = stamp(b); return ta > tb || (ta === tb && va > vb); };
function newest(list) { return list.filter(okContent).reduce((best, x) => (!best || isNewer(x, best) ? x : best), null); }
// Llega contenido de la nube después de abrir la app: se usa solo si es más nuevo que el que se está mostrando.
export function adoptIfNewer(c) {
  if (!okContent(c) || (published && !isNewer(c, published))) return false;
  published = c; write(K.cache, c); return true;
}

export const isPreview = () => sessionStorage.getItem("agape_preview") === "1" && !!read(K.draft);
export function setPreview(on) {
  if (on) sessionStorage.setItem("agape_preview", "1");
  else sessionStorage.removeItem("agape_preview");
}

// Contenido que ven los dirigentes (o el borrador, si el admin está en vista previa).
// Cada curso puede estar oculto (Gestión → Cursos → «Oculto») o dirigido a ciertos roles («Dirigido a»):
// la regla la pone app.js según la cuenta. Los administradores ven todos.
export const PARA = [["asesor", "Asesores"], ["coordinador", "Coordinadores"], ["dirigente", "Dirigentes (incluye animadores)"], ["aspirante", "Aspirantes"]];
export const paraDe = (c) => (c && c.para ? PARA.map(([k]) => k).filter((k) => c.para[k]) : []);
let courseRule = () => true, filtered = null, filteredFrom = null, filteredKey = "";
export const setCourseRule = (fn) => { courseRule = fn; filtered = null; };
export const setHiddenCourseRule = (fn) => setCourseRule((c) => fn() || !c.hidden); // compatibilidad
// Cursos de la comunidad (colección «cursos»): se suman a los del contenido publicado.
// Si alguno repite el id de un curso oficial, manda el oficial.
let extra = read("agape_cursos_extra") || [], extraKey = "", merged = null, mergedFrom = null;
export function setExtraCourses(list) {
  const clean = (list || []).filter((c) => c && c.id && Array.isArray(c.phases));
  const key = JSON.stringify(clean);
  if (key === extraKey) return false;
  extra = clean; extraKey = key; merged = null; filtered = null; write("agape_cursos_extra", clean);
  return true;
}
export const extraCourses = () => extra;
function withExtra(c) {
  if (!c || !Array.isArray(c.courses) || !extra.length) return c;
  if (mergedFrom === c && merged) return merged;
  const ids = new Set(c.courses.map((x) => x.id));
  merged = { ...c, courses: [...c.courses, ...extra.filter((x) => !ids.has(x.id)).map((x) => ({ ...x, comunidad: true }))] };
  mergedFrom = c; return merged;
}
export function content() {
  const c = withExtra(isPreview() ? read(K.draft) : published);
  if (!c || !Array.isArray(c.courses)) return c;
  const vis = c.courses.filter((x) => courseRule(x));
  if (vis.length === c.courses.length) return c;
  const key = vis.map((x) => x.id).join("|");
  if (filteredFrom !== c || !filtered || filteredKey !== key) {
    filtered = { ...c, courses: vis.length ? vis : c.courses.filter((x) => !x.hidden).slice(0, 1) };
    if (!filtered.courses.length) filtered.courses = c.courses.slice(0, 1);
    filteredFrom = c; filteredKey = key;
  }
  return filtered;
}
export const publishedContent = () => published;
// ¿Hay algún curso que esta persona pueda ver? (si todos están ocultos, la app no muestra el curso)
export function hasVisibleCourse() {
  const c = withExtra(isPreview() ? read(K.draft) : published);
  return !!(c && Array.isArray(c.courses) && c.courses.some((x) => courseRule(x)));
}
export function setPublished(c) { published = c; write(K.cache, c); }

// Borrador del administrador
// El borrador es una copia del contenido publicado. Se guarda también una «firma» de esa versión de
// partida: así se sabe si el admin cambió algo de verdad o si el borrador solo quedó viejo porque
// después se publicó contenido nuevo (cursos, módulos o unidades). Un borrador viejo sin cambios
// propios se descarta solo; si tiene cambios y quedó viejo, se avisa antes de publicar.
const DRAFT_BASE = "agape_draft_base";
const strip = (o) => { const c = clone(o); delete c.version; delete c.updatedAt; return JSON.stringify(c); };
const sig = (o) => { const s = strip(o); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ":" + (h >>> 0).toString(36); };
function tidyDraft() {
  const d = read(K.draft);
  if (!d || !published) return d;
  const base = read(DRAFT_BASE);
  const mine = sig(d);
  // Sin cambios propios (igual a su versión de partida) o idéntico a lo publicado: no hay nada pendiente.
  if ((base && base.sig === mine) || mine === sig(published)) { del(K.draft); del(DRAFT_BASE); return null; }
  return d;
}
export const getDraft = () => tidyDraft();
export const hasDraft = () => !!tidyDraft();
export function ensureDraft() {
  let d = tidyDraft();
  if (!d) { d = clone(published); write(K.draft, d); write(DRAFT_BASE, { sig: sig(published), version: published.version || "", updatedAt: published.updatedAt || "" }); }
  return d;
}
export const saveDraft = (d) => write(K.draft, d);
export const discardDraft = () => { del(K.draft); del(DRAFT_BASE); setPreview(false); };
export function draftIsDirty() {
  return !!tidyDraft();
}
// El borrador tiene cambios, pero partió de una versión anterior a la publicada ahora
// (o es de antes de este control y no se sabe de cuál partió).
export function draftIsOutdated() {
  const d = tidyDraft();
  if (!d) return false;
  const base = read(DRAFT_BASE);
  return !base || base.sig !== sig(published);
}
// Lo que se perdería al publicar el borrador: cursos, módulos y unidades que están publicados y no en el borrador.
export function draftRemovals() {
  const d = tidyDraft();
  if (!d || !published) return [];
  const out = [];
  const t = (x) => String((x && x.title) || "").trim();
  for (const c of published.courses || []) {
    const dc = (d.courses || []).find((x) => x.id === c.id);
    if (!dc) { out.push(`Curso «${t(c)}»`); continue; }
    for (const p of c.phases || []) {
      const dp = (dc.phases || []).find((x) => t(x) === t(p));
      if (!dp) { out.push(`Módulo «${t(p)}» (${t(c)})`); continue; }
      for (const s of p.sessions || []) if (!(dp.sessions || []).some((x) => t(x) === t(s))) out.push(`Unidad «${t(s)}» (${t(p)})`);
    }
  }
  return out;
}

// Contenido editado con la versión anterior de la página (vivía solo en el navegador).
export function legacyContent() {
  const catalog = read("agape_courses_catalog");
  const materials = read("agape_global_materials");
  const devotional = read("agape_global_devotional");
  if (!catalog && !materials && !devotional) return null;
  return { catalog, materials, devotional };
}
export function clearLegacy() {
  ["agape_courses_catalog", "agape_global_materials", "agape_global_devotional"].forEach(del);
}

// ---------------- Perfil del dirigente ----------------
const DEFAULT_NAME = "Amigo de Ágape";

export function getProfile() {
  const p = read(K.profile) || {};
  if (p.name === DEFAULT_NAME) p.name = "";
  if (p.parish === "Comunidad Parroquial") p.parish = "";
  return { name: p.name || "", parish: p.parish || "", certCode: p.certCode || newCode() };
}
export function saveProfile(p) {
  const cur = getProfile();
  write(K.profile, { ...cur, ...p });
}
export const hasProfile = () => !!getProfile().name;
function newCode() {
  const code = "AGP-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  const p = read(K.profile) || {};
  p.certCode = code; write(K.profile, p);
  return code;
}

// ---------------- Itinerario activo ----------------
export function activeCourse() {
  const c = content();
  const id = read(K.activeCourse) ?? localStorage.getItem(K.activeCourse);
  return c.courses.find((x) => x.id === id) || c.courses[0];
}
export const setActiveCourse = (id) => write(K.activeCourse, id);

// ---------------- Progreso ----------------
function allProgress() {
  let p = read(K.progress);
  if (!p) {
    // Migración desde la versión anterior: { id: { completedPhases: [true, ...] } }
    p = {};
    const old = read(K.oldProgress) || {};
    for (const [id, v] of Object.entries(old)) {
      const phases = {};
      (v.completedPhases || []).forEach((done, i) => { if (done) phases[i] = true; });
      p[id] = { phases, read: {}, scores: {} };
    }
    write(K.progress, p);
  }
  return p;
}
export function progress(courseId) {
  const p = allProgress()[courseId] || {};
  return { phases: p.phases || {}, read: p.read || {}, scores: p.scores || {}, completedDate: p.completedDate || "", certCode: p.certCode || "", pos: p.pos || {}, best: p.best || {} };
}
// Mejor resultado de «Vivir la unidad» (viaja con el avance, así las estrellas se ven en todos los dispositivos)
export const getBest = (courseId, key) => progress(courseId).best[key] || null;
export function saveBest(courseId, key, r) {
  const p = progress(courseId);
  if (!p.best[key] || (r.xp || 0) >= (p.best[key].xp || 0)) { p.best[key] = { ...r, at: new Date().toISOString() }; saveProgress(courseId, p); }
}
// Dónde quedó cada persona dentro de una unidad (lámina, puntos y actividades hechas).
// Viaja con el avance a la nube, así se retoma también desde otro dispositivo.
export const getPos = (courseId, key) => progress(courseId).pos[key] || null;
export function savePos(courseId, key, data) {
  const p = progress(courseId);
  if (data) p.pos[key] = { ...data, at: new Date().toISOString() }; else delete p.pos[key];
  saveProgress(courseId, p);
}
function saveProgress(courseId, prog) {
  const all = allProgress(); all[courseId] = prog; write(K.progress, all); synced("progress");
}
export const allProgressRaw = () => allProgress();
export function setAllProgress(obj, silent) { write(K.progress, obj || {}); if (!silent) synced("progress"); }
export function toggleRead(courseId, sessionKey) {
  const p = progress(courseId);
  if (p.read[sessionKey]) delete p.read[sessionKey]; else p.read[sessionKey] = true;
  saveProgress(courseId, p);
  return !!p.read[sessionKey];
}
export function markRead(courseId, sessionKey) {
  const p = progress(courseId);
  if (!p.read[sessionKey] || p.pos[sessionKey]) { p.read[sessionKey] = true; delete p.pos[sessionKey]; saveProgress(courseId, p); }
}
export function recordQuiz(courseId, phaseIdx, right, total, passed) {
  const p = progress(courseId);
  const prev = p.scores[phaseIdx];
  if (!prev || right >= prev.right) p.scores[phaseIdx] = { right, total, date: new Date().toISOString() };
  if (passed) p.phases[phaseIdx] = true;
  saveProgress(courseId, p);
  return p;
}
export function completeCourse(courseId) {
  const p = progress(courseId);
  if (!p.completedDate) p.completedDate = new Date().toISOString();
  if (!p.certCode) p.certCode = getProfile().certCode + "-" + Math.random().toString(36).slice(2, 5).toUpperCase();
  saveProgress(courseId, p);
  return p;
}
export function resetProgress(courseId) {
  const all = allProgress(); delete all[courseId]; write(K.progress, all); synced("progress");
}

// «Ver como…»: mientras el equipo mira la app como otro perfil, todos los módulos se pueden recorrer.
let PREVIEW_OPEN = false;
export const setPreviewOpen = (v) => { PREVIEW_OPEN = !!v; };
// Estado derivado útil para las vistas
export function courseState(course) {
  const p = progress(course.id);
  // Un módulo sin evaluación se completa al leer todas sus unidades (cursos importados o en preparación).
  const phases = [];
  course.phases.forEach((ph, i) => {
    const read = ph.sessions.filter((s) => p.read[sessionKey(i, s)]).length;
    const noQuiz = !(ph.quiz && ph.quiz.questions && ph.quiz.questions.length);
    const done = !!p.phases[i] || (noQuiz && ph.sessions.length > 0 && read === ph.sessions.length);
    // En los cursos abiertos (la guía de la app) todos los módulos están abiertos desde el comienzo.
    const open = PREVIEW_OPEN || !!course.abierto || i === 0 || !!(phases[i - 1] && phases[i - 1].done);
    phases.push({ done, open, read, total: ph.sessions.length, score: p.scores[i] });
  });
  const donePhases = phases.filter((x) => x.done).length;
  const totalSessions = phases.reduce((a, x) => a + x.total, 0);
  const readSessions = phases.reduce((a, x) => a + x.read, 0);
  const pct = course.phases.length ? Math.round((donePhases / course.phases.length) * 100) : 0;
  const complete = donePhases === course.phases.length && course.phases.length > 0;
  // Siguiente paso sugerido
  let next = null;
  for (let i = 0; i < course.phases.length && !next; i++) {
    if (!phases[i].open || phases[i].done) continue;
    const s = course.phases[i].sessions.find((s) => !p.read[sessionKey(i, s)]);
    next = s ? { type: "session", phase: i, session: s } : { type: "quiz", phase: i };
  }
  return { p, phases, donePhases, totalSessions, readSessions, pct, complete, next };
}
export const sessionKey = (phaseIdx, s) => `${phaseIdx}:${s.id}`;

// ---------------- Cuaderno personal ----------------
// { courseId: { "fase:unidad": { indicePregunta: "texto" } } }
export function getNotes(courseId, key) {
  const all = read(K.notes) || {};
  return (all[courseId] && all[courseId][key]) || {};
}
export function setNote(courseId, key, qi, text) {
  const all = read(K.notes) || {};
  all[courseId] = all[courseId] || {};
  all[courseId][key] = all[courseId][key] || {};
  if (text && text.trim()) all[courseId][key][qi] = text; else delete all[courseId][key][qi];
  write(K.notes, all); synced("notes");
}
export const allNotesRaw = () => read(K.notes) || {};
export function setAllNotes(obj, silent) { write(K.notes, obj || {}); if (!silent) synced("notes"); }

// Dueño de los datos locales (en modo con cuentas) y limpieza al cerrar sesión.
export const localOwner = () => localStorage.getItem(K.owner) || "";
export const setLocalOwner = (uid) => localStorage.setItem(K.owner, uid);
export function clearUserLocal() {
  [K.progress, K.notes, K.profile, K.owner, K.oldProgress].forEach(del);
}

// ---------------- Administración ----------------
export function adminHash() {
  return read(K.adminHash) || CONFIG.defaultAdminHash;
}
export const setAdminHash = (h) => write(K.adminHash, h);
export const oldAdminPin = () => localStorage.getItem(K.oldAdminPin);
export const clearOldAdminPin = () => del(K.oldAdminPin);
export const isAdmin = () => sessionStorage.getItem("agape_admin") === "1";
export function setAdmin(on) {
  if (on) sessionStorage.setItem("agape_admin", "1");
  else { sessionStorage.removeItem("agape_admin"); setPreview(false); }
}

// ---------------- Preferencias ----------------
export const getMode = () => localStorage.getItem(K.mode) || "auto";
export const setMode = (m) => localStorage.setItem(K.mode, m);

// Descripción del curso con los números siempre al día («6 módulos y 28 unidades»),
// aunque el texto guardado tenga cifras antiguas.
export function courseDesc(c) {
  if (!c || !c.description) return "";
  const m = (c.phases || []).length, u = (c.phases || []).reduce((a, p) => a + (p.sessions || []).length, 0);
  return c.description.replace(/\b\d+\s+m[oó]dulos?\s+y\s+\d+\s+unidades?\b/i, `${m} módulo${m === 1 ? "" : "s"} y ${u} unidad${u === 1 ? "" : "es"}`);
}
