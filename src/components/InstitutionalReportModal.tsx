import React, { useMemo } from 'react';
import { PurchaseRecord, PurchaseObservationEntry } from '../types';
import { formatQuetzales, formatDate, formatDateTime, getModalidadCompraByMonto } from '../utils/formatters';
import { Printer, X, MessageSquare, ArrowDownUp } from 'lucide-react';
import { OJLogo } from './OJLogo';

interface InstitutionalReportModalProps {
  purchase: PurchaseRecord;
  onClose: () => void;
}

export const InstitutionalReportModal: React.FC<InstitutionalReportModalProps> = ({ purchase, onClose }) => {
  const modalidadLCE = getModalidadCompraByMonto(purchase.monto);

  const handlePrint = () => {
    window.print();
  };

  // Obtener y ordenar las observaciones ingresadas en la ficha cronológicamente: del más reciente al más antiguo
  const sortedObservations: PurchaseObservationEntry[] = useMemo(() => {
    if (purchase.observacionesList && purchase.observacionesList.length > 0) {
      return [...purchase.observacionesList].sort((a, b) => {
        const timeA = a.fechaHora 
          ? new Date(a.fechaHora).getTime() 
          : new Date(`${a.fecha || '1970-01-01'}T${a.hora || '00:00:00'}`).getTime();
        const timeB = b.fechaHora 
          ? new Date(b.fechaHora).getTime() 
          : new Date(`${b.fecha || '1970-01-01'}T${b.hora || '00:00:00'}`).getTime();
        return timeB - timeA; // Del más reciente al más antiguo
      });
    } else if (purchase.observaciones && purchase.observaciones.trim()) {
      return [{
        id: 'obs-general',
        fechaHora: purchase.fechaCreacion || new Date().toISOString(),
        fecha: purchase.fechaRecepcion || purchase.fechaSolicitud || (purchase.fechaCreacion ? purchase.fechaCreacion.slice(0, 10) : ''),
        hora: purchase.fechaCreacion ? purchase.fechaCreacion.slice(11, 16) : '',
        usuario: purchase.creadoPor || 'Operador',
        rol: 'Registrador',
        comentario: purchase.observaciones.trim()
      }];
    }
    return [];
  }, [purchase]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:my-0">
        
        {/* Barra de Acciones Superior (No Imprimible) */}
        <div className="bg-slate-900 p-3 sm:p-4 text-white flex items-center justify-between print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-xs sm:text-sm">Boleta Oficial: Hoja de Control de Adquisiciones Compras</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-black" />
              <span>Imprimir Boleta</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento Institucional Imprimible */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 text-xs font-sans print:p-4 print:overflow-visible">
          
          {/* Membrete Oficial */}
          <div className="border-b border-slate-300 pb-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OJLogo size="md" variant="full" lightMode={true} />
            </div>

            <div className="text-right border-l-2 border-amber-500 pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Formulario Control</span>
              <span className="text-sm font-mono font-bold text-slate-900 block">{purchase.f56e}</span>
              {purchase.f56 && (
                <span className="text-[10px] font-mono text-slate-500 block">F56 Físico: {purchase.f56}</span>
              )}
            </div>
          </div>

          {/* Título del Documento */}
          <div className="text-center my-4 bg-slate-50 py-2.5 border-y border-slate-300">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
              HOJA DE CONTROL DE ADQUISICIONES COMPRAS
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Organismo Judicial de Guatemala • Control Interno de Expedientes de Adquisición
            </p>
          </div>

          {/* Bloque 1: Datos Generales y NOG */}
          <div className="my-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
              Datos Generales del Expediente:
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr className="bg-slate-50/70">
                  <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">NOG Guatecompras:</td>
                  <td className="border border-slate-300 p-2 font-mono font-bold text-slate-900 w-1/4">
                    {purchase.nog || 'Sin NOG'}
                  </td>
                  <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">Estatus del Evento:</td>
                  <td className="border border-slate-300 p-2 font-bold w-1/4 uppercase text-slate-900">
                    {purchase.estatusEvento}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Formulario F56-e:</td>
                  <td className="border border-slate-300 p-2 font-mono font-semibold text-slate-900">
                    {purchase.f56e}
                  </td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Formulario F56 Físico:</td>
                  <td className="border border-slate-300 p-2 font-mono font-semibold">
                    {purchase.f56 || 'No registrado'}
                    {purchase.f56Documento && (
                      <span className="ml-2 text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block">
                        Doc: {purchase.f56Documento.nombre}
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="bg-slate-50/70">
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Monto Estimado / Adjudicado:</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900 font-mono text-sm">
                    {formatQuetzales(purchase.monto)}
                  </td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Modalidad de Compra (LCE):</td>
                  <td className="border border-slate-300 p-2 text-slate-900 font-medium">
                    <span className="font-bold">{modalidadLCE.nombre}</span>
                    <span className="text-[11px] text-slate-600 block">({modalidadLCE.fundamentoLegal})</span>
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Dependencia Solicitante:</td>
                  <td className="border border-slate-300 p-2 text-slate-900 font-medium" colSpan={purchase.proveedorAdjudicado ? 1 : 3}>
                    {purchase.dependenciaSolicitante || purchase.areaSolicitante || 'Departamento de Compras'}
                  </td>
                  {purchase.proveedorAdjudicado && (
                    <>
                      <td className="border border-slate-300 p-2 font-bold text-slate-700">Proveedor Adjudicado:</td>
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">
                        {purchase.proveedorAdjudicado}
                      </td>
                    </>
                  )}
                </tr>
                <tr className="bg-slate-50/70">
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Fecha de Recepción:</td>
                  <td className="border border-slate-300 p-2 font-mono font-medium">
                    {formatDate(purchase.fechaRecepcion || purchase.fechaSolicitud)}
                  </td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Registrado por:</td>
                  <td className="border border-slate-300 p-2 font-medium text-slate-800">
                    {purchase.creadoPor || 'Operador de Compras'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bloque 2: Descripción del Requerimiento */}
          <div className="my-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
              Descripción del Requerimiento / Adquisición:
            </h3>
            <div className="p-3 border border-slate-300 rounded bg-slate-50/50 leading-relaxed text-justify text-slate-800">
              {purchase.descripcion}
            </div>
          </div>

          {/* Bloque 3: Detalle de Observaciones de la Ficha (Cronológico del más reciente al más antiguo) */}
          <div className="my-6">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1.5 mb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600 print:hidden" />
                <span>Detalle de Observaciones y Hoja de Ruta</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                <ArrowDownUp className="w-3 h-3 text-amber-700 print:hidden" />
                <span>Orden: Del más reciente al más antiguo ({sortedObservations.length} {sortedObservations.length === 1 ? 'registro' : 'registros'})</span>
              </span>
            </div>

            {sortedObservations.length > 0 ? (
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead className="bg-slate-100 font-bold text-slate-800">
                  <tr>
                    <th className="border border-slate-300 p-2 text-center w-12">No.</th>
                    <th className="border border-slate-300 p-2 text-center w-36">Fecha y Hora</th>
                    <th className="border border-slate-300 p-2 text-left w-48">Usuario / Responsable</th>
                    <th className="border border-slate-300 p-2 text-left">Observación / Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedObservations.map((obs, idx) => {
                    const numItem = sortedObservations.length - idx;
                    return (
                      <tr key={obs.id || idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} break-inside-avoid`}>
                        <td className="border border-slate-300 p-2.5 text-center font-mono font-bold text-slate-700 align-top">
                          #{numItem}
                        </td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono text-[11px] text-slate-800 align-top whitespace-nowrap">
                          <span className="font-semibold block">{formatDate(obs.fecha)}</span>
                          {obs.hora && <span className="text-[10px] text-slate-500 font-sans block">{obs.hora} hrs</span>}
                        </td>
                        <td className="border border-slate-300 p-2.5 text-slate-900 align-top">
                          <span className="font-bold block">{obs.usuario}</span>
                          {obs.rol && (
                            <span className="text-[10px] text-slate-500 font-medium block">
                              Rol: {obs.rol}
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2.5 text-slate-800 leading-relaxed text-justify align-top whitespace-pre-wrap font-normal">
                          {obs.comentario}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-4 border border-dashed border-slate-300 rounded bg-slate-50 text-center text-slate-500 italic">
                No se han registrado observaciones en la hoja de ruta de esta adquisición.
              </div>
            )}
          </div>

          {/* Pie de Página Oficial (Sin bloque de firmas según instrucción del usuario) */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
            Documento emitido el {formatDateTime(new Date().toISOString())} a través del Sistema de Control de Compras - Organismo Judicial de Guatemala.
          </div>

        </div>

      </div>
    </div>
  );
};
