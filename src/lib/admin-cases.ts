import { db, type CaseImageRecord, type CaseRecord } from './db';
import { cleanupUploadedFiles, deleteUploadedFile, fieldValue, fieldValues, type ParsedCaseUpload } from './uploads';
import { normalizeYouTubeUrl } from './youtube';

export class AdminCaseError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function textValue(upload: ParsedCaseUpload, name: string) {
  return fieldValue(upload, name).trim() || null;
}

function youtubeUrlValue(upload: ParsedCaseUpload) {
  const value = fieldValue(upload, 'video_url').trim();
  if (!value) return null;
  return normalizeYouTubeUrl(value);
}

function statusValue(upload: ParsedCaseUpload) {
  return fieldValue(upload, 'status') === 'published' ? 'published' : 'draft';
}

function requireCaseTitle(upload: ParsedCaseUpload) {
  const titulo = fieldValue(upload, 'titulo').trim();
  if (!titulo) throw new AdminCaseError('O título é obrigatório');
  return titulo;
}

function validateVideoUrl(upload: ParsedCaseUpload) {
  const rawVideoUrl = fieldValue(upload, 'video_url').trim();
  const videoUrl = youtubeUrlValue(upload);

  if (rawVideoUrl && !videoUrl) throw new AdminCaseError('Informe uma URL válida do YouTube');
  return videoUrl;
}

function nextCaseSortOrder() {
  const result = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as value FROM cases').get() as { value: number };
  return result.value;
}

function saveNewImages(upload: ParsedCaseUpload, caseId: number, fallbackStartOrder: number) {
  let sortOrder = fallbackStartOrder;
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

function nextCaseImageSortOrder(caseId: number) {
  const result = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as value FROM imagens_case WHERE case_id = ?').get(caseId) as { value: number };
  return result.value;
}

function getCase(caseId: number) {
  return db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as CaseRecord | undefined;
}

function getCaseMediaUrls(item: CaseRecord) {
  const images = db.prepare('SELECT url FROM imagens_case WHERE case_id = ?').all(item.id) as Pick<CaseImageRecord, 'url'>[];
  return [item.main_image_url, ...images.map((image) => image.url)];
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

export function createAdminCase(upload: ParsedCaseUpload) {
  try {
    const titulo = requireCaseTitle(upload);
    if (!upload.mainImageUrl) throw new AdminCaseError('A imagem principal é obrigatória');
    const videoUrl = validateVideoUrl(upload);

    const createCase = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO cases (titulo, cliente, main_image_url, video_url, desafio, entrega, resultado, status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        titulo,
        textValue(upload, 'cliente'),
        upload.mainImageUrl,
        videoUrl,
        textValue(upload, 'desafio'),
        textValue(upload, 'entrega'),
        textValue(upload, 'resultado'),
        statusValue(upload),
        nextCaseSortOrder(),
      );

      saveNewImages(upload, Number(result.lastInsertRowid), 0);
    });

    createCase();
  } catch (error) {
    cleanupUploadedFiles(upload.uploadedUrls);
    throw error;
  }
}

export function updateAdminCase(caseId: number, upload: ParsedCaseUpload) {
  try {
    const item = getCase(caseId);
    if (!item) throw new AdminCaseError('Não encontrado', 404);

    const titulo = requireCaseTitle(upload);
    const nextVideoUrl = validateVideoUrl(upload);
    const nextMainImageUrl = upload.mainImageUrl || item.main_image_url;
    if (!nextMainImageUrl) throw new AdminCaseError('A imagem principal é obrigatória');

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
        statusValue(upload),
        caseId,
      );

      const removedImages = removeSelectedImages(upload, caseId);
      updateExistingImages(upload, caseId, removedImages.removedIds);
      saveNewImages(upload, caseId, nextCaseImageSortOrder(caseId));
      return removedImages.removedUrls;
    });

    const removedImageUrls = updateCase();

    deleteCommittedMedia([
      ...(upload.mainImageUrl ? [item.main_image_url] : []),
      ...removedImageUrls,
    ]);
  } catch (error) {
    cleanupUploadedFiles(upload.uploadedUrls);
    throw error;
  }
}

export function deleteAdminCase(caseId: number) {
  const item = getCase(caseId);
  if (!item) throw new AdminCaseError('Não encontrado', 404);

  const mediaUrls = getCaseMediaUrls(item);
  db.transaction(() => {
    db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
  })();
  deleteCommittedMedia(mediaUrls);
}
