import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  DollarSign, 
  FileCheck2,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Clock,
  Building2,
  Users,
  Layers,
  Search,
  Filter,
  ShieldAlert,
  GitBranch,
  TrendingUp,
  BarChart3,
  Calendar,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { formatQuetzales, formatDate, exportToCSV, getModalidadCompraByMonto } from '../utils/formatters';
import { generatePurchasesPDF } from '../utils/pdfExport';
import { PurchaseRecord } from '../types';

export type ReportCategory = 
  | 'hoja_ruta' 
  | 'etapas_pipeline' 
  | 'modalidades_lce' 
  | 'dependencias' 
  | 'proveedores' 
  | 'alertas_riesgo' 
  | 'consolidado';

interface MovementInfo {
  texto: string;
  fecha: string;
  hora?: string;
  usuario: string;
  dias: number;
  hasMovement: boolean;
}

function getDaysElapsed(dateStr?: string): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 999;
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getLastMovementInfo(p: PurchaseRecord): MovementInfo {
  if (p.observacionesList && p.observacionesList.length > 0) {
    const sorted = [...p.observacionesList].sort((a, b) => 
      new Date(b.fechaHora || b.fecha).getTime() - new Date(a.fechaHora || a.fecha).getTime()
    );
    const last = sorted[0];
    const days = getDaysElapsed(last.fechaHora || last.fecha);
    return {
      texto: last.comentario,
      fecha: last.fecha,
      hora: last.hora,
      usuario: last.usuario || 'Operador Compras',
      dias: days,
      hasMovement: true,
    };
  }

  if (p.historialEstatus && p.historialEstatus.length > 0) {
    const sorted = [...p.historialEstatus].sort((a, b) => 
      new Date(b.fechaRegistro || b.fecha).getTime() - new Date(a.fechaRegistro || a.fecha).getTime()
    );
    const last = sorted[0];
    const days = getDaysElapsed(last.fechaRegistro || last.fecha);
    return {
      texto: `${last.titulo}${last.observaciones ? ` - ${last.observaciones}` : ''}`,
      fecha: last.fecha,
      hora: last.hora,
      usuario: last.responsable || last.registradoPor || 'Sistema',
      dias: days,
      hasMovement: true,
    };
  }

  if (p.observaciones && p.observaciones.trim()) {
    const days = getDaysElapsed(p.fechaModificacion || p.fechaCreacion || p.fechaRecepcion || p.fechaSolicitud);
    return {
      texto: p.observaciones,
      fecha: p.fechaModificacion?.slice(0, 10) || p.fechaCreacion?.slice(0, 10) || p.fechaRecepcion || 'Reciente',
      usuario: p.modificadoPor || p.creadoPor || 'Sistema',
      dias: days,
      hasMovement: true,
    };
  }

  const days = getDaysElapsed(p.fechaModificacion || p.fechaCreacion || p.fechaRecepcion || p.fechaSolicitud);
  return {
    texto: 'Expediente registrado en el sistema (sin observaciones adicionales)',
    fecha: p.fechaRecepcion || p.fechaSolicitud || p.fechaCreacion?.slice(0, 10) || 'N/A',
    usuario: p.creadoPor || 'Compras',
    dias: days,
    hasMovement: false,
  };
}

