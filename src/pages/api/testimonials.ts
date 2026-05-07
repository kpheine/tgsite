import type { APIRoute } from 'astro';
import { getPublicTestimonials } from '../../lib/public-testimonials';

export const GET: APIRoute = () => {
  const body = getPublicTestimonials();

  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
};
