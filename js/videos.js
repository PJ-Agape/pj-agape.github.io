// Videos con personajes (pestaña del Estudio de difusión). Solo para el equipo y para quienes
// un administrador habilita (users.difusor). Se arma un guion por escenas y líneas, se mira en
// la vista previa y se exporta un MP4 en el teléfono o el computador. Los audios de las voces
// (por ejemplo, de ElevenLabs) quedan solo en este dispositivo: el guion se guarda en la nube.

import * as M from "./videos-motor.js";
import * as cloud from "./cloud.js";
import { esc, icon, toast, clone, slug } from "./util.js";

const DRAFT = "agape_video_borrador";
const LOGO_URL = new URL("../icons/logo-320.webp", import.meta.url).href;
const S = { list: [], id: "", p: null, dirty: false, t: 0, playing: false, root: null, unsub: null, logo: null, ac: null, raf: 0, busy: false, out: null };
const audios = new Map(); // aid → { dur, env, buffer, name }

const $ = (s) => S.root && S.root.querySelector(s);
const canDelete = () => cloud.state().isStaff;
const newAid = () => Math.random().toString(36).slice(2, 10);
const T = () => M.timeline(S.p, (ln) => (ln.aid && audios.get(ln.aid)) || null);
const fmtT = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const sec = (s) => s.toFixed(1).replace(".", ",") + " s";

function blank() {
  return { title: "Video nuevo", fmt: "vertical", scenes: [{ title: "", sub: "", cast: ["cami"], firu: "sentado", lines: [{ who: "cami", text: "", pose: "reposo", gesto: "" }] }],
    cierre: { on: true, title: "", items: ["", "", ""], pie: "Aprende más en *agAPPe*", web: "pj-agape.github.io" } };
}
function loadDraft() { try { const d = JSON.parse(localStorage.getItem(DRAFT) || "null"); if (d && d.p) { S.p = d.p; S.id = d.id || ""; S.dirty = !!d.dirty; return true; } } catch {} return false; }
let draftTimer = 0;
function saveDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(() => { try { localStorage.setItem(DRAFT, JSON.stringify({ p: S.p, id: S.id, dirty: S.dirty })); } catch {} }, 400); }
function touched() { S.dirty = true; S.out = null; saveDraft(); }

// ---------------------------------------------------------------------------
// Montaje
// ---------------------------------------------------------------------------
export async function mount(root) {
  if (!root) return;
  S.root = root;
  if (!cloud.state().canVideos) { root.innerHTML = `<div class="card"><p>Los videos con personajes los arma el equipo de difusión. Si quieres ayudar, pídele a un administrador que te habilite.</p></div>`; return; }
  if (!S.p && !loadDraft()) S.p = clone(M.EJEMPLO);
  if (S.t < 0.6) S.t = 1.2; // el primer instante es blanco (fundido de entrada)
  render();
  if (!S.unsub) S.unsub = cloud.watchVideos((rows) => { S.list = rows.sort((a, b) => String(a.title).localeCompare(String(b.title))); const pk = $("#vidPick"); if (pk) pk.outerHTML = pickHTML(); }, () => {});
  if (!root.dataset.wired) { wire(root); root.dataset.wired = "1"; }
  await Promise.all(["800 80px Bricolage", "700 40px Jakarta", "800 40px Jakarta"].map((f) => document.fonts.load(f).catch(() => {})));
  if (!S.logo) S.logo = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = LOGO_URL; });
  paint();
}

function pickHTML() {
  return `<select class="input" id="vidPick" aria-label="Elegir un video">
    ${!S.id ? `<option value="" selected>${esc(S.p.title || "Borrador")} (sin guardar)</option>` : ""}
    ${S.list.map((v) => `<option value="${esc(v.id)}" ${v.id === S.id ? "selected" : ""}>${esc(v.title)}${v.id === S.id && S.dirty ? " (sin guardar)" : ""}</option>`).join("")}
    <option value="__ejemplo">Ejemplo: Comunicar también es cuidar</option>
    <option value="__nuevo">Empezar uno en blanco</option></select>`;
}

