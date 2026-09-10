import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  OFFICIAL_BUDGET_GROUPS, 
  OFFICIAL_RENGLONES, 
  OFFICIAL_ESTATUS_COMPRA, 
  OFFICIAL_MODALIDADES_COMPRA, 
  OfficialRenglon,
  getGrupoFullName 
} from '../../data/budgetStandardCatalog';
import { BudgetLineItem } from '../../types';
import { formatQuetzales } from '../../utils/formatters';
import { 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  PlusCircle, 
  Edit3, 
  Search, 
  ShieldCheck, 
  FileText, 
  Tag, 
  ArrowRightLeft,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Plus,
  Zap,
  Building2
} from 'lucide-react';

interface BudgetOfficialCatalogViewProps {
  onOpenLineModal: (lineToEdit?: BudgetLineItem | null, prefillRenglon?: OfficialRenglon) => void;
  onNavigateToMatrix: (renglonFilter?: string) => void;
}

export const BudgetOfficialCatalogView: React.FC<BudgetOfficialCatalogViewProps> = ({
  onOpenLineModal,
  onNavigateToMatrix
}) => {
  const { budgetAvailability, addBudgetLine, currentUser } = useApp();
  const isAdmin = currentUser?.rol === 'administrador';
  const canEditBudget = isAdmin || currentUser?.rol === 'operador_compras' || currentUser?.rol === 'usuario_estandar' || Boolean(currentUser);

  const [selectedGroupTab, setSelectedGroupTab] = useState<'all' | '100' | '200' | '300'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  // Map of currently registered budget lines by renglon code
  const registeredLinesMap = new Map<string, BudgetLineItem>();
  budgetAvailability.forEach(line => {
    registeredLinesMap.set(String(line.renglonPresupuestario).trim(), line);
  });

  // Extract any additional institutional lines that exist in the budget but were not in standard 39
  const officialCodesSet = new Set(OFFICIAL_RENGLONES.map(r => String(r.renglon).trim()));
  const customLines: (OfficialRenglon & { isOfficial: boolean })[] = budgetAvailability
    .filter(line => !officialCodesSet.has(String(line.renglonPresupuestario).trim()))
    .map(line => {
      let grp: '100' | '200' | '300' = '100';
      const r = String(line.renglonPresupuestario || '').trim();
      if (line.grupoPresupuestario.includes('200') || r.startsWith('2')) grp = '200';
      else if (line.grupoPresupuestario.includes('300') || r.startsWith('3')) grp = '300';
      return {
        grupo: grp,
        renglon: r,
        nombreRenglon: line.nombreRenglon,
        descripcionDefecto: 'Renglón institucional registrado',
        isOfficial: false
      };
    });

  const combinedCatalog: (OfficialRenglon & { isOfficial: boolean })[] = [
    ...OFFICIAL_RENGLONES.map(r => ({ ...r, isOfficial: true })),
    ...customLines
  ];

  // Filter renglones
  const filteredRenglones = combinedCatalog.filter(item => {
    const matchesGroup = selectedGroupTab === 'all' || item.grupo === selectedGroupTab;
    const matchesSearch = searchTerm === '' ||
      item.renglon.includes(searchTerm) ||
      item.nombreRenglon.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getGrupoFullName(item.grupo).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  // Count active per group
  const groupStats = {
    '100': {
      total: combinedCatalog.filter(r => r.grupo === '100').length,
      active: combinedCatalog.filter(r => r.grupo === '100' && registeredLinesMap.has(r.renglon)).length
    },
    '200': {
      total: combinedCatalog.filter(r => r.grupo === '200').length,
      active: combinedCatalog.filter(r => r.grupo === '200' && registeredLinesMap.has(r.renglon)).length
    },
    '300': {
      total: combinedCatalog.filter(r => r.grupo === '300').length,
      active: combinedCatalog.filter(r => r.grupo === '300' && registeredLinesMap.has(r.renglon)).length
    }
  };

  // Quick activate single official renglon
  const handleQuickActivate = (item: OfficialRenglon) => {
    addBudgetLine({
      grupoPresupuestario: getGrupoFullName(item.grupo),
      renglonPresupuestario: item.renglon,
      nombreRenglon: item.nombreRenglon,
      presupuestoInicial: 0,
      modificacionesAprobadas: 0,
      presupuestoVigente: 0,
      pagadoQueRebaja: 0,
      disponibleReal: 0,
      comprometidoPendiente: 0,
      disponibleProyectado: 0,
      porcentajeUsadoComprometido: 0,
      estatusDisponibilidad: 'Sin Presupuesto',
      ejercicioFiscal: 2026,
      observaciones: 'Activado desde el Catálogo Presupuestario Oficial.'
    });

    setBulkSuccessMsg(`Renglón ${item.renglon} - ${item.nombreRenglon} agregado exitosamente a la matriz.`);
    setTimeout(() => setBulkSuccessMsg(null), 3500);
  };

  // Bulk add all missing official lines with zero budget so the matrix has all 39 rows
  const handleBulkAddAllMissing = () => {
    let addedCount = 0;
    OFFICIAL_RENGLONES.forEach(item => {
      if (!registeredLinesMap.has(item.renglon)) {
        addBudgetLine({
          grupoPresupuestario: getGrupoFullName(item.grupo),
          renglonPresupuestario: item.renglon,
          nombreRenglon: item.nombreRenglon,
          presupuestoInicial: 0,
          modificacionesAprobadas: 0,
          presupuestoVigente: 0,
          pagadoQueRebaja: 0,
          disponibleReal: 0,
          comprometidoPendiente: 0,
          disponibleProyectado: 0,
          porcentajeUsadoComprometido: 0,
          estatusDisponibilidad: 'Sin Presupuesto',
          ejercicioFiscal: 2026,
          observaciones: 'Incorporado desde Catálogo Oficial Estándar de la Gerencia de Informática.'
        });
        addedCount++;
      }
    });

    setBulkSuccessMsg(`Se incorporaron ${addedCount} renglones oficiales a la matriz presupuestaria.`);
    setTimeout(() => setBulkSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner de Presentación del Catálogo Oficial */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Catálogo Presupuestario Oficial — Gerencia de Informática
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {combinedCatalog.length} Renglones Registrados
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl">
            Estructura estandarizada de Grupos (100, 200, 300), catálogo de partidas institucionales y registro directo de nuevos renglones presupuestarios sin depender únicamente de archivos Excel.
          </p>
        </div>

        {/* Acciones del Banner */}
        <div className="flex flex-wrap items-center gap-2">
          {canEditBudget && (
            <button
              id="btn-agregar-renglon-catalogo-banner"
              type="button"
              onClick={() => onOpenLineModal(null, undefined)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              title="Registrar manualmente un nuevo renglón presupuestario en la matriz y el catálogo"
            >
              <PlusCircle className="w-4 h-4 text-emerald-100" />
              <span>+ Agregar Renglón</span>
            </button>
          )}

          {canEditBudget && (
            <button
              type="button"
              onClick={handleBulkAddAllMissing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              title="Asegura que todos los renglones del catálogo oficial aparezcan en la Matriz Presupuestaria"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Cargar 39 Renglones a Matriz</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowRulesModal(!showRulesModal)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{showRulesModal ? 'Ocultar Normativa' : 'Ver Normas y Modalidades'}</span>
          </button>
        </div>
      </div>

      {bulkSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{bulkSuccessMsg}</span>
        </div>
      )}

      {/* Panel Desplegable de Normativa Institucional (Image 2, 3 & 6) */}
      {showRulesModal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
          
          {/* Col 1: Modalidades de Compra */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Tag className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Modalidades de Compra (5 Órdenes)
              </h4>
            </div>
            <div className="space-y-2">
              {OFFICIAL_MODALIDADES_COMPRA.map(m => (
                <div key={m.order} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    {m.order}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">{m.modalidad}</div>
                    <div className="text-[11px] text-slate-500">{m.descripcion}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Estatus del Evento y Afectación Presupuestaria */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Estatus de Compra y Afectación
              </h4>
            </div>
            <div className="space-y-1.5">
              {OFFICIAL_ESTATUS_COMPRA.map(st => (
                <div key={st.estatus} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{st.estatus}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    st.afectaDisponibilidad
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-200 text-slate-700 border border-slate-300'
                  }`}>
                    Afecta: {st.afectaDisponibilidad ? 'Sí' : 'No'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 3: Tipos de Modificación y Grupos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ArrowRightLeft className="w-4 h-4 text-purple-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Modificaciones y Grupos
              </h4>
            </div>
            
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs">
                <div className="font-bold text-emerald-950 flex items-center justify-between">
                  <span>Incremento (Ampliación)</span>
                  <span className="font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded text-[11px] font-bold">Signo: +1</span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-1">Aumenta el presupuesto vigente del renglón asignado.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-xs">
                <div className="font-bold text-rose-950 flex items-center justify-between">
                  <span>Disminución</span>
                  <span className="font-mono bg-rose-200 text-rose-900 px-2 py-0.5 rounded text-[11px] font-bold">Signo: -1</span>
                </div>
                <p className="text-[11px] text-rose-800 mt-1">Rebaja el presupuesto vigente del renglón asignado.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs">
                <div className="font-bold text-blue-950 flex items-center justify-between">
                  <span>Transferencia</span>
                  <span className="font-mono bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-[11px] font-bold">Signo: ±</span>
                </div>
                <p className="text-[11px] text-blue-800 mt-1">Rebaja del renglón origen (-1) e incrementa en destino (+1).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen por Grupo Presupuestario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {OFFICIAL_BUDGET_GROUPS.map(grp => {
          const stats = groupStats[grp.grupo as '100' | '200' | '300'];
          const isSelected = selectedGroupTab === grp.grupo;
          return (
            <div
              key={grp.grupo}
              onClick={() => setSelectedGroupTab(isSelected ? 'all' : (grp.grupo as '100' | '200' | '300'))}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 tracking-tight">
                  Grupo {grp.grupo}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {stats ? stats.active : 0} / {stats ? stats.total : 0} Activos
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1 line-clamp-1 font-medium">
                {grp.nombre}
              </div>
              
              {/* Barra de progreso de activación */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${(stats.active / stats.total) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedGroupTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedGroupTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Todos ({combinedCatalog.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroupTab('100')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedGroupTab === '100'
                ? 'bg-blue-800 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Grupo 100 ({groupStats['100'].total})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroupTab('200')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedGroupTab === '200'
                ? 'bg-blue-800 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Grupo 200 ({groupStats['200'].total})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroupTab('300')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedGroupTab === '300'
                ? 'bg-blue-800 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Grupo 300 ({groupStats['300'].total})
          </button>
        </div>

        {/* Input de Búsqueda y Botón Nuevo Renglón */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar renglón o descripción..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {canEditBudget && (
            <button
              id="btn-agregar-renglon-catalogo-toolbar"
              type="button"
              onClick={() => onOpenLineModal(null, undefined)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
              title="Registrar nuevo renglón presupuestario"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Renglón</span>
            </button>
          )}
        </div>
      </div>

      {/* Cuadrícula de Renglones Oficiales e Institucionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredRenglones.map((item) => {
          const registered = registeredLinesMap.get(item.renglon);
          const isRegistered = !!registered;

          return (
            <div
              key={item.renglon}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isRegistered
                  ? 'bg-white border-slate-200 hover:border-blue-300 shadow-2xs'
                  : 'bg-slate-50/60 border-dashed border-slate-300 hover:border-slate-400'
              }`}
            >
              <div>
                {/* Header de tarjeta de renglón */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
                      {item.renglon}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Grupo {item.grupo}
                    </span>
                    {item.isOfficial ? (
                      <span className="text-[9px] uppercase font-bold text-slate-400">
                        Oficial
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        Institucional
                      </span>
                    )}
                  </div>

                  {isRegistered ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Activo en Matriz
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      No registrado
                    </span>
                  )}
                </div>

                {/* Nombre del Renglón (Editable) */}
                <h4 className="text-xs font-bold text-slate-900 mt-2.5 line-clamp-2" title={item.nombreRenglon}>
                  {registered ? registered.nombreRenglon : item.nombreRenglon}
                </h4>

                {/* Datos Presupuestarios si está activo */}
                {registered ? (
                  <div className="grid grid-cols-3 gap-1.5 mt-3 p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Vigente</div>
                      <div className="text-[11px] font-bold text-slate-800 font-mono">
                        {formatQuetzales(registered.presupuestoVigente)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Pagado</div>
                      <div className="text-[11px] font-bold text-slate-800 font-mono">
                        {formatQuetzales(registered.pagadoQueRebaja)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Disponible</div>
                      <div className={`text-[11px] font-black font-mono ${
                        registered.disponibleReal > 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {formatQuetzales(registered.disponibleReal)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                    {item.descripcionDefecto || 'Disponible en el catálogo institucional para asignación y control de compras.'}
                  </p>
                )}
              </div>

              {/* Botonera de acciones por tarjeta */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {isRegistered ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onNavigateToMatrix(item.renglon)}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver en Matriz</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {canEditBudget && (
                      <button
                        type="button"
                        onClick={() => onOpenLineModal(registered)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar renglón presupuestario"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => onOpenLineModal(null, item)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                      title="Configurar presupuesto inicial y registrar"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Activar en Matriz</span>
                    </button>
                    {canEditBudget && (
                      <button
                        type="button"
                        onClick={() => handleQuickActivate(item)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 transition-colors cursor-pointer"
                        title="Activar rápido en la matriz con Q 0.00"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Estado vacío cuando no hay coincidencias en la búsqueda */}
        {filteredRenglones.length === 0 && (
          <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              No se encontró el renglón {searchTerm ? `"${searchTerm}"` : ''} en el catálogo
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Puede crear y registrar este renglón presupuestario directamente en el catálogo y la matriz con su código, denominación y presupuesto inicial.
            </p>
            {canEditBudget && (
              <button
                type="button"
                onClick={() => onOpenLineModal(null, {
                  grupo: searchTerm.startsWith('2') ? '200' : searchTerm.startsWith('3') ? '300' : '100',
                  renglon: searchTerm.trim(),
                  nombreRenglon: ''
                })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-blue-200" />
                <span>+ Registrar Renglón Presupuestario {searchTerm ? `"${searchTerm}"` : ''}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
