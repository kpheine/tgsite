import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/auth';
import { parseAdminOrderIds, saveAdminOrder } from '../../../../lib/admin-order';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) return new Response('Não autorizado', { status: 401 });

  const body = await request.json().catch(() => null) as { ids?: unknown } | null;
  const ids = parseAdminOrderIds(body);

  if (ids.length === 0) return new Response('Nenhum case enviado', { status: 400 });

  saveAdminOrder('cases', ids);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
