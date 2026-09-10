/**
 * Catálogo Oficial Presupuestario y de Adquisiciones
 * Gerencia de Informática - Organismo Judicial de Guatemala
 * 
 * Contiene las estructuras oficiales extraídas de las matrices institucionales:
 * 1. Grupos Presupuestarios (100, 200, 300)
 * 2. Modalidades de Compra y Orden (1 a 5)
 * 3. Estatus de Compra y Afectación de Disponibilidad (Sí / No)
 * 4. Renglones por Grupo para Listas
 * 5. 39 Renglones y Nombres Editables
 * 6. Tipos de Modificación y Signos (Incremento: 1, Disminución: -1)
 */

export interface OfficialBudgetGroup {
  grupo: string;
  nombre: string;
  descripcion?: string;
}

export interface OfficialModalidadCompra {
  modalidad: string;
  order: number;
  descripcion?: string;
  fundamentoLegal?: string;
}

export interface OfficialEstatusCompra {
  estatus: string;
  afectaDisponibilidad: boolean;
  descripcion?: string;
  color?: string;
}

export interface OfficialRenglonPresupuestario {
  grupo: '100' | '200' | '300';
  renglon: string;
  nombreRenglon: string;
  descripcionDefecto?: string;
}

export type OfficialRenglon = OfficialRenglonPresupuestario;

export const getGrupoFullName = (grupo: string): string => {
  if (grupo === '100') return 'Grupo 100 - Servicios No Personales';
  if (grupo === '200') return 'Grupo 200 - Materiales y Suministros';
  if (grupo === '300') return 'Grupo 300 - Propiedad, Planta, Equipo e Intangibles';
  return `Grupo ${grupo}`;
};

export interface OfficialTipoModificacion {
  tipo: string;
  signo: number; // 1 | -1
  descripcion?: string;
}

// 1. GRUPOS PRESUPUESTARIOS
export const OFFICIAL_BUDGET_GROUPS: OfficialBudgetGroup[] = [
  { 
    grupo: '100', 
    nombre: 'Servicios no personales',
    descripcion: 'Contrataciones de servicios técnicos, profesionales, mantenimiento y telecomunicaciones.'
  },
  { 
    grupo: '200', 
    nombre: 'Materiales y suministros',
    descripcion: 'Bienes consumibles, accesorios, repuestos, consumibles de impresión y materiales eléctricos.'
  },
  { 
    grupo: '300', 
    nombre: 'Propiedad, planta, equipo e intangibles',
    descripcion: 'Activos fijos, equipamiento de cómputo, servidores, redes y software intangible.'
  }
];

// 2. MODALIDADES DE COMPRA (ORDENADAS)
export const OFFICIAL_MODALIDADES: OfficialModalidadCompra[] = [
  { 
    modalidad: 'Baja cuantía', 
    order: 1, 
    descripcion: 'Contratación directa para montos de hasta Q.25,000.00',
    fundamentoLegal: 'Artículo 43 inciso a) Ley de Contrataciones del Estado'
  },
  { 
    modalidad: 'Compra directa', 
    order: 2, 
    descripcion: 'Procedimiento para adquisiciones de más de Q.25,000.00 hasta Q.90,000.00',
    fundamentoLegal: 'Artículo 43 inciso b) Ley de Contrataciones del Estado'
  },
  { 
    modalidad: 'Cotización', 
    order: 3, 
    descripcion: 'Procedimiento público para adquisiciones mayores a Q.90,000.00 hasta Q.900,000.00',
    fundamentoLegal: 'Artículo 38 Ley de Contrataciones del Estado'
  },
  { 
    modalidad: 'Licitación', 
    order: 4, 
    descripcion: 'Concurso público para contrataciones que superan los Q.900,000.00',
    fundamentoLegal: 'Artículo 17 Ley de Contrataciones del Estado'
  },
  { 
    modalidad: 'Fondo rotativo', 
    order: 5, 
    descripcion: 'Fondo privativo de caja chica para compras urgentes menores',
    fundamentoLegal: 'Normas de Ejecución Presupuestaria y Régimen de Fondos Rotativos del OJ'
  }
];

export const OFFICIAL_MODALIDADES_COMPRA = OFFICIAL_MODALIDADES;

