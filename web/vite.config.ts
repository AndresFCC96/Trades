import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }),
    react(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // Pasa todo lo no-ws al FastAPI local
      '/pipeline': 'http://localhost:8001',
      '/reports': 'http://localhost:8001',
      '/audit': 'http://localhost:8001',
      '/sources': 'http://localhost:8001',
      '/kafka': 'http://localhost:8001',
      '/health': 'http://localhost:8001',
      '/ws': { target: 'ws://localhost:8001', ws: true },
    },
  },
});
