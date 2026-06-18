import type { APIRoute } from 'astro';
import { getSharedPageHtml } from '../../lib/shared-pages';

export const GET: APIRoute = ({ params }) => {
  const page = getSharedPageHtml(params.token);
  if (!page) return new Response('Not found', { status: 404 });

  return new Response(page.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Opaque origin: scripts run, but the page cannot read the admin cookie /
      // localStorage or send credentialed requests to the site's own endpoints.
      'Content-Security-Policy': 'sandbox allow-scripts',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
};
