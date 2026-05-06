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
- Admin panel: configurable one-segment path from `ADMIN_PATH` (default `/painel-tg-2026`), username/password login via env-seeded `ADMIN_USERNAME` admin user, SQLite sessions with a rolling 30-minute idle timeout, fixed disabled-by-default `support-admin` account that the admin can enable from the dashboard to generate a 24-hour temporary password shown once, case CRUD, required separate `main_image_url` thumbnail image per case, create/edit case status toggle button (green when `Publicado`), square draggable case cards for ordering (new cases append at highest `sort_order` and display first via descending order), drag-and-drop image upload with upload-time preview/order/removal/destaque selection, local video upload with drag-and-drop zone and 2GB limit, selected-video metadata/preview/removal, current-video remove/restore state, replacement mode that hides the old video while a new video is pending and restores it on cancel, individual image removal, and drag-and-drop existing image ordering. Case list and image gallery use page-level drag instructions instead of repeated per-card labels. Case image cards use a shared Astro component for existing and pending uploads, with `Nova` / `Será removida` banners, full-width button-based remove/restore/destaque actions, yellow bordered destaque toggle, non-opening draggable previews without filename/size metadata, pointer-aligned drag ghost previews, and one shared ordering grid so newly uploaded images can be placed among existing images before saving. Public cases carousel reads published dashboard data from SQLite through `/api/cases`; the public case modal is one persistent dialog whose content switches in place with a fade transition, including previous/next navigation and conditional `Mais trabalhos` links for up to 3 random other cases.
- Admin dashboard UI and admin-facing errors must always be in Brazilian Portuguese (`pt-BR`); keep internal status values like `draft`/`published` unchanged for database/API compatibility, but display them as `Rascunho`/`Publicado`.
- Case create/edit forms submit through an admin-only `XMLHttpRequest` handler (`src/scripts/admin-case-form-submit.ts`) to show a blocking centered upload modal with a rotating percentage ring. The percentage tracks browser-to-server upload progress; after 100%, the modal shows processing copy until the server redirect completes.
- Admin case create/edit forms warn before tab close, internal navigation, or non-case form submits when unsaved changes exist (`src/scripts/admin-unsaved-case-warning.ts`). Case delete forms require a browser confirmation before submitting (`src/scripts/admin-case-delete-confirm.ts`).
- Existing case videos in the admin edit form are click-to-load placeholders, so opening the edit page does not immediately request the current video. Uploaded media is served with byte-range streaming from `src/pages/uploads/[...path].ts` for efficient video playback after the user clicks.
- Server env reads go through `src/lib/env.ts`, which checks Astro `import.meta.env` first and falls back to `process.env`; this keeps `.env` working in `npm run dev` and Docker/process env working in production.
- Popup framework: native HTML `<dialog>` wrapped by `src/components/Modal.astro`, controlled by `src/scripts/modal-manager.ts`; content is layout-agnostic and can come from Astro components, structured API data, Markdown-rendered HTML, or sanitized raw HTML. Open/close transitions are handled with `.is-open` / `.is-closing` classes plus a short close delay so native dialogs can animate out. Modal scroll lock measures the active scrollbar width and compensates with body padding only when needed to avoid layout shifts without forcing a permanent gutter. `Modal.astro` supports a `className` hook for per-modal styling. `src/components/ContactModal.astro` owns the public header contact popup UI: dark rounded two-column form, Bebas Neue "FALE COM A GENTE." title, TG brand mark, WhatsApp CTA, and responsive stacked mobile layout. Public case carousel cards open one shared white case modal with a large padded container, fixed topbar containing only previous/next arrows between published cases, in-place fade transitions between case content, a separate scrollable body whose scrollbar is offset right while preserving content width, optional video playback only when `video_url` exists, client label when present, large Bebas Neue case title, conditional cards for non-empty `desafio`, `entrega`, and `resultado` fields with distinct gradients per card (centered 3-card-width flex row on desktop, stacked full-width cards on tablet/mobile), and an ordered case image gallery where `destaque` images span full width while regular images use a two-column desktop grid and stack on mobile.

## Project Context

- Client: advertising agency
- Traffic: <2k visitors/month
- Editable section planned: cases/portfolio (popup overlay) — título, cliente, required separate main thumbnail image, uploaded local video, desafio, entrega, resultado, status, and gallery images per case. Admin stores this data now, and the public cases carousel reads published cases from SQLite through `/api/cases`.
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
- Public CTA buttons use shared global classes `site-button site-button--gradient` from `src/styles/global.css`: transparent pill, white Inter Bold uppercase text, padding-driven height, solid `#6789d9` fallback border on `::before`, and blue/cyan/pink gradient border on the same pseudo-element via CSS mask for supported browsers
- Component-local CTA classes should only keep layout exceptions (e.g. `align-self`, custom CSS variables like `--site-button-padding`, or `white-space`), not duplicate base button styling
- Hover: `background-color: rgba(103, 137, 217, 0.15)` plus subtle brightness lift
- Carousel nav: gradient fill = active; `::before` mask gradient ring = inactive/disabled

