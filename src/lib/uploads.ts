import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedVideos = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export type UploadKind = 'image' | 'video';

export async function saveUpload(file: File, kind: UploadKind) {
  const isImage = kind === 'image';
  const allowed = isImage ? allowedImages : allowedVideos;
  const maxSize = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  if (!allowed.has(file.type)) {
    throw new Error(`Unsupported ${kind} type.`);
  }

  if (file.size > maxSize) {
    throw new Error(`${kind} exceeds the ${Math.round(maxSize / 1024 / 1024)}MB limit.`);
  }

  const originalExt = extname(file.name).toLowerCase();
  const fallbackExt = isImage ? '.jpg' : '.mp4';
  const folder = isImage ? 'images' : 'videos';
  const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${originalExt || fallbackExt}`;
  const uploadDir = resolve(process.cwd(), 'uploads', folder);
  const filePath = resolve(uploadDir, filename);

  mkdirSync(uploadDir, { recursive: true });
  writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

  return `/uploads/${folder}/${filename}`;
}
