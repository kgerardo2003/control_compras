import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  DollarSign, 
  FileCheck2,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { formatQuetzales, formatDate, exportToCSV, getModalidadCompraByMonto } from '../utils/formatters';
import { generatePurchasesPDF } from '../utils/pdfExport';

export const ReportsView: React.FC = () => {
  const { purchases, logAudit, currentUser, showToast } = useApp();

  const [selectedReportType, setSelectedReportType] = useState<'consolidado' | 'git' | 'adjudicados' | 'anual'>('consolidado');
  const [reportPdfFeedback, setReportPdfFeedback] = useState<string | null>(null);

  const totalMonto = purchases.reduce((acc, p) => acc + (p.monto || 0), 0);
  const adjudicados = purchases.filter(p => p.estatusEvento === 'Adjudicación');
  const montoAdjudicado = adjudicados.reduce((acc, p) => acc + (p.monto || 0), 0);
  const evaluadosGIT = purchases.filter(p => p.evaluadoGIT === 'Sí');

  const handlePrint = () => {
    window.print();
  };

  const handleExportFullCSV = () => {
    const rows = purchases.map(p => ({
      NOG: p.nog,
      'F56-e': p.f56e,
      F56: p.f56,
      'Área Solicitante': p.areaSolicitante || 'Soporte técnico',
      'Descripción': p.descripcion,
      'Fecha Solicitud': p.fechaSolicitud,
      'Fecha Vo.Bo.': p.fechaVoBo,
      'Fecha Autorizado': p.fechaAutorizado,
      'Fecha Publicación': p.fechaPublicacion,
      'Fecha Ofertas': p.fechaOfertas,
      'Fecha Dictamen Técnico': p.fechaDictamenGIT || 'N/A',
      'Fecha Oficio GIT': p.fechaElaboracionOficioGIT || 'N/A',
      'Cantidad Ofertas': p.cantidadOfertas,
      'Monto (GTQ)': p.monto,
      'Evaluado por el Área Técnica Correspondiente': p.evaluadoGIT,
      'Estatus': p.estatusEvento,
      'Categoría': p.categoriaTecnologica || 'N/A',
      'Dependencia': p.dependenciaSolicitante || 'N/A',
      'Modalidad': p.modalidadCompra || getModalidadCompraByMonto(p.monto).nombre,
      'Proveedor': p.proveedorAdjudicado || 'N/A',
    }));
    exportToCSV(`Informe_Consolidado_Adquisiciones_OJ_GIT_${new Date().toISOString().slice(0, 10)}`, rows);
    logAudit('EXPORTAR_DATOS', 'Reportes', 'Generación y exportación de informe consolidado.');
    showToast({
      type: 'success',
      title: 'Reporte CSV Exportado Exitosamente',
      message: `Se descargaron ${rows.length} registros en formato CSV.`,
      duration: 5000,
    });
  };

  const handleExportReportPDF = () => {
    let dataset = purchases;
    let reportName = 'Consolidado General';
    if (selectedReportType === 'adjudicados') {
      dataset = adjudicados;
      reportName = 'Eventos Adjudicados';
    } else if (selectedReportType === 'git') {
      dataset = evaluadosGIT;
      reportName = 'Dictámenes Técnicos GIT';
    }

    try {
      const filename = generatePurchasesPDF({
        purchases: dataset,
        title: `INFORME INSTITUCIONAL: ${reportName.toUpperCase()}`,
        subtitle: 'Control y auditoría oficial de contrataciones y adquisiciones tecnológicas',
        filterInfo: {
          status: selectedReportType === 'adjudicados' ? 'Adjudicación' : undefined,
        },
        currentUser,
        filenamePrefix: `Informe_Institucional_${selectedReportType}`,
      });
      logAudit('EXPORTAR_DATOS', 'Reportes', `Exportación de informe oficial "${reportName}" a PDF (${filename}).`);
      showToast({
        type: 'success',
        title: 'Reporte PDF Exportado Exitosamente',
        message: `Informe oficial "${reportName}" generado y descargado (${filename}).`,
        duration: 6000,
      });
    } catch (err) {
      console.error('Error generando PDF de reporte:', err);
      showToast({
        type: 'error',
        title: 'Error al Generar Reporte',
        message: 'No fue posible exportar el informe en formato PDF.',
        duration: 5000,
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo de Reportes (Professional Polish) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Reportes e Informes Institucionales
          </h2>
          <p className="text-xs text-slate-500">
            Consolidado de ejecución presupuestaria, estadísticas Guatecompras y dictámenes
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-report-pdf"
            type="button"
            onClick={handleExportReportPDF}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-rose-800 border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Exportar informe a formato PDF oficial con cabecera y control de auditoría"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Exportar PDF</span>
          </button>
          <button
            id="btn-print-report"
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-black" />
            <span>Imprimir</span>
          </button>
          <button
            id="btn-export-full-report-csv"
            type="button"
            onClick={handleExportFullCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-black" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {reportPdfFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{reportPdfFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setReportPdfFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selector de Tipo de Informe */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <button
          type="button"
          onClick={() => setSelectedReportType('consolidado')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'consolidado'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Consolidado General</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'consolidado' ? 'text-slate-300' : 'text-slate-400'}`}>
            Todos los eventos y montos
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedReportType('adjudicados')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'adjudicados'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Adjudicados</span>
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'adjudicados' ? 'text-slate-300' : 'text-slate-400'}`}>
            {adjudicados.length} adjudicaciones resueltas
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedReportType('git')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'git'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Dictámenes GIT</span>
            <FileCheck2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'git' ? 'text-slate-300' : 'text-slate-400'}`}>
            {evaluadosGIT.length} con dictamen técnico
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedReportType('anual')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedReportType === 'anual'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Balance Financiero</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <p className={`text-[11px] mt-1 ${selectedReportType === 'anual' ? 'text-slate-300' : 'text-slate-400'}`}>
            {formatQuetzales(totalMonto)}
          </p>
        </button>
      </div>

      {/* Documento de Reporte Imprimible Oficial */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 text-slate-900">
        
        {/* Cabecera del Documento */}
        <div className="border-b border-slate-200 pb-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-amber-500 font-bold text-sm">
              OJ
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                Organismo Judicial de Guatemala
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                Gerencia de Informática • Informe de Adquisiciones
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500">
            <p><strong>Fecha de Emisión:</strong> {formatDate(new Date().toISOString().slice(0, 10))}</p>
            <p><strong>Período:</strong> 2026</p>
          </div>
        </div>

        {/* Resumen Ejecutivo */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 text-xs">
          <div>
            <span className="text-slate-500 block">Total Eventos:</span>
            <span className="text-base font-bold text-slate-900">{purchases.length} registros</span>
          </div>
          <div>
            <span className="text-slate-500 block">Presupuesto Comprometido:</span>
            <span className="text-base font-bold text-slate-900 font-mono">{formatQuetzales(totalMonto)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Monto Adjudicado:</span>
            <span className="text-base font-bold text-emerald-600 font-mono">{formatQuetzales(montoAdjudicado)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Cobertura Dictamen GIT:</span>
            <span className="text-base font-bold text-amber-600">
              {purchases.length > 0 ? Math.round((evaluadosGIT.length / purchases.length) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Tabla Detallada de Adquisiciones */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800 border-collapse border border-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="border border-slate-200 p-2">NOG</th>
                <th className="border border-slate-200 p-2">F56-e / F56</th>
                <th className="border border-slate-200 p-2">Área Solicitante</th>
                <th className="border border-slate-200 p-2">Descripción del Requerimiento</th>
                <th className="border border-slate-200 p-2">Fecha Sol.</th>
                <th className="border border-slate-200 p-2 text-right">Monto (GTQ)</th>
                <th className="border border-slate-200 p-2 text-center whitespace-nowrap">Evaluado por el Área Técnica</th>
                <th className="border border-slate-200 p-2 text-center whitespace-nowrap">Estatus del Evento</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="border border-slate-200 p-2 font-mono font-bold text-slate-900">{p.nog}</td>
                  <td className="border border-slate-200 p-2 font-mono">
                    <span className="font-semibold block">{p.f56e}</span>
                    <span className="text-[10px] text-slate-400">{p.f56}</span>
                  </td>
                  <td className="border border-slate-200 p-2 font-medium text-slate-700 whitespace-nowrap">{p.areaSolicitante || 'Soporte técnico'}</td>
                  <td className="border border-slate-200 p-2 max-w-xs">{p.descripcion}</td>
                  <td className="border border-slate-200 p-2">{formatDate(p.fechaSolicitud)}</td>
                  <td className="border border-slate-200 p-2 text-right font-bold text-slate-900">{formatQuetzales(p.monto)}</td>
                  <td className="border border-slate-200 p-2 text-center font-bold">{p.evaluadoGIT === 'Sí' ? 'Sí (GIT)' : 'No'}</td>
                  <td className="border border-slate-200 p-2 text-center font-bold uppercase text-[10px]">{p.estatusEvento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cierre y Firmas */}
        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-slate-300 mb-2 h-10" />
            <p className="font-bold text-slate-800">Dirección de Auditoría Interna</p>
            <p className="text-[11px] text-slate-400">Organismo Judicial de Guatemala</p>
          </div>
          <div>
            <div className="border-b border-slate-300 mb-2 h-10" />
            <p className="font-bold text-slate-800">Gerencia de Informática</p>
            <p className="text-[11px] text-slate-400">Visto Bueno y Conformidad Técnica</p>
          </div>
        </div>

      </div>

    </div>
  );
};
