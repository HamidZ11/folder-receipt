import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { CSP_META } from './csp.ts';

// CSP only in the production build: Vite dev uses inline scripts and a websocket for HMR.
function cspMeta(): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_META },
          injectTo: 'head-prepend',
        },
      ],
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspMeta()],
  build: {
    // Never inline fonts as data: URIs; the CSP only allows fonts from this origin (default-src 'self').
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'csp.test.ts'],
    environment: 'node',
  },
});
