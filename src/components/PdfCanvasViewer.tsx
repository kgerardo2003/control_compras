import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ExternalLink,
  Maximize2,
  RefreshCw,
  AlertCircle,
  FileText,
  Layers
} from 'lucide-react';
import { AttachedDocument, PurchaseRecord } from '../types';
import { getDocumentBlob, downloadDocumentFile } from '../utils/documentUtils';

// Configuración del worker de PDF.js para Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfCanvasViewerProps {
  document: AttachedDocument;
  purchase?: Partial<PurchaseRecord>;
  isFullscreen?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  document: doc,
  purchase,
  isFullscreen = false,
  onExpand,
  onClose
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewAllPages, setViewAllPages] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Cargar el documento PDF con PDF.js
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const blob = getDocumentBlob(doc, purchase);
        const arrayBuffer = await blob.arrayBuffer();
        
        if (!isMounted) return;

        // Cargar documento en PDF.js usando los bytes del Blob
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true
        });

        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err: any) {
        console.warn('Error al cargar PDF con PDF.js, intentando visor alternativo:', err);
        if (isMounted) {
          setError(err?.message || 'No se pudo procesar el PDF');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [doc?.dataUrl, doc?.nombre, purchase]);

  // Renderizar la página actual en el elemento Canvas
  useEffect(() => {
    if (!pdfDocRef.current || loading || error || viewAllPages) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDocRef.current.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Calcular viewport con escala y rotación
        const viewport = page.getViewport({ scale, rotation });

        // Ajustar resolución nítida para pantallas de alta densidad (HiDPI / Retina)
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: transform || undefined
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error al renderizar página del PDF:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [currentPage, scale, rotation, loading, error, viewAllPages]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage(prev => prev + 1);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetZoom = () => {
    setScale(1.15);
    setRotation(0);
  };

  const handleDownload = () => {
    downloadDocumentFile(doc, purchase);
  };

  const handleOpenNewTab = () => {
    try {
      const blob = getDocumentBlob(doc, purchase);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) handleDownload();
    } catch {
      handleDownload();
    }
  };

  // Fallback si PDF.js no pudo cargar
  if (error) {
    let fallbackBlobUrl = '';
    try {
      const blob = getDocumentBlob(doc, purchase);
      fallbackBlobUrl = URL.createObjectURL(blob);
    } catch {}

    return (
      <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col items-center justify-center min-h-[350px]">
        <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
        <h4 className="text-sm font-bold mb-1">Visualización de PDF</h4>
        <p className="text-xs text-slate-300 max-w-md text-center mb-4">
          El documento está listo. Puede abrirlo directamente o descargarlo de forma segura.
        </p>
        <div className="flex items-center gap-2">
          {fallbackBlobUrl && (
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir PDF en Ventana Nueva
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar Documento PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-700 select-none">
      {/* Barra de herramientas del visor de PDF */}
      <div className="px-3 py-2 bg-slate-950/90 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Paginación */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 cursor-pointer transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-200 min-w-[85px] text-center">
            {loading ? 'Cargando...' : `Pág. ${currentPage} de ${numPages || 1}`}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 cursor-pointer transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Controles de Zoom y Rotación */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={loading}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={loading}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRotate}
            disabled={loading}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer border border-slate-700"
            title="Rotar página 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            disabled={loading}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer border border-slate-700"
            title="Restablecer tamaño"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Acciones del archivo */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-slate-700"
            title="Abrir PDF en pestaña nueva de Google Chrome"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Pestaña Nueva</span>
          </button>

          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-slate-700"
              title="Expandir a pantalla completa"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pantalla Completa</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Descargar este archivo PDF a su equipo"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar</span>
          </button>
        </div>
      </div>

      {/* Área del Canvas donde se renderizan las páginas reales del PDF */}
      <div 
        className={`w-full overflow-auto bg-slate-900/95 flex items-center justify-center p-3 sm:p-6 ${
          isFullscreen ? 'max-h-[85vh]' : 'min-h-[440px] max-h-[560px]'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-3" />
            <p className="text-xs font-semibold text-slate-200">
              Renderizando páginas del PDF adjunto...
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {doc.nombre}
            </p>
          </div>
        ) : (
          <div className="relative shadow-2xl rounded-sm transition-transform duration-150 inline-block bg-white">
            <canvas ref={canvasRef} className="block mx-auto" />
          </div>
        )}
      </div>

      {/* Barra de estado inferior */}
      <div className="px-3 py-1.5 bg-slate-950 text-[11px] text-slate-400 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="truncate font-medium text-slate-300">{doc.nombre}</span>
          {doc.tamano ? (
            <span className="text-slate-400 hidden sm:inline">
              ({(doc.tamano / 1024).toFixed(0)} KB)
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-emerald-400 font-medium hidden sm:inline">
            ● Renderizado Directo (Sin Plugins)
          </span>
          <span className="font-mono text-slate-400">
            {currentPage} / {numPages || 1}
          </span>
        </div>
      </div>
    </div>
  );
};
