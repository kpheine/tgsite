# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.2.0] — 2026-08-25

### Added
- **Canal de Denúncias page** (`/canal-de-denuncias`) — a public whistleblower and
  ethics channel where colaboradores, clientes, fornecedores and parceiros can send a
  report anonymously or identified. Includes a "Baixar o código de conduta" download
  (`public/docs/codigo-de-conduta.pdf`) and a report form posting to a new
  `POST /api/denuncia` endpoint, and is linked from the header nav as
  "Canal de denúncias".
- **Custom 404 page** (`src/pages/404.astro`) — branded "Aqui não tem essa página."
  with a route back to the site, replacing the bare `Não encontrado` text that any
  mistyped URL used to return.
- **`DENUNCIA_TO` env var** — restricted recipient for reports; falls back to
  `CONTACT_TO` when unset. Reuses the existing Gmail App Password, so the client needs
  no second email account. See `memory/client-handoff.md`.

### Changed
- **Header nav collapses to the overlay menu at 1080px instead of 768px.** The fourth
  nav link needs ~1036px to sit on one row; below that the links wrapped into the
  Contato button. The Contato button and WhatsApp icon keep their original 768px
  sizing rules.
- **Unmatched URLs now reach the 404 page.** The one-segment `[adminPath]` route
  matches every `/whatever` and answered with a bare 404 `Response`, so Astro never
  fell through to `404.astro` — the same applied to `/p/<token>` and `/uploads/*`.
  The middleware now rewrites any HTML 404 to the branded page. API routes and
  non-HTML requests (images, fetch) still get their plain/JSON 404 unchanged.
- Contact and denúncia endpoints now share their anti-spam primitives through
  `src/lib/anti-spam.ts` (honeypot, 3-second time trap, HTML escaping, link counting)
  instead of duplicating them. Contact form behaviour is unchanged.

### Fixed
- **Links out of private shared pages (`/p/<token>`) no longer fail.** Any
  `target="_blank"` link or `window.open` was blocked by the page's
  `Content-Security-Policy: sandbox allow-scripts` header ("Blocked opening '…' in a
  new window because the request was made in a sandboxed frame whose 'allow-popups'
  permission is not set"). The header now sends
  `sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox`. The escape flag
  is required as well, otherwise the destination site inherits the sandbox and loads
  with no cookies, no storage and no forms. The isolation guarantee is unchanged: the
  shared page itself stays in an opaque origin and cannot read anything it opens.

### Notes
- Reports carry no IP address, no browser information, and no reply address, so an
  anonymous report cannot be traced or replied to. The neutral subject line
  ("Nova denúncia pelo site") keeps report content out of notification previews.
- The denúncia endpoint is rate limited at 3 reports / 10 minutes and 20 / day per IP,
  matching the contact form.

## [1.1.0] — 2026-07-13

### Added
- **Contact form anti-spam defenses** — four server-side layers, invisible to real
  users: a hidden honeypot field, a submit-time trap (drops sub-3s / no-JS raw POSTs),
  content validation (email format, per-field length caps, link-stuffing check), and
  per-IP rate limiting (3 submissions / 10 min, 20 / day). Dropped spam returns a fake
  success so bots stop retrying.
- **Replace-HTML option for shared pages** — admins can now replace the HTML of an
  existing private page ("Página privada") in place.

### Changed
- Updated the WhatsApp contact number to `5511978268746` across the header, contact
  modal, and footer (pre-filled message unchanged).

### Notes
- Deployment: `docker compose up -d --build`. See `DEPLOYMENT.md`.
- Contact form anti-spam requires no setup or config. Details in
  `memory/client-handoff.md`.

## [1.0.0] — Previous delivery

Initial production release: full public site, editable portfolio, admin panel,
contact form with Gmail email delivery, private shared HTML pages, and the
Docker Compose + Caddy deployment stack.
