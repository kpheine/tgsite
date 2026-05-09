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

function rateLimitResponse(pathname: string, retryAfterSeconds: number) {
  const headers = { 'Retry-After': String(retryAfterSeconds) };

  if (pathname === '/api/contact') {
    return Response.json(
      { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      { status: 429, headers },
    );
  }

  return new Response('Muitas tentativas. Tente novamente em alguns minutos.', {
    status: 429,
    headers,
  });
}

function routeLimits(pathname: string, method: string) {
  if (method !== 'POST') return null;
  if (pathname === '/api/contact') return { scope: 'contact', rules: CONTACT_LIMITS };
  if (pathname === '/api/panel/login') return { scope: 'login', rules: LOGIN_LIMITS };
  if (pathname.startsWith('/api/panel/') && pathname !== '/api/panel/logout') {
    return { scope: 'admin-write', rules: ADMIN_WRITE_LIMITS };
  }

  return null;
}

export const onRequest = defineMiddleware((context, next) => {
  const pathname = context.url.pathname;
  const limits = routeLimits(pathname, context.request.method);
  if (!limits) return next();

  const ip = clientIp(context.request, context.clientAddress);
  const result = checkRateLimit(`${limits.scope}:${ip}`, limits.rules);

  if (!result.allowed) return rateLimitResponse(pathname, result.retryAfterSeconds);

  return next();
});
