/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Lote, MovimientoSilo, SiloId, Chofer, BolsonCampo, EstadoRegistroLote, OrdenCarga } from '../types';
import { SILOS_DISPONIBLES } from './SilosSelector';
import { getSiloDetailedInfo, SiloFullInfo } from '../utils/siloValidation';
import { formatNumberArg } from '../utils/formatters';
import { DespachosSection } from './DespachosSection';
import { FichaTecnicaSiloModal } from './FichaTecnicaSiloModal';
import { GrillaSeisSilosModal } from './GrillaSeisSilosModal';
import {
  Warehouse,
  QrCode,
  CheckCircle2,
  Wifi,
  WifiOff,
  ClipboardList,
  FileText,
  Grid3X3,
  Calendar,
  Truck,
  Droplets,
  Scale,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Info,
  Clock,
  User,
  Eye
} from 'lucide-react';

interface ModoPlantaMobileViewProps {
  lotes: Lote[];
  siloStocks: Record<SiloId, number>;
  movimientosSilo: MovimientoSilo[];
  choferes: Chofer[];
  bolsones: BolsonCampo[];
  clientes: string[];
  especies: string[];
  currentUser: { nombre: string; rol: string };
  ordenesCarga: OrdenCarga[];
  onOpenQrScanner: () => void;
  onSelectLote: (lote: Lote) => void;
  onSaveOrdenCarga: (orden: OrdenCarga) => void;
  onUpdateOrdenStatus: (
    ordenId: string,
    nuevoEstado: 'Disponible' | 'Aceptada' | 'Despachada',
    fotoRemito?: string,
    firmaChofer?: string
  ) => void;
  onDespacharStock: (loteId: string, bolsas: number, kg: number, ordenId: string) => boolean;
  onDeleteOrdenCarga?: (id: string) => void;
  onSolicitarLogin?: () => void;
}

