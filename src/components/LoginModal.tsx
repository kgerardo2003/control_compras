import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  X,
  CheckCircle2
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, login } = useApp();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Por favor ingrese su usuario institucional.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      setIsLoading(false);
      if (result.success) {
        setSuccessMsg(result.message);
        setTimeout(() => {
          setIsLoginModalOpen(false);
          setUsername('');
          setPassword('');
          setSuccessMsg('');
        }, 800);
      } else {
        setErrorMsg(result.message);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Encabezado Institucional (Professional Polish) */}
        <div className="bg-[#0d1f4d] p-6 text-white text-center relative border-b border-[#1c39bb]/40">
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162e7a]"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-[#1c39bb] border border-[#4682b4]/50 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              OJ
            </div>
          </div>
          
          <h2 className="text-base font-bold uppercase tracking-wider text-white">
            Organismo Judicial de Guatemala
          </h2>
          <p className="text-xs text-[#93c5fd] mt-0.5">
            Gerencia de Informática • Control de Adquisiciones
          </p>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Autenticación de Usuario</h3>
            <p className="text-xs text-slate-500">
              Ingrese sus credenciales oficiales para acceder al sistema.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Usuario */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Usuario Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="input-login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingrese su usuario"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] focus:border-[#4682b4]"
                  required
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] focus:border-[#4682b4]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-300 active:scale-95"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 text-black" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200 text-center space-y-1.5">
            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#4682b4]" />
              <span>Acceso oficial restringido. Sesión registrada en bitácora de auditoría.</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Creador del Sistema: <strong className="text-slate-900 font-bold">Lic. Kevin Gerardo López de León</strong>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
