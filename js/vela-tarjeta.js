// Tarjeta para compartir una vela recién encendida: imagen (dibujada en el teléfono con el estudio de
// difusión) + texto con la intención y el enlace a la Capilla, lista para enviar por WhatsApp.
// La comparte quien escribió la intención, desde su propio teléfono. Los coordinadores y el administrador
// pueden además enviar una intención de la semana («modo comunidad»): sin nombres, como intención de Ágape.

import { icon, toast } from "./util.js";

export const LINK = "https://pj-agape.github.io/vela/";
let actual = null; // { text, intencion, com, cv }
let nPanel = 0;

const corta = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t);

export function textoDe(intencion, com = false) {
  const t = String(intencion || "").trim();
  if (com) return t
    ? `En la Capilla Ágape estamos rezando por esta intención:\n\n_«${t}»_\n\n¿Te unes? Reza con nosotros y enciende tú también una vela:\n${LINK}`
    : `En la Capilla Ágape rezamos por quienes llevamos en el corazón.\n\n¿Te unes? Enciende tú también una vela:\n${LINK}`;
  return t
    ? `Encendí una vela en la Capilla Ágape:\n\n_«${t}»_\n\n¿Rezas conmigo? Enciende tú también la tuya:\n${LINK}`
    : `Encendí una vela en la Capilla Ágape por quienes llevo en el corazón.\n\n¿Rezas conmigo? Enciende tú también la tuya:\n${LINK}`;
}

const pieza = (intencion, com) => {
  const t = String(intencion || "").trim();
  return { kicker: "Capilla Ágape", hand: com ? "¿rezas con nosotros?" : "¿rezas conmigo?", title: com ? "Recemos por esta *intención*" : "Encendí una *vela*",
    sub: t ? `«${corta(t, 150)}»` : com ? "Por quienes llevamos en el corazón." : "Por quienes llevo en el corazón.", ill: "oracion", qr: LINK, qrLabel: "enciende la tuya" };
};

// Panel que va debajo del formulario apenas se enciende la vela (o en la hoja del coordinador)
export function panelHTML(intencion, com = false) {
  const cv = "vtCanvas" + ++nPanel;
  actual = { intencion: String(intencion || "").trim(), text: textoDe(intencion, com), com, cv };
  return `<div class="vt-panel"${com ? "" : ` id="vtPanel"`}>
    ${com ? "" : `<p class="vt-h"><strong>Invita a alguien a rezar contigo</strong><span>Envía tu vela por WhatsApp: va la imagen, tu intención y el enlace a la Capilla.</span></p>`}
    <canvas class="vt-img" id="${cv}" width="1080" height="1080" aria-label="Imagen de la vela para compartir"></canvas>
    <div class="row-wrap vt-btns">
      <button class="btn btn-gold" data-action="vtShare">${icon("send")} Enviar por WhatsApp</button>
      <button class="btn btn-soft btn-sm" data-action="vtCopy">${icon("copy")} Copiar texto</button>
      <button class="btn btn-ghost btn-sm" data-action="vtSave">${icon("dl")} Guardar imagen</button>
    </div>
    <p class="xs muted">${com ? "Va sin el nombre de quien la encendió, como intención de la comunidad. Envíala cuando sea preciso, cuidando a quien la dejó: si es muy personal, pregúntale antes."
      : "Compártela solo si quieres: tu intención la eliges tú. Quien la reciba puede encender su vela, aunque no tenga cuenta."}</p>
  </div>`;
}

export async function pintar() {
  const cv = actual && document.getElementById(actual.cv); if (!cv) return;
  try {
    const E = await import("./estudio.js");
    await E.ready();
    const d = pieza(actual.intencion, actual.com);
    await E.preload(E.illsFor("noche", d));
    E.piece(cv.getContext("2d"), 1080, 1080, "noche", d);
  } catch (e) { console.warn("Tarjeta de vela:", e); cv.remove(); }
}

// Hoja para coordinadores y administrador: enviar una intención de la semana
export function abrir(intencion) {
  let d = document.getElementById("vtDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "vtDlg"; d.className = "sheet"; document.body.appendChild(d); }
  d.innerHTML = `<div class="sheet-head"><div style="flex:1"><span class="eyebrow">Capilla Ágape</span><h2>Enviar esta intención</h2></div>
    <button type="button" class="icon-btn" data-action="vtX" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body">${panelHTML(intencion, true)}</div>`;
  d.showModal(); pintar();
}

const blob = () => new Promise((ok) => { const cv = actual && document.getElementById(actual.cv); if (!cv) ok(null); else cv.toBlob(ok, "image/png"); });
const esPC = () => !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ""));

async function compartir(el) {
  if (!actual) return;
  const text = actual.text;
  // En el teléfono: el menú para compartir lleva imagen y texto juntos a WhatsApp
  if (!esPC()) {
    try { await navigator.clipboard.writeText(text); } catch {}
    try {
      const b = await blob();
      const file = b && new File([b], "vela-agape.png", { type: "image/png" });
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
  }
  // En el computador (o si no hay menú para compartir): WhatsApp con el texto y el enlace
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  if (esPC()) toast("Se abrió WhatsApp con el texto. Si quieres la imagen, guárdala y adjúntala.", "", 6000);
}

let wired = false;
export function setup(actions) {
  if (wired) return; wired = true;
  actions.vtShare = (el) => compartir(el);
  actions.vtX = () => document.getElementById("vtDlg")?.close();
  actions.vtCopy = async () => { if (!actual) return; try { await navigator.clipboard.writeText(actual.text); toast("Texto copiado", "ok"); } catch { toast("No se pudo copiar", ""); } };
  actions.vtSave = async () => {
    const b = await blob(); if (!b) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "vela-agape.png";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
}
