/* Self-destroying service worker.
 *
 * A previous site on this domain registered a service worker that still lives in
 * returning visitors' browsers, intercepting navigations and serving stale cached
 * HTML (a "verifying browser" / loading shell, or a stray logo below the footer).
 * This site ships no service worker of its own.
 *
 * When a browser that still holds the old registration checks this URL for an
 * update, it installs this worker instead. On activation it clears all Cache
 * Storage, reloads every open page so the visitor immediately gets live content,
 * then unregisters itself. Nothing is left registered afterward.
 *
 * Safe to delete once logs / field reports show no stale registrations remain.
 */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    // 1. Drop every Cache Storage bucket the old worker populated.
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (e) {}

    // 2. Take control of open pages so we can refresh them with live content.
    try { await self.clients.claim(); } catch (e) {}
    try {
      var windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(windows.map(function (client) {
        try { return client.navigate(client.url); } catch (e) { return null; }
      }));
    } catch (e) {}

    // 3. Remove ourselves — no service worker should remain on this origin.
    try { await self.registration.unregister(); } catch (e) {}
  })());
});
