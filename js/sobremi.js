// Sobre mí: cada joven cuenta quién es (una reseña breve) y elige sus intereses, habilidades, hobbies y en qué
// le gustaría servir. Vive en su perfil personal. El equipo lo usa para saber qué pedirle a cada uno y pensar
// contenidos (#/talentos). La comunidad solo lo ve si la persona lo decide.

import { esc, icon, toast } from "./util.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }

export const GRUPOS = [
  { k: "intereses", t: "Me interesa", d: "Temas que te llaman la atención.", ops: ["Música", "Deporte", "Cine y series", "Lectura", "Tecnología", "Naturaleza", "Arte", "Medio ambiente", "Política y sociedad", "Ciencia", "Moda", "Animales", "Viajes", "Historia", "Psicología", "Fe y espiritualidad"] },
  { k: "habilidades", t: "Sé hacer", d: "Lo que se te da bien y podrías enseñar o aportar.", ops: ["Tocar un instrumento", "Cantar", "Diseño", "Fotografía", "Editar videos", "Redes sociales", "Escribir", "Hablar en público", "Organizar eventos", "Cocinar", "Manualidades", "Animar juegos", "Enseñar o hacer clases", "Primeros auxilios", "Programar", "Idiomas", "Arreglar cosas"] },
  { k: "hobbies", t: "En mi tiempo libre", d: "Lo que haces para pasarlo bien.", ops: ["Videojuegos", "Salir con amigos", "Fútbol", "Bicicleta", "Leer", "Dibujar", "Bailar", "Escuchar música", "Ver series", "Caminar o trekking", "Gimnasio", "Cocinar", "Juegos de mesa", "Mascotas"] },
  { k: "servir", t: "Me gustaría ayudar en", d: "Dónde te gustaría poner tus talentos en Ágape.", ops: ["Liturgia y misas", "Música del grupo", "Animación de encuentros", "Redes y difusión", "Misiones", "Acción social", "Acompañar a otros jóvenes", "Logística y orden", "Oración y adoración", "Catequesis con niños", "Fotos y videos"] },
];
const MAX = 12, LARGO = 30;
let datos = null, borrador = null, editando = false;

const st = () => ctx.cloud.state();
const limpio = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, LARGO);

// ---------------------------------------------------------------------------
// En el perfil (Mi cuenta)
export function slot() { return `<section class="pf-sec sm" id="sobreMi"><h2>Sobre mí</h2><p class="muted small">Cargando…</p></section>`; }

export async function paint() {
  const el = document.getElementById("sobreMi"); if (!el) return;
  if (!datos) datos = (await ctx.cloud.getPerfil().catch(() => null)) || {};
  if (!el.isConnected) return;
  const vacio = !datos.bio && !GRUPOS.some((g) => (datos[g.k] || []).length);
  if (editando) { el.innerHTML = editor(); return; }
  el.innerHTML = `<div class="sm-h"><h2>Sobre mí</h2>${vacio ? "" : `<button class="btn btn-ghost btn-sm" data-action="smEditar">${icon("edit")} Editar</button>`}</div>
    ${vacio ? `<div class="sm-vacio"><p><strong>Cuéntanos quién eres</strong></p>
        <p class="muted small">Una frase sobre ti, lo que te gusta y lo que sabes hacer. Nos ayuda a conocerte, a pensar actividades que te sirvan y a invitarte donde puedes brillar.</p>
        <button class="btn btn-primary btn-sm" data-action="smEditar">Completar mi perfil</button></div>`
      : `${datos.bio ? `<p class="sm-bio">«${esc(datos.bio)}»</p>` : ""}
      ${GRUPOS.map((g) => (datos[g.k] || []).length ? `<div class="sm-g"><span class="sm-gt">${g.t}</span><div class="sm-chips">${datos[g.k].map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>` : "").join("")}
      <p class="xs muted">${datos.publico ? "Lo ve la comunidad de Ágape y el equipo." : "Solo lo ves tú y el equipo coordinador."}</p>`}`;
}

function editor() {
  const b = borrador;
  return `<div class="sm-h"><h2>Sobre mí</h2></div>
  <form class="sm-form" id="smForm">
    <label class="field"><span>Una frase sobre ti</span>
      <textarea class="textarea" name="bio" maxlength="280" rows="3" placeholder="Ej: Me encanta la música y estoy en tercero medio. Me gustaría aprender a tocar guitarra.">${esc(b.bio || "")}</textarea></label>
    ${GRUPOS.map((g) => {
      const sel = new Set(b[g.k] || []);
      const extra = [...sel].filter((x) => !g.ops.includes(x));
      return `<fieldset class="sm-fs"><legend>${g.t}</legend><p class="xs muted">${g.d}</p>
        <div class="sm-chips">${[...g.ops, ...extra].map((o) => `<button type="button" class="chip ${sel.has(o) ? "accent" : ""}" data-action="smChip" data-g="${g.k}" data-v="${esc(o)}" aria-pressed="${sel.has(o)}">${esc(o)}</button>`).join("")}</div>
        <div class="sm-otro"><input class="input" data-otro="${g.k}" maxlength="${LARGO}" placeholder="Otro…"><button type="button" class="btn btn-ghost btn-sm" data-action="smOtro" data-g="${g.k}">${icon("plus")} Agregar</button></div>
      </fieldset>`;
    }).join("")}
    <label class="sm-pub"><input type="checkbox" name="publico" ${b.publico ? "checked" : ""}> Que la comunidad de Ágape pueda ver lo que elegí</label>
    <p class="xs muted">Siempre lo ve el equipo coordinador, para conocerte y pensar actividades. Nada de esto se muestra a visitas sin cuenta.</p>
    <div class="row-wrap" style="gap:8px"><button class="btn btn-ghost btn-sm" type="button" data-action="smCancelar">Cancelar</button><span class="spacer"></span>
      <button class="btn btn-primary btn-sm" type="submit">Guardar</button></div>
  </form>`;
}

