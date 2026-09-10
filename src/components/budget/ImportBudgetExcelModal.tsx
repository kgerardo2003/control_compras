import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { BudgetLineItem, BudgetDisponibilidadStatus } from '../../types';
import { downloadBudgetExcelTemplate } from '../../utils/budgetCalculations';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  FileCheck2,
  HelpCircle
} from 'lucide-react';

interface ImportBudgetExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportBudgetExcelModal: React.FC<ImportBudgetExcelModalProps> = ({ isOpen, onClose }) => {
  const { importBudgetLines, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedLines, setParsedLines] = useState<Omit<BudgetLineItem, 'id' | 'fechaCreacion'>[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleanStr = String(val).replace(/Q|\$|,|\s/g, '').replace(/%/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const cleanText = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  };

  const handleFileProcess = async (selectedFile: File) => {
    setErrorMsg(null);
    setIsLoading(true);
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawData || rawData.length === 0) {
        setErrorMsg('El archivo de Excel seleccionado está vacío o no contiene filas de datos legibles.');
        setIsLoading(false);
        return;
      }

      // Mapeo flexible e inteligente de columnas
      const lines: Omit<BudgetLineItem, 'id' | 'fechaCreacion'>[] = [];

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Buscar clave para Grupo Presupuestario
        const grupoKey = Object.keys(row).find(k => /grupo/i.test(k));
        const grupoVal = cleanText(grupoKey ? row[grupoKey] : row['Grupo Presupuestario'] || row['Grupo']);

        // Buscar clave para Renglón Presupuestario
        const renglonKey = Object.keys(row).find(k => /rengl[oó]n/i.test(k) && !/nombre/i.test(k));
        const renglonVal = cleanText(renglonKey ? row[renglonKey] : row['Renglón Presupuestario'] || row['Renglon']);

        // Buscar clave para Nombre del Renglón
        const nombreKey = Object.keys(row).find(k => /nombre/i.test(k) || /descripci[oó]n/i.test(k) || /concepto/i.test(k));
        const nombreVal = cleanText(nombreKey ? row[nombreKey] : row['Nombre del Renglón'] || row['Nombre']);

        // Si no tiene al menos renglón o nombre, saltar línea vacía
        if (!renglonVal && !nombreVal) continue;

        // Montos numéricos
        const pInicialKey = Object.keys(row).find(k => /inicial/i.test(k) || /aprobado/i.test(k) || /asignado/i.test(k));
        const modKey = Object.keys(row).find(k => /modifica/i.test(k) || /ajuste/i.test(k));
        const vigKey = Object.keys(row).find(k => /vigente/i.test(k));
        const pagKey = Object.keys(row).find(k => /pagad/i.test(k) || /devengad/i.test(k) || /rebaja/i.test(k));
        const dispRealKey = Object.keys(row).find(k => /disponible\s*real/i.test(k) || (/real/i.test(k) && /disp/i.test(k)));
        const compKey = Object.keys(row).find(k => /compromet/i.test(k) || /pendient/i.test(k));
        const dispProyKey = Object.keys(row).find(k => /proyectad/i.test(k) || (/proy/i.test(k) && /disp/i.test(k)));
        const pctKey = Object.keys(row).find(k => /porcentaje/i.test(k) || /%/i.test(k) || /usado/i.test(k) || /ejecut/i.test(k));
        const estatusKey = Object.keys(row).find(k => /estatus/i.test(k) || /estado/i.test(k) || /disponibilidad/i.test(k));

        const presupuestoInicial = parseNumber(pInicialKey ? row[pInicialKey] : 0);
        let modificacionesAprobadas = parseNumber(modKey ? row[modKey] : 0);
        const rawVigente = vigKey && row[vigKey] !== '' && row[vigKey] !== null ? parseNumber(row[vigKey]) : null;

        // Si no venía columna explícita de modificaciones pero sí venía presupuesto vigente:
        if (!modKey && rawVigente !== null && rawVigente !== presupuestoInicial) {
          modificacionesAprobadas = Math.round((rawVigente - presupuestoInicial) * 100) / 100;
        }

        // REGLA INSTITUCIONAL: Presupuesto Vigente = Presupuesto Inicial + Modificaciones Aprobadas (+/-)
        const presupuestoVigente = Math.round((presupuestoInicial + modificacionesAprobadas) * 100) / 100;

        const pagadoQueRebaja = parseNumber(pagKey ? row[pagKey] : 0);
        const disponibleReal = dispRealKey && row[dispRealKey] !== '' 
          ? parseNumber(row[dispRealKey]) 
          : (presupuestoVigente - pagadoQueRebaja);

        const comprometidoPendiente = parseNumber(compKey ? row[compKey] : 0);
        const disponibleProyectado = dispProyKey && row[dispProyKey] !== '' 
          ? parseNumber(row[dispProyKey]) 
          : (disponibleReal - comprometidoPendiente);

        let pctVal = pctKey ? parseNumber(row[pctKey]) : 0;
        if (pctVal === 0 && presupuestoVigente > 0) {
          pctVal = ((pagadoQueRebaja + comprometidoPendiente) / presupuestoVigente) * 100;
        }

        // Determinar o leer estatus
        let estatus: BudgetDisponibilidadStatus = 'Con Disponibilidad';
        const rawEstatus = estatusKey ? cleanText(row[estatusKey]).toLowerCase() : '';
        if (rawEstatus.includes('sin') || rawEstatus.includes('no') || rawEstatus.includes('agotad')) {
          estatus = 'Sin Disponibilidad';
        } else if (rawEstatus.includes('baja') || rawEstatus.includes('alerta') || rawEstatus.includes('crítica')) {
          estatus = 'Alerta Disponibilidad Baja';
        } else if (disponibleProyectado <= 0) {
          estatus = 'Sin Disponibilidad';
        } else if (disponibleProyectado < (presupuestoVigente * 0.15)) {
          estatus = 'Alerta Disponibilidad Baja';
        }

        // Deducir grupo si no viene explícito
        let inferredGroup = grupoVal;
        if (!inferredGroup) {
          const rNum = parseInt(renglonVal, 10);
          if (rNum >= 100 && rNum < 200) inferredGroup = 'Grupo 100 - Servicios No Personales';
          else if (rNum >= 200 && rNum < 300) inferredGroup = 'Grupo 200 - Materiales y Suministros';
          else if (rNum >= 300 && rNum < 400) inferredGroup = 'Grupo 300 - Propiedad, Planta, Equipo e Intangibles';
          else inferredGroup = 'Otros Grupos Presupuestarios';
        }

        lines.push({
          grupoPresupuestario: inferredGroup,
          renglonPresupuestario: renglonVal || `R-${i + 1}`,
          nombreRenglon: nombreVal || `Renglón ${renglonVal}`,
          presupuestoInicial,
          modificacionesAprobadas,
          presupuestoVigente,
          pagadoQueRebaja,
          disponibleReal,
          comprometidoPendiente,
          disponibleProyectado,
          porcentajeUsadoComprometido: Math.round(pctVal * 100) / 100,
          estatusDisponibilidad: estatus,
          ejercicioFiscal: 2026,
          observaciones: cleanText(row['Observaciones'] || row['Notas'] || '')
        });
      }

