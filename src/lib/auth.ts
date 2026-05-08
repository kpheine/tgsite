import { compareSync } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
import { env } from './env';

const SESSION_COOKIE = 'tg_admin_session';
const SESSION_IDLE_MINUTES = 30;

interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  support_enabled: 0 | 1;
  support_expires_at: string | null;
}

export function getAdminPath() {
  return env.adminPath;
}

export function isAdminPath(param: string | undefined) {
  return param === getAdminPath();
}

export function adminUrl(path = '') {
  const cleanPath = path.replace(/^\/+/, '');
  return `/${getAdminPath()}${cleanPath ? `/${cleanPath}` : ''}`;
}

const sessionSecret = env.sessionSecret;

function hashToken(token: string) {
  return createHash('sha256').update(`${sessionSecret}:${token}`).digest('hex');
}

function isSessionCookieSecure() {
  return env.sessionCookieSecure;
}

function sqliteDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function sessionExpiresAt() {
  return sqliteDateTime(new Date(Date.now() + SESSION_IDLE_MINUTES * 60 * 1000));
}

export function login(username: string, password: string) {
  const cleanUsername = username.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername) as UserRecord | undefined;
  if (!user || !compareSync(password, user.password_hash)) return null;
  if (!user.support_enabled) return null;
  if (user.support_expires_at && new Date(`${user.support_expires_at.replace(' ', 'T')}Z`) <= new Date()) return null;

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = sessionExpiresAt();

  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, user.id, expiresAt);
  db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  return { token, expiresAt };
}

export function setSessionCookie(cookies: any, token: string, expiresAt: string) {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isSessionCookieSecure(),
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

  const tokenHash = hashToken(token);

  const user = db.prepare(`
    SELECT users.id, users.username, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
      AND sessions.expires_at > CURRENT_TIMESTAMP
      AND users.support_enabled = 1
      AND (users.support_expires_at IS NULL OR users.support_expires_at > CURRENT_TIMESTAMP)
  `).get(tokenHash) as Pick<UserRecord, 'id' | 'username' | 'role'> | undefined;

  if (user) {
    const expiresAt = sessionExpiresAt();
    db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(expiresAt, tokenHash);
    setSessionCookie(cookies, token, expiresAt);
  }

  return user || null;
}

export function requireUser(cookies: any) {
  return getCurrentUser(cookies);
}
