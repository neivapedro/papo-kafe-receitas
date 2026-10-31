// Funciona sem internet e abre na hora: o app sempre sai da cópia guardada no aparelho.
// Quando há uma versão nova, ela é baixada inteira em segundo plano (todos os arquivos ou nenhum)
// e o app avisa "Nova versão disponível". Ao fechar e abrir de novo, ou ao tocar em Atualizar,
// a versão nova entra, sem nunca misturar arquivos velhos com novos.
//
// IMPORTANTE: ao publicar uma mudança, aumente o número da versão abaixo.
const VERSION = 'v10';
const CACHE = `papo-kafe-receitas-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/config.js',
  './js/vendor/supabase.js',
  './manifest.webmanifest',
  './fonts/outfit-latin-wght-normal.woff2',
  './fonts/figtree-latin-wght-normal.woff2',
  './img/logo.webp',
  './img/logo-escuro.webp',
  './img/grao.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // sem skipWaiting: a versão nova espera, para não trocar o app no meio de um formulário
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('message', (e) => {
  if (e.data === 'ATUALIZAR') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase e outros: direto da rede

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
});
