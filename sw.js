/* Mercado Negro • High — service worker
   Online: sempre busca a versão mais nova (preços nunca ficam velhos).
   Offline / internet ruim: usa a última versão salva no aparelho.      */
const CACHE = 'hmn-v2';
const CORE = ['./', './index.html', './tabela.html', './categoria.html', './historico.html', './como-funciona.html',
  './assets/style.css', './assets/app.js', './assets/high_logo.png', './data/catalogo.json', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Ignora ?v=... e ?c=... para que a cópia salva sirva para qualquer variação da URL.
const cacheKey = req => {
  const u = new URL(req.url);
  if (u.pathname.endsWith('.json') || u.pathname.endsWith('.html') || u.pathname.endsWith('/')) u.search = '';
  return u.toString();
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(new URL(req.url).pathname);

  if (isImage) {
    // Imagens: responde com a cópia salva e atualiza em segundo plano.
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Páginas, CSS, JS e catálogo: rede primeiro, cópia salva se estiver offline.
  e.respondWith(fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(cacheKey(req), copy)); }
    return r;
  }).catch(() => caches.match(cacheKey(req)).then(hit => hit || caches.match('./index.html'))));
});