// ---------------------------------------------------------------------------
// Talentos del grupo (#/talentos): solo equipo coordinador
export function viewTalentos() {
  if (!st().isStaff) return `<div class="card" style="max-width:480px;margin:6vh auto 0;text-align:center;padding:32px"><h1 class="display" style="font-size:1.5rem">Esta página es para el equipo coordinador</h1><a class="btn btn-primary" style="margin-top:14px" href="#/">Volver</a></div>`;
  ctx.onAfterRender(async () => {
    const box = document.getElementById("talBox"); if (!box) return;
    const xs = await ctx.cloud.listPerfiles().catch(() => null);
    if (!xs) { box.innerHTML = `<div class="note">No se pudo cargar. Revisa tu conexión.</div>`; return; }
    if (!xs.length) { box.innerHTML = `<div class="note">Todavía nadie completó «Sobre mí». Invítalos desde el grupo: está en Mi perfil.</div>`; return; }
    const total = (await ctx.cloud.adminData().catch(() => null))?.users?.filter((u) => u.active !== false).length || 0;
    box.innerHTML = `<p class="small">${total ? `${xs.length} de ${total} cuentas` : `${xs.length} ${xs.length === 1 ? "cuenta" : "cuentas"}`} completaron «Sobre mí».</p>` + GRUPOS.map((g) => {
      const c = {};
      xs.forEach((p) => (p[g.k] || []).forEach((v) => (c[v] = c[v] || []).push(p)));
      const filas = Object.entries(c).sort((a, b) => b[1].length - a[1].length);
      if (!filas.length) return "";
      const max = filas[0][1].length;
      return `<section class="card tal-sec"><h2>${g.t}</h2>
        ${filas.map(([v, ps]) => `<details class="tal-row"><summary><span>${esc(v)}</span><i style="width:${Math.max(6, Math.round((ps.length / max) * 100))}%"></i><b>${ps.length}</b></summary>
          <p class="small">${ps.map((p) => esc(p.nombre || "Sin nombre")).join(", ")}</p></details>`).join("")}</section>`;
    }).join("") + `<section class="card tal-sec"><h2>Lo que cuentan de sí</h2>${xs.filter((p) => p.bio).map((p) => `<p class="tal-bio"><b>${esc(p.nombre || "")}</b>: «${esc(p.bio)}»</p>`).join("") || `<p class="muted small">Nadie escribió su frase todavía.</p>`}</section>`;
  });
  return `<header class="page-head"><span class="eyebrow">equipo coordinador</span><h1>Talentos del <em>grupo</em></h1>
    <p>Lo que los jóvenes cuentan en «Sobre mí»: para saber a quién invitar a qué y pensar contenidos que les sirvan. Toca un tema para ver quiénes son.</p></header>
    <div id="talBox"><p class="muted small">Cargando…</p></div>`;
}

// ---------------------------------------------------------------------------
function registerActions() {
  const A = ctx.actions;
  A.smEditar = () => { borrador = JSON.parse(JSON.stringify(datos || {})); editando = true; paint(); };
  A.smCancelar = () => { editando = false; paint(); };
  A.smChip = (el) => {
    const g = el.dataset.g, v = el.dataset.v, arr = borrador[g] || (borrador[g] = []);
    const i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else { if (arr.length >= MAX) return toast(`Hasta ${MAX} por grupo`, ""); arr.push(v); }
    const on = arr.includes(v); el.classList.toggle("accent", on); el.setAttribute("aria-pressed", on);
  };
  A.smOtro = (el) => {
    const g = el.dataset.g, inp = document.querySelector(`[data-otro="${g}"]`), v = limpio(inp && inp.value);
    if (!v) return;
    const arr = borrador[g] || (borrador[g] = []);
    if (!arr.includes(v)) { if (arr.length >= MAX) return toast(`Hasta ${MAX} por grupo`, ""); arr.push(v); }
    borrador.bio = document.querySelector("#smForm [name=bio]")?.value || borrador.bio;
    borrador.publico = !!document.querySelector("#smForm [name=publico]")?.checked;
    paint();
  };
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.dataset && e.target.dataset.otro) { e.preventDefault(); A.smOtro({ dataset: { g: e.target.dataset.otro } }); } });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "smForm") return;
    e.preventDefault();
    const f = new FormData(e.target);
    const d = { bio: String(f.get("bio") || "").trim().slice(0, 280), publico: !!f.get("publico") };
    GRUPOS.forEach((g) => (d[g.k] = (borrador[g.k] || []).map(limpio).filter(Boolean).slice(0, MAX)));
    const b = e.target.querySelector("[type=submit]"); if (b) b.disabled = true;
    try { await ctx.cloud.savePerfil(d); datos = d; editando = false; toast("¡Gracias por contarnos de ti!", "ok"); paint(); }
    catch (err) { console.warn(err); if (b) b.disabled = false; toast("No se pudo guardar. Revisa tu conexión.", ""); }
  });
}
