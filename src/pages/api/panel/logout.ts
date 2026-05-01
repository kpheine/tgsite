import type { APIRoute } from 'astro';
import { adminUrl, clearSession } from '../../../lib/auth';

export const POST: APIRoute = ({ cookies }) => {
  clearSession(cookies);
  return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
};
