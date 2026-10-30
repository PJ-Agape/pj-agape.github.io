// Service worker: permite usar la app sin conexión.
// Sube este número cuando cambies archivos de la app (html, css, js) para renovar la caché.
const VERSION = "agape-v415";
const SHELL = [
  "./", "index.html", "css/app.css",
  "js/app.js", "js/avisos.js", "js/emaus.js", "js/admin.js", "js/importar-curso.js", "js/cursos-comunidad.js", "js/store.js", "js/util.js", "js/config.js", "js/cloud.js", "js/muro.js", "js/chat.js", "js/agenda.js", "js/ilustraciones.js", "js/portada.js", "js/capilla.js", "js/cancionero.js", "js/salmos.js", "js/oremus.js", "js/remoto.js", "js/salmos-notas.js", "js/libro.js", "js/acordes-import.js", "js/juegos.js", "js/frente.js", "js/trivia.js", "js/curso-print.js", "js/ultima.js", "js/stickers-img.js", "js/palabras.js", "js/memorice.js", "js/mahjong.js", "js/sopa.js", "js/crucigrama.js", "js/podcast.js", "js/inicio-config.js", "js/inicio-admin.js", "js/credenciales.js", "js/solicitud.js", "js/conocer.js", "js/ficha.js", "js/xlsx-mini.js", "js/repeat.js", "js/avatares.js", "js/personajes.js", "js/inicio.js", "js/novedades.js", "js/papa.js", "js/devocionario.js", "js/dinamicas-banco.js", "js/ayuda.js", "js/dinamicas.js", "js/acompanar.js", "js/desafio.js", "js/fiestas.js", "js/momentos.js", "js/qrcode.mjs", "js/qrcode-utf8.mjs",
  "js/accesible.js", "js/autorizacion.js", "js/consentimiento.js", "js/cuenta.js", "js/difusion.js", "js/estudio.js", "js/fondo-cuenta.js", "js/fondos.js", "js/grupo.js", "js/juegos-arte.js", "js/qr.js", "js/unidad-viva.js", "js/vendor/firebase.mjs", "js/gestion-equipo.js", "js/familias-admin.js", "js/familias-contenido.js", "js/gestion-hoy.js", "js/saludos.js", "js/evangelio-admin.js", "js/apariencia.js", "js/entrada.js", "js/agape-digital.js", "js/apariencia-admin.js", "img/fondos/parque.svg",
  "fonts/fraunces-latin-wght-normal.woff2", "fonts/fraunces-latin-wght-italic.woff2", "fonts/plus-jakarta-sans-latin-wght-normal.woff2", "fonts/bricolage-grotesque-latin-standard-normal.woff2", "fonts/caveat-latin-700-normal.woff2",
  "icons/logo-160.webp", "img/stickers/amigos.webp", "img/stickers/biblia.webp", "img/stickers/comunidad.webp", "img/stickers/oracion.webp", "img/stickers/calendario.webp", "img/stickers/caliz.webp", "img/stickers/guitarra.webp", "icons/logo-320.webp", "icons/favicon-64.png", "icons/icon-192.png", "icons/icon-192r.png", "manifest.webmanifest", "data/contenido.json", ];

self.addEventListener("install", (e) => {
  // «reload»: se piden directo al servidor, para que la versión nueva no guarde copias viejas de otra caché.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  // El contenido cambia cuando el equipo publica: primero red, si no hay, caché.
  if (url.pathname.endsWith("/data/contenido.json")) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // Código y estilos: salen al instante de la caché de esta versión. Cada publicación sube VERSION,
  // así que el teléfono descarga la versión nueva completa y la app se recarga sola una vez para mostrarla.
  // Páginas y datos: primero la red; sin conexión, la copia guardada. Fuentes e imágenes: primero la caché.
  const isAsset = /\.(woff2|png|webp|jpg|svg|js|mjs|css)$/.test(url.pathname);
  if (isAsset) {
    e.respondWith(
      caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: true })).then((hit) => hit || fetch(req, { cache: "no-cache" }).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")))
  );
});

