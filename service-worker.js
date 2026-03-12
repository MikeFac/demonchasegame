var CACHE_NAME = 'versebattles-v12';

// HTML routes that should behave like part of the installable app.
var APP_NAVIGATION_PATHS = {
    '/': true,
    '/index.html': true,
    '/privacy': true,
    '/privacy.html': true,
    '/terms': true,
    '/terms.html': true,
    '/config': true,
    '/config.html': true,
    '/lobby': true,
    '/lobby.html': true
};

// Sound effects to cache
var SOUND_ASSETS = [
    '/sounds/bullet_impact.mp3',
    '/sounds/monster_explosion.mp3',
    '/sounds/level_up.mp3',
    '/sounds/player_attacked.mp3',
    '/sounds/monster_attacked.mp3',
    '/sounds/healing_recharge.mp3',
    '/sounds/game_over.mp3',
    '/sounds/heal_pickup.mp3'
];

// Core images to pre-cache
var IMAGE_ASSETS = [
    '/images/player1-sprite96.png',
    '/images/player2-sprite96.png',
    '/images/player3-sprite96.png',
    '/images/player4-sprite96.png',
    '/images/healing_point.png',
    '/images/shield_of_faith.png',
    '/images/VerseBattles-logo.png',
    '/images/monsters/fear_demon.png',
    '/images/monsters/doubt_spirit.png',
    '/images/monsters/condemnation_demon.png',
    '/images/monsters/unbelief_demon.png',
    '/images/monsters/depression_spirit.png',
    '/images/monsters/infirmity_spirit.png',
    '/images/monsters/confusion_spirit.png',
    '/images/monsters/ignorance_spirit.png',
    '/images/monsters/strife_spirit.png',
    '/images/monsters/PRIDE.png',
    '/images/monsters/DISCOURAGEMENT.png',
    '/images/monsters/DEMON-SWARM.png',
    '/images/monsters/DEMON-OF-POVERTY.png',
    '/images/monsters/DECEPTION_SPIRIT1.png',
    '/images/monsters/SPIRITUALBLINDNESS.png',
    '/images/monsters/SHAME-ACCUSATION.png',
    '/images/monsters/JEZEBEL.png',
    '/images/effects/explosion2.png',
    '/images/terrains/terrain256.png',
    '/images/terrains/houses-and-buildings400.png'
];

// Core assets to cache
var CORE_ASSETS = [
    '/',
    '/index.html',
    '/privacy.html',
    '/terms.html',
    '/config.html',
    '/lobby.html',
    '/game.js',
    '/bible-verses.js',
    '/bible-verses-es.js',
    '/locales/en.json',
    '/locales/es.json',
    '/src/client/i18n.js',
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
    '/src/client/VotdMenuOverlay.js',
    // Auth & Sync modules
    '/src/client/ProgressManager.js',
    '/src/client/AuthManager.js',
    '/src/client/SyncManager.js',
    '/src/client/WorldBrowser.js'
];

// Install: cache core assets, sounds, and images
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            console.log('Service Worker: Caching core assets, sounds, and images');
            // Cache all assets in parallel, continue even if some fail (e.g., if missing)
            var allAssets = CORE_ASSETS.concat(SOUND_ASSETS).concat(IMAGE_ASSETS);
            return Promise.all(
                allAssets.map(function (url) {
                    return cache.add(url).catch(function (err) {
                        console.warn('Service Worker: Failed to cache', url, err);
                    });
                })
            );
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

// Fetch: stale-while-revalidate for JS/HTML, cache-first for images/sounds, network-only for API/audio/external-audio
self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);
    var acceptHeader = event.request.headers.get('accept') || '';
    var isHtmlRequest = event.request.mode === 'navigate' || acceptHeader.indexOf('text/html') !== -1;

    // Network-only for non-GET, socket.io, API, verse audio, and external audio
    if (event.request.method !== 'GET') return;
    if (url.pathname.startsWith('/socket.io')) return;
    if (url.pathname.startsWith('/api')) return;
    if (url.pathname.startsWith('/lobby')) return;
    if (url.pathname.startsWith('/audio/')) return;  // Verse songs - managed by VerseSongService
    if (url.pathname.startsWith('/public/audio')) return;
    if (url.pathname.startsWith('/missions/') && url.pathname.endsWith('.json')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Cache-first for local sounds (game sound effects only)
    if (url.pathname.startsWith('/sounds/') && url.pathname.endsWith('.mp3')) {
        event.respondWith(
            caches.match(event.request).then(function (cached) {
                if (cached) return cached;
                return fetch(event.request).then(function (response) {
                    if (response.ok && response.status !== 206) {
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
    
    // Skip external audio files (verse audio from remote servers)
    if (url.origin !== self.location.origin && url.pathname.match(/\.(mp3|ogg|wav)$/)) return;

    // Keep marketing/content pages outside the app cache. Allow only selected
    // app routes to be available offline/in-app.
    if (url.origin === self.location.origin && isHtmlRequest && !APP_NAVIGATION_PATHS[url.pathname]) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Cache-first for images
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
        event.respondWith(
            caches.match(event.request).then(function (cached) {
                if (cached) return cached;
                return fetch(event.request).then(function (response) {
                    if (response.ok && response.status !== 206) {
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
                // Only cache successful, full responses (not 206 partial)
                if (response.ok && response.status !== 206) {
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
