import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  FileText, 
  Check, 
  Layers, 
  HelpCircle, 
  Info,
  Calendar,
  Building2,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { PurchaseRecord, EvaluacionGIT } from '../types';
import { formatQuetzales } from '../utils/formatters';

interface ParsedRow {
  index: number;
  data: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'>;
  isValid: boolean;
  errors: string[];
}

export const ImportExcelModal: React.FC = () => {
  const { isImportModalOpen, setIsImportModalOpen, importPurchases, catalogs } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');

  if (!isImportModalOpen) return null;

  // Catálogo de estatus válidos para normalizar
  const estatusOptions = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO')?.items.map(i => i.nombre) || [
    'Evaluación',
    'Adjudicación',
    'Prescindido',
    'Desierto'
  ];

  // Helper para normalizar fechas desde Excel (números de serie o texto en formato DD/MM/YYYY, YYYY-MM-DD)
  const normalizeExcelDate = (val: any, fallback?: string): string | undefined => {
    if (!val || val === '' || val === null || val === undefined) return fallback;
    
    // Si viene como número de serie de Excel (ej. 45321)
    if (typeof val === 'number') {
      try {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 10);
        }
      } catch {
        // fallback
      }
    }

    const str = String(val).trim();
    if (!str) return fallback;

    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // Formato DD/MM/YYYY o DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // Intento con objeto Date
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }

    return fallback;
  };

  // Helper para normalizar montos (limpiar Q, comas, espacios)
  const normalizeAmount = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Helper para normalizar cadenas
  const cleanHeader = (h: string): string => {
    return h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]/g, '');      // Alfanumérico
  };

  // Procesa el archivo Excel
  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setGlobalError(null);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Leer la primera hoja
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('El archivo no contiene ninguna hoja de cálculo.');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        throw new Error('La hoja de cálculo está vacía o no contiene filas con datos.');
      }

      const rows: ParsedRow[] = jsonRows.map((rawRow, idx) => {
        const errors: string[] = [];

        // Buscar campos con coincidencias flexibles en encabezados
        const getVal = (candidates: string[]): any => {
          const keys = Object.keys(rawRow);
          for (const cand of candidates) {
            const candClean = cleanHeader(cand);
            for (const key of keys) {
              if (cleanHeader(key) === candClean) {
                return rawRow[key];
              }
            }
          }
          // Búsqueda por inclusión
          for (const cand of candidates) {
            const candClean = cleanHeader(cand);
            for (const key of keys) {
              if (cleanHeader(key).includes(candClean)) {
                return rawRow[key];
              }
            }
          }
          return '';
        };

        // 1. NOG (8 dígitos numéricos)
        let rawNog = String(getVal(['nog', 'numero nog', 'número nog', 'operacion nog', 'no nog', 'evento nog', 'evento', 'concurso', 'id nog'])).trim();
        const nogDigits = rawNog.replace(/\D/g, '');
        const nog = nogDigits.slice(0, 8).padStart(8, '0');
        if (!nog || nog === '00000000') {
          errors.push('NOG inválido o ausente (debe contener dígitos numéricos).');
        }

        // 2. F56-e (Tipo texto de 10 posiciones)
        let rawF56e = String(getVal(['f56e', 'forma f56e', 'f56-e', 'forma f-56e', 'formulario f56e', 'f-56e', 'f56 e'])).trim();
        let f56e = rawF56e ? rawF56e.slice(0, 10) : '00001-2026';

        // 3. F56 (Tipo texto de 6 posiciones)
        const f56Raw = String(getVal(['f56', 'formulario f56', 'f56 fisico', 'f56 físico', 'f56 original', 'forma f56', 'f-56', 'f 56'])).trim();
        const f56 = f56Raw ? f56Raw.slice(0, 6) : undefined;

        // 4. Descripción (Requerimiento institucional, máx 200 caracteres)
        const descripcion = String(getVal(['descripcion', 'descripción', 'objeto', 'bien o servicio', 'detalle', 'requerimiento', 'nombre evento', 'concepto'])).trim();
        if (!descripcion) {
          errors.push('La descripción del requerimiento es obligatoria.');
        }

        // 5. Área Solicitante
        const areaSolicitante = String(getVal(['area solicitante', 'área solicitante', 'area', 'área', 'unidad solicitante', 'seccion', 'sección', 'departamento'])).trim() || 'Soporte técnico';

        // 6. Fechas de Gestión (Solicitud, Vo.Bo., Autorización)
        const today = new Date().toISOString().slice(0, 10);
        const fechaSolicitud = normalizeExcelDate(getVal(['fecha solicitud', 'fecha de solicitud', 'solicitud', 'fecha f56e', 'fecha f-56e', 'fecha']), today) || today;
        const fechaVoBo = normalizeExcelDate(getVal(['fecha vobo', 'fecha vo.bo.', 'fecha vo bo', 'vobo', 'vo.bo.', 'vo bo']), fechaSolicitud) || fechaSolicitud;
        const fechaAutorizado = normalizeExcelDate(getVal(['fecha autorizado', 'fecha autorizacion', 'fecha autorización', 'autorizado', 'autorizacion']), fechaVoBo) || fechaVoBo;

        // 7. Fechas de Concurso (Publicación y Cierre de Ofertas)
        const fechaPublicacion = normalizeExcelDate(getVal(['fecha publicacion', 'fecha publicación', 'publicacion', 'fecha de publicacion', 'fecha concurso', 'publicación']), fechaAutorizado) || today;
        const fechaOfertas = normalizeExcelDate(getVal(['fecha cierre ofertas', 'fecha cierre', 'cierre ofertas', 'fecha recepcion ofertas', 'cierre de ofertas', 'cierre', 'limite ofertas']), fechaPublicacion) || today;

        // 8. Monto (Ubicado después de la fecha de cierre de ofertas)
        const rawMonto = getVal(['monto', 'monto gtq', 'monto (gtq)', 'presupuesto / monto (gtq)', 'presupuesto / monto (q)', 'presupuesto', 'total', 'precio', 'monto quetzales', 'valor', 'presupuesto estimado', 'monto adjudicado']);
        const monto = normalizeAmount(rawMonto);

        // 9. Cantidad de ofertas
        const rawOfertas = getVal(['cantidad de ofertas', 'cantidad ofertas', 'ofertas', 'no ofertas', 'no. ofertas', 'postores', 'ofertas recibidas', 'numero ofertas', 'número ofertas']);
        const cantidadOfertas = Math.max(0, parseInt(String(rawOfertas).replace(/\D/g, ''), 10) || 0);

        // 10. Evaluado GIT & Fecha Dictamen
        const rawGit = String(getVal(['evaluado por la git', 'evaluado git', 'dictamen tecnico', 'dictamen técnico', 'evaluado por git', 'git', 'evaluacion git'])).toLowerCase();
        const evaluadoGIT: EvaluacionGIT = (rawGit.includes('si') || rawGit.includes('sí') || rawGit.includes('true') || rawGit === '1') ? 'Sí' : 'No';
        
        let fechaDictamenGIT: string | undefined = undefined;
        if (evaluadoGIT === 'Sí') {
          const rawDictDate = getVal(['fecha dictamen git', 'fecha dictamen', 'fecha dictamen tecnico', 'fecha dictamen técnico', 'fecha de dictamen']);
          fechaDictamenGIT = normalizeExcelDate(rawDictDate, fechaOfertas) || fechaOfertas;
        }

        // 11. Estatus del evento
        const rawEstatus = String(getVal(['estatus del evento', 'estatus evento', 'estatus', 'estado', 'estado evento', 'situacion', 'etapa'])).toLowerCase();
        let estatusEvento = 'Evaluación';
        if (rawEstatus.includes('adjudic')) {
          estatusEvento = 'Adjudicación';
        } else if (rawEstatus.includes('prescind')) {
          estatusEvento = 'Prescindido';
        } else if (rawEstatus.includes('desiert')) {
          estatusEvento = 'Desierto';
        }

        // 12. Si Adjudicado: Fecha de Adjudicación y Proveedor Adjudicado
        let fechaAdjudicacion: string | undefined = undefined;
        let proveedorAdjudicado: string | undefined = undefined;
        const rawProv = String(getVal(['proveedor adjudicado', 'proveedor', 'empresa adjudicada', 'empresa', 'adjudicatario', 'contratista', 'ganador'])).trim();
        const rawFechaAdj = getVal(['fecha de adjudicacion', 'fecha de adjudicación', 'fecha adjudicacion', 'fecha adjudicación', 'adjudicacion fecha']);

        if (estatusEvento === 'Adjudicación') {
          fechaAdjudicacion = normalizeExcelDate(rawFechaAdj, fechaOfertas) || fechaOfertas;
          proveedorAdjudicado = rawProv || 'Proveedor Adjudicado';
        } else {
          if (rawFechaAdj) fechaAdjudicacion = normalizeExcelDate(rawFechaAdj);
          if (rawProv) proveedorAdjudicado = rawProv;
        }

        // 13. Observaciones
        const observaciones = String(getVal(['observaciones', 'observacion', 'observación', 'notas', 'comentarios', 'detalle adicional', 'nota'])).trim() || undefined;

        const purchaseData: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'> = {
          nog,
          f56e,
          f56,
          descripcion: descripcion.slice(0, 200),
          areaSolicitante,
          fechaSolicitud,
          fechaVoBo,
          fechaAutorizado,
          fechaPublicacion,
          fechaOfertas,
          monto,
          cantidadOfertas,
          evaluadoGIT,
          fechaDictamenGIT,
          estatusEvento,
          fechaAdjudicacion,
          proveedorAdjudicado,
          categoriaTecnologica: 'Equipo Informático',
          dependenciaSolicitante: 'Gerencia de Informática',
          modalidadCompra: 'Cotización',
          observaciones,
        };

        return {
          index: idx + 1,
          data: purchaseData,
          isValid: errors.length === 0,
          errors,
        };
      });

      setParsedRows(rows);
      setActiveTab('preview');
    } catch (err: any) {
      console.error('Error procesando archivo Excel:', err);
      setGlobalError(err.message || 'Error al procesar el archivo. Verifique que sea un documento válido de Excel (.xlsx, .xls) o CSV.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Descarga la plantilla oficial en formato .xlsx
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'NOG': '19482041',
        'Descripción': 'Adquisición de Servidores Blade para Centro de Datos OJ',
        'Área Solicitante': 'Infraestructura',
        'F56-e': '00001-2026',
        'F56': '000001',
        'Fecha Solicitud': '2026-01-15',
        'Fecha Vo.Bo.': '2026-01-18',
        'Fecha Autorizado': '2026-01-20',
        'Fecha Publicación': '2026-01-25',
        'Fecha Cierre Ofertas': '2026-02-10',
        'Monto (GTQ)': 845000.00,
        'Cantidad de Ofertas': 4,
        'Evaluado GIT': 'Sí',
        'Fecha Dictamen GIT': '2026-02-14',
        'Estatus del Evento': 'Adjudicación',
        'Fecha Adjudicación': '2026-02-20',
        'Proveedor Adjudicado': 'Sistemas Integrados de Guatemala, S.A.',
        'Observaciones': 'Adquisición institucional prioritaria.',
      },
      {
        'NOG': '19482042',
        'Descripción': 'Licenciamiento de Seguridad Endpoint EDR para 4,500 terminales',
        'Área Solicitante': 'Seguridad de la Información',
        'F56-e': '00002-2026',
        'F56': '000002',
        'Fecha Solicitud': '2026-01-19',
        'Fecha Vo.Bo.': '2026-01-22',
        'Fecha Autorizado': '2026-01-25',
        'Fecha Publicación': '2026-02-01',
        'Fecha Cierre Ofertas': '2026-02-18',
        'Monto (GTQ)': 480000.00,
        'Cantidad de Ofertas': 3,
        'Evaluado GIT': 'Sí',
        'Fecha Dictamen GIT': '2026-02-22',
        'Estatus del Evento': 'Evaluación',
        'Fecha Adjudicación': '',
        'Proveedor Adjudicado': '',
        'Observaciones': 'En revisión de ofertas técnicas.',
      },
      {
        'NOG': '19482043',
        'Descripción': 'Renovación de Enlaces de Fibra Óptica para Sedes Departamentales',
        'Área Solicitante': 'Redes y Comunicaciones',
        'F56-e': '00003-2026',
        'F56': '000003',
        'Fecha Solicitud': '2026-01-28',
        'Fecha Vo.Bo.': '2026-02-02',
        'Fecha Autorizado': '2026-02-05',
        'Fecha Publicación': '2026-02-12',
        'Fecha Cierre Ofertas': '2026-02-28',
        'Monto (GTQ)': 320000.00,
        'Cantidad de Ofertas': 2,
        'Evaluado GIT': 'No',
        'Fecha Dictamen GIT': '',
        'Estatus del Evento': 'Evaluación',
        'Fecha Adjudicación': '',
        'Proveedor Adjudicado': '',
        'Observaciones': 'Contratación según modalidad cotización.',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Ajustar anchos de columnas
    const colWidths = [
      { wch: 12 }, // NOG
      { wch: 45 }, // Descripción
      { wch: 22 }, // Área Solicitante
      { wch: 14 }, // F56-e
      { wch: 10 }, // F56
      { wch: 15 }, // Fecha Solicitud
      { wch: 14 }, // Fecha Vo.Bo.
      { wch: 16 }, // Fecha Autorizado
      { wch: 18 }, // Fecha Publicación
      { wch: 20 }, // Fecha Cierre Ofertas
      { wch: 18 }, // Monto (GTQ)
      { wch: 18 }, // Cantidad de Ofertas
      { wch: 14 }, // Evaluado GIT
      { wch: 18 }, // Fecha Dictamen GIT
      { wch: 18 }, // Estatus del Evento
      { wch: 18 }, // Fecha Adjudicación
      { wch: 35 }, // Proveedor Adjudicado
      { wch: 30 }, // Observaciones
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adquisiciones_OJ');
    XLSX.writeFile(workbook, 'Plantilla_Oficial_Adquisiciones_OJ.xlsx');
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows(prev => prev.filter(r => r.index !== index));
  };

  const handleConfirmImport = async () => {
    const validData = parsedRows.filter(r => r.isValid).map(r => r.data);
    if (validData.length === 0) return;

    setIsProcessing(true);
    try {
      await importPurchases(validData, importMode === 'replace');
      setIsImportModalOpen(false);
      setParsedRows([]);
      setFile(null);
    } catch (err: any) {
      setGlobalError(`Error al importar registros: ${err.message || String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          setIsImportModalOpen(false);
        }
      }}
    >
      <div 
        id="modal-import-excel"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Institucional del Modal */}
        <div className="bg-[#0f2744] text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-500 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                Importar Adquisiciones desde Excel / CSV
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  .xlsx / .xls / .csv
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Carga masiva de expedientes para la Gerencia de Informática
              </p>
            </div>
          </div>
          <button 
            id="btn-close-import-modal"
            onClick={() => !isProcessing && setIsImportModalOpen(false)}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de pestañas y acciones superiores */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'upload' 
                  ? 'bg-white text-[#0f2744] shadow-sm border border-slate-200 font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              1. Cargar Archivo
            </button>
            <button
              onClick={() => parsedRows.length > 0 && setActiveTab('preview')}
              disabled={parsedRows.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview' 
                  ? 'bg-white text-[#0f2744] shadow-sm border border-slate-200 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              2. Vista Previa ({parsedRows.length})
            </button>
          </div>

          <button
            id="btn-download-template-excel"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-xs"
            title="Descargar archivo Excel de ejemplo con las columnas y formatos requeridos"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Descargar Plantilla Oficial Excel
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto grow space-y-5">
          {globalError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error en la importación</p>
                <p className="mt-0.5">{globalError}</p>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                    : 'border-slate-300 hover:border-[#0f2744] hover:bg-slate-50/80 bg-white'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
                
                <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-4 shadow-inner">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>

                <h4 className="text-base font-bold text-slate-800">
                  Arrastra tu hoja de Excel o haz clic para seleccionarla
                </h4>
                <p className="text-xs text-slate-500 max-w-md mt-1.5">
                  Compatible con libros de Excel (.xlsx, .xls) y archivos separados por comas (.csv). El sistema mapeará automáticamente los campos de la ficha.
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <button 
                    type="button" 
                    className="px-4 py-2 bg-[#0f2744] text-white text-xs font-semibold rounded-xl hover:bg-[#1a3a60] transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar Archivo de tu Equipo
                  </button>
                </div>
              </div>

              {/* Guía de Campos Soportados */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Campos reconocidos para Carga Masiva (Ficha completa: 18 columnas):
                  </h5>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Soporta 100+ registros
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs text-slate-600">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">1. NOG</strong>
                    <span className="text-[10.5px] text-slate-500">8 dígitos numéricos de Guatecompras</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">2. F56-e</strong>
                    <span className="text-[10.5px] text-slate-500">Texto de hasta 10 caracteres</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">3. F56 (Físico)</strong>
                    <span className="text-[10.5px] text-slate-500">Texto de hasta 6 caracteres</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">4. Descripción</strong>
                    <span className="text-[10.5px] text-slate-500">Requerimiento (máx 200 car.)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">5. Área Solicitante</strong>
                    <span className="text-[10.5px] text-slate-500">Soporte, Redes, Infraestructura...</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">6. Fecha Solicitud</strong>
                    <span className="text-[10.5px] text-slate-500">Fecha del requerimiento inicial</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">7. Fecha Vo.Bo.</strong>
                    <span className="text-[10.5px] text-slate-500">Fecha de visto bueno jefatura</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">8. Fecha Autorizado</strong>
                    <span className="text-[10.5px] text-slate-500">Fecha autorización gerencia</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">9. Fecha Publicación</strong>
                    <span className="text-[10.5px] text-slate-500">Publicación en Guatecompras</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">10. Fecha Cierre Ofertas</strong>
                    <span className="text-[10.5px] text-slate-500">Límite de recepción plicas</span>
                  </div>
                  <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                    <strong className="text-emerald-950 block font-mono text-[11px]">11. Monto (GTQ)</strong>
                    <span className="text-[10.5px] text-emerald-800">Ubicado tras cierre ofertas</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">12. Cantidad Ofertas</strong>
                    <span className="text-[10.5px] text-slate-500">Postores recibidos (numérico)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">13. Evaluado por Área Técnica</strong>
                    <span className="text-[10.5px] text-slate-500">Evaluado por Área Técnica (Sí / No)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">14. Dictamen GIT</strong>
                    <span className="text-[10.5px] text-slate-500">Fecha emisión dictamen técnico</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">15. Estatus Evento</strong>
                    <span className="text-[10.5px] text-slate-500">Evaluación, Adjudicación, etc.</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">16. Fecha Adjudicación</strong>
                    <span className="text-[10.5px] text-slate-500">Resolución de adjudicación</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">17. Proveedor Adjudicado</strong>
                    <span className="text-[10.5px] text-slate-500">Razón social de la empresa</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px]">18. Observaciones</strong>
                    <span className="text-[10.5px] text-slate-500">Notas o comentarios adicionales</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Barra de estadísticas y opciones de importación */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span>Total Filas:</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
                      {parsedRows.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <span>Válidas:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                      {validCount}
                    </span>
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                      <span>Con Observaciones:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                        {errorCount}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                    <span>Modo:</span>
                    <select
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                      className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-normal text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="append">Agregar a registros existentes</option>
                      <option value="replace">Reemplazar todos los registros actuales</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Tabla de previsualización */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-[380px] overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#0f2744] text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold text-center w-10">#</th>
                        <th className="py-2.5 px-3 font-semibold">NOG</th>
                        <th className="py-2.5 px-3 font-semibold">F56-e / F56</th>
                        <th className="py-2.5 px-3 font-semibold min-w-[200px]">Descripción / Área</th>
                        <th className="py-2.5 px-3 font-semibold">Publicación</th>
                        <th className="py-2.5 px-3 font-semibold">Cierre Ofertas</th>
                        <th className="py-2.5 px-3 font-semibold text-right text-emerald-300">Monto (GTQ)</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Ofertas</th>
                        <th className="py-2.5 px-3 font-semibold">Dictamen GIT</th>
                        <th className="py-2.5 px-3 font-semibold">Estatus</th>
                        <th className="py-2.5 px-3 font-semibold">Adjudicación</th>
                        <th className="py-2.5 px-2 font-semibold text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {parsedRows.map((row) => (
                        <tr 
                          key={row.index}
                          className={`hover:bg-slate-50 transition-colors ${
                            !row.isValid ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">
                            {row.index}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-900">
                            {row.data.nog}
                          </td>
                          <td className="py-2 px-3 font-mono">
                            <span className="font-semibold text-slate-800 block">{row.data.f56e}</span>
                            {row.data.f56 && (
                              <span className="text-[10px] text-slate-500 block">F56: {row.data.f56}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 max-w-xs" title={row.data.descripcion}>
                            <div className="truncate text-slate-800 font-medium">{row.data.descripcion}</div>
                            {row.data.areaSolicitante && (
                              <span className="inline-block text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 font-semibold">
                                {row.data.areaSolicitante}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {row.data.fechaPublicacion}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {row.data.fechaOfertas}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                            {formatQuetzales(row.data.monto)}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">
                            {row.data.cantidadOfertas}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.data.evaluadoGIT === 'Sí' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.data.evaluadoGIT === 'Sí' ? 'Sí' : 'No'}
                            </span>
                            {row.data.fechaDictamenGIT && (
                              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                                {row.data.fechaDictamenGIT}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              row.data.estatusEvento === 'Adjudicación' ? 'bg-emerald-100 text-emerald-800' :
                              row.data.estatusEvento === 'Evaluación' ? 'bg-blue-100 text-blue-800' :
                              row.data.estatusEvento === 'Desierto' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {row.data.estatusEvento}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {row.data.fechaAdjudicacion ? (
                              <div>
                                <span className="text-emerald-700 font-semibold font-mono text-[11px] block">{row.data.fechaAdjudicacion}</span>
                                {row.data.proveedorAdjudicado && (
                                  <span className="text-[10px] text-slate-600 block truncate max-w-[130px]" title={row.data.proveedorAdjudicado}>
                                    {row.data.proveedorAdjudicado}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleRemoveRow(row.index)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Descartar esta fila antes de importar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Botones de Confirmación */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {file && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <FileText className="w-4 h-4 text-slate-500" />
                Archivo cargado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            {activeTab === 'preview' && (
              <button
                type="button"
                id="btn-confirm-excel-import"
                onClick={handleConfirmImport}
                disabled={isProcessing || validCount === 0}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Procesando e Importando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar e Importar ({validCount} Adquisiciones)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
