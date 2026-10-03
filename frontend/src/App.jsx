import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Minus, X, CreditCard, Banknote, Clock, ChevronLeft, Trash2,
  RotateCcw, Settings, Receipt, Printer, ChevronDown, ChevronUp,
  Package, Ban, Check, Menu, Truck, Boxes, Store, Lock, LogOut,
  Plug, Copy, RefreshCw, Download, Upload,
} from "lucide-react";
import QRCode from "qrcode";

// Normalde frontend ve backend AYNI sunucudan (aynı adresten) servis edilir
// (bkz. server.js -> express.static), bu yüzden VITE_API_URL boş bırakılabilir
// ve istekler otomatik olarak "şu an açık olan adrese" gider. Bu sayede kafede
// hangi bilgisayardan / hangi IP'den açarsan aç, ayrı bir ayar yapmana gerek kalmaz.
// Backend'i ayrı bir adreste barındırırsan (ör. bulut sunucu) frontend/.env
// dosyasına VITE_API_URL=https://backend-adresin şeklinde yazabilirsin.
const API_BASE = import.meta.env.VITE_API_URL || "";
const WS_BASE = API_BASE
  ? API_BASE.replace(/^http/, "ws")
  : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

// Cihaz eşleştirme: ana bilgisayar (localhost) hariç her cihaz (tablet/telefon) bir kez
// eşleştirilir ve sunucudan uzun bir anahtar alır; bu anahtar her isteğe eklenir.
const CIHAZ_ANAHTAR_KEY = "adisyo_cihaz_anahtari";
const cihazAnahtariOku = () => {
  try {
    return localStorage.getItem(CIHAZ_ANAHTAR_KEY) || "";
  } catch (e) {
    return "";
  }
};
const cihazAnahtariYaz = (v) => {
  try {
    localStorage.setItem(CIHAZ_ANAHTAR_KEY, v);
  } catch (e) {
    /* yok say */
  }
};
const apiFetch = (url, opts = {}) => {
  const k = cihazAnahtariOku();
  return fetch(url, k ? { ...opts, headers: { ...(opts.headers || {}), "x-cihaz-anahtari": k } } : opts);
};

const INK = "#1E293B";
const PAPER = "#F3F7FC";
const CARD = "#FFFFFF";
const LINE = "#D8E4F2";
const WINE = "#1D4ED8";
const MOSS = "#0E7490";
const MOSS_BG = "#E3F2F7";
const RUST = "#DC2626";
const RUST_BG = "#FDE8E8";

let idSayaci = 1;
const yeniId = (on) => `${on}${Date.now()}_${idSayaci++}`;

const ilkMenu = () => [
  {
    id: "k1",
    kategori: "Başlangıçlar",
    urunler: [
      { id: "b1", ad: "Mercimek Çorbası", fiyat: 120 },
      { id: "b2", ad: "Çoban Salata", fiyat: 140 },
    ],
  },
  {
    id: "k2",
    kategori: "Ana Yemekler",
    urunler: [
      { id: "a1", ad: "Adana Kebap", fiyat: 340 },
      { id: "a2", ad: "Tavuk Şiş", fiyat: 300 },
    ],
  },
  {
    id: "k3",
    kategori: "İçecekler",
    urunler: [
      { id: "i1", ad: "Ayran", fiyat: 60 },
      { id: "i2", ad: "Kola / Gazoz", fiyat: 90 },
      { id: "i3", ad: "Çay", fiyat: 40 },
    ],
  },
];

const ilkMasalar = (n = 8) =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i + 1}`,
    ad: `Masa ${i + 1}`,
    durum: "bos",
    urunler: [],
    acilisZamani: null,
  }));

const varsayilanDurumUret = () => ({
  masalar: ilkMasalar(),
  gecmis: [],
  menu: ilkMenu(),
  isletme: { ad: "", adres: "", kagitGenisligi: "80mm" },
  paketSiparisler: [],
  paketAyarlari: { kutuSayisi: 6 },
  yoneticiPin: "1234",
  entegrasyonlar: {
    trendyol: { apiAnahtari: "", apiSifresi: "", magazaId: "", webhookAnahtari: "" },
    getir: { apiAnahtari: "", apiSifresi: "", magazaId: "", webhookAnahtari: "" },
    yemeksepeti: { apiAnahtari: "", apiSifresi: "", magazaId: "", webhookAnahtari: "" },
  },
  tunelAyarlari: { ngrokAuthtoken: "", ngrokDomain: "" },
});

const PAKET_PLATFORMLAR = [
  { ad: "Trendyol Yemek", bg: "#F27A1A", fg: "#FFFFFF" },
  { ad: "Getir Yemek", bg: "#5D3EBC", fg: "#FFFFFF" },
  { ad: "Yemeksepeti", bg: "#FA0050", fg: "#FFFFFF" },
];
const RESTORAN_PAKETI = "Restoran Paketi"; // platform seçilmezse (telefon/gel-al vb.) varsayılan etiket

function YoneticiPinDegistir({ mevcutPin, onKaydet }) {  const [yeni, setYeni] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [mesaj, setMesaj] = useState("");

  const kaydetTikla = () => {
    if (yeni.length < 4) {
      setMesaj("PIN en az 4 haneli olmalı.");
      return;
    }
    if (yeni !== tekrar) {
      setMesaj("Girdiğin PIN'ler birbirini tutmuyor.");
      return;
    }
    onKaydet(yeni);
    setMesaj("PIN güncellendi.");
    setYeni("");
    setTekrar("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="password"
          inputMode="numeric"
          placeholder="Yeni PIN"
          value={yeni}
          onChange={(e) => { setYeni(e.target.value); setMesaj(""); }}
          style={{ borderColor: LINE }}
          className="border rounded px-3 py-2 text-sm flex-1 outline-none tracking-widest"
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="Tekrar"
          value={tekrar}
          onChange={(e) => { setTekrar(e.target.value); setMesaj(""); }}
          style={{ borderColor: LINE }}
          className="border rounded px-3 py-2 text-sm flex-1 outline-none tracking-widest"
        />
      </div>
      {mesaj && (
        <div style={{ color: mesaj === "PIN güncellendi." ? MOSS : RUST }} className="text-xs">
          {mesaj}
        </div>
      )}
      <button onClick={kaydetTikla} style={{ background: WINE }} className="text-white text-sm rounded px-4 py-2 self-start">
        PIN'i Güncelle
      </button>
    </div>
  );
}

function TunelAyarlariKarti({ deger, onKaydet }) {
  const [form, setForm] = useState(deger);
  useEffect(() => setForm(deger), [deger]);

  const yapilandirildi = !!(form.ngrokAuthtoken && form.ngrokDomain);

  return (
    <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border overflow-hidden">
      <div style={{ background: "#2E5B4A" }} className="flex items-center justify-between px-4 py-2.5">
        <span className="text-white text-sm font-semibold">Otomatik Tünel (İnternet Erişimi)</span>
        <span
          style={{ background: yapilandirildi ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)" }}
          className="text-white text-[10px] font-medium px-2 py-0.5 rounded-full"
        >
          {yapilandirildi ? "Aktif" : "Kapalı"}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="text-xs opacity-60 leading-relaxed">
          Bu bilgileri doldurup kaydedersen, Adisyo programı her açıldığında{" "}
          <b>otomatik olarak internete açılır</b> — ayrı bir tünel dosyası çalıştırmana gerek kalmaz.
          (ngrok.com'da ücretsiz hesap açıp "Your Authtoken" ve "Domains" bölümünden alabilirsin.)
        </div>
        <div>
          <label className="text-xs opacity-60 mb-1 block">ngrok Authtoken</label>
          <input
            type="password"
            value={form.ngrokAuthtoken}
            onChange={(e) => setForm((f) => ({ ...f, ngrokAuthtoken: e.target.value }))}
            placeholder="ngrok.com → Your Authtoken"
            style={{ borderColor: LINE }}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
          />
        </div>
        <div>
          <label className="text-xs opacity-60 mb-1 block">ngrok Kalıcı Adresi (Domain)</label>
          <input
            value={form.ngrokDomain}
            onChange={(e) => setForm((f) => ({ ...f, ngrokDomain: e.target.value }))}
            placeholder="orn-adres.ngrok-free.dev"
            style={{ borderColor: LINE }}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
          />
        </div>
        <button
          onClick={() => onKaydet(form)}
          style={{ background: WINE }}
          className="text-white text-sm font-medium rounded-lg py-2.5 mt-1"
        >
          Kaydet
        </button>
        <div className="text-[11px] opacity-50">
          Not: Değişikliğin etkili olması için Adisyo'yu kapat, tekrar aç.
        </div>
      </div>
    </div>
  );
}

// QR Menü: müşterinin telefonunda açılan, sadece okunur menü sayfasının (/menu)
// QR kodunu üretir. Masalara konulmak üzere yazdırılabilir ya da PNG indirilebilir.
function QrMenuKarti({ varsayilanAdres, isletmeAdi }) {
  const [adres, setAdres] = useState(varsayilanAdres);
  const [qr, setQr] = useState("");
  useEffect(() => setAdres(varsayilanAdres), [varsayilanAdres]);

  useEffect(() => {
    let iptal = false;
    if (!adres.trim()) {
      setQr("");
      return undefined;
    }
    QRCode.toDataURL(adres.trim(), { width: 720, margin: 2, errorCorrectionLevel: "M" })
      .then((u) => !iptal && setQr(u))
      .catch(() => !iptal && setQr(""));
    return () => {
      iptal = true;
    };
  }, [adres]);

  const yerelAdres = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(adres.trim());

  // window.open yerine gizli iframe: hem tarayıcıda hem Electron'da sorunsuz yazdırır.
  const yazdir = () => {
    if (!qr) return;
    const kacis = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open();
    d.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR Menü</title>
      <style>@page{margin:12mm} body{font-family:Arial,sans-serif;text-align:center;margin:0}
      h1{font-size:28px;margin:24px 0 4px} p{font-size:18px;margin:6px 0} img{width:300px;height:300px;margin:18px 0 6px}
      small{display:block;font-size:11px;color:#555;word-break:break-all}</style></head>
      <body><h1>${kacis(isletmeAdi || "Menü")}</h1><p>Menüyü görmek için kodu telefonunla okut</p>
      <img src="${qr}" alt="QR"><small>${kacis(adres.trim())}</small></body></html>`);
    d.close();
    const img = d.querySelector("img");
    const bas = () => {
      f.contentWindow.focus();
      f.contentWindow.print();
      setTimeout(() => f.remove(), 1500);
    };
    if (img.complete) bas();
    else img.onload = bas;
  };

  return (
    <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border overflow-hidden">
      <div style={{ background: WINE }} className="px-4 py-2.5">
        <span className="text-white text-sm font-semibold">QR Menü</span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="text-xs opacity-60 leading-relaxed">
          Müşteri bu kodu telefonuyla okutunca menüyü ve fiyatları görür (sipariş vermez, sadece bakar).
          Stoğu biten ürünler otomatik "Tükendi" görünür. Kodu yazdırıp masalara koyabilirsin.
        </div>
        <div>
          <label className="text-xs opacity-60 mb-1 block">Menü adresi</label>
          <input
            value={adres}
            onChange={(e) => setAdres(e.target.value)}
            placeholder="https://adresin.ngrok-free.dev/menu"
            style={{ borderColor: LINE }}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
          />
          {yerelAdres && (
            <div style={{ color: RUST }} className="text-[11px] mt-1">
              Bu adres yalnızca bu bilgisayarda açılır; müşterinin telefonu açamaz. Yukarıdaki Otomatik Tünel'i
              kur (internetten erişim) ya da aynı WiFi için bilgisayarın ağ adresini (192.168.x.x) yaz.
            </div>
          )}
        </div>
        {qr ? (
          <div className="flex flex-col items-center gap-3">
            <img src={qr} alt="QR Menü" style={{ borderColor: LINE }} className="w-48 h-48 border rounded" />
            <div className="flex gap-2 w-full">
              <button onClick={yazdir} style={{ background: WINE }} className="flex-1 text-white text-sm font-medium rounded-lg py-2.5 flex items-center justify-center gap-2">
                <Printer size={15} /> Yazdır
              </button>
              <a
                href={qr}
                download="menu-qr.png"
                style={{ borderColor: LINE }}
                className="flex-1 border text-sm font-medium rounded-lg py-2.5 flex items-center justify-center gap-2"
              >
                <Download size={15} /> PNG indir
              </a>
            </div>
          </div>
        ) : (
          <div className="text-xs opacity-50">QR kodu için bir adres yaz.</div>
        )}
        <div className="text-[11px] opacity-50 leading-relaxed">
          İpucu: Ücretsiz ngrok adreslerinde müşteri ilk açılışta bir "siteyi ziyaret et" uyarısı görebilir,
          "Visit Site" demesi yeterli. Bu uyarı olmasın istersen kendi alan adını bağlayabilirsin.
        </div>
      </div>
    </div>
  );
}

