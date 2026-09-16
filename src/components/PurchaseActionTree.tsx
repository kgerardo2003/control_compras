import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  Clock, 
  User, 
  Calendar, 
  Ban, 
  ChevronRight, 
  ChevronDown, 
  FolderTree, 
  Search, 
  MessageSquare, 
  Plus, 
  Send, 
  ArrowDownUp, 
  User as UserIcon 
} from 'lucide-react';
import { PurchaseRecord, PurchaseObservationEntry } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';

export interface TreeNodeItem {
  id: string;
  titulo: string;
  subtitulo?: string;
  fecha?: string;
  hora?: string;
  responsable?: string;
  rol?: string;
  estado: 'completado' | 'en_proceso' | 'pendiente' | 'desierto';
  tipo: 'observacion';
  observaciones?: string;
  correlativo?: number;
}

export interface TreeBranch {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  color: string;
  completados: number;
  total: number;
  nodos: TreeNodeItem[];
}

export interface PurchaseActionTreeProps {
  purchase: Partial<PurchaseRecord>;
  onSelectAction?: (node: TreeNodeItem) => void;
  compact?: boolean;
  initialFilterState?: 'todos' | 'observaciones';
  onAddObservation?: (comentario: string) => void;
  canAddObservation?: boolean;
  currentUser?: { nombreCompleto?: string; username?: string; rol?: string };
}