export const ModoPlantaMobileView: React.FC<ModoPlantaMobileViewProps> = ({
  lotes,
  siloStocks,
  movimientosSilo,
  choferes,
  bolsones,
  clientes,
  especies,
  currentUser,
  ordenesCarga,
  onOpenQrScanner,
  onSelectLote,
  onSaveOrdenCarga,
  onUpdateOrdenStatus,
  onDespacharStock,
  onDeleteOrdenCarga,
  onSolicitarLogin
}) => {
  const [subTab, setSubTab] = useState<'SILOS' | 'DESPACHOS_PLAYA'>('SILOS');
  const [siloSeleccionado, setSiloSeleccionado] = useState<SiloId>('Silo 1');
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Modales de Ficha Técnica
  const [fichaModalSilo, setFichaModalSilo] = useState<SiloId | null>(null);
  const [showGrillaSeisSilos, setShowGrillaSeisSilos] = useState(false);

  // Escuchar estado de conexión online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calcular la información detallada de los 6 silos
  const silosInfoMap = useMemo(() => {
    const map: Record<SiloId, SiloFullInfo> = {} as any;
    SILOS_DISPONIBLES.forEach((siloId) => {
      map[siloId] = getSiloDetailedInfo(siloId, movimientosSilo);
    });
    return map;
  }, [movimientosSilo]);

  const siloActivo = silosInfoMap[siloSeleccionado] || silosInfoMap['Silo 1'];

  // Totales de stock en silos
  const totalStockSilosKg = useMemo(() => {
    return (Object.values(silosInfoMap) as SiloFullInfo[]).reduce((acc, s) => acc + s.stockKg, 0);
  }, [silosInfoMap]);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16">
      
      {/* Barra Superior de Estado y Conexión de Planta Móvil */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl flex items-center justify-center ${
            isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5 animate-pulse" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              <span className="font-bold text-xs text-gray-900">
                Planta Móvil · {isOnline ? 'En línea' : 'Sin señal'}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-mono block">
              {currentUser.nombre || 'Acceso Público'} ({currentUser.rol || 'Visualizador'})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQrScanner}
            className="p-2.5 bg-[#00603C] hover:bg-[#254731] text-white rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Escanear QR de Lote o Silo"
          >
            <QrCode className="w-4 h-4 text-[#C9922E]" />
            <span className="hidden sm:inline">Escanear QR</span>
          </button>
        </div>
      </div>

      {/* Selector de Sub-pestañas Táctiles: Silos y Mis Órdenes (Playa) */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-2xs">
        <button
          onClick={() => setSubTab('SILOS')}
          className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'SILOS'
              ? 'bg-[#00603C] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Warehouse className={`w-4 h-4 ${subTab === 'SILOS' ? 'text-[#C9922E]' : 'text-slate-500'}`} />
          <span>Silos</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ml-1 ${
            subTab === 'SILOS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            6
          </span>
        </button>

        <button
          onClick={() => setSubTab('DESPACHOS_PLAYA')}
          className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'DESPACHOS_PLAYA'
              ? 'bg-[#00603C] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <ClipboardList className={`w-4 h-4 ${subTab === 'DESPACHOS_PLAYA' ? 'text-[#C9922E]' : 'text-slate-500'}`} />
          <span>Mis Órdenes (Playa)</span>
          {ordenesCarga.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ml-1 ${
              subTab === 'DESPACHOS_PLAYA' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {ordenesCarga.length}
            </span>
          )}
        </button>
      </div>

      {/* 1. SECCIÓN DE SILOS: SELECTOR Y VISOR DE SOLO VISUALIZACIÓN */}
      {subTab === 'SILOS' && (
        <div className="space-y-4">
          
          {/* Header de la sección Silos con acciones de Ficha Técnica */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-sans font-bold tracking-widest text-[#00603C] uppercase">
                    VISOR DE CONTROL DE SILOS
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9.5px] font-bold border border-slate-200">
                    Solo Visualización
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-gray-900 mt-0.5">
                  Estado de Capacidad y Operaciones
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrillaSeisSilos(true)}
                  className="px-3 py-1.5 bg-[#E3EFE7] hover:bg-[#C2E0CC] text-[#00603C] font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-[#00603C]/30 shadow-2xs cursor-pointer"
                  title="Ver e Imprimir Grilla de los 6 Silos en 1 Hoja A4"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grilla 6 Silos (A4)</span>
                  <span className="sm:hidden">Grilla A4</span>
                </button>
              </div>
            </div>

            {/* Resumen Global Rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Stock Total en Silos
                </span>
                <span className="font-mono font-black text-[#00603C] text-sm">
                  {formatNumberArg(totalStockSilosKg, 0)} kg
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {(totalStockSilosKg / 1000).toFixed(1)} Tn
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Capacidad Total
                </span>
                <span className="font-mono font-black text-slate-800 text-sm">
                  1.080.000 kg
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  1.080 Tn (6 Silos x 180 Tn)
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Ocupación General
                </span>
                <span className="font-mono font-black text-[#C9922E] text-sm">
                  {((totalStockSilosKg / 1080000) * 100).toFixed(1)}%
                </span>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-[#00603C] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalStockSilosKg / 1080000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SELECTOR "SELECCIONAR SILO" (LOS 6 SILOS CON SUS 5 DATOS: Cliente, Especie, Variedad, Stock actual, Humedad promedio) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Seleccionar Silo (6 Silos de Planta)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Toque un silo para ver su detalle
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SILOS_DISPONIBLES.map((siloId) => {
                const info = silosInfoMap[siloId];
                const isSelected = siloSeleccionado === siloId;
                const hasStock = info.stockKg > 0;
                const pct = Number(info.pctOcupacion);

                return (
                  <button
                    key={siloId}
                    type="button"
                    onClick={() => setSiloSeleccionado(siloId)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'border-[#00603C] bg-white ring-2 ring-[#00603C]/40 shadow-md transform -translate-y-0.5'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                    }`}
                  >
                    {/* Indicador de selección */}
                    {isSelected && (
                      <div className="absolute top-0 right-0 left-0 h-1 bg-[#00603C]" />
                    )}

                    {/* Cabecera de la Tarjeta del Silo */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-serif font-black text-xs ${
                          isSelected
                            ? 'bg-[#00603C] text-white shadow-xs'
                            : 'bg-[#E3EFE7] text-[#00603C]'
                        }`}>
                          {siloId.replace('Silo ', 'S')}
                        </div>
                        <div>
                          <h4 className="font-serif font-extrabold text-sm text-slate-900 leading-none">
                            {siloId}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            {hasStock ? `${info.stockTn} Tn` : 'Vacío'}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                        hasStock
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        {hasStock ? `${info.pctOcupacion}%` : '0%'}
                      </span>
                    </div>

                    {/* Barra de nivel del Silo */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2.5 border border-slate-200/60">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-[#00603C]'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {/* 5 Datos Mandatarios para cada uno de los 6 silos */}
                    <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
                      {/* 1. Cliente */}
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Cliente:</span>
                        <span className="font-bold text-[#00603C] truncate max-w-[150px] text-right" title={info.cliente}>
                          {info.cliente}
                        </span>
                      </div>

                      {/* 2. Especie */}
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Especie:</span>
                        <span className="font-bold text-slate-800 truncate text-right">
                          {info.especie}
                        </span>
                      </div>

                      {/* 3. Variedad */}
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Variedad:</span>
                        <span className="font-bold text-slate-800 truncate text-right">
                          {info.variedad}
                        </span>
                      </div>

                      {/* 4. Stock actual */}
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Stock actual:</span>
                        <span className="font-mono font-bold text-slate-900 text-right">
                          {formatNumberArg(info.stockKg, 0)} kg
                        </span>
                      </div>

                      {/* 5. Humedad promedio */}
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Humedad:</span>
                        <span className="font-mono font-bold text-slate-800 text-right">
                          {hasStock ? `${info.humedad}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DETALLE COMPLETO DEL SILO SELECCIONADO (SOLO VISUALIZACIÓN) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            
            {/* Header del Detalle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00603C] text-white flex items-center justify-center font-serif font-black text-sm shadow-xs">
                  {siloActivo.siloId.replace('Silo ', 'S')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-black text-slate-900 leading-tight">
                      Detalle {siloActivo.siloId}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      siloActivo.stockKg > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}>
                      {siloActivo.stockKg > 0 ? 'Con Stock' : 'Silo Vacío'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Planta de Clasificación de Semillas · La Barrancosa
                  </p>
                </div>
              </div>

              {/* Botón para abrir la Ficha Técnica Oficial */}
              <button
                type="button"
                onClick={() => setFichaModalSilo(siloActivo.siloId)}
                className="px-3.5 py-2 bg-[#00603C] hover:bg-[#254731] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-[#C9922E]" />
                <span>Ver Ficha Técnica Oficial</span>
              </button>
            </div>

            {/* Ficha Resumen de 5 Campos de Datos */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/70 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Cliente destacado */}
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Cliente Comitente
                  </span>
                  <div className="font-sans font-black text-[#00603C] text-sm truncate" title={siloActivo.cliente}>
                    {siloActivo.cliente}
                  </div>
                </div>

                {/* Especie y Variedad */}
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Especie / Variedad
                  </span>
                  <div className="font-bold text-slate-800 text-sm">
                    {siloActivo.especie} · <span className="font-medium text-slate-600">{siloActivo.variedad}</span>
                  </div>
                </div>

                {/* Stock Actual y Capacidad */}
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Stock Actual en Silo
                  </span>
                  <div className="font-mono font-black text-slate-900 text-sm">
                    {formatNumberArg(siloActivo.stockKg, 0)} kg ({siloActivo.stockTn} Tn)
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Espacio disponible: {formatNumberArg(siloActivo.disponibleKg, 0)} kg ({siloActivo.disponibleTn} Tn)
                  </span>
                </div>

                {/* Humedad Promedio */}
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Humedad Promedio Ponderada
                  </span>
                  <div className="font-mono font-black text-slate-800 text-sm flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span>{siloActivo.stockKg > 0 ? `${siloActivo.humedad}%` : '0.0%'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Base de recibo estándar: 13.5%
                  </span>
                </div>
              </div>

              {/* Barra de progreso de llenado */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-600">Nivel de llenado: {siloActivo.pctOcupacion}%</span>
                  <span className="text-slate-500 font-mono">Máx: 180.000 kg</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      Number(siloActivo.pctOcupacion) >= 95
                        ? 'bg-red-500'
                        : Number(siloActivo.pctOcupacion) >= 80
                        ? 'bg-amber-500'
                        : 'bg-[#00603C]'
                    }`}
                    style={{ width: `${Math.min(100, Number(siloActivo.pctOcupacion))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* HISTORIAL Y OPERACIONES DEL SILO (SOLO LECTURA) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00603C]" />
                  <h4 className="font-serif font-bold text-sm text-slate-900">
                    Registro de Operaciones de {siloActivo.siloId}
                  </h4>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {siloActivo.movimientos.length} movimiento(s)
                </span>
              </div>

              {siloActivo.movimientos.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 space-y-1">
                  <Warehouse className="w-7 h-7 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Sin movimientos registrados</p>
                  <p className="text-[11px]">No hay ingresos ni egresos cargados para este silo.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {siloActivo.movimientos.map((mov) => {
                    const isIngreso = mov.tipo === 'INGRESO';
                    const isEgreso = mov.tipo === 'EGRESO_OP' || (mov.tipo as string).startsWith('EGRESO');
                    const isAjuste = mov.tipo === 'AJUSTE_ZERO';

                    return (
                      <div
                        key={mov.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            isIngreso
                              ? 'bg-emerald-100 text-emerald-800'
                              : isEgreso
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isIngreso ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : isEgreso ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <Warehouse className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">
                                {isIngreso ? 'Ingreso Camión' : isEgreso ? 'Egreso a Proceso' : 'Puesta en Cero'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                · {mov.fecha}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {mov.cliente ? `${mov.cliente} · ` : ''}
                              {mov.chofer ? `Chofer: ${mov.chofer}` : mov.usuario ? `Por: ${mov.usuario}` : ''}
                              {mov.patentes && mov.patentes !== '—' ? ` (${mov.patentes})` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-mono font-bold block ${
                            isIngreso ? 'text-emerald-700' : isEgreso ? 'text-amber-700' : 'text-slate-600'
                          }`}>
                            {isIngreso ? '+' : isEgreso ? '-' : ''}{formatNumberArg(mov.kg, 0)} kg
                          </span>
                          {mov.humedad !== undefined && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              Hum: {mov.humedad}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mensaje informativo de solo lectura */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Modo Solo Lectura:</strong> Para registrar ingresos de camiones, calibraciones o egresos de silos, acceda con usuario autorizado al módulo principal de Gestión de Silos.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DESPACHOS (MIS ÓRDENES - PLAYA) */}
      {subTab === 'DESPACHOS_PLAYA' && (
        <div className="space-y-4">
          <div className="bg-[#00603C] text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-[#C9922E]" />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#C9922E] uppercase block">
                  Playa de Carga y Despachos
                </span>
                <h3 className="font-serif text-base font-bold">
                  Mis Órdenes (Playa)
                </h3>
              </div>
            </div>
          </div>

          <DespachosSection
            lotes={lotes}
            ordenes={ordenesCarga}
            onSaveOrden={onSaveOrdenCarga}
            onUpdateOrdenStatus={onUpdateOrdenStatus}
            onDespacharStock={onDespacharStock}
            onDeleteOrden={onDeleteOrdenCarga}
            onlyMisOrdenes={true}
          />
        </div>
      )}

      {/* Modal Ficha Técnica Oficial de Silo (Individual) */}
      {fichaModalSilo && (
        <FichaTecnicaSiloModal
          ficha={silosInfoMap[fichaModalSilo] ? {
            siloId: fichaModalSilo,
            stockKg: silosInfoMap[fichaModalSilo].stockKg,
            stockTn: silosInfoMap[fichaModalSilo].stockTn,
            pctOcupacion: silosInfoMap[fichaModalSilo].pctOcupacion,
            cliente: silosInfoMap[fichaModalSilo].cliente,
            especie: silosInfoMap[fichaModalSilo].especie,
            variedad: silosInfoMap[fichaModalSilo].variedad,
            categoria: silosInfoMap[fichaModalSilo].categoria,
            humedad: silosInfoMap[fichaModalSilo].humedad,
            ingresosActivos: silosInfoMap[fichaModalSilo].ingresosActivos,
            totalIngresos: silosInfoMap[fichaModalSilo].totalIngresos,
            totalKgIngresados: silosInfoMap[fichaModalSilo].totalKgIngresados,
            totalKgEgresados: silosInfoMap[fichaModalSilo].totalKgEgresados,
            ultimoMovimiento: silosInfoMap[fichaModalSilo].movimientos[0]?.fecha || 'Sin registros'
          } : null}
          onClose={() => setFichaModalSilo(null)}
        />
      )}

      {/* Modal Grilla de 6 Fichas Técnicas en 1 Hoja A4 */}
      {showGrillaSeisSilos && (
        <GrillaSeisSilosModal
          fichas={SILOS_DISPONIBLES.map((s) => {
            const info = silosInfoMap[s];
            return {
              siloId: s,
              stockKg: info.stockKg,
              stockTn: info.stockTn,
              pctOcupacion: info.pctOcupacion,
              cliente: info.cliente,
              especie: info.especie,
              variedad: info.variedad,
              categoria: info.categoria,
              humedad: info.humedad,
              ingresosActivos: info.ingresosActivos,
              totalIngresos: info.totalIngresos,
              totalKgIngresados: info.totalKgIngresados,
              totalKgEgresados: info.totalKgEgresados,
              ultimoMovimiento: info.movimientos[0]?.fecha || 'Sin registros'
            };
          })}
          onClose={() => setShowGrillaSeisSilos(false)}
        />
      )}
    </div>
  );
};
