import type { APIRoute } from 'astro';
import { db, type CaseImageRecord, type CaseRecord } from '../../lib/db';
import type { PublicCase } from '../../lib/public-cases';

export const GET: APIRoute = () => {
  const cases = db.prepare(`
    SELECT id, titulo, cliente, main_image_url, video_url, desafio, entrega, resultado
    FROM cases
    WHERE status = 'published'
    ORDER BY sort_order DESC, id DESC
  `).all() as Pick<CaseRecord, 'id' | 'titulo' | 'cliente' | 'main_image_url' | 'video_url' | 'desafio' | 'entrega' | 'resultado'>[];

  const selectImages = db.prepare(`
    SELECT url, destaque
    FROM imagens_case
    WHERE case_id = ?
    ORDER BY sort_order ASC, id ASC
  `);

  const body: PublicCase[] = cases.map((item) => ({
    id: item.id,
    title: item.titulo,
    client: item.cliente,
    image: item.main_image_url,
    video: item.video_url,
    alt: item.cliente ? `${item.titulo}, case para ${item.cliente}` : item.titulo,
    desafio: item.desafio,
    entrega: item.entrega,
    resultado: item.resultado,
    images: (selectImages.all(item.id) as Pick<CaseImageRecord, 'url' | 'destaque'>[]).map((image) => ({
      url: image.url,
      destaque: image.destaque === 1,
    })),
  }));

  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
};
