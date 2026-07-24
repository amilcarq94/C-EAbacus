/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LogoSiloLoose, LogoSiloSquare, HeaderBrand } from './components/Logo';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { LotesView } from './components/LotesView';
import { LoteDetail } from './components/LoteDetail';
import { LoteForm } from './components/LoteForm';
import { ImportarStock } from './components/ImportarStock';
import { RegistrarSalida } from './components/RegistrarSalida';
import { SalidasList } from './components/SalidasList';
import { Lote, SalidaRegistrada, MovimientoStock, EstadoLoteType, AuditLogEntry, OrdenCarga, OrdenProceso, EstadoOrdenProceso, MovimientoSilo, SiloId, CAPACIDAD_MAX_SILO } from './types';
import { getLoteAuditoria } from './utils/audit';
import { LOTES_INICIALES, SALIDAS_INICIALES, CLIENTES_PRECARGADOS, ESPECIES_PRECARGADAS, ORDENES_CARGA_INICIALES, ORDENES_PROCESO_INICIALES, MOVIMIENTOS_SILO_INICIALES } from './data/mockData';
import { LayoutDashboard, Layers, ArrowDownRight, History, Upload, LogOut, CheckCircle, QrCode, ClipboardCheck, Factory, ClipboardList, Warehouse, AlertTriangle } from 'lucide-react';
import { QrCodeScanner } from './components/QrCodeScanner';
import { DespachosSection } from './components/DespachosSection';
import { DashboardProduccion } from './components/DashboardProduccion';
import { OrdenesProcesoView } from './components/OrdenesProcesoView';
import { IngresoSilosView } from './components/IngresoSilosView';
import { CampaniaSelector } from './components/CampaniaSelector';
import { getActiveCampaniaIdStored, setActiveCampaniaIdStored, getCampaniaIdFromDate } from './utils/campanias';
import { db, getLoteDocId, uploadBase64ToStorage, seedLotesIfEmpty, seedOrdenesProcesoIfEmpty, seedMovimientosSiloIfEmpty, registrarMovimientoTransaccion, mapFirestoreToLote, mapLoteToFirestore } from './lib/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, writeBatch } from 'firebase/firestore';

