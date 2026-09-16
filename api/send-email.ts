import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmailWithSmartFallback } from './_emailService';

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

    const targets = body.to || body.destinatarios || body.recipientEmails;
    const subject = body.subject || body.asunto || '[NOTIFICACIÓN] Sistema de Compras - GIT OJ';
    const html = body.html || body.htmlContenido;
    const text = body.text;
    const senderName = body.senderName;

    const result = await sendEmailWithSmartFallback({
      userEmail: body.userEmail,
      appPassword: body.appPassword,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort,
      secure: body.secure,
      senderName,
      to: targets,
      subject,
      text,
      html,
      resendApiKey: body.resendApiKey
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[api/send-email] Error inesperado:', error);
    return res.status(200).json({
      success: false,
      message: error?.message || 'Error inesperado al despachar correo.'
    });
  }
}
