/* Service worker del Arancel Orai (F-3). Versión: e6c3c65da1f6. Generado por scripts/publicar.py: no se edita. */
const CACHE = "arancel-orai-e6c3c65da1f6";
// la página se guarda con la clave "./": Cloudflare Pages redirige /index.html a /, y el navegador no acepta servir
// a una navegación una respuesta que vino de una redirección (sin internet la página no abriría)
const PAGINA = "./";
const PRECARGA = ["manifest.webmanifest", "iconos/apple-touch-icon.png", "iconos/icono-192.png", "iconos/icono-512.png", "iconos/icono-maskable-512.png"];

// una copia de la respuesta sin la marca de redirección, para poder servirla después a una navegación
async function sinRedireccion(respuesta) {
  if (!respuesta.redirected) return respuesta;
  return new Response(await respuesta.blob(), {
    status: respuesta.status, statusText: respuesta.statusText, headers: respuesta.headers,
  });
}

self.addEventListener("install", (evento) => {
  evento.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(PRECARGA);
    const pagina = await fetch(PAGINA, { cache: "no-cache" });
    if (pagina.ok) await c.put(PAGINA, await sinRedireccion(pagina));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  const pagina = pedido.mode === "navigate" || url.pathname.endsWith("/index.html");
  if (pagina) {
    // red primero: con internet, siempre la versión publicada más reciente; sin internet, la última guardada
    evento.respondWith((async () => {
      try {
        const respuesta = await fetch(pedido);
        if (respuesta.ok) {
          const copia = await sinRedireccion(respuesta.clone());
          evento.waitUntil(caches.open(CACHE).then((c) => c.put(PAGINA, copia)));
        }
        return respuesta;
      } catch (error) {
        const guardada = await caches.match(PAGINA);
        if (guardada) return guardada;
        throw error;
      }
    })());
    return;
  }
  // íconos y manifiesto: lo guardado primero, y se guarda lo que llega
  evento.respondWith(
    caches.match(pedido).then((guardado) => guardado || fetch(pedido).then((respuesta) => {
      if (respuesta.ok || respuesta.type === "opaque") {
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put(pedido, copia));
      }
      return respuesta;
    }))
  );
});
