import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Database, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Lock, 
  PlusCircle
} from 'lucide-react';

export const CatalogsView: React.FC = () => {
  const { 
    catalogs, 
    addCatalog, 
    addCatalogItem, 
    updateCatalogItem, 
    deleteCatalogItem,
    currentUser 
  } = useApp();

  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(catalogs[0]?.id || '');
  
  // Modal para Nuevo Catálogo
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
  const [newCatNombre, setNewCatNombre] = useState('');
  const [newCatCodigo, setNewCatCodigo] = useState('');
  const [newCatDescripcion, setNewCatDescripcion] = useState('');

  // Modal para Nuevo Elemento de Catálogo
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItemCodigo, setNewItemCodigo] = useState('');
  const [newItemValor, setNewItemValor] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Edición rápida de ítem
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemValor, setEditItemValor] = useState('');

  const canManage = currentUser?.rol === 'administrador';
  const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId) || catalogs[0];

  const handleCreateCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNombre.trim() || !newCatCodigo.trim()) return;

    const created = addCatalog({
      nombre: newCatNombre.trim(),
      codigo: newCatCodigo.trim().toUpperCase().replace(/\s+/g, '_'),
      descripcion: newCatDescripcion.trim(),
      items: []
    });

    setNewCatNombre('');
    setNewCatCodigo('');
    setNewCatDescripcion('');
    setIsNewCatModalOpen(false);
    setSelectedCatalogId(created.id);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemValor.trim() || !selectedCatalog) return;

    addCatalogItem(selectedCatalog.id, {
      codigo: (newItemCodigo || newItemValor).trim().toUpperCase().replace(/\s+/g, '_'),
      valor: newItemValor.trim(),
      descripcion: newItemDesc.trim() || undefined,
      activo: true,
    });

    setNewItemCodigo('');
    setNewItemValor('');
    setNewItemDesc('');
    setIsNewItemModalOpen(false);
  };

  const handleSaveEditItem = (itemId: string) => {
    if (!editItemValor.trim() || !selectedCatalog) return;
    updateCatalogItem(selectedCatalog.id, itemId, { valor: editItemValor.trim() });
    setEditingItemId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo (Professional Polish) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Mantenimiento y Catálogos del Sistema
          </h2>
          <p className="text-xs text-slate-500">
            Parametrización de listas desplegables, clasificaciones tecnológicas y estados
          </p>
        </div>

        {canManage && (
          <button
            id="btn-create-catalog"
            type="button"
            onClick={() => setIsNewCatModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-black" />
            <span>Crear Catálogo</span>
          </button>
        )}
      </div>

      {/* Grid de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Selector de Catálogos */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-amber-500" />
                Catálogos ({catalogs.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {catalogs.map((cat) => {
                const isSelected = cat.id === selectedCatalog?.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCatalogId(cat.id)}
                    className={`w-full p-3 text-left transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-500/10 border-l-4 border-amber-500 font-semibold' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isSelected ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                          {cat.nombre}
                        </span>
                        {cat.esSistema && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                            SISTEMA
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {cat.descripcion}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      {cat.items.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Elementos del Catálogo Seleccionado */}
        <div className="lg:col-span-8">
          {selectedCatalog ? (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              
              {/* Encabezado del Catálogo Seleccionado */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                      {selectedCatalog.codigo}
                    </span>
                    {selectedCatalog.esSistema && (
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Protegido
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedCatalog.nombre}</h3>
                  <p className="text-xs text-slate-500">{selectedCatalog.descripcion}</p>
                </div>

                {canManage && (
                  <button
                    id="btn-add-catalog-item"
                    type="button"
                    onClick={() => setIsNewItemModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-black" />
                    <span>Agregar Elemento</span>
                  </button>
                )}
              </div>

              {/* Tabla de Elementos */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Valor / Opción</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-3 py-3 text-center">Estado</th>
                      {canManage && <th className="px-4 py-3 text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCatalog.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Este catálogo aún no contiene elementos.
                        </td>
                      </tr>
                    ) : (
                      selectedCatalog.items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                          
                          {/* Código */}
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {it.codigo}
                          </td>

                          {/* Valor con edición en línea */}
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {editingItemId === it.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editItemValor}
                                  onChange={(e) => setEditItemValor(e.target.value)}
                                  className="p-1 border border-amber-400 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditItem(it.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="font-semibold">{it.valor}</span>
                            )}
                          </td>

                          {/* Descripción */}
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                            {it.descripcion || '—'}
                          </td>

                          {/* Estado Activo */}
                          <td className="px-3 py-3 text-center">
                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => updateCatalogItem(selectedCatalog.id, it.id, { activo: !it.activo })}
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                  it.activo 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {it.activo ? 'Activo' : 'Inactivo'}
                              </button>
                            ) : (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                it.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {it.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          {canManage && (
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => { setEditingItemId(it.id); setEditItemValor(it.valor); }}
                                  className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!selectedCatalog.esSistema && (
                                  <button
                                    type="button"
                                    onClick={() => deleteCatalogItem(selectedCatalog.id, it.id)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl text-center text-slate-400 border border-slate-200">
              Seleccione un catálogo de la lista para ver sus elementos.
            </div>
          )}
        </div>

      </div>

      {/* Modal Crear Nuevo Catálogo */}
      {isNewCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Crear Nuevo Catálogo Institucional
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCatModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCatalog} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Catálogo *</label>
                <input
                  type="text"
                  value={newCatNombre}
                  onChange={(e) => {
                    setNewCatNombre(e.target.value);
                    if (!newCatCodigo) {
                      setNewCatCodigo(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                    }
                  }}
                  placeholder="ej. Fuentes de Financiamiento"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Código Identificador *</label>
                <input
                  type="text"
                  value={newCatCodigo}
                  onChange={(e) => setNewCatCodigo(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder="ej. FUENTES_FINANCIAMIENTO"
                  className="w-full p-2 font-mono uppercase border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción / Propósito</label>
                <textarea
                  rows={2}
                  value={newCatDescripcion}
                  onChange={(e) => setNewCatDescripcion(e.target.value)}
                  placeholder="Finalidad del catálogo en el sistema..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCatModalOpen(false)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold rounded-xl text-xs shadow-2xs cursor-pointer"
                >
                  Guardar Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Nuevo Elemento */}
      {isNewItemModalOpen && selectedCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Agregar Opción a "{selectedCatalog.nombre}"
              </h3>
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor / Texto de la Opción *</label>
                <input
                  type="text"
                  value={newItemValor}
                  onChange={(e) => {
                    setNewItemValor(e.target.value);
                    if (!newItemCodigo) {
                      setNewItemCodigo(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                    }
                  }}
                  placeholder="ej. Aprobado por Comité"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Código Corto</label>
                <input
                  type="text"
                  value={newItemCodigo}
                  onChange={(e) => setNewItemCodigo(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder="ej. APROB_COMITE"
                  className="w-full p-2 font-mono uppercase border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Detalle de aplicación de este valor..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold rounded-xl text-xs shadow-2xs cursor-pointer"
                >
                  Guardar Opción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
