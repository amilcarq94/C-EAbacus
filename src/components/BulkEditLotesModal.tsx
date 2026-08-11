/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lote, EstadoLoteType, EstadoRegistroLote, CategoriaType, TipoLoteType, TratamientoType, SiloId, LoteLimitsConfig } from '../types';
import { X, Check, Edit2, AlertCircle, SlidersHorizontal, Building2, MapPin, Layers, Printer } from 'lucide-react';
import { BatchPrintLotesModal } from './BatchPrintLotesModal';

interface BulkEditLotesModalProps {
  isOpen: boolean;
  selectedLotes: Lote[];
  clientes?: string[];
  especies?: string[];
  onConfirm: (updatedLotes: Lote[]) => void;
  onClose: () => void;
}

export const BulkEditLotesModal: React.FC<BulkEditLotesModalProps> = ({
  isOpen,
  selectedLotes,
  clientes = ['San Diego Semilla', 'Eco Rural', 'Pampa', 'Stine', 'Elementa Foods'],
  especies = ['Soja', 'Trigo', 'Arveja'],
  onConfirm,
  onClose,
}) => {
  if (!isOpen || selectedLotes.length === 0) return null;

  // Toggles de campos a modificar
  const [fieldToggles, setFieldToggles] = useState({
    estadoRegistro: false,
    fechaHoraProduccion: false,
    estado: false,
    categoria: false,
    tipo: false,
    tratamiento: false,
    ala: false,
    sector: false,
    cliente: false,
    observaciones: false,
  });

  // Valores a aplicar en lote
  const [estadoRegistro, setEstadoRegistro] = useState<EstadoRegistroLote>('REALIZADO');
  const [fechaHoraProduccion, setFechaHoraProduccion] = useState<string>(() => {
    const now = new Date();
    return `${now.toISOString().split('T')[0]}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [estado, setEstado] = useState<EstadoLoteType>('Disponible');
  const [categoria, setCategoria] = useState<CategoriaType>('Original');
  const [tipo, setTipo] = useState<TipoLoteType>('Final');
  const [tratamientos, setTratamientos] = useState<TratamientoType[]>(['Sin Tratar']);
  const [ala, setAla] = useState('A');
  const [sector, setSector] = useState('1');
  const [cliente, setCliente] = useState('San Diego Semilla');
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false);
  const [printingLotes, setPrintingLotes] = useState<Lote[]>([]);

  const handlePrintBulkLotes = () => {
    // Si hay toggles activos, aplicamos temporalmente los cambios a las fichas a imprimir sin necesidad de guardar antes
    const lotesParaImprimir = selectedLotes.map(lote => {
      const copy = { ...lote };
      if (fieldToggles.estadoRegistro) copy.estadoRegistro = estadoRegistro;
      if (fieldToggles.estado) copy.estado = estado;
      if (fieldToggles.categoria) copy.categoria = categoria;
      if (fieldToggles.tipo) copy.tipo = tipo;
      if (fieldToggles.cliente) copy.cliente = cliente;
      if (fieldToggles.observaciones) copy.observaciones = observaciones.trim();
      return copy;
    });
    setPrintingLotes(lotesParaImprimir);
    setShowBatchPrintModal(true);
  };

  const handleToggle = (key: keyof typeof fieldToggles) => {
    setFieldToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleTratamiento = (t: TratamientoType) => {
    setTratamientos(prev => {
      if (t === 'Sin Tratar') return ['Sin Tratar'];
      const filtered = prev.filter(x => x !== 'Sin Tratar');
      if (filtered.includes(t)) {
        const next = filtered.filter(x => x !== t);
        return next.length > 0 ? next : ['Sin Tratar'];
      } else {
        return [...filtered, t];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Verificar si al menos un campo fue seleccionado para modificar
    const anyActive = Object.values(fieldToggles).some(v => v === true);
    if (!anyActive) {
      setErrorMsg('Debe seleccionar al menos un campo marcando su casilla para aplicar la edición masiva.');
      return;
    }

    const updatedLotes: Lote[] = selectedLotes.map(lote => {
      const copy: Lote = { ...lote };

      if (fieldToggles.estadoRegistro) {
        copy.estadoRegistro = estadoRegistro;
        if (estadoRegistro === 'REALIZADO' && fieldToggles.fechaHoraProduccion) {
          copy.fechaHoraProduccion = fechaHoraProduccion;
          copy.fechaIngreso = fechaHoraProduccion.split('T')[0];
        }
      }

      if (fieldToggles.fechaHoraProduccion && !fieldToggles.estadoRegistro) {
        copy.fechaHoraProduccion = fechaHoraProduccion;
        copy.fechaIngreso = fechaHoraProduccion.split('T')[0];
      }

      if (fieldToggles.estado) {
        copy.estado = estado;
      }

      if (fieldToggles.categoria) {
        copy.categoria = categoria;
      }

      if (fieldToggles.tipo) {
        copy.tipo = tipo;
      }

      if (fieldToggles.tratamiento) {
        copy.tratamiento = tratamientos;
        copy.producto = tratamientos.includes('Sin Tratar') ? 'Ninguno' : (copy.producto || 'Tratado en Planta');
      }

      if (fieldToggles.ala || fieldToggles.sector) {
        const targetAla = fieldToggles.ala ? ala : (copy.ala || 'A');
        const targetSector = fieldToggles.sector ? sector : (copy.sector || '1');
        copy.ala = targetAla;
        copy.sector = targetSector;
        copy.ubicacionAcopio = `Ala ${targetAla} - Sector ${targetSector}`;
      }

      if (fieldToggles.cliente) {
        copy.cliente = cliente;
      }

      if (fieldToggles.observaciones) {
        copy.observaciones = observaciones.trim();
      }

      // Registro de auditoría
      const auditEntry = {
        id: `AUD-BULK-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        fechaHora: new Date().toISOString(),
        tipo: 'Edición' as const,
        usuario: 'Operario de Planta',
        descripcion: `Edición masiva de datos maestros en conjunto de ${selectedLotes.length} lotes.`,
      };

      copy.auditoria = [auditEntry, ...(copy.auditoria || [])];

      return copy;
    });

    onConfirm(updatedLotes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="bg-[#00603C] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <SlidersHorizontal className="w-5 h-5 text-[#C9922E]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">
                Edición Masiva de Lotes
              </h3>
              <p className="text-xs text-emerald-100">
                Se aplicarán los cambios a <span className="font-bold text-amber-300 font-mono">{selectedLotes.length}</span> lotes seleccionados simultáneamente.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#00603C] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Instrucciones de Edición Masiva</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Active el conmutador de los campos que desea actualizar de forma grupal. Los campos no marcados conservarán sus valores individuales intactos.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">

            {/* Campo 1: Estado de Registro */}
            <div className={`p-4 rounded-xl border transition ${fieldToggles.estadoRegistro ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={fieldToggles.estadoRegistro}
                    onChange={() => handleToggle('estadoRegistro')}
                    className="w-4 h-4 text-[#00603C] rounded focus:ring-[#00603C]"
                  />
                  <span>Estado de Registro (Pre-Carga / En Curso / Realizado)</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {fieldToggles.estadoRegistro ? 'SE MODIFICARÁ' : 'Sin cambios'}
                </span>
              </div>

              {fieldToggles.estadoRegistro && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={() => setEstadoRegistro('PRE-CARGA')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                      estadoRegistro === 'PRE-CARGA' ? 'bg-amber-500 text-white border-amber-600 font-extrabold' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    PRE-CARGA
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadoRegistro('EN_CURSO')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                      estadoRegistro === 'EN_CURSO' ? 'bg-blue-600 text-white border-blue-700 font-extrabold' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    EN CURSO
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadoRegistro('REALIZADO')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                      estadoRegistro === 'REALIZADO' ? 'bg-[#00603C] text-white border-emerald-700 font-extrabold' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    REALIZADO
                  </button>
                </div>
              )}
            </div>

            {/* Campo 2: Fecha / Hora de Producción */}
            <div className={`p-4 rounded-xl border transition ${fieldToggles.fechaHoraProduccion ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={fieldToggles.fechaHoraProduccion}
                    onChange={() => handleToggle('fechaHoraProduccion')}
                    className="w-4 h-4 text-[#00603C] rounded focus:ring-[#00603C]"
                  />
                  <span>Fecha y Hora de Producción</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {fieldToggles.fechaHoraProduccion ? 'SE MODIFICARÁ' : 'Sin cambios'}
                </span>
              </div>

              {fieldToggles.fechaHoraProduccion && (
                <div className="mt-3 pt-2 border-t border-amber-200">
                  <input
                    type="datetime-local"
                    value={fechaHoraProduccion}
                    onChange={(e) => setFechaHoraProduccion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Campo 3: Estado de Disponibilidad Stock */}
            <div className={`p-4 rounded-xl border transition ${fieldToggles.estado ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={fieldToggles.estado}
                    onChange={() => handleToggle('estado')}
                    className="w-4 h-4 text-[#00603C] rounded focus:ring-[#00603C]"
                  />
                  <span>Estado de Stock (Disponible / Reservado / Agotado / A Consumo)</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {fieldToggles.estado ? 'SE MODIFICARÁ' : 'Sin cambios'}
                </span>
              </div>

              {fieldToggles.estado && (
                <div className="mt-3 pt-2 border-t border-amber-200">
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoLoteType)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Reservado">Reservado</option>
                    <option value="Agotado">Agotado</option>
                    <option value="A Consumo">A Consumo</option>
                  </select>
                </div>
              )}
            </div>

            {/* Campo 4: Categoría y Tipo de Lote */}
            <div className={`p-4 rounded-xl border transition ${fieldToggles.categoria || fieldToggles.tipo ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Categoría y Tipo de Lote</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-semibold mb-1">
                    <input
                      type="checkbox"
                      checked={fieldToggles.categoria}
                      onChange={() => handleToggle('categoria')}
                      className="w-3.5 h-3.5 text-[#00603C] rounded"
                    />
                    <span>Categoría</span>
                  </label>
                  {fieldToggles.categoria && (
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                    >
                      <option value="FUNDADORA">FUNDADORA</option>
                      <option value="PREBA">PREBA</option>
                      <option value="ORIGINAL">ORIGINAL</option>
                      <option value="PRIMU">PRIMU</option>
                      <option value="Primera">Primera</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-semibold mb-1">
                    <input
                      type="checkbox"
                      checked={fieldToggles.tipo}
                      onChange={() => handleToggle('tipo')}
                      className="w-3.5 h-3.5 text-[#00603C] rounded"
                    />
                    <span>Tipo de Lote</span>
                  </label>
                  {fieldToggles.tipo && (
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as TipoLoteType)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                    >
                      <option value="Intermedio">Intermedio</option>
                      <option value="Final">Final</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Campo 5: Ubicación de Acopio (Ala y Sector) */}
            <div className={`p-4 rounded-xl border transition ${fieldToggles.ala || fieldToggles.sector ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Ubicación de Acopio en Planta</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-semibold mb-1">
                    <input
                      type="checkbox"
                      checked={fieldToggles.ala}
                      onChange={() => handleToggle('ala')}
                      className="w-3.5 h-3.5 text-[#00603C] rounded"
                    />
                    <span>Ala</span>
                  </label>
                  {fieldToggles.ala && (
                    <select
                      value={ala}
                      onChange={(e) => setAla(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                    >
                      <option value="A">Ala A</option>
                      <option value="B">Ala B</option>
                      <option value="C">Ala C</option>
                      <option value="D">Ala D</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-semibold mb-1">
                    <input
                      type="checkbox"
                      checked={fieldToggles.sector}
                      onChange={() => handleToggle('sector')}
                      className="w-3.5 h-3.5 text-[#00603C] rounded"
                    />
                    <span>Sector</span>
                  </label>
                  {fieldToggles.sector && (
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                    >
                      <option value="1">Sector 1</option>
                      <option value="2">Sector 2</option>
                      <option value="3">Sector 3</option>
                      <option value="4">Sector 4</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Campo 6: Cliente */}
            <div className={`p-4 rounded-xl border transition ${fieldToggles.cliente ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={fieldToggles.cliente}
                    onChange={() => handleToggle('cliente')}
                    className="w-4 h-4 text-[#00603C] rounded focus:ring-[#00603C]"
                  />
                  <span>Cliente</span>
                </label>
              </div>

              {fieldToggles.cliente && (
                <div className="mt-3 pt-2 border-t border-amber-200">
                  <select
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                  >
                    {clientes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handlePrintBulkLotes}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer"
              title="Imprimir la ficha individual de cada lote seleccionado en un solo clic"
            >
              <Printer className="w-4 h-4 text-[#C9922E]" />
              <span>Imprimir Ficha ({selectedLotes.length})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-[#00603C] hover:bg-[#254731] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#C9922E]" />
              <span>Aplicar Edición a {selectedLotes.length} Lotes</span>
            </button>
          </div>
        </form>

        {/* Modal de Impresión Masiva de Fichas */}
        <BatchPrintLotesModal
          isOpen={showBatchPrintModal}
          lotes={printingLotes}
          onClose={() => setShowBatchPrintModal(false)}
        />
      </div>
    </div>
  );
};
