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
    id: 'recepcion_f56e',
    titulo: 'Fecha de Recepción F56-e',
    fase: 'Recepción',
    responsableDefault: 'Departamento de Compras',
    descripcionSugerida: 'Ingreso oficial y recepción del expediente bajo formulario electrónico F56-e en el Departamento de Compras.',
    estadoDefault: 'completado',
    color: 'slate'
  },
  {
    id: 'publicacion_guatecompras',
    titulo: 'Publicación en Guatecompras',
    fase: 'Publicación Oficial',
    responsableDefault: 'Departamento de Compras',
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
    id: 'adjudicacion_evento',
    titulo: 'Fecha de Adjudicación',
    fase: 'Adjudicación',
    responsableDefault: 'Autoridad Superior / Compras',
    descripcionSugerida: 'Adjudicación oficial aprobada a favor del proveedor seleccionado.',
    estadoDefault: 'completado',
    color: 'emerald'
  },
  {
    id: 'evaluacion_ofertas',
    titulo: 'Evaluación Técnica de Ofertas',
    fase: 'Evaluación',
    responsableDefault: 'Comisión Evaluadora',
    descripcionSugerida: 'Análisis de cumplimiento técnico y cuadro comparativo de las ofertas recibidas.',
    estadoDefault: 'en_proceso',
    color: 'orange'
  }
];

/**
 * Genera o normaliza la línea de tiempo de una adquisición.
 * Si ya existen hitos en el historial, los devuelve ordenados cronológicamente por su fecha y hora exacta.
 * Si no existen, genera los hitos base calculados a partir de los datos registrados en la ficha.
 * Además, incorpora todas las observaciones registradas una a una por los usuarios.
 */
export function getPurchaseTimeline(purchase: PurchaseRecord): StatusTimelineEvent[] {
  let events: StatusTimelineEvent[] = [];

  if (purchase.historialEstatus && purchase.historialEstatus.length > 0) {
    events = [...purchase.historialEstatus];
  } else {
    // Generar hitos base inteligentes a partir de los datos registrados
    const baseTimeline: StatusTimelineEvent[] = [];

    // 1. Fecha de Recepción (en lugar de solicitud, vobo y autorización)
    if (purchase.fechaRecepcion || purchase.fechaSolicitud) {
      baseTimeline.push({
        id: `base_recepcion_${purchase.id}`,
        titulo: 'Fecha de Recepción F56-e',
        fase: 'Recepción',
        fecha: purchase.fechaRecepcion || purchase.fechaSolicitud || '',
        hora: '08:30',
        responsable: purchase.dependenciaSolicitante || 'Departamento de Compras',
        observaciones: `Formulario F56-e: ${purchase.f56e}. Expediente recibido en el Departamento de Compras.`,
        documentoReferencia: `F56-e No. ${purchase.f56e}`,
        estado: 'completado',
        registradoPor: purchase.creadoPor || 'Departamento de Compras'
      });
    }

    // 2. Publicación Guatecompras
    if (purchase.fechaPublicacion) {
      baseTimeline.push({
        id: `base_publicacion_${purchase.id}`,
        titulo: 'Publicación en Guatecompras',
        fase: 'Publicación',
        fecha: purchase.fechaPublicacion,
        hora: '16:00',
        responsable: 'Departamento de Compras',
        observaciones: `Convocatoria pública publicada en Guatecompras bajo NOG: ${purchase.nog}.`,
        documentoReferencia: `NOG: ${purchase.nog}`,
        estado: 'completado',
        registradoPor: 'Compras'
      });
    }

    // 3. Cierre y Recepción de Ofertas
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

    // 4. Fecha de Adjudicación (después de Cierre de Ofertas)
    if (purchase.fechaAdjudicacion || purchase.estatusEvento === 'Adjudicación' || purchase.estatusEvento === 'Adjudicada') {
      baseTimeline.push({
        id: `base_adjudicacion_${purchase.id}`,
        titulo: 'Fecha de Adjudicación Definitiva',
        fase: 'Adjudicación',
        fecha: purchase.fechaAdjudicacion || purchase.fechaOfertas || purchase.fechaPublicacion || '',
        hora: '15:30',
        responsable: 'Autoridad Competente / Compras',
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
        responsable: 'Junta Calificadora',
        observaciones: 'Se encuentra en análisis el cuadro comparativo de ofertas presentadas.',
        estado: 'en_proceso',
        registradoPor: 'Sistema'
      });
    }

    events = baseTimeline;
  }

  // 5. Incorporar observaciones registradas una a una por los usuarios a la Hoja de Ruta
  if (purchase.observacionesList && purchase.observacionesList.length > 0) {
    purchase.observacionesList.forEach((obs) => {
      const alreadyPresent = events.some(e => e.id === `obs_${obs.id}` || e.id === obs.id);
      if (!alreadyPresent) {
        const obsDate = new Date(obs.fecha);
        const isValid = !isNaN(obsDate.getTime());
        const fecha = isValid ? obsDate.toISOString().slice(0, 10) : (obs.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10));
        const hora = isValid 
          ? `${String(obsDate.getHours()).padStart(2, '0')}:${String(obsDate.getMinutes()).padStart(2, '0')}` 
          : '12:00';

        events.push({
          id: `obs_${obs.id}`,
          titulo: `Observación: ${obs.usuario}`,
          fase: 'Observación',
          fecha,
          hora,
          responsable: obs.usuario,
          observaciones: obs.comentario,
          estado: 'completado',
          registradoPor: obs.usuario,
          fechaRegistro: obs.fecha,
          automatico: false,
        });
      }
    });
  }

  return events.sort((a, b) => {
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

  // 2. Fecha de Recepción
  if (update.fechaRecepcion && update.fechaRecepcion !== prev.fechaRecepcion) {
    events.push(createAutomaticTimelineEvent({
      titulo: 'Fecha de Recepción F56-e Registrada',
      fase: 'Recepción',
      responsable: 'Departamento de Compras',
      observaciones: `Expediente recibido formalmente en el Departamento de Compras con fecha ${update.fechaRecepcion}.`,
      documentoReferencia: `F56-e: ${update.f56e || prev.f56e}`,
      registradoPor: userName
    }));
  }

  // 3. Fecha de Adjudicación
  if (update.fechaAdjudicacion && update.fechaAdjudicacion !== prev.fechaAdjudicacion) {
    events.push(createAutomaticTimelineEvent({
      titulo: 'Fecha de Adjudicación Registrada',
      fase: 'Adjudicación',
      responsable: 'Autoridad Superior / Compras',
      observaciones: `Adjudicación registrada para la fecha ${update.fechaAdjudicacion}.${update.proveedorAdjudicado ? ` Proveedor: ${update.proveedorAdjudicado}` : ''}`,
      documentoReferencia: `Fecha Adjudicación: ${update.fechaAdjudicacion}`,
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
