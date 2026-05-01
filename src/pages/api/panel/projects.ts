import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { saveUpload } from '../../../lib/uploads';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function uniqueSlug(baseSlug: string) {
  let slug = baseSlug;
  let suffix = 2;

  while (db.prepare('SELECT id FROM projects WHERE slug = ?').get(slug)) {
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

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const formData = await request.formData();
  const title = String(formData.get('title') || '').trim();
  if (!title) return new Response('Title is required', { status: 400 });

  const coverFile = formData.get('cover_image');
  const coverImage = coverFile instanceof File && coverFile.size > 0 ? await saveUpload(coverFile, 'image') : null;
  const images = await saveFiles(formData, 'images', 'image');
  const videos = await saveFiles(formData, 'videos', 'video');

  db.prepare(`
    INSERT INTO projects (title, slug, client, year, description, status, sort_order, cover_image, images, videos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    uniqueSlug(slugify(String(formData.get('slug') || title))),
    String(formData.get('client') || '').trim() || null,
    String(formData.get('year') || '').trim() || null,
    String(formData.get('description') || '').trim() || null,
    formData.get('status') === 'published' ? 'published' : 'draft',
    Number(formData.get('sort_order') || 0),
    coverImage,
    JSON.stringify(images),
    JSON.stringify(videos),
  );

  return new Response(null, { status: 303, headers: { Location: adminUrl('projects') } });
};
