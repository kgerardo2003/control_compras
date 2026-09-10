import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { OJ_LOGO_CID, OJ_LOGO_PNG_BASE64 } from '../src/utils/emailLogoAsset';

function normalizeEmail(email?: string): string {
  if (!email) return '';
  let cleaned = String(email).trim();
  if (cleaned.toLowerCase().endsWith('@gmail') || cleaned.toLowerCase().endsWith('@gmail.')) {
    cleaned = cleaned.replace(/@gmail\.?$/i, '@gmail.com');
  }
  return cleaned;
}

function normalizeAppPassword(pass?: string): string {
  if (!pass) return '';
  return String(pass).replace(/["']/g, '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Se requiere POST' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { to, destinatarios, subject, asunto, html, htmlContenido, text } = body;
    const targets = to || destinatarios;
    let recipientsList: string[] = [];

    if (Array.isArray(targets)) {
      recipientsList = targets.map(normalizeEmail).filter(Boolean);
    } else if (typeof targets === 'string') {
      recipientsList = targets.split(',').map(normalizeEmail).filter(Boolean);
    }

    const user = normalizeEmail(body.userEmail || process.env.GMAIL_USER || 'kgerardo2003@gmail.com');
    const pass = normalizeAppPassword(body.appPassword || process.env.GMAIL_APP_PASSWORD || 'pwwv bgmb wgak bvdn');
    const host = body.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(body.smtpPort || process.env.SMTP_PORT || 465);
    const secure = body.secure !== undefined ? Boolean(body.secure) : (port === 465);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const finalHtml = html || htmlContenido || `<p>${text || 'Notificación oficial de compras.'}</p>`;
    const attachments = [];
    if (finalHtml.includes(`cid:${OJ_LOGO_CID}`) || finalHtml.includes('organismo_judicial_logo') || finalHtml.includes('ORGANISMO JUDICIAL')) {
      attachments.push({
        filename: 'organismo_judicial_logo.png',
        content: Buffer.from(OJ_LOGO_PNG_BASE64, 'base64'),
        cid: OJ_LOGO_CID,
        contentType: 'image/png',
        contentDisposition: 'inline'
      });
    }

    const info = await transporter.sendMail({
      from: `"Sistema de Compras GIT - OJ" <${user}>`,
      to: recipientsList.length > 0 ? recipientsList.join(', ') : user,
      subject: subject || asunto || '[GIT-OJ] Notificación de Compra',
      text: text || 'Notificación oficial de compras.',
      html: finalHtml,
      attachments
    });

    return res.status(200).json({ success: true, messageId: info.messageId, user });
  } catch (error: any) {
    console.error('Error en send-email:', error);
    return res.status(400).json({ success: false, message: error?.message || 'Error enviando correo' });
  }
}
