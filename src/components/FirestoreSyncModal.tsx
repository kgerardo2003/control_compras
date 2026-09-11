import React, { useState } from 'react';
import { 
  Database, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  HelpCircle,
  Copy,
  Check,
  Radio,
  Server,
  MonitorSmartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const FirestoreSyncModal: React.FC = () => {
  const { 
    isFirestoreModalOpen, 
    setIsFirestoreModalOpen, 
    firestoreHealth, 
    checkDatabaseConnection 
  } = useApp();

  const [isChecking, setIsChecking] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isFirestoreModalOpen) return null;

  const handleManualCheck = async () => {
    setIsChecking(true);
    await checkDatabaseConnection();
    setTimeout(() => {
      setIsChecking(false);
    }, 600);
  };

  const copyConsoleUrl = () => {
    if (firestoreHealth?.consoleUrl) {
      navigator.clipboard.writeText(firestoreHealth.consoleUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const status = firestoreHealth?.status || 'conectando';

  return (
    <div 
      id="modal-firestore-sync-diagnostics"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="firestore-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Encabezado Institucional */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              status === 'conectado' 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 id="firestore-modal-title" className="text-base font-bold text-white tracking-tight">
                Estado de Sincronización en la Nube
              </h3>
              <p className="text-xs text-slate-400">
                Departamento de Compras • Organismo Judicial de Guatemala
              </p>
            </div>
          </div>

          <button
            id="btn-close-firestore-modal"
            type="button"
            onClick={() => setIsFirestoreModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">

          {/* Tarjeta de Diagnóstico Principal */}
          {status === 'conectado' ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-emerald-950">¡Base de Datos Firestore Conectada y Activa!</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  El sistema se encuentra sincronizado en tiempo real con Google Cloud Firestore en el proyecto <strong>{firestoreHealth?.projectId}</strong>. Cualquier cambio realizado se reflejará automáticamente en todos los navegadores y dispositivos conectados.
                </p>
              </div>
            </div>
          ) : status === 'no_creada' ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="font-bold text-amber-950 text-base">
                  Causa identificada: La Base de Datos Firestore aún no existe en Google Cloud
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Tu proyecto de Firebase <strong>{firestoreHealth?.projectId}</strong> está vinculado correctamente a la aplicación, pero la base de datos <strong>(default)</strong> aún no ha sido inicializada dentro de Firebase Console.
                </p>
                <div className="bg-amber-100/70 p-2.5 rounded-lg border border-amber-300/80 text-[11px] text-amber-950 font-medium">
                  ⚠️ Por este motivo, si abres el sistema en dos computadoras o pestañas diferentes, los datos no se sincronizan porque no hay un servidor central activo para recibirlos.
                </div>
              </div>
            </div>
          ) : status === 'permiso_denegado' ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-rose-950">Permiso Denegado por Reglas de Seguridad</h4>
                <p className="text-xs text-rose-800 leading-relaxed">
                  La base de datos existe, pero las Reglas de Seguridad de Firestore en Firebase Console están bloqueando la lectura o escritura.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-slate-500 animate-spin shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900">Verificando estado de la base de datos...</h4>
                <p className="text-xs text-slate-600">
                  Comprobando respuesta del backend de Google Cloud Firestore para el proyecto {firestoreHealth?.projectId}...
                </p>
              </div>
            </div>
          )}

          {/* Información Técnica de Conexión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Proyecto Firebase</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{firestoreHealth?.projectId || 'control-de-compras-oj'}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">ID de Base de Datos</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{firestoreHealth?.databaseId || '(default)'}</span>
            </div>
          </div>

          {/* Guía Paso a Paso para Habilitar Firestore (Solo cuando no está creada) */}
          {status === 'no_creada' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>¿Cómo activar la base de datos en Firebase Console? (Solo toma 20 segundos)</span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <p>
                    Abre la consola oficial de Firebase con tu cuenta de Google (<strong className="text-slate-800">kgerardo2003@gmail.com</strong>):
                    <a 
                      href={firestoreHealth?.consoleUrl || `https://console.firebase.google.com/project/control-de-compras-oj/firestore`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 ml-1 text-blue-600 hover:text-blue-800 font-bold underline"
                    >
                      Abrir Firebase Console <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <p>
                    Haz clic en el botón azul central que dice <strong>"Crear base de datos"</strong> (o <em>Create database</em>).
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <p>
                    En <strong>Database ID</strong> déjalo como <code>(default)</code> y en <strong>Location</strong> elige una región cercana (por ejemplo <code>us-central1</code> o <code>nam5</code>).
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                  <p>
                    En el paso de Reglas de seguridad selecciona <strong>Modo de prueba</strong> o presiona <strong>Habilitar</strong> (Enable).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mecanismos de Sincronización Activos */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Mecanismos de Sincronización del Sistema
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <MonitorSmartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span>Sincronización entre Pestañas</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">Activa</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mediante <em>BroadcastChannel</em>, los cambios entre pestañas del mismo navegador se reflejan de inmediato.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <Server className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span>Sincronización Multi-Equipo Cloud</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      status === 'conectado' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {status === 'conectado' ? 'Activa' : 'Requiere Habilitación'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sincroniza compras y usuarios entre diferentes computadoras a través de Google Cloud Firestore.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Pie de Acciones */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="btn-copy-console-url"
              type="button"
              onClick={copyConsoleUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              {copiedUrl ? 'Enlace Copiado' : 'Copiar Enlace de Consola'}
            </button>

            {firestoreHealth?.consoleUrl && (
              <a
                id="btn-open-firebase-console"
                href={firestoreHealth.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                Ir a Firebase Console
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-check-firestore-connection"
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#1c39bb] hover:bg-[#152c94] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Verificando Servidor...' : 'Verificar Conexión Ahora'}
            </button>
            <button
              id="btn-close-firestore-modal-footer"
              type="button"
              onClick={() => setIsFirestoreModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