// 3. ESTATUS DE COMPRA Y AFECTACIÓN DE DISPONIBILIDAD
export const OFFICIAL_ESTATUS_COMPRA: OfficialEstatusCompra[] = [
  { 
    estatus: 'Registrada', 
    afectaDisponibilidad: true, 
    descripcion: 'Evento registrado en sistema, compromete disponibilidad preventiva',
    color: 'blue' 
  },
  { 
    estatus: 'En proceso', 
    afectaDisponibilidad: true, 
    descripcion: 'Expediente en gestión, Vo.Bo. o publicación de ofertas',
    color: 'amber' 
  },
  { 
    estatus: 'Comprometida', 
    afectaDisponibilidad: true, 
    descripcion: 'Evento con reserva de saldo y compromiso presupuestario formal',
    color: 'indigo' 
  },
  { 
    estatus: 'Adjudicada', 
    afectaDisponibilidad: true, 
    descripcion: 'Evento adjudicado a proveedor pendiente de trámite de pago',
    color: 'emerald' 
  },
  { 
    estatus: 'Pagada', 
    afectaDisponibilidad: true, 
    descripcion: 'Facturado y devengado, pasa a Pagado que Rebaja',
    color: 'purple' 
  },
  { 
    estatus: 'Anulada', 
    afectaDisponibilidad: false, 
    descripcion: 'Evento anulado o dejado sin efecto, no afecta disponibilidad presupuestaria',
    color: 'slate' 
  },
  { 
    estatus: 'Rechazada', 
    afectaDisponibilidad: false, 
    descripcion: 'Evento rechazado o no autorizado, no afecta disponibilidad presupuestaria',
    color: 'rose' 
  }
];

// Función para determinar si un estatus o renglón afecta disponibilidad presupuestaria
export function doesStatusAffectBudget(status?: string, renglon?: string): boolean {
  if (renglon && String(renglon).trim() === '113') {
    // Renglón 113 Telefonía es administrado por Gerencia Administrativa: es solo referencial y no afecta disponibilidad
    return false;
  }
  if (!status) return true;
  const clean = status.trim().toLowerCase();
  if (
    clean === 'anulada' || 
    clean === 'rechazada' || 
    clean === 'desierto' || 
    clean === 'prescindido'
  ) {
    return false;
  }
  return true;
}

// 4 & 5. RENGLONES Y NOMBRES EDITABLES (RENGLONES OFICIALES)
export const OFFICIAL_RENGLONES: OfficialRenglonPresupuestario[] = [
  // --- GRUPO 100: SERVICIOS NO PERSONALES ---
  { grupo: '100', renglon: '113', nombreRenglon: 'Telefonía (Referencia - Gerencia Administrativa)' },
  { grupo: '100', renglon: '131', nombreRenglon: 'Viaticos al Exterior' },
  { grupo: '100', renglon: '133', nombreRenglon: 'Viaticos al Interior' },
  { grupo: '100', renglon: '134', nombreRenglon: 'Compensación por kilómetro recorrido' },
  { grupo: '100', renglon: '136', nombreRenglon: 'Reconocimiento de Gastos' },
  { grupo: '100', renglon: '158', nombreRenglon: 'Derechos de Bienes Intangibles' },
  { grupo: '100', renglon: '162', nombreRenglon: 'Mantenimiento y Reparacion de Equipo de Oficina' },
  { grupo: '100', renglon: '165', nombreRenglon: 'Mantenimiento y Reparacion de Medios de Transporte' },
  { grupo: '100', renglon: '166', nombreRenglon: 'Mantenimiento y Reparación de Equipo para Comunicaciones' },
  { grupo: '100', renglon: '168', nombreRenglon: 'Mantenimiento y Reparación de Equipo de Cómputo' },
  { grupo: '100', renglon: '169', nombreRenglon: 'Otros Mantenimiento y Reparacion' },
  { grupo: '100', renglon: '185', nombreRenglon: 'Servicios de Capacitación' },
  { grupo: '100', renglon: '186', nombreRenglon: 'Servicios de Informática y Sistemas Computarizados' },
  { grupo: '100', renglon: '195', nombreRenglon: 'Impuestos, Derechos y Tazas' },
  { grupo: '100', renglon: '199', nombreRenglon: 'Otros servicios no personales' },

  // --- GRUPO 200: MATERIALES Y SUMINISTROS (20 Renglones) ---
  { grupo: '200', renglon: '211', nombreRenglon: 'Alimentos para personas' },
  { grupo: '200', renglon: '232', nombreRenglon: 'Acabados textiles' },
  { grupo: '200', renglon: '233', nombreRenglon: 'Prendas de vestir' },
  { grupo: '200', renglon: '241', nombreRenglon: 'Papel de escritorio' },
  { grupo: '200', renglon: '243', nombreRenglon: 'Productos de papel o carton' },
  { grupo: '200', renglon: '244', nombreRenglon: 'Productos de artes graficas' },
  { grupo: '200', renglon: '253', nombreRenglon: 'Llantas y neumaticos' },
  { grupo: '200', renglon: '254', nombreRenglon: 'Artículos de caucho' },
  { grupo: '200', renglon: '262', nombreRenglon: 'Combustibles y lubricantes' },
  { grupo: '200', renglon: '267', nombreRenglon: 'Tintes, pinturas y colorantes' },
  { grupo: '200', renglon: '268', nombreRenglon: 'Productos plasticos, nylon, vinil y P.V.C.' },
  { grupo: '200', renglon: '269', nombreRenglon: 'Otros productos quimicos y conexos' },
  { grupo: '200', renglon: '283', nombreRenglon: 'Productos de metal y sus aleaciones' },
  { grupo: '200', renglon: '286', nombreRenglon: 'Herramientas menores' },
  { grupo: '200', renglon: '291', nombreRenglon: 'Utiles de oficina' },
  { grupo: '200', renglon: '292', nombreRenglon: 'Utiles de limpieza' },
  { grupo: '200', renglon: '296', nombreRenglon: 'Útiles de cocina y comedor' },
  { grupo: '200', renglon: '297', nombreRenglon: 'Materiales, productos y accesorios electricos' },
  { grupo: '200', renglon: '298', nombreRenglon: 'Accesorios y repuestos en general' },
  { grupo: '200', renglon: '299', nombreRenglon: 'Otros materiales y suministros' },

  // --- GRUPO 300: PROPIEDAD, PLANTA, EQUIPO E INTANGIBLES (5 Renglones) ---
  { grupo: '300', renglon: '322', nombreRenglon: 'Mobiliario y equipo de oficina' },
  { grupo: '300', renglon: '324', nombreRenglon: 'Equipo educacional, cultural y recreativo' },
  { grupo: '300', renglon: '326', nombreRenglon: 'Equipo para comunicaciones' },
  { grupo: '300', renglon: '328', nombreRenglon: 'Equipo de computo' },
  { grupo: '300', renglon: '329', nombreRenglon: 'Otras maquinarias y equipos' }
];

