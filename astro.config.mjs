import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  security: {
    // The app always runs behind Caddy, which terminates TLS and proxies plain
    // HTTP to app:4321. Without this, Astro's Node adapter does not trust the
    // X-Forwarded-Proto/Host headers, reconstructs the request URL as
    // https://localhost, and its checkOrigin (CSRF) guard then rejects every
    // POST form with "Cross-site POST form submissions are forbidden".
    // Trusting the proxy for any HTTPS host fixes this while keeping checkOrigin
    // on, and stays decoupled from SITE_DOMAINS (the single place domains are
    // configured). Safe because app:4321 is only reachable from Caddy on the
    // internal Docker network — it is never published to the host.
    allowedDomains: [{ protocol: 'https' }],
  },
  // Dev-server only: allow tunnel hostnames (e.g. *.trycloudflare.com) so the
  // local site can be previewed over a Cloudflare/ngrok tunnel. The production
  // Node standalone server does not use Vite, so this has no effect on prod.
  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com'],
    },
  },
});
