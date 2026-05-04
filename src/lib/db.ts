import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { getEnv } from './env';

export const SUPPORT_ADMIN_USERNAME = 'support-admin';

const dbPath = resolve(process.cwd(), 'data/site.db');
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    support_enabled INTEGER NOT NULL DEFAULT 1,
    support_expires_at TEXT,
    last_login_at TEXT,
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
    main_image_url TEXT NOT NULL,
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

function columnExists(table: string, column: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((item: any) => item.name === column);
}

if (!columnExists('users', 'username')) {
  db.prepare('ALTER TABLE users ADD COLUMN username TEXT').run();
  db.prepare('UPDATE users SET username = lower(email) WHERE username IS NULL').run();
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username)').run();
}

if (!columnExists('users', 'support_enabled')) {
  db.prepare('ALTER TABLE users ADD COLUMN support_enabled INTEGER NOT NULL DEFAULT 1').run();
}

if (!columnExists('users', 'support_expires_at')) {
  db.prepare('ALTER TABLE users ADD COLUMN support_expires_at TEXT').run();
}

if (!columnExists('users', 'last_login_at')) {
  db.prepare('ALTER TABLE users ADD COLUMN last_login_at TEXT').run();
}

db.prepare('UPDATE users SET support_enabled = 1 WHERE support_enabled IS NULL').run();

const hasLegacyEmailColumn = columnExists('users', 'email');

function insertUser(username: string, passwordHash: string, role: string, supportEnabled: 0 | 1) {
  if (hasLegacyEmailColumn) {
    db.prepare('INSERT INTO users (email, username, password_hash, role, support_enabled) VALUES (?, ?, ?, ?, ?)').run(
      `${username}@local.invalid`,
      username,
      passwordHash,
      role,
      supportEnabled,
    );
    return;
  }

  db.prepare('INSERT INTO users (username, password_hash, role, support_enabled) VALUES (?, ?, ?, ?)').run(
    username,
    passwordHash,
    role,
    supportEnabled,
  );
}

export interface CaseRecord {
  id: number;
  titulo: string;
  cliente: string | null;
  main_image_url: string;
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
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return;

  const username = getEnv('ADMIN_USERNAME', 'admin');
  const password = getEnv('ADMIN_PASSWORD');

  if (!username || !password) return;

  insertUser(
    username.trim().toLowerCase(),
    hashSync(password, 12),
    'admin',
    1,
  );
}

function syncAdminUsernameFromEnv() {
  const username = getEnv('ADMIN_USERNAME', 'admin').trim().toLowerCase();
  const admin = db.prepare("SELECT id, username FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").get() as
    | { id: number; username: string | null }
    | undefined;
  if (!admin || admin.username === username) return;

  const usernameTaken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, admin.id);
  if (!usernameTaken) {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, admin.id);
  }
}

function ensureSupportUser() {
  const username = SUPPORT_ADMIN_USERNAME;
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return;

  insertUser(
    username,
    hashSync(randomUUID(), 12),
    'support',
    0,
  );
}

seedAdminUser();
syncAdminUsernameFromEnv();
ensureSupportUser();
