/**
 * @license
 * Sistema de Control de Compras - Gerencia de Informática
 * Organismo Judicial de Guatemala
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PurchasesView } from './components/PurchasesView';
import { CatalogsView } from './components/CatalogsView';
import { AuditLogView } from './components/AuditLogView';
import { UsersView } from './components/UsersView';
import { ProfilesView } from './components/ProfilesView';
import { ReportsView } from './components/ReportsView';
import { BudgetView } from './components/budget/BudgetView';
import { CustomizationView } from './components/CustomizationView';
import { EmailConfigView } from './components/EmailConfigView';
import { LoginModal } from './components/LoginModal';
import { LoginView } from './components/LoginView';
import { AdminAccessGate } from './components/AdminAccessGate';
import { PurchaseFormModal } from './components/PurchaseFormModal';
import { PurchaseDetailModal } from './components/PurchaseDetailModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { ToastContainer } from './components/ToastContainer';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, themeConfig, currentUser, hasModuleAccess } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redireccionar si el usuario actual no tiene permiso sobre la pestaña activa
  useEffect(() => {
    if (currentUser && !hasModuleAccess(activeTab)) {
      if (hasModuleAccess('dashboard')) {
        setActiveTab('dashboard');
      } else if (hasModuleAccess('compras')) {
        setActiveTab('compras');
      }
    }
  }, [currentUser, activeTab, hasModuleAccess, setActiveTab]);

  // PUERTA DE AUTENTICACIÓN: Si el usuario no está autenticado, muestra el Panel de Logueo
  if (!currentUser) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className={`flex h-screen w-full ${themeConfig.appBackground} text-slate-800 font-sans overflow-hidden`}>
      
      {/* Barra Lateral Izquierda */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Área Principal de Contenido */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Cabecera Superior */}
        <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Contenedor con Scroll de Vistas */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 ${themeConfig.appBackground}`}>
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && (
              hasModuleAccess('dashboard') ? <DashboardView /> : (
                <AdminAccessGate 
                  moduleTitle="Panel Principal de Disponibilidad y Compras" 
                  moduleDescription="Métricas consolidadas, semáforos de disponibilidad y monitoreo de eventos" 
                />
              )
            )}

            {activeTab === 'compras' && (
              hasModuleAccess('compras') ? <PurchasesView /> : (
                <AdminAccessGate 
                  moduleTitle="Compras y Eventos Tecnológicos" 
                  moduleDescription="Gestión y seguimiento de expedientes F56-e, eventos NOG y actas GIT" 
                />
              )
            )}

            {activeTab === 'presupuesto' && (
              hasModuleAccess('presupuesto') ? <BudgetView /> : (
                <AdminAccessGate 
                  moduleTitle="Presupuesto IT y Disponibilidad" 
                  moduleDescription="Matriz de disponibilidad oficial (12 cols), modificaciones y catálogo de 39 renglones" 
                />
              )
            )}

            {activeTab === 'reportes' && (
              hasModuleAccess('reportes') ? <ReportsView /> : (
                <AdminAccessGate 
                  moduleTitle="Reportes Oficiales & Dictámenes" 
                  moduleDescription="Generación de dictámenes oficiales en PDF y reportes analíticos" 
                />
              )
            )}
            
            {/* Control & Auditoría */}
            {activeTab === 'auditoria' && (
              hasModuleAccess('auditoria') ? (
                <AuditLogView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Registro y Bitácora de Auditoría" 
                  moduleDescription="Supervisión institucional y bitácora inmutable de eventos del sistema" 
                  requiredRolesText="Acceso Exclusivo para Perfiles con Permiso de Auditoría"
                />
              )
            )}

            {/* PANELES DE ADMINISTRACIÓN Y CONTROL DE ACCESO (RBAC) */}
            {activeTab === 'catalogos' && (
              hasModuleAccess('catalogos') ? (
                <CatalogsView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Mantenimiento y Catálogos" 
                  moduleDescription="Mantenimiento de tablas maestras, categorías tecnológicas y modalidades de compra" 
                />
              )
            )}

            {activeTab === 'usuarios' && (
              hasModuleAccess('usuarios') ? (
                <UsersView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Gestión de Usuarios" 
                  moduleDescription="Control de cuentas institucionales y credenciales del personal" 
                />
              )
            )}

            {activeTab === 'perfiles' && (
              hasModuleAccess('perfiles') ? (
                <ProfilesView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Perfiles de Usuario y Permisos (RBAC)" 
                  moduleDescription="Definición de roles institucionales y privilegios de acceso a los módulos del sistema" 
                />
              )
            )}

            {activeTab === 'personalizacion' && (
              hasModuleAccess('personalizacion') ? (
                <CustomizationView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Personalización & Temas" 
                  moduleDescription="Configuración de logotipos heráldicos y paletas cromáticas institucionales" 
                />
              )
            )}

            {activeTab === 'correo' && (
              hasModuleAccess('correo') ? (
                <EmailConfigView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Configuración de Correo Electrónico" 
                  moduleDescription="Parámetros de conexión Gmail SMTP, alertas para autoridades y notificaciones" 
                />
              )
            )}
          </div>
        </main>

        {/* Pie de Página Institucional (Professional Polish) */}
        <footer className="py-2 min-h-8 bg-slate-200 border-t border-slate-300 px-6 flex flex-wrap items-center justify-between text-[11px] font-medium text-slate-600 flex-shrink-0 print:hidden gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-slate-700">© 2026 Organismo Judicial de Guatemala - Gerencia de Informática</span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-800">
              Creador del Sistema: <strong className="text-blue-900 font-bold">Lic. Kevin Gerardo López de León</strong>
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
              Sesión Verificada
            </span>
            <span>v1.0.5-OJ-SEC</span>
          </div>
        </footer>

      </div>

      {/* Modales del Sistema */}
      <LoginModal />
      <PurchaseFormModal />
      <PurchaseDetailModal />
      <ChangePasswordModal />
      <ImportExcelModal />

      {/* Notificaciones Flotantes (Toasts) */}
      <ToastContainer />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
