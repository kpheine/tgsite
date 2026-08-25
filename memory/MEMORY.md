# TGsite Project Memory

## Stack Decision (2026-04-29)

**Frontend:** Astro (static site generation, pure HTML output)
**Database:** SQLite via `better-sqlite3` (`./data/site.db` Docker volume)
**Image Storage:** Local Docker volume (mounted at `./uploads/`)
**Hosting:** Google Cloud Compute Engine VM (or any VPS)
**Containerization:** Docker Compose with Caddy reverse proxy; the app runtime image prunes dev dependencies after build and runs the Node server as the unprivileged `node` user. Compose includes an `app-permissions` init service that creates/fixes the bind-mounted `./data` and `./uploads` directories as UID/GID `1000:1000` before the app starts.
**Delivery:** via .zip or git

## Key Decisions & Rationale

- Astro chosen over Next.js for simplicity and zero-cost static output
- SQLite replaced Supabase for the admin/content database to avoid external service dependency and free-tier pausing risk
- Images stored in a local Docker volume — no GCS or external storage dependency
- Compute Engine (VM) chosen over Cloud Run: supports persistent Docker volumes, simpler for client to self-manage (`docker compose up`)
- Production Docker Compose includes Caddy 2 for reverse proxy and automatic HTTPS. Client-facing domain config is centralized in `.env` as `SITE_DOMAINS`; Caddy serves those domains and proxies to the internal Astro app at `app:4321`. The app service no longer publishes port `4321` to the host in production, and Astro custom allowed-host validation was removed to avoid duplicate domain configuration.
- Caddy hardening: production `Caddyfile` enables `zstd`/`gzip` compression, caps request bodies at `100MB`, strips the `Server` header, and sends HSTS without `includeSubDomains`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers before proxying to the app.
- `DEPLOYMENT.md` is aligned with the Caddy deployment path: no Nginx/Certbot setup, no `ALLOWED_HOSTS`, and no public `4321` firewall rule in production.
- Dev and prod use the same local storage approach — no env switching needed
- Admin panel: configurable one-segment path from `ADMIN_PATH` (default `/painel-tg-2026`), username/password login via primary admin credentials synced from `ADMIN_USERNAME` / `ADMIN_PASSWORD` into SQLite on startup (`ADMIN_PASSWORD` is required and must not be the default), SQLite sessions hashed with required non-default `SESSION_SECRET` and a rolling 30-minute idle timeout, fixed disabled-by-default `support-admin` account that the admin can enable from the dashboard to generate a 24-hour temporary password shown once in a credentials table with the support username and a clipboard copy button; when support access is active, the support card and status tile use green border/glow styling to draw attention. Case CRUD, required separate `main_image_url` thumbnail image per case, create/edit case status toggle button (green when `Publicado`), square draggable case cards for ordering (new cases append at highest `sort_order` and display first via descending order), drag-and-drop image upload with upload-time preview/order/removal/destaque selection and env-configurable size limits, YouTube URL field with iframe preview for case videos, individual image removal, and drag-and-drop existing image ordering. Case list and image gallery use page-level drag instructions instead of repeated per-card labels. Case image cards use a shared Astro component for existing and pending uploads, with `Nova` / `Será removida` banners, full-width button-based remove/restore/destaque actions, yellow bordered destaque toggle, non-opening draggable previews without filename/size metadata, pointer-aligned drag ghost previews, and one shared ordering grid so newly uploaded images can be placed among existing images before saving. Public cases carousel reads published dashboard data from SQLite through `/api/cases`; the public case modal is one persistent dialog whose content switches in place with a fade transition, including previous/next navigation and conditional `Mais trabalhos` links for up to 3 random other cases.
- Admin dashboard UI and admin-facing errors must always be in Brazilian Portuguese (`pt-BR`); keep internal status values like `draft`/`published` unchanged for database/API compatibility, but display them as `Rascunho`/`Publicado`.
- Failed admin login redirects preserve the submitted username in the login form while keeping the password field blank; login rate-limit responses redirect back to the same styled error area with a specific retry message.
- Main admin dashboard groups content stats into two summary cards (`Cases` and `Recomendações`) instead of separate cards for each count, reducing visual clutter while preserving total/published/draft metrics and management shortcuts.
- Admin sidebar shows a compact green `Suporte ativo` link only while support access is enabled and unexpired; it links back to the main dashboard support card for enabling/disabling or generating a new support password.
- Case create/edit forms submit through an admin-only `XMLHttpRequest` handler (`src/scripts/admin-case-form-submit.ts`) to show a blocking centered upload modal with a rotating percentage ring. The percentage tracks browser-to-server upload progress; after 100%, the modal shows processing copy until the server redirect completes. Server-side multipart parsing uses standard `request.formData()` with buffered image writes; streamed upload parsing was intentionally removed to keep the code simple.
- Admin case create/update/delete domain behavior lives in `src/lib/admin-cases.ts`; API routes only handle auth, request parsing, error-to-response mapping, and redirects. The module owns case validation, YouTube/status normalization, image ordering, SQLite transactions, uploaded-file rollback, and committed media deletion after successful deletes/replacements.
- Admin case create/edit forms warn before tab close, internal navigation, or non-case form submits when unsaved changes exist (`src/scripts/admin-unsaved-case-warning.ts`). Case delete forms require a browser confirmation before submitting (`src/scripts/admin-case-delete-confirm.ts`).
- Case videos are YouTube URLs or raw 11-character YouTube IDs stored normalized in `cases.video_url`; the admin form validates supported YouTube URL/ID formats client/server side and shows an iframe preview so users can verify the link before saving.
- Public case modal YouTube iframes are stopped by unloading their `src` whenever the user switches to another case or closes the modal, then restored when that case becomes active again.
- Server env reads go through `src/lib/env.ts`, which checks Astro `import.meta.env` first and falls back to `process.env`; this keeps `.env` working in `npm run dev` and Docker/process env working in production. Env defaults, parsing helpers, and required-secret placeholder validation are centralized there, and application code consumes the single exported `env` object instead of raw env access.
- Sensitive POST endpoints are protected by a centralized in-memory Astro middleware rate limiter (`src/middleware.ts`, `src/lib/rate-limit.ts`): login allows 5/minute and 20/hour per client IP, contact and denuncia each allow 3/10 minutes and 20/day, and authenticated admin writes allow 60/minute. `TRUST_PROXY_HEADERS` defaults to true so production behind Nginx/Caddy keys limits by `X-Forwarded-For` / `X-Real-IP`; set it false if exposing Astro directly.
- Contact form email HTML escapes user-provided name, email, phone, and message fields before interpolation to prevent HTML/script injection in rendered emails; the raw trimmed email is still used only for `replyTo`.
- Both public form endpoints (`/api/contact`, `/api/denuncia`) share their anti-spam primitives through `src/lib/anti-spam.ts` (`escapeHtml`, `countLinks`, `silentOk`, `looksLikeBot` with the honeypot + 3s time trap). Per-route rules — `MAX_LEN`, `EMAIL_RE` — stay in their own routes because the two forms differ.
- Popup framework: native HTML `<dialog>` wrapped by `src/components/Modal.astro`, controlled by `src/scripts/modal-manager.ts`; content is layout-agnostic and can come from Astro components, structured API data, Markdown-rendered HTML, or sanitized raw HTML. Open/close transitions are handled with `.is-open` / `.is-closing` classes plus a short close delay so native dialogs can animate out. Modal scroll lock measures the active scrollbar width and compensates with body padding only when needed to avoid layout shifts without forcing a permanent gutter. `Modal.astro` supports a `className` hook for per-modal styling. `src/components/ContactModal.astro` owns the public header contact popup UI: dark rounded two-column form, Bebas Neue "FALE COM A GENTE." title, TG brand mark, WhatsApp CTA, and responsive stacked mobile layout. The submit button has a `data-state` attribute (`idle` / `loading` / `error`) controlling its appearance; on success a full-panel green overlay fades in over the modal with a checkmark SVG and "Enviado!" in Bebas Neue, then the modal auto-closes after 1 second via `[data-modal-close]` click. Form submission POSTs JSON to `POST /api/contact`, which validates fields and sends via Nodemailer + Gmail SMTP; see `memory/client-handoff.md` for the client's one-time Gmail App Password setup. Public case carousel cards open one shared white case modal with a large padded container, fixed topbar containing only previous/next arrows between published cases, in-place fade transitions between case content, a separate scrollable body whose scrollbar is offset right while preserving content width, optional video playback only when `video_url` exists, client label when present, large Bebas Neue case title, conditional cards for non-empty `desafio`, `entrega`, and `resultado` fields with distinct gradients per card (centered 3-card-width flex row on desktop, stacked full-width cards on tablet/mobile), and an ordered case image gallery where `destaque` images span full width while regular images use a two-column desktop grid and stack on mobile.

