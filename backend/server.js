const path = require("path");

// .exe olarak paketlendiğinde (pkg) gerçek dosya konumu process.execPath'tir;
// Electron içinde çalışırken __dirname zaten gerçek (asar olmayan) bir yol
// olduğu için ekstra bir şeye gerek yok. .env ve public/ klasörünü hep
// programın kendi bulunduğu yerden (paket kaynakları) okuruz — kullanıcı
// veri klasöründen değil (o sadece durum.json için, bkz. db.js).
const TABAN_DIZIN = process.pkg ? path.dirname(process.execPath) : __dirname;

require("dotenv").config({ path: path.join(TABAN_DIZIN, ".env") });
const express = require("express");
const cors = require("cors");
const http = require("http");
const os = require("os");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const db = require("./db");

// ---- Lisans anahtarı doğrulama ----
// ÖNEMLİ (dürüstçe söylemek gerekirse): Bu uygulama asar olmadan (düz dosyalar
// halinde) paketleniyor, yani teknik bilgisi olan biri bu dosyayı açıp bu
// gizli anahtarı görebilir. Bu yüzden bu sistem "kırılamaz" bir DRM değil,
// sıradan bir kullanıcının kurulum dosyasını başka birine gönderip bedavaya
// kullandırmasını ENGELLEYEN bir hız kesici (speed bump). Ciddi bir korsanlık
// girişimini durduramaz ama günlük "arkadaşıma da göndereyim" kullanımını
// engeller. Gerçek DRM için ileride bir lisans sunucusu (internet üzerinden
// doğrulama) gerekir.
//
// BU DEĞERİ DEĞİŞTİR: kendi projen için benzersiz, kimsenin tahmin edemeyeceği
// bir metin yaz (örn. rastgele 40 karakterlik bir dize). Bu değeri kimseyle
// paylaşma; lisans-uret.js dosyasında da AYNI değeri kullanman gerekiyor.
const LISANS_GIZLI_ANAHTAR = "ADISYO-DEGISTIR-BU-DEGERI-KENDI-GIZLI-KODUNLA-2026";

function lisansAnahtariUret(isletmeAdi) {
  const normal = String(isletmeAdi || "").trim().toLocaleUpperCase("tr-TR");
  const hmac = crypto.createHmac("sha256", LISANS_GIZLI_ANAHTAR).update(normal).digest("hex").toUpperCase();
  const kisa = hmac.slice(0, 16);
  return kisa.match(/.{1,4}/g).join("-");
}

const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY || "";
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "2mb" }));

// ---------------------------------------------------------------------------
// Tünel (ngrok) güvenliği
// ngrok tüneli bu sunucunun TÜM uçlarını internete açar. Oysa dışarıdan sadece
// iki şeye ihtiyaç var: platform webhook'ları ve müşterinin QR menüsü. Tünel
// üzerinden gelen istekler (ngrok bunlara x-forwarded-for başlığı ekler) başka
// hiçbir uca ulaşamasın: yoksa /api/durum üzerinden yönetici PIN'i, API
// anahtarları ve müşteri borçları dışarıdan okunabilir/değiştirilebilirdi.
// Aynı WiFi'deki cihazlar (tablet, ikinci kasa, Android uygulaması) bu başlığı
// taşımaz, etkilenmez.
// ---------------------------------------------------------------------------
const TUNEL_IZINLI_YOLLAR = [/^\/menu\/?$/, /^\/api\/webhook\/[^/]+\/?$/, /^\/health$/];
const tuneldenGelenIstek = (req) => !!(req.headers["x-forwarded-for"] || req.headers["x-forwarded-host"]);
app.use((req, res, next) => {
  if (tuneldenGelenIstek(req) && !TUNEL_IZINLI_YOLLAR.some((r) => r.test(req.path))) {
    return res.status(403).json({ hata: "Bu adres internet üzerinden erişime kapalı." });
  }
  next();
});

// Ekran (frontend) burada, "public" klasöründe derlenmiş halde durur.
// "cd frontend && npm run build" komutu bu klasörü otomatik doldurur.
// Böylece kafedeki bilgisayarda TEK bir sunucu (bu dosya) çalıştırmak yeterli
// olur: hem API hem de garson/kasa ekranı aynı adresten (aynı port) açılır.
const PUBLIC_DIR = path.join(TABAN_DIZIN, "public");
app.use(express.static(PUBLIC_DIR));

