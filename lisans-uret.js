// BU DOSYA KURULUM PAKETİNE DAHİL DEĞİL — sadece senin kendi bilgisayarında,
// yeni bir müşteriye lisans anahtarı üretmek için çalıştırman içindir.
//
// Lisanslar ed25519 ile İMZALANIR. İmzalamak için ÖZEL anahtar gerekir; o dosya
// (lisans-ozel-anahtar.pem) git'e GİRMEZ (.gitignore'da) ve kimseyle paylaşılmaz.
// Uygulamanın içinde sadece GENEL anahtar vardır; yani kod herkese açık olsa bile
// kimse kendine lisans üretemez.
//
// Kullanım:
//   node lisans-uret.js "Mersin Tantuni Baki Usta"
//
// Özel anahtar dosyasını bu dosyanın yanına koy (lisans-ozel-anahtar.pem) ya da
// LISANS_OZEL_ANAHTAR ortam değişkeniyle yolunu ver.
//
// (Özel anahtarı kaybedersen YENİ çift üretmek için:  node lisans-uret.js --anahtar-cifti-uret
//  Çıkan GENEL anahtarı backend/server.js ve masaustu/backend-embedded/server.js içindeki
//  LISANS_GENEL_ANAHTAR yerine yapıştır; daha önce verdiğin tüm anahtarlar geçersiz olur.)

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const OZEL_YOL = process.env.LISANS_OZEL_ANAHTAR || path.join(__dirname, "lisans-ozel-anahtar.pem");
const arg = process.argv.slice(2);

if (arg[0] === "--anahtar-cifti-uret") {
  if (fs.existsSync(OZEL_YOL)) {
    console.log(`${OZEL_YOL} zaten var; üzerine yazmıyorum. Önce taşı/sil.`);
    process.exit(1);
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(OZEL_YOL, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  console.log("Özel anahtar yazıldı:", OZEL_YOL, "(YEDEKLE, kimseyle paylaşma)");
  console.log("\nGENEL anahtar (server.js içine yapıştır):\n");
  console.log(publicKey.export({ type: "spki", format: "pem" }));
  process.exit(0);
}

const isletmeAdi = arg.join(" ");
if (!isletmeAdi.trim()) {
  console.log('Kullanim: node lisans-uret.js "Isletme Adi"');
  process.exit(1);
}
if (!fs.existsSync(OZEL_YOL)) {
  console.log("Özel anahtar bulunamadı:", OZEL_YOL);
  console.log("lisans-ozel-anahtar.pem dosyasını bu klasöre koy (ya da LISANS_OZEL_ANAHTAR ile yolunu ver).");
  process.exit(1);
}

const normal = isletmeAdi.trim().toLocaleUpperCase("tr-TR");
const yuk = Buffer.from(JSON.stringify({ i: normal }), "utf8");
const imza = crypto.sign(null, yuk, fs.readFileSync(OZEL_YOL, "utf8"));
const anahtar = `${yuk.toString("base64url")}.${imza.toString("base64url")}`;

console.log("");
console.log("Isletme Adi    :", isletmeAdi.trim());
console.log("Lisans Anahtari:");
console.log(anahtar);
console.log("");
console.log("Not: Musteri, uygulamada ISLETME ADINI BIREBIR ayni girmeli (buyuk/kucuk harf");
console.log("onemli degil ama bosluklar ve yazim ayni olmali), anahtari da bastan sona yapistirmali.");
