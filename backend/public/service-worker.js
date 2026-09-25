// Basit bir service worker: PWA'nın "Ana Ekrana Ekle / Yükle" olarak
// tanınması için gerekli. Ekranın statik dosyalarını (JS/CSS/HTML) önbelleğe
// alır; API istekleri (/api/..., /ws) her zaman doğrudan ağdan gider, asla
// önbellekten dönmez — böylece siparişler/masalar her zaman güncel kalır.

const ONBELLEK_ADI = "adisyo-kabuk-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((anahtarlar) =>
      Promise.all(anahtarlar.filter((k) => k !== ONBELLEK_ADI).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API / WebSocket isteklerine asla dokunma (her zaman canlı veri).
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(ONBELLEK_ADI).then(async (onbellek) => {
      try {
        const agdan = await fetch(event.request);
        onbellek.put(event.request, agdan.clone());
        return agdan;
      } catch (hata) {
        const onbellekten = await onbellek.match(event.request);
        return onbellekten || Promise.reject(hata);
      }
    })
  );
});
