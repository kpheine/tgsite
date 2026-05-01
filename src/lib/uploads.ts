import { createWriteStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import Busboy from 'busboy';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedVideos = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export type UploadKind = 'image' | 'video';

export type ParsedCaseUpload = {
  fields: Map<string, string[]>;
  imageUrls: string[];
  videoUrl: string | null;
  uploadedUrls: string[];
};

const uploadRoot = resolve(process.cwd(), 'uploads');

function uploadLimitLabel(kind: UploadKind) {
  const bytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  return bytes >= 1024 * 1024 * 1024 ? `${Math.round(bytes / 1024 / 1024 / 1024)}GB` : `${Math.round(bytes / 1024 / 1024)}MB`;
}

function assertAllowedUpload(kind: UploadKind, mimeType: string) {
  const allowed = kind === 'image' ? allowedImages : allowedVideos;

  if (!allowed.has(mimeType)) {
    throw new Error(`Tipo de ${kind === 'image' ? 'imagem' : 'vídeo'} não suportado.`);
  }
}

function uploadDestination(name: string, kind: UploadKind) {
  const originalExt = extname(name).toLowerCase();
  const fallbackExt = kind === 'image' ? '.jpg' : '.mp4';
  const folder = kind === 'image' ? 'images' : 'videos';
  const filename = `${randomUUID()}${originalExt || fallbackExt}`;
  const uploadDir = resolve(uploadRoot, folder);
  const filePath = resolve(uploadDir, filename);

  mkdirSync(uploadDir, { recursive: true });

  return {
    filePath,
    url: `/uploads/${folder}/${filename}`,
  };
}

export async function saveUpload(file: File, kind: UploadKind) {
  const isImage = kind === 'image';
  const maxSize = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  assertAllowedUpload(kind, file.type);

  if (file.size > maxSize) {
    throw new Error(`${kind === 'image' ? 'A imagem' : 'O vídeo'} excede o limite de ${uploadLimitLabel(kind)}.`);
  }

  const { filePath, url } = uploadDestination(file.name, kind);

  writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

  return url;
}

async function saveUploadStream(stream: NodeJS.ReadableStream, name: string, mimeType: string, kind: UploadKind) {
  assertAllowedUpload(kind, mimeType);

  const { filePath, url } = uploadDestination(name, kind);
  const maxSize = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  let bytesWritten = 0;

  stream.on('data', (chunk: Buffer) => {
    bytesWritten += chunk.length;
    if (bytesWritten > maxSize) {
      stream.destroy(new Error(`${kind === 'image' ? 'A imagem' : 'O vídeo'} excede o limite de ${uploadLimitLabel(kind)}.`));
    }
  });

  try {
    await pipeline(stream, createWriteStream(filePath));
  } catch (error) {
    if (existsSync(filePath)) unlinkSync(filePath);
    throw error;
  }

  return url;
}

export async function parseCaseUploadRequest(request: Request): Promise<ParsedCaseUpload> {
  if (!request.body) throw new Error('Envio inválido.');

  const fields = new Map<string, string[]>();
  const imageUrls: string[] = [];
  const uploadedUrls: string[] = [];
  let videoUrl: string | null = null;
  let parseError: Error | null = null;
  const pendingFiles: Promise<void>[] = [];

  const busboy = Busboy({
    headers: Object.fromEntries(request.headers.entries()),
    limits: {
      fileSize: MAX_VIDEO_BYTES,
    },
  });

  busboy.on('field', (name, value) => {
    fields.set(name, [...(fields.get(name) || []), value]);
  });

  busboy.on('file', (name, stream, info) => {
    if (!info.filename) {
      stream.resume();
      return;
    }

    const kind: UploadKind = name === 'video' ? 'video' : 'image';
    if (kind === 'image' && name !== 'images') {
      stream.resume();
      return;
    }

    try {
      assertAllowedUpload(kind, info.mimeType);
    } catch (error) {
      parseError = error instanceof Error ? error : new Error('Envio inválido.');
      stream.resume();
      return;
    }

    const uploadPromise = saveUploadStream(stream, info.filename, info.mimeType, kind).then((url) => {
      uploadedUrls.push(url);
      if (kind === 'video') videoUrl = url;
      else imageUrls.push(url);
    });

    pendingFiles.push(uploadPromise);
  });

  try {
    await pipeline(Readable.fromWeb(request.body), busboy);
    await Promise.all(pendingFiles);
    if (parseError) throw parseError;
  } catch (error) {
    for (const url of uploadedUrls) deleteUploadedFile(url);
    throw error;
  }

  return { fields, imageUrls, videoUrl, uploadedUrls };
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
