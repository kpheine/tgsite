import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getEnv } from './env';

const dbPath = resolve(process.cwd(), 'data/site.db');
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    cliente TEXT,
    video_url TEXT,
    desafio TEXT,
    entrega TEXT,
    resultado TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS imagens_case (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    url TEXT NOT NULL,
    destaque INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );
`);

export interface CaseRecord {
  id: number;
  titulo: string;
  cliente: string | null;
  video_url: string | null;
  desafio: string | null;
  entrega: string | null;
  resultado: string | null;
  status: 'draft' | 'published';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CaseImageRecord {
  id: number;
  case_id: number;
  sort_order: number;
  url: string;
  destaque: 0 | 1;
  created_at: string;
}

function seedAdminUser() {
  const existing = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (existing) return;

  const email = getEnv('ADMIN_EMAIL');
  const password = getEnv('ADMIN_PASSWORD');

  if (!email || !password) return;

  db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(
    email.toLowerCase(),
    hashSync(password, 12),
    'admin',
  );
}

seedAdminUser();
