import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../../lib/auth';
import { db, type CaseImageRecord, type CaseRecord } from '../../../../lib/db';
import { deleteUploadedFile, saveUpload } from '../../../../lib/uploads';

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim() || null;
}

async function saveNewImages(formData: FormData, caseId: number) {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as value FROM imagens_case WHERE case_id = ?').get(caseId) as { value: number };
  let sortOrder = maxOrder.value + 1;
  const insertImage = db.prepare('INSERT INTO imagens_case (case_id, sort_order, url, destaque) VALUES (?, ?, ?, ?)');

  for (const value of formData.getAll('images')) {
    if (value instanceof File && value.size > 0) {
      insertImage.run(caseId, sortOrder, await saveUpload(value, 'image'), 0);
      sortOrder += 1;
    }
  }
}

async function saveVideo(formData: FormData) {
  const video = formData.get('video');
  return video instanceof File && video.size > 0 ? saveUpload(video, 'video') : null;
}

function deleteCaseMedia(item: CaseRecord) {
  const images = db.prepare('SELECT * FROM imagens_case WHERE case_id = ?').all(item.id) as CaseImageRecord[];

  deleteUploadedFile(item.video_url);
  for (const image of images) deleteUploadedFile(image.url);
}

function updateExistingImages(formData: FormData, caseId: number) {
  const updateImage = db.prepare('UPDATE imagens_case SET sort_order = ?, destaque = ? WHERE id = ? AND case_id = ?');

  for (const value of formData.getAll('image_id')) {
    const imageId = Number(value);
    if (!Number.isInteger(imageId)) continue;

    updateImage.run(
      Number(formData.get(`image_order_${imageId}`) || 0),
      formData.get(`image_destaque_${imageId}`) === '1' ? 1 : 0,
      imageId,
      caseId,
    );
  }
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const caseId = Number(params.id);
  if (!Number.isInteger(caseId)) return new Response('Não encontrado', { status: 404 });

  const item = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as CaseRecord | undefined;
  if (!item) return new Response('Não encontrado', { status: 404 });

  const formData = await request.formData();
  if (formData.get('_action') === 'delete') {
    deleteCaseMedia(item);
    db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
    return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
  }

  const titulo = String(formData.get('titulo') || '').trim();
  if (!titulo) return new Response('O título é obrigatório', { status: 400 });

  const videoUrl = await saveVideo(formData);
  if (videoUrl) deleteUploadedFile(item.video_url);

  db.prepare(`
    UPDATE cases
    SET titulo = ?, cliente = ?, video_url = ?, desafio = ?, entrega = ?, resultado = ?, status = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    titulo,
    textValue(formData, 'cliente'),
    videoUrl || item.video_url,
    textValue(formData, 'desafio'),
    textValue(formData, 'entrega'),
    textValue(formData, 'resultado'),
    formData.get('status') === 'published' ? 'published' : 'draft',
    Number(formData.get('sort_order') || 0),
    caseId,
  );

  updateExistingImages(formData, caseId);
  await saveNewImages(formData, caseId);

  return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
};
