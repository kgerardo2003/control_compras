import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { OJ_LOGO_CID, OJ_LOGO_PNG_BASE64 } from '../emailLogoAsset';

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
      return res.status(200).json({
        success: false,
        message: 'Debe especificar al menos un destinatario de correo electrónico válido.'
      });
    }

    const user = normalizeEmail(body.userEmail || process.env.GMAIL_USER || 'kgerardo2003@gmail.com');
    const pass = normalizeAppPassword(body.appPassword || process.env.GMAIL_APP_PASSWORD || 'pwwv bgmb wgak bvdn');
    const host = body.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(body.smtpPort || process.env.SMTP_PORT || 465);
    const secure = body.secure !== undefined ? Boolean(body.secure) : (port === 465);
    const fromDisplayName = senderName || body.senderName || 'Sistema de Control de Compras - GIT OJ';

    if (!user || !user.includes('@')) {
      return res.status(200).json({
        success: false,
        message: 'La cuenta remitente de Gmail no es válida. Configure una dirección válida en Configuración de Correo.'
      });
    }

    if (!pass || pass.length < 8) {
      return res.status(200).json({
        success: false,
        message: 'La Contraseña de Aplicación de Google es requerida (16 caracteres).'
      });
    }

    // Configurar transporte: para Gmail usar service: 'gmail' o configuración directa
    const transportConfig: any = (host === 'smtp.gmail.com' || user.endsWith('@gmail.com'))
      ? {
          service: 'gmail',
          auth: { user, pass },
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 7500,
        }
      : {
          host,
          port,
          secure,
          auth: { user, pass },
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 7500,
        };

    const transporter = nodemailer.createTransport(transportConfig);

    const finalHtml = html || `<p>${text || ''}</p>`;
    const attachments = [];
    if (OJ_LOGO_PNG_BASE64 && (finalHtml.includes(`cid:${OJ_LOGO_CID}`) || finalHtml.includes('organismo_judicial_logo') || finalHtml.includes('ORGANISMO JUDICIAL'))) {
      attachments.push({
        filename: 'organismo_judicial_logo.png',
        content: Buffer.from(OJ_LOGO_PNG_BASE64, 'base64'),
        cid: OJ_LOGO_CID,
        contentType: 'image/png',
        contentDisposition: 'inline'
      });
    }

    // Timeout de seguridad de 8s para responder antes del límite de Vercel
    const sendMailPromise = transporter.sendMail({
      from: `"${fromDisplayName}" <${user}>`,
      to: recipientsList.join(', '),
      subject: subject || '[NOTIFICACIÓN] Sistema de Compras - GIT OJ',
      text: text || 'Notificación oficial generada por el Sistema de Control de Compras GIT OJ.',
      html: finalHtml,
      attachments
    });

    const info = await Promise.race([
      sendMailPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con el servidor SMTP de Gmail (8s).')), 8000)
      )
    ]);

    return res.status(200).json({
      success: true,
      message: `Notificación enviada con éxito a ${recipientsList.length} destinatario(s).`,
      messageId: info.messageId,
      recipients: recipientsList
    });
  } catch (error: any) {
    console.error('Error enviando notificación en Vercel:', error);
    let userMsg = error?.message || 'Error al enviar la notificación por correo.';
    
    if (userMsg.includes('535') || userMsg.includes('BadCredentials') || userMsg.includes('Username and Password not accepted')) {
      userMsg = 'Fallo de autenticación con Gmail (535): La Contraseña de Aplicación de 16 caracteres de Google o el usuario de correo son incorrectos. Genere una nueva Contraseña de Aplicación en myaccount.google.com -> Seguridad.';
    } else if (userMsg.includes('ETIMEDOUT') || userMsg.includes('ESOCKETTIMEDOUT') || userMsg.includes('Tiempo de espera agotado')) {
      userMsg = 'Tiempo de espera agotado al conectar con el servidor de Gmail. Verifique su conexión y configuración SMTP.';
    }

    return res.status(200).json({
      success: false,
      message: userMsg,
      code: error?.code
    });
  }
}
