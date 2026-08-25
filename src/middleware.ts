import { isIP } from 'node:net';
import { defineMiddleware } from 'astro:middleware';
import { env } from './lib/env';
import { checkRateLimit, type RateLimitRule } from './lib/rate-limit';

const LOGIN_LIMITS: RateLimitRule[] = [
  { name: 'login-minute', limit: 5, windowMs: 60_000 },
  { name: 'login-hour', limit: 20, windowMs: 60 * 60_000 },
];

const CONTACT_LIMITS: RateLimitRule[] = [
  { name: 'contact-10m', limit: 3, windowMs: 10 * 60_000 },
  { name: 'contact-day', limit: 20, windowMs: 24 * 60 * 60_000 },
];

const DENUNCIA_LIMITS: RateLimitRule[] = [
  { name: 'denuncia-10m', limit: 3, windowMs: 10 * 60_000 },
  { name: 'denuncia-day', limit: 20, windowMs: 24 * 60 * 60_000 },
];

const ADMIN_WRITE_LIMITS: RateLimitRule[] = [
  { name: 'admin-write-minute', limit: 60, windowMs: 60_000 },
];

function firstForwardedIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const forwardedIp = forwardedFor
    .split(',')
    .map((value) => value.trim())
    .find((value) => isIP(value));

  if (forwardedIp) return forwardedIp;

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp && isIP(realIp) ? realIp : '';
}

function clientIp(request: Request, directAddress: string | undefined) {
  if (env.trustProxyHeaders) {
    const proxyIp = firstForwardedIp(request);
    if (proxyIp) return proxyIp;
  }

  return directAddress || 'unknown';
}

async function rateLimitResponse(request: Request, pathname: string, retryAfterSeconds: number) {
  const headers = { 'Retry-After': String(retryAfterSeconds) };

  if (pathname === '/api/contact' || pathname === '/api/denuncia') {
    return Response.json(
      { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      { status: 429, headers },
    );
  }

  if (pathname === '/api/panel/login') {
    const formData = await request.formData();
    const adminPath = String(formData.get('adminPath') || env.adminPath).replace(/^\/+|\/+$/g, '') || env.adminPath;
    const username = String(formData.get('username') || '');
    const params = new URLSearchParams({ error: 'rate-limit', username });

    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: `/${adminPath}/login?${params}` },
    });
  }

  return new Response('Muitas tentativas. Tente novamente em alguns minutos.', {
    status: 429,
    headers,
  });
}

function routeLimits(pathname: string, method: string) {
  if (method !== 'POST') return null;
  if (pathname === '/api/contact') return { scope: 'contact', rules: CONTACT_LIMITS };
  if (pathname === '/api/denuncia') return { scope: 'denuncia', rules: DENUNCIA_LIMITS };
  if (pathname === '/api/panel/login') return { scope: 'login', rules: LOGIN_LIMITS };
  if (pathname.startsWith('/api/panel/') && pathname !== '/api/panel/logout') {
    return { scope: 'admin-write', rules: ADMIN_WRITE_LIMITS };
  }

  return null;
}

// Astro only falls through to src/pages/404.astro when no route handles the
// request at all. Several routes answer with a bare 404 Response instead — most
// of all the one-segment [adminPath] route, which matches every `/whatever` and
// so swallows the 404 page for the entire site. Rewriting here catches all of
// them in one place, including /p/<token> and future routes.
function wantsHtml404(context: { request: Request; url: URL }, response: Response) {
  if (response.status !== 404) return false;
  if (context.request.method !== 'GET') return false;
  // Keep API clients on JSON/plain bodies, and never rewrite the 404 page onto
  // itself (that would loop, since it answers with a 404 status by design).
  if (context.url.pathname.startsWith('/api/')) return false;
  if (context.url.pathname === '/404') return false;
  // An <img>/fetch for a missing upload should stay a bare 404; only a browser
  // navigation asks for HTML.
  return (context.request.headers.get('accept') || '').includes('text/html');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  const limits = routeLimits(pathname, context.request.method);

  if (limits) {
    const ip = clientIp(context.request, context.clientAddress);
    const result = checkRateLimit(`${limits.scope}:${ip}`, limits.rules);

    if (!result.allowed) return rateLimitResponse(context.request, pathname, result.retryAfterSeconds);
  }

  const response = await next();

  return wantsHtml404(context, response) ? context.rewrite('/404') : response;
});
