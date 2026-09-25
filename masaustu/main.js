const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { spawn } = require("child_process");
const { autoUpdater } = require("electron-updater");

const PORT = 4000;

// Kullanıcının verilerini (durum.json) her zaman yazılabilir ve kalıcı bir
// klasörde tut: Windows'ta genelde C:\Users\<kullanıcı>\AppData\Roaming\Adisyo
const VERI_DIZINI = app.getPath("userData");
process.env.ADISYO_VERI_DIZINI = VERI_DIZINI;
process.env.ADISYO_ELECTRON = "1";
process.env.PORT = String(PORT);

let pencere = null;
let tunelSureci = null;
let tray = null;
let cikisIsteniyor = false; // tray menüsünden "Çıkış" seçildiğinde true olur

// ---- Tek kopya kilidi ----
// Tray özelliği eklendiğinden beri process pencere kapatılsa da arka planda
// yaşamaya devam ediyor. Kilit olmadan, kullanıcı .exe'ye tekrar tekrar
// çift tıklarsa her seferinde YENİ bir process başlar; bunlar aynı 4000
// portunu paylaşmaya çalışır ve çakışır (biri diğerinin üstüne yazamaz,
// pencere hep en ESKİ/ilk açılan process'in içeriğini gösterir ya da hiç
// açılmaz). Bu kilit, ikinci bir çift tıklamada yeni process açmak yerine
// zaten çalışan gizli pencereyi öne getirir.
const kilitAlindiMi = app.requestSingleInstanceLock();
if (!kilitAlindiMi) {
  app.quit();
} else {
  app.on("second-instance", () => {
    pencereyiAc();
  });
}

function sunucuyuBaslat() {
  // backend/server.js require edilir edilmez kendi başına ayağa kalkar
  // (Express + WebSocket dinlemeye başlar).
  require(path.join(__dirname, "backend-embedded", "server.js"));
}

function pencereyiAc() {
  if (pencere) {
    pencere.show();
    pencere.focus();
    return;
  }

  pencere = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#F3EEE3",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const adresiYukle = () => {
    pencere.loadURL(`http://localhost:${PORT}`).catch(() => {
      // Sunucu henüz tam ayağa kalkmamış olabilir, kısa bir gecikmeyle tekrar dene.
      setTimeout(adresiYukle, 300);
    });
  };
  adresiYukle();

  pencere.once("ready-to-show", () => pencere.show());

  // Pencerenin X butonu: uygulamayı KAPATMA, sadece arka plana gizle.
  // Böylece backend + ngrok tüneli, pencere kapalıyken de çalışmaya devam eder
  // (web/PWA/mobil taraftan gelen istekler kesintiye uğramaz).
  pencere.on("close", (e) => {
    if (!cikisIsteniyor) {
      e.preventDefault();
      pencere.hide();
    }
  });

  pencere.on("closed", () => (pencere = null));
}

