import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { loadHomepageStories, renderHomepageSnapshot } from './scripts/lib/homepage-seo.mjs'
import { LOCALIZED_SEO_PAGES } from './src/brightnews/seoLanguages.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'localized-seo-preview',
    configurePreviewServer(server) {
      // Mirror the explicit Vercel rewrites instead of preview's SPA fallback.
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const page = LOCALIZED_SEO_PAGES.find(item => item.path === url.pathname.replace(/\/+$/, ''))
        if (page) req.url = `${page.path}/index.html${url.search}`
        next()
      })
    },
  }, {
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
