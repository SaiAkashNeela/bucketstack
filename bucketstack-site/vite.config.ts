import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

// The static pages live in public/<name>.html. In production (Cloudflare Pages) and
// `vite preview`, /privacy etc. resolve to them, but the dev server's SPA fallback
// would serve the homepage instead. Rewrite those clean URLs in dev only.
const STATIC_PAGES = ['about', 'contact', 'developers', 'privacy', 'terms'];
const staticPagesInDev = (): Plugin => ({
  name: 'static-pages-in-dev',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const match = req.url?.match(/^\/([a-z]+)\/?(\?.*)?$/);
      if (match && STATIC_PAGES.includes(match[1])) {
        req.url = `/${match[1]}.html${match[2] ?? ''}`;
      }
      next();
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react() as any, tailwindcss(), staticPagesInDev()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
