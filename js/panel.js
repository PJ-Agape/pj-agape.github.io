// Panel de métricas de Ágape: página aparte, solo para administradores (#/panel). No aparece en el menú.
// Período elegido vs. período anterior de igual largo, comparación por sección y mapas de calor.
// Todo es conteo anónimo: no se guarda quién entra ni qué hace cada persona.
import * as cloud from "./cloud.js";
import { esc, icon, download, toast } from "./util.js";

const DSEM = ["lu", "ma", "mi", "ju", "vi", "sá", "do"]; // lunes primero
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (k) => new Date(k + "T12:00:00");
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = (k, o = { day: "numeric", month: "short" }) => parse(k).toLocaleDateString("es-CL", o);
const wd = (k) => (parse(k).getDay() + 6) % 7; // 0 = lunes
const tsDate = (t) => (t && typeof t.toDate === "function" ? t.toDate() : t ? new Date(t) : null);
const sum = (xs, f) => xs.reduce((a, x) => a + (+f(x) || 0), 0);
const n0 = (n) => Number(n || 0).toLocaleString("es-CL");

// Estado del panel (se conserva mientras la app esté abierta)
const st = { dias: 30, desde: "", hasta: "", data: null, sec: "", imp: {} };

function rango() {
  const hoy = new Date();
  let fin = hoy, ini;
  if (st.desde && st.hasta) { ini = parse(st.desde); fin = parse(st.hasta); if (ini > fin) [ini, fin] = [fin, ini]; }
  else ini = addDays(hoy, -(st.dias - 1));
  const largo = Math.round((parse(key(fin)) - parse(key(ini))) / 864e5) + 1;
  const cur = Array.from({ length: largo }, (_, i) => key(addDays(ini, i)));
  const prev = Array.from({ length: largo }, (_, i) => key(addDays(ini, i - largo)));
  return { cur, prev, largo };
}

async function cargar() {
  const { cur, prev, largo } = rango();
  const id = ++cargar.n;
  const keys = [...prev, ...cur];
  const wks = Array.from({ length: 10 }, (_, i) => cloud.weekKey(addDays(new Date(), -7 * (9 - i))));
  const [stats, vistas, horas, people, semanas, cfg] = await Promise.all([
    cloud.dailyRange("stats", keys), cloud.dailyRange("vistas", keys), cloud.dailyRange("horas", cur),
    cloud.adminData().catch(() => null), cloud.weekStats(wks).catch(() => []), cloud.getPanelCfg().catch(() => null),
  ]);
  if (id !== cargar.n) return; // llegó otra consulta más nueva: se descarta esta
  st.data = {
    cur, prev, largo,
    sC: stats.slice(largo), sP: stats.slice(0, largo),
    vC: vistas.slice(largo), vP: vistas.slice(0, largo),
    h: horas, hDenied: horas.denied,
    sem: semanas, semDenied: semanas.denied,
    users: people ? people.users.filter((u) => u.active !== false) : [],
    solicitudes: people ? people.solicitudes.length : 0,
    at: new Date(),
  };
  st.imp = (cfg && cfg.imp) || st.imp || {};
}

// ---------- piezas ----------
function delta(a, b) {
  if (!b && !a) return `<small class="pn-d">sin datos para comparar</small>`;
  if (!b) return `<small class="pn-d">sin datos en el período anterior</small>`;
  const p = Math.round(((a - b) / b) * 100);
  const s = p > 0 ? "▲" : p < 0 ? "▼" : "＝";
  return `<small class="pn-d"><b>${s} ${Math.abs(p)}%</b> vs. ${n0(b)} antes</small>`;
}
const kpi = (n, l, d) => `<div class="card pn-kpi"><b>${n}</b><span>${l}</span>${d}</div>`;

