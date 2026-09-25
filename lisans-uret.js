// BU DOSYA KURULUM PAKETİNE DAHİL DEĞİL — sadece senin kendi bilgisayarında,
// yeni bir müşteriye lisans anahtarı üretmek için çalıştırman içindir.
// KİMSEYLE PAYLAŞMA.
//
// Kullanım:
//   node lisans-uret.js "Mersin Tantuni Baki Usta"
//
// ÖNEMLİ: Buradaki LISANS_GIZLI_ANAHTAR değeri, masaustu/backend-embedded/server.js
// içindeki (ve backend/server.js içindeki) LISANS_GIZLI_ANAHTAR ile BİREBİR AYNI
// olmalı. Birini değiştirirsen diğerini de aynı şekilde değiştir, yoksa
// ürettiğin anahtarlar hiçbir kurulumda çalışmaz.

const crypto = require("crypto");

const LISANS_GIZLI_ANAHTAR = "ADISYO-DEGISTIR-BU-DEGERI-KENDI-GIZLI-KODUNLA-2026";

function lisansAnahtariUret(isletmeAdi) {
  const normal = String(isletmeAdi || "").trim().toLocaleUpperCase("tr-TR");
  const hmac = crypto.createHmac("sha256", LISANS_GIZLI_ANAHTAR).update(normal).digest("hex").toUpperCase();
  const kisa = hmac.slice(0, 16);
  return kisa.match(/.{1,4}/g).join("-");
}

const isletmeAdi = process.argv.slice(2).join(" ");
if (!isletmeAdi) {
  console.log('Kullanim: node lisans-uret.js "Isletme Adi"');
  process.exit(1);
}

console.log("");
console.log("Isletme Adi :", isletmeAdi);
console.log("Lisans Anahtari:", lisansAnahtariUret(isletmeAdi));
console.log("");
console.log("Not: Musteri, uygulamada ISLETME ADINI da BIREBIR AYNI (buyuk/kucuk");
console.log("harf onemli degil ama bosluklar ve yazim ayni olmali) girmeli, yoksa anahtar tutmaz.");
