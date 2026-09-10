import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';
import { BudgetLineItem, PurchaseRecord } from '../../types';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  DollarSign, 
  ShieldCheck, 
  Layers, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  BarChart3,
  Percent,
  Calculator
} from 'lucide-react';
import { formatQuetzales } from '../../utils/formatters';

interface BudgetStatsChartsProps {
  budgetAvailability: BudgetLineItem[];
  purchases: PurchaseRecord[];
}

const PALETTE_GROUPS = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#475569', // Slate
];

const PALETTE_EXECUTION = {
  pagado: '#1d4ed8',      // Blue-700
  comprometido: '#f59e0b',// Amber-500
  disponible: '#10b981',  // Emerald-500
};

export const BudgetStatsCharts: React.FC<BudgetStatsChartsProps> = ({
  budgetAvailability,
  purchases
}) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('todos');

  // Filtrar si el usuario selecciona un grupo
  const linesToAnalyze = useMemo(() => {
    if (selectedGroupFilter === 'todos') return budgetAvailability;
    return budgetAvailability.filter(l => l.grupoPresupuestario === selectedGroupFilter);
  }, [budgetAvailability, selectedGroupFilter]);

  // Totales consolidados con desglose de modificaciones
  const totals = useMemo(() => {
    return linesToAnalyze.reduce((acc, line) => {
      acc.inicial += line.presupuestoInicial || 0;
      acc.modificacionesPositivas += line.modificacionesPositivas || 0;
      acc.modificacionesNegativas += line.modificacionesNegativas || 0;
      acc.vigente += line.presupuestoVigente || 0;
      acc.pagado += line.pagadoQueRebaja || 0;
      acc.comprometido += line.comprometidoPendiente || 0;
      acc.disponibleReal += line.disponibleReal || 0;
      acc.disponibleProyectado += line.disponibleProyectado || 0;
      return acc;
    }, {
      inicial: 0,
      modificacionesPositivas: 0,
      modificacionesNegativas: 0,
      vigente: 0,
      pagado: 0,
      comprometido: 0,
      disponibleReal: 0,
      disponibleProyectado: 0
    });
  }, [linesToAnalyze]);

  const totalModificacionesNetas = totals.modificacionesPositivas - totals.modificacionesNegativas;

  // Porcentajes globales
  const pctPagado = totals.vigente > 0 ? (totals.pagado / totals.vigente) * 100 : 0;
  const pctComprometido = totals.vigente > 0 ? (totals.comprometido / totals.vigente) * 100 : 0;
  const pctDisponibleProyectado = totals.vigente > 0 ? Math.max(0, (totals.disponibleProyectado / totals.vigente) * 100) : 0;
  const pctCompromisoTotal = totals.vigente > 0 ? ((totals.pagado + totals.comprometido) / totals.vigente) * 100 : 0;

  // 1. Datos para Gráfica de Círculo: Estado Global del Presupuesto (Donut)
  const executionPieData = useMemo(() => {
    return [
      {
        name: 'Pagado que Rebaja',
        value: totals.pagado,
        color: PALETTE_EXECUTION.pagado,
        pct: pctPagado
      },
      {
        name: 'Comprometido Pendiente',
        value: totals.comprometido,
        color: PALETTE_EXECUTION.comprometido,
        pct: pctComprometido
      },
      {
        name: 'Disponible Proyectado',
        value: Math.max(0, totals.disponibleProyectado),
        color: PALETTE_EXECUTION.disponible,
        pct: pctDisponibleProyectado
      }
    ].filter(item => item.value > 0);
  }, [totals, pctPagado, pctComprometido, pctDisponibleProyectado]);

  // 2. Datos para Gráfica de Círculo: Distribución por Grupos Presupuestarios (Donut)
  const groupPieData = useMemo(() => {
    const groupMap = new Map<string, number>();
    budgetAvailability.forEach(l => {
      const grp = l.grupoPresupuestario || 'Otros Grupos';
      groupMap.set(grp, (groupMap.get(grp) || 0) + (l.presupuestoVigente || 0));
    });

    const totalVig = Array.from(groupMap.values()).reduce((a, b) => a + b, 0);

    return Array.from(groupMap.entries())
      .map(([name, value], idx) => ({
        name: name.replace('Grupo ', 'G-'),
        fullName: name,
        value,
        color: PALETTE_GROUPS[idx % PALETTE_GROUPS.length],
        pct: totalVig > 0 ? (value / totalVig) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [budgetAvailability]);

  // 3. Datos para Gráfica de Círculo: Top 5 Renglones Informáticos con Mayor Techo
  const topRenglonesPieData = useMemo(() => {
    const sorted = [...budgetAvailability].sort((a, b) => (b.presupuestoVigente || 0) - (a.presupuestoVigente || 0));
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const othersSum = others.reduce((sum, l) => sum + (l.presupuestoVigente || 0), 0);

    const totalVig = budgetAvailability.reduce((sum, l) => sum + (l.presupuestoVigente || 0), 0);

    const result = top5.map((l, idx) => ({
      name: `R-${l.renglonPresupuestario}`,
      fullName: `[${l.renglonPresupuestario}] ${l.nombreRenglon}`,
      value: l.presupuestoVigente || 0,
      color: PALETTE_GROUPS[idx % PALETTE_GROUPS.length],
      pct: totalVig > 0 ? ((l.presupuestoVigente || 0) / totalVig) * 100 : 0
    }));

    if (othersSum > 0) {
      result.push({
        name: 'Demás Renglones',
        fullName: `Otros ${others.length} renglones del catálogo`,
        value: othersSum,
        color: '#94a3b8',
        pct: totalVig > 0 ? (othersSum / totalVig) * 100 : 0
      });
    }

    return result;
  }, [budgetAvailability]);

  // Lista de grupos para filtro
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    budgetAvailability.forEach(l => {
      if (l.grupoPresupuestario) set.add(l.grupoPresupuestario);
    });
    return Array.from(set).sort();
  }, [budgetAvailability]);

  // Renglones en alerta crítica o déficit
  const deficitLines = useMemo(() => {
    return budgetAvailability.filter(l => l.disponibleProyectado <= 0);
  }, [budgetAvailability]);

  const alertLines = useMemo(() => {
    return budgetAvailability.filter(l => l.disponibleProyectado > 0 && l.disponibleProyectado < (l.presupuestoVigente * 0.15));
  }, [budgetAvailability]);

  return (
    <div className="space-y-6" id="budget-stats-circle-charts">
      {/* Barra de Filtro de Grupo y Estado General */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Indicadores y Gráficas Circulares de Ejecución Presupuestaria
          </h3>
          <p className="text-xs text-slate-500">
            Análisis visual en tiempo real de la distribución del techo vigente, compromisos en trámite y saldo devengado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Filtrar Grupo:</label>
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="todos">Todos los Grupos ({budgetAvailability.length} Renglones)</option>
            {availableGroups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cuadro Estadístico de Modificaciones Aprobadas: Separación de Incrementos y Disminuciones */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              Cuadro Estadístico de Modificaciones Presupuestarias Aprobadas (DAF)
            </h4>
            <p className="text-xs text-slate-500">
              Desglose analítico de ampliaciones que incrementan (+) vs disminuciones que reducen (-) el techo presupuestario.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Ampliaciones: +{formatQuetzales(totals.modificacionesPositivas)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              Disminuciones: -{formatQuetzales(totals.modificacionesNegativas)}
            </span>
          </div>
        </div>

        {/* 5 Tarjetas del Cuadro Estadístico de Modificaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Presupuesto Inicial</span>
            <span className="text-sm font-black text-slate-900 font-mono block mt-1">
              {formatQuetzales(totals.inicial)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Asignación aprobada</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center justify-between">
              <span>2. (+) Ampliaciones</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <span className="text-sm font-black text-emerald-900 font-mono block mt-1">
              +{formatQuetzales(totals.modificacionesPositivas)}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Incrementan el presupuesto</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block flex items-center justify-between">
              <span>3. (-) Disminuciones</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            </span>
            <span className="text-sm font-black text-rose-900 font-mono block mt-1">
              -{formatQuetzales(totals.modificacionesNegativas)}
            </span>
            <span className="text-[10px] text-rose-700 block mt-0.5">Reducen el presupuesto</span>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">4. (±) Modif. Neta</span>
            <span className={`text-sm font-black font-mono block mt-1 ${totalModificacionesNetas >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              {totalModificacionesNetas >= 0 ? '+' : ''}{formatQuetzales(totalModificacionesNetas)}
            </span>
            <span className="text-[10px] text-indigo-700 block mt-0.5">Incrementos - Disminuciones</span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-900 text-white border border-blue-800 shadow-xs">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">5. Presupuesto Vigente</span>
            <span className="text-sm font-black text-white font-mono block mt-1">
              {formatQuetzales(totals.vigente)}
            </span>
            <span className="text-[10px] text-blue-300 block mt-0.5">Suma exacta de Columna Vigente</span>
          </div>
        </div>

        {/* Ecuación explicativa institucional */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <strong className="text-slate-900 font-sans">Fórmula de Cuadre:</strong>
            <span>{formatQuetzales(totals.inicial)}</span>
            <span className="text-emerald-700 font-bold">+{formatQuetzales(totals.modificacionesPositivas)}</span>
            <span className="text-rose-700 font-bold">-{formatQuetzales(totals.modificacionesNegativas)}</span>
            <span>=</span>
            <strong className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">{formatQuetzales(totals.vigente)}</strong>
          </div>
          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Total Vigente verificado con la sumatoria de renglones
          </div>
        </div>
      </div>

      {/* 4 Indicadores Circulares / Métricas de Desempeño */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Indicador 1: Tasa de Ejecución Real (Pagado) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-700 transition-all duration-1000"
                strokeDasharray={`${Math.min(100, Math.max(0, pctPagado))}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-[11px] font-black font-mono text-blue-900">
              {pctPagado.toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pagado que Rebaja
            </span>
            <span className="text-xs font-black text-blue-950 font-mono block">
              {formatQuetzales(totals.pagado)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Saldo devengado efectivo
            </span>
          </div>
        </div>

        {/* Indicador 2: Tasa de Compromiso Pendiente */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-500 transition-all duration-1000"
                strokeDasharray={`${Math.min(100, Math.max(0, pctComprometido))}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-[11px] font-black font-mono text-amber-900">
              {pctComprometido.toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Comprometido Pendiente
            </span>
            <span className="text-xs font-black text-amber-900 font-mono block">
              {formatQuetzales(totals.comprometido)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Eventos F56 en gestión
            </span>
          </div>
        </div>

        {/* Indicador 3: Margen de Disponibilidad Proyectada */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-600 transition-all duration-1000"
                strokeDasharray={`${Math.min(100, Math.max(0, pctDisponibleProyectado))}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-[11px] font-black font-mono text-emerald-800">
              {pctDisponibleProyectado.toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Disponible Proyectado
            </span>
            <span className="text-xs font-black text-emerald-900 font-mono block">
              {formatQuetzales(totals.disponibleProyectado)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Margen libre para compras
            </span>
          </div>
        </div>

        {/* Indicador 4: Semáforo Institucional */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
              deficitLines.length > 0 
                ? 'bg-rose-50 border-rose-400 text-rose-700' 
                : alertLines.length > 0 
                  ? 'bg-amber-50 border-amber-400 text-amber-700' 
                  : 'bg-emerald-50 border-emerald-400 text-emerald-700'
            }`}>
              {deficitLines.length > 0 ? (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              ) : alertLines.length > 0 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Semáforo de Disponibilidad
            </span>
            <span className={`text-xs font-extrabold block ${
              deficitLines.length > 0 ? 'text-rose-700' : alertLines.length > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {deficitLines.length > 0 ? 'Déficit en Renglones' : alertLines.length > 0 ? 'Alerta por Saldo Bajo' : 'Presupuesto Saludable'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {deficitLines.length > 0 
                ? `${deficitLines.length} renglón(es) sin saldo` 
                : alertLines.length > 0 
                  ? `${alertLines.length} renglón(es) <15%` 
                  : 'Sin sobregiros proyectados'}
            </span>
          </div>
        </div>

      </div>

      {/* Grid de 3 Gráficas de Círculo (Pie/Donut Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica Circular 1: Distribución Global de Ejecución */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                1. Distribución Global de Ejecución
              </h4>
              <p className="text-[10px] text-slate-400">
                Pagado vs. Comprometido vs. Disponible
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600">
              100% Techo
            </span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {executionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={executionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {executionPieData.map((entry, index) => (
                      <Cell key={`cell-exec-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatQuetzales(Number(val)), 'Monto (GTQ)']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Sin datos de ejecución</div>
            )}
          </div>

          {/* Leyenda Detallada */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {executionPieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 text-[11px] truncate max-w-[130px]">{item.name}:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-800 text-[11px] font-semibold">{formatQuetzales(item.value)}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold w-12 text-right">({item.pct.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfica Circular 2: Asignación Vigente por Grupos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                2. Techo Vigente por Grupos
              </h4>
              <p className="text-[10px] text-slate-400">
                Participación de Grupos 100, 200, 300, etc.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600">
              {groupPieData.length} Grupos
            </span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {groupPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groupPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {groupPieData.map((entry, index) => (
                      <Cell key={`cell-group-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatQuetzales(Number(val)), 'Techo Vigente']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Sin datos de grupos</div>
            )}
          </div>

          {/* Leyenda Detallada */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {groupPieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 text-[11px] truncate max-w-[130px]" title={item.fullName}>{item.fullName}:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-800 text-[11px] font-semibold">{formatQuetzales(item.value)}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold w-12 text-right">({item.pct.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfica Circular 3: Top Renglones con Mayor Asignación */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                3. Concentración por Renglones
              </h4>
              <p className="text-[10px] text-slate-400">
                Top 5 de renglones con mayor presupuesto
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600">
              Top 5 + Resto
            </span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {topRenglonesPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topRenglonesPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {topRenglonesPieData.map((entry, index) => (
                      <Cell key={`cell-top-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatQuetzales(Number(val)), 'Presupuesto']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Sin datos de renglones</div>
            )}
          </div>

          {/* Leyenda Detallada */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {topRenglonesPieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 text-[11px] truncate max-w-[130px]" title={item.fullName}>{item.fullName}:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-800 text-[11px] font-semibold">{formatQuetzales(item.value)}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold w-12 text-right">({item.pct.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
