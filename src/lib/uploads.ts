import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { formatBytesLabel } from './bytes';
import { MAX_IMAGE_BYTES } from './upload-limits';

const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export class UploadValidationError extends Error {}

export type ParsedCaseUpload = {
  fields: Map<string, string[]>;
  mainImageUrl: string | null;
  imageUrls: string[];
  uploadedUrls: string[];
};

const uploadRoot = resolve(process.cwd(), 'uploads');

function uploadLimitLabel() {
  return formatBytesLabel(MAX_IMAGE_BYTES);
}

function assertAllowedUpload(mimeType: string) {
  if (!allowedImages.has(mimeType)) throw new UploadValidationError('Tipo de imagem não suportado.');
}

function uploadDestination(name: string) {
  const originalExt = extname(name).toLowerCase();
  const fallbackExt = '.jpg';
  const folder = 'images';
  const filename = `${randomUUID()}${originalExt || fallbackExt}`;
  const uploadDir = resolve(uploadRoot, folder);
  const filePath = resolve(uploadDir, filename);

  mkdirSync(uploadDir, { recursive: true });

  return {
    filePath,
    url: `/uploads/${folder}/${filename}`,
  };
}

async function saveUploadFile(file: File) {
  assertAllowedUpload(file.type);

  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadValidationError(`A imagem excede o limite de ${uploadLimitLabel()}.`);
  }

  const { filePath, url } = uploadDestination(file.name);

  try {
    writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (existsSync(filePath)) unlinkSync(filePath);
    throw error;
  }

  return url;
}

export async function parseCaseUploadRequest(request: Request): Promise<ParsedCaseUpload> {
  const formData = await request.formData();

  const fields = new Map<string, string[]>();
  let mainImageUrl: string | null = null;
  const imageUrls: string[] = [];
  const uploadedUrls: string[] = [];

  try {
    for (const [name, value] of formData.entries()) {
      if (typeof value === 'string') {
        fields.set(name, [...(fields.get(name) || []), value]);
        continue;
      }

      if (!value.name || (name !== 'images' && name !== 'main_image')) continue;

      const url = await saveUploadFile(value);
      uploadedUrls.push(url);
      if (name === 'main_image') mainImageUrl = url;
      else imageUrls.push(url);
    }
  } catch (error) {
    for (const url of uploadedUrls) deleteUploadedFile(url);
    throw error;
  }

  return { fields, mainImageUrl, imageUrls, uploadedUrls };
}

export function fieldValue(upload: ParsedCaseUpload, name: string) {
  return upload.fields.get(name)?.[0] || '';
}

export function fieldValues(upload: ParsedCaseUpload, name: string) {
  return upload.fields.get(name) || [];
}

export function cleanupUploadedFiles(urls: string[]) {
  for (const url of urls) deleteUploadedFile(url);
}

export function deleteUploadedFile(url: string | null | undefined) {
  if (!url?.startsWith('/uploads/')) return;

  const relativePath = url.slice('/uploads/'.length);
  const filePath = resolve(uploadRoot, relativePath);

  if (!filePath.startsWith(`${uploadRoot}${sep}`)) return;
  if (existsSync(filePath)) unlinkSync(filePath);
}
