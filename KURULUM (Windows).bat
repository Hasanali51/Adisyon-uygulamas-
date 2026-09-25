@echo off
chcp 65001 >nul
title Adisyo - Ilk Kurulum
color 0A

echo =================================================
echo   ADISYO - ILK KURULUM
echo =================================================
echo.
echo Bu islem sadece BIR KEZ yapilir. Birkac dakika surebilir.
echo.

if not exist "backend" (
    echo [HATA] "backend" klasoru bulunamadi.
    echo.
    echo Bu genellikle ZIP dosyasini tam olarak ayiklamadan, dogrudan ZIP'in
    echo icinden bu dosyayi calistirmaya calisinca olur.
    echo.
    echo Cozum: ZIP dosyasina SAG TIKLA -^> "Tumunu Ayikla / Extract All" de,
    echo cikan GERCEK klasorun icine gir, KURULUM dosyasini oradan calistir.
    echo.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Bilgisayarinda Node.js kurulu degil.
    echo.
    echo Once su adresten Node.js'i indirip kur:
    echo   https://nodejs.org
    echo ^(Yesil "LTS" yazan butona tikla, indir, kur - hepsi "Ileri/Next" demek yeterli^)
    echo.
    echo Kurduktan SONRA bu dosyayi tekrar calistir.
    echo.
    pause
    exit /b 1
)

echo [1/2] Sunucu (backend) hazirlaniyor...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [HATA] Kurulum sirasinda bir sorun olustu. Internet baglantini kontrol et.
    pause
    exit /b 1
)
if not exist ".env" copy .env.example .env >nul
cd ..

echo.
echo [2/2] Ekran (frontend) hazirlaniyor ve derleniyor...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [HATA] Kurulum sirasinda bir sorun olustu. Internet baglantini kontrol et.
    pause
    exit /b 1
)
call npm run build
cd ..

echo.
echo =================================================
echo   KURULUM TAMAMLANDI!
echo =================================================
echo.
echo Artik her gun uygulamayi acmak icin sadece
echo "BASLAT (Windows).bat" dosyasina cift tikla.
echo.
pause