// Mapeo rápido de renglones por grupo para listas
export const RENGLONES_POR_GRUPO = {
  '100': ['131', '133', '134', '136', '158', '162', '165', '166', '168', '169', '185', '186', '195', '199'],
  '200': ['211', '232', '233', '241', '243', '244', '253', '254', '262', '267', '268', '269', '283', '286', '291', '292', '296', '297', '298', '299'],
  '300': ['322', '324', '326', '328', '329']
} as const;

// 6. TIPOS DE MODIFICACIÓN Y SIGNOS
export const OFFICIAL_TIPOS_MODIFICACION: OfficialTipoModificacion[] = [
  { 
    tipo: 'Incremento', 
    signo: 1, 
    descripcion: 'Ampliación presupuestaria que incrementa el techo del renglón (+)' 
  },
  { 
    tipo: 'Disminucion', 
    signo: -1, 
    descripcion: 'Disminución o recorte presupuestario que rebaja el techo del renglón (-)' 
  }
];

/**
 * Obtiene el nombre oficial por defecto de un renglón
 */
export function getOfficialRenglonName(renglon: string): string {
  const found = OFFICIAL_RENGLONES.find(r => r.renglon === renglon);
  return found ? found.nombreRenglon : `Renglón ${renglon}`;
}

/**
 * Obtiene el grupo correspondiente a un código de renglón
 */
export function getGrupoForRenglon(renglon: string): { grupo: string; nombreCompleto: string } {
  const found = OFFICIAL_RENGLONES.find(r => r.renglon === renglon);
  if (found) {
    const grp = OFFICIAL_BUDGET_GROUPS.find(g => g.grupo === found.grupo);
    return {
      grupo: found.grupo,
      nombreCompleto: grp ? `Grupo ${grp.grupo} - ${grp.nombre}` : `Grupo ${found.grupo}`
    };
  }
  // Detección por primer dígito si es custom
  const firstDigit = renglon.charAt(0);
  if (firstDigit === '1') return { grupo: '100', nombreCompleto: 'Grupo 100 - Servicios no personales' };
  if (firstDigit === '2') return { grupo: '200', nombreCompleto: 'Grupo 200 - Materiales y suministros' };
  if (firstDigit === '3') return { grupo: '300', nombreCompleto: 'Grupo 300 - Propiedad, planta, equipo e intangibles' };
  return { grupo: '900', nombreCompleto: 'Otros Grupos Presupuestarios' };
}
