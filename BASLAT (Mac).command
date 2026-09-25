#!/bin/bash
cd "$(dirname "$0")"

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

if [ ! -d "backend/node_modules" ]; then
    echo "Once \"KURULUM (Mac).command\" dosyasini calistirman gerekiyor."
    echo ""
    read -p "Kapatmak icin Enter'a bas..."
    exit 1
fi

echo "Adisyo baslatiliyor, birkac saniye surebilir..."
echo ""

cd backend

# Sunucu ayaga kalkinca tarayiciyi otomatik ac
( sleep 2 && open "http://localhost:4000" ) &

node server.js

echo ""
echo "Sunucu durdu. Bu pencereyi kapatabilirsin."
read -p "Kapatmak icin Enter'a bas..."