let idSayaci = 1;
const yeniId = (on) => `${on}${Date.now()}_${idSayaci++}`;

// ---------------------------------------------------------------------------
// WebSocket: bağlı tüm istemcilere (masa/kasa ekranları) anlık yayın yapar.
// ---------------------------------------------------------------------------
const server = http.createServer(app);
// Canlı yayın (/ws) tüm durumu gönderdiği için tünelden gelen bağlantı reddedilir.
const wss = new WebSocketServer({
  server,
  path: "/ws",
  verifyClient: ({ req }) => !tuneldenGelenIstek(req),
});

function yayinla(mesaj) {
  const veri = JSON.stringify(mesaj);
  wss.clients.forEach((istemci) => {
    if (istemci.readyState === istemci.OPEN) istemci.send(veri);
  });
}

wss.on("connection", (ws) => {
  // Yeni bağlanan istemciye mevcut durumu hemen gönder.
  ws.send(JSON.stringify({ type: "durum", payload: db.oku() }));
});

// ---------------------------------------------------------------------------
// Basit anahtar kontrolü (yazma uçları için). API_KEY boşsa kontrol atlanır -
// geliştirme/test için kolaylık; canlıya çıkarken .env'de mutlaka bir değer ver.
// ---------------------------------------------------------------------------
function yaziKorumasi(req, res, next) {
  if (!API_KEY) return next();
  if (req.header("x-api-key") === API_KEY) return next();
  return res.status(401).json({ hata: "Geçersiz veya eksik x-api-key." });
}

app.get("/health", (req, res) => res.json({ durum: "ayakta" }));

app.post("/api/lisans-dogrula", (req, res) => {
  const { isletmeAdi, anahtar } = req.body || {};
  if (!isletmeAdi || !anahtar) return res.json({ gecerli: false });
  const beklenen = lisansAnahtariUret(isletmeAdi);
  const girilen = String(anahtar).trim().toUpperCase();
  res.json({ gecerli: beklenen === girilen });
});

// Uygulamanın (frontend) tüm state'i okuduğu/yazdığı uç noktalar.
app.get("/api/durum", (req, res) => {
  res.json(db.oku());
});

app.post("/api/durum", yaziKorumasi, async (req, res) => {
  const yeniDurum = req.body;
  if (!yeniDurum || typeof yeniDurum !== "object") {
    return res.status(400).json({ hata: "Geçersiz gövde." });
  }
  try {
    await db.yaz(yeniDurum);
    yayinla({ type: "durum", payload: yeniDurum });
    res.json({ tamam: true });
  } catch (e) {
    res.status(500).json({ hata: "Kaydedilemedi." });
  }
});

// ---------------------------------------------------------------------------
// Dış platform webhook'ları (Trendyol Yemek / Getir Yemek / Yemeksepeti / ...).
//
// ÖNEMLİ: Bu, GENEL bir alıcı/normalize edici katmandır. Her platformun kendi
// resmi partner API dokümanındaki gerçek istek gövdesi, imza/kimlik doğrulama
// yöntemi ve alan adları FARKLIDIR ve bunlara ancak partner onayı sonrası
// erişebilirsin. Yapman gereken: platformdan onay alıp API dokümanına
// eriştiğinde, aşağıdaki `PLATFORM_ADI` eşlemesini ve `normallestir()`
// fonksiyonunu o platformun gerçek gövdesine göre güncellemek. İskelet ve
// yazdırma/anlık-yayın akışının tamamı hazır; sadece "gelen veriyi okuma"
// kısmını platforma özel dolduracaksın.
// ---------------------------------------------------------------------------
const PLATFORM_ADI = {
  trendyol: "Trendyol Yemek",
  getir: "Getir Yemek",
  yemeksepeti: "Yemeksepeti",
  ubereats: "Uber Eats",
};

function webhookDogrula(req, platform, durum) {
  // Öncelik: uygulama içinden (Entegrasyonlar ekranı) girilen anahtar.
  // Girilmemişse eski yöntem olarak .env dosyasındaki değişkene bakılır.
  const ayar = durum.entegrasyonlar && durum.entegrasyonlar[platform];
  const beklenen = (ayar && ayar.webhookAnahtari) || process.env[`WEBHOOK_SECRET_${platform.toUpperCase()}`];
  if (!beklenen) return true; // hiçbir yerde tanımlı değilse kontrolü atla (sadece geliştirme için!)
  return req.header("x-webhook-secret") === beklenen;
}

