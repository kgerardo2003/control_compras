import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  PlusCircle, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  ArrowUpDown,
  Paperclip,
  CheckCircle2,
  RefreshCw,
  Database,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  Square,
  MinusSquare,
  ShieldAlert,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { PurchaseRecord } from '../types';
import { formatQuetzales, formatDate, exportToCSV, getModalidadCompraByMonto } from '../utils/formatters';
import { ExportPdfModal } from './ExportPdfModal';
import { generatePurchasesPDF } from '../utils/pdfExport';
import { downloadDocumentFile } from '../utils/documentUtils';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  'Adjudicación': 'bg-blue-100 text-blue-700',
  'Evaluación': 'bg-amber-100 text-amber-700',
  'Prescindido': 'bg-red-100 text-red-700',
  'Desierto': 'bg-slate-100 text-slate-700',
};

export const PurchasesView: React.FC = () => {
  const { 
    purchases, 
    catalogs, 
    setIsPurchaseModalOpen, 
    setPurchaseToEdit, 
    setSelectedPurchase, 
    deletePurchase,
    deletePurchases,
    currentUser,
    logAudit,
    themeConfig,
    showToast,
    firestoreStatus,
    refreshPurchases,
    setIsImportModalOpen
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstatus, setFilterEstatus] = useState('todos');
  const [filterGIT, setFilterGIT] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todos');
  const [sortBy, setSortBy] = useState<'fecha' | 'monto' | 'nog'>('fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [itemToDelete, setItemToDelete] = useState<PurchaseRecord | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  // Estados de selección múltiple y eliminación masiva
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Estados de sincronización en tiempo real con Firestore
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setLastSyncTime(new Date());
  }, [purchases]);

  // Forzar sincronización directa omitiendo cualquier caché de navegador
  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await refreshPurchases();
      setLastSyncTime(new Date());
      showToast({
        type: 'info',
        title: 'Sincronización Completada',
        message: 'Registros actualizados desde Firestore Cloud.',
        duration: 3000
      });
    } catch (err) {
      console.error("Error al forzar sincronización desde servidor:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const canCreate = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';
  const canEdit = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';
  const canDelete = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';

  // Catálogos
  const statusCatalog = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO');
  const statusOptions = statusCatalog?.items.map(it => it.valor) || ['Evaluación', 'Adjudicación', 'Prescindido', 'Desierto'];

  const categoryCatalog = catalogs.find(c => c.codigo === 'CATEGORIA_TECNOLOGICA');
  const categoryOptions = categoryCatalog?.items.map(it => it.valor) || [];

  // Filtrado y Búsqueda sobre los datos oficiales del contexto
  const currentPurchases = purchases;

  const filteredPurchases = useMemo(() => {
    return currentPurchases
      .filter(p => {
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchDesc = p.descripcion.toLowerCase().includes(query);
          const matchNOG = p.nog.includes(query);
          const matchF56e = p.f56e.toLowerCase().includes(query);
          const matchF56 = p.f56.toLowerCase().includes(query);
          const matchProv = (p.proveedorAdjudicado || '').toLowerCase().includes(query);
          if (!matchDesc && !matchNOG && !matchF56e && !matchF56 && !matchProv) return false;
        }
        if (filterEstatus !== 'todos' && p.estatusEvento !== filterEstatus) return false;
        if (filterGIT !== 'todos' && p.evaluadoGIT !== filterGIT) return false;
        if (filterCategory !== 'todos' && p.categoriaTecnologica !== filterCategory) return false;
        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'fecha') {
          comparison = (a.fechaSolicitud || '').localeCompare(b.fechaSolicitud || '');
        } else if (sortBy === 'monto') {
          comparison = (a.monto || 0) - (b.monto || 0);
        } else if (sortBy === 'nog') {
          comparison = a.nog.localeCompare(b.nog);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [purchases, searchTerm, filterEstatus, filterGIT, filterCategory, sortBy, sortOrder]);

  const totalFilteredMonto = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + (p.monto || 0), 0);
  }, [filteredPurchases]);

  const handleExportCSV = () => {
    const rows = filteredPurchases.map(p => ({
      NOG: p.nog,
      'F56-e': p.f56e,
      F56: p.f56,
      'Área Solicitante': p.areaSolicitante || 'Soporte técnico',
      'Descripción': p.descripcion,
      'Fecha Solicitud': p.fechaSolicitud,
      'Fecha Vo.Bo.': p.fechaVoBo || 'N/A',
      'Fecha Autorizado': p.fechaAutorizado || 'N/A',
      'Fecha Publicación': p.fechaPublicacion || 'N/A',
      'Fecha Cierre Ofertas': p.fechaOfertas || 'N/A',
      'Fecha Dictamen Técnico': p.fechaDictamenGIT || 'N/A',
      'Fecha Oficio GIT': p.fechaElaboracionOficioGIT || 'N/A',
      'Cantidad de Ofertas': p.cantidadOfertas,
      'Monto (GTQ)': p.monto,
      'Evaluado por el Área Técnica Correspondiente': p.evaluadoGIT,
      'Estatus del Evento': p.estatusEvento,
      'Categoría Tecnológica': p.categoriaTecnologica || 'N/A',
      'Dependencia Solicitante': p.dependenciaSolicitante || 'N/A',
      'Modalidad de Compra': p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre,
      'Proveedor Adjudicado': p.proveedorAdjudicado || 'N/A',
    }));
    exportToCSV(`Adquisiciones_GIT_OJ_${new Date().toISOString().slice(0, 10)}`, rows);
    logAudit('EXPORTAR_DATOS', 'Compras', `Exportación de ${filteredPurchases.length} adquisiciones a CSV.`);
    showToast({
      type: 'success',
      title: 'Exportación a CSV Exitosa',
      message: `Se descargaron ${filteredPurchases.length} registros de adquisiciones en formato CSV.`,
      duration: 5000,
    });
  };

  const handleDirectExportPDF = () => {
    try {
      const filename = generatePurchasesPDF({
        purchases: filteredPurchases,
        title: 'REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS',
        subtitle: 'Control institucional de eventos NOG, formularios F56-e y dictámenes técnicos de TI',
        filterInfo: {
          search: searchTerm,
          status: filterEstatus,
          category: filterCategory,
        },
        currentUser,
        filenamePrefix: 'Reporte_Adquisiciones_GIT_OJ',
      });
      logAudit('EXPORTAR_DATOS', 'Compras', `Exportación oficial de ${filteredPurchases.length} adquisiciones a PDF (${filename}).`);
      showToast({
        type: 'success',
        title: 'Exportación a PDF Exitosa',
        message: `Se generó el documento oficial "${filename}" con membrete y código de auditoría.`,
        duration: 6000,
      });
    } catch (err) {
      console.error('Error generando PDF:', err);
      showToast({
        type: 'error',
        title: 'Error en Exportación',
        message: 'No fue posible generar el documento PDF.',
        duration: 5000,
      });
    }
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deletePurchase(itemToDelete.id);
      setSelectedIds(prev => prev.filter(id => id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  // Paginación institucional: 15 ítems por hoja
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Reiniciar a página 1 al cambiar términos de búsqueda o filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstatus, filterGIT, filterCategory, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE));

  // Prevenir que la página actual quede fuera de rango si se reducen los resultados
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPurchases = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPurchases.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPurchases, currentPage]);

  // Selección múltiple y eliminación en lote
  const isAllFilteredSelected = filteredPurchases.length > 0 && filteredPurchases.every(p => selectedIds.includes(p.id));
  const isSomeFilteredSelected = filteredPurchases.some(p => selectedIds.includes(p.id)) && !isAllFilteredSelected;

  const isAllPageSelected = paginatedPurchases.length > 0 && paginatedPurchases.every(p => selectedIds.includes(p.id));
  const isSomePageSelected = paginatedPurchases.some(p => selectedIds.includes(p.id)) && !isAllPageSelected;

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      const pageIdSet = new Set(paginatedPurchases.map(p => p.id));
      setSelectedIds(prev => prev.filter(id => !pageIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...paginatedPurchases.map(p => p.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredPurchases.map(p => p.id));
      setSelectedIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredPurchases.map(p => p.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const selectAllSystemPurchases = () => {
    setSelectedIds(purchases.map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectedPurchasesList = useMemo(() => {
    const set = new Set(selectedIds);
    return purchases.filter(p => set.has(p.id));
  }, [purchases, selectedIds]);

  const selectedTotalMonto = useMemo(() => {
    return selectedPurchasesList.reduce((acc, p) => acc + (p.monto || 0), 0);
  }, [selectedPurchasesList]);

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingBatch(true);
    try {
      await deletePurchases(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
    } catch (err) {
      console.error('Error al eliminar adquisiciones en lote:', err);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo de Compras (Professional Polish) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Control de Adquisiciones y Eventos NOG
          </h2>
          <p className="text-xs text-slate-500">
            Mantenimiento y trazabilidad de compras para la Gerencia de Informática
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2 flex-wrap">
          {canDelete && purchases.length > 0 && (
            <button
              id="btn-select-all-purchases-header"
              type="button"
              onClick={selectedIds.length === purchases.length ? clearSelection : selectAllSystemPurchases}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                selectedIds.length === purchases.length
                  ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                  : selectedIds.length > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="Seleccionar o deseleccionar todas las adquisiciones del sistema"
            >
              <CheckSquare className="w-3.5 h-3.5 text-slate-700" />
              <span>
                {selectedIds.length === purchases.length 
                  ? `Deseleccionar (${purchases.length})` 
                  : `Seleccionar Todas (${purchases.length})`}
              </span>
            </button>
          )}

          {canDelete && selectedIds.length > 0 && (
            <button
              id="btn-delete-selected-header"
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar ({selectedIds.length})</span>
            </button>
          )}

          <button
            id="btn-export-purchases-pdf"
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-rose-800 text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Exportar la tabla actual a formato PDF con cabecera institucional y control de auditoría"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Exportar PDF</span>
          </button>

          <button
            id="btn-export-purchases-csv"
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>Exportar CSV</span>
          </button>

          {canCreate && (
            <>
              <button
                id="btn-import-purchases-excel"
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-emerald-800"
                title="Carga masiva: importar adquisiciones desde un archivo de Excel (.xlsx, .xls, .csv)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Importar Excel</span>
              </button>

              <button
                id="btn-register-purchase-top"
                type="button"
                onClick={() => { setPurchaseToEdit(null); setIsPurchaseModalOpen(true); }}
                className={`px-3.5 py-2 rounded-xl ${themeConfig.primaryBtn} text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer`}
              >
                <PlusCircle className="w-4 h-4 text-black" />
                <span>+ Nueva Adquisición</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notificación de exportación PDF exitosa */}
      {pdfToast && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{pdfToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfToast(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Sincronización en Tiempo Real Multi-dispositivo */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              Listener Firestore Activo (En Vivo)
            </span>
            <span className="text-[10px] text-emerald-800 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
              {firestoreStatus === 'conectado' ? '☁️ Conectado a Servidor Cloud' : firestoreStatus === 'conectando' ? '🔄 Sincronizando...' : '💾 Modo Local / Fuera de línea'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Registros: {currentPurchases.length} • {lastSyncTime.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleForceSync}
          disabled={isSyncing}
          className="self-end sm:self-auto px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100/60 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
          title="Fuerza la consulta directa a los servidores de Firestore evitando cualquier caché de navegador"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Actualizando...' : 'Forzar Sincronización'}</span>
        </button>
      </div>

      {/* Barra Destacada de Acciones Masivas (cuando hay elementos seleccionados) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>{selectedIds.length} {selectedIds.length === 1 ? 'adquisición seleccionada' : 'adquisiciones seleccionadas'}</span>
                <span className="text-slate-500 font-normal">|</span>
                <span className="font-mono text-emerald-400 font-bold">{formatQuetzales(selectedTotalMonto)}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {selectedIds.length === purchases.length 
                  ? 'Has seleccionado todas las adquisiciones del sistema.' 
                  : `Seleccionadas de ${purchases.length} registradas en total.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {selectedIds.length < purchases.length && (
              <button
                type="button"
                onClick={selectAllSystemPurchases}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                Seleccionar TODAS ({purchases.length})
              </button>
            )}
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              Limpiar Selección
            </button>
            {canDelete && (
              <button
                id="btn-delete-selected-banner"
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar {selectedIds.length} Seleccionadas</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Input de Búsqueda */}
          <div className="md:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-search-purchases"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por NOG (8 dígitos), F56-e, F56, descripción..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Filtro Estatus */}
          <div className="md:col-span-3">
            <select
              id="filter-select-estatus"
              value={filterEstatus}
              onChange={(e) => setFilterEstatus(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
            >
              <option value="todos">Todos los Estatus</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Filtro GIT */}
          <div className="md:col-span-3">
            <select
              id="filter-select-git"
              value={filterGIT}
              onChange={(e) => setFilterGIT(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-700"
            >
              <option value="todos">Evaluado GIT: Todos</option>
              <option value="Sí">Evaluado: Sí</option>
              <option value="No">Evaluado: No</option>
            </select>
          </div>

        </div>

        {/* Resumen de Resultados y Orden */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Resultados: <strong>{filteredPurchases.length}</strong> de {purchases.length}</span>
            <span>•</span>
            <span>Monto Total: <strong className="text-slate-900">{formatQuetzales(totalFilteredMonto)}</strong></span>
            {canDelete && filteredPurchases.length > 0 && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="font-bold text-amber-800 hover:text-amber-950 underline decoration-amber-400 underline-offset-2 cursor-pointer"
                >
                  {isAllFilteredSelected 
                    ? 'Deseleccionar filtradas' 
                    : `Seleccionar todas las filtradas (${filteredPurchases.length})`}
                </button>
                {purchases.length > filteredPurchases.length && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={selectAllSystemPurchases}
                      className="font-bold text-slate-700 hover:text-slate-950 underline decoration-slate-300 underline-offset-2 cursor-pointer"
                    >
                      Seleccionar todas del sistema ({purchases.length})
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-medium cursor-pointer"
            >
              <option value="fecha">Fecha de Solicitud</option>
              <option value="monto">Monto (Q)</option>
              <option value="nog">Número NOG</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              title="Cambiar orden"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL (Desktop & Tablet) */}
      <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  {canDelete && (
                    <input
                      type="checkbox"
                      id="checkbox-select-all-desktop"
                      checked={isAllPageSelected}
                      ref={el => {
                        if (el) el.indeterminate = isSomePageSelected;
                      }}
                      onChange={toggleSelectPage}
                      title={isAllPageSelected ? "Deseleccionar adquisiciones de esta página" : "Seleccionar adquisiciones de esta página (15 máx)"}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                    />
                  )}
                </th>
                <th className="px-4 py-3">NOG</th>
                <th className="px-3 py-3">F56-e / F56</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-3 py-3">Fecha Solicitud</th>
                <th className="px-3 py-3 text-right">Monto (Q)</th>
                <th className="px-3 py-3 text-center">Ofertas</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Evaluado por el Área Técnica</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Estatus del Evento</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">No se encontraron adquisiciones registradas</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Puedes registrar una adquisición individual o realizar una carga masiva desde tu archivo Excel.
                        </p>
                      </div>
                      {canCreate && (
                        <div className="flex items-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                            <span>Importar desde Excel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPurchaseToEdit(null); setIsPurchaseModalOpen(true); }}
                            className={`px-3.5 py-2 rounded-xl ${themeConfig.primaryBtn} text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer`}
                          >
                            <PlusCircle className="w-4 h-4 text-black" />
                            <span>+ Nueva Adquisición</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const badgeClass = STATUS_BADGE_CLASSES[p.estatusEvento] || 'bg-slate-100 text-slate-700';
                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors ${
                        isSelected ? 'bg-rose-50/70 hover:bg-rose-100/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox Selección */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {canDelete && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(p.id)}
                            aria-label={`Seleccionar adquisición NOG ${p.nog}`}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                          />
                        )}
                      </td>
                      
                      {/* NOG */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {p.nog}
                      </td>

                      {/* F56-e y F56 */}
                      <td className="px-3 py-3 whitespace-nowrap font-mono">
                        <span className="font-bold text-slate-800 block">{p.f56e}</span>
                        <span className="text-[10px] text-slate-400 block">{p.f56}</span>
                        {p.f56Documento && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDocumentFile(p.f56Documento!, p);
                            }}
                            title={`Descargar Documento F56: ${p.f56Documento.nombre}`}
                            className="inline-flex items-center gap-1 mt-1 text-[9px] font-sans font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            <Paperclip className="w-2.5 h-2.5 text-amber-600" />
                            Doc F56
                          </button>
                        )}
                      </td>

                      {/* Descripción */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-slate-800 line-clamp-2" title={p.descripcion}>
                          {p.descripcion}
                        </p>
                        {p.areaSolicitante && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            {p.areaSolicitante}
                          </span>
                        )}
                      </td>

                      {/* Fecha Solicitud */}
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(p.fechaSolicitud)}
                      </td>

                      {/* Monto */}
                      <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        <span>{formatQuetzales(p.monto)}</span>
                        {p.renglonPresupuestario && (
                          <div className="mt-0.5">
                            <span 
                              className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200" 
                              title={p.nombreRenglon || `Renglón presupuestario ${p.renglonPresupuestario}`}
                            >
                              Reng. {p.renglonPresupuestario}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Cantidad de Ofertas */}
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">
                        {p.cantidadOfertas}
                      </td>

                      {/* Evaluado por el Área Técnica Correspondiente */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {p.evaluadoGIT === 'Sí' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Evaluado por Área Técnica
                            </span>
                            {p.fechaDictamenGIT && (
                              <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                                Dictamen: {formatDate(p.fechaDictamenGIT)}
                              </span>
                            )}
                            {p.fechaElaboracionOficioGIT && (
                              <span className="text-[9px] text-amber-700 font-mono">
                                Oficio GIT: {formatDate(p.fechaElaboracionOficioGIT)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            No evaluado
                          </span>
                        )}
                      </td>

                      {/* Estatus del Evento */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                          {p.estatusEvento}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedPurchase(p)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                            title="Ver Ficha Detallada"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => { setPurchaseToEdit(p); setIsPurchaseModalOpen(true); }}
                              className="p-1.5 rounded-md text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setItemToDelete(p)}
                              className="p-1.5 rounded-md text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA MÓVIL (Cards) */}
      <div className="md:hidden space-y-3">
        {/* Barra de Selección Rápida en Móvil */}
        {canDelete && filteredPurchases.length > 0 && (
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                ref={el => {
                  if (el) el.indeterminate = isSomeFilteredSelected;
                }}
                onChange={toggleSelectAllFiltered}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
              />
              <span>Seleccionar todas ({filteredPurchases.length})</span>
            </label>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar ({selectedIds.length})</span>
              </button>
            )}
          </div>
        )}

        {paginatedPurchases.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          const badgeClass = STATUS_BADGE_CLASSES[p.estatusEvento] || 'bg-slate-100 text-slate-700';
          return (
            <div 
              key={p.id} 
              className={`bg-white p-4 rounded-xl border shadow-xs space-y-2 transition-colors ${
                isSelected ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-400' : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  {canDelete && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(p.id)}
                      aria-label={`Seleccionar NOG ${p.nog}`}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer shrink-0"
                    />
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">NOG</span>
                    <span className="font-mono font-bold text-slate-900">{p.nog}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold block">Estatus del Evento</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeClass}`}>
                    {p.estatusEvento}
                  </span>
                </div>
              </div>

              {/* F56-e / F56 / Doc */}
              <div className="flex items-center justify-between text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 font-sans text-[10px] block">Formularios:</span>
                  <span className="font-bold text-slate-800">{p.f56e}</span>
                  <span className="text-slate-500 ml-1.5">({p.f56})</span>
                </div>
                {p.f56Documento && (
                  <span className="text-[10px] font-sans font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-amber-600" />
                    Doc F56
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-800 font-medium line-clamp-2">{p.descripcion}</p>
              
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                <span className="font-bold text-slate-900">{formatQuetzales(p.monto)}</span>
                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                  Evaluado GIT: 
                  <strong className={p.evaluadoGIT === 'Sí' ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                    {p.evaluadoGIT === 'Sí' ? 'Sí (GIT)' : 'No'}
                  </strong>
                </span>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPurchase(p)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-black shadow-2xs cursor-pointer"
                >
                  Ver Ficha
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => { setPurchaseToEdit(p); setIsPurchaseModalOpen(true); }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-black shadow-2xs cursor-pointer"
                  >
                    Editar
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setItemToDelete(p)}
                    className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 shadow-2xs cursor-pointer"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Componente de Paginación Institucional: 15 registros por hoja */}
      {filteredPurchases.length > 0 && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium text-center sm:text-left">
            Mostrando <strong className="text-slate-900 font-semibold">{Math.min(filteredPurchases.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</strong> al{' '}
            <strong className="text-slate-900 font-semibold">{Math.min(filteredPurchases.length, currentPage * ITEMS_PER_PAGE)}</strong> de{' '}
            <strong className="text-slate-900 font-semibold">{filteredPurchases.length}</strong> adquisiciones
            <span className="mx-2 text-slate-300">|</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
              Página {currentPage} de {totalPages} (15 por hoja)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* Primera página */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Página anterior */}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else if (currentPage <= 4) {
                  pages.push(1, 2, 3, 4, 5, '...', totalPages);
                } else if (currentPage >= totalPages - 3) {
                  pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                } else {
                  pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                }

                return pages.map((page, idx) => {
                  if (typeof page === 'string') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 font-bold">
                        ...
                      </span>
                    );
                  }
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={`page-${page}`}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg font-bold transition-colors cursor-pointer text-xs ${
                        isActive
                          ? 'bg-amber-800 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Siguiente página */}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Página siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Última página */}
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación Individual */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              ¿Eliminar NOG {itemToDelete.nog}?
            </h3>
            <p className="text-xs text-slate-500">
              Esta acción eliminará el registro y se guardará en la bitácora de auditoría.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 shadow-2xs cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación Masiva */}
      {isBatchDeleteModalOpen && selectedIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  ¿Eliminar {selectedIds.length} {selectedIds.length === 1 ? 'adquisición seleccionada' : 'adquisiciones seleccionadas'}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta acción es irreversible y retirará permanentemente los registros seleccionados de la base de datos Firestore y del sistema.
                </p>
              </div>
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumen del impacto de la eliminación */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">Total de eventos NOG a eliminar:</span>
                <span className="font-bold text-rose-700 font-mono text-sm">{selectedIds.length}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">Monto acumulado comprometido:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{formatQuetzales(selectedTotalMonto)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Registros que serán retirados:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {selectedPurchasesList.slice(0, 10).map(p => (
                    <span key={p.id} className="font-mono text-[10px] bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded font-bold">
                      {p.nog} ({p.estatusEvento})
                    </span>
                  ))}
                  {selectedIds.length > 10 && (
                    <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 self-center">
                      +{selectedIds.length - 10} más...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Registro en Bitácora de Auditoría Institucional</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Esta operación masiva quedará registrada con fecha, hora y firma del usuario ({currentUser?.nombre || currentUser?.username}).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-all-purchases"
                type="button"
                disabled={isDeletingBatch}
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Eliminando {selectedIds.length} adquisiciones...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Confirmar y Eliminar ({selectedIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportación a PDF Oficial Institucional */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        purchases={filteredPurchases}
        currentUser={currentUser}
        filterInfo={{
          search: searchTerm,
          status: filterEstatus,
          category: filterCategory,
        }}
        onSuccess={(filename) => {
          logAudit('EXPORTAR_DATOS', 'Compras', `Exportación oficial de ${filteredPurchases.length} adquisiciones a PDF (${filename}).`);
          showToast({
            type: 'success',
            title: 'Exportación a PDF Exitosa',
            message: `Documento oficial "${filename}" descargado con cabecera y código de auditoría.`,
            duration: 6000,
          });
        }}
      />

    </div>
  );
};
