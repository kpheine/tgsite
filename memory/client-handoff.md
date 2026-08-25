# Client Handoff Notes

## Production Hosting — Docker Compose + Caddy

### One-time setup the client must perform

1. Install Docker and Docker Compose on the VM.
2. Point the domain DNS `A` records to the VM public IP.
3. Open ports `80` and `443` in the VM/cloud firewall.
4. Copy `.env.example` to `.env` and set `SITE_DOMAINS` to the production domain list, for example `example.com, www.example.com`.
5. Start the stack with `docker compose up -d --build`.

### Domain configuration

- `SITE_DOMAINS` is the only domain setting the client needs to edit.
- Do not include `http://` or `https://` in `SITE_DOMAINS`.
- If the domain changes, update `.env` and run `docker compose up -d --build` again.

### HTTPS and routing

- Caddy is included in Docker Compose and automatically issues/renews HTTPS certificates.
- Public traffic should enter only through Caddy on ports `80` and `443`.
- The Astro app runs internally on `app:4321`; the host machine should not expose port `4321` in production.

## Private Shared HTML Pages ("Páginas privadas")

Admins can upload standalone HTML files in the panel; each gets a secret random URL
(`/p/<token>`) to send to contacts. Pages are not linked anywhere and are marked `noindex`.

### Deployment notes — nothing special required

- **No DNS or Caddy change.** Pages are served from the same domain as the site; the security
  isolation is done in-app via a `Content-Security-Policy: sandbox` header.
- **Schema migration is automatic.** On first start after this update, the app upgrades the
  SQLite database from schema v2 to v3 (adds the `shared_pages` table) **in place** — existing
  cases/recomendações are preserved. No `dev:reset`, no manual step, no data loss.
- **Optional config:** `UPLOAD_MAX_HTML_BYTES` (default `16777216` = 16 MB) caps uploaded HTML
  size. Pages with many inline/base64 images can be large, hence the generous default. Only set
  this in `.env` if a different limit is desired.

### What the client should know

- Uploaded HTML must be **self-contained**: inline CSS/JS and images as data URIs or absolute
  URLs. Relative asset paths will not resolve (pages run in an isolated/opaque origin).
- **Links to external sites work**, both in the same tab and with `target="_blank"`. HTML forms
  inside a shared page are still blocked by the sandbox — if a page needs to collect input, it has
  to link out to a form hosted elsewhere.
- To change a page, delete it and upload again — this produces a **new** URL.
- Anyone with the link can view the page; treat the link as the secret.

## Contact Form — Email Sending (Nodemailer + Gmail)

### One-time setup the client must perform

1. **Designate a Gmail account** for sending form notifications (e.g. `tgagency.forms@gmail.com` or a Google Workspace address like `contato@tgagency.com.br`)
2. **Enable 2-Step Verification** on that account (required by Google for App Passwords)
3. **Generate an App Password**:
   - Google Account → Security → 2-Step Verification → App Passwords
   - Create one named "Website Contact Form"
   - Save the 16-character code — it is shown only once
4. **Set the following in `.env`** before starting the container:
   ```
   SMTP_USER=the-sending-gmail@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   CONTACT_TO=where-you-want-emails@yourdomain.com
   ```

### Ongoing responsibilities for the client

- **Keep the sending Gmail account active.** If the account is deleted or the App Password is revoked, contact form emails will silently stop arriving.
- **Renew the App Password if they change their Google account security settings** (e.g. after a password change or security review, App Passwords may be invalidated).

### Spam protection (no setup or config required)

The contact form has four layers of anti-spam defense, all server-side and invisible to real users:

1. **Honeypot field** — a hidden `website` input; bots that fill it are silently dropped.
2. **Time trap** — submissions arriving under 3 seconds (or with no JS-set timestamp, i.e. raw POST bots) are silently dropped.
3. **Content validation** — email format, per-field length caps, and a link-stuffing check on the message.
4. **Rate limiting** — max 3 submissions / 10 min and 20 / day per IP (enforced in `src/middleware.ts`).

Dropped spam returns a fake success so bots stop retrying; no email is sent. If spam ever gets past these, the next step is adding Cloudflare Turnstile (free, but requires API keys in `.env`).

### Known limitations to communicate

- **500 emails/day limit** via Gmail SMTP. Effectively unlimited for a contact form.
- **Spam folder risk** — the first few emails may be flagged as spam by the recipient's mail provider, especially corporate Exchange/Outlook inboxes. Recommend the client add the sending address to their contacts and check spam initially.
- **No delivery receipts** — the system fires and forgets. If an email fails to send (e.g. wrong SMTP credentials), the user currently sees an error state on the form but no retry mechanism exists.

## Canal de Denúncias — Report Channel (`/canal-de-denuncias`)

A public whistleblower page where employees, clients, suppliers and partners can send a report
anonymously or identified. It is **not linked from the site navigation yet** — the page is reachable
only by its direct URL until the client asks for a menu entry.

### One-time setup the client must perform

1. **Decide who receives reports.** This should be a restricted mailbox (compliance, HR, or a
   director) — not the general contact inbox, since reports may concern staff.
2. **Set it in `.env`:**
   ```
   DENUNCIA_TO=denuncias@yourdomain.com
   ```
   If `DENUNCIA_TO` is left unset, reports fall back to `CONTACT_TO`.
3. **No second email account is needed.** The channel reuses the same `SMTP_USER` / `SMTP_PASS`
   Gmail App Password already configured for the contact form.

### The código de conduta download

The "Baixar o código de conduta" button serves `public/docs/codigo-de-conduta.pdf`. To publish a new
revision, replace that file (keeping the same name) and restart the container — no code change is
required.

### Anonymity — what the client should know

- Reports carry **no IP address, no browser information, and no reply address**. A report sent
  without filling the optional "Quer se identificar?" field genuinely cannot be traced back from the
  email that arrives.
- Because there is no reply address, **an anonymous report cannot be answered.** If the client needs
  to follow up, the reporter must have identified themselves or left contact details in the message
  body.
- The email subject is always the neutral "Nova denúncia pelo site" — no part of the report appears
  in notification previews on a phone or desktop.

### Spam protection (no setup or config required)

The same four layers as the contact form: honeypot, 3-second time trap, content validation, and
per-IP rate limiting at 3 reports / 10 minutes and 20 / day. The rate limiter holds IPs in memory
only; nothing is written to disk and nothing is logged.
