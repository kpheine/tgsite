import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { cleanupUploadedFiles, fieldValue, fieldValues, parseCaseUploadRequest, type ParsedCaseUpload } from '../../../lib/uploads';

function saveImages(upload: ParsedCaseUpload, caseId: number) {
  let sortOrder = 0;
  const insertImage = db.prepare('INSERT INTO imagens_case (case_id, sort_order, url, destaque) VALUES (?, ?, ?, ?)');
  const orders = fieldValues(upload, 'new_image_order');
  const destaques = fieldValues(upload, 'new_image_destaque');

  for (const [index, url] of upload.imageUrls.entries()) {
    const requestedOrder = Number(orders[index]);
    const imageOrder = Number.isFinite(requestedOrder) ? requestedOrder : sortOrder;

    insertImage.run(caseId, imageOrder, url, destaques[index] === '1' ? 1 : 0);
    sortOrder += 1;
  }
}

function textValue(upload: ParsedCaseUpload, name: string) {
  return fieldValue(upload, name).trim() || null;
}

function nextCaseSortOrder() {
  const result = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as value FROM cases').get() as { value: number };
  return result.value;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const upload = await parseCaseUploadRequest(request);
  const titulo = fieldValue(upload, 'titulo').trim();
  if (!titulo) {
    cleanupUploadedFiles(upload.uploadedUrls);
    return new Response('O título é obrigatório', { status: 400 });
  }

  if (!upload.mainImageUrl) {
    cleanupUploadedFiles(upload.uploadedUrls);
    return new Response('A imagem principal é obrigatória', { status: 400 });
  }

  const createCase = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO cases (titulo, cliente, main_image_url, video_url, desafio, entrega, resultado, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      titulo,
      textValue(upload, 'cliente'),
      upload.mainImageUrl,
      upload.videoUrl,
      textValue(upload, 'desafio'),
      textValue(upload, 'entrega'),
      textValue(upload, 'resultado'),
      fieldValue(upload, 'status') === 'published' ? 'published' : 'draft',
      nextCaseSortOrder(),
    );

    saveImages(upload, Number(result.lastInsertRowid));
  });

  try {
    createCase();
  } catch (error) {
    cleanupUploadedFiles(upload.uploadedUrls);
    throw error;
  }

  return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
};
