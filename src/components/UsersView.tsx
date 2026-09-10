import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  X,
  ShieldAlert,
  Mail,
  Key,
  ShieldCheck
} from 'lucide-react';
import { User, UserRole } from '../types';
import { formatDateTime } from '../utils/formatters';

export const UsersView: React.FC = () => {
  const { 
    users, 
    addUser, 
    updateUser, 
    toggleUserStatus, 
    deleteUser, 
    userProfiles,
    getUserProfile,
    setActiveTab,
    currentUser,
    themeConfig,
    sendUserWelcomeEmail,
    showToast
  } = useApp();

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Guate2026*');
  const [rol, setRol] = useState<UserRole>('usuario_estandar');
  const [perfilId, setPerfilId] = useState<string>('');
  const [cargo, setCargo] = useState('');
  const [departamento, setDepartamento] = useState('Gerencia de Informática - OJ');
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingEmailUserId, setResendingEmailUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const canManage = currentUser?.rol === 'administrador';

  const handleOpenCreate = () => {
    setUsername('');
    setNombreCompleto('');
    setEmail('');
    setPassword('Guate2026*');
    const defaultProf = userProfiles.find(p => p.codigo === 'usuario_estandar') || userProfiles[0];
    setRol(defaultProf ? (defaultProf.codigo as UserRole) : 'usuario_estandar');
    setPerfilId(defaultProf ? defaultProf.id : '');
    setCargo('');
    setDepartamento('Gerencia de Informática - OJ');
    setNotifyByEmail(true);
    setIsSubmitting(false);
    setErrorMsg('');
    setIsNewUserModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setNombreCompleto(user.nombreCompleto);
    setEmail(user.email);
    setPassword('');
    setRol(user.rol);
    setPerfilId(user.perfilId || '');
    setCargo(user.cargo);
    setDepartamento(user.departamento);
    setIsSubmitting(false);
    setErrorMsg('');
  };

  const handleResendEmail = async (user: User) => {
    if (!user.email) {
      showToast({
        type: 'warning',
        title: 'Sin Correo Institucional',
        message: `El usuario @${user.username} no tiene configurado un correo electrónico.`
      });
      return;
    }

    setResendingEmailUserId(user.id);
    try {
      const res = await sendUserWelcomeEmail(user, user.password || 'Guate2026*');
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Credenciales Enviadas por Correo',
          message: `Se enviaron las credenciales de acceso a ${user.email} con el enlace y las instrucciones de seguridad.`,
          duration: 5000
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Aviso al Enviar Correo',
          message: res.message || 'No se pudo enviar el correo de credenciales.',
          duration: 7000
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error de Envío',
        message: err?.message || 'Ocurrió un error inesperado al enviar el correo.'
      });
    } finally {
      setResendingEmailUserId(null);
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !nombreCompleto.trim() || !email.trim()) {
      setErrorMsg('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, {
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim(),
        rol,
        perfilId: perfilId || undefined,
        cargo: cargo.trim(),
        departamento: departamento.trim(),
        password: password.trim() ? password.trim() : editingUser.password,
      });
      showToast({
        type: 'success',
        title: 'Usuario Actualizado',
        message: `Los datos del usuario @${editingUser.username} fueron actualizados correctamente.`
      });
      setEditingUser(null);
    } else {
      if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
        setErrorMsg('El nombre de usuario ya existe en el sistema.');
        return;
      }

      const assignedPassword = password.trim() || 'Guate2026*';
      setIsSubmitting(true);

      const newUser = addUser({
        username: username.trim().toLowerCase(),
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim(),
        password: assignedPassword,
        rol,
        perfilId: perfilId || undefined,
        cargo: cargo.trim() || 'Funcionario OJ',
        departamento: departamento.trim(),
        activo: true,
      });

      if (notifyByEmail) {
        try {
          const emailRes = await sendUserWelcomeEmail(newUser, assignedPassword);
          if (emailRes.success) {
            showToast({
              type: 'success',
              title: 'Usuario Creado y Notificado',
              message: `El usuario @${newUser.username} fue registrado exitosamente y se despacharon sus credenciales de acceso a ${newUser.email}.`,
              duration: 6000
            });
          } else {
            showToast({
              type: 'warning',
              title: 'Usuario Creado (Aviso de Envío)',
              message: `Usuario registrado. Sin embargo: ${emailRes.message}. Las credenciales son: Usuario: ${newUser.username} / Contraseña temporal: ${assignedPassword}`,
              duration: 9000
            });
          }
        } catch (err: any) {
          showToast({
            type: 'warning',
            title: 'Usuario Creado',
            message: `Usuario registrado con contraseña temporal: ${assignedPassword}. Falló el envío de correo: ${err?.message}`,
            duration: 8000
          });
        }
      } else {
        showToast({
          type: 'success',
          title: 'Usuario Creado Exitosamente',
          message: `El usuario @${newUser.username} fue registrado con contraseña temporal: ${assignedPassword}.`,
          duration: 5000
        });
      }

      setIsSubmitting(false);
      setIsNewUserModalOpen(false);
    }
  };

  const getRoleBadge = (u: User) => {
    const profile = getUserProfile(u);
    if (profile) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200"
          title={`${profile.modulosPermitidos.length} módulos autorizados: ${profile.modulosPermitidos.join(', ')}`}
        >
          <Key className="w-2.5 h-2.5 text-blue-600" />
          <span>{profile.nombre}</span>
        </span>
      );
    }
    switch (u.rol) {
      case 'administrador':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">ADMINISTRADOR</span>;
      case 'auditor':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">AUDITOR</span>;
      case 'usuario_estandar':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">ESTÁNDAR</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo de Usuarios (Professional Polish) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Administración de Usuarios y Perfiles Institucionales
          </h2>
          <p className="text-xs text-slate-500">
            Control de cuentas, asignación de perfiles RBAC y control de acceso a los módulos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón para administrar perfiles */}
          <button
            type="button"
            onClick={() => setActiveTab('perfiles')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
          >
            <Key className="w-3.5 h-3.5 text-blue-700" />
            <span>Configurar Perfiles ({userProfiles.length})</span>
          </button>

          {canManage ? (
            <button
              id="btn-create-user"
              type="button"
              onClick={handleOpenCreate}
              className={`px-3.5 py-2 rounded-xl ${themeConfig.primaryBtn} text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer`}
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Usuario</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Solo administradores pueden crear o modificar cuentas</span>
            </div>
          )}
        </div>
      </div>

      {/* Matriz Explicativa de Perfiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
              A
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase">Perfil Administrador</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Control total: Registrar, modificar y eliminar adquisiciones, gestionar usuarios y editar catálogos del sistema.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
              AU
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase">Perfil Auditor</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Supervisión y fiscalización: Consulta de adquisiciones, métricas presupuestarias, bitácora de auditoría y exportaciones.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
              U
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase">Usuario Estándar</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Operativo: Registro y edición de requerimientos de compras de la Gerencia de Informática y consulta de dashboard.
          </p>
        </div>
      </div>

      {/* Tabla de Usuarios Registrados */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Nombre Completo</th>
                <th className="px-3 py-3">Correo Institucional</th>
                <th className="px-3 py-3 text-center">Perfil / Rol</th>
                <th className="px-3 py-3">Cargo & Dependencia</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3">Último Acceso</th>
                {canManage && <th className="px-4 py-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  
                  {/* Usuario */}
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    @{u.username}
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {u.nombreCompleto}
                  </td>

                  {/* Email */}
                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                    {u.email}
                  </td>

                  {/* Rol */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {getRoleBadge(u)}
                  </td>

                  {/* Cargo */}
                  <td className="px-3 py-3 text-slate-600 text-[11px]">
                    <span className="font-medium text-slate-800 block">{u.cargo}</span>
                    <span className="text-slate-400 block">{u.departamento}</span>
                  </td>

                  {/* Estado */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(u.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          u.activo ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {u.activo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{u.activo ? 'Activo' : 'Inactivo'}</span>
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    )}
                  </td>

                  {/* Último Acceso */}
                  <td className="px-3 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {formatDateTime(u.ultimoAcceso)}
                  </td>

                  {/* Acciones */}
                  {canManage && (
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleResendEmail(u)}
                          disabled={resendingEmailUserId === u.id}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Enviar credenciales de acceso por correo"
                        >
                          {resendingEmailUserId === u.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar Usuario"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Cuenta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Usuario */}
      {(isNewUserModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUser ? 'Modificar Usuario Institucional' : 'Registrar Nuevo Usuario'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsNewUserModalOpen(false); setEditingUser(null); }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de Usuario *</label>
                <input
                  type="text"
                  disabled={!!editingUser}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. jgomez"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="ej. Lic. Juan Carlos Gómez"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Electrónico OJ *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. jgomez@oj.gob.gt"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil Institucional / Rol *</label>
                  <select
                    value={perfilId || rol}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selectedProf = userProfiles.find(p => p.id === val || p.codigo === val);
                      if (selectedProf) {
                        setPerfilId(selectedProf.id);
                        setRol(selectedProf.codigo as UserRole);
                      } else {
                        setRol(val as UserRole);
                        setPerfilId('');
                      }
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500"
                  >
                    {userProfiles.length > 0 ? (
                      userProfiles.map(prof => (
                        <option key={prof.id} value={prof.id}>
                          {prof.nombre} ({prof.modulosPermitidos.length} módulos)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="usuario_estandar">Usuario Estándar</option>
                        <option value="auditor">Auditor</option>
                        <option value="administrador">Administrador</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingUser ? 'Nueva Contraseña' : 'Contraseña *'}
                  </label>
                  <input
                    type={editingUser ? "password" : "text"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? 'Mantener actual' : 'Guate2026*'}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono text-xs"
                    required={!editingUser}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cargo Institucional</label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="ej. Analista de Sistemas / Informática"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Departamento / Dependencia</label>
                <input
                  type="text"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="ej. Gerencia de Informática - OJ"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsNewUserModalOpen(false); setEditingUser(null); }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