// Beklenen genel (normalize edilmiş) gövde örneği:
// {
//   "siparisNo": "12345",
//   "urunler": [ { "ad": "Adana Kebap", "fiyat": 340, "adet": 1 }, ... ],
//   "toplam": 340,        // opsiyonel, verilmezse üründen hesaplanır
//   "musteriNotu": "Acılı olsun"  // opsiyonel
// }
function normallestir(govde) {
  const urunler = Array.isArray(govde.urunler)
    ? govde.urunler.map((u) => ({
        id: yeniId("u"),
        ad: String(u.ad || "Ürün"),
        fiyat: Number(u.fiyat) || 0,
        adet: Number(u.adet) || 1,
      }))
    : [];
  const toplam = Number(govde.toplam) || urunler.reduce((t, u) => t + u.fiyat * u.adet, 0);
  return { urunler, toplam, disSiparisNo: govde.siparisNo || null, not: govde.musteriNotu || "" };
}

app.post("/api/webhook/:platform", async (req, res) => {
  const platformKey = String(req.params.platform || "").toLowerCase();
  const platformAdi = PLATFORM_ADI[platformKey];
  if (!platformAdi) return res.status(404).json({ hata: "Bilinmeyen platform." });

  const durum = db.oku();
  if (!webhookDogrula(req, platformKey, durum)) return res.status(401).json({ hata: "Doğrulama başarısız." });

  const { urunler, toplam, disSiparisNo, not } = normallestir(req.body || {});
  if (urunler.length === 0) return res.status(400).json({ hata: "Sipariş kalemi bulunamadı." });

  const siparis = {
    id: yeniId("p"),
    platform: platformAdi,
    urunler,
    toplam,
    disSiparisNo,
    not,
    olusturmaZamani: Date.now(),
  };

  const yeniDurum = { ...durum, paketSiparisler: [siparis, ...(durum.paketSiparisler || [])] };
  await db.yaz(yeniDurum);

  // 1) Tüm ekranlara güncel durumu yolla, 2) o an bağlı olan kasa ekranına
  // "hemen yazdır" komutu ayrıca gönderilir.
  yayinla({ type: "durum", payload: yeniDurum });
  yayinla({ type: "siparis_geldi", payload: siparis });

  res.json({ tamam: true, siparisId: siparis.id });
});

// ---------------------------------------------------------------------------
// QR Menü: müşterinin telefonundan açtığı, giriş gerektirmeyen, SADECE OKUNUR
// menü sayfası. Yalnızca işletme adı, kategori, ürün adı, fiyat ve stok durumu
// ("Tükendi") gösterir; masa, sipariş, müşteri, PIN gibi hiçbir şey sızmaz.
// Sayfa tek dosya (satır içi CSS), harici kaynak yok - internet yavaş olsa da açılır.
// ---------------------------------------------------------------------------
const htmlKacis = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tl = (n) => `${(Number(n) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;

function menuSayfasiOlustur(durum) {
  const ad = (durum.isletme && durum.isletme.ad) || (durum.lisans && durum.lisans.isletmeAdi) || "Menü";
  const kategoriler = (durum.menu || []).filter((k) => Array.isArray(k.urunler) && k.urunler.length > 0);

  const sekmeler = kategoriler
    .map((k, i) => `<a href="#k${i}">${htmlKacis(k.kategori)}</a>`)
    .join("");

  const bolumler = kategoriler
    .map(
      (k, i) => `
    <section id="k${i}">
      <h2>${htmlKacis(k.kategori)}</h2>
      ${k.urunler
        .map((u) => {
          const tukendi = u.stokAdedi != null && u.stokAdedi <= 0;
          return `<div class="urun${tukendi ? " tukendi" : ""}">
            <span class="ad">${htmlKacis(u.ad)}${tukendi ? ' <em>Tükendi</em>' : ""}</span>
            <span class="fiyat">${tl(u.fiyat)}</span>
          </div>`;
        })
        .join("")}
    </section>`
    )
    .join("");

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlKacis(ad)} - Menü</title>
<style>
  :root { --mavi:#1E4FA3; --acik:#EAF1FB; --cizgi:#D6E2F3; --yazi:#1B2433; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:#fff; color:var(--yazi); }
  header { background:var(--mavi); color:#fff; padding:22px 16px 18px; text-align:center; }
  header h1 { margin:0; font-size:22px; font-weight:700; }
  header p { margin:4px 0 0; font-size:13px; opacity:.85; }
  nav { position:sticky; top:0; background:#fff; border-bottom:1px solid var(--cizgi); display:flex; gap:8px; overflow-x:auto; padding:10px 12px; z-index:2; }
  nav a { flex:none; text-decoration:none; color:var(--mavi); background:var(--acik); border-radius:999px; padding:7px 14px; font-size:14px; font-weight:600; }
  main { max-width:640px; margin:0 auto; padding:4px 16px 40px; }
  section { padding-top:8px; scroll-margin-top:56px; }
  h2 { font-size:17px; color:var(--mavi); border-bottom:2px solid var(--acik); padding-bottom:6px; margin:18px 0 4px; }
  .urun { display:flex; justify-content:space-between; gap:12px; padding:11px 0; border-bottom:1px solid #eef2f8; font-size:16px; }
  .fiyat { font-weight:700; white-space:nowrap; color:var(--mavi); }
  .tukendi { opacity:.45; }
  .tukendi em { font-style:normal; font-size:12px; background:#fde8e4; color:#b3361f; border-radius:4px; padding:1px 6px; margin-left:6px; }
  .bos { text-align:center; padding:48px 16px; opacity:.6; }
  footer { text-align:center; font-size:12px; opacity:.5; padding:0 0 28px; }
</style>
</head>
<body>
<header><h1>${htmlKacis(ad)}</h1><p>Menü</p></header>
${kategoriler.length ? `<nav>${sekmeler}</nav><main>${bolumler}</main>` : '<div class="bos">Menü henüz hazırlanmadı.</div>'}
<footer>Fiyatlar değişiklik gösterebilir.</footer>
</body>
</html>`;
}

