import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  PlusCircle, 
  Database, 
  ShieldCheck, 
  Users, 
  FileText, 
  Palette,
  Mail,
  X,
  Lock,
  RotateCcw,
  KeyRound,
  Key,
  DollarSign
} from 'lucide-react';
import { ActiveTab } from '../types';
import { OJLogo } from './OJLogo';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser, 
    setIsPurchaseModalOpen, 
    setIsChangePasswordModalOpen,
    setPurchaseToEdit,
    resetToDemoData,
    purchases,
    budgetAvailability,
    userProfiles,
    hasModuleAccess,
    getUserProfile,
    themeConfig,
    firestoreStatus
  } = useApp();

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  const handleNewPurchaseClick = () => {
    setPurchaseToEdit(null);
    setIsPurchaseModalOpen(true);
    onCloseMobile();
  };

  const userRole = currentUser?.rol || 'usuario_estandar';
  const canCreatePurchase = userRole === 'administrador' || userRole === 'usuario_estandar';
  const userProfile = getUserProfile(currentUser || undefined);

  const formatRoleName = () => {
    if (userProfile) return userProfile.nombre;
    switch (currentUser?.rol) {
      case 'administrador': return 'Administrador';
      case 'auditor': return 'Auditor';
      case 'usuario_estandar': return 'Operador Informática';
      default: return 'Usuario';
    }
  };

  return (
    <>
      {/* Backdrop Móvil */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-30
        h-full lg:h-screen
        w-64 ${themeConfig.sidebarBg} text-white ${themeConfig.sidebarBorder} border-r
        flex flex-col justify-between
        transition-colors duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Header del Sidebar con Logotipo Institucional */}
        <div className={`p-4 border-b ${themeConfig.sidebarBorder} relative flex flex-col items-center`}>
          <button 
            type="button" 
            onClick={onCloseMobile}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden"
            title="Cerrar Menú"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-full flex justify-center py-1">
            <OJLogo size="md" layout="stacked" variant="full" />
          </div>
        </div>

        {/* Botón de Acción Rápida */}
        <div className={`p-3 border-b ${themeConfig.sidebarBorder}`}>
          {canCreatePurchase ? (
            <button
              id="btn-sidebar-new-purchase"
              type="button"
              onClick={handleNewPurchaseClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4 text-black" />
              <span>+ Nueva Adquisición</span>
            </button>
          ) : (
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-amber-300 text-xs flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-medium">Modo Auditoría Activo</span>
            </div>
          )}
        </div>

        {/* Enlaces de Navegación */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          
          {/* Categoría: Operativo */}
          <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operaciones Principales
          </div>

          {/* Panel Principal */}
          {hasModuleAccess('dashboard') && (
            <button
              id="nav-tab-dashboard"
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? themeConfig.sidebarActive
                  : `text-slate-300 ${themeConfig.sidebarHover}`
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 mr-3 ${activeTab === 'dashboard' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
              <span>Panel Principal</span>
            </button>
          )}

          {/* Compras y Eventos */}
          {hasModuleAccess('compras') && (
            <button
              id="nav-tab-compras"
              type="button"
              onClick={() => handleNavClick('compras')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'compras'
                  ? themeConfig.sidebarActive
                  : `text-slate-300 ${themeConfig.sidebarHover}`
              }`}
            >
              <div className="flex items-center">
                <ShoppingBag className={`w-4 h-4 mr-3 ${activeTab === 'compras' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
                <span>Compras y Eventos</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${themeConfig.sidebarBadge} font-mono`}>
                {purchases.length}
              </span>
            </button>
          )}

          {/* Presupuesto IT (Finanzas & Disponibilidad) */}
          {hasModuleAccess('presupuesto') && (
            <button
              id="nav-tab-presupuesto"
              type="button"
              onClick={() => handleNavClick('presupuesto')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'presupuesto'
                  ? themeConfig.sidebarActive
                  : `text-slate-300 ${themeConfig.sidebarHover}`
              }`}
            >
              <div className="flex items-center">
                <DollarSign className={`w-4 h-4 mr-3 ${activeTab === 'presupuesto' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
                <span>Presupuesto IT</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${themeConfig.sidebarBadge} font-mono`}>
                {budgetAvailability.length}
              </span>
            </button>
          )}

          {/* Reportes & Dictámenes */}
          {hasModuleAccess('reportes') && (
            <button
              id="nav-tab-reportes"
              type="button"
              onClick={() => handleNavClick('reportes')}
              className={`w-full flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'reportes'
                  ? themeConfig.sidebarActive
                  : `text-slate-300 ${themeConfig.sidebarHover}`
              }`}
            >
              <FileText className={`w-4 h-4 mr-3 ${activeTab === 'reportes' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
              <span>Reportes & Dictámenes</span>
            </button>
          )}

          {/* Registro de Auditoría */}
          {hasModuleAccess('auditoria') && (
            <>
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Control & Supervisión
              </div>
              <button
                id="nav-tab-auditoria"
                type="button"
                onClick={() => handleNavClick('auditoria')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'auditoria'
                    ? themeConfig.sidebarActive
                    : `text-slate-300 ${themeConfig.sidebarHover}`
                }`}
              >
                <div className="flex items-center">
                  <ShieldCheck className={`w-4 h-4 mr-3 ${activeTab === 'auditoria' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
                  <span>Registro de Auditoría</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${themeConfig.dotColor}`} />
              </button>
            </>
          )}

          {/* PANELES DE ADMINISTRACIÓN Y CONFIGURACIÓN */}
          {(hasModuleAccess('usuarios') || hasModuleAccess('perfiles') || hasModuleAccess('catalogos') || hasModuleAccess('personalizacion') || hasModuleAccess('correo')) && (
            <>
              <div className="px-3 pt-4 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400/90 border-t border-white/10 mt-2">
                <span>Administración & RBAC</span>
                {currentUser?.rol === 'administrador' && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono border border-amber-500/30">
                    Admin
                  </span>
                )}
              </div>

              {/* Administración de Usuarios */}
              {hasModuleAccess('usuarios') && (
                <button
                  id="nav-tab-usuarios"
                  type="button"
                  onClick={() => handleNavClick('usuarios')}
                  className={`w-full flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'usuarios'
                      ? themeConfig.sidebarActive
                      : `text-slate-300 ${themeConfig.sidebarHover}`
                  }`}
                >
                  <Users className={`w-4 h-4 mr-3 ${activeTab === 'usuarios' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
                  <span>Gestión de Usuarios</span>
                </button>
              )}

              {/* Perfiles de Usuario y Control de Acceso (RBAC) */}
              {hasModuleAccess('perfiles') && (
                <button
                  id="nav-tab-perfiles"
                  type="button"
                  onClick={() => handleNavClick('perfiles')}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'perfiles'
                      ? themeConfig.sidebarActive
                      : `text-slate-300 ${themeConfig.sidebarHover}`
                  }`}
                >
                  <div className="flex items-center">
                    <Key className={`w-4 h-4 mr-3 ${activeTab === 'perfiles' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
                    <span>Perfiles & Permisos</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${themeConfig.sidebarBadge} font-mono font-bold`}>
                    {userProfiles.length}
                  </span>
                </button>
              )}

              {/* Mantenimiento y Catálogos */}
              {hasModuleAccess('catalogos') && (
                <button
                  id="nav-tab-catalogos"
                  type="button"
                  onClick={() => handleNavClick('catalogos')}
                  className={`w-full flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'catalogos'
                      ? themeConfig.sidebarActive
                      : `text-slate-300 ${themeConfig.sidebarHover}`
                  }`}
                >
                  <Database className={`w-4 h-4 mr-3 ${activeTab === 'catalogos' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
                  <span>Catálogos del Sistema</span>
                </button>
              )}

              {/* Personalización y Temas */}
              {hasModuleAccess('personalizacion') && (
                <button
                  id="nav-tab-personalizacion"
                  type="button"
                  onClick={() => handleNavClick('personalizacion')}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'personalizacion'
                      ? themeConfig.sidebarActive
                      : `text-slate-300 ${themeConfig.sidebarHover}`
                  }`}
                >
                  <div className="flex items-center">
                    <Palette className={`w-4 h-4 mr-3 ${activeTab === 'personalizacion' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
                    <span>Personalización & Temas</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${themeConfig.sidebarBadge} font-bold`}>
                    Paletas
                  </span>
                </button>
              )}

              {/* Configuración de Correo (Gmail & Alertas) */}
              {hasModuleAccess('correo') && (
                <button
                  id="nav-tab-correo"
                  type="button"
                  onClick={() => handleNavClick('correo')}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'correo'
                      ? themeConfig.sidebarActive
                      : `text-slate-300 ${themeConfig.sidebarHover}`
                  }`}
                >
                  <div className="flex items-center">
                    <Mail className={`w-4 h-4 mr-3 ${activeTab === 'correo' ? themeConfig.sidebarIconActive : 'text-slate-400'}`} />
                    <span>Configuración de Correo</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${themeConfig.sidebarBadge} font-bold`}>
                    Gmail
                  </span>
                </button>
              )}
            </>
          )}
        </nav>

        {/* Bloque Inferior de Usuario & Reset */}
        <div className={`p-3 border-t ${themeConfig.sidebarBorder} space-y-2`}>
          
          {/* Indicador de Base de Datos Nube */}
          <div className="bg-white/5 px-2.5 py-1.5 rounded-md flex items-center justify-between border border-white/5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                {firestoreStatus === 'conectado' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400 animate-pulse"></span>
                )}
              </span>
              <span className="text-slate-300 font-medium">BD Firestore</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">
              {firestoreStatus === 'conectado' ? 'En Vivo' : 'Conectando'}
            </span>
          </div>

          {/* Tarjeta de Usuario Activo */}
          <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between border border-white/5">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Usuario: {formatRoleName()}
              </p>
              <p className="text-xs text-white font-semibold truncate">
                {currentUser?.nombreCompleto || 'Invitado'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cambiar contraseña de mi cuenta"
                aria-label="Cambiar contraseña"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <div className={`w-7 h-7 rounded-full bg-white/10 ${themeConfig.sidebarIconActive} flex items-center justify-center font-bold text-xs`}>
                {currentUser?.username.slice(0, 2).toUpperCase() || 'OJ'}
              </div>
            </div>
          </div>

          {/* Tarjeta de Creador del Sistema */}
          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 text-left">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              Creador del Sistema:
            </span>
            <span className="text-[11px] font-semibold text-white block truncate mt-0.5">
              Lic. Kevin Gerardo López de León
            </span>
          </div>

          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>SICOIN-GI v2.4</span>
            <button
              type="button"
              onClick={resetToDemoData}
              className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              title="Restaurar datos iniciales"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>

      </aside>
    </>
  );
};
