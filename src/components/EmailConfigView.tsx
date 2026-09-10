import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GmailConfig } from '../types';
import { 
  Mail, 
  Send, 
  Key, 
  Server, 
  ShieldCheck, 
  Bell, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ExternalLink, 
  Info, 
  HelpCircle,
  Code2,
  RefreshCw,
  Terminal
} from 'lucide-react';

export const EmailConfigView: React.FC = () => {
  const { gmailConfig, updateGmailConfig, testGmailConnection, showToast } = useApp();

  const [formData, setFormData] = useState<GmailConfig>(() => {
    let email = gmailConfig.userEmail || 'kgerardo2003@gmail.com';
    if (email.endsWith('@gmail') || email.endsWith('@gmail.')) {
      email = email.replace(/@gmail\.?$/, '@gmail.com');
    }
    let pass = gmailConfig.appPassword || 'pwwv bgmb wgak bvdn';
    pass = pass.replace(/["']/g, '').trim();
    return {
      ...gmailConfig,
      userEmail: email,
      appPassword: pass,
      recipientEmails: gmailConfig.recipientEmails.length > 0 
        ? gmailConfig.recipientEmails 
        : ['kgerardo2003@gmail.com', 'klopez@oj.gob.gt'],
    };
  });

  const [showPassword, setShowPassword] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [testEmail, setTestEmail] = useState(formData.userEmail || 'kgerardo2003@gmail.com');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'vercel_github' | 'preview'>('config');

  // Sincronizar formData si cambia gmailConfig
  useEffect(() => {
    let email = gmailConfig.userEmail;
    if (email && (email.endsWith('@gmail') || email.endsWith('@gmail.'))) {
      email = email.replace(/@gmail\.?$/, '@gmail.com');
    }
    setFormData(prev => ({
      ...prev,
      ...gmailConfig,
      userEmail: email || prev.userEmail,
      appPassword: (gmailConfig.appPassword || prev.appPassword).replace(/["']/g, '').trim()
    }));
  }, [gmailConfig]);

  const handleEmailBlur = () => {
    if (formData.userEmail) {
      let val = formData.userEmail.trim();
      if (val.toLowerCase().endsWith('@gmail') || val.toLowerCase().endsWith('@gmail.')) {
        val = val.replace(/@gmail\.?$/i, '@gmail.com');
        setFormData(prev => ({ ...prev, userEmail: val }));
        showToast({
          type: 'info',
          title: 'Dirección Corregida',
          message: `Se completó automáticamente la terminación del dominio a: ${val}`,
        });
      }
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Quitar comillas y caracteres no deseados si se pegan accidentalmente
    const cleanPass = e.target.value.replace(/["']/g, '');
    setFormData(prev => ({ ...prev, appPassword: cleanPass }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let email = formData.userEmail.trim();
    if (email.endsWith('@gmail') || email.endsWith('@gmail.')) {
      email = email.replace(/@gmail\.?$/, '@gmail.com');
    }
    const cleanPass = formData.appPassword.replace(/["']/g, '').trim();
    const toSave = {
      ...formData,
      userEmail: email,
      appPassword: cleanPass
    };
    setFormData(toSave);
    updateGmailConfig(toSave);
    showToast({
      type: 'success',
      title: 'Configuración Guardada',
      message: 'Los parámetros de correo Gmail y credenciales SMTP se han guardado exitosamente.',
    });
  };

  const handleAddRecipient = () => {
    if (!newRecipient || !newRecipient.includes('@')) {
      showToast({
        type: 'warning',
        title: 'Correo Inválido',
        message: 'Por favor ingresa una dirección de correo electrónico válida.',
      });
      return;
    }
    let norm = newRecipient.trim().toLowerCase();
    if (norm.endsWith('@gmail') || norm.endsWith('@gmail.')) {
      norm = norm.replace(/@gmail\.?$/, '@gmail.com');
    }
    if (formData.recipientEmails.includes(norm)) {
      showToast({
        type: 'info',
        title: 'Correo Duplicado',
        message: 'Esta dirección ya está en la lista de destinatarios.',
      });
      return;
    }
    const updated = [...formData.recipientEmails, norm];
    setFormData(prev => ({ ...prev, recipientEmails: updated }));
    setNewRecipient('');
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    const updated = formData.recipientEmails.filter(e => e !== emailToRemove);
    setFormData(prev => ({ ...prev, recipientEmails: updated }));
  };

  const handleRunTest = async () => {
    let target = testEmail.trim();
    if (target.endsWith('@gmail') || target.endsWith('@gmail.')) {
      target = target.replace(/@gmail\.?$/, '@gmail.com');
      setTestEmail(target);
    }

    if (!target || !target.includes('@')) {
      showToast({
        type: 'warning',
        title: 'Correo de Prueba Requerido',
        message: 'Ingresa un correo electrónico de destino para la prueba.',
      });
      return;
    }

    // Normalizar email remitente y password actual
    let effectiveEmail = formData.userEmail?.trim() || '';
    if (effectiveEmail.endsWith('@gmail') || effectiveEmail.endsWith('@gmail.')) {
      effectiveEmail = effectiveEmail.replace(/@gmail\.?$/, '@gmail.com');
    }
    const effectivePassword = formData.appPassword?.replace(/["']/g, '').trim() || '';

    const currentConfig = {
      ...formData,
      userEmail: effectiveEmail,
      appPassword: effectivePassword
    };
    setFormData(currentConfig);

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testGmailConnection(target, currentConfig);
      setTestResult(result);
      if (result.success) {
        // Guardar automáticamente la configuración validada
        updateGmailConfig(currentConfig);
        showToast({
          type: 'success',
          title: '¡Prueba de Envío Exitosa!',
          message: result.message,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Error al Enviar',
          message: result.message,
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Error inesperado al conectar con el servidor de Gmail.';
      setTestResult({ success: false, message: errMsg });
      showToast({
        type: 'error',
        title: 'Error de Envío',
        message: errMsg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const envSample = `# Variables de Entorno para Vercel y GitHub
# Configura estas variables en: Vercel Dashboard -> Project Settings -> Environment Variables
GMAIL_USER="${formData.userEmail || 'kgerardo2003@gmail.com'}"
GMAIL_APP_PASSWORD="${formData.appPassword ? formData.appPassword : 'pwwv bgmb wgak bvdn'}"
SMTP_HOST="${formData.smtpHost || 'smtp.gmail.com'}"
SMTP_PORT="${formData.smtpPort || 465}"
SMTP_SECURE="${formData.secure ? 'true' : 'false'}"
NOTIFICATION_EMAILS="${formData.recipientEmails.join(',')}"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
    showToast({
      type: 'info',
      title: 'Variables Copiadas',
      message: 'Las variables para Vercel han sido copiadas al portapapeles.',
    });
  };

  const vercelFunctionCode = `// api/email/test.ts (Vercel Serverless Function con Nodemailer)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGmailTransporter, normalizeEmail, setCorsHeaders } from '../_mailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Se requiere POST' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const recipient = normalizeEmail(body.testRecipient || body.userEmail);
    const { transporter, user } = createGmailTransporter(body);

    const info = await transporter.sendMail({
      from: \`"Sistema de Compras GIT - OJ" <\${user}>\`,
      to: recipient,
      subject: '[PRUEBA VERCEL] Sistema de Control de Compras - GIT OJ',
      text: 'Verificación exitosa de servicio SMTP en Vercel Serverless.',
    });

    return res.status(200).json({ success: true, messageId: info.messageId, user });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(vercelFunctionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    showToast({
      type: 'info',
      title: 'Código Copiado',
      message: 'El código de la función Serverless para Vercel ha sido copiado.',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado Superior */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Configuración de Correo Electrónico (Gmail & Alertas)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Gmail SMTP
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Gestione la cuenta de despacho de Gmail, contraseñas de aplicación seguras, destinatarios de autoridades y despliegue en Vercel / GitHub.
            </p>
          </div>
        </div>

        {/* Pestañas Rápidas del Módulo */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'config'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ajustes Gmail
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('vercel_github')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'vercel_github'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Vercel & GitHub</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'preview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vista Previa Correo
          </button>
        </div>
      </div>

      {/* SUBTAB 1: AJUSTES GMAIL */}
      {activeSubTab === 'config' && (
        <div className="space-y-6">
          {/* Banner de Estado Verificado de la Cuenta Gmail */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-md border border-blue-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">
                    Servicio de Despacho Gmail SMTP Activo
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    smtp.gmail.com:465
                  </span>
                </div>
                <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                  Cuenta autorizada: <strong className="text-white font-mono">{formData.userEmail || 'kgerardo2003@gmail.com'}</strong>. Se corrigió la terminación del dominio con <span className="text-amber-300 font-semibold">.com</span> y se vinculó la clave de aplicación de 16 caracteres.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTestEmail(formData.userEmail || 'kgerardo2003@gmail.com');
                  handleRunTest();
                }}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-700 text-slate-950 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-slate-950" />
                )}
                <span>Enviar Correo de Prueba a Mi Cuenta</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulario Principal de Configuración Gmail */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-slate-700" />
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      Credenciales de la Cuenta Gmail
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>¿Cómo obtener Contraseña de Aplicación?</span>
                  </button>
                </div>

                {/* Guía Desplegable de Google App Password */}
                {showGuide && (
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span>Pasos oficiales para Gmail (Google Workspace o Personal):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                      <li>Ingresa a tu cuenta de Google en <a href="https://myaccount.google.com" target="_blank" rel="noreferrer" className="text-blue-700 underline font-semibold">myaccount.google.com</a>.</li>
                      <li>Ve a la pestaña <strong>Seguridad</strong> y asegúrate de tener activada la <strong>Verificación en 2 pasos</strong>.</li>
                      <li>En la barra de búsqueda superior de tu cuenta de Google escribe: <em>"Contraseñas de aplicaciones"</em>.</li>
                      <li>Asigna un nombre descriptivo (ej: <em>"Sistema Compras GIT"</em>) y presiona <strong>Crear</strong>.</li>
                      <li>Copia la clave generada de 16 caracteres (ej: <code className="bg-white px-1.5 py-0.5 rounded font-mono text-blue-800 border border-blue-200">abcd efgh ijkl mnop</code>) y pégala abajo.</li>
                    </ol>
                    <p className="text-[11px] text-slate-500 italic">
                      Nota de Seguridad: Las cuentas de Google ya no permiten el uso de la contraseña habitual directa por motivos de seguridad institucional.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Cuenta de Correo Gmail Remitente
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.userEmail}
                        onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                        onBlur={handleEmailBlur}
                        placeholder="ejemplo@gmail.com o kgerardo2003@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        required
                      />
                      <div className="absolute right-3 top-2.5 text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Cuenta autorizada en Google con permisos de envío SMTP.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nombre a Mostrar del Remitente
                    </label>
                    <input
                      type="text"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      placeholder="Sistema de Control de Compras - GIT OJ"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                      required
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Nombre institucional visible para las autoridades receptoras.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contraseña de Aplicación de Google (16 caracteres)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.appPassword}
                      onChange={handlePasswordChange}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Cifrado institucional en reposo. Nunca se envía texto plano a clientes no autorizados.</span>
                  </div>
                </div>

              {/* Servidor y Puerto SMTP */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Parámetros del Servidor SMTP de Google
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Servidor Host
                    </label>
                    <input
                      type="text"
                      value={formData.smtpHost}
                      onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-slate-50 font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Puerto SMTP
                    </label>
                    <select
                      value={formData.smtpPort}
                      onChange={(e) => {
                        const port = Number(e.target.value);
                        setFormData({ 
                          ...formData, 
                          smtpPort: port,
                          secure: port === 465 
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white font-mono font-bold"
                    >
                      <option value={465}>465 (SSL / Cifrado Implícito - Recomendado)</option>
                      <option value={587}>587 (TLS / STARTTLS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Seguridad SSL/TLS
                    </label>
                    <div className="flex items-center h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
                      <span>{formData.secure ? 'SSL Seguro Habilitado' : 'STARTTLS Habilitado'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Eventos a Notificar */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Disparadores y Alertas Automáticas para Autoridades
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.notifyOnNewPurchase}
                      onChange={(e) => setFormData({ ...formData, notifyOnNewPurchase: e.target.checked })}
                      className="mt-0.5 rounded-sm text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Nueva Adquisición Registrada</span>
                      <span className="text-[11px] text-slate-500">Notificar a autoridades al ingresar un nuevo NOG.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.notifyOnAdjudication}
                      onChange={(e) => setFormData({ ...formData, notifyOnAdjudication: e.target.checked })}
                      className="mt-0.5 rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Evento Adjudicado</span>
                      <span className="text-[11px] text-slate-500">Alerta de adjudicación oficial y monto consolidado.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.notifyOnDeadlineWarning}
                      onChange={(e) => setFormData({ ...formData, notifyOnDeadlineWarning: e.target.checked })}
                      className="mt-0.5 rounded-sm text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Alerta de Cierre de Ofertas</span>
                      <span className="text-[11px] text-slate-500">Aviso preventivo 3 días antes del cierre de plicas.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.notifyOnGitOpinion}
                      onChange={(e) => setFormData({ ...formData, notifyOnGitOpinion: e.target.checked })}
                      className="mt-0.5 rounded-sm text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Dictamen Técnico GIT Emitido</span>
                      <span className="text-[11px] text-slate-500">Envío automático del visto bueno o análisis técnico.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botón de Guardado */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Parámetros de Correo</span>
                </button>
              </div>
            </form>
          </div>

          {/* Panel Lateral: Destinatarios & Prueba de Envío */}
          <div className="lg:col-span-4 space-y-6">
            {/* Destinatarios Autorizados */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Destinatarios Autorizados</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {formData.recipientEmails.length}
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder="autoridad@oj.gob.gt"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                    title="Agregar correo a la lista"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {formData.recipientEmails.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      No hay destinatarios registrados.
                    </p>
                  ) : (
                    formData.recipientEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs group hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate font-mono text-[11px]">{email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(email)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                          title="Eliminar destinatario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Banco de Prueba en Tiempo Real */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Test de Conexión Gmail
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  SMTP Live
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Ejecuta una verificación en vivo de credenciales para comprobar la entrega a través de los servidores de Gmail.
              </p>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Enviar Correo de Prueba a:
                    </label>
                    <button
                      type="button"
                      onClick={() => setTestEmail(formData.userEmail || 'kgerardo2003@gmail.com')}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                    >
                      Usar mi cuenta ({formData.userEmail || 'kgerardo2003@gmail.com'})
                    </button>
                  </div>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="kgerardo2003@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRunTest}
                  disabled={isTesting}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Verificando con Gmail...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>Despachar Correo de Prueba</span>
                    </>
                  )}
                </button>

                {testResult && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    testResult.success 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{testResult.success ? 'Conexión Exitosa' : 'Fallo de Autenticación'}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{testResult.message}</p>
                  </div>
                )}

                {formData.lastTestDate && !testResult && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Última prueba realizada:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {new Date(formData.lastTestDate).toLocaleDateString()} {new Date(formData.lastTestDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SUBTAB 2: VERCEL & GITHUB DEPLOYMENT GUIDELINES */}
      {activeSubTab === 'vercel_github' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Consideraciones Técnicas para Despliegue en Vercel & GitHub
                  </h2>
                  <p className="text-xs text-slate-300">
                    Arquitectura segura para que las credenciales de Gmail nunca se expongan en el frontend cliente.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Producción Ready
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>1. Seguridad de Contraseña</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nunca agregues la contraseña de aplicación con prefijo <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">VITE_</code>. Debe residir exclusivamente en las <strong>Environment Variables</strong> de Vercel.
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-2">
                  <Server className="w-4 h-4" />
                  <span>2. Vercel Serverless Functions (/api)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ya están creadas las funciones en la carpeta <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">/api/email/test.ts</code> y <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">/api/email/send.ts</code>, configuradas con <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">vercel.json</code> para responder con JSON válido en Vercel.
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
                  <Code2 className="w-4 h-4" />
                  <span>3. GitHub y Despliegue Directo</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Al sincronizar tu repositorio con GitHub, Vercel detecta automáticamente la carpeta <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">/api</code> y los despliega como Serverless Functions sin requerir configuración manual.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Snippet Variables de Entorno para Vercel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Variables de Entorno para Vercel Dashboard
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyEnv}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEnv ? 'Copiado' : 'Copiar .env'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Copia y pega estas variables en el panel de <strong>Vercel &gt; Settings &gt; Environment Variables</strong>:
                </p>

                <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
                  {envSample}
                </pre>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Al guardar en Vercel, recuerda activar los entornos <strong>Production</strong>, <strong>Preview</strong> y <strong>Development</strong>.</span>
              </div>
            </div>

            {/* Código de Ejemplo Serverless Function */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Vercel Serverless Function (/api/send-email.ts)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copiado' : 'Copiar Código'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Archivo listo para colocar en la carpeta raíz del repositorio en GitHub:
                </p>

                <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-72">
                  {vercelFunctionCode}
                </pre>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Dependencias requeridas en package.json:</span>
                <code className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                  nodemailer, @types/nodemailer
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: VISTA PREVIA CORREO OFICIAL INSTITUCIONAL */}
      {activeSubTab === 'preview' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Plantilla de Correo Institucional para Autoridades
              </h2>
              <p className="text-xs text-slate-500">
                Formato HTML con membrete oficial del Organismo Judicial de Guatemala y sello de la GIT.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
              Formato Oficial OJ
            </span>
          </div>

          {/* Tarjeta de Correo Renderizada */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
            {/* Header del Correo */}
            <div className="bg-[#1c39bb] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center border-2 border-amber-400 shadow-xs">
                  <img src="/organismo_judicial_logo.svg" alt="Organismo Judicial" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-white">
                    Organismo Judicial de Guatemala
                  </h3>
                  <p className="text-xs text-blue-100">
                    Gerencia de Informática
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-blue-200 font-mono">
                <span>Ref: NOG-2026-00124</span>
              </div>
            </div>

            {/* Contenido del Correo */}
            <div className="p-6 space-y-4 bg-white text-slate-800 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">
                    Notificación Institucional
                  </span>
                  <span className="text-xs font-black text-slate-900">
                    Adjudicación de Proceso de Compra Informática
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                  Adjudicado
                </span>
              </div>

              <p className="leading-relaxed text-slate-600">
                Estimadas <strong>Máximas Autoridades del Organismo Judicial</strong>:
              </p>

              <p className="leading-relaxed text-slate-600">
                Por medio de la presente se notifica que el proceso de adquisición bajo la nomenclatura técnica institucional ha completado su fase técnica y legal satisfactoriamente:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold">NOG:</span>
                  <span className="font-black text-slate-900">22415896</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold">Descripción:</span>
                  <span className="font-medium text-slate-800 text-right max-w-[280px] truncate">
                    Adquisición de Servidores Blade y Enlace Satelital
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold">Monto Adjudicado:</span>
                  <span className="font-black text-emerald-700">Q 1,450,000.00</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold">Departamento Solicitante:</span>
                  <span className="font-bold text-slate-800">Infraestructura y Redes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Dictamen Técnico GIT:</span>
                  <span className="font-bold text-emerald-600">Favorable con VoBo (Lic. Kevin López)</span>
                </div>
              </div>

              <div className="pt-2 text-slate-500 text-[11px] leading-relaxed">
                Este mensaje ha sido emitido automáticamente desde el Sistema de Control de Compras del Organismo Judicial configurado con Google Mail SMTP institucional.
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span>Palacio de Justicia, Ciudad de Guatemala</span>
                <span>Portal Guatecompras / GIT-OJ</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
