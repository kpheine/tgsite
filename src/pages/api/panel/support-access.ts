import type { APIRoute } from 'astro';
import { hashSync } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { adminUrl, requireUser } from '../../../lib/auth';
import { db, SUPPORT_ADMIN_USERNAME } from '../../../lib/db';

const SUPPORT_PASSWORD_COOKIE = 'tg_support_password_once';
const SUPPORT_ACCESS_HOURS = 24;

function sqliteDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = requireUser(cookies);
  if (!user || user.role !== 'admin') {
    return new Response('Não autorizado', { status: 403 });
  }

  const formData = await request.formData();
  const action = String(formData.get('action') || '');
  const supportUsername = SUPPORT_ADMIN_USERNAME;

  if (action === 'disable') {
    db.prepare('UPDATE users SET support_enabled = 0, support_expires_at = NULL WHERE username = ? AND role = ?').run(
      supportUsername,
      'support',
    );
    db.prepare(`
      DELETE FROM sessions
      WHERE user_id IN (SELECT id FROM users WHERE username = ? AND role = ?)
    `).run(supportUsername, 'support');
    cookies.delete(SUPPORT_PASSWORD_COOKIE, { path: '/' });

    return new Response(null, { status: 303, headers: { Location: `${adminUrl()}?support=disabled` } });
  }

  if (action !== 'enable') {
    return new Response('Ação inválida', { status: 400 });
  }

  const password = randomBytes(18).toString('base64url');
  const expiresAt = sqliteDateTime(new Date(Date.now() + SUPPORT_ACCESS_HOURS * 60 * 60 * 1000));

  db.prepare(`
    UPDATE users
    SET password_hash = ?, support_enabled = 1, support_expires_at = ?
    WHERE username = ? AND role = ?
  `).run(hashSync(password, 12), expiresAt, supportUsername, 'support');

  db.prepare(`
    DELETE FROM sessions
    WHERE user_id IN (SELECT id FROM users WHERE username = ? AND role = ?)
  `).run(supportUsername, 'support');

  cookies.set(SUPPORT_PASSWORD_COOKIE, password, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60,
  });

  return new Response(null, { status: 303, headers: { Location: `${adminUrl()}?support=enabled` } });
};
