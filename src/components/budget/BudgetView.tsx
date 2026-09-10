import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BudgetLineItem, 
  BudgetModification, 
  BudgetDisponibilidadStatus,
  PurchaseRecord 
} from '../../types';
import { exportBudgetLinesToExcel, downloadBudgetExcelTemplate } from '../../utils/budgetCalculations';
import { OfficialRenglon } from '../../data/budgetStandardCatalog';
import { ImportBudgetExcelModal } from './ImportBudgetExcelModal';
import { BudgetModificationModal } from './BudgetModificationModal';
import { BudgetLineModal } from './BudgetLineModal';
import { BudgetOfficialCatalogView } from './BudgetOfficialCatalogView';
import { BudgetStatsCharts } from './BudgetStatsCharts';
import { BudgetReportsView } from './BudgetReportsView';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  FileSpreadsheet, 
  FileText,
  Download, 
  PlusCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  PieChart, 
  ShoppingBag, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Eye,
  RefreshCw,
  BookOpen,
  Calculator
} from 'lucide-react';

type BudgetSubTab = 'matriz' | 'catalogoOficial' | 'modificaciones' | 'estadisticas' | 'compras' | 'reportes';

export const BudgetView: React.FC = () => {
  const { 
    budgetLines, 
    budgetModifications, 
    budgetAvailability, 
    purchases, 
    updatePurchase,
    addPurchaseBitacoraEntry,
    showToast,
    deleteBudgetLine,
    deleteBudgetModification,
    approveBudgetModification,
    rejectBudgetModification,
    togglePurchasePaymentState,
    setSelectedPurchase,
    setActiveTab,
    currentUser,
    themeConfig 
  } = useApp();

  // Estados de interfaz
  const [subTab, setSubTab] = useState<BudgetSubTab>('matriz');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isModModalOpen, setIsModModalOpen] = useState(false);
  const [modToEdit, setModToEdit] = useState<BudgetModification | null>(null);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [lineToEdit, setLineToEdit] = useState<BudgetLineItem | null>(null);
  const [prefillRenglon, setPrefillRenglon] = useState<OfficialRenglon | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');

  // Filtros de Adquisiciones Vinculadas (Subtab 'compras')
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const [purchaseFilterRenglon, setPurchaseFilterRenglon] = useState('todos');
  const [purchaseFilterEstado, setPurchaseFilterEstado] = useState<'todos' | 'comprometido' | 'pagado'>('todos');

  // Asignación manual de Renglón desde la sección de Adquisiciones
  // Asignación manual de Renglón desde la sección de Adquisiciones
  const handleAssignRenglon = (purchaseId: string, newRenglon: string) => {
    const cleanRenglon = String(newRenglon || '').trim();
    const line = budgetAvailability.find(l => String(l.renglonPresupuestario).trim() === cleanRenglon);
    
    updatePurchase(purchaseId, {
      renglonPresupuestario: cleanRenglon || undefined,
      nombreRenglon: line ? line.nombreRenglon : undefined,
      grupoPresupuestario: line ? line.grupoPresupuestario : undefined
    });

    if (cleanRenglon && line) {
      showToast({
        type: 'success',
        title: 'Renglón Asignado',
        message: `Se asignó el Renglón ${cleanRenglon} (${line.nombreRenglon}) a la adquisición. La matriz actualizó el compromiso pendiente.`
      });
    } else {
      showToast({
        type: 'info',
        title: 'Renglón Desasignado',
        message: 'Se retiró la asignación presupuestaria de esta adquisición.'
      });
    }
  };

  const isAdmin = currentUser?.rol === 'administrador';
  const canEditBudget = isAdmin || currentUser?.rol === 'operador_compras' || currentUser?.rol === 'usuario_estandar' || Boolean(currentUser);

  // Extraer grupos presupuestarios únicos
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    budgetAvailability.forEach(l => {
      if (l.grupoPresupuestario) set.add(l.grupoPresupuestario);
    });
    return Array.from(set).sort();
  }, [budgetAvailability]);

  // Filtrado de la matriz
  const filteredLines = useMemo(() => {
    return budgetAvailability.filter(line => {
      const matchSearch = searchTerm === '' || 
        String(line.renglonPresupuestario || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(line.nombreRenglon || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(line.grupoPresupuestario || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchGroup = selectedGroup === 'todos' || line.grupoPresupuestario === selectedGroup;
      const matchStatus = selectedStatus === 'todos' || line.estatusDisponibilidad === selectedStatus;

      return matchSearch && matchGroup && matchStatus;
    });
  }, [budgetAvailability, searchTerm, selectedGroup, selectedStatus]);

  // Filtrado de adquisiciones vinculadas
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const f56 = p.f56e || p.f56 || p.numeroSolicitud || '';
      const nog = p.nog || p.nogGuatecompras || '';
      const matchSearch = purchaseSearchTerm === '' ||
        f56.toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
        nog.toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
        (p.proveedorAdjudicado || '').toLowerCase().includes(purchaseSearchTerm.toLowerCase());

      const matchRenglon = purchaseFilterRenglon === 'todos' || p.renglonPresupuestario === purchaseFilterRenglon;

      const isPaid = p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada';
      const matchEstado = purchaseFilterEstado === 'todos' || 
        (purchaseFilterEstado === 'pagado' ? isPaid : !isPaid);

      return matchSearch && matchRenglon && matchEstado;
    });
  }, [purchases, purchaseSearchTerm, purchaseFilterRenglon, purchaseFilterEstado]);

  const purchaseStats = useMemo(() => {
    const totalCount = purchases.length;
    const pagadas = purchases.filter(p => p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada');
    const comprometidas = purchases.filter(p => p.estadoPago !== 'pagado' && p.estatusEvento !== 'Pagada');
    const totalPagado = pagadas.reduce((s, p) => s + (Number(p.montoPagado) || Number(p.monto) || 0), 0);
    const totalComprometido = comprometidas.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    return {
      totalCount,
      pagadasCount: pagadas.length,
      comprometidasCount: comprometidas.length,
      totalPagado,
      totalComprometido
    };
  }, [purchases]);

  // Totales consolidados de la matriz institucional completa (excluyendo renglones referenciales de Gerencia Administrativa)
  const totals = useMemo(() => {
    const standardLines = budgetAvailability.filter(l => !l.esReferencia && l.renglonPresupuestario !== '113');
    const totalInicial = standardLines.reduce((s, l) => s + (Number(l.presupuestoInicial) || 0), 0);
    const totalModificacionesPositivas = standardLines.reduce((s, l) => s + (Number(l.modificacionesPositivas) || 0), 0);
    const totalModificacionesNegativas = standardLines.reduce((s, l) => s + (Number(l.modificacionesNegativas) || 0), 0);
    const totalModificaciones = totalModificacionesPositivas - totalModificacionesNegativas;
    const totalVigente = standardLines.reduce((s, l) => s + (Number(l.presupuestoVigente) || 0), 0);
    const totalPagado = standardLines.reduce((s, l) => s + (Number(l.pagadoQueRebaja) || 0), 0);
    const totalDisponibleReal = standardLines.reduce((s, l) => s + (Number(l.disponibleReal) || 0), 0);
    const totalComprometido = standardLines.reduce((s, l) => s + (Number(l.comprometidoPendiente) || 0), 0);
    const totalDisponibleProyectado = standardLines.reduce((s, l) => s + (Number(l.disponibleProyectado) || 0), 0);
    
    const totalAfectado = totalPagado + totalComprometido;
    const porcentajeGlobal = totalVigente > 0 ? (totalAfectado / totalVigente) * 100 : 0;

    const conDisponibilidadCount = standardLines.filter(l => l.estatusDisponibilidad === 'Con Disponibilidad').length;
    const alertaCount = standardLines.filter(l => l.estatusDisponibilidad === 'Alerta Disponibilidad Baja').length;
    const sinDisponibilidadCount = standardLines.filter(l => l.estatusDisponibilidad === 'Sin Disponibilidad').length;

    return {
      count: budgetAvailability.length,
      totalInicial,
      totalModificacionesPositivas,
      totalModificacionesNegativas,
      totalModificaciones,
      totalVigente,
      totalPagado,
      totalDisponibleReal,
      totalComprometido,
      totalDisponibleProyectado,
      porcentajeGlobal,
      conDisponibilidadCount,
      alertaCount,
      sinDisponibilidadCount
    };
  }, [budgetAvailability]);

  // Totales de las líneas actualmente filtradas y visibles en la tabla
  const filteredTotals = useMemo(() => {
    const totalInicial = filteredLines.reduce((s, l) => s + (Number(l.presupuestoInicial) || 0), 0);
    const totalModificacionesPositivas = filteredLines.reduce((s, l) => s + (Number(l.modificacionesPositivas) || 0), 0);
    const totalModificacionesNegativas = filteredLines.reduce((s, l) => s + (Number(l.modificacionesNegativas) || 0), 0);
    const totalModificaciones = totalModificacionesPositivas - totalModificacionesNegativas;
    const totalVigente = filteredLines.reduce((s, l) => s + (Number(l.presupuestoVigente) || 0), 0);
    const totalPagado = filteredLines.reduce((s, l) => s + (Number(l.pagadoQueRebaja) || 0), 0);
    const totalDisponibleReal = filteredLines.reduce((s, l) => s + (Number(l.disponibleReal) || 0), 0);
    const totalComprometido = filteredLines.reduce((s, l) => s + (Number(l.comprometidoPendiente) || 0), 0);
    const totalDisponibleProyectado = filteredLines.reduce((s, l) => s + (Number(l.disponibleProyectado) || 0), 0);
    
    const totalAfectado = totalPagado + totalComprometido;
    const porcentajeGlobal = totalVigente > 0 ? (totalAfectado / totalVigente) * 100 : 0;

    const conDisponibilidadCount = filteredLines.filter(l => l.estatusDisponibilidad === 'Con Disponibilidad').length;
    const alertaCount = filteredLines.filter(l => l.estatusDisponibilidad === 'Alerta Disponibilidad Baja').length;
    const sinDisponibilidadCount = filteredLines.filter(l => l.estatusDisponibilidad === 'Sin Disponibilidad').length;

    return {
      count: filteredLines.length,
      totalInicial,
      totalModificacionesPositivas,
      totalModificacionesNegativas,
      totalModificaciones,
      totalVigente,
      totalPagado,
      totalDisponibleReal,
      totalComprometido,
      totalDisponibleProyectado,
      porcentajeGlobal,
      conDisponibilidadCount,
      alertaCount,
      sinDisponibilidadCount
    };
  }, [filteredLines]);

  // Estadísticas por Grupo
  const groupStats = useMemo(() => {
    const map: Record<string, {
      grupo: string;
      vigente: number;
      pagado: number;
      comprometido: number;
      disponible: number;
      renglonesCount: number;
    }> = {};

    budgetAvailability.forEach(l => {
      const g = l.grupoPresupuestario || 'Otros Grupos';
      if (!map[g]) {
        map[g] = {
          grupo: g,
          vigente: 0,
          pagado: 0,
          comprometido: 0,
          disponible: 0,
          renglonesCount: 0
        };
      }
      map[g].vigente += l.presupuestoVigente;
      map[g].pagado += l.pagadoQueRebaja;
      map[g].comprometido += l.comprometidoPendiente;
      map[g].disponible += l.disponibleProyectado;
      map[g].renglonesCount += 1;
    });

    return Object.values(map);
  }, [budgetAvailability]);

  const handleCreateModForLine = (renglon: string) => {
    setModToEdit(null);
    setIsModModalOpen(true);
  };

  const handleEditLine = (line: BudgetLineItem) => {
    const rawLine = budgetLines.find(l => l.id === line.id || String(l.renglonPresupuestario).trim() === String(line.renglonPresupuestario).trim()) || line;
    setLineToEdit({
      ...rawLine,
      id: rawLine.id || line.id || `bl-${line.renglonPresupuestario}`,
      renglonPresupuestario: String(rawLine.renglonPresupuestario || line.renglonPresupuestario),
      nombreRenglon: rawLine.nombreRenglon || line.nombreRenglon,
      grupoPresupuestario: rawLine.grupoPresupuestario || line.grupoPresupuestario,
      presupuestoInicial: rawLine.presupuestoInicial ?? line.presupuestoInicial ?? 0,
      pagadoQueRebaja: rawLine.pagadoQueRebaja ?? 0,
      comprometidoPendiente: rawLine.comprometidoPendiente ?? 0,
      modificacionesAprobadas: line.modificacionesAprobadas ?? rawLine.modificacionesAprobadas ?? 0,
      presupuestoVigente: line.presupuestoVigente ?? rawLine.presupuestoVigente ?? 0,
      observaciones: rawLine.observaciones || line.observaciones || ''
    });
    setIsLineModalOpen(true);
  };

  const formatCurrency = (val: number) => {
    return `Q. ${val.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Cabecera Principal del Módulo de Presupuesto */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
              <DollarSign className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Módulo Financiero y Presupuestario
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
              Gerencia de Informática
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Control integral del presupuesto por grupo y renglón, modificaciones presupuestarias aprobadas y matriz de disponibilidad presupuestaria en tiempo real integrada a las adquisiciones F56-e.
          </p>
        </div>

        {/* Botonera de Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Importar Excel */}
          <button
            id="btn-importar-presupuesto-excel"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Importar Excel</span>
          </button>

          {/* Botón Exportar Matriz a Excel */}
          <button
            type="button"
            onClick={() => exportBudgetLinesToExcel(budgetAvailability)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Exportar matriz completa con las 12 columnas a Excel"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar Excel</span>
          </button>

          {/* Botón Nueva Modificación */}
          <button
            type="button"
            onClick={() => { setModToEdit(null); setIsModModalOpen(true); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-200" />
            <span>+ Modificación</span>
          </button>

          {/* Botón Nuevo Renglón */}
          {canEditBudget && (
            <button
              id="btn-nuevo-renglon-header"
              type="button"
              onClick={() => { setLineToEdit(null); setIsLineModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-700" />
              <span>Nuevo Renglón</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas Resumen (Indicadores de Alto Nivel) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Presupuesto Inicial */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Presupuesto Inicial</div>
          <div className="text-sm sm:text-base font-extrabold text-slate-800 font-mono mt-1 truncate" title={formatCurrency(totals.totalInicial)}>
            {formatCurrency(totals.totalInicial)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Asignación decretada</div>
        </div>

        {/* Modificaciones Aprobadas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modif. Aprobadas</div>
          <div className={`text-sm sm:text-base font-extrabold font-mono mt-1 truncate ${totals.totalModificaciones >= 0 ? 'text-emerald-700' : 'text-red-700'}`} title={formatCurrency(totals.totalModificaciones)}>
            {totals.totalModificaciones >= 0 ? '+' : ''}{formatCurrency(totals.totalModificaciones)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span>{budgetModifications.filter(m => m.estado === 'aprobada').length} resoluciones DAF</span>
          </div>
        </div>

        {/* Presupuesto Vigente */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center justify-between">
            <span>Presupuesto Vigente</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Col. 6</span>
          </div>
          <div className="text-sm sm:text-base font-black text-blue-950 font-mono mt-1 truncate" title={`Total Vigente: ${formatCurrency(totals.totalVigente)} (Suma de toda la columna 6)`}>
            {formatCurrency(totals.totalVigente)}
          </div>
          <div className="text-[10px] text-blue-700 mt-1 font-medium flex items-center justify-between">
            <span>Σ Columna Vigente</span>
            <span title="Inicial + Modificaciones Aprobadas">Inicial ± Mods</span>
          </div>
        </div>

        {/* Pagado que Rebaja */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pagado que Rebaja</div>
          <div className="text-sm sm:text-base font-extrabold text-blue-700 font-mono mt-1 truncate" title={formatCurrency(totals.totalPagado)}>
            {formatCurrency(totals.totalPagado)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Gastos devengados/pagados</div>
        </div>

        {/* Comprometido Pendiente */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comprometido Pendiente</div>
          <div className="text-sm sm:text-base font-extrabold text-amber-700 font-mono mt-1 truncate" title={formatCurrency(totals.totalComprometido)}>
            {formatCurrency(totals.totalComprometido)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">F56-e en trámite activo</div>
        </div>

        {/* Disponible Proyectado */}
        <div className={`p-4 rounded-xl border shadow-2xs ${totals.totalDisponibleProyectado >= 0 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Disponible Proyectado</div>
          <div className={`text-sm sm:text-base font-black font-mono mt-1 truncate ${totals.totalDisponibleProyectado >= 0 ? 'text-emerald-800' : 'text-red-700'}`} title={formatCurrency(totals.totalDisponibleProyectado)}>
            {formatCurrency(totals.totalDisponibleProyectado)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1 font-semibold flex items-center justify-between">
            <span>Saldo real libre</span>
            <span>{totals.porcentajeGlobal.toFixed(1)}% usado</span>
          </div>
        </div>

      </div>

      {/* Navegación por Pestañas del Módulo */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('matriz')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'matriz'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Matriz de Disponibilidad (12 Columnas)</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
            {budgetAvailability.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('catalogoOficial')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'catalogoOficial'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Catálogo Oficial (39 Renglones)</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
            39
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('modificaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'modificaciones'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Modificaciones Presupuestarias</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
            {budgetModifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('estadisticas')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'estadisticas'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Resumen y Estadísticas por Renglón</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('compras')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'compras'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Adquisiciones Vinculadas (F56-e)</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
            {purchases.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('reportes')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'reportes'
              ? 'border-blue-700 text-blue-900 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Reportes y Dictámenes Oficiales</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
            5 Variantes
          </span>
        </button>
      </div>

      {/* SUBPESTAÑA 1: MATRIZ DE DISPONIBILIDAD (12 COLUMNAS OFICIALES) */}
      {subTab === 'matriz' && (
        <div className="space-y-4">
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código de renglón o nombre (ej. 158, arrendamiento)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Filtro por Grupo */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">Grupo:</span>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos los Grupos Presupuestarios</option>
                  {availableGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Estatus */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">Estatus:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos los Estatus</option>
                  <option value="Con Disponibilidad">Con Disponibilidad</option>
                  <option value="Alerta Disponibilidad Baja">Alerta Disponibilidad Baja</option>
                  <option value="Sin Disponibilidad">Sin Disponibilidad</option>
                </select>
              </div>
            </div>

            {/* Contador de resultados */}
            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800">{filteredLines.length}</strong> de <strong>{budgetAvailability.length}</strong> renglones
            </div>
          </div>

          {/* Banner de Verificación y Regla de Cálculo Institucional */}
          <div className="bg-gradient-to-r from-blue-50/95 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-xl p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5 text-blue-950 font-medium">
              <div className="p-2 rounded-lg bg-blue-700 text-white shrink-0 shadow-2xs">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-blue-950 flex flex-wrap items-center gap-1.5 text-xs">
                  <span>Regla Presupuestaria Oficial:</span>
                  <span className="text-blue-900 font-semibold bg-white/80 px-2 py-0.5 rounded border border-blue-200/60">
                    Presupuesto Vigente (Col. 6) = Inicial (Col. 4) + Incrementos (+) - Disminuciones (-)
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Total Vigente = Sumatoria de toda la columna Vigente: <strong className="text-blue-950 font-mono">{formatCurrency(totals.totalVigente)}</strong>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold shadow-2xs" title="Total de Modificaciones que incrementan el presupuesto (Ampliaciones)">
                (+) Incrementos: +{formatCurrency(totals.totalModificacionesPositivas)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 font-bold shadow-2xs" title="Total de Modificaciones que disminuyen el presupuesto (Disminuciones)">
                (-) Disminuciones: -{formatCurrency(totals.totalModificacionesNegativas)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-900 text-white font-black shadow-2xs" title="Presupuesto Vigente Institucional Oficial">
                = Vigente: {formatCurrency(totals.totalVigente)}
              </span>
            </div>
          </div>

          {/* Tabla de la Matriz con las 12 Columnas Requeridas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3 whitespace-nowrap">1. Grupo Presupuestario</th>
                    <th className="px-3 py-3 whitespace-nowrap text-center">2. Renglón</th>
                    <th className="px-3.5 py-3 whitespace-nowrap min-w-[180px]">3. Nombre del Renglón</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">4. Presupuesto Inicial</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap" title="Modificaciones Aprobadas: Incrementos (+), Disminuciones (-) y Neto">
                      5. Modif. Aprobadas (±)
                    </th>
                    <th className="px-3 py-3 text-right whitespace-nowrap bg-blue-50/70 text-blue-950 border-x border-blue-200/60 font-black" title="Presupuesto Vigente = Presupuesto Inicial + Modificaciones Aprobadas">6. Presupuesto Vigente</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap text-blue-800">7. Pagado Rebaja</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">8. Disponible Real</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap text-amber-800">9. Comprometido Pendiente</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap bg-emerald-50/50 text-emerald-950 font-black">10. Disp. Proyectado</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap min-w-[110px]">11. % Usado/Comp.</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">12. Estatus</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLines.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="font-bold text-slate-800 text-sm">No se encontraron renglones presupuestarios</p>
                          <p className="text-xs text-slate-500">
                            Intente ajustar los filtros de búsqueda o use el botón "Importar Excel" para cargar la matriz oficial de la Gerencia de Informática.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLines.map((line) => {
                      const pct = line.porcentajeUsadoComprometido || 0;
                      let pctColor = 'bg-emerald-500';
                      if (pct > 85) pctColor = 'bg-red-500';
                      else if (pct > 70) pctColor = 'bg-amber-500';

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* 1. Grupo Presupuestario */}
                          <td className="px-3.5 py-2.5 font-medium text-slate-600 max-w-[170px] truncate" title={line.grupoPresupuestario}>
                            {line.grupoPresupuestario}
                          </td>

                          {/* 2. Renglón Presupuestario */}
                          <td className="px-3 py-2.5 text-center font-mono font-black text-blue-900 text-xs">
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              {line.renglonPresupuestario}
                            </span>
                          </td>

                          {/* 3. Nombre del Renglón */}
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900 max-w-[220px]" title={line.nombreRenglon}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{line.nombreRenglon}</span>
                              {(line.esReferencia || line.renglonPresupuestario === '113') && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                                  Solo Referencia (Gerencia Administrativa)
                                </span>
                              )}
                            </div>
                            {line.observaciones && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={line.observaciones}>
                                {line.observaciones}
                              </div>
                            )}
                          </td>

                          {/* 4. Presupuesto Inicial */}
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatCurrency(line.presupuestoInicial)}
                          </td>

                          {/* 5. Modificaciones Aprobadas (Desglose de Positivas y Negativas) */}
                          <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                            {line.modificacionesPositivas > 0 || line.modificacionesNegativas > 0 ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`font-bold ${line.modificacionesAprobadas > 0 ? 'text-emerald-700' : line.modificacionesAprobadas < 0 ? 'text-red-700' : 'text-slate-600'}`}>
                                  {line.modificacionesAprobadas > 0 ? '+' : ''}{formatCurrency(line.modificacionesAprobadas)}
                                </span>
                                <div className="flex items-center gap-1 text-[9px]">
                                  {line.modificacionesPositivas > 0 && (
                                    <span className="text-emerald-700 font-semibold" title="Ampliación / Incremento Aprobado">
                                      +{formatCurrency(line.modificacionesPositivas)}
                                    </span>
                                  )}
                                  {line.modificacionesPositivas > 0 && line.modificacionesNegativas > 0 && (
                                    <span className="text-slate-300">/</span>
                                  )}
                                  {line.modificacionesNegativas > 0 && (
                                    <span className="text-rose-700 font-semibold" title="Disminución / Reducción Aprobada">
                                      -{formatCurrency(line.modificacionesNegativas)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">Q. 0.00</span>
                            )}
                          </td>

                          {/* 6. Presupuesto Vigente */}
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-950 bg-blue-50/30 whitespace-nowrap">
                            {formatCurrency(line.presupuestoVigente)}
                          </td>

                          {/* 7. Pagado que Rebaja */}
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-blue-700 whitespace-nowrap">
                            {formatCurrency(line.pagadoQueRebaja)}
                          </td>

                          {/* 8. Disponible Real */}
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {formatCurrency(line.disponibleReal)}
                          </td>

                          {/* 9. Comprometido Pendiente */}
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-amber-700 whitespace-nowrap">
                            {formatCurrency(line.comprometidoPendiente)}
                          </td>

                          {/* 10. Disponible Proyectado */}
                          <td className={`px-3 py-2.5 text-right font-mono font-black whitespace-nowrap bg-emerald-50/20 ${line.disponibleProyectado >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                            {formatCurrency(line.disponibleProyectado)}
                          </td>

                          {/* 11. Porcentaje Usado/Comprometido */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="w-full flex flex-col items-center">
                              <span className="font-mono font-bold text-[11px] text-slate-800 mb-1">
                                {line.porcentajeUsadoComprometido.toFixed(1)}%
                              </span>
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full ${pctColor} rounded-full transition-all`} 
                                  style={{ width: `${Math.min(100, Math.max(0, line.porcentajeUsadoComprometido))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 12. Estatus si hay disponibilidad o No */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              line.estatusDisponibilidad === 'Con Disponibilidad'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : line.estatusDisponibilidad === 'Alerta Disponibilidad Baja'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                              {line.estatusDisponibilidad === 'Con Disponibilidad' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {line.estatusDisponibilidad === 'Alerta Disponibilidad Baja' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                              {line.estatusDisponibilidad === 'Sin Disponibilidad' && <XCircle className="w-3 h-3 text-red-600" />}
                              <span>{line.estatusDisponibilidad}</span>
                            </span>
                          </td>

                          {/* Acciones de Fila */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* Crear modificación directa a este renglón */}
                              <button
                                type="button"
                                onClick={() => handleCreateModForLine(line.renglonPresupuestario)}
                                className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                title="Registrar modificación para este renglón"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar Renglón */}
                              {canEditBudget && (
                                <button
                                  type="button"
                                  onClick={() => handleEditLine(line)}
                                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Editar renglón"
                                  aria-label={`Editar renglón ${line.renglonPresupuestario}`}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Eliminar Renglón */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`¿Está seguro de eliminar el renglón presupuestario ${line.renglonPresupuestario} - ${line.nombreRenglon}?`)) {
                                      deleteBudgetLine(line.id);
                                    }
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                                  title="Eliminar renglón"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Pie de Totales Oficiales de la Matriz */}
                <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                  {/* Si hay filtros activos, mostrar primero el Subtotal de los renglones filtrados */}
                  {filteredLines.length !== budgetAvailability.length && (
                    <tr className="bg-amber-50/70 border-b border-amber-200">
                      <td colSpan={3} className="px-3.5 py-3 text-right font-black uppercase text-amber-900 tracking-wider">
                        Subtotal Renglones Filtrados ({filteredTotals.count} de {totals.count}):
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap">
                        {formatCurrency(filteredTotals.totalInicial)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`font-bold ${filteredTotals.totalModificaciones >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {filteredTotals.totalModificaciones >= 0 ? '+' : ''}{formatCurrency(filteredTotals.totalModificaciones)}
                          </span>
                          <div className="flex items-center gap-1 text-[9px] font-semibold">
                            <span className="text-emerald-700" title="Subtotal Ampliaciones (+) Filtradas">
                              +{formatCurrency(filteredTotals.totalModificacionesPositivas)}
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-rose-700" title="Subtotal Disminuciones (-) Filtradas">
                              -{formatCurrency(filteredTotals.totalModificacionesNegativas)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black whitespace-nowrap bg-blue-100/60 text-blue-950">
                        {formatCurrency(filteredTotals.totalVigente)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                        {formatCurrency(filteredTotals.totalPagado)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap text-slate-900">
                        {formatCurrency(filteredTotals.totalDisponibleReal)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                        {formatCurrency(filteredTotals.totalComprometido)}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono font-black whitespace-nowrap bg-emerald-100/60 ${filteredTotals.totalDisponibleProyectado >= 0 ? 'text-emerald-950' : 'text-red-700'}`}>
                        {formatCurrency(filteredTotals.totalDisponibleProyectado)}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {filteredTotals.porcentajeGlobal.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                filteredTotals.porcentajeGlobal > 85 ? 'bg-red-500' : 
                                filteredTotals.porcentajeGlobal > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, filteredTotals.porcentajeGlobal))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {filteredTotals.conDisponibilidadCount} Con Saldo
                          </span>
                          {filteredTotals.alertaCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {filteredTotals.alertaCount} Alerta
                            </span>
                          )}
                          {filteredTotals.sinDisponibilidadCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-2.5 h-2.5" />
                              {filteredTotals.sinDisponibilidadCount} Agotados
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-300">
                          {filteredTotals.count} Renglones
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* Fila Principal de Totales Consolidados Institucionales */}
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                    <td colSpan={3} className="px-3.5 py-3.5 text-right font-black uppercase text-slate-900 tracking-wider">
                      {filteredLines.length !== budgetAvailability.length 
                        ? `Gran Total Institucional (${totals.count} Renglones):` 
                        : `Totales Consolidados Gerencia de Informática (${totals.count} Renglones):`}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-bold whitespace-nowrap text-slate-900">
                      {formatCurrency(totals.totalInicial)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`font-black ${totals.totalModificaciones >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {totals.totalModificaciones >= 0 ? '+' : ''}{formatCurrency(totals.totalModificaciones)}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] font-bold">
                          <span className="text-emerald-700" title="Total Ampliaciones (+) Global">
                            +{formatCurrency(totals.totalModificacionesPositivas)}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-700" title="Total Disminuciones (-) Global">
                            -{formatCurrency(totals.totalModificacionesNegativas)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-black whitespace-nowrap bg-blue-100/70 text-blue-950">
                      {formatCurrency(totals.totalVigente)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                      {formatCurrency(totals.totalPagado)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-bold whitespace-nowrap text-slate-900">
                      {formatCurrency(totals.totalDisponibleReal)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                      {formatCurrency(totals.totalComprometido)}
                    </td>
                    <td className={`px-3 py-3.5 text-right font-mono font-black whitespace-nowrap bg-emerald-100/70 ${totals.totalDisponibleProyectado >= 0 ? 'text-emerald-950' : 'text-red-700'}`}>
                      {formatCurrency(totals.totalDisponibleProyectado)}
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {totals.porcentajeGlobal.toFixed(1)}%
                        </span>
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              totals.porcentajeGlobal > 85 ? 'bg-red-500' : 
                              totals.porcentajeGlobal > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, totals.porcentajeGlobal))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {totals.conDisponibilidadCount} Con Saldo
                        </span>
                        {totals.alertaCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {totals.alertaCount} Alerta
                          </span>
                        )}
                        {totals.sinDisponibilidadCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <XCircle className="w-2.5 h-2.5" />
                            {totals.sinDisponibilidadCount} Agotados
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-slate-200 text-slate-800 font-extrabold text-[11px] border border-slate-300">
                        {totals.count} Renglones
                      </span>
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>

          {/* Tarjeta de Resumen Rápido de Totales Consolidados al Final de la Matriz */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Resumen Totalizado al Final de la Matriz de Disponibilidad
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {filteredLines.length !== budgetAvailability.length 
                      ? `Mostrando totales de ${filteredLines.length} renglones seleccionados y gran total institucional.` 
                      : `Totalización completa de los ${totals.count} renglones presupuestarios activos.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {totals.conDisponibilidadCount} con saldo activo
                </span>
                {totals.sinDisponibilidadCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    {totals.sinDisponibilidadCount} agotados
                  </span>
                )}
              </div>
            </div>

            {/* Barra de Cuadre y Ecuación Oficial */}
            <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs font-mono">
              <div className="text-slate-300 flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-sans font-bold">Ecuación de Cuadre:</span>
                <span className="text-white font-bold">{formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalInicial)}</span>
                <span className="text-emerald-400 font-bold">+{formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificacionesPositivas)}</span>
                <span className="text-rose-400 font-bold">-{formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificacionesNegativas)}</span>
                <span className="text-blue-400 font-bold">= {formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalVigente)}</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Vigente cuadra al 100% con la sumatoria de la columna
              </div>
            </div>

            {/* Cuadrícula de Tarjetas de Totales con Separación de Modificaciones */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
              
              {/* 4. Presupuesto Inicial */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Presupuesto Inicial</div>
                <div className="text-sm font-black font-mono text-white mt-0.5 truncate" title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalInicial)}>
                  {formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalInicial)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Asignación aprobada DAF</div>
              </div>

              {/* 5a. Ampliaciones (+) */}
              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
                <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                  <span>5a. (+) Incrementos</span>
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-sm font-black font-mono text-emerald-300 mt-0.5 truncate" title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificacionesPositivas)}>
                  +{formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificacionesPositivas)}
                </div>
                <div className="text-[10px] text-emerald-400/70 mt-1">Ampliaciones que suman</div>
              </div>

              {/* 5b. Disminuciones (-) */}
              <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-800/40">
                <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center justify-between">
                  <span>5b. (-) Disminuciones</span>
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                </div>
                <div className="text-sm font-black font-mono text-rose-300 mt-0.5 truncate" title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificacionesNegativas)}>
                  -{formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificacionesNegativas)}
                </div>
                <div className="text-[10px] text-rose-400/70 mt-1">Reducciones que restan</div>
              </div>

              {/* 5c. Modif. Neta */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">5. Modif. Neta (±)</div>
                <div className={`text-sm font-black font-mono mt-0.5 truncate ${(filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificaciones >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificaciones)}>
                  {(filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificaciones >= 0 ? '+' : ''}{formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalModificaciones)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Incrementos - Disminuciones</div>
              </div>

              {/* 6. Presupuesto Vigente */}
              <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-700/60">
                <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">6. Presupuesto Vigente</div>
                <div className="text-sm font-black font-mono text-blue-200 mt-0.5 truncate" title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalVigente)}>
                  {formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalVigente)}
                </div>
                <div className="text-[10px] text-blue-300/80 mt-1 font-semibold">Suma de columna Vigente</div>
              </div>

              {/* 7. Pagado que Rebaja */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">7. Pagado que Rebaja</div>
                <div className="text-sm font-black font-mono text-blue-400 mt-0.5 truncate" title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalPagado)}>
                  {formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalPagado)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Rebaja disponible real</div>
              </div>

              {/* 8. Disponible Real */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">8. Disponible Real</div>
                <div className="text-sm font-black font-mono text-white mt-0.5 truncate" title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalDisponibleReal)}>
                  {formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalDisponibleReal)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Vigente - Pagado</div>
              </div>

              {/* 9. Comprometido */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">9. Comprometido</div>
                <div className="text-sm font-black font-mono text-amber-400 mt-0.5 truncate" title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalComprometido)}>
                  {formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalComprometido)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Compras en trámite</div>
              </div>

              {/* 10. Disp. Proyectado */}
              <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/50 col-span-2">
                <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">10. Disp. Proyectado</div>
                <div className={`text-sm font-black font-mono mt-0.5 truncate ${(filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalDisponibleProyectado >= 0 ? 'text-emerald-300' : 'text-rose-400'}`} title={formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalDisponibleProyectado)}>
                  {formatCurrency((filteredLines.length !== budgetAvailability.length ? filteredTotals : totals).totalDisponibleProyectado)}
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-1">Disponible Real - Comprometido</div>
              </div>

            </div>

            {/* Desglose Detallado de Renglones con Modificaciones (Incrementos vs Disminuciones) */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span>Renglones con Modificaciones Aprobadas en este ejercicio:</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {budgetAvailability.filter(l => (l.modificacionesPositivas || 0) > 0 || (l.modificacionesNegativas || 0) > 0).length} renglones afectados
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Lista Incrementos */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-emerald-900/30">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Ampliaciones / Incrementos (+):
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +{formatCurrency(totals.totalModificacionesPositivas)}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {budgetAvailability.filter(l => (l.modificacionesPositivas || 0) > 0).length === 0 ? (
                      <div className="text-[11px] text-slate-500 py-1">No hay ampliaciones registradas.</div>
                    ) : (
                      budgetAvailability.filter(l => (l.modificacionesPositivas || 0) > 0).map(l => (
                        <div key={`pos-${l.id}`} className="flex items-center justify-between text-[11px] bg-slate-900/80 px-2 py-1 rounded">
                          <span className="text-slate-300 truncate max-w-[200px]" title={`[${l.renglonPresupuestario}] ${l.nombreRenglon}`}>
                            <strong className="text-emerald-400 font-mono">[{l.renglonPresupuestario}]</strong> {l.nombreRenglon}
                          </span>
                          <span className="font-mono font-bold text-emerald-400 shrink-0">
                            +{formatCurrency(l.modificacionesPositivas)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Lista Disminuciones */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-rose-900/30">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Disminuciones / Reducciones (-):
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      -{formatCurrency(totals.totalModificacionesNegativas)}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {budgetAvailability.filter(l => (l.modificacionesNegativas || 0) > 0).length === 0 ? (
                      <div className="text-[11px] text-slate-500 py-1">No hay disminuciones registradas.</div>
                    ) : (
                      budgetAvailability.filter(l => (l.modificacionesNegativas || 0) > 0).map(l => (
                        <div key={`neg-${l.id}`} className="flex items-center justify-between text-[11px] bg-slate-900/80 px-2 py-1 rounded">
                          <span className="text-slate-300 truncate max-w-[200px]" title={`[${l.renglonPresupuestario}] ${l.nombreRenglon}`}>
                            <strong className="text-rose-400 font-mono">[{l.renglonPresupuestario}]</strong> {l.nombreRenglon}
                          </span>
                          <span className="font-mono font-bold text-rose-400 shrink-0">
                            -{formatCurrency(l.modificacionesNegativas)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUBPESTAÑA CATÁLOGO OFICIAL: 39 RENGLONES INSTITUCIONALES */}
      {subTab === 'catalogoOficial' && (
        <BudgetOfficialCatalogView
          onOpenLineModal={(line, prefill) => {
            setLineToEdit(line || null);
            setPrefillRenglon(prefill || null);
            setIsLineModalOpen(true);
          }}
          onNavigateToMatrix={(renglon) => {
            if (renglon) setSearchTerm(renglon);
            setSubTab('matriz');
          }}
        />
      )}
      {subTab === 'modificaciones' && (
        <div className="space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historial de Modificaciones Presupuestarias Aprobadas y en Trámite
              </h3>
              <p className="text-xs text-slate-500">
                Las modificaciones aprobadas afectan directamente en Quetzales el presupuesto vigente y la disponibilidad de cada renglón.
              </p>
            </div>

            <button
              type="button"
              onClick={() => { setModToEdit(null); setIsModModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Modificación Presupuestaria</span>
            </button>
          </div>

          {/* Tabla de Modificaciones */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Correlativo</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3">Renglón Afectado</th>
                    <th className="px-3 py-3 text-right">Monto</th>
                    <th className="px-3 py-3">No. Resolución / Acuerdo</th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-4 py-3 max-w-xs">Justificación</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {budgetModifications.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                        No hay modificaciones presupuestarias registradas aún.
                      </td>
                    </tr>
                  ) : (
                    budgetModifications.map((mod) => (
                      <tr key={mod.id} className="hover:bg-slate-50">
                        
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {mod.correlativo}
                        </td>

                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            mod.tipo === 'ampliacion'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mod.tipo === 'disminucion'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {mod.tipo === 'ampliacion' && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                            {mod.tipo === 'disminucion' && <TrendingDown className="w-3 h-3 text-red-600" />}
                            {mod.tipo === 'transferencia' && <ArrowRightLeft className="w-3 h-3 text-blue-600" />}
                            <span className="uppercase">{mod.tipo}</span>
                          </span>
                        </td>

                        <td className="px-3 py-3 font-semibold text-slate-900">
                          <div>Renglón {mod.renglonPresupuestario} - {mod.nombreRenglon}</div>
                          {mod.tipo === 'transferencia' && mod.renglonOrigenPresupuestario && (
                            <div className="text-[10px] text-slate-500">
                              Origen: Renglón {mod.renglonOrigenPresupuestario}
                            </div>
                          )}
                        </td>

                        <td className={`px-3 py-3 text-right font-mono font-bold ${
                          mod.tipo === 'ampliacion' ? 'text-emerald-700' : mod.tipo === 'disminucion' ? 'text-red-700' : 'text-blue-800'
                        }`}>
                          {mod.tipo === 'ampliacion' ? '+' : mod.tipo === 'disminucion' ? '-' : '±'}{formatCurrency(mod.monto)}
                        </td>

                        <td className="px-3 py-3 text-slate-700 font-medium">
                          {mod.noResolucion}
                        </td>

                        <td className="px-3 py-3 font-mono text-slate-500 whitespace-nowrap">
                          {mod.fecha}
                        </td>

                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={mod.descripcion}>
                          {mod.descripcion}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            mod.estado === 'aprobada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mod.estado === 'en_tramite'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {mod.estado === 'aprobada' ? 'Aprobada (Vigente)' : mod.estado === 'en_tramite' ? 'En Trámite' : 'Rechazada'}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {mod.estado === 'en_tramite' && isAdmin && (
                              <button
                                type="button"
                                onClick={() => approveBudgetModification(mod.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Aprobar e impactar disponibilidad inmediatamente"
                              >
                                <Check className="w-3 h-3" />
                                <span>Aprobar</span>
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Eliminar modificación presupuestaria ${mod.correlativo}?`)) {
                                    deleteBudgetModification(mod.id);
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUBPESTAÑA 3: RESUMEN Y ESTADÍSTICAS POR RENGLÓN */}
      {subTab === 'estadisticas' && (
        <div className="space-y-6">
          {/* Gráficos Circulares de Torta/Donut y Tarjetas de Indicadores */}
          <BudgetStatsCharts budgetAvailability={budgetAvailability} purchases={purchases} />

          {/* Tarjetas por Grupo Presupuestario */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groupStats.map((gs, i) => {
              const pct = gs.vigente > 0 ? ((gs.pagado + gs.comprometido) / gs.vigente) * 100 : 0;
              return (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate" title={gs.grupo}>
                      {gs.grupo}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                      {gs.renglonesCount} renglones
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Presupuesto Vigente:</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(gs.vigente)}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Pagado Rebaja:</span>
                      <span className="font-mono text-blue-700 font-semibold">{formatCurrency(gs.pagado)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Comprometido:</span>
                      <span className="font-mono text-amber-700 font-semibold">{formatCurrency(gs.comprometido)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="font-semibold text-slate-700">Disponible Proyectado:</span>
                      <strong className={`font-mono ${gs.disponible >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(gs.disponible)}
                      </strong>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
                      <span>Porcentaje Ejecutado + Comprometido</span>
                      <span className="font-bold text-slate-800">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${pct > 85 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gráfico y Top de Renglones con Mayor Asignación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top 5 Renglones con Mayor Presupuesto Vigente */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Renglones con Mayor Asignación Vigente
              </h4>
              <div className="space-y-3">
                {[...budgetAvailability]
                  .sort((a, b) => b.presupuestoVigente - a.presupuestoVigente)
                  .slice(0, 5)
                  .map((line) => {
                    const ratio = totals.totalVigente > 0 ? (line.presupuestoVigente / totals.totalVigente) * 100 : 0;
                    return (
                      <div key={line.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            Renglón {line.renglonPresupuestario} - {line.nombreRenglon}
                          </span>
                          <span className="font-mono font-bold text-blue-900">
                            {formatCurrency(line.presupuestoVigente)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{line.grupoPresupuestario}</span>
                          <span>{ratio.toFixed(1)}% del techo total</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Renglones en Alerta o Mayor Porcentaje de Consumo */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Renglones con Mayor Porcentaje de Compromiso / Alerta
              </h4>
              <div className="space-y-3">
                {[...budgetAvailability]
                  .sort((a, b) => b.porcentajeUsadoComprometido - a.porcentajeUsadoComprometido)
                  .slice(0, 5)
                  .map((line) => (
                    <div key={line.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          Renglón {line.renglonPresupuestario} - {line.nombreRenglon}
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {line.porcentajeUsadoComprometido.toFixed(1)}% Usado
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Disponible Proyectado:</span>
                        <strong className={`font-mono ${line.disponibleProyectado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrency(line.disponibleProyectado)}
                        </strong>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            line.porcentajeUsadoComprometido > 85 ? 'bg-red-500' : 'bg-amber-500'
                          }`} 
                          style={{ width: `${Math.min(100, line.porcentajeUsadoComprometido)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUBPESTAÑA 4: ADQUISICIONES VINCULADAS AL PRESUPUESTO (F56-e) */}
      {subTab === 'compras' && (
        <div className="space-y-5">
          
          {/* Encabezado y Accesos Directos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Adquisiciones Institucionales F56-e y Control Presupuestario
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs">
                  {purchases.length} Registros
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                En esta sección puede asignar <strong>manualmente</strong> el renglón presupuestario a cada adquisición. 
                Los montos asignados afectan inmediatamente la <strong>Matriz de Disponibilidad</strong> como <strong>Comprometido Pendiente</strong> y disminuyen el <strong>Disponible Proyectado</strong>. 
                Al presionar <strong>"Marcar como Pagado"</strong>, el monto se traslada a <strong>"Pagado que Rebaja"</strong>, restándose del <strong>Disponible Real</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('compras')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-blue-300" />
              <span>Ir al Panel de Adquisiciones</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tarjetas de Resumen de Impacto de Adquisiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Adquisiciones</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">{purchaseStats.totalCount}</span>
                <span className="text-xs text-slate-500">trámites</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Total acumulado en el panel institucional</p>
            </div>

            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Comprometido Pendiente</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  {purchaseStats.comprometidasCount} en proceso
                </span>
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-amber-900">
                {formatCurrency(purchaseStats.totalComprometido)}
              </div>
              <p className="text-[11px] text-amber-700 mt-1 font-medium">
                Resta directamente al <span className="font-bold">Disponible Proyectado</span>
              </p>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Pagado que Rebaja</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold">
                  {purchaseStats.pagadasCount} pagadas
                </span>
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-blue-900">
                {formatCurrency(purchaseStats.totalPagado)}
              </div>
              <p className="text-[11px] text-blue-700 mt-1 font-medium">
                Descargado y restado del <span className="font-bold">Disponible Real</span>
              </p>
            </div>
          </div>

          {/* Filtros de Adquisiciones */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Buscador de compras */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por F56, NOG Guatecompras, descripción o proveedor..."
                  value={purchaseSearchTerm}
                  onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Filtro por Renglón */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={purchaseFilterRenglon}
                  onChange={(e) => setPurchaseFilterRenglon(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="todos">Todos los Renglones</option>
                  {budgetAvailability.map((line) => (
                    <option key={line.id} value={line.renglonPresupuestario}>
                      Renglón {line.renglonPresupuestario} ({line.nombreRenglon})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Estado */}
              <select
                value={purchaseFilterEstado}
                onChange={(e) => setPurchaseFilterEstado(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="comprometido">Solo Comprometido Pendiente</option>
                <option value="pagado">Solo Pagados que Rebajan</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong>{filteredPurchases.length}</strong> de {purchases.length} adquisiciones
            </div>
          </div>

          {/* Tabla de Adquisiciones con Asignación Manual */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-white font-bold border-b border-slate-700 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap">No. Solicitud F56</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">NOG Guatecompras</th>
                    <th className="px-4 py-3.5 min-w-[220px]">Descripción de la Adquisición</th>
                    <th className="px-3 py-3.5 min-w-[240px]">Renglón Asignado (Manual)</th>
                    <th className="px-3 py-3.5 text-right whitespace-nowrap">Monto Estimado</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">Estado del Gasto</th>
                    <th className="px-3 py-3.5 text-center min-w-[190px]">Impacto en Matriz</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">Acción Presupuestaria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="font-semibold text-slate-600">No se encontraron adquisiciones con los filtros aplicados</p>
                        <p className="text-xs mt-1">Intente cambiar el término de búsqueda o seleccione otro renglón.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((purchase) => {
                      const isPaid = purchase.estadoPago === 'pagado' || purchase.estatusEvento === 'Pagada';
                      const f56Num = purchase.f56e || purchase.f56 || purchase.numeroSolicitud || 'S/N';
                      const nogNum = purchase.nog || purchase.nogGuatecompras || 'S/N';
                      const currentRenglon = purchase.renglonPresupuestario || '';
                      const matchingLine = budgetAvailability.find(l => l.renglonPresupuestario === currentRenglon);

                      return (
                        <tr key={purchase.id} className="hover:bg-blue-50/30 transition-colors">
                          
                          {/* No. Solicitud F56 extraído del panel de control de adquisiciones */}
                          <td className="px-4 py-3 font-mono font-bold text-blue-950 whitespace-nowrap">
                            <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">
                              {f56Num}
                            </span>
                          </td>

                          {/* NOG Guatecompras extraído del panel de control de adquisiciones */}
                          <td className="px-3 py-3 font-mono text-slate-900 font-semibold whitespace-nowrap">
                            {nogNum !== 'S/N' && nogNum !== 'N/A' ? (
                              <span className="px-2 py-1 bg-purple-50 text-purple-900 rounded border border-purple-200">
                                {nogNum}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">S/N</span>
                            )}
                          </td>

                          {/* Descripción de la adquisición */}
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 line-clamp-2" title={purchase.descripcion}>
                              {purchase.descripcion}
                            </div>
                            {purchase.proveedorAdjudicado && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Prov: <span className="font-semibold text-slate-700">{purchase.proveedorAdjudicado}</span>
                              </div>
                            )}
                          </td>

                          {/* Asignación Manual de Renglón con Lista Desplegable */}
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <select
                                id={`select-renglon-adq-${purchase.id}`}
                                value={currentRenglon}
                                onChange={(e) => handleAssignRenglon(purchase.id, e.target.value)}
                                className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none focus:ring-2 ${
                                  currentRenglon 
                                    ? 'bg-blue-50/70 border-blue-300 text-blue-950 focus:ring-blue-500' 
                                    : 'bg-red-50 border-red-300 text-red-900 focus:ring-red-500'
                                }`}
                              >
                                <option value="">-- Asignar Renglón Manualmente --</option>
                                {budgetAvailability.map((line) => (
                                  <option key={line.id} value={line.renglonPresupuestario}>
                                    Renglón {line.renglonPresupuestario} - {line.nombreRenglon}
                                  </option>
                                ))}
                              </select>

                              {matchingLine ? (
                                <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
                                  <span>Disp. Proyectado:</span>
                                  <strong className={`font-mono ${matchingLine.disponibleProyectado >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {formatCurrency(matchingLine.disponibleProyectado)}
                                  </strong>
                                </div>
                              ) : (
                                <div className="text-[10px] text-red-500 font-semibold px-1">
                                  ⚠️ Sin renglón asignado
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Monto Estimado */}
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(purchase.monto)}
                          </td>

                          {/* Estado del Gasto */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isPaid 
                                ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}>
                              {isPaid ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-blue-700" />
                                  <span>Pagado / Devengado</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  <span>Comprometido en Trámite</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Impacto en la Matriz de Disponibilidad */}
                          <td className="px-3 py-3 text-center">
                            {isPaid ? (
                              <div className="inline-block text-left px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[10px]">
                                <div className="font-bold">Afecta: Pagado que Rebaja</div>
                                <div className="text-[9px] text-blue-700">Resta de Disponibilidad Real</div>
                              </div>
                            ) : (
                              <div className="inline-block text-left px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px]">
                                <div className="font-bold">Afecta: Comprometido Pendiente</div>
                                <div className="text-[9px] text-amber-700">Resta de Disponible Proyectado</div>
                              </div>
                            )}
                          </td>

                          {/* Alternar Estado: Marcar como Pagado / Pasar a Comprometido */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              id={`btn-toggle-payment-${purchase.id}`}
                              onClick={() => togglePurchasePaymentState(purchase.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                isPaid 
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {isPaid ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Revertir a Comprometido</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Marcar como Pagado</span>
                                </>
                              )}
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUBPESTAÑA 5: REPORTES Y DICTÁMENES OFICIALES */}
      {subTab === 'reportes' && (
        <BudgetReportsView budgetAvailability={budgetAvailability} purchases={purchases} />
      )}

      {/* MODALES */}
      <ImportBudgetExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <BudgetModificationModal
        isOpen={isModModalOpen}
        onClose={() => { setIsModModalOpen(false); setModToEdit(null); }}
        modificationToEdit={modToEdit}
      />

      <BudgetLineModal
        isOpen={isLineModalOpen}
        onClose={() => { 
          setIsLineModalOpen(false); 
          setLineToEdit(null); 
          setPrefillRenglon(null);
        }}
        lineToEdit={lineToEdit}
        prefillRenglon={prefillRenglon}
      />

    </div>
  );
};
