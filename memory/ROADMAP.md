# TGsite Roadmap

## Phase 1 — UI Blocks (Figma → code, one block at a time)
- [ ] Define page sections / site structure
- [ ] Navigation / header
- [ ] Hero section
- [ ] Remaining content sections
- [ ] Projects/portfolio popup overlay

> **Rule:** Always ask for the Figma block link before starting each section.

## Phase 2 — Supabase Integration
- [ ] Create `projects` table (title, description, image_paths, order)
- [ ] Connect Astro to Supabase (env vars already stubbed in `.env.example`)

## Phase 3 — Admin Panel
- [ ] Password-protected `/admin` page (Astro SSR)
- [ ] CRUD form: title, description, image upload
- [ ] Images served from `uploads/` Docker volume

## Phase 4 — Live Data
- [ ] Replace hardcoded project data with Supabase queries in the portfolio section

## Phase 5 — Production Readiness
- [ ] `docker compose up` tested end-to-end
- [ ] `.env` documented for client handoff
- [ ] Supabase keep-alive strategy decided (cron ping or Pro plan)
