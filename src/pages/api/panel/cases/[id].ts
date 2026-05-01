import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../../lib/auth';
import { db, type CaseRecord } from '../../../../lib/db';
import { saveUpload } from '../../../../lib/uploads';

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
    db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
    return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
  }

  const titulo = String(formData.get('titulo') || '').trim();
  if (!titulo) return new Response('O título é obrigatório', { status: 400 });

  db.prepare(`
    UPDATE cases
    SET titulo = ?, cliente = ?, video_url = ?, desafio = ?, entrega = ?, resultado = ?, status = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    titulo,
    textValue(formData, 'cliente'),
    textValue(formData, 'video_url'),
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
