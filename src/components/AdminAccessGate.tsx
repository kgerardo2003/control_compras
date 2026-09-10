import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface AdminAccessGateProps {
  moduleTitle: string;
  moduleDescription: string;
  requiredRolesText?: string;
}

export const AdminAccessGate: React.FC<AdminAccessGateProps> = ({ 
  moduleTitle, 
  moduleDescription,
  requiredRolesText
}) => {
  const { setActiveTab, currentUser } = useApp();

  const getRoleLabel = (rol?: string) => {
    switch (rol) {
      case 'auditor': return 'Auditor Institucional';
      case 'usuario_estandar': return 'Operador GIT / Usuario Estándar';
      default: return rol || 'Invitado';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-center">
        
        {/* Cabecera de Alerta */}
        <div className="bg-slate-900 p-6 text-white relative">
          <div className="w-16 h-16 bg-amber-500/20 border-2 border-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
            Seguridad Institucional • Restricción de Perfil
          </span>
          <h2 className="text-lg font-bold uppercase tracking-wide">
            Panel de Administración Restringido
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {moduleTitle}
          </p>
        </div>

        {/* Mensaje Explicativo */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{requiredRolesText || 'Acceso Exclusivo para Administradores'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-700">
              El acceso a <strong>{moduleTitle}</strong> ({moduleDescription}) requiere privilegios de {requiredRolesText ? 'Administrador o Auditor' : 'Administrador'} del Organismo Judicial.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200 text-slate-600">
              <span>Usuario Autenticado:</span>
              <span className="font-bold text-slate-900">{currentUser?.username || 'Invitado'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200 text-slate-600">
              <span>Nombre Oficial:</span>
              <span className="font-semibold text-slate-800">{currentUser?.nombreCompleto || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 text-slate-600">
              <span>Rol Actual:</span>
              <span className="font-bold text-red-600 uppercase text-[11px]">{getRoleLabel(currentUser?.rol)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
            <span>Volver al Panel Principal</span>
          </button>
        </div>

      </div>
    </div>
  );
};
