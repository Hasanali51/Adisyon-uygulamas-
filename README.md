# Adisyo — Kafe/Restoran Otomasyonu

Masa takibi, sipariş girişi, ödeme alma, paket siparişler (Trendyol/Getir/
Yemeksepeti) ve gün sonu raporunu içeren, kendi bilgisayarında/kafende
çalışan bir otomasyon sistemi.

---

## 1) İlk kurulum (SADECE 1 KEZ yapılır)

**Adım 1 — Node.js kur** (bilgisayarında yoksa)
👉 https://nodejs.org adresine git, **yeşil "LTS" yazan butona** tıkla, indirilen
dosyayı çalıştır, hepsinde "İleri / Next / Devam" de. (2 dakika sürer.)

**Adım 2 — Bu klasörü bir yere yerleştir**
Bu klasörü (içindeki her şeyle birlikte) masaüstüne veya istediğin bir yere
koy. Silmeyeceğin, taşımayacağın sabit bir yer seç — verilerin burada saklanacak.

**Adım 3 — Kurulum dosyasını çalıştır**
- **Windows** kullanıyorsan: `KURULUM (Windows).bat` dosyasına **çift tıkla**.
- **Mac** kullanıyorsan: `KURULUM (Mac).command` dosyasına çift tıkla.
  (Mac ilk seferde "bilinmeyen geliştirici" uyarısı verirse: dosyaya sağ
  tıkla → **Aç** de, tekrar sorarsa yine **Aç** de.)

Birkaç dakika sürecek bir işlem başlar (internet gerekir). Sonunda "KURULUM
TAMAMLANDI" yazısını görünce kapatabilirsin. **Bu adımı bir daha yapmana
gerek yok.**

---

## 2) Her gün nasıl açılır?

- **Windows**: `BASLAT (Windows).bat` dosyasına çift tıkla.
- **Mac**: `BASLAT (Mac).command` dosyasına çift tıkla.

Açılan siyah pencere sunucunun çalıştığını gösterir — **bu pencereyi
kapatma**, kapatırsan uygulama durur. Birkaç saniye içinde tarayıcı otomatik
açılır ve uygulamayı görürsün. Açılmazsa tarayıcına şunu yaz:
`http://localhost:4000`

Gün sonunda dükkanı kapatırken siyah pencereyi kapatabilirsin (veya
bilgisayarı kapat). Veriler kaybolmaz, ertesi gün `BASLAT` ile kaldığın
yerden devam eder.

### Tablet / telefon / ikinci kasadan bağlanmak istersen
Siyah pencerede şöyle bir satır göreceksin:
```
Diğer cihazlardan  : http://192.168.1.23:4000
```
Aynı WiFi ağındaki tablet, telefon veya başka bir bilgisayarın tarayıcısına
bu adresi yazarsan, **aynı anda aynı masaları/siparişleri** görüp
yönetebilirsiniz. (Ana bilgisayar kapanırsa diğer cihazlar da bağlanamaz —
sunucu her zaman o ana bilgisayarda çalışır.)

---

## 3) Uygulamayı kullanma

- **Masalar** ekranı: boş masalar açık renk, dolu masalar koyu görünür. Bir
  masaya dokun → menüden ürün ekle → **"Siparişi Mutfağa Gönder"**.
- Masa kartındaki hızlı butonlarla direkt **yazdırabilir** veya **ödeme
  alabilirsin**. Ödemede hesabı bölmek istersen (herkes kendi siparişini
  ödesin) "Öde" sekmesinden istediğin kalemleri seçip kısmi ödeme alabilirsin.
- **Paket** ekranı: Trendyol/Getir/Yemeksepeti gibi platformlardan gelen
  (veya telefonla alınan) paket siparişleri buradan takip edilir.
- **Yönetim** ekranından masa sayısını, menüyü (kategori/ürün/fiyat) ve
  işletme adını/kağıt genişliğini (58mm/80mm) ayarlayabilirsin.
- **Rapor** ekranından gün/hafta/tüm zaman ciro ve geçmiş fişleri görebilir,
  istediğin fişi tekrar yazdırabilirsin.