## Project Context

- Client: advertising agency
- Traffic: <2k visitors/month
- Editable section planned: cases/portfolio (popup overlay) — título, cliente, required separate main thumbnail image, YouTube video URL, desafio, entrega, resultado, status, and gallery images per case. Admin stores this data now, and the public cases carousel reads published cases from SQLite through `/api/cases`.
- Client implements deployment themselves on Google Cloud
- Team: small team collaborating on this repo

## UI Conventions (confirmed in session)

- **Horizontal padding:** 165px fixed on content sections (not percentage-based)
- **Dark background:** `#030303` fallback color for all pixel-gradient sections (formerly `#0d0d0d`); white for Diferenciais section
- **Decorative blobs:** use `mix-blend-mode: screen` so they glow organically on dark backgrounds
- **Dividers:** `<hr>` with `border-top: 1px solid #fff; margin: 30px 165px`
- **Gradient borders:** use `::before` pseudo-element + CSS mask technique — avoids clipping artifacts with `border-radius: 50%` that the `padding-box/border-box` background trick produces
- **Maps:** embed via `maps.google.com/maps?q=...&output=embed` — no API key needed
- **Header:** `position: sticky; top: 0` (not fixed) with `margin-bottom: -120px` so the hero sits behind the transparent gradient header instead of creating a top band

