# TGsite Project Memory

## Stack Decision (2026-04-29)

**Frontend:** Astro (static site generation, pure HTML output)
**Database:** SQLite via `better-sqlite3` (`./data/site.db` Docker volume)
**Image Storage:** Local Docker volume (mounted at `./uploads/`)
**Hosting:** Google Cloud Compute Engine VM (or any VPS)
**Containerization:** Docker Compose
**Delivery:** via .zip or git

## Key Decisions & Rationale

- Astro chosen over Next.js for simplicity and zero-cost static output
- SQLite replaced Supabase for the admin/content database to avoid external service dependency and free-tier pausing risk
- Images stored in a local Docker volume — no GCS or external storage dependency
- Compute Engine (VM) chosen over Cloud Run: supports persistent Docker volumes, simpler for client to self-manage (`docker compose up`)
- Dev and prod use the same local storage approach — no env switching needed
- Admin panel: configurable one-segment path from `ADMIN_PATH` (default `/painel-tg-2026`), password-protected via env-seeded admin user, SQLite sessions, case CRUD, square draggable case cards for ordering (new cases append at highest `sort_order` and display first via descending order), drag-and-drop image upload with upload-time preview/order/removal/destaque selection, local video upload with drag-and-drop zone, selected-video metadata/preview/removal, current-video remove/restore state, replacement mode that hides the old video while a new video is pending and restores it on cancel, individual image removal, and drag-and-drop existing image ordering. Case image cards use a shared Astro component for existing and pending uploads, with `Nova` / `Será removida` banners, button-based remove/restore, yellow bordered destaque toggle, non-opening draggable previews, pointer-aligned drag ghost previews, and one shared ordering grid so newly uploaded images can be placed among existing images before saving. Public site is not connected to dashboard data yet.
- Admin dashboard UI and admin-facing errors must always be in Brazilian Portuguese (`pt-BR`); keep internal status values like `draft`/`published` unchanged for database/API compatibility, but display them as `Rascunho`/`Publicado`.
- Server env reads go through `src/lib/env.ts`, which checks Astro `import.meta.env` first and falls back to `process.env`; this keeps `.env` working in `npm run dev` and Docker/process env working in production.
- Popup framework: native HTML `<dialog>` wrapped by `src/components/Modal.astro`, controlled by `src/scripts/modal-manager.ts`; content is layout-agnostic and can come from Astro components, structured Supabase data, Markdown-rendered HTML, or sanitized raw HTML. Open/close transitions are handled with `.is-open` / `.is-closing` classes plus a short close delay so native dialogs can animate out. Modal scroll lock measures the active scrollbar width and compensates with body padding only when needed to avoid layout shifts without forcing a permanent gutter.

## Project Context

- Client: advertising agency
- Traffic: <2k visitors/month
- Editable section planned: cases/portfolio (popup overlay) — título, cliente, uploaded local video, desafio, entrega, resultado, status, and images per case. Admin stores this data now, but public sections still use hardcoded content.
- Client implements deployment themselves on Google Cloud
- Team: small team collaborating on this repo

## UI Conventions (confirmed in session)

- **Horizontal padding:** 165px fixed on content sections (not percentage-based)
- **Dark background:** `#0d0d0d` for most sections; white for Diferenciais section
- **Decorative blobs:** use `mix-blend-mode: screen` so they glow organically on dark backgrounds
- **Dividers:** `<hr>` with `border-top: 1px solid #fff; margin: 30px 165px`
- **Gradient borders:** use `::before` pseudo-element + CSS mask technique — avoids clipping artifacts with `border-radius: 50%` that the `padding-box/border-box` background trick produces
- **Maps:** embed via `maps.google.com/maps?q=...&output=embed` — no API key needed
- **Header:** `position: sticky; top: 0` (not fixed) with `margin-bottom: -120px` so the hero sits behind the transparent gradient header instead of creating a top band

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

## /sobre Page (in progress)

All in `src/components/` and `src/pages/sobre.astro`:
1. `sobre.astro` — page shell: Header + sections + ContatoFooter
2. Hero — full-bleed event photo (`sobre_hero.jpg`), Bebas Neue heading overlay
3. `SobreStatsSection.astro` — dark, Bebas Neue heading, "Já foram mais de", 4-col stats with gradient blobs + dividers, tagline
4. `SobreClientesSection.astro` — dark, gradient "AQUI TEM" title, Figtree subtitle, 8×3 logo grid (25 logos in `public/images/sobre_clientes/`)
5. `SobrePremiosSection.astro` — same as `PremiosSection.astro` but without the CTA button
6. `SobreAwardsCards.astro` — 3 gradient award cards (FIP full-width, Colunistas+Lusófonos row, Caio full-width)

## Git Workflow Preference

- **Commit locally** after each change
- **Push only when user explicitly asks** ("commit and push")
- Do NOT auto-push after every commit