function EntegrasyonKarti({ platformAnahtari, platformAdi, renk, deger, onKaydet, genelErisimAdresi }) {
  const [form, setForm] = useState(deger);
  const [kopyalandi, setKopyalandi] = useState(false);
  useEffect(() => setForm(deger), [deger]);

  const taban = (genelErisimAdresi || window.location.origin).replace(/\/$/, "");
  const webhookUrl = `${taban}/api/webhook/${platformAnahtari}`;
  const yapilandirildi = !!(form.apiAnahtari && form.webhookAnahtari);

  const rastgeleAnahtarUret = () => {
    const anahtar = Array.from({ length: 24 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    setForm((f) => ({ ...f, webhookAnahtari: anahtar }));
  };

  const kopyala = (metin) => {
    navigator.clipboard?.writeText(metin);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1500);
  };

  return (
    <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border overflow-hidden">
      <div style={{ background: renk }} className="flex items-center justify-between px-4 py-2.5">
        <span className="text-white text-sm font-semibold">{platformAdi}</span>
        <span
          style={{ background: yapilandirildi ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)" }}
          className="text-white text-[10px] font-medium px-2 py-0.5 rounded-full"
        >
          {yapilandirildi ? "Yapılandırıldı" : "Henüz ayarlanmadı"}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div>
          <label className="text-xs opacity-60 mb-1 block">API Anahtarı (Key)</label>
          <input
            value={form.apiAnahtari}
            onChange={(e) => setForm((f) => ({ ...f, apiAnahtari: e.target.value }))}
            placeholder="Satıcı panelinden aldığın API anahtarı"
            style={{ borderColor: LINE }}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
          />
        </div>
        <div>
          <label className="text-xs opacity-60 mb-1 block">API Şifresi / Secret</label>
          <input
            type="password"
            value={form.apiSifresi}
            onChange={(e) => setForm((f) => ({ ...f, apiSifresi: e.target.value }))}
            placeholder="Satıcı panelinden aldığın API şifresi"
            style={{ borderColor: LINE }}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
          />
        </div>
        <div>
          <label className="text-xs opacity-60 mb-1 block">Mağaza / Restoran ID</label>
          <input
            value={form.magazaId}
            onChange={(e) => setForm((f) => ({ ...f, magazaId: e.target.value }))}
            placeholder="Satıcı panelindeki mağaza veya restoran numaran"
            style={{ borderColor: LINE }}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
          />
        </div>

        <div>
          <label className="text-xs opacity-60 mb-1 block">
            Webhook Doğrulama Anahtarı <span className="opacity-70">(kendin belirlersin)</span>
          </label>
          <div className="flex gap-2">
            <input
              value={form.webhookAnahtari}
              onChange={(e) => setForm((f) => ({ ...f, webhookAnahtari: e.target.value }))}
              placeholder="Örn. rastgele bir metin üret"
              style={{ borderColor: LINE }}
              className="border rounded px-3 py-2 text-sm flex-1 outline-none"
            />
            <button onClick={rastgeleAnahtarUret} title="Rastgele üret" style={{ borderColor: LINE }} className="border rounded px-2.5 opacity-70 hover:opacity-100">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="text-[11px] opacity-55 mt-1">
            Bu metni, platformun webhook'u kaydettiğin panelinde "gizli anahtar / secret / api key" alanına
            aynen gireceksin — böylece gelen isteğin gerçekten o platformdan geldiğini doğrularız.
          </div>
        </div>

        <div>
          <label className="text-xs opacity-60 mb-1 block">Webhook Adresi (platforma vereceğin adres)</label>
          <div className="flex gap-2">
            <div style={{ borderColor: LINE, background: PAPER }} className="border rounded px-3 py-2 text-xs flex-1 truncate font-mono">
              {webhookUrl}
            </div>
            <button onClick={() => kopyala(webhookUrl)} style={{ borderColor: LINE }} className="border rounded px-2.5 opacity-70 hover:opacity-100">
              <Copy size={14} />
            </button>
          </div>
          {kopyalandi && <div style={{ color: MOSS }} className="text-[11px] mt-1">Kopyalandı.</div>}
          <div className="text-[11px] opacity-55 mt-1">
            Not: Bu adres şu an sadece bu bilgisayardan/ağdan çalışır. Platformun kendi sunucularından
            sipariş gönderebilmesi için bu adresin internetten erişilebilir olması gerekir (örn. ngrok ile
            geçici test, ya da kalıcı kullanım için bir sunucuya taşıma).
          </div>
        </div>

        <button
          onClick={() => onKaydet(form)}
          style={{ background: WINE }}
          className="text-white text-sm font-medium rounded-lg py-2.5 mt-1"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}

function paraFormat(n) {
  return Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0 }) + " ₺";
}

// ---- ESC/POS ham fiş üretimi (yazıcıya doğrudan gönderilecek bayt dizisi) ----
// Neden burada Türkçe karakterleri (ç,ş,ğ,ı,ö,ü) sadeleştiriyoruz:
// yazıcının hangi kod sayfasını (Türkçe mi, batı Avrupa mı) kullandığını
// önceden bilemiyoruz; yanlış kod sayfası seçilirse Türkçe harfler yerine
// anlamsız simgeler basılır. ASCII'ye çevirmek, hangi yazıcı olursa olsun
// her zaman DOĞRU okunabilir çıktı garantiler (aksanlar kaybolur ama metin
// bozulmaz). İleride yazıcı modeline özel kod sayfası eklemek istersen bu
// fonksiyon güncellenebilir.
const TR_ASCII_HARITASI = {
  ç: "c", Ç: "C", ş: "s", Ş: "S", ğ: "g", Ğ: "G",
  ı: "i", İ: "I", ö: "o", Ö: "O", ü: "u", Ü: "U", "₺": "TL",
};
function asciiyeCevir(s) {
  return String(s ?? "").replace(/[çÇşŞğĞıİöÖüÜ₺]/g, (ch) => TR_ASCII_HARITASI[ch] || ch);
}
function metniBayta(s) {
  const bayt = [];
  for (const ch of asciiyeCevir(s)) {
    const kod = ch.charCodeAt(0);
    bayt.push(kod < 128 ? kod : 63); // 63 = '?'
  }
  return bayt;
}
// Sol taraf (ürün adı) ile sağ taraf (fiyat) arasını boşlukla doldurup
// belirtilen sütun genişliğine (58mm≈32, 80mm≈42 karakter) tam oturtur;
// sığmazsa fiyatı alt satıra sağa yaslayarak taşırır.
function satirHizala(sol, sag, genislik) {
  sol = asciiyeCevir(sol);
  sag = asciiyeCevir(sag);
  if (sol.length + sag.length + 1 > genislik) {
    const bosluk2 = Math.max(1, genislik - sag.length);
    return sol + "\n" + " ".repeat(bosluk2) + sag;
  }
  const bosluk = genislik - sol.length - sag.length;
  return sol + " ".repeat(bosluk) + sag;
}
function ortala(s, genislik) {
  s = asciiyeCevir(s);
  if (s.length >= genislik) return s;
  const sol = Math.floor((genislik - s.length) / 2);
  return " ".repeat(sol) + s;
}

function fisEscposOlustur(kayit, fisAyarlari, isletme) {
  const genislik = isletme.kagitGenisligi === "58mm" ? 32 : 42;
  const b = [];
  const ekle = (...bayt) => b.push(...bayt);
  const satir = (s = "") => ekle(...metniBayta(s), 0x0a);
  const cizgi = () => satir("-".repeat(genislik));
  const boyutAyarla = (boyut) => {
    // Metin boyutu ayarları (baslikYaziBoyutu vb, px cinsinden) yaklaşık
    // olarak ESC/POS'un desteklediği birkaç ayrık boyuta eşleniyor:
    // normal / çift yükseklik / çift yükseklik+genişlik.
    if (boyut >= 18) ekle(GS, 0x21, 0x11); // çift yükseklik + çift genişlik
    else if (boyut >= 14) ekle(GS, 0x21, 0x01); // çift yükseklik
    else ekle(GS, 0x21, 0x00); // normal
  };

  ekle(ESC, 0x40); // yazıcıyı sıfırla (ESC @)
  if (fisAyarlari.kalinYazi) ekle(ESC, 0x45, 0x01); // kalın yazı aç

  ekle(ESC, 0x61, 0x01); // ortala
  boyutAyarla(fisAyarlari.baslikYaziBoyutu);
  satir(isletme.ad || "Isletme Adi");
  boyutAyarla(fisAyarlari.baslikAltYaziBoyutu);
  if (isletme.adres) satir(isletme.adres);
  boyutAyarla(fisAyarlari.urunYaziBoyutu);
  ekle(ESC, 0x61, 0x00); // sola yasla

  cizgi();
  if (fisAyarlari.siparisNoGoster && kayit.siparisNo) satir(`Siparis No: ${kayit.siparisNo}`);
  satir(kayit.masaAdi);
  satir(new Date(kayit.kapanisZamani).toLocaleString("tr-TR"));
  if (kayit.not) {
    cizgi();
    ekle(ESC, 0x45, 0x01);
    satir(`NOT: ${kayit.not}`);
    if (!fisAyarlari.kalinYazi) ekle(ESC, 0x45, 0x00);
  }
  cizgi();
  for (const u of kayit.urunler) {
    satir(satirHizala(`${u.adet}x ${u.ad}`, paraFormat(u.fiyat * u.adet), genislik));
    if (u.not) satir(`  * ${u.not}`);
  }
  cizgi();

  ekle(ESC, 0x45, 0x01); // TOPLAM kalın
  boyutAyarla(fisAyarlari.toplamYaziBoyutu);
  satir(satirHizala("TOPLAM", paraFormat(kayit.toplam), genislik));
  boyutAyarla(fisAyarlari.urunYaziBoyutu);
  if (!fisAyarlari.kalinYazi) ekle(ESC, 0x45, 0x00);

  satir(satirHizala("Odeme", kayit.yontem, genislik));
  if (fisAyarlari.kdvGoster) {
    boyutAyarla(fisAyarlari.altYaziBoyutu);
    satir("KDV Fiyatlara Dahildir");
  }

  boyutAyarla(fisAyarlari.altYaziBoyutu);
  ekle(ESC, 0x61, 0x01);
  satir("Afiyet olsun!");
  if (fisAyarlari.maliDegeriYoktur !== false) satir("BILGI FISIDIR - MALI DEGERI YOKTUR");
  boyutAyarla(0);
  ekle(ESC, 0x45, 0x00);

  // Kağıdı bıçağa kadar ilerlet, sonra tam kes (GS V 0).
  ekle(0x0a, 0x0a, 0x0a, 0x0a);
  ekle(GS, 0x56, 0x00);

  return b;
}
function bayttanBase64(bayt) {
  let ikili = "";
  for (const n of bayt) ikili += String.fromCharCode(n);
  return btoa(ikili);
}
const ESC = 0x1b;
const GS = 0x1d;

// Mutfak fişi (KOT - Kitchen Order Ticket): fiyatsız, sade — sadece mutfağın
// ne hazırlayacağını bilmesi için. Kasadaki fiş ayarlarından (yazı boyutu
// vb.) bağımsız, sabit ve büyük punto kullanır ki mutfakta uzaktan okunsun.
function kotEscposOlustur(masaAdi, kalemler, isletme) {
  const genislik = isletme.kagitGenisligi === "58mm" ? 32 : 42;
  const b = [];
  const ekle = (...bayt) => b.push(...bayt);
  const satir = (s = "") => ekle(...metniBayta(s), 0x0a);
  const cizgi = () => satir("-".repeat(genislik));

  ekle(ESC, 0x40);
  ekle(ESC, 0x61, 0x01); // ortala
  ekle(GS, 0x21, 0x11); // çift yükseklik + çift genişlik
  satir("MUTFAK");
  ekle(GS, 0x21, 0x01); // çift yükseklik
  satir(masaAdi);
  ekle(GS, 0x21, 0x00);
  satir(new Date().toLocaleString("tr-TR"));
  ekle(ESC, 0x61, 0x00); // sola yasla
  cizgi();

  ekle(GS, 0x21, 0x11); // ürünler büyük punto — mutfakta uzaktan okunsun
  for (const k of kalemler) {
    satir(`${k.adet}x ${k.ad}`);
    if (k.not) {
      ekle(GS, 0x21, 0x01);
      satir(`  * ${k.not}`);
      ekle(GS, 0x21, 0x11);
    }
  }
  ekle(GS, 0x21, 0x00);
  cizgi();

  ekle(0x0a, 0x0a, 0x0a);
  ekle(GS, 0x56, 0x00); // kes
  return b;
}

function masaToplam(masa) {
  return masa.urunler.reduce((t, u) => t + u.fiyat * u.adet, 0);
}
function gecenSure(baslangic, simdi) {
  const dk = Math.max(0, Math.round((simdi - baslangic) / 60000));
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

// Bu cihaz sunucuya henüz eşleştirilmemişse gösterilir. Ana bilgisayarda
// Yönetici > Entegrasyonlar > "Cihaz Ekle" bölümünden üretilen 6 haneli kod girilir.
function EslestirmeEkrani() {
  const [kod, setKod] = useState("");
  const [ad, setAd] = useState("");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);

  const gonder = async (e) => {
    e.preventDefault();
    setBekle(true);
    setHata("");
    try {
      const res = await fetch(`${API_BASE}/api/eslestir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kod: kod.trim(), ad: ad.trim() }),
      });
      const veri = await res.json().catch(() => ({}));
      if (!res.ok || !veri.anahtar) {
        setHata(veri.hata || "Eşleştirilemedi, tekrar dene.");
        return;
      }
      cihazAnahtariYaz(veri.anahtar);
      window.location.reload();
    } catch (err) {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setBekle(false);
    }
  };

  return (
    <div style={{ background: "#F3F7FC", color: "#1E293B" }} className="min-h-[500px] flex items-center justify-center font-sans p-6">
      <form onSubmit={gonder} className="w-full max-w-sm bg-white rounded-xl shadow-lg border p-6 flex flex-col gap-4">
        <div>
          <div className="text-lg font-semibold flex items-center gap-2"><Lock size={18} /> Cihazı Eşleştir</div>
          <div className="text-sm opacity-60 mt-1">
            Bu cihaz henüz kasaya bağlı değil. Ana bilgisayarda <b>Yönetici → Entegrasyonlar → Cihaz Ekle</b> bölümünden
            kod üret ve buraya gir.
          </div>
        </div>
        <div>
          <div className="text-xs opacity-60 mb-1">6 haneli kod</div>
          <input
            value={kod}
            onChange={(e) => setKod(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoFocus
            className="border rounded px-3 py-2 text-lg w-full outline-none font-mono tracking-[0.4em] text-center"
            placeholder="000000"
          />
        </div>
        <div>
          <div className="text-xs opacity-60 mb-1">Cihaz adı (isteğe bağlı)</div>
          <input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
            placeholder="Örn: Garson tableti"
          />
        </div>
        {hata && <div className="text-sm text-red-600">{hata}</div>}
        <button
          type="submit"
          disabled={bekle || kod.length !== 6}
          style={{ background: "#1D4ED8" }}
          className="text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {bekle ? "Eşleştiriliyor…" : "Eşleştir"}
        </button>
      </form>
    </div>
  );
}

// Yönetici ekranı: yeni cihaz için kod üretir, eşleşmiş cihazları listeler/kaldırır.
function CihazlarKarti() {
  const [kod, setKod] = useState(null); // { kod, bitis }
  const [kalan, setKalan] = useState(0);
  const [liste, setListe] = useState([]);
  const [hata, setHata] = useState("");

  const listeyiYukle = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/cihazlar`);
      if (res.ok) setListe(await res.json());
    } catch (e) {
      /* yok say */
    }
  }, []);
  useEffect(() => {
    listeyiYukle();
  }, [listeyiYukle]);

  useEffect(() => {
    if (!kod) return undefined;
    const z = setInterval(() => {
      const k = Math.max(0, Math.round((kod.bitis - Date.now()) / 1000));
      setKalan(k);
      if (k === 0) setKod(null);
      else if (k % 5 === 0) listeyiYukle(); // eşleşme olduysa listeye düşsün
    }, 1000);
    return () => clearInterval(z);
  }, [kod, listeyiYukle]);

  const kodUret = async () => {
    setHata("");
    try {
      const res = await apiFetch(`${API_BASE}/api/eslestirme-kodu`, { method: "POST" });
      if (!res.ok) throw new Error();
      const v = await res.json();
      setKod({ kod: v.kod, bitis: Date.now() + v.saniye * 1000 });
      setKalan(v.saniye);
    } catch (e) {
      setHata("Kod üretilemedi.");
    }
  };

  const kaldir = async (c) => {
    if (!window.confirm(`"${c.ad}" cihazının erişimi kaldırılsın mı?`)) return;
    await apiFetch(`${API_BASE}/api/cihazlar/${c.id}`, { method: "DELETE" });
    listeyiYukle();
  };

  return (
    <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border overflow-hidden">
      <div style={{ background: WINE }} className="px-4 py-2.5">
        <span className="text-white text-sm font-semibold">Cihaz Ekle (Tablet / Telefon)</span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="text-xs opacity-60 leading-relaxed">
          Güvenlik için aynı WiFi'ye bağlı herkes kasaya erişemez; sadece bu bilgisayar ve eşleştirdiğin cihazlar
          erişir. Yeni tablet/telefon eklemek için kod üret, o cihazda adresi açıp kodu gir (5 dakika geçerli,
          tek kullanımlık).
        </div>
        {kod ? (
          <div className="text-center">
            <div className="font-mono text-4xl tracking-[0.3em] font-bold" style={{ color: WINE }}>{kod.kod}</div>
            <div className="text-xs opacity-50 mt-1">{Math.floor(kalan / 60)}:{String(kalan % 60).padStart(2, "0")} içinde gir</div>
          </div>
        ) : (
          <button onClick={kodUret} style={{ background: WINE }} className="text-white text-sm font-medium rounded-lg py-2.5">
            Eşleştirme Kodu Üret
          </button>
        )}
        {hata && <div style={{ color: RUST }} className="text-xs">{hata}</div>}
        <div>
          <div className="text-xs opacity-60 mb-1">Eşleşmiş cihazlar</div>
          {liste.length === 0 && <div className="text-xs opacity-40">Henüz eşleşmiş cihaz yok.</div>}
          {liste.map((c) => (
            <div key={c.id} style={{ borderColor: LINE }} className="flex items-center justify-between border-t py-2 text-sm">
              <div>
                {c.ad}
                <span className="text-[11px] opacity-40 ml-2">{new Date(c.tarih).toLocaleDateString("tr-TR")}</span>
              </div>
              <button onClick={() => kaldir(c)} style={{ color: RUST }} className="text-xs">Kaldır</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Otomatik yedekleme durumu ve ayarı (asıl iş sunucuda yapılır: backend/yedek.js).
function YedekKarti() {
  const [bilgi, setBilgi] = useState(null);
  const [ekKlasor, setEkKlasor] = useState("");
  const [mesaj, setMesaj] = useState({ tip: "", metin: "" });
  const [bekle, setBekle] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/yedek`);
      if (!res.ok) return;
      const v = await res.json();
      setBilgi(v);
      setEkKlasor((onceki) => onceki || v.ekKlasor || "");
    } catch (e) {
      /* yok say */
    }
  }, []);
  useEffect(() => {
    yukle();
  }, [yukle]);

  const simdiYedekle = async () => {
    setBekle(true);
    setMesaj({ tip: "", metin: "" });
    try {
      const res = await apiFetch(`${API_BASE}/api/yedek`, { method: "POST" });
      const v = await res.json().catch(() => ({}));
      if (v.durum) setBilgi(v.durum);
      setMesaj(res.ok ? { tip: "ok", metin: "Yedek alındı." } : { tip: "hata", metin: v.hata || "Yedek alınamadı." });
    } catch (e) {
      setMesaj({ tip: "hata", metin: "Sunucuya ulaşılamadı." });
    } finally {
      setBekle(false);
    }
  };

  const ekKlasorKaydet = async () => {
    setBekle(true);
    setMesaj({ tip: "", metin: "" });
    try {
      const res = await apiFetch(`${API_BASE}/api/yedek/ayar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ekKlasor }),
      });
      const v = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMesaj({ tip: "hata", metin: v.hata || "Klasör kaydedilemedi." });
      } else {
        setBilgi(v);
        setMesaj({ tip: "ok", metin: v.ekKlasor ? "Ek klasör kaydedildi. Sonraki yedekten itibaren oraya da yazılır." : "Ek klasör kapatıldı." });
      }
    } catch (e) {
      setMesaj({ tip: "hata", metin: "Sunucuya ulaşılamadı." });
    } finally {
      setBekle(false);
    }
  };

  const zaman = (ms) => (ms ? new Date(ms).toLocaleString("tr-TR") : "henüz yok");

  return (
    <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4 flex flex-col gap-3">
      <div className="text-sm font-medium">Otomatik Yedekleme</div>
      <div className="text-xs opacity-60 -mt-2 leading-relaxed">
        Veriler her saat (değiştiyse) otomatik yedeklenir: son 48 saat + son 30 gün saklanır. Bilgisayar bozulursa
        bile verini kaybetmemek için aşağıya <b>ek bir klasör</b> (OneDrive/Google Drive klasörü ya da USB bellek)
        yazmanı öneririm; yedekler oraya da kopyalanır.
      </div>
      {bilgi && (
        <div style={{ background: PAPER, borderColor: LINE }} className="rounded border p-3 text-xs leading-relaxed">
          <div>Son yedek: <b>{zaman(bilgi.sonBasari)}</b></div>
          <div>Klasördeki yedek sayısı: <b>{bilgi.adet}</b></div>
          <div className="break-all opacity-60">Klasör: {bilgi.klasor}</div>
          {bilgi.sonHata && <div style={{ color: RUST }} className="mt-1">Uyarı: {bilgi.sonHata}</div>}
        </div>
      )}
      <button
        onClick={simdiYedekle}
        disabled={bekle}
        style={{ background: WINE }}
        className="text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60"
      >
        Şimdi Yedekle
      </button>
      <div>
        <label className="text-xs opacity-60 mb-1 block">Ek yedek klasörü (isteğe bağlı, tam yol)</label>
        <div className="flex gap-2">
          <input
            value={ekKlasor}
            onChange={(e) => setEkKlasor(e.target.value)}
            placeholder="Örn: D:\Adisyo-Yedek  ya da  C:\Users\Ad\OneDrive\Adisyo"
            style={{ borderColor: LINE }}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
          />
          <button onClick={ekKlasorKaydet} disabled={bekle} style={{ borderColor: LINE }} className="border rounded px-4 text-sm disabled:opacity-60">
            Kaydet
          </button>
        </div>
      </div>
      {mesaj.metin && (
        <div style={{ color: mesaj.tip === "hata" ? RUST : MOSS }} className="text-xs">{mesaj.metin}</div>
      )}
      <div className="text-[11px] opacity-50 leading-relaxed">
        Geri yüklemek için: sol menü → <b>Yedekten Geri Yükle</b> → yukarıdaki klasörden bir yedek dosyası seç
        (<code>gunluk-…</code> o günün son hali, <code>saatlik-…</code> o saatin hali).
      </div>
    </div>
  );
}

