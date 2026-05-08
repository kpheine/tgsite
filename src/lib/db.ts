import Database from 'better-sqlite3';
import { compareSync, hashSync } from 'bcryptjs';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { env } from './env';

export const SUPPORT_ADMIN_USERNAME = 'support-admin';
const DB_SCHEMA_VERSION = 2;

const dbPath = resolve(process.cwd(), 'data/site.db');
mkdirSync(dirname(dbPath), { recursive: true });
const shouldCreateSchema = !existsSync(dbPath);

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

if (shouldCreateSchema) {
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      support_enabled INTEGER NOT NULL DEFAULT 1,
      support_expires_at TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE cases (
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

    CREATE TABLE imagens_case (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      url TEXT NOT NULL,
      destaque INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      quote TEXT NOT NULL,
      person_name TEXT NOT NULL,
      person_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.pragma(`user_version = ${DB_SCHEMA_VERSION}`);
} else {
  const schemaVersion = db.pragma('user_version', { simple: true });

  if (schemaVersion !== DB_SCHEMA_VERSION) {
    throw new Error(
      `Local database schema is outdated. Run "npm run dev:reset" to recreate ./data/site.db for development.`,
    );
  }
}

function insertUser(username: string, passwordHash: string, role: string, supportEnabled: 0 | 1) {
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

export interface TestimonialRecord {
  id: number;
  title: string;
  quote: string;
  person_name: string;
  person_role: string;
  status: 'draft' | 'published';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function syncPrimaryAdminFromEnv() {
  const username = env.adminUsername;
  const password = env.adminPassword;

  const admin = db.prepare("SELECT id, username, password_hash FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").get() as
    | { id: number; username: string | null; password_hash: string }
    | undefined;

  if (!admin) {
    insertUser(username, hashSync(password, 12), 'admin', 1);
    return;
  }

  if (admin.username !== username) {
    const usernameTaken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, admin.id);
    if (usernameTaken) {
      throw new Error(`ADMIN_USERNAME "${username}" is already used by another account. Choose a different admin username.`);
    }

    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, admin.id);
  }

  if (!compareSync(password, admin.password_hash)) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashSync(password, 12), admin.id);
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

syncPrimaryAdminFromEnv();
ensureSupportUser();