      if (lines.length === 0) {
        setErrorMsg('No se detectaron renglones válidos en el archivo de Excel. Verifique que las columnas contengan Renglón, Nombre y Presupuesto.');
        setIsLoading(false);
        return;
      }

      setParsedLines(lines);
    } catch (err: any) {
      console.error('Error procesando Excel de presupuesto:', err);
      setErrorMsg(`Error al procesar el archivo Excel: ${err?.message || 'Formato no soportado'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
        handleFileProcess(droppedFile);
      } else {
        setErrorMsg('Por favor arrastre un archivo válido de Excel (.xlsx o .xls).');
      }
    }
  };

  const handleConfirmImport = async () => {
    if (parsedLines.length === 0) return;
    setIsLoading(true);
    try {
      await importBudgetLines(parsedLines, importMode === 'replace');
      onClose();
    } catch (err: any) {
      setErrorMsg(`Error guardando presupuesto: ${err?.message || 'Error inesperado'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Totales calculados de la vista previa
  const totalInicial = parsedLines.reduce((s, l) => s + l.presupuestoInicial, 0);
  const totalVigente = parsedLines.reduce((s, l) => s + l.presupuestoVigente, 0);
  const totalPagado = parsedLines.reduce((s, l) => s + l.pagadoQueRebaja, 0);
  const totalComprometido = parsedLines.reduce((s, l) => s + l.comprometidoPendiente, 0);
  const totalDisponibleProy = parsedLines.reduce((s, l) => s + l.disponibleProyectado, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Importar Presupuesto Institucional desde Excel
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-semibold">
                  Gerencia de Informática
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Carga la matriz de disponibilidades por grupo y renglón presupuestario con las 12 columnas oficiales.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-slate-50/50">

          {/* Banner de descarga de plantilla modelo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-blue-950">¿Necesita la plantilla oficial de Excel?</h4>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Descargue la hoja de cálculo modelo con las 12 columnas requeridas: Grupo, Renglón, Nombre, Inicial, Modificaciones, Vigente, Pagado, Disponible Real, Comprometido, Proyectado, % Usado y Estatus.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadBudgetExcelTemplate}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs whitespace-nowrap transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plantilla Excel</span>
            </button>
          </div>

          {/* Zona Drag & Drop */}
          {parsedLines.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]' 
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-3 shadow-xs">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Arrastre su archivo Excel de Presupuesto aquí
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Compatible con libros de trabajo Microsoft Excel (.xlsx, .xls) generados por SICOIN, DAF o elaborados internamente en Informática.
              </p>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm hover:bg-slate-800 transition-all">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Examinar Archivo en el Equipo
              </span>
            </div>
          ) : (
            /* Vista Previa de Datos Analizados */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Archivo cargado: <span className="text-emerald-700">{file?.name}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {parsedLines.length} renglones presupuestarios detectados y listos para importar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setParsedLines([]); setFile(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cambiar Archivo</span>
                  </button>
                </div>
              </div>

              {/* Tarjetas Resumen de lo que se va a importar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Vigente</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    Q. {totalVigente.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Pagado Rebaja</div>
                  <div className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                    Q. {totalPagado.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Comprometido</div>
                  <div className="text-sm font-bold text-amber-700 font-mono mt-0.5">
                    Q. {totalComprometido.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Disponible Proyectado</div>
                  <div className={`text-sm font-bold font-mono mt-0.5 ${totalDisponibleProy >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    Q. {totalDisponibleProy.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Renglones</div>
                  <div className="text-sm font-bold text-purple-700 font-mono mt-0.5">
                    {parsedLines.length} ítems
                  </div>
                </div>
              </div>

              {/* Opciones de Fusión vs Reemplazo */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-slate-800">Modo de Guardado en el Sistema:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'merge' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Actualizar y Fusionar (Recomendado)</div>
                      <div className="text-[11px] text-slate-500">
                        Actualiza los renglones coincidentes y agrega los nuevos sin borrar modificaciones existentes.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'replace' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Reemplazo Completo</div>
                      <div className="text-[11px] text-slate-500">
                        Sustituye la matriz completa con la lista del archivo Excel cargado.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tabla de Previsualización (12 columnas) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Previsualización de Matriz (Primeros 10 registros)</span>
                  <span className="text-[11px] text-slate-500 font-mono">Mostrando {Math.min(10, parsedLines.length)} de {parsedLines.length}</span>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 whitespace-nowrap">Grupo</th>
                        <th className="px-3 py-2 whitespace-nowrap">Renglón</th>
                        <th className="px-3 py-2 whitespace-nowrap">Nombre</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Presupuesto Inicial</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Modif. Aprobadas</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Presupuesto Vigente</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Pagado Rebaja</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Disponible Real</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Comprometido</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Disp. Proyectado</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">% Usado</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {parsedLines.slice(0, 10).map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-medium text-slate-600 max-w-[150px] truncate" title={line.grupoPresupuestario}>
                            {line.grupoPresupuestario}
                          </td>
                          <td className="px-3 py-1.5 font-mono font-bold text-blue-950">
                            {line.renglonPresupuestario}
                          </td>
                          <td className="px-3 py-1.5 font-medium text-slate-800 max-w-[200px] truncate" title={line.nombreRenglon}>
                            {line.nombreRenglon}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            Q. {line.presupuestoInicial.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-3 py-1.5 text-right font-mono font-semibold ${line.modificacionesAprobadas >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {line.modificacionesAprobadas >= 0 ? '+' : ''}Q. {line.modificacionesAprobadas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                            Q. {line.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-blue-700">
                            Q. {line.pagadoQueRebaja.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800">
                            Q. {line.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-amber-700">
                            Q. {line.comprometidoPendiente.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-3 py-1.5 text-right font-mono font-bold ${line.disponibleProyectado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            Q. {line.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono font-semibold">
                            {line.porcentajeUsadoComprometido.toFixed(1)}%
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              line.estatusDisponibilidad === 'Con Disponibilidad' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : line.estatusDisponibilidad === 'Alerta Disponibilidad Baja'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {line.estatusDisponibilidad}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {parsedLines.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Procesando y Sincronizando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Importar {parsedLines.length} Renglones</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