// Tendencia: período actual (línea llena) vs. anterior (línea gris punteada), alineados día a día.
function tendencia(D) {
  const W = 640, H = 200, L = 34, R = 10, T = 12, B = 26;
  const a = D.sC.map((x) => +x.v || 0), b = D.sP.map((x) => +x.v || 0);
  const max = Math.max(4, ...a, ...b), n = a.length;
  const nice = Math.ceil(max / 4) * 4;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (H - T - B) * (1 - v / nice);
  const path = (xs) => xs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const grid = [0, 1, 2, 3, 4].map((k) => { const v = (nice / 4) * k; return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="pn-grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="pn-ax">${v}</text>`; }).join("");
  const step = Math.max(1, Math.ceil(n / 8));
  const xl = D.cur.map((k, i) => (i % step === 0 || i === n - 1) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="pn-ax">${fmt(k, { day: "numeric", month: "numeric" })}</text>` : "").join("");
  const bw = (W - L - R) / Math.max(1, n);
  const hits = D.cur.map((k, i) => `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${H - T - B}" fill="transparent" data-tip="${esc(fmt(k, { weekday: "short", day: "numeric", month: "short" }))}: ${a[i]} visitas · el día equivalente antes (${esc(fmt(D.prev[i]))}): ${b[i]}"/>`).join("");
  const dots = n <= 31 ? a.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" class="pn-dot"/>`).join("") : "";
  return `<svg viewBox="0 0 ${W} ${H}" class="pn-svg" role="img" aria-label="Visitas por día: período actual comparado con el anterior">
    ${grid}${xl}<path d="${path(b)}" class="pn-prev"/><path d="${path(a)}" class="pn-cur"/>${dots}${hits}</svg>`;
}

// Escala secuencial de un solo tono (del papel al color de la marca)
const tono = (v, max) => {
  if (!v) return "var(--pn-cell0)";
  const t = Math.min(1, v / Math.max(1, max));
  const p = [16, 34, 52, 72, 92][Math.min(4, Math.floor(t * 5 - 1e-9))];
  return `color-mix(in srgb, var(--cb) ${p}%, var(--surface))`;
};
const leyendaTono = (max) => `<div class="pn-scale"><span>menos</span>${[0.1, 0.3, 0.5, 0.7, 0.95].map((t) => `<i style="background:${tono(t * max, max)}"></i>`).join("")}<span>más</span></div>`;

// ---------- Semáforo: qué mantener, mejorar, simplificar o sacar ----------
// Cruza tres cosas: cuánto se usa (comparado con las demás), si su uso sube o baja, y qué tan importante es para la pastoral (lo marca el equipo).
const IMP = { 3: "Esencial", 2: "Importante", 1: "Accesoria" };
const VERED = {
  mantener: { l: "Mantener", c: "ok", d: "Se usa y va bien." },
  cuidar: { l: "Revisar", c: "warn", d: "Se usa, pero viene bajando: conviene preguntar por qué." },
  impulsar: { l: "Mejorar o dar a conocer", c: "warn", d: "Es importante, pero casi no se usa: quizás no la encuentran o no se entiende." },
  observar: { l: "Observar", c: "neu", d: "Uso intermedio: sigue mirándola." },
  simplificar: { l: "Simplificar o sacar", c: "bad", d: "Poco uso y poca importancia: ocupa espacio en la app." },
};
function semaforo(D) {
  const names = cloud.VISTAS || {};
  const tot = (xs) => { const o = {}; xs.forEach((d) => Object.keys(names).forEach((k) => { o[k] = (o[k] || 0) + (+d[k] || 0); })); return o; };
  const a = tot(D.vC), b = tot(D.vP);
  const secs = Object.keys(names).sort((x, y) => a[y] - a[x]);
  const totalA = secs.reduce((n, k) => n + a[k], 0);
  if (!totalA) return `<p class="muted small">Todavía no hay uso registrado en este período.</p>`;
  const tercio = Math.ceil(secs.length / 3);
  const filas = secs.map((k, i) => {
    const uso = i < tercio && a[k] ? "alto" : i >= secs.length - tercio || !a[k] ? "bajo" : "medio";
    const t = b[k] >= 5 ? (a[k] - b[k]) / b[k] : null;
    const tend = t == null ? "sin base" : t >= 0.15 ? "sube" : t <= -0.15 ? "baja" : "estable";
    const imp = +(st.imp[k] || 2);
    const v = uso === "alto" ? (tend === "baja" ? "cuidar" : "mantener")
      : uso === "bajo" ? (imp === 3 ? "impulsar" : imp === 1 && tend !== "sube" ? "simplificar" : "observar")
      : (tend === "baja" && imp >= 2 ? "cuidar" : "observar");
    return { k, a: a[k], b: b[k], uso, tend, imp, v };
  });
  const orden = { impulsar: 0, cuidar: 1, simplificar: 2, observar: 3, mantener: 4 };
  filas.sort((x, y) => orden[x.v] - orden[y.v] || y.a - x.a);
  const resumen = Object.keys(VERED).map((v) => [v, filas.filter((f) => f.v === v).length]).filter(([, n]) => n);
  const tendTxt = (f) => f.tend === "sin base" ? `<span class="muted">sin base</span>` : `${f.tend === "sube" ? "▲" : f.tend === "baja" ? "▼" : "＝"} ${f.tend}`;
  const fila = (f) => `<tr><td><b>${esc(names[f.k])}</b></td>
    <td><span class="pn-pill ${VERED[f.v].c}" data-tip="${esc(VERED[f.v].d)}"><i aria-hidden="true"></i>${VERED[f.v].l}</span></td>
    <td class="pn-num" data-tip="${f.a} aperturas ahora · ${f.b} en el período anterior">${f.a} <small class="muted">${f.uso}</small></td>
    <td class="pn-nw">${tendTxt(f)}</td>
    <td><select class="input pn-imp" data-pn-imp="${f.k}" aria-label="Importancia pastoral de ${esc(names[f.k])}">${[3, 2, 1].map((n) => `<option value="${n}" ${f.imp === n ? "selected" : ""}>${IMP[n]}</option>`).join("")}</select></td></tr>`;
  const tabla = (xs) => xs.length ? `<div style="overflow-x:auto"><table class="pn-tab pn-sem"><thead><tr><th>Sección</th><th>Sugerencia</th><th class="pn-num">Uso</th><th>Tendencia</th><th>Importancia pastoral</th></tr></thead><tbody>${xs.map(fila).join("")}</tbody></table></div>`
    : `<p class="small" style="margin-top:10px">Nada urgente: ninguna sección necesita atención en este período.</p>`;
  const foco = filas.filter((f) => ["impulsar", "cuidar", "simplificar"].includes(f.v)), resto = filas.filter((f) => !foco.includes(f));
  return `${totalA < 60 ? `<p class="note" style="margin-top:10px">Con pocos datos (${totalA} aperturas en el período), tómalo como una pista para conversar con el grupo, no como un veredicto.</p>` : ""}
  <div class="pn-sem-res">${resumen.map(([v, n]) => `<span class="pn-pill ${VERED[v].c}"><i aria-hidden="true"></i>${VERED[v].l}: <b>${n}</b></span>`).join("")}</div>
  ${tabla(foco)}
  ${resto.length ? `<details class="pn-more"><summary class="small"><b>Ver las demás secciones (${resto.length})</b>: van bien o hay que seguir mirándolas</summary>${tabla(resto)}</details>` : ""}
  <details class="pn-how"><summary class="small">Cómo se calcula</summary><p class="small muted">Uso: las secciones se ordenan por aperturas en el período y se dividen en tres grupos (alto, medio, bajo). Tendencia: compara con el período anterior; sube o baja si cambia 15% o más, y necesita al menos 5 aperturas antes para opinar. Importancia: la marcas tú; parte en «Importante». La sugerencia nunca saca nada sola: es para conversar en el equipo.</p></details>`;
}

// ---------- ¿Vuelven? Retorno semana a semana ----------
function retorno(D) {
  const w = D.sem || [];
  if (D.semDenied) return `<p class="note">Falta publicar en Firebase las reglas nuevas (la parte <b>semanas</b>). Desde que se publiquen, se empieza a medir quién vuelve cada semana.</p>`;
  if (!w.some((x) => x.a)) return `<p class="note">El retorno se empezó a medir recién. La primera semana solo cuenta quién entra; desde la segunda ya se ve quién vuelve.</p>`;
  const rows = w.map((x, i) => { const p = i ? w[i - 1].a : 0; return { ...x, prevA: p, pct: p ? Math.round((x.r / p) * 100) : null }; });
  const lab = (k) => { const [y, n] = k.split("-W"); const d = new Date(+y, 0, 4); const dd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dd + (+n - 1) * 7); return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }); };
  const max = Math.max(1, ...rows.map((x) => x.a));
  const ult = rows.filter((x) => x.pct != null && x.prevA).slice(-4);
  const prom = ult.length ? Math.round(ult.reduce((s, x) => s + x.pct, 0) / ult.length) : null;
  return `${prom != null ? `<p style="margin-top:8px"><b class="pn-big">${prom}%</b> <span class="small">de quienes entraron una semana volvieron la siguiente (promedio de las últimas ${ult.length} semanas).</span></p>` : ""}
  <div class="pn-wk">${rows.map((x) => `<div class="pn-wkc" data-tip="Semana del ${esc(lab(x.wk))}: ${x.a} activos · ${x.n} nuevos · ${x.r} volvieron de la semana anterior${x.pct != null ? ` (${x.pct}%)` : ""}">
      <div class="pn-wkb" style="height:${Math.round((x.a / max) * 100)}%"><i style="height:${x.a ? Math.round((x.r / x.a) * 100) : 0}%"></i></div><small>${esc(lab(x.wk))}</small></div>`).join("")}</div>
  <div class="pn-legend"><span><i class="pn-sq r"></i>volvieron de la semana anterior</span><span><i class="pn-sq o"></i>nuevos u otros que regresan</span></div>
  <p class="xs muted">Se cuenta por celular o computador, una vez por semana (de lunes a domingo). No se guarda quién es.</p>`;
}

