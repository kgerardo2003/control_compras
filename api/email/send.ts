import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmailWithSmartFallback } from '../_emailService';

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

    const { to, subject, html, text, senderName, userEmail, appPassword, smtpHost, smtpPort, secure, resendApiKey } = body;

    const result = await sendEmailWithSmartFallback({
      userEmail,
      appPassword,
      smtpHost,
      smtpPort,
      secure,
      senderName,
      to,
      subject,
      text,
      html,
      resendApiKey
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[api/email/send] Error inesperado:', error);
    return res.status(200).json({
      success: false,
      message: error?.message || 'Error inesperado al despachar notificación por correo.'
    });
  }
}