## Motion & Animation System (added 2026-06-11)

Site-wide "balanced & lively" motion pass across home, `/sobre`, and `/wpi`. Zero new dependencies — vanilla CSS + `IntersectionObserver`, fully `prefers-reduced-motion` compliant.

- **Scroll reveals:** `src/scripts/scroll-reveal.ts` (imported in `Layout.astro`) observes every `[data-reveal]` element and adds `.is-revealed` once in view (one-shot, then unobserves). Base + variant CSS lives in `global.css`: `data-reveal="up|fade|left|right|zoom"`. Containers marked `[data-reveal-stagger]` get auto-incremented `--reveal-i` on their **direct** `[data-reveal]` children → cascade via `transition-delay`. Under reduced motion the script reveals everything immediately and skips the observer; CSS also forces `opacity:1`.
  - **Gotcha:** the observer uses `rootMargin: '0px 0px -10% 0px'`, so a reveal target sitting in the bottom 10% of the viewport on load (e.g. the home hero footer) stays hidden until a slight scroll. Intentional.
  - **Gotcha:** put `data-reveal-stagger` on the *direct* parent of the items to cascade — nested items won't be auto-indexed.
- **Button hover:** `.site-button` has a `translateY(-2px)` hover lift in `global.css`. (Magnetic/cursor-follow CTAs were built then **removed at user request** — felt childish; `src/scripts/magnetic.ts` and all `data-magnetic` attributes are gone.)
- **h2 hover scale:** all public `<h2>` get a very slight `scale(1.02)` on hover (`global.css`). Specificity is bumped via `h2[data-reveal].is-revealed:hover` so it still works on h2s that are scroll-reveal targets (otherwise `.is-revealed { transform: none }` would win). Reduced-motion guarded.
- **Floating blobs:** the `blob-float` keyframe was **promoted to `global.css`** as a reusable `.blob-float` utility (with `nth-of-type` desync + reduced-motion guard). The duplicated local copies in `WpiSection.astro` and `WpiPraticaSection.astro` were removed (they now use the utility; per-feature `nth-child` delay overrides remain). Applied to the previously-static decorative blobs in `SobreStatsSection.astro` (positioning moved off `transform` onto `left/top` offsets so the animation can own `transform`; the `blob--rot120/30` static rotations were dropped) and the `ContatoFooter` decorative blob (on the inner `<img>`, wrapper keeps its positioning transform).
- **Hover effects:** header nav links get a scaleX underline (`Header.astro`); cards lift + glow on hover in `DiferenciaisSection`, `DepoimentosSection`, `SobreAwardsCards`; logo grids dim at rest and brighten + scale on hover (hover applied to the inner `<img>` so it never clobbers the parent's reveal transition). Cases carousel hover was left as-is (already rich).
- **Pattern note:** when an element is BOTH a `[data-reveal]` target and a hover target, don't set `transition` on it broadly (the shorthand clobbers the reveal's opacity transition). Either include `opacity` in the combined transition, or put the hover on a child element.

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
2. `HeroSection.astro` — full-bleed dark photo, animated terminal-style text headline cycling strategy/creative words with idle-only blinking underscore cursor, social + address
3. `CasesSection.astro` + `CasesCarousel.astro` + `CaseModal.astro` — pixel gradient bg, "CASES" title (centered), vertically centered section content, height-driven desktop card sizing, fixed-height carousel viewport, aligned vertical cards carousel with three case-stable gradient variants for borders/title bars, distance-based depth sizing around a larger focused center card using transform scaling on stable flex slots plus visual side-card push for active-card breathing room without oversized gaps between non-active cards, animated card grow/shrink during slide, repeated card sets with at least 11 rendered cards for infinite looping without visible image swaps even when there are few published cases, preloaded images, auto-rotation, manual arrow controls, responsive sizing, and one shared case modal in `CaseModal.astro` that swaps case content in place instead of closing/opening between cases; cards come from published SQLite cases via `/api/cases` using each case `main_image_url`, with a local placeholder card fallback when no published case is available.
4. `HistoriaSection.astro` — 2-col: text+CTA left, blob-shaped autoplay/muted/loop video right (`/videos/video_vw.mp4`, `object-fit: contain`)
5. `DiferenciaisSection.astro` — white bg, event collage left, title + 2×2 gradient cards right
6. `ClientesSection.astro` — dark, gradient title, 24 logos in 8×3 grid
7. `DepoimentosSection.astro` — dark, gradient title, 3-card carousel with JS sliding
8. `PremiosSection.astro` — dark, 2-col: text+award logos left, collage right, configurable CTA/variant used by home and `/sobre` _(layout needs revisit)_
9. `WpiSection.astro` — dark, earth card + WPI/TG logos, tagline, 4 feature blobs
10. `ContatoFooter.astro` — dark, title + CTA, gradient blob (screen blend), hr divider, Google Maps embed, footer