function render() {
  const p = S.p, tl = T();
  S.t = Math.min(S.t, tl.dur);
  const opt = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`).join("");
  const tByLine = new Map(tl.lines.map((l) => [l.key, l]));
  S.root.innerHTML = `<div class="dif-grid vid">
  <div class="vid-prev">
    <div class="dif-prev ${p.fmt === "vertical" ? "tall" : ""}"><canvas id="vidCanvas" aria-label="Vista previa del video"></canvas></div>
    <div class="vid-ctrl">
      <button type="button" class="btn btn-sm btn-primary" data-v="play">${S.playing ? "Pausa" : "Reproducir"}</button>
      <input type="range" id="vidSeek" min="0" max="${tl.dur.toFixed(2)}" step="0.01" value="${S.t.toFixed(2)}" aria-label="Avanzar o retroceder">
      <span class="xs muted" id="vidTime">${fmtT(S.t)} / ${fmtT(tl.dur)}</span></div>
  </div>
  <form class="card stack vid-form" onsubmit="return false">
    <div class="row-wrap" style="gap:8px">${pickHTML()}
      <button type="button" class="btn btn-sm btn-primary" data-v="guardar">${icon("check")} Guardar</button>
      ${S.id ? `<button type="button" class="btn btn-sm btn-soft" data-v="copia">${icon("copy")} Duplicar</button>` : ""}
      ${S.id && canDelete() ? `<button type="button" class="btn btn-sm btn-ghost" data-v="borrar">${icon("trash")} Borrar</button>` : ""}</div>
    <div class="field"><label>Título del video</label><input class="input" data-f="title" maxlength="80" value="${esc(p.title)}"></div>
    <div class="field"><label>Formato</label><div class="seg">${Object.entries(M.FORMATOS).map(([k, [, , l]]) => `<label><input type="radio" name="vidFmt" value="${k}" ${p.fmt === k ? "checked" : ""}><span>${esc(l)}</span></label>`).join("")}</div></div>
    ${p.scenes.map((sc, si) => `<fieldset class="vid-scene">
      <legend>Escena ${si + 1}</legend>
      <div class="row-wrap vid-tools">
        <button type="button" class="btn btn-sm btn-ghost" data-v="sUp" data-s="${si}" ${si ? "" : "disabled"} aria-label="Subir la escena">${icon("up")}</button>
        <button type="button" class="btn btn-sm btn-ghost" data-v="sDel" data-s="${si}" ${p.scenes.length > 1 ? "" : "disabled"}>${icon("trash")} Quitar escena</button>
        <button type="button" class="btn btn-sm btn-ghost" data-v="ver" data-s="${si}">${icon("eye")} Ver</button></div>
      <div class="field"><label>Título en pantalla</label><input class="input" data-f="s.${si}.title" maxlength="40" value="${esc(sc.title)}"></div>
      <div class="field"><label>Subtítulo <span class="muted">(opcional)</span></label><input class="input" data-f="s.${si}.sub" maxlength="70" value="${esc(sc.sub)}"></div>
      <div class="field"><label>En escena</label><div class="row-wrap">${M.ORDEN.map((c) => `<label class="chip ${(sc.cast || []).includes(c) ? "accent" : ""}" style="cursor:pointer;padding:6px 10px"><input type="checkbox" data-cast="${si}" value="${c}" ${(sc.cast || []).includes(c) ? "checked" : ""}> ${M.ELENCO[c]}</label>`).join("")}</div></div>
      ${(sc.cast || []).includes("firu") ? `<div class="field"><label>Firu</label><select class="input" data-f="s.${si}.firu">${opt(M.FIRU, sc.firu || "sentado")}</select></div>` : ""}
      ${(sc.lines || []).map((ln, li) => {
        const a = ln.aid && audios.get(ln.aid), x = tByLine.get(`${si}-${li}`);
        const nw = String(ln.text || "").trim().split(/\s+/).filter(Boolean).length;
        const rapido = a && nw / a.dur > 2.2;
        return `<div class="vid-line">
        <div class="row-wrap" style="gap:6px">
          <select class="input vid-who" data-f="s.${si}.l.${li}.who" aria-label="Quién habla">${opt(M.HABLAN.map((c) => [c, M.ELENCO[c]]), ln.who)}</select>
          <select class="input" data-f="s.${si}.l.${li}.pose" aria-label="Pose">${opt(M.POSES[ln.who] || [], ln.pose || M.BASE[ln.who])}</select>
          ${ln.who === "beto" ? `<label class="chip" style="cursor:pointer;padding:6px 10px"><input type="checkbox" data-gesto="${si}.${li}" ${ln.gesto === "esceptico" ? "checked" : ""}> Ceja escéptica</label>` : ""}</div>
        <textarea class="input" rows="2" maxlength="140" data-f="s.${si}.l.${li}.text" placeholder="Una idea por globo, frases naturales">${esc(ln.text)}</textarea>
        <div class="row-wrap vid-tools">
          <label class="btn btn-sm btn-soft" style="cursor:pointer">${icon("ul")} ${a ? "Cambiar voz" : "Voz (mp3 o wav)"}<input type="file" accept="audio/*" data-audio="${si}.${li}" hidden></label>
          ${a ? `<span class="xs">${esc(a.name)} · ${sec(a.dur)}</span><button type="button" class="btn btn-sm btn-ghost" data-v="aDel" data-s="${si}" data-l="${li}">Quitar voz</button>` : x ? `<span class="xs muted">Sin voz · ${sec(x.dur)} en pantalla</span>` : ""}
          <span class="spacer"></span>
          <button type="button" class="btn btn-sm btn-ghost" data-v="lUp" data-s="${si}" data-l="${li}" ${li ? "" : "disabled"} aria-label="Subir la línea">${icon("up")}</button>
          <button type="button" class="btn btn-sm btn-ghost" data-v="lDel" data-s="${si}" data-l="${li}" aria-label="Quitar la línea">${icon("trash")}</button></div>
        ${rapido ? `<p class="xs" style="color:var(--co,#c2410c)">La voz va a más de 2 palabras por segundo: conviene acortar el texto o generar el audio más pausado.</p>` : ""}
      </div>`; }).join("")}
      <button type="button" class="btn btn-sm btn-soft" data-v="lAdd" data-s="${si}">${icon("plus")} Agregar línea</button>
    </fieldset>`).join("")}
    <button type="button" class="btn btn-soft" data-v="sAdd">${icon("plus")} Agregar escena</button>
    <fieldset class="vid-scene"><legend>Cierre</legend>
      <label class="chip" style="cursor:pointer;padding:6px 10px"><input type="checkbox" data-cierre ${p.cierre.on !== false ? "checked" : ""}> Terminar con una tarjeta de cierre</label>
      ${p.cierre.on !== false ? `<div class="field"><label>Frase <span class="muted">(lo que va entre *asteriscos* va en naranjo)</span></label><input class="input" data-f="c.title" maxlength="60" value="${esc(p.cierre.title)}"></div>
      <div class="field"><label>Hasta tres puntos</label>${[0, 1, 2].map((i) => `<input class="input" style="margin-top:6px" data-f="c.items.${i}" maxlength="40" value="${esc((p.cierre.items || [])[i] || "")}">`).join("")}</div>
      <div class="field"><label>Invitación</label><input class="input" data-f="c.pie" maxlength="60" value="${esc(p.cierre.pie)}"></div>
      <div class="field"><label>Dirección</label><input class="input" data-f="c.web" maxlength="40" value="${esc(p.cierre.web)}"></div>` : ""}
    </fieldset>
    <div class="card vid-export">
      <h3>Crear el video</h3>
      <p class="small muted">Se arma en este dispositivo y queda en formato MP4. En un computador es más rápido. Las voces que subiste solo están en este dispositivo: si abres el guion en otro, hay que volver a subirlas.</p>
      <p class="small"><b>Antes de publicar:</b> las ilustraciones y la animación están hechas con herramientas de inteligencia artificial, y las voces de ElevenLabs también. Marca el video con la etiqueta de IA de cada red y usa el enlace marcado de la app en el texto de la publicación.</p>
      <div class="row-wrap" style="gap:8px;margin-top:8px">
        <button type="button" class="btn btn-primary" data-v="exportar" ${S.busy ? "disabled" : ""}>${icon("sparkle")} Crear MP4</button>
        ${S.out ? `<button type="button" class="btn btn-soft" data-v="bajar">${icon("dl")} Descargar</button><button type="button" class="btn btn-soft" data-v="compartir">${icon("send")} Compartir</button>` : ""}</div>
      <div id="vidProg" class="xs muted" style="margin-top:8px" aria-live="polite"></div>
    </div>
  </form></div>`;
}

// ---------------------------------------------------------------------------
// Vista previa
// ---------------------------------------------------------------------------
function paint() {
  const cv = $("#vidCanvas"); if (!cv) return;
  const [W, H] = M.FORMATOS[S.p.fmt] || M.FORMATOS.vertical;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const tl = T();
  M.draw(cv.getContext("2d"), W, H, S.t, S.p, tl, { logo: S.logo });
  const sk = $("#vidSeek"); if (sk) { sk.max = tl.dur.toFixed(2); if (document.activeElement !== sk) sk.value = S.t.toFixed(2); }
  const tm = $("#vidTime"); if (tm) tm.textContent = `${fmtT(S.t)} / ${fmtT(tl.dur)}`;
}
function stopAudio() { if (S.ac) { S.ac.close().catch(() => {}); S.ac = null; } }
function play() {
  const tl = T();
  if (S.t >= tl.dur - 0.05) S.t = 0;
  S.playing = true; stopAudio();
  try {
    const ac = (S.ac = new AudioContext());
    for (const ln of tl.lines) {
      if (!ln.audio || !ln.audio.buffer) continue;
      const off = S.t - (ln.t0 + 0.05);
      if (off >= ln.audio.dur) continue;
      const src = ac.createBufferSource(); src.buffer = ln.audio.buffer; src.connect(ac.destination);
      src.start(ac.currentTime + Math.max(0, -off), Math.max(0, off));
    }
  } catch {}
  const start = performance.now() - S.t * 1000;
  const step = () => {
    if (!S.playing) return;
    S.t = (performance.now() - start) / 1000;
    if (S.t >= tl.dur) { S.t = tl.dur; pause(); }
    paint();
    S.raf = requestAnimationFrame(step);
  };
  S.raf = requestAnimationFrame(step);
  const b = $('[data-v="play"]'); if (b) b.textContent = "Pausa";
}
function pause() { S.playing = false; cancelAnimationFrame(S.raf); stopAudio(); const b = $('[data-v="play"]'); if (b) b.textContent = "Reproducir"; }

// ---------------------------------------------------------------------------
// Edición
// ---------------------------------------------------------------------------
function setField(path, v) {
  const k = path.split(".");
  if (k[0] === "title") S.p.title = v;
  else if (k[0] === "c") { if (k[1] === "items") { S.p.cierre.items = S.p.cierre.items || []; S.p.cierre.items[+k[2]] = v; } else S.p.cierre[k[1]] = v; }
  else if (k[0] === "s") {
    const sc = S.p.scenes[+k[1]];
    if (k[2] === "l") {
      const ln = sc.lines[+k[3]];
      ln[k[4]] = v;
      if (k[4] === "who") { ln.pose = M.BASE[v]; if (v !== "beto") ln.gesto = ""; return true; }
    } else sc[k[2]] = v;
  }
  return false;
}
function reloadOf(p, id) {
  pause();
  S.p = clone(p); S.id = id || ""; S.dirty = false; S.t = 1.2; S.out = null;
  for (const k of ["updatedBy", "updatedAt", "id"]) delete S.p[k];
  S.p.cierre = S.p.cierre || { on: false }; S.p.scenes = S.p.scenes || [];
  saveDraft(); render(); paint();
}
function clean(p) {
  const s = (v, n) => String(v || "").slice(0, n);
  return {
    title: s(p.title, 80).trim() || "Video sin título", fmt: M.FORMATOS[p.fmt] ? p.fmt : "vertical",
    scenes: p.scenes.slice(0, 20).map((sc) => ({ title: s(sc.title, 40), sub: s(sc.sub, 70), cast: (sc.cast || []).filter((c) => M.ORDEN.includes(c)), firu: sc.firu || "sentado",
      lines: (sc.lines || []).slice(0, 30).map((l) => ({ who: l.who, text: s(l.text, 140), pose: l.pose || "", gesto: l.gesto || "", aid: l.aid || "" })) })),
    cierre: { on: p.cierre.on !== false, title: s(p.cierre.title, 60), items: (p.cierre.items || []).slice(0, 3).map((x) => s(x, 40)), pie: s(p.cierre.pie, 60), web: s(p.cierre.web, 40) },
  };
}
async function attachAudio(si, li, file) {
  try {
    const ac = new AudioContext();
    const buffer = await ac.decodeAudioData(await file.arrayBuffer()); ac.close().catch(() => {});
    const ln = S.p.scenes[si].lines[li];
    ln.aid = ln.aid || newAid();
    audios.set(ln.aid, { dur: buffer.duration, env: M.envelope(buffer), buffer, name: file.name });
    touched(); render(); paint();
    toast("Voz agregada: la boca sigue el audio");
  } catch { toast("No pude leer ese audio. Prueba con mp3 o wav.", "error"); }
}

function wire(root) {
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-v]"); if (!b || !root.contains(b)) return;
    const v = b.dataset.v, si = +b.dataset.s, li = +b.dataset.l, sc = S.p.scenes[si];
    if (v === "play") return S.playing ? pause() : play();
    if (v === "ver") { pause(); S.t = T().scenes[si].t0 + 0.05; return paint(); }
    if (v === "exportar") return exportar();
    if (v === "bajar") return S.out && save(S.out.blob, S.out.name);
    if (v === "compartir") return S.out && share(S.out.blob, S.out.name);
    if (v === "guardar") return guardar();
    if (v === "copia") { S.id = ""; S.p.title = S.p.title + " (copia)"; touched(); render(); paint(); return toast("Es una copia: guárdala para no perderla"); }
    if (v === "borrar") {
      if (!confirm(`¿Borrar el guion «${S.p.title}»? No se puede deshacer.`)) return;
      try { await cloud.deleteVideo(S.id); toast("Guion borrado"); reloadOf(M.EJEMPLO, ""); } catch (er) { toast("No se pudo borrar: " + (er.code || er.message), ""); }
      return;
    }
    if (v === "sAdd") S.p.scenes.push({ title: "", sub: "", cast: [...(S.p.scenes.at(-1)?.cast || ["cami"])], firu: "sentado", lines: [{ who: "cami", text: "", pose: "reposo", gesto: "" }] });
    else if (v === "sDel") { if (!confirm("¿Quitar esta escena y sus líneas?")) return; S.p.scenes.splice(si, 1); }
    else if (v === "sUp") S.p.scenes.splice(si - 1, 0, S.p.scenes.splice(si, 1)[0]);
    else if (v === "lAdd") { const last = sc.lines.at(-1); const who = last ? last.who : "cami"; sc.lines.push({ who, text: "", pose: M.BASE[who], gesto: "" }); }
    else if (v === "lDel") sc.lines.splice(li, 1);
    else if (v === "lUp") sc.lines.splice(li - 1, 0, sc.lines.splice(li, 1)[0]);
    else if (v === "aDel") { const ln = sc.lines[li]; if (ln.aid) audios.delete(ln.aid); }
    else return;
    touched(); render(); paint();
  });
  root.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (e.target.id === "vidSeek") { pause(); S.t = +e.target.value; return paint(); }
    if (!f || e.target.tagName === "SELECT") return;
    setField(f, e.target.value); touched(); paint();
  });
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "vidPick") {
      const v = t.value;
      if (S.dirty && !confirm("Hay cambios sin guardar en este guion. ¿Cambiar de todos modos?")) { t.value = S.id; return; }
      if (v === "__ejemplo") return reloadOf(M.EJEMPLO, "");
      if (v === "__nuevo") return reloadOf(blank(), "");
      const row = S.list.find((x) => x.id === v); if (row) reloadOf(row, row.id);
      return;
    }
    if (t.name === "vidFmt") { S.p.fmt = t.value; touched(); render(); return paint(); }
    if (t.dataset.audio && t.files[0]) { const [si, li] = t.dataset.audio.split(".").map(Number); return attachAudio(si, li, t.files[0]); }
    if (t.dataset.cast != null) {
      const sc = S.p.scenes[+t.dataset.cast]; const set = new Set(sc.cast || []);
      t.checked ? set.add(t.value) : set.delete(t.value); sc.cast = M.ORDEN.filter((c) => set.has(c));
      touched(); render(); return paint();
    }
    if (t.dataset.gesto) { const [si, li] = t.dataset.gesto.split(".").map(Number); S.p.scenes[si].lines[li].gesto = t.checked ? "esceptico" : ""; touched(); return paint(); }
    if (t.dataset.cierre != null) { S.p.cierre.on = t.checked; touched(); render(); return paint(); }
    if (t.tagName === "SELECT" && t.dataset.f) { const again = setField(t.dataset.f, t.value); touched(); if (again) render(); paint(); }
  });
}

async function guardar() {
  const data = clean(S.p);
  try {
    const id = await cloud.saveVideo(S.id || null, data);
    S.id = id; S.dirty = false; S.p.title = data.title; saveDraft();
    const pk = $("#vidPick"); if (pk) pk.outerHTML = pickHTML();
    toast("Guion guardado");
  } catch (er) { toast("No se pudo guardar: " + (er.code || er.message), ""); }
}

// ---------------------------------------------------------------------------
// Exportar a MP4
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function progress(txt) { const el = $("#vidProg"); if (el) el.textContent = txt; }
async function mixAudio(tl, rate = 48000) {
  const withAudio = tl.lines.filter((l) => l.audio && l.audio.buffer);
  if (!withAudio.length) return null;
  const oc = new OfflineAudioContext(2, Math.ceil(tl.dur * rate), rate);
  for (const ln of withAudio) { const s = oc.createBufferSource(); s.buffer = ln.audio.buffer; s.connect(oc.destination); s.start(ln.t0 + 0.05); }
  return oc.startRendering();
}
async function exportar() {
  if (S.busy) return;
  pause(); S.busy = true; S.out = null;
  const btn = $('[data-v="exportar"]'); if (btn) btn.disabled = true;
  const [W, H] = M.FORMATOS[S.p.fmt] || M.FORMATOS.vertical;
  const tl = T(), cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  try {
    progress("Preparando…");
    const mix = await mixAudio(tl);
    let blob = null;
    if ("VideoEncoder" in window) blob = await viaWebCodecs(cv, ctx, W, H, tl, mix);
    if (!blob) blob = await viaRecorder(cv, ctx, W, H, tl, mix);
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    S.out = { blob, name: `${slug(S.p.title) || "video"}-${S.p.fmt}.${ext}` };
    render(); paint();
    progress(ext === "mp4" ? `Listo: ${(blob.size / 1048576).toFixed(1).replace(".", ",")} MB, ${fmtT(tl.dur)}.` : "Listo. Este navegador lo dejó en formato WebM: Chrome en computador lo deja en MP4.");
  } catch (er) {
    console.warn("Exportar video:", er);
    progress("No se pudo crear el video: " + (er.message || er));
  } finally { S.busy = false; const b = $('[data-v="exportar"]'); if (b) b.disabled = false; }
}
async function viaWebCodecs(cv, ctx, W, H, tl, mix) {
  let vcfg = null;
  for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42e028"]) {
    const c = { codec, width: W, height: H, bitrate: 3_500_000, framerate: M.FPS };
    try { if ((await VideoEncoder.isConfigSupported(c)).supported) { vcfg = c; break; } } catch {}
  }
  if (!vcfg) return null;
  let acfg = null, amux = null;
  if (mix) {
    if (!("AudioEncoder" in window)) return null;
    for (const [codec, m] of [["mp4a.40.2", "aac"], ["opus", "opus"]]) {
      const c = { codec, sampleRate: mix.sampleRate, numberOfChannels: 2, bitrate: 128000 };
      try { if ((await AudioEncoder.isConfigSupported(c)).supported) { acfg = c; amux = m; break; } } catch {}
    }
    if (!acfg) return null; // sin codificador de audio: se graba en tiempo real con la voz
  }
  const { Muxer, ArrayBufferTarget } = await import("./vendor/mp4-muxer.mjs");
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, fastStart: "in-memory", firstTimestampBehavior: "offset", video: { codec: "avc", width: W, height: H, frameRate: M.FPS },
    ...(acfg ? { audio: { codec: amux, numberOfChannels: 2, sampleRate: mix.sampleRate } } : {}) });
  let fail = null;
  const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { fail = e; } });
  ve.configure(vcfg);
  const total = Math.ceil(tl.dur * M.FPS);
  for (let i = 0; i < total; i++) {
    if (fail) throw fail;
    M.draw(ctx, W, H, i / M.FPS, S.p, tl, { logo: S.logo });
    const fr = new VideoFrame(cv, { timestamp: Math.round((i * 1e6) / M.FPS), duration: Math.round(1e6 / M.FPS) });
    ve.encode(fr, { keyFrame: i % (M.FPS * 2) === 0 }); fr.close();
    while (ve.encodeQueueSize > 6) await sleep(4);
    if (i % 15 === 0) { progress(`Creando el video… ${Math.round((i / total) * 100)} %`); await sleep(0); }
  }
  await ve.flush(); ve.close();
  if (acfg) {
    progress("Agregando las voces…");
    const ae = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { fail = e; } });
    ae.configure(acfg);
    const n = mix.length, rate = mix.sampleRate, c0 = mix.getChannelData(0), c1 = mix.numberOfChannels > 1 ? mix.getChannelData(1) : c0, step = 4800;
    for (let o = 0; o < n; o += step) {
      const len = Math.min(step, n - o), data = new Float32Array(len * 2);
      data.set(c0.subarray(o, o + len), 0); data.set(c1.subarray(o, o + len), len);
      const ad = new AudioData({ format: "f32-planar", sampleRate: rate, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round((o * 1e6) / rate), data });
      ae.encode(ad); ad.close();
      while (ae.encodeQueueSize > 20) await sleep(2);
    }
    await ae.flush(); ae.close();
    if (fail) throw fail;
  }
  muxer.finalize();
  return new Blob([target.buffer], { type: "video/mp4" });
}
// Respaldo para navegadores sin WebCodecs: graba la vista en tiempo real (hay que dejar la pestaña abierta).
async function viaRecorder(cv, ctx, W, H, tl, mix) {
  const mime = ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error("este navegador no puede grabar video. Prueba con Chrome o Edge en un computador.");
  M.draw(ctx, W, H, 0, S.p, tl, { logo: S.logo });
  const stream = cv.captureStream(M.FPS);
  let ac = null, src = null;
  if (mix) { ac = new AudioContext({ sampleRate: mix.sampleRate }); const dst = ac.createMediaStreamDestination(); src = ac.createBufferSource(); src.buffer = mix; src.connect(dst); stream.addTrack(dst.stream.getAudioTracks()[0]); }
  const chunks = [], rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => { rec.onstop = r; });
  rec.start(500); if (src) src.start();
  const t0 = performance.now();
  await new Promise((ok) => {
    const step = () => {
      const t = (performance.now() - t0) / 1000;
      M.draw(ctx, W, H, Math.min(t, tl.dur), S.p, tl, { logo: S.logo });
      progress(`Grabando en tiempo real (deja esta pestaña abierta)… ${Math.round((t / tl.dur) * 100)} %`);
      if (t >= tl.dur) return ok();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  rec.stop(); await done; if (ac) ac.close().catch(() => {});
  return new Blob(chunks, { type: mime.split(";")[0] });
}
function save(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function share(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  save(blob, name); toast("Video descargado");
}
// Al salir del Estudio se detiene la reproducción.
export function leave() { pause(); }