// Mapa de calor: secciones (filas) × día de la semana (columnas)
function calorSecciones(D) {
  const names = cloud.VISTAS || {};
  const m = {};
  D.vC.forEach((d) => Object.keys(names).forEach((s) => { const v = +d[s] || 0; if (!v) return; (m[s] = m[s] || Array(7).fill(0))[wd(d.dia)] += v; }));
  const rows = Object.entries(m).map(([s, a]) => [s, a, a.reduce((x, y) => x + y, 0)]).sort((x, y) => y[2] - x[2]).slice(0, 12);
  if (!rows.length) return `<p class="muted small">Todavía no hay secciones contadas en este período.</p>`;
  const max = Math.max(...rows.flatMap((r) => r[1]));
  return `<div class="pn-heat" style="--cols:7">
    <span></span>${DSEM.map((d) => `<span class="pn-hh">${d}</span>`).join("")}<span class="pn-hh">total</span>
    ${rows.map(([s, a, t]) => `<span class="pn-hr">${esc(names[s] || s)}</span>${a.map((v, i) => `<i style="background:${tono(v, max)}" data-tip="${esc(names[s] || s)} · ${["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"][i]}: ${v}"></i>`).join("")}<b class="pn-ht">${t}</b>`).join("")}
  </div>${leyendaTono(max)}`;
}

