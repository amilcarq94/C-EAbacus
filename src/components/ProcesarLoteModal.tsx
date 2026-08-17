/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Lote, SiloId, SiloExtraccion, MovimientoSilo, BolsonCampo, OrigenBolsonItem, LoteLimitsConfig, EstadoRegistroLote, MovimientoStock } from '../types';
import { formatKg } from '../utils/formatters';
import { validateLoteLimits, getLoteLimits } from '../utils/loteLimits';
import { getBolsonesFiltradosPorSilo } from '../utils/siloBolsones';
import { validateSiloLoteMatch } from '../utils/siloValidation';
import { BolsonSearchSelector } from './BolsonSearchSelector';
import { ModalVentanaOperacion } from './ModalVentanaOperacion';
import { X, Check, CheckCircle2, Play, AlertTriangle, Building2, Package, Plus, Trash2, Warehouse, Layers, Scale } from 'lucide-react';

const SILOS_DISPONIBLES: SiloId[] = ['Silo 1', 'Silo 2', 'Silo 3', 'Silo 4', 'Silo 5', 'Silo 6'];

const SECTORES_OPCIONES = [
  { value: 'a', label: 'Sector a' },
  { value: 'b', label: 'Sector b' },
  { value: 'c', label: 'Sector c' },
  { value: 'd', label: 'Sector d' },
  { value: 'e', label: 'Sector e' },
  { value: 'f', label: 'Sector f' },
  { value: 'g', label: 'Sector g' },
  { value: 'h', label: 'Sector h' },
  { value: 'Todos', label: 'Todos los sectores' },
];

export interface OrigenLineaItem {
  id: string;
  siloId: SiloId;
  bolsonId?: string;
  bolsonNro?: string;
  sector?: string;
  kgExtraidos: number;
}

interface ProcesarLoteModalProps {
  isOpen: boolean;
  lote: Lote | null;
  lotesToProcess?: Lote[];
  siloStocks?: Record<SiloId, number>;
  movimientosSilo?: MovimientoSilo[];
  bolsones?: BolsonCampo[];
  loteLimits?: LoteLimitsConfig;
  onConfirm: (lotesActualizados: Lote | Lote[]) => void;
  onClose: () => void;
}

