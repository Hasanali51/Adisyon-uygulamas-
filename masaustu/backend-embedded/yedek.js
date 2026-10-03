// Otomatik yedekleme.
// - Açılışta ve sonra her saat, durum.json DEĞİŞTİYSE bir kopya alır.
// - Saatlik kopyalar: son 48 saat (saatlik-YYYYMMDD-HH.json)
// - Günlük kopyalar: son 30 gün, o günün EN SON hali (gunluk-YYYYMMDD.json)
// - "Şimdi yedekle" ile alınan kopyalar: son 10 adet (elle-YYYYMMDD-HHMMSS.json)
// - İsteğe bağlı ek klasör (OneDrive/Google Drive/USB): aynı dosyalar oraya da yazılır;
//   bilgisayar bozulsa bile veri bulutta/USB'de kalır.
// Bozuk (JSON olarak okunamayan) durum.json ASLA yedeğe yazılmaz; eski yedekler korunur.
// Yedekler düz JSON'dur: uygulamadaki "Yedekten Geri Yükle" ile doğrudan seçilebilir.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");

const KLASOR = path.join(db.VERI_DIZINI, "yedekler");
const AYAR_DOSYA = path.join(db.VERI_DIZINI, "yedek-ayar.json");
const SAATLIK_ADET = 48;
const GUNLUK_ADET = 30;
const ELLE_ADET = 10;

let sonOzet = "";
let sonBasari = null; // ms
let sonHata = "";

const iki = (n) => String(n).padStart(2, "0");
function damgalar(d = new Date()) {
  const gun = `${d.getFullYear()}${iki(d.getMonth() + 1)}${iki(d.getDate())}`;
  return { gun, saat: iki(d.getHours()), tam: `${gun}-${iki(d.getHours())}${iki(d.getMinutes())}${iki(d.getSeconds())}` };
}

function ayarOku() {
  try {
    const a = JSON.parse(fs.readFileSync(AYAR_DOSYA, "utf8"));
    return { ekKlasor: typeof a.ekKlasor === "string" ? a.ekKlasor : "" };
  } catch (e) {
    return { ekKlasor: "" };
  }
}

function atomikYaz(hedef, icerik) {
  const gecici = `${hedef}.tmp`;
  fs.writeFileSync(gecici, icerik);
  fs.renameSync(gecici, hedef);
}

function buda(klasor, onek, adet) {
  const dosyalar = fs
    .readdirSync(klasor)
    .filter((f) => f.startsWith(onek) && f.endsWith(".json"))
    .sort()
    .reverse(); // en yeni başta (adlar tarih sıralı)
  dosyalar.slice(adet).forEach((f) => {
    try {
      fs.unlinkSync(path.join(klasor, f));
    } catch (e) {
      /* yok say */
    }
  });
}

function klasoreYaz(klasor, icerik, elle) {
  fs.mkdirSync(klasor, { recursive: true });
  const t = damgalar();
  atomikYaz(path.join(klasor, `saatlik-${t.gun}-${t.saat}.json`), icerik);
  atomikYaz(path.join(klasor, `gunluk-${t.gun}.json`), icerik);
  buda(klasor, "saatlik-", SAATLIK_ADET);
  buda(klasor, "gunluk-", GUNLUK_ADET);
  if (elle) {
    atomikYaz(path.join(klasor, `elle-${t.tam}.json`), icerik);
    buda(klasor, "elle-", ELLE_ADET);
  }
}

// zorla=true: içerik değişmemiş olsa da (ve "elle" kopya olarak) yedek al.
function yedekAl(zorla = false) {
  let icerik;
  try {
    icerik = fs.readFileSync(db.DURUM_DOSYA, "utf8");
    JSON.parse(icerik);
  } catch (e) {
    sonHata = "durum.json okunamadı ya da bozuk; yedek alınmadı (eski yedekler korunuyor).";
    return { tamam: false, hata: sonHata };
  }
  const ozet = crypto.createHash("sha256").update(icerik).digest("hex");
  if (!zorla && ozet === sonOzet) return { tamam: true, atlandi: true };

  const hatalar = [];
  let anaTamam = false;
  try {
    klasoreYaz(KLASOR, icerik, zorla);
    anaTamam = true;
  } catch (e) {
    hatalar.push(`Ana yedek klasörüne yazılamadı: ${e.message}`);
  }
  const { ekKlasor } = ayarOku();
  if (ekKlasor) {
    try {
      klasoreYaz(ekKlasor, icerik, zorla);
    } catch (e) {
      hatalar.push(`Ek klasöre yazılamadı (${ekKlasor}): ${e.message}`);
    }
  }
  if (anaTamam) sonBasari = Date.now();
  sonHata = hatalar.join(" ");
  // Hata varsa özeti saklama: bir sonraki saat içerik değişmemiş olsa bile yeniden denesin.
  if (!hatalar.length) sonOzet = ozet;
  return hatalar.length ? { tamam: false, hata: sonHata } : { tamam: true };
}

function durumGetir() {
  let dosyalar = [];
  try {
    dosyalar = fs
      .readdirSync(KLASOR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const st = fs.statSync(path.join(KLASOR, f));
        return { ad: f, boyut: st.size, zaman: st.mtimeMs };
      })
      .sort((a, b) => b.zaman - a.zaman);
  } catch (e) {
    /* klasör henüz yok */
  }
  return {
    klasor: KLASOR,
    ekKlasor: ayarOku().ekKlasor,
    sonBasari,
    sonHata,
    adet: dosyalar.length,
    sonDosyalar: dosyalar.slice(0, 5),
  };
}

// Ek klasörü ayarla: boş string = kapat. Yazılabilir mi diye denenir.
function ekKlasorAyarla(yol) {
  const temiz = String(yol || "").trim();
  if (temiz) {
    if (!path.isAbsolute(temiz)) throw new Error("Tam klasör yolu yaz (örn. D:\\Yedek ya da C:\\Users\\...\\OneDrive\\Adisyo).");
    fs.mkdirSync(temiz, { recursive: true });
    const deneme = path.join(temiz, ".adisyo-yazma-testi");
    fs.writeFileSync(deneme, "ok");
    fs.unlinkSync(deneme);
  }
  fs.writeFileSync(AYAR_DOSYA, JSON.stringify({ ekKlasor: temiz }, null, 2));
  return durumGetir();
}

function baslat() {
  setTimeout(() => yedekAl(false), 5000).unref();
  setInterval(() => yedekAl(false), 60 * 60 * 1000).unref();
}

module.exports = { baslat, yedekAl, durumGetir, ekKlasorAyarla };
