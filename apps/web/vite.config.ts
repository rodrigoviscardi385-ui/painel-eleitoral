import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://191.252.201.102',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://191.252.201.102',
        changeOrigin: true,
      },
    },
  },
});
