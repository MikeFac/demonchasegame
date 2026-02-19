var CACHE_NAME = 'versebattles-v1';

// Core assets to cache (no audio — too large for mobile storage)
var CORE_ASSETS = [
    '/',
    '/index.html',
    '/game.js',
    '/bible-verses.js',
    '/manifest.json',
    // Shared modules
    '/src/shared/Constants.js',
    '/src/shared/LevelConfig.js',
    '/src/shared/WallGrid.js',
    '/src/shared/utils.js',
    '/src/shared/Physics.js',
    '/src/shared/GameConfig.js',
    '/src/shared/GameInputHandler.js',
    '/src/shared/GameLifecycle.js',
    '/src/shared/GamePlayerHandler.js',
    '/src/shared/GameEngine.js',
    '/src/shared/map-generators/ClassicMaze.js',
    '/src/shared/map-generators/NarrowPaths.js',
    '/src/shared/map-generators/ComplexLabyrinth.js',
    '/src/shared/map-generators/OpenPlains.js',
    '/src/shared/map-generators/GridCity.js',
    '/src/shared/map-generators/index.js',
    '/src/shared/entities/CollectibleManager.js',
    '/src/shared/entities/MonsterMovement.js',
    '/src/shared/entities/MonsterManager.js',
    '/src/shared/entities/PlayerManager.js',
    '/src/shared/entities/BulletManager.js',
    // Client modules
    '/src/client/UILayout.js',
    '/src/client/MusicManager.js',
    '/src/client/SoundEffects.js',
    '/src/client/VerseSongService.js',
    '/src/client/Renderer.js',
    '/src/client/InputHandler.js',
    '/src/client/Network.js',
    '/src/client/LocalNetwork.js',
    '/src/client/ReviewMode.js',
    '/src/client/QuizManager.js',
    '/src/client/VerseTestScreen.js',
    '/src/client/VersOfTheDayManager.js',
    '/src/client/VotdLearningMode.js',
    '/src/client/VotdTestMode.js',
    '/src/client/VotdMenuOverlay.js'
];

// Install: cache core assets
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            console.log('Service Worker: Caching core assets');
            return cache.addAll(CORE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (name) {
                    return name !== CACHE_NAME;
                }).map(function (name) {
                    console.log('Service Worker: Deleting old cache', name);
                    return caches.delete(name);
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch: stale-while-revalidate for JS/HTML, cache-first for images, network-only for API/audio
self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);

    // Network-only for non-GET, socket.io, API, and audio
    if (event.request.method !== 'GET') return;
    if (url.pathname.startsWith('/socket.io')) return;
    if (url.pathname.startsWith('/api')) return;
    if (url.pathname.startsWith('/lobby')) return;
    if (url.pathname.startsWith('/public/audio')) return;
    if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.ogg') || url.pathname.endsWith('.wav')) return;

    // Cache-first for images
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
        event.respondWith(
            caches.match(event.request).then(function (cached) {
                if (cached) return cached;
                return fetch(event.request).then(function (response) {
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                }).catch(function () {
                    return new Response('', { status: 404 });
                });
            })
        );
        return;
    }

    // Stale-while-revalidate for JS, HTML, CSS
    event.respondWith(
        caches.match(event.request).then(function (cached) {
            var fetchPromise = fetch(event.request).then(function (response) {
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(function () {
                return cached || new Response('Offline', { status: 503 });
            });

            return cached || fetchPromise;
        })
    );
});
