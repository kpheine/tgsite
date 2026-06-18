import { randomBytes } from 'node:crypto';
import { db, type SharedPageRecord } from './db';

export class SharedPageError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export type SharedPageListItem = Pick<SharedPageRecord, 'id' | 'token' | 'title' | 'created_at'>;

const MAX_TOKEN_ATTEMPTS = 5;

function generateToken() {
  // 16 random bytes => 128 bits of entropy, URL-safe (~22 chars).
  return randomBytes(16).toString('base64url');
}

export function listSharedPages(): SharedPageListItem[] {
  return db
    .prepare('SELECT id, token, title, created_at FROM shared_pages ORDER BY created_at DESC, id DESC')
    .all() as SharedPageListItem[];
}

export function getSharedPageHtml(token: string | undefined): { html: string } | undefined {
  if (!token) return undefined;
  return db.prepare('SELECT html FROM shared_pages WHERE token = ?').get(token) as { html: string } | undefined;
}

export function createSharedPage({ title, html }: { title: string; html: string }): string {
  const cleanHtml = html.trim();
  if (!cleanHtml) throw new SharedPageError('O arquivo HTML está vazio.');

  const cleanTitle = title.trim() || 'Página sem título';
  const insert = db.prepare('INSERT INTO shared_pages (token, title, html) VALUES (?, ?, ?)');

  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt += 1) {
    const token = generateToken();
    try {
      insert.run(token, cleanTitle, cleanHtml);
      return token;
    } catch (error) {
      // Absorb the (astronomically unlikely) UNIQUE collision and retry.
      if (error instanceof Error && /UNIQUE/i.test(error.message)) continue;
      throw error;
    }
  }

  throw new SharedPageError('Não foi possível gerar um link único. Tente novamente.', 500);
}

export function deleteSharedPage(id: number) {
  if (!Number.isInteger(id)) throw new SharedPageError('Não encontrado', 404);
  db.prepare('DELETE FROM shared_pages WHERE id = ?').run(id);
}
