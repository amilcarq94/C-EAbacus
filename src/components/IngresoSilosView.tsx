/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { SiloId, MovimientoSilo, EspecieType, CategoriaType, CAPACIDAD_MAX_SILO, UMBRAL_ALERTA_SILO, Chofer, MotivoSalidaManual } from '../types';
import { SILOS_DISPONIBLES } from './SilosSelector';
import { ChoferSearchSelector } from './ChoferSearchSelector';
import { Warehouse, Plus, RotateCcw, History, FileText, Calendar, ArrowUpRight, ArrowDownRight, AlertTriangle, User, CheckCircle2, Search, Filter, ShieldAlert, MapPin, Droplets, Eye, Download, Printer, X, FileSpreadsheet, Lock, KeyRound, ShieldCheck, BarChart3, Trash2, QrCode, Truck, Upload } from 'lucide-react';
import { verifyAutorizadorPassword } from '../utils/despachantes';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  LabelList
} from 'recharts';

// Componente para Tooltip Personalizado del Gráfico Recharts de Silos
const CustomTooltipSilosChart = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 text-white text-xs p-3.5 rounded-xl shadow-xl space-y-2.5 min-w-[210px] z-50">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <div className="flex items-center gap-1.5">
            <Warehouse className="w-4 h-4 text-emerald-400" />
            <span className="font-serif font-black text-white text-sm">{data.siloId}</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold border ${
            data.porcentaje >= 100
              ? 'bg-red-950/80 text-red-300 border-red-700'
              : data.porcentaje >= 83.3
              ? 'bg-amber-950/80 text-amber-300 border-amber-700'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
          }`}>
            {data.porcentaje}% Lleno
          </span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Stock Acumulado:</span>
            <strong className="font-mono text-emerald-300 font-bold">
              {data.stockTn} Tn ({data.stockKg.toLocaleString('es-AR')} kg)
            </strong>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Capacidad Máxima:</span>
            <span className="font-mono text-slate-200 font-semibold">{data.capacidadTn} Tn</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Espacio Disponible:</span>
            <span className="font-mono text-blue-300 font-bold">{data.disponibleTn} Tn</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 text-[11px] space-y-0.5">
          <div className="text-slate-400">
            Contenido: <strong className="text-slate-100">{data.especie}</strong> ({data.variedad})
          </div>
          {data.cliente && data.cliente !== 'Sin asignación' && (
            <div className="text-slate-400">
              Cliente: <strong className="text-slate-200">{data.cliente}</strong>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

interface IngresoSilosViewProps {
  movimientosSilo: MovimientoSilo[];
  siloStocks?: Record<string, number>;
  clientes: string[];
  especies: string[];
  currentUser: { nombre: string; rol: string };
  choferes?: Chofer[];
  onRegistrarIngreso: (movimiento: MovimientoSilo) => void;
  onRegistrarSalidaManual?: (movimiento: MovimientoSilo) => void;
  onSaveChofer?: (chofer: Chofer) => void;
  onImportChoferes?: (choferes: Chofer[]) => void;
  onPonerEnCero?: (siloId: SiloId, fecha: string, usuario: string, motivo: string, kgAnterior: number) => void;
  onPonerSiloEnCero?: (siloId: SiloId, fecha: string, usuario: string, motivo: string, kgAnterior: number) => void;
  onEliminarMovimientoSilo?: (movimientoId: string, siloId: SiloId) => void;
}

export const IngresoSilosView: React.FC<IngresoSilosViewProps> = ({
  movimientosSilo,
  clientes,
  especies,
  currentUser,
  choferes = [],
  onRegistrarIngreso,
  onRegistrarSalidaManual,
  onSaveChofer,
  onImportChoferes,
  onPonerEnCero,
  onPonerSiloEnCero,
  onEliminarMovimientoSilo,
}) => {
  // Silo activo seleccionado (Silo 1 a Silo 6)
  const [activeSilo, setActiveSilo] = useState<SiloId>('Silo 1');

  // Estado del Formulario de Ingreso
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [cliente, setCliente] = useState(clientes[0] || 'San Diego Semilla');
  const [clienteManual, setClienteManual] = useState('');
  const [especie, setEspecie] = useState<string>('Soja');
  const [variedad, setVariedad] = useState('P46A03');
  const [categoria, setCategoria] = useState<string>('FUNDADORA');
  
  // Campo Origen (por defecto "La Barrancosa", más opción "Otro")
  const [campoOrigenSelect, setCampoOrigenSelect] = useState('La Barrancosa');
  const [campoOrigenManual, setCampoOrigenManual] = useState('');

  const [bolsonOrigenNro, setBolsonOrigenNro] = useState('');
  const [bolsonOrigenSector, setBolsonOrigenSector] = useState('');
  const [totalKgIngresados, setTotalKgIngresados] = useState<number | ''>('');
  const [depositoOrigen, setDepositoOrigen] = useState('Depósito Central');
  const [humedad, setHumedad] = useState<number | ''>(13.5);

  // Estados de datos de chofer en Ingreso
  const [selectedChoferId, setSelectedChoferId] = useState('');
  const [choferNombre, setChoferNombre] = useState('');
  const [choferCuit, setChoferCuit] = useState('');
  const [choferPatentes, setChoferPatentes] = useState('');
  const [choferTransporte, setChoferTransporte] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [exportNoticeMsg, setExportNoticeMsg] = useState('');

  // Estado para el Modal de Ficha Técnica de Silo
  const [fichaModalSilo, setFichaModalSilo] = useState<SiloId | null>(null);
  const [fichaModalMode, setFichaModalMode] = useState<'digital' | 'impresion'>('digital');

  const openFichaModal = (siloId: SiloId, mode: 'digital' | 'impresion' = 'digital') => {
    setFichaModalSilo(siloId);
    setFichaModalMode(mode);
  };

  // Estado para el Modal de Salidas Manuales de Silo
  const [showModalSalidaManual, setShowModalSalidaManual] = useState(false);
  const [siloSalidaManual, setSiloSalidaManual] = useState<SiloId>('Silo 1');
  const [fechaSalidaManual, setFechaSalidaManual] = useState(() => new Date().toISOString().split('T')[0]);
  const [kgSalidaManual, setKgSalidaManual] = useState<number | ''>('');
  const [motivoSalidaManual, setMotivoSalidaManual] = useState<MotivoSalidaManual>('Consumo a granel');
  const [descontaminacionVarietal, setDescontaminacionVarietal] = useState(false);
  const [observacionesSalidaManual, setObservacionesSalidaManual] = useState('');
  const [errorSalidaManual, setErrorSalidaManual] = useState('');

  const openModalSalidaManual = (siloId?: SiloId) => {
    const selectedSilo = siloId || activeSilo;
    setSiloSalidaManual(selectedSilo);
    setActiveSilo(selectedSilo);
    setFechaSalidaManual(new Date().toISOString().split('T')[0]);
    setKgSalidaManual('');
    setMotivoSalidaManual('Consumo a granel');
    setDescontaminacionVarietal(false);
    setObservacionesSalidaManual('');
    setErrorSalidaManual('');
    setShowModalSalidaManual(true);
  };

  // Modal para importar Choferes desde Excel
  const [showModalImportChoferes, setShowModalImportChoferes] = useState(false);
  const [importNoticeChoferes, setImportNoticeChoferes] = useState('');

  // Exportar Excel Completo de Movimientos de Silo
  const handleExportMovimientosExcel = () => {
    const dataToExport = (movimientosSilo || []).map((m) => {
      return {
        'Silo': m.siloId,
        'Fecha': m.fecha,
        'Cliente': m.cliente || '-',
        'Especie': m.especie || '-',
        'Variedad': m.variedad || '-',
        'Kilos': m.kg,
        'Origen': m.campoOrigen || m.depositoOrigen || '-',
        'Sector': m.bolsonOrigenSector || m.sector || '-',
        'Humedad': m.humedad !== undefined ? `${m.humedad}%` : '-',
        'Chofer': m.chofer || '-',
        'CUIT': m.cuit || '-',
        'Patentes': m.patentes || '-',
        'Transporte': m.transporte || '-',
        'Tipo Movimiento': m.tipo === 'INGRESO' ? 'Ingreso' : m.tipo === 'EGRESO_MANUAL' ? `Salida Manual (${m.motivoManual || 'Manual'})` : m.tipo === 'EGRESO_LOTE' ? `Salida por Lote (${m.loteNro || ''})` : 'Egreso',
        'Descontaminación Varietal': m.descontaminacionVarietal ? 'Sí' : 'No',
        'Observaciones': m.observaciones || m.motivoZero || m.motivoAjuste || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ingresos_y_Egresos');
    XLSX.writeFile(workbook, `Ingresos_y_Egresos_Silos_${new Date().toISOString().split('T')[0]}.xlsx`);

    setExportNoticeMsg('¡Reporte completo de Ingresos y Egresos de Silos exportado a Excel!');
    setTimeout(() => setExportNoticeMsg(''), 4000);
  };

  // Estado para el Panel Lateral (Drawer) de Historial de Movimientos del Silo
  const [drawerSilo, setDrawerSilo] = useState<SiloId | null>(null);
  const [drawerFilterTipo, setDrawerFilterTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO_OP' | 'AJUSTE_ZERO'>('TODOS');
  const [drawerSearch, setDrawerSearch] = useState('');

  // Estado para el Modal de Eliminación de Movimientos (requiere Amilcar Quiroz)
  const [movimientoAEliminar, setMovimientoAEliminar] = useState<MovimientoSilo | null>(null);
  const [usuarioEliminar, setUsuarioEliminar] = useState('Amilcar Quiroz');
  const [claveEliminar, setClaveEliminar] = useState('');
  const [errorEliminar, setErrorEliminar] = useState('');

  const handleConfirmEliminarMovimiento = () => {
    setErrorEliminar('');
    if (!claveEliminar.trim()) {
      setErrorEliminar('Debe ingresar la clave de autorización.');
      return;
    }
    const isAuth = verifyAutorizadorPassword(usuarioEliminar, claveEliminar);
    if (!isAuth) {
      setErrorEliminar('Clave incorrecta o usuario no autorizado para eliminar movimientos.');
      return;
    }
    if (movimientoAEliminar) {
      if (onEliminarMovimientoSilo) {
        onEliminarMovimientoSilo(movimientoAEliminar.id, movimientoAEliminar.siloId);
      }
      setFormSuccess(`Movimiento de ${movimientoAEliminar.siloId} (${movimientoAEliminar.tipo}) eliminado con éxito.`);
      setMovimientoAEliminar(null);
      setClaveEliminar('');
    }
  };

  // Estado para el tipo de métrica del Gráfico de Ocupación de Silos
  const [chartMetric, setChartMetric] = useState<'PORCENTAJE' | 'TONELADAS'>('PORCENTAJE');

  const openSiloDrawer = (siloId: SiloId) => {
    setActiveSilo(siloId);
    setDrawerSilo(siloId);
    setDrawerFilterTipo('TODOS');
    setDrawerSearch('');
  };

  // Obtener el último evento de "Stock en Cero" para un silo si existe
  const getUltimoAjusteCero = (siloId: SiloId): MovimientoSilo | null => {
    const movsAsc = (movimientosSilo || [])
      .filter((m) => m.siloId === siloId)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.id || '').localeCompare(b.id || ''));

    for (let i = movsAsc.length - 1; i >= 0; i--) {
      if (movsAsc[i].tipo === 'AJUSTE_ZERO') {
        return movsAsc[i];
      }
    }
    return null;
  };

  // Calcular Stock actual para cada silo (Neto: Ingresos − Egresos desde el último evento "Stock en Cero")
  const getStockSilo = (siloId: SiloId): number => {
    const movsAsc = (movimientosSilo || [])
      .filter((m) => m.siloId === siloId)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.id || '').localeCompare(b.id || ''));

    let lastZeroIndex = -1;
    for (let i = movsAsc.length - 1; i >= 0; i--) {
      if (movsAsc[i].tipo === 'AJUSTE_ZERO') {
        lastZeroIndex = i;
        break;
      }
    }

    const movsDesdeZero = lastZeroIndex >= 0 ? movsAsc.slice(lastZeroIndex + 1) : movsAsc;

    let stock = 0;
    movsDesdeZero.forEach((m) => {
      if (m.tipo === 'INGRESO') {
        stock += m.kg;
      } else if (m.tipo === 'EGRESO_OP' || (m.tipo as string).startsWith('EGRESO')) {
        stock = Math.max(0, stock - m.kg);
      }
    });

    return stock;
  };

  // Calcular Resumen de Ficha para un Silo determinado (SOLO DATOS DEL STOCK ACTUAL, NO HISTÓRICO)
  const getSiloFichaData = (siloId: SiloId) => {
    const stockKg = getStockSilo(siloId);
    const stockTn = (stockKg / 1000).toFixed(1);
    const pctOcupacion = ((stockKg / CAPACIDAD_MAX_SILO) * 100).toFixed(1);

    const movsAsc = movimientosSilo
      .filter((m) => m.siloId === siloId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Identificar movimientos correspondientes al LOTE DE STOCK ACTUAL (posterior al último punto de saldo cero)
    let currentBalance = 0;
    let lastZeroIndex = -1;
    movsAsc.forEach((m, idx) => {
      if (m.tipo === 'INGRESO') {
        currentBalance += m.kg;
      } else if (m.tipo === 'EGRESO_OP') {
        currentBalance = Math.max(0, currentBalance - m.kg);
      } else if (m.tipo === 'AJUSTE_ZERO') {
        currentBalance = 0;
      }
      if (currentBalance === 0) {
        lastZeroIndex = idx;
      }
    });

    const movsBatchActual = movsAsc.slice(lastZeroIndex + 1);
    const ingresosBatchActual = movsBatchActual.filter((m) => m.tipo === 'INGRESO');

    if (stockKg === 0 || ingresosBatchActual.length === 0) {
      return {
        siloId,
        stockKg: 0,
        stockTn: '0.0',
        pctOcupacion: '0.0',
        especie: 'Sin Cereal / Vacío',
        cliente: 'Sin asignación',
        variedad: '-',
        categoria: '-',
        humedad: '0.0',
        ingresosActivos: [],
        totalIngresos: 0,
        ultimoMovimiento: movsAsc[movsAsc.length - 1]?.fecha || 'Sin registros',
      };
    }

    const especiesSet = Array.from(new Set(ingresosBatchActual.map((i) => i.especie).filter(Boolean)));
    const clientesSet = Array.from(new Set(ingresosBatchActual.map((i) => i.cliente).filter(Boolean)));
    const variedadesSet = Array.from(new Set(ingresosBatchActual.map((i) => i.variedad).filter(Boolean)));
    const categoriasSet = Array.from(new Set(ingresosBatchActual.map((i) => i.categoria).filter(Boolean)));

    const especie = especiesSet.length > 0 ? especiesSet.join(', ') : 'Sin Cereal / Vacío';
    const cliente = clientesSet.length > 0 ? clientesSet.join(', ') : 'Sin Asignar';
    const variedad = variedadesSet.length > 0 ? variedadesSet.join(', ') : '-';
    const categoria = categoriasSet.length > 0 ? categoriasSet.join(', ') : '-';

    let totalKgConHumedad = 0;
    let sumaHumedadPonderada = 0;
    ingresosBatchActual.forEach((ing) => {
      if (ing.humedad !== undefined && ing.humedad > 0) {
        totalKgConHumedad += ing.kg;
        sumaHumedadPonderada += ing.kg * ing.humedad;
      }
    });

    const ultIngresoBatch = ingresosBatchActual[ingresosBatchActual.length - 1];
    const humedadPromedio = totalKgConHumedad > 0 
      ? (sumaHumedadPonderada / totalKgConHumedad).toFixed(1)
      : ultIngresoBatch?.humedad !== undefined 
      ? ultIngresoBatch.humedad.toFixed(1) 
      : '13.5';

    const ingresosActivos = [...ingresosBatchActual].reverse();

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
      ultimoMovimiento: movsAsc[movsAsc.length - 1]?.fecha || 'Sin registros',
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

  // Función para imprimir únicamente la Etiqueta QR del Silo
  const handlePrintSiloQrLabel = (fichaData: ReturnType<typeof getSiloFichaData>) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrData = encodeURIComponent(
      `AGROABACUS - SILO: ${fichaData.siloId}\nCLIENTE: ${fichaData.cliente}\nESPECIE: ${fichaData.especie}\nVARIEDAD: ${fichaData.variedad}\nSTOCK: ${fichaData.stockKg} KG\nHUMEDAD: ${fichaData.humedad}%\nFECHA: ${fichaData.ultimoMovimiento}`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrData}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta QR - ${fichaData.siloId}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; text-align: center; color: #0f172a; background: #fff; }
            .card { border: 4px solid #00603C; border-radius: 20px; padding: 24px; max-width: 520px; margin: 0 auto; box-shadow: none; background: #fff; }
            .header { font-size: 11px; font-weight: 800; color: #00603C; text-transform: uppercase; letter-spacing: 1.5px; }
            .title { font-size: 32px; font-weight: 900; margin: 6px 0; color: #0f172a; font-family: serif; }
            .qr-container { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 12px; display: inline-block; margin: 12px 0; }
            .qr-img { width: 220px; height: 220px; display: block; margin: 0 auto; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; text-align: left; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin-top: 8px; }
            .info-item { font-weight: 800; color: #0f172a; }
            .info-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 2px; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">AGROABACUS · PLANTA DE ACOPIO Y CLASIFICACIÓN</div>
            <div class="title">CÓDIGO QR · ${fichaData.siloId}</div>
            <div class="qr-container">
              <img class="qr-img" src="${qrUrl}" alt="QR ${fichaData.siloId}" />
            </div>
            <div class="info-grid">
              <div><span class="info-label">Silo</span><span class="info-item">${fichaData.siloId}</span></div>
              <div><span class="info-label">Stock Actual</span><span class="info-item">${fichaData.stockKg.toLocaleString('es-AR')} kg</span></div>
              <div><span class="info-label">Cliente</span><span class="info-item">${fichaData.cliente}</span></div>
              <div><span class="info-label">Especie / Variedad</span><span class="info-item">${fichaData.especie} (${fichaData.variedad})</span></div>
              <div><span class="info-label">Humedad de Ingreso</span><span class="info-item">${fichaData.humedad}%</span></div>
              <div><span class="info-label">Fecha Emisión</span><span class="info-item">${new Date().toLocaleDateString('es-AR')}</span></div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Datos procesados para el Gráfico de Barras Recharts de Ocupación por Silo
  const chartSilosData = SILOS_DISPONIBLES.map((siloId) => {
    const stock = getStockSilo(siloId);
    const stockTn = Number((stock / 1000).toFixed(1));
    const porcentaje = Number(((stock / CAPACIDAD_MAX_SILO) * 100).toFixed(1));
    const ficha = getSiloFichaData(siloId);
    const capacidadTn = CAPACIDAD_MAX_SILO / 1000;
    const disponibleTn = Number(((CAPACIDAD_MAX_SILO - stock) / 1000).toFixed(1));

    let color = '#10b981'; // emerald-500 (Operativo)
    if (stock >= CAPACIDAD_MAX_SILO) {
      color = '#ef4444'; // red-600 (Lleno)
    } else if (stock >= UMBRAL_ALERTA_SILO) {
      color = '#f59e0b'; // amber-500 (Alerta)
    } else if (stock === 0) {
      color = '#94a3b8'; // slate-400 (Vacío)
    }

    return {
      siloId,
      siloNombre: siloId,
      stockKg: stock,
      stockTn,
      porcentaje,
      capacidadTn,
      disponibleTn,
      especie: ficha.especie,
      variedad: ficha.variedad,
      cliente: ficha.cliente,
      color,
    };
  });

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
      chofer: choferNombre.trim(),
      cuit: choferCuit.trim(),
      patentes: choferPatentes.trim(),
      transporte: choferTransporte.trim(),
    };

    if (choferNombre.trim() && onSaveChofer) {
      onSaveChofer({
        id: `CHOFER-${choferNombre.trim().toLowerCase().replace(/\s+/g, '-')}`,
        nombre: choferNombre.trim(),
        cuit: choferCuit.trim(),
        patente: choferPatentes.trim(),
        patentes: choferPatentes.trim(),
        transporte: choferTransporte.trim(),
      });
    }

    onRegistrarIngreso(nuevoIngreso);
    setFormSuccess(`¡Ingreso registrado exitosamente en ${activeSilo}! (${kgNuevos.toLocaleString('es-AR')} kg - ${humedad}% Humedad)`);

    // Resetear form parcial
    setTotalKgIngresados('');
    setBolsonOrigenNro('');
    setSelectedChoferId('');
    setChoferNombre('');
    setChoferCuit('');
    setChoferPatentes('');
    setChoferTransporte('');
    setTimeout(() => setFormSuccess(''), 4000);
  };

  // Manejador para Salidas Manuales de Silo
  const handleSubmitSalidaManual = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorSalidaManual('');

    if (!kgSalidaManual || Number(kgSalidaManual) <= 0) {
      setErrorSalidaManual('Debe ingresar una cantidad válida de kilos.');
      return;
    }

    const currentStock = getStockSilo(siloSalidaManual);
    if (Number(kgSalidaManual) > currentStock) {
      setErrorSalidaManual(`El monto a extraer (${Number(kgSalidaManual).toLocaleString('es-AR')} kg) supera el stock actual disponible en ${siloSalidaManual} (${currentStock.toLocaleString('es-AR')} kg).`);
      return;
    }

    const idMov = `SALIDA-MANUAL-${siloSalidaManual.replace(/\s+/g, '')}-${Date.now()}`;
    const movSalida: MovimientoSilo = {
      id: idMov,
      siloId: siloSalidaManual,
      fecha: fechaSalidaManual,
      tipo: 'EGRESO_MANUAL',
      kg: Number(kgSalidaManual),
      motivoManual: motivoSalidaManual,
      descontaminacionVarietal: descontaminacionVarietal,
      observaciones: observacionesSalidaManual.trim(),
      usuario: currentUser.nombre,
    };

    if (onRegistrarSalidaManual) {
      onRegistrarSalidaManual(movSalida);
    } else {
      onRegistrarIngreso(movSalida);
    }

    setShowModalSalidaManual(false);
    setExportNoticeMsg(`Salida manual de ${Number(kgSalidaManual).toLocaleString('es-AR')} kg en ${siloSalidaManual} registrada correctamente.`);
    setTimeout(() => setExportNoticeMsg(''), 4000);
  };

  // Carga e Importación masiva de Choferes desde Excel
  const handleFileUploadChoferes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const choferesImportados: Chofer[] = data.map((row: any, idx: number) => {
          const nombre = row['Chofer'] || row['Nombre'] || row['CHOFER'] || row['NOMBRE'] || `Chofer ${idx + 1}`;
          const cuit = row['CUIT'] || row['Cuit'] || row['cuit'] || '';
          const patentes = row['Patentes'] || row['Patente'] || row['PATENTE'] || row['PATENTES'] || '';
          const transporte = row['Transporte'] || row['Empresa'] || row['TRANSPORTE'] || '';

          return {
            id: `CHOFER-IMP-${Date.now()}-${idx}`,
            nombre: String(nombre).trim(),
            cuit: String(cuit).trim(),
            patente: String(patentes).trim(),
            patentes: String(patentes).trim(),
            transporte: String(transporte).trim(),
          };
        }).filter(ch => ch.nombre);

        if (choferesImportados.length > 0 && onImportChoferes) {
          onImportChoferes(choferesImportados);
          setImportNoticeChoferes(`¡Se importaron ${choferesImportados.length} choferes desde Excel correctamente!`);
          setTimeout(() => setImportNoticeChoferes(''), 4000);
        }
      } catch (err) {
        console.error('Error al procesar archivo de choferes:', err);
      }
    };
    reader.readAsBinaryString(file);
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

      {/* GRÁFICO DE BARRAS DE CAPACIDAD Y % DE LLENADO DE SILOS (RECHARTS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 font-serif flex items-center gap-2">
                Porcentaje de Llenado y Ocupación por Silo
              </h3>
              <p className="text-xs text-slate-500">
                Comparativa visual de stock actual frente a la capacidad máxima de {CAPACIDAD_MAX_SILO / 1000} Tn por silo
              </p>
            </div>
          </div>

          {/* Selector de Métrica del Gráfico */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartMetric('PORCENTAJE')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMetric === 'PORCENTAJE'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              % Llenado
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('TONELADAS')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMetric === 'TONELADAS'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stock (Tn)
            </button>
          </div>
        </div>

        {/* Leyenda e Indicadores de Umbral */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1 pt-1">
          <div className="flex items-center gap-4 flex-wrap text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
              Operativo (&lt;83.3%)
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-3 h-3 rounded-md bg-amber-500 inline-block"></span>
              Alerta (&ge;150 Tn / 83.3%)
            </span>
            <span className="flex items-center gap-1.5 text-red-700">
              <span className="w-3 h-3 rounded-md bg-red-600 inline-block"></span>
              Crítico / Lleno (&ge;180 Tn / 100%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-3 rounded-md bg-slate-400 inline-block"></span>
              Vacío (0 Tn)
            </span>
          </div>

          <span className="text-[11px] text-slate-400 italic">
            Haga clic en una barra para abrir y gestionar el silo
          </span>
        </div>

        {/* Recharts BarChart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartSilosData}
              margin={{ top: 22, right: 20, left: -10, bottom: 5 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length) {
                  const siloClicked = state.activePayload[0].payload.siloId as SiloId;
                  openSiloDrawer(siloClicked);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="siloId"
                tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                domain={chartMetric === 'PORCENTAJE' ? [0, 100] : [0, 200]}
                unit={chartMetric === 'PORCENTAJE' ? '%' : ' Tn'}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltipSilosChart />} />

              {/* Línea de Referencia Capacidad Máxima (100% / 180 Tn) */}
              <ReferenceLine
                y={chartMetric === 'PORCENTAJE' ? 100 : 180}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: chartMetric === 'PORCENTAJE' ? '100% Capacidad Máxima' : 'Cap. Máx: 180 Tn',
                  fill: '#dc2626',
                  fontSize: 10,
                  fontWeight: 800,
                  position: 'top'
                }}
              />

              {/* Línea de Referencia Umbral Alerta (83.3% / 150 Tn) */}
              <ReferenceLine
                y={chartMetric === 'PORCENTAJE' ? 83.3 : 150}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: chartMetric === 'PORCENTAJE' ? 'Umbral Alerta: 83.3%' : 'Alerta: 150 Tn',
                  fill: '#d97706',
                  fontSize: 10,
                  fontWeight: 700,
                  position: 'insideTopRight'
                }}
              />

              <Bar
                dataKey={chartMetric === 'PORCENTAJE' ? 'porcentaje' : 'stockTn'}
                radius={[8, 8, 0, 0]}
                className="cursor-pointer transition-all duration-200 hover:opacity-85"
              >
                {chartSilosData.map((entry) => (
                  <Cell key={entry.siloId} fill={entry.color} />
                ))}
                <LabelList
                  dataKey={chartMetric === 'PORCENTAJE' ? 'porcentaje' : 'stockTn'}
                  position="top"
                  formatter={(val: number) => (chartMetric === 'PORCENTAJE' ? `${val}%` : `${val} Tn`)}
                  style={{ fill: '#0f172a', fontSize: 11, fontWeight: 800 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
              <div
                key={siloId}
                role="button"
                tabIndex={0}
                onClick={() => {
                  openSiloDrawer(siloId);
                  setFormError('');
                  setFormSuccess('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    openSiloDrawer(siloId);
                    setFormError('');
                    setFormSuccess('');
                  }
                }}
                className={`p-4 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between cursor-pointer ${
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

                  {/* Acciones Rápidas de Ficha y Panel Lateral */}
                  <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-between text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSiloDrawer(siloId);
                      }}
                      className={`flex items-center gap-1 hover:underline ${
                        isSelected ? 'text-amber-300 font-extrabold' : 'text-amber-700 font-extrabold'
                      }`}
                      title="Ver Historial de Movimientos en Panel Lateral"
                    >
                      <History className="w-3 h-3" /> Historial
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFichaModal(siloId, 'digital');
                      }}
                      className={`flex items-center gap-1 hover:underline ${
                        isSelected ? 'text-emerald-300' : 'text-emerald-700'
                      }`}
                      title="Ver Ficha Digital"
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
                      title="Exportar CSV"
                    >
                      <Download className="w-3 h-3" /> CSV
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModalSalidaManual(siloId);
                      }}
                      className={`flex items-center gap-1 hover:underline ${
                        isSelected ? 'text-amber-200 font-black' : 'text-amber-800 font-extrabold'
                      }`}
                      title="Registrar Salida Manual de este silo"
                    >
                      <ArrowUpRight className="w-3 h-3 text-amber-600" /> Salida Manual
                    </button>
                  </div>
                </div>
              </div>
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
              onClick={handleExportMovimientosExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0"
              title="Exportar todos los Ingresos y Egresos de Silos a Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Exportar Excel (Ingresos/Egresos)</span>
            </button>

            <button
              onClick={() => openSiloDrawer(activeSilo)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0"
              title="Abrir panel lateral con el historial detallado de ingresos y egresos de este silo"
            >
              <History className="w-4 h-4 text-amber-400" />
              <span>Panel Historial Movimientos</span>
            </button>

            <button
              onClick={() => openFichaModal(activeSilo, 'digital')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0"
              title="Ver Ficha Técnica Completa del Silo"
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>Ver Ficha</span>
            </button>

            <button
              onClick={() => openFichaModal(activeSilo, 'impresion')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0"
              title="Vista de Impresión para Ficha de Silo (A4 - 1 Hoja)"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Vista de Impresión</span>
            </button>

            <button
              onClick={() => openModalSalidaManual(activeSilo)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
              title="Registrar una Salida Manual en este silo"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-200" />
              <span>Salida Manual</span>
            </button>
          </div>
        </div>

        {/* Banner de Referencia de Calibración / Último Evento Stock en Cero */}
        {(() => {
          const ultimoZero = getUltimoAjusteCero(activeSilo);
          return (
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/70 block">
                    Referencia de Cálculo del Stock Actual (Σ Ingresos − Σ Egresos)
                  </span>
                  <div className="text-slate-800 font-medium mt-0.5">
                    {ultimoZero ? (
                      <span>
                        Punto de calibración <strong>"Stock en Cero"</strong>: <strong className="text-amber-900 font-mono">{ultimoZero.fecha}</strong> por <strong>{ultimoZero.usuarioZero || ultimoZero.usuario || 'Amilcar Quiroz'}</strong> {ultimoZero.motivoZero ? `(${ultimoZero.motivoZero})` : ''}
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        Historial completo desde inicio (sin eventos de calibración previa a 0).
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openModalSalidaManual(activeSilo)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-200" />
                <span>Salida Manual</span>
              </button>
            </div>
          );
        })()}

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
                <option value="FUNDADORA">FUNDADORA</option>
                <option value="PREBA">PREBA</option>
                <option value="ORIGINAL">ORIGINAL</option>
                <option value="PRIMU">PRIMU</option>
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
              <p className="text-[9.5px] text-slate-500 mt-1 italic leading-tight">
                * Dato informativo. El % de humedad no modifica ni descuenta kilos de stock ingresados al silo.
              </p>
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

            {/* Sección Chofer y Transporte (con Autocompletado e Importación desde Excel) */}
            <div className="sm:col-span-2 lg:col-span-4 p-3.5 bg-white border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Datos de Movimiento / Chofer y Transporte</span>
                </div>
                <label className="cursor-pointer px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-300 transition flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Importar Choferes Excel</span>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUploadChoferes} className="hidden" />
                </label>
              </div>

              {importNoticeChoferes && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-lg">
                  {importNoticeChoferes}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Chofer Search Selector */}
                <div>
                  <ChoferSearchSelector
                    choferes={choferes}
                    selectedChoferNombre={choferNombre}
                    onSelectChofer={(ch) => {
                      setChoferNombre(ch.nombre);
                      setChoferCuit(ch.cuit || '');
                      setChoferPatentes(ch.patentes || '');
                      setChoferTransporte(ch.transporte || '');
                    }}
                    onManualChange={(val) => setChoferNombre(val)}
                    onSaveNewChofer={(data) => {
                      if (data.nombre && onSaveChofer) {
                        onSaveChofer({
                          id: `CHOFER-${Date.now()}`,
                          nombre: data.nombre,
                          cuit: choferCuit.trim() || '—',
                          patentes: choferPatentes.trim() || '—',
                          transporte: choferTransporte.trim() || 'Sin Transporte'
                        });
                      }
                    }}
                    label="Chofer / Conductor"
                  />
                </div>

                {/* CUIT Chofer */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    CUIT / DNI Chofer
                  </label>
                  <input
                    type="text"
                    placeholder="ej: 20-34567890-9"
                    value={choferCuit}
                    onChange={(e) => setChoferCuit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                  />
                </div>

                {/* Patente(s) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Patente(s) Camión / Acoplado
                  </label>
                  <input
                    type="text"
                    placeholder="ej: AA123BB / AC456DD"
                    value={choferPatentes}
                    onChange={(e) => setChoferPatentes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                  />
                </div>

                {/* Empresa de Transporte */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Empresa / Transporte
                  </label>
                  <input
                    type="text"
                    placeholder="ej: Transportes El Rapido..."
                    value={choferTransporte}
                    onChange={(e) => setChoferTransporte(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                  />
                </div>
              </div>
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
                  <th className="py-3 px-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {movimientosConSaldo.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
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

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setMovimientoAEliminar(m);
                              setClaveEliminar('');
                              setErrorEliminar('');
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 rounded-lg border border-red-200 transition cursor-pointer active:scale-95 inline-flex items-center gap-1 text-[11px] font-bold"
                            title="Eliminar este movimiento de silo (Requiere usuario y clave de Amilcar Quiroz)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Eliminar</span>
                          </button>
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

      {/* Modal Salida Manual de Silo */}
      {showModalSalidaManual && (() => {
        const stockActualSilo = getStockSilo(siloSalidaManual);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl text-amber-200">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base font-serif flex items-center gap-2 text-white">
                      Generar Salida Manual de Silo
                    </h3>
                    <p className="text-[11px] text-amber-100 font-medium">
                      Descontar kilos del stock real ({siloSalidaManual})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModalSalidaManual(false)}
                  className="p-1.5 text-amber-100 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSalidaManual} className="p-6 space-y-4 text-xs">
                {/* Banner Stock Actual */}
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center justify-between text-xs font-bold">
                  <span>Stock Actual Disponible:</span>
                  <span className="font-mono text-sm font-black">{stockActualSilo.toLocaleString('es-AR')} kg</span>
                </div>

                {errorSalidaManual && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorSalidaManual}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Selector Silo */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Silo de Origen *
                    </label>
                    <select
                      value={siloSalidaManual}
                      onChange={(e) => setSiloSalidaManual(e.target.value as SiloId)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      {SILOS_DISPONIBLES.map((sId) => (
                        <option key={sId} value={sId}>{sId} ({getStockSilo(sId).toLocaleString('es-AR')} kg)</option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Fecha de Salida *
                    </label>
                    <input
                      type="date"
                      value={fechaSalidaManual}
                      onChange={(e) => setFechaSalidaManual(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Kilos a Descontar */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Cantidad a Descontar (kg) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={stockActualSilo}
                      placeholder="ej: 5000"
                      value={kgSalidaManual}
                      onChange={(e) => setKgSalidaManual(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>

                  {/* Motivo Obligatorio */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Motivo de Salida *
                    </label>
                    <select
                      value={motivoSalidaManual}
                      onChange={(e) => setMotivoSalidaManual(e.target.value as MotivoSalidaManual)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    >
                      <option value="Consumo a granel">Consumo a granel</option>
                      <option value="Manipulación">Manipulación</option>
                      <option value="Traslado a silo">Traslado a silo</option>
                    </select>
                  </div>
                </div>

                {/* Checkbox Descontaminación Varietal */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="descontaminacionVarietal"
                    checked={descontaminacionVarietal}
                    onChange={(e) => setDescontaminacionVarietal(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="descontaminacionVarietal" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                    Descontaminación Varietal
                    <span className="block text-[10px] font-normal text-slate-500">
                      Marcar si este movimiento corresponde a una limpieza / purga de variedad.
                    </span>
                  </label>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Observaciones / Comentarios Adicionales
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre el destino, operador, motivo..."
                    value={observacionesSalidaManual}
                    onChange={(e) => setObservacionesSalidaManual(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModalSalidaManual(false)}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <ArrowUpRight className="w-4 h-4 text-amber-200" />
                    <span>Registrar Salida Manual</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Confirmación de Eliminación de Movimiento con Autorización */}
      {movimientoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-red-700 via-red-800 to-red-900 text-white px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl text-red-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif text-white">
                    Eliminar Movimiento de Silo
                  </h3>
                  <p className="text-[11px] text-red-100 font-medium">
                    Operación restringida · Requiere clave de Amilcar Quiroz
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMovimientoAEliminar(null)}
                className="p-1.5 text-red-100 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Resumen del movimiento */}
              <div className="p-3.5 bg-red-50 border border-red-200 text-slate-800 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{movimientoAEliminar.siloId} · {movimientoAEliminar.tipo === 'INGRESO' ? 'Ingreso' : movimientoAEliminar.tipo === 'EGRESO_OP' ? 'Egreso OP' : 'Ajuste a Cero'}</span>
                  <span className="font-mono text-red-700 font-black">{movimientoAEliminar.kg.toLocaleString('es-AR')} kg</span>
                </div>
                <div className="text-[11px] text-slate-600 leading-tight">
                  Fecha: <strong>{movimientoAEliminar.fecha}</strong>
                  {movimientoAEliminar.cliente && ` · Cliente: ${movimientoAEliminar.cliente}`}
                  {movimientoAEliminar.especie && ` · Especie: ${movimientoAEliminar.especie}`}
                </div>
              </div>

              {errorEliminar && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorEliminar}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Usuario Autorizador *
                </label>
                <input
                  type="text"
                  value={usuarioEliminar}
                  onChange={(e) => setUsuarioEliminar(e.target.value)}
                  placeholder="Amilcar Quiroz"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-red-600" />
                  Contraseña / Clave de Autorización *
                </label>
                <input
                  type="password"
                  placeholder="Ingrese clave del usuario Amilcar Quiroz..."
                  value={claveEliminar}
                  onChange={(e) => setClaveEliminar(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 text-xs focus:ring-2 focus:ring-red-500 outline-none shadow-xs"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMovimientoAEliminar(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEliminarMovimiento}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4 text-red-200" />
                <span>Confirmar y Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Técnica del Silo */}
      {fichaModalSilo && (() => {
        const ficha = getSiloFichaData(fichaModalSilo);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-2 sm:p-4 overflow-hidden">
            
            {/* Estilo CSS especial para impresión garantizada en 1 sola hoja A4 */}
            <style>{`
              @media print {
                html, body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  background: #ffffff !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  height: 100% !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #ficha-print-a4, #ficha-print-a4 * {
                  visibility: visible !important;
                }
                #ficha-print-a4 {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 190mm !important;
                  max-height: 275mm !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  box-sizing: border-box !important;
                  background: #ffffff !important;
                  page-break-before: avoid !important;
                  page-break-after: avoid !important;
                  page-break-inside: avoid !important;
                  overflow: hidden !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 8mm;
                }
              }
            `}</style>

            {/* VISTA SOLO PARA IMPRESIÓN OFICIAL (1 HOJA TAMAÑO A4) */}
            <div id="ficha-print-a4" className="hidden print:block text-slate-900 border-2 border-slate-300 rounded-2xl overflow-hidden bg-white shadow-none">
              
              {/* Header impreso */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[8pt] font-black uppercase tracking-wider">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>AGROABACUS · PLANTA DE ACOPIO Y CLASIFICACIÓN</span>
                  </div>
                  <h2 className="text-lg font-black font-serif text-white flex items-center gap-2 mt-0.5">
                    <span>FICHA TÉCNICA DE SILO · {ficha.siloId}</span>
                    <span className="text-[7.5pt] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-sans font-bold rounded-full">
                      ACOPIO OFICIAL
                    </span>
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white rounded-xl flex flex-col items-center border border-slate-300 shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                        `AGROABACUS - SILO: ${ficha.siloId}\nCLIENTE: ${ficha.cliente}\nESPECIE: ${ficha.especie}\nVARIEDAD: ${ficha.variedad}\nSTOCK: ${ficha.stockKg} KG\nHUMEDAD: ${ficha.humedad}%\nFECHA: ${ficha.ultimoMovimiento}`
                      )}`}
                      alt={`QR ${ficha.siloId}`}
                      className="w-20 h-20 object-contain"
                    />
                    <span className="text-[6.5pt] font-mono font-black text-slate-800 mt-1 uppercase tracking-wider">QR SILO {ficha.siloId}</span>
                  </div>

                  <div className="text-right text-[7.5pt] font-mono leading-tight text-slate-300">
                    <div className="font-bold text-white">CONTROL DE STOCK Y CALIDAD</div>
                    <div>FECHA DE EMISIÓN: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR').slice(0, 5)} HS</div>
                  </div>
                </div>
              </div>

              {/* Contenido impreso */}
              <div className="p-4 bg-slate-50/50 space-y-3">
                
                {/* GRID 6 TARJETAS DE DATOS DE LA WEB APP */}
                <div className="grid grid-cols-3 gap-2.5">
                  
                  {/* 1. SILO */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-300 shadow-2xs">
                    <span className="text-[7pt] font-extrabold uppercase text-slate-500 block">1. N° DE SILO</span>
                    <span className="text-base font-serif font-black text-slate-900 leading-tight">{ficha.siloId}</span>
                    <span className="text-[6.5pt] text-slate-500 block">Cap: 180.000 kg</span>
                  </div>

                  {/* 2. ESPECIE */}
                  <div className="p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-300 shadow-2xs">
                    <span className="text-[7pt] font-extrabold uppercase text-emerald-800 block">2. ESPECIE</span>
                    <span className="text-sm font-bold text-emerald-950 leading-tight block truncate">{ficha.especie}</span>
                    <span className="text-[6.5pt] text-emerald-700 block">Grano Clasificado</span>
                  </div>

                  {/* 3. CLIENTE */}
                  <div className="p-2.5 bg-blue-50/90 rounded-xl border border-blue-300 shadow-2xs">
                    <span className="text-[7pt] font-extrabold uppercase text-blue-800 block">3. CLIENTE</span>
                    <span className="text-sm font-bold text-blue-950 leading-tight block truncate">{ficha.cliente}</span>
                    <span className="text-[6.5pt] text-blue-700 block">Titular Registrado</span>
                  </div>

                  {/* 4. VARIEDAD */}
                  <div className="p-2.5 bg-purple-50/90 rounded-xl border border-purple-300 shadow-2xs">
                    <span className="text-[7pt] font-extrabold uppercase text-purple-800 block">4. VARIEDAD / CAT</span>
                    <span className="text-sm font-bold text-purple-950 leading-tight block uppercase truncate">{ficha.variedad}</span>
                    <span className="text-[6.5pt] text-purple-700 block">Categoría: {ficha.categoria}</span>
                  </div>

                  {/* 5. STOCK TOTAL */}
                  <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-300 shadow-2xs">
                    <span className="text-[7pt] font-extrabold uppercase text-amber-900 block">5. KG TOTALES</span>
                    <span className="text-sm font-black font-mono text-amber-950 leading-tight block">{ficha.stockKg.toLocaleString('es-AR')} kg</span>
                    <span className="text-[6.5pt] text-amber-800 font-bold block">{ficha.stockTn} Tn ({ficha.pctOcupacion}%)</span>
                  </div>

                  {/* 6. HUMEDAD */}
                  <div className="p-2.5 bg-cyan-50/90 rounded-xl border border-cyan-300 shadow-2xs">
                    <span className="text-[7pt] font-extrabold uppercase text-cyan-900 block">6. % HUMEDAD</span>
                    <span className="text-base font-black font-mono text-cyan-950 leading-tight block">{ficha.humedad}%</span>
                    <span className="text-[6.5pt] text-cyan-800 block">Humedad de Ingreso</span>
                  </div>

                </div>

                {/* Barra de Ocupación Visual */}
                <div className="bg-white border border-slate-300 rounded-xl p-2.5 flex justify-between items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[7pt] font-bold text-slate-700 mb-1">
                      <span>Capacidad y Estado de Ocupación de {ficha.siloId}</span>
                      <span>{ficha.stockKg.toLocaleString('es-AR')} / 180.000 kg ({ficha.pctOcupacion}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                      <div
                        className={`h-full ${
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
                </div>

                {/* Tabla de Cargas Recientes */}
                <div className="bg-white border border-slate-300 rounded-xl p-2.5">
                  <div className="text-[7.5pt] font-bold text-slate-800 uppercase tracking-wider mb-1 flex justify-between">
                    <span>Detalle de Cargas e Ingresos Activos ({ficha.totalIngresos} registros)</span>
                    <span className="text-[6.5pt] text-slate-500 font-normal">Última Carga: {ficha.ultimoMovimiento}</span>
                  </div>
                  <table className="w-full text-left text-[7pt] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[6.5pt] border-b border-slate-300">
                        <th className="py-1 px-1.5">Fecha</th>
                        <th className="py-1 px-1.5">Cliente</th>
                        <th className="py-1 px-1.5">Especie / Variedad</th>
                        <th className="py-1 px-1.5">Origen / Bolsón</th>
                        <th className="py-1 px-1.5 text-right">Kg Carga</th>
                        <th className="py-1 px-1.5 text-right">% Humedad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {ficha.ingresosActivos.slice(0, 5).map((ing) => (
                        <tr key={ing.id}>
                          <td className="py-1 px-1.5 font-mono text-slate-600">{ing.fecha}</td>
                          <td className="py-1 px-1.5 font-bold">{ing.cliente}</td>
                          <td className="py-1 px-1.5">{ing.especie} ({ing.variedad})</td>
                          <td className="py-1 px-1.5 text-[6.5pt] text-slate-600">{ing.campoOrigen || '-'} {ing.bolsonOrigenNro ? `· ${ing.bolsonOrigenNro}` : ''}</td>
                          <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-700">+{ing.kg.toLocaleString('es-AR')} kg</td>
                          <td className="py-1 px-1.5 text-right font-mono font-bold text-blue-800">{ing.humedad !== undefined ? `${ing.humedad}%` : '13.5%'}</td>
                        </tr>
                      ))}
                      {ficha.ingresosActivos.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-2 text-slate-400 italic">Sin ingresos activos registrados.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Firmas de Control */}
                <div className="pt-4 grid grid-cols-2 gap-12 text-[7pt] text-center text-slate-700 font-bold">
                  <div>
                    <div className="border-b border-slate-400 mb-1 h-5"></div>
                    <span>FIRMA Y SELLO OPERARIO ACOPIO</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 mb-1 h-5"></div>
                    <span>RESPONSABLE TÉCNICO PLANTA</span>
                  </div>
                </div>

              </div>

            </div>

            {/* VISTA DIGITAL PANTALLA (MODAL FIJO Y 100% VISIBLE EN PANTALLA AL 100% DE TAMAÑO) */}
            <div className="bg-white w-[980px] max-w-[96vw] max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:hidden">
              
              {/* Header Ficha Modal con Selector de Vista */}
              <div className="shrink-0 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-3.5 sm:p-4 relative">
                <button
                  onClick={() => setFichaModalSilo(null)}
                  className="absolute top-3.5 right-3.5 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
                  title="Cerrar Ficha"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 text-emerald-400 font-mono text-[9px] font-black uppercase tracking-widest mb-0.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Planta Clasificadora y de Acopio AgroAbacus</span>
                </div>
                
                <h2 className="text-xl sm:text-2xl font-black font-serif text-white flex items-center gap-2.5">
                  <span>FICHA TÉCNICA · {ficha.siloId}</span>
                  <span className="text-[10px] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans font-bold rounded-full">
                    {fichaModalMode === 'impresion' ? 'VISTA IMPRESIÓN (A4)' : 'FICHA DIGITAL WEB'}
                  </span>
                </h2>
                
                <p className="text-[11px] text-slate-300 mt-0.5 font-sans">
                  Informe de control de acopio, calidad de grano, varietal y trazabilidad de silo.
                </p>

                {/* Pestañas de Modo de Vista */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setFichaModalMode('digital')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      fichaModalMode === 'digital'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Vista Digital Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFichaModalMode('impresion')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      fichaModalMode === 'impresion'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Vista de Impresión (A4 - 1 Hoja)</span>
                  </button>
                </div>
              </div>

              {/* MODO VISTA DE IMPRESIÓN (HOJA A4 PREVIEW) */}
              {fichaModalMode === 'impresion' ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 space-y-4">
                  
                  {/* Banner de Acción de Impresión */}
                  <div className="bg-emerald-950 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm border border-emerald-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-800 rounded-xl text-emerald-300">
                        <Printer className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-emerald-200 uppercase tracking-wider">Vista Previa de Impresión A4</div>
                        <div className="text-xs text-slate-200">Diseñada para encajar exactamente en 1 única hoja de papel A4.</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md shrink-0 active:scale-95 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Ficha Ahora</span>
                    </button>
                  </div>

                  {/* HOJA A4 DE PREVISUALIZACIÓN */}
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-300 p-6 max-w-[210mm] w-full mx-auto text-slate-900 space-y-4 font-sans">
                    
                    {/* Encabezado A4 */}
                    <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center">
                      <div>
                        <div className="font-mono text-[9px] font-black uppercase text-emerald-800 tracking-wider">AGROABACUS · PLANTA DE ACOPIO Y CLASIFICACIÓN</div>
                        <h3 className="text-xl font-black font-serif text-slate-900">FICHA TÉCNICA DE CONTROL DE SILO: {ficha.siloId}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white border-2 border-slate-900 rounded-xl flex flex-col items-center shrink-0 shadow-sm">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                              `AGROABACUS - SILO: ${ficha.siloId}\nCLIENTE: ${ficha.cliente}\nESPECIE: ${ficha.especie}\nVARIEDAD: ${ficha.variedad}\nSTOCK: ${ficha.stockKg} KG\nHUMEDAD: ${ficha.humedad}%\nFECHA: ${ficha.ultimoMovimiento}`
                            )}`}
                            alt={`QR ${ficha.siloId}`}
                            className="w-24 h-24 object-contain"
                          />
                          <span className="text-[6.5pt] font-mono font-black text-slate-900 mt-1 uppercase tracking-wider">QR TRAZABILIDAD SILO</span>
                        </div>
                        <div className="text-right text-[9px] font-mono leading-tight text-slate-600">
                          <div className="font-bold text-slate-900">ACOPIO OFICIAL</div>
                          <div>EMISIÓN: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR').slice(0, 5)} HS</div>
                        </div>
                      </div>
                    </div>

                    {/* Grid 6 Datos A4 */}
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-bold uppercase text-slate-500 block">1. N° DE SILO</span>
                        <span className="text-base font-serif font-black text-slate-900 block">{ficha.siloId}</span>
                        <span className="text-[9px] text-slate-500 block">Cap: 180.000 kg</span>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-[9px] font-bold uppercase text-emerald-800 block">2. ESPECIE</span>
                        <span className="text-sm font-bold text-emerald-950 block truncate">{ficha.especie}</span>
                        <span className="text-[9px] text-emerald-700 block">Grano Clasificado</span>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <span className="text-[9px] font-bold uppercase text-blue-800 block">3. CLIENTE</span>
                        <span className="text-sm font-bold text-blue-950 block truncate">{ficha.cliente}</span>
                        <span className="text-[9px] text-blue-700 block">Titular Registrado</span>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <span className="text-[9px] font-bold uppercase text-purple-800 block">4. VARIEDAD / CAT</span>
                        <span className="text-sm font-bold text-purple-950 block uppercase truncate">{ficha.variedad} ({ficha.categoria})</span>
                        <span className="text-[9px] text-purple-700 block">Categoría Activa</span>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="text-[9px] font-bold uppercase text-amber-900 block">5. KG TOTALES</span>
                        <span className="text-sm font-black font-mono text-amber-950 block">{ficha.stockKg.toLocaleString('es-AR')} kg</span>
                        <span className="text-[9px] text-amber-800 block">{ficha.stockTn} Tn ({ficha.pctOcupacion}%)</span>
                      </div>
                      <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                        <span className="text-[9px] font-bold uppercase text-cyan-900 block">6. % HUMEDAD</span>
                        <span className="text-base font-black font-mono text-cyan-950 block">{ficha.humedad}%</span>
                        <span className="text-[9px] text-cyan-800 block">Humedad de Ingreso</span>
                      </div>
                    </div>

                    {/* Barra de Ocupación */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Estado de Capacidad de {ficha.siloId}</span>
                        <span>{ficha.stockKg.toLocaleString('es-AR')} / 180.000 kg ({ficha.pctOcupacion}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                        <div
                          className={`h-full ${
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

                    {/* Tabla Cargas */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <div className="bg-slate-100 px-3 py-2 font-bold uppercase text-[10px] text-slate-700 border-b border-slate-200 flex justify-between">
                        <span>Ingresos y Cargas Registradas ({ficha.totalIngresos})</span>
                        <span>Último: {ficha.ultimoMovimiento}</span>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-200">
                            <th className="py-1.5 px-3">Fecha</th>
                            <th className="py-1.5 px-3">Cliente</th>
                            <th className="py-1.5 px-3">Especie / Variedad</th>
                            <th className="py-1.5 px-3">Origen</th>
                            <th className="py-1.5 px-3 text-right">Kg Carga</th>
                            <th className="py-1.5 px-3 text-right">% Hum.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-medium text-[11px]">
                          {ficha.ingresosActivos.slice(0, 4).map((ing) => (
                            <tr key={ing.id}>
                              <td className="py-1.5 px-3 font-mono text-slate-600">{ing.fecha}</td>
                              <td className="py-1.5 px-3 font-bold">{ing.cliente}</td>
                              <td className="py-1.5 px-3">{ing.especie} ({ing.variedad})</td>
                              <td className="py-1.5 px-3 text-slate-600 text-[10px]">{ing.campoOrigen || '-'} {ing.bolsonOrigenNro ? `· ${ing.bolsonOrigenNro}` : ''}</td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">+{ing.kg.toLocaleString('es-AR')} kg</td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-800">{ing.humedad !== undefined ? `${ing.humedad}%` : '13.5%'}</td>
                            </tr>
                          ))}
                          {ficha.ingresosActivos.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-3 text-slate-400 italic">Sin ingresos activos registrados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Firmas de Control */}
                    <div className="pt-6 grid grid-cols-2 gap-12 text-xs text-center text-slate-700 font-bold">
                      <div>
                        <div className="border-b-2 border-slate-400 mb-1 h-6"></div>
                        <span className="uppercase text-[10px]">FIRMA OPERARIO ACOPIO</span>
                      </div>
                      <div>
                        <div className="border-b-2 border-slate-400 mb-1 h-6"></div>
                        <span className="uppercase text-[10px]">RESPONSABLE TÉCNICO PLANTA</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* BODY MODO DIGITAL WEB - OPTIMIZADO PARA VISIBILIDAD 100% EN PANTALLA */
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs bg-slate-50/50">
                  
                  {/* GRID 6 TARJETAS EN LÍNEA / DISTRIBUCIÓN HORIZONTAL */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    
                    {/* 1. NÚMERO DE SILO */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold uppercase text-slate-500 block">
                        1. N° de Silo
                      </span>
                      <span className="text-lg font-serif font-black text-slate-900 my-0.5 block">
                        {ficha.siloId}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">Cap: 180 Tn</span>
                    </div>

                    {/* 2. ESPECIE */}
                    <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold uppercase text-emerald-800 block">
                        2. Especie
                      </span>
                      <span className="text-sm font-bold text-emerald-950 my-0.5 block truncate" title={ficha.especie}>
                        {ficha.especie}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-medium">Clasificación activa</span>
                    </div>

                    {/* 3. CLIENTE */}
                    <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold uppercase text-blue-800 block">
                        3. Cliente
                      </span>
                      <span className="text-sm font-bold text-blue-950 my-0.5 block truncate" title={ficha.cliente}>
                        {ficha.cliente}
                      </span>
                      <span className="text-[9px] text-blue-700 font-medium">Titular registrado</span>
                    </div>

                    {/* 4. VARIEDAD */}
                    <div className="p-2.5 bg-purple-50/70 rounded-xl border border-purple-200 flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold uppercase text-purple-800 block">
                        4. Variedad
                      </span>
                      <span className="text-sm font-bold text-purple-950 my-0.5 block uppercase truncate" title={ficha.variedad}>
                        {ficha.variedad}
                      </span>
                      <span className="text-[9px] text-purple-700 font-medium">Cat: {ficha.categoria}</span>
                    </div>

                    {/* 5. KG TOTALES */}
                    <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold uppercase text-amber-900 block">
                        5. Kg Totales
                      </span>
                      <span className="text-sm font-black font-mono text-amber-950 my-0.5 block">
                        {ficha.stockKg.toLocaleString('es-AR')} kg
                      </span>
                      <span className="text-[9px] text-amber-800 font-bold">
                        {ficha.stockTn} Tn ({ficha.pctOcupacion}%)
                      </span>
                    </div>

                    {/* 6. HUMEDAD */}
                    <div className="p-2.5 bg-cyan-50/80 rounded-xl border border-cyan-200 flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold uppercase text-cyan-900 block flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-cyan-600" /> 6. % Humedad
                      </span>
                      <span className="text-lg font-black font-mono text-cyan-950 my-0.5 block">
                        {ficha.humedad}%
                      </span>
                      <span className="text-[9px] text-cyan-800 font-medium">Ingreso promedio</span>
                    </div>

                  </div>

                  {/* ROW DE DOS COLUMNAS: QR TRAZABILIDAD + ESTADO DE CAPACIDAD Y OCUPACIÓN */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    
                    {/* CÓDIGO QR TRAZABILIDAD (4 COLS) */}
                    <div className="md:col-span-5 p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> QR Trazabilidad Digital
                        </span>
                        <span className="text-xs font-extrabold text-white block mt-1">Ficha Técnica {ficha.siloId}</span>
                        <p className="text-[9.5px] text-slate-300 mt-1 line-clamp-2">
                          Escaneo directo para verificación de stock, cliente, especie y humedad.
                        </p>
                      </div>
                      <div className="p-1.5 bg-white rounded-xl shrink-0 border border-emerald-500 shadow-xs flex flex-col items-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                            `AGROABACUS - SILO: ${ficha.siloId}\nCLIENTE: ${ficha.cliente}\nESPECIE: ${ficha.especie}\nVARIEDAD: ${ficha.variedad}\nSTOCK: ${ficha.stockKg} KG\nHUMEDAD: ${ficha.humedad}%\nFECHA: ${ficha.ultimoMovimiento}`
                          )}`}
                          alt={`QR ${ficha.siloId}`}
                          className="w-20 h-20 object-contain"
                        />
                        <span className="text-[6pt] font-mono font-black text-slate-800 mt-0.5 uppercase">QR {ficha.siloId}</span>
                      </div>
                    </div>

                    {/* BARRA DE OCUPACIÓN Y ESTADO DE CAPACIDAD (7 COLS) */}
                    <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-center space-y-2 shadow-2xs">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Warehouse className="w-4 h-4 text-emerald-700" />
                          Estado de Capacidad y Ocupación · {ficha.siloId}
                        </span>
                        <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                          {ficha.stockKg.toLocaleString('es-AR')} / 180.000 kg ({ficha.pctOcupacion}%)
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200">
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

                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium pt-0.5">
                        <span>Disponible: {Math.max(0, 180000 - ficha.stockKg).toLocaleString('es-AR')} kg</span>
                        <span>Último Ingreso: <strong className="text-slate-700">{ficha.ultimoMovimiento}</strong></span>
                      </div>
                    </div>

                  </div>

                  {/* TABLA DE CARGAS E INGRESOS REGISTRADOS */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-emerald-700" />
                        Detalle de Ingresos Registrados en Silo ({ficha.totalIngresos} cargas)
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">Resumen Trazable Activo</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 uppercase text-[9px] font-bold">
                          <tr>
                            <th className="py-2 px-3">Fecha</th>
                            <th className="py-2 px-3">Cliente</th>
                            <th className="py-2 px-3">Especie / Variedad</th>
                            <th className="py-2 px-3">Origen / Bolsón</th>
                            <th className="py-2 px-3 text-right">Kg Carga</th>
                            <th className="py-2 px-3 text-right">% Humedad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {ficha.ingresosActivos.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                                Sin cargas activas registradas en este silo.
                              </td>
                            </tr>
                          ) : (
                            ficha.ingresosActivos.map((ing) => (
                              <tr key={ing.id} className="hover:bg-slate-50">
                                <td className="py-1.5 px-3 font-mono text-slate-600">{ing.fecha}</td>
                                <td className="py-1.5 px-3 font-bold text-slate-900">{ing.cliente}</td>
                                <td className="py-1.5 px-3">
                                  <span className="font-semibold text-slate-800">{ing.especie}</span>
                                  <span className="text-[10px] text-slate-500 ml-1">({ing.variedad})</span>
                                </td>
                                <td className="py-1.5 px-3 text-[10px] text-slate-600">
                                  {ing.campoOrigen} {ing.bolsonOrigenNro ? `· ${ing.bolsonOrigenNro}` : ''}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                                  +{ing.kg.toLocaleString('es-AR')} kg
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono font-extrabold text-blue-800">
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
              )}

              {/* Footer Ficha */}
              <div className="shrink-0 bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] text-slate-500 font-medium">
                  AgroAbacus Software · Ficha de Control Técnico de Silos
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setFichaModalMode('impresion');
                      setTimeout(() => window.print(), 100);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Imprimir Ficha (1 Hoja A4)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintSiloQrLabel(ficha)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs border border-slate-700 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Imprimir Etiqueta QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportFichaCSV(ficha)}
                    className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Exportar CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFichaModalSilo(null)}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* PANEL LATERAL (DRAWER) - HISTORIAL DETALLADO DE MOVIMIENTOS DEL SILO */}
      {drawerSilo && (() => {
        const siloStock = getStockSilo(drawerSilo);
        const siloFicha = getSiloFichaData(drawerSilo);
        
        // Todos los movimientos de este silo
        const todosMovimientos = movimientosSilo
          .filter((m) => m.siloId === drawerSilo)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        // Calcular totales acumulados
        const totalKgIngresados = todosMovimientos
          .filter(m => m.tipo === 'INGRESO')
          .reduce((acc, m) => acc + m.kg, 0);

        const totalKgEgresados = todosMovimientos
          .filter(m => m.tipo === 'EGRESO_OP')
          .reduce((acc, m) => acc + m.kg, 0);

        // Filtrar por tipo y búsqueda
        const movimientosFiltrados = todosMovimientos.filter((m) => {
          if (drawerFilterTipo !== 'TODOS' && m.tipo !== drawerFilterTipo) return false;
          if (drawerSearch.trim() !== '') {
            const query = drawerSearch.toLowerCase();
            const matchCliente = m.cliente?.toLowerCase().includes(query);
            const matchEspecie = m.especie?.toLowerCase().includes(query);
            const matchVariedad = m.variedad?.toLowerCase().includes(query);
            const matchOP = m.numeroOrdenProceso?.toLowerCase().includes(query) || m.ordenProcesoId?.toLowerCase().includes(query);
            const matchOrigen = m.campoOrigen?.toLowerCase().includes(query) || m.depositoOrigen?.toLowerCase().includes(query) || m.bolsonOrigenNro?.toLowerCase().includes(query);
            const matchMotivo = m.motivoAjuste?.toLowerCase().includes(query) || m.motivoZero?.toLowerCase().includes(query);
            const matchFecha = m.fecha.includes(query);
            return Boolean(matchCliente || matchEspecie || matchVariedad || matchOP || matchOrigen || matchMotivo || matchFecha);
          }
          return true;
        });

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div 
              className="absolute inset-0 cursor-pointer" 
              onClick={() => setDrawerSilo(null)}
              title="Hacer clic para cerrar el panel lateral"
            />

            {/* Panel Lateral Drawer */}
            <div className="relative w-full max-w-xl bg-slate-50 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
              
              {/* Encabezado del Panel Lateral */}
              <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                    <Warehouse className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-serif font-black text-white">{drawerSilo}</h2>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-600">
                        Historial de Movimientos
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Trazabilidad completa e ingresos/egresos en tiempo real
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerSilo(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Cerrar panel lateral"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tarjeta Resumen de Estado del Silo */}
              <div className="p-4 bg-white border-b border-slate-200 shrink-0 space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Stock Actual</span>
                    <span className="text-lg font-black font-mono text-slate-900">
                      {siloStock.toLocaleString('es-AR')} <span className="text-xs text-slate-500 font-sans">kg</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                      {(siloStock / 1000).toFixed(1)} Tn ({((siloStock / CAPACIDAD_MAX_SILO) * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">Total Ingresado</span>
                    <span className="text-lg font-black font-mono text-emerald-800">
                      +{totalKgIngresados.toLocaleString('es-AR')} <span className="text-xs text-emerald-700 font-sans">kg</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                      {(totalKgIngresados / 1000).toFixed(1)} Tn acumuladas
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 block">Total Egresado</span>
                    <span className="text-lg font-black font-mono text-amber-900">
                      -{totalKgEgresados.toLocaleString('es-AR')} <span className="text-xs text-amber-800 font-sans">kg</span>
                    </span>
                    <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                      {(totalKgEgresados / 1000).toFixed(1)} Tn extraídas
                    </span>
                  </div>
                </div>

                {/* Resumen Cereal Almacenado */}
                <div className="p-2.5 bg-slate-100 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Contenido:</span>
                    <span className="font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                      {siloFicha.especie}
                    </span>
                    <span className="text-slate-600 font-medium">({siloFicha.variedad})</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>Cliente: <strong className="text-slate-800">{siloFicha.cliente}</strong></span>
                    <span>· Humedad: <strong className="text-blue-800">{siloFicha.humedad}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Filtros de Tipo y Búsqueda */}
              <div className="p-4 bg-slate-100/80 border-b border-slate-200 space-y-3 shrink-0">
                {/* Selector de Tipo */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setDrawerFilterTipo('TODOS')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer ${
                      drawerFilterTipo === 'TODOS'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Todos ({todosMovimientos.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerFilterTipo('INGRESO')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                      drawerFilterTipo === 'INGRESO'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    Ingresos
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerFilterTipo('EGRESO_OP')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                      drawerFilterTipo === 'EGRESO_OP'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Egresos OP
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerFilterTipo('AJUSTE_ZERO')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                      drawerFilterTipo === 'AJUSTE_ZERO'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Ajustes
                  </button>
                </div>

                {/* Input Búsqueda */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Buscar por cliente, OP, especie, variedad, origen o fecha..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  {drawerSearch && (
                    <button
                      type="button"
                      onClick={() => setDrawerSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista Scrollable de Movimientos */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {movimientosFiltrados.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
                    <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-700">Sin movimientos registrados</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      {drawerSearch || drawerFilterTipo !== 'TODOS'
                        ? 'No se encontraron registros coincidentes con los filtros aplicados.'
                        : `Aún no se han registrado ingresos ni egresos para ${drawerSilo}.`}
                    </p>
                  </div>
                ) : (
                  movimientosFiltrados.map((mov) => {
                    const isIngreso = mov.tipo === 'INGRESO';
                    const isEgreso = mov.tipo === 'EGRESO_OP';
                    const isAjuste = mov.tipo === 'AJUSTE_ZERO';

                    return (
                      <div
                        key={mov.id}
                        className={`p-4 rounded-2xl border shadow-2xs transition hover:shadow-md ${
                          isIngreso
                            ? 'bg-white border-emerald-200/90 hover:border-emerald-300'
                            : isEgreso
                            ? 'bg-white border-amber-200/90 hover:border-amber-300'
                            : 'bg-white border-red-200/90 hover:border-red-300'
                        }`}
                      >
                        {/* Cabecera del Movimiento */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2">
                            {isIngreso && (
                              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1 text-xs font-black">
                                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                                INGRESO ACOPIO
                              </span>
                            )}
                            {isEgreso && (
                              <span className="p-1.5 bg-amber-100 text-amber-900 rounded-lg flex items-center gap-1 text-xs font-black">
                                <ArrowUpRight className="w-4 h-4 text-amber-700" />
                                EGRESO A OP
                              </span>
                            )}
                            {isAjuste && (
                              <span className="p-1.5 bg-red-100 text-red-900 rounded-lg flex items-center gap-1 text-xs font-black">
                                <RotateCcw className="w-4 h-4 text-red-700" />
                                AJUSTE A CERO
                              </span>
                            )}

                            <span className="text-xs text-slate-500 font-mono font-medium flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {mov.fecha}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-base font-black font-mono ${
                              isIngreso ? 'text-emerald-700' : isEgreso ? 'text-amber-800' : 'text-red-700'
                            }`}>
                              {isIngreso ? `+${mov.kg.toLocaleString('es-AR')}` : isEgreso ? `-${mov.kg.toLocaleString('es-AR')}` : `0`} kg
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setMovimientoAEliminar(mov);
                                setClaveEliminar('');
                                setErrorEliminar('');
                              }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 rounded-lg border border-red-200 transition cursor-pointer active:scale-95 ml-1"
                              title="Eliminar este movimiento de silo"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </div>
                        </div>

                        {/* Detalles según el tipo */}
                        {isIngreso && (
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-800 font-bold">
                              <span>{mov.cliente || 'San Diego Semilla'}</span>
                              <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                {mov.especie || 'Soja'} · {mov.variedad || 'P46A03'} ({mov.categoria || 'Fundadora'})
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1">
                              <div>
                                <span className="font-semibold text-slate-500 block">Origen:</span>
                                <span>{mov.campoOrigen || 'La Barrancosa'} {mov.bolsonOrigenNro ? `· Bolsón ${mov.bolsonOrigenNro}` : ''}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500 block">% Humedad:</span>
                                <span className="font-bold text-blue-800">{mov.humedad !== undefined ? `${mov.humedad}%` : '13.5%'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {isEgreso && (
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-800 font-bold">
                              <span>Orden de Proceso: <strong className="font-mono text-amber-900">{mov.numeroOrdenProceso || mov.ordenProcesoId || 'N/A'}</strong></span>
                              <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                Lote: {mov.loteNro || mov.loteResultanteId || 'N/A'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              Cliente: <strong>{mov.cliente || 'San Diego Semilla'}</strong> · Cereal: {mov.especie || 'Soja'} {mov.variedad ? `(${mov.variedad})` : ''}
                            </p>
                          </div>
                        )}

                        {isAjuste && (
                          <div className="space-y-1 text-xs text-slate-700">
                            <p>
                              <strong>Motivo:</strong> {mov.motivoAjuste || mov.motivoZero || 'Ajuste manual de stock por limpieza / mermas.'}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                              <span>Stock previo: <strong>{mov.kgAntesAjuste ? mov.kgAntesAjuste.toLocaleString('es-AR') : '0'} kg</strong></span>
                              <span>Usuario: <strong>{mov.usuario || mov.usuarioZero || 'Operario de Planta'}</strong></span>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

              {/* Pie del Panel Lateral */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    openFichaModal(drawerSilo, 'digital');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-emerald-300" />
                  <span>Ver Ficha</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (drawerSilo) openModalSalidaManual(drawerSilo);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  title="Generar Salida Manual de Silo"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-200" />
                  <span>Salida Manual</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportFichaCSV(siloFicha)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerSilo(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
