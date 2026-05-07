import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../../lib/auth';
import { db, type TestimonialRecord } from '../../../../lib/db';

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const testimonialId = Number(params.id);
  if (!Number.isInteger(testimonialId)) return new Response('Não encontrado', { status: 404 });

  const item = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(testimonialId) as TestimonialRecord | undefined;
  if (!item) return new Response('Não encontrado', { status: 404 });

  const formData = await request.formData();
  if (formData.get('_action') === 'delete') {
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(testimonialId);
    return new Response(null, { status: 303, headers: { Location: adminUrl('recomendacoes') } });
  }

  const title = textValue(formData, 'title');
  const quote = textValue(formData, 'quote');
  const personName = textValue(formData, 'person_name');
  const personRole = textValue(formData, 'person_role');

  if (!title) return new Response('O título é obrigatório', { status: 400 });
  if (!quote) return new Response('O depoimento é obrigatório', { status: 400 });
  if (!personName) return new Response('O nome é obrigatório', { status: 400 });
  if (!personRole) return new Response('O cargo / empresa é obrigatório', { status: 400 });

  db.prepare(`
    UPDATE testimonials
    SET title = ?, quote = ?, person_name = ?, person_role = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title,
    quote,
    personName,
    personRole,
    textValue(formData, 'status') === 'published' ? 'published' : 'draft',
    testimonialId,
  );

  return new Response(null, { status: 303, headers: { Location: adminUrl('recomendacoes') } });
};
