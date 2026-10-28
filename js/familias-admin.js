// Gestión → Familias: el equipo edita los textos de la página pública para familias
// y obtiene su enlace y código QR para compartir.

import { esc, icon, toast } from "./util.js";
import { DEF, merge } from "./familias-contenido.js";
import qrcode from "./qr.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
let data = null, loaded = false;
export function setup(c) { ctx = c; registerActions(); }
export const URL_FAM = () => new URL("familias/", location.href.split("#")[0]).href;

export function adminView() {
  if (!loaded) ctx.onAfterRender(async () => { data = merge(await ctx.cloud.getFamilias()); loaded = true; if (location.hash.startsWith("#/admin/familias")) ctx.render(); });
  const C = data || merge(null), c = C.contacto, k = C.carta;
  const qr = qrcode(0, "M"); qr.addData(URL_FAM()); qr.make();
  const area = (name, val, rows = 3, ph = "") => `<textarea class="textarea" name="${name}" rows="${rows}" placeholder="${esc(ph)}">${esc(val)}</textarea>`;
  const inp = (name, val, ph = "", type = "text") => `<input class="input" type="${type}" name="${name}" value="${esc(val)}" placeholder="${esc(ph)}">`;
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Página para familias</h1>
    <p>Una página pública, sin cuenta, para papás y apoderados. Muestra quiénes somos, las actividades marcadas «Visible para familias» en la Agenda (con su autorización para descargar) y el contacto.</p></header>
  <div class="card fam-share">
    <div class="fam-qr">${qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true })}</div>
    <div style="flex:1;min-width:220px"><h3>Compártela</h3><p class="small muted">En el grupo de apoderados, en la reunión de padres o impresa en el diario mural de la parroquia.</p>
      <div class="row-wrap" style="margin-top:10px"><input class="input" readonly value="${esc(URL_FAM())}" style="flex:1;min-width:200px">
        <button class="btn btn-sm btn-primary" data-action="famCopy">${icon("copy")} Copiar</button><a class="btn btn-sm btn-ghost" href="${esc(URL_FAM())}" target="_blank" rel="noopener">${icon("eye")} Ver la página</a></div></div>
  </div>
  ${loaded ? "" : `<p class="muted small">Cargando lo guardado…</p>`}
  <form id="famForm" class="stack" style="--gap:16px">
    <section class="card stack" style="--gap:12px"><h3>Bienvenida y horarios</h3>
      <div class="field"><label>Quiénes somos (2 o 3 líneas)</label>${area("bienvenida", C.bienvenida, 3)}</div>
      <div class="field"><label>Cuándo y dónde nos reunimos</label>${area("horario", C.horario, 2, "Ej: Los sábados de 16:00 a 18:00 en el salón parroquial.")}</div>
    </section>
    <section class="card stack" style="--gap:12px"><h3>Carta a las familias <span class="chip">opcional</span></h3>
      <p class="small muted">Un saludo breve del equipo o del párroco. Se muestra arriba de todo hasta la fecha que elijas.</p>
      <div class="field"><label>Título</label>${inp("cTitulo", k.titulo, "Ej: ¡Comenzamos el Mes de María!")}</div>
      <div class="field"><label>Texto</label>${area("cTexto", k.texto, 5)}</div>
      <div class="ag-form-row"><div class="field"><label>Firma</label>${inp("cFirma", k.firma, "Ej: Equipo coordinador")}</div>
        <div class="field"><label>Mostrar hasta (incluido)</label>${inp("cHasta", k.hasta, "", "date")}<span class="xs muted">En blanco: siempre.</span></div></div>
    </section>
    <section class="card stack" style="--gap:12px"><h3>Cómo cuidamos</h3>
      <div class="field"><label>Un compromiso por línea</label>${area("cuidado", C.cuidado.join("\n"), 6)}</div>
      <p class="xs muted">Revisa que cada frase se cumpla de verdad en el grupo: es lo que más confianza da a una familia.</p>
    </section>
    <section class="card stack" style="--gap:12px"><h3>Preguntas frecuentes</h3>
      <div class="field"><label>Pregunta y respuesta separadas por «?», una por línea</label>${area("faq", C.faq.map((f) => `${f.q.replace(/\?$/, "")}? ${f.a}`).join("\n"), 6)}</div>
      <p class="xs muted">Ejemplo: «¿Qué tiene que llevar? Su Biblia y ganas de compartir.»</p>
    </section>
    <section class="card stack" style="--gap:12px"><h3>Contacto</h3>
      <p class="small muted">Usa un número o correo de la coordinación o de la parroquia, no celulares personales de dirigentes.</p>
      <div class="field"><label>Nombre</label>${inp("nombre", c.nombre)}</div>
      <div class="ag-form-row"><div class="field"><label>Teléfono</label>${inp("telefono", c.telefono, "+56 42 …")}</div><div class="field"><label>WhatsApp</label>${inp("whatsapp", c.whatsapp, "+56 9 …")}</div></div>
      <div class="ag-form-row"><div class="field"><label>Correo</label>${inp("correo", c.correo, "pastoral@…", "email")}</div><div class="field"><label>Dirección</label>${inp("direccion", c.direccion)}</div></div>
      <div class="ag-form-row"><div class="field"><label>Instagram</label>${inp("instagram", c.instagram, "@pjagape")}</div><div class="field"><label>Facebook</label>${inp("facebook", c.facebook, "Enlace o nombre de la página")}</div></div>
    </section>
    <div class="row-wrap"><button class="btn btn-primary" type="submit">${icon("check")} Guardar cambios</button>
      <button class="btn btn-ghost" type="button" data-action="famReset">Volver a los textos de ejemplo</button></div>
  </form>`;
}

function registerActions() {
  ctx.actions.famCopy = async () => { try { await navigator.clipboard.writeText(URL_FAM()); toast("Enlace copiado"); } catch { toast("Selecciona y copia el enlace"); } };
  ctx.actions.famReset = () => {
    const f = document.getElementById("famForm"); if (!f) return;
    if (!confirm("¿Volver a los textos de ejemplo en bienvenida, horario, cuidado y preguntas? (El contacto y la carta no cambian.)")) return;
    f.bienvenida.value = DEF.bienvenida; f.horario.value = DEF.horario; f.cuidado.value = DEF.cuidado.join("\n");
    f.faq.value = DEF.faq.map((x) => `${x.q.replace(/\?$/, "")}? ${x.a}`).join("\n");
  };
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "famForm") return;
    e.preventDefault();
    const f = new FormData(e.target), g = (k) => String(f.get(k) || "").trim();
    const faq = g("faq").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const i = l.indexOf("?");
      return i > 0 ? { q: (l.startsWith("¿") ? "" : "¿") + l.slice(0, i + 1).trim(), a: l.slice(i + 1).trim() } : { q: l, a: "" };
    }).filter((x) => x.q && x.a);
    const out = {
      bienvenida: g("bienvenida"), horario: g("horario"),
      cuidado: g("cuidado").split("\n").map((x) => x.trim()).filter(Boolean),
      faq,
      carta: { titulo: g("cTitulo"), texto: g("cTexto"), firma: g("cFirma"), hasta: g("cHasta") },
      contacto: Object.fromEntries(["nombre", "telefono", "whatsapp", "correo", "direccion", "instagram", "facebook"].map((k) => [k, g(k)])),
    };
    try { await ctx.cloud.saveFamilias(out); data = merge(out); toast("Página para familias actualizada"); }
    catch (err) { console.warn(err); toast(err && err.code === "permission-denied" ? "Tu cuenta aún no puede editar esta página (faltan permisos en la base)" : "No se pudo guardar", ""); }
  });
}
