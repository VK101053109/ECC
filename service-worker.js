const CACHE_NAME = "ecc-v2";

const files = [
    "/",
    "/index.html",
    "/about.html",
    "/login.html",
    "/admin.html",
    "/order.html",
    "/order2.html",
    "/order3.html",
    "/style.css",
    "/manifest.json",
    "/firebase-config.js",
    "/order.js",
    "/admin.js",
    "/login.js"
];


self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(files))
    );

    self.skipWaiting();

});


self.addEventListener("activate", event => {

    event.waitUntil(
        caches.keys().then(keys => {

            return Promise.all(

                keys.map(key => {

                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }

                })

            );

        })
    );

    self.clients.claim();

});



self.addEventListener("fetch", event => {

    event.respondWith(

        caches.match(event.request)
            .then(response => {

                return response || fetch(event.request);

            })

    );

});