// ---- Sistem tepsisi (tray) ----
// Pencere kapatılsa/gizlense bile process arka planda çalışmaya devam ettiği
// için, uygulamayı geri açmak veya tamamen kapatmak için bir tray simgesi
// gerekiyor (aksi halde görev çubuğunda uygulamayı bulamazsın).
function trayOlustur() {
  const iconYolu = path.join(__dirname, "build", "icon.png");
  const trayIcon = nativeImage.createFromPath(iconYolu).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip(`Adisyo çalışıyor (arka planda) — v${app.getVersion()}`);

  const menu = Menu.buildFromTemplate([
    { label: "Adisyo'yu Aç", click: () => pencereyiAc() },
    { label: "Güncellemeleri Kontrol Et", click: () => guncellemeKontrolEt(true) },
    { type: "separator" },
    {
      label: "Çıkış",
      click: () => {
        cikisIsteniyor = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => pencereyiAc());
}

// ---- Otomatik güncelleme (GitHub Releases üzerinden) ----
// package.json > build > publish alanındaki GitHub deposunu kontrol eder.
// elleGosterilsin=true ise (tray menüsünden manuel tetiklendiyse) "güncel"
// veya "hata" durumunda da kullanıcıya bir bilgi kutusu gösterir; sessiz
// (arka plan) kontrolde ise sadece güncelleme BULUNURSA kullanıcıyı rahatsız
// eder — internet yoksa veya güncelleme yoksa hiçbir şey göstermez.
let guncellemeKontrolEdiliyor = false;
function guncellemeKontrolEt(elleGosterilsin = false) {
  if (guncellemeKontrolEdiliyor) return;
  guncellemeKontrolEdiliyor = true;
  autoUpdater
    .checkForUpdates()
    .catch((hata) => {
      if (elleGosterilsin) {
        dialog.showMessageBox({
          type: "error",
          title: "Güncelleme Kontrolü",
          message: "Güncelleme kontrol edilemedi.",
          detail: String(hata?.message || hata),
        });
      }
    })
    .finally(() => {
      guncellemeKontrolEdiliyor = false;
    });
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("update-not-available", () => {
  // Sessiz kontrolde bir şey göstermiyoruz; manuel kontrolde tray menüsünden
  // tetiklenen ayrı bir "güncel" mesajı istenirse buraya eklenebilir.
});

autoUpdater.on("error", () => {
  // İnternet yoksa/GitHub'a erişilemiyorsa sessizce geç — uygulamanın
  // normal çalışmasını ASLA engellemesin.
});

autoUpdater.on("update-downloaded", (bilgi) => {
  if (!pencere) return;
  dialog
    .showMessageBox(pencere, {
      type: "info",
      title: "Güncelleme Hazır",
      message: `Adisyo'nun yeni sürümü (${bilgi.version}) indirildi.`,
      detail: "Şimdi yeniden başlatıp kurulsun mu? İstersen daha sonra, programı bir dahaki kapatıp açışında otomatik kurulur.",
      buttons: ["Şimdi Yeniden Başlat", "Daha Sonra"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((sonuc) => {
      if (sonuc.response === 0) {
        cikisIsteniyor = true;
        autoUpdater.quitAndInstall();
      }
    });
});

// ---- Ham (ESC/POS) yazdırma ----
// Windows'un normal "Yazdır" penceresi (window.print) yazıcı sürücüsü
// üzerinden sayfa olarak basar; sürücüde "otomatik kesme" seçeneği yoksa
// (çoğu jenerik/Çin termal yazıcı sürücüsünde olduğu gibi) kesme komutu hiç
// gönderilmez. Bunun yerine, yazıcıya RAW veri (ESC/POS komutları + kesme
// komutu) doğrudan Windows yazdırma kuyruğu (winspool) üzerinden gönderiyoruz.
// Bu, çoğu POS/fiş yazılımının kullandığı standart yöntemdir.
const RAW_YAZDIRMA_PS1 = `
param(
  [Parameter(Mandatory=$true)][string]$PrinterName,
  [Parameter(Mandatory=$true)][string]$FilePath
)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AdisyoRawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool Gonder(string yazici, byte[] veri) {
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Adisyo Fis";
        di.pDataType = "RAW";
        bool basarili = false;
        IntPtr pBytes = Marshal.AllocCoTaskMem(veri.Length);
        Marshal.Copy(veri, 0, pBytes, veri.Length);
        if (OpenPrinter(yazici, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    int yazilan;
                    basarili = WritePrinter(hPrinter, pBytes, veri.Length, out yazilan);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pBytes);
        return basarili;
    }
}
"@
$veri = [System.IO.File]::ReadAllBytes($FilePath)
$sonuc = [AdisyoRawPrinter]::Gonder($PrinterName, $veri)
if (-not $sonuc) { Write-Error "Yazdirma basarisiz (yazici adi dogru mu, yazici acik mi?)"; exit 1 }
exit 0
`;

function hamYaziciyaGonder(yaziciAdi, veriBuffer) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "win32") {
      reject(new Error("Ham (ESC/POS) yazdırma şu an sadece Windows'ta destekleniyor."));
      return;
    }
    const damga = Date.now();
    const veriYolu = path.join(os.tmpdir(), `adisyo-fis-${damga}.bin`);
    const psYolu = path.join(os.tmpdir(), `adisyo-yazdir-${damga}.ps1`);
    try {
      fs.writeFileSync(veriYolu, veriBuffer);
      fs.writeFileSync(psYolu, RAW_YAZDIRMA_PS1, "utf8");
    } catch (e) {
      reject(e);
      return;
    }
    const ps = spawn("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      psYolu,
      "-PrinterName",
      yaziciAdi,
      "-FilePath",
      veriYolu,
    ]);
    let hataMetni = "";
    ps.stderr?.on("data", (d) => (hataMetni += d.toString()));
    ps.on("close", (kod) => {
      try {
        fs.unlinkSync(veriYolu);
      } catch {}
      try {
        fs.unlinkSync(psYolu);
      } catch {}
      if (kod === 0) resolve();
      else reject(new Error(hataMetni.trim() || `PowerShell çıkış kodu: ${kod}`));
    });
    ps.on("error", (err) => reject(err));
  });
}

ipcMain.handle("yazicilari-listele", async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const yazicilar = await win.webContents.getPrintersAsync();
    return yazicilar.map((y) => y.name);
  } catch {
    return [];
  }
});

ipcMain.handle("ham-yazdir", async (_event, { yaziciAdi, base64Veri }) => {
  try {
    const buffer = Buffer.from(base64Veri, "base64");
    await hamYaziciyaGonder(yaziciAdi, buffer);
    return { basarili: true };
  } catch (e) {
    return { basarili: false, hata: e.message };
  }
});

