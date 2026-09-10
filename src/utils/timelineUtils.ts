import { PurchaseRecord, StatusTimelineEvent, TimelineEventState } from '../types';

export interface TimelinePreset {
  id: string;
  titulo: string;
  fase: string;
  responsableDefault: string;
  descripcionSugerida: string;
  estadoDefault: TimelineEventState;
  color: string;
}

export const TIMELINE_PRESETS: TimelinePreset[] = [
  {
    id: 'dictamen_tecnico',
    titulo: 'Llegó para Dictamen Técnico',
    fase: 'Dictamen Técnico',
    responsableDefault: 'Gerencia de Informática - GIT',
    descripcionSugerida: 'Expediente y requerimiento F56-e recibido en la Gerencia de Informática para análisis y dictamen técnico de especificaciones.',
    estadoDefault: 'completado',
    color: 'amber'
  },
  {
    id: 'remitido_compras',
    titulo: 'GIT lo remite a Compras',
    fase: 'Compras',
    responsableDefault: 'Gerencia de Informática - GIT',
    descripcionSugerida: 'Gerencia de Informática remite el expediente y oficio formal con el visto bueno técnico hacia la Dirección de Compras.',
    estadoDefault: 'completado',
    color: 'blue'
  },
  {
    id: 'disponibilidad_presupuestaria',
    titulo: 'Disponibilidad Presupuestaria',
    fase: 'Presupuesto / DAF',
    responsableDefault: 'Dirección Financiera / Presupuesto',
    descripcionSugerida: 'Aprobación de disponibilidad presupuestaria y asignación de renglón de gasto correspondiente para la adquisición.',
    estadoDefault: 'completado',
    color: 'emerald'
  },
  {
    id: 'solicitud_f56e',
    titulo: 'Recepción de Solicitud F56-e',
    fase: 'Solicitud Inicial',
    responsableDefault: 'Área Solicitante',
    descripcionSugerida: 'Ingreso oficial de la solicitud de requerimiento bajo formulario electrónico F56-e.',
    estadoDefault: 'completado',
    color: 'slate'
  },
  {
    id: 'vobo_autoridad',
    titulo: 'Visto Bueno (Vo.Bo.) Institucional',
    fase: 'Autorización',
    responsableDefault: 'Autoridad Solicitante / Gerencia',
    descripcionSugerida: 'Revisión y visto bueno otorgado por la jefatura competente.',
    estadoDefault: 'completado',
    color: 'indigo'
  },
  {
    id: 'publicacion_guatecompras',
    titulo: 'Publicación en Guatecompras',
    fase: 'Publicación Oficial',
    responsableDefault: 'Unidad de Compras',
    descripcionSugerida: 'Bases y especificaciones publicadas en el portal Guatecompras para concurso público.',
    estadoDefault: 'completado',
    color: 'sky'
  },
  {
    id: 'cierre_ofertas',
    titulo: 'Cierre y Recepción de Ofertas',
    fase: 'Recepción de Ofertas',
    responsableDefault: 'Junta de Cotización / Licitación',
    descripcionSugerida: 'Cierre del período de recepción de ofertas de proveedores interesados.',
    estadoDefault: 'completado',
    color: 'purple'
  },
  {
    id: 'evaluacion_ofertas',
    titulo: 'Evaluación Técnica de Ofertas',
    fase: 'Evaluación',
    responsableDefault: 'Comisión Evaluadora / GIT',
    descripcionSugerida: 'Análisis de cumplimiento técnico y cuadro comparativo de las ofertas recibidas.',
    estadoDefault: 'en_proceso',
    color: 'orange'
  },
  {
    id: 'adjudicacion_evento',
    titulo: 'Adjudicación Definitiva',
    fase: 'Adjudicación',
    responsableDefault: 'Autoridad Superior / Compras',
    descripcionSugerida: 'Adjudicación oficial aprobada a favor del proveedor seleccionado.',
    estadoDefault: 'completado',
    color: 'emerald'
  }
];

