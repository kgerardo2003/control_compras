import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  User, 
  Calendar, 
  Award, 
  Ban, 
  Paperclip, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown, 
  FolderTree, 
  Sparkles,
  Layers,
  Filter,
  Eye,
  ExternalLink,
  Search
} from 'lucide-react';
import { PurchaseRecord, StatusTimelineEvent, PurchaseChangeLogEntry } from '../types';
import { formatDate, formatDateTime, formatQuetzales } from '../utils/formatters';

interface TreeNodeItem {
  id: string;
  titulo: string;
  subtitulo?: string;
  fecha?: string;
  hora?: string;
  responsable?: string;
  rol?: string;
  estado: 'completado' | 'en_proceso' | 'pendiente' | 'desierto';
  tipo: 'hito' | 'bitacora' | 'documento' | 'sistema';
  observaciones?: string;
  documentoRef?: string;
  detalles?: string;
  ip?: string;
  hijos?: TreeNodeItem[];
}

interface TreeBranch {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  color: string;
  completados: number;
  total: number;
  nodos: TreeNodeItem[];
}

interface PurchaseActionTreeProps {
  purchase: Partial<PurchaseRecord>;
  onSelectAction?: (node: TreeNodeItem) => void;
  compact?: boolean;
  initialFilterState?: 'todos' | 'completados' | 'en_proceso' | 'pendientes' | 'recorridos';
}

