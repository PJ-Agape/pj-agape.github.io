// Panel ejecutivo de Ágape: una página aparte, solo para administradores (#/panel).
// No aparece en el menú de la app. Lee los mismos contadores de siempre, pero con un solo significado por cifra.
import * as cloud from "./cloud.js";
import { esc, icon } from "./util.js";

const DIA = (d) => d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
const key = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const tsDate = (t) => (t && typeof t.toDate === "function" ? t.toDate() : t ? new Date(t) : null);
const pct = (a, b) => (b ? `${a >= b ? "+" : "−"}${Math.abs(Math.round(((a - b) / b) * 100))}%` : a ? "nuevo" : "");

// Cuenta a la persona como activa en un día si su última vez que entró cae en ese día (hora local).
function activasEn(users, dayK, myUid) {
  return users.filter((u) => {
    if ((u.uid || u.id) === myUid && dayK === key()) return true; // la propia cuenta acaba de entrar
    const d = tsDate(u.lastSeen);
    return d && !isNaN(d) && key(d) === dayK;
  }).length;
}
function activasDesde(users, dias, myUid) {
  const lim = Date.now() - dias * 864e5;
  return users.filter((u) => {
    if ((u.uid || u.id) === myUid) return true;
    const d = tsDate(u.lastSeen);
    return d && !isNaN(d) && d.getTime() >= lim;
  }).length;
}

