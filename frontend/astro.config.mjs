import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
// Vercel adapter (Vercel için) - Netlify için gerekli değil
// import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig({
  integrations: [react()],
  // adapter: vercel(), // Vercel için - Netlify için kaldırıldı
  vite: {
    plugins: [
      tailwindcss(),
      // Production build'de console.log'ları kaldır
      removeConsole({
        includes: ['log', 'debug', 'info'],
        // error ve warn'i koru (production'da gerekli)
        exclude: ['error', 'warn'],
      }),
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    optimizeDeps: {
      include: [
        'zod',
        'chart.js',
        'react-chartjs-2',
        'clsx',
        '@tanstack/react-query',
        '@supabase/supabase-js',
      ],
      exclude: [],
      force: true, // Cache'i zorla yenile (ilk başlatmada)
    },
    css: {
      devSourcemap: false, // Dev modda CSS sourcemap'i kapat (performans için)
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
      fs: {
        // Dosya sistemi erişimini sınırla (güvenlik ve performans için)
        strict: true,
      },
      watch: {
        // Watch modunu optimize et
        ignored: ['**/node_modules/**', '**/.git/**', '**/.astro/**'],
      },
    },
    build: {
      // Production build optimizasyonları
      minify: 'terser',
      cssCodeSplit: true, // CSS'i ayrı dosyalara böl (cache için)
    },
  },
});