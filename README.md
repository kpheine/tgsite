# TGsite

Website for an advertising agency. Built with Astro (SSR), Docker, SQLite, and local file uploads.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Astro 5 (SSR, `@astrojs/node` adapter) |
| Database | SQLite via `better-sqlite3` (`./data/site.db`) |
| Media storage | Local Docker volume (`./uploads/`) |
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

# -> http://localhost:4321
```

SQLite data is persisted in `./data/site.db`, and uploaded images/videos are persisted in `./uploads/` on the host machine via Docker volume bind mounts.

## Verification

Before handing off or packaging a release, run:

```bash
npm run check
npm run build
docker compose up --build
```

`npm run check` runs Astro's TypeScript/template validation. `npm run build` verifies the production build. `docker compose up --build` verifies the production-like container starts with the same local SQLite/upload storage model used for deployment.

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|---|---|
| `ADMIN_PATH` | One-segment private admin path, for example `/painel-tg-2026` |
| `ADMIN_USERNAME` | Primary admin username synced into SQLite on startup |
| `ADMIN_PASSWORD` | Primary admin password synced into SQLite on startup; must be set and changed from the default |
| `SESSION_SECRET` | Secret used to hash session tokens; must be set and changed from the default |
| `HOST` | Server bind address (use `0.0.0.0` in Docker) |
| `PORT` | Server port (default `4321`) |

## Project structure

```
src/
  components/            — public sections, modal components, admin layout
  layouts/Layout.astro   — public HTML shell
  lib/                   — auth, SQLite, env, upload helpers
  pages/                 — public pages, admin routes, API routes, upload serving
  scripts/               — public modal and admin form/upload behaviors
  styles/global.css      — public CSS reset + modal styles
Dockerfile               — multi-stage Node 20 Alpine build
docker-compose.yml       — single-service compose config
.env.example             — env variable template
memory/
  MEMORY.md              — team memory: stack decisions, architecture
  ROADMAP.md             — phased development plan
```

## Roadmap

See [`memory/ROADMAP.md`](./memory/ROADMAP.md) for the full phased plan:

1. UI blocks from Figma
2. Local SQLite content storage
3. Admin panel (CRUD, image/video upload)
4. Wire portfolio to SQLite-backed live data
5. Production readiness + client handoff

## Figma

The Figma file is intentionally worked **block by block** — do not try to implement the full design at once. Always ask for a specific section link before starting work on any UI area.

## AI assistant (Claude Code)

This project uses Claude Code. Key files:

- `CLAUDE.md` — instructions for the AI (stack rules, workflow notes)
- `memory/MEMORY.md` — persistent project memory (read this first each session)
