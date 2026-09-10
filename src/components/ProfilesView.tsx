import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Shield, 
  ShieldCheck, 
  Key, 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Lock, 
  CheckCircle2, 
  Search, 
  Sliders, 
  LayoutDashboard, 
  ShoppingBag, 
  DollarSign, 
  FileText, 
  Database, 
  Palette, 
  Mail,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { UserProfile, ActiveTab } from '../types';

export const SYSTEM_MODULES: { id: ActiveTab; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
  { 
    id: 'dashboard', 
    label: 'Panel Principal', 
    desc: 'Visión ejecutiva, semáforos de disponibilidad y métricas generales', 
    icon: LayoutDashboard 
  },
  { 
    id: 'compras', 
    label: 'Compras y Eventos', 
    desc: 'Gestión y seguimiento de expedientes F56-e, eventos NOG y actas GIT', 
    icon: ShoppingBag 
  },
  { 
    id: 'presupuesto', 
    label: 'Presupuesto IT', 
    desc: 'Matriz de disponibilidad oficial (12 cols), modificaciones y catálogo de 39 renglones', 
    icon: DollarSign 
  },
  { 
    id: 'reportes', 
    label: 'Reportes y Dictámenes', 
    desc: 'Exportación a PDF oficial, resoluciones de disponibilidad y constancias', 
    icon: FileText 
  },
  { 
    id: 'auditoria', 
    label: 'Registro de Auditoría', 
    desc: 'Bitácora inmutable de eventos, modificaciones y trazabilidad de acciones', 
    icon: ShieldCheck 
  },
  { 
    id: 'usuarios', 
    label: 'Gestión de Usuarios', 
    desc: 'Cuentas de usuario institucionales, credenciales y restablecimiento de claves', 
    icon: Users 
  },
  { 
    id: 'perfiles', 
    label: 'Perfiles y Permisos (RBAC)', 
    desc: 'Administración de roles, privilegios y control de acceso a módulos', 
    icon: Key 
  },
  { 
    id: 'catalogos', 
    label: 'Catálogos del Sistema', 
    desc: 'Tablas maestras, categorías informáticas y modalidades de adquisición', 
    icon: Database 
  },
  { 
    id: 'personalizacion', 
    label: 'Personalización & Temas', 
    desc: 'Configuración visual, logotipos heráldicos y paletas cromáticas', 
    icon: Palette 
  },
  { 
    id: 'correo', 
    label: 'Notificaciones Gmail', 
    desc: 'Servicio de notificaciones automáticas y alertas por correo electrónico', 
    icon: Mail 
  }
];

