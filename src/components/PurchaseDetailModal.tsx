import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Printer, 
  Calendar, 
  FileText, 
  Edit,
  Download,
  Paperclip,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  LayoutGrid,
  GitBranch,
  FolderTree,
  ChevronRight
} from 'lucide-react';
import { formatQuetzales, formatDate, formatDateTime, getModalidadCompraByMonto } from '../utils/formatters';
import { InstitutionalReportModal } from './InstitutionalReportModal';
import { DocumentPreview } from './DocumentPreview';
import { downloadDocumentFile } from '../utils/documentUtils';
import { PurchaseBitacoraView } from './PurchaseBitacoraView';
import { PurchaseActionTree } from './PurchaseActionTree';
import { getAttachmentWithDataUrl } from '../utils/attachmentStorage';
import { History } from 'lucide-react';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  'Adjudicación': 'bg-blue-100 text-blue-700',
  'Evaluación': 'bg-amber-100 text-amber-700',
  'Prescindido': 'bg-red-100 text-red-700',
  'Desierto': 'bg-slate-100 text-slate-700',
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PurchaseDetailModal: React.FC = () => {
  const { 
    selectedPurchase, 
    setSelectedPurchase, 
    setIsPurchaseModalOpen, 
    setPurchaseToEdit,
    deletePurchase,
    currentUser 
  } = useApp();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'arbol' | 'bitacora' | 'documento'>('general');

  useEffect(() => {
    if (
      selectedPurchase?.id && 
      selectedPurchase.f56Documento && 
      (!selectedPurchase.f56Documento.dataUrl || selectedPurchase.f56Documento.dataUrl.length < 100)
    ) {
      let isMounted = true;
      getAttachmentWithDataUrl(selectedPurchase.id, selectedPurchase.f56Documento).then(fullDoc => {
        if (isMounted && fullDoc?.dataUrl && fullDoc.dataUrl !== selectedPurchase.f56Documento?.dataUrl) {
          setSelectedPurchase({
            ...selectedPurchase,
            f56Documento: fullDoc
          });
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [selectedPurchase?.id, selectedPurchase?.f56Documento?.dataUrl]);

  if (!selectedPurchase) return null;

  const canEdit = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';
  const canDelete = currentUser?.rol === 'administrador' || currentUser?.rol === 'usuario_estandar';

  const handleEditFromDetail = () => {
    setPurchaseToEdit(selectedPurchase);
    setSelectedPurchase(null);
    setIsPurchaseModalOpen(true);
  };

  const handleConfirmDelete = () => {
    deletePurchase(selectedPurchase.id);
    setIsConfirmDeleteOpen(false);
    setSelectedPurchase(null);
  };

  const badgeClass = STATUS_BADGE_CLASSES[selectedPurchase.estatusEvento] || 'bg-slate-100 text-slate-700';
  const modalidadLCE = getModalidadCompraByMonto(selectedPurchase.monto);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
          
          {/* Cabecera Institucional del Modal (Professional Polish) */}
          <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-slate-900 font-bold text-xs">
                OJ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    NOG: {selectedPurchase.nog}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    • F56-e: {selectedPurchase.f56e}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Ficha Oficial de Adquisición
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black text-xs font-bold transition-all shadow-xs border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                title="Generar Boleta Oficial Imprimible"
              >
                <Printer className="w-3.5 h-3.5 text-black" />
                <span className="hidden sm:inline">Boleta Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cuerpo de la Ficha */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-800 text-xs sm:text-sm">
            
            {/* Pestañas de Navegación de la Ficha */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'general'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Ficha General y Detalles</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('arbol')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'arbol'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Ruta en Árbol (Línea de Tiempo)</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-700 text-white">
                  Árbol
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bitacora')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'bitacora'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Bitácora de Cambios</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                  {selectedPurchase.bitacoraCambios?.length || 1}
                </span>
              </button>

              {selectedPurchase.f56Documento && (
                <button
                  type="button"
                  onClick={() => setActiveTab('documento')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'documento'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Documento Adjunto (F56)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </button>
              )}
            </div>

            {/* Banner de Estado y Monto */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Monto Total Presupuestado (GTQ)
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {formatQuetzales(selectedPurchase.monto)}
                </span>
                {/* Modalidad de Compra Oficial (LCE) calculada según el monto */}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${modalidadLCE.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${modalidadLCE.badgeDotColor}`} />
                    Modalidad: {modalidadLCE.nombre}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({modalidadLCE.descripcionRango})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Último Estatus
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('arbol')}
                      title="Ver ruta en forma de árbol"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClass} cursor-pointer hover:opacity-90 transition-opacity`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {selectedPurchase.estatusEvento}
                    </button>
                  </div>
                </div>
                <div className="text-right border-l border-slate-200 pl-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Evaluado por el Área Técnica
                  </span>
                  <span className={`inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedPurchase.evaluadoGIT === 'Sí' 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                      : 'text-slate-600 bg-slate-100 border border-slate-200'
                  }`}>
                    {selectedPurchase.evaluadoGIT === 'Sí' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Evaluado por el Área Técnica (Sí)
                      </>
                    ) : (
                      'Sin evaluar (No)'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Vista: Ruta en forma de Árbol de la Ficha */}
            {activeTab === 'arbol' && (
              <div className="pt-1 space-y-3">
                <div className="bg-gradient-to-r from-amber-900 to-slate-900 text-white p-3.5 rounded-xl border border-amber-800 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Línea de Tiempo en Árbol de la Ficha
                      </h4>
                      <p className="text-[11px] text-amber-200/80">
                        NOG: <span className="font-mono font-bold text-white">{selectedPurchase.nog}</span> • F56-e: <span className="font-mono font-bold text-white">{selectedPurchase.f56e}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                    {selectedPurchase.estatusEvento}
                  </span>
                </div>

                <PurchaseActionTree 
                  purchase={selectedPurchase} 
                  initialFilterState="recorridos"
                />
              </div>
            )}

            {/* Vista 1: Bitácora de Cambios de la Ficha */}
            {activeTab === 'bitacora' && (
              <div className="pt-1">
                <PurchaseBitacoraView purchase={selectedPurchase} canEdit={canEdit} />
              </div>
            )}

            {/* Vista 2: Solo Documento F56 */}
            {activeTab === 'documento' && selectedPurchase.f56Documento && (
              <div className="space-y-3 pt-1">
                <DocumentPreview
                  document={selectedPurchase.f56Documento}
                  purchase={selectedPurchase}
                  title="Documento Oficial F56-e"
                  onClose={() => setActiveTab('general')}
                />
              </div>
            )}

            {/* Vista 3: Ficha General Completa */}
            {activeTab === 'general' && (
              <>
                {/* Descripción Completa */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    Descripción del Requerimiento
                  </h3>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium text-xs">
                    {selectedPurchase.descripcion}
                  </div>
                </div>

            {/* SECCIÓN DE IDENTIFICADORES Y DOCUMENTO DE LA F56 */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    NOG Guatecompras
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900">{selectedPurchase.nog}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Formulario F56-e (Electrónico)
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900">{selectedPurchase.f56e}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Máscara: 000000-0000</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Formulario F56 (Físico)
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900">{selectedPurchase.f56}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Máscara: 000000</span>
                </div>
              </div>

              {/* Documento Adjunto de la F56 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                    Documento de la F56
                  </span>
                  {selectedPurchase.f56Documento && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Documento Adjunto
                    </span>
                  )}
                </div>

                {selectedPurchase.f56Documento ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate" title={selectedPurchase.f56Documento.nombre}>
                            {selectedPurchase.f56Documento.nombre}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatFileSize(selectedPurchase.f56Documento.tamano)} • Subido: {selectedPurchase.f56Documento.fechaSubida ? new Date(selectedPurchase.f56Documento.fechaSubida).toLocaleDateString() : 'Registrado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setShowDocumentPreview(!showDocumentPreview)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          {showDocumentPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {showDocumentPreview ? 'Ocultar Vista' : 'Vista Previa'}
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDocumentFile(selectedPurchase.f56Documento!, selectedPurchase)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-2xs shrink-0 cursor-pointer"
                          title="Descargar documento oficial"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar
                        </button>
                      </div>
                    </div>

                    {showDocumentPreview && (
                      <DocumentPreview
                        document={selectedPurchase.f56Documento}
                        purchase={selectedPurchase}
                        title="Documento Oficial F56-e"
                        onClose={() => setShowDocumentPreview(false)}
                      />
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>No se ha adjuntado aún el archivo digitalizado de la F56 física.</span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={handleEditFromDetail}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3" />
                        Adjuntar ahora en Edición
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Clasificación y Detalles Técnicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Estatus del Evento:
                </span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${badgeClass}`}>
                  {selectedPurchase.estatusEvento}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Evaluado por el Área Técnica Correspondiente:
                </span>
                <div className="mt-0.5">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                    selectedPurchase.evaluadoGIT === 'Sí' 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                      : 'text-slate-600 bg-slate-100 border border-slate-200'
                  }`}>
                    {selectedPurchase.evaluadoGIT === 'Sí' ? 'Sí (Evaluado por el Área Técnica)' : 'No (No evaluado)'}
                  </span>
                  {selectedPurchase.evaluadoGIT === 'Sí' && selectedPurchase.fechaDictamenGIT && (
                    <span className="block text-[11px] font-semibold text-slate-600 mt-1">
                      Fecha de Dictamen: <strong className="text-slate-900 font-mono">{formatDate(selectedPurchase.fechaDictamenGIT)}</strong>
                    </span>
                  )}
                  {selectedPurchase.evaluadoGIT === 'Sí' && selectedPurchase.fechaElaboracionOficioGIT && (
                    <span className="block text-[11px] font-semibold text-slate-600 mt-1">
                      Elaboración Oficio GIT: <strong className="text-slate-900 font-mono">{formatDate(selectedPurchase.fechaElaboracionOficioGIT)}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Área Solicitante:
                </span>
                <span className="font-bold text-amber-700">{selectedPurchase.areaSolicitante || 'Soporte técnico'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Categoría Tecnológica:
                </span>
                <span className="font-semibold text-slate-800">{selectedPurchase.categoriaTecnologica || 'Equipo Informático'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dependencia Solicitante:
                </span>
                <span className="font-semibold text-slate-800">{selectedPurchase.dependenciaSolicitante || 'Gerencia de Informática'}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Modalidad de Compra (LCE):
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border ${modalidadLCE.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${modalidadLCE.badgeDotColor}`} />
                    {modalidadLCE.nombre}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-600">
                  <span className="font-semibold text-slate-700">{modalidadLCE.descripcionRango}</span>
                  <span className="block text-slate-500 italic mt-0.5">{modalidadLCE.fundamentoLegal}</span>
                </div>
              </div>

              {/* Afectación Presupuestaria IT */}
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                    Imputación Presupuestaria (Informática)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedPurchase.estadoPago === 'pagado'
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}>
                    {selectedPurchase.estadoPago === 'pagado' ? 'Pagado que Rebaja' : 'Comprometido Pendiente'}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Renglón Presupuestario:</span>
                    <strong className="font-mono text-blue-950 font-bold">
                      {selectedPurchase.renglonPresupuestario || '158'}
                    </strong>
                    {selectedPurchase.nombreRenglon && (
                      <span className="text-slate-600 text-[11px] ml-1.5">({selectedPurchase.nombreRenglon})</span>
                    )}
                  </div>
                  {selectedPurchase.grupoPresupuestario && (
                    <div>
                      <span className="text-[10px] text-slate-500 block">Grupo Presupuestario:</span>
                      <strong className="font-bold text-slate-800">{selectedPurchase.grupoPresupuestario}</strong>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ofertas Recibidas:
                </span>
                <span className="font-bold text-slate-900">{selectedPurchase.cantidadOfertas} ofertas</span>
              </div>
              {(selectedPurchase.estatusEvento === 'Adjudicación' || selectedPurchase.proveedorAdjudicado || selectedPurchase.fechaAdjudicacion) && (
                <div className="sm:col-span-2 border-t border-slate-200 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                  {selectedPurchase.fechaAdjudicacion && (
                    <div>
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                        Fecha de Adjudicación:
                      </span>
                      <span className="font-bold font-mono text-slate-900">{formatDate(selectedPurchase.fechaAdjudicacion)}</span>
                    </div>
                  )}
                  {selectedPurchase.proveedorAdjudicado && (
                    <div>
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                        Proveedor / Empresa Adjudicada:
                      </span>
                      <span className="font-bold text-slate-900">{selectedPurchase.proveedorAdjudicado}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Observaciones */}
            {selectedPurchase.observaciones && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Observaciones Técnicas:</span>
                <p className="text-amber-950">{selectedPurchase.observaciones}</p>
              </div>
            )}

            {/* Tarjeta Resumen del Último Estatus */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Último Estatus del Evento
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${badgeClass}`}>
                      {selectedPurchase.estatusEvento}
                    </span>
                    {selectedPurchase.proveedorAdjudicado && selectedPurchase.estatusEvento === 'Adjudicación' && (
                      <span className="text-xs text-slate-600">
                        Adjudicado a: <strong className="text-slate-800">{selectedPurchase.proveedorAdjudicado}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('arbol')}
                  className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Ver Ruta en Árbol</span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('bitacora')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Ver Bitácora</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sección Ruta y Línea de Tiempo en Árbol dentro de Ficha General */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Ruta y Línea de Tiempo en Árbol
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Ruta transitada por esta adquisición
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('arbol')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Vista Completa</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <PurchaseActionTree 
                purchase={selectedPurchase} 
                compact={true}
                initialFilterState="recorridos"
              />
            </div>
          </>
        )}

        {/* Metadatos */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
              <div>
                <strong>Registrado por:</strong> {selectedPurchase.creadoPor} ({formatDateTime(selectedPurchase.fechaCreacion)})
              </div>
              {selectedPurchase.modificadoPor && (
                <div>
                  <strong>Última modificación:</strong> {selectedPurchase.modificadoPor} ({formatDateTime(selectedPurchase.fechaModificacion)})
                </div>
              )}
            </div>

          </div>

          {/* Barra Inferior */}
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedPurchase(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <div className="flex items-center gap-2">
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 shadow-xs text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Eliminar</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={handleEditFromDetail}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 shadow-xs text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Edit className="w-3.5 h-3.5 text-black" />
                  <span>Editar Adquisición</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal Confirmación de Eliminación */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              ¿Eliminar NOG {selectedPurchase.nog}?
            </h3>
            <p className="text-xs text-slate-500">
              Esta acción eliminará el registro de adquisición de la base de datos y quedará asentada en la bitácora de auditoría.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Boleta Imprimible */}
      {isReportModalOpen && (
        <InstitutionalReportModal
          purchase={selectedPurchase}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </>
  );
};