## /wpi Page (complete)

All in `src/components/` and `src/pages/wpi.astro`:

1. Hero — full-bleed autoplay/muted/loop video background (`/images/wpi/hero_wpi.mp4`), WPI+TG logos, Bebas Neue heading
2. `WpiPraticaSection.astro` — dark, "O que isso significa na prática?", 4 feature blobs with composite SVG icons, body text, Bebas Neue quote
3. `WpiConexaoSection.astro` — dark, Bebas Neue gradient headline, 2-col: stats (stacked) + body left / animated world map SVG right
4. `WpiVideoSection.astro` — dark, centered gradient heading "Aqui tem alcance.", subtitle, 16:9 YouTube embed (`youtube-nocookie.com`, lazy-loaded, video id `hmEh2VyrgGk`)

## /sobre Page (in progress)

All in `src/components/` and `src/pages/sobre.astro`:

1. `sobre.astro` — page shell: Header + sections + ContatoFooter
2. Hero — full-bleed event photo (`sobre_hero.jpg`), Bebas Neue heading overlay
3. `SobreStatsSection.astro` — dark, Bebas Neue heading, "Já foram mais de", 4-col stats with gradient blobs + dividers, tagline
4. `SobreClientesSection.astro` — dark, gradient "AQUI TEM" title, Figtree subtitle, 8×3 logo grid rendered from shared `clientLogos` data
5. `PremiosSection.astro` with `showCta={false}` and `variant="sobre"` — shared awards intro without the CTA button
6. `SobreAwardsCards.astro` — 3 gradient award cards (FIP full-width, Colunistas+Lusófonos row, Caio full-width)

## /canal-de-denuncias Page (added 2026-08-24)

Public whistleblower / ethics channel. Built from a PNG mockup, **not** Figma — the Figma node for
this block (`KKxqaISNZmWF3nhfSakj9D`, node `2001-207`) returns "you don't have edit access to this
file" through the MCP, so the bubble art was supplied by the user as a PNG instead.

- `src/pages/canal-de-denuncias.astro` — page shell, same shape as `wpi.astro`
  (Layout + Header + main + ContatoFooter).
- `src/components/DenunciaSection.astro` — the whole block: two-column grid (`1fr 1.15fr`,
  collapsing at 1024px), standard `#030303` + `degrade-pixels.png` background, "Aqui tem" gradient
  span + white "respeito.", explanatory copy, the código de conduta download CTA, 3D speech-bubble
  art (`/images/denuncias/dialog-gradient.png`, on `.blob-float`), and the white report form card.
- **Linked from the header nav** as "Canal de denúncias" (added after the page shipped). Adding the
  fourth link forced the nav breakpoint change below.
- **Top padding is 160px, not the usual 100px**: the sticky `Header` is 120px tall with
  `margin-bottom: -120px`, so page content sits behind it and the first line needs the clearance.