export const PurchaseActionTree: React.FC<PurchaseActionTreeProps> = ({
  purchase,
  compact = false,
  initialFilterState = 'todos'
}) => {
  const [viewMode, setViewMode] = useState<'jerarquico' | 'cronologico'>('jerarquico');
  const [filterState, setFilterState] = useState<'todos' | 'completados' | 'en_proceso' | 'pendientes' | 'recorridos'>(initialFilterState);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

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

  // Construir las ramas del árbol institucional
  const branches: TreeBranch[] = useMemo(() => {
    const list: TreeBranch[] = [];

    // --- RAMA 1: Solicitud y Requerimiento Oficial ---
    const rama1Nodes: TreeNodeItem[] = [
      {
        id: 'node-solicitud-inicial',
        titulo: 'Registro de Solicitud Inicial F56-e',
        subtitulo: `Formulario F56-e: ${purchase.f56e || 'Pendiente'}`,
        fecha: purchase.fechaSolicitud || undefined,
        responsable: purchase.dependenciaSolicitante || purchase.areaSolicitante || 'Área Solicitante',
        estado: purchase.fechaSolicitud ? 'completado' : 'en_proceso',
        tipo: 'hito',
        observaciones: purchase.descripcion ? `Objeto: ${purchase.descripcion.slice(0, 120)}...` : 'Ingreso oficial de la necesidad tecnológica.',
        documentoRef: purchase.f56e ? `Forma F56-e No. ${purchase.f56e}` : undefined
      },
      {
        id: 'node-vobo',
        titulo: 'Visto Bueno de Jefatura (VoBo)',
        subtitulo: 'Aprobación técnica inicial de la unidad requirente',
        fecha: purchase.fechaVoBo || undefined,
        responsable: purchase.areaSolicitante || 'Jefatura de Área',
        estado: purchase.fechaVoBo ? 'completado' : purchase.fechaSolicitud ? 'en_proceso' : 'pendiente',
        tipo: 'hito',
        observaciones: purchase.fechaVoBo ? `Visto bueno emitido el ${formatDate(purchase.fechaVoBo)}.` : 'Pendiente de emisión de VoBo formal.'
      },
      {
        id: 'node-autorizacion',
        titulo: 'Autorización Formal del Formulario',
        subtitulo: 'Aval superior para trámite presupuestario',
        fecha: purchase.fechaAutorizado || undefined,
        responsable: 'Autoridad Solicitante',
        estado: purchase.fechaAutorizado ? 'completado' : 'pendiente',
        tipo: 'hito',
        observaciones: purchase.fechaAutorizado ? `Autorizado oficialmente el ${formatDate(purchase.fechaAutorizado)}.` : 'En espera de firma y autorización.'
      }
    ];

    const rama1Done = rama1Nodes.filter(n => n.estado === 'completado').length;
    list.push({
      id: 'branch-solicitud',
      titulo: '1. Requerimiento y Aprobación Inicial',
      descripcion: 'Formulario F56-e, justificación técnica y firmas de autorización',
      icono: <FileText className="w-4 h-4 text-blue-600" />,
      color: 'blue',
      completados: rama1Done,
      total: rama1Nodes.length,
      nodos: rama1Nodes
    });

    // --- RAMA 2: Dictamen y Gestión Técnica GIT ---
    const evaluado = purchase.evaluadoGIT === 'Sí';
    const rama2Nodes: TreeNodeItem[] = [
      {
        id: 'node-git-evaluacion',
        titulo: 'Revisión Técnica por Gerencia de Informática (GIT)',
        subtitulo: 'Verificación de estándares, arquitectura y compatibilidad',
        fecha: purchase.fechaDictamenGIT || purchase.fechaSolicitud,
        responsable: 'Gerencia de Informática - GIT',
        estado: evaluado ? 'completado' : 'en_proceso',
        tipo: 'hito',
        observaciones: evaluado 
          ? 'Expediente analizado por los especialistas de GIT y calificado técnicamente viable.' 
          : 'En proceso de evaluación técnica por el equipo de ingeniería GIT.'
      },
      {
        id: 'node-git-dictamen',
        titulo: 'Emisión de Dictamen Técnico Oficial',
        subtitulo: 'Resolución técnica vinculante para compras TI',
        fecha: purchase.fechaDictamenGIT || undefined,
        responsable: 'Gerencia de Informática',
        estado: purchase.fechaDictamenGIT ? 'completado' : evaluado ? 'en_proceso' : 'pendiente',
        tipo: 'hito',
        observaciones: purchase.fechaDictamenGIT 
          ? `Dictamen técnico favorable emitido con fecha ${formatDate(purchase.fechaDictamenGIT)}.` 
          : 'Pendiente de emisión formal de dictamen.',
        documentoRef: purchase.fechaDictamenGIT ? `Dictamen GIT (${purchase.fechaDictamenGIT})` : undefined
      },
      {
        id: 'node-git-oficio',
        titulo: 'Oficio de Traslado GIT hacia Dirección de Compras',
        subtitulo: 'Remisión de expediente dictaminado para contratación',
        fecha: purchase.fechaElaboracionOficioGIT || undefined,
        responsable: 'Gerencia de Informática - GIT',
        estado: purchase.fechaElaboracionOficioGIT ? 'completado' : 'pendiente',
        tipo: 'hito',
        observaciones: purchase.fechaElaboracionOficioGIT 
          ? `Oficio técnico elaborado y remitido a Compras el ${formatDate(purchase.fechaElaboracionOficioGIT)}.` 
          : 'Pendiente de elaboración de oficio de traslado.',
        documentoRef: purchase.fechaElaboracionOficioGIT ? `Oficio GIT: ${purchase.fechaElaboracionOficioGIT}` : undefined
      }
    ];

    const rama2Done = rama2Nodes.filter(n => n.estado === 'completado').length;
    list.push({
      id: 'branch-git',
      titulo: '2. Dictamen y Gestión Técnica (GIT)',
      descripcion: 'Evaluación técnica, dictamen vinculante y oficio de remisión',
      icono: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      color: 'emerald',
      completados: rama2Done,
      total: rama2Nodes.length,
      nodos: rama2Nodes
    });

    // --- RAMA 3: Guatecompras y Concurrencia ---
    const rama3Nodes: TreeNodeItem[] = [
      {
        id: 'node-guatecompras-publicacion',
        titulo: 'Publicación en Portal Guatecompras',
        subtitulo: `NOG: ${purchase.nog || 'Pendiente de publicación'}`,
        fecha: purchase.fechaPublicacion || undefined,
        responsable: 'Dirección de Compras',
        estado: purchase.fechaPublicacion ? 'completado' : 'pendiente',
        tipo: 'hito',
        observaciones: purchase.fechaPublicacion 
          ? `Publicado oficialmente en Guatecompras el ${formatDate(purchase.fechaPublicacion)}. Modalidad: ${purchase.modalidadCompra || 'Cotización'}.` 
          : 'En preparación para publicación en Guatecompras.',
        documentoRef: purchase.nog ? `NOG Guatecompras: ${purchase.nog}` : undefined
      },
      {
        id: 'node-guatecompras-ofertas',
        titulo: 'Recepción y Apertura de Ofertas',
        subtitulo: `Oferentes registrados: ${purchase.cantidadOfertas ?? 0}`,
        fecha: purchase.fechaOfertas || undefined,
        responsable: 'Junta de Cotización / Compras',
        estado: (purchase.cantidadOfertas !== undefined && purchase.cantidadOfertas > 0) || purchase.fechaOfertas 
          ? 'completado' 
          : purchase.fechaPublicacion ? 'en_proceso' : 'pendiente',
        tipo: 'hito',
        observaciones: (purchase.cantidadOfertas || 0) > 0 
          ? `Se recibieron ${purchase.cantidadOfertas} ofertas válidas de proveedores en el plazo estipulado.` 
          : 'En espera del cierre del período de recepción de ofertas.'
      }
    ];

    const rama3Done = rama3Nodes.filter(n => n.estado === 'completado').length;
    list.push({
      id: 'branch-guatecompras',
      titulo: '3. Portal Guatecompras y Oferentes',
      descripcion: 'Publicación del NOG, concurrencia y recepción de ofertas técnicas',
      icono: <ExternalLink className="w-4 h-4 text-purple-600" />,
      color: 'purple',
      completados: rama3Done,
      total: rama3Nodes.length,
      nodos: rama3Nodes
    });

    // --- RAMA 4: Resolución, Adjudicación y Pago ---
    const esAdjudicado = purchase.estatusEvento === 'Adjudicación';
    const esDesierto = purchase.estatusEvento === 'Desierto' || purchase.estatusEvento === 'Prescindido';
    
    const rama4Nodes: TreeNodeItem[] = [
      {
        id: 'node-adjudicacion-resolucion',
        titulo: esDesierto ? `Resolución: Evento ${purchase.estatusEvento}` : 'Resolución de Adjudicación Definitiva',
        subtitulo: esAdjudicado 
          ? `Proveedor: ${purchase.proveedorAdjudicado || 'Adjudicado'}` 
          : esDesierto 
            ? 'Evento declarado sin adjudicación' 
            : 'Calificación técnica y económica en curso',
        fecha: purchase.fechaAdjudicacion || undefined,
        responsable: 'Autoridad Superior / Junta',
        estado: esAdjudicado ? 'completado' : esDesierto ? 'desierto' : 'pendiente',
        tipo: 'hito',
        observaciones: esAdjudicado 
          ? `Adjudicado formalmente a ${purchase.proveedorAdjudicado || 'proveedor seleccionado'} por un monto de Q${(purchase.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}.`
          : esDesierto 
            ? `El evento fue declarado ${purchase.estatusEvento} según acta de junta.`
            : 'En espera de resolución final de adjudicación.'
      },
      {
        id: 'node-pago-compromiso',
        titulo: 'Estado de Compromiso y Ejecución de Pago',
        subtitulo: `Estatus actual: ${purchase.estadoPago || 'Pendiente'}`,
        responsable: 'Gerencia Financiera',
        estado: purchase.estadoPago === 'Pagado' ? 'completado' : purchase.estadoPago === 'En trámite' ? 'en_proceso' : 'pendiente',
        tipo: 'hito',
        observaciones: `Renglón presupuestario asignado: [${purchase.renglonPresupuestario || '158'}]. Monto de reserva: Q${(purchase.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}.`
      }
    ];

    const rama4Done = rama4Nodes.filter(n => n.estado === 'completado').length;
    list.push({
      id: 'branch-adjudicacion',
      titulo: '4. Resolución y Liquidación',
      descripcion: 'Adjudicación formal, proveedor contratado y ejecución presupuestaria',
      icono: <Award className="w-4 h-4 text-amber-600" />,
      color: 'amber',
      completados: rama4Done,
      total: rama4Nodes.length,
      nodos: rama4Nodes
    });

    // --- RAMA 5: Expediente y Documentos Digitales ---
    const tieneDoc = Boolean(purchase.f56Documento?.nombre);
    const rama5Nodes: TreeNodeItem[] = [
      {
        id: 'node-doc-f56',
        titulo: tieneDoc ? `Documento Digitalizado: ${purchase.f56Documento?.nombre}` : 'Documento Digitalizado F56 (Físico / Escaneado)',
        subtitulo: tieneDoc 
          ? `Tamaño: ${((purchase.f56Documento?.tamano || 0) / 1024).toFixed(1)} KB • Tipo: ${purchase.f56Documento?.tipo || 'PDF'}` 
          : 'No se ha adjuntado archivo aún',
        fecha: purchase.f56Documento?.fechaSubida ? purchase.f56Documento.fechaSubida.slice(0, 10) : undefined,
        hora: purchase.f56Documento?.fechaSubida ? purchase.f56Documento.fechaSubida.slice(11, 16) : undefined,
        responsable: purchase.creadoPor || 'Operador',
        estado: tieneDoc ? 'completado' : 'en_proceso',
        tipo: 'documento',
        observaciones: tieneDoc 
          ? `Archivo incorporado de forma inmutable al expediente. Respaldo verificado en almacenamiento seguro.`
          : 'Se requiere adjuntar el documento físico digitalizado para completar el expediente.',
        documentoRef: purchase.f56Documento?.nombre
      }
    ];

    list.push({
      id: 'branch-documentos',
      titulo: '5. Documentación Digital Oficial',
      descripcion: 'Formulario F56-e digitalizado, comprobantes y sellos de seguridad',
      icono: <Paperclip className="w-4 h-4 text-sky-600" />,
      color: 'sky',
      completados: tieneDoc ? 1 : 0,
      total: 1,
      nodos: rama5Nodes
    });

    // --- RAMA 6: Registro de Auditoría y Acciones del Operador ---
    if (purchase.bitacoraCambios && purchase.bitacoraCambios.length > 0) {
      const bitacoraNodes: TreeNodeItem[] = purchase.bitacoraCambios.map(entry => ({
        id: entry.id,
        titulo: `Acción: ${entry.accion} (${entry.estatus || 'Registrada'})`,
        subtitulo: `Por ${entry.usuario} • Rol: ${entry.rol || 'Operador'}`,
        fecha: entry.fechaHora.slice(0, 10),
        hora: entry.fechaHora.slice(11, 19),
        responsable: entry.usuario,
        rol: entry.rol,
        estado: 'completado',
        tipo: 'bitacora',
        observaciones: entry.detalles,
        ip: entry.ip
      }));

      list.push({
        id: 'branch-bitacora',
        titulo: `6. Registro de Acciones y Auditoría (${bitacoraNodes.length})`,
        descripcion: 'Trazabilidad cronológica detallada de cada cambio ejecutado por los usuarios',
        icono: <GitBranch className="w-4 h-4 text-indigo-600" />,
        color: 'indigo',
        completados: bitacoraNodes.length,
        total: bitacoraNodes.length,
        nodos: bitacoraNodes
      });
    }

    return list;
  }, [purchase]);

  // Nodos planos para la vista cronológica
  const chronologicalNodes = useMemo(() => {
    const all: TreeNodeItem[] = [];
    branches.forEach(b => {
      b.nodos.forEach(n => {
        all.push(n);
      });
    });

    // Ordenar cronológicamente si tienen fecha
    return all.sort((a, b) => {
      const dateA = a.fecha || '1970-01-01';
      const dateB = b.fecha || '1970-01-01';
      return dateB.localeCompare(dateA);
    });
  }, [branches]);

  // Filtrado de ramas y nodos
  const filteredBranches = useMemo(() => {
    return branches.map(b => {
      let filteredNodes = b.nodos;

      if (filterState === 'recorridos') {
        filteredNodes = filteredNodes.filter(n => n.estado === 'completado' || n.estado === 'en_proceso' || n.estado === 'desierto');
      } else if (filterState === 'completados') {
        filteredNodes = filteredNodes.filter(n => n.estado === 'completado');
      } else if (filterState === 'en_proceso') {
        filteredNodes = filteredNodes.filter(n => n.estado === 'en_proceso');
      } else if (filterState === 'pendientes') {
        filteredNodes = filteredNodes.filter(n => n.estado === 'pendiente');
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredNodes = filteredNodes.filter(n => 
          n.titulo.toLowerCase().includes(q) ||
          (n.subtitulo && n.subtitulo.toLowerCase().includes(q)) ||
          (n.observaciones && n.observaciones.toLowerCase().includes(q)) ||
          (n.responsable && n.responsable.toLowerCase().includes(q))
        );
      }

      return {
        ...b,
        nodos: filteredNodes
      };
    }).filter(b => b.nodos.length > 0);
  }, [branches, filterState, searchQuery]);

  // Conteo global
  const totalNodes = branches.reduce((acc, b) => acc + b.total, 0);
  const totalCompleted = branches.reduce((acc, b) => acc + b.completados, 0);
  const progressPercent = totalNodes > 0 ? Math.round((totalCompleted / totalNodes) * 100) : 0;

  // Render de un nodo individual en el árbol
  const renderNode = (node: TreeNodeItem, isLast: boolean, depth = 0) => {
    const isExpanded = Boolean(expandedNodes[node.id]);

    const stateConfig = {
      completado: {
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500 ring-4 ring-emerald-100',
        line: 'border-emerald-300',
        text: 'Completado',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
        text: 'No Adjudicado',
        icon: <Ban className="w-3.5 h-3.5 text-rose-600" />
      }
    }[node.estado];

    return (
      <div key={node.id} className="relative flex items-start group">
        {/* Línea conectora vertical de rama */}
        {!isLast && (
          <div className="absolute left-[17px] top-7 bottom-0 w-0.5 bg-slate-200 group-hover:bg-slate-300 transition-colors" />
        )}

        {/* Punto / Conector de Nodo */}
        <div className="relative z-10 flex items-center justify-center w-9 h-9 shrink-0 mr-3">
          <div className={`w-3.5 h-3.5 rounded-full ${stateConfig.dot} transition-transform group-hover:scale-110 flex items-center justify-center`} />
        </div>

        {/* Tarjeta del Nodo */}
        <div className="flex-1 pb-4 min-w-0">
          <div 
            onClick={() => toggleNodeDetail(node.id)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              node.estado === 'completado' 
                ? 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs' 
                : node.estado === 'en_proceso'
                  ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {node.titulo}
                  </h4>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${stateConfig.badge}`}>
                    {stateConfig.icon}
                    <span>{stateConfig.text}</span>
                  </span>
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
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                    <Calendar className="w-3 h-3 text-slate-400" />
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
              {node.documentoRef && (
                <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{node.documentoRef}</span>
                </span>
              )}
              {node.ip && (
                <span className="text-slate-400 font-mono text-[9px]">
                  IP: {node.ip}
                </span>
              )}
            </div>

            {/* Detalles expandibles */}
            {isExpanded && node.observaciones && (
              <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">
                <p className="font-medium leading-relaxed">
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
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-4 rounded-xl text-white shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Árbol de Registro e Historial de Acciones
                </h3>
                <span className="text-[10px] bg-amber-500/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {purchase.nog ? `NOG: ${purchase.nog}` : 'Nuevo Registro'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Formulario F56-e: {purchase.f56e || 'Borrador'} • {purchase.dependenciaSolicitante || 'Gerencia de Informática'}
              </p>
            </div>
          </div>

          {/* Métrica de avance del árbol */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Avance del Expediente
              </span>
              <span className="text-sm font-black text-amber-400">
                {totalCompleted} de {totalNodes} hitos ({progressPercent}%)
              </span>
            </div>
            <div className="w-14 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Controles del Árbol: Filtros, Búsqueda y Modos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        
        {/* Selector de modo y búsqueda */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar acción, usuario, hito..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('jerarquico')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'jerarquico' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Fases
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cronologico')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'cronologico' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cronológico
            </button>
          </div>
        </div>

        {/* Filtros de estado y botones expandir/colapsar */}
        <div className="flex items-center gap-1.5 justify-end flex-wrap">
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterState('recorridos')}
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                filterState === 'recorridos' ? 'bg-amber-800 text-white' : 'text-amber-800 hover:bg-amber-100'
              }`}
              title="Ver únicamente los hitos y acciones transitados por esta ficha"
            >
              Ruta de esta Ficha
            </button>
            <button
              type="button"
              onClick={() => setFilterState('todos')}
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                filterState === 'todos' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({totalNodes})
            </button>
            <button
              type="button"
              onClick={() => setFilterState('completados')}
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                filterState === 'completados' ? 'bg-emerald-700 text-white' : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Hechos ({totalCompleted})
            </button>
            <button
              type="button"
              onClick={() => setFilterState('en_proceso')}
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                filterState === 'en_proceso' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-100'
              }`}
            >
              En Proceso
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-0.5 hover:bg-slate-200 rounded"
          >
            Expandir todo
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-0.5 hover:bg-slate-200 rounded"
          >
            Colapsar todo
          </button>
        </div>

      </div>

      {/* CUERPO DEL ÁRBOL */}
      {viewMode === 'jerarquico' ? (
        /* VISTA JERÁRQUICA POR RAMAS INSTITUCIONALES */
        <div className="space-y-4">
          {filteredBranches.map((branch, bIdx) => {
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
                          {branch.completados}/{branch.total}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {branch.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${(branch.completados / branch.total) * 100}%` }} 
                      />
                    </div>
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Nodos hijos de la rama */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-5 bg-white space-y-1">
                    {branch.nodos.map((node, nIdx) => 
                      renderNode(node, nIdx === branch.nodos.length - 1)
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA CRONOLÓGICA DIRECTA */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-1">
          {chronologicalNodes.length > 0 ? (
            chronologicalNodes.map((node, idx) => 
              renderNode(node, idx === chronologicalNodes.length - 1)
            )
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              No se encontraron acciones registradas que coincidan con los filtros.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
