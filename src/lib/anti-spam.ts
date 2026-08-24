// Shared anti-spam primitives for the public forms (contact + canal de denúncias).
// The layers are documented for the client in memory/client-handoff.md — keep the
// two in sync if the thresholds change.

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
}

// Minimum time a human needs between the form loading and submitting.
const MIN_FILL_MS = 3000;

export function countLinks(text: string) {
  return (text.match(/https?:\/\/|www\.|\[url|<a\s/gi) || []).length;
}

// Silent OK: the bot believes it succeeded, so it stops retrying, but no email
// is sent. Mirrors the real success payload exactly.
export const silentOk = () => Response.json({ ok: true });

// Layer 1 — Honeypot: a hidden `website` field no human fills. Filled = bot.
// Layer 2 — Time trap: submissions that arrive too fast, or with no timestamp
// (meaning the page script never ran — a raw POST bot).
export function looksLikeBot(body: Record<string, unknown>) {
  if (String(body.website || '').trim()) return true;

  const ts = Number(body._ts);
  return !Number.isFinite(ts) || Date.now() - ts < MIN_FILL_MS;
}
