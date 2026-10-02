import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function send({ to, subject, text, html }) {
  if (!transporter) {
    // Dev fallback: print to console so you can copy the link.
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
}

export function sendVerificationEmail(user, token) {
  const url = `${env.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return send({
    to: user.email,
    subject: 'Verify your email address',
    text: `Hi ${user.name},\n\nVerify your email by opening this link (valid for 24 hours):\n${url}\n`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p><a href="${url}">Verify your email</a> (valid for 24 hours).</p>`,
  });
}

export function sendPasswordResetEmail(user, token) {
  const url = `${env.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return send({
    to: user.email,
    subject: 'Reset your password',
    text: `Hi ${user.name},\n\nReset your password using this link (valid for 1 hour):\n${url}\n\nIf you didn't request this, you can ignore this email.\n`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p><a href="${url}">Reset your password</a> (valid for 1 hour).</p><p>If you didn't request this, ignore this email.</p>`,
  });
}
