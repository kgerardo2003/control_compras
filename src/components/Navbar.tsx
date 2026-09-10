import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, 
  Menu, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  UserCheck, 
  LogOut, 
  LogIn, 
  Sparkles,
  ShieldCheck,
  Palette,
  Check,
  Database,
  Cloud,
  KeyRound
} from 'lucide-react';
import { UserRole, SystemThemeId } from '../types';
import { formatDateTime } from '../utils/formatters';
import { SYSTEM_THEMES } from '../utils/themeConfig';

interface NavbarProps {
  onOpenMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const { 
    currentUser, 
    logout, 
    setIsLoginModalOpen, 
    setIsChangePasswordModalOpen,
    switchDemoUser,
    notifications, 
    unreadNotificationsCount, 
    markNotificationRead,
    markAllNotificationsRead,
    triggerSimulatedNotification,
    setSelectedPurchase,
    purchases,
    setActiveTab,
    theme,
    setTheme,
    themeConfig,
    firestoreStatus
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const demoMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdowns al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (demoMenuRef.current && !demoMenuRef.current.contains(event.target as Node)) {
        setIsDemoMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (rol?: UserRole) => {
    switch (rol) {
      case 'administrador':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">ADMIN</span>;
      case 'auditor':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">AUDITOR</span>;
      case 'usuario_estandar':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">OPERADOR</span>;
    }
  };

  const handleNotificationClick = (enlaceId?: string, notifId?: string) => {
    if (notifId) markNotificationRead(notifId);
    if (enlaceId) {
      const p = purchases.find(item => item.id === enlaceId);
      if (p) {
        setSelectedPurchase(p);
      } else {
        setActiveTab('compras');
      }
    }
    setIsNotifOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      
      {/* Lado Izquierdo: Botón Menú Móvil + Título Principal */}
      <div className="flex items-center gap-3">
        <button 
          id="btn-mobile-menu-toggle"
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 font-sans tracking-tight">
            Gestión de Adquisiciones Institucionales
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-500 font-medium">
            Gerencia de Informática • Organismo Judicial
          </p>
        </div>
      </div>

      {/* Lado Derecho: Indicadores, Notificaciones y Perfil */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        
        {/* Indicador de Base de Datos en la Nube Firestore (Multiusuario en Tiempo Real) */}
        <div 
          id="badge-firestore-status"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50/80 text-slate-700 select-none shadow-2xs"
          title={firestoreStatus === 'conectado' ? 'Base de datos Firestore sincronizada en tiempo real' : 'Conectando con base de datos en la nube...'}
        >
          <span className="relative flex h-2 w-2">
            {firestoreStatus === 'conectado' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse"></span>
            )}
          </span>
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-800 tracking-tight">
            {firestoreStatus === 'conectado' ? 'BD Firestore Activa' : 'Conectando BD...'}
          </span>
        </div>

        {/* Selector de Tema Rápido (3 Temas) */}
        <div className="relative" ref={themeMenuRef}>
          <button
            id="btn-quick-theme-switch"
            type="button"
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Cambiar tema visual"
          >
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: themeConfig.preview.accent }}
            />
            <span className="truncate max-w-[110px]">{themeConfig.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Paletas Institucionales</span>
                {currentUser?.rol === 'administrador' ? (
                  <button
                    type="button"
                    onClick={() => { setActiveTab('personalizacion'); setIsThemeMenuOpen(false); }}
                    className="text-[#1c39bb] hover:underline font-bold cursor-pointer"
                  >
                    Personalizar →
                  </button>
                ) : (
                  <span className="text-[9px] text-slate-400">Preconfigurados</span>
                )}
              </div>

              {(Object.keys(SYSTEM_THEMES) as SystemThemeId[]).map((themeKey) => {
                const item = SYSTEM_THEMES[themeKey];
                const isSelected = theme === themeKey;
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => { setTheme(themeKey); setIsThemeMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-[#ebf2f8] font-bold text-[#1c39bb]' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: item.preview.accent }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1c39bb]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selector de Rol Demo Rápido */}
        <div className="relative" ref={demoMenuRef}>
          <button
            id="btn-quick-role-switch"
            type="button"
            onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Rol Demo</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isDemoMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cambiar Rol de Prueba
              </div>
              <button
                type="button"
                onClick={() => { switchDemoUser('administrador'); setIsDemoMenuOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <span className="font-semibold text-slate-900">Administrador GIT</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Total</span>
              </button>
              <button
                type="button"
                onClick={() => { switchDemoUser('auditor'); setIsDemoMenuOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <span className="font-semibold text-slate-900">Auditor Interno</span>
                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Auditoría</span>
              </button>
              <button
                type="button"
                onClick={() => { switchDemoUser('usuario_estandar'); setIsDemoMenuOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <span className="font-semibold text-slate-900">Usuario Estándar</span>
                <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Operador</span>
              </button>
            </div>
          )}
        </div>

        {/* Campana de Notificaciones */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications-dropdown"
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Menú de Notificaciones */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-900">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Alertas y Notificaciones</span>
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Marcar leídas
                  </button>
                )}
              </div>

              <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Alertas automáticas GIT:</span>
                <button
                  type="button"
                  onClick={triggerSimulatedNotification}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-black border border-slate-300 text-[10px] font-bold shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-black" />
                  Simular Alerta
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No hay notificaciones registradas.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif, idx) => (
                    <div
                      key={`${notif.id}-${idx}`}
                      onClick={() => handleNotificationClick(notif.enlaceId, notif.id)}
                      className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-2.5 ${
                        !notif.leida ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {notif.tipo === 'urgente' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                        {notif.tipo === 'alerta' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {notif.tipo === 'exito' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {notif.tipo === 'info' && <Info className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${!notif.leida ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {notif.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {notif.mensaje}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">
                          {formatDateTime(notif.fecha)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Etiqueta de Sistema y Avatar */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block leading-tight">
            <p className="text-xs font-semibold text-slate-700">Sistema SICOIN-GIT</p>
            <p className="text-[10px] text-slate-400">Guatemala, 2026</p>
          </div>

          <div className="relative" ref={userMenuRef}>
            {currentUser ? (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#0d1f4d] border border-[#4682b4]/40 text-[#93c5fd] flex items-center justify-center font-bold text-xs shadow-sm hover:ring-2 hover:ring-[#4682b4] transition-all">
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
              >
                Ingresar
              </button>
            )}

            {/* Dropdown de Usuario */}
            {isUserMenuOpen && currentUser && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 text-xs">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                  <p className="font-bold text-slate-900 truncate">{currentUser.nombreCompleto}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Rol:</span>
                    {getRoleBadge(currentUser.rol)}
                  </div>
                </div>

                <div className="px-3 py-2 text-[11px] text-slate-600">
                  <p><strong>Cargo:</strong> {currentUser.cargo}</p>
                  <p className="text-slate-400 mt-0.5">{currentUser.departamento}</p>
                </div>

                <div className="border-t border-slate-100 pt-1 px-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { setIsChangePasswordModalOpen(true); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cambiar Contraseña</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { logout(); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </header>
  );
};
