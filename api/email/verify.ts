import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyEmailCredentials } from '../_emailService';

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

    const result = await verifyEmailCredentials({
      userEmail: body.userEmail,
      appPassword: body.appPassword,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort,
      secure: body.secure
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[api/email/verify] Error inesperado:', error);
    return res.status(200).json({
      success: false,
      message: error?.message || 'Error al conectar con el servidor SMTP de Google.'
    });
  }
}
