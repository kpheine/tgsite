# TGsite

Website for an advertising agency. Built with Astro (SSR), Docker, Caddy, SQLite, and local file uploads.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Astro 5 (SSR, `@astrojs/node` adapter) |
| Database | SQLite via `better-sqlite3` (`./data/site.db`) |
| Media storage | Local Docker volume (`./uploads/`) |
| Reverse proxy / HTTPS | Caddy 2 |
| Containerization | Docker Compose |
| Hosting | Google Cloud Compute Engine (or any VPS) |

## Prerequisites

- [Node.js 20+](https://nodejs.org/) and npm
- [Docker](https://www.docker.com/) + Docker Compose (for production)

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your values
cp .env.example .env

# 3. Start dev server
npm run dev
# -> http://localhost:4321
```

## Running with Docker (production-like)

```bash
# Build and start
docker compose up --build

# -> Caddy listens on ports 80/443 for the domains in SITE_DOMAINS
```

Production traffic should enter through Caddy on ports `80` and `443`. The Astro app is only exposed inside the Docker network at `app:4321`.

For local Docker smoke testing without a real domain, set `SITE_DOMAINS=localhost` in `.env` and open `http://localhost`.

SQLite data is persisted in `./data/site.db`, uploaded images are persisted in `./uploads/`, and Caddy certificates are persisted in Docker volumes. Case videos are stored as YouTube URLs.

## Verification

Before handing off or packaging a release, run:

```bash
npm run check
npm run build
docker compose up --build
```

`npm run check` runs Astro's TypeScript/template validation. `npm run build` verifies the production build. `docker compose up --build` verifies the production-like Caddy + app stack starts with the same local SQLite/upload storage model used for deployment.

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|---|---|
| `SITE_DOMAINS` | Comma-separated production domains served by Caddy, for example `example.com, www.example.com`; do not include `https://` |
| `ADMIN_PATH` | One-segment private admin path, for example `/painel-tg-2026` |
| `ADMIN_USERNAME` | Primary admin username synced into SQLite on startup |
| `ADMIN_PASSWORD` | Primary admin password synced into SQLite on startup; must be set and changed from the default |
| `SESSION_SECRET` | Secret used to hash session tokens; must be set and changed from the default |
| `SESSION_COOKIE_SECURE` | Whether admin cookies require HTTPS; keep `true` for production with Caddy |
| `UPLOAD_MAX_IMAGE_BYTES` | Maximum image upload size in bytes |

## Project structure

```
src/
  components/            — public sections, modal components, admin layout
  layouts/Layout.astro   — public HTML shell
  lib/                   — auth, SQLite, env, upload helpers
  pages/                 — public pages, admin routes, API routes, upload serving
  scripts/               — public modal and admin form/upload behaviors
  styles/global.css      — public CSS reset + modal styles
Caddyfile                — Caddy reverse proxy and automatic HTTPS config
Dockerfile               — multi-stage Node 20 Alpine app build
docker-compose.yml       — Caddy + app production compose config
.env.example             — env variable template
memory/
  MEMORY.md              — team memory: stack decisions, architecture
  ROADMAP.md             — phased development plan
```

## Roadmap

See [`memory/ROADMAP.md`](./memory/ROADMAP.md) for the full phased plan:

1. UI blocks from Figma
2. Local SQLite content storage
3. Admin panel (CRUD, image upload, YouTube video URL)
4. Wire portfolio to SQLite-backed live data
5. Production readiness + client handoff

## Figma

The Figma file is intentionally worked **block by block** — do not try to implement the full design at once. Always ask for a specific section link before starting work on any UI area.

## AI assistant (Claude Code)

This project uses Claude Code. Key files:

- `CLAUDE.md` — instructions for the AI (stack rules, workflow notes)
- `memory/MEMORY.md` — persistent project memory (read this first each session)
