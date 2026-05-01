import type { APIRoute } from 'astro';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

const contentTypes: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

function streamFile(path: string, start?: number, end?: number) {
  return Readable.toWeb(createReadStream(path, start === undefined ? undefined : { start, end })) as BodyInit;
}

export const GET: APIRoute = ({ params, request }) => {
  const uploadRoot = resolve(process.cwd(), 'uploads');
  const requestedPath = resolve(uploadRoot, params.path || '');

  if (!requestedPath.startsWith(`${uploadRoot}${sep}`) || !existsSync(requestedPath)) {
    return new Response('Not found', { status: 404 });
  }

  const ext = extname(requestedPath).toLowerCase();
  const contentType = contentTypes[ext] || 'application/octet-stream';
  const fileSize = statSync(requestedPath).size;
  const range = request.headers.get('range');
  const headers = {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': contentType,
  };

  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match || (!match[1] && !match[2])) {
      return new Response('Invalid range', { status: 416, headers: { ...headers, 'Content-Range': `bytes */${fileSize}` } });
    }

    const [, rawStart, rawEnd] = match;
    const suffixLength = !rawStart && rawEnd ? Number(rawEnd) : null;
    const start = suffixLength === null ? Number(rawStart) : Math.max(fileSize - suffixLength, 0);
    const requestedEnd = rawStart && rawEnd ? Number(rawEnd) : fileSize - 1;
    const end = Math.min(requestedEnd, fileSize - 1);

    if (!Number.isInteger(start) || !Number.isInteger(requestedEnd) || start < 0 || start >= fileSize || start > end) {
      return new Response('Range not satisfiable', { status: 416, headers: { ...headers, 'Content-Range': `bytes */${fileSize}` } });
    }

    return new Response(streamFile(requestedPath, start, end), {
      status: 206,
      headers: {
        ...headers,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      },
    });
  }

  return new Response(streamFile(requestedPath), {
    headers: {
      ...headers,
      'Content-Length': String(fileSize),
    },
  });
};
