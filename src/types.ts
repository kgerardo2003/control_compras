export type UserRole = 'administrador' | 'auditor' | 'usuario_estandar' | string;

export interface UserProfile {
  id: string;
  codigo: string; // ej: 'administrador', 'auditor', 'operador_compras', 'gestor_presupuesto', 'consulta_gerencial', etc.
  nombre: string; // ej: 'Administrador General', 'Auditor de Control Interno'
  descripcion: string;
  esSistema: boolean; // Si es un rol predeterminado protegido contra borrado
  color: string; // color identificador ej: 'blue', 'emerald', 'amber', 'rose', 'purple', 'indigo'
  modulosPermitidos: ActiveTab[]; // Módulos a los que este perfil tiene acceso
  activo: boolean;
  fechaCreacion: string;
  creadoPor?: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}

export interface User {
  id: string;
  username: string;
  nombreCompleto: string;
  email: string;
  password?: string;
  rol: UserRole;
  perfilId?: string; // ID o código del perfil de usuario asignado
  cargo: string;
  departamento: string;
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

export type EvaluacionGIT = 'Sí' | 'No';

export type EstatusEventoDefault = 'Evaluación' | 'Adjudicación' | 'Prescindido' | 'Desierto';

export interface AttachedDocument {
  nombre: string;
  tamano?: number;
  tipo?: string;
  fechaSubida?: string;
  dataUrl?: string; // Archivo base64 / blob URL para descarga y visualización
  storageKey?: string; // Llave opcional para subcolecciones o IndexedDB
}

export type TimelineEventState = 'completado' | 'en_proceso' | 'pendiente' | 'alerta';

export interface StatusTimelineEvent {
  id: string;
  titulo: string; // ej: "Llegó para Dictamen Técnico", "Remitido por GIT a Compras", "Disponibilidad Presupuestaria"
  fase?: string; // ej: "Dictamen Técnico", "Compras", "Presupuesto", "Publicación", "Adjudicación"
  fecha: string; // YYYY-MM-DD
  hora?: string; // HH:mm:ss
  responsable?: string; // ej: "Gerencia de Informática - GIT", "Dirección de Compras", "DAF / Presupuesto"
  observaciones?: string; // Observaciones, notas de seguimiento, etc.
  documentoReferencia?: string; // ej: "Oficio No. GIT-2026-115", "Dictamen Técnico No. DT-2026-03"
  estado: TimelineEventState;
  registradoPor?: string;
  fechaRegistro?: string; // Timestamp ISO exacto de grabación en el sistema
  automatico?: boolean; // Flag de registro automático sellado por el sistema
}

export interface PurchaseRecord {
  id: string;
  descripcion: string; // Max 200
  f56e: string;        // Forma F56-e (ej. 00001, 00001-2026, 000001-2026)
  f56?: string;        // Formulario F56 físico (opcional)
  f56Documento?: AttachedDocument; // Documento físico/digital de la F56 adjunto
  fechaSolicitud: string;   // YYYY-MM-DD
  fechaVoBo: string;        // YYYY-MM-DD
  fechaAutorizado: string;  // YYYY-MM-DD
  nog: string;              // 8 digits numeric
  fechaPublicacion: string; // YYYY-MM-DD
  fechaOfertas: string;     // YYYY-MM-DD
  cantidadOfertas: number;  // Numeric >= 0
  monto: number;            // Quetzales (GTQ)
  evaluadoGIT: EvaluacionGIT; // Sí | No
  fechaDictamenGIT?: string; // Fecha en que se realizó el dictamen técnico por la GIT (YYYY-MM-DD)
  fechaElaboracionOficioGIT?: string; // Fecha en que la Gerencia de Informática elaboró el oficio hacia compras (YYYY-MM-DD)
  estatusEvento: string;    // Evaluación | Adjudicación | Prescindido | Desierto or custom
  fechaAdjudicacion?: string; // Fecha en que se adjudicó el evento (YYYY-MM-DD)
  areaSolicitante?: string;
  categoriaTecnologica?: string;
  dependenciaSolicitante?: string;
  modalidadCompra?: string;
  proveedorAdjudicado?: string;
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
  observaciones?: string;
  historialEstatus?: StatusTimelineEvent[]; // Línea de tiempo de tracking y cambios de estatus del evento
  renglonPresupuestario?: string; // Ej: "158", "328", "121"
  grupoPresupuestario?: string; // Ej: "Grupo 100 - Servicios No Personales"
  nombreRenglon?: string; // Ej: "Arrendamiento de Equipo de Cómputo"
  estadoPago?: 'comprometido' | 'pagado'; // "comprometido" = pendiente de pago; "pagado" = rebaja realizada
  montoPagado?: number; // Monto que ya fue efectivamente pagado / devengado
  fechaPago?: string; // Fecha en que se marcó como pagado
  bitacoraCambios?: PurchaseChangeLogEntry[]; // Bitácora de cambios y auditoría de la ficha
}

export interface PurchaseChangeLogEntry {
  id: string;
  fechaHora: string; // Timestamp ISO
  usuario: string; // Nombre del usuario que realizó la acción
  rol?: string; // Rol del usuario (Administrador, etc.)
  accion: string; // 'CREACION' | 'EDICION' | 'CAMBIO_ESTATUS' | 'ASIGNACION_RENGLON' | 'PAGO_DEVENGADO' | 'REVERSION_PAGO' | 'NOTA_SEGUIMIENTO'
  estatus: string; // Estatus del evento al momento del cambio
  detalles: string; // Descripción del cambio efectuado
  cambios?: Array<{
    campo: string;
    anterior: any;
    nuevo: any;
  }>;
  ip?: string;
}

// ==========================================
// MÓDULO FINANCIERO Y PRESUPUESTARIO (GIT)
// ==========================================

export type BudgetDisponibilidadStatus = 'Con Disponibilidad' | 'Alerta Disponibilidad Baja' | 'Sin Disponibilidad';

export interface BudgetGroup {
  id: string;
  codigo: string; // Ej: "100", "200", "300"
  nombre: string; // Ej: "Servicios No Personales"
  descripcion?: string;
}

export interface BudgetLineItem {
  id: string;
  grupoPresupuestario: string;    // 1. Grupo Presupuestario (Ej: "Grupo 100 - Servicios No Personales")
  renglonPresupuestario: string;  // 2. Renglón Presupuestario (Ej: "158")
  nombreRenglon: string;          // 3. Nombre del Renglón (Ej: "Arrendamiento de Equipo de Cómputo")
  presupuestoInicial: number;     // 4. Presupuesto Inicial (GTQ)
  modificacionesAprobadas: number; // 5. Modificaciones Aprobadas (+ o - netas)
  modificacionesPositivas?: number; // Suma de Incrementos / Ampliaciones / Aumentos (+)
  modificacionesNegativas?: number; // Suma de Disminuciones / Reducciones / Bajas (-)
  presupuestoVigente: number;     // 6. Presupuesto Vigente (Inicial + Modificaciones)
  pagadoQueRebaja: number;        // 7. Pagado que Rebaja (Total ejecutado/pagado)
  disponibleReal: number;         // 8. Disponible Real (Vigente - Pagado que Rebaja)
  comprometidoPendiente: number;  // 9. Comprometido Pendiente (Adquisiciones en trámite/adjudicadas pendientes)
  disponibleProyectado: number;   // 10. Disponible Proyectado (Disponible Real - Comprometido Pendiente)
  porcentajeUsadoComprometido: number; // 11. Porcentaje Usado/Comprometido
  estatusDisponibilidad: BudgetDisponibilidadStatus; // 12. Estatus si hay disponibilidad o No
  esReferencia?: boolean;         // Indicador de renglón de referencia (ej: 113 Telefonía - Gerencia Administrativa)
  ejercicioFiscal?: number;       // Ej: 2026
  observaciones?: string;
  creadoPor?: string;
  fechaCreacion?: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}

export type BudgetModificationType = 'ampliacion' | 'disminucion' | 'transferencia';
export type BudgetModificationState = 'aprobada' | 'en_tramite' | 'rechazada';

export interface BudgetModification {
  id: string;
  correlativo: string;           // Ej: "MOD-2026-001"
  tipo: BudgetModificationType;  // "ampliacion" (+), "disminucion" (-), "transferencia" (entre renglones)
  renglonPresupuestario: string; // Renglón afectado (o renglón destino en transferencias)
  nombreRenglon: string;
  grupoPresupuestario: string;
  renglonOrigenPresupuestario?: string; // En caso de transferencia
  nombreRenglonOrigen?: string;
  monto: number;                 // Quetzales (siempre positivo en registro, se suma o resta según el tipo)
  fecha: string;                 // YYYY-MM-DD
  noResolucion: string;          // Ej: "Resolución DAF-OJ-2026-015"
  descripcion: string;           // Justificación técnica/legal
  estado: BudgetModificationState; // Solo 'aprobada' afecta el presupuesto vigente
  aprobadoPor?: string;
  fechaAprobacion?: string;
  creadoPor: string;
  fechaCreacion: string;
}

export interface CatalogItem {
  id: string;
  codigo: string;
  valor: string;
  descripcion?: string;
  activo: boolean;
  color?: string;
}

export interface Catalog {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  esSistema: boolean;
  items: CatalogItem[];
}

export type AuditAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'CREAR_COMPRA' 
  | 'EDITAR_COMPRA' 
  | 'ELIMINAR_COMPRA' 
  | 'CAMBIO_ESTATUS' 
  | 'CREAR_CATALOGO' 
  | 'EDITAR_CATALOGO' 
  | 'CREAR_USUARIO' 
  | 'EDITAR_USUARIO' 
  | 'CREAR_PERFIL_USUARIO'
  | 'EDITAR_PERFIL_USUARIO'
  | 'ELIMINAR_PERFIL_USUARIO'
  | 'EXPORTAR_DATOS'
  | 'RESTAURAR_DATOS'
  | 'IMPORTAR_DATOS'
  | 'CREAR_RENGLON'
  | 'EDITAR_RENGLON'
  | 'ELIMINAR_RENGLON'
  | 'CREAR_MODIFICACION_PRESUPUESTARIA'
  | 'APROBAR_MODIFICACION_PRESUPUESTARIA'
  | 'IMPORTAR_PRESUPUESTO';

export interface AuditLogEntry {
  id: string;
  fecha: string;
  usuario: string;
  rol: UserRole;
  accion: AuditAction;
  modulo: 'Autenticación' | 'Compras' | 'Presupuesto' | 'Catálogos' | 'Usuarios' | 'Auditoría' | 'Reportes' | 'Sistema' | 'Perfiles';
  detalles: string;
  registroId?: string;
  ip: string;
  valoresAnteriores?: Record<string, any>;
  valoresNuevos?: Record<string, any>;
}

export type NotificationType = 'urgente' | 'alerta' | 'info' | 'exito';

export interface AppNotification {
  id: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  enlaceId?: string;
  categoria: 'vencimiento_oferta' | 'cambio_estatus' | 'aprobacion_vobo' | 'nuevo_registro' | 'sistema';
}

export type ActiveTab = 'dashboard' | 'compras' | 'presupuesto' | 'catalogos' | 'auditoria' | 'usuarios' | 'perfiles' | 'reportes' | 'personalizacion' | 'correo';

export interface GmailConfig {
  userEmail: string;
  senderName: string;
  appPassword: string;
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  recipientEmails: string[];
  notifyOnNewPurchase: boolean;
  notifyOnAdjudication: boolean;
  notifyOnDeadlineWarning: boolean;
  notifyOnGitOpinion: boolean;
  notifyOnCriticalAudit: boolean;
  lastTestDate?: string;
  lastTestStatus?: 'success' | 'error';
  lastTestError?: string;
}

export type SystemThemeId = 'azul_persia_acero' | 'slate_ambar' | 'azul_judicial' | 'grafito_esmeralda';

export interface CustomLogoConfig {
  type: 'preset' | 'custom_image';
  presetId?: 'oj_vector' | 'oj_monogram' | 'escudo_nacional';
  imageUrl?: string;
  title: string;
  subtitle: string;
}

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
