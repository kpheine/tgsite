import type { APIRoute } from 'astro';
import { getPublicCases } from '../../lib/public-cases';

export const GET: APIRoute = () => {
  const body = getPublicCases();

  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
};
