# TGsite

Website for an advertising agency. Built with Astro (SSR), Docker, and Supabase.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Astro 5 (SSR, `@astrojs/node` adapter) |
| Database | Supabase free tier (text data only) |
| Image storage | Local Docker volume (`./uploads/`) |
| Containerization | Docker Compose |
| Hosting | Google Cloud Compute Engine (or any VPS) |

## Prerequisites

- [Node.js 20+](https://nodejs.org/) and npm
- [Docker](https://www.docker.com/) + Docker Compose (for production)
- A [Supabase](https://supabase.com/) project (for DB)

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

Uploaded images are persisted in `./uploads/` on the host machine via a Docker volume bind mount.

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `HOST` | Server bind address (use `0.0.0.0` in Docker) |
| `PORT` | Server port (default `4321`) |

## Project structure

```
src/
  layouts/Layout.astro   — base HTML shell
  pages/index.astro      — home page
  styles/global.css      — CSS reset + design tokens
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
2. Supabase integration
3. Admin panel (CRUD, image upload)
4. Wire portfolio to live data
5. Production readiness + client handoff

## Figma

The Figma file is intentionally worked **block by block** — do not try to implement the full design at once. Always ask for a specific section link before starting work on any UI area.

## AI assistant (Claude Code)

This project uses Claude Code. Key files:

- `CLAUDE.md` — instructions for the AI (stack rules, workflow notes)
- `memory/MEMORY.md` — persistent project memory (read this first each session)
