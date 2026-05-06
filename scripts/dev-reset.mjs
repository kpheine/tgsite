import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const root = process.cwd();
const yes = process.argv.includes('--yes') || process.argv.includes('-y');

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset local data with NODE_ENV=production.');
  process.exit(1);
}

if (!yes) {
  const rl = createInterface({ input, output });
  const answer = await rl.question('This will delete ./data/site.db and all ./uploads files. Continue? Type "reset": ');
  rl.close();

  if (answer !== 'reset') {
    console.log('Reset cancelled.');
    process.exit(0);
  }
}

const dataDir = resolve(root, 'data');
const dbFiles = ['site.db', 'site.db-wal', 'site.db-shm'].map((file) => resolve(dataDir, file));
const uploadsDir = resolve(root, 'uploads');

mkdirSync(dataDir, { recursive: true });

for (const file of dbFiles) {
  if (existsSync(file)) {
    rmSync(file, { force: true });
  }
}

mkdirSync(uploadsDir, { recursive: true });

for (const entry of readdirSync(uploadsDir)) {
  const target = resolve(uploadsDir, entry);
  rmSync(target, { recursive: true, force: true });
}

console.log('Development database and uploads reset.');
