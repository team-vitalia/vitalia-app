const STATIC_CACHE_NAME = 'vitalia-static-v4';
const DATA_CACHE_NAME = 'vitalia-data-v3';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  '/fonts/Ionicons.ttf',
  '/fonts/FontAwesome.ttf',
  '/fonts/FontAwesome5_Regular.ttf',
  '/fonts/FontAwesome5_Solid.ttf',
  '/fonts/FontAwesome6_Solid.ttf',
  '/fonts/MaterialIcons.ttf',
  '/fonts/MaterialCommunityIcons.ttf',
  '/css/all.min.css',
  '/webfonts/fa-solid-900.woff2',
  '/webfonts/fa-solid-900.ttf',
  '/webfonts/fa-regular-400.woff2',
  '/webfonts/fa-regular-400.ttf',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.ttf',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.ttf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => {
          return fetch(url).then((res) => {
            if (res.ok || res.type === 'opaque' || res.status === 200) {
              return cache.put(url, res);
            }
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cachedRes) => {
            if (cachedRes) {
              return cachedRes;
            }
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/').then((cachedRoot) => {
          if (cachedRoot) {
            return cachedRoot;
          }
          return caches.match('/index.html');
        });
      })
    );
    return;
  }

  const isFont =
    req.destination === 'font' ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.otf') ||
    url.pathname.includes('/Fonts/') ||
    url.search.includes('.ttf') ||
    url.search.includes('.woff');

  if (isFont) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          return cached;
        }

        return caches.match(req, { ignoreSearch: true }).then((cachedFuzzy) => {
          if (cachedFuzzy) {
            return cachedFuzzy;
          }

          let fontName = '';
          if (url.search.includes('Ionicons.ttf') || url.pathname.includes('Ionicons.ttf')) {
            fontName = 'Ionicons.ttf';
          } else if (url.search.includes('FontAwesome.ttf') || url.pathname.includes('FontAwesome.ttf')) {
            fontName = 'FontAwesome.ttf';
          } else if (url.search.includes('FontAwesome5_Solid.ttf') || url.pathname.includes('FontAwesome5_Solid.ttf')) {
            fontName = 'FontAwesome5_Solid.ttf';
          } else if (url.search.includes('FontAwesome6_Solid.ttf') || url.pathname.includes('FontAwesome6_Solid.ttf')) {
            fontName = 'FontAwesome6_Solid.ttf';
          } else if (url.search.includes('MaterialIcons.ttf') || url.pathname.includes('MaterialIcons.ttf')) {
            fontName = 'MaterialIcons.ttf';
          } else if (url.search.includes('MaterialCommunityIcons.ttf') || url.pathname.includes('MaterialCommunityIcons.ttf')) {
            fontName = 'MaterialCommunityIcons.ttf';
          } else if (url.pathname.includes('fa-solid-900')) {
            fontName = 'fa-solid-900.woff2';
          } else if (url.pathname.includes('fa-regular-400')) {
            fontName = 'fa-regular-400.woff2';
          }

          if (fontName) {
            const fallbackPath = fontName.startsWith('fa-') ? '/webfonts/' + fontName : '/fonts/' + fontName;
            return caches.match(fallbackPath).then((cachedNamed) => {
              if (cachedNamed) {
                return cachedNamed;
              }
              return fetch(req)
                .then((netRes) => {
                  if (netRes.ok || netRes.status === 200 || netRes.type === 'opaque') {
                    const clone = netRes.clone();
                    caches.open(STATIC_CACHE_NAME).then((c) => c.put(req, clone));
                  }
                  return netRes;
                })
                .catch(() => {
                  return caches.match('/fonts/Ionicons.ttf');
                });
            });
          }

          return fetch(req)
            .then((netRes) => {
              if (netRes.ok || netRes.status === 200 || netRes.type === 'opaque') {
                const clone = netRes.clone();
                caches.open(STATIC_CACHE_NAME).then((c) => c.put(req, clone));
              }
              return netRes;
            })
            .catch(() => {
              return caches.match('/fonts/Ionicons.ttf');
            });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        fetch(req)
          .then((networkRes) => {
            if (networkRes.status === 200 || networkRes.type === 'opaque') {
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(req, networkRes);
              });
            }
          })
          .catch(() => {});
        return cachedRes;
      }

      return fetch(req)
        .then((networkRes) => {
          if (networkRes.status === 200 || networkRes.type === 'opaque') {
            const resClone = networkRes.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req, { ignoreSearch: true });
        });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Vitalia';
  const options = {
    body: data.body || data.mensaje || 'Nueva notificación en Vitalia',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || 'vitalia-notification',
    data: {
      url: data.url || data.enlace || '/notificaciones',
      ...data
    },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: { title, ...options.data, body: options.body }
          });
        });
      })
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/notificaciones';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-vitalia-operations') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
