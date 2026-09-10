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

    const user = normalizeEmail(body.userEmail || process.env.GMAIL_USER || 'kgerardo2003@gmail.com');
    const pass = normalizeAppPassword(body.appPassword || process.env.GMAIL_APP_PASSWORD || 'pwwv bgmb wgak bvdn');
    const host = body.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(body.smtpPort || process.env.SMTP_PORT || 465);
    const secure = body.secure !== undefined ? Boolean(body.secure) : (port === 465);
    const recipient = normalizeEmail(body.testRecipient || body.userEmail || user);
    const fromDisplayName = body.senderName || 'Sistema de Control de Compras - GIT OJ';

    if (!user || !user.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'La dirección de correo de Gmail no es válida. Debe incluir @gmail.com.'
      });
    }

    if (!pass || pass.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La Contraseña de Aplicación de Google es requerida (16 caracteres).'
      });
    }

    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una dirección de correo de destino válida.'
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const info = await transporter.sendMail({
      from: `"${fromDisplayName}" <${user}>`,
      to: recipient,
      subject: `[PRUEBA EXITOSA VERCEL] Sistema de Control de Compras - GIT OJ`,
      text: `Verificación exitosa de servicio de correo SMTP de Google para el Sistema de Control de Compras de la Gerencia de Informática del Organismo Judicial de Guatemala.\n\nRemitente: ${user}\nDestinatario: ${recipient}\nServidor: ${host}:${port}\nFecha: ${new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' })}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background-color: #0f172a; padding: 26px 24px 20px; text-align: center; border-bottom: 3px solid #f59e0b;">
            <div style="display: inline-block; background-color: #ffffff; width: 68px; height: 68px; border-radius: 12px; border: 2px solid #f59e0b; padding: 5px; margin-bottom: 14px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
              <img src="cid:${OJ_LOGO_CID}" alt="OJ Logo" width="56" height="64" style="display: block; width: 56px; height: auto; max-height: 64px; margin: 0 auto; border: 0;" />
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">
              ORGANISMO JUDICIAL DE GUATEMALA
            </h1>
            <p style="color: #94a3b8; margin: 6px 0 0; font-size: 12px; font-weight: 600;">
              GERENCIA DE INFORMÁTICA
            </p>
          </div>
          
          <div style="padding: 24px 28px;">
            <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 16px;">
              ✓ Despliegue en Vercel y GitHub Validado
            </div>

            <h2 style="color: #0f172a; font-size: 16px; margin: 0 0 12px;">
              Prueba de Despacho de Correo Electrónico
            </h2>

            <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
              Este es un mensaje generado automáticamente desde la función Serverless en Vercel para confirmar que la cuenta de despacho de Gmail ha sido configurada y autorizada correctamente con el Sistema de Control de Compras del Organismo Judicial.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 35%; font-weight: bold;">Cuenta Remitente:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace; font-weight: bold;">${user}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Destinatario de Prueba:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace;">${recipient}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">Servidor SMTP:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${host}:${port} (SSL Seguro)</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-weight: bold;">Plataforma:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-weight: bold;">Vercel Serverless Function</td>
              </tr>
            </table>

            <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 14px;">
              A partir de este momento, las alertas de nuevas compras, dictámenes de GIT y adjudicaciones se despacharán oportunamente a las autoridades correspondientes.
            </p>
          </div>

          <div style="background-color: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
            Sistema de Control de Adquisiciones GIT • Organismo Judicial de Guatemala
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'organismo_judicial_logo.png',
          content: Buffer.from(OJ_LOGO_PNG_BASE64, 'base64'),
          cid: OJ_LOGO_CID,
          contentType: 'image/png',
          contentDisposition: 'inline'
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `¡Correo de prueba enviado con éxito a ${recipient}! Se utilizó la cuenta autorizada ${user}.`,
      messageId: info.messageId,
      user
    });
  } catch (error: any) {
    console.error('Error enviando correo de prueba en Vercel:', error);
    let userMsg = error?.message || 'Error al despachar el correo de prueba desde Vercel.';
    if (error?.code === 'EAUTH') {
      userMsg = 'Fallo de autenticación con Gmail: La Contraseña de Aplicación de 16 caracteres o la cuenta de Google son inválidas.';
    }
    return res.status(400).json({
      success: false,
      message: userMsg,
      code: error?.code
    });
  }
}
