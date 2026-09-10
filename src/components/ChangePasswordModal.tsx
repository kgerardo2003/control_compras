import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ChangePasswordModal: React.FC = () => {
  const { 
    currentUser, 
    isChangePasswordModalOpen, 
    setIsChangePasswordModalOpen, 
    changePassword,
    showToast,
    themeConfig 
  } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isChangePasswordModalOpen || !currentUser) return null;

  const handleClose = () => {
    setErrorMsg(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsChangePasswordModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg('Debe ingresar su contraseña actual.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('La nueva contraseña debe ser diferente a la contraseña actual.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('La confirmación de la contraseña no coincide.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = changePassword(currentPassword, newPassword);
      if (!result.success) {
        setErrorMsg(result.message);
        setIsSubmitting(false);
        return;
      }

      showToast({
        type: 'success',
        title: 'Contraseña Actualizada',
        message: 'Su contraseña ha sido cambiada y sincronizada exitosamente.',
        duration: 4000
      });

      handleClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocurrió un error inesperado al actualizar la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLengthValid = newPassword.length >= 6;
  const isDifferent = newPassword !== '' && newPassword !== currentPassword;
  const isMatch = newPassword !== '' && newPassword === confirmPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Cambiar Contraseña
              </h3>
              <p className="text-[11px] text-slate-400">
                Usuario: <span className="font-semibold text-slate-200">{currentUser.username}</span> ({currentUser.nombreCompleto})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Campo: Contraseña Actual */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Contraseña Actual *
            </label>
            <div className="relative">
              <input
                id="input-current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingrese su contraseña vigente"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showCurrent ? 'Ocultar' : 'Mostrar'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Campo: Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                id="input-new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showNew ? 'Ocultar' : 'Mostrar'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Requisitos visuales */}
            <div className="mt-2 space-y-1 text-[11px]">
              <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLengthValid ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>Al menos 6 caracteres de longitud</span>
              </div>
              {newPassword && (
                <div className={`flex items-center gap-1.5 ${isDifferent ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-medium'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isDifferent ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span>{isDifferent ? 'Diferente a la contraseña actual' : 'Debe ser diferente a la contraseña actual'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Campo: Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                id="input-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Vuelva a escribir la nueva contraseña"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showConfirm ? 'Ocultar' : 'Mostrar'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && (
              <p className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${isMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isMatch ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
              </p>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isLengthValid || !isMatch || !isDifferent}
              className={`px-4 py-2 text-xs font-bold rounded-xl ${themeConfig.primaryBtn} shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <KeyRound className="w-3.5 h-3.5 text-black" />
              <span>{isSubmitting ? 'Guardando...' : 'Actualizar Contraseña'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
