import type { APIRoute } from 'astro';
import { adminUrl, login, setSessionCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const username = String(formData.get('username') || '');
  const password = String(formData.get('password') || '');
  const adminPath = String(formData.get('adminPath') || '').replace(/^\/+|\/+$/g, '');

  const session = login(username, password);
  if (!session) {
    return new Response(null, { status: 303, headers: { Location: `/${adminPath}/login?error=1` } });
  }

  setSessionCookie(cookies, session.token, session.expiresAt);
  return new Response(null, { status: 303, headers: { Location: adminUrl() } });
};
