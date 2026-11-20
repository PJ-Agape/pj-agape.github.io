// Noticias: un portal breve dentro de agAPPe. Junta lo propio (Ágape y la Parroquia, que publica el equipo)
// con lo que trae el bot cada 3 horas (Iglesia, Diócesis y para jóvenes: titular, imagen y enlace a la fuente).
// Se ve sin cuenta; lo que el equipo marque como interno solo lo ven las cuentas de Ágape.

import { esc, icon, toast } from "./util.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }

const SECS = [["todo", "Todo"], ["agape", "Ágape"], ["parroquia", "Parroquia"], ["diocesis", "Diócesis"], ["iglesia", "Iglesia"], ["jovenes", "Para jóvenes"]];
const SEC = Object.fromEntries(SECS);
const PROPIAS = ["agape", "parroquia", "diocesis", "jovenes"]; // secciones donde el equipo puede publicar
const APP = "https://pj-agape.github.io/";
let sec = "todo", auto = null, propias = null, abierto = false, editando = null, fotoDraft = "";

const st = () => ctx.cloud.state();
const ms = (x) => (x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : x.createdAt && x.createdAt.seconds ? x.createdAt.seconds * 1000 : x.d ? Date.parse(x.d) : 0);
function fecha(t) {
  if (!t) return "";
  const s = (Date.now() - t) / 1000;
  if (s < 3600) return "hace un rato";
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 2 * 86400) return "ayer";
  return new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

async function cargar() {
  const [a, p] = await Promise.all([
    auto ? auto : fetch(new URL("../noticias.json", import.meta.url).href, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ctx.cloud.listNoticias(!!st().ready).catch(() => []),
  ]);
  auto = a || { items: [] };
  propias = p.map((x) => ({ ...x, propia: true, sec: x.sec, t: x.t, img: x.img, fuente: x.sec === "parroquia" ? "Parroquia San Miguel" : x.sec === "agape" ? "Ágape" : SEC[x.sec] }));
}
function todas() {
  const xs = [...(propias || []), ...((auto && auto.items) || []).map((x) => ({ ...x, auto: true }))];
  return xs.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || ms(b) - ms(a));
}

// ---------------------------------------------------------------------------
// Portal
export function view() {
  ctx.onAfterRender(async () => { if (!auto || !propias) await cargar(); pintar(); });
  const staff = st().isStaff;
  return `<header class="page-head not-head"><span class="eyebrow">lo que pasa</span><h1>Noti<em>cias</em></h1>
    <p>Lo de Ágape y la Parroquia, la Diócesis, la Iglesia y lo que sirve a los jóvenes. Breve, y con el enlace para leer más.</p></header>
  ${staff ? `<button class="btn ${abierto ? "btn-ghost" : "btn-primary"} btn-sm" data-action="notAbrir">${icon(abierto ? "x" : "plus")} ${abierto ? "Cancelar" : "Publicar una noticia"}</button>${abierto ? form() : ""}` : ""}
  <div class="not-tabs" role="tablist" aria-label="Secciones">${SECS.map(([k, l]) => `<button class="chip ${sec === k ? "accent" : ""}" role="tab" aria-selected="${sec === k}" data-action="notSec" data-s="${k}">${l}</button>`).join("")}</div>
  <div id="notList" class="not-list" aria-live="polite"><p class="muted small">Cargando noticias…</p></div>`;
}

function card(x, grande) {
  const href = x.propia ? `#/noticias/${encodeURIComponent(x.id)}` : x.u;
  const ext = !x.propia ? ` target="_blank" rel="noopener"` : "";
  return `<a class="card not-card${grande ? " grande" : ""}${x.img ? "" : " sin-img"} ns-${esc(x.sec)}" href="${esc(href)}"${ext}>
    ${x.img ? `<span class="not-img"><img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>` : ""}
    <span class="not-body">
      <span class="not-meta"><span class="not-src">${esc(x.fuente || SEC[x.sec] || "")}</span>${x.destacado ? `<span class="chip warn">Destacada</span>` : ""}${x.interno ? `<span class="chip">Solo comunidad</span>` : ""}<span class="xs muted">${fecha(ms(x))}</span></span>
      <strong class="not-t">${esc(x.t)}</strong>
      ${grande && (x.r || x.txt) ? `<span class="not-r">${esc(corto(x.r || x.txt, 150))}</span>` : ""}
      ${!x.propia ? `<span class="xs muted">Leer en ${esc(x.fuente)} ${icon("arrowR")}</span>` : ""}
    </span></a>`;
}
const corto = (s, n) => (s && s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s || "");

