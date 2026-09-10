import * as XLSX from 'xlsx';
import { BudgetLineItem, BudgetModification, PurchaseRecord, BudgetDisponibilidadStatus } from '../types';
import { doesStatusAffectBudget } from '../data/budgetStandardCatalog';

/**
 * Recalcula dinámicamente la matriz de disponibilidad presupuestaria
 * considerando modificaciones aprobadas y adquisiciones registradas.
 */
export function calculateBudgetAvailability(
  lines: BudgetLineItem[],
  modifications: BudgetModification[],
  purchases: PurchaseRecord[]
): BudgetLineItem[] {
  return lines.map((line) => {
    const cleanLineRenglon = String(line.renglonPresupuestario || '').trim();

    // 1. Calcular Modificaciones Aprobadas netas para este renglón (+ ampliaciones/transferencias destino, - disminuciones/transferencias origen)
    let modPositivas = 0;
    let modNegativas = 0;
    let hasExplicitMods = false;

    for (const mod of modifications) {
      const estado = String(mod.estado || '').toLowerCase().trim();
      if (estado !== 'aprobada') continue;

      const modDestino = String(mod.renglonPresupuestario || '').trim();
      const modOrigen = String(mod.renglonOrigenPresupuestario || '').trim();
      const tipo = String(mod.tipo || '').toLowerCase().trim();
      const monto = Math.abs(Number(mod.monto) || 0);

      // Ampliación o Incremento al renglón (+)
      if ((tipo === 'ampliacion' || tipo === 'ampliación' || tipo === 'incremento' || tipo === 'aumento') && modDestino === cleanLineRenglon) {
        modPositivas += monto;
        hasExplicitMods = true;
      }
      // Disminución o Reducción al renglón (-)
      else if ((tipo === 'disminucion' || tipo === 'disminución' || tipo === 'reduccion' || tipo === 'reducción') && modDestino === cleanLineRenglon) {
        modNegativas += monto;
        hasExplicitMods = true;
      }
      // Transferencia
      else if (tipo === 'transferencia') {
        // Si este renglón es el destino recibe (+)
        if (modDestino === cleanLineRenglon) {
          modPositivas += monto;
          hasExplicitMods = true;
        }
        // Si este renglón es el origen entrega/cede (-)
        if (modOrigen === cleanLineRenglon) {
          modNegativas += monto;
          hasExplicitMods = true;
        }
      }
    }

    // Si no hay modificaciones explícitas registradas, pero la línea traía un valor base
    if (!hasExplicitMods) {
      const baseVal = Number(line.modificacionesAprobadas) || 0;
      if (baseVal > 0) {
        modPositivas = baseVal;
      } else if (baseVal < 0) {
        modNegativas = Math.abs(baseVal);
      }
    }

    const modificacionesPositivas = Math.round(modPositivas * 100) / 100;
    const modificacionesNegativas = Math.round(modNegativas * 100) / 100;
    const modificacionesAprobadas = Math.round((modPositivas - modNegativas) * 100) / 100;

    // 2. REGLA INSTITUCIONAL: Presupuesto Vigente = Presupuesto Inicial + Modificaciones Aprobadas (+/-)
    const presupuestoInicial = Math.round((Number(line.presupuestoInicial) || 0) * 100) / 100;
    const presupuestoVigente = Math.round((presupuestoInicial + modificacionesAprobadas) * 100) / 100;

    // 3. Compras asociadas activas según regla institucional: Afecta Disponibilidad (Sí / No)
    // Se excluyen eventos Anulados, Rechazados, Desiertos y Prescindidos
    // El Renglón 113 es administrado por Gerencia Administrativa: es solo referencial y no afecta presupuesto técnico
    const isReferenceLine = cleanLineRenglon === '113' || Boolean(line.esReferencia);

    const activePurchases = purchases.filter(p => {
      const pRenglon = String(p.renglonPresupuestario || '').trim();
      const matchRenglon = pRenglon === cleanLineRenglon;
      const affects = doesStatusAffectBudget(p.estatusEvento, pRenglon);
      return matchRenglon && (affects || isReferenceLine);
    });

    // Sumar compras pagadas del renglón (Estatus 'Pagada' o estadoPago 'pagado')
    const purchasesPaidTotal = activePurchases
      .filter(p => p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada')
      .reduce((sum, p) => sum + (Number(p.montoPagado) || Number(p.monto) || 0), 0);

    // Sumar compras comprometidas pendientes de pago (no pagadas)
    const purchasesPendingTotal = activePurchases
      .filter(p => p.estadoPago !== 'pagado' && p.estatusEvento !== 'Pagada')
      .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

    // 4. Pagado que Rebaja: Base histórica/manual + adquisiciones pagadas en el sistema
    const pagadoBase = Number(line.pagadoQueRebaja) || 0;
    const pagadoQueRebaja = Math.round((pagadoBase + purchasesPaidTotal) * 100) / 100;

    // 5. Disponible Real = Presupuesto Vigente - Pagado que Rebaja
    // Para renglón de referencia 113 no descuenta saldo
    const disponibleReal = isReferenceLine 
      ? 0 
      : Math.round((presupuestoVigente - pagadoQueRebaja) * 100) / 100;

    // 6. Comprometido Pendiente: Base histórica/manual + adquisiciones pendientes de pago asignadas
    const comprometidoBase = Number(line.comprometidoPendiente) || 0;
    const comprometidoPendiente = isReferenceLine
      ? 0
      : Math.round((comprometidoBase + purchasesPendingTotal) * 100) / 100;

    // 7. Disponible Proyectado = Disponible Real - Comprometido Pendiente
    const disponibleProyectado = isReferenceLine
      ? 0
      : Math.round((disponibleReal - comprometidoPendiente) * 100) / 100;

    // 8. Porcentaje Usado/Comprometido = ((Pagado + Comprometido) / Vigente) * 100
    const totalAfectado = pagadoQueRebaja + comprometidoPendiente;
    const porcentajeUsadoComprometido = isReferenceLine
      ? 0
      : (presupuestoVigente > 0 
        ? Math.min(100, Math.max(0, (totalAfectado / presupuestoVigente) * 100))
        : 0);

    // 9. Estatus si hay disponibilidad o No
    let estatusDisponibilidad: BudgetDisponibilidadStatus = 'Con Disponibilidad';
    if (isReferenceLine) {
      estatusDisponibilidad = 'Con Disponibilidad';
    } else if (disponibleProyectado <= 0) {
      estatusDisponibilidad = 'Sin Disponibilidad';
    } else if (disponibleProyectado < (presupuestoVigente * 0.15)) {
      estatusDisponibilidad = 'Alerta Disponibilidad Baja';
    } else {
      estatusDisponibilidad = 'Con Disponibilidad';
    }

    return {
      ...line,
      presupuestoInicial,
      modificacionesAprobadas,
      modificacionesPositivas,
      modificacionesNegativas,
      presupuestoVigente,
      pagadoQueRebaja,
      disponibleReal,
      comprometidoPendiente,
      disponibleProyectado,
      porcentajeUsadoComprometido: Math.round(porcentajeUsadoComprometido * 100) / 100,
      estatusDisponibilidad
    };
  });
}

/**
 * Genera y descarga la plantilla de Excel modelo para importar presupuesto
 */
export function downloadBudgetExcelTemplate() {
  const rows = [
    {
      'Grupo Presupuestario': 'Grupo 100 - Servicios No Personales',
      'Renglón Presupuestario': '158',
      'Nombre del Renglón': 'Arrendamiento de Equipo de Cómputo',
      'Presupuesto Inicial': 2000000,
      'Modificaciones Aprobadas': 150000,
      'Presupuesto Vigente': 2150000,
      'Pagado que Rebaja': 850000,
      'Disponible Real': 1300000,
      'Comprometido Pendiente': 600000,
      'Disponible Proyectado': 700000,
      'Porcentaje Usado/Comprometido': '67.44%',
      'Estatus': 'Con Disponibilidad'
    },
    {
      'Grupo Presupuestario': 'Grupo 200 - Materiales y Suministros',
      'Renglón Presupuestario': '267',
      'Nombre del Renglón': 'Tintes, Pinturas y Colorantes',
      'Presupuesto Inicial': 400000,
      'Modificaciones Aprobadas': 40000,
      'Presupuesto Vigente': 440000,
      'Pagado que Rebaja': 220000,
      'Disponible Real': 220000,
      'Comprometido Pendiente': 160000,
      'Disponible Proyectado': 60000,
      'Porcentaje Usado/Comprometido': '86.36%',
      'Estatus': 'Alerta Disponibilidad Baja'
    },
    {
      'Grupo Presupuestario': 'Grupo 300 - Propiedad, Planta, Equipo e Intangibles',
      'Renglón Presupuestario': '328',
      'Nombre del Renglón': 'Equipo de Computación',
      'Presupuesto Inicial': 4500000,
      'Modificaciones Aprobadas': 300000,
      'Presupuesto Vigente': 4800000,
      'Pagado que Rebaja': 2100000,
      'Disponible Real': 2700000,
      'Comprometido Pendiente': 1900000,
      'Disponible Proyectado': 800000,
      'Porcentaje Usado/Comprometido': '83.33%',
      'Estatus': 'Con Disponibilidad'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Presupuesto GIT');

  // Ajustar anchos de columnas
  worksheet['!cols'] = [
    { wch: 35 }, // Grupo
    { wch: 22 }, // Renglón
    { wch: 40 }, // Nombre
    { wch: 20 }, // Presupuesto Inicial
    { wch: 24 }, // Modificaciones
    { wch: 20 }, // Presupuesto Vigente
    { wch: 20 }, // Pagado que Rebaja
    { wch: 18 }, // Disponible Real
    { wch: 24 }, // Comprometido Pendiente
    { wch: 22 }, // Disponible Proyectado
    { wch: 28 }, // % Usado
    { wch: 22 }  // Estatus
  ];

  XLSX.writeFile(workbook, 'Plantilla_Disponibilidad_Presupuestaria_GIT.xlsx');
}

/**
 * Exporta la matriz actual de disponibilidad presupuestaria a Excel (incluyendo fila de totales consolidados)
 */
export function exportBudgetLinesToExcel(lines: BudgetLineItem[], filename = 'Matriz_Disponibilidad_Presupuestaria_GIT.xlsx') {
  const sumInicial = Math.round(lines.reduce((s, l) => s + (Number(l.presupuestoInicial) || 0), 0) * 100) / 100;
  const sumMods = Math.round(lines.reduce((s, l) => s + (Number(l.modificacionesAprobadas) || 0), 0) * 100) / 100;
  const sumVigente = Math.round(lines.reduce((s, l) => s + (Number(l.presupuestoVigente) || 0), 0) * 100) / 100;
  const sumPagado = Math.round(lines.reduce((s, l) => s + (Number(l.pagadoQueRebaja) || 0), 0) * 100) / 100;
  const sumReal = Math.round(lines.reduce((s, l) => s + (Number(l.disponibleReal) || 0), 0) * 100) / 100;
  const sumComp = Math.round(lines.reduce((s, l) => s + (Number(l.comprometidoPendiente) || 0), 0) * 100) / 100;
  const sumProy = Math.round(lines.reduce((s, l) => s + (Number(l.disponibleProyectado) || 0), 0) * 100) / 100;
  const pctGlobal = sumVigente > 0 ? (((sumPagado + sumComp) / sumVigente) * 100).toFixed(2) + '%' : '0.00%';

  const data: any[] = lines.map(line => ({
    'Grupo Presupuestario': line.grupoPresupuestario,
    'Renglón Presupuestario': line.renglonPresupuestario,
    'Nombre del Renglón': line.nombreRenglon,
    'Presupuesto Inicial': line.presupuestoInicial,
    'Modificaciones Aprobadas': line.modificacionesAprobadas,
    'Presupuesto Vigente': line.presupuestoVigente,
    'Pagado que Rebaja': line.pagadoQueRebaja,
    'Disponible Real': line.disponibleReal,
    'Comprometido Pendiente': line.comprometidoPendiente,
    'Disponible Proyectado': line.disponibleProyectado,
    'Porcentaje Usado/Comprometido': `${line.porcentajeUsadoComprometido.toFixed(2)}%`,
    'Estatus': line.estatusDisponibilidad
  }));

  // Fila de Totales Consolidados al final
  data.push({
    'Grupo Presupuestario': 'TOTALES CONSOLIDADOS',
    'Renglón Presupuestario': `(${lines.length} RENGLONES)`,
    'Nombre del Renglón': 'SUMATORIA CONSOLIDADA GERENCIA DE INFORMÁTICA',
    'Presupuesto Inicial': sumInicial,
    'Modificaciones Aprobadas': sumMods,
    'Presupuesto Vigente': sumVigente,
    'Pagado que Rebaja': sumPagado,
    'Disponible Real': sumReal,
    'Comprometido Pendiente': sumComp,
    'Disponible Proyectado': sumProy,
    'Porcentaje Usado/Comprometido': pctGlobal,
    'Estatus': `${lines.filter(l => l.disponibleProyectado > 0).length} CON DISPONIBILIDAD`
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Disponibilidad');

  worksheet['!cols'] = [
    { wch: 35 },
    { wch: 22 },
    { wch: 40 },
    { wch: 20 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 28 },
    { wch: 24 }
  ];

  XLSX.writeFile(workbook, filename);
}
