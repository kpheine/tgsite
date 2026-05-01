import type { APIRoute } from 'astro';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

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

export const GET: APIRoute = ({ params }) => {
  const uploadRoot = resolve(process.cwd(), 'uploads');
  const requestedPath = resolve(uploadRoot, params.path || '');

  if (!requestedPath.startsWith(`${uploadRoot}${sep}`) || !existsSync(requestedPath)) {
    return new Response('Not found', { status: 404 });
  }

  const ext = extname(requestedPath).toLowerCase();
  return new Response(readFileSync(requestedPath), {
    headers: {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
