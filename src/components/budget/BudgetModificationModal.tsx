import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BudgetModification, BudgetModificationType, BudgetModificationState } from '../../types';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  FileText, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface BudgetModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  modificationToEdit?: BudgetModification | null;
}

export const BudgetModificationModal: React.FC<BudgetModificationModalProps> = ({
  isOpen,
  onClose,
  modificationToEdit
}) => {
  const { 
    budgetLines, 
    addBudgetModification, 
    updateBudgetModification, 
    currentUser 
  } = useApp();

  const [tipo, setTipo] = useState<BudgetModificationType>('ampliacion');
  const [renglonDestino, setRenglonDestino] = useState('');
  const [renglonOrigen, setRenglonOrigen] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [noResolucion, setNoResolucion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState<BudgetModificationState>('aprobada');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (modificationToEdit) {
      setTipo(modificationToEdit.tipo);
      setRenglonDestino(modificationToEdit.renglonPresupuestario);
      setRenglonOrigen(modificationToEdit.renglonOrigenPresupuestario || '');
      setMonto(modificationToEdit.monto.toString());
      setFecha(modificationToEdit.fecha);
      setNoResolucion(modificationToEdit.noResolucion);
      setDescripcion(modificationToEdit.descripcion);
      setEstado(modificationToEdit.estado);
    } else {
      setTipo('ampliacion');
      if (budgetLines.length > 0) {
        setRenglonDestino(budgetLines[0].renglonPresupuestario);
        setRenglonOrigen(budgetLines.length > 1 ? budgetLines[1].renglonPresupuestario : '');
      } else {
        setRenglonDestino('');
        setRenglonOrigen('');
      }
      setMonto('');
      setFecha(new Date().toISOString().slice(0, 10));
      setNoResolucion('');
      setDescripcion('');
      setEstado('aprobada');
    }
    setErrorMsg(null);
  }, [modificationToEdit, isOpen, budgetLines]);

  if (!isOpen) return null;

  const targetLine = budgetLines.find(l => l.renglonPresupuestario === renglonDestino);
  const sourceLine = budgetLines.find(l => l.renglonPresupuestario === renglonOrigen);
  const parsedMonto = parseFloat(monto) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!renglonDestino) {
      setErrorMsg('Debe seleccionar el renglón presupuestario a modificar.');
      return;
    }

    if (tipo === 'transferencia' && !renglonOrigen) {
      setErrorMsg('Para una transferencia intrainstitucional debe seleccionar el renglón presupuestario de origen.');
      return;
    }

    if (tipo === 'transferencia' && renglonDestino === renglonOrigen) {
      setErrorMsg('El renglón de origen y el renglón de destino no pueden ser el mismo.');
      return;
    }

    if (parsedMonto <= 0) {
      setErrorMsg('El monto de la modificación presupuestaria debe ser un valor positivo mayor a cero.');
      return;
    }

    if (tipo === 'transferencia' && sourceLine && sourceLine.disponibleReal < parsedMonto) {
      setErrorMsg(`El renglón de origen (${sourceLine.renglonPresupuestario}) solo tiene un Disponible Real de Q. ${sourceLine.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}. No se puede transferir un monto superior.`);
      return;
    }

    if (tipo === 'disminucion' && targetLine && targetLine.disponibleReal < parsedMonto) {
      setErrorMsg(`El renglón (${targetLine.renglonPresupuestario}) solo dispone de Q. ${targetLine.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 })} en Disponible Real. La disminución no puede sobrepasar este saldo.`);
      return;
    }

    if (modificationToEdit) {
      updateBudgetModification(modificationToEdit.id, {
        tipo,
        renglonPresupuestario: renglonDestino,
        nombreRenglon: targetLine?.nombreRenglon || `Renglón ${renglonDestino}`,
        grupoPresupuestario: targetLine?.grupoPresupuestario || '',
        renglonOrigenPresupuestario: tipo === 'transferencia' ? renglonOrigen : undefined,
        nombreRenglonOrigen: tipo === 'transferencia' ? sourceLine?.nombreRenglon : undefined,
        monto: parsedMonto,
        fecha,
        noResolucion,
        descripcion,
        estado,
        fechaAprobacion: estado === 'aprobada' ? (modificationToEdit.fechaAprobacion || fecha) : undefined,
        aprobadoPor: estado === 'aprobada' ? (modificationToEdit.aprobadoPor || currentUser?.nombreCompleto || 'Dirección Financiera DAF') : undefined
      });
    } else {
      addBudgetModification({
        tipo,
        renglonPresupuestario: renglonDestino,
        nombreRenglon: targetLine?.nombreRenglon || `Renglón ${renglonDestino}`,
        grupoPresupuestario: targetLine?.grupoPresupuestario || '',
        renglonOrigenPresupuestario: tipo === 'transferencia' ? renglonOrigen : undefined,
        nombreRenglonOrigen: tipo === 'transferencia' ? sourceLine?.nombreRenglon : undefined,
        monto: parsedMonto,
        fecha,
        noResolucion: noResolucion || 'Resolución DAF-OJ-2026-S/N',
        descripcion: descripcion || `Modificación presupuestaria tipo ${tipo} para el ejercicio fiscal 2026.`,
        estado,
        fechaAprobacion: estado === 'aprobada' ? fecha : undefined,
        aprobadoPor: estado === 'aprobada' ? (currentUser?.nombreCompleto || 'Dirección Financiera DAF') : undefined
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {modificationToEdit ? 'Editar Modificación Presupuestaria' : 'Nueva Modificación Presupuestaria'}
              </h3>
              <p className="text-xs text-slate-400">
                Afecta automáticamente las disponibilidades y el presupuesto vigente de Informática.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* Selector de Tipo de Modificación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Tipo de Modificación Presupuestaria *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTipo('ampliacion')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  tipo === 'ampliacion'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 mb-1">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Incremento (+1)</span>
                <span className="text-[10px] text-slate-500">Ampliación presupuestaria</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('disminucion')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  tipo === 'disminucion'
                    ? 'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-red-100 text-red-700 mb-1">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Disminución (-1)</span>
                <span className="text-[10px] text-slate-500">Recorte presupuestario</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('transferencia')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  tipo === 'transferencia'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 mb-1">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Transferencia (±)</span>
                <span className="text-[10px] text-slate-500">Intrainstitucional</span>
              </button>
            </div>
          </div>

          {/* Si es transferencia: Renglón Origen */}
          {tipo === 'transferencia' && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-blue-950">
                Renglón de Origen (Rebaja Fondos) *
              </label>
              <select
                value={renglonOrigen}
                onChange={(e) => setRenglonOrigen(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Seleccione el renglón de origen...</option>
                {budgetLines.map(line => (
                  <option key={line.id} value={line.renglonPresupuestario}>
                    Renglón {line.renglonPresupuestario} - {line.nombreRenglon} (Disp. Real: Q. {line.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 })})
                  </option>
                ))}
              </select>
              {sourceLine && (
                <div className="text-[11px] text-blue-800 flex justify-between">
                  <span>Grupo: <strong>{sourceLine.grupoPresupuestario}</strong></span>
                  <span>Disponible Real Actual: <strong>Q. {sourceLine.disponibleReal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Renglón Destino / Renglón Afectado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {tipo === 'transferencia' ? 'Renglón de Destino (Recibe Fondos) *' : 'Renglón Presupuestario Afectado *'}
            </label>
            <select
              value={renglonDestino}
              onChange={(e) => setRenglonDestino(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Seleccione el renglón afectado...</option>
              {budgetLines.map(line => (
                <option key={line.id} value={line.renglonPresupuestario}>
                  Renglón {line.renglonPresupuestario} - {line.nombreRenglon} (Vigente: Q. {line.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
            {targetLine && (
              <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                <span>Grupo: <strong>{targetLine.grupoPresupuestario}</strong></span>
                <span>Vigente Actual: <strong>Q. {targetLine.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong></span>
              </div>
            )}
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monto de la Modificación (Q.) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                  Q.
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha de la Modificación *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* No. de Resolución y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No. de Resolución / Acuerdo DAF *
              </label>
              <input
                type="text"
                value={noResolucion}
                onChange={(e) => setNoResolucion(e.target.value)}
                placeholder="Ej. Resolución DAF-OJ-2026-042"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estado de la Modificación *
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as BudgetModificationState)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="aprobada">Aprobada (Afecta Disponibilidad Inmediata)</option>
                <option value="en_tramite">En Trámite (Expediente en Gestión DAF)</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>
          </div>

          {/* Justificación / Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Justificación y Descripción Técnica *
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Explique el motivo del ajuste presupuestario para la Gerencia de Informática..."
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-normal focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Previsualización del Impacto */}
          {targetLine && parsedMonto > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Impacto Calculado en Disponibilidad:
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                {tipo === 'ampliacion' && (
                  <p>
                    El renglón <strong>{targetLine.renglonPresupuestario}</strong> incrementará su Presupuesto Vigente de{' '}
                    <span className="font-mono">Q. {targetLine.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span> a{' '}
                    <span className="font-mono font-bold text-emerald-700">Q. {(targetLine.presupuestoVigente + parsedMonto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>.
                  </p>
                )}
                {tipo === 'disminucion' && (
                  <p>
                    El renglón <strong>{targetLine.renglonPresupuestario}</strong> rebajará su Presupuesto Vigente de{' '}
                    <span className="font-mono">Q. {targetLine.presupuestoVigente.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span> a{' '}
                    <span className="font-mono font-bold text-red-700">Q. {(targetLine.presupuestoVigente - parsedMonto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>.
                  </p>
                )}
                {tipo === 'transferencia' && sourceLine && (
                  <p>
                    Se transferirán <strong className="font-mono">Q. {parsedMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong> desde el renglón{' '}
                    <strong>{sourceLine.renglonPresupuestario}</strong> hacia el renglón <strong>{targetLine.renglonPresupuestario}</strong>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Mensaje de error si hubiere */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botones */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              {modificationToEdit ? 'Guardar Cambios' : 'Registrar Modificación'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
