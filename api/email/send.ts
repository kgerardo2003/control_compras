import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { OJ_LOGO_CID, OJ_LOGO_PNG_BASE64 } from '../../src/utils/emailLogoAsset';

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

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido. Se requiere POST.`
    });
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

    const { to, subject, html, text, senderName } = body;
    let recipientsList: string[] = [];

    if (Array.isArray(to)) {
      recipientsList = to.map(normalizeEmail).filter(Boolean);
    } else if (typeof to === 'string') {
      recipientsList = to.split(',').map(normalizeEmail).filter(Boolean);
    }

    if (recipientsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar al menos un destinatario válido.'
      });
    }

    const user = normalizeEmail(body.userEmail || process.env.GMAIL_USER || 'kgerardo2003@gmail.com');
    const pass = normalizeAppPassword(body.appPassword || process.env.GMAIL_APP_PASSWORD || 'pwwv bgmb wgak bvdn');
    const host = body.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(body.smtpPort || process.env.SMTP_PORT || 465);
    const secure = body.secure !== undefined ? Boolean(body.secure) : (port === 465);
    const fromDisplayName = senderName || body.senderName || 'Sistema de Control de Compras - GIT OJ';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const finalHtml = html || `<p>${text}</p>`;
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
      from: `"${fromDisplayName}" <${user}>`,
      to: recipientsList.join(', '),
      subject: subject || '[NOTIFICACIÓN] Sistema de Compras - GIT OJ',
      text: text || 'Notificación oficial generada por el Sistema de Control de Compras GIT OJ.',
      html: finalHtml,
      attachments
    });

    return res.status(200).json({
      success: true,
      message: `Notificación enviada con éxito a ${recipientsList.length} destinatario(s).`,
      messageId: info.messageId,
      recipients: recipientsList
    });
  } catch (error: any) {
    console.error('Error enviando notificación en Vercel:', error);
    return res.status(400).json({
      success: false,
      message: error?.message || 'Error al enviar la notificación por correo desde Vercel.',
      code: error?.code
    });
  }
}
