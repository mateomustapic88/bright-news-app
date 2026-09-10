import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { loadHomepageStories, renderHomepageSnapshot } from './scripts/lib/homepage-seo.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'homepage-snapshot',
    apply: 'build',
    async transformIndexHtml(html) {
      let stories = []
      try {
        stories = await loadHomepageStories({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env })
      } catch (error) {
        console.warn(`[homepage-snapshot] ${error.message} Keeping the static brand and navigation content.`)
      }
      return html.replace('<!--home-snapshot-->', renderHomepageSnapshot(stories))
    },
  }],
  server: {
    port: 5173,
    strictPort: true,
  },
}))
