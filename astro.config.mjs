import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  // Dev-server only: allow tunnel hostnames (e.g. *.trycloudflare.com) so the
  // local site can be previewed over a Cloudflare/ngrok tunnel. The production
  // Node standalone server does not use Vite, so this has no effect on prod.
  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com'],
    },
  },
});
