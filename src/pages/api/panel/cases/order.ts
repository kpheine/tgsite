import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/auth';
import { db } from '../../../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) return new Response('Não autorizado', { status: 401 });

  const body = await request.json().catch(() => null) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];

  if (ids.length === 0) return new Response('Nenhum case enviado', { status: 400 });

  const updateOrder = db.transaction((caseIds: number[]) => {
    const update = db.prepare('UPDATE cases SET sort_order = ? WHERE id = ?');
    const maxOrder = caseIds.length - 1;

    caseIds.forEach((id, index) => {
      update.run(maxOrder - index, id);
    });
  });

  updateOrder(ids);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