export const ProcesarLoteModal: React.FC<ProcesarLoteModalProps> = ({
  isOpen,
  lote,
  lotesToProcess = [],
  siloStocks = {
    'Silo 1': 0,
    'Silo 2': 0,
    'Silo 3': 0,
    'Silo 4': 0,
    'Silo 5': 0,
    'Silo 6': 0,
  },
  movimientosSilo = [],
  bolsones = [],
  loteLimits,
  onConfirm,
  onClose,
}) => {
  if (!isOpen || (!lote && lotesToProcess.length === 0)) return null;

  const targetLotes = lotesToProcess.length > 0 ? lotesToProcess : (lote ? [lote] : []);
  const primaryLote = targetLotes[0];

  const activeLimits = loteLimits || getLoteLimits();

  // Estados del modal
  const [estadoResultado, setEstadoResultado] = useState<EstadoRegistroLote>('REALIZADO');
  const [fechaRealizacion, setFechaRealizacion] = useState(() => new Date().toISOString().split('T')[0]);

  const [bolsasProducidas, setBolsasProducidas] = useState<number>(primaryLote.stockBolsas || 35);
  const [kgPorBolsa, setKgPorBolsa] = useState<number>(primaryLote.kgPorBolsa || activeLimits.kgPorBolsaDefault);
  const [kgTotales, setKgTotales] = useState<number>((primaryLote.stockBolsas || 35) * (primaryLote.kgPorBolsa || activeLimits.kgPorBolsaDefault));

  const [ala, setAla] = useState(primaryLote.ala || 'A');
  const [sector, setSector] = useState(primaryLote.sector || '1');
  const [observaciones, setObservaciones] = useState(primaryLote.observaciones || '');
  const [errorMsg, setErrorMsg] = useState('');

  // Sincronizar kgTotales cuando cambien bolsasProducidas o kgPorBolsa
  useEffect(() => {
    const b = isNaN(bolsasProducidas) ? 0 : bolsasProducidas;
    const kgB = isNaN(kgPorBolsa) ? activeLimits.kgPorBolsaDefault : kgPorBolsa;
    setKgTotales(b * kgB);
  }, [bolsasProducidas, kgPorBolsa, activeLimits]);

  // Inicialización de líneas de origen múltiples
  const createInitialOriginLineas = (l: Lote, defaultKg: number): OrigenLineaItem[] => {
    if (l.silosOrigen && l.silosOrigen.length > 0) {
      return l.silosOrigen.map((s, idx) => {
        const b = l.origenesBolson?.[idx] || {
          bolsonId: l.bolsonOrigenId || '',
          bolsonNro: l.numeroBolsonOrigen || l.bolsonOrigenNro || '',
          sector: l.sectorBolsonOrigen || ''
        };
        return {
          id: `origen-${idx}-${Date.now()}`,
          siloId: s.siloId || 'Silo 1',
          bolsonId: b.bolsonId || '',
          bolsonNro: b.bolsonNro || '',
          sector: b.sector || '',
          kgExtraidos: Number(s.kgExtraidos) || Number(s.kg) || defaultKg
        };
      });
    }

    if (l.origenesBolson && l.origenesBolson.length > 0) {
      return l.origenesBolson.map((b, idx) => ({
        id: `origen-${idx}-${Date.now()}`,
        siloId: (l.siloOrigen as SiloId) || 'Silo 1',
        bolsonId: b.bolsonId || '',
        bolsonNro: b.bolsonNro || '',
        sector: b.sector || '',
        kgExtraidos: defaultKg
      }));
    }

    return [{
      id: `origen-0-${Date.now()}`,
      siloId: (l.siloOrigen as SiloId) || 'Silo 1',
      bolsonId: l.bolsonOrigenId || '',
      bolsonNro: l.numeroBolsonOrigen || l.bolsonOrigenNro || '',
      sector: l.sectorBolsonOrigen || '',
      kgExtraidos: defaultKg
    }];
  };

  const initialTargetKg = (primaryLote.stockBolsas || 35) * (primaryLote.kgPorBolsa || activeLimits.kgPorBolsaDefault);
  const [origenLineas, setOrigenLineas] = useState<OrigenLineaItem[]>(() =>
    createInitialOriginLineas(primaryLote, initialTargetKg)
  );

  // Sincronizar campos cuando cambie el lote objetivo
  useEffect(() => {
    if (primaryLote) {
      const now = new Date();
      setFechaRealizacion(now.toISOString().split('T')[0]);
      const bProd = primaryLote.stockBolsas || 35;
      const kgB = primaryLote.kgPorBolsa || activeLimits.kgPorBolsaDefault;
      setBolsasProducidas(bProd);
      setKgPorBolsa(kgB);
      const calcKg = bProd * kgB;
      setKgTotales(calcKg);
      setOrigenLineas(createInitialOriginLineas(primaryLote, calcKg));
      setAla(primaryLote.ala || 'A');
      setSector(primaryLote.sector || '1');
      setObservaciones(primaryLote.observaciones || '');
    }
  }, [primaryLote, activeLimits]);

  // Resumen de kg extraídos por Silo (sumando todas las líneas de origen que apunten al mismo silo)
  const silosReqMap = useMemo(() => {
    const map = new Map<SiloId, number>();
    origenLineas.forEach(line => {
      if (line.siloId) {
        const prev = map.get(line.siloId) || 0;
        map.set(line.siloId, prev + (Number(line.kgExtraidos) || 0));
      }
    });
    return map;
  }, [origenLineas]);

  // Total kg extraídos entre todas las fuentes
  const totalKgExtraidosOrigins = useMemo(() => {
    return origenLineas.reduce((acc, curr) => acc + (Number(curr.kgExtraidos) || 0), 0);
  }, [origenLineas]);

  // Helper para obtener bolsones disponibles de un silo específico
  const getBolsonesForSilo = (sId: SiloId) => {
    return getBolsonesFiltradosPorSilo(
      [{ siloId: sId, kgExtraidos: 0 }],
      movimientosSilo,
      bolsones,
      primaryLote,
      primaryLote?.cliente
    );
  };

  // Handlers para líneas de origen
  const handleAgregarOrigenLinea = () => {
    const silosUsados = origenLineas.map(l => l.siloId);
    const disponible = SILOS_DISPONIBLES.find(s => !silosUsados.includes(s)) || 'Silo 1';
    const kgFaltantes = Math.max(0, kgTotales - totalKgExtraidosOrigins);

    setOrigenLineas(prev => [
      ...prev,
      {
        id: `origen-${Date.now()}-${Math.random()}`,
        siloId: disponible,
        bolsonId: '',
        bolsonNro: '',
        sector: '',
        kgExtraidos: kgFaltantes > 0 ? kgFaltantes : 0
      }
    ]);
  };

  const handleQuitarOrigenLinea = (id: string) => {
    setOrigenLineas(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(item => item.id !== id);
    });
  };

  const handleUpdateOrigenLinea = (id: string, field: keyof OrigenLineaItem, value: any) => {
    setOrigenLineas(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Submit guardar / confirmar
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fechaRealizacion) {
      setErrorMsg('Debe ingresar la fecha de realización.');
      return;
    }

    if (origenLineas.length === 0) {
      setErrorMsg('Debe definir al menos una fuente de origen.');
      return;
    }

    // 1. Validaciones por línea de origen
    for (let i = 0; i < origenLineas.length; i++) {
      const line = origenLineas[i];
      if (!line.siloId) {
        setErrorMsg(`La línea de origen #${i + 1} debe tener un Silo asignado.`);
        return;
      }
      if (!line.kgExtraidos || line.kgExtraidos <= 0) {
        setErrorMsg(`La línea de origen #${i + 1} (${line.siloId}) debe indicar kg extraídos mayor a cero.`);
        return;
      }
    }

    // 2. Validación de coincidencia de orígenes (Cliente, Especie, Variedad) entre Silo y Lote
    if (estadoResultado === 'REALIZADO') {
      for (const [sId] of silosReqMap.entries()) {
        const matchCheck = validateSiloLoteMatch(
          sId,
          { cliente: primaryLote.cliente, especie: primaryLote.especie, variedad: primaryLote.variedad },
          movimientosSilo
        );
        if (!matchCheck.valid) {
          setErrorMsg(matchCheck.errorMessage || `No se puede vincular el ${sId} por diferencia en los orígenes vinculantes (Cliente / Especie / Variedad).`);
          return;
        }
      }
    }

    // 3. Validación de Stock por Silo
    for (const [sId, reqKg] of silosReqMap.entries()) {
      const dispKg = siloStocks[sId] || 0;
      if (reqKg > dispKg) {
        setErrorMsg(`Stock insuficiente en ${sId}. Disponible: ${formatKg(dispKg)}, Solicitado en orígenes: ${formatKg(reqKg)}.`);
        return;
      }
    }

    // Los datos del bolsón de origen son únicamente informativos y no descuentan ni bloquean por stock.

    const fechaHoraStr = fechaRealizacion;

    // Construir estructuras finales
    const silosOrigenFinal: SiloExtraccion[] = Array.from(silosReqMap.entries()).map(([sId, reqKg]) => ({
      siloId: sId,
      kgExtraidos: reqKg,
      kg: reqKg
    }));

    const origenesBolsonFinal: OrigenBolsonItem[] = origenLineas
      .filter(line => line.bolsonNro && line.bolsonNro.trim() !== '')
      .map(line => ({
        bolsonId: line.bolsonId || '',
        bolsonNro: line.bolsonNro?.trim() || '',
        sector: line.sector?.trim() || ''
      }));

    const bolsonesNroConcat = origenesBolsonFinal.map(o => o.bolsonNro).filter(Boolean).join(', ');
    const sectoresConcat = origenesBolsonFinal.map(o => o.sector || '—').filter(Boolean).join(', ');
    const ubicacionStr = ala && sector ? `Ala ${ala} - Sector ${sector}` : (ala || sector || primaryLote.ubicacionAcopio || 'Sin asignar');

    const updatedLotesList: Lote[] = targetLotes.map(currLote => {
      const currentBolsas = targetLotes.length === 1 ? bolsasProducidas : (currLote.stockBolsas || 35);
      const currentKgB = targetLotes.length === 1 ? kgPorBolsa : (currLote.kgPorBolsa || activeLimits.kgPorBolsaDefault);
      const currentKgTot = targetLotes.length === 1 ? kgTotales : (currentBolsas * currentKgB);

      const movimientoRealizacion: MovimientoStock = {
        id: `MOV-PROC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fecha: fechaRealizacion,
        tipo: 'Entrada manual',
        cantidadBolsas: currentBolsas,
        kgPorBolsa: currentKgB,
        cantidadKg: currentKgTot,
        detalle: `Pase a REALIZADO - ${fechaHoraStr}`
      };

      return {
        ...currLote,
        estadoRegistro: estadoResultado,
        fechaHoraProduccion: fechaHoraStr,
        fechaIngreso: fechaRealizacion,
        stockBolsas: currentBolsas,
        kgPorBolsa: currentKgB,
        stockKg: currentKgTot,
        estado: currentBolsas > 0 ? 'Disponible' : 'Agotado',
        silosOrigen: silosOrigenFinal,
        origenesBolson: origenesBolsonFinal,
        numeroBolsonOrigen: bolsonesNroConcat || currLote.numeroBolsonOrigen,
        bolsonOrigenNro: bolsonesNroConcat || currLote.bolsonOrigenNro,
        sectorBolsonOrigen: sectoresConcat || currLote.sectorBolsonOrigen,
        siloOrigen: silosOrigenFinal[0]?.siloId || currLote.siloOrigen,
        ala,
        sector,
        ubicacionAcopio: ubicacionStr,
        observaciones: observaciones.trim() || currLote.observaciones,
        historial: [movimientoRealizacion, ...(currLote.historial || [])]
      };
    });

    if (targetLotes.length === 1) {
      onConfirm(updatedLotesList[0]);
    } else {
      onConfirm(updatedLotesList);
    }
  };

  const demandaCubierta = targetLotes.length > 1 || totalKgExtraidosOrigins >= kgTotales;

  const modalTitle = targetLotes.length === 1
    ? `Pasar Lote N° ${primaryLote.loteNro} a Realizado`
    : `Pasar ${targetLotes.length} Lotes a Realizado`;

  const modalSubtitle = targetLotes.length === 1
    ? `${primaryLote.cliente} — ${primaryLote.especie} (${primaryLote.variedad})`
    : `Lotes seleccionados: ${targetLotes.map(l => l.loteNro).join(', ')}`;

  return (
    <ModalVentanaOperacion
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={CheckCircle2}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
        )}

          {/* 1. Estado del Registro Destino */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
              1. Estado de Registro Destino *
            </span>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEstadoResultado('REALIZADO')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  estadoResultado === 'REALIZADO'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg font-extrabold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>REALIZADO (Completo)</span>
                <span className="text-[10px] font-normal opacity-80">Genera salidas activas de stock en silos</span>
              </button>

              <button
                type="button"
                onClick={() => setEstadoResultado('EN_CURSO')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  estadoResultado === 'EN_CURSO'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-lg font-extrabold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Play className="w-5 h-5 text-amber-300" />
                <span>EN CURSO (Parcial)</span>
                <span className="text-[10px] font-normal opacity-80">Mantiene lote abierto para producción</span>
              </button>
            </div>
          </div>

          {/* 2. Fecha de Realización */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Fecha de Realización *
              </label>
              <input
                type="date"
                value={fechaRealizacion}
                onChange={(e) => setFechaRealizacion(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 3. Selector de Orígenes Múltiples (Silo + Bolsón + Sector + Validaciones) */}
          <div className="bg-amber-50/60 border border-amber-200/80 p-5 rounded-2xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#00603C] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C9922E]" />
                  3. Selector de Fuentes de Origen Múltiples (Silo + Bolsón + Sector)
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Asigne una o más fuentes de origen. Las salidas se descuentan únicamente del Silo de Origen. Los datos del Bolsón y Sector son puramente informativos.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAgregarOrigenLinea}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00603C] hover:bg-[#254731] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>+ Agregar Origen</span>
              </button>
            </div>

            {/* Resumen de Masa de Extracción */}
            {targetLotes.length === 1 && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Demanda del Lote</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{formatKg(kgTotales)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Asignado de Orígenes</span>
                    <span className={`font-mono font-black text-sm ${demandaCubierta ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {formatKg(totalKgExtraidosOrigins)}
                    </span>
                  </div>

                  <div>
                    {demandaCubierta ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        DEMANDA CUBIERTA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[11px] font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        FALTAN {formatKg(kgTotales - totalKgExtraidosOrigins)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      demandaCubierta ? 'bg-emerald-500' : totalKgExtraidosOrigins > 0 ? 'bg-amber-400' : 'bg-slate-300'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((totalKgExtraidosOrigins / Math.max(1, kgTotales)) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Lista de Tarjetas de Líneas de Origen */}
            <div className="space-y-4">
              {origenLineas.map((line, idx) => {
                const stockSiloDisp = siloStocks[line.siloId] || 0;
                const reqTotalSilo = silosReqMap.get(line.siloId) || 0;
                const excedeStockSilo = reqTotalSilo > stockSiloDisp;

                const bolsonesDelSilo = getBolsonesForSilo(line.siloId);
                const bObj = bolsones.find(b => b.id === line.bolsonId || b.numeroBolson === line.bolsonNro);
                const stockBolsonDisp = bObj ? (bObj.stockKg !== undefined ? bObj.stockKg : ((bObj.entradasKg || 0) - (bObj.salidasKg || 0))) : undefined;

                return (
                  <div
                    key={line.id}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      excedeStockSilo
                        ? 'bg-red-50/90 border-red-300 shadow-sm'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Header de la línea */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#00603C] text-white text-[10px] font-black flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Fuente de Origen #{idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {excedeStockSilo && (
                          <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                            ¡Excede Silo!
                          </span>
                        )}

                        {origenLineas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleQuitarOrigenLinea(line.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition cursor-pointer"
                            title="Quitar esta fuente de origen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Campos de la Línea: Silo, Bolsón, Sector, Kg Extraídos */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      
                      {/* 1. Silo de Origen */}
                      <div className="sm:col-span-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase">
                            1. Silo *
                          </label>
                          <span className={`text-[10px] font-mono font-bold ${excedeStockSilo ? 'text-red-600 font-black' : 'text-slate-500'}`}>
                            Disp: {formatKg(stockSiloDisp)}
                          </span>
                        </div>
                        <select
                          value={line.siloId}
                          onChange={(e) => handleUpdateOrigenLinea(line.id, 'siloId', e.target.value as SiloId)}
                          className={`w-full px-2.5 py-2 bg-slate-50 border rounded-xl text-xs font-bold font-serif text-slate-900 ${
                            excedeStockSilo ? 'border-red-400 ring-2 ring-red-300' : 'border-slate-300'
                          }`}
                        >
                          {SILOS_DISPONIBLES.map(s => (
                            <option key={s} value={s}>
                              {s} (Stock: {formatKg(siloStocks[s] || 0)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Bolsón de Origen */}
                      <div className="sm:col-span-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase">
                            2. Bolsón <span className="text-slate-400 font-normal">(Informativo)</span>
                          </label>
                          {stockBolsonDisp !== undefined && (
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              Reg: {formatKg(stockBolsonDisp)}
                            </span>
                          )}
                        </div>

                        <BolsonSearchSelector
                          bolsones={bolsonesDelSilo}
                          selectedBolsonId={line.bolsonId}
                          selectedBolsonNro={line.bolsonNro}
                          onSelectBolson={(b) => {
                            if (b) {
                              let autoSector = line.sector || '';
                              if (b.zona) {
                                const zNorm = b.zona.trim().toLowerCase();
                                if (['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'todos'].includes(zNorm)) {
                                  autoSector = zNorm === 'todos' ? 'Todos' : zNorm;
                                }
                              }
                              handleUpdateOrigenLinea(line.id, 'bolsonId', b.id);
                              handleUpdateOrigenLinea(line.id, 'bolsonNro', b.numeroBolson);
                              handleUpdateOrigenLinea(line.id, 'sector', autoSector);
                            } else {
                              handleUpdateOrigenLinea(line.id, 'bolsonId', '');
                              handleUpdateOrigenLinea(line.id, 'bolsonNro', '');
                              handleUpdateOrigenLinea(line.id, 'sector', '');
                            }
                          }}
                          label=""
                          placeholder="Buscar bolsón..."
                        />
                      </div>

                      {/* 3. Sector del Bolsón */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">
                          3. Sector
                        </label>
                        <select
                          value={line.sector || ''}
                          onChange={(e) => handleUpdateOrigenLinea(line.id, 'sector', e.target.value)}
                          className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                        >
                          <option value="">-- Sector --</option>
                          {SECTORES_OPCIONES.map(sec => (
                            <option key={sec.value} value={sec.value}>{sec.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* 4. Kg Extraídos de este origen */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">
                          4. Kg Extraídos *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={line.kgExtraidos}
                            onChange={(e) => handleUpdateOrigenLinea(line.id, 'kgExtraidos', Number(e.target.value))}
                            className={`w-full px-2.5 py-2 bg-white border rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 ${
                              excedeStockSilo
                                ? 'border-red-400 text-red-900 focus:ring-red-400'
                                : 'border-slate-300 focus:ring-[#00603C]'
                            }`}
                            required
                          />
                        </div>
                      </div>

                    </div>

                    {/* Mensajes descriptivos de exceso de stock en la línea */}
                    {excedeStockSilo && (
                      <p className="text-[11px] font-bold text-red-700 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>El {line.siloId} tiene {formatKg(stockSiloDisp)} disponibles, pero se solicitan {formatKg(reqTotalSilo)} acumulados.</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAgregarOrigenLinea}
              className="w-full py-2.5 bg-white hover:bg-emerald-50/80 text-[#00603C] font-extrabold text-xs uppercase tracking-wider rounded-xl border border-dashed border-[#00603C]/40 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4 text-[#C9922E]" />
              <span>+ Agregar otra fuente de origen (Silo + Bolsón + Sector)</span>
            </button>
          </div>

          {/* 4. Producción (Aplica para lote individual) */}
          {targetLotes.length === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Stock Bolsas Producidas
                </label>
                <input
                  type="number"
                  min="0"
                  value={bolsasProducidas}
                  onChange={(e) => setBolsasProducidas(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Kg por Bolsa
                </label>
                <input
                  type="number"
                  min="1"
                  value={kgPorBolsa}
                  onChange={(e) => setKgPorBolsa(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Stock Total Calculado
                </label>
                <div className="px-3 py-2 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold font-mono text-emerald-900">
                  {formatKg(kgTotales)}
                </div>
              </div>
            </div>
          )}

          {/* 5. Ubicación Acopio y Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Ala de Acopio
              </label>
              <select
                value={ala}
                onChange={(e) => setAla(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="A">Ala A</option>
                <option value="B">Ala B</option>
                <option value="C">Ala C</option>
                <option value="D">Ala D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Sector de Acopio
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="1">Sector 1</option>
                <option value="2">Sector 2</option>
                <option value="3">Sector 3</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Observaciones
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas u observaciones de realización..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-[#00603C] hover:bg-[#254731] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md transition cursor-pointer"
            >
              <Check className="w-4 h-4 text-amber-300" />
              <span>Confirmar Pasaje a {estadoResultado}</span>
            </button>
          </div>
        </form>
    </ModalVentanaOperacion>
  );
};
