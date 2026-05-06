import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

const allowedHosts = (process.env.ALLOWED_HOSTS || 'localhost,127.0.0.1')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)
  .map((hostname) => ({ hostname }));

export default defineConfig({
  output: 'server',
  security: {
    allowedDomains: allowedHosts,
  },
  adapter: node({
    mode: 'standalone',
  }),
});
