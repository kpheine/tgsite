# TGsite Project Memory

## Stack Decision (2026-04-29)

**Frontend:** Astro (static site generation, pure HTML output)
**Database:** Supabase free tier (DB only — text data for projects)
**Image Storage:** Local Docker volume (mounted at `./uploads/`)
**Hosting:** Google Cloud Compute Engine VM (or any VPS)
**Containerization:** Docker Compose
**Delivery:** via .zip or git

## Key Decisions & Rationale

- Astro chosen over Next.js for simplicity and zero-cost static output
- Supabase used for DB only (not image storage) to avoid 1 GB storage limit and bandwidth concerns
- Images stored in a local Docker volume — no GCS or external storage dependency
- Compute Engine (VM) chosen over Cloud Run: supports persistent Docker volumes, simpler for client to self-manage (`docker compose up`)
- Dev and prod use the same local storage approach — no env switching needed
- Supabase free tier project pausing is a known risk — needs a keep-alive strategy or upgrade to Pro ($25/month)
- Admin panel: simple password-protected page in Astro (SSR mode) with a form to CRUD projects

## Project Context

- Client: advertising agency
- Traffic: <2k visitors/month
- Editable section: projects/portfolio (popup overlay) — title, description, images per project
- Client implements deployment themselves on Google Cloud
- Team: small team collaborating on this repo

## Project Structure (scaffolded 2026-04-29)

```
src/
  layouts/Layout.astro   — base HTML shell, imports global.css, Google Fonts (Inter)
  pages/index.astro      — hello world page
  styles/global.css      — CSS reset + custom properties (dark theme, accent: #e8ff00)
Dockerfile               — multi-stage, Node 20 Alpine, runs dist/server/entry.mjs
docker-compose.yml       — port 4321, uploads volume, reads .env
.env.example             — SUPABASE_URL, SUPABASE_ANON_KEY, HOST, PORT
astro.config.mjs         — output: server, adapter: @astrojs/node (standalone)
```

- `npm run dev` → dev server at localhost:4321
- `docker compose up --build` → production container at localhost:4321

## Figma Workflow

- The Figma file is messy — do NOT implement it as a whole
- Work block by block: reference only the specific section needed at the time
- Slow and steady approach — one UI section at a time
- **Always ask the user for the Figma block link** before starting any UI section — never assume or reuse a previous URL
