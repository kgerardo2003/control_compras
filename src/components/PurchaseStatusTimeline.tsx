import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Award, 
  Ban, 
  Save, 
  User, 
  Calendar, 
  FileText,
  AlertCircle,
  History,
  ArrowRight,
  Sparkles,
  Building2,
  Tag
} from 'lucide-react';
import { PurchaseRecord, StatusTimelineEvent } from '../types';
import { formatDate, formatDateTime, formatQuetzales } from '../utils/formatters';
import { useApp } from '../context/AppContext';

interface PurchaseStatusTimelineProps {
  purchase: PurchaseRecord;
  onUpdatePurchase?: (updated: Partial<PurchaseRecord>) => void;
  canEdit?: boolean;
}

export const PurchaseStatusTimeline: React.FC<PurchaseStatusTimelineProps> = ({
  purchase,
  canEdit = true
}) => {
  const { updatePurchase, showToast, currentUser, catalogs } = useApp();

  // Catálogo de estatus disponibles
  const statusCatalog = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO');
  const catalogStatusOptions = statusCatalog?.items
    ?.filter(it => it.activo)
    ?.map(it => it.valor) || ['Evaluación', 'Adjudicación', 'Desierto', 'Prescindido'];

  // Estados del formulario para cambio de estatus
  const [selectedStatus, setSelectedStatus] = useState<string>(purchase.estatusEvento || 'Evaluación');
  const [proveedor, setProveedor] = useState(purchase.proveedorAdjudicado || '');
  const [fechaAdj, setFechaAdj] = useState(purchase.fechaAdjudicacion || new Date().toISOString().slice(0, 10));
  const [montoAdj, setMontoAdj] = useState<number | string>(purchase.monto || '');
  const [nota, setNota] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar campos cuando la adquisición seleccionada cambie
  useEffect(() => {
    setSelectedStatus(purchase.estatusEvento || 'Evaluación');
    setProveedor(purchase.proveedorAdjudicado || '');
    setFechaAdj(purchase.fechaAdjudicacion || new Date().toISOString().slice(0, 10));
    setMontoAdj(purchase.monto || '');
    setNota('');
  }, [purchase.id, purchase.estatusEvento, purchase.proveedorAdjudicado, purchase.fechaAdjudicacion, purchase.monto]);

  // Configuración visual según el estatus
  const getStatusVisuals = (status?: string) => {
    switch (status) {
      case 'Adjudicación':
        return {
          icon: <Award className="w-5 h-5 text-emerald-600" />,
          smallIcon: <Award className="w-3.5 h-3.5 text-emerald-600" />,
          badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dotColor: 'bg-emerald-500',
          containerClass: 'bg-emerald-50/80 border-emerald-200',
          lineColor: 'border-emerald-300',
          nodeBg: 'bg-emerald-50 border-emerald-500 text-emerald-700',
          description: 'El proceso fue resuelto y se adjudicó formalmente al proveedor seleccionado.'
        };
      case 'Evaluación':
        return {
          icon: <Clock className="w-5 h-5 text-amber-600" />,
          smallIcon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          dotColor: 'bg-amber-500',
          containerClass: 'bg-amber-50/80 border-amber-200',
          lineColor: 'border-amber-300',
          nodeBg: 'bg-amber-50 border-amber-500 text-amber-700',
          description: 'El evento se encuentra en revisión, calificación técnica o análisis de ofertas.'
        };
      case 'Desierto':
        return {
          icon: <Ban className="w-5 h-5 text-slate-600" />,
          smallIcon: <Ban className="w-3.5 h-3.5 text-slate-600" />,
          badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
          dotColor: 'bg-slate-500',
          containerClass: 'bg-slate-50 border-slate-300',
          lineColor: 'border-slate-300',
          nodeBg: 'bg-slate-100 border-slate-500 text-slate-700',
          description: 'El evento fue declarado desierto por falta de postores o incumplimiento de requisitos.'
        };
      case 'Prescindido':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
          smallIcon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
          dotColor: 'bg-rose-500',
          containerClass: 'bg-rose-50/80 border-rose-200',
          lineColor: 'border-rose-300',
          nodeBg: 'bg-rose-50 border-rose-500 text-rose-700',
          description: 'El evento fue prescindido por conveniencia o interés institucional conforme a la ley.'
        };
      default:
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
          smallIcon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
          badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
          dotColor: 'bg-blue-500',
          containerClass: 'bg-blue-50/80 border-blue-200',
          lineColor: 'border-blue-300',
          nodeBg: 'bg-blue-50 border-blue-500 text-blue-700',
          description: `Estatus actual registrado en el sistema: ${status || 'No especificado'}`
        };
    }
  };

  // Preparar lista de eventos de la línea de tiempo
  // Si no hay historial previo, generamos el evento de inicio con el estatus original
  const getTimelineHistory = (): StatusTimelineEvent[] => {
    if (purchase.historialEstatus && purchase.historialEstatus.length > 0) {
      // Ordenar cronológicamente (los más recientes arriba o con timestamp claro)
      return [...purchase.historialEstatus].sort((a, b) => {
        const dateA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : new Date(`${a.fecha}T${a.hora || '00:00:00'}`).getTime();
        const dateB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : new Date(`${b.fecha}T${b.hora || '00:00:00'}`).getTime();
        return dateB - dateA; // Más reciente primero para fácil lectura de auditoría
      });
    }

    // Evento de punto de partida si no existía historial
    const fechaInicio = purchase.fechaCreacion 
      ? purchase.fechaCreacion.slice(0, 10) 
      : (purchase.fechaSolicitud || new Date().toISOString().slice(0, 10));
    
    return [
      {
        id: `initial_${purchase.id}`,
        titulo: `Registro Inicial del Evento (${purchase.estatusEvento})`,
        fase: 'Inicio del Proceso',
        fecha: fechaInicio,
        hora: purchase.fechaCreacion ? purchase.fechaCreacion.slice(11, 19) : '08:00:00',
        responsable: purchase.creadoPor || 'Sistema GIT',
        observaciones: `Registro inicial de la adquisición en el sistema bajo estatus "${purchase.estatusEvento}".`,
        estado: 'completado',
        registradoPor: purchase.creadoPor || 'Sistema GIT',
        fechaRegistro: purchase.fechaCreacion || new Date().toISOString(),
        automatico: true
      }
    ];
  };

  const timelineList = getTimelineHistory();

  // Guardar cambio de estatus y registrar en la línea de tiempo
  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) {
      showToast({
        type: 'warning',
        title: 'Seleccione un Estatus',
        message: 'Por favor elija el nuevo estatus para registrar en la línea de tiempo.'
      });
      return;
    }

    if (selectedStatus === 'Adjudicación' && !proveedor.trim()) {
      showToast({
        type: 'warning',
        title: 'Proveedor Requerido',
        message: 'Para registrar la Adjudicación, por favor ingrese el nombre del proveedor adjudicado.'
      });
      return;
    }

    setIsSaving(true);

    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const fecha = nowIso.slice(0, 10);
      const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const operador = currentUser?.nombreCompleto || 'Operador GIT';

      // Construir descripción u observación detallada para el evento
      let obsEvento = nota.trim();
      if (!obsEvento) {
        if (selectedStatus === 'Adjudicación') {
          obsEvento = `Evento adjudicado formalmente a "${proveedor.trim()}"${montoAdj ? ` por un monto de ${formatQuetzales(Number(montoAdj))}` : ''}.`;
        } else if (selectedStatus === 'Desierto') {
          obsEvento = 'Evento declarado desierto por falta de ofertas admisibles conforme a la LCE.';
        } else if (selectedStatus === 'Prescindido') {
          obsEvento = 'Proceso prescindido por conveniencia institucional conforme a la normativa legal.';
        } else {
          obsEvento = `Cambio de estatus registrado: de "${purchase.estatusEvento}" a "${selectedStatus}".`;
        }
      }

      // 1. Crear nuevo evento sellado para la línea de tiempo
      const newEvent: StatusTimelineEvent = {
        id: `status_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
        titulo: `Cambio de Estatus: ${selectedStatus}`,
        fase: selectedStatus === 'Adjudicación' ? 'Adjudicación' : selectedStatus === 'Evaluación' ? 'Evaluación' : 'Resolución',
        fecha,
        hora,
        responsable: operador,
        observaciones: obsEvento,
        documentoReferencia: selectedStatus === 'Adjudicación' && fechaAdj ? `Adjudicado: ${formatDate(fechaAdj)}` : undefined,
        estado: selectedStatus === 'Adjudicación' ? 'completado' : selectedStatus === 'Evaluación' ? 'en_proceso' : 'alerta',
        registradoPor: operador,
        fechaRegistro: nowIso,
        automatico: false,
      };

      // 2. Historial existente preservado + nuevo evento
      const existingEvents = (purchase.historialEstatus && purchase.historialEstatus.length > 0)
        ? [...purchase.historialEstatus]
        : timelineList; // Si no había historial en la compra, incluir el evento de inicio

      const updatedHistory = [...existingEvents, newEvent];

      // 3. Objeto de actualización de la adquisición
      const patch: Partial<PurchaseRecord> = {
        estatusEvento: selectedStatus,
        historialEstatus: updatedHistory,
        modificadoPor: operador,
        fechaModificacion: nowIso,
      };

      if (selectedStatus === 'Adjudicación') {
        patch.proveedorAdjudicado = proveedor.trim();
        patch.fechaAdjudicacion = fechaAdj || fecha;
        if (montoAdj !== '' && montoAdj !== undefined) {
          patch.monto = Number(montoAdj);
        }
      } else {
        // Si cambia a otro estatus y no se indicó proveedor, no forzar proveedor
        if (!proveedor.trim() && purchase.estatusEvento === 'Adjudicación') {
          patch.proveedorAdjudicado = undefined;
        }
      }

      if (nota.trim()) {
        patch.observaciones = nota.trim();
      }

      // Guardar directamente en el estado y Firestore
      updatePurchase(purchase.id, patch);

      showToast({
        type: 'success',
        title: 'Estatus Registrado',
        message: `Cambio a "${selectedStatus}" registrado exitosamente en la línea de tiempo.`
      });

      setNota('');
    } catch (err) {
      console.error('Error al registrar cambio de estatus:', err);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Ocurrió un error al registrar el cambio de estatus.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const visuals = getStatusVisuals(purchase.estatusEvento);

  return (
    <div className="space-y-4">
      
      {/* 1. TARJETA PRINCIPAL: ÚLTIMO ESTATUS VIGENTE */}
      <div className={`p-4 rounded-xl border ${visuals.containerClass} shadow-2xs`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
              {visuals.icon}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Último Estatus Vigente
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-2xs ${visuals.badgeClass}`}>
                  <span className={`w-2 h-2 rounded-full ${visuals.dotColor}`} />
                  {purchase.estatusEvento}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                  (Estatus Actual del Proceso)
                </span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 bg-white/80 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Última Modificación
            </span>
            <span className="font-semibold text-slate-800">
              {purchase.fechaModificacion ? formatDateTime(purchase.fechaModificacion) : (purchase.fechaCreacion ? formatDateTime(purchase.fechaCreacion) : 'Registro inicial')}
            </span>
            {purchase.modificadoPor && (
              <span className="text-[11px] text-slate-500 block mt-0.5">
                por: <strong className="text-slate-700">{purchase.modificadoPor}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Datos complementarios si está en Adjudicación */}
        {purchase.estatusEvento === 'Adjudicación' && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Proveedor Adjudicado
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {purchase.proveedorAdjudicado || 'Sin registrar'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha de Adjudicación
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {purchase.fechaAdjudicacion ? formatDate(purchase.fechaAdjudicacion) : 'No especificada'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Monto Adjudicado
              </span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {formatQuetzales(purchase.monto)}
              </span>
            </div>
          </div>
        )}

        {purchase.observaciones && (
          <div className="mt-3 p-2.5 bg-white/90 rounded-lg border border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Observaciones / Justificación:
            </span>
            <p className="text-slate-700 leading-relaxed">{purchase.observaciones}</p>
          </div>
        )}
      </div>

      {/* 2. FORMULARIO: REGISTRAR CAMBIO DE ESTATUS */}
      {canEdit && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Save className="w-4 h-4 text-amber-600" />
              Registrar Nuevo Cambio de Estatus
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seleccione el nuevo estatus. Al guardar, quedará registrado automáticamente en la línea de tiempo.
            </p>
          </div>

          <form onSubmit={handleSaveStatus} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nuevo Estatus <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                >
                  {catalogStatusOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Motivo / Observación del Cambio
                </label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: Resolución No. 12-2026, evaluación técnica completada..."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>
            </div>

            {/* Campos adicionales si el estatus es Adjudicación */}
            {selectedStatus === 'Adjudicación' && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Proveedor Adjudicado <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      placeholder="Empresa adjudicada"
                      className="w-full p-2 text-xs border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      required={selectedStatus === 'Adjudicación'}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Fecha de Adjudicación
                    </label>
                    <input
                      type="date"
                      value={fechaAdj}
                      onChange={(e) => setFechaAdj(e.target.value)}
                      className="w-full p-2 text-xs border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Monto Adjudicado (GTQ)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={montoAdj}
                      onChange={(e) => setMontoAdj(e.target.value)}
                      placeholder="Monto final adjudicado"
                      className="w-full p-2 text-xs font-mono border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Registrando...' : `Guardar y Registrar Cambio en Línea de Tiempo`}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. LÍNEA DE TIEMPO DE CAMBIOS DE ESTATUS */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-600" />
              Línea de Tiempo de Cambios de Estatus
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Registro cronológico de los estatus y transiciones de este proceso.
            </p>
          </div>
          <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold">
            {timelineList.length} {timelineList.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {/* Línea de tiempo vertical */}
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {timelineList.map((evt, idx) => {
            // Extraer o inferir el estatus de este evento
            const isFirst = idx === 0;
            let eventStatus = 'Evaluación';
            if (evt.titulo.toLowerCase().includes('adjudic')) eventStatus = 'Adjudicación';
            else if (evt.titulo.toLowerCase().includes('desierto')) eventStatus = 'Desierto';
            else if (evt.titulo.toLowerCase().includes('prescind')) eventStatus = 'Prescindido';
            else if (evt.titulo.toLowerCase().includes('evalua')) eventStatus = 'Evaluación';

            const evtVisuals = getStatusVisuals(eventStatus);

            return (
              <div key={evt.id || idx} className="relative group">
                {/* Nodo de la línea de tiempo */}
                <div className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${
                  isFirst ? 'border-amber-500 bg-amber-50' : 'border-slate-300'
                }`}>
                  {evtVisuals.smallIcon}
                </div>

                {/* Tarjeta del evento registrado */}
                <div className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                  isFirst 
                    ? 'bg-amber-50/40 border-amber-200 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wide ${evtVisuals.badgeClass}`}>
                        {eventStatus}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">
                        {evt.titulo}
                      </h4>
                      {isFirst && (
                        <span className="px-2 py-0.2 bg-amber-200/80 text-amber-950 border border-amber-300 text-[10px] font-black rounded-full uppercase tracking-wider">
                          Estatus Vigente
                        </span>
                      )}
                    </div>

                    {/* Fecha y Hora del evento */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(evt.fecha)}</span>
                      {evt.hora && (
                        <>
                          <span className="text-slate-300">•</span>
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{evt.hora} hrs</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Observaciones o motivo del cambio */}
                  {evt.observaciones && (
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      {evt.observaciones}
                    </p>
                  )}

                  {/* Documento o referencia si existe */}
                  {evt.documentoReferencia && (
                    <div className="mt-2 text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 inline-block">
                      Ref: <strong className="text-slate-800">{evt.documentoReferencia}</strong>
                    </div>
                  )}

                  {/* Pie de tarjeta con usuario que registró */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Registrado por: <strong className="text-slate-600">{evt.registradoPor || evt.responsable || 'Sistema'}</strong></span>
                    </div>

                    {evt.fechaRegistro && (
                      <span title={formatDateTime(evt.fechaRegistro)}>
                        Sello: {formatDateTime(evt.fechaRegistro)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