export const PurchaseActionTree: React.FC<PurchaseActionTreeProps> = ({
  purchase,
  compact = false,
  initialFilterState = 'todos',
  onAddObservation,
  canAddObservation = false,
  currentUser
}) => {
  const [viewMode, setViewMode] = useState<'jerarquico' | 'cronologico'>('jerarquico');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [isSubmittingObs, setIsSubmittingObs] = useState(false);

  // Alternar colapso de rama
  const toggleBranch = (branchId: string) => {
    setCollapsedBranches(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }));
  };

  // Alternar detalle de nodo
  const toggleNodeDetail = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Expandir / Colapsar todo
  const expandAll = () => {
    setCollapsedBranches({});
    const allExpanded: Record<string, boolean> = {};
    branches.forEach(b => {
      b.nodos.forEach(n => {
        allExpanded[n.id] = true;
      });
    });
    setExpandedNodes(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    branches.forEach(b => {
      allCollapsed[b.id] = true;
    });
    setCollapsedBranches(allCollapsed);
    setExpandedNodes({});
  };

  // Manejar envío de nueva observación si está habilitado
  const handleFormSubmitObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaObservacion.trim() || !onAddObservation || isSubmittingObs) return;
    setIsSubmittingObs(true);
    try {
      onAddObservation(nuevaObservacion.trim());
      setNuevaObservacion('');
    } finally {
      setIsSubmittingObs(false);
    }
  };

  // Construir el árbol de Observaciones y Hoja de Ruta ordenado del más reciente al más antiguo
  const branches: TreeBranch[] = useMemo(() => {
    const list: TreeBranch[] = [];
    const obsNodes: TreeNodeItem[] = [];

    if (purchase.observacionesList && purchase.observacionesList.length > 0) {
      // Ordenar cronológicamente del más reciente al más antiguo (descendente por fecha y hora)
      const sortedObs = [...purchase.observacionesList].sort((a, b) => {
        const timeA = a.fechaHora 
          ? new Date(a.fechaHora).getTime() 
          : new Date(`${a.fecha || '1970-01-01'}T${a.hora || '00:00:00'}`).getTime();
        const timeB = b.fechaHora 
          ? new Date(b.fechaHora).getTime() 
          : new Date(`${b.fecha || '1970-01-01'}T${b.hora || '00:00:00'}`).getTime();
        return timeB - timeA;
      });

      const totalCount = sortedObs.length;

      sortedObs.forEach((obs, idx) => {
        const numRegistro = totalCount - idx;
        obsNodes.push({
          id: obs.id || `obs-node-${idx}`,
          titulo: `Observación de Hoja de Ruta #${numRegistro}`,
          subtitulo: `Registrada por ${obs.usuario}${obs.rol ? ` • Rol: ${obs.rol}` : ''}`,
          fecha: obs.fecha || (obs.fechaHora ? obs.fechaHora.slice(0, 10) : undefined),
          hora: obs.hora || (obs.fechaHora ? obs.fechaHora.slice(11, 16) : undefined),
          responsable: obs.usuario,
          rol: obs.rol,
          estado: 'completado',
          tipo: 'observacion',
          observaciones: obs.comentario,
          correlativo: numRegistro
        });
      });
    } else if (purchase.observaciones && purchase.observaciones.trim()) {
      // Compatibilidad con texto de observación previa
      obsNodes.push({
        id: 'obs-node-general',
        titulo: 'Observación de Hoja de Ruta',
        subtitulo: `Registrada por ${purchase.creadoPor || 'Operador'}`,
        fecha: purchase.fechaRecepcion || purchase.fechaSolicitud || (purchase.fechaCreacion ? purchase.fechaCreacion.slice(0, 10) : undefined),
        hora: purchase.fechaCreacion ? purchase.fechaCreacion.slice(11, 16) : undefined,
        responsable: purchase.creadoPor || 'Operador',
        estado: 'completado',
        tipo: 'observacion',
        observaciones: purchase.observaciones,
        correlativo: 1
      });
    } else {
      // Estado informativo si aún no hay observaciones
      obsNodes.push({
        id: 'obs-node-empty',
        titulo: 'Hoja de Ruta del Expediente',
        subtitulo: 'Sin observaciones registradas por el momento',
        fecha: purchase.fechaRecepcion || purchase.fechaSolicitud,
        responsable: purchase.creadoPor || 'Departamento de Compras',
        estado: 'pendiente',
        tipo: 'observacion',
        observaciones: 'El expediente no cuenta con observaciones registradas en la hoja de ruta. Puede agregar nuevas observaciones con usuario, fecha y hora.'
      });
    }

    const obsCompletados = obsNodes.filter(n => n.estado === 'completado').length;
    list.push({
      id: 'branch-observaciones',
      titulo: 'Observaciones y Hoja de Ruta',
      descripcion: 'Registro cronológico estructurado de la hoja de ruta (del más reciente al más antiguo)',
      icono: <MessageSquare className="w-4 h-4 text-amber-600" />,
      color: 'amber',
      completados: obsCompletados,
      total: obsNodes.length,
      nodos: obsNodes
    });

    return list;
  }, [purchase]);

  // Nodos planos para la vista cronológica (del más reciente al más antiguo)
  const chronologicalNodes = useMemo(() => {
    const all: TreeNodeItem[] = [];
    branches.forEach(b => {
      b.nodos.forEach(n => {
        if (n.id !== 'obs-node-empty') {
          all.push(n);
        }
      });
    });

    return all.sort((a, b) => {
      const dateA = (a.fecha || '1970-01-01') + (a.hora ? `T${a.hora}` : 'T00:00:00');
      const dateB = (b.fecha || '1970-01-01') + (b.hora ? `T${b.hora}` : 'T00:00:00');
      return dateB.localeCompare(dateA);
    });
  }, [branches]);

  // Filtrado por búsqueda en las observaciones
  const filteredBranches = useMemo(() => {
    return branches.map(b => {
      let filteredNodes = b.nodos;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredNodes = filteredNodes.filter(n => 
          n.titulo.toLowerCase().includes(q) ||
          (n.subtitulo && n.subtitulo.toLowerCase().includes(q)) ||
          (n.observaciones && n.observaciones.toLowerCase().includes(q)) ||
          (n.responsable && n.responsable.toLowerCase().includes(q)) ||
          (n.fecha && n.fecha.includes(q))
        );
      }

      return {
        ...b,
        nodos: filteredNodes
      };
    });
  }, [branches, searchQuery]);

  // Conteo global de observaciones
  const totalObservaciones = (purchase.observacionesList?.length || (purchase.observaciones ? 1 : 0));

  // Render de un nodo individual en el árbol (Semáforo Verde para el último movimiento registrado)
  const renderNode = (node: TreeNodeItem, isLast: boolean, isFirst: boolean = false) => {
    const isExpanded = Boolean(expandedNodes[node.id]);
    const isLatestRealMovement = isFirst && node.id !== 'obs-node-empty';

    const stateConfig = {
      completado: {
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-500 ring-4 ring-amber-100',
        line: 'border-slate-300',
        text: 'Hoja de Ruta',
        icon: <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
      },
      en_proceso: {
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        dot: 'bg-amber-500 ring-4 ring-amber-100 animate-pulse',
        line: 'border-amber-300',
        text: 'En Proceso',
        icon: <Clock className="w-3.5 h-3.5 text-amber-600" />
      },
      pendiente: {
        badge: 'bg-slate-100 text-slate-600 border-slate-300',
        dot: 'bg-slate-300 ring-4 ring-slate-100',
        line: 'border-slate-200',
        text: 'Pendiente',
        icon: <Clock className="w-3.5 h-3.5 text-slate-400" />
      },
      desierto: {
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500 ring-4 ring-rose-100',
        line: 'border-rose-300',
        text: 'No Aplicado',
        icon: <Ban className="w-3.5 h-3.5 text-rose-600" />
      }
    }[node.estado];

    return (
      <div key={node.id} className="relative flex items-start group">
        {/* Línea conectora vertical de rama del árbol */}
        {!isLast && (
          <div className="absolute left-[17px] top-7 bottom-0 w-0.5 bg-slate-200 group-hover:bg-slate-300 transition-colors" />
        )}

        {/* Punto / Conector de Nodo (Semáforo de Estado: Verde brillante para el último movimiento registrado) */}
        <div className="relative z-10 flex items-center justify-center w-9 h-9 shrink-0 mr-3">
          {isLatestRealMovement ? (
            <div 
              className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-200 shadow-md shadow-emerald-500/30 flex items-center justify-center animate-pulse transition-transform group-hover:scale-125"
              title="Semáforo Verde: Último Movimiento Registrado"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white block" />
            </div>
          ) : (
            <div className={`w-3.5 h-3.5 rounded-full ${stateConfig.dot} transition-transform group-hover:scale-110 flex items-center justify-center`} />
          )}
        </div>

        {/* Tarjeta del Nodo */}
        <div className="flex-1 pb-4 min-w-0">
          <div 
            onClick={() => toggleNodeDetail(node.id)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              isLatestRealMovement
                ? 'bg-emerald-50/40 border-emerald-300 shadow-xs ring-1 ring-emerald-200/70 hover:border-emerald-400'
                : node.estado === 'completado'
                  ? 'bg-amber-50/30 border-amber-200/80 hover:border-amber-300 hover:shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isLatestRealMovement ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <span>{node.titulo}</span>
                  </h4>
                  {isLatestRealMovement ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-900 border-emerald-400 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      <span>Semáforo Verde: Último Movimiento Registrado</span>
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${stateConfig.badge}`}>
                      {stateConfig.icon}
                      <span>{stateConfig.text}</span>
                    </span>
                  )}
                </div>
                {node.subtitulo && (
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    {node.subtitulo}
                  </p>
                )}
              </div>

              {/* Fecha y botón de expandir */}
              <div className="flex items-center gap-2 shrink-0">
                {node.fecha && (
                  <span className={`text-[10px] font-semibold flex items-center gap-1 border px-2 py-0.5 rounded-md font-mono ${
                    isLatestRealMovement 
                      ? 'bg-white border-emerald-300 text-emerald-900 font-bold' 
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <Calendar className={`w-3 h-3 ${isLatestRealMovement ? 'text-emerald-600' : 'text-amber-600'}`} />
                    {formatDate(node.fecha)} {node.hora ? `• ${node.hora}` : ''}
                  </span>
                )}
                <button
                  type="button"
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  aria-label="Ver detalles"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Metadatos rápidos del nodo */}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex-wrap">
              {node.responsable && (
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{node.responsable}</span>
                  {node.rol && <span className="text-slate-400">({node.rol})</span>}
                </span>
              )}
            </div>

            {/* Contenido / Observaciones completas */}
            {node.observaciones && (
              <div className={`mt-2.5 pt-2.5 border-t border-dashed text-xs rounded-lg p-3 text-slate-800 shadow-2xs border ${
                isLatestRealMovement 
                  ? 'bg-white border-emerald-200/90' 
                  : 'bg-white border-amber-200/80 border-amber-100'
              }`}>
                <p className="leading-relaxed whitespace-pre-wrap font-normal">
                  {node.observaciones}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra superior de Resumen del Árbol y Progreso */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 p-4 rounded-xl text-white shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Árbol de Registro: Observaciones y Hoja de Ruta
                </h3>
                <span className="text-[10px] bg-amber-500/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {purchase.nog ? `NOG: ${purchase.nog}` : 'Sin NOG'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Formulario F56-e: {purchase.f56e || 'Borrador'} • {purchase.dependenciaSolicitante || 'Departamento de Compras'}
              </p>
            </div>
          </div>

          {/* Métrica de observaciones en hoja de ruta */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Total en Hoja de Ruta
              </span>
              <span className="text-sm font-black text-amber-400">
                {totalObservaciones} {totalObservaciones === 1 ? 'observación' : 'observaciones'}
              </span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-300 font-bold">
                  Semáforo Verde: Último Movimiento
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario rápido para agregar nueva observación a la Hoja de Ruta si se habilita */}
      {canAddObservation && onAddObservation && (
        <form onSubmit={handleFormSubmitObservation} className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="tree-input-observacion" className="font-bold text-amber-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-700" />
              <span>Agregar Observación a la Hoja de Ruta</span>
            </label>
            {currentUser && (
              <span className="text-[10px] text-slate-500">
                Como: <strong className="text-slate-800">{currentUser.nombreCompleto || currentUser.username}</strong>
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              id="tree-input-observacion"
              rows={2}
              value={nuevaObservacion}
              onChange={(e) => setNuevaObservacion(e.target.value)}
              placeholder="Escriba aquí la observación técnica, dictamen de soporte o nota para integrarla a la hoja de ruta..."
              className="flex-1 p-2 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
            />
            <button
              type="submit"
              disabled={!nuevaObservacion.trim() || isSubmittingObs}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
          </div>
        </form>
      )}

      {/* Controles del Árbol: Búsqueda, Vista y Expansión */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        
        {/* Selector de búsqueda y vista */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar en observaciones y hoja de ruta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('jerarquico')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'jerarquico' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Secciones
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cronologico')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'cronologico' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cronológico
            </button>
          </div>
        </div>

        {/* Indicador de orden y botones expandir/colapsar */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Semáforo verde = Último movimiento</span>
          </span>

          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
            <ArrowDownUp className="w-3 h-3 text-amber-700" />
            <span>Más reciente al más antiguo</span>
          </span>

          <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-0.5 hover:bg-slate-200 rounded cursor-pointer"
          >
            Expandir todo
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-0.5 hover:bg-slate-200 rounded cursor-pointer"
          >
            Colapsar todo
          </button>
        </div>

      </div>

      {/* CUERPO DEL ÁRBOL */}
      {viewMode === 'jerarquico' ? (
        /* VISTA POR SECCIONES: OBSERVACIONES Y HOJA DE RUTA */
        <div className="space-y-4">
          {filteredBranches.map((branch) => {
            const isCollapsed = Boolean(collapsedBranches[branch.id]);

            return (
              <div 
                key={branch.id} 
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* Encabezado de Rama */}
                <div 
                  onClick={() => toggleBranch(branch.id)}
                  className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between border-b border-slate-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      {branch.icono}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{branch.titulo}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.2 rounded-full">
                          {branch.nodos.length} {branch.nodos.length === 1 ? 'observación' : 'observaciones'}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {branch.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Nodos hijos de la rama */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-5 bg-white space-y-1">
                    {branch.nodos.map((node, nIdx) => 
                      renderNode(node, nIdx === branch.nodos.length - 1, nIdx === 0)
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA CRONOLÓGICA DIRECTA (MÁS RECIENTE AL MÁS ANTIGUO) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-1">
          {chronologicalNodes.length > 0 ? (
            chronologicalNodes.map((node, idx) => 
              renderNode(node, idx === chronologicalNodes.length - 1, idx === 0)
            )
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              No se encontraron registros de observaciones en la hoja de ruta que coincidan con los filtros.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
