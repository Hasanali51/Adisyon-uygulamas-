#!/bin/bash
cd "$(dirname "$0")"

echo "================================================="
echo "  ADISYO - ILK KURULUM"
echo "================================================="
echo ""
echo "Bu islem sadece BIR KEZ yapilir. Birkac dakika surebilir."
echo ""

if [ ! -d "backend" ]; then
    echo "[HATA] \"backend\" klasoru bulunamadi."
    echo ""
    echo "Bu genellikle ZIP dosyasini tam olarak ayiklamadan calistirmaya"
    echo "calisinca olur. ZIP dosyasina cift tikla (Mac otomatik ayiklar),"
    echo "cikan GERCEK klasorun icine gir, dosyalari oradan calistir."
    echo ""
    read -p "Kapatmak icin Enter'a bas..."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "[HATA] Bilgisayarinda Node.js kurulu degil."
    echo ""
    echo "Once su adresten Node.js'i indirip kur:"
    echo "  https://nodejs.org"
    echo "(Yesil \"LTS\" yazan butona tikla, indir, kur - hepsi \"Devam/Continue\" demek yeterli)"
    echo ""
    echo "Kurduktan SONRA bu dosyayi tekrar calistir."
    echo ""
    read -p "Kapatmak icin Enter'a bas..."
    exit 1
fi

echo "[1/2] Sunucu (backend) hazirlaniyor..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "[HATA] Kurulum sirasinda bir sorun olustu. Internet baglantini kontrol et."
    read -p "Kapatmak icin Enter'a bas..."
    exit 1
fi
if [ ! -f ".env" ]; then cp .env.example .env; fi
cd ..

echo ""
echo "[2/2] Ekran (frontend) hazirlaniyor ve derleniyor..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "================================================="
echo "  KURULUM TAMAMLANDI!"
echo "================================================="
echo ""
echo "Artik her gun uygulamayi acmak icin sadece"
echo "\"BASLAT (Mac).command\" dosyasina cift tikla."
echo ""
read -p "Kapatmak icin Enter'a bas..."
