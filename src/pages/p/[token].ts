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
      //
      // allow-popups lets `target="_blank"` links and window.open work at all —
      // without it the browser blocks them outright. allow-popups-to-escape-sandbox
      // then keeps the opened tab out of this sandbox; otherwise the destination
      // site inherits the opaque origin and loads with no cookies, no storage and
      // no forms. Neither flag grants this page same-origin access: the popup is
      // cross-origin to its opener, so uploaded scripts still cannot read it.
      'Content-Security-Policy': 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
};
