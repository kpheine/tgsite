import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedVideos = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export type UploadKind = 'image' | 'video';

const uploadRoot = resolve(process.cwd(), 'uploads');

export async function saveUpload(file: File, kind: UploadKind) {
  const isImage = kind === 'image';
  const allowed = isImage ? allowedImages : allowedVideos;
  const maxSize = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  if (!allowed.has(file.type)) {
    throw new Error(`Tipo de ${kind === 'image' ? 'imagem' : 'vídeo'} não suportado.`);
  }

  if (file.size > maxSize) {
    throw new Error(`${kind === 'image' ? 'A imagem' : 'O vídeo'} excede o limite de ${Math.round(maxSize / 1024 / 1024)}MB.`);
  }

  const originalExt = extname(file.name).toLowerCase();
  const fallbackExt = isImage ? '.jpg' : '.mp4';
  const folder = isImage ? 'images' : 'videos';
  const filename = `${randomUUID()}${originalExt || fallbackExt}`;
  const uploadDir = resolve(uploadRoot, folder);
  const filePath = resolve(uploadDir, filename);

  mkdirSync(uploadDir, { recursive: true });
  writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

  return `/uploads/${folder}/${filename}`;
}

export function deleteUploadedFile(url: string | null | undefined) {
  if (!url?.startsWith('/uploads/')) return;

  const relativePath = url.slice('/uploads/'.length);
  const filePath = resolve(uploadRoot, relativePath);

  if (!filePath.startsWith(`${uploadRoot}${sep}`)) return;
  if (existsSync(filePath)) unlinkSync(filePath);
}
