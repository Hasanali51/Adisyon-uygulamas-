# Adisyo — Android Uygulaması (Garson Telefonları için)

Bu, garsonların telefonuna kurulacak APK'yı Android Studio'nda kendi
bilgisayarında derlemen için hazırlanmış proje. Tek bir APK üretiyorsun,
istediğin kadar telefona (ve istediğin kadar farklı kafeye) kurabilirsin —
her kafenin garsonu kendi WiFi'sindeki adresi bir kere girip bağlanıyor.

## Nasıl çalışıyor?

Uygulama açıldığında karşına basit bir ekran çıkar: "Sunucu adresi" sorar.
Garson, kafenin bilgisayarında Adisyo açıkken görünen yerel ağ adresini
(örn. `192.168.1.23:4000`) bir kere girer, "Bağlan" der — o andan sonra
uygulama direkt Adisyo ekranını gösterir. Adres telefonda hatırlanır, bir
daha sorulmaz (aynı telefon aynı kafede kullanılıyorsa).

## Derleme adımları (Android Studio ile)

1. **Bu klasörü (`mobil`) bilgisayarına kopyala.**
2. Android Studio'yu aç → **File → Open** → klasör seçici açılınca
   `mobil` klasörünün İÇİNDEKİ **`android`** klasörünü seç (mobil'in
   kendisini değil, içindeki android alt klasörünü).
3. Android Studio projeyi ilk açtığında birkaç dakika "Gradle Sync"
   yapar (internetin olduğundan emin ol, ilk seferde bazı bileşenleri
   indirir). Bekle, hata vermeden bitmesi lazım.
4. Üstteki yeşil "▶ Run" butonuna basarsan, USB ile bağlı ya da aynı ağdaki
   bir Android telefona/emülatöre direkt kurup açar — test etmek için ideal.
5. Telefonlara **dağıtılabilir bir APK dosyası** almak istersen:
   **Build → Build App Bundle(s) / APK(s) → Build APK(s)** de.
   Derleme bitince sağ altta çıkan "locate" linkine tıkla — APK dosyası
   şurada olur: `android/app/build/outputs/apk/debug/app-debug.apk`
6. Bu `app-debug.apk` dosyasını istediğin telefona gönder (WhatsApp,
   Google Drive, USB kablo, fark etmez). Telefonda dosyaya dokununca
   "Bilinmeyen kaynaklardan yükleme" izni isteyecek — izin ver, kurulsun.

## Uygulama adı / ikonu değiştirmek istersen

- İsim: `android/app/src/main/res/values/strings.xml` içindeki `app_name`
- İkon: `android/app/src/main/res/mipmap-*` klasörlerindeki `ic_launcher.png`
  dosyaları (Android Studio'da sağ tık → New → Image Asset ile de
  değiştirebilirsin, kendi ikon dosyanı seçtirir).

## Sorun çıkarsa

- "Gradle sync failed" gibi bir hata görürsen, ekran görüntüsünü bana at,
  düzeltirim — bu proje Capacitor (Google'ın da desteklediği, çok yaygın
  kullanılan bir araç) ile hazırlandı, olması gereken her şey burada var.
- Uygulama açılıp "bağlanamıyor" derse: telefonun kafenin WiFi'sinde
  olduğundan ve girdiğin adresin doğru olduğundan emin ol. Yanlış adres
  girdiysen, telefonda Ayarlar → Uygulamalar → Adisyo → Depolama →
  Verileri Temizle ile adres giriş ekranına geri dönebilirsin.
