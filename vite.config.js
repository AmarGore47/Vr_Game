import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
    host: true, // expose to local network so Quest 3S can connect
    port: 5173,
  },
});
