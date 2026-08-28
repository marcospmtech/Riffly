// Service worker do Riffly: guarda os arquivos do site num cache local pra ele
// abrir mesmo sem internet (depois da primeira visita) e poder ser "instalado".
//
// IMPORTANTE: sempre que você alterar HTML/CSS/JS do site, mude esse número
// (v1 -> v2 -> v3...). É o único jeito do navegador saber que precisa jogar fora
// o cache antigo. Esquecer disso = ficar horas achando que seu código novo tem
// bug, quando na verdade o navegador nem chegou a carregá-lo.
var CACHE_NAME = 'riffly-cache-v18';

// Lista de tudo que vale a pena deixar salvo localmente.
var URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',

    '/css/style.css',
    '/css/tuner_cromatic.css',
    '/css/tuner_manual.css',
    '/css/metronome.css',
    '/css/cifra.css',
    '/css/administrador.css',
    '/css/login.css',
    '/css/editar.css',

    '/js/main.js',
    '/js/search.js',
    '/js/pitch-detection.js',
    '/js/tuner.js',
    '/js/tuner-manual.js',
    '/js/metronome.js',
    '/js/auth.js',
    '/js/admin.js',
    '/js/cifra-view.js',
    '/js/editar.js',

    '/pages/tuner_cromatic.html',
    '/pages/tuner_manual.html',
    '/pages/metronome.html',
    '/pages/cifra.html',
    '/pages/administrador.html',
    '/pages/login.html',
    '/pages/registro.html',
    '/pages/editar.html',

    '/assets/design/logo/logo.png',
    '/assets/design/icon/menu.png',
    '/assets/design/icon/search.png',
    '/assets/design/icon/metronome.png',
    '/assets/design/icon/settings_tuner.png',
    '/assets/design/icon/settings_metronome.png',
    '/assets/design/icon/upload.svg'
];

// "install" roda uma vez, quando o navegador baixa o service worker pela primeira vez
// (ou quando o CACHE_NAME muda, indicando uma versão nova). Aqui a gente pré-carrega tudo.
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// "activate" roda depois do install e é o momento certo de apagar caches de versões
// antigas (se algum dia o CACHE_NAME virar "riffly-cache-v2", o v1 é descartado aqui).
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames
                    .filter(function (name) { return name !== CACHE_NAME; })
                    .map(function (name) { return caches.delete(name); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(function (networkResponse) {
                if (networkResponse && networkResponse.status === 200) {
                    var responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(function () {
                return caches.match(event.request);
            })
    );
});