import nodemailer from 'nodemailer';
import { env } from './src/config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

try {
  const result = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: 'delivered@resend.dev',
    subject: 'Resend SMTP test',
    text: 'Your Nodemailer connection to Resend works!',
  });

  console.log('Email accepted:', result.messageId);
} catch (error) {
  console.error('Email test failed:', error.message);
} finally {
  transporter.close();
}