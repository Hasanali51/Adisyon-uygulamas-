@echo off
chcp 65001 >nul
title Adisyo Calisiyor - Bu pencereyi KAPATMA
color 0A

if not exist "backend" (
    echo [HATA] "backend" klasoru bulunamadi.
    echo.
    echo Bu genellikle ZIP dosyasini tam olarak ayiklamadan, dogrudan ZIP'in
    echo icinden bu dosyayi calistirmaya calisinca olur.
    echo.
    echo Cozum: ZIP dosyasina SAG TIKLA -^> "Tumunu Ayikla / Extract All" de,
    echo cikan GERCEK klasorun icine gir, dosyalari oradan calistir.
    echo.
    pause
    exit /b 1
)

if not exist "backend\node_modules" (
    echo Once "KURULUM (Windows).bat" dosyasini calistirman gerekiyor.
    echo.
    pause
    exit /b 1
)

echo Adisyo baslatiliyor, birkac saniye surebilir...
echo.

cd backend

REM Sunucu ayaga kalkinca tarayiciyi otomatik ac
start "" cmd /c "timeout /t 2 >nul && start http://localhost:4000"

node server.js

echo.
echo Sunucu durdu. Bu pencereyi kapatabilirsin.
pause
