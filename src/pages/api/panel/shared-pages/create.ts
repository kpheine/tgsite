import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../../lib/auth';
import { formatBytesLabel } from '../../../../lib/bytes';
import { env } from '../../../../lib/env';
import { createSharedPage, SharedPageError } from '../../../../lib/shared-pages';

function redirectBack(message?: string) {
  const location = message ? `${adminUrl('paginas')}?erro=${encodeURIComponent(message)}` : adminUrl('paginas');
  return new Response(null, { status: 303, headers: { Location: location } });
}

function titleFromFilename(name: string) {
  return name.replace(/\.html?$/i, '').trim();
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File) || !file.name) {
    return redirectBack('Selecione um arquivo HTML para enviar.');
  }

  if (file.size === 0) {
    return redirectBack('O arquivo HTML está vazio.');
  }

  if (file.size > env.uploadMaxHtmlBytes) {
    return redirectBack(`O arquivo excede o limite de ${formatBytesLabel(env.uploadMaxHtmlBytes)}.`);
  }

  const html = await file.text();
  const title = String(formData.get('title') || '').trim() || titleFromFilename(file.name);

  try {
    createSharedPage({ title, html });
  } catch (error) {
    if (error instanceof SharedPageError) return redirectBack(error.message);
    throw error;
  }

  return redirectBack();
};
