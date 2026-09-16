import nodemailer, { type Transporter } from 'nodemailer';
import { OJ_LOGO_CID, OJ_LOGO_PNG_BASE64 } from './_logo';

// Prevenir que cualquier promesa no capturada en background tire el contenedor lambda de Vercel
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason) => {
    console.warn('[Vercel Email] UnhandledRejection interceptada con seguridad:', reason);
  });
}

export function normalizeEmail(email?: string): string {
  if (!email) return '';
  let cleaned = String(email).trim().toLowerCase();
  if (cleaned.endsWith('@gmail') || cleaned.endsWith('@gmail.')) {
    cleaned = cleaned.replace(/@gmail\.?$/i, '@gmail.com');
  }
  return cleaned;
}

export function normalizeAppPassword(pass?: string): string {
  if (!pass) return '';
  // IMPORTANTE: Google muestra las Contraseñas de Aplicación como 4 bloques con espacios (ej. "pwwv bgmb wgak bvdn").
  // Los servidores SMTP de Gmail requieren la clave continua de 16 caracteres sin espacios.
  return String(pass)
    .replace(/\s+/g, '')
    .replace(/["']/g, '')
    .trim();
}

export interface SendEmailOptions {
  userEmail?: string;
  appPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  secure?: boolean;
  senderName?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  resendApiKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  provider?: 'smtp' | 'resend';
  portUsed?: number;
  code?: string;
}

/**
 * Despacha un correo electrónico con reintento inteligente y respaldo entre puertos 465 (SSL) y 587 (STARTTLS).
 * Esto resuelve de raíz los bloqueos o demoras de handshake que ocurren en plataformas serverless como Vercel (AWS Lambda iad1).
 */
export async function sendEmailWithSmartFallback(options: SendEmailOptions): Promise<SendEmailResult> {
  const user = normalizeEmail(options.userEmail || process.env.GMAIL_USER || 'kgerardo2003@gmail.com');
  const pass = normalizeAppPassword(options.appPassword || process.env.GMAIL_APP_PASSWORD || 'pwwv bgmb wgak bvdn');
  const host = options.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const customPort = options.smtpPort ? Number(options.smtpPort) : (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined);
  const fromDisplayName = options.senderName || 'Departamento de Compras - OJ';

  // Normalizar lista de destinatarios
  let recipientsList: string[] = [];
  if (Array.isArray(options.to)) {
    recipientsList = options.to.map(normalizeEmail).filter(Boolean);
  } else if (typeof options.to === 'string') {
    recipientsList = options.to.split(',').map(normalizeEmail).filter(Boolean);
  }

  if (recipientsList.length === 0) {
    return {
      success: false,
      message: 'Debe especificar al menos una dirección de correo de destino válida.'
    };
  }

  // Si se proporciona una API Key de Resend (opcional para entornos HTTP directos)
  const resendKey = options.resendApiKey || process.env.RESEND_API_KEY;
  if (resendKey && resendKey.startsWith('re_')) {
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${fromDisplayName} <onboarding@resend.dev>`,
          to: recipientsList,
          subject: options.subject,
          text: options.text,
          html: options.html
        })
      });

      const resendData = await resendResponse.json();
      if (resendResponse.ok && resendData?.id) {
        return {
          success: true,
          message: `Notificación enviada exitosamente mediante HTTP API de Resend (ID: ${resendData.id}).`,
          messageId: resendData.id,
          provider: 'resend'
        };
      }
    } catch (resendErr) {
      console.warn('Fallo intento con Resend HTTP API, recurriendo a SMTP Gmail:', resendErr);
    }
  }

  // Validar credenciales de Gmail
  if (!user || !user.includes('@')) {
    return {
      success: false,
      message: 'La cuenta remitente de Gmail no es válida. Debe incluir @gmail.com.'
    };
  }

  if (!pass || pass.length < 8) {
    return {
      success: false,
      message: 'La Contraseña de Aplicación de Google es requerida (16 caracteres alfanuméricos).'
    };
  }

  // Preparar adjunto del logo si el HTML lo requiere
  const finalHtml = options.html || `<p>${options.text || ''}</p>`;
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

  const mailPayload = {
    from: `"${fromDisplayName}" <${user}>`,
    to: recipientsList.join(', '),
    subject: options.subject || '[NOTIFICACIÓN] Sistema de Compras - GIT OJ',
    text: options.text || 'Notificación oficial generada por el Sistema de Control de Compras GIT OJ.',
    html: finalHtml,
    attachments
  };

  // Estrategia de puertos: si es Gmail, probar primero puerto 465 (SSL directo) y si da timeout o falla conexión, probar puerto 587 (STARTTLS)
  const isGmail = host === 'smtp.gmail.com' || user.endsWith('@gmail.com');
  const attempts = isGmail
    ? [
        { port: 465, secure: true, name: 'Puerto 465 (SSL)' },
        { port: 587, secure: false, name: 'Puerto 587 (STARTTLS)' }
      ]
    : [
        { 
          port: customPort || 465, 
          secure: options.secure !== undefined ? Boolean(options.secure) : (customPort === 465), 
          name: `Puerto ${customPort || 465}` 
        }
      ];

  let lastError: any = null;

  for (const attempt of attempts) {
    let transporter: Transporter | null = null;
    try {
      transporter = nodemailer.createTransport({
        host,
        port: attempt.port,
        secure: attempt.secure,
        auth: {
          user,
          pass
        },
        connectionTimeout: 12000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Enviar directamente con await (sin Promise.race que cause reyecciones huérfanas)
      const info = await transporter.sendMail(mailPayload);

      return {
        success: true,
        message: `Correo enviado exitosamente mediante ${attempt.name} a ${recipientsList.length} destinatario(s).`,
        messageId: info.messageId,
        provider: 'smtp',
        portUsed: attempt.port
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Vercel Email] Intento fallido en ${attempt.name}:`, err?.message || err);

      // Si es error de autenticación 535, las credenciales son incorrectas, no es necesario cambiar de puerto
      const isAuthError = err?.code === 'EAUTH' || 
        String(err?.message).includes('535') || 
        String(err?.message).includes('BadCredentials') || 
        String(err?.message).includes('Username and Password not accepted');

      if (isAuthError) {
        return {
          success: false,
          code: 'EAUTH',
          message: 'Fallo de autenticación con Gmail (535): La Contraseña de Aplicación de 16 caracteres de Google es incorrecta o fue revocada. Verifique en su cuenta de Google (myaccount.google.com -> Seguridad -> Contraseñas de aplicaciones).'
        };
      }

      // Si no es el último intento y fue error de red/timeout, continuar con el siguiente puerto
      continue;
    } finally {
      if (transporter) {
        try {
          transporter.close();
        } catch {
          // Silencioso
        }
      }
    }
  }

  // Si se agotaron los intentos
  let userFriendlyMsg = lastError?.message || 'No fue posible conectar con el servidor SMTP de Gmail.';
  if (userFriendlyMsg.includes('ETIMEDOUT') || userFriendlyMsg.includes('ESOCKETTIMEDOUT') || userFriendlyMsg.includes('timeout')) {
    userFriendlyMsg = 'Tiempo de espera agotado al conectar con el servidor de Gmail en Vercel (puertos 465 y 587). Verifique que su cuenta de Google no tenga bloqueos de seguridad y que la Contraseña de Aplicación de 16 caracteres esté activa.';
  } else if (userFriendlyMsg.includes('ECONNREFUSED') || userFriendlyMsg.includes('ECONNRESET')) {
    userFriendlyMsg = 'La conexión con el servidor SMTP de Google fue rechazada o reiniciada. Verifique las credenciales y configuración.';
  }

  return {
    success: false,
    message: userFriendlyMsg,
    code: lastError?.code
  };
}

