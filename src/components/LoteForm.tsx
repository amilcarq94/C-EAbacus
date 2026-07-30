/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Lote, EspecieType, TipoLoteType, TratamientoType, EstadoLoteType, EstadoRegistroLote, CategoriaType, OrdenProceso, SiloId, SiloExtraccion, MovimientoSilo, BolsonCampo } from '../types';
import { generateLoteId } from '../utils/formatters';
import { getCampaniaIdFromDate } from '../utils/campanias';
import { SilosSelector } from './SilosSelector';
import { BolsonSearchSelector } from './BolsonSearchSelector';
import { ClienteSelect } from './ClienteSelect';
import { Save, RotateCcw, AlertTriangle, Plus, Check, Calendar, Factory, Truck, Clock, CheckCircle2, CalendarDays, Info } from 'lucide-react';

interface LoteFormProps {
  existingLotes: Lote[];
  ordenesProceso?: OrdenProceso[];
  movimientosSilo?: MovimientoSilo[];
  bolsones?: BolsonCampo[];
  clientes: string[];
  especies: string[];
  loteAEditar?: Lote | null;
  activeCampaniaId?: string;
  siloStocks?: Record<SiloId, number>;
  onSave: (lote: Lote) => void;
  onCancel: () => void;
  onCreateOrdenProcesoClick?: () => void;
}

