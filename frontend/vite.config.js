import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // App manifest configuration
      manifest: {
        name: 'Smart Employee Self-Service Portal',
        short_name: 'Smart ESS',
        description: 'A comprehensive employee self-service portal for attendance, leave, payroll, and more',
        theme_color: '#2f5ef7',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        categories: ['business', 'productivity'],
        screenshots: [
          {
            src: '/logo.svg',
            sizes: '540x720',
            form_factor: 'narrow',
            type: 'image/svg+xml'
          }
        ]
      },
      // Service worker registration and update strategy
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        // Cache strategies for different file types
        globPatterns: [
          '**/*.{js,css,html,ico,svg,woff,woff2,ttf,eot}'
        ],
        runtimeCaching: []
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
});
