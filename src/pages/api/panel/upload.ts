import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/auth';
import { saveUpload, type UploadKind } from '../../../lib/uploads';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const kind = String(formData.get('kind') || 'image') as UploadKind;

  if (!(file instanceof File) || file.size === 0 || !['image', 'video'].includes(kind)) {
    return new Response(JSON.stringify({ error: 'Invalid upload' }), { status: 400 });
  }

  try {
    const url = await saveUpload(file, kind);
    return new Response(JSON.stringify({ url }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Upload failed' }), { status: 400 });
  }
};
