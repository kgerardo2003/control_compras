import React, { useState } from 'react';
import { PurchaseRecord, User } from '../types';
import { generatePurchasesPDF } from '../utils/pdfExport';
import { formatQuetzales } from '../utils/formatters';
import { 
  FileText, 
  X, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  Hash, 
  Printer 
} from 'lucide-react';
import { OJLogo } from './OJLogo';
import { useApp } from '../context/AppContext';

interface ExportPdfModalProps {
  purchases: PurchaseRecord[];
  currentUser: User | null;
  filterInfo?: {
    search?: string;
    status?: string;
    area?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (filename: string) => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  purchases,
  currentUser,
  filterInfo,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useApp();
  const [documentTitle, setDocumentTitle] = useState('REPORTE OFICIAL DE ADQUISICIONES TECNOLÓGICAS');
  const [documentSubtitle, setDocumentSubtitle] = useState('Control institucional de eventos NOG, formularios F56-e y dictámenes técnicos');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalMonto = purchases.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const conDictamen = purchases.filter(p => p.evaluadoGIT === 'Sí').length;
  const adjudicados = purchases.filter(p => p.estatusEvento === 'Adjudicación').length;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const filename = generatePurchasesPDF({
        purchases,
        title: documentTitle,
        subtitle: documentSubtitle,
        filterInfo,
        currentUser,
        filenamePrefix: 'Reporte_Adquisiciones_GIT_OJ',
      });
      setDownloadSuccess(filename);
      onSuccess?.(filename);
    } catch (err) {
      console.error('Error generando PDF:', err);
      showToast({
        type: 'error',
        title: 'Error al Generar PDF',
        message: 'Ocurrió un inconveniente al compilar el documento PDF oficial.',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6">
        
        {/* Encabezado del Modal */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Exportación Oficial a Formato PDF</h3>
              <p className="text-[11px] text-slate-400">Generador de tablas institucionales con cabecera y trazabilidad de auditoría</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Vista previa de Cabecera Institucional */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-900 p-3.5 text-white flex items-center justify-between border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20">
                  <Building2 className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wide text-white uppercase">Organismo Judicial de Guatemala</h4>
                  <p className="text-[10px] font-bold text-amber-400">Gerencia de Informática</p>
                  <p className="text-[9px] text-slate-300">Sistema Integral de Control de Adquisiciones de TI</p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-[9px] uppercase font-bold text-amber-400 block">Control de Auditoría</span>
                <span className="text-xs font-mono font-bold text-white block">AUD-OJ-2026-OFICIAL</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 text-xs space-y-1.5 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha de Generación: <strong className="text-slate-900">{dateFormatted}, {timeFormatted}</strong>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Emisor: <strong className="text-slate-900">{currentUser?.nombreCompleto || 'Auditor GIT'} ({currentUser?.rol || 'Administrador'})</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Resumen de los Registros a Exportar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Adquisiciones</span>
              <span className="text-lg font-black text-slate-800">{purchases.length}</span>
              <span className="text-[10px] text-slate-500 block">Registros seleccionados</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Monto Acumulado</span>
              <span className="text-sm font-black text-slate-800 font-mono truncate block">{formatQuetzales(totalMonto)}</span>
              <span className="text-[10px] text-emerald-600 font-medium block">Presupuesto total</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Dictamen GIT</span>
              <span className="text-lg font-black text-emerald-700">{conDictamen}</span>
              <span className="text-[10px] text-slate-500 block">Con informe técnico</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Adjudicadas</span>
              <span className="text-lg font-black text-blue-700">{adjudicados}</span>
              <span className="text-[10px] text-slate-500 block">Con proveedor</span>
            </div>
          </div>

          {/* Parámetros Editables del Informe */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuración del Documento</h4>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título Institucional del Reporte
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtítulo / Objeto del Documento
              </label>
              <input
                type="text"
                value={documentSubtitle}
                onChange={(e) => setDocumentSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            {filterInfo && (
              <div className="text-[11px] text-slate-500 pt-1">
                <span className="font-semibold text-slate-700">Filtros actuales: </span>
                {filterInfo.status && filterInfo.status !== 'todos' ? `Estatus: ${filterInfo.status}, ` : ''}
                {filterInfo.area && filterInfo.area !== 'todas' ? `Área: ${filterInfo.area}, ` : ''}
                {filterInfo.search ? `Búsqueda: "${filterInfo.search}"` : 'Sin filtros de búsqueda'}
              </div>
            )}
          </div>

          {/* Aviso de confirmación de descarga */}
          {downloadSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">¡PDF generado y descargado exitosamente!</p>
                <p className="text-[10px] font-mono text-emerald-700 mt-0.5">{downloadSuccess}</p>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Acciones Inferior */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || purchases.length === 0}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generando PDF...' : 'Descargar PDF Institucional'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
