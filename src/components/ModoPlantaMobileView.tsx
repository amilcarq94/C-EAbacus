/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lote, MovimientoSilo, SiloId, Chofer, BolsonCampo, EstadoRegistroLote, OrdenCarga } from '../types';
import { SILOS_DISPONIBLES } from './SilosSelector';
import { ChoferSearchSelector } from './ChoferSearchSelector';
import { getOfflinePendingIngresos, savePendingOfflineIngreso, syncOfflineQueue } from '../utils/offlineQueue';
import { recordGlobalAuditLog } from '../utils/auditLogger';
import { DespachosSection } from './DespachosSection';
import {
  Truck,
  QrCode,
  CheckCircle2,
  PackageCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  Warehouse,
  ArrowRight,
  User,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Save,
  Layers,
  Sparkles,
  ClipboardList
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
  onRegistrarIngresoSilo: (movimiento: MovimientoSilo) => Promise<any> | void;
  onUpdateLoteEstado: (lote: Lote, nuevoEstado: EstadoRegistroLote) => void;
  onOpenQrScanner: () => void;
  onSelectLote: (lote: Lote) => void;
  onSaveOrdenCarga: (orden: OrdenCarga) => void;
  onUpdateOrdenStatus: (id: string, nuevoEstado: 'Disponible' | 'Aceptada' | 'Despachada') => void;
  onDespacharStock: (ordenId: string, loteId: string, bolsas: number, kg: number, lotesOrigen?: any[]) => Promise<boolean>;
  onDeleteOrdenCarga: (id: string) => void;
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
  onRegistrarIngresoSilo,
  onUpdateLoteEstado,
  onOpenQrScanner,
  onSelectLote,
  onSaveOrdenCarga,
  onUpdateOrdenStatus,
  onDespacharStock,
  onDeleteOrdenCarga
}) => {
  const [subTab, setSubTab] = useState<'INGRESO_RAPIDO' | 'MARCAR_REALIZADO' | 'DESPACHOS_PLAYA'>('INGRESO_RAPIDO');
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(() => getOfflinePendingIngresos().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState('');

  // Estados del Formulario de Ingreso Rápido
  const [siloSeleccionado, setSiloSeleccionado] = useState<SiloId>('Silo 1');
  const [kgIngreso, setKgIngreso] = useState<number | ''>('');
  const [cliente, setCliente] = useState(clientes[0] || 'San Diego Semilla');
  const [especie, setEspecie] = useState(especies[0] || 'Soja');
  const [variedad, setVariedad] = useState('P46A03');
  const [choferNombre, setChoferNombre] = useState('');
  const [patenteCamion, setPatenteCamion] = useState('');
  const [humedad, setHumedad] = useState<number | ''>(13.5);

  // Escuchar estado online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSyncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncOfflineQueue = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue(async (mov) => {
        await onRegistrarIngresoSilo(mov);
        return true;
      });
      setPendingOfflineCount(getOfflinePendingIngresos().length);
      if (result.successCount > 0) {
        setMensajeConfirmacion(`✅ ${result.successCount} ingresos offline sincronizados exitosamente.`);
        setTimeout(() => setMensajeConfirmacion(''), 4000);
      }
    } catch (e) {
      console.error('Error al sincronizar cola offline:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGuardarIngresoRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kgIngreso || Number(kgIngreso) <= 0) {
      alert('Por favor ingrese los kilogramos del camión.');
      return;
    }

    const movimiento: MovimientoSilo = {
      id: `ING-RAPIDO-${Date.now()}`,
      siloId: siloSeleccionado,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'INGRESO',
      kg: Number(kgIngreso),
      cliente,
      especie,
      variedad,
      categoria: 'FUNDADORA',
      chofer: choferNombre || 'Chofer de Planta',
      patentes: patenteCamion || '—',
      humedad: humedad !== '' ? Number(humedad) : undefined,
      usuario: currentUser.nombre
    };

    if (!isOnline) {
      // Guardar en cola offline
      savePendingOfflineIngreso(movimiento);
      setPendingOfflineCount(getOfflinePendingIngresos().length);
      setMensajeConfirmacion(`📴 Guardado localmente (Offline). Se sincronizará automáticamente al recuperar señal.`);
    } else {
      try {
        await onRegistrarIngresoSilo(movimiento);
        setMensajeConfirmacion(`✅ Ingreso de ${Number(kgIngreso).toLocaleString('es-AR')} kg registrado en ${siloSeleccionado}.`);
      } catch (err) {
        savePendingOfflineIngreso(movimiento);
        setPendingOfflineCount(getOfflinePendingIngresos().length);
        setMensajeConfirmacion(`⚠️ Error de red. Guardado localmente en cola offline.`);
      }
    }

    // Registrar en auditoría
    recordGlobalAuditLog({
      tipo: 'Creación',
      usuario: currentUser.nombre,
      rol: currentUser.rol,
      modulo: 'SILOS',
      entidadId: siloSeleccionado,
      descripcion: `Ingreso rápido móvil: +${Number(kgIngreso).toLocaleString('es-AR')} kg en ${siloSeleccionado} (${cliente} - ${variedad}).`,
      detalles: `Chofer: ${choferNombre || 'S/D'} | Patente: ${patenteCamion || 'S/D'} | Modo: Planta Móvil.`
    });

    // Reset de campos
    setKgIngreso('');
    setChoferNombre('');
    setPatenteCamion('');
    setTimeout(() => setMensajeConfirmacion(''), 4000);
  };

  // Filtrar lotes pendientes de marcar realizado (PRE-CARGA)
  const lotesPendientesRealizado = lotes.filter(l => l.estadoRegistro === 'PRE-CARGA');

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-16">
      
      {/* Barra Superior de Estado y Conexión */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
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
                {isOnline ? 'Conectado a Planta' : 'Modo Offline (Sin Señal)'}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-mono block">
              Operador: {currentUser.nombre} ({currentUser.rol})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingOfflineCount > 0 && (
            <button
              onClick={handleSyncOfflineQueue}
              disabled={isSyncing || !isOnline}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
              title="Sincronizar cola offline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingOfflineCount} pend.</span>
            </button>
          )}

          <button
            onClick={onOpenQrScanner}
            className="p-2.5 bg-[#00603C] hover:bg-[#254731] text-white rounded-xl shadow-md transition flex items-center gap-1.5 text-xs font-bold"
            title="Escanear QR de Lote"
          >
            <QrCode className="w-4 h-4 text-[#C9922E]" />
            <span className="hidden sm:inline">Escanear</span>
          </button>
        </div>
      </div>

      {mensajeConfirmacion && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{mensajeConfirmacion}</span>
        </div>
      )}

      {/* Selector de Sub-pestañas Operativas Táctiles */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setSubTab('INGRESO_RAPIDO')}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'INGRESO_RAPIDO'
              ? 'bg-white text-[#00603C] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span className="truncate">Ingreso Camión</span>
        </button>

        <button
          onClick={() => setSubTab('MARCAR_REALIZADO')}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
            subTab === 'MARCAR_REALIZADO'
              ? 'bg-white text-[#00603C] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span className="truncate">Marcar Realizado</span>
          {lotesPendientesRealizado.length > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-mono font-bold">
              {lotesPendientesRealizado.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('DESPACHOS_PLAYA')}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'DESPACHOS_PLAYA'
              ? 'bg-white text-[#00603C] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span className="truncate">Mis Órdenes (Playa)</span>
        </button>
      </div>

      {/* 1. INGRESO RÁPIDO DE CAMIÓN */}
      {subTab === 'INGRESO_RAPIDO' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#00603C]" />
              <h3 className="font-serif text-base font-bold text-gray-900">
                Ingreso Rápido a Silo
              </h3>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">
              Auto-guardado offline
            </span>
          </div>

          <form onSubmit={handleGuardarIngresoRapido} className="space-y-4 text-xs">
            {/* Silo Destino (Selector grande táctil) */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Silo Destino *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SILOS_DISPONIBLES.map((siloId) => {
                  const stock = siloStocks[siloId] || 0;
                  const isSelected = siloSeleccionado === siloId;
                  return (
                    <button
                      key={siloId}
                      type="button"
                      onClick={() => setSiloSeleccionado(siloId)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-[#00603C] bg-[#E3EFE7] bg-opacity-40 text-[#00603C] font-bold shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{siloId}</div>
                      <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                        {(stock / 1000).toFixed(1)} Tn
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kilogramos Netos */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Kilos Netos del Camión (kg) *
              </label>
              <input
                type="number"
                required
                placeholder="ej: 30000"
                value={kgIngreso}
                onChange={(e) => setKgIngreso(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              />
            </div>

            {/* Cliente y Grano */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                  Cliente Comitente
                </label>
                <select
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
                >
                  {clientes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                  Variedad
                </label>
                <input
                  type="text"
                  value={variedad}
                  onChange={(e) => setVariedad(e.target.value)}
                  placeholder="ej: P46A03"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
                />
              </div>
            </div>

            {/* Chofer y Patente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                  Chofer / Transporte
                </label>
                <input
                  type="text"
                  value={choferNombre}
                  onChange={(e) => setChoferNombre(e.target.value)}
                  placeholder="Nombre del chofer"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                  Patente
                </label>
                <input
                  type="text"
                  value={patenteCamion}
                  onChange={(e) => setPatenteCamion(e.target.value)}
                  placeholder="ej: AA123BB"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00603C]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#00603C] hover:bg-[#254731] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              <span>Registrar Ingreso de Camión</span>
            </button>
          </form>
        </div>
      )}

      {/* 2. MARCAR LOTE REALIZADO / PRODUCIDO */}
      {subTab === 'MARCAR_REALIZADO' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-[#C9922E]" />
              <h3 className="font-serif text-base font-bold text-gray-900">
                Lotes en Pre-carga / Pendientes
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-gray-500">
              {lotesPendientesRealizado.length} lotes
            </span>
          </div>

          {lotesPendientesRealizado.length === 0 ? (
            <div className="text-center py-10 text-gray-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-gray-700 text-xs">Todos los lotes están marcados como Realizados.</p>
              <p className="text-[11px]">No hay precargas pendientes de confirmación en planta.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lotesPendientesRealizado.map((lote) => (
                <div
                  key={lote.id}
                  className="p-4 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-200 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-[#C9922E] uppercase block">
                        Lote ID: {lote.id}
                      </span>
                      <h4 className="font-bold text-gray-900 text-sm">{lote.loteNro}</h4>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                      PRE-CARGA
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Cliente / Especie</span>
                      <strong className="text-gray-800">{lote.cliente}</strong> · {lote.especie}
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Variedad / Stock</span>
                      <strong className="text-gray-800">{lote.variedad}</strong> · {lote.stockKg.toLocaleString('es-AR')} kg
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onUpdateLoteEstado(lote, 'REALIZADO')}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar como Realizado
                    </button>
                    <button
                      onClick={() => onSelectLote(lote)}
                      className="px-3 py-2.5 bg-white hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 transition"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. DESPACHOS (MIS ÓRDENES - PLAYA) */}
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
          />
        </div>
      )}
    </div>
  );
};
