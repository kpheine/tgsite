import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { env } from '../../lib/env';

function escapeHtml(value: string) {
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

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, string>;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const nome      = String(body.nome      || '').trim();
  const sobrenome = String(body.sobrenome || '').trim();
  const email     = String(body.email     || '').trim();
  const telefone  = String(body.telefone  || '').trim();
  const mensagem  = String(body.mensagem  || '').trim();

  if (!nome || !email || !mensagem) {
    return Response.json({ error: 'Nome, email e mensagem são obrigatórios.' }, { status: 400 });
  }

  const { smtpUser, smtpPass, contactTo } = env;

  if (!smtpUser || !smtpPass || !contactTo) {
    console.error('[contact] SMTP env variables are not configured.');
    return Response.json({ error: 'Serviço de email não configurado.' }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const fullName = [nome, sobrenome].filter(Boolean).join(' ');
  const safeFullName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeTelefone = escapeHtml(telefone);
  const safeMensagem = escapeHtml(mensagem);

  try {
    await transporter.sendMail({
      from: `"Site TG" <${smtpUser}>`,
      to: contactTo,
      replyTo: email,
      subject: `Novo contato: ${fullName}`,
      html: `
        <table style="font-family:sans-serif;font-size:15px;color:#222;line-height:1.6;max-width:560px">
          <tr><td><h2 style="margin:0 0 16px">Novo contato pelo site</h2></td></tr>
          <tr><td><strong>Nome:</strong> ${safeFullName}</td></tr>
          <tr><td><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          ${telefone ? `<tr><td><strong>Telefone:</strong> ${safeTelefone}</td></tr>` : ''}
          <tr><td style="padding-top:12px"><strong>Mensagem:</strong></td></tr>
          <tr><td style="white-space:pre-wrap;padding:12px;background:#f5f5f5;border-radius:6px">${safeMensagem}</td></tr>
        </table>
      `,
    });
  } catch (err) {
    console.error('[contact] Failed to send email:', err);
    return Response.json({ error: 'Falha ao enviar email.' }, { status: 500 });
  }

  return Response.json({ ok: true });
};
