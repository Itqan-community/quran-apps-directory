// Self-destructing SW - replaces old caching SW, clears everything, removes itself
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(names) {
        return Promise.all(names.map(function(n) { return caches.delete(n); }));
      })
      .then(function() { return self.registration.unregister(); })
      .then(function() { return self.clients.matchAll(); })
      .then(function(clients) {
        clients.forEach(function(c) { c.navigate(c.url); });
      })
  );
});
