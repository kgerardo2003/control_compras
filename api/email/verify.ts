import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

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

    await transporter.verify();

    return res.status(200).json({
      success: true,
      message: `Credenciales de Gmail verificadas con éxito en ${host}:${port} para la cuenta ${user} en Vercel.`,
      account: user
    });
  } catch (error: any) {
    console.error('Error verificando credenciales en Vercel:', error);
    let userMsg = error?.message || 'Error de conexión con los servidores de Google Gmail.';
    if (error?.code === 'EAUTH') {
      userMsg = 'Fallo de autenticación con Gmail en Vercel. Verifique que la Contraseña de Aplicación de 16 caracteres sea correcta.';
    }
    return res.status(400).json({
      success: false,
      message: userMsg,
      code: error?.code
    });
  }
}
