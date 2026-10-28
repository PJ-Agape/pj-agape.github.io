// Autorización de papás o apoderados para una actividad de la Agenda.
// El equipo la completa al crear el evento («¿Requiere autorización?») y cualquiera la
// descarga como PDF rellenable: la familia puede escribir en el PDF o imprimirlo y firmarlo.
// pdf-lib se carga solo al descargar.

import { esc } from "./util.js";

export const TEXTO_DEF = "Autorizo a mi hijo/a o pupilo/a a participar en la actividad descrita, organizada por la Pastoral Juvenil Ágape de la Parroquia San Miguel de Yungay. Declaro conocer su horario, lugar y condiciones, y me comprometo a avisar al equipo cualquier cambio en los datos de contacto o de salud.";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const parse = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
export const fecha = (s) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return ""; const d = parse(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const when = (d, h) => [fecha(d), h ? `a las ${h} h` : ""].filter(Boolean).join(" ");

export const hasAuth = (e) => !!(e && e.auth && e.auth.req);

// ---------------------------------------------------------------------------
// Campos del formulario de la Agenda
// ---------------------------------------------------------------------------
export function formHTML(e) {
  const a = (e && e.auth) || {};
  const on = !!a.req;
  const v = (k, d = "") => esc(a[k] != null ? a[k] : d);
  const chk = (k, def) => ((a[k] != null ? a[k] : def) ? "checked" : "");
  return `<fieldset class="p-dates ag-fam-box">
      <label class="row" style="gap:8px;font-weight:800"><input type="checkbox" name="familias" id="agFam" ${e && e.familias ? "checked" : ""}> Visible para familias</label>
      <span class="xs muted">Aparece en la página para familias y en su calendario.</span>
      <label class="row" style="gap:8px;font-weight:800;margin-top:12px"><input type="checkbox" name="invFam" id="agInv" ${e && e.invFam ? "checked" : ""}> Invitar a las familias (por ejemplo, una reunión de apoderados)</label>
      <span class="xs muted">Cada joven recibe en Inicio una invitación para mandarla a su familia por WhatsApp, y las familias confirman su asistencia en su página. Las confirmaciones las ves en este evento.</span>
      <label class="row" style="gap:8px;font-weight:800;margin-top:12px"><input type="checkbox" name="authReq" id="agAuth" ${on ? "checked" : ""}> ¿Requiere autorización de papás o apoderados?</label>
      <div class="stack" id="agAuthOpts" style="--gap:10px;margin-top:10px" ${on ? "" : "hidden"}>
        <p class="xs muted">Con esto se arma la autorización en PDF. La familia puede completarla en el mismo PDF o imprimirla y firmarla.</p>
        <div class="ag-form-row">
          <div class="field"><label>Salida: día</label><input class="input" type="date" name="a_salidaF" value="${v("salidaF", e && e.date)}"></div>
          <div class="field"><label>Hora</label><input class="input" type="time" name="a_salidaH" value="${v("salidaH", e && e.start)}"></div>
        </div>
        <div class="ag-form-row">
          <div class="field"><label>Regreso: día</label><input class="input" type="date" name="a_regresoF" value="${v("regresoF", e && e.date)}"></div>
          <div class="field"><label>Hora</label><input class="input" type="time" name="a_regresoH" value="${v("regresoH", e && e.end)}"></div>
        </div>
        <div class="field"><label>Lugar o destino</label><input class="input" name="a_destino" maxlength="140" value="${v("destino", e && e.place)}" placeholder="Ej: Casa de retiro Santa Teresa, Pinto"></div>
        <div class="ag-form-row">
          <div class="field"><label>Punto de encuentro</label><input class="input" name="a_encuentro" maxlength="120" value="${v("encuentro")}" placeholder="Ej: Frente a la parroquia"></div>
          <div class="field"><label>Transporte</label><input class="input" name="a_transporte" maxlength="120" value="${v("transporte")}" placeholder="Ej: Bus contratado por la parroquia"></div>
        </div>
        <div class="ag-form-row">
          <div class="field"><label>Aporte o costo</label><input class="input" name="a_aporte" maxlength="120" value="${v("aporte")}" placeholder="Ej: $5.000 (incluye almuerzo)"></div>
          <div class="field"><label>Qué llevar</label><input class="input" name="a_llevar" maxlength="200" value="${v("llevar")}" placeholder="Ej: Saco de dormir, colación, Biblia"></div>
        </div>
        <div class="ag-form-row">
          <div class="field"><label>Adultos responsables</label><input class="input" name="a_responsables" maxlength="200" value="${v("responsables")}" placeholder="Nombres de quienes acompañan"></div>
          <div class="field"><label>Teléfono durante la actividad</label><input class="input" name="a_telefono" maxlength="40" value="${v("telefono")}" placeholder="+56 9 …"></div>
        </div>
        <div class="ag-form-row">
          <div class="field"><label>Entregar firmada a</label><input class="input" name="a_entregar" maxlength="100" value="${v("entregar")}" placeholder="Ej: Su dirigente o en la secretaría parroquial"></div>
          <div class="field"><label>A más tardar el</label><input class="input" type="date" name="a_plazo" value="${v("plazo")}"></div>
        </div>
        <div class="field"><label>Texto de la autorización</label><textarea class="textarea" name="a_texto" rows="4" maxlength="900">${v("texto", TEXTO_DEF)}</textarea></div>
        <div class="field"><label>Pedir también a la familia</label>
          <div class="can-chips">
            <label class="chip"><input type="checkbox" name="a_salud" ${chk("salud", true)}> Salud y alergias</label>
            <label class="chip"><input type="checkbox" name="a_prevision" ${chk("prevision", true)}> Previsión de salud</label>
            <label class="chip"><input type="checkbox" name="a_fotos" ${chk("fotos", false)}> Permiso para fotos</label>
          </div>
          <span class="xs muted">El nombre, el contacto de emergencia y la firma se piden siempre.</span></div>
        <button type="button" class="btn btn-sm btn-ghost" data-action="agAuthPreview" style="justify-self:start">Ver cómo queda el PDF</button>
      </div>
    </fieldset>`;
}

const TXT = ["salidaF", "salidaH", "regresoF", "regresoH", "destino", "encuentro", "transporte", "aporte", "llevar", "responsables", "telefono", "entregar", "plazo", "texto"];
export function fromForm(f) {
  if (f.get("authReq") !== "on") return null;
  const a = { req: true };
  for (const k of TXT) a[k] = String(f.get("a_" + k) || "").trim();
  if (!a.texto) a.texto = TEXTO_DEF;
  for (const k of ["salud", "prevision", "fotos"]) a[k] = f.get("a_" + k) === "on";
  return a;
}

// ---------------------------------------------------------------------------
// PDF rellenable
// ---------------------------------------------------------------------------
const WIN = /[^\n\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g;
const clean = (s) => String(s || "").replace(/[«»]/g, (m) => (m === "«" ? "“" : "”")).replace(/\t/g, " ").replace(WIN, "");

export async function pdfBytes(ev) {
  const L = await import("./vendor/pdf-lib.mjs");
  const { PDFDocument, StandardFonts, rgb } = L;
  const a = ev.auth || {};
  const doc = await PDFDocument.create();
  doc.setTitle(clean(`Autorización · ${ev.title}`));
  doc.setAuthor("Pastoral Juvenil Ágape");
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  const F = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
  const INK = hex("#0b2566"), INK2 = hex("#1351a4"), CORAL = hex("#ef591c"), SUN = hex("#ffba03"), CREAM = hex("#fff6e5"), SOFT = hex("#5a6b8c"), FIELD = hex("#eef6fd");
  const M = 46, W = 612 - M * 2;
  let y = 792 - 40;

  const text = (s, x, yy, { f = F, size = 10, color = INK } = {}) => page.drawText(clean(s), { x, y: yy, size, font: f, color });
  const wrap = (s, width, f = F, size = 10) => {
    const out = [];
    for (const para of clean(s).split("\n")) {
      let line = "";
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const t = line ? line + " " + w : w;
        if (f.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t;
      }
      out.push(line);
    }
    return out;
  };
  let nField = 0;
  const field = (label, x, yy, w, { h = 18, multi = false } = {}) => {
    text(label, x, yy + h + 3, { size: 7.5, color: SOFT, f: B });
    const tf = form.createTextField(`f${++nField}_${label.replace(/[^A-Za-z]/g, "").slice(0, 20)}`);
    if (multi) tf.enableMultiline();
    tf.addToPage(page, { x, y: yy, width: w, height: h, borderColor: INK2, borderWidth: 0.8, backgroundColor: FIELD, font: F });
    tf.setFontSize(multi ? 9 : 10);
    return tf;
  };
  const radio = (name, opts, x, yy) => {
    const g = form.createRadioGroup(name);
    let cx = x;
    for (const [val, lab] of opts) {
      g.addOptionToPage(val, page, { x: cx, y: yy - 2, width: 11, height: 11, borderColor: INK, borderWidth: 1, backgroundColor: hex("#ffffff") });
      text(lab, cx + 16, yy, { size: 10, f: B });
      cx += 22 + B.widthOfTextAtSize(clean(lab), 10) + 22;
    }
  };

  // Encabezado
  try {
    const png = await fetch(new URL("../icons/icon-192.png", import.meta.url)).then((r) => (r.ok ? r.arrayBuffer() : null));
    if (png) page.drawImage(await doc.embedPng(png), { x: M, y: y - 34, width: 42, height: 42 });
  } catch {}
  text("PASTORAL JUVENIL ÁGAPE", M + 52, y - 10, { f: B, size: 10 });
  text("Parroquia San Miguel de Yungay · Diócesis San Bartolomé de Chillán", M + 52, y - 24, { size: 8.5, color: SOFT });
  const tag = "AUTORIZACIÓN";
  const tw = B.widthOfTextAtSize(tag, 9) + 20;
  page.drawRectangle({ x: 612 - M - tw, y: y - 22, width: tw, height: 20, color: SUN, borderColor: INK, borderWidth: 1 });
  text(tag, 612 - M - tw + 10, y - 15.5, { f: B, size: 9 });
  y -= 64;
  text("Autorización para participar", M, y, { f: B, size: 21 });
  y -= 22;
  for (const l of wrap(ev.title, W, B, 14).slice(0, 2)) { text(l, M, y, { f: B, size: 14, color: CORAL }); y -= 17; }
  y -= 6;

  // La actividad
  const rows = [
    ["Salida", when(a.salidaF || ev.date, a.salidaH || ev.start)],
    ["Regreso", when(a.regresoF || a.salidaF || ev.date, a.regresoH || ev.end)],
    ["Lugar o destino", a.destino || ev.place],
    ["Punto de encuentro", a.encuentro],
    ["Transporte", a.transporte],
    ["Aporte o costo", a.aporte],
    ["Qué llevar", a.llevar],
    ["Adultos responsables", a.responsables],
    ["Teléfono durante la actividad", a.telefono],
  ].filter(([, v]) => v && String(v).trim());
  const KW = 150, VW = W - KW - 28;
  const lines = rows.map(([k, v]) => [k, wrap(v, VW, F, 10)]);
  const boxH = lines.reduce((s, [, l]) => s + l.length * 13 + 5, 0) + 30;
  page.drawRectangle({ x: M, y: y - boxH, width: W, height: boxH, color: CREAM, borderColor: INK, borderWidth: 1.2 });
  text("LA ACTIVIDAD", M + 14, y - 16, { f: B, size: 8, color: CORAL });
  let by = y - 32;
  for (const [k, ls] of lines) {
    text(k, M + 14, by, { f: B, size: 9.5 });
    ls.forEach((l, i) => text(l, M + 14 + KW, by - i * 13, { size: 10 }));
    by -= ls.length * 13 + 5;
  }
  y -= boxH + 26;

  // Datos de la familia
  text("DATOS Y AUTORIZACIÓN", M, y, { f: B, size: 8, color: CORAL });
  page.drawLine({ start: { x: M + 112, y: y + 3 }, end: { x: M + W, y: y + 3 }, thickness: 0.6, color: SOFT });
  y -= 34;
  const G = 12, w2 = (W - G) / 2, wA = W * 0.66, wB = W - wA - G;
  field("Nombre del o la joven", M, y, wA); field("RUT", M + wA + G, y, wB);
  y -= 34;
  field("Nombre del papá, mamá o apoderado/a", M, y, wA); field("RUT", M + wA + G, y, wB);
  y -= 34;
  field("Parentesco", M, y, w2); field("Teléfono", M + w2 + G, y, w2);
  y -= 22;
  for (const l of wrap(a.texto || TEXTO_DEF, W, F, 9.5)) { text(l, M, y, { size: 9.5 }); y -= 12.5; }
  y -= 8;
  radio("autorizacion", [["si", "Sí, autorizo"], ["no", "No autorizo"]], M, y);
  y -= a.salud ? 42 : 34;
  if (a.salud) { field("Alergias, enfermedades o medicamentos que debamos conocer", M, y - 12, W, { h: 30, multi: true }); y -= 46; }
  const em = a.prevision ? [["Previsión de salud", w2 * 0.7], ["En emergencia, avisar a", w2 * 0.85], ["Teléfono", W - w2 * 1.55 - G * 2]] : [["En emergencia, avisar a", w2 + w2 * 0.3], ["Teléfono", W - (w2 + w2 * 0.3) - G]];
  let ex = M; for (const [l, w] of em) { field(l, ex, y, w); ex += w + G; }
  y -= 26;
  if (a.fotos) {
    text("¿Autoriza que aparezca en fotos de la pastoral (redes y diario mural)?", M, y, { size: 9.5 });
    radio("fotos", [["si", "Sí"], ["no", "No"]], M + 352, y);
    y -= 26;
  }
  // Firma
  y -= 22;
  const sw = W * 0.58;
  field("Firma (o nombre si se envía digital)", M, y, sw, { h: 22 });
  field("Fecha", M + sw + G, y, W - sw - G, { h: 22 });
  y -= 30;

  // Pie
  const pie = [
    a.entregar || a.plazo ? `Entregar firmada${a.entregar ? ` a ${a.entregar}` : ""}${a.plazo ? `, a más tardar el ${fecha(a.plazo)}` : ""}.` : "",
    "Estos datos se usan solo para organizar y cuidar esta actividad.",
  ].filter(Boolean);
  const py = Math.min(y, 40 + pie.length * 12);
  page.drawLine({ start: { x: M, y: py + 14 }, end: { x: M + W, y: py + 14 }, thickness: 0.6, color: SOFT });
  pie.forEach((p, i) => text(p, M, py - i * 12, { size: 8.5, color: i ? SOFT : INK, f: i ? F : B }));
  form.updateFieldAppearances(F);
  return doc.save();
}

const slug = (s) => String(s || "actividad").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
export async function download(ev) {
  const bytes = await pdfBytes(ev);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `autorizacion-${slug(ev.title)}-${(ev.auth && ev.auth.salidaF) || ev.date || ""}.pdf`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
