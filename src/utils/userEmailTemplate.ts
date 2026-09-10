/**
 * Plantilla de correo oficial para notificación de creación de usuario
 * Sistema de Control de Compras - Gerencia de Informática
 * Organismo Judicial de Guatemala
 */

import { OJ_LOGO_CID } from './emailLogoAsset';

export interface UserWelcomeEmailParams {
  username: string;
  temporaryPassword?: string;
  nombreCompleto?: string;
  rol?: string;
  systemUrl?: string;
}

export function buildUserWelcomeEmail(params: UserWelcomeEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const username = params.username.trim();
  const password = params.temporaryPassword || 'Guate2026*';
  
  // Obtener URL actual dinámica del navegador o variable, o el dominio principal configurado
  let detectedUrl = 'https://control-compras-git.vercel.app';
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    detectedUrl = window.location.origin;
  }
  const systemUrl = (params.systemUrl || detectedUrl).replace(/\/+$/, '') + '/';

  const subject = `Acceso al Sistema de Control de Compras - Credenciales de Usuario (@${username})`;

  // Texto plano exacto requerido por la Gerencia de Informática
  const text = `Por este medio le informamos que su cuenta de usuario ha sido creada exitosamente para acceder al Sistema de Control de Compras de la Gerencia de Informática.

A continuación, le compartimos sus credenciales de acceso:

Usuario: ${username}
Contraseña temporal: ${password}

Para ingresar al sistema, por favor acceda al siguiente enlace: ${systemUrl}

Nota de seguridad: Por políticas de seguridad, le recomendamos cambiar su contraseña inmediatamente al iniciar sesión por primera vez.

Si tiene alguna consulta, inconveniente con el acceso o requiere asistencia técnica, no dude en comunicarse con nosotros respondiendo a este correo o contactando a la mesa de ayuda.

Atentamente,

Administrador del Sistema

Gerencia de Informática
Organismo Judicial de Guatemala`;

  // Versión HTML profesional e institucional
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);">
          
          <!-- Encabezado Institucional OJ con Logotipo Oficial -->
          <tr>
            <td style="background-color: #0b183c; padding: 28px 24px 22px; text-align: center; border-bottom: 4px solid #f59e0b;">
              <!-- Logotipo Oficial del Organismo Judicial -->
              <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td align="center" style="background-color: #ffffff; width: 70px; height: 70px; border-radius: 14px; border: 2px solid #f59e0b; padding: 6px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);">
                    <img 
                      src="cid:${OJ_LOGO_CID}" 
                      alt="Logotipo Oficial Organismo Judicial de Guatemala" 
                      width="58" 
                      height="66" 
                      style="display: block; width: 58px; height: auto; max-height: 66px; margin: 0 auto; border: 0; outline: none; text-decoration: none;" 
                    />
                  </td>
                </tr>
              </table>

              <h1 style="color: #ffffff; margin: 0; font-size: 17px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase;">
                ORGANISMO JUDICIAL DE GUATEMALA
              </h1>
              <p style="color: #93c5fd; margin: 6px 0 0; font-size: 13px; font-weight: 600;">
                GERENCIA DE INFORMÁTICA
              </p>
              <p style="color: #cbd5e1; margin: 4px 0 0; font-size: 11px;">
                Sistema de Control de Adquisiciones y Formularios F56-e
              </p>
            </td>
          </tr>

          <!-- Cuerpo del Mensaje -->
          <tr>
            <td style="padding: 32px 30px; color: #1e293b; font-size: 14px; line-height: 1.65;">
              
              <p style="margin: 0 0 16px; font-size: 14px;">
                Por este medio le informamos que su cuenta de usuario ha sido creada exitosamente para acceder al Sistema de Control de Compras de la Gerencia de Informática.
              </p>

              <p style="margin: 0 0 12px; font-weight: bold; color: #0b183c; font-size: 14px;">
                A continuación, le compartimos sus credenciales de acceso:
              </p>

              <!-- Tabla de Credenciales -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 22px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: bold; width: 40%; font-size: 13px;">
                    Usuario:
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-family: 'Courier New', monospace; font-size: 15px; font-weight: bold; color: #1c39bb;">
                    ${username}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; color: #475569; font-weight: bold; font-size: 13px;">
                    Contraseña temporal:
                  </td>
                  <td style="padding: 12px 18px; font-family: 'Courier New', monospace; font-size: 15px; font-weight: bold; color: #b45309;">
                    ${password}
                  </td>
                </tr>
              </table>

              <!-- Enlace de Acceso -->
              <p style="margin: 0 0 20px; font-size: 14px;">
                Para ingresar al sistema, por favor acceda al siguiente enlace: 
                <a href="${systemUrl}" target="_blank" rel="noopener noreferrer" style="color: #1c39bb; font-weight: bold; text-decoration: underline;">
                  ${systemUrl}
                </a>
              </p>

              <!-- Botón de Acción Directo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${systemUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1c39bb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 13px; letter-spacing: 0.4px;">
                      Acceder al Sistema de Control de Compras &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Nota de Seguridad -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 0 0 20px; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 12px; font-weight: 600; line-height: 1.5;">
                  <strong>Nota de seguridad:</strong> Por políticas de seguridad, le recomendamos cambiar su contraseña inmediatamente al iniciar sesión por primera vez.
                </p>
              </div>

              <!-- Soporte y Mesa de Ayuda -->
              <p style="margin: 0 0 24px; color: #475569; font-size: 13px; line-height: 1.6;">
                Si tiene alguna consulta, inconveniente con el acceso o requiere asistencia técnica, no dude en comunicarse con nosotros respondiendo a este correo o contactando a la mesa de ayuda.
              </p>

              <!-- Firma Institucional -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; color: #334155;">
                <p style="margin: 0; font-weight: bold; font-size: 13px;">Atentamente,</p>
                <p style="margin: 6px 0 2px; font-weight: bold; color: #0b183c; font-size: 14px;">Administrador del Sistema</p>
                <p style="margin: 0; color: #475569; font-size: 13px;">Gerencia de Informática</p>
                <p style="margin: 0; color: #475569; font-size: 13px;">Organismo Judicial de Guatemala</p>
              </div>

            </td>
          </tr>

          <!-- Pie del Correo con Créditos del Creador -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; line-height: 1.5;">
              <p style="margin: 0 0 4px;">
                Sistema de Control de Compras &bull; Gerencia de Informática
              </p>
              <p style="margin: 0; font-weight: 600; color: #475569;">
                Creador del Sistema: Lic. Kevin Gerardo López de León
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
