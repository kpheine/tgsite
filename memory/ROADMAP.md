# TGsite Roadmap

## Phase 1 — UI Blocks (Figma → code, one block at a time)
- [ ] Define page sections / site structure
- [ ] Navigation / header
- [ ] Hero section
- [ ] Remaining content sections
- [ ] Projects/portfolio popup overlay

> **Rule:** Always ask for the Figma block link before starting each section.

## Phase 2 — Local SQLite Content Storage
- [x] Create local SQLite schema for admin users, sessions, cases, and case images
- [x] Store case metadata in `./data/site.db`
- [x] Store image/video uploads in `./uploads/`

## Phase 3 — Admin Panel
- [x] Password-protected configurable admin path via `ADMIN_PATH`
- [x] Env-seeded admin user
- [x] CRUD form: title, description, image upload, video upload
- [x] Media served from `uploads/` Docker volume

## Phase 4 — Live Data
- [ ] Replace hardcoded case data with SQLite queries in the portfolio section

## Phase 5 — Production Readiness
- [ ] `docker compose up` tested end-to-end
- [ ] `.env` documented for client handoff
- [ ] SQLite backup/handoff process documented for `data/` and `uploads/`
