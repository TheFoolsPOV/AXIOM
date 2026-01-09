
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import EnvironmentPlugin from 'vite-plugin-environment';

export default defineConfig({
  plugins: [
    react(),
    // This ensures process.env.API_KEY is replaced during the Cloudflare build
    EnvironmentPlugin(['API_KEY'])
  ],
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
