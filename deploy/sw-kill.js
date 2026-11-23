// Kill switch for the offline service worker. If public/sw.js ever misbehaves in production,
// copy this file over it (cp deploy/sw-kill.js public/sw.js), build and deploy: every browser
// that checks for an update drops its caches, unregisters the worker and reloads onto the network.
// Restore the real worker (git checkout public/sw.js) once the fix is ready.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("lu-")) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
})()));