export const LoteForm: React.FC<LoteFormProps> = ({
  existingLotes,
  ordenesProceso = [],
  movimientosSilo = [],
  bolsones = [],
  clientes,
  especies,
  loteAEditar,
  siloStocks,
  onSave,
  onCancel,
  onCreateOrdenProcesoClick,
}) => {
  const isEditing = !!loteAEditar;

  // Estados del Formulario
  const [id, setId] = useState('');
  const [loteNro, setLoteNro] = useState('');
  const [cliente, setCliente] = useState('San Diego Semilla');
  const [especie, setEspecie] = useState<EspecieType>('Soja');

  const [variedad, setVariedad] = useState('');
  const [tipo, setTipo] = useState<TipoLoteType>('Final');
  const [categoria, setCategoria] = useState<CategoriaType>('Original');
  const [tratamientos, setTratamientos] = useState<TratamientoType[]>(['Sin Tratar']);
  const [producto, setProducto] = useState('Ninguno');
  const [stockBolsas, setStockBolsas] = useState<number>(100);
  const [kgPorBolsa, setKgPorBolsa] = useState<number>(40);
  const [stockKg, setStockKg] = useState<number>(4000);
  const [fechaIngreso, setFechaIngreso] = useState(() => new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState<EstadoLoteType>('Disponible');
  const [estadoRegistro, setEstadoRegistro] = useState<EstadoRegistroLote>('REALIZADO');
  const [fechaHoraProduccion, setFechaHoraProduccion] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [observaciones, setObservaciones] = useState('');
  const [ala, setAla] = useState('');
  const [sector, setSector] = useState('');

  // Estados de Orden de Proceso vinculada
  const [ordenProcesoId, setOrdenProcesoId] = useState('');
  const [numeroOrdenMovimiento, setNumeroOrdenMovimiento] = useState('');
  const [silosOrigen, setSilosOrigen] = useState<SiloExtraccion[]>([]);
  const [bolsonOrigenId, setBolsonOrigenId] = useState('');
  const [numeroBolsonOrigen, setNumeroBolsonOrigen] = useState('');

  const [error, setError] = useState('');

  // Filtrar órdenes de proceso para listar únicamente las que están "EN CURSO" (o la ya vinculada si se edita un lote)
  const ordenesEnCurso = useMemo(() => {
    return ordenesProceso.filter(op => op.estado === 'EN CURSO' || (loteAEditar && op.id === loteAEditar.ordenProcesoId));
  }, [ordenesProceso, loteAEditar]);

  // Bolsones disponibles filtrados estrictamente por el/los Silo(s) de Origen (Extracción) seleccionados
  const bolsonesFiltradosPorSilo = useMemo(() => {
    const selectedSiloIds = (silosOrigen || []).map(s => s.siloId).filter(Boolean);
    
    if (selectedSiloIds.length === 0) {
      return []; // Sin silos de origen seleccionados aún
    }

    // 1. Obtener movimientos de tipo INGRESO para los silos de origen seleccionados (posteriores al último AJUSTE_ZERO)
    const bolsonNrosValidos = new Set<string>();
    const bolsonIdsValidos = new Set<string>();
    const bolsonMapExtra = new Map<string, BolsonCampo>();

    selectedSiloIds.forEach(siloId => {
      const movsSilo = (movimientosSilo || []).filter(m => m.siloId === siloId);
      let lastZeroIdx = -1;
      for (let i = movsSilo.length - 1; i >= 0; i--) {
        if (movsSilo[i].tipo === 'AJUSTE_ZERO') {
          lastZeroIdx = i;
          break;
        }
      }
      const relevantMovs = lastZeroIdx >= 0 ? movsSilo.slice(lastZeroIdx + 1) : movsSilo;

      relevantMovs.forEach(m => {
        if (m.tipo === 'INGRESO') {
          if (m.bolsonOrigenId) {
            bolsonIdsValidos.add(m.bolsonOrigenId);
          }
          if (m.bolsonOrigenNro && m.bolsonOrigenNro.trim()) {
            const normNro = m.bolsonOrigenNro.trim().toLowerCase();
            bolsonNrosValidos.add(normNro);

            if (!bolsonMapExtra.has(normNro)) {
              bolsonMapExtra.set(normNro, {
                id: m.bolsonOrigenId || `MOV-BOLSON-${m.bolsonOrigenNro}`,
                campania: '2025/2026',
                numeroBolson: m.bolsonOrigenNro,
                cliente: m.cliente || cliente || 'San Diego Semillas',
                cultivo: m.especie || 'Soja',
                variedad: m.variedad || '-',
                categoria: m.categoria || 'Original',
                campo: m.campoOrigen || '-',
                zona: m.bolsonOrigenSector || '-',
                entradasKg: 0,
                salidasKg: 0,
                stockKg: 0
              });
            }
          }
        }
      });
    });

    // 2. Filtrar la lista general de bolsones
    const matchedFromProp = bolsones.filter(b => {
      const normNro = (b.numeroBolson || '').trim().toLowerCase();
      return (b.id && bolsonIdsValidos.has(b.id)) || (normNro && bolsonNrosValidos.has(normNro));
    });

    // 3. Incluir extras de movimientos que no estén ya en matchedFromProp
    const matchedNros = new Set(matchedFromProp.map(b => b.numeroBolson.trim().toLowerCase()));
    const extraList: BolsonCampo[] = [];
    bolsonMapExtra.forEach((item, normNro) => {
      if (!matchedNros.has(normNro)) {
        extraList.push(item);
      }
    });

    return [...matchedFromProp, ...extraList];
  }, [silosOrigen, movimientosSilo, bolsones, cliente]);

  // Inicializar o cargar lote a editar
  useEffect(() => {
    if (loteAEditar) {
      setId(loteAEditar.id);
      setLoteNro(loteAEditar.loteNro || loteAEditar.id);
      setCliente(loteAEditar.cliente);
      setEspecie(loteAEditar.especie);
      setVariedad(loteAEditar.variedad);
      setTipo(loteAEditar.tipo);
      setCategoria(loteAEditar.categoria || 'Original');
      setTratamientos(loteAEditar.tratamiento || ['Sin Tratar']);
      if (!loteAEditar.tratamiento || loteAEditar.tratamiento.includes('Sin Tratar')) {
        setProducto('Ninguno');
      } else {
        setProducto(loteAEditar.producto || 'Ninguno');
      }
      setStockBolsas(loteAEditar.stockBolsas);
      setKgPorBolsa(loteAEditar.kgPorBolsa || 40);
      setStockKg(loteAEditar.stockKg);
      setFechaIngreso(loteAEditar.fechaIngreso);
      setEstado(loteAEditar.estado);
      setEstadoRegistro(loteAEditar.estadoRegistro || 'REALIZADO');
      setFechaHoraProduccion(
        loteAEditar.fechaHoraProduccion ||
        (loteAEditar.fechaIngreso ? `${loteAEditar.fechaIngreso}T09:00` : new Date().toISOString().slice(0, 16))
      );
      setObservaciones(loteAEditar.observaciones || '');
      setAla(loteAEditar.ala || '');
      setSector(loteAEditar.sector || '');
      setOrdenProcesoId(loteAEditar.ordenProcesoId || '');
      setNumeroOrdenMovimiento(loteAEditar.numeroOrdenMovimiento || '');
      setSilosOrigen(loteAEditar.silosOrigen || []);
      setBolsonOrigenId(loteAEditar.bolsonOrigenId || '');
      setNumeroBolsonOrigen(loteAEditar.numeroBolsonOrigen || loteAEditar.bolsonOrigenNro || '');
    } else {
      // Generar nuevo loteNro sugerido
      const allLoteNros = existingLotes.map(l => l.loteNro || l.id);
      const suggestedNro = generateLoteId(allLoteNros);
      setLoteNro(suggestedNro);
      // ID es cliente + _ + loteNro, lo calcularemos al guardar o dinámicamente
      setId(`${cliente.replace(/\s+/g, '_')}_${suggestedNro}`);
      setObservaciones('');
      setAla('');
      setSector('');
      setNumeroBolsonOrigen('');
      if (ordenesEnCurso.length > 0) {
        const firstOp = ordenesEnCurso[0];
        setOrdenProcesoId(firstOp.id);
        if (firstOp.silosOrigen && firstOp.silosOrigen.length > 0) {
          setSilosOrigen(firstOp.silosOrigen);
        }
        if (firstOp.tipoOrden === 'MOVIMIENTO') {
          setNumeroOrdenMovimiento(firstOp.numeroOrdenMovimiento || '');
        }
      } else {
        setOrdenProcesoId('');
      }
    }
  }, [loteAEditar, existingLotes, ordenesEnCurso]);

  // Sync orden de proceso selection with order fields (variedad, producto, categoria, etc.)
  const handleOrdenProcesoChange = (opId: string) => {
    setOrdenProcesoId(opId);
    const selectedOp = ordenesProceso.find(o => o.id === opId);
    if (selectedOp) {
      if (selectedOp.variedad) setVariedad(selectedOp.variedad);
      if (selectedOp.categoria) setCategoria(selectedOp.categoria as CategoriaType);
      
      if (tratamientos.includes('Sin Tratar') || (selectedOp.tratamiento && (selectedOp.tratamiento.toLowerCase().includes('sin') || selectedOp.tratamiento.toLowerCase().includes('sin tratar')))) {
        setProducto('Ninguno');
      } else if (selectedOp.producto) {
        setProducto(selectedOp.producto);
      }

      if (selectedOp.silosOrigen && selectedOp.silosOrigen.length > 0) {
        setSilosOrigen(selectedOp.silosOrigen);
      }
      if (selectedOp.tipoOrden === 'MOVIMIENTO') {
        setNumeroOrdenMovimiento(selectedOp.numeroOrdenMovimiento || '');
      } else {
        setNumeroOrdenMovimiento('');
      }
    }
  };


  // Recalcular ID único dinámicamente si cambia el cliente o loteNro (si no está en modo edición)
  useEffect(() => {
    if (!isEditing && cliente && loteNro) {
      setId(`${cliente.replace(/\s+/g, '_')}_${loteNro.trim()}`);
    }
  }, [cliente, loteNro, isEditing]);

  // Recalcular Kilogramos automáticamente al cambiar bolsas o peso de bolsa
  useEffect(() => {
    const bolsas = Number(stockBolsas) || 0;
    const peso = Number(kgPorBolsa) || 0;
    setStockKg(bolsas * peso);

    // Auto-definir estado si el stock es cero
    if (bolsas === 0) {
      setEstado('Agotado');
    } else if (estado === 'Agotado') {
      setEstado('Disponible');
    }
  }, [stockBolsas, kgPorBolsa]);

  // Manejo de tratamientos seleccionables múltiples
  const toggleTratamiento = (trat: TratamientoType) => {
    if (trat === 'Sin Tratar') {
      setTratamientos(['Sin Tratar']);
      setProducto('Ninguno');
    } else {
      let actualizado = [...tratamientos].filter(t => t !== 'Sin Tratar');
      if (actualizado.includes(trat)) {
        actualizado = actualizado.filter(t => t !== trat);
      } else {
        actualizado.push(trat);
      }
      
      if (actualizado.length === 0) {
        actualizado.push('Sin Tratar');
        setProducto('Ninguno');
      }
      setTratamientos(actualizado);
    }
  };

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (cliente.trim() === '') {
      setError('El campo Cliente es obligatorio.');
      return;
    }
    if (loteNro.trim() === '') {
      setError('El campo N° de Lote es obligatorio.');
      return;
    }
    if (variedad.trim() === '') {
      setError('El campo Variedad es obligatorio.');
      return;
    }
    if (!ala) {
      setError('Debe seleccionar un Ala de acopio obligatoriamente.');
      return;
    }
    if (!sector) {
      setError('Debe seleccionar un Sector de acopio obligatoriamente.');
      return;
    }
    if (!ordenProcesoId) {
      setError('Debe seleccionar una Orden de Proceso obligatoriamente para la vinculación y trazabilidad.');
      return;
    }

    const selectedOp = ordenesProceso.find(o => o.id === ordenProcesoId);
    if (selectedOp && selectedOp.tipoOrden === 'MOVIMIENTO' && !numeroOrdenMovimiento.trim()) {
      setError('La Orden de Proceso seleccionada es de MOVIMIENTO. Debe indicar el N° de Orden de Movimiento.');
      return;
    }

    if (stockBolsas < 0) {
      setError('La cantidad de bolsas no puede ser negativa.');
      return;
    }
    if (kgPorBolsa <= 0) {
      setError('El peso por bolsa debe ser mayor a cero.');
      return;
    }

    const uniqueId = isEditing ? id : `${cliente.replace(/\s+/g, '_')}_${loteNro.trim()}`;

    const calculatedCampania = getCampaniaIdFromDate(fechaIngreso);

    // Crear el objeto lote completo
    const loteGuardar: Lote = {
      id: uniqueId,
      loteNro: loteNro.trim(),
      cliente: cliente.trim(),
      especie,
      variedad: variedad.trim(),
      tipo,
      categoria,
      tratamiento: tratamientos,
      producto: tratamientos.includes('Sin Tratar') ? 'Ninguno' : (producto.trim() || 'Ninguno'),
      stockBolsas: Number(stockBolsas),
      kgPorBolsa: Number(kgPorBolsa),
      stockKg,
      fechaIngreso,
      campaniaId: calculatedCampania,
      estado: estado,
      estadoRegistro: estadoRegistro,
      fechaHoraProduccion: estadoRegistro === 'REALIZADO' ? (fechaHoraProduccion || `${fechaIngreso}T09:00`) : undefined,
      observaciones: observaciones.trim(),
      ala: ala,
      sector: sector,
      ordenProcesoId: ordenProcesoId,
      numeroOrdenMovimiento: selectedOp?.tipoOrden === 'MOVIMIENTO' ? numeroOrdenMovimiento.trim() : undefined,
      silosOrigen: silosOrigen,
      bolsonOrigenId: bolsonOrigenId || undefined,
      numeroBolsonOrigen: numeroBolsonOrigen.trim() || undefined,
      bolsonOrigenNro: numeroBolsonOrigen.trim() || undefined,
      historial: loteAEditar ? loteAEditar.historial : [
        {
          id: `MOV-${Date.now()}`,
          fecha: fechaIngreso,
          tipo: 'Entrada',
          cantidadBolsas: Number(stockBolsas),
          kgPorBolsa: Number(kgPorBolsa),
          cantidadKg: stockKg,
          detalle: 'Carga de stock inicial de lote'
        }
      ]
    };

    onSave(loteGuardar);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8" id="lote-form-container">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <span className="text-xs font-sans font-semibold tracking-widest text-[#C9922E] uppercase">
          {isEditing ? 'EDICIÓN DE REGISTRO' : 'NUEVO ACOPIO EN PLANTA'}
        </span>
        <h3 className="font-serif text-2xl font-bold text-[#1A1A1A] mt-1">
          {isEditing ? `Editar Lote: ${id}` : 'Registrar Lote de Semillas'}
        </h3>
      </div>

      {error && (
        <div className="bg-[#F5E5DC] text-[#A0522D] p-4 rounded-xl flex items-start gap-3 text-xs border border-red-200 mb-6">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGuardar} className="space-y-6">

        {/* SECCIÓN MODO DE REGISTRO (PRE-CARGA / REALIZADO) CON FECHA Y HORA DE PRODUCCIÓN */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl border border-slate-700/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                  Estado de Registro del Lote *
                </span>
                <span className="text-[11px] text-slate-300">
                  Defina si es una planificación (Pre-Carga) o una producción efectivamente realizada
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Vínculo a Dashboard de Producción
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            {/* Botones de Opciones Cerradas */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Seleccionar Modo *
              </label>
              <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-700 w-full shadow-inner">
                <button
                  type="button"
                  onClick={() => setEstadoRegistro('PRE-CARGA')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    estadoRegistro === 'PRE-CARGA'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  PRE-CARGA
                </button>

                <button
                  type="button"
                  onClick={() => setEstadoRegistro('REALIZADO')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    estadoRegistro === 'REALIZADO'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  REALIZADO
                </button>
              </div>
            </div>

            {/* Fecha y Hora de Producción (Activa con REALIZADO) */}
            {estadoRegistro === 'REALIZADO' ? (
              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-emerald-500/50 space-y-1 animate-in fade-in duration-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                  Fecha y Hora de Producción *
                </label>
                <input
                  type="datetime-local"
                  value={fechaHoraProduccion}
                  onChange={(e) => setFechaHoraProduccion(e.target.value)}
                  required={estadoRegistro === 'REALIZADO'}
                  className="w-full px-3 py-2 bg-slate-950 text-white font-mono text-xs font-bold rounded-lg border border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <span className="text-[10px] text-slate-400 block">
                  Esta fecha y hora alimentará los análisis de rendimiento y trazabilidad en el Dashboard de Producción.
                </span>
              </div>
            ) : (
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-amber-500/40 text-xs text-slate-300 flex items-start gap-2.5 shadow-sm">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 block">Lote en Pre-Carga (Sin afectación de silos)</span>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Con la opción <strong className="text-amber-400">PRE-CARGA</strong> activa <strong>NO se descuenta ni afecta el stock/salida de silos</strong>. La Salida de Silo se activará únicamente cuando presione el botón <strong className="text-emerald-400">REALIZADO</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sección de Orden de Proceso y Trazabilidad */}
        <div className="bg-gradient-to-r from-emerald-50 to-slate-50 border border-emerald-200/80 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <Factory className="w-4 h-4 text-emerald-700" />
              Orden de Proceso y Trazabilidad *
            </label>

            {onCreateOrdenProcesoClick && (
              <button
                type="button"
                onClick={onCreateOrdenProcesoClick}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
              >
                + Crear nueva Orden de Proceso
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selector de Orden de Proceso */}
            <div>
              <select
                value={ordenProcesoId}
                onChange={(e) => handleOrdenProcesoChange(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white text-slate-800 text-sm font-semibold rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
              >
                <option value="">
                  {ordenesEnCurso.length === 0 ? '-- No hay órdenes de proceso "En Curso" --' : '-- Seleccionar Orden de Proceso (En Curso) * --'}
                </option>
                {ordenesEnCurso.map(op => (
                  <option key={op.id} value={op.id}>
                    N° {op.numeroOrden} - {op.variedad} ({op.producto}) [{op.tipoOrden}] {op.tipoMovimiento ? `- ${op.tipoMovimiento}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-800/80 mt-1">
                Se muestran únicamente las Órdenes de Proceso con estado "En Curso".
              </p>
            </div>

            {/* Campo N° de Orden de Movimiento (Solo visible/requerido si Tipo de Orden = MOVIMIENTO) */}
            {(() => {
              const selectedOp = ordenesProceso.find(o => o.id === ordenProcesoId);
              if (selectedOp && selectedOp.tipoOrden === 'MOVIMIENTO') {
                return (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 mb-1 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      N° Orden de Movimiento *
                    </label>
                    <input
                      type="text"
                      value={numeroOrdenMovimiento}
                      onChange={(e) => setNumeroOrdenMovimiento(e.target.value)}
                      placeholder="Ej. OM-402"
                      required
                      className="w-full px-4 py-2 bg-white text-slate-800 font-mono text-sm font-bold rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                );
              }
              return null;
            })()}

            {/* Bolsón de origen con Selector / Buscador */}
            <div>
              <BolsonSearchSelector
                bolsones={bolsonesFiltradosPorSilo}
                selectedBolsonId={bolsonOrigenId}
                selectedBolsonNro={numeroBolsonOrigen}
                onSelectBolson={(bolson) => {
                  if (bolson) {
                    setBolsonOrigenId(bolson.id);
                    setNumeroBolsonOrigen(bolson.numeroBolson);
                  } else {
                    setBolsonOrigenId('');
                    setNumeroBolsonOrigen('');
                  }
                }}
                label="Bolsón de Origen (Trazabilidad)"
                placeholder={
                  silosOrigen.length === 0
                    ? "Seleccione primero el Silo de Origen abajo..."
                    : bolsonesFiltradosPorSilo.length === 0
                    ? "Sin bolsones registrados para este Silo"
                    : "Buscar bolsón por N°, cliente, cultivo, variedad..."
                }
              />
              {silosOrigen.length === 0 ? (
                <p className="text-[11px] text-amber-800 bg-amber-50/90 p-2 rounded-lg border border-amber-200 mt-1 flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Para seleccionar el Bolsón de Origen, primero elija el <strong>Silo de Origen (Extracción)</strong> en la sección inferior. Las opciones quedan predefinidas y filtradas por el silo seleccionado.
                  </span>
                </p>
              ) : (
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">
                    Filtrado por Silo(s): <strong className="text-slate-800 font-mono">{silosOrigen.map(s => s.siloId).join(', ')}</strong> ({bolsonesFiltradosPorSilo.length} bolsón(es) de origen hallado(s))
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200 shadow-2xs">
                    Sin afectación de stock
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* N° de Lote (Editable) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              N° de Lote * <span className="text-gray-400 font-normal">(Ej: 58FIN, 32INT)</span>
            </label>
            <input
              type="text"
              value={loteNro}
              onChange={(e) => setLoteNro(e.target.value)}
              className="w-full px-4 py-2.5 bg-white text-gray-800 font-mono text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              placeholder="Ej: 58FIN"
              required
            />
          </div>

          {/* ID de Lote Único Interno (Lectura únicamente) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              ID Único Interno (Cliente + Lote)
            </label>
            <input
              type="text"
              value={id}
              disabled
              className="w-full px-4 py-2.5 bg-gray-50 text-gray-400 font-mono text-sm rounded-lg border border-gray-100 focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* Cliente / Productor */}
          <ClienteSelect
            value={cliente}
            onChange={setCliente}
            label="Cliente / Productor *"
            selectClassName="w-full px-4 py-2.5 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] font-semibold"
            inputClassName="w-full px-4 py-2.5 bg-gray-50 text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] font-semibold mt-1"
          />

          {/* Especie de Grano (Selector Cerrado) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Especie de Grano *
            </label>
            <select
              value={especie}
              onChange={(e) => setEspecie(e.target.value as EspecieType)}
              className="w-full px-4 py-2.5 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              required
            >
              <option value="Soja">Soja</option>
              <option value="Trigo">Trigo</option>
              <option value="Arveja">Arveja</option>
              <option value="Sin especificar">Sin especificar</option>
            </select>
          </div>

          {/* Variedad (Texto Libre) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Variedad *
            </label>
            <input
              type="text"
              value={variedad}
              onChange={(e) => setVariedad(e.target.value)}
              className="w-full px-4 py-2.5 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              placeholder="Ej: Baguette 620, DM 46R18..."
              required
            />
          </div>

          {/* Tipo de Lote */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Tipo de Lote *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoLoteType)}
              className="w-full px-4 py-2.5 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
            >
              <option value="Intermedio">Intermedio</option>
              <option value="Final">Final</option>
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Categoría *
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaType)}
              className="w-full px-4 py-2.5 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
            >
              <option value="Fundadora">Fundadora</option>
              <option value="Preba">Preba</option>
              <option value="Original">Original</option>
              <option value="Primu">Primu</option>
            </select>
          </div>

          {/* Fecha de Ingreso */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Fecha de Ingreso *
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] bg-[#E3EFE7] text-[#00603C] px-2 py-0.5 rounded font-bold">
                <Calendar className="w-2.5 h-2.5" />
                Campaña: {getCampaniaIdFromDate(fechaIngreso)}
              </span>
            </div>
            <input
              type="date"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className="w-full px-4 py-2.5 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              required
            />
          </div>

          {/* Sector de Acopio */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-gray-50/60 p-4 rounded-xl border border-gray-100 shadow-inner">
            <div className="col-span-2 flex items-center gap-1.5 border-b border-gray-200/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00603C]">
                Sector de Acopio / Ubicación
              </span>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Ala *
              </label>
              <select
                value={ala}
                onChange={(e) => setAla(e.target.value)}
                className="w-full px-3 py-2 bg-white text-gray-800 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
                required
              >
                <option value="">-- Seleccionar Ala --</option>
                <option value="A">ALA: A</option>
                <option value="B">ALA: B</option>
                <option value="C">ALA: C</option>
                <option value="D">ALA: D</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Sector *
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 bg-white text-gray-800 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
                required
              >
                <option value="">-- Seleccionar Sector --</option>
                <option value="1">SECTOR: 1</option>
                <option value="2">SECTOR: 2</option>
                <option value="3">SECTOR: 3</option>
              </select>
            </div>
          </div>

          {/* Tratamientos (Multiselector en Checkboxes) */}
          <div className="md:col-span-2 bg-[#E3EFE7] bg-opacity-30 p-4 rounded-xl border border-[#E3EFE7]">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[#00603C] mb-3">
              Tratamiento de Semilla (Selección Múltiple)
            </span>
            <div className="flex flex-wrap gap-4">
              {(['Tratado', 'Sin Tratar'] as TratamientoType[]).map((trat) => {
                const checked = tratamientos.includes(trat);
                return (
                  <button
                    key={trat}
                    type="button"
                    onClick={() => toggleTratamiento(trat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition border ${
                      checked
                        ? 'bg-[#00603C] text-white border-[#00603C] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'border-white bg-white text-[#00603C]' : 'border-gray-300 bg-white'}`}>
                      {checked && <Check className="w-2.5 h-2.5 stroke-[4px]" />}
                    </div>
                    {trat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Producto de tratamiento */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2 flex items-center justify-between">
              <span>Producto Aplicado</span>
              {tratamientos.includes('Sin Tratar') && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                  Por defecto: "Ninguno"
                </span>
              )}
            </label>
            <input
              type="text"
              value={tratamientos.includes('Sin Tratar') ? 'Ninguno' : producto}
              onChange={(e) => setProducto(e.target.value)}
              disabled={tratamientos.includes('Sin Tratar')}
              className="w-full px-4 py-2.5 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] disabled:bg-slate-100 disabled:text-slate-600 disabled:font-bold"
              placeholder={tratamientos.includes('Sin Tratar') ? 'Ninguno' : 'Ej: Cruiser, Vitavax, Rizobio...'}
            />
          </div>

          {/* Estado de Lote */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Estado Inicial
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoLoteType)}
              disabled={stockBolsas === 0}
              className="w-full px-4 py-2.5 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] disabled:bg-gray-50"
            >
              <option value="Disponible">Disponible (Verde)</option>
              <option value="Reservado">Reservado (Dorado)</option>
              <option value="A Consumo">A Consumo (Púrpura)</option>
              <option value="Agotado">Agotado (Terracota)</option>
            </select>
          </div>

          {/* Parámetros de Stock (Cálculo Dinámico) */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F6EFDC] bg-opacity-40 p-4 rounded-xl border border-[#F6EFDC] border-opacity-50">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#C9922E] mb-2">
                Cantidad de Bolsas *
              </label>
              <input
                type="number"
                value={stockBolsas}
                onChange={(e) => setStockBolsas(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-4 py-2 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C9922E]"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#C9922E] mb-2">
                Kilogramos por Bolsa *
              </label>
              <input
                type="number"
                value={kgPorBolsa}
                onChange={(e) => setKgPorBolsa(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full px-4 py-2 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C9922E]"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#C9922E] mb-2">
                Equivalente Stock (Kg)
              </label>
              <input
                type="text"
                value={`${new Intl.NumberFormat('es-AR').format(stockKg)} kg`}
                disabled
                className="w-full px-4 py-2 bg-gray-50 text-[#C9922E] font-semibold text-sm rounded-lg border border-gray-200 font-mono"
              />
            </div>
          </div>

          {/* Silos de Origen */}
          <div className="md:col-span-2">
            <SilosSelector
              silosSeleccionados={silosOrigen}
              siloStocks={siloStocks}
              targetKg={stockKg}
              onChange={setSilosOrigen}
            />
          </div>

          {/* Observaciones (Texto libre largo) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Observaciones / Notas del Lote
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-4 py-3 bg-white text-gray-800 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              placeholder="Escriba aquí cualquier detalle técnico, observaciones de calidad o notas del acopio de este lote..."
              rows={3}
            />
          </div>

        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-semibold font-sans uppercase tracking-wider text-gray-500 rounded-lg hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold font-sans uppercase tracking-wider bg-[#00603C] hover:bg-[#254731] text-white rounded-lg shadow-md transition"
          >
            <Save className="w-4 h-4 text-[#C9922E]" />
            Guardar Lote
          </button>
        </div>
      </form>
    </div>
  );
};
