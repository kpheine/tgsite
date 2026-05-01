import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { saveUpload } from '../../../lib/uploads';

async function saveImages(formData: FormData, caseId: number) {
  let sortOrder = 0;
  const insertImage = db.prepare('INSERT INTO imagens_case (case_id, sort_order, url, destaque) VALUES (?, ?, ?, ?)');

  for (const value of formData.getAll('images')) {
    if (value instanceof File && value.size > 0) {
      insertImage.run(caseId, sortOrder, await saveUpload(value, 'image'), 0);
      sortOrder += 1;
    }
  }
}

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim() || null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const formData = await request.formData();
  const titulo = String(formData.get('titulo') || '').trim();
  if (!titulo) return new Response('O título é obrigatório', { status: 400 });

  const result = db.prepare(`
    INSERT INTO cases (titulo, cliente, video_url, desafio, entrega, resultado, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    titulo,
    textValue(formData, 'cliente'),
    textValue(formData, 'video_url'),
    textValue(formData, 'desafio'),
    textValue(formData, 'entrega'),
    textValue(formData, 'resultado'),
    formData.get('status') === 'published' ? 'published' : 'draft',
    Number(formData.get('sort_order') || 0),
  );

  await saveImages(formData, Number(result.lastInsertRowid));

  return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
};
