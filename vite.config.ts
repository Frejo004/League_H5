import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons.svg', 'logo-h5.png'],
      // Fix warning "inlineDynamicImports is deprecated" — vite-plugin-pwa 1.3+
      // Le SW n'utilise pas de dynamic imports, on désactive le code splitting.
      injectManifest: {
        rollupFormat: 'iife',
        // Ne pas précacher les pages réservées admin/capitaine : la grande
        // majorité des visiteurs (spectateurs, joueurs) ne les visitent
        // jamais. Elles restent chargées à la demande (React.lazy) et mises
        // en cache à l'exécution au premier accès plutôt qu'à l'installation.
        globIgnores: ['**/assets/AdminPage-*.js', '**/assets/CaptainPage-*.js'],
      },
      manifest: {
        name: 'League H5',
        short_name: 'League H5',
        description: 'Gestion de ligue de football H5 — matchs, classement, stats en direct',
        theme_color: '#0D1117',
        background_color: '#0D1117',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'fr',
        icons: [
          {
            src: '/logo-h5.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/logo-h5.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Matchs',
            short_name: 'Matchs',
            url: '/matches',
            icons: [{ src: '/logo-h5.png', sizes: '96x96' }],
          },
          {
            name: 'Classement',
            short_name: 'Classement',
            url: '/standings',
            icons: [{ src: '/logo-h5.png', sizes: '96x96' }],
          },
          {
            name: 'Messages',
            short_name: 'Messages',
            url: '/chat',
            icons: [{ src: '/logo-h5.png', sizes: '96x96' }],
          },
        ],
        categories: ['sports', 'social'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase-vendor'
          if (id.includes('framer-motion')) return 'motion-vendor'
          if (id.includes('react-router')) return 'router-vendor'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
        },
      },
    },
  },
})
