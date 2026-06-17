#!/usr/bin/env node
// Dev-only client preview: starts the Astro dev server and exposes it through a
// Cloudflare "quick tunnel" so a client can view the local site over HTTPS.
//
// Usage:  npm run staging   (then share the printed *.trycloudflare.com URL)
//
// Notes / caveats (see memory/MEMORY.md "Staging / Client Preview"):
//   - Ephemeral: the URL only works while this script runs and the PC is awake.
//   - A new random subdomain is issued each run; just reshare it.
//   - Requires cloudflared: winget install --id Cloudflare.cloudflared
//   - The whole app is exposed, including the admin panel — keep ADMIN_PASSWORD
//     strong and avoid sharing the admin path.
//
// Press Ctrl+C to stop both the tunnel and the dev server.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const isWindows = process.platform === 'win32';

function findCloudflared() {
  const probe = spawnSync(isWindows ? 'where' : 'which', ['cloudflared'], {
    encoding: 'utf8',
  });
  if (probe.status === 0) {
    const onPath = probe.stdout.split(/\r?\n/).find(Boolean);
    if (onPath) return onPath.trim();
  }
  // Default winget/MSI install location on Windows.
  const winDefault = 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe';
  if (isWindows && existsSync(winDefault)) return winDefault;
  return null;
}

const cloudflared = findCloudflared();
if (!cloudflared) {
  console.error('\n[staging] cloudflared not found on this machine.');
  console.error('[staging] Install it, then rerun:');
  console.error('[staging]   winget install --id Cloudflare.cloudflared\n');
  process.exit(1);
}

let tunnel = null;
let detectedPort = null;
let shuttingDown = false;

function killTree(child) {
  if (!child || child.killed) return;
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n[staging] Shutting down dev server and tunnel...');
  killTree(tunnel);
  killTree(dev);
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[staging] Starting Astro dev server...');

const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const dev = spawn(npmCmd, ['run', 'dev'], {
  shell: isWindows,
  stdio: ['ignore', 'pipe', 'pipe'],
});

function startTunnel(port) {
  console.log(`\n[staging] Dev server ready on http://localhost:${port}`);
  console.log('[staging] Opening Cloudflare tunnel — share the URL printed below.\n');
  tunnel = spawn(cloudflared, ['tunnel', '--url', `http://localhost:${port}`], {
    stdio: 'inherit',
  });
  tunnel.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[staging] Tunnel exited (code ${code}).`);
      shutdown(code ?? 0);
    }
  });
}

// Astro/Vite prints the port to stdout (and sometimes stderr); scan both.
function scan(line) {
  if (detectedPort) return;
  const match = line.match(/localhost:(\d+)/);
  if (match) {
    detectedPort = match[1];
    startTunnel(detectedPort);
  }
}

function pipe(stream, out) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl);
      out.write(line + '\n');
      scan(line);
      buffer = buffer.slice(nl + 1);
    }
  });
}

pipe(dev.stdout, process.stdout);
pipe(dev.stderr, process.stderr);

dev.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[staging] Dev server exited (code ${code}).`);
    shutdown(code ?? 0);
  }
});
