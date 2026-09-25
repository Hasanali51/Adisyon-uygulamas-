const { contextBridge, ipcRenderer } = require("electron");

// Renderer (React) tarafına, güvenli/sınırlı bir köprüyle sadece ihtiyaç
// duyduğu iki fonksiyonu açıyoruz: yazıcıları listele ve ham (ESC/POS)
// veri gönder. nodeIntegration hâlâ kapalı, contextIsolation hâlâ açık —
// yani renderer'a Node/Electron'un tamamını değil, sadece bunları veriyoruz.
contextBridge.exposeInMainWorld("adisyo", {
  yazicilariListele: () => ipcRenderer.invoke("yazicilari-listele"),
  hamYazdir: (yaziciAdi, base64Veri) => ipcRenderer.invoke("ham-yazdir", { yaziciAdi, base64Veri }),
});
