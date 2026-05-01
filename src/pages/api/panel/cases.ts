import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { saveUpload } from '../../../lib/uploads';

async function saveImages(formData: FormData, caseId: number) {
  let sortOrder = 0;
  const insertImage = db.prepare('INSERT INTO imagens_case (case_id, sort_order, url, destaque) VALUES (?, ?, ?, ?)');
  const orders = formData.getAll('new_image_order');
  const destaques = formData.getAll('new_image_destaque');

  for (const [index, value] of formData.getAll('images').entries()) {
    if (value instanceof File && value.size > 0) {
      const requestedOrder = Number(orders[index]);
      const imageOrder = Number.isFinite(requestedOrder) ? requestedOrder : sortOrder;

      insertImage.run(caseId, imageOrder, await saveUpload(value, 'image'), destaques[index] === '1' ? 1 : 0);
      sortOrder += 1;
    }
  }
}

async function saveVideo(formData: FormData) {
  const video = formData.get('video');
  return video instanceof File && video.size > 0 ? saveUpload(video, 'video') : null;
}

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim() || null;
}

function nextCaseSortOrder() {
  const result = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as value FROM cases').get() as { value: number };
  return result.value;
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
    await saveVideo(formData),
    textValue(formData, 'desafio'),
    textValue(formData, 'entrega'),
    textValue(formData, 'resultado'),
    formData.get('status') === 'published' ? 'published' : 'draft',
    nextCaseSortOrder(),
  );

  await saveImages(formData, Number(result.lastInsertRowid));

  return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
};
