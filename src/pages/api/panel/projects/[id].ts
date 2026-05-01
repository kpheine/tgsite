import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../../lib/auth';
import { db, type ProjectRecord } from '../../../../lib/db';
import { saveUpload } from '../../../../lib/uploads';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'projeto';
}

function uniqueSlug(baseSlug: string, currentId: string | undefined) {
  let slug = baseSlug;
  let suffix = 2;

  while (db.prepare('SELECT id FROM projects WHERE slug = ? AND id != ?').get(slug, currentId)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function saveFiles(formData: FormData, field: string, kind: 'image' | 'video') {
  const saved: string[] = [];
  for (const value of formData.getAll(field)) {
    if (value instanceof File && value.size > 0) {
      saved.push(await saveUpload(value, kind));
    }
  }
  return saved;
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as ProjectRecord | undefined;
  if (!project) return new Response('Não encontrado', { status: 404 });

  const formData = await request.formData();
  if (formData.get('_action') === 'delete') {
    db.prepare('DELETE FROM projects WHERE id = ?').run(params.id);
    return new Response(null, { status: 303, headers: { Location: adminUrl('projects') } });
  }

  const title = String(formData.get('title') || '').trim();
  if (!title) return new Response('O título é obrigatório', { status: 400 });

  const coverFile = formData.get('cover_image');
  const coverImage = coverFile instanceof File && coverFile.size > 0 ? await saveUpload(coverFile, 'image') : project.cover_image;
  const images = [...JSON.parse(project.images || '[]'), ...(await saveFiles(formData, 'images', 'image'))];
  const videos = [...JSON.parse(project.videos || '[]'), ...(await saveFiles(formData, 'videos', 'video'))];

  db.prepare(`
    UPDATE projects
    SET title = ?, slug = ?, client = ?, year = ?, description = ?, status = ?, sort_order = ?, cover_image = ?, images = ?, videos = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title,
    uniqueSlug(slugify(String(formData.get('slug') || title)), params.id),
    String(formData.get('client') || '').trim() || null,
    String(formData.get('year') || '').trim() || null,
    String(formData.get('description') || '').trim() || null,
    formData.get('status') === 'published' ? 'published' : 'draft',
    Number(formData.get('sort_order') || 0),
    coverImage,
    JSON.stringify(images),
    JSON.stringify(videos),
    params.id,
  );

  return new Response(null, { status: 303, headers: { Location: adminUrl('projects') } });
};
