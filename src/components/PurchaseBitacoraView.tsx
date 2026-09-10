import React, { useState, useMemo } from 'react';
import { 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  ShieldCheck, 
  PlusCircle, 
  Search, 
  Filter, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  History, 
  Printer, 
  Copy, 
  Send
} from 'lucide-react';
import { PurchaseRecord, PurchaseChangeLogEntry } from '../types';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/formatters';

interface PurchaseBitacoraViewProps {
  purchase: PurchaseRecord;
  canEdit?: boolean;
}

export const PurchaseBitacoraView: React.FC<PurchaseBitacoraViewProps> = ({
  purchase,
  canEdit = true
}) => {
  const { currentUser, addPurchaseBitacoraEntry, updatePurchase, catalogs, showToast, auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('TODOS');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteStatus, setNewNoteStatus] = useState(purchase.estatusEvento || 'Registrada');

  // Catálogo de estatus disponibles
  const statusCatalog = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO');
  const catalogStatusOptions = statusCatalog?.items
    ?.filter(it => it.activo)
    ?.map(it => it.valor) || [
      'Registrada', 
      'En Proceso', 
      'Publicada', 
      'Recepción de Ofertas', 
      'Evaluación', 
      'Adjudicación', 
      'Pagada', 
      'Desierto', 
      'Prescindido', 
      'Anulada', 
      'Rechazada'
    ];

  // Consolidar registros de bitácora
  const entries: PurchaseChangeLogEntry[] = useMemo(() => {
    const list: PurchaseChangeLogEntry[] = purchase.bitacoraCambios ? [...purchase.bitacoraCambios] : [];

    // Si la lista está vacía o solo tiene 1 elemento, complementar con auditLogs que hagan referencia a este registro
    const relatedAudit = auditLogs.filter(a => a.registroId === purchase.id || a.detalles.includes(purchase.nog || ''));
    relatedAudit.forEach(a => {
      const alreadyExists = list.some(e => e.fechaHora === a.fecha || e.detalles === a.detalles);
      if (!alreadyExists) {
        list.push({
          id: `aud-sync-${a.id}`,
          fechaHora: a.fecha,
          usuario: a.usuario,
          rol: a.rol,
          accion: a.accion,
          estatus: purchase.estatusEvento || 'Registrada',
          detalles: a.detalles,
          ip: a.ip || '10.150.2.45'
        });
      }
    });

    // Si aún no tiene ningún registro, incluir la creación de la ficha
    if (list.length === 0) {
      list.push({
        id: `bit-init-${purchase.id}`,
        fechaHora: purchase.fechaCreacion || new Date().toISOString(),
        usuario: purchase.creadoPor || 'Administrador GIT',
        rol: 'administrador',
        accion: 'CREACION',
        estatus: purchase.estatusEvento || 'Registrada',
        detalles: `Registro inicial de solicitud F56: ${purchase.f56e || purchase.f56 || 'Sin F56'} | NOG: ${purchase.nog || 'Sin NOG'} | Monto: Q. ${Number(purchase.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}. Renglón presupuestario: [${purchase.renglonPresupuestario || '158'}].`,
        ip: '10.150.2.45'
      });
    }

    // Ordenar cronológicamente descendente (el cambio más reciente arriba)
    return list.sort((a, b) => (b.fechaHora || '').localeCompare(a.fechaHora || ''));
  }, [purchase, auditLogs]);

  // Filtrado
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const matchSearch = searchTerm === '' || 
        item.detalles.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.estatus.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.accion.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchAction = filterAction === 'TODOS' || item.accion === filterAction;

      return matchSearch && matchAction;
    });
  }, [entries, searchTerm, filterAction]);

  const handleSaveManualNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) {
      showToast({
        title: 'Campo Requerido',
        message: 'Por favor ingrese el detalle o motivo de la anotación.',
        type: 'advertencia'
      });
      return;
    }

    const hasStatusChange = newNoteStatus !== purchase.estatusEvento;

    if (hasStatusChange && canEdit) {
      // Actualizar también la compra con el nuevo estatus
      updatePurchase(purchase.id, {
        estatusEvento: newNoteStatus
      });
    }

    addPurchaseBitacoraEntry(purchase.id, {
      accion: hasStatusChange ? 'CAMBIO_ESTATUS' : 'NOTA_SEGUIMIENTO',
      estatus: newNoteStatus,
      detalles: hasStatusChange 
        ? `Cambio de estatus a "${newNoteStatus}". Justificación: ${newNoteText.trim()}`
        : newNoteText.trim()
    });

    setNewNoteText('');
    setShowAddNote(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBitacora = () => {
    const text = entries.map(e => 
      `[${formatDateTime(e.fechaHora)}] Usuario: ${e.usuario} | Estatus: ${e.estatus} | Acción: ${e.accion}\nDetalle: ${e.detalles}\n`
    ).join('\n---\n\n');

    navigator.clipboard.writeText(text);
    showToast({
      title: 'Bitácora Copiada',
      message: 'El texto de la bitácora se ha copiado al portapapeles.',
      type: 'exito'
    });
  };

  const getActionBadgeColor = (accion: string) => {
    switch (accion) {
      case 'CREACION':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'CAMBIO_ESTATUS':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ASIGNACION_RENGLON':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'PAGO_DEVENGADO':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'REVERSION_PAGO':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'NOTA_SEGUIMIENTO':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (estatus: string) => {
    const clean = (estatus || '').toLowerCase();
    if (clean.includes('pagad') || clean.includes('adjudic')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (clean.includes('anul') || clean.includes('rechaz') || clean.includes('desiert')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (clean.includes('evalua') || clean.includes('ofert') || clean.includes('proceso')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div id="purchase-bitacora-module" className="space-y-4">
      {/* Cabecera de la Bitácora */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs">
              <History className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Bitácora de Cambios y Trazabilidad de la Ficha
              </h3>
              <p className="text-[11px] text-slate-500">
                Registro histórico inmutable de modificaciones, usuarios responsables, fecha, hora y estatus institucional.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleCopyBitacora}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Copiar texto de la bitácora"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Copiar</span>
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Imprimir bitácora oficial"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAddNote(!showAddNote)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-white" />
              <span>{showAddNote ? 'Cancelar Registro' : 'Nueva Entrada'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulario para Agregar Entrada Manual / Actualizar Estatus */}
      {showAddNote && (
        <form onSubmit={handleSaveManualNote} className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              Registrar Nota Oficial en Bitácora
            </span>
            <span className="text-[11px] text-blue-700">
              Usuario: <strong>{currentUser?.nombreCompleto || 'Usuario del Sistema'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Estatus Asociado
              </label>
              <select
                value={newNoteStatus}
                onChange={(e) => setNewNoteStatus(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {catalogStatusOptions.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Detalle del Cambio, Nota o Justificación
              </label>
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Ej: Aprobación técnica recibida, expediente trasladado a DAF, etc."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddNote(false)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>Guardar en Bitácora</span>
            </button>
          </div>
        </form>
      )}

      {/* Barra de Filtro y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por usuario, estatus o detalle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todas las Acciones</option>
            <option value="CREACION">Creación</option>
            <option value="CAMBIO_ESTATUS">Cambio de Estatus</option>
            <option value="ASIGNACION_RENGLON">Asignación Renglón</option>
            <option value="PAGO_DEVENGADO">Pago Registrado</option>
            <option value="EDICION">Edición General</option>
            <option value="NOTA_SEGUIMIENTO">Notas de Seguimiento</option>
          </select>
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
      </div>

      {/* Lista de Registros de la Bitácora */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="px-3.5 py-2.5">Fecha y Hora</th>
                <th className="px-3.5 py-2.5">Usuario Responsable</th>
                <th className="px-3 py-2.5 text-center">Estatus Ficha</th>
                <th className="px-3 py-2.5 text-center">Tipo de Acción</th>
                <th className="px-4 py-2.5 min-w-[260px]">Detalle de Modificaciones / Anotación</th>
                <th className="px-3 py-2.5 text-right">IP / Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No se encontraron registros en la bitácora con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => (
                  <tr key={entry.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* Fecha y Hora */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-800 font-mono font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateTime(entry.fechaHora)}</span>
                      </div>
                    </td>

                    {/* Usuario Responsable */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {entry.usuario.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate max-w-[180px]">
                            {entry.usuario}
                          </span>
                          {entry.rol && (
                            <span className="text-[10px] text-slate-400 block capitalize">
                              {entry.rol.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Estatus */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(entry.estatus)}`}>
                        {entry.estatus || 'Registrada'}
                      </span>
                    </td>

                    {/* Acción */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getActionBadgeColor(entry.accion)}`}>
                        {entry.accion.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Detalle */}
                    <td className="px-4 py-3 text-slate-700 font-medium text-xs leading-relaxed">
                      {entry.detalles}
                    </td>

                    {/* IP / Origen */}
                    <td className="px-3 py-3 text-right whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {entry.ip || '10.150.2.45'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
