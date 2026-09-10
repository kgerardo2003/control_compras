import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Download,
  PlusCircle,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Clock,
  History,
  Search,
  FileSpreadsheet,
  ArrowRight,
  User,
  ExternalLink,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Building2,
  DollarSign,
  TrendingUp,
  Layers,
  Briefcase,
  X,
  FileText,
  CheckCircle,
  Scale,
  Landmark,
  Table as TableIcon,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Sector
} from 'recharts';
import { formatQuetzales, formatDate, exportToCSV, formatDateTime, getModalidadCompraByMonto } from '../utils/formatters';
import { doesStatusAffectBudget } from '../data/budgetStandardCatalog';

// Formateador institucional para el eje Y de valores monetarios
const formatYAxisCurrency = (val: number): string => {
  if (val >= 1000000) return `Q ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `Q ${(val / 1000).toFixed(0)}k`;
  return `Q ${val}`;
};

// Abreviación de nombres de dependencias para etiquetas legibles en eje X
const getShortDeptName = (name: string): string => {
  if (!name) return 'General';
  if (name.includes('Servicios Informáticos')) return 'Serv. Informáticos';
  if (name.includes('Redes y Telecomunicaciones')) return 'Redes y Telecom.';
  if (name.includes('Desarrollo y Administración')) return 'Desarrollo Sist.';
  if (name.includes('Seguridad Informática')) return 'Seguridad Inf.';
  if (name.includes('Soporte Técnico')) return 'Soporte Técnico';
  if (name.includes('Centro de Cómputo')) return 'Centro Cómputo';
  if (name.includes('Gestión de Adquisiciones')) return 'Gestión Adq.';
  if (name.length > 18) return name.slice(0, 16) + '…';
  return name;
};

// Paleta institucional de colores diferenciados para cada departamento
const DEPARTMENT_COLORS: Record<string, string> = {
  'Dirección de Servicios Informáticos': '#1c39bb', // Azul institucional OJ
  'Departamento de Redes y Telecomunicaciones': '#0284c7', // Cyan / Celeste
  'Departamento de Desarrollo y Administración de Sistemas': '#059669', // Verde esmeralda
  'Departamento de Seguridad Informática': '#7c3aed', // Violeta / Púrpura
  'Departamento de Soporte Técnico': '#d97706', // Ámbar / Dorado
  'Departamento de Centro de Cómputo': '#0d9488', // Teal / Verde azulado
  'Departamento de Gestión de Adquisiciones TIC': '#e11d48', // Carmesí / Rose
  'Gerencia de Informática': '#2563eb', // Azul real
  'Otras Dependencias': '#64748b', // Pizarra
};

const PALETTE_FALLBACK = [
  '#1c39bb', '#0284c7', '#059669', '#7c3aed',
  '#d97706', '#0d9488', '#e11d48', '#2563eb',
  '#ea580c', '#0891b2', '#16a34a', '#9333ea',
  '#c026d3', '#b45309', '#0369a1', '#15803d'
];

const getDepartmentColor = (name: string, index: number): string => {
  if (DEPARTMENT_COLORS[name]) return DEPARTMENT_COLORS[name];
  const normalized = name.toLowerCase();
  for (const [key, color] of Object.entries(DEPARTMENT_COLORS)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return color;
    }
  }
  return PALETTE_FALLBACK[index % PALETTE_FALLBACK.length];
};

// Tooltip estilizado para la gráfica de barras de compras por departamento
interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      departamento: string;
      nombreCorto: string;
      monto: number;
      cantidad: number;
      adjudicado: number;
      enEvaluacion: number;
      color: string;
    };
  }>;
}

const CustomBarTooltip: React.FC<BarTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs max-w-xs z-50">
        <p className="font-bold text-white mb-2 flex items-center gap-1.5 border-b border-slate-700 pb-1.5">
          <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: data.color }} />
          <span className="truncate">{data.departamento}</span>
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Presupuesto Total:</span>
            <span className="font-mono font-bold text-emerald-400">{formatQuetzales(data.monto)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Total Adquisiciones:</span>
            <span className="font-bold text-slate-100">{data.cantidad} evento(s)</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Monto Adjudicado:</span>
            <span className="font-mono text-cyan-300">{formatQuetzales(data.adjudicado)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">En Evaluación:</span>
            <span className="font-mono text-amber-300">{formatQuetzales(data.enEvaluacion)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip estilizado e interactivo para la gráfica circular de estado presupuestario
interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      monto: number;
      percentage: string;
      countPercentage?: string;
      count: number;
      totalCompras?: number;
      totalPresupuesto?: number;
      color: string;
    };
  }>;
}

const CustomPieTooltip: React.FC<PieTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const countPct = data.countPercentage || '0';
    const budgetPct = data.percentage || '0';

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-xl shadow-2xl border border-slate-700/80 text-xs w-68 sm:w-72 z-50 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-700 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white/20" style={{ backgroundColor: data.color }} />
            <span className="font-black text-white text-sm truncate">{data.name}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-slate-300 shrink-0">
            {data.count} {data.count === 1 ? 'proceso' : 'procesos'}
          </span>
        </div>

        <div className="space-y-2.5">
          {/* 1. Número exacto de compras y porcentaje del total */}
          <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-300 font-semibold">Compras por estado:</span>
              <span className="font-mono font-bold text-amber-300">
                {data.count} {data.count === 1 ? 'compra' : 'compras'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
              <span>Porcentaje exacto:</span>
              <span className="font-bold text-amber-400">{countPct}% de las compras</span>
            </div>
            {/* Barra de progreso de porcentaje de compras */}
            <div className="w-full bg-slate-700/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(3, parseFloat(countPct)))}%`, backgroundColor: data.color }}
              />
            </div>
          </div>

          {/* 2. Monto financiero y porcentaje del presupuesto */}
          <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-slate-300 font-semibold">Monto acumulado:</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatQuetzales(data.monto)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
              <span>Participación presupuestaria:</span>
              <span className="font-bold text-emerald-300">{budgetPct}% del total</span>
            </div>
            {/* Barra de progreso de presupuesto */}
            <div className="w-full bg-slate-700/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(3, parseFloat(budgetPct)))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip estilizado para el gráfico comparativo de Presupuesto Vigente vs Comprometido
