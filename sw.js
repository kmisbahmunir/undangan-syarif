/* Service worker. Naikkan nomor VERSI setiap ada pembaruan file frontend. */
var VERSI = 'undangan-syarif-v2';
var STATIS = ['offline.html','css/undangan.css','css/admin.css','js/config.js','js/data.js','js/undangan.js','js/admin.js','icons/icon-192.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(STATIS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Hanya file satu alamat dengan situs ini. Panggilan ke server Apps Script (GAS_URL) TIDAK disimpan.
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  e.respondWith(
    fetch(r).then(function (res) {
      if (res && res.ok) { var salin = res.clone(); caches.open(VERSI).then(function (c) { c.put(r, salin); }); }
      return res;
    }).catch(function () {
      return caches.match(r).then(function (hit) {
        return hit || (r.mode === 'navigate' ? caches.match('offline.html') : Response.error());
      });
    })
  );
});