// Mapa de calor: hora de llegada × día de la semana
function calorHoras(D) {
  const g = Array.from({ length: 7 }, () => Array(24).fill(0));
  let tot = 0;
  D.h.forEach((d) => { for (let h = 0; h < 24; h++) { const v = +d["h" + String(h).padStart(2, "0")] || 0; g[wd(d.dia)][h] += v; tot += v; } });
  if (!tot) return `<p class="note">${D.hDenied
    ? "Falta publicar en Firebase las reglas nuevas (la parte <b>horas</b>). Desde que se publiquen, se empieza a registrar a qué hora llega la gente."
    : "La hora de llegada se empezó a registrar recién: el mapa se irá llenando con los días."}</p>`;
  const max = Math.max(...g.flat());
  const hrs = Array.from({ length: 24 }, (_, h) => h);
  return `<div class="pn-heat pn-heat-h" style="--cols:24">
    <span></span>${hrs.map((h) => `<span class="pn-hh">${h % 3 === 0 ? h : ""}</span>`).join("")}
    ${g.map((row, i) => `<span class="pn-hr">${DSEM[i]}</span>${row.map((v, h) => `<i style="background:${tono(v, max)}" data-tip="${["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábados", "Domingos"][i]} de ${h}:00 a ${h}:59 · ${v} llegadas"></i>`).join("")}`).join("")}
  </div>${leyendaTono(max)}`;
}

// Secciones: período actual vs. anterior
function tablaSecciones(D) {
  const names = cloud.VISTAS || {};
  const tot = (xs) => { const o = {}; xs.forEach((d) => Object.keys(names).forEach((s) => { o[s] = (o[s] || 0) + (+d[s] || 0); })); return o; };
  const a = tot(D.vC), b = tot(D.vP);
  const rows = Object.keys(names).filter((s) => a[s] || b[s]).sort((x, y) => a[y] - a[x] || b[y] - b[x]);
  if (!rows.length) return `<p class="muted small">Sin datos en estos períodos.</p>`;
  const max = Math.max(1, ...rows.map((s) => Math.max(a[s], b[s])));
  return `<div style="overflow-x:auto"><table class="pn-tab"><thead><tr><th>Sección</th><th class="pn-num">Actual</th><th class="pn-num">Antes</th><th class="pn-num">Cambio</th><th class="pn-barcol" aria-hidden="true"></th></tr></thead><tbody>
    ${rows.map((s) => { const p = b[s] ? Math.round(((a[s] - b[s]) / b[s]) * 100) : null;
      return `<tr><td>${esc(names[s])}</td><td class="pn-num"><b>${a[s]}</b></td><td class="pn-num">${b[s]}</td>
      <td class="pn-num">${p == null ? (a[s] ? "nuevo" : "—") : `${p > 0 ? "▲" : p < 0 ? "▼" : "＝"} ${Math.abs(p)}%`}</td>
      <td class="pn-barcol" aria-hidden="true"><span class="pn-pair"><i style="width:${Math.round((a[s] / max) * 100)}%"></i><i class="p" style="width:${Math.round((b[s] / max) * 100)}%"></i></span></td></tr>`; }).join("")}
  </tbody></table></div>`;
}

