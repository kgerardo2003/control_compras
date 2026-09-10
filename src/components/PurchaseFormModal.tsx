import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Save, 
  FileText, 
  Hash, 
  ShieldCheck, 
  Calendar, 
  Tag, 
  Paperclip, 
  UploadCloud, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Award,
  Eye,
  EyeOff,
  GitBranch,
  FolderTree,
  Loader2,
  ListTree
} from 'lucide-react';
import { EvaluacionGIT, AttachedDocument, PurchaseRecord } from '../types';
import { formatQuetzales, getModalidadCompraByMonto } from '../utils/formatters';
import { doesStatusAffectBudget } from '../data/budgetStandardCatalog';
import { DocumentPreview } from './DocumentPreview';
import { processAttachedFile, getAttachmentWithDataUrl } from '../utils/attachmentStorage';
import { PurchaseActionTree } from './PurchaseActionTree';

// Función para campo F56e tipo texto de 10 posiciones
const formatF56eInput = (raw: string): string => {
  return raw.slice(0, 10);
};

// Función para campo F56 tipo texto de 6 posiciones
const formatF56Input = (raw: string): string => {
  return raw.slice(0, 6);
};

// Función para aplicar la máscara de entrada de valores: 000,000,000.00
const formatMontoMask = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PurchaseFormModal: React.FC = () => {
  const { 
    isPurchaseModalOpen, 
    setIsPurchaseModalOpen, 
    purchaseToEdit, 
    setPurchaseToEdit,
    addPurchase, 
    updatePurchase, 
    catalogs,
    themeConfig,
    budgetAvailability
  } = useApp();

  // Estados del Formulario (Validaciones de longitud y tipos requeridos)
  const [modalTab, setModalTab] = useState<'formulario' | 'arbol'>('formulario');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [f56e, setF56e] = useState('');
  const [f56, setF56] = useState('');
  const [f56Documento, setF56Documento] = useState<AttachedDocument | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fechaSolicitud, setFechaSolicitud] = useState('');
  const [fechaVoBo, setFechaVoBo] = useState('');
  const [fechaAutorizado, setFechaAutorizado] = useState('');
  const [nog, setNog] = useState('');
  const [fechaPublicacion, setFechaPublicacion] = useState('');
  const [fechaOfertas, setFechaOfertas] = useState('');
  const [cantidadOfertas, setCantidadOfertas] = useState<number>(0);
  const [monto, setMonto] = useState<number | ''>('');
  const [montoInput, setMontoInput] = useState<string>('');
  const [renglonPresupuestario, setRenglonPresupuestario] = useState<string>('158');
  const [estadoPago, setEstadoPago] = useState<'comprometido' | 'pagado'>('comprometido');
  const [evaluadoGIT, setEvaluadoGIT] = useState<EvaluacionGIT>('Sí');
  const [fechaDictamenGIT, setFechaDictamenGIT] = useState<string>('');
  const [fechaElaboracionOficioGIT, setFechaElaboracionOficioGIT] = useState<string>('');
  const [showDocumentPreview, setShowDocumentPreview] = useState<boolean>(true);
  const [estatusEvento, setEstatusEvento] = useState<string>('Evaluación');
  const [fechaAdjudicacion, setFechaAdjudicacion] = useState<string>('');
  const [areaSolicitante, setAreaSolicitante] = useState('Soporte técnico');
  const [categoriaTecnologica, setCategoriaTecnologica] = useState('');
  const [dependenciaSolicitante, setDependenciaSolicitante] = useState('');
  const [modalidadCompra, setModalidadCompra] = useState('Cotización Pública');
  const [proveedorAdjudicado, setProveedorAdjudicado] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener opciones de catálogos
  const statusCatalog = catalogs.find(c => c.codigo === 'ESTATUS_EVENTO');
  const statusOptions = statusCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Evaluación', 'Adjudicación', 'Prescindido', 'Desierto'
  ];

  const areaCatalog = catalogs.find(c => c.codigo === 'AREA_SOLICITANTE');
  const areaOptions = areaCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Soporte técnico',
    'Soporte Técnico Remoto',
    'Sección de Videoaudiencias',
    'Redes y Telecomunicaciones',
    'Desarrollo y Administración de Sistemas',
    'Departamento de Servicios Informáticos',
    'Seguridad Informática'
  ];

  const categoryCatalog = catalogs.find(c => c.codigo === 'CATEGORIA_TECNOLOGICA');
  const categoryOptions = categoryCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Servidores y Almacenamiento',
    'Redes y Telecomunicaciones',
    'Ciberseguridad y Perímetro',
    'Estaciones de Trabajo y Periféricos',
    'Licenciamiento y Software Judicial',
    'Audio/Video para Salas de Audiencias'
  ];

  const dependencyCatalog = catalogs.find(c => c.codigo === 'DEPENDENCIA_SOLICITANTE');
  const dependencyOptions = dependencyCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Subgerencia de Infraestructura GIT',
    'Subgerencia de Desarrollo de Sistemas GIT',
    'Unidad de Seguridad de la Información',
    'Unidad de Soporte Técnico Departamental',
    'Centro de Cómputo Principal Torre de Tribunales'
  ];

  const modalityCatalog = catalogs.find(c => c.codigo === 'MODALIDAD_COMPRA');
  const modalityOptions = modalityCatalog?.items.filter(it => it.activo).map(it => it.valor) || [
    'Compra Directa', 'Cotización Pública', 'Licitación Pública', 'Contrato Abierto'
  ];

  // Cargar datos cuando se edita
  useEffect(() => {
    if (purchaseToEdit) {
      setDescripcion(purchaseToEdit.descripcion || '');
      setF56e(purchaseToEdit.f56e || '');
      setF56(purchaseToEdit.f56 || '');
      setF56Documento(purchaseToEdit.f56Documento || null);
      if (purchaseToEdit.f56Documento && (!purchaseToEdit.f56Documento.dataUrl || purchaseToEdit.f56Documento.dataUrl.length < 100)) {
        getAttachmentWithDataUrl(purchaseToEdit.id, purchaseToEdit.f56Documento).then(fullDoc => {
          if (fullDoc?.dataUrl) {
            setF56Documento(fullDoc);
          }
        });
      }
      setFechaSolicitud(purchaseToEdit.fechaSolicitud || '');
      setFechaVoBo(purchaseToEdit.fechaVoBo || '');
      setFechaAutorizado(purchaseToEdit.fechaAutorizado || '');
      setNog(purchaseToEdit.nog || '');
      setFechaPublicacion(purchaseToEdit.fechaPublicacion || '');
      setFechaOfertas(purchaseToEdit.fechaOfertas || '');
      setCantidadOfertas(purchaseToEdit.cantidadOfertas ?? 0);
      setMonto(purchaseToEdit.monto ?? '');
      setMontoInput(purchaseToEdit.monto !== undefined && purchaseToEdit.monto !== null && purchaseToEdit.monto !== '' ? formatMontoMask(purchaseToEdit.monto) : '');
      setRenglonPresupuestario(purchaseToEdit.renglonPresupuestario || (budgetAvailability[0]?.renglonPresupuestario || '158'));
      setEstadoPago(purchaseToEdit.estadoPago || 'comprometido');
      setEvaluadoGIT(purchaseToEdit.evaluadoGIT || 'Sí');
      setFechaDictamenGIT(purchaseToEdit.fechaDictamenGIT || '');
      setFechaElaboracionOficioGIT(purchaseToEdit.fechaElaboracionOficioGIT || '');
      setShowDocumentPreview(true);
      setEstatusEvento(purchaseToEdit.estatusEvento || 'Evaluación');
      setFechaAdjudicacion(purchaseToEdit.fechaAdjudicacion || '');
      setAreaSolicitante(purchaseToEdit.areaSolicitante || areaOptions[0] || 'Soporte técnico');
      setCategoriaTecnologica(purchaseToEdit.categoriaTecnologica || categoryOptions[0] || '');
      setDependenciaSolicitante(purchaseToEdit.dependenciaSolicitante || dependencyOptions[0] || '');
      setModalidadCompra(purchaseToEdit.modalidadCompra || modalityOptions[0] || 'Cotización Pública');
      setProveedorAdjudicado(purchaseToEdit.proveedorAdjudicado || '');
      setObservaciones(purchaseToEdit.observaciones || '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setDescripcion('');
      setF56e('');
      setF56('');
      setF56Documento(null);
      setFechaSolicitud(today);
      setFechaVoBo('');
      setFechaAutorizado('');
      setNog('');
      setFechaPublicacion('');
      setFechaOfertas('');
      setCantidadOfertas(0);
      setMonto('');
      setRenglonPresupuestario(budgetAvailability[0]?.renglonPresupuestario || '158');
      setEstadoPago('comprometido');
      setEvaluadoGIT('Sí');
      setFechaDictamenGIT('');
      setFechaElaboracionOficioGIT('');
      setShowDocumentPreview(true);
      setEstatusEvento('Evaluación');
      setFechaAdjudicacion('');
      setAreaSolicitante(areaOptions[0] || 'Soporte técnico');
      setCategoriaTecnologica(categoryOptions[0] || 'Servidores y Almacenamiento');
      setDependenciaSolicitante(dependencyOptions[0] || 'Subgerencia de Infraestructura GIT');
      setModalidadCompra('Cotización Pública');
      setProveedorAdjudicado('');
      setObservaciones('');
    }
    setErrors({});
    setFileUploadError(null);
    setModalTab('formulario');
  }, [purchaseToEdit, isPurchaseModalOpen]);

  // Objeto reactivo para previsualización en tiempo real del Árbol de Acciones y Registro
  const livePurchasePreview: Partial<PurchaseRecord> = useMemo(() => {
    return {
      ...(purchaseToEdit || {}),
      id: purchaseToEdit?.id || 'pur-preview',
      descripcion: descripcion.trim() || 'Nueva Adquisición en Proceso de Registro',
      f56e: f56e.trim(),
      f56: f56.trim(),
      f56Documento: f56Documento || undefined,
      fechaSolicitud,
      fechaVoBo,
      fechaAutorizado,
      nog: nog.trim(),
      fechaPublicacion,
      fechaOfertas,
      cantidadOfertas: Number(cantidadOfertas) || 0,
      monto: Number(monto) || 0,
      renglonPresupuestario,
      estadoPago,
      evaluadoGIT,
      fechaDictamenGIT: evaluadoGIT === 'Sí' ? fechaDictamenGIT : '',
      fechaElaboracionOficioGIT: evaluadoGIT === 'Sí' ? fechaElaboracionOficioGIT : '',
      estatusEvento,
      fechaAdjudicacion: estatusEvento === 'Adjudicación' ? fechaAdjudicacion : undefined,
      areaSolicitante,
      categoriaTecnologica,
      dependenciaSolicitante,
      modalidadCompra: getModalidadCompraByMonto(Number(monto) || 0).nombre,
      proveedorAdjudicado: proveedorAdjudicado.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      bitacoraCambios: purchaseToEdit?.bitacoraCambios || [],
      historialEstatus: purchaseToEdit?.historialEstatus || [],
      creadoPor: purchaseToEdit?.creadoPor || 'Operador Actual',
      fechaCreacion: purchaseToEdit?.fechaCreacion || new Date().toISOString()
    };
  }, [
    purchaseToEdit,
    descripcion,
    f56e,
    f56,
    f56Documento,
    fechaSolicitud,
    fechaVoBo,
    fechaAutorizado,
    nog,
    fechaPublicacion,
    fechaOfertas,
    cantidadOfertas,
    monto,
    renglonPresupuestario,
    estadoPago,
    evaluadoGIT,
    fechaDictamenGIT,
    fechaElaboracionOficioGIT,
    estatusEvento,
    fechaAdjudicacion,
    areaSolicitante,
    categoriaTecnologica,
    dependenciaSolicitante,
    proveedorAdjudicado,
    observaciones
  ]);

  // Manejo de archivo adjunto F56
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setFileUploadError(null);
    setIsProcessingFile(true);

    // Límite de seguridad de 25 MB
    if (file.size > 25 * 1024 * 1024) {
      setFileUploadError('El archivo excede el límite máximo permitido de 25 MB.');
      setIsProcessingFile(false);
      return;
    }

    try {
      const processed = await processAttachedFile(file);
      if (!processed || !processed.dataUrl) {
        throw new Error('No se pudo generar la lectura digital del archivo.');
      }
      setF56Documento(processed);
      setShowDocumentPreview(true);
      setFileUploadError(null);
    } catch (err: any) {
      console.error('Error al procesar archivo adjunto:', err);
      setFileUploadError(err?.message || 'Error al procesar el archivo. Por favor intente nuevamente.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Función para ingresar montos de derecha a izquierda con decimales automáticos (máscara 000,000,000.00)
  const formatMontoRTL = (digits: string): { display: string; value: number | '' } => {
    // Truncar a máximo 11 dígitos numéricos (9 enteros + 2 decimales = 999,999,999.99)
    const cleanDigits = digits.replace(/\D/g, '').slice(-11);
    if (!cleanDigits || parseInt(cleanDigits, 10) === 0) {
      return { display: '', value: '' };
    }
    const cents = parseInt(cleanDigits, 10);
    const numValue = cents / 100;
    const parts = numValue.toFixed(2).split('.');
    const integerWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return {
      display: `${integerWithCommas}.${parts[1]}`,
      value: numValue,
    };
  };

  // Manejador de entrada de derecha a izquierda con decimales automáticos
  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly || parseInt(digitsOnly, 10) === 0) {
      setMontoInput('');
      setMonto('');
      return;
    }
    const { display, value } = formatMontoRTL(digitsOnly);
    setMontoInput(display);
    setMonto(value);
  };

  const handleMontoPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    const cleaned = pasted.replace(/[^\d.,]/g, '').replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed >= 0) {
      const cents = Math.round(parsed * 100);
      const { display, value } = formatMontoRTL(String(cents));
      setMontoInput(display);
      setMonto(value);
    }
  };

  // Al desenfocar el campo (onBlur), auto-formatear con dos decimales exactos
  const handleMontoBlur = () => {
    if (monto !== '' && !isNaN(Number(monto)) && Number(monto) > 0) {
      const parts = Number(monto).toFixed(2).split('.');
      const integerWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setMontoInput(`${integerWithCommas}.${parts[1]}`);
    } else {
      setMontoInput('');
      setMonto('');
    }
  };

  if (!isPurchaseModalOpen) return null;

  // Validación estricta de campos según el requerimiento
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Descripción: max 200 caracteres
    if (!descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria.';
    } else if (descripcion.length > 200) {
      newErrors.descripcion = 'La descripción no puede exceder 200 caracteres.';
    }

    // 2. F56-e: campo tipo texto de 10 posiciones (obligatorio)
    const cleanF56e = f56e.trim();
    if (!cleanF56e) {
      newErrors.f56e = 'El campo F56-e es obligatorio.';
    } else if (cleanF56e.length > 10) {
      newErrors.f56e = 'El campo F56-e no puede exceder 10 posiciones.';
    }

    // 3. F56: campo tipo texto de 6 posiciones
    const cleanF56 = f56.trim();
    if (cleanF56 && cleanF56.length > 6) {
      newErrors.f56 = 'El campo F56 no puede exceder 6 posiciones.';
    }

    // 4. Fechas
    if (!fechaSolicitud) {
      newErrors.fechaSolicitud = 'La Fecha de Solicitud es obligatoria.';
    }

    // 5. NOG: numérico de 8 dígitos
    const cleanNog = nog.trim();
    if (!cleanNog) {
      newErrors.nog = 'El NOG es obligatorio.';
    } else if (!/^\d{8}$/.test(cleanNog)) {
      newErrors.nog = 'El NOG debe tener exactamente 8 dígitos numéricos (ej. 21948201).';
    }

    // 6. Monto: moneda en Quetzales con máscara 000,000,000.00
    if (monto === '' || isNaN(Number(monto)) || Number(monto) <= 0) {
      newErrors.monto = 'Ingrese un monto válido en Quetzales mayor a 0 con máscara 000,000,000.00.';
    } else if (Number(monto) > 999999999.99) {
      newErrors.monto = 'El monto no puede exceder el límite de la máscara: 999,999,999.99.';
    }

    // 7. Cantidad de ofertas: numérico >= 0
    if (cantidadOfertas === undefined || cantidadOfertas < 0) {
      newErrors.cantidadOfertas = 'La cantidad de ofertas debe ser mayor o igual a 0.';
    }

    // 8. Fecha de dictamen técnico por la GIT
    if (evaluadoGIT === 'Sí' && !fechaDictamenGIT) {
      newErrors.fechaDictamenGIT = 'Ingrese la fecha en que se realizó el dictamen técnico por la GIT.';
    }

    // 9. Fecha de adjudicación (si el estatus es Adjudicación)
    if (estatusEvento === 'Adjudicación' && !fechaAdjudicacion) {
      newErrors.fechaAdjudicacion = 'Ingrese la fecha en que se adjudicó el evento.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingFile) {
      setFileUploadError('Por favor espere unos momentos a que termine de procesarse y optimizarse el documento adjunto.');
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);

    const selectedLine = budgetAvailability.find(l => l.renglonPresupuestario === renglonPresupuestario);
    const isRenglon113 = renglonPresupuestario === '113';

    const recordData = {
      descripcion: descripcion.trim(),
      f56e: f56e.trim(),
      f56: f56.trim() || undefined,
      f56Documento: f56Documento || undefined,
      fechaSolicitud,
      fechaVoBo: fechaVoBo || '',
      fechaAutorizado: fechaAutorizado || '',
      nog: nog.trim(),
      fechaPublicacion: fechaPublicacion || '',
      fechaOfertas: fechaOfertas || '',
      cantidadOfertas: Number(cantidadOfertas),
      monto: Number(monto),
      renglonPresupuestario,
      grupoPresupuestario: selectedLine?.grupoPresupuestario || (isRenglon113 ? 'Grupo 100 - Servicios No Personales' : ''),
      nombreRenglon: selectedLine?.nombreRenglon || (isRenglon113 ? 'Telefonía (Referencia - Gerencia Administrativa)' : ''),
      estadoPago,
      evaluadoGIT,
      fechaDictamenGIT: evaluadoGIT === 'Sí' ? fechaDictamenGIT : '',
      fechaElaboracionOficioGIT: evaluadoGIT === 'Sí' ? fechaElaboracionOficioGIT : '',
      estatusEvento,
      fechaAdjudicacion: estatusEvento === 'Adjudicación' ? fechaAdjudicacion : undefined,
      areaSolicitante,
      categoriaTecnologica,
      dependenciaSolicitante,
      modalidadCompra: getModalidadCompraByMonto(monto).nombre,
      proveedorAdjudicado: proveedorAdjudicado.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      historialEstatus: purchaseToEdit?.historialEstatus,
    };

    try {
      if (purchaseToEdit) {
        updatePurchase(purchaseToEdit.id, recordData);
      } else {
        addPurchase(recordData);
      }
      setIsPurchaseModalOpen(false);
      setPurchaseToEdit(null);
    } catch (err: any) {
      console.error('Error al guardar adquisición:', err);
      setFileUploadError('Error al guardar: ' + (err?.message || 'Intente nuevamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal (Professional Polish) */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-slate-900 font-bold text-xs">
              OJ
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {purchaseToEdit ? 'Modificar Registro de Adquisición' : 'Registrar Nueva Adquisición'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Gerencia de Informática • Formulario Oficial F56-e
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setIsPurchaseModalOpen(false); setPurchaseToEdit(null); }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas Superiores de Navegación: Ficha vs Árbol de Acciones */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalTab('formulario')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                modalTab === 'formulario'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ficha de Adquisición</span>
            </button>

            <button
              type="button"
              onClick={() => setModalTab('arbol')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                modalTab === 'arbol'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Historial de Acciones (Árbol)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                modalTab === 'arbol' ? 'bg-slate-900 text-amber-300' : 'bg-slate-700 text-slate-300'
              }`}>
                {purchaseToEdit?.bitacoraCambios?.length ? `${purchaseToEdit.bitacoraCambios.length + 5} registros` : '6 fases'}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center text-xs text-slate-300">
            {modalTab === 'formulario' ? (
              <button
                type="button"
                onClick={() => setModalTab('arbol')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer text-xs font-semibold"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Ver Árbol de Acciones</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalTab('formulario')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer text-xs font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Volver a la Ficha</span>
              </button>
            )}
          </div>
        </div>

        {/* Contenido del Modal: Pestaña Árbol de Acciones vs Formulario */}
        {modalTab === 'arbol' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-300/40 flex items-center justify-center text-amber-600 shrink-0">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Historial y Registro de Acciones del Expediente</h3>
                  <p className="text-[11px] text-slate-500">
                    Registro estructurado por fases, hitos completados y bitácora auditada en tiempo real.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTab('formulario')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Volver al Formulario</span>
              </button>
            </div>
            <PurchaseActionTree purchase={livePurchasePreview} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* SECCIÓN 1: Identificación del Evento */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Identificación del Evento
              </span>
              <span className="text-[10px] text-slate-400">* Campos Requeridos</span>
            </div>

            {/* Campo: Descripción (Max 200 caracteres) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Descripción (Máx. 200 caracteres) <span className="text-rose-600">*</span>
                </label>
                <span className={`text-[10px] font-mono ${descripcion.length >= 200 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                  {descripcion.length}/200
                </span>
              </div>
              <textarea
                id="input-purchase-descripcion"
                rows={2}
                maxLength={200}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción del bien o servicio informático solicitado para el Organismo Judicial..."
                className={`w-full p-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  errors.descripcion ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.descripcion && (
                <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.descripcion}</p>
              )}
            </div>

            {/* Campo: Área Solicitante */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Área Solicitante <span className="text-rose-600">*</span>
              </label>
              <select
                id="select-purchase-area-solicitante"
                value={areaSolicitante}
                onChange={(e) => setAreaSolicitante(e.target.value)}
                className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 cursor-pointer"
              >
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Área técnica o sección GIT requirente del bien o servicio.
              </p>
            </div>
          </div>

          {/* SECCIÓN 2: FORMULARIOS F56-e Y F56 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Formularios F56-e y F56
              </span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                F56-e (10 pos.) &amp; F56 (6 pos.)
              </span>
            </div>

            {/* Campos: F56-e (10 posiciones) y F56 (6 posiciones) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Formulario F56-e: tipo texto de 10 posiciones */}
              <div>
                <label htmlFor="input-purchase-f56e" className="block text-xs font-bold text-slate-800 mb-1">
                  Formulario F56-e <span className="text-rose-600">*</span>
                  <span className="ml-1 text-[10px] text-amber-600 font-mono font-semibold">(Texto 10 pos.)</span>
                </label>
                <input
                  id="input-purchase-f56e"
                  type="text"
                  maxLength={10}
                  value={f56e}
                  onChange={(e) => setF56e(formatF56eInput(e.target.value))}
                  placeholder="F56-e (máx. 10)"
                  className={`w-full p-2 text-xs font-mono font-bold tracking-wider uppercase border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    errors.f56e ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.f56e ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.f56e}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">Campo tipo texto de hasta 10 posiciones</p>
                )}
              </div>

              {/* Formulario F56: tipo texto de 6 posiciones */}
              <div>
                <label htmlFor="input-purchase-f56" className="block text-xs font-bold text-slate-800 mb-1">
                  Formulario F56
                  <span className="ml-1 text-[10px] text-amber-600 font-mono font-semibold">(Texto 6 pos.)</span>
                </label>
                <input
                  id="input-purchase-f56"
                  type="text"
                  maxLength={6}
                  value={f56}
                  onChange={(e) => setF56(formatF56Input(e.target.value))}
                  placeholder="F56 (máx. 6)"
                  className={`w-full p-2 text-xs font-mono font-bold tracking-wider uppercase border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    errors.f56 ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.f56 ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.f56}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">Campo tipo texto de hasta 6 posiciones</p>
                )}
              </div>
            </div>

            {/* Fechas de Gestión */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              
              {/* Fecha Solicitud */}
              <div>
                <label htmlFor="input-purchase-fecha-solicitud" className="block text-xs font-bold text-slate-800 mb-1">
                  Fecha de Solicitud <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-purchase-fecha-solicitud"
                  type="date"
                  value={fechaSolicitud}
                  onChange={(e) => setFechaSolicitud(e.target.value)}
                  className={`w-full p-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    errors.fechaSolicitud ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.fechaSolicitud ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.fechaSolicitud}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">Fecha oficial de solicitud</p>
                )}
              </div>

              {/* Fecha Vo.Bo. */}
              <div>
                <label htmlFor="input-purchase-fecha-vobo" className="block text-xs font-bold text-slate-800 mb-1">
                  Fecha Vo.Bo.
                </label>
                <input
                  id="input-purchase-fecha-vobo"
                  type="date"
                  value={fechaVoBo}
                  onChange={(e) => setFechaVoBo(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Visto Bueno de jefatura</p>
              </div>

              {/* Fecha Autorizado */}
              <div>
                <label htmlFor="input-purchase-fecha-autorizado" className="block text-xs font-bold text-slate-800 mb-1">
                  Fecha de Autorizado
                </label>
                <input
                  id="input-purchase-fecha-autorizado"
                  type="date"
                  value={fechaAutorizado}
                  onChange={(e) => setFechaAutorizado(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Aprobación del formulario</p>
              </div>

            </div>

            {/* Documento Adjunto F56-e / F56 */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                  Documento Adjunto (F56-e / F56)
                </label>
                {f56Documento && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Documento Adjunto
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="input-f56-document"
              />

              {f56Documento ? (
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={f56Documento.nombre}>
                          {f56Documento.nombre}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{formatFileSize(f56Documento.tamano)}</span>
                          <span>•</span>
                          <span>{f56Documento.fechaSubida ? new Date(f56Documento.fechaSubida).toLocaleDateString() : 'Cargado'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setShowDocumentPreview(!showDocumentPreview)}
                        className="px-2.5 py-1.5 text-blue-700 hover:text-blue-800 hover:bg-blue-50 bg-blue-50/60 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 border border-blue-200 cursor-pointer"
                        title={showDocumentPreview ? 'Ocultar vista previa del documento' : 'Ver vista previa del documento'}
                      >
                        {showDocumentPreview ? <EyeOff className="w-3.5 h-3.5 text-blue-600" /> : <Eye className="w-3.5 h-3.5 text-blue-600" />}
                        <span>{showDocumentPreview ? 'Ocultar Vista' : 'Vista Previa'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          fileInputRef.current?.click();
                        }}
                        className="px-2.5 py-1.5 text-slate-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 border border-slate-200 cursor-pointer"
                        title="Reemplazar documento F56e"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                        <span>Reemplazar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setF56Documento(null);
                          setShowDocumentPreview(false);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold border border-rose-200 cursor-pointer"
                        title="Eliminar documento adjunto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Vista previa integrada del documento (Totalmente compatible con Google Chrome) */}
                  {showDocumentPreview && f56Documento && (
                    <DocumentPreview
                      document={f56Documento}
                      purchase={{
                        f56e,
                        f56,
                        descripcion,
                        monto: Number(monto) || 0,
                        areaSolicitante,
                        dependenciaSolicitante,
                        proveedorAdjudicado,
                        fechaDictamenGIT,
                        fechaElaboracionOficioGIT
                      }}
                      title="Vista Previa de Documento F56-e"
                      onClose={() => setShowDocumentPreview(false)}
                    />
                  )}
                </div>
              ) : isProcessingFile ? (
                <div className="border-2 border-dashed border-amber-400 bg-amber-50/60 rounded-lg p-5 text-center flex flex-col items-center justify-center gap-2 animate-pulse">
                  <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-800">
                    Procesando y optimizando documento adjunto...
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Comprimiendo y preparando para almacenamiento seguro en Firestore e IndexedDB
                  </p>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    fileInputRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-slate-300 hover:border-amber-400 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <UploadCloud className="w-5 h-5 text-amber-600" />
                    <p className="text-xs font-semibold text-slate-700">
                      Haga clic aquí o arrastre el documento digital de la Forma F56-e
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Formatos soportados: PDF, Word (.docx), JPG, PNG (Hasta 15 MB con optimización automática)
                    </p>
                  </div>
                </div>
              )}
              {fileUploadError && (
                <p className="text-[10px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fileUploadError}
                </p>
              )}

              {/* Botón rápido para consultar el Árbol de Acciones del expediente */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-amber-600" />
                  ¿Desea ver el flujo y bitácora de este trámite?
                </span>
                <button
                  type="button"
                  onClick={() => setModalTab('arbol')}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <FolderTree className="w-3 h-3 text-amber-700" />
                  <span>Ver Árbol de Acciones</span>
                </button>
              </div>
            </div>

          </div>

          {/* SECCIÓN 3: GUATECOMPRAS, DICTAMEN TÉCNICO Y ESTATUS DEL EVENTO (ORDEN ESPECÍFICO) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                Guatecompras, Dictamen Técnico & Estatus del Evento
              </span>
              <span className="text-[10px] text-slate-400">Portal Guatecompras</span>
            </div>

            {/* 1. NOG (8 Dígitos) */}
            <div>
              <label htmlFor="input-purchase-nog" className="block text-xs font-bold text-slate-800 mb-1">
                NOG (8 Dígitos) <span className="text-rose-600">*</span>
              </label>
              <input
                id="input-purchase-nog"
                type="text"
                maxLength={8}
                value={nog}
                onChange={(e) => setNog(e.target.value.replace(/\D/g, ''))}
                placeholder="21948201"
                className={`w-full p-2 text-xs font-mono font-bold tracking-wider border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  errors.nog ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300 text-slate-900'
                }`}
              />
              {errors.nog ? (
                <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.nog}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-0.5">8 dígitos exactos de Guatecompras</p>
              )}
            </div>

            {/* 2. FECHA PUBLICACIÓN y 3. FECHA CIERRE OFERTAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              
              {/* 2. FECHA PUBLICACIÓN */}
              <div>
                <label htmlFor="input-purchase-fecha-publicacion" className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fecha Publicación</span>
                </label>
                <input
                  id="input-purchase-fecha-publicacion"
                  type="date"
                  value={fechaPublicacion}
                  onChange={(e) => setFechaPublicacion(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Publicación oficial del concurso en Guatecompras</p>
              </div>

              {/* 3. FECHA CIERRE OFERTAS */}
              <div>
                <label htmlFor="input-purchase-fecha-ofertas" className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Fecha Cierre Ofertas</span>
                </label>
                <input
                  id="input-purchase-fecha-ofertas"
                  type="date"
                  value={fechaOfertas}
                  onChange={(e) => setFechaOfertas(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Fecha y hora límite de recepción de plicas</p>
              </div>

            </div>

            {/* 4. MONTO (PRESUPUESTO EN QUETZALES) - UBICADO DESPUÉS DE FECHA CIERRE OFERTAS */}
            <div className="pt-2 border-t border-slate-200">
              <label htmlFor="input-purchase-monto" className="block text-xs font-bold text-slate-800 mb-1">
                Presupuesto / Monto (Q) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600 font-black text-xs">
                  Q
                </div>
                <input
                  id="input-purchase-monto"
                  type="text"
                  inputMode="numeric"
                  dir="rtl"
                  value={montoInput}
                  onChange={handleMontoChange}
                  onPaste={handleMontoPaste}
                  onBlur={handleMontoBlur}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-2 text-right text-xs font-black font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] ${
                    errors.monto ? 'border-rose-400 bg-rose-50/20 text-rose-950' : 'border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              {errors.monto ? (
                <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.monto}</p>
              ) : (
                <div className="flex items-center justify-between text-[10px] mt-0.5">
                  <span className="text-emerald-700 font-semibold font-mono">
                    {monto !== '' ? formatQuetzales(Number(monto)) : 'Q. 0.00'}
                  </span>
                  <span className="text-slate-400 text-[9px]">
                    Decimales automáticos
                  </span>
                </div>
              )}

              {/* Modalidad asignada automáticamente según Ley de Contrataciones */}
              <div className="mt-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Modalidad LCE:
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border ${getModalidadCompraByMonto(monto).badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getModalidadCompraByMonto(monto).badgeDotColor}`} />
                    {getModalidadCompraByMonto(monto).nombre}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 sm:text-right">
                  <span className="font-semibold text-slate-700">{getModalidadCompraByMonto(monto).descripcionRango}</span>
                  <span className="block text-[9px] text-slate-400 italic">{getModalidadCompraByMonto(monto).fundamentoLegal}</span>
                </div>
              </div>

              {/* Renglón Presupuestario Afectado (Integración Financiera IT) */}
              <div className="mt-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="select-purchase-renglon" className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <span>Renglón Presupuestario Afectado (Informática) *</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                    Afectación en Tiempo Real
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <select
                      id="select-purchase-renglon"
                      value={renglonPresupuestario}
                      onChange={(e) => setRenglonPresupuestario(e.target.value)}
                      className="w-full p-2 text-xs font-semibold bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      {/* Renglón 113 Telefonía (Referencia - Gerencia Administrativa) */}
                      {!budgetAvailability.some(l => l.renglonPresupuestario === '113') && (
                        <option value="113">
                          Renglón 113 - Telefonía (Referencia - Gerencia Administrativa • No afecta presupuesto)
                        </option>
                      )}
                      {budgetAvailability.map((line) => (
                        <option key={line.id} value={line.renglonPresupuestario}>
                          Renglón {line.renglonPresupuestario} - {line.nombreRenglon} {line.esReferencia || line.renglonPresupuestario === '113' ? '(Solo Referencia - No afecta presupuesto)' : `(Disponible: Q. ${line.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 })})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={estadoPago}
                      onChange={(e) => setEstadoPago(e.target.value as 'comprometido' | 'pagado')}
                      className="w-full p-2 text-xs font-semibold bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      <option value="comprometido">Comprometido Pendiente</option>
                      <option value="pagado">Pagado que Rebaja</option>
                    </select>
                  </div>
                </div>

                {/* Resumen del Renglón Seleccionado y Advertencia de Disponibilidad */}
                {(() => {
                  const is113 = renglonPresupuestario === '113';
                  const line = budgetAvailability.find(l => l.renglonPresupuestario === renglonPresupuestario);
                  const isReference = is113 || Boolean(line?.esReferencia);

                  if (isReference) {
                    return (
                      <div className="mt-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Renglón 113 - Telefonía (Solo Referencia Administrativa)</span>
                        </div>
                        <p className="text-[11px] text-indigo-800 leading-relaxed">
                          Este renglón es gestionado y ejecutado por la <strong>Gerencia Administrativa</strong>. Esta ficha se registra exclusivamente para control referencial y trazabilidad interna; <strong>NO afecta ni descuenta la disponibilidad presupuestaria</strong> de la Gerencia de Informática.
                        </p>
                      </div>
                    );
                  }

                  if (!line) return null;
                  const currentMonto = Number(monto) || 0;
                  const exceeds = currentMonto > line.disponibleProyectado;

                  return (
                    <div className="pt-1.5 text-[11px] space-y-1">
                      <div className="flex flex-wrap items-center justify-between text-slate-600 gap-1">
                        <span>Grupo: <strong>{line.grupoPresupuestario}</strong></span>
                        <span>
                          Disponible Proyectado: <strong className={`font-mono ${line.disponibleProyectado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            Q. {line.disponibleProyectado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </strong>
                        </span>
                      </div>

                      {exceeds && (
                        <div className="p-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-medium flex items-center gap-1.5 text-[10px]">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                          <span>
                            Atención: El monto estimado (Q. {currentMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}) supera el disponible proyectado de este renglón. Deberá tramitar una modificación presupuestaria de ampliación o transferencia.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 4. CANTIDAD DE OFERTAS */}
            <div className="pt-2 border-t border-slate-200">
              <label htmlFor="input-purchase-cantidad-ofertas" className="block text-xs font-bold text-slate-800 mb-1">
                Cantidad de Ofertas
              </label>
              <input
                id="input-purchase-cantidad-ofertas"
                type="number"
                min="0"
                value={cantidadOfertas}
                onChange={(e) => setCantidadOfertas(parseInt(e.target.value) || 0)}
                className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Número de postores que presentaron ofertas</p>
            </div>

            {/* 5. DICTAMEN TÉCNICO Y EVALUACIÓN */}
            <div className="pt-2 border-t border-slate-200">
              <div className="mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Dictamen Técnico y Área Correspondiente
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Evaluado por el Área Técnica Correspondiente */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Evaluado por el Área Técnica Correspondiente <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="select-purchase-evaluado-git"
                    value={evaluadoGIT}
                    onChange={(e) => {
                      const val = e.target.value as EvaluacionGIT;
                      setEvaluadoGIT(val);
                      if (val === 'No') {
                        setFechaDictamenGIT('');
                        setFechaElaboracionOficioGIT('');
                      }
                    }}
                    className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Sí">Sí - Con Dictamen Técnico</option>
                    <option value="No">No - Sin Dictamen Técnico</option>
                  </select>
                </div>

                {/* Fecha Dictamen Técnico */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#1c39bb]" />
                      <span>Fecha Dictamen Técnico</span>
                    </span>
                    {evaluadoGIT === 'Sí' && <span className="text-rose-600 font-bold">*</span>}
                  </label>
                  <input
                    id="input-purchase-fecha-dictamen-git"
                    type="date"
                    value={fechaDictamenGIT}
                    onChange={(e) => setFechaDictamenGIT(e.target.value)}
                    disabled={evaluadoGIT === 'No'}
                    className={`w-full p-2 text-xs font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] ${
                      evaluadoGIT === 'No' ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' :
                      errors.fechaDictamenGIT ? 'border-rose-400 bg-rose-50/20 text-rose-900' : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  />
                  {errors.fechaDictamenGIT ? (
                    <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.fechaDictamenGIT}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {evaluadoGIT === 'Sí' ? 'Fecha de emisión del dictamen técnico' : 'No aplica'}
                    </p>
                  )}
                </div>

                {/* Elaboración Oficio GIT */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>Elaboración Oficio GIT</span>
                    </span>
                  </label>
                  <input
                    id="input-purchase-fecha-oficio-git"
                    type="date"
                    value={fechaElaboracionOficioGIT}
                    onChange={(e) => setFechaElaboracionOficioGIT(e.target.value)}
                    disabled={evaluadoGIT === 'No'}
                    className={`w-full p-2 text-xs font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682b4] ${
                      evaluadoGIT === 'No' ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {evaluadoGIT === 'Sí' ? 'Fecha que la Gerencia de Informática elaboró el oficio hacia compras' : 'No aplica'}
                  </p>
                </div>
              </div>
            </div>

            {/* 6. ESTATUS DEL EVENTO Y AFECTACIÓN DE DISPONIBILIDAD */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Estatus del Evento <span className="text-rose-600">*</span>
                </label>
                {/* Badge institucional de afectación presupuestaria (Image 3) */}
                {doesStatusAffectBudget(estatusEvento) ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Afecta Disponibilidad: Sí
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    <X className="w-3 h-3 text-slate-500" />
                    Afecta Disponibilidad: No
                  </span>
                )}
              </div>

              <select
                id="select-purchase-estatus-evento"
                value={estatusEvento}
                onChange={(e) => {
                  const val = e.target.value;
                  setEstatusEvento(val);
                  if (val === 'Pagada') {
                    setEstadoPago('pagado');
                  }
                }}
                className="w-full p-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} {doesStatusAffectBudget(opt) ? '• (Afecta: Sí)' : '• (Afecta: No)'}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                {doesStatusAffectBudget(estatusEvento) 
                  ? 'Este evento consume o compromete saldo del renglón presupuestario seleccionado.'
                  : 'Este evento está anulado/rechazado y no descuenta fondos de la disponibilidad del renglón.'}
              </p>
            </div>

            {/* 7. SI EL EVENTO YA SE ADJUDICÓ: FECHA DE ADJUDICACIÓN Y PROVEEDOR */}
            {(estatusEvento === 'Adjudicación' || estatusEvento === 'Adjudicada') && (
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-300 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>Datos de Adjudicación</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Fecha de Adjudicación */}
                  <div>
                    <label htmlFor="input-purchase-fecha-adjudicacion" className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      <span>Fecha de Adjudicación <span className="text-rose-600">*</span></span>
                    </label>
                    <input
                      id="input-purchase-fecha-adjudicacion"
                      type="date"
                      value={fechaAdjudicacion}
                      onChange={(e) => setFechaAdjudicacion(e.target.value)}
                      className={`w-full p-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white ${
                        errors.fechaAdjudicacion ? 'border-rose-400 bg-rose-50/20 text-rose-900' : 'border-slate-300'
                      }`}
                    />
                    {errors.fechaAdjudicacion ? (
                      <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.fechaAdjudicacion}</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-0.5">Fecha en que el evento fue adjudicado</p>
                    )}
                  </div>

                  {/* Proveedor Adjudicado */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Proveedor / Empresa Adjudicada
                    </label>
                    <input
                      id="input-purchase-proveedor"
                      type="text"
                      value={proveedorAdjudicado}
                      onChange={(e) => setProveedorAdjudicado(e.target.value)}
                      placeholder="ej. Tecnologías y Sistemas Corporativos, S.A."
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Nombre comercial o razón social</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones y Dictámenes Técnicos de Soporte
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Garantías, número de oficio, justificación técnica o detalles del comité..."
              className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

        </form>
        )}

        {/* Footer del Modal */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setIsPurchaseModalOpen(false); setPurchaseToEdit(null); }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-black bg-white border border-slate-300 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            id="btn-save-purchase"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isProcessingFile}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              isProcessingFile
                ? 'bg-amber-50 text-amber-900 border border-amber-300'
                : 'bg-white hover:bg-slate-100 text-black border border-slate-300'
            }`}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-black rounded-full animate-spin" />
            ) : isProcessingFile ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Procesando archivo adjunto...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-black" />
                <span>{purchaseToEdit ? 'Guardar Cambios' : 'Registrar Adquisición'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
