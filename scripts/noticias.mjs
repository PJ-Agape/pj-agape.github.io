// Noticias automáticas para el portal de agAPPe: lee los canales RSS de fuentes de Iglesia y para jóvenes
// y deja noticias.json con titular, fecha, imagen, una línea de resumen y el enlace a la fuente.
// No copia artículos: solo lo necesario para invitar a leerlos en su sitio.
// Uso: node scripts/noticias.mjs noticias.json
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const FUENTES = [
  { id: "vatican", sec: "iglesia", nombre: "Vatican News", url: "https://www.vaticannews.va/es.rss.xml" },
  { id: "aci", sec: "iglesia", nombre: "ACI Prensa", url: "https://www.aciprensa.com/rss/news" },
  { id: "iglesiacl", sec: "iglesia", nombre: "Iglesia de Chile", url: "https://www.iglesia.cl/feed/" },
  { id: "diocesis", sec: "diocesis", nombre: "Diócesis de Chillán", url: "https://diocesisdechillan.cl/feed/" },
  { id: "pjchile", sec: "jovenes", nombre: "Pastoral Juvenil de Chile", url: "https://pastoraljuvenil.cl/feed/" },
  { id: "injuv", sec: "jovenes", nombre: "INJUV", url: "https://www.injuv.gob.cl/rss.xml" },
];
const POR_FUENTE = 12, DIAS = 30;

const ent = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i")); return m ? ent(m[1]).trim() : ""; };
const limpio = (html) => ent(String(html || "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const corto = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
const httpsOk = (u) => /^https:\/\/[^\s"'<>]+$/.test(u || "") ? u : "";

function imagen(item) {
  const a = item.match(/<media:content[^>]+url="([^"]+)"/i) || item.match(/<media:thumbnail[^>]+url="([^"]+)"/i)
    || item.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image/i) || item.match(/<enclosure[^>]+type="image[^"]*"[^>]*url="([^"]+)"/i)
    || ent(item).match(/<img[^>]+src="([^"]+)"/i);
  return a ? httpsOk(ent(a[1])) : "";
}

function parse(xml, f) {
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const entries = items.length ? [] : [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  return [...items, ...entries].map((it) => {
    const link = tag(it, "link") || (it.match(/<link[^>]+href="([^"]+)"/i) || [])[1] || "";
    const fecha = tag(it, "pubDate") || tag(it, "dc:date") || tag(it, "published") || tag(it, "updated");
    const d = new Date(fecha);
    return {
      src: f.id, fuente: f.nombre, sec: f.sec,
      t: corto(limpio(tag(it, "title")), 140),
      u: httpsOk(ent(link).trim()),
      d: isNaN(d) ? null : d.toISOString(),
      img: imagen(it),
      r: corto(limpio(tag(it, "description") || tag(it, "summary")), 160),
    };
  }).filter((x) => x.t && x.u);
}

async function leer(f) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(f.url, { signal: ctl.signal, headers: { "user-agent": "agAPPe-noticias/1.0 (+https://pj-agape.github.io)", accept: "application/rss+xml, application/xml, text/xml, */*" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const xml = await r.text();
    if (!/<(rss|feed|rdf)/i.test(xml)) throw new Error("no es RSS");
    const xs = parse(xml, f);
    console.log(`✔ ${f.nombre}: ${xs.length} noticias`);
    return { ok: true, xs };
  } catch (e) {
    console.log(`✖ ${f.nombre}: ${e.message}`);
    return { ok: false, xs: [] };
  } finally { clearTimeout(to); }
}

const out = process.argv[2] || "noticias.json";
const previo = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { items: [] };
const lim = Date.now() - DIAS * 864e5;
const items = [], estado = {};
for (const f of FUENTES) {
  const { ok, xs } = await leer(f);
  // Si una fuente falla hoy, se conservan sus noticias anteriores en vez de dejar el hueco.
  const lista = ok ? xs : (previo.items || []).filter((x) => x.src === f.id);
  estado[f.id] = { nombre: f.nombre, sec: f.sec, ok, n: lista.length };
  items.push(...lista.filter((x) => !x.d || new Date(x.d).getTime() > lim).slice(0, POR_FUENTE));
}
items.sort((a, b) => (b.d || "").localeCompare(a.d || ""));
const json = { fuentes: estado, items };
const antes = JSON.stringify({ ...previo, actualizado: undefined }), ahora = JSON.stringify({ ...json, actualizado: undefined });
if (antes !== ahora) { writeFileSync(out, JSON.stringify({ actualizado: new Date().toISOString(), ...json }, null, 1)); console.log(`Guardadas ${items.length} noticias en ${out}`); }
else console.log("Sin cambios");
