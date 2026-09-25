import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adisyo.app',
  appName: 'Adisyo',
  webDir: 'www',
  // Kafenin yerel ağındaki sunucuya (http://192.168.x.x:4000) bağlanabilmek için:
  // Android varsayılan olarak sadece https'e izin verir, http (cleartext) açıyoruz.
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['*'],
  },
};

export default config;