/**
 * Valida la conexión y credenciales de Gmail
 */
export async function verifyEmailCredentials(options: {
  userEmail?: string;
  appPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  secure?: boolean;
}): Promise<{ success: boolean; message: string; account: string; portUsed?: number }> {
  const user = normalizeEmail(options.userEmail || process.env.GMAIL_USER || 'kgerardo2003@gmail.com');
  const pass = normalizeAppPassword(options.appPassword || process.env.GMAIL_APP_PASSWORD || 'pwwv bgmb wgak bvdn');
  const host = options.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';

  if (!user || !user.includes('@')) {
    return {
      success: false,
      message: 'La cuenta remitente de Gmail no es válida.',
      account: user
    };
  }

  if (!pass || pass.length < 8) {
    return {
      success: false,
      message: 'La Contraseña de Aplicación de Google es requerida (16 caracteres).',
      account: user
    };
  }

  const portsToTest = [
    { port: 465, secure: true, name: 'Puerto 465 (SSL)' },
    { port: 587, secure: false, name: 'Puerto 587 (STARTTLS)' }
  ];

  let lastErr: any = null;

  for (const item of portsToTest) {
    let transporter: Transporter | null = null;
    try {
      transporter = nodemailer.createTransport({
        host,
        port: item.port,
        secure: item.secure,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
        tls: { rejectUnauthorized: false }
      });

      await transporter.verify();

      return {
        success: true,
        message: `Credenciales de Gmail verificadas con éxito en ${host} (${item.name}) para la cuenta ${user}.`,
        account: user,
        portUsed: item.port
      };
    } catch (err: any) {
      lastErr = err;
      if (err?.code === 'EAUTH' || String(err?.message).includes('535')) {
        return {
          success: false,
          message: 'Fallo de autenticación con Gmail (535): La Contraseña de Aplicación de 16 caracteres de Google es incorrecta.',
          account: user
        };
      }
      continue;
    } finally {
      if (transporter) {
        try {
          transporter.close();
        } catch {
          // Silencioso
        }
      }
    }
  }

  return {
    success: false,
    message: `Error al verificar con Google: ${lastErr?.message || 'Conexión no completada'}`,
    account: user
  };
}
