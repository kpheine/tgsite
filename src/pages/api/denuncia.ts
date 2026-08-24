import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { env } from '../../lib/env';
import { countLinks, escapeHtml, looksLikeBot, silentOk } from '../../lib/anti-spam';

const MAX_LEN = { identificacao: 120, mensagem: 4000 };

// Privacy note: this endpoint deliberately never records or forwards the client
// IP, user agent, or any reply address. A report sent without an identificação
// must stay untraceable from the email that lands in the inbox. The only place
// an IP is touched is the in-memory rate limiter in src/middleware.ts, which
// keys on it and logs nothing.
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, string>;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Layers 1 & 2 — honeypot and time trap.
  if (looksLikeBot(body)) {
    return silentOk();
  }

  const identificacao = String(body.identificacao || '').trim();
  const mensagem      = String(body.mensagem      || '').trim();

  if (!mensagem) {
    return Response.json({ error: 'A mensagem é obrigatória.' }, { status: 400 });
  }

  // Layer 3 — Content validation: length caps and link-stuffing check. There is
  // no email field to validate; identifying yourself is optional by design.
  if (
    identificacao.length > MAX_LEN.identificacao ||
    mensagem.length      > MAX_LEN.mensagem ||
    countLinks(mensagem) > 3
  ) {
    return Response.json({ error: 'Não foi possível enviar. Verifique os dados e tente novamente.' }, { status: 400 });
  }

  const { smtpUser, smtpPass } = env;
  // Reports go to the restricted inbox when configured; CONTACT_TO is the fallback
  // so the channel still works on an installation that never set DENUNCIA_TO.
  const denunciaTo = env.denunciaTo || env.contactTo;

  if (!smtpUser || !smtpPass || !denunciaTo) {
    console.error('[denuncia] SMTP env variables are not configured.');
    return Response.json({ error: 'Serviço de email não configurado.' }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const safeIdentificacao = identificacao ? escapeHtml(identificacao) : 'Anônimo';
  const safeMensagem = escapeHtml(mensagem);

  try {
    await transporter.sendMail({
      from: `"Site TG" <${smtpUser}>`,
      to: denunciaTo,
      // Neutral subject on purpose: subject lines surface in phone and desktop
      // notification previews, so no part of the report belongs here.
      subject: 'Nova denúncia pelo site',
      html: `
        <table style="font-family:sans-serif;font-size:15px;color:#222;line-height:1.6;max-width:560px">
          <tr><td><h2 style="margin:0 0 16px">Nova mensagem no canal de denúncias</h2></td></tr>
          <tr><td><strong>Identificação:</strong> ${safeIdentificacao}</td></tr>
          <tr><td style="padding-top:12px"><strong>Mensagem:</strong></td></tr>
          <tr><td style="white-space:pre-wrap;padding:12px;background:#f5f5f5;border-radius:6px">${safeMensagem}</td></tr>
        </table>
      `,
    });
  } catch (err) {
    console.error('[denuncia] Failed to send email:', err);
    return Response.json({ error: 'Falha ao enviar email.' }, { status: 500 });
  }

  return Response.json({ ok: true });
};
