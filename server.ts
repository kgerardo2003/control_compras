import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { OJ_LOGO_CID, OJ_LOGO_PNG_BASE64 } from './src/utils/emailLogoAsset';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper para normalizar correos electrónicos (ej: kgerardo2003@gmail -> kgerardo2003@gmail.com)
function normalizeEmail(email?: string): string {
  if (!email) return '';
  let cleaned = email.trim();
  if (cleaned.endsWith('@gmail') || cleaned.endsWith('@gmail.')) {
    cleaned = cleaned.replace(/@gmail\.?$/, '@gmail.com');
  }
  return cleaned;
}

// Helper para limpiar la contraseña de aplicación de Google
function normalizeAppPassword(pass?: string): string {
  if (!pass) return '';
  // Quitar comillas accidentales, espacios redundantes en los bordes
  return pass.replace(/["']/g, '').trim();
}

// Helper para crear el transporte de Nodemailer
function createGmailTransporter(config: {
  userEmail?: string;
  appPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  secure?: boolean;
}) {
  const user = normalizeEmail(config.userEmail || process.env.GMAIL_USER || 'kgerardo2003@gmail.com');
  const pass = normalizeAppPassword(config.appPassword || process.env.GMAIL_APP_PASSWORD || 'pwwv bgmb wgak bvdn');
  const host = config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(config.smtpPort || process.env.SMTP_PORT || 465);
  const secure = config.secure !== undefined ? Boolean(config.secure) : (port === 465);

  if (!user || !user.includes('@')) {
    throw new Error('La dirección de correo de Gmail no es válida. Asegúrese de incluir @gmail.com.');
  }
  if (!pass || pass.length < 8) {
    throw new Error('La contraseña de aplicación de Google es requerida (16 caracteres).');
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    }),
    user,
    host,
    port
  };
}

// -------------------------------------------------------------
// RUTAS DE LA API
// -------------------------------------------------------------

// 1. Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Verificar credenciales con el servidor SMTP de Gmail
app.post('/api/email/verify', async (req, res) => {
  try {
    const { transporter, user, host, port } = createGmailTransporter(req.body);
    await transporter.verify();
    return res.json({
      success: true,
      message: `Credenciales de Gmail verificadas con éxito en ${host}:${port} para la cuenta ${user}.`,
      account: user
    });
  } catch (error: any) {
    console.error('Error verificando credenciales SMTP Gmail:', error);
    let userMsg = error?.message || 'Error de conexión con los servidores de Google Gmail.';
    if (error?.code === 'EAUTH') {
      userMsg = 'Fallo de autenticación con Gmail. Verifique que la Contraseña de Aplicación de 16 caracteres sea la correcta y que la verificación en 2 pasos de Google esté activa.';
    }
    return res.status(400).json({
      success: false,
      message: userMsg,
      code: error?.code
    });
  }
});

// 3. Enviar correo de prueba
app.post('/api/email/test', async (req, res) => {
  try {
    const { testRecipient, senderName } = req.body;
    const recipient = normalizeEmail(testRecipient || req.body.userEmail);

    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una dirección de correo de destino válida.'
      });
    }

    const { transporter, user } = createGmailTransporter(req.body);
    const fromDisplayName = senderName || 'Sistema de Control de Compras - GIT OJ';

    const info = await transporter.sendMail({
      from: `"${fromDisplayName}" <${user}>`,
      to: recipient,
      subject: `[PRUEBA EXITOSA] Sistema de Control de Compras - GIT OJ`,
      text: `Verificación exitosa de servicio de correo SMTP de Google para el Sistema de Control de Compras de la Gerencia de Informática del Organismo Judicial de Guatemala.\n\nRemitente: ${user}\nDestinatario: ${recipient}\nFecha: ${new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' })}`,
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
              ✓ Verificación de Conexión Exitosa
            </div>

            <h2 style="color: #0f172a; font-size: 16px; margin: 0 0 12px;">
              Prueba de Despacho de Correo Electrónico
            </h2>

            <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
              Este es un mensaje generado automáticamente por el <strong>Sistema de Control de Adquisiciones y Dictámenes</strong> para confirmar que la cuenta de despacho de Gmail ha sido configurada y autorizada correctamente.
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
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">smtp.gmail.com:465 (SSL Seguro)</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; color: #64748b; font-weight: bold;">Fecha y Hora:</td>
                <td style="padding: 10px 14px; color: #0f172a;">${new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' })}</td>
              </tr>
            </table>

            <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 14px;">
              A partir de este momento, las notificaciones sobre nuevas adquisiciones, adjudicaciones oficiales y vencimiento de ofertas serán entregadas oportunamente a las autoridades correspondientes.
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

    return res.json({
      success: true,
      message: `¡Correo de prueba enviado con éxito a ${recipient}! Se utilizó la cuenta autorizada ${user}.`,
      messageId: info.messageId,
      user
    });
  } catch (error: any) {
    console.error('Error enviando correo de prueba con Gmail:', error);
    let userMsg = error?.message || 'Error al despachar el correo de prueba.';
    if (error?.code === 'EAUTH') {
      userMsg = 'Fallo de autenticación con Gmail: La Contraseña de Aplicación de 16 caracteres o el correo de Google son inválidos.';
    }
    return res.status(400).json({
      success: false,
      message: userMsg,
      code: error?.code
    });
  }
});

// 4. Enviar notificación institucional automática
app.post(['/api/email/send', '/api/send-email'], async (req, res) => {
  try {
    const { to, destinatarios, subject, asunto, html, htmlContenido, text, senderName } = req.body;
    const targetRecipients = to || destinatarios;
    let recipientsList: string[] = [];

    if (Array.isArray(targetRecipients)) {
      recipientsList = targetRecipients.map(normalizeEmail).filter(Boolean);
    } else if (typeof targetRecipients === 'string') {
      recipientsList = targetRecipients.split(',').map(normalizeEmail).filter(Boolean);
    }

    if (recipientsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar al menos un destinatario válido.'
      });
    }

    const { transporter, user } = createGmailTransporter(req.body);
    const fromDisplayName = senderName || 'Sistema de Control de Compras - GIT OJ';

    const finalHtml = html || htmlContenido || `<p>${text || 'Notificación oficial generada por el Sistema de Control de Compras GIT OJ.'}</p>`;
    const finalSubject = subject || asunto || '[NOTIFICACIÓN] Sistema de Compras - GIT OJ';

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
      subject: finalSubject,
      text: text || 'Notificación oficial generada por el Sistema de Control de Compras GIT OJ.',
      html: finalHtml,
      attachments
    });

    return res.json({
      success: true,
      message: `Notificación enviada a ${recipientsList.length} destinatario(s).`,
      messageId: info.messageId,
      recipients: recipientsList
    });
  } catch (error: any) {
    console.error('Error enviando notificación por correo:', error);
    return res.status(400).json({
      success: false,
      message: error?.message || 'Error al enviar la notificación por correo.',
      code: error?.code
    });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE (DEV) & SERVICIO ESTÁTICO (PRODUCCIÓN)
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de backend y frontend ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
