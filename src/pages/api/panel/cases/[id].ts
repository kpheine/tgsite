import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../../lib/auth';
import { db, type CaseImageRecord, type CaseRecord } from '../../../../lib/db';
import { cleanupUploadedFiles, deleteUploadedFile, fieldValue, fieldValues, parseCaseUploadRequest, UploadValidationError, type ParsedCaseUpload } from '../../../../lib/uploads';

function textValue(upload: ParsedCaseUpload, name: string) {
  return fieldValue(upload, name).trim() || null;
}

function saveNewImages(upload: ParsedCaseUpload, caseId: number) {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as value FROM imagens_case WHERE case_id = ?').get(caseId) as { value: number };
  let sortOrder = maxOrder.value + 1;
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

function getCaseMediaUrls(item: CaseRecord) {
  const images = db.prepare('SELECT url FROM imagens_case WHERE case_id = ?').all(item.id) as Pick<CaseImageRecord, 'url'>[];
  return [item.main_image_url, item.video_url, ...images.map((image) => image.url)];
}

function deleteCommittedMedia(urls: Array<string | null>) {
  for (const url of urls) {
    try {
      deleteUploadedFile(url);
    } catch {
      // The DB transaction has already committed; stale files can be cleaned manually if needed.
    }
  }
}

function removeSelectedImages(upload: ParsedCaseUpload, caseId: number) {
  const removedIds = new Set<number>();
  const removedUrls: string[] = [];
  const selectImage = db.prepare('SELECT * FROM imagens_case WHERE id = ? AND case_id = ?');
  const deleteImage = db.prepare('DELETE FROM imagens_case WHERE id = ? AND case_id = ?');

  for (const value of fieldValues(upload, 'remove_image_id')) {
    const imageId = Number(value);
    if (!Number.isInteger(imageId)) continue;

    const image = selectImage.get(imageId, caseId) as CaseImageRecord | undefined;
    if (!image) continue;

    deleteImage.run(imageId, caseId);
    removedIds.add(imageId);
    removedUrls.push(image.url);
  }

  return { removedIds, removedUrls };
}

function updateExistingImages(upload: ParsedCaseUpload, caseId: number, removedIds: Set<number>) {
  const updateImage = db.prepare('UPDATE imagens_case SET sort_order = ?, destaque = ? WHERE id = ? AND case_id = ?');

  for (const value of fieldValues(upload, 'image_id')) {
    const imageId = Number(value);
    if (!Number.isInteger(imageId)) continue;
    if (removedIds.has(imageId)) continue;

    updateImage.run(
      Number(fieldValue(upload, `image_order_${imageId}`) || 0),
      fieldValue(upload, `image_destaque_${imageId}`) === '1' ? 1 : 0,
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

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    if (formData.get('_action') === 'delete') {
      const mediaUrls = getCaseMediaUrls(item);
      db.transaction(() => {
        db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
      })();
      deleteCommittedMedia(mediaUrls);
      return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
    }

    return new Response('Envio inválido', { status: 400 });
  }

  let upload: ParsedCaseUpload;
  try {
    upload = await parseCaseUploadRequest(request);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }

  if (fieldValue(upload, '_action') === 'delete') {
    const mediaUrls = getCaseMediaUrls(item);
    db.transaction(() => {
      db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
    })();
    deleteCommittedMedia(mediaUrls);
    return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
  }

  const titulo = fieldValue(upload, 'titulo').trim();
  if (!titulo) {
    cleanupUploadedFiles(upload.uploadedUrls);
    return new Response('O título é obrigatório', { status: 400 });
  }

  const videoUrl = upload.videoUrl;
  const removeVideo = fieldValue(upload, 'remove_video') === '1';
  const nextVideoUrl = videoUrl || (removeVideo ? null : item.video_url);
  const nextMainImageUrl = upload.mainImageUrl || item.main_image_url;

  if (!nextMainImageUrl) {
    cleanupUploadedFiles(upload.uploadedUrls);
    return new Response('A imagem principal é obrigatória', { status: 400 });
  }

  const updateCase = db.transaction(() => {
    db.prepare(`
      UPDATE cases
      SET titulo = ?, cliente = ?, main_image_url = ?, video_url = ?, desafio = ?, entrega = ?, resultado = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      titulo,
      textValue(upload, 'cliente'),
      nextMainImageUrl,
      nextVideoUrl,
      textValue(upload, 'desafio'),
      textValue(upload, 'entrega'),
      textValue(upload, 'resultado'),
      fieldValue(upload, 'status') === 'published' ? 'published' : 'draft',
      caseId,
    );

    const removedImages = removeSelectedImages(upload, caseId);
    updateExistingImages(upload, caseId, removedImages.removedIds);
    saveNewImages(upload, caseId);
    return removedImages.removedUrls;
  });

  let removedImageUrls: string[];
  try {
    removedImageUrls = updateCase();
  } catch (error) {
    cleanupUploadedFiles(upload.uploadedUrls);
    throw error;
  }

  deleteCommittedMedia([
    ...(upload.mainImageUrl ? [item.main_image_url] : []),
    ...(videoUrl || removeVideo ? [item.video_url] : []),
    ...removedImageUrls,
  ]);

  return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
};
