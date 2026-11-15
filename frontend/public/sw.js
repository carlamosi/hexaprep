// Service worker mínimo: hace la app instalable. No guarda nada en caché a propósito (así nunca sirve una versión vieja
// tras un despliegue y la API no se toca jamás); cada petición va directa a la red.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
