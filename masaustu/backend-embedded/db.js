// Basit, dosya tabanlı kalıcı depo (JSON dosyası).
// Küçük/orta ölçekli tek şube bir restoran için yeterlidir; native derleme
// gerektiren bir veritabanı kurulumuna ihtiyaç duymaz. Daha büyük ölçek veya
// çoklu şube gerektiğinde bu dosyayı Postgres/SQLite ile değiştirebilirsin -
// dışarıya açılan tek şey get()/set() olduğu için server.js tarafı değişmez.

const fs = require("fs");
const path = require("path");

// .exe olarak paketlendiğinde (pkg) __dirname sanal/salt-okunur bir alanı
// gösterir; Electron masaüstü uygulamasında ise ADISYO_VERI_DIZINI env
// değişkeni kullanıcının yazılabilir veri klasörünü gösterir. Veriyi her
// zaman GERÇEK ve yazılabilir bir konuma yazmak için önceliğimiz:
// 1) ADISYO_VERI_DIZINI (Electron)  2) process.execPath yanı (pkg)  3) __dirname (kaynak kod)
const TABAN_DIZIN = process.env.ADISYO_VERI_DIZINI
  ? process.env.ADISYO_VERI_DIZINI
  : process.pkg
  ? path.dirname(process.execPath)
  : __dirname;
const DOSYA = path.join(TABAN_DIZIN, "durum.json");

const varsayilanDurum = () => ({
  lisans: { dogrulandi: false, isletmeAdi: "", anahtar: "" },
  masalar: Array.from({ length: 8 }, (_, i) => ({
    id: `m${i + 1}`,
    ad: `Masa ${i + 1}`,
    durum: "bos",
    urunler: [],
    acilisZamani: null,
  })),
  gecmis: [],
  menu: [
    {
      id: "k1",
      kategori: "Başlangıçlar",
      urunler: [
        { id: "b1", ad: "Mercimek Çorbası", fiyat: 120 },
        { id: "b2", ad: "Çoban Salata", fiyat: 140 },
      ],
    },
    {
      id: "k2",
      kategori: "Ana Yemekler",
      urunler: [
        { id: "a1", ad: "Adana Kebap", fiyat: 340 },
        { id: "a2", ad: "Tavuk Şiş", fiyat: 300 },
      ],
    },
    {
      id: "k3",
      kategori: "İçecekler",
      urunler: [
        { id: "i1", ad: "Ayran", fiyat: 60 },
        { id: "i2", ad: "Kola / Gazoz", fiyat: 90 },
      ],
    },
  ],
  isletme: { ad: "", adres: "", kagitGenisligi: "80mm" },
  siparisSayaci: 100,
  fisAyarlari: {
    yaziTipi: "Arial",
    baslikYaziBoyutu: 14,
    baslikAltYaziBoyutu: 11,
    solBosluk: 2,
    sagBosluk: 2,
    urunYaziBoyutu: 12,
    toplamYaziBoyutu: 13,
    altYaziBoyutu: 10,
    kalinYazi: false,
    kdvGoster: false,
    siparisNoGoster: false,
    seciliYazici: "",
  },
  paketSiparisler: [],
  paketAyarlari: { kutuSayisi: 6 },
  yoneticiPin: "1234",
  entegrasyonlar: {
    trendyol: { apiAnahtari: "", apiSifresi: "", magazaId: "", webhookAnahtari: "" },
    getir: { apiAnahtari: "", apiSifresi: "", magazaId: "", webhookAnahtari: "" },
    yemeksepeti: { apiAnahtari: "", apiSifresi: "", magazaId: "", webhookAnahtari: "" },
  },
  tunelAyarlari: { ngrokAuthtoken: "", ngrokDomain: "" },
});

// Aynı anda birden fazla yazma isteği gelirse sıraya koyup birbirini
// ezmesini önlemek için basit bir kuyruk (promise chain).
let yazmaKuyrugu = Promise.resolve();

function oku() {
  try {
    const icerik = fs.readFileSync(DOSYA, "utf8");
    return JSON.parse(icerik);
  } catch (e) {
    const v = varsayilanDurum();
    fs.writeFileSync(DOSYA, JSON.stringify(v, null, 2));
    return v;
  }
}

function yaz(durum) {
  yazmaKuyrugu = yazmaKuyrugu.then(
    () =>
      new Promise((resolve, reject) => {
        fs.writeFile(DOSYA, JSON.stringify(durum, null, 2), (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
  );
  return yazmaKuyrugu;
}

module.exports = { oku, yaz, varsayilanDurum };
