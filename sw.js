/* =========================================================================
 * ROTA — Service Worker
 * -------------------------------------------------------------------------
 * RÈGLE D'OR : à CHAQUE mise en ligne, incrémenter APP_VERSION ci-dessous.
 * C'est la modification de ce fichier qui déclenche la mise à jour chez
 * les utilisateurs. Modifier seulement index.html ne suffit pas.
 * ========================================================================= */

const APP_VERSION = '12.0.0';            // ← à incrémenter à chaque push (= ROTA_BUILD dans index.html)
const CACHE_PREFIX = 'rota-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;

/* Fichiers indispensables au fonctionnement hors ligne.
 * Chemins RELATIFS (./) : obligatoire sur GitHub Pages, où l'app vit
 * dans un sous-dossier (tonpseudo.github.io/rota/).
 * Adapter la liste aux vrais fichiers de ROTA. Un fichier listé mais
 * absent fait échouer TOUTE l'installation du service worker. */
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './edf.enc.json',            // données EDF chiffrées (illisibles sans le code)
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

/* ---------- Installation : mise en cache de la nouvelle version ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache: 'reload' contourne le cache HTTP de GitHub Pages (10 min)
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // Pas de skipWaiting() automatique : on attend que l'utilisateur
  // clique « Recharger » pour ne pas couper une saisie en cours.
});

/* ---------- Activation : suppression des anciens caches ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/* ---------- Messages depuis la page ---------- */
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SKIP_WAITING') self.skipWaiting();
  if (msg.type === 'GET_VERSION' && event.ports[0]) {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});

/* ---------- Stratégie réseau ----------
 * - Pages HTML : réseau d'abord (version fraîche si en ligne), cache sinon.
 * - Autres fichiers de l'app : cache d'abord (rapide, hors ligne OK).
 *   Leur fraîcheur est garantie par le changement de APP_VERSION.
 * - Requêtes vers d'autres domaines : non interceptées.
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', fresh.clone());
          return fresh;
        } catch {
          return (await caches.match('./index.html')) ||
                 (await caches.match('./')) ||
                 new Response('ROTA est hors ligne et aucune copie locale n’est disponible.',
                              { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        return new Response('', { status: 504 });
      }
    })()
  );
});