function pintar() {
  const box = document.getElementById("notList"); if (!box) return;
  const xs = todas().filter((x) => sec === "todo" || x.sec === sec);
  if (!xs.length) { box.innerHTML = `<div class="not-vacio"><strong>Todavía no hay noticias en ${esc(SEC[sec])}</strong><p class="muted small">Vuelve pronto: se actualizan varias veces al día.</p></div>`; return; }
  const [primera, ...resto] = xs;
  box.innerHTML = card(primera, true) + `<div class="not-grid">${resto.slice(0, 40).map((x) => card(x, false)).join("")}</div>`;
}

// ---------------------------------------------------------------------------
// Una noticia propia (#/noticias/:id)
export function viewOne(id) {
  ctx.onAfterRender(async () => {
    const el = document.getElementById("notOne"); if (!el) return;
    const x = await ctx.cloud.getNoticia(id).catch(() => null);
    if (!x) { el.innerHTML = `<div class="note">Esta noticia ya no está disponible.</div>`; return; }
    const staff = st().isStaff;
    el.innerHTML = `<article class="not-one">
      <span class="not-meta"><span class="not-src">${esc(x.sec === "parroquia" ? "Parroquia San Miguel" : SEC[x.sec] || "Ágape")}</span><span class="xs muted">${fecha(ms(x))}</span></span>
      <h1>${esc(x.t)}</h1>
      ${x.img ? `<img class="not-one-img" src="${esc(x.img)}" alt="">` : ""}
      ${String(x.txt || "").split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}
      ${x.link ? `<p><a class="btn btn-soft btn-sm" href="${esc(x.link)}" target="_blank" rel="noopener">Más información ${icon("arrowR")}</a></p>` : ""}
      <div class="row-wrap" style="gap:8px;margin-top:16px">
        <button class="btn btn-gold btn-sm" data-action="notShare" data-id="${esc(id)}">${icon("send")} Compartir por WhatsApp</button>
        ${staff ? `<button class="btn btn-ghost btn-sm" data-action="notEditar" data-id="${esc(id)}">Editar</button><button class="btn btn-ghost btn-sm" data-action="notBorrar" data-id="${esc(id)}">${icon("trash")} Borrar</button>` : ""}
      </div></article>`;
    el.dataset.t = x.t;
  });
  return `<a class="btn btn-ghost btn-sm" href="#/noticias">${icon("left")} Noticias</a><div id="notOne" class="not-one-wrap"><p class="muted small">Cargando…</p></div>`;
}

// ---------------------------------------------------------------------------
// Bloque en Hoy: las 3 más recientes (las destacadas primero)
export async function homeBlock() {
  const slot = document.getElementById("notiSlot"); if (!slot) return;
  if (!auto || !propias) await cargar().catch(() => {});
  const xs = todas().slice(0, 3);
  if (!xs.length || !slot.isConnected) return;
  slot.innerHTML = `<section class="not-home"><div class="not-home-h"><h2>Noticias</h2><a class="btn btn-ghost btn-sm" href="#/noticias">Ver todas ${icon("right")}</a></div>
    <div class="not-home-list">${xs.map((x) => card(x, false)).join("")}</div></section>`;
}