interface ComparativeTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomComparativeTooltip: React.FC<ComparativeTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-[280px] max-w-sm z-50 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-700/80">
          <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: data.color }} />
          <div className="truncate">
            <p className="font-bold text-white text-xs truncate leading-snug">{data.nombre}</p>
            {data.grupo && (
              <span className="text-[10px] text-slate-400 block truncate">{data.grupo}</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {/* Presupuesto Vigente */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#1c39bb] shrink-0 inline-block shadow-2xs" />
              Presupuesto Vigente:
            </span>
            <span className="font-mono font-bold text-blue-300 text-xs">
              {formatQuetzales(data.presupuestoVigente)}
            </span>
          </div>

          {/* Presupuesto Comprometido */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#d97706] shrink-0 inline-block shadow-2xs" />
              Comprometido:
            </span>
            <span className="font-mono font-bold text-amber-300 text-xs">
              {formatQuetzales(data.comprometido)}
            </span>
          </div>

          {/* Barra de Porcentaje Comprometido */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-medium">Tasa de Compromiso:</span>
              <span className="font-bold font-mono text-amber-400">{data.porcentajeComprometido}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div 
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, data.porcentajeComprometido)}%` }}
              />
            </div>
          </div>

          {/* Saldo Disponible */}
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
            <span className="text-slate-400">Saldo Disponible:</span>
            <span className="font-mono font-semibold text-emerald-400">
              {formatQuetzales(data.disponible)}
            </span>
          </div>

          {/* Eventos */}
          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
            <span>Eventos Asociados:</span>
            <span className="font-bold text-slate-200">{data.eventosCount} proceso(s)</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  'Adjudicación': 'bg-blue-100 text-blue-700',
  'Evaluación': 'bg-amber-100 text-amber-700',
  'Prescindido': 'bg-red-100 text-red-700',
  'Desierto': 'bg-slate-100 text-slate-700',
};

const ACTION_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'LOGIN': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'LOGOUT': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'CREAR_COMPRA': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'EDITAR_COMPRA': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'CAMBIO_ESTATUS': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'ELIMINAR_COMPRA': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'CREAR_CATALOGO': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'EDITAR_CATALOGO': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'CREAR_USUARIO': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'EDITAR_USUARIO': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'EXPORTAR_DATOS': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  'RESTAURAR_DATOS': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

export const DashboardView: React.FC = () => {
  const {
    purchases,
    budgetAvailability,
    catalogs,
    setActiveTab,
    setIsPurchaseModalOpen,
    setPurchaseToEdit,
    setSelectedPurchase,
    currentUser,
    auditLogs,
    logAudit,
    themeConfig
  } = useApp();

  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [filterGIT, setFilterGIT] = useState<string>('todos');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('todos');
  const [barMetric, setBarMetric] = useState<'monto' | 'cantidad'>('monto');
  // Estado interactivo para seleccionar un departamento al hacer clic en la gráfica de barras
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  // Estado para el sector activo en hover de la gráfica de pastel
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Estados para el Panel Visual Comparativo: Presupuesto Vigente vs Comprometido
  const [comparativeGrouping, setComparativeGrouping] = useState<'departamento' | 'dependencia' | 'renglon'>('departamento');
  const [comparativeViewMode, setComparativeViewMode] = useState<'grafico' | 'tabla'>('grafico');

  // Baseline institucional de techos presupuestarios vigentes para centros de costo / departamentos de la GIT
  const DEPARTMENT_BASE_BUDGETS: Record<string, number> = {
    'Departamento de Servicios Informáticos': 2400000,
    'Dirección de Servicios Informáticos': 2400000,
    'Servicios Informáticos': 2400000,
    'Desarrollo y Administración de Sistemas': 2800000,
    'Redes y Telecomunicaciones': 1600000,
    'Soporte técnico': 1500000,
    'Soporte Técnico': 1500000,
    'Soporte Técnico Remoto': 600000,
    'Seguridad Informática': 1200000,
    'Sección de Videoaudiencias': 800000,
    'Gestión de Adquisiciones TIC': 500000,
    'Gerencia de Informática': 1800000,
    'Centro de Cómputo': 1200000,
  };

  const DEPENDENCIA_BASE_BUDGETS: Record<string, number> = {
    'Subgerencia de Infraestructura GIT': 3600000,
    'Subgerencia de Desarrollo de Sistemas GIT': 2800000,
    'Unidad de Seguridad de la Información': 1200000,
    'Unidad de Soporte Técnico Departamental': 1500000,
    'Salas de Vistas y Tribunales Penales': 800000,
    'Centro de Cómputo Principal Torre de Tribunales': 1345000,
  };

  // Control de acceso: solo perfiles Administrador y Auditor pueden ver la bitácora
  const canViewAudit = currentUser?.rol === 'administrador' || currentUser?.rol === 'auditor';

  // Filtrado reactivo de compras
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (selectedYear !== 'todos') {
        const year = p.fechaSolicitud ? p.fechaSolicitud.substring(0, 4) : '';
        if (year !== selectedYear) return false;
      }
      if (filterGIT !== 'todos' && p.evaluadoGIT !== filterGIT) return false;
      return true;
    });
  }, [purchases, selectedYear, filterGIT]);

  // Datos calculados para el Gráfico de Barras Comparativo: Presupuesto Vigente vs Comprometido
  const comparativeChartData = useMemo(() => {
    if (comparativeGrouping === 'renglon') {
      // 1. Agrupación por Renglón Presupuestario (Centros de Costo Financieros oficiales, excluyendo referenciales de Gerencia Administrativa)
      const lines = (budgetAvailability && budgetAvailability.length > 0 ? budgetAvailability : [])
        .filter(l => !l.esReferencia && l.renglonPresupuestario !== '113');
      return lines.map((line, index) => {
        const vigente = Number(line.presupuestoVigente) || 0;
        const comprometido = Number(line.comprometidoPendiente) || 0;
        const pagado = Number(line.pagadoQueRebaja) || 0;
        const disponible = Number(line.disponibleReal) !== undefined ? Number(line.disponibleReal) : Math.max(0, vigente - pagado);
        const porcentajeComprometido = vigente > 0 ? Math.min(100, Math.round((comprometido / vigente) * 100)) : 0;
        
        // Compras asociadas
        const rCode = String(line.renglonPresupuestario || '').trim();
        const evCount = filteredPurchases.filter(p => String(p.renglonPresupuestario || '').trim() === rCode).length;

        return {
          id: line.id || `renglon-${rCode}`,
          nombre: `Renglón ${rCode} - ${line.nombreRenglon || ''}`,
          nombreCorto: `R-${rCode}`,
          grupo: line.grupoPresupuestario || '',
          presupuestoVigente: Math.round(vigente * 100) / 100,
          comprometido: Math.round(comprometido * 100) / 100,
          pagado: Math.round(pagado * 100) / 100,
          disponible: Math.round(disponible * 100) / 100,
          porcentajeComprometido,
          eventosCount: evCount,
          color: getDepartmentColor(line.nombreRenglon || rCode, index)
        };
      }).sort((a, b) => b.presupuestoVigente - a.presupuestoVigente);
    }

    if (comparativeGrouping === 'dependencia') {
      // 2. Agrupación por Dependencia Solicitante
      const depMap: Record<string, {
        nombre: string;
        nombreCorto: string;
        comprometido: number;
        pagado: number;
        totalMontoPurchases: number;
        eventosCount: number;
      }> = {};

      const depCat = catalogs.find(c => c.codigo === 'DEPENDENCIA_SOLICITANTE');
      if (depCat && depCat.items) {
        depCat.items.forEach(it => {
          if (it.activo) {
            depMap[it.valor] = {
              nombre: it.valor,
              nombreCorto: getShortDeptName(it.valor),
              comprometido: 0,
              pagado: 0,
              totalMontoPurchases: 0,
              eventosCount: 0
            };
          }
        });
      }

      filteredPurchases.forEach(p => {
        const depName = p.dependenciaSolicitante || p.areaSolicitante || 'Otras Dependencias';
        if (!depMap[depName]) {
          depMap[depName] = {
            nombre: depName,
            nombreCorto: getShortDeptName(depName),
            comprometido: 0,
            pagado: 0,
            totalMontoPurchases: 0,
            eventosCount: 0
          };
        }
        const m = Number(p.monto) || 0;
        depMap[depName].totalMontoPurchases += m;
        depMap[depName].eventosCount += 1;

        const isPaid = p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada';
        const affects = doesStatusAffectBudget(p.estatusEvento);

        if (isPaid) {
          depMap[depName].pagado += (Number(p.montoPagado) || m);
        } else if (affects) {
          depMap[depName].comprometido += m;
        }
      });

      return Object.values(depMap).map((dep, index) => {
        const base = DEPENDENCIA_BASE_BUDGETS[dep.nombre] || 850000;
        const totalUsed = dep.comprometido + dep.pagado;
        const presupuestoVigente = Math.round(Math.max(base, totalUsed > 0 ? totalUsed * 1.2 : 0) * 100) / 100;
        const disponible = Math.max(0, Math.round((presupuestoVigente - dep.comprometido - dep.pagado) * 100) / 100);
        const porcentajeComprometido = presupuestoVigente > 0 
          ? Math.min(100, Math.round((dep.comprometido / presupuestoVigente) * 100)) 
          : 0;

        return {
          id: `dep-${index}`,
          nombre: dep.nombre,
          nombreCorto: dep.nombreCorto,
          presupuestoVigente,
          comprometido: Math.round(dep.comprometido * 100) / 100,
          pagado: Math.round(dep.pagado * 100) / 100,
          disponible,
          porcentajeComprometido,
          eventosCount: dep.eventosCount,
          color: getDepartmentColor(dep.nombre, index)
        };
      }).sort((a, b) => b.presupuestoVigente - a.presupuestoVigente);
    }

    // 3. Agrupación por Centro de Costo / Departamento Solicitante (default)
    const deptMap: Record<string, {
      nombre: string;
      nombreCorto: string;
      comprometido: number;
      pagado: number;
      totalMontoPurchases: number;
      eventosCount: number;
    }> = {};

    const areaCat = catalogs.find(c => c.codigo === 'AREA_SOLICITANTE');
    if (areaCat && areaCat.items) {
      areaCat.items.forEach(it => {
        if (it.activo) {
          deptMap[it.valor] = {
            nombre: it.valor,
            nombreCorto: getShortDeptName(it.valor),
            comprometido: 0,
            pagado: 0,
            totalMontoPurchases: 0,
            eventosCount: 0
          };
        }
      });
    }

    filteredPurchases.forEach(p => {
      const deptName = p.areaSolicitante || p.dependenciaSolicitante || 'Otras Dependencias';
      if (!deptMap[deptName]) {
        deptMap[deptName] = {
          nombre: deptName,
          nombreCorto: getShortDeptName(deptName),
          comprometido: 0,
          pagado: 0,
          totalMontoPurchases: 0,
          eventosCount: 0
        };
      }
      const m = Number(p.monto) || 0;
      deptMap[deptName].totalMontoPurchases += m;
      deptMap[deptName].eventosCount += 1;

      const isPaid = p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada';
      const affects = doesStatusAffectBudget(p.estatusEvento);

      if (isPaid) {
        deptMap[deptName].pagado += (Number(p.montoPagado) || m);
      } else if (affects) {
        deptMap[deptName].comprometido += m;
      }
    });

    return Object.values(deptMap).map((dept, index) => {
      let base = 750000;
      for (const [key, val] of Object.entries(DEPARTMENT_BASE_BUDGETS)) {
        if (dept.nombre.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(dept.nombre.toLowerCase())) {
          base = val;
          break;
        }
      }
      const totalUsed = dept.comprometido + dept.pagado;
      const presupuestoVigente = Math.round(Math.max(base, totalUsed > 0 ? totalUsed * 1.25 : 0) * 100) / 100;
      const disponible = Math.max(0, Math.round((presupuestoVigente - dept.comprometido - dept.pagado) * 100) / 100);
      const porcentajeComprometido = presupuestoVigente > 0 
        ? Math.min(100, Math.round((dept.comprometido / presupuestoVigente) * 100)) 
        : 0;

      return {
        id: `dept-${index}`,
        nombre: dept.nombre,
        nombreCorto: dept.nombreCorto,
        presupuestoVigente,
        comprometido: Math.round(dept.comprometido * 100) / 100,
        pagado: Math.round(dept.pagado * 100) / 100,
        disponible,
        porcentajeComprometido,
        eventosCount: dept.eventosCount,
        color: getDepartmentColor(dept.nombre, index)
      };
    }).sort((a, b) => b.presupuestoVigente - a.presupuestoVigente);
  }, [filteredPurchases, comparativeGrouping, budgetAvailability, catalogs]);

  // Totales consolidados para el panel comparativo
  const comparativeTotals = useMemo(() => {
    let totalVigente = 0;
    let totalComprometido = 0;
    let totalPagado = 0;
    let totalDisponible = 0;
    let totalEventos = 0;

    comparativeChartData.forEach(item => {
      totalVigente += item.presupuestoVigente;
      totalComprometido += item.comprometido;
      totalPagado += item.pagado;
      totalDisponible += item.disponible;
      totalEventos += item.eventosCount;
    });

    const porcentajeComprometido = totalVigente > 0 
      ? Math.round((totalComprometido / totalVigente) * 1000) / 10 
      : 0;

    return {
      totalVigente,
      totalComprometido,
      totalPagado,
      totalDisponible,
      porcentajeComprometido,
      totalEventos
    };
  }, [comparativeChartData]);

  // Métricas Clave para los 3 Indicadores Principales
  const metrics = useMemo(() => {
    const totalEventos = filteredPurchases.length;
    const totalMonto = filteredPurchases.reduce((acc, p) => acc + (p.monto || 0), 0);

    // 1. Indicador de NOG adjudicados
    const adjudicados = filteredPurchases.filter(p => p.estatusEvento === 'Adjudicación');
    const adjudicadosCount = adjudicados.length;
    const adjudicadosMonto = adjudicados.reduce((acc, p) => acc + (p.monto || 0), 0);
    const adjudicadosPorcentaje = totalEventos > 0 ? Math.round((adjudicadosCount / totalEventos) * 100) : 0;

    // 2. Indicador de dictámenes técnicos por la GIT
    const dictamenesGIT = filteredPurchases.filter(p => p.evaluadoGIT === 'Sí');
    const dictamenesGITCount = dictamenesGIT.length;
    const dictamenesGITMonto = dictamenesGIT.reduce((acc, p) => acc + (p.monto || 0), 0);
    const dictamenesGITPorcentaje = totalEventos > 0 ? Math.round((dictamenesGITCount / totalEventos) * 100) : 0;

    // 3. Indicador de NOG en evaluación
    const enEvaluacion = filteredPurchases.filter(p => p.estatusEvento === 'Evaluación');
    const enEvaluacionCount = enEvaluacion.length;
    const enEvaluacionMonto = enEvaluacion.reduce((acc, p) => acc + (p.monto || 0), 0);
    const enEvaluacionPorcentaje = totalEventos > 0 ? Math.round((enEvaluacionCount / totalEventos) * 100) : 0;

    return {
      totalEventos,
      totalMonto,
      adjudicadosCount,
      adjudicadosMonto,
      adjudicadosPorcentaje,
      dictamenesGITCount,
      dictamenesGITMonto,
      dictamenesGITPorcentaje,
      enEvaluacionCount,
      enEvaluacionMonto,
      enEvaluacionPorcentaje,
    };
  }, [filteredPurchases]);

  // Datos calculados para Gráfica de Barras: Compras y Presupuesto por Departamento
  const departmentChartData = useMemo(() => {
    const deptMap: Record<string, { 
      departamento: string; 
      nombreCorto: string; 
      monto: number; 
      cantidad: number; 
      adjudicado: number; 
      enEvaluacion: number 
    }> = {};

    filteredPurchases.forEach(p => {
      const deptName = p.areaSolicitante || p.dependenciaSolicitante || 'Otras Dependencias';
      if (!deptMap[deptName]) {
        deptMap[deptName] = {
          departamento: deptName,
          nombreCorto: getShortDeptName(deptName),
          monto: 0,
          cantidad: 0,
          adjudicado: 0,
          enEvaluacion: 0,
        };
      }
      deptMap[deptName].monto += (p.monto || 0);
      deptMap[deptName].cantidad += 1;
      if (p.estatusEvento === 'Adjudicación') {
        deptMap[deptName].adjudicado += (p.monto || 0);
      } else if (p.estatusEvento === 'Evaluación') {
        deptMap[deptName].enEvaluacion += (p.monto || 0);
      }
    });

    return Object.values(deptMap)
      .sort((a, b) => b.monto - a.monto)
      .map((dept, index) => ({
        ...dept,
        color: getDepartmentColor(dept.departamento, index)
      }));
  }, [filteredPurchases]);

  // Datos calculados para Gráfica Circular: Estado Presupuestario
  const budgetStatusChartData = useMemo(() => {
    const statusConfig: Record<string, { name: string; color: string }> = {
      'Adjudicación': { name: 'Adjudicado', color: '#059669' },
      'Evaluación': { name: 'En Evaluación', color: '#d97706' },
      'Prescindido': { name: 'Prescindido', color: '#dc2626' },
      'Desierto': { name: 'Desierto', color: '#64748b' },
    };

    const statusTotals: Record<string, { name: string; monto: number; count: number; color: string }> = {
      'Adjudicación': { name: 'Adjudicado', monto: 0, count: 0, color: '#059669' },
      'Evaluación': { name: 'En Evaluación', monto: 0, count: 0, color: '#d97706' },
      'Prescindido': { name: 'Prescindido', monto: 0, count: 0, color: '#dc2626' },
      'Desierto': { name: 'Desierto', monto: 0, count: 0, color: '#64748b' },
    };

    let totalPresupuesto = 0;
    const totalCompras = filteredPurchases.length;

    filteredPurchases.forEach(p => {
      const statusKey = p.estatusEvento || 'Evaluación';
      if (!statusTotals[statusKey]) {
        statusTotals[statusKey] = {
          name: statusConfig[statusKey]?.name || statusKey,
          monto: 0,
          count: 0,
          color: statusConfig[statusKey]?.color || '#3b82f6',
        };
      }
      statusTotals[statusKey].monto += (p.monto || 0);
      statusTotals[statusKey].count += 1;
      totalPresupuesto += (p.monto || 0);
    });

    return Object.values(statusTotals)
      .filter(item => item.count > 0 || item.monto > 0)
      .map(item => ({
        ...item,
        percentage: totalPresupuesto > 0 ? ((item.monto / totalPresupuesto) * 100).toFixed(1) : '0',
        countPercentage: totalCompras > 0 ? ((item.count / totalCompras) * 100).toFixed(1) : '0',
        totalCompras,
        totalPresupuesto,
      }));
  }, [filteredPurchases]);

  // Métricas y desglose exclusivo para la unidad seleccionada al hacer clic en la gráfica de barras
  const selectedDeptData = useMemo(() => {
    if (!selectedDepartment) return null;

    const deptPurchases = filteredPurchases.filter(p => {
      const deptName = p.areaSolicitante || p.dependenciaSolicitante || 'Otras Dependencias';
      return deptName === selectedDepartment;
    });

    const totalEventos = deptPurchases.length;
    const totalMonto = deptPurchases.reduce((acc, p) => acc + (p.monto || 0), 0);

    // 1. NOG Adjudicados de esta unidad
    const adjudicados = deptPurchases.filter(p => p.estatusEvento === 'Adjudicación');
    const adjudicadosCount = adjudicados.length;
    const adjudicadosMonto = adjudicados.reduce((acc, p) => acc + (p.monto || 0), 0);
    const adjudicadosPorcentaje = totalEventos > 0 ? Math.round((adjudicadosCount / totalEventos) * 100) : 0;

    // 2. Dictámenes Técnicos GIT de esta unidad
    const dictamenesGIT = deptPurchases.filter(p => p.evaluadoGIT === 'Sí');
    const dictamenesGITCount = dictamenesGIT.length;
    const dictamenesGITMonto = dictamenesGIT.reduce((acc, p) => acc + (p.monto || 0), 0);
    const dictamenesGITPorcentaje = totalEventos > 0 ? Math.round((dictamenesGITCount / totalEventos) * 100) : 0;

    // 3. NOG en Evaluación de esta unidad
    const enEvaluacion = deptPurchases.filter(p => p.estatusEvento === 'Evaluación');
    const enEvaluacionCount = enEvaluacion.length;
    const enEvaluacionMonto = enEvaluacion.reduce((acc, p) => acc + (p.monto || 0), 0);
    const enEvaluacionPorcentaje = totalEventos > 0 ? Math.round((enEvaluacionCount / totalEventos) * 100) : 0;

    // 4. Estados de compra detallados para la gráfica individual de esta unidad
    const statusDefs: Record<string, { label: string; color: string }> = {
      'Adjudicación': { label: 'Adjudicado', color: '#059669' },
      'Evaluación': { label: 'En Evaluación', color: '#d97706' },
      'Prescindido': { label: 'Prescindido', color: '#dc2626' },
      'Desierto': { label: 'Desierto', color: '#64748b' },
    };

    const statusTotals: Record<string, { estado: string; label: string; cantidad: number; monto: number; color: string }> = {
      'Adjudicación': { estado: 'Adjudicación', label: 'Adjudicado', cantidad: 0, monto: 0, color: '#059669' },
      'Evaluación': { estado: 'Evaluación', label: 'En Evaluación', cantidad: 0, monto: 0, color: '#d97706' },
      'Prescindido': { estado: 'Prescindido', label: 'Prescindido', cantidad: 0, monto: 0, color: '#dc2626' },
      'Desierto': { estado: 'Desierto', label: 'Desierto', cantidad: 0, monto: 0, color: '#64748b' },
    };

    deptPurchases.forEach(p => {
      const st = p.estatusEvento || 'Evaluación';
      if (!statusTotals[st]) {
        statusTotals[st] = {
          estado: st,
          label: statusDefs[st]?.label || st,
          cantidad: 0,
          monto: 0,
          color: statusDefs[st]?.color || '#3b82f6',
        };
      }
      statusTotals[st].cantidad += 1;
      statusTotals[st].monto += (p.monto || 0);
    });

    const statusChartData = Object.values(statusTotals).map(item => ({
      ...item,
      porcentajeCantidad: totalEventos > 0 ? Math.round((item.cantidad / totalEventos) * 100) : 0,
      porcentajeMonto: totalMonto > 0 ? ((item.monto / totalMonto) * 100).toFixed(1) : '0',
    }));

    return {
      departamento: selectedDepartment,
      nombreCorto: getShortDeptName(selectedDepartment),
      color: getDepartmentColor(selectedDepartment, 0),
      totalEventos,
      totalMonto,
      adjudicadosCount,
      adjudicadosMonto,
      adjudicadosPorcentaje,
      dictamenesGITCount,
      dictamenesGITMonto,
      dictamenesGITPorcentaje,
      enEvaluacionCount,
      enEvaluacionMonto,
      enEvaluacionPorcentaje,
      statusChartData,
      purchases: deptPurchases,
    };
  }, [selectedDepartment, filteredPurchases]);

  // Filtrado reactivo para la Bitácora de Auditoría en el Dashboard
  const filteredDashboardLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchUser = log.usuario?.toLowerCase().includes(q);
        const matchDetalles = log.detalles?.toLowerCase().includes(q);
        const matchIp = log.ip?.includes(q);
        const matchModulo = log.modulo?.toLowerCase().includes(q);
        if (!matchUser && !matchDetalles && !matchIp && !matchModulo) return false;
      }
      if (auditActionFilter !== 'todos' && log.accion !== auditActionFilter) return false;
      return true;
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

  const handleExportCSV = () => {
    const rows = filteredPurchases.map(p => ({
      NOG: p.nog,
      'F56-e': p.f56e,
      F56: p.f56,
      'Descripción': p.descripcion,
      'Fecha Solicitud': p.fechaSolicitud,
      'Monto (GTQ)': p.monto,
      'Evaluado por el Área Técnica Correspondiente': p.evaluadoGIT,
      'Estatus': p.estatusEvento,
      'Categoría': p.categoriaTecnologica || 'N/A',
    }));
    exportToCSV(`Dashboard_Presupuesto_GIT_${new Date().toISOString().slice(0, 10)}`, rows);
    logAudit('EXPORTAR_DATOS', 'Dashboard', 'Exportación de adquisiciones desde el Panel Principal.');
  };

  const handleExportAuditCSV = () => {
    const rows = filteredDashboardLogs.map(l => ({
      ID: l.id,
      'Fecha y Hora': formatDateTime(l.fecha),
      Usuario: l.usuario,
      Rol: l.rol,
      Acción: l.accion,
      Módulo: l.modulo,
      Detalles: l.detalles,
      'ID Registro': l.registroId || 'N/A',
      'Dirección IP': l.ip,
    }));
    exportToCSV(`Bitacora_Auditoria_GIT_OJ_${new Date().toISOString().slice(0, 10)}`, rows);
    logAudit('EXPORTAR_DATOS', 'Auditoría', 'Exportación de bitácora de auditoría desde el Panel Principal.');
  };

  // Renderizador con realce y sombra suave para el sector activo de la gráfica circular
  const renderActivePieShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 6px 8px rgba(0, 0, 0, 0.35))' }}
        />
      </g>
    );
  };

  return (
    <div className="space-y-6">

      {/* Barra Superior con Control de Presupuesto Global, Filtros y Acciones */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1c39bb] animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Control de Presupuesto y Adquisiciones
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo en tiempo real de eventos NOG y formularios F56-e de la Gerencia de Informática
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Indicador Rápido de Presupuesto Global */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Presupuesto Global</span>
            <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">{formatQuetzales(metrics.totalMonto)}</span>
          </div>

          {/* Selector de Año */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Años</option>
              <option value="2026">Año 2026</option>
              <option value="2025">Año 2025</option>
              <option value="2024">Año 2024</option>
            </select>
          </div>

          {/* Botón Exportar CSV (Blanco con letras negras) */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>Exportar CSV</span>
          </button>

          {/* Botón Nueva Adquisición (Blanco con letras negras) */}
          {currentUser?.rol !== 'auditor' && (
            <button
              type="button"
              onClick={() => { setPurchaseToEdit(null); setIsPurchaseModalOpen(true); }}
              className={`px-4 py-2 rounded-xl ${themeConfig.primaryBtn} text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95`}
            >
              <PlusCircle className="w-4 h-4 text-black" />
              <span>+ Nueva Adquisición</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Paneles e Indicadores de Avance de Gran Visibilidad y Alto Contraste Profesional */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* PANEL 1: Indicador de NOG Adjudicados */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-emerald-500 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                    NOG Adjudicados
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Contrataciones Aprobadas
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-700 text-white shadow-xs">
                {metrics.adjudicadosPorcentaje}% del Total
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-black text-slate-950 tracking-tight font-mono">
                    {metrics.adjudicadosCount}
                  </span>
                  <span className="text-base font-bold text-slate-500">
                    / {metrics.totalEventos}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                  Eventos finalizados y adjudicados
                </p>
              </div>

              {/* Medidor Circular de Alto Contraste */}
              <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-200 fill-none"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-emerald-600 fill-none transition-all duration-700"
                    strokeDasharray={`${metrics.adjudicadosPorcentaje}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                    {metrics.adjudicadosPorcentaje}%
                  </span>
                  <span className="text-[9px] font-black text-emerald-800 uppercase tracking-tighter">
                    Tasa Éxito
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto Adjudicado</span>
            <span className="text-sm sm:text-base font-black font-mono text-emerald-400">
              {formatQuetzales(metrics.adjudicadosMonto)}
            </span>
          </div>
        </div>

        {/* PANEL 2: Indicador de Dictámenes Técnicos por la GIT */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-[#1c39bb] shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-[#1c39bb] border border-blue-300">
                  <ShieldCheck className="w-5 h-5 text-[#1c39bb]" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-blue-950 block">
                    Dictámenes Técnicos GIT
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Evaluación y Respaldo Técnico
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#1c39bb] text-white shadow-xs">
                {metrics.dictamenesGITPorcentaje}% Cobertura
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-black text-slate-950 tracking-tight font-mono">
                    {metrics.dictamenesGITCount}
                  </span>
                  <span className="text-base font-bold text-slate-500">
                    / {metrics.totalEventos}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                  Dictámenes emitidos y avalados por la GIT
                </p>
              </div>

              {/* Medidor Circular de Alto Contraste */}
              <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-200 fill-none"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-[#1c39bb] fill-none transition-all duration-700"
                    strokeDasharray={`${metrics.dictamenesGITPorcentaje}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
                    {metrics.dictamenesGITPorcentaje}%
                  </span>
                  <span className="text-[9px] font-black text-blue-800 uppercase tracking-tighter">
                    Con Dictamen
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto Dictaminado</span>
            <span className="text-sm sm:text-base font-black font-mono text-cyan-300">
              {formatQuetzales(metrics.dictamenesGITMonto)}
            </span>
          </div>
        </div>

        {/* PANEL 3: Indicador de NOG en Evaluación */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-amber-500 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950 block">
                    NOG en Evaluación
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Procesos en Trámite Activo
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-600 text-white shadow-xs">
                {metrics.enEvaluacionPorcentaje}% en Trámite
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-black text-slate-950 tracking-tight font-mono">
                    {metrics.enEvaluacionCount}
                  </span>
                  <span className="text-base font-bold text-slate-500">
                    / {metrics.totalEventos}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                  Plicas y ofertas en etapa de análisis técnico
                </p>
              </div>

              {/* Medidor Circular de Alto Contraste */}
              <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-slate-200 fill-none"
                    strokeWidth="3.8"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-amber-600 fill-none transition-all duration-700"
                    strokeDasharray={`${metrics.enEvaluacionPorcentaje}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
                    {metrics.enEvaluacionPorcentaje}%
                  </span>
                  <span className="text-[9px] font-black text-amber-800 uppercase tracking-tighter">
                    En Proceso
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto en Trámite</span>
            <span className="text-sm sm:text-base font-black font-mono text-amber-400">
              {formatQuetzales(metrics.enEvaluacionMonto)}
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* PANEL VISUAL: COMPARATIVA PRESUPUESTO VIGENTE VS COMPROMETIDO           */}
      {/* POR CADA CENTRO DE COSTO O DEPARTAMENTO (CON RECHARTS)                  */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
        
        {/* Encabezado del Panel: Título, Filtro de Agrupación y Vista */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1c39bb] border border-blue-200/80 shadow-2xs shrink-0">
              <Scale className="w-5 h-5 text-[#1c39bb]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Comparativa: Presupuesto Vigente vs. Comprometido</span>
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#1c39bb] border border-blue-200">
                  {comparativeChartData.length} {comparativeGrouping === 'renglon' ? 'renglones' : 'centros de costo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluación comparativa de techos presupuestarios vigentes y compromisos adquiridos en adquisiciones institucionales
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Selector de Agrupación / Dimensión */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setComparativeGrouping('departamento')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  comparativeGrouping === 'departamento'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Agrupar por Área Solicitante / Centro de Costo Operativo"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Departamentos</span>
              </button>
              <button
                type="button"
                onClick={() => setComparativeGrouping('dependencia')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  comparativeGrouping === 'dependencia'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Agrupar por Dependencia Solicitante Institucional"
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Dependencias</span>
              </button>
              <button
                type="button"
                onClick={() => setComparativeGrouping('renglon')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  comparativeGrouping === 'renglon'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Agrupar por Renglón Presupuestario Oficial (Centros de Costo Financieros)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Renglones</span>
              </button>
            </div>

            {/* Alternador de Modo: Gráfico vs Tabla */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setComparativeViewMode('grafico')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  comparativeViewMode === 'grafico'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ver Gráfico de Barras con Recharts"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gráfico</span>
              </button>
              <button
                type="button"
                onClick={() => setComparativeViewMode('tabla')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  comparativeViewMode === 'tabla'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ver Tabla Comparativa Detallada"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </button>
            </div>
          </div>
        </div>

        {/* Franja de Métricas Consolidadas: Resumen Ejecutivo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Total Presupuesto Vigente */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-[#1c39bb]" /> Presupuesto Vigente
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                Techo Total
              </span>
            </div>
            <div className="text-base sm:text-xl font-black font-mono text-slate-900">
              {formatQuetzales(comparativeTotals.totalVigente)}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Asignación oficial aprobada
            </span>
          </div>

          {/* Card 2: Total Comprometido */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-[#d97706]" /> Comprometido
              </span>
              <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                En Trámite
              </span>
            </div>
            <div className="text-base sm:text-xl font-black font-mono text-amber-950">
              {formatQuetzales(comparativeTotals.totalComprometido)}
            </div>
            <span className="text-[11px] text-amber-700/90 font-medium block mt-0.5">
              Procesos con reserva formal
            </span>
          </div>

          {/* Card 3: Tasa de Compromiso Global */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Percent className="w-3 h-3 text-slate-600" /> Tasa Compromiso
              </span>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">
                Global
              </span>
            </div>
            <div className="text-base sm:text-xl font-black font-mono text-slate-900 flex items-baseline gap-1.5">
              <span>{comparativeTotals.porcentajeComprometido}%</span>
              <span className="text-xs font-normal text-slate-400">del vigente</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, comparativeTotals.porcentajeComprometido)}%` }}
              />
            </div>
          </div>

          {/* Card 4: Saldo Disponible Remanente */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Saldo Disponible
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                Remanente
              </span>
            </div>
            <div className="text-base sm:text-xl font-black font-mono text-emerald-950">
              {formatQuetzales(comparativeTotals.totalDisponible)}
            </div>
            <span className="text-[11px] text-emerald-700/90 font-medium block mt-0.5">
              Capacidad para nuevas compras
            </span>
          </div>
        </div>

        {/* CONTENIDO DEL PANEL: MODO GRÁFICO O MODO TABLA */}
        {comparativeViewMode === 'grafico' ? (
          <div>
            {comparativeChartData.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-center">
                <Scale className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="text-xs font-medium">No se encontraron datos para la dimensión seleccionada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Contenedor del Gráfico de Barras con Recharts */}
                <div className="w-full h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparativeChartData}
                      margin={{ top: 20, right: 20, left: 10, bottom: 55 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length) {
                          const clickedItem = state.activePayload[0].payload;
                          if (comparativeGrouping !== 'renglon') {
                            setSelectedDepartment(prev => prev === clickedItem.nombre ? null : clickedItem.nombre);
                          }
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="nombreCorto"
                        tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                        interval={0}
                        angle={-22}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickFormatter={formatYAxisCurrency}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        width={75}
                      />
                      <Tooltip content={<CustomComparativeTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: 16 }}
                        content={() => (
                          <div className="flex items-center justify-end gap-5 text-xs font-bold pb-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 rounded-xs bg-[#1c39bb] shadow-xs" />
                              <span className="text-slate-700">Presupuesto Vigente (Q)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 rounded-xs bg-[#d97706] shadow-xs" />
                              <span className="text-slate-700">Presupuesto Comprometido (Q)</span>
                            </div>
                          </div>
                        )}
                      />
                      <Bar
                        dataKey="presupuestoVigente"
                        name="Presupuesto Vigente"
                        fill="#1c39bb"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={34}
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="comprometido"
                        name="Presupuesto Comprometido"
                        fill="#d97706"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={34}
                        cursor="pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Desglose rápido por Departamento / Renglón en la parte inferior del gráfico */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {comparativeChartData.slice(0, 8).map((item) => {
                      const isSelected = selectedDepartment === item.nombre;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (comparativeGrouping !== 'renglon') {
                              setSelectedDepartment(prev => prev === item.nombre ? null : item.nombre);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/40 shadow-xs'
                              : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
                          }`}
                          title={`Haga clic para ${isSelected ? 'quitar filtro' : 'filtrar por'} ${item.nombre}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                                style={{ backgroundColor: item.color }} 
                              />
                              <span className="font-bold text-slate-800 truncate" title={item.nombre}>
                                {item.nombreCorto}
                              </span>
                            </div>
                            <span className="font-bold font-mono text-[11px] text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded shrink-0">
                              {item.porcentajeComprometido}%
                            </span>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-slate-200/60 font-mono text-[11px]">
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="font-sans text-[10px] text-slate-400">Vigente:</span>
                              <span className="font-bold text-slate-900">{formatQuetzales(item.presupuestoVigente)}</span>
                            </div>
                            <div className="flex items-center justify-between text-amber-700">
                              <span className="font-sans text-[10px] text-amber-600">Comprometido:</span>
                              <span className="font-bold">{formatQuetzales(item.comprometido)}</span>
                            </div>
                          </div>

                          {/* Mini barra de compromiso */}
                          <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-2">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, item.porcentajeComprometido)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MODO TABLA COMPARATIVA */
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-3.5 py-3">
                    {comparativeGrouping === 'renglon' ? 'Renglón Presupuestario' : 'Centro de Costo / Departamento'}
                  </th>
                  <th className="px-3.5 py-3 text-right">Presupuesto Vigente (Q)</th>
                  <th className="px-3.5 py-3 text-right">Comprometido (Q)</th>
                  <th className="px-3.5 py-3 text-center">Tasa Compromiso</th>
                  <th className="px-3.5 py-3 text-right">Pagado (Q)</th>
                  <th className="px-3.5 py-3 text-right">Saldo Disponible (Q)</th>
                  <th className="px-3.5 py-3 text-center">Eventos</th>
                  {comparativeGrouping !== 'renglon' && (
                    <th className="px-3.5 py-3 text-center">Acción</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparativeChartData.map((row) => {
                  const isSelected = selectedDepartment === row.nombre;
                  return (
                    <tr 
                      key={row.id} 
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-3.5 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                            style={{ backgroundColor: row.color }} 
                          />
                          <div>
                            <span className="font-bold text-slate-800 block">{row.nombre}</span>
                            {row.grupo && (
                              <span className="text-[10px] text-slate-400 block">{row.grupo}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatQuetzales(row.presupuestoVigente)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                        {formatQuetzales(row.comprometido)}
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            {row.porcentajeComprometido}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-purple-700 whitespace-nowrap">
                        {formatQuetzales(row.pagado)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {formatQuetzales(row.disponible)}
                      </td>
                      <td className="px-3.5 py-3 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {row.eventosCount}
                      </td>
                      {comparativeGrouping !== 'renglon' && (
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedDepartment(prev => prev === row.nombre ? null : row.nombre)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                          >
                            {isSelected ? 'Filtrado' : 'Analizar'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="px-3.5 py-3 text-slate-300 uppercase tracking-wider">
                    Total Institucional Consolidado
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-cyan-300">
                    {formatQuetzales(comparativeTotals.totalVigente)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-amber-300">
                    {formatQuetzales(comparativeTotals.totalComprometido)}
                  </td>
                  <td className="px-3.5 py-3 text-center font-mono text-amber-300">
                    {comparativeTotals.porcentajeComprometido}%
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-purple-300">
                    {formatQuetzales(comparativeTotals.totalPagado)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-emerald-400">
                    {formatQuetzales(comparativeTotals.totalDisponible)}
                  </td>
                  <td className="px-3.5 py-3 text-center font-mono text-slate-200">
                    {comparativeTotals.totalEventos}
                  </td>
                  {comparativeGrouping !== 'renglon' && (
                    <td className="px-3.5 py-3 text-center">—</td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      </div>

      {/* SECCIÓN ANALÍTICA CON RECHARTS: GRÁFICAS DE BARRAS Y CIRCULARES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* GRÁFICA DE BARRAS: Compras y Presupuesto por Departamento (7 columnas en escritorio) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-[#1c39bb] border border-blue-100">
                  <BarChart3 className="w-5 h-5 text-[#1c39bb]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>Compras por Departamento</span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {departmentChartData.length} dependencias
                    </span>
                    {selectedDepartment && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1c39bb] border border-blue-200 animate-pulse">
                        Área activa
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Haga clic en cualquier barra o etiqueta para ver el análisis individualizado
                  </p>
                </div>
              </div>

              {/* Selector de Métrica: Monto (Q) vs Cantidad & Botón Limpiar Selección */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {selectedDepartment && (
                  <button
                    type="button"
                    onClick={() => setSelectedDepartment(null)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="Restablecer vista general"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Ver Todas</span>
                  </button>
                )}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBarMetric('monto')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      barMetric === 'monto'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monto (Q)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarMetric('cantidad')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      barMetric === 'cantidad'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cantidad
                  </button>
                </div>
              </div>
            </div>

            {/* Contenedor del Gráfico de Barras con Evento onClick interactivo */}
            <div className="pt-4">
              {departmentChartData.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-center">
                  <Building2 className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                  <p className="text-xs font-medium">No se encontraron compras en el período seleccionado.</p>
                </div>
              ) : (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={departmentChartData}
                      margin={{ top: 15, right: 15, left: 5, bottom: 45 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length) {
                          const clickedDept = state.activePayload[0].payload.departamento;
                          setSelectedDepartment(prev => prev === clickedDept ? null : clickedDept);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="nombreCorto"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                        interval={0}
                        angle={-22}
                        textAnchor="end"
                        height={55}
                      />
                      <YAxis
                        tickFormatter={barMetric === 'monto' ? formatYAxisCurrency : (val) => `${val}`}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        width={barMetric === 'monto' ? 70 : 35}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar
                        dataKey={barMetric === 'monto' ? 'monto' : 'cantidad'}
                        name={barMetric === 'monto' ? 'Presupuesto Solicitado (Q)' : 'Eventos Registrados'}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        cursor="pointer"
                      >
                        {departmentChartData.map((entry, index) => {
                          const isSelected = selectedDepartment === entry.departamento;
                          const hasSelection = Boolean(selectedDepartment);
                          return (
                            <Cell 
                              key={`bar-cell-${entry.departamento}-${index}`} 
                              fill={entry.color}
                              opacity={hasSelection ? (isSelected ? 1 : 0.35) : 1}
                              stroke={isSelected ? '#0f172a' : 'transparent'}
                              strokeWidth={isSelected ? 3 : 0}
                              className="cursor-pointer transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDepartment(prev => prev === entry.departamento ? null : entry.departamento);
                              }}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chips interactivos de colores por Departamento */}
            {departmentChartData.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
                {departmentChartData.map((dept) => {
                  const isSelected = selectedDepartment === dept.departamento;
                  return (
                    <button
                      type="button"
                      key={`legend-chip-${dept.departamento}`}
                      onClick={() => setSelectedDepartment(prev => prev === dept.departamento ? null : dept.departamento)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-sm ring-2 ring-blue-500 font-bold'
                          : 'bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100'
                      }`}
                      title={`Haga clic para ver el análisis individual de ${dept.departamento}`}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                        style={{ backgroundColor: dept.color }} 
                      />
                      <span className="truncate max-w-[130px] sm:max-w-none">{dept.nombreCorto}</span>
                      {isSelected && (
                        <span className="ml-0.5 text-[10px] text-blue-300">✕</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desglose de Principales Áreas (interactivas al hacer clic) */}
          {departmentChartData.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {departmentChartData.slice(0, 3).map((dept, idx) => {
                const isSelected = selectedDepartment === dept.departamento;
                return (
                  <button 
                    type="button"
                    key={dept.departamento}
                    onClick={() => setSelectedDepartment(prev => prev === dept.departamento ? null : dept.departamento)}
                    className={`text-left rounded-xl p-2.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/40 shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                    }`}
                    title={`Ver análisis de ${dept.departamento}`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-600 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                          style={{ backgroundColor: dept.color }} 
                        />
                        <span className="truncate" title={dept.departamento}>#{idx + 1} {dept.nombreCorto}</span>
                      </div>
                      <span className="font-mono text-slate-800 shrink-0">{dept.cantidad} ev.</span>
                    </div>
                    <div 
                      className="text-xs font-black font-mono"
                      style={{ color: dept.color }}
                    >
                      {formatQuetzales(dept.monto)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* GRÁFICA CIRCULAR: Estado Presupuestario (5 columnas en escritorio) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                  <PieChartIcon className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Estado Presupuestario
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pase el ratón sobre cada sector para ver porcentaje exacto y compras
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {formatQuetzales(metrics.totalMonto)}
                </span>
              </div>
            </div>

            {/* Contenedor del Donut Chart con Indicador Central y Realce Interactivo */}
            <div className="pt-3">
              {budgetStatusChartData.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-center">
                  <PieChartIcon className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                  <p className="text-xs font-medium">Sin datos presupuestarios para el filtro actual.</p>
                </div>
              ) : (
                <div className="relative w-full h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={budgetStatusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={3}
                        dataKey="monto"
                        activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                        activeShape={renderActivePieShape}
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                        cursor="pointer"
                      >
                        {budgetStatusChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${entry.name}-${index}`} 
                            fill={entry.color} 
                            stroke="#ffffff" 
                            strokeWidth={2} 
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} wrapperStyle={{ outline: 'none', zIndex: 100 }} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Resumen en el Centro del Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adjudicación</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                      {metrics.adjudicadosPorcentaje}%
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600">
                      Tasa Efectiva
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leyenda y Desglose Financiero Institucional */}
          <div className="mt-3 pt-3.5 border-t border-slate-100 space-y-2">
            {budgetStatusChartData.map((status, index) => {
              const isHovered = activePieIndex === index;
              return (
                <div 
                  key={status.name}
                  onMouseEnter={() => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all text-xs cursor-pointer ${
                    isHovered 
                      ? 'bg-slate-100 border-slate-300 shadow-2xs' 
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs" 
                      style={{ backgroundColor: status.color }} 
                    />
                    <div className="truncate">
                      <span className="font-bold text-slate-800 block truncate">{status.name}</span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {status.count} proceso(s) · {status.countPercentage}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-mono font-bold text-slate-900 text-[11px] sm:text-xs">
                        {formatQuetzales(status.monto)}
                      </span>
                      <span 
                        className="px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                        style={{ backgroundColor: status.color }}
                      >
                        {status.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* PANEL DE ANÁLISIS INDIVIDUAL POR UNIDAD SOLICITANTE */}
      {selectedDeptData && (
        <div id="panel-analisis-unidad" className="bg-white border-2 border-[#1c39bb]/70 rounded-2xl p-5 sm:p-7 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-3 duration-250">
          
          {/* Encabezado del Panel Individual con Identidad del Área y Acciones */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-start sm:items-center gap-3">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                style={{ backgroundColor: selectedDeptData.color }}
              >
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#1c39bb] border border-blue-200">
                    Análisis Individual por Dependencia
                  </span>
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: selectedDeptData.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    {selectedDeptData.nombreCorto}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {selectedDeptData.departamento}
                </h3>
                <p className="text-xs text-slate-500">
                  Desglose de estados y métricas de desempeño técnico exclusivo para esta unidad solicitante
                </p>
              </div>
            </div>

            {/* Resumen Global de la Unidad y Botón para Cerrar */}
            <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Presupuesto del Área
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {formatQuetzales(selectedDeptData.totalMonto)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Eventos
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {selectedDeptData.totalEventos}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDepartment(null)}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300"
                title="Cerrar vista individual y volver a la vista general"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Análisis</span>
              </button>
            </div>
          </div>

          {/* LAS 3 GRÁFICAS / PANELES DE LA UNIDAD — FORMATO IDÉNTICO A LOS 3 PANELES PRINCIPALES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* PANEL INDIVIDUAL 1: NOG Adjudicados en la Unidad */}
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                        NOG Adjudicados
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {selectedDeptData.nombreCorto}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-700 text-white shadow-xs">
                    {selectedDeptData.adjudicadosPorcentaje}% del Área
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-slate-950 tracking-tight font-mono">
                        {selectedDeptData.adjudicadosCount}
                      </span>
                      <span className="text-base font-bold text-slate-500">
                        / {selectedDeptData.totalEventos}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                      Eventos adjudicados en esta área
                    </p>
                  </div>

                  {/* Medidor Circular de Alto Contraste */}
                  <div className="relative w-22 h-22 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="stroke-slate-200 fill-none"
                        strokeWidth="3.8"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="stroke-emerald-600 fill-none transition-all duration-700"
                        strokeDasharray={`${selectedDeptData.adjudicadosPorcentaje}, 100`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-emerald-950 font-mono">
                        {selectedDeptData.adjudicadosPorcentaje}%
                      </span>
                      <span className="text-[9px] font-black text-emerald-800 uppercase tracking-tighter">
                        Tasa Éxito
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto Adjudicado</span>
                <span className="text-sm font-black font-mono text-emerald-400">
                  {formatQuetzales(selectedDeptData.adjudicadosMonto)}
                </span>
              </div>
            </div>

            {/* PANEL INDIVIDUAL 2: Dictámenes Técnicos GIT en la Unidad */}
            <div className="bg-white p-6 rounded-2xl border-2 border-[#1c39bb] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-[#1c39bb] border border-blue-300">
                      <ShieldCheck className="w-5 h-5 text-[#1c39bb]" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-blue-950 block">
                        Dictámenes GIT
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {selectedDeptData.nombreCorto}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#1c39bb] text-white shadow-xs">
                    {selectedDeptData.dictamenesGITPorcentaje}% Cobertura
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-slate-950 tracking-tight font-mono">
                        {selectedDeptData.dictamenesGITCount}
                      </span>
                      <span className="text-base font-bold text-slate-500">
                        / {selectedDeptData.totalEventos}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                      Dictámenes emitidos para esta área
                    </p>
                  </div>

                  {/* Medidor Circular de Alto Contraste */}
                  <div className="relative w-22 h-22 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="stroke-slate-200 fill-none"
                        strokeWidth="3.8"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="stroke-[#1c39bb] fill-none transition-all duration-700"
                        strokeDasharray={`${selectedDeptData.dictamenesGITPorcentaje}, 100`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-blue-950 font-mono">
                        {selectedDeptData.dictamenesGITPorcentaje}%
                      </span>
                      <span className="text-[9px] font-black text-blue-800 uppercase tracking-tighter">
                        Con Dictamen
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto Dictaminado</span>
                <span className="text-sm font-black font-mono text-cyan-300">
                  {formatQuetzales(selectedDeptData.dictamenesGITMonto)}
                </span>
              </div>
            </div>

            {/* PANEL INDIVIDUAL 3: NOG en Evaluación en la Unidad */}
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-amber-950 block">
                        NOG en Evaluación
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {selectedDeptData.nombreCorto}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-600 text-white shadow-xs">
                    {selectedDeptData.enEvaluacionPorcentaje}% en Trámite
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-slate-950 tracking-tight font-mono">
                        {selectedDeptData.enEvaluacionCount}
                      </span>
                      <span className="text-base font-bold text-slate-500">
                        / {selectedDeptData.totalEventos}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 mt-1.5 leading-snug">
                      Ofertas en análisis técnico activo
                    </p>
                  </div>

                  {/* Medidor Circular de Alto Contraste */}
                  <div className="relative w-22 h-22 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="stroke-slate-200 fill-none"
                        strokeWidth="3.8"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="stroke-amber-600 fill-none transition-all duration-700"
                        strokeDasharray={`${selectedDeptData.enEvaluacionPorcentaje}, 100`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-amber-950 font-mono">
                        {selectedDeptData.enEvaluacionPorcentaje}%
                      </span>
                      <span className="text-[9px] font-black text-amber-800 uppercase tracking-tighter">
                        En Trámite
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto en Trámite</span>
                <span className="text-sm font-black font-mono text-amber-400">
                  {formatQuetzales(selectedDeptData.enEvaluacionMonto)}
                </span>
              </div>
            </div>

          </div>

          {/* GRÁFICA DE ESTADOS EN QUE SE ENCUENTRAN LAS COMPRAS DE ESTA UNIDAD */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-[#1c39bb]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Estados de las Adquisiciones en {selectedDeptData.nombreCorto}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Distribución de procesos por estatus legal y técnico con montos asociados
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {selectedDeptData.purchases.length} compras encontradas
                </span>
              </div>
            </div>

            {/* Tarjetas de Resumen de los Estados de esta Unidad */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {selectedDeptData.statusChartData.map((st) => (
                <div 
                  key={st.estado}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-700">{st.label}</span>
                    <span 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: st.color }} 
                    />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {st.cantidad}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      ({st.porcentajeCantidad}%)
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold mt-1" style={{ color: st.color }}>
                    {formatQuetzales(st.monto)}
                  </div>
                </div>
              ))}
            </div>

            {/* Gráfica de Barras de Estados para la Unidad */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={selectedDeptData.statusChartData}
                    margin={{ top: 10, right: 15, left: 5, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      tickFormatter={formatYAxisCurrency}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      width={65}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
                              <p className="font-bold mb-1 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                <span>{d.label}</span>
                              </p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-3 text-slate-300">
                                  <span>Cantidad:</span>
                                  <span className="font-bold text-white">{d.cantidad} proceso(s) ({d.porcentajeCantidad}%)</span>
                                </div>
                                <div className="flex justify-between gap-3 text-slate-300">
                                  <span>Monto:</span>
                                  <span className="font-mono font-bold text-emerald-400">{formatQuetzales(d.monto)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="monto"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={55}
                    >
                      {selectedDeptData.statusChartData.map((entry) => (
                        <Cell key={`cell-unit-status-${entry.estado}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla Compacta de las Compras de esta Unidad con acceso a la Ficha Oficial */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Listado de Procesos Registrados en {selectedDeptData.nombreCorto}</span>
              </h5>
              <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">NOG / F56-e</th>
                      <th className="p-2.5">Descripción</th>
                      <th className="p-2.5">Modalidad LCE</th>
                      <th className="p-2.5">Dictamen GIT</th>
                      <th className="p-2.5">Estatus</th>
                      <th className="p-2.5 text-right">Monto</th>
                      <th className="p-2.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDeptData.purchases.map((p) => {
                      const mod = getModalidadCompraByMonto(p.monto);
                      return (
                        <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 block">{p.nog}</span>
                            <span className="text-[10px] text-slate-500 font-mono">F56-e: {p.f56e}</span>
                          </td>
                          <td className="p-2.5 max-w-xs truncate text-slate-700" title={p.descripcion}>
                            {p.descripcion}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${mod.badgeClass}`}>
                              {mod.nombre}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            {p.evaluadoGIT === 'Sí' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#1c39bb]" /> Sí
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">No</span>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              STATUS_BADGE_CLASSES[p.estatusEvento] || 'bg-slate-100 text-slate-700'
                            }`}>
                              {p.estatusEvento}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                            {formatQuetzales(p.monto)}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedPurchase(p)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1c39bb] font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer border border-blue-200"
                              title="Ver ficha oficial de adquisición"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ficha</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Sección 1: Control de Adquisiciones Recientes (Full-Width, Professional Contrast) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-sm">
                  Control de Adquisiciones Recientes
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredPurchases.length} registradas
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Últimos procesos registrados y gestionados en el sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('compras')}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Ver Listado Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase sticky top-0 border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">NOG</th>
                <th className="px-4 py-3">Formularios</th>
                <th className="px-4 py-3">Descripción del Proceso</th>
                <th className="px-4 py-3">Monto (Q)</th>
                <th className="px-4 py-3">Estatus Evento</th>
                <th className="px-4 py-3 text-center">Dictamen GIT</th>
                <th className="px-4 py-3">Fecha Solicitud</th>
                <th className="px-3 py-3 text-center">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron adquisiciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredPurchases.slice(0, 6).map((p) => {
                  const badgeClass = STATUS_BADGE_CLASSES[p.estatusEvento] || 'bg-slate-100 text-slate-700';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {p.nog}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {p.f56e || p.f56 || '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="font-medium text-slate-800 truncate" title={p.descripcion}>
                          {p.descripcion}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap font-mono">
                        {formatQuetzales(p.monto)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${badgeClass}`}>
                          {p.estatusEvento}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.evaluadoGIT === 'Sí'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.evaluadoGIT === 'Sí' ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : null}
                          {p.evaluadoGIT === 'Sí' ? 'Con Dictamen' : 'Sin Dictamen'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDate(p.fechaSolicitud)}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedPurchase(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Ver Ficha Técnica Completa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 2: Bitácora y Registro de Auditoría Institucional con Mayor Visibilidad (Exclusivo para Administrador y Auditor) */}
      {canViewAudit && (
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Encabezado Principal de Auditoría */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <History className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Bitácora y Registro Oficial de Auditoría
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 font-mono">
                  {auditLogs.length} Registros Inmutables
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Tiempo Real
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Trazabilidad inmutable de todas las operaciones, modificaciones de adquisiciones, transacciones y accesos al sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportAuditCSV}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-black" />
              <span>Exportar Bitácora CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('auditoria')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver Módulo Completo</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtrado de la Bitácora */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Buscar en bitácora por usuario, detalle, módulo o dirección IP..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-700"
            >
              <option value="todos">Todas las Acciones ({auditLogs.length})</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CREAR_COMPRA">CREAR COMPRA</option>
              <option value="EDITAR_COMPRA">EDITAR COMPRA</option>
              <option value="CAMBIO_ESTATUS">CAMBIO ESTATUS</option>
              <option value="ELIMINAR_COMPRA">ELIMINAR COMPRA</option>
              <option value="CREAR_CATALOGO">CATÁLOGOS</option>
              <option value="CREAR_USUARIO">USUARIOS</option>
            </select>
            {auditSearch || auditActionFilter !== 'todos' ? (
              <button
                type="button"
                onClick={() => { setAuditSearch(''); setAuditActionFilter('todos'); }}
                className="px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl whitespace-nowrap cursor-pointer hover:bg-slate-100"
                title="Limpiar filtros"
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </div>

        {/* Tabla de Bitácora de Alto Impacto Visual */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">Fecha y Hora</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Usuario Responsable</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Acción Ejecutada</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Módulo</th>
                <th className="px-4 py-3.5">Detalles de la Operación Realizada</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Terminal / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs bg-white">
              {filteredDashboardLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No se encontraron registros de auditoría que coincidan con los filtros de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredDashboardLogs.slice(0, 8).map((log) => {
                  const actionStyle = ACTION_BADGE_STYLES[log.accion] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-800',
                    border: 'border-slate-200'
                  };

                  return (
                    <tr key={log.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* Fecha y Hora */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] font-bold text-slate-700">
                        {formatDateTime(log.fecha)}
                      </td>

                      {/* Usuario */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                            {log.usuario ? log.usuario.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {log.usuario}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">
                              {log.rol || 'Operador'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}>
                          {log.accion}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.modulo}
                        </span>
                      </td>

                      {/* Detalles */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800 leading-snug break-words max-w-xl">
                          {log.detalles}
                        </p>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {log.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de Tabla con Resumen y Acceso Directo */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span className="font-medium">
            Mostrando <strong>{Math.min(filteredDashboardLogs.length, 8)}</strong> de <strong>{filteredDashboardLogs.length}</strong> eventos registrados
            {filteredDashboardLogs.length !== auditLogs.length && ` (filtrado de ${auditLogs.length} en total)`}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('auditoria')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Ver historial completo e inmutable en el Módulo de Auditoría</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
      )}

    </div>
  );
};