### Fiş yazıcısı
Fiş yazıcın (termal, USB veya ağ) bilgisayarında normal bir yazıcı olarak
tanımlıysa (çoğu fiş yazıcısında durum budur) ekstra bir ayara gerek yok —
"Yazdır" dediğinde tarayıcının yazdırma penceresi açılır, oradan fiş
yazıcını seçip yazdırırsın. Yönetim → Yazıcı sekmesinden kağıt genişliğini
(58mm/80mm) fişe göre ayarla.

### Garson / Yönetici modu
Uygulama her açıldığında **Garson modunda** başlar: garson sadece masa açıp
sipariş girebilir, ödeme alabilir, paket siparişleri yönetebilir. Ciro,
menü, masa sayısı ve yazıcı ayarlarına **erişemez** — hamburger (☰) menüsünde
bunlar garsona hiç görünmez, sadece "Yönetici Girişi" seçeneği vardır.

Sen (işletme sahibi) ayarlara girmek istediğinde ☰ → **Yönetici Girişi**'ne
tıkla, varsayılan PIN **1234**'ü gir. Girdikten sonra tüm ayarlar açılır ve
menüden "Garson Moduna Dön" ile istediğin an tekrar garson moduna geçebilirsin.

**PIN'i mutlaka değiştir:** Yönetim → Yazıcı & İşletme sekmesinin altında
"Yönetici PIN'i" bölümünden yeni bir PIN belirleyebilirsin. **PIN'ini
unutursan:** `backend/durum.json` dosyasını bir metin editörüyle aç,
içindeki `"yoneticiPin": "..."` satırını `"yoneticiPin": "1234"` yap ve
kaydet, sunucuyu (BASLAT) yeniden başlat.

### İşletme adı
Uygulamayı ilk açtığında karşına işletmenin adını soran bir ekran çıkar —
her kafe/restoran kendi adını girer, bu ad fişlerde ve ekranda görünür.
Daha sonra değiştirmek istersen: ☰ → Yazıcı & İşletme → İşletme adı.

---

## 4) Trendyol Yemek / Getir Yemek / Yemeksepeti entegrasyonu

**API bilgilerini artık `.env` dosyasıyla uğraşmadan, uygulama içinden
girebilirsin:** ☰ menü → **Entegrasyonlar**. Her platform için ayrı bir kart
var; satıcı panelinden aldığın API Anahtarı/Şifresi/Mağaza ID'sini oraya
gir, "Webhook Doğrulama Anahtarı" alanına rastgele bir anahtar üret (🔄
butonu), ve kartın gösterdiği **Webhook Adresi**'ni kopyalayıp platformun
kendi panelindeki ilgili alana yapıştır. "Kaydet"e basınca bu bilgiler
`backend/durum.json` içine yazılır ve gelen webhook isteklerinin doğrulaması
otomatik olarak bu anahtara göre yapılır (eski `.env` yöntemi de yedek
olarak hâlâ çalışıyor, ama artık buna gerek yok).

Bu sistemin alt yapısı bu platformlardan **otomatik sipariş almaya ve
otomatik fiş yazdırmaya** hazır. Ama şunu bilmen gerekiyor: her platformun
**kendi resmi partner/geliştirici başvurusu** var; API erişimi ancak o
başvuru onaylandıktan sonra açılıyor ve her platformun gönderdiği verinin
formatı/kimlik doğrulaması farklı. Bu yüzden burada "tahmini" bir bağlantı
kurmak yerine, onay aldığında kolayca bağlanabileceğin bir iskelet hazırladık:

```
POST http://SUNUCU-ADRESIN/api/webhook/trendyol
POST http://SUNUCU-ADRESIN/api/webhook/getir
POST http://SUNUCU-ADRESIN/api/webhook/yemeksepeti
```

Onay sonrası platformun sana verdiği dokümana göre `backend/server.js`
içindeki `normallestir()` (gelen veriyi okuma) fonksiyonunu güncellemen
yeterli — kimlik doğrulama (yukarıdaki Entegrasyonlar ekranı), kayıt, tüm
ekranlara anlık yansıma ve otomatik yazdırma zaten hazır ve çalışıyor.

