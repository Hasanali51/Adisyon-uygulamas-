# Akşam yapılacaklar (bilgisayarda) → sonra ilk mekanda test

Kod tarafı hazır ve git'te (sürüm **1.4.1**). `v1.3.0`, `v1.3.1`, `v1.3.2` ve `v1.4.0` etiketlerini kullanma; 1.4.1'de lisans, webhook, cihaz eşleştirme güvenliği ve otomatik yedekleme ve PDF rapor var.

## 1) Hazırlık (5 dk)
1. Projeyi güncelle: `git pull` (ya da repoyu yeniden indir).
2. Sohbetten indirdiğin **`lisans-ozel-anahtar.pem`** dosyasını proje ana klasörüne koy
   (`lisans-uret.js` ile aynı yer). Bu dosya `.gitignore`'da, git'e girmez. **Bir yere de yedekle**
   (USB/şifre yöneticisi). Kaybedersen yeni müşterilere lisans veremezsin; kimseyle paylaşma.
3. GitHub'a yapıştırdığın erişim token'ını iptal et (Settings → Developer settings → Tokens → Delete).

## 2) Kurulum dosyasını derle ve yayınla (15 dk)
1. `cd masaustu` → `npm install` → `npm run derle-win`
2. Çıkan klasörden (`masaustu/dist/`) şu 3 dosyayı al: `Adisyo-Setup-1.4.1.exe`,
   `Adisyo-Setup-1.4.1.exe.blockmap`, `latest.yml`
3. GitHub → Releases → **Draft a new release** → etiket olarak **`v1.4.1`** yaz (Create new tag) →
   3 dosyayı sürükle → **Publish release**.
   (Release "pre-release" ya da "draft" kalmasın, yoksa otomatik güncelleme görmez.)

> İstersen bunu bir daha elle yapmamak için: `ci-ornek/release.yml` dosyasını GitHub'da
> `.github/workflows/release.yml` olarak ekle (Add file → Create new file). Bundan sonra `vX.Y.Z`
> etiketi atınca Windows kurulumu GitHub'da kendiliğinden derlenip release olarak yayınlanır.
> Etiket zaten varsa Actions sekmesinden "Run workflow" ile de başlatabilirsin.

## 3) İlk müşteri için lisans
`node lisans-uret.js "İşletme Adı"` → çıkan uzun anahtarı müşteriye ver (işletme adını birebir aynı
yazması gerekir; büyük/küçük harf fark etmez). Eski tip kısa anahtarlar (`XXXX-XXXX-...`) artık geçerli değil;
daha önce **etkinleştirilmiş** kurulumlar etkilenmez.

## 4) İlk mekanda test listesi
- [ ] Kurulum → lisans ekranı → işletme adı + anahtar → açılıyor mu
- [ ] **Fiş yazıcısı:** ham yazdırma + otomatik kağıt kesme (yol haritasının 1. maddesi, hâlâ donanımda doğrulanmadı)
- [ ] **Mutfak yazıcısı (KOT):** fiyatsız fiş mutfak yazıcısından çıkıyor mu
- [ ] Masa taşıma/birleştirme, stok düşme ve "Tükendi", veresiye/cari, Excel/CSV rapor, **PDF / Yazdır** (Ciro & Rapor → "PDF / Yazdır" → yazıcı olarak "PDF olarak kaydet" / "Microsoft Print to PDF" seç)
- [ ] **Entegrasyonlar:** Tünel (ngrok) bilgilerini gir; her platform için **Webhook Doğrulama Anahtarı oluştur**
      (yenile düğmesi) ve kaydet. Anahtar yoksa webhook'lar artık reddedilir (güvenlik için bilerek böyle).
- [ ] **QR Menü:** Entegrasyonlar → QR Menü → yazdır, telefondan okut, menü açılıyor mu
- [ ] **Otomatik güncelleme:** kurulu sürümün altında yeni bir sürüm yayınlayıp uygulamanın bulup kurduğunu gör
- [ ] **Otomatik yedek:** Yönetici → Yazıcı & İşletme → Otomatik Yedekleme: "Şimdi Yedekle" çalışıyor mu, **ek klasör** olarak OneDrive/USB yolunu gir, dosyalar oraya düşüyor mu; bir yedekle "Yedekten Geri Yükle" dene
- [ ] Telefon/tablet: eşleştirme kodu ile bağlanıyor mu; **eşleşmemiş bir telefondan** `http://<ip>:4000/api/durum` açılmıyor mu (401 görmeli)

## Cihaz eşleştirme (yeni, güvenlik)
Artık aynı WiFi'deki **müşteriler** `/api/durum` ve canlı yayına giremez; sadece ana bilgisayar (localhost) ve
eşleştirilmiş cihazlar girebilir. Müşteriler yalnızca `/menu` (QR menü) sayfasını görür.
- **Ana bilgisayarda** (Adisyo penceresi ya da `http://localhost:4000`): ekstra bir şey yapma.
- **Tablet/telefon/ikinci kasa:** adresi aç (`http://192.168.x.x:4000`) → "Cihazı Eşleştir" ekranı çıkar →
  ana bilgisayarda Yönetici → Entegrasyonlar → **Cihaz Ekle** → kod üret → cihaza gir. Bir kez yapılır.
- Cihaz kaybolursa aynı yerden **Kaldır**.
- Ana bilgisayarda tarayıcıyı `192.168...` adresiyle değil, **`localhost`** adresiyle aç (yoksa eşleştirme ister).
- Android uygulaması aynı sayfayı açtığı için ilk açılışta o da kod ister.
- Güncelleme sonrası mevcut tabletler bir kez eşleştirme isteyecek.
