var CACHE_NAME = 'riffly-cache-v20';

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
    '/js/supabase-client.js',
    '/js/google-auth.js',

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
    '/assets/design/icon/upload.svg',
    '/assets/design/icon/google.svg'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

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