## Figma Asset Workflow

- Figma MCP returns images with temporary URLs (expire in 7 days) — always `curl` them to `public/images/` immediately
- Check file type with `file` command — Figma often returns SVG saved as `.png`; rename accordingly
- When Figma returns wrong/placeholder images, user may upload their own to `public/images/` directly
- Download multiple assets in parallel batches (curl in one Bash call) to save time
- For sections with many logos/assets, create a dedicated subfolder under `public/images/` (e.g. `sobre_clientes/`)

## Figma Spacing Workflow

- Figma MCP returns absolute canvas Y-coordinates for every element — always compute gaps: `top_of_next − (top_of_prev + estimated_height)`
- Estimated height: font-size × line-height × number_of_lines (e.g. 120px Bebas Neue, 1 line ≈ 130px)
- `whitespace-nowrap` in Figma output = single line, no wrapping — use that for height estimates
- Apply computed gaps directly as CSS `margin-top` values; do not guess or use round numbers
- Always do this math before setting any margin/padding in a new section

## Logo Grid Conventions

- Logo grid cells: `overflow: hidden; display: flex; align-items: center; justify-content: center`
- All `img` inside: `min-width: 0; max-width: 100%; flex-shrink: 1` — prevents overflow in multi-image cells
- White logos on dark bg: `filter: brightness(0) invert(1); opacity: 0.85`
- Multi-image cells (e.g. composite logos): add `gap` on the cell, both images get `flex-shrink: 1`

## Gradient Text Technique

```css
background: linear-gradient(to right, #colorA, #colorB);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```
- Works for partial gradient (e.g. first two words gradient, rest white): wrap each part in a `<span>`
- Preserve exact gradient angle and stop percentages verbatim from Figma output

## Gradient Cards Pattern (SobreAwardsCards)

- Cards: `border: 1px solid #cdcdcd; border-radius: 30px; min-height: 246px`
- Background: verbatim `linear-gradient(...)` from Figma — never approximate colors
- Internal layout: CSS Grid (`repeat(3, 1fr)` for full-width cards, `repeat(2, 1fr)` for split cards)
- Row 2 asymmetric split: `grid-template-columns: 465fr 1113fr; gap: 18px` (from Figma pixel widths)
- Title: Figtree Black (900), 42px; Body: Figtree Regular, ~21px

## Communication Patterns

- When user says "X is Y" about a UI element, it may mean "X should BE Y" (desired state), not reporting current state — confirm if ambiguous before making changes

## Project Structure (scaffolded 2026-04-29)

```
src/
  components/AdminLayout.astro — standalone dashboard shell for private content management
  components/Modal.astro    — reusable layout-agnostic modal shell using native <dialog>
  layouts/Layout.astro   — base HTML shell, imports global.css, Google Fonts (Inter)
  lib/auth.ts            — admin path helpers, login/session cookie utilities
  lib/db.ts              — SQLite connection, schema, env admin seeding (`cases`, `imagens_case`)
  lib/env.ts             — server env helper for Astro import.meta.env + process.env fallback
  lib/uploads.ts         — image/video upload validation and filesystem writes
  pages/[adminPath]/...  — configurable private dashboard routes
  pages/api/panel/...    — protected login/logout/case endpoints
  pages/index.astro      — hello world page
  pages/uploads/[...path].ts — serves media from local uploads volume
  scripts/admin-video-upload.ts — admin case video upload/drop preview/removal behavior
  scripts/modal-manager.ts — delegated open/close behavior for all modals
  styles/global.css      — CSS reset + custom properties (dark theme, accent: #e8ff00)
Dockerfile               — multi-stage, Node 20 Alpine + native build deps, runs dist/server/entry.mjs
docker-compose.yml       — port 4321, data/uploads volumes, reads .env
.env.example             — ADMIN_PATH, ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, HOST, PORT
astro.config.mjs         — output: server, adapter: @astrojs/node (standalone)
```

- Case uploads use UUID v4 filenames. Images and videos are hard-linked to cases for simplicity: deleting a case deletes its image/video DB rows and local files from `./uploads/`.

- `npm run dev` → dev server at localhost:4321
- `docker compose up --build` → production container at localhost:4321

## Known Issues / Revisit Later

- **PremiosSection collage image** (`src/components/PremiosSection.astro`) — size/layout not quite right, needs further adjustment. Currently uses `5fr 7fr` grid with right bleed.
- **Blob unification** — decorative blob images exist across multiple sections (home + `/sobre` stats). Needs audit and consolidation into a shared set. **Do not act on this until user explicitly asks.**

## Pending Setup (next session)

- **Chrome DevTools MCP** — gives Claude visual + structural self-feedback on localhost (screenshots, computed CSS, element dims, console errors). Details in `./memory/browser-feedback.md`.

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
