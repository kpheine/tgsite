import { compareSync } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
import { getEnv } from './env';

const SESSION_COOKIE = 'tg_admin_session';
const SESSION_DAYS = 7;

interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  role: string;
}

export function getAdminPath() {
  return getEnv('ADMIN_PATH', '/painel-tg-2026').replace(/^\/+|\/+$/g, '') || 'painel-tg-2026';
}

export function isAdminPath(param: string | undefined) {
  return param === getAdminPath();
}

export function adminUrl(path = '') {
  const cleanPath = path.replace(/^\/+/, '');
  return `/${getAdminPath()}${cleanPath ? `/${cleanPath}` : ''}`;
}

function hashToken(token: string) {
  const secret = getEnv('SESSION_SECRET', 'dev-session-secret');
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

function sqliteDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function login(email: string, password: string) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as UserRecord | undefined;
  if (!user || !compareSync(password, user.password_hash)) return null;

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = sqliteDateTime(new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000));

  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, user.id, expiresAt);

  return { token, expiresAt };
}

export function setSessionCookie(cookies: any, token: string, expiresAt: string) {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    expires: new Date(`${expiresAt.replace(' ', 'T')}Z`),
  });
}

export function clearSession(cookies: any) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getCurrentUser(cookies: any) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const user = db.prepare(`
    SELECT users.id, users.email, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP
  `).get(hashToken(token)) as Pick<UserRecord, 'id' | 'email' | 'role'> | undefined;

  return user || null;
}

export function requireUser(cookies: any) {
  return getCurrentUser(cookies);
}