/**
 * Genera o normaliza la línea de tiempo de una adquisición.
 * Si ya existen hitos en el historial, los devuelve ordenados cronológicamente por su fecha y hora exacta.
 * Si no existen, genera los hitos base calculados a partir de los datos registrados en la ficha.
 */
export function getPurchaseTimeline(purchase: PurchaseRecord): StatusTimelineEvent[] {
  if (purchase.historialEstatus && purchase.historialEstatus.length > 0) {
    return [...purchase.historialEstatus].sort((a, b) => {
      // Priorizar fechaRegistro (ISO timestamp) si existe en ambos
      if (a.fechaRegistro && b.fechaRegistro) {
        return new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime();
      }
      const timeStrA = a.hora ? (a.hora.length === 5 ? `${a.hora}:00` : a.hora) : '00:00:00';
      const timeStrB = b.hora ? (b.hora.length === 5 ? `${b.hora}:00` : b.hora) : '00:00:00';
      const dateA = new Date(`${a.fecha}T${timeStrA}`).getTime();
      const dateB = new Date(`${b.fecha}T${timeStrB}`).getTime();
      return dateA - dateB;
    });
  }

  // Generar hitos base inteligentes a partir de los datos registrados
  const baseTimeline: StatusTimelineEvent[] = [];

  // 1. Solicitud
  if (purchase.fechaSolicitud) {
    baseTimeline.push({
      id: `base_solicitud_${purchase.id}`,
      titulo: 'Recepción de Solicitud F56-e',
      fase: 'Solicitud Inicial',
      fecha: purchase.fechaSolicitud,
      hora: '08:30',
      responsable: purchase.dependenciaSolicitante || purchase.areaSolicitante || 'Área Solicitante',
      observaciones: `Formulario F56-e: ${purchase.f56e}. Requerimiento inicial registrado en el sistema.`,
      documentoReferencia: `F56-e No. ${purchase.f56e}`,
      estado: 'completado',
      registradoPor: purchase.creadoPor || 'Sistema GIT'
    });
  }

  // 2. Llegada para Dictamen Técnico
  if (purchase.evaluadoGIT === 'Sí' || purchase.fechaDictamenGIT) {
    baseTimeline.push({
      id: `base_dictamen_${purchase.id}`,
      titulo: 'Llegó para Dictamen Técnico',
      fase: 'Dictamen Técnico',
      fecha: purchase.fechaDictamenGIT || purchase.fechaSolicitud,
      hora: '09:15',
      responsable: 'Gerencia de Informática - GIT',
      observaciones: 'Ingreso del expediente para evaluación técnica de viabilidad, arquitectura y especificaciones por la GIT.',
      documentoReferencia: purchase.fechaDictamenGIT ? `Dictamen GIT (${purchase.fechaDictamenGIT})` : 'Expediente F56-e',
      estado: 'completado',
      registradoPor: 'Gerencia de Informática'
    });
  }

  // 3. Remitido por GIT a Compras
  if (purchase.fechaElaboracionOficioGIT) {
    baseTimeline.push({
      id: `base_oficio_${purchase.id}`,
      titulo: 'GIT lo remite a Compras',
      fase: 'Compras',
      fecha: purchase.fechaElaboracionOficioGIT,
      hora: '11:00',
      responsable: 'Gerencia de Informática - GIT',
      observaciones: 'Elaboración y emisión de oficio técnico de la Gerencia de Informática remitido a la Dirección de Compras.',
      documentoReferencia: `Oficio GIT Fecha: ${purchase.fechaElaboracionOficioGIT}`,
      estado: 'completado',
      registradoPor: 'Gerencia de Informática'
    });
  }

  // 4. Vo.Bo. Institucional
  if (purchase.fechaVoBo) {
    baseTimeline.push({
      id: `base_vobo_${purchase.id}`,
      titulo: 'Visto Bueno (Vo.Bo.) Institucional',
      fase: 'Autorización',
      fecha: purchase.fechaVoBo,
      hora: '14:00',
      responsable: 'Jefatura de Área / Dirección',
      observaciones: 'Aprobación del requerimiento con visto bueno de la jefatura solicitante.',
      estado: 'completado',
      registradoPor: 'Administración'
    });
  }

  // 5. Disponibilidad Presupuestaria y Autorización
  if (purchase.fechaAutorizado) {
    baseTimeline.push({
      id: `base_autorizado_${purchase.id}`,
      titulo: 'Disponibilidad Presupuestaria y Autorización',
      fase: 'Presupuesto / DAF',
      fecha: purchase.fechaAutorizado,
      hora: '10:30',
      responsable: 'Dirección Financiera / Presupuesto',
      observaciones: `Verificación de disponibilidad presupuestaria por un monto total de GTQ ${purchase.monto?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}.`,
      documentoReferencia: 'Aprobación Presupuestaria',
      estado: 'completado',
      registradoPor: 'DAF'
    });
  }

  // 6. Publicación Guatecompras
  if (purchase.fechaPublicacion) {
    baseTimeline.push({
      id: `base_publicacion_${purchase.id}`,
      titulo: 'Publicación en Guatecompras',
      fase: 'Publicación',
      fecha: purchase.fechaPublicacion,
      hora: '16:00',
      responsable: 'Unidad de Compras y Contrataciones',
      observaciones: `Convocatoria pública publicada en Guatecompras bajo NOG: ${purchase.nog}.`,
      documentoReferencia: `NOG: ${purchase.nog}`,
      estado: 'completado',
      registradoPor: 'Compras'
    });
  }

  // 7. Cierre y Recepción de Ofertas
  if (purchase.fechaOfertas) {
    baseTimeline.push({
      id: `base_ofertas_${purchase.id}`,
      titulo: 'Recepción y Cierre de Ofertas',
      fase: 'Recepción de Ofertas',
      fecha: purchase.fechaOfertas,
      hora: '10:00',
      responsable: 'Junta de Cotización / Licitación',
      observaciones: `Cierre del plazo para recepción de plicas. Total de ofertas recibidas: ${purchase.cantidadOfertas || 0}.`,
      documentoReferencia: `Acta de Cierre (${purchase.cantidadOfertas || 0} Ofertas)`,
      estado: 'completado',
      registradoPor: 'Junta Receptora'
    });
  }

  // 8. Adjudicación
  if (purchase.estatusEvento === 'Adjudicación' || purchase.fechaAdjudicacion) {
    baseTimeline.push({
      id: `base_adjudicacion_${purchase.id}`,
      titulo: 'Adjudicación Definitiva',
      fase: 'Adjudicación',
      fecha: purchase.fechaAdjudicacion || purchase.fechaOfertas || purchase.fechaPublicacion,
      hora: '15:30',
      responsable: 'Autoridad Competente',
      observaciones: purchase.proveedorAdjudicado 
        ? `Adjudicado formalmente a: ${purchase.proveedorAdjudicado}.`
        : 'Evento de adquisición debidamente adjudicado.',
      documentoReferencia: 'Resolución de Adjudicación',
      estado: 'completado',
      registradoPor: 'Compras'
    });
  } else if (purchase.estatusEvento === 'Evaluación') {
    baseTimeline.push({
      id: `base_evaluando_${purchase.id}`,
      titulo: 'Evaluación y Calificación de Ofertas en Proceso',
      fase: 'Evaluación',
      fecha: purchase.fechaOfertas || new Date().toISOString().split('T')[0],
      hora: '11:00',
      responsable: 'Junta Calificadora / Área Técnica',
      observaciones: 'Se encuentra en análisis el cuadro comparativo de ofertas presentadas.',
      estado: 'en_proceso',
      registradoPor: 'Sistema'
    });
  }

  return baseTimeline.sort((a, b) => {
    const timeStrA = a.hora ? (a.hora.length === 5 ? `${a.hora}:00` : a.hora) : '00:00:00';
    const timeStrB = b.hora ? (b.hora.length === 5 ? `${b.hora}:00` : b.hora) : '00:00:00';
    const dateA = new Date(`${a.fecha}T${timeStrA}`).getTime();
    const dateB = new Date(`${b.fecha}T${timeStrB}`).getTime();
    return dateA - dateB;
  });
}

