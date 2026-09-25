import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  // Derlenen (build) dosyalar doğrudan backend'in servis ettiği klasöre
  // yazılır. Böylece tek bir sunucu (backend) hem API'yi hem de ekranı
  // aynı adresten (aynı port) sunar - kafede tek şey çalıştırman yeterli olur.
  build: {
    outDir: "../backend/public",
    emptyOutDir: true,
  },
});
