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

### Known limitations to communicate

- **500 emails/day limit** via Gmail SMTP. Effectively unlimited for a contact form.
- **Spam folder risk** — the first few emails may be flagged as spam by the recipient's mail provider, especially corporate Exchange/Outlook inboxes. Recommend the client add the sending address to their contacts and check spam initially.
- **No delivery receipts** — the system fires and forgets. If an email fails to send (e.g. wrong SMTP credentials), the user currently sees an error state on the form but no retry mechanism exists.
