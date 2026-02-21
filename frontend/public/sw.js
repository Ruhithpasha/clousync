const CACHE_NAME = "cloudsync-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo192.png",
  "/logo512.png",
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Special handling for Cloudinary images (Cache thumbnails)
  if (url.hostname.includes("cloudinary.com")) {
    event.respondWith(
      caches.open("cloudsync-images").then((cache) => {
        return cache.match(request).then((response) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      }),
    );
    return;
  }

  // Default Stale-While-Revalidate for other assets
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    }),
  );
});
