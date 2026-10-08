/// <reference types="vitest" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      base: './',
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        lang: 'zh-CN',
        name: 'LiveBetter 高性价比人生指南',
        short_name: 'LiveBetter',
        start_url: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#228b22',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,json}'] },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: './tests/setup.ts' },
})