// ---- Otomatik tünel (ngrok) ----
// durum.json içindeki tunelAyarlari doluysa, ngrok.exe'yi (gerekirse indirip)
// otomatik başlatır - kullanıcının ayrı bir .bat dosyası çalıştırmasına gerek kalmaz.

function durumOku() {
  try {
    const dosya = path.join(VERI_DIZINI, "durum.json");
    if (!fs.existsSync(dosya)) return null;
    return JSON.parse(fs.readFileSync(dosya, "utf-8"));
  } catch {
    return null;
  }
}

function ngrokIndir(hedefYol) {
  return new Promise((resolve, reject) => {
    const url = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip";
    const zipYolu = path.join(path.dirname(hedefYol), "ngrok.zip");
    const dosya = fs.createWriteStream(zipYolu);

    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Yönlendirmeyi takip et
          https.get(res.headers.location, (res2) => {
            res2.pipe(dosya);
            dosya.on("finish", () => dosya.close(() => cikart()));
          }).on("error", reject);
          return;
        }
        res.pipe(dosya);
        dosya.on("finish", () => dosya.close(() => cikart()));
      })
      .on("error", reject);

    function cikart() {
      // PowerShell'in kendi Expand-Archive komutunu kullan (Windows 10+ dahili,
      // ekstra bir npm paketine gerek bırakmaz).
      const ps = spawn("powershell", [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Force -Path "${zipYolu}" -DestinationPath "${path.dirname(hedefYol)}"`,
      ]);
      ps.on("close", () => {
        try {
          fs.unlinkSync(zipYolu);
        } catch {}
        if (fs.existsSync(hedefYol)) resolve();
        else reject(new Error("ngrok çıkartılamadı"));
      });
      ps.on("error", reject);
    }
  });
}

async function tuneliBaslat(ayarlar) {
  if (!ayarlar || !ayarlar.ngrokAuthtoken || !ayarlar.ngrokDomain) return; // yapılandırılmamış, sessizce geç
  if (process.platform !== "win32") return; // şimdilik sadece Windows için otomatik indirme var

  const ngrokKlasoru = path.join(VERI_DIZINI, "ngrok");
  if (!fs.existsSync(ngrokKlasoru)) fs.mkdirSync(ngrokKlasoru, { recursive: true });
  const ngrokYolu = path.join(ngrokKlasoru, "ngrok.exe");

  try {
    if (!fs.existsSync(ngrokYolu)) {
      console.log("ngrok bulunamadı, indiriliyor...");
      await ngrokIndir(ngrokYolu);
      console.log("ngrok indirildi:", ngrokYolu);
    }

    // Authtoken'ı kaydet, sonra tüneli başlat.
    spawn(ngrokYolu, ["config", "add-authtoken", ayarlar.ngrokAuthtoken]).on("close", () => {
      tunelSureci = spawn(ngrokYolu, ["http", `--domain=${ayarlar.ngrokDomain}`, String(PORT)], {
        windowsHide: true,
      });
      tunelSureci.stdout?.on("data", (d) => console.log("[ngrok]", d.toString()));
      tunelSureci.stderr?.on("data", (d) => console.error("[ngrok]", d.toString()));
      console.log(`Tünel başlatıldı: https://${ayarlar.ngrokDomain}`);
    });
  } catch (hata) {
    console.error("Tünel başlatılamadı:", hata.message);
  }
}

if (kilitAlindiMi) {
  app.whenReady().then(() => {
    sunucuyuBaslat();
    pencereyiAc();
    trayOlustur();

    // Sunucunun durum.json'ı oluşturması için kısa bir bekleme sonrası tüneli dene.
    setTimeout(() => {
      const durum = durumOku();
      if (durum && durum.tunelAyarlari) tuneliBaslat(durum.tunelAyarlari);
    }, 1500);

    // Açılıştan birkaç saniye sonra sessizce güncelleme kontrolü yap
    // (elleGosterilsin=false: internet yoksa veya güncelleme yoksa
    // kullanıcıyı hiç rahatsız etmez).
    setTimeout(() => guncellemeKontrolEt(false), 8000);

    app.on("activate", () => {
      pencereyiAc();
    });
  });
}

// Pencere artık kapanınca process'i öldürmüyoruz (bkz. "close" olayı yukarıda),
// bu yüzden "window-all-closed" tetiklense bile burada app.quit() ÇAĞIRMIYORUZ.
// Gerçek çıkış sadece tray menüsündeki "Çıkış" ile ya da app.quit() çağıran
// başka bir yerden (örn. otomatik güncelleme) gelir.
app.on("window-all-closed", () => {
  // Kasıtlı olarak boş bırakıldı: backend + ngrok arka planda çalışmaya devam etsin.
});

app.on("before-quit", () => {
  cikisIsteniyor = true;
  if (tunelSureci) {
    try {
      tunelSureci.kill();
    } catch {}
  }
});