export const ReportsView: React.FC = () => {
  const { purchases, logAudit, currentUser, showToast } = useApp();

  // Reporte activo
  const [selectedReportType, setSelectedReportType] = useState<ReportCategory>('hoja_ruta');

  // Filtros transversales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedDependency, setSelectedDependency] = useState<string>('todas');

  // Años disponibles a partir de las fechas de los eventos
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    purchases.forEach((p) => {
      const date = p.fechaRecepcion || p.fechaSolicitud || p.fechaPublicacion || p.fechaCreacion;
      if (date && date.length >= 4) {
        yearsSet.add(date.substring(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [purchases]);

  // Dependencias disponibles
  const availableDependencies = useMemo(() => {
    const depSet = new Set<string>();
    purchases.forEach((p) => {
      const dep = p.dependenciaSolicitante || p.areaSolicitante;
      if (dep && dep.trim()) depSet.add(dep.trim());
    });
    return Array.from(depSet).sort();
  }, [purchases]);

  // Estatus disponibles
  const availableStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    purchases.forEach((p) => {
      if (p.estatusEvento) statusSet.add(p.estatusEvento);
    });
    return Array.from(statusSet).sort();
  }, [purchases]);

  // Base filtrada según criterios transversales
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      // Filtro Año
      if (selectedYear !== 'todos') {
        const date = p.fechaRecepcion || p.fechaSolicitud || p.fechaPublicacion || p.fechaCreacion;
        if (!date || !date.startsWith(selectedYear)) return false;
      }
      // Filtro Estatus
      if (selectedStatus !== 'todos' && p.estatusEvento !== selectedStatus) {
        return false;
      }
      // Filtro Dependencia
      if (selectedDependency !== 'todas') {
        const dep = p.dependenciaSolicitante || p.areaSolicitante || '';
        if (dep !== selectedDependency) return false;
      }
      // Búsqueda
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNog = p.nog?.toLowerCase().includes(query);
        const matchF56e = p.f56e?.toLowerCase().includes(query);
        const matchF56 = p.f56?.toLowerCase().includes(query);
        const matchDesc = p.descripcion?.toLowerCase().includes(query);
        const matchProv = p.proveedorAdjudicado?.toLowerCase().includes(query);
        const matchDep = p.dependenciaSolicitante?.toLowerCase().includes(query) || p.areaSolicitante?.toLowerCase().includes(query);
        if (!matchNog && !matchF56e && !matchF56 && !matchDesc && !matchProv && !matchDep) {
          return false;
        }
      }
      return true;
    });
  }, [purchases, selectedYear, selectedStatus, selectedDependency, searchTerm]);

  // Cálculos globales
  const totalPresupuesto = useMemo(() => filteredPurchases.reduce((acc, p) => acc + (p.monto || 0), 0), [filteredPurchases]);
  const adjudicados = useMemo(() => filteredPurchases.filter(p => p.estatusEvento === 'Adjudicación'), [filteredPurchases]);
  const montoAdjudicado = useMemo(() => adjudicados.reduce((acc, p) => acc + (p.monto || 0), 0), [adjudicados]);
  const evaluadosGIT = useMemo(() => filteredPurchases.filter(p => p.evaluadoGIT === 'Sí'), [filteredPurchases]);

  // 1. Datos para Reporte: Hoja de Ruta & Trazabilidad
  const hojaRutaData = useMemo(() => {
    return filteredPurchases.map((p) => {
      const mov = getLastMovementInfo(p);
      let estadoActividad: 'activo' | 'normal' | 'atencion' | 'critico' = 'normal';
      if (mov.dias <= 7) estadoActividad = 'activo';
      else if (mov.dias <= 15) estadoActividad = 'normal';
      else if (mov.dias <= 30) estadoActividad = 'atencion';
      else estadoActividad = 'critico';

      return {
        purchase: p,
        movimiento: mov,
        estadoActividad,
      };
    });
  }, [filteredPurchases]);

  const hojaRutaKPIs = useMemo(() => {
    const total = hojaRutaData.length;
    const activos = hojaRutaData.filter(h => h.estadoActividad === 'activo').length;
    const atencion = hojaRutaData.filter(h => h.estadoActividad === 'atencion').length;
    const criticos = hojaRutaData.filter(h => h.estadoActividad === 'critico').length;
    return { total, activos, atencion, criticos };
  }, [hojaRutaData]);

  // 2. Datos para Reporte: Pipeline & Cuellos de Botella por Etapas
  const etapasData = useMemo(() => {
    const groups: Record<string, { count: number; monto: number; items: PurchaseRecord[] }> = {};
    filteredPurchases.forEach((p) => {
      const est = p.estatusEvento || 'En Trámite';
      if (!groups[est]) groups[est] = { count: 0, monto: 0, items: [] };
      groups[est].count += 1;
      groups[est].monto += (p.monto || 0);
      groups[est].items.push(p);
    });

    return Object.entries(groups).map(([estatus, data]) => ({
      estatus,
      count: data.count,
      monto: data.monto,
      porcentajeMonto: totalPresupuesto > 0 ? (data.monto / totalPresupuesto) * 100 : 0,
      porcentajeEventos: filteredPurchases.length > 0 ? (data.count / filteredPurchases.length) * 100 : 0,
      items: data.items,
    })).sort((a, b) => b.monto - a.monto);
  }, [filteredPurchases, totalPresupuesto]);

  // 3. Datos para Reporte: Modalidades LCE
  const modalidadesData = useMemo(() => {
    const groups: Record<string, { count: number; monto: number; items: PurchaseRecord[]; baseLegal: string }> = {
      'Baja Cuantía': { count: 0, monto: 0, items: [], baseLegal: 'Art. 43 inc. a) LCE (Hasta Q25,000)' },
      'Compra Directa': { count: 0, monto: 0, items: [], baseLegal: 'Art. 43 inc. b) LCE (Q25,000.01 - Q90,000)' },
      'Cotización': { count: 0, monto: 0, items: [], baseLegal: 'Art. 38 LCE (Q90,000.01 - Q900,000)' },
      'Licitación': { count: 0, monto: 0, items: [], baseLegal: 'Art. 17 LCE (Más de Q900,000)' },
    };

    filteredPurchases.forEach((p) => {
      const mod = getModalidadCompraByMonto(p.monto).nombre;
      if (groups[mod]) {
        groups[mod].count += 1;
        groups[mod].monto += (p.monto || 0);
        groups[mod].items.push(p);
      }
    });

    return Object.entries(groups).map(([modalidad, data]) => ({
      modalidad,
      count: data.count,
      monto: data.monto,
      promedio: data.count > 0 ? data.monto / data.count : 0,
      porcentajeMonto: totalPresupuesto > 0 ? (data.monto / totalPresupuesto) * 100 : 0,
      baseLegal: data.baseLegal,
    }));
  }, [filteredPurchases, totalPresupuesto]);

  // 4. Datos para Reporte: Dependencias y Unidades Solicitantes
  const dependenciasData = useMemo(() => {
    const groups: Record<string, { total: number; adjudicados: number; montoTotal: number; montoAdjudicado: number }> = {};
    filteredPurchases.forEach((p) => {
      const dep = p.dependenciaSolicitante || p.areaSolicitante || 'Gerencia de Informática';
      if (!groups[dep]) {
        groups[dep] = { total: 0, adjudicados: 0, montoTotal: 0, montoAdjudicado: 0 };
      }
      groups[dep].total += 1;
      groups[dep].montoTotal += (p.monto || 0);
      if (p.estatusEvento === 'Adjudicación') {
        groups[dep].adjudicados += 1;
        groups[dep].montoAdjudicado += (p.monto || 0);
      }
    });

    return Object.entries(groups).map(([dependencia, data]) => ({
      dependencia,
      totalEventos: data.total,
      adjudicados: data.adjudicados,
      enProceso: data.total - data.adjudicados,
      montoTotal: data.montoTotal,
      montoAdjudicado: data.montoAdjudicado,
      efectividad: data.total > 0 ? (data.adjudicados / data.total) * 100 : 0,
      porcentajeMonto: totalPresupuesto > 0 ? (data.montoTotal / totalPresupuesto) * 100 : 0,
    })).sort((a, b) => b.montoTotal - a.montoTotal);
  }, [filteredPurchases, totalPresupuesto]);

  // 5. Datos para Reporte: Proveedores Adjudicados
  const proveedoresData = useMemo(() => {
    const groups: Record<string, { count: number; monto: number; nogs: string[]; f56s: string[] }> = {};
    filteredPurchases.forEach((p) => {
      if (p.proveedorAdjudicado && p.proveedorAdjudicado.trim() && p.proveedorAdjudicado !== 'N/A' && p.proveedorAdjudicado !== 'Sin registrar') {
        const prov = p.proveedorAdjudicado.trim();
        if (!groups[prov]) groups[prov] = { count: 0, monto: 0, nogs: [], f56s: [] };
        groups[prov].count += 1;
        groups[prov].monto += (p.monto || 0);
        if (p.nog) groups[prov].nogs.push(p.nog);
        if (p.f56e) groups[prov].f56s.push(p.f56e);
      }
    });

    const totalMontoAdjudicadoConProveedor = Object.values(groups).reduce((acc, g) => acc + g.monto, 0);

    return Object.entries(groups).map(([proveedor, data]) => ({
      proveedor,
      eventos: data.count,
      monto: data.monto,
      porcentajeConcentracion: totalMontoAdjudicadoConProveedor > 0 ? (data.monto / totalMontoAdjudicadoConProveedor) * 100 : 0,
      nogs: data.nogs,
    })).sort((a, b) => b.monto - a.monto);
  }, [filteredPurchases]);

  // 6. Datos para Reporte: Ficha de Alertas y Semáforos Preventivos
  interface AlertaItem {
    id: string;
    purchase: PurchaseRecord;
    tipo: string;
    nivel: 'alto' | 'medio' | 'preventivo' | 'info';
    causa: string;
    accion: string;
  }

  const alertasData = useMemo<AlertaItem[]>(() => {
    const alerts: AlertaItem[] = [];

    filteredPurchases.forEach((p) => {
      const daysSinceMovement = getLastMovementInfo(p).dias;

      // 1. Falta de NOG en proceso
      if ((!p.nog || !p.nog.trim() || p.nog === '0') && !['Prescindido', 'Desierto'].includes(p.estatusEvento)) {
        alerts.push({
          id: `${p.id}-sin-nog`,
          purchase: p,
          tipo: 'Falta NOG Guatecompras',
          nivel: 'alto',
          causa: 'Expediente en gestión sin número NOG registrado para control en el portal oficial.',
          accion: 'Publicar o asociar el Número de Operación Guatecompras correspondiente.',
        });
      }

      // 2. Ofertas insuficientes en fase de evaluación / recepción
      if ((p.cantidadOfertas !== undefined && p.cantidadOfertas <= 1) && ['Evaluación', 'Recepción de Ofertas'].includes(p.estatusEvento)) {
        alerts.push({
          id: `${p.id}-ofertas`,
          purchase: p,
          tipo: 'Baja Concurrencia de Ofertas',
          nivel: 'medio',
          causa: `El evento registra ${p.cantidadOfertas || 0} oferta(s). Riesgo de ser declarado desierto.`,
          accion: 'Verificar bases técnicas y promover participación de proveedores en Guatecompras.',
        });
      }

      // 3. Expediente sin movimiento por más de 20 días
      if (daysSinceMovement >= 20 && !['Adjudicación', 'Concluido', 'Finalizado', 'Prescindido', 'Desierto'].includes(p.estatusEvento)) {
        alerts.push({
          id: `${p.id}-inactivo`,
          purchase: p,
          tipo: 'Inactividad Prolongada (>20 días)',
          nivel: 'medio',
          causa: `Lleva ${daysSinceMovement} días sin registro de nuevas observaciones o avances en hoja de ruta.`,
          accion: 'Revisar con la unidad responsable para destrabar el expediente y actualizar bitácora.',
        });
      }

      // 4. Expediente sin soporte físico F56
      if (!p.f56 && !p.f56Documento) {
        alerts.push({
          id: `${p.id}-sin-f56`,
          purchase: p,
          tipo: 'Falta F56 Físico / Digital',
          nivel: 'preventivo',
          causa: 'No se encuentra registrado el número ni adjunto digital del formulario F56 físico.',
          accion: 'Solicitar o digitalizar la boleta F56 firmada para el legajo de auditoría.',
        });
      }

      // 5. Eventos no concluidos exitosamente
      if (['Desierto', 'Prescindido'].includes(p.estatusEvento)) {
        alerts.push({
          id: `${p.id}-no-exito`,
          purchase: p,
          tipo: `Evento ${p.estatusEvento}`,
          nivel: 'info',
          causa: `El evento concluyó con estatus "${p.estatusEvento}".`,
          accion: 'Evaluar reprogramación del requerimiento o nuevo proceso en Guatecompras.',
        });
      }
    });

    return alerts.sort((a, b) => {
      const priority = { alto: 1, medio: 2, preventivo: 3, info: 4 };
      return priority[a.nivel] - priority[b.nivel];
    });
  }, [filteredPurchases]);

  // Handler de Impresión Nativa
  const handlePrint = () => {
    window.print();
  };

  // Handler de Exportación CSV a la medida de cada reporte
  const handleExportCustomCSV = () => {
    const today = new Date().toISOString().slice(0, 10);

    if (selectedReportType === 'hoja_ruta') {
      const rows = hojaRutaData.map((h, i) => ({
        'No.': i + 1,
        'NOG': h.purchase.nog || '-',
        'F56-e': h.purchase.f56e,
        'F56 Físico': h.purchase.f56 || '-',
        'Descripción': h.purchase.descripcion,
        'Dependencia': h.purchase.dependenciaSolicitante || h.purchase.areaSolicitante || 'N/A',
        'Estatus Actual': h.purchase.estatusEvento,
        'Monto (GTQ)': h.purchase.monto,
        'Semáforo': h.estadoActividad.toUpperCase(),
        'Último Movimiento': h.movimiento.texto,
        'Fecha Último Movimiento': h.movimiento.fecha,
        'Usuario Responsable': h.movimiento.usuario,
        'Días sin Movimiento': h.movimiento.dias,
      }));
      exportToCSV(`Reporte_Control_Hoja_Ruta_OJ_${today}`, rows);
    } else if (selectedReportType === 'etapas_pipeline') {
      const rows = etapasData.map((e, i) => ({
        'No.': i + 1,
        'Etapa / Estatus': e.estatus,
        'Cantidad Eventos': e.count,
        'Monto Acumulado (GTQ)': e.monto,
        '% del Presupuesto': e.porcentajeMonto.toFixed(2) + '%',
        '% de Eventos': e.porcentajeEventos.toFixed(2) + '%',
      }));
      exportToCSV(`Reporte_Control_Etapas_Pipeline_OJ_${today}`, rows);
    } else if (selectedReportType === 'modalidades_lce') {
      const rows = modalidadesData.map((m, i) => ({
        'No.': i + 1,
        'Modalidad LCE': m.modalidad,
        'Base Legal': m.baseLegal,
        'Cantidad Compras': m.count,
        'Monto Total (GTQ)': m.monto,
        'Monto Promedio (GTQ)': m.promedio,
        '% de Participación': m.porcentajeMonto.toFixed(2) + '%',
      }));
      exportToCSV(`Reporte_Control_Modalidades_LCE_OJ_${today}`, rows);
    } else if (selectedReportType === 'dependencias') {
      const rows = dependenciasData.map((d, i) => ({
        'No.': i + 1,
        'Dependencia / Juzgado': d.dependencia,
        'Total Solicitudes': d.totalEventos,
        'Eventos Adjudicados': d.adjudicados,
        'Eventos en Trámite': d.enProceso,
        'Monto Solicitado (GTQ)': d.montoTotal,
        'Monto Adjudicado (GTQ)': d.montoAdjudicado,
        'Tasa de Adjudicación': d.efectividad.toFixed(1) + '%',
        '% Presupuesto Global': d.porcentajeMonto.toFixed(2) + '%',
      }));
      exportToCSV(`Reporte_Control_Dependencias_OJ_${today}`, rows);
    } else if (selectedReportType === 'proveedores') {
      const rows = proveedoresData.map((p, i) => ({
        'No.': i + 1,
        'Proveedor Adjudicado': p.proveedor,
        'Eventos Ganados': p.eventos,
        'Monto Total Adjudicado (GTQ)': p.monto,
        '% de Concentración': p.porcentajeConcentracion.toFixed(2) + '%',
        'NOGs Adjudicados': p.nogs.join(', '),
      }));
      exportToCSV(`Reporte_Control_Proveedores_Adjudicados_OJ_${today}`, rows);
    } else if (selectedReportType === 'alertas_riesgo') {
      const rows = alertasData.map((a, i) => ({
        'No.': i + 1,
        'NOG': a.purchase.nog || '-',
        'F56-e': a.purchase.f56e,
        'Tipo de Alerta': a.tipo,
        'Nivel de Riesgo': a.nivel.toUpperCase(),
        'Descripción Requerimiento': a.purchase.descripcion,
        'Estatus': a.purchase.estatusEvento,
        'Monto (GTQ)': a.purchase.monto,
        'Causa de la Alerta': a.causa,
        'Acción Recomendada': a.accion,
      }));
      exportToCSV(`Reporte_Auditoria_Alertas_Preventivas_OJ_${today}`, rows);
    } else {
      // Consolidado
      const rows = filteredPurchases.map((p, i) => ({
        'No.': i + 1,
        'NOG': p.nog,
        'F56-e': p.f56e,
        'F56 Físico': p.f56 || '-',
        'Área / Dependencia': p.dependenciaSolicitante || p.areaSolicitante || 'Soporte técnico',
        'Descripción': p.descripcion,
        'Fecha Recepción': p.fechaRecepcion || p.fechaSolicitud || '-',
        'Fecha Publicación': p.fechaPublicacion || '-',
        'Fecha Ofertas': p.fechaOfertas || '-',
        'Cantidad Ofertas': p.cantidadOfertas || 0,
        'Monto (GTQ)': p.monto,
        'Modalidad LCE': getModalidadCompraByMonto(p.monto).nombre,
        'Dictamen Técnico GIT': p.evaluadoGIT || 'No',
        'Estatus Evento': p.estatusEvento,
        'Proveedor Adjudicado': p.proveedorAdjudicado || 'N/A',
      }));
      exportToCSV(`Reporte_Consolidado_Adquisiciones_OJ_${today}`, rows);
    }

    logAudit('EXPORTAR_DATOS', 'Reportes', `Exportación de reporte "${selectedReportType}" en formato CSV.`);
    showToast({
      type: 'success',
      title: 'Reporte CSV Generado',
      message: 'El archivo de control ha sido descargado exitosamente.',
      duration: 5000,
    });
  };

  // Handler de Exportación PDF con AutoTable a la medida del reporte
  const handleExportCustomPDF = () => {
    try {
      let title = 'INFORME DE CONTROL DE ADQUISICIONES';
      let subtitle = 'Fiscalización y auditoría institucional de contrataciones';
      let customHeaders: string[] | undefined;
      let customRows: (string | number)[][] | undefined;
      let customFooter: (string | number)[] | undefined;
      let customColumnStyles: Record<number, any> | undefined;

      if (selectedReportType === 'hoja_ruta') {
        title = 'CONTROL DE HOJA DE RUTA Y TRAZABILIDAD DE EXPEDIENTES';
        subtitle = 'Auditoría del último movimiento registrado, usuario responsable y semáforo de actividad';
        customHeaders = ['#', 'NOG', 'F56-e', 'Descripción', 'Estatus', 'Último Movimiento', 'Fecha Últ. Mov.', 'Días', 'Semáforo'];
        customRows = hojaRutaData.map((h, i) => [
          (i + 1).toString(),
          h.purchase.nog || '-',
          h.purchase.f56e,
          h.purchase.descripcion,
          h.purchase.estatusEvento,
          `${h.movimiento.texto}\n(Por: ${h.movimiento.usuario})`,
          h.movimiento.fecha,
          `${h.movimiento.dias}d`,
          h.estadoActividad.toUpperCase(),
        ]);
        customFooter = ['', '', '', `TOTAL: ${hojaRutaData.length} EXPEDIENTES EN SEGUIMIENTO`, '', '', '', '', ''];
        customColumnStyles = {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 60, halign: 'left' },
          4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 80, halign: 'left' },
          6: { cellWidth: 22, halign: 'center' },
          7: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          8: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        };
      } else if (selectedReportType === 'etapas_pipeline') {
        title = 'CONTROL POR ETAPAS Y CUELLOS DE BOTELLA (PIPELINE DE COMPRAS)';
        subtitle = 'Distribución del presupuesto y conteo de expedientes por fase operativa de contratación';
        customHeaders = ['#', 'Etapa / Estatus del Evento', 'Cantidad de Eventos', 'Monto Comprometido (GTQ)', '% del Presupuesto', 'Estado Operativo'];
        customRows = etapasData.map((e, i) => [
          (i + 1).toString(),
          e.estatus,
          `${e.count} eventos`,
          formatQuetzales(e.monto),
          `${e.porcentajeMonto.toFixed(1)}%`,
          e.estatus === 'Adjudicación' ? 'Concluido Exitoso' : e.estatus === 'Desierto' ? 'Sin Ofertas / Desierto' : 'En Flujo Activo',
        ]);
        customFooter = ['', 'TOTAL GLOBAL', `${filteredPurchases.length} eventos`, formatQuetzales(totalPresupuesto), '100%', ''];
        customColumnStyles = {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 60, halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 40, halign: 'center' },
          3: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 35, halign: 'center' },
          5: { cellWidth: 75, halign: 'left' },
        };
      } else if (selectedReportType === 'modalidades_lce') {
        title = 'CONTROL LEGAL POR MODALIDAD (LEY DE CONTRATACIONES DEL ESTADO)';
        subtitle = 'Auditoría de cumplimiento de rangos monetarios y topes legales según Decreto 57-92';
        customHeaders = ['#', 'Modalidad LCE', 'Fundamento Legal', 'Cantidad Compras', 'Monto Acumulado (GTQ)', 'Promedio por Compra', '% Participación'];
        customRows = modalidadesData.map((m, i) => [
          (i + 1).toString(),
          m.modalidad,
          m.baseLegal,
          `${m.count} compras`,
          formatQuetzales(m.monto),
          formatQuetzales(m.promedio),
          `${m.porcentajeMonto.toFixed(1)}%`,
        ]);
        customFooter = ['', 'TOTAL EJECUTADO', '', `${filteredPurchases.length} compras`, formatQuetzales(totalPresupuesto), '', '100%'];
        customColumnStyles = {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 40, halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 70, halign: 'left' },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 40, halign: 'right' },
          6: { cellWidth: 30, halign: 'center' },
        };
      } else if (selectedReportType === 'dependencias') {
        title = 'CONTROL POR DEPENDENCIAS Y UNIDADES SOLICITANTES';
        subtitle = 'Análisis de demanda institucional por juzgados, tribunales y direcciones solicitantes';
        customHeaders = ['#', 'Dependencia / Unidad Solicitante', 'Eventos Solicitados', 'Adjudicados', 'En Trámite', 'Monto Total (GTQ)', 'Monto Adjudicado (GTQ)', 'Efectividad'];
        customRows = dependenciasData.map((d, i) => [
          (i + 1).toString(),
          d.dependencia,
          d.totalEventos.toString(),
          d.adjudicados.toString(),
          d.enProceso.toString(),
          formatQuetzales(d.montoTotal),
          formatQuetzales(d.montoAdjudicado),
          `${d.efectividad.toFixed(1)}%`,
        ]);
        customFooter = ['', 'TOTAL INSTITUCIONAL', `${filteredPurchases.length}`, `${adjudicados.length}`, `${filteredPurchases.length - adjudicados.length}`, formatQuetzales(totalPresupuesto), formatQuetzales(montoAdjudicado), ''];
        customColumnStyles = {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 75, halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 24, halign: 'center' },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 25, halign: 'center' },
        };
      } else if (selectedReportType === 'proveedores') {
        title = 'CONTROL DE PROVEEDORES ADJUDICADOS Y CONCENTRACIÓN';
        subtitle = 'Fiscalización de adjudicaciones, montos contratados y prevención de concentración de mercado';
        customHeaders = ['#', 'Proveedor Adjudicado', 'Adjudicaciones Ganadas', 'Monto Total Adjudicado (GTQ)', '% Concentración', 'NOGs Adjudicados'];
        customRows = proveedoresData.map((p, i) => [
          (i + 1).toString(),
          p.proveedor,
          `${p.eventos} eventos`,
          formatQuetzales(p.monto),
          `${p.porcentajeConcentracion.toFixed(1)}%`,
          p.nogs.join(', ') || 'N/A',
        ]);
        customFooter = ['', 'TOTAL ADJUDICADO A PROVEEDORES', `${adjudicados.length} adjudicaciones`, formatQuetzales(montoAdjudicado), '100%', ''];
        customColumnStyles = {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 75, halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 40, halign: 'center' },
          3: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 35, halign: 'center' },
          5: { cellWidth: 60, halign: 'left' },
        };
      } else if (selectedReportType === 'alertas_riesgo') {
        title = 'INFORME DE ALERTAS Y SEMÁFOROS PREVENTIVOS DE AUDITORÍA';
        subtitle = 'Detección proactiva de riesgos de contratación, omisiones documentales e inactividad';
        customHeaders = ['#', 'NOG', 'F56-e', 'Alerta Preventiva', 'Riesgo', 'Descripción Requerimiento', 'Causa', 'Acción Recomendada'];
        customRows = alertasData.map((a, i) => [
          (i + 1).toString(),
          a.purchase.nog || '-',
          a.purchase.f56e,
          a.tipo,
          a.nivel.toUpperCase(),
          a.purchase.descripcion,
          a.causa,
          a.accion,
        ]);
        customFooter = ['', `TOTAL: ${alertasData.length} ALERTAS PREVENTIVAS DETECTADAS`, '', '', '', '', '', ''];
        customColumnStyles = {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 40, halign: 'left', fontStyle: 'bold' },
          4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 50, halign: 'left' },
          6: { cellWidth: 55, halign: 'left' },
          7: { cellWidth: 53, halign: 'left' },
        };
      }

      const filename = generatePurchasesPDF({
        purchases: filteredPurchases,
        title,
        subtitle,
        filterInfo: {
          status: selectedStatus !== 'todos' ? selectedStatus : undefined,
          area: selectedDependency !== 'todas' ? selectedDependency : undefined,
          search: searchTerm.trim() ? searchTerm.trim() : undefined,
        },
        currentUser,
        filenamePrefix: `Informe_Control_${selectedReportType}_OJ`,
        customHeaders,
        customRows,
        customFooter,
        customColumnStyles,
      });

      logAudit('EXPORTAR_DATOS', 'Reportes', `Generación de PDF oficial "${title}" (${filename}).`);
      showToast({
        type: 'success',
        title: 'Reporte PDF Oficial Exportado',
        message: `Se descargó el documento: ${filename}`,
        duration: 5000,
      });
    } catch (err) {
      console.error('Error generando PDF de reporte:', err);
      showToast({
        type: 'error',
        title: 'Error al Generar Reporte PDF',
        message: 'Ocurrió un inconveniente al construir el documento PDF.',
        duration: 5000,
      });
    }
  };

  // Configuración de tarjetas de reporte
  const reportCards: Array<{
    id: ReportCategory;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge: string;
    color: string;
  }> = [
    {
      id: 'hoja_ruta',
      title: 'Control de Hoja de Ruta y Trazabilidad',
      description: 'Último movimiento con semáforo verde, usuario y días sin avance',
      icon: <GitBranch className="w-5 h-5 text-emerald-600" />,
      badge: `${hojaRutaKPIs.total} en seguimiento`,
      color: 'border-emerald-300 text-emerald-950',
    },
    {
      id: 'etapas_pipeline',
      title: 'Control por Etapas y Cuellos de Botella',
      description: 'Pipeline del ciclo de compra y capital retenido por fase',
      icon: <Layers className="w-5 h-5 text-blue-600" />,
      badge: `${etapasData.length} etapas`,
      color: 'border-blue-300 text-blue-950',
    },
    {
      id: 'modalidades_lce',
      title: 'Control Legal por Modalidad LCE',
      description: 'Topes y rangos según Decreto 57-92 (Baja Cuantía, Directa, Cotización, Licitación)',
      icon: <CheckCircle2 className="w-5 h-5 text-amber-600" />,
      badge: '4 modalidades',
      color: 'border-amber-300 text-amber-950',
    },
    {
      id: 'dependencias',
      title: 'Control por Dependencia Solicitante',
      description: 'Demanda de compras por juzgados, tribunales y direcciones',
      icon: <Building2 className="w-5 h-5 text-purple-600" />,
      badge: `${dependenciasData.length} dependencias`,
      color: 'border-purple-300 text-purple-950',
    },
    {
      id: 'proveedores',
      title: 'Control de Proveedores Adjudicados',
      description: 'Concentración de contratos, montos ganados y transparencia',
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      badge: `${proveedoresData.length} proveedores`,
      color: 'border-indigo-300 text-indigo-950',
    },
    {
      id: 'alertas_riesgo',
      title: 'Ficha de Alertas y Semáforos Críticos',
      description: 'Sin NOG, bajas ofertas, expedientes estancados y sin F56',
      icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
      badge: `${alertasData.length} alertas activas`,
      color: 'border-rose-300 text-rose-950',
    },
    {
      id: 'consolidado',
      title: 'Consolidado General Institucional',
      description: 'Listado maestro con todos los eventos y metadatos oficiales',
      icon: <FileText className="w-5 h-5 text-slate-700" />,
      badge: `${filteredPurchases.length} eventos`,
      color: 'border-slate-300 text-slate-900',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Encabezado del Módulo de Reportes de Control */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              Centro de Control y Reportes de Adquisiciones
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Informes oficiales para fiscalización, auditoría preventiva, control de hoja de ruta y análisis presupuestario del Organismo Judicial.
          </p>
        </div>

        {/* Acciones de Descarga e Impresión */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-report-pdf"
            type="button"
            onClick={handleExportCustomPDF}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-900 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Exportar informe a formato PDF oficial con cabecera y código de auditoría"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Exportar PDF Oficial</span>
          </button>

          <button
            id="btn-export-full-report-csv"
            type="button"
            onClick={handleExportCustomCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Descargar matriz en formato CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Descargar CSV</span>
          </button>

          <button
            id="btn-print-report"
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Imprimir reporte en papel o guardar como PDF del navegador"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 2. Selector de Tipos de Reporte Especializados */}
      <div className="print:hidden space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Seleccione el Reporte de Control Deseado:
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            {reportCards.length} plantillas analíticas disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {reportCards.map((rc) => {
            const isSelected = selectedReportType === rc.id;
            return (
              <button
                key={rc.id}
                id={`report-tab-${rc.id}`}
                type="button"
                onClick={() => setSelectedReportType(rc.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                      {rc.icon}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSelected 
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {rc.badge}
                    </span>
                  </div>
                  <h3 className={`text-xs font-bold leading-snug ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {rc.title}
                  </h3>
                  <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {rc.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Barra de Filtros Transversales para el Reporte Activo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs print:hidden space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="report-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por NOG, F56-e, descripción, proveedor o dependencia..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-slate-50/50"
            />
          </div>

          {/* Filtros Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Año */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">Año:</span>
              <select
                id="report-filter-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 cursor-pointer"
              >
                <option value="todos">Todos los Años</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Estatus */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">Estatus:</span>
              <select
                id="report-filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 cursor-pointer"
              >
                <option value="todos">Todos los Estatus</option>
                {availableStatuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Dependencia */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">Dependencia:</span>
              <select
                id="report-filter-dependency"
                value={selectedDependency}
                onChange={(e) => setSelectedDependency(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 max-w-[180px] truncate cursor-pointer"
              >
                <option value="todas">Todas las Dependencias</option>
                {availableDependencies.map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            {/* Botón limpiar */}
            {(searchTerm || selectedYear !== 'todos' || selectedStatus !== 'todos' || selectedDependency !== 'todas') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedYear('todos');
                  setSelectedStatus('todos');
                  setSelectedDependency('todas');
                }}
                className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition-colors cursor-pointer"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. DOCUMENTO DE REPORTE OFICIAL IMPRIMIBLE / VISUALIZABLE */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-xs border border-slate-200 text-slate-900">
        
        {/* Cabecera Oficial del Documento */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-amber-400 font-black text-base shadow-xs shrink-0">
              OJ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  Documento Oficial de Control Interno
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Decreto 57-92 LCE
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 mt-0.5">
                Organismo Judicial de Guatemala
              </h1>
              <p className="text-xs font-semibold text-slate-600">
                Departamento de Compras • Gerencia de Informática • Auditoría Preventiva
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-200">
            <p><strong>Fecha de Emisión:</strong> {formatDate(new Date().toISOString().slice(0, 10))}</p>
            <p><strong>Emisor:</strong> {currentUser?.nombreCompleto || currentUser?.username || 'Usuario Autorizado'} ({currentUser?.rol || 'Auditoría'})</p>
            <p className="text-[10px] font-mono text-slate-400">AUD-REP-{new Date().getFullYear()}-{selectedReportType.toUpperCase()}</p>
          </div>
        </div>

        {/* Título del Reporte Activo */}
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <span>{reportCards.find(r => r.id === selectedReportType)?.title}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {reportCards.find(r => r.id === selectedReportType)?.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs font-mono">
              {filteredPurchases.length} compras evaluadas
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* REPORTE 1: HOJA DE RUTA Y TRAZABILIDAD (ÚLTIMO MOVIMIENTO) */}
        {/* ============================================================ */}
        {selectedReportType === 'hoja_ruta' && (
          <div className="space-y-6">
            {/* KPIs del Reporte */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-medium">Expedientes en Seguimiento:</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">{hojaRutaKPIs.total}</span>
                <span className="text-[10px] text-slate-400">100% de la muestra filtrada</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-900 font-bold">Activos (≤ 7 días):</span>
                </div>
                <span className="text-lg font-black text-emerald-800 mt-0.5 block">{hojaRutaKPIs.activos}</span>
                <span className="text-[10px] text-emerald-700">Movimiento muy reciente</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-900 font-bold">Atención (16-30 días):</span>
                </div>
                <span className="text-lg font-black text-amber-800 mt-0.5 block">{hojaRutaKPIs.atencion}</span>
                <span className="text-[10px] text-amber-700">Requiere impulso de compras</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-900 font-bold">Críticos ({'>'} 30 días):</span>
                </div>
                <span className="text-lg font-black text-rose-800 mt-0.5 block">{hojaRutaKPIs.criticos}</span>
                <span className="text-[10px] text-rose-700">Expedientes estancados</span>
              </div>
            </div>

            {/* Leyenda del Semáforo */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-[11px]">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-bold text-slate-700">Semáforos de Auditoría:</span>
                <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  Verde = Último movimiento registrado (≤7 días)
                </span>
                <span className="flex items-center gap-1.5 text-blue-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Azul = Trámite normal (8-15 días)
                </span>
                <span className="flex items-center gap-1.5 text-amber-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Ámbar = Alerta (16-30 días)
                </span>
                <span className="flex items-center gap-1.5 text-rose-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Rojo = Crítico ({'>'}30 días)
                </span>
              </div>
            </div>

            {/* Tabla Detallada de Hoja de Ruta */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">NOG / F56-e</th>
                    <th className="p-3">Descripción del Requerimiento</th>
                    <th className="p-3 text-center">Estatus</th>
                    <th className="p-3">Último Movimiento Registrado</th>
                    <th className="p-3 text-center">Fecha Últ. Mov.</th>
                    <th className="p-3 text-center">Inactividad</th>
                    <th className="p-3 text-center">Semáforo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hojaRutaData.map((h, idx) => (
                    <tr key={h.purchase.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">{h.purchase.nog || 'Sin NOG'}</span>
                        <span className="text-[11px] text-slate-500 font-semibold">{h.purchase.f56e}</span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <span className="font-medium text-slate-900 line-clamp-2">{h.purchase.descripcion}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {h.purchase.dependenciaSolicitante || h.purchase.areaSolicitante || 'Soporte técnico'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          h.purchase.estatusEvento === 'Adjudicación' 
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : h.purchase.estatusEvento === 'Evaluación'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                          {h.purchase.estatusEvento}
                        </span>
                      </td>
                      <td className="p-3 max-w-sm">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/70 text-[11px]">
                          <p className="font-semibold text-slate-900 leading-snug line-clamp-2">
                            {h.movimiento.texto}
                          </p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Responsable: <strong>{h.movimiento.usuario}</strong>
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] whitespace-nowrap">
                        <span className="font-bold text-slate-800">{formatDate(h.movimiento.fecha)}</span>
                        {h.movimiento.hora && (
                          <span className="text-[10px] text-slate-400 block">{h.movimiento.hora}</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[11px] ${
                          h.estadoActividad === 'activo'
                            ? 'text-emerald-800 bg-emerald-100'
                            : h.estadoActividad === 'normal'
                              ? 'text-blue-800 bg-blue-100'
                              : h.estadoActividad === 'atencion'
                                ? 'text-amber-800 bg-amber-100'
                                : 'text-rose-800 bg-rose-100'
                        }`}>
                          {h.movimiento.dias === 0 ? 'Hoy' : `${h.movimiento.dias} días`}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center">
                          {h.estadoActividad === 'activo' ? (
                            <span 
                              className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-200 shadow-xs flex items-center justify-center animate-pulse"
                              title="Semáforo Verde: Último Movimiento Activo"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                            </span>
                          ) : h.estadoActividad === 'normal' ? (
                            <span 
                              className="w-3.5 h-3.5 rounded-full bg-blue-500 ring-2 ring-blue-100"
                              title="En Trámite Normal"
                            />
                          ) : h.estadoActividad === 'atencion' ? (
                            <span 
                              className="w-3.5 h-3.5 rounded-full bg-amber-500 ring-2 ring-amber-100"
                              title="Atención: Inactividad Moderada"
                            />
                          ) : (
                            <span 
                              className="w-4 h-4 rounded-full bg-rose-500 ring-4 ring-rose-200 animate-pulse"
                              title="Crítico: Expediente Estancado"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORTE 2: ETAPAS Y CUELLOS DE BOTELLA (PIPELINE) */}
        {/* ============================================================ */}
        {selectedReportType === 'etapas_pipeline' && (
          <div className="space-y-6">
            {/* Resumen de Pipeline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-blue-800 font-bold block">Presupuesto Comprometido:</span>
                <span className="text-xl font-black text-blue-950 font-mono mt-1 block">
                  {formatQuetzales(totalPresupuesto)}
                </span>
                <span className="text-[11px] text-blue-700 mt-1 block">
                  Distribuido en {etapasData.length} etapas operativas
                </span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-800 font-bold block">Presupuesto Adjudicado:</span>
                <span className="text-xl font-black text-emerald-950 font-mono mt-1 block">
                  {formatQuetzales(montoAdjudicado)}
                </span>
                <span className="text-[11px] text-emerald-700 mt-1 block">
                  {totalPresupuesto > 0 ? ((montoAdjudicado / totalPresupuesto) * 100).toFixed(1) : 0}% de avance de ejecución
                </span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-amber-800 font-bold block">Mayor Concentración en Trámite:</span>
                <span className="text-base font-black text-amber-950 mt-1 block truncate">
                  {etapasData[0]?.estatus || 'N/A'}
                </span>
                <span className="text-[11px] text-amber-700 font-mono mt-0.5 block">
                  {formatQuetzales(etapasData[0]?.monto || 0)} ({etapasData[0]?.count || 0} eventos)
                </span>
              </div>
            </div>

            {/* Barras de Distribución Visual */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Distribución Porcentual del Presupuesto por Etapa
              </h3>
              <div className="space-y-2">
                {etapasData.map((e) => (
                  <div key={e.estatus} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-700" />
                        {e.estatus} ({e.count} {e.count === 1 ? 'evento' : 'eventos'})
                      </span>
                      <span className="text-slate-900 font-mono">
                        {formatQuetzales(e.monto)} ({e.porcentajeMonto.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          e.estatus === 'Adjudicación' ? 'bg-emerald-500' :
                          e.estatus === 'Evaluación' ? 'bg-amber-500' :
                          e.estatus === 'Desierto' ? 'bg-slate-400' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(2, e.porcentajeMonto))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla Detallada por Etapa */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">Etapa / Estatus del Evento</th>
                    <th className="p-3 text-center">Cant. Eventos</th>
                    <th className="p-3 text-right">Monto Comprometido (GTQ)</th>
                    <th className="p-3 text-center">% del Presupuesto</th>
                    <th className="p-3 text-center">% de Eventos</th>
                    <th className="p-3">Diagnóstico Operativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {etapasData.map((e, idx) => (
                    <tr key={e.estatus} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{e.estatus}</td>
                      <td className="p-3 text-center font-mono font-semibold">{e.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatQuetzales(e.monto)}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-700">{e.porcentajeMonto.toFixed(1)}%</td>
                      <td className="p-3 text-center font-mono text-slate-600">{e.porcentajeEventos.toFixed(1)}%</td>
                      <td className="p-3 text-xs text-slate-600">
                        {e.estatus === 'Adjudicación' 
                          ? 'Fase exitosa: Expedientes contratados con proveedor resuelto.'
                          : e.estatus === 'Evaluación'
                            ? 'Punto de control: Requiere dictamen de comisión receptora o GIT.'
                            : e.estatus === 'Desierto'
                              ? 'Alerta: Sin ofertas admisibles. Requiere nuevo evento en Guatecompras.'
                              : 'En flujo operativo: Trámite regular de compras.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORTE 3: MODALIDADES LCE (LEY DE CONTRATACIONES) */}
        {/* ============================================================ */}
        {selectedReportType === 'modalidades_lce' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {modalidadesData.map((m) => (
                <div key={m.modalidad} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-900 block text-sm">{m.modalidad}</span>
                  <span className="text-[10px] text-slate-500 block">{m.baseLegal}</span>
                  <div className="mt-2 pt-2 border-t border-slate-200/80">
                    <span className="text-base font-black font-mono text-slate-900 block">{formatQuetzales(m.monto)}</span>
                    <span className="text-[11px] text-slate-600 block">{m.count} compras ({m.porcentajeMonto.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla Comparativa de Modalidades */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">Modalidad LCE</th>
                    <th className="p-3">Fundamento Legal (Decreto 57-92)</th>
                    <th className="p-3 text-center">Cant. Compras</th>
                    <th className="p-3 text-right">Monto Total (GTQ)</th>
                    <th className="p-3 text-right">Monto Promedio</th>
                    <th className="p-3 text-center">% Participación</th>
                    <th className="p-3 text-center">Control de Límites</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {modalidadesData.map((m, idx) => (
                    <tr key={m.modalidad} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{m.modalidad}</td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">{m.baseLegal}</td>
                      <td className="p-3 text-center font-mono font-bold">{m.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatQuetzales(m.monto)}</td>
                      <td className="p-3 text-right font-mono text-slate-700">{formatQuetzales(m.promedio)}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-700">{m.porcentajeMonto.toFixed(1)}%</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Conforme a Ley
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORTE 4: DEPENDENCIAS Y UNIDADES SOLICITANTES */}
        {/* ============================================================ */}
        {selectedReportType === 'dependencias' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-purple-800 font-bold block">Total Dependencias con Solicitudes:</span>
                <span className="text-xl font-black text-purple-950 mt-1 block">
                  {dependenciasData.length} Unidades
                </span>
                <span className="text-[11px] text-purple-700 mt-0.5 block">
                  Distribución institucional de requerimientos
                </span>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-blue-800 font-bold block">Mayor Dependencia Solicitante:</span>
                <span className="text-base font-black text-blue-950 mt-1 block truncate">
                  {dependenciasData[0]?.dependencia || 'N/A'}
                </span>
                <span className="text-[11px] text-blue-700 font-mono mt-0.5 block">
                  {formatQuetzales(dependenciasData[0]?.montoTotal || 0)} ({dependenciasData[0]?.totalEventos || 0} eventos)
                </span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-800 font-bold block">Tasa Global de Adjudicación:</span>
                <span className="text-xl font-black text-emerald-950 mt-1 block font-mono">
                  {filteredPurchases.length > 0 ? ((adjudicados.length / filteredPurchases.length) * 100).toFixed(1) : 0}%
                </span>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">
                  {adjudicados.length} adjudicadas de {filteredPurchases.length} solicitadas
                </span>
              </div>
            </div>

            {/* Tabla de Dependencias */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">Dependencia / Juzgado / Unidad</th>
                    <th className="p-3 text-center">Eventos Solicitados</th>
                    <th className="p-3 text-center">Adjudicados</th>
                    <th className="p-3 text-center">En Trámite</th>
                    <th className="p-3 text-right">Monto Solicitado (GTQ)</th>
                    <th className="p-3 text-right">Monto Adjudicado (GTQ)</th>
                    <th className="p-3 text-center">Tasa Éxito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dependenciasData.map((d, idx) => (
                    <tr key={d.dependencia} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{d.dependencia}</td>
                      <td className="p-3 text-center font-mono font-semibold">{d.totalEventos}</td>
                      <td className="p-3 text-center font-mono font-semibold text-emerald-700">{d.adjudicados}</td>
                      <td className="p-3 text-center font-mono font-semibold text-amber-700">{d.enProceso}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatQuetzales(d.montoTotal)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatQuetzales(d.montoAdjudicado)}</td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          d.efectividad >= 70 ? 'bg-emerald-100 text-emerald-900' :
                          d.efectividad >= 30 ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {d.efectividad.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORTE 5: PROVEEDORES ADJUDICADOS Y CONCENTRACIÓN */}
        {/* ============================================================ */}
        {selectedReportType === 'proveedores' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="text-indigo-800 font-bold block">Empresas Adjudicadas:</span>
                <span className="text-xl font-black text-indigo-950 mt-1 block">
                  {proveedoresData.length} Proveedores Únicos
                </span>
                <span className="text-[11px] text-indigo-700 mt-0.5 block">
                  Total adjudicado: {formatQuetzales(montoAdjudicado)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-blue-800 font-bold block">Mayor Proveedor por Monto:</span>
                <span className="text-base font-black text-blue-950 mt-1 block truncate">
                  {proveedoresData[0]?.proveedor || 'N/A'}
                </span>
                <span className="text-[11px] text-blue-700 font-mono mt-0.5 block">
                  {formatQuetzales(proveedoresData[0]?.monto || 0)} ({proveedoresData[0]?.eventos || 0} eventos ganados)
                </span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-amber-800 font-bold block">Concentración Top 1:</span>
                <span className="text-xl font-black text-amber-950 mt-1 block font-mono">
                  {proveedoresData[0]?.porcentajeConcentracion.toFixed(1) || 0}%
                </span>
                <span className="text-[11px] text-amber-700 mt-0.5 block">
                  Del presupuesto total adjudicado
                </span>
              </div>
            </div>

            {/* Tabla de Proveedores */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">Proveedor Adjudicado</th>
                    <th className="p-3 text-center">Eventos Ganados</th>
                    <th className="p-3 text-right">Monto Total Adjudicado (GTQ)</th>
                    <th className="p-3 text-center">% de Concentración</th>
                    <th className="p-3">NOGs Adjudicados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {proveedoresData.map((p, idx) => (
                    <tr key={p.proveedor} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{p.proveedor}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{p.eventos}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatQuetzales(p.monto)}</td>
                      <td className="p-3 text-center font-mono font-bold text-indigo-700">
                        {p.porcentajeConcentracion.toFixed(1)}%
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {p.nogs.join(', ') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {proveedoresData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        No se registran compras adjudicadas con proveedor en la selección actual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORTE 6: ALERTAS Y SEMÁFOROS CRÍTICOS DE AUDITORÍA */}
        {/* ============================================================ */}
        {selectedReportType === 'alertas_riesgo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-medium">Alertas Detectadas:</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{alertasData.length}</span>
                <span className="text-[10px] text-slate-400">En la muestra evaluada</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-rose-900 font-bold block">Riesgo Alto (Críticas):</span>
                <span className="text-xl font-black text-rose-800 mt-0.5 block">
                  {alertasData.filter(a => a.nivel === 'alto').length}
                </span>
                <span className="text-[10px] text-rose-700">Sin NOG en Guatecompras</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-amber-900 font-bold block">Riesgo Medio:</span>
                <span className="text-xl font-black text-amber-800 mt-0.5 block">
                  {alertasData.filter(a => a.nivel === 'medio').length}
                </span>
                <span className="text-[10px] text-amber-700">Pocas ofertas / Inactividad</span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-blue-900 font-bold block">Preventivas / F56:</span>
                <span className="text-xl font-black text-blue-800 mt-0.5 block">
                  {alertasData.filter(a => a.nivel === 'preventivo' || a.nivel === 'info').length}
                </span>
                <span className="text-[10px] text-blue-700">Documentación y desiertos</span>
              </div>
            </div>

            {/* Tabla de Alertas */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">NOG / F56-e</th>
                    <th className="p-3">Tipo de Alerta</th>
                    <th className="p-3 text-center">Nivel Riesgo</th>
                    <th className="p-3">Descripción Requerimiento</th>
                    <th className="p-3">Causa de la Alerta</th>
                    <th className="p-3">Acción Correctiva Recomendada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {alertasData.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">{a.purchase.nog || 'Sin NOG'}</span>
                        <span className="text-[10px] text-slate-500">{a.purchase.f56e}</span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{a.tipo}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          a.nivel === 'alto' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          a.nivel === 'medio' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          a.nivel === 'preventivo' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                          'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {a.nivel}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="line-clamp-2 text-slate-800">{a.purchase.descripcion}</p>
                        <span className="text-[10px] font-mono font-bold text-slate-900 block mt-0.5">
                          {formatQuetzales(a.purchase.monto)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs">{a.causa}</td>
                      <td className="p-3 text-slate-900 font-medium max-w-xs bg-slate-50/70">{a.accion}</td>
                    </tr>
                  ))}
                  {alertasData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-emerald-700 font-bold bg-emerald-50/30">
                        ✓ No se detectaron inconsistencias ni alertas operativas en los expedientes seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REPORTE 7: CONSOLIDADO GENERAL INSTITUCIONAL */}
        {/* ============================================================ */}
        {selectedReportType === 'consolidado' && (
          <div className="space-y-6">
            {/* Resumen Ejecutivo */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Total Eventos:</span>
                <span className="text-base font-bold text-slate-900">{filteredPurchases.length} registros</span>
              </div>
              <div>
                <span className="text-slate-500 block">Presupuesto Comprometido:</span>
                <span className="text-base font-bold text-slate-900 font-mono">{formatQuetzales(totalPresupuesto)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Monto Adjudicado:</span>
                <span className="text-base font-bold text-emerald-600 font-mono">{formatQuetzales(montoAdjudicado)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cobertura Dictamen GIT:</span>
                <span className="text-base font-bold text-amber-600">
                  {filteredPurchases.length > 0 ? Math.round((evaluadosGIT.length / filteredPurchases.length) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Tabla Consolidada Maestra */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5">NOG</th>
                    <th className="p-2.5">F56-e / F56</th>
                    <th className="p-2.5">Área / Dependencia</th>
                    <th className="p-2.5">Descripción del Requerimiento</th>
                    <th className="p-2.5">Fecha Rec.</th>
                    <th className="p-2.5 text-right">Monto (GTQ)</th>
                    <th className="p-2.5 text-center">Modalidad LCE</th>
                    <th className="p-2.5 text-center">Estatus</th>
                    <th className="p-2.5">Proveedor Adjudicado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPurchases.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{p.nog || '-'}</td>
                      <td className="p-2.5 font-mono">
                        <span className="font-semibold block text-slate-900">{p.f56e}</span>
                        <span className="text-[10px] text-slate-400">{p.f56 || '-'}</span>
                      </td>
                      <td className="p-2.5 font-medium text-slate-700 whitespace-nowrap">
                        {p.dependenciaSolicitante || p.areaSolicitante || 'Soporte técnico'}
                      </td>
                      <td className="p-2.5 max-w-xs text-slate-900 font-medium">{p.descripcion}</td>
                      <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(p.fechaRecepcion || p.fechaSolicitud)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatQuetzales(p.monto)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          {getModalidadCompraByMonto(p.monto).nombre}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-bold uppercase text-[10px] whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full ${
                          p.estatusEvento === 'Adjudicación' ? 'bg-emerald-100 text-emerald-900' :
                          p.estatusEvento === 'Evaluación' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {p.estatusEvento}
                        </span>
                      </td>
                      <td className="p-2.5 text-xs text-slate-700">
                        {p.proveedorAdjudicado || (p.estatusEvento === 'Adjudicación' ? 'Sin registrar' : 'N/A')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cierre y Firmas Oficiales Institucionales */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 mb-2 h-12 w-64 mx-auto" />
            <p className="font-bold text-slate-900 uppercase">Dirección de Auditoría Interna</p>
            <p className="text-[11px] text-slate-500">Supervisión y Control Gubernamental • Organismo Judicial</p>
          </div>
          <div>
            <div className="border-b border-slate-400 mb-2 h-12 w-64 mx-auto" />
            <p className="font-bold text-slate-900 uppercase">Departamento de Compras / GIT</p>
            <p className="text-[11px] text-slate-500">Verificación y Fiscalización de Expedientes</p>
          </div>
        </div>

      </div>

    </div>
  );
};