// ---------------------------------------------------------------------------
// Publicar (equipo)
function form() {
  const x = editando || {};
  return `<form class="card not-form" id="notForm">
    <label class="field"><span>Sección</span><select class="input" name="sec">${PROPIAS.map((k) => `<option value="${k}" ${(x.sec || "agape") === k ? "selected" : ""}>${SEC[k]}</option>`).join("")}</select></label>
    <label class="field"><span>Título</span><input class="input" name="t" maxlength="120" required value="${esc(x.t || "")}" placeholder="Ej: Más de 40 jóvenes en la Misión de Verano"></label>
    <label class="field"><span>Texto</span><textarea class="textarea" name="txt" maxlength="1500" rows="5" placeholder="Cuenta lo esencial en pocas líneas: qué pasó o qué viene, cuándo y dónde.">${esc(x.txt || "")}</textarea></label>
    <label class="field"><span>Foto (opcional)</span><input type="file" accept="image/*" id="notFoto"></label>
    <div id="notFotoPrev">${fotoDraft || x.img ? `<img class="not-prev" src="${esc(fotoDraft || x.img)}" alt="">` : ""}</div>
    <label class="field"><span>Enlace para leer más (opcional)</span><input class="input" name="link" inputmode="url" value="${esc(x.link || "")}" placeholder="https://…"></label>
    <label class="row-wrap" style="gap:8px"><input type="checkbox" name="destacado" ${x.destacado ? "checked" : ""}> Destacar (aparece primero y en Hoy)</label>
    <label class="row-wrap" style="gap:8px"><input type="checkbox" name="interno" ${x.interno ? "checked" : ""}> Solo para la comunidad (no la ven visitas sin cuenta)</label>
    <div class="row-wrap"><span class="spacer"></span><button class="btn btn-primary btn-sm" type="submit">${editando ? "Guardar cambios" : "Publicar"}</button></div>
  </form>`;
}

async function comprimir(file) {
  if (!/^image\//.test(file.type)) throw new Error("No es una imagen");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    let k = Math.min(1, 1200 / Math.max(img.width, img.height));
    for (let n = 0; n < 5; n++) {
      const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      let q = 0.8, d = cv.toDataURL("image/jpeg", q);
      while (d.length > 140000 && q > 0.4) { q -= 0.08; d = cv.toDataURL("image/jpeg", q); }
      if (d.length <= 140000) return d;
      k *= 0.75;
    }
    throw new Error("Muy pesada");
  } finally { URL.revokeObjectURL(url); }
}

function registerActions() {
  const A = ctx.actions;
  const fail = () => toast("No se pudo. Revisa tu conexión.", "");
  A.notSec = (el) => { sec = el.dataset.s; document.querySelectorAll(".not-tabs .chip").forEach((b) => { const on = b.dataset.s === sec; b.classList.toggle("accent", on); b.setAttribute("aria-selected", on); }); pintar(); };
  A.notAbrir = () => { abierto = !abierto; editando = null; fotoDraft = ""; ctx.render(); };
  A.notEditar = async (el) => { editando = await ctx.cloud.getNoticia(el.dataset.id).catch(() => null); if (!editando) return fail(); editando.id = el.dataset.id; abierto = true; fotoDraft = ""; location.hash = "#/noticias"; };
  A.notBorrar = async (el) => { if (!confirm("¿Borrar esta noticia?")) return; try { await ctx.cloud.deleteNoticia(el.dataset.id); propias = null; toast("Noticia borrada", "ok"); location.hash = "#/noticias"; } catch { fail(); } };
  A.notShare = async (el) => {
    const t = document.getElementById("notOne")?.dataset.t || "Noticia de Ágape";
    const url = `${APP}#/noticias/${el.dataset.id}`, text = `📰 *${t}*\n\nLéela en agAPPe 👉 ${url}`;
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "notFoto" || !e.target.files[0]) return;
    try { fotoDraft = await comprimir(e.target.files[0]); const p = document.getElementById("notFotoPrev"); if (p) p.innerHTML = `<img class="not-prev" src="${fotoDraft}" alt="">`; }
    catch { toast("No se pudo usar esa foto. Prueba con otra.", ""); }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "notForm") return;
    e.preventDefault();
    const f = new FormData(e.target);
    const link = String(f.get("link") || "").trim();
    if (link && !/^https:\/\/\S+$/.test(link)) return toast("El enlace debe empezar con https://", "");
    const data = { sec: String(f.get("sec")), t: String(f.get("t") || "").trim(), txt: String(f.get("txt") || "").trim(), link,
      img: fotoDraft || (editando && editando.img) || "", destacado: !!f.get("destacado"), interno: !!f.get("interno") };
    if (!data.t) return;
    const b = e.target.querySelector("[type=submit]"); if (b) b.disabled = true;
    try { await ctx.cloud.saveNoticia(editando ? editando.id : null, data); toast(editando ? "Noticia actualizada" : "Noticia publicada", "ok"); sec = "todo"; abierto = false; editando = null; fotoDraft = ""; propias = null; ctx.render(); }
    catch (err) { console.warn(err); if (b) b.disabled = false; fail(); }
  });
}
