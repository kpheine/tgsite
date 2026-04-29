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

## UI Conventions (confirmed in session)

- **Horizontal padding:** 165px fixed on content sections (not percentage-based)
- **Dark background:** `#0d0d0d` for most sections; white for Diferenciais section
- **Decorative blobs:** use `mix-blend-mode: screen` so they glow organically on dark backgrounds
- **Dividers:** `<hr>` with `border-top: 1px solid #fff; margin: 30px 165px`
- **Gradient borders:** use `::before` pseudo-element + CSS mask technique — avoids clipping artifacts with `border-radius: 50%` that the `padding-box/border-box` background trick produces
- **Maps:** embed via `maps.google.com/maps?q=...&output=embed` — no API key needed
- **Header:** `position: sticky; top: 0` (not fixed)

## Font Stack

- **Bebas Neue** — section titles/headings (uppercase)
- **Inter** — UI elements, buttons, body text, footer
- **Figtree** — card body text (Diferenciais, Depoimentos sections)

## Button Style (consistent across site)

- Pill shape: `border-radius: 33px`, `height: 59-60px`
- Outlined: `border: 2px solid #6789d9`, transparent bg, white text, Inter Bold, uppercase
- Hover: `background-color: rgba(103, 137, 217, 0.15)`
- Carousel nav: gradient fill = active; `::before` mask gradient ring = inactive/disabled

## Sections Built (Phase 1 complete)

All in `src/components/`:
1. `Header.astro` — sticky, gradient nav, Contato pill, WhatsApp
2. `HeroSection.astro` — full-bleed dark photo, gradient headline image, social + address
3. `CasesSection.astro` — pixel gradient bg, "CASES" title (centered), carousel placeholder
4. `HistoriaSection.astro` — 2-col: text+CTA left, blob photo right (uses `banner_1.png`)
5. `DiferenciaisSection.astro` — white bg, event collage left, title + 2×2 gradient cards right
6. `ClientesSection.astro` — dark, gradient title, 24 logos in 8×3 grid
7. `DepoimentosSection.astro` — dark, gradient title, 3-card carousel with JS sliding
8. `PremiosSection.astro` — dark, 2-col: text+award logos left, collage right *(layout needs revisit)*
9. `WpiSection.astro` — dark, earth card + WPI/TG logos, tagline, 4 feature blobs
10. `ContatoFooter.astro` — dark, title + CTA, gradient blob (screen blend), hr divider, Google Maps embed, footer

## Git Workflow Preference

- **Commit locally** after each change
- **Push only when user explicitly asks** ("commit and push")
- Do NOT auto-push after every commit

## Figma Asset Workflow

- Figma MCP returns images with temporary URLs (expire in 7 days) — always `curl` them to `public/images/` immediately
- Check file type with `file` command — Figma often returns SVG saved as `.png`; rename accordingly
- When Figma returns wrong/placeholder images, user may upload their own to `public/images/` directly

## Communication Patterns

- When user says "X is Y" about a UI element, it may mean "X should BE Y" (desired state), not reporting current state — confirm if ambiguous before making changes

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

## Known Issues / Revisit Later

- **PremiosSection collage image** (`src/components/PremiosSection.astro`) — size/layout not quite right, needs further adjustment. Currently uses `5fr 7fr` grid with right bleed.

## Roadmap

Full phased plan in `./memory/ROADMAP.md`. Phases:
1. UI blocks from Figma (one at a time, always ask for link)
2. Supabase integration
3. Admin panel (SSR, CRUD, image upload)
4. Wire portfolio to live data
5. Production readiness + client handoff

## Figma Workflow

- The Figma file is messy — do NOT implement it as a whole
- Work block by block: reference only the specific section needed at the time
- Slow and steady approach — one UI section at a time
- **Always ask the user for the Figma block link** before starting any UI section — never assume or reuse a previous URL
