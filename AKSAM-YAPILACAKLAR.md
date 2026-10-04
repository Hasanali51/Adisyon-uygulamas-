# Akşam yapılacaklar (bilgisayarda) → sonra ilk mekanda test

Kod tarafı hazır ve git'te (sürüm **1.6.0**). `v1.3.0`, `v1.3.1`, `v1.3.2`, `v1.4.0`, `v1.4.1`, `v1.4.2` ve `v1.5.0` etiketlerini kullanma; 1.6.0'de lisans, webhook, cihaz eşleştirme güvenliği ve otomatik yedekleme ve PDF rapor var.

## 1) Hazırlık (5 dk)
1. Projeyi güncelle: `git pull` (ya da repoyu yeniden indir).
2. Sohbetten indirdiğin **`lisans-ozel-anahtar.pem`** dosyasını proje ana klasörüne koy
   (`lisans-uret.js` ile aynı yer). Bu dosya `.gitignore`'da, git'e girmez. **Bir yere de yedekle**
   (USB/şifre yöneticisi). Kaybedersen yeni müşterilere lisans veremezsin; kimseyle paylaşma.
3. GitHub'a yapıştırdığın erişim token'ını iptal et (Settings → Developer settings → Tokens → Delete).

## 2) Kurulum dosyasını derle ve yayınla (15 dk)
1. `cd masaustu` → `npm install` → `npm run derle-win`
2. Çıkan klasörden (`masaustu/dist/`) şu 3 dosyayı al: `Adisyo-Setup-1.6.0.exe`,
   `Adisyo-Setup-1.6.0.exe.blockmap`, `latest.yml`
3. GitHub → Releases → **Draft a new release** → etiket olarak **`v1.6.0`** yaz (Create new tag) →
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
- [ ] **Fişin altında** "BILGI FISIDIR - MALI DEGERI YOKTUR" satırı çıkıyor mu (yazıcıda yanlış karakter/kesilme var mı); yasal belge için müşterinin kendi ÖKC'si kullanılıyor
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

## Yönetici PIN güvenliği (v1.6.0)
- PIN artık **sunucuda** doğrulanıyor; garson ekranları/tabletleri yönetici PIN'ini, platform API anahtarlarını ve
  ngrok token'ını hiçbir şekilde göremez (API'den de gelmez). Cihaz eşleştirme ve yedek ayarları da yönetici girişi ister.
- 5 yanlış PIN'de o cihaz 5 dakika kilitlenir. Yönetici oturumu 12 saat boşta kalınca düşer.
- **Varsayılan PIN 1234 ise Yazıcı & İşletme ekranında kırmızı uyarı çıkar: ilk iş PIN'i değiştir.**
- Sınır: garson cihazları satış geçmişini (ciro) teknik olarak API'den okuyabilir; korunan şey gizli anahtarlar ve ayarlardır.
- Test: garson modunda iken Yönetim menüsüne girilemiyor mu, yönetici girişi sonrası Entegrasyonlar'da anahtarlar görünüyor mu.

## Platform entegrasyonları (v1.6.0)
Resmi geliştirici portalları: [Trendyol Go](https://developers.tgoapps.com/) (Yemek entegrasyonu bölümü),
[Getir](https://developers.getir.com/food/documentation/giris), [Yemeksepeti](https://integration.yemeksepeti.com/).
Hepsi için önce **satıcı/partner onayı** ve API bilgileri gerekir; belgeler dinamik sayfa olduğundan ben
içeriklerini okuyamadım, bu yüzden gerçek uç nokta/alan adlarını **tahmin edip yazmadım**.
Üçüncü taraf bir projenin notuna göre Trendyol yemek siparişleri webhook yerine sürekli sorgulamayla (polling)
alınıyor olabilir; bu **doğrulanmış bir bilgi değil**, resmi belgeden kontrol et.

Bu sürümde hazır olan altyapı:
- Sipariş alma (webhook) uçları: doğrulama (başlık ya da `?anahtar=`), tekrar eden sipariş no'yu eleme,
  kalem/boyut/değer sınırları, dakikada 120 istek sınırı.
- **Alan eşleştirme:** platformdan gelen gövde farklıysa Entegrasyonlar → platform kartı → "Gelişmiş: alan eşleştirme"
  bölümüne noktalı yollar yazarak (kod değişmeden) uyarlanır.
- **Entegrasyon Günlüğü:** gelen son 30 isteğin sonucu ve ham gövdesi (reddedilenlerde nedeni). İlk gerçek
  isteği buradan görüp eşleştirmeyi yaparsın.
- Webhook anahtarı üretimi artık güvenli rastgele üreteçle yapılıyor.

Yapılmayanlar (platform API'si/onayı gerekli): siparişi platforma **kabul/hazır/yolda** diye bildirmek,
Trendyol için sorgulama (polling), menü/stok senkronu. Platformlar siparişin belirli sürede kabulünü
isteyebilir; ilk etapta kabulü platformun kendi panelinden/tabletinden yap.

**Onay alınca yapılacaklar:** (1) Entegrasyonlar'da platform kartı: API bilgileri + "Webhook Doğrulama Anahtarı"
üret + Kaydet; (2) platformun panelinde webhook adresini (anahtarlı adres) gir; (3) platformdan test siparişi
gönder; (4) Entegrasyon Günlüğü'ne bak: Reddedildi ise nedenini, Kabul ise sipariş Paketler ekranında çıkıyor mu;
(5) gövde farklıysa alan eşleştirmeyi doldur; (6) bana ham veriyi yapıştır, ben de kabul/durum çağrılarını yazayım.

## Kararlar (bu oturumda)
- **Marka adı:** şimdilik "Adisyo" kalıyor; satışa/Play Store'a çıkmadan önce karar verilecek (hukuki risk notu duruyor).
- **Yasal fiş:** bilgi fişi + müşterinin kendi ÖKC'si. Uygulamada fişe "mali değeri yoktur" yazısı ve ayarlarda yasal bilgi kutusu eklendi, README'de not var.