function csv(D) {
  const names = cloud.VISTAS || {};
  const secs = Object.keys(names);
  const head = ["fecha", "visitas", "con_cuenta", "sin_cuenta", ...secs.map((s) => names[s])];
  const lines = D.cur.map((k, i) => [k, +D.sC[i].v || 0, +D.sC[i].c || 0, +D.sC[i].g || 0, ...secs.map((s) => +D.vC[i][s] || 0)]);
  return [head, ...lines].map((r) => r.map((c) => (/[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(";")).join("\n");
}

function cuerpo() {
  const D = st.data;
  if (!D) return `<p class="muted" style="padding:24px 0">Cargando…</p>`;
  const v = sum(D.sC, (x) => x.v), vp = sum(D.sP, (x) => x.v);
  const c = sum(D.sC, (x) => x.c), cp = sum(D.sP, (x) => x.c);
  const g = sum(D.sC, (x) => x.g), gp = sum(D.sP, (x) => x.g);
  const dv = D.sC.filter((x) => +x.v).length, dvp = D.sP.filter((x) => +x.v).length;
  const prom = (x, n) => (n ? Math.round((x / n) * 10) / 10 : 0);
  const myUid = cloud.myUid();
  const desde = (dias) => D.users.filter((u) => { if ((u.uid || u.id) === myUid) return true; const d = tsDate(u.lastSeen); return d && !isNaN(d) && Date.now() - d.getTime() < dias * 864e5; }).length;
  const hoyK = key(new Date());
  const hoyCuentas = D.users.filter((u) => { if ((u.uid || u.id) === myUid) return true; const d = tsDate(u.lastSeen); return d && !isNaN(d) && key(d) === hoyK; }).length;
  const sinEntrar = D.users.length - desde(30);
  const per = `${fmt(D.cur[0])} – ${fmt(D.cur[D.cur.length - 1])}`, perP = `${fmt(D.prev[0])} – ${fmt(D.prev[D.prev.length - 1])}`;

  return `
  <p class="small muted" style="margin-top:4px">Período: <b>${esc(per)}</b> (${D.largo} días) · se compara con <b>${esc(perP)}</b>.</p>
  <div class="pn-kpis">
    ${kpi(n0(v), "Visitas", delta(v, vp))}
    ${kpi(prom(v, D.largo), "Visitas por día", delta(prom(v, D.largo), prom(vp, D.largo)))}
    ${kpi(n0(c), "Visitas con cuenta", delta(c, cp))}
    ${kpi(n0(g), "Visitas sin cuenta", delta(g, gp))}
    ${kpi(`${dv}<small class="pn-of">/${D.largo}</small>`, "Días con visitas", delta(dv, dvp))}
  </div>

  <section class="card pn-sec">
    <h2>Qué mantener, mejorar o sacar</h2>
    <p class="muted small">Cada sección según cuánto se usa, si sube o baja, y cuán importante es para la pastoral. Cambia la importancia y la sugerencia se ajusta. Toca una sugerencia para ver por qué.</p>
    ${semaforo(D)}
  </section>

  <section class="card pn-sec">
    <h2>¿Vuelven?</h2>
    <p class="muted small">Barra completa: celulares o computadores activos en la semana. Parte de color: los que también vinieron la semana anterior.</p>
    ${retorno(D)}
  </section>

  <section class="card pn-sec">
    <h2>Visitas por día</h2>
    <p class="muted small">Cada punto es un día. La línea gris es el período anterior, día por día. Toca un día para ver las cifras.</p>
    <div class="pn-legend"><span><i class="pn-k cur"></i>${esc(per)}</span><span><i class="pn-k prev"></i>${esc(perP)}</span></div>
    ${v || vp ? tendencia(D) : `<p class="note">No hay visitas registradas en estas fechas.</p>`}
  </section>

  <section class="card pn-sec">
    <h2>Intereses: qué se abre y qué día</h2>
    <p class="muted small">Cuántos celulares o computadores abrieron cada sección, sumando todos los lunes, todos los martes, etc. del período. Más oscuro = más uso.</p>
    ${calorSecciones(D)}
  </section>

  <section class="card pn-sec">
    <h2>A qué hora llega la gente</h2>
    <p class="muted small">Hora de la primera entrada del día en cada celular o computador.</p>
    ${calorHoras(D)}
  </section>

  <section class="card pn-sec">
    <h2>Secciones: este período y el anterior</h2>
    <p class="muted small">Barra de color: período actual. Barra gris: período anterior.</p>
    ${tablaSecciones(D)}
  </section>

  <div class="pn-two pn-sec">
    <section class="card">
      <h2>Cuentas</h2>
      <p class="muted small">Según la última vez que cada persona entró. Esta cifra no guarda historia, así que no se compara con períodos anteriores.</p>
      <ul class="pn-todo">
        <li><span>Entraron hoy (desde las 00:00)</span><b>${hoyCuentas}</b></li>
        <li><span>Entraron en los últimos 7 días</span><b>${desde(7)}</b></li>
        <li><span>Entraron en los últimos 30 días</span><b>${desde(30)}</b></li>
        <li><span>Total de cuentas activas</span><b>${D.users.length}</b></li>
      </ul>
    </section>
    <section class="card">
      <h2>Para atender</h2>
      <ul class="pn-todo">
        <li><span>Solicitudes de cuenta pendientes</span><b>${D.solicitudes}</b></li>
        <li><span>Cuentas sin entrar hace más de 30 días</span><b>${sinEntrar}</b></li>
      </ul>
      <p class="xs muted" style="margin-top:12px">Para responderlas, ve a <a href="#/admin/dirigentes">Gestión → Jóvenes y dirigentes</a>.</p>
    </section>
  </div>

  <details class="card pn-sec"><summary><b>Ver los datos en tabla</b></summary>
    <div style="overflow-x:auto;margin-top:10px"><table class="pn-tab"><thead><tr><th>Fecha</th><th class="pn-num">Visitas</th><th class="pn-num">Con cuenta</th><th class="pn-num">Sin cuenta</th><th class="pn-num">Mismo día antes</th></tr></thead><tbody>
    ${D.cur.map((k, i) => `<tr><td>${esc(fmt(k, { weekday: "short", day: "numeric", month: "short" }))}</td><td class="pn-num">${+D.sC[i].v || 0}</td><td class="pn-num">${+D.sC[i].c || 0}</td><td class="pn-num">${+D.sC[i].g || 0}</td><td class="pn-num">${+D.sP[i].v || 0}</td></tr>`).join("")}
    </tbody></table></div></details>

  <p class="xs muted pn-sec">Actualizado a las ${esc(D.at.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }))}. Este panel no muestra quién entra ni qué hace cada persona: solo cuenta visitas.</p>`;
}

function controles() {
  const on = (d) => (!st.desde && st.dias === d ? "accent" : "");
  const hoy = key(new Date());
  return `<div class="pn-ctl">
    <div class="row-wrap" style="gap:6px">${[7, 30, 90].map((d) => `<button class="chip ${on(d)}" data-pn="dias" data-v="${d}">${d} días</button>`).join("")}
      <button class="chip ${st.desde ? "accent" : ""}" data-pn="custom">Fechas</button></div>
    <div class="pn-fechas" ${st.desde || st.sec === "custom" ? "" : "hidden"}>
      <label class="small">Desde <input type="date" class="input" id="pnDesde" max="${hoy}" value="${esc(st.desde)}"></label>
      <label class="small">Hasta <input type="date" class="input" id="pnHasta" max="${hoy}" value="${esc(st.hasta)}"></label>
      <button class="btn btn-sm btn-primary" data-pn="aplicar">Ver</button>
    </div>
    <div class="row-wrap" style="gap:6px;margin-left:auto">
      <button class="btn btn-sm btn-ghost" data-pn="recargar">Actualizar</button>
      <button class="btn btn-sm btn-soft" data-pn="csv">Descargar CSV</button>
    </div>
  </div>`;
}

const STYLE = `<style>
  .pn-wrap { max-width: 1040px; margin: 0 auto; padding: 8px 4px 40px; --pn-cell0: color-mix(in srgb, var(--ink-3) 10%, var(--surface)); }
  .pn-ctl { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px; position: sticky; top: 0; z-index: 3; background: var(--paper, var(--surface)); padding: 8px 0; }
  .pn-fechas { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; }
  .pn-fechas[hidden] { display: none; }
  .pn-fechas label { display: grid; gap: 2px; }
  .pn-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 12px; }
  .pn-kpi { padding: 14px 16px; display: grid; gap: 4px; align-content: start; }
  .pn-kpi > b { font-family: var(--font-display); font-size: 1.9rem; line-height: 1; font-weight: 650; font-variant-numeric: tabular-nums; }
  .pn-kpi > span { font-size: .85rem; font-weight: 700; }
  .pn-d { color: var(--ink-2); font-size: .75rem; } .pn-d b { color: var(--ink); }
  .pn-of { font-size: .9rem; color: var(--ink-3); font-weight: 600; }
  .pn-sec { margin-top: 18px; }
  .pn-sec h2, .pn-two h2 { font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 2px; }
  .pn-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: .8rem; color: var(--ink-2); margin: 10px 0 4px; }
  .pn-k { display: inline-block; width: 18px; height: 0; border-top: 2px solid var(--cb); vertical-align: middle; margin-right: 6px; }
  .pn-k.prev { border-top: 2px dashed var(--ink-3); }
  .pn-svg { width: 100%; height: auto; display: block; margin-top: 6px; touch-action: manipulation; }
  .pn-grid { stroke: var(--line); stroke-width: 1; }
  .pn-ax { font-size: 10px; fill: var(--ink-3); font-family: inherit; }
  .pn-cur { fill: none; stroke: var(--cb); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .pn-prev { fill: none; stroke: var(--ink-3); stroke-width: 2; stroke-dasharray: 4 4; opacity: .8; }
  .pn-dot { fill: var(--cb); stroke: var(--surface); stroke-width: 2; }
  .pn-heat { display: grid; grid-template-columns: minmax(84px, max-content) repeat(var(--cols), minmax(0, 1fr)) auto; gap: 3px; align-items: center; margin-top: 12px; font-size: .8rem; }
  .pn-heat-h { grid-template-columns: 28px repeat(24, minmax(0, 1fr)); gap: 2px; }
  .pn-heat i { display: block; height: 26px; border-radius: 4px; }
  .pn-heat-h i { height: 20px; border-radius: 3px; }
  .pn-hh { text-align: center; font-size: .7rem; color: var(--ink-3); font-weight: 700; }
  .pn-hr { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 6px; }
  .pn-ht { text-align: right; padding-left: 6px; font-variant-numeric: tabular-nums; }
  .pn-scale { display: flex; align-items: center; gap: 3px; justify-content: flex-end; font-size: .7rem; color: var(--ink-3); margin-top: 8px; }
  .pn-scale i { width: 18px; height: 10px; border-radius: 2px; } .pn-scale span { margin: 0 4px; }
  .pn-tab { width: 100%; border-collapse: collapse; font-size: .88rem; margin-top: 10px; }
  .pn-tab th { text-align: left; font-size: .72rem; color: var(--ink-3); font-weight: 700; padding: 6px 6px; border-bottom: 1px solid var(--line); }
  .pn-tab td { padding: 6px; border-bottom: 1px solid var(--line); }
  .pn-num { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pn-barcol { width: 30%; }
  .pn-pair { display: grid; gap: 2px; } .pn-pair i { display: block; height: 6px; border-radius: 3px; background: var(--cb); min-width: 2px; } .pn-pair i.p { background: color-mix(in srgb, var(--ink-3) 45%, var(--surface)); }
  .pn-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
  .pn-todo { list-style: none; padding: 0; margin: 8px 0 0; }
  .pn-todo li { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--line); }
  .pn-todo b { font-family: var(--font-display); font-size: 1.3rem; font-variant-numeric: tabular-nums; }
  .pn-pill { display: inline-flex; align-items: center; gap: 6px; font-size: .78rem; font-weight: 700; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); white-space: nowrap; }
  .pn-pill i { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .pn-pill.ok i { background: #2f9e6b; } .pn-pill.warn i { background: #e0a800; } .pn-pill.bad i { background: #d6453d; } .pn-pill.neu i { background: var(--ink-3); }
  .pn-sem-res { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .pn-sem td { vertical-align: middle; } .pn-nw { white-space: nowrap; }
  .pn-imp { padding: 4px 8px; font-size: .8rem; min-height: 0; width: auto; }
  .pn-more { margin-top: 12px; } .pn-more summary { cursor: pointer; color: var(--ink-2); }
  .pn-how { margin-top: 10px; } .pn-how summary { cursor: pointer; color: var(--ink-2); }
  .pn-big { font-family: var(--font-display); font-size: 1.8rem; }
  .pn-wk { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; align-items: end; height: 150px; margin-top: 12px; }
  .pn-wkc { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: 1fr auto; height: 100%; align-items: end; text-align: center; gap: 4px; }
  .pn-wkc small { font-size: .62rem; color: var(--ink-3); font-weight: 700; white-space: nowrap; }
  .pn-wkb { background: color-mix(in srgb, var(--cb) 28%, var(--surface)); border-radius: 5px 5px 2px 2px; min-height: 3px; display: flex; align-items: flex-end; overflow: hidden; }
  .pn-wkb i { display: block; width: 100%; background: var(--cb); }
  .pn-sq { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
  .pn-sq.r { background: var(--cb); } .pn-sq.o { background: color-mix(in srgb, var(--cb) 28%, var(--surface)); }
  .pn-tip { position: fixed; z-index: 50; pointer-events: none; background: var(--ink); color: var(--surface); font-size: .78rem; padding: 6px 9px; border-radius: 8px; max-width: 240px; box-shadow: 0 4px 14px rgb(0 0 0 / .18); }
  [data-tip] { cursor: default; }
  @media (max-width: 560px) {
    .pn-sem thead { display: none; }
    .pn-sem tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 10px; padding: 10px 0; border-bottom: 1px solid var(--line); align-items: center; }
    .pn-sem td { border: 0; padding: 0; }
    .pn-sem td:nth-child(3) { text-align: right; }
    .pn-sem td:nth-child(4) { grid-row: 2; grid-column: 2; font-size: .78rem; color: var(--ink-2); text-align: right; }
    .pn-sem td:nth-child(5) { grid-column: 1 / -1; grid-row: 3; }
    .pn-sem td:nth-child(2) { grid-row: 2; grid-column: 1; }
    .pn-wkc:nth-child(even) small { visibility: hidden; }
  }
  @media (max-width: 560px) { .pn-barcol { display: none; } .pn-tab { font-size: .8rem; } .pn-tab td, .pn-tab th { padding: 6px 4px; } .pn-heat { font-size: .72rem; } .pn-heat i { height: 22px; } }
</style>`;

function pintar() {
  const box = document.getElementById("pnBody"); if (!box) return;
  box.innerHTML = cuerpo();
  const c = document.getElementById("pnCtl"); if (c) c.innerHTML = controles();
}
async function recargar() {
  const box = document.getElementById("pnBody");
  if (box) box.style.opacity = ".45";
  try { await cargar(); } catch (e) { st.data = null; }
  if (box) box.style.opacity = "";
  pintar();
}

cargar.n = 0;
let wired = false;
function wire() {
  if (wired) return; wired = true;
  let tip = null;
  const hideTip = () => { if (tip) { tip.remove(); tip = null; } };
  const showTip = (el, ev) => {
    if (!tip) { tip = document.createElement("div"); tip.className = "pn-tip"; document.body.appendChild(tip); }
    tip.textContent = el.getAttribute("data-tip");
    const r = el.getBoundingClientRect();
    const x = ev && ev.clientX ? ev.clientX : r.left + r.width / 2, yy = r.top;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - 250, x - 110)) + "px";
    tip.style.top = Math.max(8, yy - 44) + "px";
  };
  document.addEventListener("pointerover", (e) => { const el = e.target.closest && e.target.closest(".pn-wrap [data-tip]"); if (el) showTip(el, e); else hideTip(); });
  document.addEventListener("scroll", hideTip, { passive: true });
  window.addEventListener("hashchange", hideTip);
  document.addEventListener("change", async (e) => {
    const sel = e.target.closest && e.target.closest(".pn-wrap [data-pn-imp]");
    if (!sel) return;
    st.imp = { ...st.imp, [sel.dataset.pnImp]: +sel.value };
    pintar();
    try { await cloud.savePanelCfg({ imp: st.imp }); } catch { toast("No se pudo guardar la importancia. Revisa la conexión."); }
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest(".pn-wrap [data-pn]");
    if (!t) { const el = e.target.closest && e.target.closest(".pn-wrap [data-tip]"); if (el) showTip(el, e); return; }
    const a = t.dataset.pn;
    if (a === "dias") { st.dias = +t.dataset.v; st.desde = st.hasta = ""; st.sec = ""; recargar(); }
    else if (a === "custom") { st.sec = "custom"; const c = document.getElementById("pnCtl"); if (c) c.innerHTML = controles(); }
    else if (a === "aplicar") {
      const d = document.getElementById("pnDesde")?.value, h = document.getElementById("pnHasta")?.value;
      if (!d || !h) return;
      const n = Math.abs((parse(h) - parse(d)) / 864e5) + 1;
      if (n > 366) { alertMsg("Elige un período de hasta un año."); return; }
      st.desde = d; st.hasta = h; recargar();
    }
    else if (a === "recargar") recargar();
    else if (a === "csv" && st.data) download(`agape-metricas-${st.data.cur[0]}_${st.data.cur[st.data.cur.length - 1]}.csv`, "﻿" + csv(st.data), "text/csv;charset=utf-8");
  });
}
const alertMsg = (m) => { const b = document.querySelector(".pn-fechas"); if (b && !b.querySelector(".pn-err")) b.insertAdjacentHTML("beforeend", `<span class="pn-err small" style="color:var(--co)">${esc(m)}</span>`); };

export async function view() {
  if (!cloud.enabled || !cloud.state().isAdmin) {
    return `<div class="card" style="max-width:480px;margin:6vh auto 0;text-align:center;padding:32px">
      <div class="tile-ico" style="margin:0 auto 12px">${icon("lock")}</div>
      <h1 class="display" style="font-size:1.6rem">Esta página es solo para administración</h1>
      <a class="btn btn-primary" style="margin-top:16px" href="#/">Volver al inicio</a></div>`;
  }
  wire();
  try { await cargar(); } catch { st.data = null; }
  return `${STYLE}<div class="pn-wrap">
    <header class="page-head"><span class="eyebrow">Panel · solo administración</span><h1>Métricas de Ágape</h1>
      <p>Elige un período y compáralo con el anterior del mismo largo. Toca cualquier barra, punto o casilla para ver la cifra exacta.</p></header>
    <div id="pnCtl">${controles()}</div>
    <div id="pnBody">${cuerpo()}</div>
  </div>`;
}