export default function App() {
  // 1. Estado de Sesión
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('agro_abacus_user');
    return saved ? JSON.parse(saved) : { nombre: 'Malcon Baez', rol: 'Jefe de Planta' };
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('agro_abacus_logged') === 'true';
  });

  // Estado de Conexión en Tiempo Real a Firebase
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

  // Estado del Escáner de QR
  const [showQrScanner, setShowQrScanner] = useState(false);

  // 2. Estados Principales del Sistema (Durable Local Storage)
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [salidas, setSalidas] = useState<SalidaRegistrada[]>([]);
  const [ordenesCarga, setOrdenesCarga] = useState<OrdenCarga[]>([]);
  const [ordenesProceso, setOrdenesProceso] = useState<OrdenProceso[]>([]);
  const [movimientosSilo, setMovimientosSilo] = useState<MovimientoSilo[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [especies, setEspecies] = useState<string[]>([]);
  const [stockThresholds, setStockThresholds] = useState<Record<string, number>>({});
  const [alertEmail, setAlertEmail] = useState('amilcarQ94@gmail.com');

  // 2.b Estado de Campaña Fijada / Activa
  const [activeCampaniaId, setActiveCampaniaId] = useState<string>(() => getActiveCampaniaIdStored());
  const [isExplicitlyPinned, setIsExplicitlyPinned] = useState<boolean>(() => {
    return !!localStorage.getItem('agro_abacus_active_campania');
  });

  const handleSelectCampania = (campaniaId: string) => {
    setActiveCampaniaId(campaniaId);
    setActiveCampaniaIdStored(campaniaId);
    setIsExplicitlyPinned(true);
  };

  const handlePinCampania = (campaniaId: string) => {
    setActiveCampaniaIdStored(campaniaId);
    setIsExplicitlyPinned(true);
  };

  // Recalculo en tiempo real de "hechos" para Órdenes de Proceso en función de los lotes vinculados
  const ordenesProcesoConHechos = useMemo(() => {
    return ordenesProceso.map(ord => {
      const linkedLotes = lotes.filter(l => l.ordenProcesoId === ord.id);
      let sumHechos = ord.hechos;
      if (linkedLotes.length > 0) {
        sumHechos = linkedLotes.reduce((acc, l) => acc + (l.stockBolsas || 0), 0);
      }

      // Sugerencia/actualización automática de estado
      let estadoCalc = ord.estado;
      if (sumHechos >= ord.bbPedidos && ord.bbPedidos > 0 && ord.estado !== 'TERMINADO') {
        estadoCalc = 'TERMINADO';
      } else if (sumHechos > 0 && ord.estado === 'SIN INICIAR') {
        estadoCalc = 'EN CURSO';
      }

      return {
        ...ord,
        hechos: sumHechos,
        estado: estadoCalc
      };
    });
  }, [ordenesProceso, lotes]);

  // Campañas disponibles acumuladas de todas las entidades
  const availableCampaniasIds = useMemo(() => {
    const set = new Set<string>();
    lotes.forEach(l => {
      const cId = l.campaniaId || getCampaniaIdFromDate(l.fechaIngreso);
      if (cId) set.add(cId);
    });
    salidas.forEach(s => {
      const cId = s.campaniaId || getCampaniaIdFromDate(s.fecha);
      if (cId) set.add(cId);
    });
    ordenesCarga.forEach(o => {
      const cId = o.campaniaId || getCampaniaIdFromDate(o.fecha);
      if (cId) set.add(cId);
    });
    ordenesProceso.forEach(op => {
      const cId = op.campaniaId || getCampaniaIdFromDate(op.fechaCreacion);
      if (cId) set.add(cId);
    });
    return Array.from(set);
  }, [lotes, salidas, ordenesCarga, ordenesProceso]);

  // Colecciones filtradas según la campaña activa/fijada
  const filteredLotesByCampania = useMemo(() => {
    if (activeCampaniaId === 'TODAS') return lotes;
    return lotes.filter(l => (l.campaniaId || getCampaniaIdFromDate(l.fechaIngreso)) === activeCampaniaId);
  }, [lotes, activeCampaniaId]);

  const filteredSalidasByCampania = useMemo(() => {
    if (activeCampaniaId === 'TODAS') return salidas;
    return salidas.filter(s => (s.campaniaId || getCampaniaIdFromDate(s.fecha)) === activeCampaniaId);
  }, [salidas, activeCampaniaId]);

  const filteredOrdenesByCampania = useMemo(() => {
    if (activeCampaniaId === 'TODAS') return ordenesCarga;
    return ordenesCarga.filter(o => (o.campaniaId || getCampaniaIdFromDate(o.fecha)) === activeCampaniaId);
  }, [ordenesCarga, activeCampaniaId]);

  const filteredOrdenesProcesoByCampania = useMemo(() => {
    if (activeCampaniaId === 'TODAS') return ordenesProcesoConHechos;
    return ordenesProcesoConHechos.filter(o => (o.campaniaId || getCampaniaIdFromDate(o.fechaCreacion)) === activeCampaniaId);
  }, [ordenesProcesoConHechos, activeCampaniaId]);

  // Cálculo en tiempo real de stock por Silo (Silo 1 a Silo 6)
  const siloStocks = useMemo(() => {
    const stocks: Record<SiloId, number> = {
      'Silo 1': 0,
      'Silo 2': 0,
      'Silo 3': 0,
      'Silo 4': 0,
      'Silo 5': 0,
      'Silo 6': 0,
    };
    movimientosSilo.forEach((m) => {
      if (m.tipo === 'INGRESO') {
        stocks[m.siloId] = (stocks[m.siloId] || 0) + m.kg;
      } else if (m.tipo === 'EGRESO_OP') {
        stocks[m.siloId] = Math.max(0, (stocks[m.siloId] || 0) - m.kg);
      } else if (m.tipo === 'AJUSTE_ZERO') {
        stocks[m.siloId] = 0;
      }
    });
    return stocks;
  }, [movimientosSilo]);

  // Silos que alcanzan o superan el 95% de su capacidad máxima (>= 171.000 kg)
  const silosConAlerta95 = useMemo(() => {
    const umbral95 = CAPACIDAD_MAX_SILO * 0.95; // 171.000 kg
    return Object.entries(siloStocks)
      .filter(([_, stock]) => (stock as number) >= umbral95)
      .map(([siloId]) => siloId);
  }, [siloStocks]);

  const tieneAlertaSilo95 = silosConAlerta95.length > 0;

  // 3. Control de Vistas
  // 'dashboard' | 'dashboard-produccion' | 'ordenes-proceso' | 'ingreso-silos' | 'lotes' | 'alta-lote' | 'importar' | 'registrar-salida' | 'salidas-registradas' | 'despachos'
  const [activeView, setActiveView] = useState<'dashboard' | 'dashboard-produccion' | 'ordenes-proceso' | 'ingreso-silos' | 'lotes' | 'alta-lote' | 'importar' | 'registrar-salida' | 'salidas-registradas' | 'despachos'>('dashboard');
  const [loteSeleccionado, setLoteSeleccionado] = useState<Lote | null>(null);
  const [loteAEditar, setLoteAEditar] = useState<Lote | null>(null);
  const [preselectedLoteId, setPreselectedLoteId] = useState<string | undefined>(undefined);
  const [publicLote, setPublicLote] = useState<Lote | null>(null);

  // Notificaciones temporales de éxito
  const [notificacion, setNotificacion] = useState('');
  const [isLotesSpinning, setIsLotesSpinning] = useState(false);
  const [lotesRipples, setLotesRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleLotesClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    navigateTo('lotes');
    setIsLotesSpinning(true);
    setTimeout(() => setIsLotesSpinning(false), 800);

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();
    setLotesRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setLotesRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);
  };

  // Calcular cantidad de lotes críticos (con stock por debajo del umbral de alerta)
  const criticalLotesCount = lotes.filter((l) => {
    const threshold = stockThresholds[l.especie] !== undefined ? stockThresholds[l.especie] : 5000;
    return l.stockKg > 0 && l.stockKg <= threshold;
  }).length;

  // 4. Efecto de Inicialización de Firebase (Firestore + Storage)
  useEffect(() => {
    // 1. Ejecutar seeding inicial de 112 lotes si está vacío en Firestore
    seedLotesIfEmpty(LOTES_INICIALES);

    // 2. Suscribirse en tiempo real a 'lotes'
    const unsubLotes = onSnapshot(collection(db, 'lotes'), (snapshot) => {
      setIsFirebaseConnected(true);
      const loadedLotes = snapshot.docs.map(doc => mapFirestoreToLote(doc.id, doc.data()));
      setLotes(loadedLotes);

      // Sincronizar loteSeleccionado si está abierto para mantenerlo actualizado
      setLoteSeleccionado(prev => {
        if (!prev) return null;
        const updated = loadedLotes.find(l => l.id === prev.id);
        if (updated) {
          return {
            ...updated,
            historial: prev.historial // Preservar historial cargado perezosamente (lazy load)
          };
        }
        return prev;
      });

      // Sincronizar catálogo local de clientes y especies en base a lo que hay en BD
      const clientSet = new Set<string>();
      const especieSet = new Set<string>();
      loadedLotes.forEach(l => {
        if (l.cliente) clientSet.add(l.cliente);
        if (l.especie) especieSet.add(l.especie);
      });
      // Asegurar que los precargados sigan estando
      CLIENTES_PRECARGADOS.forEach(c => clientSet.add(c));
      ESPECIES_PRECARGADAS.forEach(e => especieSet.add(e));

      setClientes(Array.from(clientSet));
      setEspecies(Array.from(especieSet));
    }, (error) => {
      console.error("Error subscribing to 'lotes':", error);
      setIsFirebaseConnected(false);
    });

    // 3. Suscribirse en tiempo real a 'salidas'
    const unsubSalidas = onSnapshot(collection(db, 'salidas'), (snapshot) => {
      setIsFirebaseConnected(true);
      const loadedSalidas = snapshot.docs.map(doc => doc.data() as SalidaRegistrada);
      setSalidas(loadedSalidas);
    }, (error) => {
      console.error("Error subscribing to 'salidas':", error);
      setIsFirebaseConnected(false);
    });

    // 4. Suscribirse en tiempo real a 'ordenesCarga'
    const unsubOrdenes = onSnapshot(collection(db, 'ordenesCarga'), (snapshot) => {
      setIsFirebaseConnected(true);
      const loadedOrdenes = snapshot.docs.map(doc => doc.data() as OrdenCarga);
      setOrdenesCarga(loadedOrdenes);
    }, (error) => {
      console.error("Error subscribing to 'ordenesCarga':", error);
      setIsFirebaseConnected(false);
    });

    // 5. Suscribirse en tiempo real a 'ordenes_proceso'
    seedOrdenesProcesoIfEmpty(ORDENES_PROCESO_INICIALES);
    const unsubOrdenesProceso = onSnapshot(collection(db, 'ordenes_proceso'), (snapshot) => {
      setIsFirebaseConnected(true);
      const loadedOrdenesProceso = snapshot.docs.map(doc => doc.data() as OrdenProceso);
      setOrdenesProceso(loadedOrdenesProceso);
    }, (error) => {
      console.error("Error subscribing to 'ordenes_proceso':", error);
      setIsFirebaseConnected(false);
    });

    // 6. Suscribirse en tiempo real a 'movimientos_silo'
    seedMovimientosSiloIfEmpty(MOVIMIENTOS_SILO_INICIALES);
    const unsubMovimientosSilo = onSnapshot(collection(db, 'movimientos_silo'), (snapshot) => {
      setIsFirebaseConnected(true);
      const loadedMovs = snapshot.docs.map(doc => doc.data() as MovimientoSilo);
      setMovimientosSilo(loadedMovs);
    }, (error) => {
      console.error("Error subscribing to 'movimientos_silo':", error);
      setIsFirebaseConnected(false);
    });

    // Listeners para el estado de internet del navegador
    const handleOnline = () => {
      setIsOnline(true);
      setIsFirebaseConnected(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsFirebaseConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Cargar umbrales de stock desde localStorage (configuraciones locales del usuario)
    const localThresholds = localStorage.getItem('agro_thresholds');
    if (localThresholds) {
      setStockThresholds(JSON.parse(localThresholds));
    } else {
      const defaultThresholds: Record<string, number> = {
        "Soja": 10000,
        "Trigo": 8000,
        "Arveja": 5000,
      };
      setStockThresholds(defaultThresholds);
      localStorage.setItem('agro_thresholds', JSON.stringify(defaultThresholds));
    }

    const localEmail = localStorage.getItem('agro_alert_email');
    if (localEmail) {
      setAlertEmail(localEmail);
    } else {
      setAlertEmail('amilcar.quiroz@agroabacus.com.ar');
      localStorage.setItem('agro_alert_email', 'amilcar.quiroz@agroabacus.com.ar');
    }

    return () => {
      unsubLotes();
      unsubSalidas();
      unsubOrdenes();
      unsubOrdenesProceso();
      unsubMovimientosSilo();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Efecto para cargar en tiempo real el historial de movimientos de un lote seleccionado (Lazy Loading)
  useEffect(() => {
    if (!loteSeleccionado) return;

    const unsubMovs = onSnapshot(collection(db, 'lotes', loteSeleccionado.id, 'movimientos'), (snapshot) => {
      const movs = snapshot.docs.map(doc => doc.data() as MovimientoStock);
      // Ordenar por fecha decreciente (los más nuevos primero)
      const sortedMovs = movs.sort((a, b) => b.fecha.localeCompare(a.fecha));

      setLoteSeleccionado(prev => {
        if (prev && prev.id === loteSeleccionado.id) {
          return {
            ...prev,
            historial: sortedMovs
          };
        }
        return prev;
      });
    });

    return () => unsubMovs();
  }, [loteSeleccionado?.id]);

  // Mantener en sincronía loteSeleccionado si cambian los datos maestros del lote
  useEffect(() => {
    if (loteSeleccionado) {
      const found = lotes.find(l => l.id === loteSeleccionado.id);
      if (found) {
        setLoteSeleccionado(prev => {
          if (!prev) return null;
          return {
            ...found,
            historial: prev.historial || found.historial || []
          };
        });
      }
    }
  }, [lotes]);

  // 4.5. Deep-linking / Consulta de Lotes por QR
  useEffect(() => {
    if (lotes.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const loteId = urlParams.get('lote');
      if (loteId) {
        const found = lotes.find(l => l.id.toLowerCase() === loteId.toLowerCase());
        if (found) {
          if (isLoggedIn) {
            setLoteSeleccionado(found);
            setActiveView('lotes');
            // Limpiar parámetro de URL para navegación fluida
            window.history.replaceState({}, '', window.location.pathname);
          } else {
            setPublicLote(found);
          }
        }
      }
    }
  }, [lotes, isLoggedIn]);

  // 4.6. Atajos de Teclado Globales (Ctrl+N, Ctrl+S, Ctrl+I)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLoggedIn) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();

      if (key === 'n') {
        e.preventDefault();
        navigateTo('alta-lote');
        showNotification('Acceso rápido: Alta de Nuevo Lote (Ctrl+N)');
      } else if (key === 's') {
        e.preventDefault();
        navigateTo('registrar-salida');
        showNotification('Acceso rápido: Registrar Salida (Ctrl+S)');
      } else if (key === 'i') {
        e.preventDefault();
        navigateTo('importar');
        showNotification('Acceso rápido: Importar Stock (Ctrl+I)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoggedIn]);

  // Guardar en LocalStorage cada vez que cambie el estado (Mantenido solo para compatibilidad de firma o caches, pero la base de verdad es Firestore)
  const saveLotesToStorage = (newLotes: Lote[]) => {
    setLotes(newLotes);
    localStorage.setItem('agro_lotes', JSON.stringify(newLotes));
  };

  const saveSalidasToStorage = (newSalidas: SalidaRegistrada[]) => {
    setSalidas(newSalidas);
    localStorage.setItem('agro_salidas', JSON.stringify(newSalidas));
  };

  const saveOrdenesToStorage = (newOrdenes: OrdenCarga[]) => {
    setOrdenesCarga(newOrdenes);
    localStorage.setItem('agro_ordenes_carga', JSON.stringify(newOrdenes));
  };

  const handleSaveOrden = async (nuevaOrden: OrdenCarga) => {
    try {
      const docRef = doc(db, 'ordenesCarga', nuevaOrden.id);
      await setDoc(docRef, nuevaOrden);
      showNotification(`Orden ${nuevaOrden.id} generada y asignada con éxito.`);
    } catch (e) {
      console.error('Error al guardar orden en Firestore:', e);
      showNotification('Error crítico al persistir la orden de carga.');
    }
  };

  const handleUpdateOrdenStatus = async (
    ordenId: string,
    nuevoEstado: 'Disponible' | 'Aceptada' | 'Despachada',
    fotoRemito?: string,
    firmaChofer?: string
  ) => {
    try {
      // 1. Subir a Firebase Storage si son base64
      let fotoUrl = fotoRemito;
      if (fotoRemito && fotoRemito.startsWith('data:')) {
        fotoUrl = await uploadBase64ToStorage(`ordenes/${ordenId}/foto_remito.png`, fotoRemito);
      }

      let firmaUrl = firmaChofer;
      if (firmaChofer && firmaChofer.startsWith('data:')) {
        firmaUrl = await uploadBase64ToStorage(`ordenes/${ordenId}/firma_chofer.png`, firmaChofer);
      }

      const docRef = doc(db, 'ordenesCarga', ordenId);
      await updateDoc(docRef, {
        estado: nuevoEstado,
        ...(fotoUrl !== undefined && { fotoRemito: fotoUrl }),
        ...(firmaUrl !== undefined && { firmaChofer: firmaUrl })
      });

      showNotification(`Orden ${ordenId} marcada como ${nuevoEstado}.`);
    } catch (e) {
      console.error('Error al actualizar orden en Firestore:', e);
      showNotification('Error al actualizar el estado de la orden.');
    }
  };

  const handleDespacharStock = async (
    loteId: string,
    bolsas: number,
    kg: number,
    ordenId: string
  ): Promise<boolean> => {
    // 1. Verificar si la orden tiene múltiples lotes de origen configurados
    const orden = ordenesCarga.find(o => o.id === ordenId);
    
    if (orden && orden.lotesOrigen && orden.lotesOrigen.length > 0) {
      // Flujo de múltiples lotes de origen
      // Validar stock de todos los lotes involucrados primero
      for (const item of orden.lotesOrigen) {
        const targetLote = lotes.find(l => l.id === item.loteId);
        if (!targetLote) {
          console.error(`Lote con ID ${item.loteId} no encontrado en el estado actual.`);
          return false;
        }
        if (item.cantidadBolsas > targetLote.stockBolsas) {
          console.error(`Stock insuficiente para el lote ${targetLote.loteNro}. Disponible: ${targetLote.stockBolsas}, Solicitado: ${item.cantidadBolsas}`);
          return false;
        }
      }

      try {
        const batch = writeBatch(db);
        const fechaHoy = new Date().toISOString().split('T')[0];

        for (const item of orden.lotesOrigen) {
          const targetLote = lotes.find(l => l.id === item.loteId)!;
          const nuevoMov: MovimientoStock = {
            id: `MOV-OC-${Date.now()}-${item.loteId}`,
            fecha: fechaHoy,
            tipo: 'Salida',
            cantidadBolsas: item.cantidadBolsas,
            kgPorBolsa: targetLote.kgPorBolsa,
            cantidadKg: item.kgTotales,
            detalle: `Carga Despachada bajo Orden N° ${ordenId} (Lote: ${item.loteNro})`
          };

          // Registrar el movimiento en la subcolección del lote
          const movRef = doc(collection(db, 'lotes', item.loteId, 'movimientos'), nuevoMov.id);
          batch.set(movRef, nuevoMov);

          // Calcular nuevos stocks del lote padre
          const nuevoStockBolsas = Math.max(0, targetLote.stockBolsas - item.cantidadBolsas);
          const nuevoStockKgTotal = nuevoStockBolsas * targetLote.kgPorBolsa;
          const nuevoEstado = nuevoStockBolsas === 0 ? 'Agotado' : targetLote.estado;

          // Registrar evento de auditoría para el lote
          const auditEvent: AuditLogEntry = {
            id: `AUD-MOV-OC-${Date.now()}-${item.loteId}`,
            fechaHora: new Date().toISOString(),
            tipo: 'Stock',
            usuario: currentUser?.nombre || 'Despachante de Planta',
            descripcion: `Despacho de stock registrado por Orden de Carga N° ${ordenId}: -${item.cantidadBolsas} b. (${item.kgTotales} kg).`,
            detalles: `Lote de origen: ${targetLote.loteNro}.`
          };

          const loteRef = doc(db, 'lotes', item.loteId);
          batch.update(loteRef, {
            stockBolsas: nuevoStockBolsas,
            stockKgTotal: nuevoStockKgTotal,
            estado: nuevoEstado,
            auditoria: [auditEvent, ...(targetLote.auditoria || [])]
          });
        }

        await batch.commit();
        return true;
      } catch (error) {
        console.error('Error al registrar despacho de múltiples lotes en lote batch:', error);
        return false;
      }
    }

    // Flujo legacy para un único lote de origen
    const lote = lotes.find(l => l.id === loteId);
    if (!lote) return false;

    if (bolsas > lote.stockBolsas) {
      return false; // stock insuficiente
    }

    const nuevoMov: MovimientoStock = {
      id: `MOV-OC-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'Salida',
      cantidadBolsas: bolsas,
      kgPorBolsa: lote.kgPorBolsa,
      cantidadKg: kg,
      detalle: `Carga Despachada bajo Orden N° ${ordenId}`
    };

    try {
      await registrarMovimientoTransaccion(loteId, nuevoMov);
      return true;
    } catch (e) {
      console.error('Error al registrar despacho en transacción:', e);
      return false;
    }
  };

  const handleDeleteOrden = async (ordenId: string) => {
    try {
      const docRef = doc(db, 'ordenesCarga', ordenId);
      await deleteDoc(docRef);
      showNotification(`Orden ${ordenId} eliminada correctamente.`);
    } catch (e) {
      console.error('Error al eliminar orden:', e);
      showNotification('Error al eliminar la orden de carga.');
    }
  };

  const handleSaveOrdenProceso = async (orden: OrdenProceso) => {
    try {
      const batch = writeBatch(db);
      const docRef = doc(db, 'ordenes_proceso', orden.id);
      batch.set(docRef, JSON.parse(JSON.stringify(orden)), { merge: true });

      // Si la orden de proceso tiene silosOrigen especificados, registrar EGRESO_OP en movimientos_silo
      if (orden.silosOrigen && orden.silosOrigen.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        for (const item of orden.silosOrigen) {
          const movId = `EGRESO-OP-${orden.numeroOrden}-${item.siloId.replace(/\s+/g, '')}-${Date.now()}`;
          const movEgreso: MovimientoSilo = {
            id: movId,
            siloId: item.siloId,
            fecha: todayStr,
            tipo: 'EGRESO_OP',
            kg: item.kgExtraidos,
            ordenProcesoId: orden.id,
            cliente: orden.cliente,
            especie: orden.especie,
            variedad: orden.variedad,
            categoria: orden.categoria
          };
          const movDocRef = doc(db, 'movimientos_silo', movId);
          batch.set(movDocRef, movEgreso);
        }
      }

      await batch.commit();
      showNotification(`Orden de Proceso N° ${orden.numeroOrden} guardada correctamente.`);
    } catch (err) {
      console.error("Error al guardar orden de proceso:", err);
      showNotification("Error al guardar Orden de Proceso");
    }
  };

  const handleDeleteOrdenProceso = async (id: string) => {
    try {
      setOrdenesProceso(prev => prev.filter(o => o.id !== id));
      await deleteDoc(doc(db, 'ordenes_proceso', id));
      showNotification("Orden de Proceso eliminada.");
    } catch (err) {
      console.error("Error al eliminar orden de proceso:", err);
    }
  };

  const handleUpdateEstadoOrdenProceso = async (id: string, nuevoEstado: EstadoOrdenProceso) => {
    try {
      setOrdenesProceso(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o));
      await updateDoc(doc(db, 'ordenes_proceso', id), { estado: nuevoEstado });
      showNotification(`Estado de Orden actualizado a ${nuevoEstado}`);
    } catch (err) {
      console.error("Error al actualizar estado de orden:", err);
    }
  };

  const handleSaveThresholds = (newThresholds: Record<string, number>, email: string) => {
    setStockThresholds(newThresholds);
    localStorage.setItem('agro_thresholds', JSON.stringify(newThresholds));
    setAlertEmail(email);
    localStorage.setItem('agro_alert_email', email);
    showNotification('Configuración de alertas y correo de contacto guardados.');
  };

  const checkAndTriggerEmailAlert = (lote: Lote, previousStockKg: number, currentStockKg: number) => {
    const threshold = stockThresholds[lote.especie] !== undefined ? stockThresholds[lote.especie] : 5000;
    
    // Si cruzó la barrera del umbral hacia abajo
    if (previousStockKg > threshold && currentStockKg <= threshold && currentStockKg > 0) {
      const nuevoEvento: AuditLogEntry = {
        id: `AUD-EMAIL-${Date.now()}`,
        fechaHora: new Date().toISOString(),
        tipo: 'Stock',
        usuario: 'Sistema de Alertas (Automático)',
        descripcion: `📧 Alerta automática por email enviada a ${alertEmail}`,
        detalles: `Asunto: ALERTA DE STOCK CRÍTICO - Lote ${lote.id} (${lote.especie})\n\nCuerpo del mensaje:\n--------------------------------------------------\nEstimado Operador,\n\nSe ha disparado una alerta automática para el lote ${lote.id}.\n\n- Producto: ${lote.especie} (${lote.variedad})\n- Cliente: ${lote.cliente}\n- Stock Actual: ${currentStockKg.toLocaleString('es-AR')} kg (${lote.stockBolsas} bolsas)\n- Umbral Mínimo: ${threshold.toLocaleString('es-AR')} kg\n\nEl stock de este lote se encuentra por debajo del umbral mínimo de seguridad configurado.\n--------------------------------------------------`
      };
      
      lote.auditoria = [nuevoEvento, ...getLoteAuditoria(lote)];
      
      // Mostrar notificación exitosa
      showNotification(`📧 Alerta de email enviada a ${alertEmail} por stock crítico del Lote ${lote.id}.`);
    }
  };

  // 5. Manejo del Login
  const handleLoginSuccess = (nombre: string, rol: string) => {
    setIsLoggedIn(true);
    const user = { nombre, rol };
    setCurrentUser(user);
    sessionStorage.setItem('agro_abacus_logged', 'true');
    sessionStorage.setItem('agro_abacus_user', JSON.stringify(user));
    showNotification(`Bienvenido ${nombre} (${rol}). Sesión iniciada.`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('agro_abacus_logged');
    sessionStorage.removeItem('agro_abacus_user');
  };

  // Función auxiliar para notificaciones
  const showNotification = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => {
      setNotificacion('');
    }, 4000);
  };

  // 6. Operaciones de Lotes (CRUD + updates)
  const handleSaveLote = async (loteGuardar: Lote) => {
    try {
      const isEdit = lotes.some(l => l.id.toLowerCase() === loteGuardar.id.toLowerCase());
      let docId = loteGuardar.id;
      
      if (!isEdit) {
        docId = getLoteDocId(loteGuardar.cliente, loteGuardar.loteNro);
        loteGuardar.id = docId;
        loteGuardar.auditoria = [
          {
            id: `AUD-CRE-${Date.now()}`,
            fechaHora: new Date().toISOString(),
            tipo: 'Creación',
            usuario: currentUser.nombre,
            descripcion: `Lote ${docId} registrado con éxito.`,
            detalles: `Carga inicial: ${loteGuardar.stockBolsas} bolsas de ${loteGuardar.especie} (${loteGuardar.variedad}).`
          }
        ];
      } else {
        // Comparar campos para auditar cambios en datos maestros
        const loteAnterior = lotes.find(l => l.id === loteGuardar.id);
        if (loteAnterior) {
          const currentAuditoria = [...getLoteAuditoria(loteAnterior)];
          const cambios: string[] = [];
          if (loteAnterior.cliente !== loteGuardar.cliente) cambios.push(`Cliente de "${loteAnterior.cliente}" a "${loteGuardar.cliente}"`);
          if (loteAnterior.especie !== loteGuardar.especie) cambios.push(`Especie de "${loteAnterior.especie}" a "${loteGuardar.especie}"`);
          if (loteAnterior.variedad !== loteGuardar.variedad) cambios.push(`Variedad de "${loteAnterior.variedad}" a "${loteGuardar.variedad}"`);
          if (loteAnterior.tipo !== loteGuardar.tipo) cambios.push(`Tipo de lote de "${loteAnterior.tipo}" a "${loteGuardar.tipo}"`);
          if (loteAnterior.producto !== loteGuardar.producto) cambios.push(`Producto químico de "${loteAnterior.producto}" a "${loteGuardar.producto}"`);
          if (loteAnterior.fechaIngreso !== loteGuardar.fechaIngreso) cambios.push(`Fecha de ingreso de "${loteAnterior.fechaIngreso}" a "${loteGuardar.fechaIngreso}"`);
          if (loteAnterior.kgPorBolsa !== loteGuardar.kgPorBolsa) cambios.push(`Peso por bolsa de ${loteAnterior.kgPorBolsa} kg a ${loteGuardar.kgPorBolsa} kg`);
          const tAnt = [...loteAnterior.tratamiento].sort().join(', ');
          const tNue = [...loteGuardar.tratamiento].sort().join(', ');
          if (tAnt !== tNue) cambios.push(`Tratamientos de [${tAnt}] a [${tNue}]`);

          if (cambios.length > 0) {
            const nuevoEvento: AuditLogEntry = {
              id: `AUD-EDIT-${Date.now()}`,
              fechaHora: new Date().toISOString(),
              tipo: 'Edición',
              usuario: currentUser.nombre,
              descripcion: `Modificación de datos maestros: ${cambios.join(', ')}.`
            };
            loteGuardar.auditoria = [nuevoEvento, ...currentAuditoria];
          } else {
            loteGuardar.auditoria = currentAuditoria;
          }
        }
      }

      // Persistir en Firestore
      const batch = writeBatch(db);
      const docRef = doc(db, 'lotes', docId);
      batch.set(docRef, mapLoteToFirestore(loteGuardar));

      // Si tiene movimientos y es nuevo, persistir movimientos
      if (!isEdit && loteGuardar.historial && loteGuardar.historial.length > 0) {
        for (const mov of loteGuardar.historial) {
          const movRef = doc(collection(db, 'lotes', docId, 'movimientos'), mov.id);
          batch.set(movRef, mov);
        }
      }

      // Si el lote tiene silos de origen especificados, registrar EGRESO_OP en movimientos_silo
      if (loteGuardar.silosOrigen && loteGuardar.silosOrigen.length > 0) {
        const fechaIng = loteGuardar.fechaIngreso || new Date().toISOString().split('T')[0];
        for (const item of loteGuardar.silosOrigen) {
          const movId = `EGRESO-LOTE-${docId}-${item.siloId.replace(/\s+/g, '')}-${Date.now()}`;
          const movEgreso: MovimientoSilo = {
            id: movId,
            siloId: item.siloId,
            fecha: fechaIng,
            tipo: 'EGRESO_OP',
            kg: item.kgExtraidos,
            loteResultanteId: docId,
            ordenProcesoId: loteGuardar.ordenProcesoId,
            cliente: loteGuardar.cliente,
            especie: loteGuardar.especie,
            variedad: loteGuardar.variedad,
            categoria: loteGuardar.categoria
          };
          const movDocRef = doc(db, 'movimientos_silo', movId);
          batch.set(movDocRef, movEgreso);
        }
      }

      await batch.commit();
      showNotification(`Lote ${docId} guardado correctamente.`);
      setLoteAEditar(null);
      setActiveView('lotes');
    } catch (e) {
      console.error('Error al guardar lote en Firestore:', e);
      showNotification('Error al registrar el lote.');
    }
  };

  const handleUpdateLoteStock = async (
    loteId: string,
    nuevosMovimientos: MovimientoStock[],
    nuevoStockBolsas: number,
    nuevoStockKg: number,
    nuevoEstado: EstadoLoteType
  ) => {
    try {
      const ultimoMov = nuevosMovimientos[0];
      const loteAnterior = lotes.find(l => l.id === loteId);
      const previousStockKg = loteAnterior ? loteAnterior.stockKg : 0;
      
      const loteRef = doc(db, 'lotes', loteId);
      const movRef = doc(collection(db, 'lotes', loteId, 'movimientos'), ultimoMov.id);
      
      await runTransaction(db, async (transaction) => {
        const loteDoc = await transaction.get(loteRef);
        if (!loteDoc.exists()) throw new Error(`El lote ${loteId} no existe.`);
        
        const data = loteDoc.data();
        const currentAuditoria = data.auditoria || [];
        
        const nuevoEvento: AuditLogEntry = {
          id: `AUD-MOV-${Date.now()}`,
          fechaHora: new Date().toISOString(),
          tipo: 'Stock',
          usuario: currentUser.nombre,
          descripcion: `Ajuste manual de stock (${ultimoMov.tipo}): ${ultimoMov.cantidadBolsas} b. (${ultimoMov.cantidadKg} kg).`,
          detalles: ultimoMov.detalle
        };
        
        transaction.set(movRef, ultimoMov);
        transaction.update(loteRef, {
          stockBolsas: nuevoStockBolsas,
          stockKgTotal: nuevoStockKg,
          estado: nuevoEstado,
          auditoria: [nuevoEvento, ...currentAuditoria]
        });
      });

      // Email notification trigger if needed
      const updatedLoteObj = lotes.find(l => l.id === loteId);
      if (updatedLoteObj) {
        checkAndTriggerEmailAlert({ ...updatedLoteObj, stockKg: nuevoStockKg }, previousStockKg, nuevoStockKg);
      }

      showNotification('Stock recalculado y registrado en auditoría.');
    } catch (e) {
      console.error('Error al actualizar stock del lote:', e);
      showNotification('Error al actualizar el stock.');
    }
  };

  const handleDeleteLote = async (id: string) => {
    try {
      const docRef = doc(db, 'lotes', id);
      await deleteDoc(docRef);
      showNotification(`Lote ${id} eliminado del registro.`);
    } catch (e) {
      console.error(e);
      showNotification('Error al eliminar el lote.');
    }
  };

  const handleUpdateLoteLocation = async (loteId: string, ala: string, sector: string) => {
    try {
      const loteRef = doc(db, 'lotes', loteId);
      const loteAnterior = lotes.find(l => l.id === loteId);
      const currentAuditoria = loteAnterior?.auditoria || [];

      const auditEntry: AuditLogEntry = {
        id: `AUD-LOC-${Date.now()}`,
        fechaHora: new Date().toISOString(),
        tipo: 'Edición',
        usuario: currentUser?.nombre || 'Jefe de Planta',
        descripcion: `Ubicación actualizada: ALA ${ala} / SECTOR ${sector}.`,
        detalles: loteAnterior?.ala 
          ? `Ubicación anterior: ALA ${loteAnterior.ala} / SECTOR ${loteAnterior.sector}.`
          : 'Ubicación asignada por primera vez.'
      };

      await updateDoc(loteRef, {
        ala: ala,
        sector: sector,
        auditoria: [auditEntry, ...currentAuditoria]
      });

      showNotification(`Ubicación de Lote ${loteId} registrada en ALA ${ala} / SECTOR ${sector}.`);
    } catch (e) {
      console.error('Error al actualizar ubicación del lote:', e);
      showNotification('Error al actualizar la ubicación en el servidor.');
    }
  };

  const handleDeleteMultipleLotes = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      for (const id of ids) {
        const docRef = doc(db, 'lotes', id);
        batch.delete(docRef);
      }
      await batch.commit();
      showNotification(`${ids.length} lotes eliminados correctamente.`);
    } catch (e) {
      console.error('Error al eliminar múltiples lotes:', e);
      showNotification('Error al eliminar los lotes seleccionados.');
    }
  };

  const handleWipeStocks = async () => {
    try {
      const batch = writeBatch(db);

      for (const lote of lotes) {
        const docRef = doc(db, 'lotes', lote.id);
        batch.delete(docRef);
      }

      await batch.commit();
      showNotification('Todos los lotes y sus existencias de stock se han borrado con éxito del sistema.');
    } catch (e) {
      console.error('Error al vaciar y borrar los lotes:', e);
      showNotification('Error al borrar toda la información de los lotes.');
      throw e;
    }
  };

  // 6.b Operaciones de Ingreso a Silos y Cero
  const handleRegistrarIngresoSilo = async (movimiento: MovimientoSilo) => {
    try {
      const docRef = doc(db, 'movimientos_silo', movimiento.id);
      await setDoc(docRef, movimiento);
      showNotification(`Ingreso de ${movimiento.kg.toLocaleString('es-AR')} kg a ${movimiento.siloId} registrado correctamente.`);
    } catch (e) {
      console.error('Error al registrar ingreso a silo:', e);
      showNotification('Error al registrar el ingreso a silo.');
    }
  };

  const handlePonerSiloEnCero = async (siloId: SiloId, fecha: string, usuario: string, motivo: string, kgAnterior: number) => {
    try {
      const id = `ZERO-${siloId.replace(/\s+/g, '')}-${Date.now()}`;
      const movZero: MovimientoSilo = {
        id,
        siloId,
        fecha,
        tipo: 'AJUSTE_ZERO',
        kg: kgAnterior,
        motivoZero: motivo,
        usuarioZero: usuario
      };
      const docRef = doc(db, 'movimientos_silo', id);
      await setDoc(docRef, movZero);
      showNotification(`${siloId} puesto en 0 kg correctamente.`);
    } catch (e) {
      console.error('Error al poner silo en cero:', e);
      showNotification('Error al poner el silo en cero.');
    }
  };

  // 7. Operación de Despacho (Salidas)
  const handleSaveSalida = async (
    nuevaSalida: SalidaRegistrada,
    loteId: string,
    nuevosMovimientos: MovimientoStock[],
    nuevoStockBolsas: number,
    nuevoStockKg: number,
    nuevoEstado: EstadoLoteType
  ) => {
    try {
      // 1. Subir firma del chofer a Storage si es base64
      if (nuevaSalida.choferFirma && nuevaSalida.choferFirma.startsWith('data:')) {
        nuevaSalida.choferFirma = await uploadBase64ToStorage(`salidas/${nuevaSalida.id}/firma_chofer.png`, nuevaSalida.choferFirma);
      }

      // 2. Subir remito adjunto si existe y es base64
      if (nuevaSalida.remitoClienteAdjunto && nuevaSalida.remitoClienteAdjunto.data.startsWith('data:')) {
        const fileUrl = await uploadBase64ToStorage(
          `salidas/${nuevaSalida.id}/adjunto_${nuevaSalida.remitoClienteAdjunto.nombre}`,
          nuevaSalida.remitoClienteAdjunto.data
        );
        nuevaSalida.remitoClienteAdjunto = {
          ...nuevaSalida.remitoClienteAdjunto,
          data: fileUrl
        };
      }

      // 3. Escribir salida en Firestore
      await setDoc(doc(db, 'salidas', nuevaSalida.id), nuevaSalida);

      const loteAnterior = lotes.find(l => l.id === loteId);
      const previousStockKg = loteAnterior ? loteAnterior.stockKg : 0;

      // 4. Atomically record stock movement and update parent lote stock & auditoria
      const ultimoMov = nuevosMovimientos[0];
      const loteRef = doc(db, 'lotes', loteId);
      const movRef = doc(collection(db, 'lotes', loteId, 'movimientos'), ultimoMov.id);

      await runTransaction(db, async (transaction) => {
        const loteDoc = await transaction.get(loteRef);
        if (!loteDoc.exists()) throw new Error(`El lote ${loteId} no existe.`);
        
        const data = loteDoc.data();
        const currentAuditoria = data.auditoria || [];

        const nuevoEvento: AuditLogEntry = {
          id: `AUD-SAL-${Date.now()}`,
          fechaHora: new Date().toISOString(),
          tipo: 'Stock',
          usuario: currentUser.nombre,
          descripcion: `Despacho de stock registrado: -${ultimoMov.cantidadBolsas} b. (${ultimoMov.cantidadKg} kg).`,
          detalles: `Remito ${nuevaSalida.id}. Chofer: ${nuevaSalida.choferNombre} (DNI ${nuevaSalida.choferDni}), Patente: ${nuevaSalida.patenteCamion || 'N/A'}.`
        };

        transaction.set(movRef, ultimoMov);
        transaction.update(loteRef, {
          stockBolsas: nuevoStockBolsas,
          stockKgTotal: nuevoStockKg,
          estado: nuevoEstado,
          auditoria: [nuevoEvento, ...currentAuditoria]
        });
      });

      // Email alert if needed
      const updatedLoteObj = lotes.find(l => l.id === loteId);
      if (updatedLoteObj) {
        checkAndTriggerEmailAlert({ ...updatedLoteObj, stockKg: nuevoStockKg }, previousStockKg, nuevoStockKg);
      }

      showNotification(`Despacho REM-${nuevaSalida.id} aprobado y descontado.`);
    } catch (e) {
      console.error('Error al registrar despacho de salida:', e);
      showNotification('Error al registrar la salida de mercadería.');
    }
  };

  // 8. Operación de Importación Masiva por Excel
  const handleImportConfirm = async (nuevosLotes: Lote[], lotesActualizados: Lote[]) => {
    try {
      const batch = writeBatch(db);
      
      // Procesar nuevos lotes
      for (const lote of nuevosLotes) {
        const docId = getLoteDocId(lote.cliente, lote.loteNro);
        const docRef = doc(db, 'lotes', docId);

        const auditEntry: AuditLogEntry = {
          id: `AUD-CRE-${Date.now()}`,
          fechaHora: new Date().toISOString(),
          tipo: 'Creación',
          usuario: currentUser.nombre,
          descripcion: `Lote ${docId} registrado por importación Excel.`,
          detalles: `Stock inicial importado: ${lote.stockBolsas} bolsas.`
        };
        
        const loteToSave = {
          ...lote,
          id: docId,
          auditoria: [auditEntry]
        };

        batch.set(docRef, mapLoteToFirestore(loteToSave));

        if (lote.historial && lote.historial.length > 0) {
          for (const mov of lote.historial) {
            const movRef = doc(collection(db, 'lotes', docId, 'movimientos'), mov.id);
            batch.set(movRef, mov);
          }
        }
      }

      // Procesar actualizaciones
      for (const lote of lotesActualizados) {
        const docId = lote.id;
        const docRef = doc(db, 'lotes', docId);

        const auditEntry: AuditLogEntry = {
          id: `AUD-MOV-${Date.now()}`,
          fechaHora: new Date().toISOString(),
          tipo: 'Stock',
          usuario: currentUser.nombre,
          descripcion: `Stock actualizado por importación Excel. Nuevo stock: ${lote.stockBolsas} bolsas.`
        };

        const loteToSave = {
          ...lote,
          auditoria: [auditEntry, ...(lote.auditoria || [])]
        };

        batch.set(docRef, mapLoteToFirestore(loteToSave));

        if (lote.historial && lote.historial.length > 0) {
          for (const mov of lote.historial) {
            const movRef = doc(collection(db, 'lotes', docId, 'movimientos'), mov.id);
            batch.set(movRef, mov);
          }
        }
      }

      await batch.commit();
      setActiveView('lotes');
      showNotification(`Importación confirmada: ${nuevosLotes.length} nuevos creados y ${lotesActualizados.length} actualizados.`);
    } catch (e) {
      console.error('Error al confirmar importación masiva en Firestore:', e);
      showNotification('Error crítico al confirmar la importación.');
    }
  };

  // Router de Vistas
  const navigateTo = (view: typeof activeView) => {
    setActiveView(view);
    setLoteSeleccionado(null);
    setLoteAEditar(null);
    setPreselectedLoteId(undefined);
  };

  const handleScanSuccess = (loteId: string) => {
    setShowQrScanner(false);
    const found = lotes.find(l => l.id.toLowerCase() === loteId.toLowerCase());
    if (found) {
      setLoteSeleccionado(found);
      setActiveView('lotes');
      showNotification(`Lote ${found.id} detectado y abierto con éxito.`);
    } else {
      showNotification(`No se encontró el lote: ${loteId}`);
    }
  };

  // Si hay un lote público consultado por QR y no está logueado, mostramos una ficha pública elegante
  if (!isLoggedIn && publicLote) {
    return (
      <div className="min-h-screen bg-white flex flex-col relative overflow-x-hidden">
        {/* Marca de agua de fondo muy sutil */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none opacity-[0.06]">
          <LogoSiloSquare size={440} color="#00603C" />
        </div>
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 px-4 md:px-8 flex items-center justify-between z-40 shadow-sm">
          <HeaderBrand />
          <button
            onClick={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setPublicLote(null);
            }}
            className="text-xs font-bold text-[#00603C] hover:underline hover:text-[#254731] transition"
          >
            Ir al Portal de Operaciones
          </button>
        </header>
        <main className="flex-grow pt-24 pb-16 px-4 md:px-8 w-full max-w-2xl mx-auto relative z-10">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-6 md:p-8 relative">
            {/* Sello marca de agua */}
            <div className="absolute right-5 top-5 opacity-10 pointer-events-none">
              <LogoSiloLoose size={120} color="#00603C" />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
              <div>
                <span className="text-[10px] font-sans font-bold tracking-widest text-[#C9922E] uppercase">
                  CONSULTA DE TRAZABILIDAD
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] mt-1">
                  Ficha Técnica Digital
                </h2>
              </div>
              <div className="text-xs font-mono font-bold bg-[#E3EFE7] px-3.5 py-1.5 rounded-lg text-[#00603C] self-start sm:self-center">
                LOTE: {publicLote.id}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 bg-[#E3EFE7] bg-opacity-20 p-5 rounded-2xl border border-gray-100 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider">Cliente Comitente</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">{publicLote.cliente}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider">Grano / Especie</span>
                  <span className="text-sm font-bold text-[#00603C]">{publicLote.especie}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider">Variedad Sembrada</span>
                  <span className="text-sm font-bold text-gray-800">{publicLote.variedad}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider">Tratamiento Aplicado</span>
                  <span className="text-sm font-semibold text-gray-800">{publicLote.tratamiento.join(' + ')}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider">Químicos / Producto</span>
                  <span className="text-sm font-semibold text-gray-800">{publicLote.producto}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider">Fecha de Clasificación</span>
                  <span className="text-sm font-medium text-gray-800">
                    {new Date(publicLote.fechaIngreso).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 text-center border-y border-gray-100 py-6">
              <div className="border-r border-gray-100">
                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block">Existencias</span>
                <span className="font-serif text-2xl font-bold text-[#00603C] mt-1 block">
                  {publicLote.stockBolsas} <span className="text-xs font-sans font-medium text-gray-500">b.</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block">Peso Estimado</span>
                <span className="font-serif text-2xl font-bold text-[#C9922E] mt-1 block">
                  {publicLote.stockKg.toLocaleString('es-AR')} <span className="text-xs font-sans font-medium text-gray-500">kg</span>
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-gray-400 italic">
                Información certificada para control interno y logística. Agro Abacus S.A.
              </p>
            </div>
          </div>
        </main>
        <footer className="h-12 bg-gray-50 border-t border-gray-100 flex items-center justify-center text-center text-xs text-gray-400 font-sans tracking-widest uppercase mt-auto">
          AGRO ABACUS S.A. · ESTANCIA LA BARRANCOSA
        </footer>
      </div>
    );
  }

  // Si no está logueado, gate de entrada
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-x-hidden">
      {/* Marca de agua de fondo muy sutil */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none opacity-[0.06]">
        <LogoSiloSquare size={520} color="#00603C" />
      </div>
      
      {/* 1. HEADER FIJO (Logo + Nombre a la Izquierda, Isotipo Suelto a la Derecha) */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 px-4 md:px-8 flex items-center justify-between z-40 shadow-sm print:hidden">
        <div className="flex items-center gap-3 md:gap-4">
          <HeaderBrand />
          
          {/* Indicador de Conexión en Tiempo Real */}
          {isOnline && isFirebaseConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E3EFE7] border border-[#C2E0CC]/50 text-[#00603C] text-[10px] md:text-[11px] font-sans font-bold shadow-xs select-none transition-all duration-300" title="Conexión en tiempo real activa con Firestore">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E8B57] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00603C]"></span>
              </span>
              <span className="hidden sm:inline">CONECTADO</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF5F5] border border-[#FED7D7] text-red-600 text-[10px] md:text-[11px] font-sans font-bold shadow-xs select-none animate-pulse transition-all duration-300" title="Sin conexión a la base de datos. Los cambios locales se guardan offline y se sincronizarán al reconectar.">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              <span>DESCONECTADO</span>
            </div>
          )}
        </div>
        
        {/* Lado derecho del header: CampaniaSelector + Operario Activo + QR + Botón Cerrar Sesión */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Selector y Fijador de Campaña Activa */}
          <CampaniaSelector
            activeCampaniaId={activeCampaniaId}
            onSelectCampania={handleSelectCampania}
            isExplicitlyPinned={isExplicitlyPinned}
            onPinCampania={handlePinCampania}
            availableCampaniasIds={availableCampaniasIds}
          />

          {/* Operario Activo */}
          <div className="hidden sm:flex flex-col text-right mr-1 sm:mr-2 leading-tight border-r border-gray-100 pr-3">
            <span className="text-xs font-bold text-gray-800">{currentUser.nombre}</span>
            <span className="text-[9px] text-[#00603C] font-semibold uppercase tracking-wider">{currentUser.rol}</span>
          </div>

          <LogoSiloLoose size={36} color="#00603C" className="opacity-80 hidden lg:block" />
          
          <button
            onClick={() => setShowQrScanner(true)}
            className="flex items-center gap-1.5 text-[10px] font-sans font-bold tracking-wider bg-[#00603C] hover:bg-[#254731] text-white px-3.5 py-1.5 rounded-lg transition shadow-sm"
            title="Escanear Código QR con Cámara"
          >
            <QrCode className="w-3.5 h-3.5 text-[#C9922E]" />
            <span>ESCANEAR QR</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] font-sans font-bold tracking-wider text-[#A0522D] hover:bg-[#F5E5DC] px-3 py-1.5 rounded-lg border border-[#A0522D] border-opacity-20 transition"
            title="Cerrar Sesión del Operario"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">SALIR</span>
          </button>
        </div>
      </header>

      {/* 2. MENÚ DE NAVEGACIÓN TABULAR */}
      <nav className="fixed top-16 left-0 right-0 h-12 bg-[#00603C] border-b border-[#254731] px-4 md:px-8 flex items-center overflow-x-auto z-40 shadow-inner scrollbar-none print:hidden">
        <div className="flex gap-1 md:gap-2 w-full max-w-7xl mx-auto">
          
          {/* Tab Dashboard */}
          <button
            id="nav-tab-dashboard"
            onClick={() => navigateTo('dashboard')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-sans uppercase tracking-wider transition-all duration-300 ${
              activeView === 'dashboard'
                ? 'bg-[#F6EFDC] text-[#00603C] font-bold shadow-[0_0_14px_rgba(201,146,46,0.55)] ring-1.5 ring-[#C9922E]/60'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Control
          </button>

          {/* Tab Producción */}
          <button
            id="nav-tab-produccion"
            onClick={() => navigateTo('dashboard-produccion')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-sans uppercase tracking-wider transition-all duration-300 ${
              activeView === 'dashboard-produccion'
                ? 'bg-[#F6EFDC] text-[#00603C] font-bold shadow-[0_0_14px_rgba(201,146,46,0.55)] ring-1.5 ring-[#C9922E]/60'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Factory className="w-4 h-4" />
            Producción
          </button>

          {/* Tab Órdenes de Proceso */}
          <button
            id="nav-tab-ordenes-proceso"
            onClick={() => navigateTo('ordenes-proceso')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-sans uppercase tracking-wider transition-all duration-300 ${
              activeView === 'ordenes-proceso'
                ? 'bg-[#F6EFDC] text-[#00603C] font-bold shadow-[0_0_14px_rgba(201,146,46,0.55)] ring-1.5 ring-[#C9922E]/60'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Órdenes de Proceso
          </button>

          {/* Tab Ingreso a Silos */}
          <button
            id="nav-tab-ingreso-silos"
            onClick={() => navigateTo('ingreso-silos')}
            className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-sans uppercase tracking-wider transition-all duration-300 ${
              activeView === 'ingreso-silos'
                ? 'bg-[#F6EFDC] text-[#00603C] font-bold shadow-[0_0_14px_rgba(201,146,46,0.55)] ring-1.5 ring-[#C9922E]/60'
                : tieneAlertaSilo95
                ? 'text-white bg-red-900/50 border border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'text-white hover:bg-white/10'
            }`}
            title={
              tieneAlertaSilo95
                ? `¡ALERTA!: ${silosConAlerta95.join(', ')} al 95%+ de capacidad (>=171.000 kg)`
                : 'Ingreso a Silos'
            }
          >
            <Warehouse className={`w-4 h-4 ${tieneAlertaSilo95 ? 'text-red-400 animate-pulse' : 'text-[#C9922E]'}`} />
            <span>Ingreso a Silos</span>

            {tieneAlertaSilo95 && (
              <span className="flex items-center gap-1 ml-0.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="animate-pulse bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-red-300 shadow">
                  95%+
                </span>
              </span>
            )}

            {tieneAlertaSilo95 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[9px] font-extrabold text-white bg-red-600 shadow-md ring-2 ring-red-400 animate-bounce z-10"
                title={`Alerta: ${silosConAlerta95.length} silo(s) al 95%+ (171.000 kg): ${silosConAlerta95.join(', ')}`}
              >
                !
              </span>
            )}
          </button>

          {/* Tab Lotes */}
          <button
            id="nav-tab-lotes"
            role="tab"
            aria-selected={activeView === 'lotes' || Boolean(loteSeleccionado)}
            aria-current={(activeView === 'lotes' || loteSeleccionado) ? 'page' : undefined}
            aria-label={`Pestaña Lotes. Gestión de inventario y clasificación de semillas${criticalLotesCount > 0 ? `. Alerta: ${criticalLotesCount} lotes con stock crítico` : ''}`}
            onClick={handleLotesClick}
            className={`group relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-sans uppercase tracking-wider transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 active:opacity-85 active:z-20 active:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#C9922E] focus:ring-offset-2 focus:ring-offset-[#00603C] ${
              activeView === 'lotes' || loteSeleccionado
                ? 'bg-[#F6EFDC] text-[#00603C] shadow-md font-bold z-10'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {/* Inline keyframe style for custom ripple animation */}
            <style>{`
              @keyframes custom-ripple-effect {
                0% {
                  transform: translate(-50%, -50%) scale(0);
                  opacity: 0.5;
                }
                100% {
                  transform: translate(-50%, -50%) scale(4);
                  opacity: 0;
                }
              }
              .animate-custom-ripple {
                animation: custom-ripple-effect 600ms cubic-bezier(0, 0, 0.2, 1) forwards;
              }
            `}</style>
            
            {/* Ripple Container */}
            <span className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
              {lotesRipples.map((ripple) => (
                <span
                  key={ripple.id}
                  className="absolute bg-current opacity-30 rounded-full animate-custom-ripple pointer-events-none"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: '30px',
                    height: '30px',
                  }}
                />
              ))}
            </span>

            <Layers className={`w-4 h-4 transition-transform duration-300 ${isLotesSpinning ? 'animate-spin' : ''}`} />
            <span>Lotes</span>
            
            {/* Badge de Lotes Críticos */}
            {criticalLotesCount > 0 && (
              <span 
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm z-10"
                style={{ backgroundColor: '#A0522D' }}
                title={`${criticalLotesCount} lotes con stock crítico`}
              >
                {criticalLotesCount}
              </span>
            )}

            {(activeView === 'lotes' || loteSeleccionado) && (
              <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#00603C] rounded-full animate-in fade-in duration-200" />
            )}
            {/* Tooltip */}
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] normal-case tracking-normal text-white bg-gray-900 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Gestionar inventario de lotes
            </span>
          </button>

          {/* Tab Despachos */}
          <button
            id="nav-tab-despachos"
            onClick={() => navigateTo('despachos')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-sans uppercase tracking-wider transition ${
              activeView === 'despachos'
                ? 'bg-[#F6EFDC] text-[#00603C] shadow-sm font-bold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Despachos
          </button>

          {/* Tab Historial Salidas */}
          <button
            id="nav-tab-historial-salidas"
            onClick={() => navigateTo('salidas-registradas')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-sans uppercase tracking-wider transition ${
              activeView === 'salidas-registradas'
                ? 'bg-[#F6EFDC] text-[#00603C] shadow-sm font-bold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <History className="w-4 h-4" />
            Historial Salidas
          </button>

          {/* Tab Importar */}
          <button
            id="nav-tab-importar"
            onClick={() => navigateTo('importar')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold font-sans uppercase tracking-wider transition ${
              activeView === 'importar'
                ? 'bg-[#F6EFDC] text-[#00603C] shadow-sm font-bold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importar Stock</span>
            <kbd className="hidden lg:inline-block ml-1 px-1 py-0.5 text-[9px] font-mono font-normal opacity-60 bg-white/10 rounded border border-white/5">Ctrl+I</kbd>
          </button>

        </div>
      </nav>

      {/* 3. BANNER DE NOTIFICACIONES GLOBAL */}
      {notificacion && (
        <div className="fixed top-30 right-4 md:right-8 bg-white border-l-4 border-[#00603C] p-4 rounded-r-xl shadow-xl z-50 animate-in slide-in-from-right duration-300 max-w-sm border border-gray-100 flex items-start gap-3 print:hidden">
          <CheckCircle className="w-5 h-5 text-[#00603C] shrink-0 mt-0.5" />
          <div>
            <span className="font-sans font-bold text-xs text-[#1A1A1A] uppercase tracking-wider block">Sistema de Planta</span>
            <span className="text-xs text-gray-600 block mt-0.5">{notificacion}</span>
          </div>
        </div>
      )}

      {/* 4. ÁREA DE CONTENIDO */}
      <main className="flex-grow pt-32 pb-16 px-4 md:px-8 w-full max-w-7xl mx-auto relative z-10 print:pt-4 print:pb-4">
        
        {/* RUTA DE COMPONENTES SEGÚN VISTA ACTIVA */}
        {loteSeleccionado ? (
          <LoteDetail
            lote={loteSeleccionado}
            onBack={() => setLoteSeleccionado(null)}
            onUpdateLoteStock={handleUpdateLoteStock}
            onRegistrarSalida={(id) => {
              setPreselectedLoteId(id);
              setLoteSeleccionado(null);
              setActiveView('registrar-salida');
            }}
            onUpdateLoteLocation={handleUpdateLoteLocation}
          />
        ) : activeView === 'dashboard' ? (
          <Dashboard
            lotes={filteredLotesByCampania}
            salidas={filteredSalidasByCampania}
            especies={especies}
            thresholds={stockThresholds}
            alertEmail={alertEmail}
            activeCampaniaId={activeCampaniaId}
            allLotes={lotes}
            onUpdateThresholds={handleSaveThresholds}
            onSelectLote={(l) => setLoteSeleccionado(l)}
            onNavigate={(view) => {
              if (view === 'lotes') navigateTo('lotes');
              else if (view === 'alta-lote') navigateTo('alta-lote');
              else if (view === 'importar') navigateTo('importar');
              else if (view === 'registrar-salida') navigateTo('registrar-salida');
              else if (view === 'salidas-registradas') navigateTo('salidas-registradas');
            }}
          />
        ) : activeView === 'dashboard-produccion' ? (
          <DashboardProduccion
            lotes={filteredLotesByCampania}
            ordenesProceso={filteredOrdenesProcesoByCampania}
            onSelectLote={(l) => setLoteSeleccionado(l)}
          />
        ) : activeView === 'ordenes-proceso' ? (
          <OrdenesProcesoView
            ordenes={filteredOrdenesProcesoByCampania}
            lotes={filteredLotesByCampania}
            activeCampaniaId={activeCampaniaId}
            siloStocks={siloStocks}
            movimientosSilo={movimientosSilo}
            onSaveOrden={handleSaveOrdenProceso}
            onDeleteOrden={handleDeleteOrdenProceso}
            onUpdateEstadoOrden={handleUpdateEstadoOrdenProceso}
            onSelectLote={(l) => setLoteSeleccionado(l)}
            onNavigateToAltaLote={() => navigateTo('alta-lote')}
          />
        ) : activeView === 'ingreso-silos' ? (
          <IngresoSilosView
            movimientosSilo={movimientosSilo}
            siloStocks={siloStocks}
            clientes={clientes}
            especies={especies}
            currentUser={currentUser}
            onRegistrarIngreso={handleRegistrarIngresoSilo}
            onPonerSiloEnCero={handlePonerSiloEnCero}
          />
        ) : activeView === 'lotes' ? (
          loteAEditar ? (
            <LoteForm
              existingLotes={lotes}
              ordenesProceso={ordenesProcesoConHechos}
              clientes={clientes}
              especies={especies}
              loteAEditar={loteAEditar}
              activeCampaniaId={activeCampaniaId}
              siloStocks={siloStocks}
              onSave={handleSaveLote}
              onCancel={() => setLoteAEditar(null)}
              onCreateOrdenProcesoClick={() => navigateTo('ordenes-proceso')}
            />
          ) : (
            <LotesView
              lotes={filteredLotesByCampania}
              onSelectLote={(l) => setLoteSeleccionado(l)}
              onEditLote={(l) => setLoteAEditar(l)}
              onAddLote={() => navigateTo('alta-lote')}
              onRegistrarSalidaLote={(l) => {
                setPreselectedLoteId(l.id);
                setActiveView('registrar-salida');
              }}
              onDeleteLote={handleDeleteLote}
              onDeleteMultipleLotes={handleDeleteMultipleLotes}
              currentUser={currentUser}
              onWipeStocks={handleWipeStocks}
            />
          )
        ) : activeView === 'alta-lote' ? (
          <LoteForm
            existingLotes={lotes}
            ordenesProceso={ordenesProcesoConHechos}
            clientes={clientes}
            especies={especies}
            loteAEditar={null}
            activeCampaniaId={activeCampaniaId}
            siloStocks={siloStocks}
            onSave={handleSaveLote}
            onCancel={() => navigateTo('lotes')}
            onCreateOrdenProcesoClick={() => navigateTo('ordenes-proceso')}
          />
        ) : activeView === 'importar' ? (
          <ImportarStock
            existingLotes={lotes}
            onImportConfirm={handleImportConfirm}
            onCancel={() => navigateTo('dashboard')}
          />
        ) : activeView === 'registrar-salida' ? (
          <RegistrarSalida
            lotes={lotes}
            clientes={clientes}
            preselectedLoteId={preselectedLoteId}
            onSaveSalida={handleSaveSalida}
            onCancel={() => navigateTo('dashboard')}
          />
        ) : activeView === 'despachos' ? (
          <DespachosSection
            lotes={filteredLotesByCampania}
            ordenes={filteredOrdenesByCampania}
            onSaveOrden={handleSaveOrden}
            onUpdateOrdenStatus={handleUpdateOrdenStatus}
            onDespacharStock={handleDespacharStock}
            onDeleteOrden={handleDeleteOrden}
          />
        ) : activeView === 'salidas-registradas' ? (
          <SalidasList
            salidas={filteredSalidasByCampania}
            lotes={filteredLotesByCampania}
          />
        ) : null}

      </main>

      {/* 5. FOOTER CON IDENTIDAD EXACTA */}
      <footer className="h-12 bg-gray-50 border-t border-gray-100 flex items-center justify-center text-center text-xs text-gray-400 font-sans tracking-widest uppercase mt-auto print:hidden">
        AGRO ABACUS S.A. · ESTANCIA LA BARRANCOSA
      </footer>

      {/* 6. MODAL ESCÁNER DE QR */}
      {showQrScanner && (
        <QrCodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowQrScanner(false)}
        />
      )}

    </div>
  );
}
