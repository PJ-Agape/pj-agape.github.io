// Salmos cantados: recorre los videos del canal de YouTube «Cántalos Salmos» y guarda, para cada
// salmo, su video (data/salmos-yt.json). Lo ejecuta una acción de GitHub una vez por semana.
// No usa claves ni cuentas: lee la página pública del canal y sus páginas siguientes.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = process.argv[2] || "data/salmos-yt.json";
const HANDLE = process.env.CANAL_SALMOS || "@CantalosSalmos";
const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "es-CL,es;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" };
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const falla = (msg) => { console.warn(msg); writeFileSync(OUT, JSON.stringify({ ...prev, canal: HANDLE, error: msg, revisado: new Date().toISOString().slice(0, 10) }, null, 1) + "\n"); process.exit(0); };

// Saca pares (id, título) de un trozo de la respuesta de YouTube (HTML o JSON).
const vistos = new Map();
function sacar(txt) {
  for (const m of txt.matchAll(/"videoId":"([\w-]{11})"/g)) {
    if (vistos.has(m[1])) continue;
    const t = txt.slice(m.index, m.index + 6000).match(/"title":\{(?:"runs":\[\{"text"|"simpleText"|"content"):"((?:[^"\\]|\\.)*)"/);
    if (t) try { vistos.set(m[1], JSON.parse(`"${t[1]}"`)); } catch {}
  }
  const c = txt.match(/"continuationCommand":\{"token":"([^"]+)"/);
  return c ? c[1] : "";
}

async function paginas(tab) {
  const r = await fetch(`https://www.youtube.com/${HANDLE}/${tab}`, { headers: UA }).catch((e) => ({ ok: false, status: e.message, text: async () => "" }));
  const html = await r.text();
  if (!html.includes("ytInitialData")) return `${tab}: ${r.status}, ${html.length} bytes`;
  const key = (html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1], ver = (html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1] || "2.20240101.00.00";
  let tok = sacar(html), n = 0;
  while (tok && key && n++ < 60) {
    const j = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`, {
      method: "POST", headers: { ...UA, "Content-Type": "application/json" },
      body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: ver, hl: "es", gl: "CL" } }, continuation: tok }),
    }).then((x) => x.text()).catch(() => "");
    tok = sacar(j);
  }
  return "";
}
const errs = [];
for (const tab of ["videos", "shorts", "streams"]) { const e = await paginas(tab); if (e) errs.push(e); }
if (!vistos.size) falla(`Sin videos (${errs.join(" · ")})`);

// El número del salmo: «Salmo 23», «Sal 23», «Salmo 22 (23)»… Se guardan los dos si vienen.
const salmos = {};
const sinNumero = [];
for (const [id, title] of vistos) {
  const m = title.match(/\b(?:salmo|sal\.?|psalm)\s*(\d{1,3})(?:\s*[(\[]\s*(\d{1,3})\s*[)\]])?/i);
  if (!m) { sinNumero.push(title); continue; }
  const n = +m[1]; if (!(n >= 1 && n <= 151)) { sinNumero.push(title); continue; }
  (salmos[n] = salmos[n] || []).push({ id, t: title, ...(m[2] ? { alt: +m[2] } : {}) });
}
const out = { canal: HANDLE, fuente: "Cántalos Salmos (YouTube)", total: vistos.size, conNumero: Object.keys(salmos).length, salmos, sinNumero: sinNumero.slice(0, 40), ...(errs.length ? { avisos: errs } : {}) };
const igual = JSON.stringify(out) === JSON.stringify({ ...prev, revisado: undefined, error: undefined }, (k, v) => (v === undefined ? undefined : v));
if (!igual) { writeFileSync(OUT, JSON.stringify({ ...out, revisado: new Date().toISOString().slice(0, 10) }, null, 1) + "\n"); console.log(`salmos-yt.json: ${vistos.size} videos, ${out.conNumero} salmos`); }
else console.log("salmos-yt.json sin cambios");
