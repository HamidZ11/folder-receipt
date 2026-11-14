import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { CSP_META } from './csp.ts';
import { SITE_URL } from './src/config.ts';
import { copy } from './src/content/copy.ts';

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

// Title, description, canonical, Open Graph and Twitter card for the main page, from copy.ts.
function headMeta(): Plugin {
  const origin = `https://${SITE_URL}`;
  const og = `${origin}/og.png`;
  return {
    name: 'head-meta',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => {
        if (!ctx.filename.endsWith('index.html')) return html;
        const m = copy.meta;
        const tag = (attrs: Record<string, string>) => ({ tag: 'meta', attrs, injectTo: 'head' as const });
        return {
          html: html.replace(/<title>.*<\/title>/, `<title>${m.title}</title>`),
          tags: [
            tag({ name: 'description', content: m.description }),
            { tag: 'link', attrs: { rel: 'canonical', href: `${origin}/` }, injectTo: 'head' },
            tag({ property: 'og:type', content: 'website' }),
            tag({ property: 'og:url', content: `${origin}/` }),
            tag({ property: 'og:title', content: m.title }),
            tag({ property: 'og:description', content: m.description }),
            tag({ property: 'og:image', content: og }),
            tag({ property: 'og:image:width', content: '1200' }),
            tag({ property: 'og:image:height', content: '630' }),
            tag({ property: 'og:image:alt', content: m.ogImageAlt }),
            tag({ name: 'twitter:card', content: 'summary_large_image' }),
            tag({ name: 'twitter:title', content: m.title }),
            tag({ name: 'twitter:description', content: m.description }),
            tag({ name: 'twitter:image', content: og }),
            tag({ name: 'twitter:image:alt', content: m.ogImageAlt }),
          ],
        };
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspMeta(), headMeta()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        notFound: fileURLToPath(new URL('./404.html', import.meta.url)), // Vercel serves dist/404.html for unknown paths
      },
    },
    // Never inline fonts as data: URIs; the CSP only allows fonts from this origin (default-src 'self').
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'csp.test.ts', 'csp.headers.test.ts'],
    environment: 'node',
  },
});