## Sections Built (Phase 1 complete)

All in `src/components/`:

1. `Header.astro` — sticky, gradient nav, Contato pill, WhatsApp
2. `HeroSection.astro` — full-bleed dark photo, gradient headline image, social + address
3. `CasesSection.astro` + `CasesCarousel.astro` + `CaseModal.astro` — pixel gradient bg, "CASES" title (centered), vertically centered section content, height-driven desktop card sizing, fixed-height carousel viewport, aligned vertical cards carousel with three case-stable gradient variants for borders/title bars, distance-based depth sizing around a larger focused center card using transform scaling on stable flex slots plus visual side-card push for active-card breathing room without oversized gaps between non-active cards, animated card grow/shrink during slide, repeated card sets with at least 11 rendered cards for infinite looping without visible image swaps even when there are few published cases, preloaded images, auto-rotation, manual arrow controls, responsive sizing, and one shared case modal in `CaseModal.astro` that swaps case content in place instead of closing/opening between cases; cards come from published SQLite cases via `/api/cases` using each case `main_image_url`, with a local placeholder card fallback when no published case is available.
4. `HistoriaSection.astro` — 2-col: text+CTA left, blob photo right (uses `banner_1.png`)
5. `DiferenciaisSection.astro` — white bg, event collage left, title + 2×2 gradient cards right
6. `ClientesSection.astro` — dark, gradient title, 24 logos in 8×3 grid
7. `DepoimentosSection.astro` — dark, gradient title, 3-card carousel with JS sliding
8. `PremiosSection.astro` — dark, 2-col: text+award logos left, collage right _(layout needs revisit)_
9. `WpiSection.astro` — dark, earth card + WPI/TG logos, tagline, 4 feature blobs
10. `ContatoFooter.astro` — dark, title + CTA, gradient blob (screen blend), hr divider, Google Maps embed, footer

## /wpi Page (complete)

All in `src/components/` and `src/pages/wpi.astro`:

1. Hero — full-bleed earth photo (`wpi_hero_bg.jpg`), WPI+TG logos, Bebas Neue heading
2. `WpiPraticaSection.astro` — dark, "O que isso significa na prática?", 4 feature blobs with composite SVG icons, body text, Bebas Neue quote
3. `WpiConexaoSection.astro` — dark, Bebas Neue gradient headline, 2-col: stats (stacked) + body left / animated world map SVG right
4. `WpiVideoSection.astro` — dark, centered gradient heading "Aqui tem alcance.", subtitle, 16:9 gray video placeholder with "Vídeo WPI" label

## /sobre Page (in progress)

All in `src/components/` and `src/pages/sobre.astro`:

1. `sobre.astro` — page shell: Header + sections + ContatoFooter
2. Hero — full-bleed event photo (`sobre_hero.jpg`), Bebas Neue heading overlay
3. `SobreStatsSection.astro` — dark, Bebas Neue heading, "Já foram mais de", 4-col stats with gradient blobs + dividers, tagline
4. `SobreClientesSection.astro` — dark, gradient "AQUI TEM" title, Figtree subtitle, 8×3 logo grid (25 logos in `public/images/sobre_clientes/`)
5. `SobrePremiosSection.astro` — same as `PremiosSection.astro` but without the CTA button
6. `SobreAwardsCards.astro` — 3 gradient award cards (FIP full-width, Colunistas+Lusófonos row, Caio full-width)

## Git Workflow Preference

- **Always create a new branch** before committing feature/responsive work (e.g. `feature/mobile-responsive`)
- **Commit locally** after each change
- **Push only when user explicitly asks** ("commit and push")
- Do NOT auto-push after every commit

## Figma Asset Workflow

- Figma MCP returns images with temporary URLs (expire in 7 days) — always `curl` them to `public/images/` immediately
- Check file type with `file` command — Figma often returns SVG saved as `.png`; rename accordingly
- When Figma returns wrong/placeholder images, user may upload their own to `public/images/` directly
- Download multiple assets in parallel batches (curl in one Bash call) to save time
- For sections with many logos/assets, create a dedicated subfolder under `public/images/` (e.g. `sobre_clientes/`)
- **Complex multi-layer composites (400+ layers):** use `get_screenshot` on the parent node to download as a single flat PNG — never stack 400+ individual `<img>` tags
- **User-exported SVGs:** user may export SVGs directly from Figma and drop them in the project root — check with `Glob **/*.svg` to find them, then move to `public/images/`

## Figma Multi-Layer Icon Compositing

When a Figma icon is split into N SVG layers (each at absolute canvas coordinates):

1. Identify the parent node's canvas bounding box from its `inset` values
2. Compute each layer's position relative to the parent using canvas pixel math (canvas ≈ 1440px wide, ~4300–4500px tall)
3. Build a single composite SVG using nested `<svg x y width height viewBox>` elements — each layer's natural size in parent units = its viewBox dimensions
4. Use `transform="translate(x, y)"` or nested `<svg>` for positioning; `preserveAspectRatio="none"` on layers is correct
5. Label/name convention: the Figma node name (e.g. "mundo", "Mundo 2") matches the feature it belongs to

