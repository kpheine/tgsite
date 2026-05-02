import type { APIRoute } from 'astro';
import { db, type CaseRecord } from '../../lib/db';

type PublicCase = {
  id: number;
  title: string;
  client: string | null;
  image: string;
  alt: string;
  desafio: string | null;
  entrega: string | null;
  resultado: string | null;
};

export const GET: APIRoute = () => {
  const cases = db.prepare(`
    SELECT id, titulo, cliente, main_image_url, desafio, entrega, resultado
    FROM cases
    WHERE status = 'published'
    ORDER BY sort_order DESC, id DESC
  `).all() as Pick<CaseRecord, 'id' | 'titulo' | 'cliente' | 'main_image_url' | 'desafio' | 'entrega' | 'resultado'>[];

  const body: PublicCase[] = cases.map((item) => ({
    id: item.id,
    title: item.titulo,
    client: item.cliente,
    image: item.main_image_url,
    alt: item.cliente ? `${item.titulo}, case para ${item.cliente}` : item.titulo,
    desafio: item.desafio,
    entrega: item.entrega,
    resultado: item.resultado,
  }));

  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
};
