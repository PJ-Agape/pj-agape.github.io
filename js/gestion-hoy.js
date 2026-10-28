// Gestión → Hoy: el tablero de pendientes. Junta en un solo lugar lo que pide atención del equipo
// (o del dirigente), cada cosa con su botón para resolverla.
// No guarda nada propio: lee lo que ya existe (cuentas, muro, chat, Papa, cumpleaños).

import * as cloud from "./cloud.js";
import { esc, icon } from "./util.js";
import * as papa from "./papa.js";

const st = () => cloud.state();
const pad = (n) => String(n).padStart(2, "0");

// Un pendiente: nivel (urgente · revisar · info), ícono, título, detalle, acción
const item = (lvl, ico, t, det, href, btn) => ({ lvl, ico, t, det, href, btn });
const ORD = { urgente: 0, revisar: 1, info: 2 };

export function html() {
  setTimeout(paint, 0);
  const s = st(), quien = s.isAdmin ? "administración" : s.isStaff ? "coordinación" : "dirigentes";
  const hoy = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  return `<header class="page-head"><span class="eyebrow">Gestión · ${esc(quien)}</span><h1>Hoy, <em>${esc(hoy)}</em></h1>
    <p>Lo que pide atención ahora. Cada pendiente tiene su botón para resolverlo.</p></header>
    <div id="ghList" class="gh-list"><p class="muted" style="padding:24px;text-align:center">Revisando pendientes…</p></div>`;
}

async function paint() {
  const box = document.getElementById("ghList"); if (!box) return;
  let items = [];
  try { items = await pendientes(); } catch (e) { console.warn("Hoy:", e); }
  if (!document.getElementById("ghList")) return;
  items.sort((a, b) => ORD[a.lvl] - ORD[b.lvl]);
  const grupo = (lvl, titulo) => { const xs = items.filter((x) => x.lvl === lvl); return xs.length ? `<h2 class="mag-hub-sub gh-h ${lvl}">${titulo} · ${xs.length}</h2>${xs.map(card).join("")}` : ""; };
  box.innerHTML = items.filter((x) => x.lvl !== "info").length
    ? grupo("urgente", "Para hoy") + grupo("revisar", "Para revisar") + grupo("info", "Para tener en cuenta")
    : `<div class="card gh-ok"><b>✨ Todo al día</b><p class="muted small">No hay pendientes. Buen momento para preparar el próximo encuentro.</p></div>${grupo("info", "Para tener en cuenta")}`;
}
const card = (x) => `<div class="card gh-i ${x.lvl}"><span class="gh-ico" aria-hidden="true">${x.ico}</span>
  <div class="gh-txt"><b>${esc(x.t)}</b>${x.det ? `<span class="small muted">${x.det}</span>` : ""}</div>
  ${x.href ? `<a class="btn btn-sm ${x.lvl === "urgente" ? "btn-primary" : "btn-soft"}" href="${x.href}">${esc(x.btn || "Ver")}</a>` : ""}</div>`;

async function pendientes() {
  const s = st(), out = [];
  const now = new Date();

  // 1) Cuentas: invitaciones que nadie ha usado (administración)
  if (s.isAdmin) {
    const ad = await cloud.adminData().catch(() => null);
    const inv = ad ? ad.invites : [];
    if (inv.length) out.push(item("revisar", "✉️", `${inv.length} invitación${inv.length > 1 ? "es" : ""} sin usar`,
      `${inv.slice(0, 3).map((i) => esc(i.name || i.id)).join(", ")}${inv.length > 3 ? "…" : ""}. Recuérdales entrar con su cuenta de Google.`, "#/admin/dirigentes", "Ver cuentas"));
  }

  if (s.isStaff) {
    // 2) Moderación: publicaciones y respuestas reportadas (equipo)
    await cloud.loadSalas().catch(() => {});
    const [wall, flag, chat] = await Promise.all([cloud.latestWall().catch(() => []), cloud.flaggedReplies().catch(() => []), cloud.reportedChat(cloud.allSalas().map((x) => x.key)).catch(() => [])]);
    const rep = wall.filter((p) => Object.keys(p.reports || {}).length && !p.hidden).length + flag.filter((r) => !r.hidden && Object.keys(r.reports || {}).length).length + chat.length;
    if (rep) out.push(item("urgente", "🚩", `${rep} reporte${rep > 1 ? "s" : ""} en el muro o el chat`, "Alguien marcó un mensaje. Revísalo y ocúltalo o bórralo si corresponde.", "#/admin/moderacion", "Moderar"));
    // 3) Intención del Papa del mes
    if (!(await papa.intencionCargada())) out.push(item("revisar", "🙏", "Falta la intención del Papa de este mes", "Cárgala para que salga en Inicio y en el rosario.", "#/admin/resumen", "Cargar"));
    // 4) Saludos de WhatsApp
    out.push(item("info", "☀️", "Saludos de hoy listos para WhatsApp", "Buenos días y buenas noches, con su imagen.", "#/admin/saludos", "Abrir"));
  }
  // 5) Cumpleaños de la semana (autorizados)
  const cum = await cloud.getCumples().catch(() => null);
  if (cum && cum.items) {
    const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() + i); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; });
    const c = cum.items.filter((x) => dias.includes(x.md)).sort((a, b) => dias.indexOf(a.md) - dias.indexOf(b.md));
    if (c.length) out.push(item("info", "🎂", `Cumpleaños esta semana`, c.map((x) => `${esc(x.n)} (${+x.md.slice(3)}/${+x.md.slice(0, 2)})`).join(", "), "#/chat/general", "Saludar"));
  }
  return out;
}
