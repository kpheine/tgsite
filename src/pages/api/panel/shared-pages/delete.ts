import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../../lib/auth';
import { deleteSharedPage } from '../../../../lib/shared-pages';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const formData = await request.formData();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return new Response('Não encontrado', { status: 404 });

  deleteSharedPage(id);

  return new Response(null, { status: 303, headers: { Location: adminUrl('paginas') } });
};
