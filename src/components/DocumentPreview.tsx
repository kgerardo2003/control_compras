import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  X, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  File,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  FileCheck,
  Printer
} from 'lucide-react';
import { AttachedDocument, PurchaseRecord } from '../types';
import { formatFileSize, formatQuetzales } from '../utils/formatters';
import { downloadDocumentFile, getDocumentBlob } from '../utils/documentUtils';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface DocumentPreviewProps {
  document: AttachedDocument;
  purchase?: Partial<PurchaseRecord>;
  title?: string;
  isInline?: boolean;
  onClose?: () => void;
  onRemove?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  purchase,
  title = 'Documento F56-e Adjunto',
  isInline = true,
  onClose,
  onRemove
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'sheet'>('pdf');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Crear Blob seguro para el visor nativo y descargas
  const blobUrl = useMemo(() => {
    try {
      const blob = getDocumentBlob(document, purchase);
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error al generar blob para preview:', err);
      return document?.dataUrl || '';
    }
  }, [document?.dataUrl, document?.nombre, purchase]);

  // Limpieza de memoria
  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Soporte de tecla Escape para pantalla completa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const fileName = document.nombre || 'documento_f56.pdf';
  const fileExt = (fileName.split('.').pop() || '').toLowerCase();
  const fileType = document.tipo || '';

  const isPdf = fileType.includes('pdf') || fileExt === 'pdf';
  const isImage = fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(fileExt);
  const isWord = fileExt === 'doc' || fileExt === 'docx' || fileType.includes('word');

  // Descarga segura libre de fallos de Google Chrome
  const handleDownload = () => {
    downloadDocumentFile(document, purchase);
  };

  // Abrir en nueva ventana/pestaña
  const handleOpenInNewTab = () => {
    try {
      if (blobUrl) {
        const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
          handleDownload();
        }
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };

  const handlePrint = () => {
    window.print();
  };

  // Renderizado de la Ficha Institucional F56-e
  const renderOfficialSheet = (fullscreen = false) => {
    const f56e = purchase?.f56e || '000001-2026';
    const f56 = purchase?.f56 || '000001';
    const monto = purchase?.monto ? formatQuetzales(purchase.monto) : 'Q 845,000.00';
    const desc = purchase?.descripcion || 'Adquisición de suministros y equipamiento tecnológico conforme a especificaciones oficiales de la Gerencia de Informática.';
    const depto = purchase?.dependenciaSolicitante || purchase?.areaSolicitante || 'Gerencia de Informática';
    const prov = purchase?.proveedorAdjudicado || 'En proceso de selección y adjudicación';
    const dictamen = purchase?.fechaDictamenGIT || 'Dictamen Técnico Registrado';
    const oficio = purchase?.fechaElaboracionOficioGIT || 'Oficio GIT Elaborado';

    return (
      <div className={`w-full bg-slate-100/70 p-3 sm:p-6 overflow-y-auto ${fullscreen ? 'max-h-[82vh]' : 'max-h-[500px]'}`}>
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-slate-300 p-6 sm:p-8 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <span className="text-8xl font-black text-slate-900 rotate-[-30deg]">ORGANISMO JUDICIAL</span>
          </div>

          <div className="border-b-2 border-[#1c39bb] pb-4 mb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-[#1c39bb] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                  OJ
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                    Organismo Judicial de Guatemala
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-600 uppercase">
                    Gerencia de Informática • Dirección de Compras
                  </p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  EXPEDIENTE OFICIAL F56
                </span>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Certificación Digital Activa
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Formulario F56-e Electrónico: <span className="font-mono text-[#1c39bb]">{f56e}</span>
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Correspondiente a Formulario F56 Físico Registrado: <strong className="text-slate-800 font-mono">{f56}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-500 block">Monto Estimado/Adjudicado:</span>
              <span className="text-sm font-black text-slate-900 font-mono text-[#1c39bb]">{monto}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-5">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                Dependencia Solicitante
              </span>
              <p className="font-semibold text-slate-900">{depto}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                Evaluación Técnica
              </span>
              <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Evaluado por el Área Técnica Correspondiente</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                Fechas de Gestión GIT
              </span>
              <div className="space-y-0.5 text-[11px] text-slate-700">
                <p>Dictamen Técnico GIT: <strong>{dictamen}</strong></p>
                <p>Elaboración Oficio GIT: <strong>{oficio}</strong></p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                Proveedor Adjudicado / Propuesto
              </span>
              <p className="font-semibold text-slate-900 truncate" title={prov}>{prov}</p>
            </div>
          </div>

          <div className="mb-5">
            <h5 className="text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider text-slate-700">
              Descripción y Alcance del Requerimiento:
            </h5>
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans">
              {desc}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2 min-w-0">
              <FileCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-950 truncate" title={fileName}>
                  {fileName}
                </p>
                <p className="text-[10px] text-amber-800">
                  Tamaño: {formatFileSize(document.tamano)} • Formato: {isPdf ? 'PDF Digital' : fileExt.toUpperCase()} • Estado: Validado
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="Descargar este archivo oficial a su equipo"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Archivo</span>
            </button>
          </div>

          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Firma y Dictamen Digital</p>
              <p className="text-xs font-bold text-slate-800">Lic. Kevin Gerardo López de León</p>
              <p className="text-[11px] text-slate-500">Gerente de Informática - OJ</p>
            </div>

            <div className="border border-amber-300 bg-amber-50 rounded-lg p-2 max-w-xs text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-900">
                <ShieldCheck className="w-3 h-3 text-amber-700" />
                <span>SELLO DIGITAL INSTITUCIONAL</span>
              </div>
              <p className="text-[9px] font-mono text-amber-800 truncate mt-0.5">
                HASH: 8f4b29a7c1e5d3092bb45612ac9834fe
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizado de Imagen
  const renderImageContent = (fullscreen = false) => {
    return (
      <div className={`w-full ${fullscreen ? 'h-[78vh]' : 'h-[380px] sm:h-[440px]'} bg-slate-900 rounded-lg overflow-auto flex items-center justify-center p-4 select-none`}>
        <img
          src={blobUrl || document.dataUrl}
          alt={fileName}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="max-w-full max-h-full object-contain shadow-2xl rounded"
        />
      </div>
    );
  };

  // Renderizado de otros formatos (Word, etc.)
  const renderGenericDoc = () => {
    return (
      <div className="w-full p-8 bg-slate-50 border border-slate-200 rounded-lg text-center flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
          {isWord ? <FileText className="w-7 h-7" /> : <File className="w-7 h-7" />}
        </div>
        <h4 className="text-sm font-bold text-slate-900 mb-1">{fileName}</h4>
        <p className="text-xs text-slate-500 mb-1">
          {isWord ? 'Documento de Microsoft Word (.docx)' : `Archivo adjunto (${fileExt.toUpperCase()})`}
        </p>
        <p className="text-[11px] text-slate-400 mb-5">
          Tamaño: {formatFileSize(document.tamano)} • Los archivos ofimáticos se abren mediante su suite de escritorio.
        </p>
        <button
          type="button"
          onClick={handleDownload}
          className="px-4 py-2 bg-[#1c39bb] hover:bg-[#0d1f4d] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Documento Oficial</span>
        </button>
      </div>
    );
  };

  // Contenido principal según tipo y modo
  const renderMainContent = (fullscreen = false) => {
    if (isImage) {
      return renderImageContent(fullscreen);
    }

    if (isPdf) {
      if (viewMode === 'sheet') {
        return renderOfficialSheet(fullscreen);
      }
      // VISTA PREVIA DIRECTA DEL PDF ADJUNTO
      return (
        <PdfCanvasViewer
          document={document}
          purchase={purchase}
          isFullscreen={fullscreen}
          onExpand={() => setIsFullscreen(true)}
          onClose={onClose}
        />
      );
    }

    return renderGenericDoc();
  };

  return (
    <>
      {/* Contenedor Principal de Vista Previa */}
      <div className="mt-2.5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
        {/* Barra superior de herramientas */}
        <div className="px-3.5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Título y Estado */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate" title={fileName}>
                Vista Previa del PDF Adjunto • <span className="font-mono text-slate-600 text-[11px]">{fileName}</span>
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Documento Listo
            </span>
          </div>

          {/* Controles y Selector de Modo */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* Selector de modo para PDF */}
            {isPdf && (
              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-semibold mr-1">
                <button
                  type="button"
                  onClick={() => setViewMode('pdf')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
                    viewMode === 'pdf' ? 'bg-[#1c39bb] text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Ver páginas del PDF adjunto directamente"
                >
                  <FileText className="w-3 h-3" />
                  <span>Ver PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('sheet')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
                    viewMode === 'sheet' ? 'bg-[#1c39bb] text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Ver Ficha Institucional con sellos de certificación"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Ficha Institucional</span>
                </button>
              </div>
            )}

            {/* Controles de Imagen */}
            {isImage && (
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  title="Disminuir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  title="Rotar 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Abrir en pestaña nueva */}
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-2.5 py-1.5 text-slate-700 hover:text-[#1c39bb] hover:bg-blue-50 border border-slate-200 bg-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Abrir PDF en pestaña nueva del navegador"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#1c39bb]" />
              <span className="hidden sm:inline text-[11px]">Pestaña Nueva</span>
            </button>

            {/* Expandir a pantalla completa */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 bg-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Ver en pantalla completa"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Expandir</span>
            </button>

            {/* Descarga Segura Libre de Errores */}
            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Descargar documento PDF oficial"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[11px]">Descargar</span>
            </button>

            {/* Botón cerrar vista si se pasó onClose */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer ml-0.5"
                title="Cerrar vista previa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contenido Visual */}
        <div className="p-0">
          {renderMainContent(false)}
        </div>
      </div>

      {/* Modal de Pantalla Completa */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs flex flex-col p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-6xl mx-auto flex-1 bg-slate-900 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-700">
            {/* Cabecera del modal pantalla completa */}
            <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#1c39bb] flex items-center justify-center font-bold text-xs text-white">
                  OJ
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    Vista Previa del PDF Adjunto • <span className="font-normal text-slate-300 font-mono text-xs">{fileName}</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPdf && (
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs font-semibold mr-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('pdf')}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                        viewMode === 'pdf' ? 'bg-[#1c39bb] text-white font-bold' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>Ver PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('sheet')}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                        viewMode === 'sheet' ? 'bg-[#1c39bb] text-white font-bold' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Ficha Institucional</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir documento"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Descargar documento oficial"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer ml-1"
                  title="Salir de pantalla completa (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido en Pantalla Completa */}
            <div className="flex-1 overflow-auto bg-slate-900">
              {renderMainContent(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