/**
 * Crea un evento de línea de tiempo con sello automático de fecha y hora exacta del sistema.
 */
export function createAutomaticTimelineEvent(params: {
  titulo: string;
  fase: string;
  responsable?: string;
  observaciones?: string;
  documentoReferencia?: string;
  estado?: TimelineEventState;
  registradoPor?: string;
}): StatusTimelineEvent {
  const now = new Date();
  const fecha = now.toISOString().slice(0, 10);
  const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  return {
    id: `auto_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
    titulo: params.titulo,
    fase: params.fase,
    fecha,
    hora,
    responsable: params.responsable || 'Gerencia de Informática - GIT',
    observaciones: params.observaciones,
    documentoReferencia: params.documentoReferencia,
    estado: params.estado || 'completado',
    registradoPor: params.registradoPor || 'Sistema GIT',
    fechaRegistro: now.toISOString(),
    automatico: true,
  };
}

/**
 * Detecta automáticamente las acciones efectuadas en la adquisición
 * y genera los hitos correspondientes sellados con la fecha y hora exacta de grabación.
 */
export function detectAutomaticEventsOnUpdate(
  prev: PurchaseRecord,
  update: Partial<PurchaseRecord>,
  userName: string = 'Operador GIT'
): StatusTimelineEvent[] {
  const events: StatusTimelineEvent[] = [];

  // 1. Cambio en el estatus del evento
  if (update.estatusEvento && update.estatusEvento !== prev.estatusEvento) {
    let fase = 'Gestión';
    let responsable = 'Autoridad Competente';
    if (update.estatusEvento === 'Adjudicación') {
      fase = 'Adjudicación';
      responsable = 'Autoridad Superior / Compras';
    } else if (update.estatusEvento === 'Evaluación') {
      fase = 'Evaluación';
      responsable = 'Comisión Evaluadora / Junta';
    } else if (update.estatusEvento === 'Prescindido' || update.estatusEvento === 'Desierto') {
      fase = 'Resolución';
      responsable = 'Autoridad Contratante';
    }

    let detalle = `Transición de estatus grabada en el sistema: de "${prev.estatusEvento}" a "${update.estatusEvento}".`;
    if (update.proveedorAdjudicado || prev.proveedorAdjudicado) {
      detalle += ` Proveedor: ${update.proveedorAdjudicado || prev.proveedorAdjudicado}.`;
    }

    events.push(createAutomaticTimelineEvent({
      titulo: `Cambio de Estatus a: ${update.estatusEvento}`,
      fase,
      responsable,
      observaciones: detalle,
      documentoReferencia: update.fechaAdjudicacion ? `Fecha: ${update.fechaAdjudicacion}` : undefined,
      registradoPor: userName
    }));
  }

  // 2. Llegada o Registro de Dictamen Técnico en GIT
  if (update.evaluadoGIT === 'Sí' && prev.evaluadoGIT !== 'Sí') {
    events.push(createAutomaticTimelineEvent({
      titulo: 'Llegó para Dictamen Técnico en GIT',
      fase: 'Dictamen Técnico',
      responsable: 'Gerencia de Informática - GIT',
      observaciones: 'Expediente F56-e recibido en la Gerencia de Informática para análisis y dictamen técnico de especificaciones.',
      documentoReferencia: update.fechaDictamenGIT ? `Dictamen: ${update.fechaDictamenGIT}` : undefined,
      registradoPor: userName
    }));
  } else if (update.fechaDictamenGIT && update.fechaDictamenGIT !== prev.fechaDictamenGIT) {
    events.push(createAutomaticTimelineEvent({
      titulo: 'Dictamen Técnico Emitido por GIT',
      fase: 'Dictamen Técnico',
      responsable: 'Gerencia de Informática - GIT',
      observaciones: 'Emisión de dictamen técnico con visto bueno favorable de especificaciones para trámite de compra.',
      documentoReferencia: `Fecha Dictamen: ${update.fechaDictamenGIT}`,
      registradoPor: userName
    }));
  }

  // 3. Remitido por GIT a Dirección de Compras
  if (update.fechaElaboracionOficioGIT && update.fechaElaboracionOficioGIT !== prev.fechaElaboracionOficioGIT) {
    events.push(createAutomaticTimelineEvent({
      titulo: 'GIT lo remite a Dirección de Compras',
      fase: 'Compras',
      responsable: 'Gerencia de Informática - GIT',
      observaciones: 'Oficio técnico y expediente remitido formalmente desde la GIT hacia la Dirección de Compras.',
      documentoReferencia: `Oficio GIT: ${update.fechaElaboracionOficioGIT}`,
      registradoPor: userName
    }));
  }

  // 4. Visto Bueno (Vo.Bo.)
  if (update.fechaVoBo && update.fechaVoBo !== prev.fechaVoBo) {
    events.push(createAutomaticTimelineEvent({
      titulo: 'Visto Bueno (Vo.Bo.) Institucional Registrado',
      fase: 'Autorización',
      responsable: update.dependenciaSolicitante || prev.dependenciaSolicitante || 'Área Solicitante',
      observaciones: 'Revisión y visto bueno oficial otorgado en el expediente.',
      documentoReferencia: `Vo.Bo.: ${update.fechaVoBo}`,
      registradoPor: userName
    }));
  }

  // 5. Disponibilidad Presupuestaria / Autorizado
  if (update.fechaAutorizado && update.fechaAutorizado !== prev.fechaAutorizado) {
    const montoDisplay = (update.monto !== undefined ? update.monto : prev.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 });
    events.push(createAutomaticTimelineEvent({
      titulo: 'Disponibilidad Presupuestaria Aprobada',
      fase: 'Presupuesto / DAF',
      responsable: 'Dirección Financiera / Presupuesto',
      observaciones: `Verificación presupuestaria aprobada y disponibilidad certificada por un monto de Q${montoDisplay}.`,
      documentoReferencia: `Autorizado: ${update.fechaAutorizado}`,
      registradoPor: userName
    }));
  }

  // 6. Publicación en Guatecompras
  if (
    (update.fechaPublicacion && update.fechaPublicacion !== prev.fechaPublicacion) ||
    (update.nog && update.nog !== prev.nog && update.nog.trim() !== '')
  ) {
    events.push(createAutomaticTimelineEvent({
      titulo: 'Publicación Oficial en Guatecompras',
      fase: 'Publicación',
      responsable: 'Unidad de Compras y Contrataciones',
      observaciones: `Convocatoria pública publicada en Guatecompras bajo NOG: ${update.nog || prev.nog}.`,
      documentoReferencia: `NOG: ${update.nog || prev.nog}`,
      registradoPor: userName
    }));
  }

  // 7. Cierre y Recepción de Ofertas
  if (
    (update.fechaOfertas && update.fechaOfertas !== prev.fechaOfertas) ||
    (update.cantidadOfertas !== undefined && update.cantidadOfertas !== prev.cantidadOfertas)
  ) {
    const totalOfertas = update.cantidadOfertas !== undefined ? update.cantidadOfertas : prev.cantidadOfertas;
    events.push(createAutomaticTimelineEvent({
      titulo: 'Recepción y Cierre de Ofertas',
      fase: 'Recepción de Ofertas',
      responsable: 'Junta de Cotización / Licitación',
      observaciones: `Cierre del plazo para recepción de ofertas. Total de ofertas y plicas registradas: ${totalOfertas}.`,
      documentoReferencia: `Total Ofertas: ${totalOfertas}`,
      registradoPor: userName
    }));
  }

  // 8. Carga de Documento Digital F56-e
  if (update.f56Documento && (!prev.f56Documento || update.f56Documento.nombre !== prev.f56Documento.nombre)) {
    events.push(createAutomaticTimelineEvent({
      titulo: 'Documento Digitalizado F56-e Adjunto',
      fase: 'Expediente Digital',
      responsable: 'Gerencia de Informática',
      observaciones: `Archivo oficial digitalizado "${update.f56Documento.nombre}" cargado e incorporado al expediente institucional.`,
      documentoReferencia: update.f56Documento.nombre,
      registradoPor: userName
    }));
  }

  return events;
}