app.get("/menu", (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "no-cache");
  res.send(menuSayfasiOlustur(db.oku()));
});

// Yukarıdaki hiçbir uca uymayan tüm GET isteklerini ekrana (index.html) yönlendir.
// (Bu, express.static ve /api, /health uçlarından SONRA tanımlanmalı.)
app.get(/^\/(?!api\/|health|ws).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), (err) => {
    if (err) {
      res
        .status(500)
        .send(
          "Ekran dosyaları bulunamadı. Önce 'frontend' klasöründe 'npm run build' " +
            "komutunu çalıştırdığından emin ol (bkz. README)."
        );
    }
  });
});

function yerelAgAdresleri() {
  const arayuzler = os.networkInterfaces();
  const adresler = [];
  for (const isim of Object.keys(arayuzler)) {
    for (const arayuz of arayuzler[isim] || []) {
      if (arayuz.family === "IPv4" && !arayuz.internal) adresler.push(arayuz.address);
    }
  }
  return adresler;
}

// Sunucu ayağa kalkınca tarayıcıyı otomatik aç (Windows/Mac/Linux).
// Böylece kullanıcının ".bat" dosyasına ayrıca ihtiyacı kalmıyor -
// sadece bu programı (exe) çift tıklaması yeterli oluyor.
function tarayiciyiAc(url) {
  if (process.env.ADISYO_ELECTRON) return; // Electron kendi penceresini açıyor, ekstra tarayıcı sekmesi gerekmez
  const { exec } = require("child_process");
  const komut =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(komut, () => {});
}

server.listen(PORT, () => {
  console.log("");
  console.log("=================================================");
  console.log("  ADISYO ÇALIŞIYOR");
  console.log("=================================================");
  console.log(`  Bu bilgisayarda aç : http://localhost:${PORT}`);
  yerelAgAdresleri().forEach((ip) => {
    console.log(`  Diğer cihazlardan  : http://${ip}:${PORT}`);
  });
  console.log("");
  console.log("  (Diğer cihazlar = aynı WiFi ağındaki tablet/telefon/");
  console.log("   ikinci kasa bilgisayarı. Yukarıdaki adresi tarayıcıya yaz.)");
  console.log("=================================================");
  console.log("");
  console.log(`Webhook örnek: POST http://localhost:${PORT}/api/webhook/trendyol`);
  console.log("Kapatmak için bu pencereyi kapatma, Ctrl+C tuşuna bas.");
  tarayiciyiAc(`http://localhost:${PORT}`);
});
