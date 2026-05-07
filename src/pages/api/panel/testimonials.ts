import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../lib/auth';
import { db } from '../../../lib/db';

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

function nextTestimonialSortOrder() {
  const result = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as value FROM testimonials').get() as { value: number };
  return result.value;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const formData = await request.formData();
  const title = textValue(formData, 'title');
  const quote = textValue(formData, 'quote');
  const personName = textValue(formData, 'person_name');
  const personRole = textValue(formData, 'person_role');

  if (!title) return new Response('O título é obrigatório', { status: 400 });
  if (!quote) return new Response('O depoimento é obrigatório', { status: 400 });
  if (!personName) return new Response('O nome é obrigatório', { status: 400 });
  if (!personRole) return new Response('O cargo / empresa é obrigatório', { status: 400 });

  db.prepare(`
    INSERT INTO testimonials (title, quote, person_name, person_role, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title,
    quote,
    personName,
    personRole,
    textValue(formData, 'status') === 'published' ? 'published' : 'draft',
    nextTestimonialSortOrder(),
  );

  return new Response(null, { status: 303, headers: { Location: adminUrl('recomendacoes') } });
};
