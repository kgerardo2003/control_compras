import React from 'react';
import { PurchaseRecord } from '../types';
import { formatQuetzales, formatDate, formatDateTime, getModalidadCompraByMonto } from '../utils/formatters';
import { Printer, X } from 'lucide-react';
import { OJLogo } from './OJLogo';
import { getPurchaseTimeline } from '../utils/timelineUtils';

interface InstitutionalReportModalProps {
  purchase: PurchaseRecord;
  onClose: () => void;
}

export const InstitutionalReportModal: React.FC<InstitutionalReportModalProps> = ({ purchase, onClose }) => {
  const modalidadLCE = getModalidadCompraByMonto(purchase.monto);
  const timelineEvents = getPurchaseTimeline(purchase);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        
        {/* Barra de Acciones Superior (No Imprimible) */}
        <div className="bg-slate-900 p-3 sm:p-4 text-white flex items-center justify-between print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-xs sm:text-sm">Boleta Oficial de Control F56-e</span>
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
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento Institucional Imprimible */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 text-xs font-sans print:p-0 print:overflow-visible">
          
          {/* Membrete Oficial */}
          <div className="border-b border-slate-300 pb-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OJLogo size="md" variant="full" lightMode={true} />
            </div>

            <div className="text-right border-l-2 border-amber-500 pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Formulario Control</span>
              <span className="text-sm font-mono font-bold text-slate-900 block">{purchase.f56e}</span>
              <span className="text-[10px] font-mono text-slate-500 block">F56: {purchase.f56}</span>
            </div>
          </div>

          {/* Título del Documento */}
          <div className="text-center my-4 bg-slate-50 py-2 border-y border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
              DICTAMEN Y HOJA DE CONTROL DE ADQUISICIÓN TECNOLÓGICA
            </h2>
            <p className="text-[10px] text-slate-400 italic mt-0.5">
              Conforme a la Ley de Contrataciones del Estado y Normativa Interna
            </p>
          </div>

          {/* Bloque 1: Datos Generales y NOG */}
          <div className="space-y-4 my-5">
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">NOG Guatecompras:</td>
                  <td className="border border-slate-300 p-2 font-mono font-bold text-slate-900 w-1/4">{purchase.nog}</td>
                  <td className="border border-slate-300 p-2 font-bold w-1/4 text-slate-700">Estatus del Evento:</td>
                  <td className="border border-slate-300 p-2 font-bold w-1/4 uppercase text-slate-900">{purchase.estatusEvento}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Formulario F56-e:</td>
                  <td className="border border-slate-300 p-2 font-mono font-semibold">{purchase.f56e}</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Formulario F56 Físico:</td>
                  <td className="border border-slate-300 p-2 font-mono font-semibold">
                    {purchase.f56}
                    {purchase.f56Documento && (
                      <span className="ml-2 text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block">
                        Doc Adjunto: {purchase.f56Documento.nombre}
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Monto Estimado / Adjudicado:</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900 font-mono text-sm">{formatQuetzales(purchase.monto)}</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Evaluado por el Área Técnica Correspondiente:</td>
                  <td className="border border-slate-300 p-2 font-bold">
                    {purchase.evaluadoGIT === 'Sí' 
                      ? `SÍ (Dictamen Favorable${purchase.fechaDictamenGIT ? ` - Fecha: ${formatDate(purchase.fechaDictamenGIT)}` : ''}${purchase.fechaElaboracionOficioGIT ? ` - Oficio GIT: ${formatDate(purchase.fechaElaboracionOficioGIT)}` : ''})` 
                      : 'NO'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Modalidad de Compra (LCE):</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900" colSpan={3}>
                    <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded font-bold mr-2 text-slate-900">
                      {modalidadLCE.nombre}
                    </span>
                    <span className="text-slate-700 font-normal">
                      ({modalidadLCE.descripcionRango} — {modalidadLCE.fundamentoLegal})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Área Solicitante:</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900" colSpan={3}>{purchase.areaSolicitante || 'Soporte técnico'}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Dependencia Solicitante:</td>
                  <td className="border border-slate-300 p-2" colSpan={3}>{purchase.dependenciaSolicitante || 'Gerencia de Informática'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold text-slate-700">Categoría Tecnológica:</td>
                  <td className="border border-slate-300 p-2" colSpan={3}>{purchase.categoriaTecnologica || 'Equipo Informático'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bloque 2: Descripción Técnica */}
          <div className="my-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
              Descripción y Justificación Técnica del Requerimiento:
            </h3>
            <div className="p-3 border border-slate-300 rounded bg-slate-50/50 leading-relaxed text-justify">
              {purchase.descripcion}
            </div>
          </div>

          {/* Bloque 3: Cronología Institucional */}
          <div className="my-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
              Cronograma y Fechas del Proceso:
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs text-center">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-300 p-2">Fecha Solicitud</th>
                  <th className="border border-slate-300 p-2">Fecha Vo.Bo.</th>
                  <th className="border border-slate-300 p-2">Fecha Autorizado</th>
                  <th className="border border-slate-300 p-2">Fecha Publicación</th>
                  <th className="border border-slate-300 p-2">Fecha Ofertas</th>
                  <th className="border border-slate-300 p-2">Postores</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2">{formatDate(purchase.fechaSolicitud)}</td>
                  <td className="border border-slate-300 p-2">{formatDate(purchase.fechaVoBo)}</td>
                  <td className="border border-slate-300 p-2">{formatDate(purchase.fechaAutorizado)}</td>
                  <td className="border border-slate-300 p-2">{formatDate(purchase.fechaPublicacion)}</td>
                  <td className="border border-slate-300 p-2">{formatDate(purchase.fechaOfertas)}</td>
                  <td className="border border-slate-300 p-2 font-bold">{purchase.cantidadOfertas}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bloque: Tracking y Línea de Tiempo del Estatus del Evento */}
          {timelineEvents.length > 0 && (
            <div className="my-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                Línea de Tiempo y Tracking del Estatus del Evento:
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead className="bg-slate-100 font-bold text-center">
                  <tr>
                    <th className="border border-slate-300 p-1.5 w-24">Fecha</th>
                    <th className="border border-slate-300 p-1.5 text-left">Hito / Estatus</th>
                    <th className="border border-slate-300 p-1.5 text-left">Fase</th>
                    <th className="border border-slate-300 p-1.5 text-left">Responsable / Unidad</th>
                    <th className="border border-slate-300 p-1.5">No. Documento / Ref.</th>
                    <th className="border border-slate-300 p-1.5">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {timelineEvents.map((evt, idx) => (
                    <tr key={evt.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px] whitespace-nowrap">
                        {formatDate(evt.fecha)}
                        {evt.hora && <span className="block text-[10px] text-slate-400 font-normal">{evt.hora}</span>}
                      </td>
                      <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">
                        {evt.titulo}
                        {evt.observaciones && (
                          <span className="block font-normal text-[10px] text-slate-500 mt-0.5">
                            {evt.observaciones}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700 text-[11px]">
                        {evt.fase || 'Gestión'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700 text-[11px]">
                        {evt.responsable || 'GIT'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px]">
                        {evt.documentoReferencia || '—'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center text-[10px] font-bold">
                        <span className={`px-1.5 py-0.5 rounded ${
                          evt.estado === 'completado' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : evt.estado === 'en_proceso' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {evt.estado === 'completado' ? 'Completado' : evt.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bloque 4: Proveedor y Observaciones */}
          {purchase.proveedorAdjudicado && (
            <div className="my-4 p-3 border border-slate-300 bg-slate-50/50 rounded">
              <strong className="text-slate-900">Proveedor Adjudicado: </strong>
              <span className="text-slate-800">{purchase.proveedorAdjudicado}</span>
            </div>
          )}

          {purchase.observaciones && (
            <div className="my-4 p-3 border border-slate-300 rounded bg-slate-50/50">
              <strong className="text-slate-700">Observaciones Técnicas: </strong>
              <span className="text-slate-800">{purchase.observaciones}</span>
            </div>
          )}

          {/* Bloque 5: Firmas y Sellos Oficiales */}
          <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-[11px]">
            <div>
              <div className="border-b border-slate-400 mb-2 h-14" />
              <p className="font-bold text-slate-800">Elaborado por:</p>
              <p className="text-slate-600">{purchase.creadoPor}</p>
              <p className="text-[10px] text-slate-400">Analista de Adquisiciones GIT</p>
            </div>

            <div>
              <div className="border-b border-slate-400 mb-2 h-14" />
              <p className="font-bold text-slate-800">Visto Bueno (Vo.Bo.):</p>
              <p className="text-slate-600">Subgerencia de Informática</p>
              <p className="text-[10px] text-slate-400">Dictamen Técnico Aprobado</p>
            </div>

            <div>
              <div className="border-b border-slate-400 mb-2 h-14" />
              <p className="font-bold text-slate-800">Autorizado por:</p>
              <p className="text-slate-600">Gerente de Informática</p>
              <p className="text-[10px] text-slate-400">Organismo Judicial de Guatemala</p>
            </div>
          </div>

          <div className="mt-8 text-center text-[9px] text-slate-400">
            Documento emitido el {formatDateTime(new Date().toISOString())} a través del Sistema de Control de Compras GIT - Organismo Judicial.
          </div>

        </div>

      </div>
    </div>
  );
};
