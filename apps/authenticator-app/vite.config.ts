import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

function normalizeViteBase(p: string | undefined): string {
  if (!p || p === '/') return '/';
  if (p.includes('Program Files')) {
    throw new Error('MSYS2 path corruption detected on BASE_PATH: ' + p + '. Use PowerShell to build.');
  }
  return p.replace(/\/$/, '') + '/';
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      includeAssets: ['/icon-192.svg', '/icon-512.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // API/授权/推送请求绝不进入 SPA fallback（原 /api/ 前缀错误，真实前缀是 /bff/）
        runtimeCaching: [
          { urlPattern: /^\/bff\/.*/, handler: 'NetworkOnly' },
          { urlPattern: /^\/oauth\/.*/, handler: 'NetworkOnly' },
          { urlPattern: /^\/push\/.*/, handler: 'NetworkOnly' },
        ],
        // 显式 navigationFallback：SPA 子路由离线刷新回落到 index.html（React Router 接管）
        // denylist 排除非 SPA 路径：/bff /oauth /push + 静态资源扩展名
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /^\/bff\//,
          /^\/oauth\//,
          /^\/push\//,
          /\.(?:js|css|png|svg|woff2)$/,
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: normalizeViteBase(process.env.BASE_PATH),
  resolve: {
    extensions: ['.mjs', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {'@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 13108,
    proxy: {
      '/bff': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
      '/oauth/': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
      '/push/': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 13108,
    proxy: {
      '/bff': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
      '/oauth/': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
      '/push/': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