const PRESET_COLORS = [
  { id: 'blue', label: 'Azul Institucional', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-600' },
  { id: 'emerald', label: 'Verde Esmeralda', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-600' },
  { id: 'amber', label: 'Ámbar / Oro', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-600' },
  { id: 'purple', label: 'Púrpura / Violeta', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-600' },
  { id: 'rose', label: 'Rojo Carmesí', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-600' },
  { id: 'indigo', label: 'Índigo Profundo', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-600' },
  { id: 'slate', label: 'Gris Acero', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-600' }
];

export const ProfilesView: React.FC = () => {
  const { 
    userProfiles, 
    addUserProfile, 
    updateUserProfile, 
    deleteUserProfile, 
    users, 
    currentUser,
    setActiveTab,
    themeConfig 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState<'tarjetas' | 'matriz'>('tarjetas');
  
  // Modal de Crear / Editar Perfil
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('blue');
  const [modulosPermitidos, setModulosPermitidos] = useState<ActiveTab[]>(['dashboard', 'compras', 'reportes']);
  const [formError, setFormError] = useState('');

  const isAdmin = currentUser?.rol === 'administrador';

  // Filtrado de perfiles
  const filteredProfiles = useMemo(() => {
    return userProfiles.filter(p => {
      const matchSearch = searchTerm === '' ||
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [userProfiles, searchTerm]);

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setNombre('');
    setCodigo('');
    setDescripcion('');
    setColor('blue');
    setModulosPermitidos(['dashboard', 'compras', 'reportes']);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (profile: UserProfile) => {
    setEditingProfile(profile);
    setNombre(profile.nombre);
    setCodigo(profile.codigo);
    setDescripcion(profile.descripcion);
    setColor(profile.color || 'blue');
    setModulosPermitidos([...profile.modulosPermitidos]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggleModule = (modId: ActiveTab) => {
    // Si es perfil administrador del sistema, no permitir desmarcar
    if (editingProfile?.esSistema && editingProfile.codigo === 'administrador') {
      return;
    }

    setModulosPermitidos(prev => {
      if (prev.includes(modId)) {
        // Asegurar que siempre tenga al menos el dashboard
        if (prev.length === 1 && prev[0] === modId) {
          return prev;
        }
        return prev.filter(m => m !== modId);
      } else {
        return [...prev, modId];
      }
    });
  };

  const handleSelectAllModules = () => {
    setModulosPermitidos(SYSTEM_MODULES.map(m => m.id));
  };

  const handleSelectReadOnlyModules = () => {
    setModulosPermitidos(['dashboard', 'compras', 'presupuesto', 'reportes']);
  };

  const handleClearNonEssentialModules = () => {
    setModulosPermitidos(['dashboard']);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setFormError('El nombre del perfil es obligatorio.');
      return;
    }

    const cleanCodigo = (codigo.trim() || nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')).replace(/_+/g, '_');

    if (modulosPermitidos.length === 0) {
      setFormError('Debe autorizar al menos un módulo del sistema (ej. Panel Principal).');
      return;
    }

    if (editingProfile) {
      updateUserProfile(editingProfile.id, {
        nombre: nombre.trim(),
        codigo: editingProfile.esSistema ? editingProfile.codigo : cleanCodigo,
        descripcion: descripcion.trim(),
        color,
        modulosPermitidos,
        modificadoPor: currentUser?.username,
        fechaModificacion: new Date().toISOString()
      });
    } else {
      // Verificar unicidad de código
      const exists = userProfiles.some(p => p.codigo.toLowerCase() === cleanCodigo.toLowerCase());
      if (exists) {
        setFormError(`Ya existe un perfil con el código identificador "${cleanCodigo}". Elija otro.`);
        return;
      }

      addUserProfile({
        nombre: nombre.trim(),
        codigo: cleanCodigo,
        descripcion: descripcion.trim() || `Perfil para operadores con acceso a ${modulosPermitidos.length} módulos institucionales.`,
        color,
        modulosPermitidos,
        activo: true,
        creadoPor: currentUser?.username
      });
    }

    setIsModalOpen(false);
  };

  const getColorConfig = (colorId?: string) => {
    return PRESET_COLORS.find(c => c.id === colorId) || PRESET_COLORS[0];
  };

  const getUsersCountForProfile = (profile: UserProfile) => {
    return users.filter(u => u.perfilId === profile.id || u.rol === profile.codigo).length;
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado Principal del Módulo de Perfiles */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900">
                Perfiles de Usuario y Control de Acceso (RBAC)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                {userProfiles.length} perfiles activos
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cree roles institucionales personalizados y asigne permisos detallados a los 10 módulos de Compras y Presupuesto IT del OJ.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón para alternar a Usuarios */}
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Ver Cuentas de Usuarios ({users.length})</span>
          </button>

          {/* Botón Crear Perfil */}
          {isAdmin && (
            <button
              id="btn-create-user-profile"
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Perfil de Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Herramientas y Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código o descripción de perfil..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 hidden sm:inline">Modo de Vista:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSelectedView('tarjetas')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                selectedView === 'tarjetas' 
                  ? 'bg-white text-blue-900 shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tarjetas Detalladas
            </button>
            <button
              type="button"
              onClick={() => setSelectedView('matriz')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                selectedView === 'matriz' 
                  ? 'bg-white text-blue-900 shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriz de Permisos
            </button>
          </div>
        </div>
      </div>

      {/* VISTA 1: TARJETAS DE PERFILES */}
      {selectedView === 'tarjetas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProfiles.map((profile) => {
            const colorCfg = getColorConfig(profile.color);
            const userCount = getUsersCountForProfile(profile);

            return (
              <div 
                key={profile.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Cabecera de la Tarjeta */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3.5 h-3.5 rounded-full ${colorCfg.dot} ring-4 ring-slate-100`} />
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          {profile.nombre}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400">
                          ID: {profile.codigo}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {profile.esSistema ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1" title="Perfil protegido del sistema">
                          <Lock className="w-2.5 h-2.5" />
                          Sistema
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Personalizado
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {profile.descripcion}
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">
                      {userCount} {userCount === 1 ? 'usuario asignado' : 'usuarios asignados'}
                    </span>
                  </div>

                  {/* Lista de Módulos Autorizados */}
                  <div className="space-y-1.5 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Módulos con Acceso ({profile.modulosPermitidos.length} de {SYSTEM_MODULES.length})</span>
                      <span className="text-[9px] font-mono text-blue-700 font-bold">
                        {Math.round((profile.modulosPermitidos.length / SYSTEM_MODULES.length) * 100)}%
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                      {SYSTEM_MODULES.map((mod) => {
                        const hasAccess = profile.modulosPermitidos.includes(mod.id);
                        const ModIcon = mod.icon;
                        if (!hasAccess) return null;
                        return (
                          <span 
                            key={mod.id} 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700"
                            title={mod.desc}
                          >
                            <ModIcon className="w-3 h-3 text-blue-600" />
                            <span>{mod.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Pie de Acciones de la Tarjeta */}
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {profile.esSistema ? 'Perfil Base Protegido' : 'Editable por Admin'}
                  </span>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(profile)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Modificar permisos y datos de este perfil"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      {!profile.esSistema && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Confirma eliminar el perfil de usuario "${profile.nombre}"?`)) {
                              deleteUserProfile(profile.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-all cursor-pointer"
                          title="Eliminar perfil personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 2: MATRIZ DE PERMISOS CRUZADA (PERFIL VS MÓDULO) */}
      {selectedView === 'matriz' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Matriz Institucional de Control de Acceso por Módulo
              </h3>
              <p className="text-[11px] text-slate-500">
                Visualice en una sola tabla comparativa qué módulos del sistema están autorizados para cada perfil.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 font-bold">
              {filteredProfiles.length} perfiles • {SYSTEM_MODULES.length} módulos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[200px]">Perfil de Usuario</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">Usuarios</th>
                  {SYSTEM_MODULES.map(mod => (
                    <th key={mod.id} className="px-3 py-3 text-center whitespace-nowrap" title={mod.desc}>
                      {mod.label}
                    </th>
                  ))}
                  {isAdmin && <th className="px-3 py-3 text-center whitespace-nowrap">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProfiles.map(profile => {
                  const userCount = getUsersCountForProfile(profile);
                  const colorCfg = getColorConfig(profile.color);

                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${colorCfg.dot}`} />
                          <div>
                            <span className="block font-bold">{profile.nombre}</span>
                            <span className="block text-[10px] font-mono text-slate-400 font-normal">
                              {profile.codigo} {profile.esSistema ? '• Base' : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px]">
                          {userCount}
                        </span>
                      </td>

                      {SYSTEM_MODULES.map(mod => {
                        const hasAccess = profile.modulosPermitidos.includes(mod.id);
                        return (
                          <td key={mod.id} className="px-3 py-3 text-center">
                            {hasAccess ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800" title={`Permitido: ${mod.label}`}>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300" title={`Bloqueado: ${mod.label}`}>
                                <X className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {isAdmin && (
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(profile)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-all cursor-pointer"
                            title="Editar permisos de este perfil"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR PERFIL DE USUARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingProfile ? `Editar Perfil: ${editingProfile.nombre}` : 'Nuevo Perfil de Usuario Institucional'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Defina el identificador del perfil y seleccione los módulos con acceso permitido.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre del Perfil */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre del Perfil *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Gestor de Adquisiciones IT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Código Identificador */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código Identificador (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingProfile?.esSistema}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="ej: gestor_adquisiciones"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción y Atribuciones del Rol
                </label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalle el alcance de las responsabilidades asignadas a este perfil en la Gerencia de Informática..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Selector de Color Identificador */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Color Identificador de Etiqueta
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`px-3 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        color === c.id 
                          ? `${c.bg} ${c.text} ${c.border} ring-2 ring-blue-400 font-bold` 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Asignación de Módulos Permitidos */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-black text-slate-900 text-xs block">
                      Permisos y Accesos a Módulos del Sistema *
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Marque las casillas correspondientes a los módulos a los que los usuarios de este perfil tendrán acceso.
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectReadOnlyModules}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                    >
                      Operativo
                    </button>
                    <button
                      type="button"
                      onClick={handleClearNonEssentialModules}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                    >
                      Solo Inicio
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-200">
                  {SYSTEM_MODULES.map((mod) => {
                    const isSelected = modulosPermitidos.includes(mod.id);
                    const ModIcon = mod.icon;
                    const isSuperAdminLocked = editingProfile?.esSistema && editingProfile.codigo === 'administrador';

                    return (
                      <label 
                        key={mod.id} 
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected 
                            ? 'bg-blue-50/80 border-blue-300 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isSuperAdminLocked}
                          onChange={() => handleToggleModule(mod.id)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                            <ModIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-700' : 'text-slate-400'}`} />
                            <span className="truncate">{mod.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug line-clamp-1 mt-0.5">
                            {mod.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Botones del Modal */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingProfile ? 'Guardar Cambios del Perfil' : 'Crear Perfil Institucional'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
