# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
