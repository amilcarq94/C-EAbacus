/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SiloId, MovimientoSilo, EspecieType, CategoriaType, CAPACIDAD_MAX_SILO, UMBRAL_ALERTA_SILO } from '../types';
import { SILOS_DISPONIBLES } from './SilosSelector';
import { Warehouse, Plus, RotateCcw, History, FileText, Calendar, ArrowUpRight, ArrowDownRight, AlertTriangle, User, CheckCircle2, Search, Filter, ShieldAlert, MapPin, Droplets, Eye, Download, Printer, X, FileSpreadsheet } from 'lucide-react';

interface IngresoSilosViewProps {
  movimientosSilo: MovimientoSilo[];
  clientes: string[];
  especies: string[];
  currentUser: { nombre: string; rol: string };
  onRegistrarIngreso: (movimiento: MovimientoSilo) => void;
  onPonerEnCero: (siloId: SiloId, fecha: string, usuario: string, motivo: string, kgAnterior: number) => void;
}

export const IngresoSilosView: React.FC<IngresoSilosViewProps> = ({
  movimientosSilo,
  clientes,
  especies,
  currentUser,
  onRegistrarIngreso,
  onPonerEnCero,
}) => {
  // Silo activo seleccionado (Silo 1 a Silo 6)
  const [activeSilo, setActiveSilo] = useState<SiloId>('Silo 1');

  // Estado del Formulario de Ingreso
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [cliente, setCliente] = useState(clientes[0] || 'San Diego Semilla');
  const [clienteManual, setClienteManual] = useState('');
  const [especie, setEspecie] = useState<string>('Soja');
  const [variedad, setVariedad] = useState('P46A03');
  const [categoria, setCategoria] = useState<string>('Fundadora');
  
  // Campo Origen (por defecto "La Barrancosa", más opción "Otro")
  const [campoOrigenSelect, setCampoOrigenSelect] = useState('La Barrancosa');
  const [campoOrigenManual, setCampoOrigenManual] = useState('');

  const [bolsonOrigenNro, setBolsonOrigenNro] = useState('');
  const [bolsonOrigenSector, setBolsonOrigenSector] = useState('');
  const [totalKgIngresados, setTotalKgIngresados] = useState<number | ''>('');
  const [depositoOrigen, setDepositoOrigen] = useState('Depósito Central');
  const [humedad, setHumedad] = useState<number | ''>(13.5);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [exportNoticeMsg, setExportNoticeMsg] = useState('');

  // Estado para el Modal de Ficha Técnica de Silo
  const [fichaModalSilo, setFichaModalSilo] = useState<SiloId | null>(null);

  // Estado para el Modal de Ajuste a Cero
  const [showModalAjusteCero, setShowModalAjusteCero] = useState(false);
  const [fechaAjuste, setFechaAjuste] = useState(() => new Date().toISOString().split('T')[0]);
  const [usuarioAjuste, setUsuarioAjuste] = useState(currentUser.nombre || 'Malcon Baez');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [errorAjuste, setErrorAjuste] = useState('');

  // Calcular Stock actual para cada silo
  const getStockSilo = (siloId: SiloId): number => {
    let stock = 0;
    movimientosSilo
      .filter((m) => m.siloId === siloId)
      .forEach((m) => {
        if (m.tipo === 'INGRESO') {
          stock += m.kg;
        } else if (m.tipo === 'EGRESO_OP') {
          stock = Math.max(0, stock - m.kg);
        } else if (m.tipo === 'AJUSTE_ZERO') {
          stock = 0;
        }
      });
    return stock;
  };

  // Calcular Resumen de Ficha para un Silo determinado
  const getSiloFichaData = (siloId: SiloId) => {
    const stockKg = getStockSilo(siloId);
    const stockTn = (stockKg / 1000).toFixed(1);
    const pctOcupacion = ((stockKg / CAPACIDAD_MAX_SILO) * 100).toFixed(1);

    const movs = movimientosSilo
      .filter((m) => m.siloId === siloId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const ingresosActivos = movs.filter((m) => m.tipo === 'INGRESO');
    const ultIngreso = ingresosActivos[0];

    const especiesSet = Array.from(new Set(ingresosActivos.map((i) => i.especie).filter(Boolean)));
    const clientesSet = Array.from(new Set(ingresosActivos.map((i) => i.cliente).filter(Boolean)));
    const variedadesSet = Array.from(new Set(ingresosActivos.map((i) => i.variedad).filter(Boolean)));
    const categoriasSet = Array.from(new Set(ingresosActivos.map((i) => i.categoria).filter(Boolean)));

    const especie = especiesSet.length > 0 ? especiesSet.join(', ') : ultIngreso?.especie || 'Sin Cereal / Vacío';
    const cliente = clientesSet.length > 0 ? clientesSet.join(', ') : ultIngreso?.cliente || 'Sin Asignar';
    const variedad = variedadesSet.length > 0 ? variedadesSet.join(', ') : ultIngreso?.variedad || 'N/A';
    const categoria = categoriasSet.length > 0 ? categoriasSet.join(', ') : ultIngreso?.categoria || 'N/A';

    let totalKgConHumedad = 0;
    let sumaHumedadPonderada = 0;
    ingresosActivos.forEach((ing) => {
      if (ing.humedad !== undefined && ing.humedad > 0) {
        totalKgConHumedad += ing.kg;
        sumaHumedadPonderada += ing.kg * ing.humedad;
      }
    });

    const humedadPromedio = totalKgConHumedad > 0 
      ? (sumaHumedadPonderada / totalKgConHumedad).toFixed(1)
      : ultIngreso?.humedad !== undefined 
      ? ultIngreso.humedad.toFixed(1) 
      : '13.5';

    return {
      siloId,
      stockKg,
      stockTn,
      pctOcupacion,
      especie,
      cliente,
      variedad,
      categoria,
      humedad: humedadPromedio,
      ingresosActivos,
      totalIngresos: ingresosActivos.length,
      ultimoMovimiento: movs[0]?.fecha || 'Sin registros',
    };
  };

  // Función para exportar la Ficha Técnica de Silo a formato CSV
  const handleExportFichaCSV = (fichaData: ReturnType<typeof getSiloFichaData>) => {
    const lines = [
      `FICHA TÉCNICA DE CONTROL DE ACOPIO EN SILO - PLANTA CLASIFICADORA AGROABACUS`,
      `Fecha de Reporte:;${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`,
      `--------------------------------------------------------------------------------`,
      `Número de Silo:;${fichaData.siloId}`,
      `Especie:;${fichaData.especie}`,
      `Cliente:;${fichaData.cliente}`,
      `Variedad:;${fichaData.variedad}`,
      `Categoría:;${fichaData.categoria}`,
      `Kg Totales en Silo:;${fichaData.stockKg.toLocaleString('es-AR')} kg`,
      `Tn Totales en Silo:;${fichaData.stockTn} Tn`,
      `Capacidad Máxima Silo:;180.000 kg (180 Tn)`,
      `Porcentaje de Ocupación:;${fichaData.pctOcupacion}%`,
      `Porcentaje de Humedad (%):;${fichaData.humedad}%`,
      `Fecha Último Movimiento:;${fichaData.ultimoMovimiento}`,
      `--------------------------------------------------------------------------------`,
      `DETALLE DE INGRESOS REGISTRADOS EN ${fichaData.siloId}:`,
      `ID Movimiento;Fecha;Cliente;Especie;Variedad;Categoría;Campo Origen;Bolsón N°;Kg Ingresados;% Humedad`,
    ];

    fichaData.ingresosActivos.forEach((i) => {
      lines.push(
        `${i.id};${i.fecha};${i.cliente || '-'};${i.especie || '-'};${i.variedad || '-'};${i.categoria || '-'};${i.campoOrigen || '-'};${i.bolsonOrigenNro || '-'};${i.kg};${i.humedad !== undefined ? i.humedad + '%' : '-'}`
      );
    });

    const csvContent = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ficha_${fichaData.siloId.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNoticeMsg(`¡Ficha de ${fichaData.siloId} exportada exitosamente!`);
    setTimeout(() => setExportNoticeMsg(''), 4000);
  };

  const currentSiloStock = getStockSilo(activeSilo);
  const currentSiloPct = Math.min(100, (currentSiloStock / CAPACIDAD_MAX_SILO) * 100);

  // Filtrar movimientos del silo activo
  const movimientosDelSilo = movimientosSilo
    .filter((m) => m.siloId === activeSilo)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Calcular saldos acumulados históricos para la tabla
  let runningStock = 0;
  const movimientosConSaldo = [...movimientosDelSilo]
    .reverse()
    .map((m) => {
      if (m.tipo === 'INGRESO') {
        runningStock += m.kg;
      } else if (m.tipo === 'EGRESO_OP') {
        runningStock = Math.max(0, runningStock - m.kg);
      } else if (m.tipo === 'AJUSTE_ZERO') {
        runningStock = 0;
      }
      return { ...m, saldoResultante: runningStock };
    })
    .reverse();

  // Envío del Formulario de Ingreso
  const handleSubmitIngreso = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const clienteFinal = cliente === 'Otro' ? clienteManual.trim() : cliente;
    if (!clienteFinal) {
      setFormError('Debe ingresar el Cliente.');
      return;
    }

    if (!variedad.trim()) {
      setFormError('Debe ingresar la Variedad.');
      return;
    }

    if (!totalKgIngresados || Number(totalKgIngresados) <= 0) {
      setFormError('El Total de kg ingresados debe ser mayor a 0.');
      return;
    }

    const kgNuevos = Number(totalKgIngresados);
    const espacioDisponible = CAPACIDAD_MAX_SILO - currentSiloStock;

    if (currentSiloStock + kgNuevos > CAPACIDAD_MAX_SILO) {
      setFormError(
        `¡Atención! El ingreso de ${kgNuevos.toLocaleString('es-AR')} kg supera el límite de capacidad máxima de 180.000 kg para ${activeSilo}. Stock actual: ${currentSiloStock.toLocaleString('es-AR')} kg. Espacio disponible: ${Math.max(0, espacioDisponible).toLocaleString('es-AR')} kg.`
      );
      return;
    }

    const campoOrigenFinal = campoOrigenSelect === 'Otro' ? campoOrigenManual.trim() : campoOrigenSelect;
    if (campoOrigenSelect === 'Otro' && !campoOrigenManual.trim()) {
      setFormError('Debe especificar el Campo de Origen.');
      return;
    }

    const nuevoIngreso: MovimientoSilo = {
      id: `ING-SILO-${Date.now()}`,
      siloId: activeSilo,
      fecha,
      tipo: 'INGRESO',
      kg: kgNuevos,
      cliente: clienteFinal,
      especie,
      variedad: variedad.trim(),
      categoria,
      campoOrigen: campoOrigenFinal,
      bolsonOrigenNro: bolsonOrigenNro.trim(),
      bolsonOrigenSector: bolsonOrigenSector.trim(),
      depositoOrigen: depositoOrigen.trim(),
      humedad: typeof humedad === 'number' ? humedad : 13.5,
    };

    onRegistrarIngreso(nuevoIngreso);
    setFormSuccess(`¡Ingreso registrado exitosamente en ${activeSilo}! (${kgNuevos.toLocaleString('es-AR')} kg - ${humedad}% Humedad)`);

    // Reset campos formulario
    setTotalKgIngresados('');
    setBolsonOrigenNro('');
    setBolsonOrigenSector('');
    setHumedad(13.5);

    setTimeout(() => setFormSuccess(''), 4000);
  };

  // Confirmar Ajuste a Cero
  const handleConfirmAjusteCero = () => {
    setErrorAjuste('');
    if (!motivoAjuste.trim()) {
      setErrorAjuste('Debe especificar el motivo del ajuste.');
      return;
    }

    onPonerEnCero(activeSilo, fechaAjuste, usuarioAjuste, motivoAjuste.trim(), currentSiloStock);
    setShowModalAjusteCero(false);
    setMotivoAjuste('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header General */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-wider rounded-md border border-emerald-200 flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5 text-emerald-700" /> Control de Acopio y Silos
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-serif text-slate-900 flex items-center gap-2">
            Ingreso a Silos y Gestión de Stock
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Planta de Acopio: 6 Silos de 180.000 kg (Capacidad Total: 1.080.000 kg / 1.080 Tn).
          </p>
        </div>
      </div>

      {/* DASHBOARD DE STOCK DE SILOS */}
      {(() => {
        const capacidadTotalPlanta = SILOS_DISPONIBLES.length * CAPACIDAD_MAX_SILO; // 1.080.000 kg
        const stockTotalOcupado = SILOS_DISPONIBLES.reduce((acc, id) => acc + getStockSilo(id), 0);
        const capacidadTotalLibre = capacidadTotalPlanta - stockTotalOcupado;
        const pctOcupacionTotal = (stockTotalOcupado / capacidadTotalPlanta) * 100;

        const silosLlenos = SILOS_DISPONIBLES.filter(id => getStockSilo(id) >= CAPACIDAD_MAX_SILO).length;
        const silosCriticos = SILOS_DISPONIBLES.filter(id => {
          const s = getStockSilo(id);
          return s >= CAPACIDAD_MAX_SILO * 0.95 && s < CAPACIDAD_MAX_SILO;
        }).length;
        const silosAlerta = SILOS_DISPONIBLES.filter(id => {
          const s = getStockSilo(id);
          return s >= UMBRAL_ALERTA_SILO && s < CAPACIDAD_MAX_SILO * 0.95;
        }).length;
        const silosOperativos = SILOS_DISPONIBLES.length - silosLlenos - silosCriticos - silosAlerta;

        // Distribución por Especie
        const stockPorEspecie: Record<string, number> = {};
        SILOS_DISPONIBLES.forEach(id => {
          const st = getStockSilo(id);
          if (st > 0) {
            const ultIngreso = movimientosSilo
              .filter(m => m.siloId === id && m.tipo === 'INGRESO' && m.especie)
              .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
            const esp = ultIngreso?.especie || 'Sin Clasificar';
            stockPorEspecie[esp] = (stockPorEspecie[esp] || 0) + st;
          }
        });

        return (
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                  <Warehouse className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Métricas Globales de Acopio
                  </div>
                  <h2 className="text-xl md:text-2xl font-black font-serif text-white">
                    Dashboard de Stock de Silos
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-medium">Capacidad por Silo:</span>
                <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-mono font-bold">
                  180.000 kg (180 Tn)
                </span>
              </div>
            </div>

            {/* KPIs Principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Ocupación Total */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Stock Total en Silos
                </span>
                <div className="mt-2">
                  <div className="text-2xl md:text-3xl font-black font-mono text-emerald-400">
                    {stockTotalOcupado.toLocaleString('es-AR')} <span className="text-xs font-sans text-slate-300">kg</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {(stockTotalOcupado / 1000).toFixed(1)} Tn acumuladas
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                    <span>Ocupación Planta</span>
                    <span>{pctOcupacionTotal.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        pctOcupacionTotal >= 95 ? 'bg-red-500' : pctOcupacionTotal >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, pctOcupacionTotal)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Capacidad Libre */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Capacidad Libre Total
                </span>
                <div className="mt-2">
                  <div className="text-2xl md:text-3xl font-black font-mono text-blue-300">
                    {capacidadTotalLibre.toLocaleString('es-AR')} <span className="text-xs font-sans text-slate-300">kg</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {(capacidadTotalLibre / 1000).toFixed(1)} Tn disponibles
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400">
                  De un total instalada de <strong className="text-white">1.080 Tn</strong> (6 silos)
                </div>
              </div>

              {/* Estado de Silos */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Estado de Capacidad Silos
                </span>
                <div className="mt-2 space-y-1.5 text-xs font-bold">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Operativos (&lt;150 Tn)
                    </span>
                    <span className="font-mono text-white">{silosOperativos} silos</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span> Alerta (&ge;150 Tn)
                    </span>
                    <span className="font-mono">{silosAlerta} silos</span>
                  </div>
                  <div className="flex items-center justify-between text-red-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> Críticos / Llenos (&ge;171 Tn)
                    </span>
                    <span className="font-mono">{silosCriticos + silosLlenos} silos</span>
                  </div>
                </div>
              </div>

              {/* Distribución por Especie */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Stock por Especie en Silos
                </span>
                <div className="mt-2 space-y-1">
                  {Object.keys(stockPorEspecie).length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Sin cereal acumulado en silos</span>
                  ) : (
                    Object.entries(stockPorEspecie).map(([esp, kg]) => (
                      <div key={esp} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">{esp}</span>
                        <span className="font-mono font-bold text-emerald-300">
                          {(kg / 1000).toFixed(1)} Tn
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  Cálculo basado en últimos ingresos activos
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Selectores de Pestañas / Secciones por Silo (Silo 1 a Silo 6) */}
      <div>
        <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
          <Warehouse className="w-4 h-4 text-emerald-700" />
          <span>Seleccionar Silo (Visualización de Estado y Operaciones)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SILOS_DISPONIBLES.map((siloId) => {
            const stock = getStockSilo(siloId);
            const isSelected = activeSilo === siloId;
            const pct = Math.min(100, (stock / CAPACIDAD_MAX_SILO) * 100);
            const isFull = stock >= CAPACIDAD_MAX_SILO;
            const isNearLimit = stock >= UMBRAL_ALERTA_SILO && !isFull;

            return (
              <button
                key={siloId}
                onClick={() => {
                  setActiveSilo(siloId);
                  setFormError('');
                  setFormSuccess('');
                }}
                className={`p-4 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl ring-2 ring-emerald-500 scale-[1.02]'
                    : isFull
                    ? 'bg-red-50/70 border-red-300 text-slate-900 hover:border-red-400'
                    : isNearLimit
                    ? 'bg-amber-50/70 border-amber-300 text-slate-900 hover:border-amber-400'
                    : 'bg-white border-slate-200 hover:border-slate-400 text-slate-900 hover:shadow'
                }`}
              >
                {/* NOMBRE Y NÚMERO DE SILO GRANDE Y DESTACADO */}
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-lg sm:text-2xl font-black font-serif tracking-tight ${
                      isSelected ? 'text-emerald-400' : 'text-slate-900'
                    }`}>
                      {siloId}
                    </span>
                  </div>
                  <span
                    className={`w-3.5 h-3.5 rounded-full shrink-0 border ${
                      isFull
                        ? 'bg-red-600 border-red-700 animate-ping'
                        : isNearLimit
                        ? 'bg-amber-500 border-amber-600 animate-pulse'
                        : stock > 0
                        ? 'bg-emerald-500 border-emerald-600'
                        : 'bg-slate-300 border-slate-400'
                    }`}
                    title={
                      isFull
                        ? 'Silo Lleno (180.000 kg)'
                        : isNearLimit
                        ? 'Cerca del Límite (>= 150.000 kg)'
                        : 'Stock Normal'
                    }
                  />
                </div>

                <div className="mt-3">
                  <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                    isSelected ? 'text-white' : isFull ? 'text-red-700' : isNearLimit ? 'text-amber-800' : 'text-slate-900'
                  }`}>
                    {stock.toLocaleString('es-AR')} <span className="text-xs font-normal opacity-80">kg</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold mt-1">
                    <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                      {(stock / 1000).toFixed(1)} / 180 Tn
                    </span>
                    <span className={`font-mono font-bold ${
                      isFull ? 'text-red-600' : isNearLimit ? 'text-amber-700' : isSelected ? 'text-emerald-300' : 'text-emerald-700'
                    }`}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  {/* Barra de Capacidad */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isFull ? 'bg-red-600' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Acciones Rápidas de Ficha */}
                  <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-between text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFichaModalSilo(siloId);
                      }}
                      className={`flex items-center gap-1 hover:underline ${
                        isSelected ? 'text-emerald-300' : 'text-emerald-700'
                      }`}
                      title="Ver Ficha Técnica"
                    >
                      <Eye className="w-3 h-3" /> Ficha
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportFichaCSV(getSiloFichaData(siloId));
                      }}
                      className={`flex items-center gap-1 hover:underline ${
                        isSelected ? 'text-slate-300' : 'text-slate-600'
                      }`}
                      title="Exportar Ficha"
                    >
                      <Download className="w-3 h-3" /> Exportar
                    </button>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenedor del Silo Activo */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {/* Encabezado del Silo Seleccionado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3.5 rounded-2xl border ${
              currentSiloStock >= CAPACIDAD_MAX_SILO
                ? 'bg-red-50 border-red-200 text-red-800'
                : currentSiloStock >= UMBRAL_ALERTA_SILO
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <Warehouse className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-emerald-800">
                Detalle y Operaciones del Silo Seleccionado · Capacidad Máx: 180.000 kg (180 Tn)
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 flex items-center gap-3 flex-wrap mt-0.5">
                <span>{activeSilo}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-sans font-bold border ${
                  currentSiloStock >= CAPACIDAD_MAX_SILO
                    ? 'bg-red-100 text-red-900 border-red-300'
                    : currentSiloStock >= UMBRAL_ALERTA_SILO
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                }`}>
                  Ocupado: {currentSiloStock.toLocaleString('es-AR')} kg / 180.000 kg ({currentSiloPct.toFixed(1)}%)
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFichaModalSilo(activeSilo)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0"
              title="Ver Ficha Técnica Completa del Silo"
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>Ver Ficha</span>
            </button>

            <button
              onClick={() => handleExportFichaCSV(getSiloFichaData(activeSilo))}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0"
              title="Exportar Ficha Técnica en Formato CSV / Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Ficha</span>
            </button>

            <button
              onClick={() => {
                setFechaAjuste(new Date().toISOString().split('T')[0]);
                setUsuarioAjuste(currentUser.nombre || 'Malcon Baez');
                setMotivoAjuste('');
                setErrorAjuste('');
                setShowModalAjusteCero(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0"
              title="Ajuste manual de stock a cero por mermas/manipuleo"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Poner Stock en Cero</span>
            </button>
          </div>
        </div>

        {exportNoticeMsg && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{exportNoticeMsg}</span>
            </div>
          </div>
        )}

        {/* Banners de Alerta por Capacidad cercana o límite */}
        {currentSiloStock >= CAPACIDAD_MAX_SILO ? (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <span>
              <strong>¡LÍMITE MÁXIMO ALCANZADO!</strong> {activeSilo} ha completado su capacidad total de 180.000 kg (180 Tn). No se pueden realizar nuevos ingresos a este silo sin antes realizar extracciones o un ajuste.
            </span>
          </div>
        ) : currentSiloStock >= UMBRAL_ALERTA_SILO ? (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>¡ALERTA DE CAPACIDAD CERCANA!</strong> {activeSilo} está al {currentSiloPct.toFixed(1)}% de su capacidad. Quedan solo {(CAPACIDAD_MAX_SILO - currentSiloStock).toLocaleString('es-AR')} kg disponibles antes de alcanzar el límite de 180.000 kg.
            </span>
          </div>
        ) : null}

        {/* Formulario de Ingreso a este Silo */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              Nuevo Ingreso de Mercadería a <strong className="text-slate-900 font-serif">{activeSilo}</strong>
            </h3>
            <span className="text-[10px] text-slate-500">
              * El silo de destino queda fijado como <strong className="text-slate-800">{activeSilo}</strong>
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmitIngreso} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Fecha */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Fecha de Ingreso *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Cliente *
              </label>
              <select
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                {clientes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Otro">Otro cliente...</option>
              </select>
            </div>

            {cliente === 'Otro' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Nombre de Cliente *
                </label>
                <input
                  type="text"
                  placeholder="Ingrese cliente..."
                  value={clienteManual}
                  onChange={(e) => setClienteManual(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                />
              </div>
            )}

            {/* Especie */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Especie *
              </label>
              <select
                value={especie}
                onChange={(e) => setEspecie(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                {especies.map((esp) => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </div>

            {/* Variedad */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Variedad *
              </label>
              <input
                type="text"
                placeholder="ej: P46A03, CASUARINA..."
                value={variedad}
                onChange={(e) => setVariedad(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 uppercase"
                required
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Categoría *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
              >
                <option value="Fundadora">Fundadora</option>
                <option value="Preba">Preba</option>
                <option value="Original">Original</option>
                <option value="Primera">Primera</option>
              </select>
            </div>

            {/* Campo Origen */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-700" /> Campo Origen *
              </label>
              <select
                value={campoOrigenSelect}
                onChange={(e) => setCampoOrigenSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="La Barrancosa">La Barrancosa</option>
                <option value="Otro">Otro campo...</option>
              </select>
              {campoOrigenSelect === 'Otro' && (
                <input
                  type="text"
                  placeholder="Escriba el nombre del campo..."
                  value={campoOrigenManual}
                  onChange={(e) => setCampoOrigenManual(e.target.value)}
                  className="mt-1.5 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                  required
                />
              )}
            </div>

            {/* Bolsón Origen Número */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                N° Bolsón Origen
              </label>
              <input
                type="text"
                placeholder="ej: 12B, 401..."
                value={bolsonOrigenNro}
                onChange={(e) => setBolsonOrigenNro(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
              />
            </div>

            {/* Bolsón Origen Sector */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Sector de Bolsón Origen
              </label>
              <input
                type="text"
                placeholder="ej: Sector A, Fila 3..."
                value={bolsonOrigenSector}
                onChange={(e) => setBolsonOrigenSector(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
              />
            </div>

            {/* Total kg ingresados */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Total de Kg Ingresados *
              </label>
              <input
                type="number"
                min={1}
                placeholder="0 kg"
                value={totalKgIngresados}
                onChange={(e) => setTotalKgIngresados(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Porcentaje de Humedad (%) */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-600" /> % Humedad Manual *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  placeholder="ej: 13.5"
                  value={humedad}
                  onChange={(e) => setHumedad(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 pr-8"
                  required
                />
                <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 font-mono">%</span>
              </div>
            </div>

            {/* Depósito de origen */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Depósito de Origen
              </label>
              <input
                type="text"
                placeholder="ej: Depósito Central, Campo A..."
                value={depositoOrigen}
                onChange={(e) => setDepositoOrigen(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
              />
            </div>

            {/* Botón Submit */}
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Ingreso a {activeSilo}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Histórico de Movimientos del Silo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-600" />
              Histórico de Movimientos de {activeSilo}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {movimientosConSaldo.length} movimiento(s)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Fecha</th>
                  <th className="py-3 px-3.5">Tipo Movimiento</th>
                  <th className="py-3 px-3.5">Detalle / Origen / Orden</th>
                  <th className="py-3 px-3.5 text-right">Kg Movimiento</th>
                  <th className="py-3 px-3.5 text-right">Saldo Resultante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {movimientosConSaldo.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No hay registros ni movimientos para {activeSilo}.
                    </td>
                  </tr>
                ) : (
                  movimientosConSaldo.map((m) => {
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                          {m.fecha}
                        </td>

                        <td className="py-3 px-3.5">
                          {m.tipo === 'INGRESO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 font-extrabold text-[10px] rounded border border-emerald-300">
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              Ingreso
                            </span>
                          )}
                          {m.tipo === 'EGRESO_OP' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-900 font-extrabold text-[10px] rounded border border-blue-300">
                              <ArrowDownRight className="w-3 h-3 text-blue-600" />
                              Egreso por OP
                            </span>
                          )}
                          {m.tipo === 'AJUSTE_ZERO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-950 font-extrabold text-[10px] rounded border border-amber-300">
                              <RotateCcw className="w-3 h-3 text-amber-600" />
                              Ajuste a Cero
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-[11px] text-slate-800">
                          {m.tipo === 'INGRESO' && (
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>{m.cliente} — {m.especie} ({m.variedad})</span>
                                {m.categoria && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 text-[9px] font-bold rounded">
                                    {m.categoria}
                                  </span>
                                )}
                                {m.humedad !== undefined && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-900 text-[9px] font-extrabold rounded border border-blue-200">
                                    <Droplets className="w-2.5 h-2.5 text-blue-600" />
                                    {m.humedad}% Humedad
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Campo: <strong className="text-slate-700 font-semibold">{m.campoOrigen || 'La Barrancosa'}</strong> · Bolsón N°: {m.bolsonOrigenNro || '-'} · Sector: {m.bolsonOrigenSector || '-'} · Depósito: {m.depositoOrigen || '-'}
                              </div>
                            </div>
                          )}

                          {m.tipo === 'EGRESO_OP' && (
                            <div>
                              <div className="font-bold text-blue-950">
                                Extracción para Orden de Proceso #{m.numeroOrdenProceso || 'S/N'}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Lote vinculado: {m.loteNro || 'En proceso'}
                              </div>
                            </div>
                          )}

                          {m.tipo === 'AJUSTE_ZERO' && (
                            <div>
                              <div className="font-bold text-amber-950">
                                Ajuste manual por diferencia de manipuleo
                              </div>
                              <div className="text-[10px] text-slate-600 italic">
                                Motivo: {m.motivoAjuste} (Usuario: {m.usuario || 'Sistema'})
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                          {m.tipo === 'INGRESO' ? (
                            <span className="text-emerald-700">+ {m.kg.toLocaleString('es-AR')} kg</span>
                          ) : (
                            <span className="text-red-600">- {m.kg.toLocaleString('es-AR')} kg</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          {m.saldoResultante.toLocaleString('es-AR')} kg
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal Ajuste Manual a Cero */}
      {showModalAjusteCero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base font-serif flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Poner Stock de {activeSilo} en Cero
              </h3>
              <button
                onClick={() => setShowModalAjusteCero(false)}
                className="p-1 text-amber-100 hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Se registrará un movimiento de egreso por <strong className="text-slate-900">"Ajuste/diferencia por manipuleo"</strong> que llevará el saldo actual de <strong>{currentSiloStock.toLocaleString('es-AR')} kg</strong> a <strong>0 kg</strong>. El historial de movimientos anteriores se mantendrá intacto.
              </p>

              {errorAjuste && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium">
                  {errorAjuste}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Fecha del Ajuste *
                </label>
                <input
                  type="date"
                  value={fechaAjuste}
                  onChange={(e) => setFechaAjuste(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Usuario / Operario Responsable *
                </label>
                <input
                  type="text"
                  value={usuarioAjuste}
                  onChange={(e) => setUsuarioAjuste(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Motivo del Ajuste (Texto Libre) *
                </label>
                <textarea
                  rows={3}
                  placeholder="ej: Barrido final de silo, merma por manipuleo y ventilación..."
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModalAjusteCero(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAjusteCero}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
              >
                Confirmar Ajuste a Cero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Técnica del Silo */}
      {fichaModalSilo && (() => {
        const ficha = getSiloFichaData(fichaModalSilo);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 overflow-y-auto">
            
            {/* Estilo CSS especial para impresión en 1/3 de hoja A4 */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #ficha-print-a4-third, #ficha-print-a4-third * {
                  visibility: visible !important;
                }
                #ficha-print-a4-third {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 190mm !important;
                  height: 95mm !important;
                  max-height: 95mm !important;
                  margin: 0 !important;
                  padding: 4mm 6mm !important;
                  box-sizing: border-box !important;
                  border: 1.5px dashed #000 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: Arial, sans-serif !important;
                  font-size: 8pt !important;
                  line-height: 1.15 !important;
                  overflow: hidden !important;
                  page-break-inside: avoid !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 6mm;
                }
              }
            `}</style>

            {/* VISTA PARA IMPRESIÓN (Ficha en 1/3 de Hoja A4) */}
            <div id="ficha-print-a4-third" className="hidden print:block text-black">
              {/* Header 1/3 A4 */}
              <div className="border-b-2 border-black pb-1 mb-1.5 flex justify-between items-end">
                <div>
                  <div className="font-bold text-[8pt] uppercase tracking-wider">AGROABACUS · PLANTA DE ACOPIO Y CLASIFICACIÓN</div>
                  <div className="font-black text-[11pt]">FICHA TÉCNICA DE CONTROL DE SILO: {ficha.siloId}</div>
                </div>
                <div className="text-right text-[6.5pt] font-mono leading-tight">
                  <div className="font-bold">FORMATO 1/3 HOJA A4</div>
                  <div>FECHA: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR').slice(0, 5)} hs</div>
                </div>
              </div>

              {/* Grid 6 Datos 1/3 A4 */}
              <div className="grid grid-cols-3 gap-1 mb-1.5 text-[7.5pt] border border-black p-1.5 rounded bg-gray-50">
                <div className="border-r border-gray-300 pr-1">
                  <span className="font-bold block uppercase text-[6pt] text-gray-600">1. N° DE SILO:</span>
                  <span className="font-black text-[10pt] text-black">{ficha.siloId}</span>
                </div>
                <div className="border-r border-gray-300 pr-1">
                  <span className="font-bold block uppercase text-[6pt] text-gray-600">2. ESPECIE:</span>
                  <span className="font-bold text-[8.5pt]">{ficha.especie}</span>
                </div>
                <div>
                  <span className="font-bold block uppercase text-[6pt] text-gray-600">3. CLIENTE:</span>
                  <span className="font-bold text-[8pt] truncate block">{ficha.cliente}</span>
                </div>
                <div className="border-r border-gray-300 pr-1 border-t border-gray-300 pt-1">
                  <span className="font-bold block uppercase text-[6pt] text-gray-600">4. VARIEDAD / CAT:</span>
                  <span className="font-bold text-[8pt]">{ficha.variedad} ({ficha.categoria})</span>
                </div>
                <div className="border-r border-gray-300 pr-1 border-t border-gray-300 pt-1">
                  <span className="font-bold block uppercase text-[6pt] text-gray-600">5. STOCK TOTAL:</span>
                  <span className="font-black text-[8.5pt] font-mono">{ficha.stockKg.toLocaleString('es-AR')} kg ({ficha.stockTn} Tn)</span>
                </div>
                <div className="border-t border-gray-300 pt-1">
                  <span className="font-bold block uppercase text-[6pt] text-gray-600">6. % HUMEDAD:</span>
                  <span className="font-black text-[9.5pt] font-mono">{ficha.humedad}%</span>
                </div>
              </div>

              {/* Resumen de capacidad */}
              <div className="mb-1.5 text-[6.5pt] flex justify-between items-center bg-gray-100 px-2 py-0.5 border border-gray-300 rounded font-mono">
                <span className="font-bold">CAPACIDAD MÁXIMA: 180.000 kg (180 Tn)</span>
                <span className="font-extrabold">OCUPACIÓN ACTIVA: {ficha.pctOcupacion}%</span>
              </div>

              {/* Tabla Cargas Recientes */}
              <div className="mb-1.5">
                <div className="font-bold text-[6.5pt] uppercase border-b border-black mb-0.5">Últimos Ingresos Registrados ({ficha.totalIngresos} cargas):</div>
                <table className="w-full text-left text-[6pt] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-400 font-bold uppercase text-[5.5pt] bg-gray-200">
                      <th className="py-0.5 px-1">Fecha</th>
                      <th className="py-0.5 px-1">Cliente</th>
                      <th className="py-0.5 px-1">Especie / Variedad</th>
                      <th className="py-0.5 px-1">Origen</th>
                      <th className="py-0.5 px-1 text-right">Kg Carga</th>
                      <th className="py-0.5 px-1 text-right">% Hum.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ficha.ingresosActivos.slice(0, 3).map((ing) => (
                      <tr key={ing.id} className="border-b border-gray-200">
                        <td className="py-0.5 px-1 font-mono">{ing.fecha}</td>
                        <td className="py-0.5 px-1 font-bold">{ing.cliente}</td>
                        <td className="py-0.5 px-1">{ing.especie} ({ing.variedad})</td>
                        <td className="py-0.5 px-1">{ing.campoOrigen || '-'} {ing.bolsonOrigenNro ? `· ${ing.bolsonOrigenNro}` : ''}</td>
                        <td className="py-0.5 px-1 text-right font-mono font-bold">+{ing.kg.toLocaleString('es-AR')} kg</td>
                        <td className="py-0.5 px-1 text-right font-mono font-bold">{ing.humedad !== undefined ? `${ing.humedad}%` : '13.5%'}</td>
                      </tr>
                    ))}
                    {ficha.ingresosActivos.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-1 italic">Sin registros de carga activos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Firmas de Control */}
              <div className="mt-2 pt-1 border-t border-dashed border-gray-400 grid grid-cols-2 gap-6 text-[6pt] text-center">
                <div>
                  <div className="border-b border-black mb-0.5 h-2.5"></div>
                  <span className="font-bold uppercase">FIRMA Y SELLO OPERARIO ACOPIO</span>
                </div>
                <div>
                  <div className="border-b border-black mb-0.5 h-2.5"></div>
                  <span className="font-bold uppercase">RESPONSABLE TÉCNICO PLANTA</span>
                </div>
              </div>
            </div>

            {/* VISTA DIGITAL PANTALLA (MODAL) */}
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 print:hidden">
              
              {/* Header Ficha */}
              <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 relative">
                <button
                  onClick={() => setFichaModalSilo(null)}
                  className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
                  title="Cerrar Ficha"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px] font-black uppercase tracking-widest mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Planta Clasificadora y de Acopio AgroAbacus</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black font-serif text-white flex items-center gap-3">
                  <span>FICHA TÉCNICA · {ficha.siloId}</span>
                  <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans font-bold rounded-full">
                    1/3 A4 IMPRESIÓN
                  </span>
                </h2>
                
                <p className="text-xs text-slate-300 mt-1 font-sans">
                  Informe de control de acopio, calidad de grano, varietal y trazabilidad. Formato optimizado para impresión en 1/3 de hoja A4.
                </p>
              </div>

              {/* Body Ficha */}
              <div className="p-6 space-y-6 text-xs bg-slate-50/50">
                
                {/* GRID CON LOS 6 DATOS PRINCIPALES REQUERIDOS */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-2 sm:grid-cols-3 gap-4">
                  
                  {/* 1. NÚMERO DE SILO */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                      1. N° de Silo
                    </span>
                    <span className="text-xl font-serif font-black text-slate-900 mt-0.5 block">
                      {ficha.siloId}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Capacidad: 180.000 kg</span>
                  </div>

                  {/* 2. ESPECIE */}
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-extrabold uppercase text-emerald-800 block">
                      2. Especie de Grano
                    </span>
                    <span className="text-lg font-bold text-emerald-950 mt-0.5 block">
                      {ficha.especie}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">Clasificación activa</span>
                  </div>

                  {/* 3. CLIENTE */}
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                    <span className="text-[10px] font-extrabold uppercase text-blue-800 block">
                      3. Cliente / Propietario
                    </span>
                    <span className="text-base font-bold text-blue-950 mt-0.5 block truncate" title={ficha.cliente}>
                      {ficha.cliente}
                    </span>
                    <span className="text-[10px] text-blue-700 font-medium">Titular registrado</span>
                  </div>

                  {/* 4. VARIEDAD */}
                  <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200">
                    <span className="text-[10px] font-extrabold uppercase text-purple-800 block">
                      4. Variedad
                    </span>
                    <span className="text-base font-bold text-purple-950 mt-0.5 block uppercase">
                      {ficha.variedad}
                    </span>
                    <span className="text-[10px] text-purple-700 font-medium">Cat: {ficha.categoria}</span>
                  </div>

                  {/* 5. KG TOTALES */}
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-extrabold uppercase text-amber-900 block">
                      5. Kg Totales en Silo
                    </span>
                    <span className="text-xl font-black font-mono text-amber-950 mt-0.5 block">
                      {ficha.stockKg.toLocaleString('es-AR')} kg
                    </span>
                    <span className="text-[10px] text-amber-800 font-bold">
                      {ficha.stockTn} Tn ({ficha.pctOcupacion}% Ocupación)
                    </span>
                  </div>

                  {/* 6. HUMEDAD */}
                  <div className="p-3 bg-cyan-50/80 rounded-xl border border-cyan-200">
                    <span className="text-[10px] font-extrabold uppercase text-cyan-900 block flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-cyan-600" /> 6. % Humedad
                    </span>
                    <span className="text-2xl font-black font-mono text-cyan-950 mt-0.5 block">
                      {ficha.humedad}%
                    </span>
                    <span className="text-[10px] text-cyan-800 font-medium">Humedad de ingreso</span>
                  </div>

                </div>

                {/* Barra de Ocupación */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Estado de Capacidad de {ficha.siloId}</span>
                    <span>{ficha.stockKg.toLocaleString('es-AR')} / 180.000 kg ({ficha.pctOcupacion}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        Number(ficha.pctOcupacion) >= 100
                          ? 'bg-red-600'
                          : Number(ficha.pctOcupacion) >= 83.3
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, Number(ficha.pctOcupacion))}%` }}
                    />
                  </div>
                </div>

                {/* Tabla de Detalle de Cargas e Ingresos Activos */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <History className="w-4 h-4 text-emerald-700" />
                      Detalle de Ingresos Registrados ({ficha.totalIngresos} cargas)
                    </h4>
                    <span className="text-[10px] text-slate-400">Último movimiento: {ficha.ultimoMovimiento}</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3">Especie / Variedad</th>
                          <th className="py-2.5 px-3">Origen / Bolsón</th>
                          <th className="py-2.5 px-3 text-right">Kg Carga</th>
                          <th className="py-2.5 px-3 text-right">% Humedad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {ficha.ingresosActivos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                              Sin cargas activas registradas en este silo.
                            </td>
                          </tr>
                        ) : (
                          ficha.ingresosActivos.map((ing) => (
                            <tr key={ing.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-600">{ing.fecha}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{ing.cliente}</td>
                              <td className="py-2 px-3">
                                <span className="font-semibold text-slate-800">{ing.especie}</span>
                                <span className="text-[10px] text-slate-500 ml-1">({ing.variedad})</span>
                              </td>
                              <td className="py-2 px-3 text-[10px] text-slate-600">
                                {ing.campoOrigen} {ing.bolsonOrigenNro ? `· ${ing.bolsonOrigenNro}` : ''}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                +{ing.kg.toLocaleString('es-AR')} kg
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-extrabold text-blue-800">
                                {ing.humedad !== undefined ? `${ing.humedad}%` : '13.5%'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Footer Ficha */}
              <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] text-slate-500 font-medium">
                  AgroAbacus Software · Ficha de Control Técnico de Silos (1/3 A4)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Imprimir Ficha (1/3 A4)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportFichaCSV(ficha)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>Exportar Ficha (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFichaModalSilo(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