## SVG Animation (internal CSS in `<img>` src)

SVGs loaded via `<img src="...">` **do** run internal CSS animations (keyframes in `<style>` block inside the SVG).

**Staggered arc animation pattern:**

1. Wrap target elements in `<g id="connections">`
2. Add `<style>` with `@keyframes` + `#connections path { animation: ... }`
3. Use CSS `:nth-child` rules for per-arc delays
4. **Critical:** use **negative delays** (e.g. `animation-delay: -0.44s`) — positive delays cause arcs to sit at `opacity: 1` before animating, creating a jarring white flash on load. Negative delays start each arc mid-cycle immediately.

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
  components/AdminCaseForm.astro — shared admin case create/edit form markup
  components/Modal.astro    — reusable layout-agnostic modal shell using native <dialog>
  layouts/Layout.astro   — base HTML shell, imports global.css, Google Fonts (Inter)
  lib/auth.ts            — admin path helpers, username login/session cookie utilities
  lib/db.ts              — SQLite connection, schema, env admin/support user seeding (`cases`, `imagens_case`)
  lib/env.ts             — server env helper for Astro import.meta.env + process.env fallback
  lib/uploads.ts         — image/video upload validation and filesystem writes
  pages/[adminPath]/...  — configurable private dashboard routes
  pages/api/panel/...    — protected login/logout/case endpoints
  pages/index.astro      — hello world page
  pages/uploads/[...path].ts — serves media from local uploads volume
  scripts/admin-video-upload.ts — admin case video upload/drop preview/removal behavior
  scripts/modal-manager.ts — delegated open/close behavior for all modals
  styles/global.css      — public CSS reset + modal styles
  styles/admin.css       — global admin dashboard/form/media/upload styles imported by AdminLayout
Dockerfile               — multi-stage, Node 20 Alpine + native build deps, runs dist/server/entry.mjs
docker-compose.yml       — port 4321, data/uploads volumes, reads .env
.env.example             — ADMIN_PATH, ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET, HOST, PORT
astro.config.mjs         — output: server, adapter: @astrojs/node (standalone)
```

- Case uploads use UUID v4 filenames. Main thumbnail images, gallery images, and videos are hard-linked to cases for simplicity: deleting a case deletes its media DB rows and local files from `./uploads/`. Admin case create/edit/delete DB mutations run inside SQLite transactions; old/replaced media files are deleted only after the DB transaction succeeds, while newly uploaded files are cleaned up if the DB write fails. Admin case upload endpoints parse multipart requests with `busboy` so large videos stream directly to disk instead of buffering the full file in memory.

- Public case API/components share the case response shape through `src/lib/public-cases.ts` (`PublicCase`, `PublicCaseImage`) to keep `/api/cases`, `CasesSection`, `CasesCarousel`, and `CaseModal` aligned.

- Admin case create/edit pages share the main form markup through `src/components/AdminCaseForm.astro`; edit-only delete remains in `src/pages/[adminPath]/cases/[id].astro`.

- Admin dashboard styling lives in `src/styles/admin.css`; `src/components/AdminLayout.astro` owns only the admin shell markup, upload modal markup, script imports, and stylesheet import.

- `npm run dev` → dev server at localhost:4321
- `npm run check` → Astro TypeScript/template validation (`@astrojs/check`)
- `npm run build` → production build verification
- `docker compose up --build` → production container at localhost:4321
- Release verification gate: run `npm run check`, `npm run build`, then `docker compose up --build` before handoff/packaging when Docker is available.

## Known Issues / Revisit Later

- **PremiosSection collage image** (`src/components/PremiosSection.astro`) — size/layout not quite right, needs further adjustment. Currently uses `5fr 7fr` grid with right bleed.
- **Blob unification** — decorative blob images exist across multiple sections (home + `/sobre` stats). Needs audit and consolidation into a shared set. **Do not act on this until user explicitly asks.**

## Chrome DevTools MCP (active)

Configured via `claude mcp add chrome-devtools --scope user -- npx -y chrome-devtools-mcp@latest`. Available as `mcp__chrome-devtools__*` tools. Enables:

- Screenshots of localhost pages (self-serve, no user needed)
- Computed CSS inspection (real applied values after cascade)
- Element dimension checks
- Console error / 404 detection
- Page navigation between routes

**Workflow:** implement → screenshot → inspect → fix → show result. Reduces visual back-and-forth with user.

## Roadmap

Full phased plan in `./memory/ROADMAP.md`. Phases:

1. UI blocks from Figma (one at a time, always ask for link)
2. Local SQLite content storage
3. Admin panel (SSR, CRUD, image/video upload)
4. Wire portfolio to live SQLite data
5. Production readiness + client handoff

## Figma Workflow

- The Figma file is messy — do NOT implement it as a whole
- Work block by block: reference only the specific section needed at the time
- Slow and steady approach — one UI section at a time
- **Always ask the user for the Figma block link** before starting any UI section — never assume or reuse a previous URL
