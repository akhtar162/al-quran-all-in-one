const CACHE_NAME = 'oase-islami-cache-v1';
const urlsToCache = [
    './New-Text-Document.html', // Ganti dengan nama file HTML Anda yang benar
    './style.css', // Jika Anda punya file CSS eksternal
const STATIC_CACHE_NAME = 'oase-islami-static-v1';
const DYNAMIC_CACHE_NAME = 'oase-islami-dynamic-v1';

// Aset-aset inti aplikasi yang akan di-cache saat instalasi
const CORE_ASSETS = [
    './New-Text-Document.html', // Ganti dengan nama file HTML Anda jika berbeda
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Poppins:wght@300;400;600;700&display=swap',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://i.imgur.com/J82sV2R.png' // Gambar kompas
    'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css',
    'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js',
    'https://i.imgur.com/J82sV2R.png', // Gambar kompas
    './style.css' // File style kustom Anda
];

// Instalasi Service Worker
// Daftar domain API yang datanya ingin di-cache
const API_HOSTS = [
    'alquran.cloud',
    'api.alquran.cloud',
    'quran-api.santrikoding.com',
    'api.hadith.gading.dev',
    'api.myquran.com',
    'api.fathimah.org',
    'api.quran.com',
    'cdn.islamic.network' // Untuk audio murottal
];

// Event 'install': Meng-cache aset-aset inti aplikasi
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
                console.log('[Service Worker] Precaching Core Assets...');
                return cache.addAll(CORE_ASSETS);
            })
            .catch(err => {
                console.error('[Service Worker] Error during pre-caching:', err);
            })
    );
});

// Menggunakan cache saat fetch
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Jika tidak ada di cache, fetch dari network
                return fetch(event.request);
// Event 'activate': Membersihkan cache lama
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating Service Worker...');
    event.waitUntil(
        caches.keys()
            .then(keyList => {
                return Promise.all(keyList.map(key => {
                    if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                }));
            })
    );
    return self.clients.claim();
});

// Event 'fetch': Menyajikan aset dari cache jika offline
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Cek apakah request ditujukan ke salah satu API yang ingin di-cache
    const isApiRequest = API_HOSTS.some(host => url.hostname.includes(host));

    if (isApiRequest) {
        // Strategi: Network First, then Cache (untuk data API)
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Jika berhasil, simpan response ke cache dinamis
                    const clonedResponse = response.clone();
                    caches.open(DYNAMIC_CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request.url, clonedResponse);
                        });
                    return response;
                })
                .catch(() => {
                    // Jika gagal (offline), coba ambil dari cache
                    return caches.match(event.request);
                })
        );
    } else {
        // Strategi: Cache First, then Network (untuk aset statis)
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        // Jika ada di cache, langsung sajikan
                        return response;
                    } else {
                        // Jika tidak ada, coba fetch dari network
                        return fetch(event.request)
                            .then(res => {
                                // Simpan aset baru ke cache dinamis untuk penggunaan selanjutnya
                                return caches.open(DYNAMIC_CACHE_NAME)
                                    .then(cache => {
                                        cache.put(event.request.url, res.clone());
                                        return res;
                                    });
                            });
                    }
                })
        );
    }
});             return cache.addAll(CORE_ASSETS);
            })
            .catch(err => {
                console.error('[Service Worker] Error during pre-caching:', err);
            })
    );
});

// Event 'activate': Membersihkan cache lama
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating Service Worker...');
    event.waitUntil(
        caches.keys()
            .then(keyList => {
                return Promise.all(keyList.map(key => {
                    if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                }));
            })
    );
    return self.clients.claim();
});

// Event 'fetch': Menyajikan aset dari cache jika offline
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Cek apakah request ditujukan ke salah satu API yang ingin di-cache
    const isApiRequest = API_HOSTS.some(host => url.hostname.includes(host));

    if (isApiRequest) {
        // Strategi: Network First, then Cache (untuk data API)
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Jika berhasil, simpan response ke cache dinamis
                    const clonedResponse = response.clone();
                    caches.open(DYNAMIC_CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request.url, clonedResponse);
                        });
                    return response;
                })
                .catch(() => {
                    // Jika gagal (offline), coba ambil dari cache
                    return caches.match(event.request);
                })
        );
    } else {
        // Strategi: Cache First, then Network (untuk aset statis)
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        // Jika ada di cache, langsung sajikan
                        return response;
                    } else {
                        // Jika tidak ada, coba fetch dari network
                        return fetch(event.request)
                            .then(res => {
                                // Simpan aset baru ke cache dinamis untuk penggunaan selanjutnya
                                return caches.open(DYNAMIC_CACHE_NAME)
                                    .then(cache => {
                                        cache.put(event.request.url, res.clone());
                                        return res;
                                    });
                            });
                    }
                })
        );
    }
});