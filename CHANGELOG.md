# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Canal de Denúncias page** (`/canal-de-denuncias`) — a public whistleblower and
  ethics channel where colaboradores, clientes, fornecedores and parceiros can send a
  report anonymously or identified. Includes a "Baixar o código de conduta" download
  (`public/docs/codigo-de-conduta.pdf`) and a report form posting to a new
  `POST /api/denuncia` endpoint. The page is **not yet linked from the header nav** —
  it is reachable by direct URL only.
- **`DENUNCIA_TO` env var** — restricted recipient for reports; falls back to
  `CONTACT_TO` when unset. Reuses the existing Gmail App Password, so the client needs
  no second email account. See `memory/client-handoff.md`.

### Changed
- Contact and denúncia endpoints now share their anti-spam primitives through
  `src/lib/anti-spam.ts` (honeypot, 3-second time trap, HTML escaping, link counting)
  instead of duplicating them. Contact form behaviour is unchanged.

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
