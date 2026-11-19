/* Mercado Negro • High — service worker
   Online: sempre busca a versão mais nova (preços nunca ficam velhos).
   Offline / internet ruim: usa a última versão salva no aparelho.      */
const CACHE = 'hmn-s3-workspace-v8.5';
const CORE = ['./', './index.html', './tabela.html', './categoria.html', './historico.html', './como-funciona.html',
  './assets/style.css', './assets/season3.css', './assets/season3-graffiti.css', './assets/season3-cinematic.css', './assets/season3-inner-pages.css', './assets/season3-workspace.css', './assets/season3-glass-cracks.svg', './assets/season3-qg-background.svg', './assets/ilegal-high-season3-logo.svg', './assets/app.js', './data/catalogo.json', './manifest.webmanifest', './assets/season3-cinematic/capa-completa.webp', './assets/season3-cinematic/capa-personagens.webp', './assets/season3-cinematic/banner-armas.webp', './assets/season3-cinematic/banner-municao.webp', './assets/season3-cinematic/banner-lavagem.webp', './assets/season3-cinematic/banner-desmanche.webp', './assets/season3-cinematic/banner-drogas.webp', './assets/season3-cinematic/banner-mecanica-ilegal.webp', './assets/season3-cinematic/banner-hospital-ilegal.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async cache => { await Promise.allSettled(CORE.map(url => cache.add(url))); }).then(() => self.skipWaiting()));
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
  e.respondWith((async () => {
    try {
      const response = await fetch(req, {cache:'no-store'});
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(cacheKey(req), response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(cacheKey(req));
      return hit || new Response('Sem conexão: conteúdo ainda não armazenado neste dispositivo.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
