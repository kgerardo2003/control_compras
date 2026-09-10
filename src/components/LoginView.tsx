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
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { OJLogo } from './OJLogo';

export const LoginView: React.FC = () => {
  const { login, setActiveTab } = useApp();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Por favor ingrese su usuario institucional.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Por favor ingrese su contraseña de acceso.');
      return;
    }

    setIsLoading(true);
    // Simula verificación y autenticación de credenciales seguras
    setTimeout(() => {
      const result = login(username.trim(), password);
      setIsLoading(false);
      if (result.success) {
        setSuccessMsg(`Credenciales verificadas exitosamente. Ingresando al panel principal...`);
        setActiveTab('dashboard');
      } else {
        setErrorMsg(result.message);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#0a1533] text-slate-100 font-sans relative overflow-x-hidden selection:bg-[#1c39bb] selection:text-white">
      
      {/* Fondo con Textura Institucional Sutil */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#4682b4 0.85px, transparent 0.85px), radial-gradient(#1c39bb 0.85px, #070e24 0.85px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px'
        }}
      />

      {/* Barra Superior Decorativa de la República de Guatemala */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#1c39bb] via-[#4682b4] to-[#1c39bb]" />

      {/* Contenedor Principal Centrado */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4 sm:my-8">
        <div className="w-full max-w-lg bg-[#0d1d45]/95 backdrop-blur-md rounded-2xl border border-[#4682b4]/40 shadow-2xl overflow-hidden">
          
          {/* Encabezado con Logotipo Grande Arriba de ORGANISMO JUDICIAL */}
          <div className="p-6 sm:p-8 text-center border-b border-[#1c39bb]/40 bg-gradient-to-b from-[#0e214f] to-[#0a1738]">
            
            {/* Logo en Área Grande Arriba de ORGANISMO JUDICIAL */}
            <div className="w-full flex justify-center mb-3">
              <OJLogo size="xl" layout="stacked" variant="full" lightMode={false} />
            </div>

            <div className="mt-4 pt-3 border-t border-[#1c39bb]/40 flex items-center justify-center gap-2 text-[#93c5fd] text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#4682b4]" />
              <span>Sistema de Control de Adquisiciones • Gerencia de Informática</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Registro, Monitoreo y Fiscalización de Formularios F56-e y Eventos NOG
            </p>
          </div>

          {/* Formulario de Inicio de Sesión */}
          <div className="p-6 sm:p-8 bg-[#0b183c]">
            
            {/* Alertas */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Error de Verificación:</span>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Campo Usuario */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5">
                  Usuario Institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    disabled={isLoading}
                    className="w-full pl-9 pr-4 py-2.5 bg-[#060f26]/80 border border-[#4682b4]/40 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4682b4] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                    Contraseña de Acceso
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Sensible a mayúsculas
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-9 pr-10 py-2.5 bg-[#060f26]/80 border border-[#4682b4]/40 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4682b4] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botón de Autenticación */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-black font-bold text-xs uppercase tracking-wider shadow-lg border border-slate-300 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                    <span>Verificando Credenciales...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-black" />
                    <span>Autenticar e Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </form>

            {/* Aviso Institucional de Seguridad y Privacidad */}
            <div className="mt-6 pt-5 border-t border-[#1c39bb]/30">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#071129]/80 border border-[#4682b4]/30 text-slate-300">
                <ShieldCheck className="w-5 h-5 text-[#4682b4] flex-shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed text-left">
                  <p className="font-bold text-xs text-white">
                    Acceso Oficial Restringido y Protegido
                  </p>
                  <p className="text-[11px] text-slate-300">
                    El ingreso a esta plataforma está estrictamente reservado para personal autorizado del Organismo Judicial. Toda sesión y transacción es fiscalizada y registrada en la bitácora de auditoría interna de la GIT.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Pie del Panel de Login */}
          <div className="px-6 py-3 bg-[#060e24] border-t border-[#1c39bb]/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>TERMINAL: GIT-SEC-01</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA OPERATIVO SEGURO
            </span>
          </div>

        </div>
      </div>

      {/* Pie de Página Institucional */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80 z-10">
        <p className="font-semibold text-slate-400">
          Organismo Judicial de Guatemala • Gerencia de Informática
        </p>
        <p className="text-[12px] text-slate-300 mt-1">
          Creador del Sistema: <strong className="text-amber-400 font-bold">Lic. Kevin Gerardo López de León</strong>
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          Palacio de Justicia, Centro Cívico, Ciudad de Guatemala • Todos los derechos reservados © 2026
        </p>
      </footer>

    </div>
  );
};