**Önemli — dışarıdan erişim:** Webhook adresi şu an sadece bu bilgisayardan/
aynı ağdan çalışır. Trendyol/Getir/Yemeksepeti'nin kendi sunucularından bu
adrese istek gönderebilmesi için bu adresin **internetten erişilebilir**
olması gerekir. Test için `ngrok` gibi bir tünel servisiyle geçici bir genel
adres açabilirsin; kalıcı kullanım için sunucuyu küçük bir bulut sunucusuna
(VPS) taşımak gerekir — istersen bu konuda da yardımcı olabilirim.

**Daha hızlı bir alternatif:** Platformlarla tek tek uğraşmak yerine, bu işi
zaten yapan bir entegratör/orta katman servise abone olup onun tek
webhook'unu yukarıdaki uçlardan birine bağlamak. Türkiye'de bu işi yapan
üçüncü parti firmalar mevcut.

**Not:** Sunucu sadece bu bilgisayarda çalıştığı sürece (`BASLAT` penceresi
açıkken) bu webhook adresleri dışarıdan (internetten) ulaşılabilir olmaz —
sadece aynı ağdaki cihazlar ulaşabilir. Dışarıdan (gerçek Trendyol/Getir
sunucularından) istek alabilmek için bu sunucuyu internete açık bir yerde
(VPS, Railway, Render vb.) barındırman gerekir; bu ayrı bir teknik kurulum
işidir, istersen bu konuda da yardımcı olabilirim.

---

## 5) Verilerini yedekle (önemli!)

Tüm masalar/menü/geçmiş fişler `backend/durum.json` dosyasında tutulur.
Ara sıra bu dosyayı bir USB belleğe veya Google Drive/e-posta ile kendine
kopyala — bilgisayar arızalanırsa/değişirse verilerini bu dosyayı yeni
kuruluma kopyalayarak geri getirebilirsin (`BASLAT`'ı ilk çalıştırmadan
önce bu dosyayı `backend` klasörüne koyman yeterli).

---

## 6) Sorun giderme

- **"Node.js kurulu değil" hatası**: Adım 1'i tekrar yap, kurulumdan sonra
  bilgisayarı yeniden başlatmayı dene.
- **Tarayıcı açılmıyor / "bağlanılamadı" diyor**: Siyah pencerede hata var mı
  bak; `KURULUM` dosyasını tekrar çalıştırmayı dene.
- **Diğer cihazdan bağlanamıyorum**: Aynı WiFi ağında olduklarından emin ol.
  Bazı ev/ofis tipi router'larda "AP izolasyonu" açık olabilir, cihazların
  birbirini görmesini engeller — router ayarından kapatman gerekebilir.
- **Menü/masa ayarlarımı sıfırlamak istiyorum**: Yönetim ekranında "Tüm
  Verileri Sıfırla" seçeneği var (dikkat: geri alınamaz).

---

## 7) Teknik detaylar (ileri seviye / geliştiriciler için)

```
adisyo-sistemi/
  backend/   ← API + WebSocket sunucusu + derlenmiş ekran (public/)
  frontend/  ← React kaynak kodu (backend/public'e derlenir)
```

- Backend tek başına çalışır: `cd backend && node server.js` — hem
  `/api/...` uçlarını hem de `public/` klasöründeki derlenmiş ekranı aynı
  porttan (varsayılan 4000) sunar.
- Ekranda değişiklik yapıp yeniden derlemek istersen: `cd frontend && npm
  run build` (çıktı otomatik olarak `backend/public`'e yazılır).
- Geliştirme sırasında canlı yenileme için: `cd frontend && npm run dev`
  (http://localhost:5173) — bu modda backend'in ayrıca `cd backend && npm
  run dev` ile çalışıyor olması gerekir.
- Veri: `backend/durum.json` (dosya tabanlı, küçük/orta ölçek için yeterli).
  Çoklu şube veya çok yoğun kullanım için Postgres/SQLite'a geçmek isteyebilirsin
  (dışarıya açılan tek şey `backend/db.js` içindeki `oku()/yaz()` olduğu için
  sadece o dosyayı değiştirmen yeterli, `server.js` aynı kalır).
- Sessiz/diyalogsuz otomatik yazdırma istersen: **QZ Tray** (ücretsiz, açık
  kaynak) kurup frontend'e birkaç satır entegrasyon eklenebilir.
- Kimlik doğrulama (giriş ekranı) yok; birden fazla şube/kullanıcı ayrımı
  gerekiyorsa eklenebilir.
