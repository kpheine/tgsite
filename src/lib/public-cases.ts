import { db, type CaseImageRecord, type CaseRecord } from './db';

export type PublicCaseImage = {
  url: string;
  destaque: boolean;
};

export type PublicCase = {
  id: number;
  title: string;
  client: string | null;
  image: string;
  video: string | null;
  alt: string;
  desafio: string | null;
  entrega: string | null;
  resultado: string | null;
  images: PublicCaseImage[];
};

export function getPublicCases(): PublicCase[] {
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

  return cases.map((item) => ({
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
}