function LisansEkrani({ onDogrula }) {
  const [isletmeAdi, setIsletmeAdi] = useState("");
  const [anahtar, setAnahtar] = useState("");
  const [hata, setHata] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const gonder = async (e) => {
    e.preventDefault();
    if (!isletmeAdi.trim() || !anahtar.trim()) {
      setHata("İşletme adı ve lisans anahtarı boş bırakılamaz.");
      return;
    }
    setGonderiliyor(true);
    setHata("");
    try {
      const basarili = await onDogrula(isletmeAdi.trim(), anahtar.trim());
      if (!basarili) setHata("İşletme adı veya lisans anahtarı hatalı. Lütfen tekrar kontrol edin.");
    } catch {
      setHata("Doğrulama sırasında bir hata oluştu, tekrar deneyin.");
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <div
      style={{ background: "#F3F7FC", color: "#1E293B" }}
      className="min-h-[500px] flex items-center justify-center font-sans p-6"
    >
      <form onSubmit={gonder} className="w-full max-w-sm bg-white rounded-xl shadow-lg border p-6 flex flex-col gap-4">
        <div>
          <div className="text-lg font-semibold">Lisans Etkinleştirme</div>
          <div className="text-sm opacity-60 mt-1">
            Bu programı kullanmaya başlamak için işletme adınızı ve size verilen lisans anahtarını girin.
          </div>
        </div>
        <div>
          <div className="text-xs opacity-60 mb-1">İşletme Adı</div>
          <input
            value={isletmeAdi}
            onChange={(e) => setIsletmeAdi(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full outline-none"
            placeholder="Örn: Mersin Tantuni Baki Usta"
            autoFocus
          />
        </div>
        <div>
          <div className="text-xs opacity-60 mb-1">Lisans Anahtarı</div>
          <input
            value={anahtar}
            onChange={(e) => setAnahtar(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full outline-none font-mono tracking-wide"
            placeholder="Size verilen lisans anahtarını yapıştırın"
          />
        </div>
        {hata && <div className="text-sm text-red-600">{hata}</div>}
        <button
          type="submit"
          disabled={gonderiliyor}
          style={{ background: "#1D4ED8" }}
          className="text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {gonderiliyor ? "Kontrol ediliyor…" : "Etkinleştir"}
        </button>
      </form>
    </div>
  );
}

export default function AdisyoUygulamasi() {
  const [durum, setDurum] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hataMesaji, setHataMesaji] = useState("");
  const [eslestirmeGerekli, setEslestirmeGerekli] = useState(false);
  const [gorunum, setGorunum] = useState("masalar"); // masalar | ayarlar | rapor | paket
  const [ayarlarSekme, setAyarlarSekme] = useState("masalar"); // masalar | menu | yazici

  const [seciliMasaId, setSeciliMasaId] = useState(null);
  const [sepet, setSepet] = useState({});
  const [sepetNotlar, setSepetNotlar] = useState({}); // { [urunId]: "soğansız" gibi ürün notu }
  const [aktifKategoriId, setAktifKategoriId] = useState(null);
  const [drawerSekme, setDrawerSekme] = useState("ekle"); // ekle | ode
  const [odemeSecim, setOdemeSecim] = useState({}); // { [urunId]: odenecekAdet }
  const [odemeEkrani, setOdemeEkrani] = useState(false);
  const [odenenFis, setOdenenFis] = useState(null); // ödeme sonrası "fişi yazdır" ekranı
  const [simdi, setSimdi] = useState(Date.now());
  const [sifirlaOnay, setSifirlaOnay] = useState(false);
  const [iptalOnayMasaId, setIptalOnayMasaId] = useState(null);
  const [baglantiDurumu, setBaglantiDurumu] = useState("baglaniyor"); // baglaniyor | bagli | kopuk

  const [masaSayisiGirdi, setMasaSayisiGirdi] = useState("");
  const [yeniKategoriAdi, setYeniKategoriAdi] = useState("");
  const [yeniUrun, setYeniUrun] = useState({}); // { [kategoriId]: {ad, fiyat} }

  const [raporFiltre, setRaporFiltre] = useState("bugun"); // bugun | hafta | gun | tum
  const [secilenGunZamani, setSecilenGunZamani] = useState(Date.now()); // "gun" filtresi için seçilen tarih
  const [urunRaporuAcik, setUrunRaporuAcik] = useState(true);
  const [genisletilenFisId, setGenisletilenFisId] = useState(null);
  const [yazdirilacakFis, setYazdirilacakFis] = useState(null);

  const [menuAcik, setMenuAcik] = useState(false); // sol taraftaki 3 çizgi (☰) menü
  const [masaIslemMenuAcik, setMasaIslemMenuAcik] = useState(false); // sipariş çekmecesindeki "Taşı/Birleştir" menüsü
  const [veresiyeSecimAcik, setVeresiyeSecimAcik] = useState(false); // ödemede "Veresiye" seçilince açılan müşteri seçici
  const [yeniMusteriAdi, setYeniMusteriAdi] = useState("");
  const [yeniMusteriTel, setYeniMusteriTel] = useState("");
  const [onizlemeSecimi, setOnizlemeSecimi] = useState(null); // Ayarlar > Fiş Önizleme'de seçilen geçmiş sipariş
  const [yaziciListesi, setYaziciListesi] = useState([]); // Electron'dan gelen sistem yazıcıları

  // ---- Roller: Garson (varsayılan, sadece operasyon) / Yönetici (ayarlar+ciro) ----
  const [rol, setRol] = useState("garson");
  const [pinModalAcik, setPinModalAcik] = useState(false);
  const [pinDeger, setPinDeger] = useState("");
  const [pinHata, setPinHata] = useState(false);
  const [ilkKurulumAdi, setIlkKurulumAdi] = useState("");

  // ---- Paket kutucukları ----
  const [seciliKutuNo, setSeciliKutuNo] = useState(null);
  const [seciliPaketId, setSeciliPaketId] = useState(null); // dolu kutuya tıklanınca hangi paket
  const [paketSepet, setPaketSepet] = useState({});
  const [paketSepetNotlar, setPaketSepetNotlar] = useState({}); // { [urunId]: "soğansız" gibi ürün notu }
  const [paketAktifKategoriId, setPaketAktifKategoriId] = useState(null);
  const [paketPlatformSecim, setPaketPlatformSecim] = useState(null);
  const [paketSiparisNotu, setPaketSiparisNotu] = useState(""); // adres/telefon/teslimat notu
  const [paketKutuSayisiGirdi, setPaketKutuSayisiGirdi] = useState("");

  const duraklatRef = useRef(false);
  duraklatRef.current =
    seciliMasaId !== null ||
    gorunum === "ayarlar" ||
    seciliKutuNo !== null ||
    pinModalAcik ||
    !durum?.isletme?.ad;

  const kaydetZamanlayiciRef = useRef(null);
  const kaydetDenemeRef = useRef(0);
  const geriYukleInputRef = useRef(null);

  const yukle = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/durum`);
      if (res.status === 401) {
        // Bu cihaz henüz eşleştirilmemiş: varsayılan durumla ekranı açıp sunucudaki
        // gerçek veriyi ezme riskine girmeyelim, eşleştirme ekranını göster.
        setEslestirmeGerekli(true);
        return;
      }
      if (!res.ok) throw new Error("durum-alinamadi");
      const data = await res.json();
      setDurum(data && Object.keys(data).length ? data : varsayilanDurumUret());
      setHataMesaji("");
    } catch (e) {
      setDurum((mevcut) => mevcut || varsayilanDurumUret());
      setHataMesaji("Sunucuya bağlanılamadı. Backend adresini ve bağlantını kontrol et.");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Güvenlik: garson modundayken (PIN doğrulanmadan) ayarlar/rapor/entegrasyon
  // ekranlarına hiçbir şekilde geçilemesin (örn. tarayıcı geri/ileri tuşu vb.).
  useEffect(() => {
    if (rol === "garson" && (gorunum === "ayarlar" || gorunum === "rapor" || gorunum === "entegrasyon")) {
      setGorunum("masalar");
    }
  }, [rol, gorunum]);

  // Sadece "kaç dakikadır açık" göstergesini tazelemek için hafif bir zamanlayıcı
  useEffect(() => {
    const z = setInterval(() => setSimdi(Date.now()), 15000);
    return () => clearInterval(z);
  }, []);

  useEffect(() => {
    return () => {
      if (kaydetZamanlayiciRef.current) clearTimeout(kaydetZamanlayiciRef.current);
    };
  }, []);

  // Anlık senkronizasyon: 5 saniyede bir sorgulamak yerine sunucudan WebSocket ile
  // anlık güncelleme alıyoruz. Dış platformdan (Trendyol/Getir vb.) bir sipariş
  // geldiğinde backend "siparis_geldi" mesajı yollar ve fiş otomatik yazdırılır.
  useEffect(() => {
    let ws;
    let kapandiMi = false;
    let yenidenBaglanTimer;

    const baglan = () => {
      const k = cihazAnahtariOku();
      ws = new WebSocket(`${WS_BASE}/ws${k ? `?k=${encodeURIComponent(k)}` : ""}`);
      ws.onopen = () => setBaglantiDurumu("bagli");
      ws.onclose = () => {
        setBaglantiDurumu("kopuk");
        if (!kapandiMi) yenidenBaglanTimer = setTimeout(baglan, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "durum" && !duraklatRef.current) {
            setDurum(msg.payload);
          } else if (msg.type === "siparis_geldi") {
            fisYazdir({
              id: msg.payload.id,
              masaAdi: `${msg.payload.platform} Siparişi`,
              urunler: msg.payload.urunler,
              toplam: msg.payload.toplam,
              yontem: msg.payload.platform,
              kapanisZamani: msg.payload.olusturmaZamani,
            });
          }
        } catch (err) {
          /* yok say */
        }
      };
    };
    baglan();

    return () => {
      kapandiMi = true;
      clearTimeout(yenidenBaglanTimer);
      if (ws) ws.close();
    };
  }, []);

  // Electron ortamındaysak (window.adisyo preload'dan geldiyse), sistemdeki
  // yazıcıları çek — Ayarlar'daki "Seçili Yazıcı" listesini doldurmak için.
  useEffect(() => {
    if (window.adisyo && typeof window.adisyo.yazicilariListele === "function") {
      window.adisyo
        .yazicilariListele()
        .then((liste) => setYaziciListesi(Array.isArray(liste) ? liste : []))
        .catch(() => setYaziciListesi([]));
    }
  }, []);

  // Yazdırılacak fiş belirlenince: Electron'dayız ve bir yazıcı seçilmişse
  // doğrudan o yazıcıya ham (ESC/POS) veri gönder (kesme dahil); değilse
  // eski yönteme (tarayıcı yazdırma penceresi) düş.
  useEffect(() => {
    if (!yazdirilacakFis) return;
    const t = setTimeout(async () => {
      const hamYazdirmaVarMi =
        window.adisyo && typeof window.adisyo.hamYazdir === "function" && fisAyarlari.seciliYazici;
      if (hamYazdirmaVarMi) {
        try {
          const bayt = fisEscposOlustur(yazdirilacakFis, fisAyarlari, isletme);
          const sonuc = await window.adisyo.hamYazdir(fisAyarlari.seciliYazici, bayttanBase64(bayt));
          if (!sonuc || !sonuc.basarili) {
            window.alert(
              "Fis yaziciya gonderilemedi: " +
                (sonuc?.hata || "bilinmeyen hata") +
                "\nStandart yazdirma penceresi aciliyor."
            );
            window.print();
          }
        } catch {
          window.print();
        }
      } else {
        window.print();
      }
    }, 150);
    return () => clearTimeout(t);
  }, [yazdirilacakFis]);

  useEffect(() => {
    const temizle = () => setYazdirilacakFis(null);
    window.addEventListener("afterprint", temizle);
    return () => window.removeEventListener("afterprint", temizle);
  }, []);

  const kalicKaydet = useCallback(async (yeniDurum) => {
    try {
      const res = await apiFetch(`${API_BASE}/api/durum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(yeniDurum),
      });
      if (res.status === 401) {
        setEslestirmeGerekli(true);
        return;
      }
      if (res.ok) {
        setHataMesaji("");
        kaydetDenemeRef.current = 0;
        return;
      }
      throw new Error("kayit-basarisiz");
    } catch (e) {
      // Birkaç otomatik deneme (artan aralıklarla), sonra kullanıcıyı uyar
      // ama arka planda denemeye devam et - bağlantı geri gelince kendiliğinden düzelsin.
      if (kaydetDenemeRef.current < 3) {
        kaydetDenemeRef.current += 1;
        setTimeout(() => kalicKaydet(yeniDurum), 700 * kaydetDenemeRef.current);
      } else {
        setHataMesaji("Kayıt başarısız oldu, tekrar dene.");
        setTimeout(() => kalicKaydet(yeniDurum), 5000); // bağlantı düzelince otomatik kurtulsun
      }
    }
  }, []);

  // Ekranı anında güncelle, kalıcı kaydı ise 500ms geciktirip tek seferde gönder
  // (özellikle yazı yazarken her tuş vuruşunda ayrı istek atıp çakışmayı önler)
  const kaydet = useCallback(
    (yeniDurum) => {
      setDurum(yeniDurum);
      if (kaydetZamanlayiciRef.current) clearTimeout(kaydetZamanlayiciRef.current);
      kaydetZamanlayiciRef.current = setTimeout(() => {
        kaydetDenemeRef.current = 0;
        kalicKaydet(yeniDurum);
      }, 500);
    },
    [kalicKaydet]
  );

  // ---- Ayarlar: Yedekle / Geri Yükle ----
  // Tüm çalışma durumunu (masalar, menü, geçmiş, ayarlar) tek bir JSON dosyası
  // olarak indirir. AppData klasörüne girmeye gerek kalmadan, uygulamanın
  // kendi ekranından yedek alınabilir.
  const verileriYedekle = () => {
    const tarih = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dosyaAdi = `adisyo-yedek-${tarih.getFullYear()}-${pad(tarih.getMonth() + 1)}-${pad(
      tarih.getDate()
    )}-${pad(tarih.getHours())}${pad(tarih.getMinutes())}.json`;
    const blob = new Blob([JSON.stringify(durum, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = dosyaAdi;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Daha önce indirilmiş bir yedek dosyasını seçip yükler. Basit bir doğrulama
  // yapılır (en azından "masalar" ve "menu" alanları olmalı); onay alındıktan
  // sonra mevcut durumun tamamen üzerine yazılır.
  const geriYuklemeDosyaSecildi = (e) => {
    const dosya = e.target.files && e.target.files[0];
    e.target.value = ""; // aynı dosya tekrar seçilebilsin diye sıfırla
    if (!dosya) return;
    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      let yeniDurum;
      try {
        yeniDurum = JSON.parse(okuyucu.result);
      } catch {
        window.alert("Bu dosya geçerli bir Adisyo yedeği değil (JSON okunamadı).");
        return;
      }
      if (!yeniDurum || !Array.isArray(yeniDurum.masalar) || !Array.isArray(yeniDurum.menu)) {
        window.alert("Bu dosya geçerli bir Adisyo yedeği gibi görünmüyor.");
        return;
      }
      const onay = window.confirm(
        "Geri yükleme, şu anki tüm verilerin (masalar, menü, geçmiş, ayarlar) üzerine yazacak. " +
          "Devam etmeden önce istersen önce mevcut durumu yedekle. Devam edilsin mi?"
      );
      if (!onay) return;
      kaydet(yeniDurum);
      window.alert("Yedek geri yüklendi.");
    };
    okuyucu.readAsText(dosya);
  };

  if (eslestirmeGerekli) return <EslestirmeEkrani />;

  if (yukleniyor || !durum) {
    return (
      <div style={{ background: PAPER, color: INK }} className="min-h-[500px] flex items-center justify-center font-sans">
        <div className="text-sm opacity-70">Yükleniyor…</div>
      </div>
    );
  }

  if (!durum.lisans || !durum.lisans.dogrulandi) {
    return (
      <LisansEkrani
        onDogrula={async (isletmeAdiGirilen, anahtarGirilen) => {
          const yanit = await fetch("/api/lisans-dogrula", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isletmeAdi: isletmeAdiGirilen, anahtar: anahtarGirilen }),
          }).then((r) => r.json());
          if (yanit.gecerli) {
            kaydet({
              ...durum,
              lisans: { dogrulandi: true, isletmeAdi: isletmeAdiGirilen, anahtar: anahtarGirilen },
              isletme: durum.isletme?.ad ? durum.isletme : { ...(durum.isletme || {}), ad: isletmeAdiGirilen },
            });
            return true;
          }
          return false;
        }}
      />
    );
  }

  const menu = durum.menu && durum.menu.length ? durum.menu : ilkMenu();
  const seciliMasa = durum.masalar.find((m) => m.id === seciliMasaId) || null;
  const tumUrunler = menu.flatMap((k) => k.urunler);

  // ---- Sipariş çekmecesi işlemleri ----
  const masaAc = (masa, secenekler = {}) => {
    setSepet({});
    setAktifKategoriId(menu[0]?.id || null);
    setDrawerSekme(secenekler.sekme || "ekle");
    if (secenekler.tumunuSec) {
      const yeni = {};
      masa.urunler.forEach((u) => (yeni[u.id] = u.adet));
      setOdemeSecim(yeni);
    } else {
      setOdemeSecim({});
    }
    setOdemeEkrani(!!secenekler.odemeEkraniAc);
    setOdenenFis(null);
    setSeciliMasaId(masa.id);
  };
  const drawerKapat = () => {
    setSeciliMasaId(null);
    setSepet({});
    setSepetNotlar({});
    setOdemeSecim({});
    setDrawerSekme("ekle");
    setOdemeEkrani(false);
    setOdenenFis(null);
    setMasaIslemMenuAcik(false);
  };

  // Masayı boş bir masaya taşı: mevcut siparişin tamamı hedef masaya geçer,
  // kaynak masa boşalır. Genelde "müşteri yer değiştirdi" durumunda kullanılır.
  const masayiTasi = (hedefMasaId) => {
    if (!seciliMasa) return;
    const hedef = durum.masalar.find((m) => m.id === hedefMasaId);
    if (!hedef || hedef.durum !== "bos") return;
    const yeniMasalar = durum.masalar.map((m) => {
      if (m.id === seciliMasa.id) return { ...m, urunler: [], durum: "bos", acilisZamani: null };
      if (m.id === hedefMasaId)
        return { ...m, urunler: seciliMasa.urunler, durum: "dolu", acilisZamani: seciliMasa.acilisZamani || Date.now() };
      return m;
    });
    kaydet({ ...durum, masalar: yeniMasalar });
    setMasaIslemMenuAcik(false);
    setSeciliMasaId(hedefMasaId);
  };

  // Masaları birleştir: seçili masadaki tüm kalemler, dolu olan başka bir
  // masanın siparişine eklenir (aynı üründen varsa adetleri toplanır),
  // seçili masa boşalır. Genelde "iki masa birleşti" durumunda kullanılır.
  const masalariBirlestir = (digerMasaId) => {
    if (!seciliMasa) return;
    const diger = durum.masalar.find((m) => m.id === digerMasaId);
    if (!diger || diger.id === seciliMasa.id) return;
    const birlesmisUrunler = [...diger.urunler];
    seciliMasa.urunler.forEach((u) => {
      const idx = birlesmisUrunler.findIndex((x) => x.id === u.id && x.not === u.not);
      if (idx >= 0) birlesmisUrunler[idx] = { ...birlesmisUrunler[idx], adet: birlesmisUrunler[idx].adet + u.adet };
      else birlesmisUrunler.push({ ...u });
    });
    const yeniMasalar = durum.masalar.map((m) => {
      if (m.id === seciliMasa.id) return { ...m, urunler: [], durum: "bos", acilisZamani: null };
      if (m.id === digerMasaId)
        return { ...m, urunler: birlesmisUrunler, durum: "dolu", acilisZamani: diger.acilisZamani || Date.now() };
      return m;
    });
    kaydet({ ...durum, masalar: yeniMasalar });
    setMasaIslemMenuAcik(false);
    setSeciliMasaId(digerMasaId);
  };

  const sepeteEkle = (urun) => setSepet((s) => ({ ...s, [urun.id]: (s[urun.id] || 0) + 1 }));
  const sepettenCikar = (urunId) =>
    setSepet((s) => {
      const yeni = { ...s };
      if (!yeni[urunId]) return s;
      yeni[urunId] -= 1;
      if (yeni[urunId] <= 0) delete yeni[urunId];
      return yeni;
    });
  const sepetNotYaz = (urunId, metin) => setSepetNotlar((s) => ({ ...s, [urunId]: metin }));

  const sepetListesi = Object.entries(sepet)
    .map(([id, adet]) => {
      const urun = tumUrunler.find((u) => u.id === id);
      return urun ? { ...urun, adet, not: sepetNotlar[id] || "" } : null;
    })
    .filter(Boolean);
  const sepetToplam = sepetListesi.reduce((t, u) => t + u.fiyat * u.adet, 0);

  // Sipariş gönderme: yeni eklenenleri masanın mevcut açık siparişine ekler (üzerine yazmaz)
  const siparisiGonder = () => {
    if (!seciliMasa || sepetListesi.length === 0) return;

    // Stok kontrolü: stokAdedi tanımlı (null/undefined değil) ürünlerde
    // istenen miktar kalan stoktan fazlaysa siparişi durdur, hangi üründe
    // yetersiz olduğunu söyle. Stok takibi olmayan ürünlerde (stokAdedi
    // boş/null) hiçbir kısıtlama yok.
    for (const yeni of sepetListesi) {
      const menuUrunu = tumUrunler.find((mu) => mu.id === yeni.id);
      if (menuUrunu && menuUrunu.stokAdedi != null && menuUrunu.stokAdedi < yeni.adet) {
        window.alert(
          `"${menuUrunu.ad}" için yeterli stok yok (kalan: ${menuUrunu.stokAdedi}, istenen: ${yeni.adet}).`
        );
        return;
      }
    }

    const guncelUrunler = [...seciliMasa.urunler];
    sepetListesi.forEach((yeni) => {
      const idx = guncelUrunler.findIndex((u) => u.id === yeni.id);
      if (idx >= 0)
        guncelUrunler[idx] = {
          ...guncelUrunler[idx],
          adet: guncelUrunler[idx].adet + yeni.adet,
          not: yeni.not || guncelUrunler[idx].not || "",
        };
      else guncelUrunler.push({ ...yeni });
    });
    const yeniMasalar = durum.masalar.map((m) =>
      m.id === seciliMasa.id
        ? { ...m, durum: "dolu", urunler: guncelUrunler, acilisZamani: m.acilisZamani || Date.now() }
        : m
    );
    // Stoktan düş (sadece stokAdedi tanımlı ürünlerde)
    const yeniMenu = menu.map((k) => ({
      ...k,
      urunler: k.urunler.map((mu) => {
        const gonderilen = sepetListesi.find((s) => s.id === mu.id);
        if (gonderilen && mu.stokAdedi != null) {
          return { ...mu, stokAdedi: Math.max(0, mu.stokAdedi - gonderilen.adet) };
        }
        return mu;
      }),
    }));
    kaydet({ ...durum, masalar: yeniMasalar, menu: yeniMenu });
    setSepet({});
    setSepetNotlar({});

    // Mutfak yazıcısı seçiliyse, sadece YENİ eklenen kalemleri (fiyatsız,
    // sade) mutfağa bas — kasadaki fiş ayarlarından bağımsız, ayrı bir yazıcı.
    if (window.adisyo && fisAyarlari.mutfakYazicisi) {
      const kotBayt = kotEscposOlustur(seciliMasa.ad, sepetListesi, isletme);
      window.adisyo.hamYazdir(fisAyarlari.mutfakYazicisi, bayttanBase64(kotBayt)).catch(() => {});
    }
  };

  // ---- Kısmi / bölünmüş ödeme: masanın açık siparişinden istenen kalemler seçilip ödenir ----
  const acikSiparis = seciliMasa ? seciliMasa.urunler : [];
  const odemeAdetDegistir = (itemId, delta) => {
    const satir = acikSiparis.find((u) => u.id === itemId);
    if (!satir) return;
    setOdemeSecim((s) => {
      const mevcut = s[itemId] || 0;
      const yeni = Math.max(0, Math.min(satir.adet, mevcut + delta));
      return { ...s, [itemId]: yeni };
    });
  };
  const tumunuSec = () => {
    const yeni = {};
    acikSiparis.forEach((u) => (yeni[u.id] = u.adet));
    setOdemeSecim(yeni);
  };
  const secimiTemizle = () => setOdemeSecim({});
  const seciliToplam = acikSiparis.reduce((t, u) => t + u.fiyat * Math.min(odemeSecim[u.id] || 0, u.adet), 0);

  // ---- Müşteri / Cari (borç-alacak) yönetimi ----
  const musteriler = durum.musteriler || [];
  const musteriEkle = (ad, telefon) => {
    if (!ad.trim()) return null;
    const yeni = { id: yeniId("mu"), ad: ad.trim(), telefon: (telefon || "").trim(), bakiye: 0 };
    kaydet({ ...durum, musteriler: [...musteriler, yeni] });
    return yeni.id;
  };
  const musteriSil = (musteriId) => {
    kaydet({ ...durum, musteriler: musteriler.filter((m) => m.id !== musteriId) });
  };
  // Müşteriden nakit/kart tahsilat alındığında borcunu azaltır (tamamen kapatmaz,
  // kısmi ödeme de yapılabilir).
  const musteriTahsilat = (musteriId, tutar) => {
    if (!tutar || tutar <= 0) return;
    kaydet({
      ...durum,
      musteriler: musteriler.map((m) => (m.id === musteriId ? { ...m, bakiye: Math.max(0, m.bakiye - tutar) } : m)),
    });
  };

  const hesabiKapat = (yontem, musteriId) => {
    if (!seciliMasa || seciliToplam <= 0) return;
    const odenenSatirlar = acikSiparis
      .map((u) => ({ ...u, secilen: Math.min(odemeSecim[u.id] || 0, u.adet) }))
      .filter((u) => u.secilen > 0)
      .map((u) => ({ id: u.id, ad: u.ad, fiyat: u.fiyat, adet: u.secilen }));
    const yeniSiparisNo = (durum.siparisSayaci || 100) + 1;
    const musteri = yontem === "Veresiye" ? musteriler.find((m) => m.id === musteriId) : null;
    const kayit = {
      id: yeniId("s"),
      siparisNo: yeniSiparisNo,
      masaAdi: seciliMasa.ad,
      urunler: odenenSatirlar,
      toplam: seciliToplam,
      yontem,
      musteriId: musteri?.id || null,
      musteriAdi: musteri?.ad || null,
      kapanisZamani: Date.now(),
    };
    const kalanUrunler = acikSiparis
      .map((u) => ({ ...u, adet: u.adet - (odemeSecim[u.id] || 0) }))
      .filter((u) => u.adet > 0);
    const yeniMasalar = durum.masalar.map((m) =>
      m.id === seciliMasa.id
        ? { ...m, urunler: kalanUrunler, durum: kalanUrunler.length ? "dolu" : "bos", acilisZamani: kalanUrunler.length ? m.acilisZamani : null }
        : m
    );
    const yeniMusteriler = musteri
      ? musteriler.map((m) => (m.id === musteri.id ? { ...m, bakiye: m.bakiye + seciliToplam } : m))
      : musteriler;
    kaydet({
      ...durum,
      masalar: yeniMasalar,
      gecmis: [kayit, ...durum.gecmis].slice(0, 100),
      siparisSayaci: yeniSiparisNo,
      musteriler: yeniMusteriler,
    });
    setOdemeSecim({});
    setOdenenFis(kayit);
  };

  // ---- Masa kartı üzerinden hızlı işlemler ----
  const hizliOde = (masa, e) => {
    e.stopPropagation();
    if (masa.urunler.length === 0) return;
    masaAc(masa, { sekme: "ode", tumunuSec: true, odemeEkraniAc: true });
  };
  const hizliYazdir = (masa, e) => {
    e.stopPropagation();
    fisYazdir({
      id: `proforma_${masa.id}`,
      masaAdi: masa.ad,
      urunler: masa.urunler,
      toplam: masaToplam(masa),
      yontem: "Ön Adisyo (Ödenmedi)",
      kapanisZamani: Date.now(),
    });
  };
  const hizliIptalIste = (masa, e) => {
    e.stopPropagation();
    setIptalOnayMasaId(masa.id);
  };
  const iptalOnayla = () => {
    if (!iptalOnayMasaId) return;
    const yeniMasalar = durum.masalar.map((m) =>
      m.id === iptalOnayMasaId ? { ...m, urunler: [], durum: "bos", acilisZamani: null } : m
    );
    kaydet({ ...durum, masalar: yeniMasalar });
    if (seciliMasaId === iptalOnayMasaId) drawerKapat();
    setIptalOnayMasaId(null);
  };

  const gunlukCiro = durum.gecmis
    .filter((k) => new Date(k.kapanisZamani).toDateString() === new Date().toDateString())
    .reduce((t, k) => t + k.toplam, 0);

  const verileriSifirla = () => {
    kaydet(varsayilanDurumUret());
    setSifirlaOnay(false);
  };

  // ---- Ayarlar: Masa yönetimi ----
  const doluMasaVarMi = durum.masalar.some((m) => m.durum === "dolu");

  const masaSayisiniAyarla = () => {
    const n = parseInt(masaSayisiGirdi, 10);
    if (!n || n < 1 || n > 60 || doluMasaVarMi) return;
    const mevcut = durum.masalar;
    let yeniMasalar;
    if (n <= mevcut.length) {
      yeniMasalar = mevcut.slice(0, n);
    } else {
      const ekler = Array.from({ length: n - mevcut.length }, (_, i) => ({
        id: yeniId("m"),
        ad: `Masa ${mevcut.length + i + 1}`,
        durum: "bos",
        urunler: [],
        acilisZamani: null,
      }));
      yeniMasalar = [...mevcut, ...ekler];
    }
    kaydet({ ...durum, masalar: yeniMasalar });
    setMasaSayisiGirdi("");
  };

  const masaAdiGuncelle = (masaId, yeniAd) => {
    kaydet({ ...durum, masalar: durum.masalar.map((m) => (m.id === masaId ? { ...m, ad: yeniAd } : m)) });
  };

  const masaSil = (masaId) => {
    const masa = durum.masalar.find((m) => m.id === masaId);
    if (masa && masa.durum === "dolu") return;
    kaydet({ ...durum, masalar: durum.masalar.filter((m) => m.id !== masaId) });
  };

  const masaTekEkle = () => {
    kaydet({
      ...durum,
      masalar: [
        ...durum.masalar,
        { id: yeniId("m"), ad: `Masa ${durum.masalar.length + 1}`, durum: "bos", urunler: [], acilisZamani: null },
      ],
    });
  };

  // ---- Ayarlar: Menü yönetimi ----
  const kategoriEkle = () => {
    const ad = yeniKategoriAdi.trim();
    if (!ad) return;
    kaydet({ ...durum, menu: [...menu, { id: yeniId("k"), kategori: ad, urunler: [] }] });
    setYeniKategoriAdi("");
  };
  const kategoriSil = (kategoriId) => {
    kaydet({ ...durum, menu: menu.filter((k) => k.id !== kategoriId) });
  };
  const kategoriAdGuncelle = (kategoriId, ad) => {
    kaydet({ ...durum, menu: menu.map((k) => (k.id === kategoriId ? { ...k, kategori: ad } : k)) });
  };
  const urunEkle = (kategoriId) => {
    const taslak = yeniUrun[kategoriId] || {};
    const ad = (taslak.ad || "").trim();
    const fiyat = parseFloat(taslak.fiyat);
    if (!ad || !fiyat || fiyat <= 0) return;
    kaydet({
      ...durum,
      menu: menu.map((k) =>
        k.id === kategoriId ? { ...k, urunler: [...k.urunler, { id: yeniId("u"), ad, fiyat }] } : k
      ),
    });
    setYeniUrun((s) => ({ ...s, [kategoriId]: { ad: "", fiyat: "" } }));
  };
  const urunSil = (kategoriId, urunId) => {
    kaydet({
      ...durum,
      menu: menu.map((k) => (k.id === kategoriId ? { ...k, urunler: k.urunler.filter((u) => u.id !== urunId) } : k)),
    });
  };
  const urunGuncelle = (kategoriId, urunId, alanlar) => {
    kaydet({
      ...durum,
      menu: menu.map((k) =>
        k.id === kategoriId
          ? { ...k, urunler: k.urunler.map((u) => (u.id === urunId ? { ...u, ...alanlar } : u)) }
          : k
      ),
    });
  };

  // ---- Ayarlar: İşletme / Yazıcı ayarları ----
  const isletme = durum.isletme || { ad: "", adres: "", kagitGenisligi: "80mm" };
  const isletmeGuncelle = (alanlar) => {
    kaydet({ ...durum, isletme: { ...isletme, ...alanlar } });
  };

  // Müşteri fişinin yazı boyutu/kalınlığı: müşteriye göre (küçük fiş yazıcısı,
  // yaşlı gözler, vb.) ayarlanabilsin diye. Varsayılanlar, eski sabit değerlerle aynı.
  const VARSAYILAN_FIS_AYARLARI = {
    yaziTipi: "Arial",
    baslikYaziBoyutu: 14,
    baslikAltYaziBoyutu: 11,
    solBosluk: 2,
    sagBosluk: 2,
    urunYaziBoyutu: 12,
    toplamYaziBoyutu: 13,
    altYaziBoyutu: 10,
    kalinYazi: false,
    kdvGoster: false,
    maliDegeriYoktur: true,
    siparisNoGoster: false,
    seciliYazici: "",
    mutfakYazicisi: "",
  };
  const fisAyarlari = { ...VARSAYILAN_FIS_AYARLARI, ...(durum.fisAyarlari || {}) };
  const fisAyarlariGuncelle = (alanlar) => {
    kaydet({ ...durum, fisAyarlari: { ...fisAyarlari, ...alanlar } });
  };
  const onizlemeKayit =
    onizlemeSecimi && onizlemeSecimi !== "ornek"
      ? (durum.gecmis || []).find((k) => k.id === onizlemeSecimi) || null
      : null;

  // ---- Roller: garson / yönetici ----
  const yoneticiPin = durum.yoneticiPin || "1234";
  const pinDegistir = (yeniPin) => kaydet({ ...durum, yoneticiPin: yeniPin });

  // ---- Entegrasyonlar (Trendyol Yemek / Getir Yemek / Yemeksepeti API bilgileri) ----
  const BOS_ENTEGRASYON = { apiAnahtari: "", apiSifresi: "", magazaId: "", webhookAnahtari: "" };
  const entegrasyonlar = {
    trendyol: { ...BOS_ENTEGRASYON, ...(durum.entegrasyonlar && durum.entegrasyonlar.trendyol) },
    getir: { ...BOS_ENTEGRASYON, ...(durum.entegrasyonlar && durum.entegrasyonlar.getir) },
    yemeksepeti: { ...BOS_ENTEGRASYON, ...(durum.entegrasyonlar && durum.entegrasyonlar.yemeksepeti) },
  };
  const entegrasyonGuncelle = (platformAnahtari, yeniDeger) => {
    kaydet({
      ...durum,
      entegrasyonlar: { ...entegrasyonlar, [platformAnahtari]: yeniDeger },
    });
  };
  const genelErisimAdresi = durum.genelErisimAdresi || "";
  const genelErisimAdresiKaydet = (deger) => kaydet({ ...durum, genelErisimAdresi: deger });

  // ---- Tünel ayarları (ngrok) - Electron masaüstü uygulaması bu bilgilerle
  // otomatik olarak internete açan bir tünel başlatır, elle .bat çalıştırmaya gerek kalmaz.
  const tunelAyarlari = durum.tunelAyarlari || { ngrokAuthtoken: "", ngrokDomain: "" };
  const tunelAyarlariKaydet = (yeni) => {
    const guncelDurum = { ...durum, tunelAyarlari: yeni };
    // Kolaylık olsun diye: tünel adresi girilince Genel Erişim Adresi'ni de otomatik doldur.
    if (yeni.ngrokDomain) guncelDurum.genelErisimAdresi = `https://${yeni.ngrokDomain}`;
    kaydet(guncelDurum);
  };
  const yoneticiGirisiDene = () => {
    if (pinDeger === yoneticiPin) {
      setRol("yonetici");
      setPinModalAcik(false);
      setPinDeger("");
      setPinHata(false);
    } else {
      setPinHata(true);
    }
  };
  const garsonModunaDon = () => {
    setRol("garson");
    if (gorunum === "ayarlar" || gorunum === "rapor" || gorunum === "entegrasyon") setGorunum("masalar");
  };

  // İşletme ilk kez açılıyor mu? (henüz işletme adı girilmemiş)
  const ilkKurulumGerekli = !isletme.ad;

  // ---- Rapor / Geçmiş ----
  const gununBasi = (tarih) => {
    const d = new Date(tarih);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const secilenGunISO = (() => {
    const d = new Date(secilenGunZamani);
    const yerelOfset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - yerelOfset).toISOString().slice(0, 10);
  })();
  const filtreliGecmis = durum.gecmis.filter((k) => {
    if (raporFiltre === "tum") return true;
    const bugun = gununBasi(Date.now());
    if (raporFiltre === "bugun") return k.kapanisZamani >= bugun;
    if (raporFiltre === "hafta") return k.kapanisZamani >= bugun - 6 * 86400000;
    if (raporFiltre === "gun") {
      const gunBasi = gununBasi(secilenGunZamani);
      return k.kapanisZamani >= gunBasi && k.kapanisZamani < gunBasi + 86400000;
    }
    return true;
  });
  const raporToplam = filtreliGecmis.reduce((t, k) => t + k.toplam, 0);

  // Rapor listesini Excel'de açılabilir bir CSV dosyası olarak indirir.
  // Excel'in Türkçe sürümü noktalı virgülü (;) varsayılan ayraç olarak
  // beklediği için onu kullanıyoruz, yoksa tüm satır tek hücreye sıkışır.
  const raporCsvIndir = (kayitlar) => {
    const kacir = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const basliklar = ["Siparis No", "Masa/Kaynak", "Tarih", "Saat", "Urunler", "Tutar", "Odeme Yontemi"];
    const satirlar = kayitlar.map((k) => {
      const tarih = new Date(k.kapanisZamani);
      const urunOzet = k.urunler.map((u) => `${u.adet}x ${u.ad}`).join(", ");
      return [
        k.siparisNo ?? "",
        k.masaAdi,
        tarih.toLocaleDateString("tr-TR"),
        tarih.toLocaleTimeString("tr-TR"),
        urunOzet,
        k.toplam,
        k.yontem,
      ].map(kacir).join(";");
    });
    const icerik = "\uFEFF" + [basliklar.map(kacir).join(";"), ...satirlar].join("\r\n");
    const blob = new Blob([icerik], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const tarihEtiketi = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `adisyo-rapor-${tarihEtiketi}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const raporNakit = filtreliGecmis.filter((k) => k.yontem === "Nakit").reduce((t, k) => t + k.toplam, 0);
  const raporKart = filtreliGecmis.filter((k) => k.yontem === "Kart").reduce((t, k) => t + k.toplam, 0);
  const raporVeresiye = filtreliGecmis.filter((k) => k.yontem === "Veresiye").reduce((t, k) => t + k.toplam, 0);
  const raporPaket = filtreliGecmis
    .filter((k) => k.yontem !== "Nakit" && k.yontem !== "Kart" && k.yontem !== "Veresiye")
    .reduce((t, k) => t + k.toplam, 0);

  // Hangi üründen kaç adet / ne kadar ciro yapıldığı (seçili tarih aralığında)
  const urunBazliSatis = (() => {
    const harita = {};
    filtreliGecmis.forEach((kayit) => {
      (kayit.urunler || []).forEach((u) => {
        if (!harita[u.ad]) harita[u.ad] = { ad: u.ad, adet: 0, ciro: 0 };
        harita[u.ad].adet += u.adet;
        harita[u.ad].ciro += u.fiyat * u.adet;
      });
    });
    return Object.values(harita).sort((a, b) => b.adet - a.adet);
  })();

  // Raporu PDF olarak kaydetmek/yazdırmak için temiz bir sayfa açar. Gizli iframe + yazdır
  // penceresi: açılan pencerede yazıcı olarak "PDF olarak kaydet" (Windows'ta
  // "Microsoft Print to PDF") seçilirse PDF dosyası olur. Yazı tipi tarayıcıdan geldiği için
  // Türkçe karakterler (ğ, ş, ı, İ) sorunsuz çıkar.
  const raporPdfYazdir = () => {
    const kacis = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const donem =
      raporFiltre === "bugun"
        ? `Bugün (${new Date().toLocaleDateString("tr-TR")})`
        : raporFiltre === "hafta"
        ? "Son 7 gün"
        : raporFiltre === "gun"
        ? new Date(secilenGunZamani).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "Tüm zamanlar";
    const isletmeAdi = durum.isletme?.ad || durum.lisans?.isletmeAdi || "";
    const ozet = [
      ["Toplam Ciro", raporToplam],
      ["Nakit", raporNakit],
      ["Kart", raporKart],
      ["Paket", raporPaket],
      ["Veresiye", raporVeresiye],
    ]
      .map(([ad, t]) => `<div class="kutu"><div class="e">${ad}</div><div class="d">${kacis(paraFormat(t))}</div></div>`)
      .join("");
    const urunSatirlari = urunBazliSatis
      .map((u) => `<tr><td>${kacis(u.ad)}</td><td class="s">${u.adet}</td><td class="s">${kacis(paraFormat(u.ciro))}</td></tr>`)
      .join("");
    const hesapSatirlari = [...filtreliGecmis]
      .sort((a, b) => a.kapanisZamani - b.kapanisZamani)
      .map((k) => {
        const t = new Date(k.kapanisZamani);
        const urunler = (k.urunler || []).map((u) => `${u.adet}x ${u.ad}`).join(", ");
        return `<tr><td>${kacis(t.toLocaleDateString("tr-TR"))} ${kacis(t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }))}</td><td>${kacis(k.masaAdi)}</td><td>${kacis(urunler)}</td><td>${kacis(k.yontem)}</td><td class="s">${kacis(paraFormat(k.toplam))}</td></tr>`;
      })
      .join("");

    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open();
    d.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Adisyo Rapor</title>
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1E293B; font-size: 12px; margin: 0; }
        h1 { font-size: 20px; margin: 0 0 2px; } h2 { font-size: 14px; margin: 22px 0 6px; }
        .alt { color: #64748B; margin-bottom: 14px; }
        .ozet { display: flex; gap: 8px; } .kutu { flex: 1; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 10px; }
        .e { font-size: 10px; color: #64748B; } .d { font-size: 15px; font-weight: bold; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; } th { text-align: left; background: #EAF1FB; font-size: 11px; }
        th, td { padding: 5px 6px; border-bottom: 1px solid #E2E8F0; vertical-align: top; } .s { text-align: right; white-space: nowrap; }
        tr { page-break-inside: avoid; } thead { display: table-header-group; }
        .not { margin-top: 18px; font-size: 10px; color: #64748B; }
      </style></head><body>
      <h1>${kacis(isletmeAdi)} — Satış Raporu</h1>
      <div class="alt">${kacis(donem)} · ${filtreliGecmis.length} hesap · Oluşturma: ${kacis(new Date().toLocaleString("tr-TR"))}</div>
      <div class="ozet">${ozet}</div>
      <h2>Ürün bazlı satışlar</h2>
      <table><thead><tr><th>Ürün</th><th class="s">Adet</th><th class="s">Ciro</th></tr></thead><tbody>${urunSatirlari || '<tr><td colspan="3">Seçili aralıkta satış yok.</td></tr>'}</tbody></table>
      <h2>Hesaplar</h2>
      <table><thead><tr><th>Tarih</th><th>Masa / Kaynak</th><th>Ürünler</th><th>Ödeme</th><th class="s">Tutar</th></tr></thead><tbody>${hesapSatirlari || '<tr><td colspan="5">Seçili aralıkta hesap yok.</td></tr>'}</tbody></table>
      <div class="not">Bu rapor bilgi amaçlıdır; resmi belge (fatura/fiş) yerine geçmez.</div>
      </body></html>`);
    d.close();
    setTimeout(() => {
      f.contentWindow.focus();
      f.contentWindow.print();
      setTimeout(() => f.remove(), 2000);
    }, 300);
  };

  const fisYazdir = (kayit) => setYazdirilacakFis(kayit);

  // ---- Paket siparişler (Trendyol Yemek / Getir Yemek / Yemeksepeti / Telefon) ----
  const paketSiparisler = durum.paketSiparisler || [];
  const kutuSayisi = (durum.paketAyarlari && durum.paketAyarlari.kutuSayisi) || 6;
  const doluKutuNolari = paketSiparisler.filter((p) => p.kutuNo).map((p) => p.kutuNo);
  const enBuyukDoluKutuNo = doluKutuNolari.length ? Math.max(...doluKutuNolari) : 0;

  const paketSimuleEt = () => {
    if (tumUrunler.length === 0) return;
    const platform = PAKET_PLATFORMLAR[Math.floor(Math.random() * PAKET_PLATFORMLAR.length)];
    const kalemSayisi = 1 + Math.floor(Math.random() * 3);
    const secilenler = [];
    for (let i = 0; i < kalemSayisi; i++) {
      const u = tumUrunler[Math.floor(Math.random() * tumUrunler.length)];
      const mevcut = secilenler.find((s) => s.id === u.id);
      if (mevcut) mevcut.adet += 1;
      else secilenler.push({ ...u, adet: 1 });
    }
    const toplam = secilenler.reduce((t, u) => t + u.fiyat * u.adet, 0);
    const siparis = {
      id: yeniId("p"),
      platform: platform.ad,
      urunler: secilenler,
      toplam,
      olusturmaZamani: Date.now(),
      durum: "bekliyor",
      kutuNo: null,
    };
    kaydet({ ...durum, paketSiparisler: [siparis, ...paketSiparisler] });
    // Sipariş geldiğinde otomatik olarak mutfak fişini yazdır
    fisYazdir({
      id: siparis.id,
      masaAdi: `${platform.ad} Siparişi`,
      urunler: secilenler,
      toplam,
      yontem: platform.ad,
      kapanisZamani: siparis.olusturmaZamani,
    });
  };

  // Kutucuğa tıklama: doluysa görüntüle/düzenle, boşsa yeni paket oluşturma ekranı aç
  const kutuAc = (no) => {
    const paket = paketSiparisler.find((p) => p.kutuNo === no);
    setPaketSepet({});
    setPaketSepetNotlar({});
    setPaketAktifKategoriId(menu[0]?.id || null);
    if (paket) {
      setSeciliPaketId(paket.id);
      setPaketPlatformSecim(paket.platform === RESTORAN_PAKETI ? null : paket.platform);
      setPaketSiparisNotu(paket.not || "");
    } else {
      setSeciliPaketId(null);
      setPaketPlatformSecim(null);
      setPaketSiparisNotu("");
    }
    setSeciliKutuNo(no);
  };
  const kutuKapat = () => {
    setSeciliKutuNo(null);
    setSeciliPaketId(null);
    setPaketSepet({});
    setPaketSepetNotlar({});
    setPaketSiparisNotu("");
  };

  const paketSepeteEkle = (urun) => setPaketSepet((s) => ({ ...s, [urun.id]: (s[urun.id] || 0) + 1 }));
  const paketSepettenCikar = (urunId) =>
    setPaketSepet((s) => {
      const yeni = { ...s };
      if (!yeni[urunId]) return s;
      yeni[urunId] -= 1;
      if (yeni[urunId] <= 0) delete yeni[urunId];
      return yeni;
    });
  const paketSepetNotYaz = (urunId, metin) => setPaketSepetNotlar((s) => ({ ...s, [urunId]: metin }));
  const paketSepetListesi = Object.entries(paketSepet)
    .map(([id, adet]) => {
      const urun = tumUrunler.find((u) => u.id === id);
      return urun ? { ...urun, adet, not: paketSepetNotlar[id] || "" } : null;
    })
    .filter(Boolean);
  const paketSepetToplam = paketSepetListesi.reduce((t, u) => t + u.fiyat * u.adet, 0);

  const seciliPaket = seciliPaketId ? paketSiparisler.find((p) => p.id === seciliPaketId) : null;

  // Paket sipariş notunu (adres/telefon/teslimat notu) anlık kaydet
  const paketNotuDegistir = (metin) => {
    setPaketSiparisNotu(metin);
    if (seciliPaket) {
      kaydet({
        ...durum,
        paketSiparisler: paketSiparisler.map((p) => (p.id === seciliPaket.id ? { ...p, not: metin } : p)),
      });
    }
  };

  // Seçili kutuya (yeni veya mevcut) sepetteki ürünleri ekleyip kaydet
  const paketeUrunEkle = () => {
    if (paketSepetListesi.length === 0) return;
    if (seciliPaket) {
      const guncelUrunler = [...seciliPaket.urunler];
      paketSepetListesi.forEach((yeni) => {
        const idx = guncelUrunler.findIndex((u) => u.id === yeni.id);
        if (idx >= 0)
          guncelUrunler[idx] = {
            ...guncelUrunler[idx],
            adet: guncelUrunler[idx].adet + yeni.adet,
            not: yeni.not || guncelUrunler[idx].not || "",
          };
        else guncelUrunler.push({ ...yeni });
      });
      const toplam = guncelUrunler.reduce((t, u) => t + u.fiyat * u.adet, 0);
      kaydet({
        ...durum,
        paketSiparisler: paketSiparisler.map((p) =>
          p.id === seciliPaket.id ? { ...p, urunler: guncelUrunler, toplam } : p
        ),
      });
    } else {
      const yeniPaket = {
        id: yeniId("p"),
        platform: paketPlatformSecim || RESTORAN_PAKETI,
        urunler: paketSepetListesi,
        toplam: paketSepetToplam,
        olusturmaZamani: Date.now(),
        durum: "bekliyor",
        kutuNo: seciliKutuNo,
        not: paketSiparisNotu,
      };
      kaydet({ ...durum, paketSiparisler: [yeniPaket, ...paketSiparisler] });
      setSeciliPaketId(yeniPaket.id);
    }
    setPaketSepet({});
  };

  // Bekliyor -> Yola Çıktı
  const paketYolaCikar = (id) => {
    kaydet({
      ...durum,
      paketSiparisler: paketSiparisler.map((p) => (p.id === id ? { ...p, durum: "yolda" } : p)),
    });
  };

  // Teslim et: geçmişe/rapora düşer, kutucuk boşalır
  const paketTeslimEt = (id) => {
    const siparis = paketSiparisler.find((p) => p.id === id);
    if (!siparis) return;
    const yeniSiparisNo = (durum.siparisSayaci || 100) + 1;
    const kayit = {
      id: yeniId("s"),
      siparisNo: yeniSiparisNo,
      masaAdi: siparis.platform,
      kaynak: siparis.platform,
      urunler: siparis.urunler,
      toplam: siparis.toplam,
      yontem: siparis.platform,
      kapanisZamani: Date.now(),
    };
    kaydet({
      ...durum,
      paketSiparisler: paketSiparisler.filter((p) => p.id !== id),
      gecmis: [kayit, ...durum.gecmis].slice(0, 100),
      siparisSayaci: yeniSiparisNo,
    });
    if (seciliPaketId === id) kutuKapat();
  };

  const paketIptalEt = (id) => {
    kaydet({ ...durum, paketSiparisler: paketSiparisler.filter((p) => p.id !== id) });
    if (seciliPaketId === id) kutuKapat();
  };

  const doluKutuVarMi = doluKutuNolari.length > 0;
  const paketKutuSayisiniAyarla = () => {
    const n = parseInt(paketKutuSayisiGirdi, 10);
    if (!n || n < 1 || n > 60) return;
    if (n < enBuyukDoluKutuNo) return; // dolu bir kutuyu görünmez yapma
    kaydet({ ...durum, paketAyarlari: { ...(durum.paketAyarlari || {}), kutuSayisi: n } });
    setPaketKutuSayisiGirdi("");
  };

  const bekleyenPaketler = paketSiparisler.filter((p) => (p.durum || "bekliyor") === "bekliyor");
  const yoldakiPaketler = paketSiparisler.filter((p) => p.durum === "yolda");



  return (
    <div style={{ background: PAPER, color: INK, fontFamily: "'Inter', system-ui, sans-serif" }} className="min-h-[600px] w-full relative overflow-hidden">
      {/* Üst bar */}
      <div style={{ borderBottom: `1px solid ${LINE}` }} className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuAcik(true)} className="opacity-70 hover:opacity-100 p-1 -ml-1" title="Menü">
            <Menu size={20} />
          </button>

          {gorunum === "masalar" || gorunum === "paket" ? (
            <div style={{ background: LINE + "55" }} className="flex items-center gap-0.5 rounded-lg p-0.5">
              <button
                onClick={() => setGorunum("masalar")}
                style={{ background: gorunum === "masalar" ? CARD : "transparent", color: gorunum === "masalar" ? WINE : INK }}
                className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                Masalar
              </button>
              <button
                onClick={() => setGorunum("paket")}
                style={{ background: gorunum === "paket" ? CARD : "transparent", color: gorunum === "paket" ? WINE : INK }}
                className="relative text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                Paketler
                {paketSiparisler.length > 0 && (
                  <span
                    style={{ background: RUST }}
                    className="absolute -top-1 -right-1 text-white text-[9px] leading-none rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    {paketSiparisler.length}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setGorunum("masalar")} className="opacity-60 hover:opacity-100">
                <ChevronLeft size={20} />
              </button>
              <div className="text-lg sm:text-xl font-semibold tracking-tight">
                {gorunum === "rapor" ? "Ciro & Rapor" : gorunum === "entegrasyon" ? "Entegrasyonlar" : "Yönetim"}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span
            title={baglantiDurumu === "bagli" ? "Sunucuya bağlı" : baglantiDurumu === "kopuk" ? "Bağlantı koptu, yeniden deneniyor" : "Bağlanıyor"}
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: baglantiDurumu === "bagli" ? MOSS : baglantiDurumu === "kopuk" ? RUST : LINE }}
          />
        </div>
      </div>

      {/* Sol taraftan açılan (☰) menü: Ayarlar, Masa Yönetimi, Ciro vb. */}
      {menuAcik && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAcik(false)} />
          <div style={{ background: PAPER }} className="relative w-72 max-w-[80%] h-full flex flex-col p-3 shadow-xl">
            <div className="flex items-center justify-between px-2 py-2 mb-2">
              <div className="text-sm font-semibold opacity-70">{isletme.ad || "Adisyo"}</div>
              <button onClick={() => setMenuAcik(false)} className="opacity-50 hover:opacity-90 p-1">
                <X size={18} />
              </button>
            </div>

            {[
              { icon: Store, ad: "Masalar", aksiyon: () => setGorunum("masalar") },
              { icon: Package, ad: "Paketler", aksiyon: () => setGorunum("paket") },
            ].map((m) => (
              <button
                key={m.ad}
                onClick={() => { m.aksiyon(); setMenuAcik(false); }}
                style={{ color: INK }}
                className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-black/5 text-left"
              >
                <m.icon size={17} className="opacity-60" /> {m.ad}
              </button>
            ))}

            <div style={{ borderTop: `1px solid ${LINE}` }} className="my-2" />

            {rol === "yonetici" ? (
              <>
                {[
                  { icon: Receipt, ad: "Ciro & Rapor", aksiyon: () => setGorunum("rapor") },
                  { icon: Settings, ad: "Masa Yönetimi", aksiyon: () => { setGorunum("ayarlar"); setAyarlarSekme("masalar"); } },
                  { icon: Boxes, ad: "Paket Kutucukları", aksiyon: () => { setGorunum("ayarlar"); setAyarlarSekme("paket"); } },
                  { icon: Receipt, ad: "Menü Yönetimi", aksiyon: () => { setGorunum("ayarlar"); setAyarlarSekme("menu"); } },
                  { icon: Printer, ad: "Yazıcı & İşletme", aksiyon: () => { setGorunum("ayarlar"); setAyarlarSekme("yazici"); } },
                  { icon: Plug, ad: "Entegrasyonlar", aksiyon: () => setGorunum("entegrasyon") },
                ].map((m) => (
                  <button
                    key={m.ad}
                    onClick={() => { m.aksiyon(); setMenuAcik(false); }}
                    style={{ color: INK }}
                    className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-black/5 text-left"
                  >
                    <m.icon size={17} className="opacity-60" /> {m.ad}
                  </button>
                ))}
              </>
            ) : (
              <button
                onClick={() => { setMenuAcik(false); setPinModalAcik(true); setPinDeger(""); setPinHata(false); }}
                style={{ color: INK }}
                className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-black/5 text-left"
              >
                <Lock size={17} className="opacity-60" /> Yönetici Girişi
              </button>
            )}

            <div className="mt-auto">
              <div style={{ borderTop: `1px solid ${LINE}` }} className="my-2" />
              {rol === "yonetici" && (
                <button
                  onClick={() => { garsonModunaDon(); setMenuAcik(false); }}
                  style={{ color: INK }}
                  className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-black/5 text-left w-full"
                >
                  <LogOut size={17} className="opacity-60" /> Garson Moduna Dön
                </button>
              )}
              {rol === "yonetici" && (
                <>
                  <button
                    onClick={() => { setMenuAcik(false); verileriYedekle(); }}
                    style={{ color: INK }}
                    className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-black/5 text-left w-full"
                  >
                    <Download size={17} className="opacity-60" /> Verileri Yedekle
                  </button>
                  <button
                    onClick={() => { setMenuAcik(false); geriYukleInputRef.current?.click(); }}
                    style={{ color: INK }}
                    className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-black/5 text-left w-full"
                  >
                    <Upload size={17} className="opacity-60" /> Yedekten Geri Yükle
                  </button>
                  <input
                    ref={geriYukleInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={geriYuklemeDosyaSecildi}
                    className="hidden"
                  />
                </>
              )}
              {rol === "yonetici" && (
                <button
                  onClick={() => { setMenuAcik(false); setSifirlaOnay(true); }}
                  style={{ color: RUST }}
                  className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-black/5 text-left w-full"
                >
                  <RotateCcw size={17} /> Tüm Verileri Sıfırla
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* İlk kurulum: işletme adı henüz girilmemişse (her işyeri kendi adını girer) */}
      {ilkKurulumGerekli && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div style={{ background: PAPER }} className="relative w-full max-w-sm rounded-xl shadow-xl p-6">
            <div className="text-lg font-semibold mb-1">Hoş geldin 👋</div>
            <div className="text-sm opacity-70 mb-4">
              Adisyo'yu kullanmaya başlamadan önce işletmenin adını gir. Bu ad fişlerde ve ekranda görünecek.
            </div>
            <input
              autoFocus
              value={ilkKurulumAdi}
              onChange={(e) => setIlkKurulumAdi(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ilkKurulumAdi.trim() && isletmeGuncelle({ ad: ilkKurulumAdi.trim() })}
              placeholder="Örn. Sahil Kafe"
              style={{ borderColor: LINE }}
              className="border rounded-lg px-3 py-2.5 text-sm w-full outline-none mb-3"
            />
            <div style={{ background: RUST_BG, color: RUST }} className="rounded-lg p-3 text-xs leading-relaxed mb-4">
              Not: Garsonların ayarlara/ciroya erişememesi için varsayılan yönetici PIN'i <b>1234</b> olarak
              ayarlandı. Kuruluşu tamamladıktan sonra Ayarlar → Yazıcı & İşletme'den bu PIN'i değiştirmeni öneririz.
            </div>
            <button
              onClick={() => ilkKurulumAdi.trim() && isletmeGuncelle({ ad: ilkKurulumAdi.trim() })}
              disabled={!ilkKurulumAdi.trim()}
              style={{ background: WINE }}
              className="w-full text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-40"
            >
              Başla
            </button>
          </div>
        </div>
      )}

      {/* Yönetici PIN girişi */}
      {pinModalAcik && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPinModalAcik(false)} />
          <div style={{ background: PAPER }} className="relative w-full max-w-xs rounded-xl shadow-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={16} style={{ color: WINE }} />
              <div className="text-sm font-semibold">Yönetici Girişi</div>
            </div>
            <div className="text-xs opacity-60 mb-3">Ciro, menü, masa ve yazıcı ayarlarına erişmek için PIN gir.</div>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pinDeger}
              onChange={(e) => { setPinDeger(e.target.value); setPinHata(false); }}
              onKeyDown={(e) => e.key === "Enter" && yoneticiGirisiDene()}
              style={{ borderColor: pinHata ? RUST : LINE }}
              placeholder="PIN"
              className="border rounded-lg px-3 py-2.5 text-sm w-full outline-none tracking-widest text-center mb-1"
            />
            {pinHata && <div style={{ color: RUST }} className="text-xs mb-2">PIN yanlış, tekrar dene.</div>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setPinModalAcik(false)}
                style={{ borderColor: LINE }}
                className="flex-1 border rounded-lg py-2 text-sm font-medium"
              >
                Vazgeç
              </button>
              <button
                onClick={yoneticiGirisiDene}
                style={{ background: WINE }}
                className="flex-1 text-white rounded-lg py-2 text-sm font-medium"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fis-yazdirma-alani, #fis-yazdirma-alani * { visibility: visible; }
          #fis-yazdirma-alani {
            display: block !important;
            position: absolute; top: 0; left: 0;
            width: ${isletme.kagitGenisligi === "58mm" ? "58mm" : "80mm"};
            padding: 6mm;
          }
        }
      `}</style>
      {yazdirilacakFis && (
        <div
          id="fis-yazdirma-alani"
          className="hidden"
          style={{
            fontFamily: fisAyarlari.yaziTipi,
            fontSize: fisAyarlari.urunYaziBoyutu,
            fontWeight: fisAyarlari.kalinYazi ? 700 : 400,
            color: "#000",
            paddingLeft: `${fisAyarlari.solBosluk}mm`,
            paddingRight: `${fisAyarlari.sagBosluk}mm`,
          }}
        >
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: fisAyarlari.baslikYaziBoyutu, marginBottom: 4 }}>
            {isletme.ad || "İşletme Adı"}
          </div>
          {isletme.adres && (
            <div style={{ textAlign: "center", fontSize: fisAyarlari.baslikAltYaziBoyutu, marginBottom: 6 }}>
              {isletme.adres}
            </div>
          )}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
          {fisAyarlari.siparisNoGoster && yazdirilacakFis.siparisNo && (
            <div>Sipariş No: {yazdirilacakFis.siparisNo}</div>
          )}
          <div>{yazdirilacakFis.masaAdi}</div>
          <div style={{ fontSize: fisAyarlari.altYaziBoyutu }}>
            {new Date(yazdirilacakFis.kapanisZamani).toLocaleString("tr-TR")}
          </div>
          {yazdirilacakFis.not && (
            <>
              <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
              <div style={{ fontWeight: 700 }}>NOT: {yazdirilacakFis.not}</div>
            </>
          )}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
          {yazdirilacakFis.urunler.map((u) => (
            <div key={u.id} style={{ marginBottom: u.not ? 3 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{u.adet}x {u.ad}</span>
                <span>{paraFormat(u.fiyat * u.adet)}</span>
              </div>
              {u.not && <div style={{ paddingLeft: 10, fontStyle: "italic" }}>* {u.not}</div>}
            </div>
          ))}
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: fisAyarlari.toplamYaziBoyutu,
            }}
          >
            <span>TOPLAM</span>
            <span>{paraFormat(yazdirilacakFis.toplam)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Ödeme</span>
            <span>{yazdirilacakFis.yontem}</span>
          </div>
          {fisAyarlari.kdvGoster && (
            <div style={{ fontSize: fisAyarlari.altYaziBoyutu, marginTop: 4 }}>KDV Fiyatlara Dahildir</div>
          )}
          <div style={{ textAlign: "center", fontSize: fisAyarlari.altYaziBoyutu, marginTop: 10 }}>Afiyet olsun!</div>
          {fisAyarlari.maliDegeriYoktur !== false && (
            <div style={{ textAlign: "center", fontSize: fisAyarlari.altYaziBoyutu, marginTop: 4 }}>Bilgi fişidir · Mali değeri yoktur</div>
          )}
        </div>
      )}

      {hataMesaji && (
        <div
          style={{ background: RUST_BG, color: RUST }}
          className="mx-4 sm:mx-6 mt-3 px-3 py-2 rounded text-xs flex items-center justify-between gap-2"
        >
          <span>{hataMesaji}</span>
          <button onClick={() => setHataMesaji("")} className="opacity-60 hover:opacity-100 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ---- MASALAR GÖRÜNÜMÜ ---- */}
      {gorunum === "masalar" && (
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {durum.masalar.map((masa) => {
              const dolu = masa.durum === "dolu";
              const toplam = masaToplam(masa);
              return (
                <div
                  key={masa.id}
                  onClick={() => masaAc(masa)}
                  role="button"
                  tabIndex={0}
                  style={{ background: CARD, borderColor: dolu ? RUST : LINE, borderWidth: dolu ? 2 : 1 }}
                  className="relative text-left rounded-lg p-2 hover:shadow-md transition-shadow aspect-square flex flex-col justify-between cursor-pointer select-none"
                >
                  <div>
                    <div className="font-medium text-xs">{masa.ad}</div>
                    <div style={{ color: dolu ? RUST : MOSS }} className="text-[10px] mt-0.5 font-medium">
                      {dolu ? "Dolu" : "Boş"}
                    </div>
                    {dolu && (
                      <>
                        <div className="flex items-center gap-1 text-[9px] opacity-55 mt-1">
                          <Clock size={9} />
                          {gecenSure(masa.acilisZamani, simdi)}
                        </div>
                        <div className="text-xs font-semibold mt-0.5">{paraFormat(toplam)}</div>
                      </>
                    )}
                  </div>
                  {dolu && (
                    <div className="flex items-center gap-0.5 pt-1 -mx-0.5" style={{ borderTop: `1px solid ${LINE}` }}>
                      <button
                        onClick={(e) => hizliOde(masa, e)}
                        title="Öde"
                        className="flex-1 flex items-center justify-center py-1 rounded hover:bg-black/5"
                        style={{ color: MOSS }}
                      >
                        <Banknote size={13} />
                      </button>
                      <button
                        onClick={(e) => hizliYazdir(masa, e)}
                        title="Fişi Yazdır"
                        className="flex-1 flex items-center justify-center py-1 rounded hover:bg-black/5 opacity-60"
                      >
                        <Printer size={12} />
                      </button>
                      <button
                        onClick={(e) => hizliIptalIste(masa, e)}
                        title="Siparişi İptal Et"
                        className="flex-1 flex items-center justify-center py-1 rounded hover:bg-black/5"
                        style={{ color: RUST }}
                      >
                        <Ban size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {durum.masalar.length === 0 && (
            <div className="text-sm opacity-60 mt-8 text-center">
              Henüz masa yok. Yönetim ekranından masalarını ekleyebilirsin.
            </div>
          )}
        </div>
      )}

      {/* ---- ENTEGRASYONLAR GÖRÜNÜMÜ ---- */}
      {gorunum === "entegrasyon" && (
        <div className="p-4 sm:p-6 max-w-2xl flex flex-col gap-5">
          <TunelAyarlariKarti deger={tunelAyarlari} onKaydet={tunelAyarlariKaydet} />

          <CihazlarKarti />

          <QrMenuKarti
            varsayilanAdres={`${(genelErisimAdresi || window.location.origin).replace(/\/$/, "")}/menu`}
            isletmeAdi={durum.isletme?.ad || durum.lisans?.isletmeAdi}
          />

          <div style={{ background: RUST_BG, color: RUST }} className="rounded-lg p-4 text-xs leading-relaxed">
            Buraya girdiğin bilgiler bu bilgisayarda saklanır. Trendyol Yemek / Getir Yemek / Yemeksepeti'nin
            sana ait sipariş bilgilerini gönderebilmesi için, platformun kendi satıcı panelinden alacağın
            API bilgilerini aşağıya gir ve aşağıdaki <b>Webhook Adresi</b>'ni platformun ilgili alanına
            (genelde "Entegrasyon" veya "Webhook URL" alanı) yapıştır. Her platformun kendi paneli ve süreci
            farklıdır — emin değilsen platformun satıcı desteğine "kendi POS sistemime otomatik sipariş
            aktarmak istiyorum" diyerek sorabilirsin.
          </div>

          <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4">
            <div className="text-sm font-medium mb-1">Genel Erişim Adresi (opsiyonel)</div>
            <div className="text-xs opacity-60 mb-2">
              Cloudflare Tunnel / ngrok gibi bir tünel kullanıyorsan, sana verdiği kalıcı adresi buraya yaz.
              Aşağıdaki webhook adresleri otomatik olarak bu adrese göre gösterilecek. Boş bırakırsan bu
              bilgisayarın yerel adresi kullanılır (sadece bu ağdan çalışır).
            </div>
            <input
              value={genelErisimAdresi}
              onChange={(e) => genelErisimAdresiKaydet(e.target.value)}
              placeholder="https://sahilkafe-adisyo.ngrok-free.app"
              style={{ borderColor: LINE }}
              className="border rounded px-3 py-2 text-sm w-full outline-none"
            />
          </div>

          <EntegrasyonKarti
            platformAnahtari="trendyol"
            platformAdi="Trendyol Yemek"
            renk="#F27A1A"
            deger={entegrasyonlar.trendyol}
            onKaydet={(yeni) => entegrasyonGuncelle("trendyol", yeni)}
            genelErisimAdresi={genelErisimAdresi}
          />
          <EntegrasyonKarti
            platformAnahtari="getir"
            platformAdi="Getir Yemek"
            renk="#5D3EBC"
            deger={entegrasyonlar.getir}
            onKaydet={(yeni) => entegrasyonGuncelle("getir", yeni)}
            genelErisimAdresi={genelErisimAdresi}
          />
          <EntegrasyonKarti
            platformAnahtari="yemeksepeti"
            platformAdi="Yemeksepeti"
            renk="#FA0050"
            deger={entegrasyonlar.yemeksepeti}
            onKaydet={(yeni) => entegrasyonGuncelle("yemeksepeti", yeni)}
            genelErisimAdresi={genelErisimAdresi}
          />
        </div>
      )}

      {/* ---- AYARLAR GÖRÜNÜMÜ ---- */}
      {gorunum === "ayarlar" && (
        <div className="p-4 sm:p-6 max-w-2xl">
          <div className="flex gap-1 mb-5" style={{ borderBottom: `1px solid ${LINE}` }}>
            {[
              { id: "masalar", ad: "Masalar" },
              { id: "paket", ad: "Paket Kutucukları" },
              { id: "menu", ad: "Menü" },
              { id: "musteriler", ad: "Müşteriler" },
              { id: "yazici", ad: "Yazıcı & İşletme" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setAyarlarSekme(s.id)}
                style={{
                  color: ayarlarSekme === s.id ? WINE : INK,
                  borderColor: ayarlarSekme === s.id ? WINE : "transparent",
                }}
                className="text-sm font-medium px-3 pb-2.5 border-b-2 opacity-90"
              >
                {s.ad}
              </button>
            ))}
          </div>

          {ayarlarSekme === "masalar" && (
            <div className="flex flex-col gap-5">
              <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4">
                <div className="text-sm font-medium mb-1">Masa sayısını ayarla</div>
                <div className="text-xs opacity-60 mb-3">
                  Mekanına göre masa sayısını gir, listeyi otomatik oluşturayım. Dolu masa varken değiştirilemez.
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={masaSayisiGirdi}
                    onChange={(e) => setMasaSayisiGirdi(e.target.value)}
                    placeholder={String(durum.masalar.length)}
                    style={{ borderColor: LINE }}
                    className="border rounded px-3 py-2 text-sm w-28 outline-none"
                    disabled={doluMasaVarMi}
                  />
                  <button
                    onClick={masaSayisiniAyarla}
                    disabled={doluMasaVarMi || !masaSayisiGirdi}
                    style={{ background: WINE }}
                    className="text-white text-sm rounded px-4 py-2 disabled:opacity-40"
                  >
                    Uygula
                  </button>
                </div>
                {doluMasaVarMi && (
                  <div style={{ color: RUST }} className="text-xs mt-2">
                    Şu an dolu masa olduğu için toplu değişiklik yapılamıyor.
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Masa listesi</div>
                  <button onClick={masaTekEkle} className="text-xs flex items-center gap-1" style={{ color: WINE }}>
                    <Plus size={13} /> Tek masa ekle
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {durum.masalar.map((masa) => (
                    <div
                      key={masa.id}
                      style={{ background: CARD, borderColor: LINE }}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <input
                        value={masa.ad}
                        onChange={(e) => masaAdiGuncelle(masa.id, e.target.value)}
                        className="flex-1 text-sm outline-none bg-transparent"
                      />
                      <span style={{ color: masa.durum === "dolu" ? RUST : MOSS }} className="text-xs font-medium">
                        {masa.durum === "dolu" ? "Dolu" : "Boş"}
                      </span>
                      <button
                        onClick={() => masaSil(masa.id)}
                        disabled={masa.durum === "dolu"}
                        className="opacity-40 hover:opacity-90 disabled:opacity-15"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {ayarlarSekme === "paket" && (
            <div className="flex flex-col gap-5">
              <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4">
                <div className="text-sm font-medium mb-1">Paket kutucuğu sayısını ayarla</div>
                <div className="text-xs opacity-60 mb-3">
                  Paket siparişlerini geçici olarak yerleştirdiğin kutu/raf sayısı. Kurye geldiğinde
                  "Kutu {"{"}no{"}"}" diyerek teslim almasını kolaylaştırır. Dolu bir kutuyu göstermeyecek
                  şekilde azaltamazsın.
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={paketKutuSayisiGirdi}
                    onChange={(e) => setPaketKutuSayisiGirdi(e.target.value)}
                    placeholder={String(kutuSayisi)}
                    style={{ borderColor: LINE }}
                    className="border rounded px-3 py-2 text-sm w-28 outline-none"
                  />
                  <button
                    onClick={paketKutuSayisiniAyarla}
                    disabled={!paketKutuSayisiGirdi}
                    style={{ background: WINE }}
                    className="text-white text-sm rounded px-4 py-2 disabled:opacity-40"
                  >
                    Uygula
                  </button>
                </div>
                {doluKutuVarMi && (
                  <div style={{ color: RUST }} className="text-xs mt-2">
                    Şu an en yüksek dolu kutu: {enBuyukDoluKutuNo}. Bunun altına düşüremezsin.
                  </div>
                )}
              </div>
            </div>
          )}

          {ayarlarSekme === "menu" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <input
                  value={yeniKategoriAdi}
                  onChange={(e) => setYeniKategoriAdi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && kategoriEkle()}
                  placeholder="Yeni kategori adı (örn. Tatlılar)"
                  style={{ borderColor: LINE }}
                  className="border rounded px-3 py-2 text-sm flex-1 outline-none"
                />
                <button onClick={kategoriEkle} style={{ background: WINE }} className="text-white text-sm rounded px-4 py-2">
                  Kategori Ekle
                </button>
              </div>

              {menu.map((k) => (
                <div key={k.id} style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      value={k.kategori}
                      onChange={(e) => kategoriAdGuncelle(k.id, e.target.value)}
                      className="text-sm font-semibold flex-1 outline-none bg-transparent"
                    />
                    <button onClick={() => kategoriSil(k.id)} className="opacity-40 hover:opacity-90">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3">
                    {k.urunler.map((u) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <input
                          value={u.ad}
                          onChange={(e) => urunGuncelle(k.id, u.id, { ad: e.target.value })}
                          className="flex-1 text-sm outline-none bg-transparent border-b py-1"
                          style={{ borderColor: "transparent" }}
                        />
                        <input
                          type="number"
                          value={u.fiyat}
                          onChange={(e) => urunGuncelle(k.id, u.id, { fiyat: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-sm outline-none bg-transparent text-right"
                        />
                        <span className="text-xs opacity-50">₺</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="Stok yok"
                          title="Stok takibi (boş = sınırsız/takip yok)"
                          value={u.stokAdedi ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            urunGuncelle(k.id, u.id, { stokAdedi: v === "" ? null : Math.max(0, parseInt(v, 10) || 0) });
                          }}
                          className="w-20 text-xs outline-none bg-transparent text-right border-l pl-2"
                          style={{ borderColor: LINE }}
                        />
                        <button onClick={() => urunSil(k.id, u.id)} className="opacity-40 hover:opacity-90">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {k.urunler.length === 0 && <div className="text-xs opacity-40">Bu kategoride ürün yok.</div>}
                  </div>

                  <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${LINE}` }}>
                    <input
                      placeholder="Ürün adı"
                      value={(yeniUrun[k.id] || {}).ad || ""}
                      onChange={(e) => setYeniUrun((s) => ({ ...s, [k.id]: { ...s[k.id], ad: e.target.value } }))}
                      style={{ borderColor: LINE }}
                      className="border rounded px-2.5 py-1.5 text-sm flex-1 outline-none"
                    />
                    <input
                      placeholder="Fiyat"
                      type="number"
                      value={(yeniUrun[k.id] || {}).fiyat || ""}
                      onChange={(e) => setYeniUrun((s) => ({ ...s, [k.id]: { ...s[k.id], fiyat: e.target.value } }))}
                      style={{ borderColor: LINE }}
                      className="border rounded px-2.5 py-1.5 text-sm w-24 outline-none"
                    />
                    <button
                      onClick={() => urunEkle(k.id)}
                      style={{ borderColor: WINE, color: WINE }}
                      className="border rounded px-3 py-1.5 text-sm flex items-center gap-1"
                    >
                      <Plus size={13} /> Ekle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ayarlarSekme === "musteriler" && (
            <div className="flex flex-col gap-5">
              <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4 flex flex-col gap-3">
                <div className="text-sm font-medium">Yeni Müşteri Ekle</div>
                <div className="flex gap-2">
                  <input
                    value={yeniMusteriAdi}
                    onChange={(e) => setYeniMusteriAdi(e.target.value)}
                    placeholder="Ad Soyad"
                    style={{ borderColor: LINE }}
                    className="border rounded px-3 py-2 text-sm flex-1 outline-none"
                  />
                  <input
                    value={yeniMusteriTel}
                    onChange={(e) => setYeniMusteriTel(e.target.value)}
                    placeholder="Telefon"
                    style={{ borderColor: LINE }}
                    className="border rounded px-3 py-2 text-sm w-36 outline-none"
                  />
                  <button
                    onClick={() => {
                      if (musteriEkle(yeniMusteriAdi, yeniMusteriTel)) {
                        setYeniMusteriAdi("");
                        setYeniMusteriTel("");
                      }
                    }}
                    disabled={!yeniMusteriAdi.trim()}
                    style={{ background: WINE }}
                    className="text-white rounded-lg px-4 text-sm font-medium disabled:opacity-40"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border divide-y" >
                {musteriler.length === 0 && (
                  <div className="p-4 text-sm opacity-50">Henüz kayıtlı müşteri yok.</div>
                )}
                {musteriler.map((m) => (
                  <div key={m.id} style={{ borderColor: LINE }} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{m.ad}</div>
                      {m.telefon && <div className="text-xs opacity-50">{m.telefon}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: m.bakiye > 0 ? RUST : undefined }}
                      >
                        {m.bakiye > 0 ? `Borç: ${paraFormat(m.bakiye)}` : "Borcu yok"}
                      </div>
                      {m.bakiye > 0 && (
                        <button
                          onClick={() => {
                            const girilen = window.prompt(
                              `${m.ad} için tahsil edilen tutarı gir:`,
                              String(m.bakiye)
                            );
                            const tutar = parseFloat(girilen);
                            if (tutar > 0) musteriTahsilat(m.id, tutar);
                          }}
                          style={{ borderColor: MOSS, color: MOSS }}
                          className="text-xs border rounded px-2.5 py-1.5"
                        >
                          Tahsilat Al
                        </button>
                      )}
                      <button onClick={() => musteriSil(m.id)} className="opacity-40 hover:opacity-90">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ayarlarSekme === "yazici" && (
            <div className="flex flex-col gap-5">
              <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4 flex flex-col gap-3">
                <div className="text-sm font-medium">Fişte görünecek bilgiler</div>
                <div>
                  <div className="text-xs opacity-60 mb-1">İşletme adı</div>
                  <input
                    value={isletme.ad}
                    onChange={(e) => isletmeGuncelle({ ad: e.target.value })}
                    style={{ borderColor: LINE }}
                    className="border rounded px-3 py-2 text-sm w-full outline-none"
                  />
                </div>
                <div>
                  <div className="text-xs opacity-60 mb-1">Adres / telefon (opsiyonel)</div>
                  <input
                    value={isletme.adres}
                    onChange={(e) => isletmeGuncelle({ adres: e.target.value })}
                    style={{ borderColor: LINE }}
                    className="border rounded px-3 py-2 text-sm w-full outline-none"
                  />
                </div>
                <div>
                  <div className="text-xs opacity-60 mb-1">Fiş kağıdı genişliği</div>
                  <div className="flex gap-2">
                    {["58mm", "80mm"].map((g) => (
                      <button
                        key={g}
                        onClick={() => isletmeGuncelle({ kagitGenisligi: g })}
                        style={{
                          borderColor: isletme.kagitGenisligi === g ? WINE : LINE,
                          color: isletme.kagitGenisligi === g ? WINE : INK,
                        }}
                        className="border rounded px-3 py-1.5 text-sm"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() =>
                    fisYazdir({
                      id: "test",
                      masaAdi: "Test Fişi",
                      urunler: [{ id: "x", ad: "Örnek Ürün", fiyat: 100, adet: 1 }],
                      toplam: 100,
                      yontem: "Nakit",
                      kapanisZamani: Date.now(),
                    })
                  }
                  style={{ borderColor: WINE, color: WINE }}
                  className="border rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 mt-1"
                >
                  <Printer size={15} /> Test Fişi Yazdır
                </button>
              </div>

              <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4 flex flex-col gap-3">
                <div className="text-sm font-medium">Fiş Yazı Ayarları</div>
                <div className="text-xs opacity-60 -mt-2">
                  Müşteri fişinin yazı tipini, boyutlarını, kenar boşluklarını ve görünecek bilgileri buradan
                  değiştirebilirsin — sağdaki/aşağıdaki önizlemeye anında yansır.
                </div>

                {window.adisyo && (
                  <div>
                    <div className="text-xs opacity-60 mb-1">Seçili Yazıcı (otomatik kesme için)</div>
                    <select
                      value={fisAyarlari.seciliYazici}
                      onChange={(e) => fisAyarlariGuncelle({ seciliYazici: e.target.value })}
                      style={{ borderColor: LINE }}
                      className="border rounded px-3 py-2 text-sm w-full outline-none bg-transparent"
                    >
                      <option value="">Sistem varsayılanı (yazdırma penceresi göster)</option>
                      {yaziciListesi.map((ad) => (
                        <option key={ad} value={ad}>{ad}</option>
                      ))}
                    </select>
                    <div className="text-[11px] opacity-50 mt-1">
                      Bir yazıcı seçersen, fişler pencere açılmadan doğrudan o yazıcıya basılır ve sonunda
                      otomatik kağıt kesme komutu gönderilir (yazıcının bıçağı varsa).
                    </div>
                  </div>
                )}

                {window.adisyo && (
                  <div>
                    <div className="text-xs opacity-60 mb-1">Mutfak Yazıcısı (KOT)</div>
                    <select
                      value={fisAyarlari.mutfakYazicisi}
                      onChange={(e) => fisAyarlariGuncelle({ mutfakYazicisi: e.target.value })}
                      style={{ borderColor: LINE }}
                      className="border rounded px-3 py-2 text-sm w-full outline-none bg-transparent"
                    >
                      <option value="">Mutfak fişi basma</option>
                      {yaziciListesi.map((ad) => (
                        <option key={ad} value={ad}>{ad}</option>
                      ))}
                    </select>
                    <div className="text-[11px] opacity-50 mt-1">
                      Seçersen, "Sipariş Ekle"den masaya yeni ürün gönderdiğinde (fiyatsız, sade) otomatik
                      olarak mutfağa da bir fiş basılır. Kasadaki yazıcıdan farklı, ayrı bir yazıcı olmalı.
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs opacity-60 mb-1">Yazı Tipi</div>
                  <select
                    value={fisAyarlari.yaziTipi}
                    onChange={(e) => fisAyarlariGuncelle({ yaziTipi: e.target.value })}
                    style={{ borderColor: LINE }}
                    className="border rounded px-3 py-2 text-sm w-full outline-none bg-transparent"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="monospace">Monospace (Yazıcı Standart)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { alan: "baslikYaziBoyutu", etiket: "Başlık Yazı Boyutu" },
                    { alan: "baslikAltYaziBoyutu", etiket: "Başlık Alt Yazı Boyutu" },
                    { alan: "solBosluk", etiket: "Sol Boşluk (mm)" },
                    { alan: "sagBosluk", etiket: "Sağ Boşluk (mm)" },
                    { alan: "urunYaziBoyutu", etiket: "Ürün Listesi" },
                    { alan: "toplamYaziBoyutu", etiket: "Toplam Tutar" },
                    { alan: "altYaziBoyutu", etiket: "Alt Yazı Boyutu" },
                  ].map((f) => (
                    <div key={f.alan}>
                      <div className="text-xs opacity-60 mb-1">{f.etiket}</div>
                      <input
                        type="number"
                        min={0}
                        max={28}
                        value={fisAyarlari[f.alan]}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          fisAyarlariGuncelle({ [f.alan]: Number.isFinite(n) ? n : VARSAYILAN_FIS_AYARLARI[f.alan] });
                        }}
                        style={{ borderColor: LINE }}
                        className="border rounded px-3 py-2 text-sm w-full outline-none"
                      />
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-sm mt-1">
                  <input
                    type="checkbox"
                    checked={fisAyarlari.kalinYazi}
                    onChange={(e) => fisAyarlariGuncelle({ kalinYazi: e.target.checked })}
                  />
                  Fiş yazısı kalın (bold) olsun
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Fişin altına "Bilgi fişidir · Mali değeri yoktur" yaz</span>
                  <input
                    type="checkbox"
                    checked={fisAyarlari.maliDegeriYoktur !== false}
                    onChange={(e) => fisAyarlariGuncelle({ maliDegeriYoktur: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>KDV Bilgisi Gösterilsin</span>
                  <input
                    type="checkbox"
                    checked={fisAyarlari.kdvGoster}
                    onChange={(e) => fisAyarlariGuncelle({ kdvGoster: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Sipariş Numarası Gösterilsin</span>
                  <input
                    type="checkbox"
                    checked={fisAyarlari.siparisNoGoster}
                    onChange={(e) => fisAyarlariGuncelle({ siparisNoGoster: e.target.checked })}
                  />
                </label>
              </div>

              <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">Fiş Önizleme</div>
                  {durum.gecmis && durum.gecmis.length > 0 && (
                    <select
                      value={onizlemeSecimi ?? "ornek"}
                      onChange={(e) => setOnizlemeSecimi(e.target.value)}
                      style={{ borderColor: LINE }}
                      className="border rounded px-2 py-1 text-xs outline-none bg-transparent"
                    >
                      <option value="ornek">Örnek fiş</option>
                      {durum.gecmis.slice(0, 5).map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.masaAdi} — {new Date(k.kapanisZamani).toLocaleDateString("tr-TR")}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex justify-center">
                  <div
                    style={{
                      width: isletme.kagitGenisligi === "58mm" ? 200 : 260,
                      background: "#fff",
                      color: "#111",
                      fontFamily: fisAyarlari.yaziTipi,
                      fontSize: fisAyarlari.urunYaziBoyutu,
                      fontWeight: fisAyarlari.kalinYazi ? 700 : 400,
                      padding: "14px 10px",
                      paddingLeft: `${10 + fisAyarlari.solBosluk * 3}px`,
                      paddingRight: `${10 + fisAyarlari.sagBosluk * 3}px`,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                      borderRadius: 2,
                    }}
                  >
                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: fisAyarlari.baslikYaziBoyutu, marginBottom: 4 }}>
                      {isletme.ad || "İşletme Adı"}
                    </div>
                    {isletme.adres && (
                      <div style={{ textAlign: "center", fontSize: fisAyarlari.baslikAltYaziBoyutu, marginBottom: 6 }}>
                        {isletme.adres}
                      </div>
                    )}
                    <div style={{ borderTop: "1px dashed #333", margin: "6px 0" }} />
                    {onizlemeKayit ? (
                      <>
                        {fisAyarlari.siparisNoGoster && onizlemeKayit.siparisNo && (
                          <div>Sipariş No: {onizlemeKayit.siparisNo}</div>
                        )}
                        <div>{onizlemeKayit.masaAdi}</div>
                        <div style={{ fontSize: fisAyarlari.altYaziBoyutu }}>
                          {new Date(onizlemeKayit.kapanisZamani).toLocaleString("tr-TR")}
                        </div>
                        <div style={{ borderTop: "1px dashed #333", margin: "6px 0" }} />
                        {onizlemeKayit.urunler.map((u, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{u.adet}x {u.ad}</span>
                            <span>{paraFormat(u.fiyat * u.adet)}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: "1px dashed #333", margin: "6px 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: fisAyarlari.toplamYaziBoyutu }}>
                          <span>TOPLAM</span>
                          <span>{paraFormat(onizlemeKayit.toplam)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Ödeme</span>
                          <span>{onizlemeKayit.yontem}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {fisAyarlari.siparisNoGoster && <div>Sipariş No: 119</div>}
                        <div>Masa 1</div>
                        <div style={{ fontSize: fisAyarlari.altYaziBoyutu }}>{new Date().toLocaleString("tr-TR")}</div>
                        <div style={{ borderTop: "1px dashed #333", margin: "6px 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>2x Adana Kebap</span>
                          <span>680,00₺</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>1x Ayran</span>
                          <span>40,00₺</span>
                        </div>
                        <div style={{ paddingLeft: 10, fontStyle: "italic" }}>* soğansız</div>
                        <div style={{ borderTop: "1px dashed #333", margin: "6px 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: fisAyarlari.toplamYaziBoyutu }}>
                          <span>TOPLAM</span>
                          <span>720,00₺</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Ödeme</span>
                          <span>Nakit</span>
                        </div>
                      </>
                    )}
                    {fisAyarlari.kdvGoster && (
                      <div style={{ fontSize: fisAyarlari.altYaziBoyutu, marginTop: 4 }}>KDV Fiyatlara Dahildir</div>
                    )}
                    <div style={{ textAlign: "center", fontSize: fisAyarlari.altYaziBoyutu, marginTop: 10 }}>Afiyet olsun!</div>
          {fisAyarlari.maliDegeriYoktur !== false && (
            <div style={{ textAlign: "center", fontSize: fisAyarlari.altYaziBoyutu, marginTop: 4 }}>Bilgi fişidir · Mali değeri yoktur</div>
          )}
                  </div>
                </div>
                <div className="text-[11px] opacity-50 text-center mt-3">
                  Bu, gerçek fişin {isletme.kagitGenisligi} kağıtta nasıl görüneceğinin bir önizlemesi. İşletme
                  adı/adres, yazı ayarları ve seçtiğin geçmiş sipariş değiştikçe burada anında güncellenir.
                </div>
              </div>

              <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-4 flex flex-col gap-3">
                <div className="text-sm font-medium">Yönetici PIN'i</div>
                <div className="text-xs opacity-60 -mt-2">
                  Ciro/menü/masa/yazıcı ayarlarına girmek için garsonlardan istenen PIN. Sadece sen bilmelisin.
                </div>
                <YoneticiPinDegistir mevcutPin={yoneticiPin} onKaydet={pinDegistir} />
              </div>

              <YedekKarti />

              <div style={{ background: RUST_BG, color: RUST }} className="rounded-lg p-4 text-xs leading-relaxed">
                Bu uygulama fişi, bilgisayarına bağlı yazıcı üzerinden tarayıcının yazdırma penceresiyle basar —
                80mm/58mm fiş yazıcısı sistemde kurulu bir yazıcı olarak tanımlıysa (çoğu USB fiş yazıcısında durum budur)
                sorunsuz çalışır. Yazıcıyı fiziksel olarak bilgisayarına/kasa cihazına bağlayıp önce işletim sisteminden
                (Windows/Mac) tanıtman gerekiyor; bu uygulama o kurulu yazıcıyı kullanır, ayrıca bir sürücü kurulumu yapmaz.
              </div>

              <div style={{ background: MOSS_BG, color: MOSS }} className="rounded-lg p-4 text-xs leading-relaxed">
                <b>Yasal bilgi:</b> Adisyo bir adisyon / sipariş takip programıdır. Bastığı fiş <b>bilgi fişidir</b>; yasal belge
                (yeni nesil ÖKC fişi ya da e-Arşiv/e-Fatura) yerine geçmez. Müşteriye yasal belge vermen gerekiyorsa
                mevcut ÖKC (yazar kasa) cihazını kullanmaya devam et. Fişteki "Mali değeri yoktur" yazısı bu yüzden varsayılan olarak açıktır.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- RAPOR & GEÇMİŞ GÖRÜNÜMÜ ---- */}
      {gorunum === "rapor" && (
        <div className="p-4 sm:p-6 max-w-2xl">
          <div className="flex gap-1 mb-3 flex-wrap" style={{ borderBottom: `1px solid ${LINE}` }}>
            {[
              { id: "bugun", ad: "Bugün" },
              { id: "hafta", ad: "Son 7 Gün" },
              { id: "gun", ad: "Gün Seç" },
              { id: "tum", ad: "Tümü" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setRaporFiltre(s.id)}
                style={{
                  color: raporFiltre === s.id ? WINE : INK,
                  borderColor: raporFiltre === s.id ? WINE : "transparent",
                }}
                className="text-sm font-medium px-3 pb-2.5 border-b-2 opacity-90"
              >
                {s.ad}
              </button>
            ))}
          </div>

          {raporFiltre === "gun" && (
            <div className="flex items-center gap-2 mb-5">
              <input
                type="date"
                value={secilenGunISO}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [yil, ay, gun] = e.target.value.split("-").map(Number);
                  setSecilenGunZamani(new Date(yil, ay - 1, gun).getTime());
                }}
                style={{ borderColor: LINE }}
                className="border rounded-lg px-3 py-2 text-sm outline-none"
              />
              <span className="text-xs opacity-60">
                {new Date(secilenGunZamani).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1">
            <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-3.5">
              <div className="text-xs opacity-60 mb-1">Toplam Ciro</div>
              <div className="text-lg font-semibold">{paraFormat(raporToplam)}</div>
              <div className="text-[11px] opacity-50 mt-0.5">{filtreliGecmis.length} hesap</div>
            </div>
            <div style={{ background: MOSS_BG }} className="rounded-lg p-3.5">
              <div className="text-xs opacity-70 mb-1" style={{ color: MOSS }}>Nakit</div>
              <div className="text-lg font-semibold" style={{ color: MOSS }}>{paraFormat(raporNakit)}</div>
            </div>
            <div style={{ background: RUST_BG }} className="rounded-lg p-3.5">
              <div className="text-xs opacity-70 mb-1" style={{ color: RUST }}>Kart</div>
              <div className="text-lg font-semibold" style={{ color: RUST }}>{paraFormat(raporKart)}</div>
            </div>
            <div style={{ background: "#EDE6F5" }} className="rounded-lg p-3.5">
              <div className="text-xs opacity-70 mb-1" style={{ color: "#5D3EBC" }}>Paket</div>
              <div className="text-lg font-semibold" style={{ color: "#5D3EBC" }}>{paraFormat(raporPaket)}</div>
            </div>
            <div style={{ background: "#FCE7DA" }} className="rounded-lg p-3.5">
              <div className="text-xs opacity-70 mb-1" style={{ color: "#B4530A" }}>Veresiye</div>
              <div className="text-lg font-semibold" style={{ color: "#B4530A" }}>{paraFormat(raporVeresiye)}</div>
            </div>
            </div>
            <button
              onClick={() => raporCsvIndir(filtreliGecmis)}
              style={{ borderColor: LINE }}
              className="border rounded-lg px-4 py-2.5 text-sm font-medium opacity-80 hover:opacity-100 whitespace-nowrap"
            >
              Excel'e Aktar (CSV)
            </button>
            <button
              onClick={raporPdfYazdir}
              style={{ borderColor: LINE }}
              className="border rounded-lg px-4 py-2.5 text-sm font-medium opacity-80 hover:opacity-100 whitespace-nowrap"
            >
              PDF / Yazdır
            </button>
          </div>

          <div style={{ background: CARD, borderColor: LINE }} className="rounded-lg border mb-6 overflow-hidden">
            <button
              onClick={() => setUrunRaporuAcik((a) => !a)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="text-sm font-medium">Ürün Bazlı Satışlar</div>
              {urunRaporuAcik ? <ChevronUp size={16} className="opacity-50" /> : <ChevronDown size={16} className="opacity-50" />}
            </button>
            {urunRaporuAcik && (
              <div style={{ borderTop: `1px solid ${LINE}` }}>
                {urunBazliSatis.length === 0 && (
                  <div className="text-xs opacity-50 text-center py-6">Seçili aralıkta satış yok.</div>
                )}
                {urunBazliSatis.map((u, i) => (
                  <div
                    key={u.ad}
                    style={{ borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span style={{ background: PAPER, color: INK }} className="text-[11px] font-semibold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm truncate">{u.ad}</span>
                    </div>
                    <span style={{ color: WINE }} className="text-sm font-semibold w-16 text-right shrink-0">
                      {u.adet} adet
                    </span>
                    <span className="text-xs opacity-55 w-20 text-right shrink-0">{paraFormat(u.ciro)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {filtreliGecmis.map((k) => {
              const acik = genisletilenFisId === k.id;
              return (
                <div key={k.id} style={{ background: CARD, borderColor: LINE }} className="rounded-lg border overflow-hidden">
                  <button
                    onClick={() => setGenisletilenFisId(acik ? null : k.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <div className="text-sm font-medium">{k.masaAdi}</div>
                      <div className="text-[11px] opacity-55 mt-0.5">
                        {new Date(k.kapanisZamani).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {"  ·  "}{k.yontem}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{paraFormat(k.toplam)}</span>
                      {acik ? <ChevronUp size={16} className="opacity-50" /> : <ChevronDown size={16} className="opacity-50" />}
                    </div>
                  </button>
                  {acik && (
                    <div style={{ borderTop: `1px solid ${LINE}` }} className="px-4 py-3 flex flex-col gap-1.5">
                      {k.urunler.map((u) => (
                        <div key={u.id} className="flex justify-between text-xs opacity-75">
                          <span>{u.adet}x {u.ad}</span>
                          <span>{paraFormat(u.fiyat * u.adet)}</span>
                        </div>
                      ))}
                      <button
                        onClick={() => fisYazdir(k)}
                        style={{ borderColor: WINE, color: WINE }}
                        className="border rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5 mt-2"
                      >
                        <Printer size={13} /> Fişi Yeniden Yazdır
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {filtreliGecmis.length === 0 && (
              <div className="text-sm opacity-50 text-center py-10">Bu aralıkta kapanmış hesap yok.</div>
            )}
          </div>
        </div>
      )}

      {/* ---- PAKET SİPARİŞLER (Uber Eats / Yemeksepeti / Getir Yemek) ---- */}
      {gorunum === "paket" && (
        <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-5">
          {/* Sol/ana alan: Paket kutucukları (masalar ile aynı mantık) */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium opacity-70">Paket Kutucukları</div>
              <button
                onClick={paketSimuleEt}
                style={{ color: WINE }}
                className="text-xs font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                title="Bağlantı olmadan test siparişi oluştur"
              >
                <Package size={13} /> Test siparişi
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {Array.from({ length: kutuSayisi }, (_, i) => i + 1).map((no) => {
                const paket = paketSiparisler.find((p) => p.kutuNo === no);
                const dolu = !!paket;
                const plt = paket && PAKET_PLATFORMLAR.find((x) => x.ad === paket.platform);
                return (
                  <div
                    key={no}
                    onClick={() => kutuAc(no)}
                    role="button"
                    tabIndex={0}
                    style={{ background: CARD, borderColor: dolu ? (plt?.bg || WINE) : LINE, borderWidth: dolu ? 2 : 1 }}
                    className="relative text-left rounded-lg p-2 hover:shadow-md transition-shadow aspect-square flex flex-col justify-between cursor-pointer select-none"
                  >
                    <div>
                      <div className="font-medium text-xs">Kutu {no}</div>
                      {dolu ? (
                        <>
                          <span
                            style={{ background: plt?.bg || WINE, color: plt?.fg || "#fff" }}
                            className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded mt-1 leading-tight"
                          >
                            {paket.platform}
                          </span>
                          <div className="text-xs font-semibold mt-1">{paraFormat(paket.toplam)}</div>
                          <div style={{ color: paket.durum === "yolda" ? MOSS : RUST }} className="text-[9px] font-medium mt-0.5">
                            {paket.durum === "yolda" ? "Yola çıktı" : "Bekliyor"}
                          </div>
                        </>
                      ) : (
                        <div style={{ color: MOSS }} className="text-[10px] mt-0.5 font-medium">Boş</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ taraf: platform siparişleri - Bekleyen / Yola Çıktı akışı */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ background: RUST }} className="w-2 h-2 rounded-full" />
                <div className="text-sm font-medium">Bekleyen Paketler ({bekleyenPaketler.length})</div>
              </div>
              <div className="flex flex-col gap-2">
                {bekleyenPaketler.map((p) => {
                  const plt = PAKET_PLATFORMLAR.find((x) => x.ad === p.platform);
                  return (
                    <div key={p.id} style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ background: plt?.bg || WINE, color: plt?.fg || "#fff" }} className="text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          {p.platform}{p.kutuNo ? ` · Kutu ${p.kutuNo}` : ""}
                        </span>
                        <span className="text-[10px] opacity-55">
                          {new Date(p.olusturmaZamani).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="text-xs opacity-70 mb-2">
                        {p.urunler.map((u) => `${u.adet}x ${u.ad}`).join(", ")}
                      </div>
                      {p.not && (
                        <div style={{ color: RUST }} className="text-[11px] italic mb-2 leading-snug">📍 {p.not}</div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{paraFormat(p.toplam)}</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              fisYazdir({ id: p.id, masaAdi: `${p.platform} Siparişi`, urunler: p.urunler, toplam: p.toplam, yontem: p.platform, kapanisZamani: p.olusturmaZamani, not: p.not })
                            }
                            title="Yazdır"
                            style={{ borderColor: LINE }}
                            className="p-1.5 rounded border opacity-70 hover:opacity-100"
                          >
                            <Printer size={12} />
                          </button>
                          <button
                            onClick={() => paketYolaCikar(p.id)}
                            title="Yola Çıkar"
                            style={{ background: MOSS }}
                            className="text-white text-[11px] font-medium rounded px-2 py-1.5 flex items-center gap-1"
                          >
                            <Truck size={12} /> Yola Çıkar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {bekleyenPaketler.length === 0 && (
                  <div className="text-xs opacity-45 text-center py-4">Bekleyen paket yok.</div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ background: MOSS }} className="w-2 h-2 rounded-full" />
                <div className="text-sm font-medium">Yola Çıktı ({yoldakiPaketler.length})</div>
              </div>
              <div className="flex flex-col gap-2">
                {yoldakiPaketler.map((p) => {
                  const plt = PAKET_PLATFORMLAR.find((x) => x.ad === p.platform);
                  return (
                    <div key={p.id} style={{ background: CARD, borderColor: LINE }} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ background: plt?.bg || WINE, color: plt?.fg || "#fff" }} className="text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          {p.platform}{p.kutuNo ? ` · Kutu ${p.kutuNo}` : ""}
                        </span>
                        <span className="text-xs font-semibold">{paraFormat(p.toplam)}</span>
                      </div>
                      {p.not && (
                        <div style={{ color: RUST }} className="text-[11px] italic mb-2 leading-snug">📍 {p.not}</div>
                      )}
                      <button
                        onClick={() => paketTeslimEt(p.id)}
                        style={{ background: WINE }}
                        className="w-full text-white text-xs font-medium rounded py-1.5 flex items-center justify-center gap-1.5"
                      >
                        <Check size={13} /> Teslim Et
                      </button>
                    </div>
                  );
                })}
                {yoldakiPaketler.length === 0 && (
                  <div className="text-xs opacity-45 text-center py-4">Yolda paket yok.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Kutucuk çekmecesi: yeni paket oluştur / mevcut paketi düzenle ---- */}
      {seciliKutuNo !== null && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={kutuKapat} />
          <div style={{ background: PAPER }} className="relative w-full sm:w-[420px] h-full flex flex-col shadow-xl">
            <div style={{ borderBottom: `1px solid ${LINE}` }} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-sm font-semibold">Kutu {seciliKutuNo}</div>
                {seciliPaket && (
                  <div style={{ color: seciliPaket.durum === "yolda" ? MOSS : RUST }} className="text-[11px] font-medium">
                    {seciliPaket.durum === "yolda" ? "Yola çıktı" : "Bekliyor"}
                  </div>
                )}
              </div>
              <button onClick={kutuKapat} className="opacity-60 hover:opacity-100 p-1">
                <X size={18} />
              </button>
            </div>

            {!seciliPaket && (
              <div className="px-4 pt-3">
                <div className="text-xs font-medium opacity-60 mb-1.5">
                  Nereden geldi? <span className="opacity-60">(seçmezsen "Restoran Paketi" olarak kaydedilir)</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {PAKET_PLATFORMLAR.map((plt) => (
                    <button
                      key={plt.ad}
                      onClick={() => setPaketPlatformSecim(paketPlatformSecim === plt.ad ? null : plt.ad)}
                      style={{
                        background: paketPlatformSecim === plt.ad ? plt.bg : "transparent",
                        color: paketPlatformSecim === plt.ad ? plt.fg : INK,
                        borderColor: plt.bg,
                      }}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-full border"
                    >
                      {plt.ad}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 pt-3">
              <div className="text-xs font-medium opacity-60 mb-1.5">Sipariş Notu (adres, telefon, teslimat notu)</div>
              <textarea
                value={paketSiparisNotu}
                onChange={(e) => paketNotuDegistir(e.target.value)}
                placeholder="Örn. Sahil Cad. No:12, Kat 3 · 0532 000 00 00 · zili çalışmıyor kapıyı çalın"
                rows={2}
                style={{ borderColor: LINE }}
                className="border rounded-lg px-3 py-2 text-xs w-full outline-none resize-none"
              />
            </div>

            {seciliPaket && seciliPaket.urunler.length > 0 && (
              <div style={{ borderBottom: `1px solid ${LINE}` }} className="px-4 py-3 mt-1 flex flex-col gap-1">
                {seciliPaket.urunler.map((u) => (
                  <div key={u.id}>
                    <div className="flex justify-between text-xs opacity-75">
                      <span>{u.adet}x {u.ad}</span>
                      <span>{paraFormat(u.fiyat * u.adet)}</span>
                    </div>
                    {u.not && <div style={{ color: RUST }} className="text-[11px] italic pl-1">* {u.not}</div>}
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1.5 mt-1" style={{ borderTop: `1px dashed ${LINE}` }}>
                  <span>Toplam</span>
                  <span>{paraFormat(seciliPaket.toplam)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-1 px-4 pt-3 overflow-x-auto" style={{ borderBottom: `1px solid ${LINE}` }}>
              {menu.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setPaketAktifKategoriId(k.id)}
                  style={{
                    color: paketAktifKategoriId === k.id ? WINE : INK,
                    borderColor: paketAktifKategoriId === k.id ? WINE : "transparent",
                  }}
                  className="whitespace-nowrap text-xs font-medium px-3 pb-2.5 border-b-2 opacity-90"
                >
                  {k.kategori}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
              {(menu.find((k) => k.id === paketAktifKategoriId)?.urunler || []).map((urun) => (
                <button
                  key={urun.id}
                  onClick={() => paketSepeteEkle(urun)}
                  style={{ background: CARD, borderColor: LINE }}
                  className="text-left rounded-lg border p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="text-sm font-medium leading-snug">{urun.ad}</div>
                  <div className="text-xs opacity-60 mt-1">{paraFormat(urun.fiyat)}</div>
                </button>
              ))}
            </div>

            <div style={{ borderTop: `1px solid ${LINE}`, background: CARD }} className="max-h-[32%] overflow-y-auto">
              {paketSepetListesi.length > 0 && (
                <div className="px-4 pt-3 flex flex-col gap-2">
                  {paketSepetListesi.map((u) => (
                    <div key={u.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex-1">{u.ad}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => paketSepettenCikar(u.id)} style={{ borderColor: LINE }} className="w-6 h-6 rounded-full border flex items-center justify-center">
                            <Minus size={11} />
                          </button>
                          <span className="w-4 text-center text-xs">{u.adet}</span>
                          <button onClick={() => paketSepeteEkle(u)} style={{ background: WINE }} className="w-6 h-6 rounded-full flex items-center justify-center">
                            <Plus size={11} color="white" />
                          </button>
                        </div>
                        <span className="w-16 text-right text-xs opacity-70">{paraFormat(u.fiyat * u.adet)}</span>
                      </div>
                      <input
                        value={paketSepetNotlar[u.id] || ""}
                        onChange={(e) => paketSepetNotYaz(u.id, e.target.value)}
                        placeholder="Not ekle (örn. soğansız)"
                        style={{ borderColor: LINE }}
                        className="border rounded px-2 py-1 text-xs outline-none w-full opacity-80"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="p-4 flex flex-col gap-2">
                {paketSepetListesi.length > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Yeni Ekleme Toplamı</span>
                    <span>{paraFormat(paketSepetToplam)}</span>
                  </div>
                )}
                <button
                  onClick={paketeUrunEkle}
                  disabled={paketSepetListesi.length === 0}
                  style={{ background: WINE }}
                  className="text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-40"
                >
                  {seciliPaket ? "Siparişe Ekle" : "Paketi Oluştur"}
                </button>

                {seciliPaket && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() =>
                        fisYazdir({ id: seciliPaket.id, masaAdi: `${seciliPaket.platform} Siparişi`, urunler: seciliPaket.urunler, toplam: seciliPaket.toplam, yontem: seciliPaket.platform, kapanisZamani: seciliPaket.olusturmaZamani, not: seciliPaket.not })
                      }
                      style={{ borderColor: WINE, color: WINE }}
                      className="flex-1 border rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Printer size={13} /> Yazdır
                    </button>
                    {seciliPaket.durum === "yolda" ? (
                      <button
                        onClick={() => paketTeslimEt(seciliPaket.id)}
                        style={{ background: MOSS }}
                        className="flex-1 text-white rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5"
                      >
                        <Check size={13} /> Teslim Et
                      </button>
                    ) : (
                      <button
                        onClick={() => paketYolaCikar(seciliPaket.id)}
                        style={{ background: MOSS }}
                        className="flex-1 text-white rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5"
                      >
                        <Truck size={13} /> Yola Çıkar
                      </button>
                    )}
                    <button
                      onClick={() => paketIptalEt(seciliPaket.id)}
                      title="İptal Et"
                      style={{ borderColor: RUST, color: RUST }}
                      className="border rounded-lg py-2 px-3 text-xs font-medium"
                    >
                      <Ban size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {sifirlaOnay && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div style={{ background: CARD }} className="rounded-lg p-5 max-w-sm w-full">
            <div className="font-medium text-sm mb-1.5">Tüm veriler silinsin mi?</div>
            <div className="text-xs opacity-60 mb-4">Masalar, menü ve satış geçmişi varsayılana dönecek. Bu işlem geri alınamaz.</div>
            <div className="flex gap-2">
              <button onClick={() => setSifirlaOnay(false)} className="flex-1 text-xs py-2 rounded border" style={{ borderColor: LINE }}>
                Vazgeç
              </button>
              <button onClick={verileriSifirla} style={{ background: RUST }} className="flex-1 text-xs py-2 rounded text-white">
                Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}

      {iptalOnayMasaId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div style={{ background: CARD }} className="rounded-lg p-5 max-w-sm w-full">
            <div className="font-medium text-sm mb-1.5">Siparişi iptal et?</div>
            <div className="text-xs opacity-60 mb-4">
              {durum.masalar.find((m) => m.id === iptalOnayMasaId)?.ad} masasındaki açık sipariş silinecek ve ciroya eklenmeyecek.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIptalOnayMasaId(null)} className="flex-1 text-xs py-2 rounded border" style={{ borderColor: LINE }}>
                Vazgeç
              </button>
              <button onClick={iptalOnayla} style={{ background: RUST }} className="flex-1 text-xs py-2 rounded text-white">
                Siparişi Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- SİPARİŞ ÇEKMECESİ ---- */}
      {seciliMasa && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={drawerKapat} />
          <div style={{ background: PAPER }} className="relative w-full sm:max-w-2xl h-full flex flex-col shadow-2xl">
            <div style={{ borderBottom: `1px solid ${LINE}`, background: CARD }} className="flex items-center gap-3 px-4 py-3.5">
              <button onClick={drawerKapat} className="opacity-60 hover:opacity-100">
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1">
                <div className="font-semibold text-sm">{seciliMasa.ad}</div>
                {seciliMasa.acilisZamani && (
                  <div className="text-[11px] opacity-55">{gecenSure(seciliMasa.acilisZamani, simdi)} önce açıldı</div>
                )}
              </div>
              {seciliMasa.urunler.length > 0 && !odenenFis && (
                <div className="relative">
                  <button
                    onClick={() => setMasaIslemMenuAcik((a) => !a)}
                    className="opacity-60 hover:opacity-100 px-2 py-1 text-xs border rounded"
                    style={{ borderColor: LINE }}
                  >
                    Taşı / Birleştir
                  </button>
                  {masaIslemMenuAcik && (
                    <div
                      style={{ background: CARD, borderColor: LINE }}
                      className="absolute right-0 mt-1 w-56 border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                    >
                      <div className="text-[11px] opacity-50 px-3 pt-2 pb-1">Boş masaya taşı</div>
                      {durum.masalar.filter((m) => m.durum === "bos" && m.id !== seciliMasa.id).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => masayiTasi(m.id)}
                          className="block w-full text-left text-sm px-3 py-1.5 hover:bg-black/5"
                        >
                          {m.ad}
                        </button>
                      ))}
                      {durum.masalar.filter((m) => m.durum === "bos" && m.id !== seciliMasa.id).length === 0 && (
                        <div className="text-xs opacity-40 px-3 pb-1">Boş masa yok</div>
                      )}
                      <div className="text-[11px] opacity-50 px-3 pt-2 pb-1 border-t" style={{ borderColor: LINE }}>
                        Dolu masayla birleştir
                      </div>
                      {durum.masalar.filter((m) => m.durum === "dolu" && m.id !== seciliMasa.id).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => masalariBirlestir(m.id)}
                          className="block w-full text-left text-sm px-3 py-1.5 hover:bg-black/5"
                        >
                          {m.ad}
                        </button>
                      ))}
                      {durum.masalar.filter((m) => m.durum === "dolu" && m.id !== seciliMasa.id).length === 0 && (
                        <div className="text-xs opacity-40 px-3 pb-1">Dolu başka masa yok</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button onClick={drawerKapat} className="opacity-40 hover:opacity-80">
                <X size={18} />
              </button>
            </div>

            {odenenFis ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div style={{ background: MOSS_BG }} className="w-14 h-14 rounded-full flex items-center justify-center mb-4">
                  <CreditCard size={24} color={MOSS} style={{ display: odenenFis.yontem === "Nakit" ? "none" : "block" }} />
                  <Banknote size={24} color={MOSS} style={{ display: odenenFis.yontem === "Nakit" ? "block" : "none" }} />
                </div>
                <div className="text-sm font-medium mb-1">Ödeme alındı</div>
                <div className="text-xs opacity-60 mb-6">{odenenFis.masaAdi} · {paraFormat(odenenFis.toplam)} · {odenenFis.yontem}</div>
                <button
                  onClick={() => fisYazdir(odenenFis)}
                  style={{ background: WINE }}
                  className="text-white text-sm font-medium rounded-lg py-2.5 px-6 flex items-center justify-center gap-2 mb-3 w-full max-w-[220px]"
                >
                  <Printer size={15} /> Fişi Yazdır
                </button>
                <button onClick={drawerKapat} className="text-xs opacity-60">
                  Tamam, masaya dön
                </button>
              </div>
            ) : !odemeEkrani ? (
              <>
                <div className="flex gap-1 px-3 pt-3" style={{ borderBottom: `1px solid ${LINE}` }}>
                  <button
                    onClick={() => setDrawerSekme("ekle")}
                    style={{ color: drawerSekme === "ekle" ? WINE : INK, borderColor: drawerSekme === "ekle" ? WINE : "transparent" }}
                    className="text-sm font-medium px-3 pb-2.5 border-b-2 opacity-90"
                  >
                    Sipariş Ekle
                  </button>
                  <button
                    onClick={() => acikSiparis.length > 0 && setDrawerSekme("ode")}
                    style={{
                      color: drawerSekme === "ode" ? WINE : INK,
                      borderColor: drawerSekme === "ode" ? WINE : "transparent",
                      opacity: acikSiparis.length === 0 ? 0.35 : 0.9,
                    }}
                    className="text-sm font-medium px-3 pb-2.5 border-b-2"
                  >
                    Öde
                  </button>
                </div>

                {drawerSekme === "ekle" ? (
                  <>
                    <div className="flex gap-1 px-3 pt-3 overflow-x-auto" style={{ borderBottom: `1px solid ${LINE}` }}>
                      {menu.map((k) => (
                        <button
                          key={k.id}
                          onClick={() => setAktifKategoriId(k.id)}
                          style={{
                            color: aktifKategoriId === k.id ? WINE : INK,
                            borderColor: aktifKategoriId === k.id ? WINE : "transparent",
                          }}
                          className="whitespace-nowrap text-xs font-medium px-3 pb-2.5 border-b-2 opacity-90"
                        >
                          {k.kategori}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
                      {(menu.find((k) => k.id === aktifKategoriId)?.urunler || []).map((urun) => {
                        const sepettekiAdet = sepet[urun.id] || 0;
                        const stokVar = urun.stokAdedi == null || urun.stokAdedi - sepettekiAdet > 0;
                        return (
                          <button
                            key={urun.id}
                            onClick={() => stokVar && sepeteEkle(urun)}
                            disabled={!stokVar}
                            style={{ background: CARD, borderColor: LINE, opacity: stokVar ? 1 : 0.4 }}
                            className="text-left rounded-lg border p-3 hover:shadow-sm transition-shadow disabled:cursor-not-allowed"
                          >
                            <div className="text-sm font-medium leading-snug">{urun.ad}</div>
                            <div className="text-xs opacity-60 mt-1 flex items-center justify-between">
                              <span>{paraFormat(urun.fiyat)}</span>
                              {urun.stokAdedi != null && (
                                <span style={{ color: urun.stokAdedi - sepettekiAdet <= 0 ? RUST : undefined }}>
                                  {urun.stokAdedi - sepettekiAdet <= 0 ? "Tükendi" : `Stok: ${urun.stokAdedi - sepettekiAdet}`}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {menu.length === 0 && (
                        <div className="col-span-2 text-xs opacity-50 text-center py-6">
                          Henüz menü eklenmedi. Yönetim → Menü sekmesinden ekleyebilirsin.
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: `1px solid ${LINE}`, background: CARD }} className="max-h-[38%] overflow-y-auto">
                      {sepetListesi.length > 0 && (
                        <div className="px-4 pt-3 flex flex-col gap-2">
                          {sepetListesi.map((u) => (
                            <div key={u.id} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex-1">{u.ad}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => sepettenCikar(u.id)} style={{ borderColor: LINE }} className="w-6 h-6 rounded-full border flex items-center justify-center">
                                    <Minus size={11} />
                                  </button>
                                  <span className="w-4 text-center text-xs">{u.adet}</span>
                                  <button onClick={() => sepeteEkle(u)} style={{ background: WINE }} className="w-6 h-6 rounded-full flex items-center justify-center">
                                    <Plus size={11} color="white" />
                                  </button>
                                </div>
                                <span className="w-16 text-right text-xs opacity-70">{paraFormat(u.fiyat * u.adet)}</span>
                              </div>
                              <input
                                value={sepetNotlar[u.id] || ""}
                                onChange={(e) => sepetNotYaz(u.id, e.target.value)}
                                placeholder="Not ekle (örn. soğansız)"
                                style={{ borderColor: LINE }}
                                className="border rounded px-2 py-1 text-xs outline-none w-full opacity-80"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Yeni Ekleme Toplamı</span>
                          <span>{paraFormat(sepetToplam)}</span>
                        </div>
                        <button
                          onClick={siparisiGonder}
                          disabled={sepetListesi.length === 0}
                          style={{ background: WINE }}
                          className="text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-40"
                        >
                          Siparişi Mutfağa Gönder
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs opacity-60">Ödenecek kalemleri seç — ayrı ayrı ödeyebilirler</div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={tumunuSec} className="text-xs font-medium" style={{ color: WINE }}>
                          Tümünü Seç
                        </button>
                        <button onClick={secimiTemizle} className="text-xs opacity-50">
                          Temizle
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {acikSiparis.map((u) => {
                        const secilen = odemeSecim[u.id] || 0;
                        return (
                          <div
                            key={u.id}
                            style={{ background: CARD, borderColor: secilen > 0 ? WINE : LINE }}
                            className="rounded-lg border px-3 py-2.5 flex items-center gap-3"
                          >
                            <div className="flex-1">
                              <div className="text-sm">{u.ad}</div>
                              <div className="text-[11px] opacity-55">{paraFormat(u.fiyat)} · toplam {u.adet} adet</div>
                              {u.not && <div style={{ color: RUST }} className="text-[11px] italic mt-0.5">* {u.not}</div>}
                            </div>
                            <button
                              onClick={() => odemeAdetDegistir(u.id, -1)}
                              disabled={secilen <= 0}
                              style={{ borderColor: LINE }}
                              className="w-6 h-6 rounded-full border flex items-center justify-center disabled:opacity-30"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-4 text-center text-xs">{secilen}</span>
                            <button
                              onClick={() => odemeAdetDegistir(u.id, 1)}
                              disabled={secilen >= u.adet}
                              style={{ background: WINE }}
                              className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
                            >
                              <Plus size={11} color="white" />
                            </button>
                          </div>
                        );
                      })}
                      {acikSiparis.length === 0 && (
                        <div className="text-xs opacity-50 text-center py-6">Bu masada açık sipariş yok.</div>
                      )}
                    </div>

                    <div className="mt-auto pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
                      <div className="flex justify-between text-sm font-semibold mb-3">
                        <span>Seçili Tutar</span>
                        <span>{paraFormat(seciliToplam)}</span>
                      </div>
                      <button
                        onClick={() => setOdemeEkrani(true)}
                        disabled={seciliToplam <= 0}
                        style={{ background: WINE }}
                        className="w-full text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-40"
                      >
                        Seçilenleri Öde
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col p-5">
                <div className="text-xs opacity-60 mb-1">{seciliMasa.ad} · Ödenecek Tutar</div>
                <div className="text-4xl font-semibold mb-8">{paraFormat(seciliToplam)}</div>

                {!veresiyeSecimAcik ? (
                  <>
                    <div className="text-xs opacity-60 mb-2">Ödeme yöntemi seç</div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => hesabiKapat("Nakit")}
                        style={{ background: MOSS_BG, borderColor: MOSS }}
                        className="rounded-lg border-2 py-5 flex flex-col items-center gap-2"
                      >
                        <Banknote size={22} color={MOSS} />
                        <span className="text-sm font-medium" style={{ color: MOSS }}>Nakit</span>
                      </button>
                      <button
                        onClick={() => hesabiKapat("Kart")}
                        style={{ background: MOSS_BG, borderColor: MOSS }}
                        className="rounded-lg border-2 py-5 flex flex-col items-center gap-2"
                      >
                        <CreditCard size={22} color={MOSS} />
                        <span className="text-sm font-medium" style={{ color: MOSS }}>Kart</span>
                      </button>
                    </div>
                    <button
                      onClick={() => setVeresiyeSecimAcik(true)}
                      style={{ borderColor: LINE }}
                      className="rounded-lg border-2 py-4 mt-3 text-sm font-medium opacity-80"
                    >
                      Veresiye (Müşteri Hesabına Yaz)
                    </button>
                    <div className="mb-auto" />
                  </>
                ) : (
                  <>
                    <div className="text-xs opacity-60 mb-2">Müşteri seç</div>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto mb-3">
                      {musteriler.length === 0 && (
                        <div className="text-xs opacity-40">Henüz kayıtlı müşteri yok, aşağıdan ekle.</div>
                      )}
                      {musteriler.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => hesabiKapat("Veresiye", m.id)}
                          style={{ borderColor: LINE }}
                          className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-black/5"
                        >
                          <span>{m.ad}</span>
                          <span className="opacity-60">
                            {m.bakiye > 0 ? `Mevcut borç: ${paraFormat(m.bakiye)}` : "Borcu yok"}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="text-xs opacity-60 mb-1">Yeni müşteri ekle</div>
                    <div className="flex flex-col gap-2 mb-3">
                      <input
                        value={yeniMusteriAdi}
                        onChange={(e) => setYeniMusteriAdi(e.target.value)}
                        placeholder="Ad Soyad"
                        style={{ borderColor: LINE }}
                        className="border rounded px-3 py-2 text-sm outline-none"
                      />
                      <input
                        value={yeniMusteriTel}
                        onChange={(e) => setYeniMusteriTel(e.target.value)}
                        placeholder="Telefon (opsiyonel)"
                        style={{ borderColor: LINE }}
                        className="border rounded px-3 py-2 text-sm outline-none"
                      />
                      <button
                        onClick={() => {
                          const id = musteriEkle(yeniMusteriAdi, yeniMusteriTel);
                          if (id) {
                            setYeniMusteriAdi("");
                            setYeniMusteriTel("");
                            hesabiKapat("Veresiye", id);
                          }
                        }}
                        disabled={!yeniMusteriAdi.trim()}
                        style={{ background: WINE }}
                        className="text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40"
                      >
                        Ekle ve Veresiye Yaz
                      </button>
                    </div>
                    <button onClick={() => setVeresiyeSecimAcik(false)} className="text-xs opacity-60 self-center">
                      ← Ödeme yöntemine geri dön
                    </button>
                    <div className="mb-auto" />
                  </>
                )}

                <button
                  onClick={() => {
                    setOdemeEkrani(false);
                    setVeresiyeSecimAcik(false);
                  }}
                  className="text-xs opacity-60 mt-6 self-center"
                >
                  ← Geri dön
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