export async function view() {
  if (!cloud.enabled || !cloud.state().isAdmin) {
    return `<div class="card" style="max-width:480px;margin:6vh auto 0;text-align:center;padding:32px">
      <div class="tile-ico" style="margin:0 auto 12px">${icon("lock")}</div>
      <h1 class="display" style="font-size:1.6rem">Esta página es solo para administración</h1>
      <a class="btn btn-primary" style="margin-top:16px" href="#/">Volver al inicio</a></div>`;
  }
  const [st, vs, data] = await Promise.all([
    cloud.visitStats(30).catch(() => []),
    cloud.viewStats(14).catch(() => []),
    cloud.adminData().catch(() => null),
  ]);
  const users = data ? data.users.filter((u) => u.active !== false) : [];
  const solicitudes = data ? data.solicitudes.length : 0;
  const myUid = cloud.myUid();

  const hoyK = key(), ayerK = key(new Date(Date.now() - 864e5));
  const hoy = st[st.length - 1] || { v: 0, c: 0, g: 0 };
  const ayer = st[st.length - 2] || { v: 0 };
  const ult7 = st.slice(-7), ant7 = st.slice(-14, -7);
  const sum = (xs, k) => xs.reduce((a, x) => a + (+x[k] || 0), 0);
  const v7 = sum(ult7, "v"), va7 = sum(ant7, "v"), v30 = sum(st, "v");
  const prom = Math.round(v30 / Math.max(1, st.filter((x) => x.v).length));
  const mejor = st.reduce((b, x) => (x.v > (b ? b.v : 0) ? x : b), null);
  const max = Math.max(1, ...st.map((x) => x.v));

  const activasHoy = activasEn(users, hoyK, myUid);
  const activas30 = activasDesde(users, 30, myUid);
  const sinEntrar = users.filter((u) => {
    if ((u.uid || u.id) === myUid) return false;
    const d = tsDate(u.lastSeen);
    return !d || isNaN(d) || Date.now() - d.getTime() > 30 * 864e5;
  }).length;

  // Secciones más vistas en los últimos 7 días
  const names = cloud.VISTAS || {};
  const tot = {};
  vs.slice(-7).forEach((d) => Object.keys(names).forEach((k) => { tot[k] = (tot[k] || 0) + (+d[k] || 0); }));
  const top = Object.entries(tot).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMax = top.length ? top[0][1] : 1;

  const bars = st.map((x) => {
    const d = new Date(x.dia + "T12:00:00");
    const h = Math.round((x.v / max) * 100);
    const hc = x.v ? Math.round((x.c / x.v) * 100) : 0;
    return `<div class="pn-col" title="${esc(DIA(d))}: ${x.v} visitas (${x.c} con cuenta, ${x.g} sin cuenta)">
      <div class="pn-bar" style="height:${h}%"><i style="height:${hc}%"></i></div>
      <small>${d.getDate()}</small></div>`;
  }).join("");

  const sinDatos = !v30;
  const ahora = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

  return `
  <style>
    .pn-wrap { max-width: 980px; margin: 0 auto; padding: 8px 4px 40px; }
    .pn-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 14px; }
    .pn-kpi { padding: 16px; display: grid; gap: 4px; }
    .pn-kpi b { font-family: var(--font-display); font-size: 2rem; line-height: 1; font-weight: 650; }
    .pn-kpi span { font-size: .85rem; font-weight: 700; }
    .pn-kpi small { color: var(--ink-3); font-size: .75rem; }
    .pn-sec { margin-top: 22px; }
    .pn-sec h2 { font-family: var(--font-display); font-size: 1.25rem; margin-bottom: 4px; }
    .pn-chart { display: grid; grid-template-columns: repeat(30, minmax(0, 1fr)); gap: 3px; align-items: end; height: 160px; margin-top: 14px; }
    .pn-col { display: grid; grid-template-rows: 1fr auto; height: 100%; align-items: end; text-align: center; }
    .pn-col small { font-size: .6rem; color: var(--ink-3); font-weight: 700; }
    .pn-bar { background: var(--cy); border: 1.5px solid var(--pp-bd, var(--z-b)); border-radius: 5px 5px 2px 2px; min-height: 3px; display: flex; align-items: flex-end; overflow: hidden; }
    .pn-bar i { display: block; width: 100%; background: var(--cb); }
    .pn-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
    .pn-row { display: grid; grid-template-columns: minmax(0, 1fr) 2.2fr auto; gap: 10px; align-items: center; font-size: .92rem; padding: 4px 0; }
    .pn-row i { display: block; height: 8px; border-radius: 4px; background: var(--cb); }
    .pn-row b { font-variant-numeric: tabular-nums; }
    .pn-todo { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    .pn-todo li { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
    .pn-todo a { color: inherit; font-weight: 700; }
    .pn-todo b { font-family: var(--font-display); font-size: 1.4rem; }
  </style>
  <div class="pn-wrap">
    <header class="page-head"><span class="eyebrow">Panel · solo administración</span>
      <h1>Cómo va Ágape</h1>
      <p>Visitas y cuentas de la app. Las cifras se leen en hora de Chile y se actualizan al abrir la página (última vez: ${esc(ahora)}).</p></header>

    <div class="pn-kpis">
      <div class="card pn-kpi"><b>${hoy.v}</b><span>Visitas hoy</span><small>${ayer.v ? `Ayer: ${ayer.v}` : "Ayer sin visitas"}</small></div>
      <div class="card pn-kpi"><b>${v7}</b><span>Visitas en 7 días</span><small>${pct(v7, va7) ? `${pct(v7, va7)} vs. 7 días anteriores` : "Sin 7 días anteriores"}</small></div>
      <div class="card pn-kpi"><b>${activasHoy}</b><span>Cuentas que entraron hoy</span><small>De ${users.length} cuentas activas</small></div>
      <div class="card pn-kpi"><b>${activas30}</b><span>Cuentas activas en 30 días</span><small>${sinEntrar} sin entrar hace más de 30 días</small></div>
    </div>

    <section class="card pn-sec">
      <h2>Visitas por día (30 días)</h2>
      <p class="muted small">Una visita por celular o computador al día. Barra verde: con cuenta. Barra amarilla: sin cuenta.</p>
      <div class="row-wrap" style="gap:14px;margin-top:10px;font-size:.9rem">
        <span><b>${prom}</b> promedio al día</span>
        <span><b>${mejor && mejor.v ? mejor.v : 0}</b> mejor día ${mejor && mejor.v ? `(${esc(DIA(new Date(mejor.dia + "T12:00:00")))})` : ""}</span>
        <span><b>${v30}</b> visitas en 30 días</span>
      </div>
      ${sinDatos ? `<p class="note" style="margin-top:12px">Aún no hay visitas registradas. Si acaban de publicarse las reglas, empiezan a contarse con la próxima apertura.</p>`
        : `<div class="pn-chart" role="img" aria-label="Visitas por día en los últimos 30 días">${bars}</div>`}
    </section>

    <div class="pn-two pn-sec">
      <section class="card">
        <h2>Lo más visto esta semana</h2>
        <p class="muted small">Cuántos celulares o computadores abrieron cada sección.</p>
        <div style="margin-top:10px">${top.length ? top.map(([k, n]) => `<div class="pn-row"><span>${esc(names[k] || k)}</span><i style="width:${Math.max(6, Math.round((n / topMax) * 100))}%"></i><b>${n}</b></div>`).join("") : `<p class="muted small">Todavía no hay datos de esta semana.</p>`}</div>
      </section>
      <section class="card">
        <h2>Para atender</h2>
        <ul class="pn-todo" style="margin-top:8px">
          <li><span>Solicitudes de cuenta pendientes</span><b>${solicitudes}</b></li>
          <li><span>Cuentas sin entrar hace más de 30 días</span><b>${sinEntrar}</b></li>
        </ul>
        <p class="xs muted" style="margin-top:12px">Para revisar solicitudes o escribir a quienes no han entrado, ve a <a href="#/admin/dirigentes">Gestión → Jóvenes y dirigentes</a>.</p>
      </section>
    </div>

    <p class="xs muted pn-sec">Este panel no muestra quién entra ni qué hace cada persona. Solo cuenta visitas y entradas.</p>
  </div>`;
}