- Download CTA serves `public/docs/codigo-de-conduta.pdf` — the first static document on the site, so
  `public/docs/` is new. Replacing the file publishes a new revision with no code change.
- The submit button is a **filled** pink→blue pill, unlike the site's outline `site-button--gradient`.
  It extends `.site-button` for shape/typography and overrides `background` only.
- `.sr-only` and the off-screen honeypot wrapper are **duplicated locally** — both are Astro-scoped in
  `ContactModal.astro`, not global.
- Success is a green overlay absolutely positioned over the card (same treatment as the contact
  modal's), but it **persists** rather than auto-closing — there is no dialog to dismiss — and offers
  an "Enviar outra mensagem" button that restores the form.
- The form's client script re-stamps `_ts` after a successful send so a second report isn't caught by
  the time trap.
- Gotcha found while testing: `ContactModal` also has a `textarea[name="mensagem"]` and renders on
  every page via `Header`, so a bare `document.querySelector('textarea[name="mensagem"]')` hits the
  modal's, not this page's. Scope form queries to `.denuncia-form`.

## Custom 404 page (added 2026-08-25)

`src/pages/404.astro` — branded error page reusing the site shell (Header +
ContatoFooter), the `#030303` + `degrade-pixels.png` background, and the site-wide
"Aqui tem…" headline motif, inverted to **"Aqui não tem essa página."** Sets
`Astro.response.status = 404` so it is a real 404, not a soft one.

- **The gotcha that made it necessary:** Astro only falls through to `404.astro` when
  *no* route handles the request. The one-segment `[adminPath]` route matches every
  `/whatever`, and each `[adminPath]/**` page answers a wrong path with
  `new Response('Não encontrado', { status: 404 })` — a handled response. So before
  this change every mistyped URL on the site returned that bare text, and `404.astro`
  alone would never have rendered.
- **Fix lives in `src/middleware.ts`**, not in the ~10 admin routes: after `next()`,
  any 404 that is a GET, outside `/api/`, not already `/404`, and whose `Accept`
  includes `text/html` is rewritten with `context.rewrite('/404')`. That also upgrades
  `/p/<token>` and `/uploads/*` misses, and covers future routes for free.
- Guards worth keeping: the `/404` check prevents a rewrite loop (the page answers
  with a 404 status by design), and the `Accept` check keeps `<img>`/fetch misses on
  a bare 404 body instead of serving them an HTML page.
- Verified on the **production build** (`node dist/server/entry.mjs`), not just dev —
  SSR 404 routing can differ between the two.
- Section is `align-items: flex-start`, not centred: centring let tall content
  overflow upward under the 120px sticky header on short viewports.

## Header nav breakpoint (changed 2026-08-24)

`Header.astro`'s overlay menu now takes over at **`max-width: 1080px`**, not 768px. With four nav
links the row needs ~1036px between the logo and the actions; below that the links wrapped and the
nav collided with the Contato button. The three-link nav used to fit down to 768px, so this
threshold moved when "Canal de denúncias" was added.

- The `.btn-contato` / `.whatsapp-link img` shrink rules were **split out into their own
  `max-width: 768px` block** so tablets keep the full-size button and icon exactly as before.
- Measure before adding a fifth link: natural nav width = sum of link widths + `gap` × (n − 1), and
  required viewport ≈ (logo + actions + nav + 2 × breathing) / (1 − 0.0568) — the `0.0568` is the
  `header-inner` 2.84% padding on both sides.

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
  components/DenunciaSection.astro — Canal de Denúncias block: copy, código de conduta download, report form
  components/Modal.astro    — reusable layout-agnostic modal shell using native <dialog>
  data/site-content.ts      — shared static logo/award metadata rendered by repeated public sections
  layouts/Layout.astro   — base HTML shell, imports global.css, Google Fonts (Inter)
  lib/admin-cases.ts     — admin case create/update/delete domain operations with validation, transactions, and media cleanup
  lib/admin-order.ts     — shared admin drag-order parsing and descending `sort_order` persistence for cases/testimonials
  lib/auth.ts            — admin path helpers, username login/session cookie utilities
  lib/anti-spam.ts       — shared honeypot/time-trap/escapeHtml/countLinks primitives used by both public form endpoints
  lib/bytes.ts           — shared pure byte label formatter used by server and browser upload code
  lib/db.ts              — SQLite connection, fresh-schema creation, forward-only migration runner (schema v3), env-synced primary admin credentials, support user seeding (`cases`, `imagens_case`, `testimonials`, `shared_pages`)
  lib/shared-pages.ts    — private shared HTML pages domain logic (token gen, list/get/create/replace/delete)
  pages/p/[token].ts     — public serving route for shared HTML pages (sandboxed, noindex, no-store)
  pages/api/panel/shared-pages/{create,replace,delete}.ts — admin create/replace/delete endpoints for shared pages
  lib/env.ts             — server env helper for Astro import.meta.env + process.env fallback
  lib/upload-limits.ts   — env-driven admin image size limits
  lib/uploads.ts         — buffered image upload validation and filesystem writes
  lib/youtube.ts         — YouTube URL parsing, validation, and embed URL helpers
  pages/[adminPath]/...  — configurable private dashboard routes
  pages/api/contact.ts   — public POST endpoint: validates form fields, sends HTML email via Nodemailer + Gmail SMTP
  pages/api/denuncia.ts  — public POST endpoint for the Canal de Denúncias: optional identificação + required mensagem, emails DENUNCIA_TO (falls back to CONTACT_TO)
  pages/api/panel/...    — protected login/logout/case endpoints
  pages/index.astro      — hello world page
  pages/canal-de-denuncias.astro — public whistleblower channel page (Header + DenunciaSection + ContatoFooter)
  pages/uploads/[...path].ts — serves full media files from local uploads volume without HTTP range support
  scripts/admin-upload-shared.ts — shared browser upload primitives for file input syncing, drop zones, image validation, upload messages, and size labels
  scripts/admin-upload-limits.ts — browser-safe upload limit data attribute parsing and byte label formatting
  scripts/admin-video-upload.ts — admin case YouTube URL preview behavior
  scripts/modal-manager.ts — delegated open/close behavior for all modals
  styles/global.css      — public CSS reset + modal styles
  styles/admin.css       — global admin dashboard/form/media/upload styles imported by AdminLayout
scripts/dev-reset.mjs    — dev-only local SQLite/uploads reset command used by `npm run dev:reset`
  Caddyfile                — Caddy domain config from `SITE_DOMAINS`, reverse proxies to app:4321
  Dockerfile               — multi-stage, Node 20 Alpine + native build deps, runs dist/server/entry.mjs
  docker-compose.yml       — Caddy on ports 80/443, internal app:4321, data/uploads volumes, Caddy cert volumes, reads .env
  .dockerignore            — excludes host node_modules/dist/data/uploads so native dependencies are built for Linux inside Docker and bind-mounted content is not copied into the image
.env.example             — SITE_DOMAINS, ADMIN_PATH, ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET, SESSION_COOKIE_SECURE, UPLOAD_MAX_IMAGE_BYTES, SMTP_USER, SMTP_PASS, CONTACT_TO, DENUNCIA_TO
astro.config.mjs         — output: server, adapter: @astrojs/node (standalone)
```

- Case image uploads use UUID v4 filenames. Main thumbnail images and gallery images are hard-linked to cases for simplicity: deleting a case deletes its media DB rows and local files from `./uploads/`. Admin case create/edit/delete DB mutations run inside SQLite transactions; old/replaced media files are deleted only after the DB transaction succeeds, while newly uploaded files are cleaned up if the DB write fails. Admin case upload endpoints parse multipart requests with `busboy` for image files. Image size limits are read from `UPLOAD_MAX_IMAGE_BYTES` via `src/lib/upload-limits.ts`, defaulting to 8MB; display labels are generated from bytes. The admin UI receives the resolved limit through `data-*`, validates oversized images before submission, and shared browser upload primitives live in `src/scripts/admin-upload-shared.ts` while main-image and gallery scripts keep their distinct workflows. Upload validation failures return pt-BR form/modal errors instead of Astro error pages. Case videos are not uploaded; admins paste a YouTube URL or ID into `video_url`, which is normalized server-side and rendered as a `youtube-nocookie.com` iframe.

- Public case API/components share the case response shape through `src/lib/public-cases.ts` (`PublicCase`, `PublicCaseImage`) to keep `/api/cases`, `CasesSection`, `CasesCarousel`, and `CaseModal` aligned.

- Admin testimonials/recommendations are stored in SQLite table `testimonials` (schema v2) with `title`, `quote`, `person_name`, `person_role`, `status`, and `sort_order`. The admin sidebar exposes `Recomendações`; routes under `[adminPath]/recomendacoes` provide create/edit/delete, `Publicado`/`Rascunho`, and drag ordering via `/api/panel/testimonials/order`. Public testimonials are read through `src/lib/public-testimonials.ts` and `/api/testimonials`; `DepoimentosSection.astro` renders published DB content with the previous hardcoded cards as fallback.

- Admin drag ordering for cases and testimonials uses `src/lib/admin-order.ts` so both order endpoints share ID parsing and the descending `sort_order` update rule.

- Admin case create/edit pages share the main form markup through `src/components/AdminCaseForm.astro`; edit-only delete remains in `src/pages/[adminPath]/cases/[id].astro`.

- Admin dashboard styling lives in `src/styles/admin.css`; `src/components/AdminLayout.astro` owns only the admin shell markup, upload modal markup, script imports, and stylesheet import.

- `npm run dev` → dev server at localhost:4321
- `npm run dev:reset` → development-only reset for `./data/site.db`, SQLite WAL/SHM files, and all files under `./uploads/`; refuses to run with `NODE_ENV=production`, asks for confirmation unless passed `-- --yes`, and preserves the `data/` and `uploads/` directories. Run this after pulling DB schema changes during heavy development.
- `npm run check` → Astro TypeScript/template validation (`@astrojs/check`)
- `npm run build` → production build verification
- `docker compose up --build` → production-like Caddy + app stack; Caddy listens on ports 80/443 and proxies to internal app:4321
- Release verification gate: run `npm run check`, `npm run build`, then `docker compose up --build` before handoff/packaging when Docker is available.

## Staging / Client Preview (added 2026-06-17)

- **Decision:** for now, staging is **not** a cloud VM — it's the **local dev server exposed via a Cloudflare quick tunnel** (cost/effort reasons). The GCP VM path in `DEPLOYMENT.md` remains the eventual production route and a future always-on staging option.
- **How to run it (one command):** `npm run staging` → runs `scripts/staging.mjs`, which starts `astro dev`, auto-detects the chosen port (handles the 4321-in-use → 4322 fallback), opens the Cloudflare tunnel against it, prints the `https://<random>.trycloudflare.com` URL, and tears both down on Ctrl+C. The script also finds `cloudflared` on PATH or at the default winget install path, and errors with the install command if missing.
- **Manual fallback (two terminals):** `npm run dev`, then `cloudflared tunnel --url http://localhost:<port>` matching the dev port.
- **`cloudflared`** installed via `winget install --id Cloudflare.cloudflared` → `C:\Program Files (x86)\cloudflared\cloudflared.exe`. Quick tunnels need **no Cloudflare account**.
- **`astro.config.mjs` change required:** added `vite.server.allowedHosts: ['.trycloudflare.com']` so the dev server doesn't reject the tunnel hostname with "Blocked request. This host is not allowed." NOTE: `allowedHosts: true` (boolean) did **not** work — it gets lost in Astro's Vite merge; use the explicit suffix array. Dev-server only; the production Node standalone server doesn't use Vite, so prod is unaffected.
- **Caveats of quick tunnels:** ephemeral — the URL dies when the tunnel/PC stops, and a new random subdomain is issued on each `cloudflared` restart (the `.trycloudflare.com` suffix in `allowedHosts` means restarts just need re-sharing the new URL, no config change). No uptime guarantee. Fine for "show progress" previews, not for always-on staging.

## Private Shared HTML Pages — "secret links" (added 2026-06-18, schema v3)

Admin-managed standalone HTML pages, each reachable only via a random unguessable URL
(`/p/<token>`), not linked anywhere on the site and not indexable. Built for the client to send
one-off HTML to a few contacts. Reuses the existing admin CRUD/auth/rate-limit patterns.

- **Storage:** inline in SQLite `shared_pages` (`id, token, title, html, created_at`) — no files on
  disk. `SharedPageRecord` in `src/lib/db.ts`; domain logic in `src/lib/shared-pages.ts`
  (`SharedPageError`, `listSharedPages`, `getSharedPageHtml`, `createSharedPage`, `replaceSharedPageHtml`, `deleteSharedPage`).
- **Token:** `randomBytes(16).toString('base64url')` (~22 chars, 128-bit) with a UNIQUE-collision retry loop.
- **Serving route:** `src/pages/p/[token].ts` (APIRoute GET) returns the stored HTML with
  `Content-Security-Policy: sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox`,
  `X-Robots-Tag: noindex, nofollow, noarchive`,
  `Cache-Control: no-store`, `Referrer-Policy: no-referrer`. 404 when the token is unknown.
- **Security model:** the `CSP: sandbox` header puts each page in an **opaque origin** — uploaded JS
  runs (animations) but **cannot read `tg_admin_session`/`localStorage` or send credentialed requests**
  to admin endpoints. Verified in-browser: `document.cookie` and `localStorage` both throw `SecurityError`.
  No `allow-same-origin` and no `allow-forms`. Same-domain serving (no subdomain/DNS/Caddy work).
- **`allow-popups` + `allow-popups-to-escape-sandbox` (added 2026-08-24, bug fix):** without
  `allow-popups` the browser blocks every `target="_blank"` link and `window.open` outright
  ("Blocked opening '…' in a new window because the request was made in a sandboxed frame whose
  'allow-popups' permission is not set"). With `allow-popups` alone the opened tab **inherits the
  sandbox** — verified in-browser: `origin === 'null'`, cookies and `localStorage` both throw — so
  external sites load crippled; `allow-popups-to-escape-sandbox` is what makes the new tab a normal
  page. Neither flag weakens the model: the opener stays in an opaque origin, so it is cross-origin
  to everything it opens. Verified worst case — a shared page calling
  `window.open('/canal-de-denuncias')` and probing the handle — every read
  (`location.href`, `document`, `document.cookie`, `localStorage`) throws `DOMException`.
- **Same-tab links always worked**: a top-level sandboxed document may navigate itself, so
  `allow-top-navigation` was never needed and is deliberately not set.
- **Not a Caddy concern.** `Caddyfile` sets no CSP; it only adds HSTS/`X-Content-Type-Options`/
  `X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy` and proxies. This header is owned entirely
  by `src/pages/p/[token].ts`.
- **Admin:** `[adminPath]/paginas/index.astro` — upload form (single `.html`, `accept=".html,.htm"`) +
  list with per-row **copy-link**, **Substituir HTML** (replace), and **delete**. API:
  `src/pages/api/panel/shared-pages/{create,replace,delete}.ts` (auto rate-limited via `/api/panel/*`).
  **Replace** overwrites `html` for an existing row **keeping the same `id`/`token`** (link unchanged);
  title is untouched. No in-site editing — replace only swaps the uploaded file. Nav link "Páginas
  privadas" in `AdminLayout.astro`.
- **Reused scripts:** copy handler `admin-support-password-copy.ts` broadened to `[data-copy-link]`;
  delete confirm branch added to `admin-case-delete-confirm.ts`; new client size-check
  `admin-shared-page-upload.ts` (reads `data-max-html-bytes` via `getByteLimit`); replace flow
  `admin-shared-page-replace.ts` (hidden file input → `window.confirm` overwrite warning → auto-submit).
  Server-side cap is
  source of truth: `UPLOAD_MAX_HTML_BYTES` (default 16 MB) in `src/lib/env.ts` (`env.uploadMaxHtmlBytes`).
- **Constraint:** uploaded HTML must be self-contained (inline or absolute-URL assets); relative paths
  don't resolve in the opaque origin.

## DB migrations (changed 2026-06-18)

`src/lib/db.ts` no longer hard-throws on a `user_version` mismatch. It now runs a **forward-only
migration runner** (`runMigrations()`): for each version between the stored `user_version` and
`DB_SCHEMA_VERSION` (currently **3**) it applies an idempotent step in a transaction and bumps
`user_version`. Existing client DBs upgrade in place with no data loss; `npm run dev:reset` still
exists for a clean dev wipe. Fresh DBs are still created at the latest version directly. New tables
should be added both to the fresh-create `db.exec` block and to the `migrations` map.

## Known Issues / Revisit Later

- **PremiosSection collage image** (`src/components/PremiosSection.astro`) — size/layout not quite right, needs further adjustment. Currently uses `5fr 7fr` grid with right bleed.
- **Blob unification** — partially done (2026-06-11): the `blob-float` animation is now a single `.blob-float` utility in `global.css` reused everywhere (see Motion & Animation System). The blob **image assets** themselves are still per-section and not consolidated into a shared set. **Do not consolidate the assets until user explicitly asks.**

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
3. Admin panel (SSR, CRUD, image upload, YouTube video URL)
4. Wire portfolio to live SQLite data
5. Production readiness + client handoff

## Figma Workflow

- The Figma file is messy — do NOT implement it as a whole
- Work block by block: reference only the specific section needed at the time
- Slow and steady approach — one UI section at a time
- **Always ask the user for the Figma block link** before starting any UI section — never assume or reuse a previous URL
