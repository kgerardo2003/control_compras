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
  ListTree,
  Plus,
  MessageSquare,
  User as UserIcon,
  Clock
} from 'lucide-react';
import { EvaluacionGIT, AttachedDocument, PurchaseRecord, PurchaseObservationEntry } from '../types';
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
    budgetAvailability,
    currentUser
  } = useApp();

  // Estados del Formulario
  const [modalTab, setModalTab] = useState<'formulario' | 'arbol'>('formulario');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [f56e, setF56e] = useState('');
  const [f56, setF56] = useState('');
  const [f56Documento, setF56Documento] = useState<AttachedDocument | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fechas: solo Fecha Recepción en la ficha, y Fecha de Adjudicación después de ofertas
  const [fechaRecepcion, setFechaRecepcion] = useState('');
  const [nog, setNog] = useState('');
  const [fechaPublicacion, setFechaPublicacion] = useState('');
  const [fechaOfertas, setFechaOfertas] = useState('');
  const [fechaAdjudicacion, setFechaAdjudicacion] = useState<string>('');
  const [cantidadOfertas, setCantidadOfertas] = useState<number>(0);
  const [monto, setMonto] = useState<number | ''>('');
  const [montoInput, setMontoInput] = useState<string>('');
  const [renglonPresupuestario, setRenglonPresupuestario] = useState<string>('158');
  const [estadoPago, setEstadoPago] = useState<'comprometido' | 'pagado'>('comprometido');
  const [showDocumentPreview, setShowDocumentPreview] = useState<boolean>(true);
  const [estatusEvento, setEstatusEvento] = useState<string>('Evaluación');
  const [categoriaTecnologica, setCategoriaTecnologica] = useState('');
  const [dependenciaSolicitante, setDependenciaSolicitante] = useState('');
  const [modalidadCompra, setModalidadCompra] = useState('Cotización Pública');
  const [proveedorAdjudicado, setProveedorAdjudicado] = useState('');
  
  // Observaciones registradas una a una con autor y persistencia en hoja de ruta
  const [observacionesList, setObservacionesList] = useState<PurchaseObservationEntry[]>([]);
  const [nuevaObservacion, setNuevaObservacion] = useState('');

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
      setFechaRecepcion(purchaseToEdit.fechaRecepcion || purchaseToEdit.fechaSolicitud || '');
      setNog(purchaseToEdit.nog || '');
      setFechaPublicacion(purchaseToEdit.fechaPublicacion || '');
      setFechaOfertas(purchaseToEdit.fechaOfertas || '');
      setFechaAdjudicacion(purchaseToEdit.fechaAdjudicacion || '');
      setCantidadOfertas(purchaseToEdit.cantidadOfertas ?? 0);
      setMonto(purchaseToEdit.monto ?? '');
      setMontoInput(purchaseToEdit.monto !== undefined && purchaseToEdit.monto !== null && purchaseToEdit.monto !== '' ? formatMontoMask(purchaseToEdit.monto) : '');
      setRenglonPresupuestario(purchaseToEdit.renglonPresupuestario || (budgetAvailability[0]?.renglonPresupuestario || '158'));
      setEstadoPago(purchaseToEdit.estadoPago || 'comprometido');
      setShowDocumentPreview(true);
      setEstatusEvento(purchaseToEdit.estatusEvento || 'Evaluación');
      setCategoriaTecnologica(purchaseToEdit.categoriaTecnologica || categoryOptions[0] || '');
      setDependenciaSolicitante(purchaseToEdit.dependenciaSolicitante || dependencyOptions[0] || '');
      setModalidadCompra(purchaseToEdit.modalidadCompra || modalityOptions[0] || 'Cotización Pública');
      setProveedorAdjudicado(purchaseToEdit.proveedorAdjudicado || '');
      
      // Cargar lista de observaciones registradas una a una
      if (purchaseToEdit.observacionesList && purchaseToEdit.observacionesList.length > 0) {
        setObservacionesList(purchaseToEdit.observacionesList);
      } else if (purchaseToEdit.observaciones) {
        setObservacionesList([{
          id: `obs_init_${purchaseToEdit.id}`,
          fechaHora: purchaseToEdit.fechaCreacion || new Date().toISOString(),
          fecha: (purchaseToEdit.fechaCreacion || new Date().toISOString()).slice(0, 10),
          hora: '08:00',
          usuario: purchaseToEdit.creadoPor || 'Sistema',
          rol: 'Registrador',
          comentario: purchaseToEdit.observaciones
        }]);
      } else {
        setObservacionesList([]);
      }
      setNuevaObservacion('');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setDescripcion('');
      setF56e('');
      setF56('');
      setF56Documento(null);
      setFechaRecepcion(today);
      setNog('');
      setFechaPublicacion('');
      setFechaOfertas('');
      setFechaAdjudicacion('');
      setCantidadOfertas(0);
      setMonto('');
      setRenglonPresupuestario(budgetAvailability[0]?.renglonPresupuestario || '158');
      setEstadoPago('comprometido');
      setShowDocumentPreview(true);
      setEstatusEvento('Evaluación');
      setCategoriaTecnologica(categoryOptions[0] || 'Servidores y Almacenamiento');
      setDependenciaSolicitante(dependencyOptions[0] || 'Subgerencia de Infraestructura GIT');
      setModalidadCompra('Cotización Pública');
      setProveedorAdjudicado('');
      setObservacionesList([]);
      setNuevaObservacion('');
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
      fechaRecepcion,
      fechaSolicitud: fechaRecepcion,
      nog: nog.trim(),
      fechaPublicacion,
      fechaOfertas,
      fechaAdjudicacion: fechaAdjudicacion || undefined,
      cantidadOfertas: Number(cantidadOfertas) || 0,
      monto: Number(monto) || 0,
      renglonPresupuestario,
      estadoPago,
      estatusEvento,
      categoriaTecnologica,
      dependenciaSolicitante,
      modalidadCompra: getModalidadCompraByMonto(Number(monto) || 0).nombre,
      proveedorAdjudicado: proveedorAdjudicado.trim() || undefined,
      observaciones: observacionesList.map(o => `${o.usuario}: ${o.comentario}`).join(' | ') || undefined,
      observacionesList,
      bitacoraCambios: purchaseToEdit?.bitacoraCambios || [],
      historialEstatus: purchaseToEdit?.historialEstatus || [],
      creadoPor: purchaseToEdit?.creadoPor || currentUser?.nombreCompleto || currentUser?.username || 'Operador Actual',
      fechaCreacion: purchaseToEdit?.fechaCreacion || new Date().toISOString()
    };
  }, [
    purchaseToEdit,
    descripcion,
    f56e,
    f56,
    f56Documento,
    fechaRecepcion,
    nog,
    fechaPublicacion,
    fechaOfertas,
    fechaAdjudicacion,
    cantidadOfertas,
    monto,
    renglonPresupuestario,
    estadoPago,
    estatusEvento,
    categoriaTecnologica,
    dependenciaSolicitante,
    proveedorAdjudicado,
    observacionesList,
    currentUser
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

  // Agregar observación individual con usuario y fecha/hora
  const handleAddObservation = () => {
    if (!nuevaObservacion.trim()) return;
    const now = new Date();
    const newEntry: PurchaseObservationEntry = {
      id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fechaHora: now.toISOString(),
      fecha: now.toISOString().slice(0, 10),
      hora: now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false }),
      usuario: currentUser?.nombreCompleto || currentUser?.username || 'Usuario Actual',
      rol: currentUser?.rol || 'Usuario',
      comentario: nuevaObservacion.trim()
    };
    setObservacionesList(prev => [...prev, newEntry]);
    setNuevaObservacion('');
  };

  const handleRemoveObservation = (obsId: string) => {
    setObservacionesList(prev => prev.filter(o => o.id !== obsId));
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

    // 4. Fecha de Recepción (obligatoria, sustituye solicitud, vo.bo. y autorización)
    if (!fechaRecepcion) {
      newErrors.fechaRecepcion = 'La Fecha de Recepción es obligatoria.';
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

    // 8. Fecha de adjudicación (si el estatus es Adjudicación o Adjudicada)
    if ((estatusEvento === 'Adjudicación' || estatusEvento === 'Adjudicada') && !fechaAdjudicacion) {
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

    // Si el usuario escribió una observación pero no hizo clic en agregar, incluirla automáticamente
    let finalObservacionesList = [...observacionesList];
    if (nuevaObservacion.trim()) {
      const now = new Date();
      finalObservacionesList.push({
        id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fechaHora: now.toISOString(),
        fecha: now.toISOString().slice(0, 10),
        hora: now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false }),
        usuario: currentUser?.nombreCompleto || currentUser?.username || 'Usuario Actual',
        rol: currentUser?.rol || 'Usuario',
        comentario: nuevaObservacion.trim()
      });
    }

    const recordData = {
      descripcion: descripcion.trim(),
      f56e: f56e.trim(),
      f56: f56.trim() || undefined,
      f56Documento: f56Documento || undefined,
      fechaRecepcion,
      fechaSolicitud: fechaRecepcion,
      nog: nog.trim(),
      fechaPublicacion: fechaPublicacion || '',
      fechaOfertas: fechaOfertas || '',
      fechaAdjudicacion: fechaAdjudicacion || '',
      cantidadOfertas: Number(cantidadOfertas),
      monto: Number(monto),
      renglonPresupuestario,
      grupoPresupuestario: selectedLine?.grupoPresupuestario || (isRenglon113 ? 'Grupo 100 - Servicios No Personales' : ''),
      nombreRenglon: selectedLine?.nombreRenglon || (isRenglon113 ? 'Telefonía (Referencia - Gerencia Administrativa)' : ''),
      estadoPago,
      estatusEvento,
      categoriaTecnologica,
      dependenciaSolicitante,
      modalidadCompra: getModalidadCompraByMonto(monto).nombre,
      proveedorAdjudicado: proveedorAdjudicado.trim() || undefined,
      observaciones: finalObservacionesList.map(o => `${o.usuario}: ${o.comentario}`).join(' | ') || undefined,
      observacionesList: finalObservacionesList,
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
            <img 
              src="/organismo_judicial_badge.svg" 
              alt="Organismo Judicial de Guatemala" 
              className="w-10 h-10 object-contain rounded-xl shadow-xs border border-slate-700/80 bg-slate-950/40 p-0.5 shrink-0"
            />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {purchaseToEdit ? 'Modificar Registro de Adquisición' : 'Registrar Nueva Adquisición'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Organismo Judicial de Guatemala • Departamento de Compras • Formulario F56-e
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
              <span>Observaciones y Hoja de Ruta (Árbol)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                modalTab === 'arbol' ? 'bg-slate-900 text-amber-300' : 'bg-slate-700 text-slate-300'
              }`}>
                {observacionesList.length || (purchaseToEdit?.observaciones ? 1 : 0)}
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
                <span>Ver Árbol de Observaciones y Hoja de Ruta</span>
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
                  <h3 className="text-xs font-bold text-slate-900">Árbol de Observaciones y Hoja de Ruta</h3>
                  <p className="text-[11px] text-slate-500">
                    Registro de observaciones en orden cronológico del más reciente al más antiguo.
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
            <PurchaseActionTree 
              purchase={livePurchasePreview} 
              onAddObservation={(comment) => {
                const now = new Date();
                const newEntry: PurchaseObservationEntry = {
                  id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  fechaHora: now.toISOString(),
                  fecha: now.toISOString().slice(0, 10),
                  hora: now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false }),
                  usuario: currentUser?.nombreCompleto || currentUser?.username || 'Usuario Actual',
                  rol: currentUser?.rol || 'Usuario',
                  comentario: comment.trim()
                };
                setObservacionesList(prev => [...prev, newEntry]);
              }}
              canAddObservation={true}
              currentUser={currentUser || undefined}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Membrete Institucional Oficial del Organismo Judicial */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/organismo_judicial_badge.svg" 
                alt="Organismo Judicial de Guatemala" 
                className="w-12 h-12 object-contain rounded-xl shadow-xs border border-slate-700/80 bg-slate-950/40 p-0.5 shrink-0"
              />
              <div>
                <h3 className="text-xs font-black tracking-wider uppercase text-white font-['Cinzel',serif]">
                  ORGANISMO JUDICIAL DE GUATEMALA
                </h3>
                <p className="text-[11px] font-bold text-amber-400">
                  Departamento de Compras • Ficha Oficial F56-e
                </p>
                <p className="text-[10px] text-slate-300">
                  Sistema Oficial de Control, Fiscalización y Hoja de Ruta de Compras
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block border-l border-slate-700/80 pl-3">
              <span className="text-[9px] uppercase font-bold text-amber-400 block tracking-wider">Estado de Expediente</span>
              <span className="text-xs font-mono font-bold text-white block">{estatusEvento}</span>
            </div>
          </div>

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

            {/* Fecha de Recepción (Sustituye fecha de solicitud, vo.bo. y autorización) */}
            <div className="pt-2 border-t border-slate-200">
              <label htmlFor="input-purchase-fecha-recepcion" className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Fecha de Recepción <span className="text-rose-600">*</span></span>
              </label>
              <input
                id="input-purchase-fecha-recepcion"
                type="date"
                value={fechaRecepcion}
                onChange={(e) => setFechaRecepcion(e.target.value)}
                className={`w-full sm:w-1/2 p-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white ${
                  errors.fechaRecepcion ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                }`}
              />
              {errors.fechaRecepcion ? (
                <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.fechaRecepcion}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-0.5">Fecha oficial de recepción del expediente en el Departamento de Compras</p>
              )}
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
                        dependenciaSolicitante,
                        proveedorAdjudicado,
                        areaSolicitante: purchaseToEdit?.areaSolicitante,
                        fechaDictamenGIT: purchaseToEdit?.fechaDictamenGIT,
                        fechaElaboracionOficioGIT: purchaseToEdit?.fechaElaboracionOficioGIT
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

            {/* 2. FECHAS: PUBLICACIÓN, CIERRE DE OFERTAS Y ADJUDICACIÓN (ORDEN SOLICITADO) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              
              {/* Fecha Publicación */}
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
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Publicación oficial Guatecompras</p>
              </div>

              {/* Fecha Cierre Ofertas */}
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
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Recepción de plicas</p>
              </div>

              {/* Fecha de Adjudicación (Agregada después de Fecha Cierre Ofertas según requerimiento) */}
              <div>
                <label htmlFor="input-purchase-fecha-adjudicacion" className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fecha de Adjudicación</span>
                  {(estatusEvento === 'Adjudicación' || estatusEvento === 'Adjudicada') && <span className="text-rose-600">*</span>}
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
                  <p className="text-[10px] text-slate-400 mt-0.5">Adjudicación en Guatecompras</p>
                )}
              </div>

            </div>

            {/* 3. MONTO (PRESUPUESTO EN QUETZALES) */}
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

              {/* Renglón Presupuestario Afectado (Integración Financiera) */}
              <div className="mt-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="select-purchase-renglon" className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <span>Renglón Presupuestario Afectado *</span>
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
                          Este renglón es gestionado y ejecutado por la <strong>Gerencia Administrativa</strong>. Esta ficha se registra exclusivamente para control referencial y trazabilidad interna; <strong>NO afecta ni descuenta la disponibilidad presupuestaria</strong> del Departamento de Compras.
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
                className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Número de postores que presentaron ofertas</p>
            </div>

            {/* 5. ESTATUS DEL EVENTO Y PROVEEDOR ADJUDICADO */}
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Estatus del Evento <span className="text-rose-600">*</span>
                  </label>
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
              </div>

              {/* Proveedor Adjudicado */}
              {(estatusEvento === 'Adjudicación' || estatusEvento === 'Adjudicada' || proveedorAdjudicado) && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-300 space-y-2">
                  <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-700" />
                    <span>Proveedor / Empresa Adjudicada</span>
                  </label>
                  <input
                    id="input-purchase-proveedor"
                    type="text"
                    value={proveedorAdjudicado}
                    onChange={(e) => setProveedorAdjudicado(e.target.value)}
                    placeholder="ej. Tecnologías y Sistemas Corporativos, S.A."
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-500">Nombre comercial o razón social del adjudicatario</p>
                </div>
              )}
            </div>

          </div>

          {/* SECCIÓN 4: OBSERVACIONES REGISTRADAS UNA A UNA (HOJA DE RUTA) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Observaciones del Expediente &amp; Hoja de Ruta
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                {observacionesList.length} {observacionesList.length === 1 ? 'observación' : 'observaciones'}
              </span>
            </div>

            {/* Lista de Observaciones Registradas */}
            {observacionesList.length === 0 ? (
              <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500">
                No hay observaciones registradas aún. Ingrese una observación a continuación para agregarla a la hoja de ruta con autor y fecha/hora.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {observacionesList.map((obs, idx) => (
                  <div 
                    key={obs.id || idx}
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5 relative group hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          <UserIcon className="w-3 h-3 text-slate-600" />
                          {obs.usuario}
                        </span>
                        {obs.rol && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            ({obs.rol})
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          {obs.fecha} {obs.hora ? `• ${obs.hora}` : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveObservation(obs.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                        title="Eliminar observación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {obs.comentario}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario para agregar una nueva observación individual */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="input-nueva-observacion" className="font-bold text-slate-800 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Agregar Observación a la Hoja de Ruta</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  Registrando como: <strong className="text-slate-700">{currentUser?.nombreCompleto || currentUser?.username || 'Usuario Actual'}</strong>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  id="input-nueva-observacion"
                  rows={2}
                  value={nuevaObservacion}
                  onChange={(e) => setNuevaObservacion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleAddObservation();
                    }
                  }}
                  placeholder="Escriba aquí la observación técnica, justificación, número de oficio o detalle del trámite..."
                  className="flex-1 p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddObservation}
                  disabled={!nuevaObservacion.trim()}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                    nuevaObservacion.trim()
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Cada observación se registra con su usuario y queda visible cronológicamente en la Hoja de Ruta (Árbol de Acciones).
              </p>
            </div>
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
