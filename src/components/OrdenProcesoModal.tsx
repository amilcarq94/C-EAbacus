/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { OrdenProceso, TipoOrdenProceso, EstadoOrdenProceso, CategoriaType, EspecieType, ProductoTratamiento, SiloId, SiloExtraccion } from '../types';
import { getCampaniaIdFromDate } from '../utils/campanias';
import { SilosSelector } from './SilosSelector';
import { X, Factory, Truck, CheckCircle, AlertCircle, Save, Package, Plus, Trash2 } from 'lucide-react';

interface OrdenProcesoModalProps {
  existingOrdenes: OrdenProceso[];
  ordenAEditar?: OrdenProceso | null;
  initialType?: TipoOrdenProceso;
  activeCampaniaId?: string;
  siloStocks?: Record<SiloId, number>;
  onSave: (orden: OrdenProceso) => void;
  onClose: () => void;
}

export const OrdenProcesoModal: React.FC<OrdenProcesoModalProps> = ({
  existingOrdenes,
  ordenAEditar,
  initialType = 'PRODUCCION',
  activeCampaniaId,
  siloStocks,
  onSave,
  onClose,
}) => {
  const isEditing = !!ordenAEditar;

  // Tabs / Entry Point
  const [tipoOrden, setTipoOrden] = useState<TipoOrdenProceso>(
    ordenAEditar ? ordenAEditar.tipoOrden : initialType
  );

  // Form Fields
  const [numeroOrden, setNumeroOrden] = useState('');
  const [cliente, setCliente] = useState('San Diego Semilla');
  const [especie, setEspecie] = useState<EspecieType | string>('Soja');
  const [tipoMovimiento, setTipoMovimiento] = useState('Intermedio a Final');
  const [numeroOrdenMovimiento, setNumeroOrdenMovimiento] = useState('');
  const [envaseSelect, setEnvaseSelect] = useState('Big Bag x 800 Kg');
  const [envaseManual, setEnvaseManual] = useState('');
  const [tratamiento, setTratamiento] = useState('Sin Tratamiento');
  const [variedad, setVariedad] = useState('P46A03');
  const [producto, setProducto] = useState('FINAL');
  const [productosList, setProductosList] = useState<ProductoTratamiento[]>([]);
  const [categoriaSelect, setCategoriaSelect] = useState('Fundadora');
  const [categoriaManual, setCategoriaManual] = useState('');
  const [bbPedidos, setBbPedidos] = useState<number>(50);
  const [hechos, setHechos] = useState<number>(0);
  const [estado, setEstado] = useState<EstadoOrdenProceso>('SIN INICIAR');
  const [observaciones, setObservaciones] = useState('');
  const [fechaCreacion, setFechaCreacion] = useState(() => new Date().toISOString().split('T')[0]);
  const [silosOrigen, setSilosOrigen] = useState<SiloExtraccion[]>([]);

  const [error, setError] = useState('');

  // Initial values setup
  useEffect(() => {
    if (ordenAEditar) {
      setNumeroOrden(ordenAEditar.numeroOrden);
      setTipoOrden(ordenAEditar.tipoOrden);
      setCliente(ordenAEditar.cliente || 'San Diego Semilla');
      setEspecie(ordenAEditar.especie || 'Soja');
      setTipoMovimiento(ordenAEditar.tipoMovimiento || 'Intermedio a Final');
      setNumeroOrdenMovimiento(ordenAEditar.numeroOrdenMovimiento || '');
      setSilosOrigen(ordenAEditar.silosOrigen || []);
      
      // Envase
      const envVal = ordenAEditar.envaseDestino || 'Big Bag x 800 Kg';
      const stdEnvases = ['Bolsa x 25 Kg', 'Bolsa x 40 Kg', 'Big Bag x 800 Kg'];
      if (stdEnvases.includes(envVal)) {
        setEnvaseSelect(envVal);
        setEnvaseManual('');
      } else {
        setEnvaseSelect('Otra');
        setEnvaseManual(envVal);
      }

      setTratamiento(ordenAEditar.tratamiento || 'Sin Tratamiento');
      setVariedad(ordenAEditar.variedad || '');
      setProducto(ordenAEditar.producto || 'FINAL');
      if (ordenAEditar.productos && Array.isArray(ordenAEditar.productos)) {
        setProductosList(ordenAEditar.productos);
      } else {
        setProductosList([]);
      }
      
      // Categoria: "Preba", "Original", "Primu", "Otra"
      const catVal = ordenAEditar.categoria || 'Primu';
      const catValLower = catVal.toLowerCase();
      if (catValLower === 'preba') {
        setCategoriaSelect('Preba');
        setCategoriaManual('');
      } else if (catValLower === 'original') {
        setCategoriaSelect('Original');
        setCategoriaManual('');
      } else if (catValLower === 'primu') {
        setCategoriaSelect('Primu');
        setCategoriaManual('');
      } else {
        setCategoriaSelect('Otra');
        setCategoriaManual(catVal);
      }

      setBbPedidos(ordenAEditar.bbPedidos || 0);
      setHechos(ordenAEditar.hechos || 0);
      setEstado(ordenAEditar.estado || 'SIN INICIAR');
      setObservaciones(ordenAEditar.observaciones || '');
      setFechaCreacion(ordenAEditar.fechaCreacion || new Date().toISOString().split('T')[0]);
    } else {
      // Auto-suggest Next Number
      const numericOrdens = existingOrdenes
        .map(o => parseInt(o.numeroOrden.replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
      const maxNro = numericOrdens.length > 0 ? Math.max(...numericOrdens) : 1000;
      setNumeroOrden(String(maxNro + 1));

      if (tipoOrden === 'MOVIMIENTO') {
        setNumeroOrdenMovimiento(`OM-${maxNro + 1}`);
      }
    }
  }, [ordenAEditar, existingOrdenes, tipoOrden]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!numeroOrden.trim()) {
      setError('El N° de Orden de Proceso es obligatorio.');
      return;
    }

    if (!cliente.trim()) {
      setError('El Cliente es obligatorio.');
      return;
    }

    // Uniqueness check for numeroOrden
    const duplicate = existingOrdenes.find(
      o => o.numeroOrden.trim().toLowerCase() === numeroOrden.trim().toLowerCase() && o.id !== ordenAEditar?.id
    );
    if (duplicate) {
      setError(`Ya existe una Orden de Proceso con el N° ${numeroOrden}.`);
      return;
    }

    if (!variedad.trim()) {
      setError('La Variedad es obligatoria.');
      return;
    }

    if (!producto.trim()) {
      setError('El Producto es obligatorio.');
      return;
    }

    // Determine Envase Destino
    const finalEnvaseDestino = envaseSelect === 'Otra' ? envaseManual.trim() : envaseSelect;
    if (envaseSelect === 'Otra' && !envaseManual.trim()) {
      setError('Debe ingresar el Tipo de Envase a Destino manualmente.');
      return;
    }
    if (!finalEnvaseDestino) {
      setError('Debe seleccionar o especificar el Tipo de Envase a Destino.');
      return;
    }

    // Determine Categoria
    const finalCategoria = categoriaSelect === 'Otra' ? categoriaManual.trim() : categoriaSelect;
    if (categoriaSelect === 'Otra' && !categoriaManual.trim()) {
      setError('Debe ingresar la Categoría manualmente.');
      return;
    }
    if (!finalCategoria) {
      setError('Debe seleccionar o especificar la Categoría.');
      return;
    }

    if (bbPedidos <= 0) {
      setError('El valor de BB Pedidos debe ser mayor a 0.');
      return;
    }

    if (tipoOrden === 'MOVIMIENTO') {
      if (!tipoMovimiento.trim()) {
        setError('El Tipo de Movimiento es obligatorio.');
        return;
      }
      if (
        tipoMovimiento !== 'Intermedio a Final' &&
        tipoMovimiento !== 'Final a Final Tratado'
      ) {
        setError('El Tipo de Movimiento debe ser "Intermedio a Final" o "Final a Final Tratado".');
        return;
      }
      if (!numeroOrdenMovimiento.trim()) {
        setError('El N° de Orden de Movimiento es obligatorio.');
        return;
      }
      if (tipoMovimiento === 'Final a Final Tratado' && (!tratamiento.trim() || tratamiento.trim().toLowerCase() === 'sin tratamiento')) {
        setError('Para movimientos de tipo "Final a Final Tratado", debe indicar el producto o tratamiento utilizado.');
        return;
      }
    }

    const campaniaId = activeCampaniaId && activeCampaniaId !== 'TODAS'
      ? activeCampaniaId
      : getCampaniaIdFromDate(fechaCreacion);

    const isTratadoMov = tipoOrden === 'MOVIMIENTO' && tipoMovimiento === 'Final a Final Tratado';

    const ordenGuardar: OrdenProceso = {
      id: ordenAEditar ? ordenAEditar.id : `OP-${Date.now()}`,
      numeroOrden: numeroOrden.trim(),
      tipoOrden,
      cliente: cliente.trim(),
      especie: especie.trim(),
      envaseDestino: finalEnvaseDestino,
      tratamiento: tipoOrden === 'MOVIMIENTO' ? tratamiento.trim() : 'Sin Tratamiento',
      variedad: variedad.trim(),
      producto: producto.trim(),
      productos: isTratadoMov ? productosList : [],
      categoria: finalCategoria,
      bbPedidos: Number(bbPedidos),
      hechos: Number(hechos),
      estado,
      observaciones: observaciones.trim(),
      fechaCreacion,
      campaniaId,
      silosOrigen,
      ...(tipoOrden === 'MOVIMIENTO' ? {
        tipoMovimiento: tipoMovimiento.trim(),
        numeroOrdenMovimiento: numeroOrdenMovimiento.trim(),
      } : {}),
    };

    onSave(ordenGuardar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Modal Title and Entry Point Tabs */}
        <div className={`px-6 py-5 text-white flex items-center justify-between ${
          tipoOrden === 'PRODUCCION'
            ? 'bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950'
            : 'bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950'
        }`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {tipoOrden === 'PRODUCCION' ? (
                <>
                  <Factory className="w-5 h-5 text-emerald-400" />
                  {isEditing ? `Editar Orden de Proceso N° ${ordenAEditar?.numeroOrden}` : 'Nueva Orden de Proceso'}
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5 text-blue-400" />
                  {isEditing ? `Editar Orden de Movimiento N° ${ordenAEditar?.numeroOrden}` : 'Nueva Orden de Movimiento'}
                </>
              )}
            </h2>
            <p className="text-xs text-slate-200/80 mt-0.5">
              {tipoOrden === 'PRODUCCION'
                ? 'Complete los parámetros de la orden de proceso para control de producción y trazabilidad.'
                : 'Complete los parámetros de la orden de movimiento entre sectores o tratamiento de semilla.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection if not editing */}
        {!isEditing && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 pt-4 pb-0 flex gap-2">
            <button
              type="button"
              onClick={() => setTipoOrden('PRODUCCION')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium text-sm transition-colors border-t border-x ${
                tipoOrden === 'PRODUCCION'
                  ? 'bg-white text-emerald-800 border-slate-200 border-b-transparent shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-transparent font-medium'
              }`}
            >
              <Factory className="w-4 h-4 text-emerald-600" />
              Cargar Orden de Proceso
            </button>
            <button
              type="button"
              onClick={() => setTipoOrden('MOVIMIENTO')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium text-sm transition-colors border-t border-x ${
                tipoOrden === 'MOVIMIENTO'
                  ? 'bg-white text-blue-800 border-slate-200 border-b-transparent shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-transparent font-medium'
              }`}
            >
              <Truck className="w-4 h-4 text-blue-600" />
              Cargar Orden de Movimiento
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* N° Orden de Proceso */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                N° Orden de Proceso *
              </label>
              <input
                type="text"
                value={numeroOrden}
                onChange={(e) => setNumeroOrden(e.target.value)}
                placeholder="Ej. 1001"
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-semibold"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Fecha de Registro
              </label>
              <input
                type="date"
                value={fechaCreacion}
                onChange={(e) => setFechaCreacion(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cliente *
              </label>
              <input
                type="text"
                list="clientes-list-op"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ej. San Diego Semilla"
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              />
              <datalist id="clientes-list-op">
                <option value="San Diego Semilla" />
                <option value="Eco Rural" />
                <option value="Pampa" />
                <option value="Stine" />
                <option value="Elementa Foods" />
              </datalist>
            </div>

            {/* Especie */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Especie *
              </label>
              <select
                value={especie}
                onChange={(e) => setEspecie(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              >
                <option value="Soja">Soja</option>
                <option value="Trigo">Trigo</option>
                <option value="Arveja">Arveja</option>
                <option value="Sin especificar">Sin especificar</option>
              </select>
            </div>

            {/* Fields specific to MOVIMIENTO */}
            {tipoOrden === 'MOVIMIENTO' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1">
                    Tipo de Movimiento *
                  </label>
                  <select
                    value={tipoMovimiento}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTipoMovimiento(val);
                      if (val === 'Final a Final Tratado' && (tratamiento === 'Sin Tratamiento' || !tratamiento)) {
                        setTratamiento('Curasemilla Fungicida + Inoculante');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-sm border border-blue-200 bg-blue-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-blue-900"
                  >
                    <option value="Intermedio a Final">Intermedio a Final</option>
                    <option value="Final a Final Tratado">Final a Final Tratado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1">
                    N° Orden de Movimiento *
                  </label>
                  <input
                    type="text"
                    value={numeroOrdenMovimiento}
                    onChange={(e) => setNumeroOrdenMovimiento(e.target.value)}
                    placeholder="Ej. OM-402"
                    required
                    className="w-full px-3.5 py-2 text-sm border border-blue-200 bg-blue-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-semibold"
                  />
                </div>
              </>
            )}

            {/* Tipo de Envase a Destino */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Envase a Destino *
              </label>
              <select
                value={envaseSelect}
                onChange={(e) => {
                  setEnvaseSelect(e.target.value);
                  if (e.target.value !== 'Otra') {
                    setEnvaseManual('');
                  }
                }}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              >
                <option value="Bolsa x 25 Kg">Bolsa x 25 Kg</option>
                <option value="Bolsa x 40 Kg">Bolsa x 40 Kg</option>
                <option value="Big Bag x 800 Kg">Big Bag x 800 Kg</option>
                <option value="Otra">Otra</option>
              </select>

              {envaseSelect === 'Otra' && (
                <input
                  type="text"
                  value={envaseManual}
                  onChange={(e) => setEnvaseManual(e.target.value)}
                  placeholder="Cargar tipo de envase manualmente..."
                  required
                  className="mt-2 w-full px-3.5 py-2 text-sm border border-emerald-300 bg-emerald-50/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                />
              )}
            </div>

            {/* Variedad */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Variedad *
              </label>
              <input
                type="text"
                value={variedad}
                onChange={(e) => setVariedad(e.target.value)}
                placeholder="Ej. P46A03, DM TIPA"
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Tipo de Lote */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Lote *
              </label>
              <select
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
              >
                <option value="INTERMEDIO">Intermedio</option>
                <option value="FINAL">Final</option>
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Categoría *
              </label>
              <select
                value={categoriaSelect}
                onChange={(e) => {
                  setCategoriaSelect(e.target.value);
                  if (e.target.value !== 'Otra') {
                    setCategoriaManual('');
                  }
                }}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              >
                <option value="Fundadora">Fundadora</option>
                <option value="Preba">Preba</option>
                <option value="Original">Original</option>
                <option value="Primera">Primera</option>
                <option value="Otra">Otra...</option>
              </select>

              {categoriaSelect === 'Otra' && (
                <input
                  type="text"
                  value={categoriaManual}
                  onChange={(e) => setCategoriaManual(e.target.value)}
                  placeholder="Cargar categoría manualmente..."
                  required
                  className="mt-2 w-full px-3.5 py-2 text-sm border border-emerald-300 bg-emerald-50/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                />
              )}
            </div>

            {/* Sección Productos (Principios Activos / Tratamiento - Solo en Orden de Movimiento "Final a Final Tratado") */}
            {tipoOrden === 'MOVIMIENTO' && (
              <div className="col-span-full mt-2 pt-4 border-t border-slate-200">
                {tipoMovimiento === 'Final a Final Tratado' ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Productos (Principios Activos)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Cargue hasta 4 productos con su principio activo y tipo
                        </p>
                      </div>
                      {productosList.length < 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductosList(prev => [
                              ...prev,
                              {
                                id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
                                principioActivo: '',
                                tipos: [],
                                tipoOtro: ''
                              }
                            ]);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Agregar Producto ({productosList.length}/4)
                        </button>
                      )}
                    </div>

                    {productosList.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                        No se han agregado productos. Haga clic en <strong>"+ Agregar Producto"</strong> para registrar principios activos y tipos de producto.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {productosList.map((prod, idx) => (
                          <div key={prod.id || idx} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 relative">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-emerald-600" />
                                Producto #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => setProductosList(prev => prev.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                title="Eliminar producto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Principio Activo (Carga Manual) *
                              </label>
                              <input
                                type="text"
                                value={prod.principioActivo}
                                onChange={(e) => {
                                  const next = [...productosList];
                                  next[idx] = { ...next[idx], principioActivo: e.target.value };
                                  setProductosList(next);
                                }}
                                placeholder="Ej. Carbendazim, Metalaxil, Tiametoxam..."
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Tipo de Producto (Marcar los que correspondan)
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {[
                                  'Fungicida',
                                  'Inoculante',
                                  'Insecticidas',
                                  'Polvo Terminación',
                                  'Polímero Líquido',
                                  'Otro'
                                ].map((tipoOpt) => {
                                  const isChecked = prod.tipos?.includes(tipoOpt);
                                  return (
                                    <label
                                      key={tipoOpt}
                                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                                        isChecked
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          const currentTipos = prod.tipos || [];
                                          let newTipos: string[];
                                          if (checked) {
                                            newTipos = [...currentTipos, tipoOpt];
                                          } else {
                                            newTipos = currentTipos.filter((t) => t !== tipoOpt);
                                          }
                                          const next = [...productosList];
                                          next[idx] = { ...next[idx], tipos: newTipos };
                                          setProductosList(next);
                                        }}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                      />
                                      <span>{tipoOpt}</span>
                                    </label>
                                  );
                                })}
                              </div>

                              {prod.tipos?.includes('Otro') && (
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    value={prod.tipoOtro || ''}
                                    onChange={(e) => {
                                      const next = [...productosList];
                                      next[idx] = { ...next[idx], tipoOtro: e.target.value };
                                      setProductosList(next);
                                    }}
                                    placeholder="Cargar tipo de producto manualmente..."
                                    className="w-full px-3 py-1.5 text-xs border border-emerald-300 bg-emerald-50/30 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      La carga de <strong>Productos (Principios Activos)</strong> está deshabilitada para este movimiento. Seleccione el tipo <strong>"Final a Final Tratado"</strong> para habilitarla.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tratamiento Utilizado (Solo en Orden de Movimiento) */}
            {tipoOrden === 'MOVIMIENTO' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Tratamiento Utilizado {tipoMovimiento === 'Final a Final Tratado' ? '*' : ''}</span>
                  {tipoMovimiento === 'Final a Final Tratado' && (
                    <span className="text-[10px] text-amber-700 font-extrabold uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Requerido</span>
                  )}
                </label>
                <input
                  type="text"
                  value={tratamiento}
                  onChange={(e) => setTratamiento(e.target.value)}
                  placeholder={
                    tipoMovimiento === 'Final a Final Tratado'
                      ? 'Indicar tratamiento (ej. Maxim Quattro + Inoculante)'
                      : 'Ej. Sin Tratamiento, Rizoderma, TRATAR'
                  }
                  className={`w-full px-3.5 py-2 text-sm border rounded-xl focus:ring-2 ${
                    tipoMovimiento === 'Final a Final Tratado' &&
                    (!tratamiento.trim() || tratamiento.toLowerCase() === 'sin tratamiento')
                      ? 'border-amber-400 bg-amber-50/40 focus:ring-amber-500'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                />
              </div>
            )}

            {/* BB Pedidos (Objetivo) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                BB Pedidos (Objetivo) *
              </label>
              <input
                type="number"
                min="1"
                value={bbPedidos}
                onChange={(e) => setBbPedidos(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Estado de la Orden *
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoOrdenProceso)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
              >
                <option value="SIN INICIAR">🔴 SIN INICIAR</option>
                <option value="EN CURSO">🟡 EN CURSO</option>
                <option value="TERMINADO">🟢 TERMINADO</option>
              </select>
            </div>

          </div>

          {/* Silos de Origen */}
          <SilosSelector
            silosSeleccionados={silosOrigen}
            siloStocks={siloStocks}
            onChange={setSilosOrigen}
          />

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Observaciones
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalles técnicos o instrucciones de proceso..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Buttons Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md flex items-center gap-2 transition-all hover:shadow-lg active:scale-98 ${
                tipoOrden === 'PRODUCCION'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Save className="w-4 h-4" />
              {isEditing
                ? 'Guardar Cambios'
                : tipoOrden === 'PRODUCCION'
                ? 'Guardar Orden de Proceso'
                : 'Guardar Orden de Movimiento'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
