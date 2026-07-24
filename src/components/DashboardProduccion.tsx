/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Lote, OrdenProceso } from '../types';
import { formatNumberArg } from '../utils/formatters';
import {
  Factory,
  Filter,
  RotateCcw,
  Download,
  Calendar,
  Layers,
  Search,
  ChevronDown,
  X,
  Check,
  TrendingUp,
  Boxes,
  PieChart as PieChartIcon,
  BarChart3,
  Scale,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  ArrowRight,
  Hourglass
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface DashboardProduccionProps {
  lotes: Lote[];
  ordenesProceso?: OrdenProceso[];
  onSelectLote?: (lote: Lote) => void;
}

interface ProductionRecord {
  id: string;
  loteNro: string;
  fechaProduccion: string; // YYYY-MM-DD
  cliente: string;
  especie: string;
  variedad: string;
  categoria: string;
  tipo: string;
  tratamientos: string[];
  tratamientoStr: string;
  bolsasProducidas: number;
  kgProducidos: number;
  kgPorBolsa: number;
}

// Colores institucionales
const COLOR_PALETTE = [
  '#00603C', // Verde institucional Agro Abacus
  '#C9922E', // Dorado / Ámbar
  '#2E8B57', // Verde Selva
  '#A0522D', // Terracota / Bronce
  '#4682B4', // Azul Acero
  '#8B4513', // Marrón
  '#2F4F4F', // Pizarra
  '#D2691E'  // Canela
];

// Recharts Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const kg = data.kgProducidos ?? data.kg ?? data.value ?? 0;
    const bolsas = data.bolsasProducidas ?? data.bolsas ?? 0;
    const ton = (kg / 1000).toFixed(1);

    return (
      <div className="bg-[#1A1A1A] text-white p-3.5 rounded-xl border border-gray-800 text-xs shadow-2xl font-sans text-left min-w-[200px]">
        <p className="font-bold text-[#C9922E] uppercase tracking-wider mb-2 border-b border-gray-800 pb-1">
          {data.name || label || 'Producción'}
        </p>
        <div className="space-y-1.5">
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">Total Producido:</span>
            <span className="font-mono font-bold text-emerald-400">{formatNumberArg(kg, 0)} kg</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">Volumen Toneladas:</span>
            <span className="font-mono font-bold text-[#F6EFDC]">{ton} Tn</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">Bolsas Totales:</span>
            <span className="font-mono font-bold text-white">{formatNumberArg(bolsas, 0)} b.</span>
          </p>
          {data.lotesCount !== undefined && (
            <p className="flex justify-between gap-4 border-t border-gray-800/60 pt-1">
              <span className="text-gray-400">Lotes de Producción:</span>
              <span className="font-mono font-bold text-amber-300">{data.lotesCount}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Componente Reutilizable de Multi-Select Dropdown
interface MultiSelectDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options: string[];
  selectedValues: string[];
  onChange: (newSelected: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter(o => o.toLowerCase().includes(searchTerm.toLowerCase().trim()));
  }, [options, searchTerm]);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const selectAll = () => {
    onChange([...options]);
  };

  const clearAll = () => {
    onChange([]);
  };

  const isAllSelected = options.length > 0 && selectedValues.length === options.length;
  const count = selectedValues.length;

  return (
    <div className="relative text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition shadow-xs ${
          count > 0
            ? 'bg-[#00603C] text-white border-[#00603C]'
            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span className="truncate">{label}</span>
          {count > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-[#F6EFDC] text-[#00603C] text-[10px] font-bold rounded-full">
              {count}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop para cerrar */}
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-2 min-w-[200px] max-w-xs animate-in fade-in zoom-in-95 duration-100">
            {/* Buscador interno si hay muchas opciones */}
            {options.length > 6 && (
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00603C]"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2 pointer-events-none" />
              </div>
            )}

            {/* Acciones Rápidas */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1.5 text-[10px] font-bold text-gray-500">
              <button
                type="button"
                onClick={selectAll}
                className="hover:text-[#00603C] transition"
              >
                {isAllSelected ? 'Todos seleccionados' : 'Seleccionar Todos'}
              </button>
              {count > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-red-600 hover:underline transition"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Lista de Opciones */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 text-xs scrollbar-thin">
              {filteredOptions.length === 0 ? (
                <p className="text-gray-400 text-[11px] p-2 text-center italic">Sin coincidencias</p>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedValues.includes(opt);
                  return (
                    <label
                      key={opt}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOption(opt);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#E3EFE7] cursor-pointer transition select-none"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#00603C] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                      <span className={`text-xs ${isChecked ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {opt}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export interface VencimientoRecord {
  lote: Lote;
  loteNro: string;
  cliente: string;
  especie: string;
  variedad: string;
  tipo: string;
  stockBolsas: number;
  stockKg: number;
  tratamientoStr: string;
  fechaTratamiento: string;
  fechaVencimiento: string;
  diasRestantes: number;
  estadoVencimiento: 'VENCIDO' | 'CRITICO' | 'ATENCION' | 'VIGENTE';
  ordenProcesoId?: string;
  ordenProcesoNum?: string;
  ordenProceso?: OrdenProceso;
}

export const DashboardProduccion: React.FC<DashboardProduccionProps> = ({ lotes, ordenesProceso = [], onSelectLote }) => {
  // Estados para Filtros de la Sección Próximos Vencimientos
  const [vencEspecieFilter, setVencEspecieFilter] = useState<string>('TODAS');
  const [vencOpFilter, setVencOpFilter] = useState<string>('TODAS');
  const [vencEstadoFilter, setVencEstadoFilter] = useState<string>('TODOS');
  const [vencSearchTerm, setVencSearchTerm] = useState<string>('');
  const [vencCurrentPage, setVencCurrentPage] = useState<number>(1);
  const vencItemsPerPage = 8;

  // Lógica de Vencimientos de Tratamiento
  const TODAY_STR = '2026-07-23';

  const vencimientoRecords = useMemo<VencimientoRecord[]>(() => {
    const list: VencimientoRecord[] = [];

    lotes.forEach((lote) => {
      const trats = Array.isArray(lote.tratamiento) ? lote.tratamiento : [lote.tratamiento];
      const hasTratamientoMark = trats.some(t => String(t).toLowerCase().includes('tratad')) ||
                                  (lote.producto && lote.producto !== 'Ninguno') ||
                                  Boolean(lote.fechaTratamiento) ||
                                  Boolean(lote.fechaVencimientoTratamiento) ||
                                  Boolean(lote.ordenProcesoId);

      if (!hasTratamientoMark) return;

      // Buscar Orden de Proceso vinculada por ID o número
      let linkedOp: OrdenProceso | undefined;
      if (lote.ordenProcesoId && ordenesProceso) {
        linkedOp = ordenesProceso.find(op => op.id === lote.ordenProcesoId || op.numeroOrden === lote.ordenProcesoId);
      }
      if (!linkedOp && lote.numeroOrdenMovimiento && ordenesProceso) {
        linkedOp = ordenesProceso.find(op => op.numeroOrdenMovimiento === lote.numeroOrdenMovimiento || op.numeroOrden === lote.numeroOrdenMovimiento);
      }

      // Tratamiento descriptivo
      let tratamientoStr = lote.producto && lote.producto !== 'Ninguno' ? lote.producto : '';
      if (!tratamientoStr && linkedOp?.tratamiento) {
        tratamientoStr = linkedOp.tratamiento;
      }
      if (!tratamientoStr) {
        tratamientoStr = trats.join(', ') || 'Tratamiento Aplicado';
      }

      // Fechas
      const fechaTrat = lote.fechaTratamiento || lote.fechaIngreso || linkedOp?.fechaCreacion || '2026-07-15';
      let fechaVenc = lote.fechaVencimientoTratamiento;

      if (!fechaVenc) {
        const d = new Date(fechaTrat + 'T00:00:00');
        d.setDate(d.getDate() + 90);
        fechaVenc = d.toISOString().split('T')[0];
      }

      // Cálculo de Días Restantes
      const today = new Date(TODAY_STR + 'T00:00:00');
      const venc = new Date(fechaVenc + 'T00:00:00');
      const diffDays = Math.ceil((venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let estadoVencimiento: 'VENCIDO' | 'CRITICO' | 'ATENCION' | 'VIGENTE' = 'VIGENTE';
      if (diffDays <= 0) {
        estadoVencimiento = 'VENCIDO';
      } else if (diffDays <= 15) {
        estadoVencimiento = 'CRITICO';
      } else if (diffDays <= 45) {
        estadoVencimiento = 'ATENCION';
      }

      list.push({
        lote,
        loteNro: lote.loteNro || lote.id,
        cliente: lote.cliente || 'Desconocido',
        especie: lote.especie || 'Sin especificar',
        variedad: lote.variedad || '-',
        tipo: lote.tipo || 'Final',
        stockBolsas: lote.stockBolsas || 0,
        stockKg: lote.stockKg || 0,
        tratamientoStr,
        fechaTratamiento: fechaTrat,
        fechaVencimiento: fechaVenc,
        diasRestantes: diffDays,
        estadoVencimiento,
        ordenProcesoId: lote.ordenProcesoId,
        ordenProcesoNum: linkedOp ? `N° ${linkedOp.numeroOrden}` : (lote.ordenProcesoId ? `N° ${lote.ordenProcesoId}` : undefined),
        ordenProceso: linkedOp
      });
    });

    return list.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [lotes, ordenesProceso]);

  // Opciones dinámicas para el filtro de Órdenes de Proceso
  const opcionesOps = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    const setIds = new Set<string>();

    if (ordenesProceso) {
      ordenesProceso.forEach(op => {
        if (!setIds.has(op.id)) {
          setIds.add(op.id);
          list.push({
            id: op.id,
            label: `OP N° ${op.numeroOrden} (${op.tipoOrden} - ${op.variedad})`
          });
        }
      });
    }

    vencimientoRecords.forEach(r => {
      if (r.ordenProcesoId && !setIds.has(r.ordenProcesoId)) {
        setIds.add(r.ordenProcesoId);
        list.push({
          id: r.ordenProcesoId,
          label: `OP N° ${r.ordenProcesoNum || r.ordenProcesoId}`
        });
      }
    });

    return list;
  }, [ordenesProceso, vencimientoRecords]);

  // Filtrado de Vencimientos
  const filteredVencimientos = useMemo(() => {
    return vencimientoRecords.filter(r => {
      // Especie
      if (vencEspecieFilter !== 'TODAS' && r.especie !== vencEspecieFilter) {
        return false;
      }
      // Orden de Proceso
      if (vencOpFilter === 'CON_OP' && !r.ordenProcesoNum) return false;
      if (vencOpFilter === 'SIN_OP' && r.ordenProcesoNum) return false;
      if (vencOpFilter !== 'TODAS' && vencOpFilter !== 'CON_OP' && vencOpFilter !== 'SIN_OP') {
        const matchOp = r.ordenProcesoId === vencOpFilter ||
                        r.ordenProcesoNum?.includes(vencOpFilter) ||
                        r.ordenProceso?.numeroOrden === vencOpFilter;
        if (!matchOp) return false;
      }
      // Estado
      if (vencEstadoFilter === 'SOLO_VENCIDOS' && r.diasRestantes > 0) return false;
      if (vencEstadoFilter === 'SOLO_CRITICOS' && (r.diasRestantes <= 0 || r.diasRestantes > 15)) return false;
      if (vencEstadoFilter === 'PROXIMOS' && r.diasRestantes > 30) return false;

      // Buscador
      if (vencSearchTerm.trim()) {
        const term = vencSearchTerm.toLowerCase().trim();
        const matchText = r.loteNro.toLowerCase().includes(term) ||
                          r.cliente.toLowerCase().includes(term) ||
                          r.variedad.toLowerCase().includes(term) ||
                          r.especie.toLowerCase().includes(term) ||
                          r.tratamientoStr.toLowerCase().includes(term) ||
                          (r.ordenProcesoNum && r.ordenProcesoNum.toLowerCase().includes(term));
        if (!matchText) return false;
      }

      return true;
    });
  }, [vencimientoRecords, vencEspecieFilter, vencOpFilter, vencEstadoFilter, vencSearchTerm]);

  // Métricas del resumen de Vencimientos
  const totalVencidos = useMemo(() => vencimientoRecords.filter(r => r.diasRestantes <= 0).length, [vencimientoRecords]);
  const totalCriticos = useMemo(() => vencimientoRecords.filter(r => r.diasRestantes > 0 && r.diasRestantes <= 15).length, [vencimientoRecords]);
  const totalConOp = useMemo(() => vencimientoRecords.filter(r => Boolean(r.ordenProcesoNum)).length, [vencimientoRecords]);

  // Paginación Vencimientos
  const vencTotalPages = Math.ceil(filteredVencimientos.length / vencItemsPerPage) || 1;
  const paginatedVencimientos = useMemo(() => {
    const start = (vencCurrentPage - 1) * vencItemsPerPage;
    return filteredVencimientos.slice(start, start + vencItemsPerPage);
  }, [filteredVencimientos, vencCurrentPage, vencItemsPerPage]);

  const handleExportVencimientosExcel = () => {
    const dataToExport = filteredVencimientos.map(r => ({
      'N° Lote': r.loteNro,
      'Cliente': r.cliente,
      'Especie': r.especie,
      'Variedad': r.variedad,
      'OP Vinculada': r.ordenProcesoNum || 'Sin OP',
      'Tratamiento Aplicado': r.tratamientoStr,
      'Bolsas Stock': r.stockBolsas,
      'Kg Stock': r.stockKg,
      'Fecha Tratamiento': r.fechaTratamiento,
      'Fecha Vencimiento': r.fechaVencimiento,
      'Días Restantes': r.diasRestantes,
      'Estado Vencimiento': r.estadoVencimiento
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proximos Vencimientos');
    XLSX.writeFile(workbook, `Vencimientos_Tratamientos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 1. Transformar lotes existentes en registros de eventos de Producción
  const productionRecords: ProductionRecord[] = useMemo(() => {
    return lotes.map((lote) => {
      // Calcular volumen producido a partir de movimientos de Entrada o saldo original
      const entradas = lote.historial?.filter(m => m.tipo.startsWith('Entrada')) || [];
      const salidas = lote.historial?.filter(m => m.tipo === 'Salida') || [];

      let bolsasProducidas = 0;
      let kgProducidos = 0;

      if (entradas.length > 0) {
        bolsasProducidas = entradas.reduce((sum, m) => sum + (m.cantidadBolsas || 0), 0);
        kgProducidos = entradas.reduce((sum, m) => sum + (m.cantidadKg || 0), 0);
      } else {
        // Fallback: bolsas actuales + bolsas despachadas (salidas)
        const bolsasSalidas = salidas.reduce((sum, m) => sum + (m.cantidadBolsas || 0), 0);
        bolsasProducidas = lote.stockBolsas + bolsasSalidas;
        kgProducidos = bolsasProducidas * (lote.kgPorBolsa || 40);
      }

      // Si por alguna razón dio 0, tomamos el stockKg actual como mínimo producido
      if (kgProducidos === 0 && lote.stockKg > 0) {
        kgProducidos = lote.stockKg;
        bolsasProducidas = lote.stockBolsas;
      }

      // Tratamientos
      const trats = Array.isArray(lote.tratamiento) ? lote.tratamiento : [lote.tratamiento || 'Sin Tratar'];
      const tratamientoStr = trats.join(', ');

      // Normalizar Cliente
      let clientName = lote.cliente?.trim() || 'Desconocido';
      const upperClient = clientName.toUpperCase();
      if (upperClient === 'SAN DIEGO' || upperClient === 'SAN DIEGO SEMILLAS') {
        clientName = 'San Diego Semilla';
      }

      // Fecha de producción (fechaIngreso)
      const fechaProduccion = lote.fechaIngreso || (entradas[0]?.fecha) || '2026-07-13';

      return {
        id: lote.id,
        loteNro: lote.loteNro || lote.id,
        fechaProduccion,
        cliente: clientName,
        especie: lote.especie || 'Sin especificar',
        variedad: lote.variedad || 'Desconocida',
        categoria: lote.categoria || 'Original',
        tipo: lote.tipo || 'Final',
        tratamientos: trats,
        tratamientoStr,
        bolsasProducidas,
        kgProducidos,
        kgPorBolsa: lote.kgPorBolsa || 40
      };
    });
  }, [lotes]);

  // 2. Extraer opciones dinámicas para cada dimensión de filtro
  const opcionesClientes = useMemo(() => {
    const set = new Set<string>();
    productionRecords.forEach(r => { if (r.cliente) set.add(r.cliente); });
    return Array.from(set).sort();
  }, [productionRecords]);

  const opcionesEspecies = useMemo(() => {
    const set = new Set<string>();
    productionRecords.forEach(r => { if (r.especie) set.add(r.especie); });
    return Array.from(set).sort();
  }, [productionRecords]);

  const opcionesVariedades = useMemo(() => {
    const set = new Set<string>();
    productionRecords.forEach(r => { if (r.variedad) set.add(r.variedad); });
    return Array.from(set).sort();
  }, [productionRecords]);

  const opcionesCategorias = useMemo(() => {
    const set = new Set<string>();
    productionRecords.forEach(r => { if (r.categoria) set.add(r.categoria); });
    return Array.from(set).sort();
  }, [productionRecords]);

  const opcionesTipos = useMemo(() => {
    const set = new Set<string>();
    productionRecords.forEach(r => { if (r.tipo) set.add(r.tipo); });
    return Array.from(set).sort();
  }, [productionRecords]);

  const opcionesTratamientos = useMemo(() => {
    const set = new Set<string>();
    productionRecords.forEach(r => {
      r.tratamientos.forEach(t => set.add(t));
    });
    return Array.from(set).sort();
  }, [productionRecords]);

  // 3. Estados de Filtros Multi-Select
  const [selectedEspecies, setSelectedEspecies] = useState<string[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedVariedades, setSelectedVariedades] = useState<string[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [selectedTratamientos, setSelectedTratamientos] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Estado de Agrupación para Gráfico Principal
  const [groupByField, setGroupByField] = useState<'cliente' | 'especie' | 'variedad' | 'categoria' | 'tipo' | 'tratamientoStr'>('cliente');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // Estado para la tabla de detalle
  const [tableSearch, setTableSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // 4. Lógica de Filtrado Combinado (AND entre dimensiones, OR dentro de cada dimensión)
  const filteredRecords = useMemo(() => {
    return productionRecords.filter((record) => {
      // Especie
      if (selectedEspecies.length > 0 && !selectedEspecies.includes(record.especie)) {
        return false;
      }
      // Cliente
      if (selectedClientes.length > 0 && !selectedClientes.includes(record.cliente)) {
        return false;
      }
      // Variedad
      if (selectedVariedades.length > 0 && !selectedVariedades.includes(record.variedad)) {
        return false;
      }
      // Categoría
      if (selectedCategorias.length > 0 && !selectedCategorias.includes(record.categoria)) {
        return false;
      }
      // Tipo
      if (selectedTipos.length > 0 && !selectedTipos.includes(record.tipo)) {
        return false;
      }
      // Tratamiento
      if (selectedTratamientos.length > 0) {
        const hasMatchingTreatment = selectedTratamientos.some(t =>
          record.tratamientos.includes(t) || record.tratamientoStr.includes(t)
        );
        if (!hasMatchingTreatment) return false;
      }
      // Rango de fechas
      if (fechaDesde && record.fechaProduccion < fechaDesde) {
        return false;
      }
      if (fechaHasta && record.fechaProduccion > fechaHasta) {
        return false;
      }

      return true;
    });
  }, [
    productionRecords,
    selectedEspecies,
    selectedClientes,
    selectedVariedades,
    selectedCategorias,
    selectedTipos,
    selectedTratamientos,
    fechaDesde,
    fechaHasta
  ]);

  // Reset de Filtros
  const handleResetFilters = () => {
    setSelectedEspecies([]);
    setSelectedClientes([]);
    setSelectedVariedades([]);
    setSelectedCategorias([]);
    setSelectedTipos([]);
    setSelectedTratamientos([]);
    setFechaDesde('');
    setFechaHasta('');
    setTableSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedEspecies.length > 0 ||
    selectedClientes.length > 0 ||
    selectedVariedades.length > 0 ||
    selectedCategorias.length > 0 ||
    selectedTipos.length > 0 ||
    selectedTratamientos.length > 0 ||
    Boolean(fechaDesde) ||
    Boolean(fechaHasta);

  // 5. Totales e Indicadores Agregados
  const totalKg = useMemo(() => filteredRecords.reduce((acc, r) => acc + r.kgProducidos, 0), [filteredRecords]);
  const totalBolsas = useMemo(() => filteredRecords.reduce((acc, r) => acc + r.bolsasProducidas, 0), [filteredRecords]);
  const totalLotes = filteredRecords.length;
  const promedioKgLote = totalLotes > 0 ? Math.round(totalKg / totalLotes) : 0;
  const totalToneladas = (totalKg / 1000).toFixed(1);

  // Proporción de Producción Tratada
  const totalKgTratado = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      const isTratado = r.tratamientos.some(t => String(t).toLowerCase() === 'tratado' || (t && t !== 'Sin Tratar' && t !== 'Sin Tratamiento')) ||
                        Boolean(r.tratamientoStr && !['Sin Tratar', 'Sin Tratamiento', 'Ninguno', ''].includes(r.tratamientoStr));
      return isTratado ? acc + r.kgProducidos : acc;
    }, 0);
  }, [filteredRecords]);

  const totalKgSinTratar = totalKg - totalKgTratado;
  const pctProduccionTratada = totalKg > 0 ? Math.round((totalKgTratado / totalKg) * 100) : 0;
  const pctProduccionSinTratar = totalKg > 0 ? (100 - pctProduccionTratada) : 0;

  // 6. Datos Agrupados para el Gráfico Principal
  const groupedChartData = useMemo(() => {
    const map = new Map<string, { name: string; kgProducidos: number; bolsasProducidas: number; lotesCount: number }>();

    filteredRecords.forEach((r) => {
      let key = '';
      if (groupByField === 'cliente') key = r.cliente;
      else if (groupByField === 'especie') key = r.especie;
      else if (groupByField === 'variedad') key = r.variedad;
      else if (groupByField === 'categoria') key = r.categoria;
      else if (groupByField === 'tipo') key = r.tipo;
      else if (groupByField === 'tratamientoStr') key = r.tratamientoStr;

      if (!key) key = 'Sin clasificar';

      const existing = map.get(key) || { name: key, kgProducidos: 0, bolsasProducidas: 0, lotesCount: 0 };
      existing.kgProducidos += r.kgProducidos;
      existing.bolsasProducidas += r.bolsasProducidas;
      existing.lotesCount += 1;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.kgProducidos - a.kgProducidos);
  }, [filteredRecords, groupByField]);

  // 7. Datos de Evolución Temporal de Producción
  const timeChartData = useMemo(() => {
    const map = new Map<string, { fecha: string; kg: number; bolsas: number }>();

    filteredRecords.forEach((r) => {
      const dateKey = r.fechaProduccion || 'Sin Fecha';
      const existing = map.get(dateKey) || { fecha: dateKey, kg: 0, bolsas: 0 };
      existing.kg += r.kgProducidos;
      existing.bolsas += r.bolsasProducidas;
      map.set(dateKey, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [filteredRecords]);

  // 8. Filtrado por texto para la tabla
  const tableFilteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return filteredRecords;
    const term = tableSearch.toLowerCase().trim();
    return filteredRecords.filter(r =>
      r.loteNro.toLowerCase().includes(term) ||
      r.cliente.toLowerCase().includes(term) ||
      r.especie.toLowerCase().includes(term) ||
      r.variedad.toLowerCase().includes(term) ||
      r.categoria.toLowerCase().includes(term) ||
      r.tipo.toLowerCase().includes(term) ||
      r.tratamientoStr.toLowerCase().includes(term)
    );
  }, [filteredRecords, tableSearch]);

  // Paginación
  const totalPages = Math.ceil(tableFilteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableFilteredRecords.slice(start, start + itemsPerPage);
  }, [tableFilteredRecords, currentPage, itemsPerPage]);

  // 9. Funciones de Exportación
  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(r => ({
      'N° Lote': r.loteNro,
      'Fecha Producción': r.fechaProduccion,
      'Cliente': r.cliente,
      'Especie': r.especie,
      'Variedad': r.variedad,
      'Categoría': r.categoria,
      'Tipo Lote': r.tipo,
      'Tratamiento': r.tratamientoStr,
      'Bolsas Producidas': r.bolsasProducidas,
      'Peso por Bolsa (kg)': r.kgPorBolsa,
      'Kilogramos Producidos (kg)': r.kgProducidos,
      'Toneladas (Tn)': (r.kgProducidos / 1000).toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Producción');

    // Auto-ajustar ancho de columnas
    const max_width = dataToExport.reduce((w, r) => {
      return Object.keys(r).map((k, i) => Math.max(w[i] || 10, String(k).length, String((r as any)[k]).length));
    }, [] as number[]);
    worksheet['!cols'] = max_width.map(w => ({ wch: w + 3 }));

    XLSX.writeFile(workbook, `Reporte_Produccion_AgroAbacus_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCSV = () => {
    const headers = ['N° Lote', 'Fecha Produccion', 'Cliente', 'Especie', 'Variedad', 'Categoria', 'Tipo Lote', 'Tratamiento', 'Bolsas Producidas', 'Kg Producidos', 'Toneladas'];
    const rows = filteredRecords.map(r => [
      `"${r.loteNro}"`,
      `"${r.fechaProduccion}"`,
      `"${r.cliente}"`,
      `"${r.especie}"`,
      `"${r.variedad}"`,
      `"${r.categoria}"`,
      `"${r.tipo}"`,
      `"${r.tratamientoStr}"`,
      r.bolsasProducidas,
      r.kgProducidos,
      (r.kgProducidos / 1000).toFixed(2)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Produccion_Filtrada_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* HEADER DE LA VISTA */}
      <div className="bg-gradient-to-r from-[#00603C] to-[#254731] text-white p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <Factory className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-[#F6EFDC] text-[#00603C] text-[10px] font-bold uppercase tracking-widest rounded-md">
                Análisis Histórico de Planta
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Factory className="w-8 h-8 text-[#C9922E]" />
              Dashboard de Producción
            </h1>
            <p className="text-emerald-100 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Consolidado de eventos de producción acumulados a partir de los registros de altas de lotes. Filtre por múltiples variables simultáneamente y analice volúmenes históricos.
            </p>
          </div>

          {/* Botones de Exportación */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#C9922E] hover:bg-[#b07d22] text-white text-xs font-bold rounded-xl shadow-md transition transform active:scale-95"
              title="Descargar archivo Excel .xlsx con los lotes filtrados"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition border border-white/20"
              title="Descargar archivo .CSV con el detalle filtrado"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE FILTROS MULTI-SELECT COMBINABLES */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#00603C]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">
              Filtros Multivariable de Producción
            </h2>
            <span className="text-[11px] text-gray-500 font-normal">
              (Multi-selección OR dentro de cada campo, combinación AND entre campos)
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>

        {/* Grid de Selectores Múltiples */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MultiSelectDropdown
            label="Especie"
            icon={<Boxes className="w-3.5 h-3.5" />}
            options={opcionesEspecies}
            selectedValues={selectedEspecies}
            onChange={setSelectedEspecies}
          />

          <MultiSelectDropdown
            label="Cliente"
            icon={<Factory className="w-3.5 h-3.5" />}
            options={opcionesClientes}
            selectedValues={selectedClientes}
            onChange={setSelectedClientes}
          />

          <MultiSelectDropdown
            label="Variedad"
            icon={<Layers className="w-3.5 h-3.5" />}
            options={opcionesVariedades}
            selectedValues={selectedVariedades}
            onChange={setSelectedVariedades}
          />

          <MultiSelectDropdown
            label="Categoría"
            options={opcionesCategorias}
            selectedValues={selectedCategorias}
            onChange={setSelectedCategorias}
          />

          <MultiSelectDropdown
            label="Tipo Lote"
            options={opcionesTipos}
            selectedValues={selectedTipos}
            onChange={setSelectedTipos}
          />

          <MultiSelectDropdown
            label="Tratamiento"
            options={opcionesTratamientos}
            selectedValues={selectedTratamientos}
            onChange={setSelectedTratamientos}
          />
        </div>

        {/* Filtro de Rango de Fechas de Producción */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-gray-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-[#00603C]" />
              Fecha de Producción:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-gray-500 text-[11px]">Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-500 text-[11px]">Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              />
            </div>
          </div>

          <div className="text-[11px] text-gray-500 italic">
            Registros evaluados: <strong className="text-gray-800 font-mono font-bold">{filteredRecords.length}</strong> de {productionRecords.length}
          </div>
        </div>

        {/* Barra Visual de Filtros Activos (Chips / Badges) */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Filtros Activos:</span>
            
            {selectedEspecies.map(val => (
              <span key={`esp-${val}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E3EFE7] text-[#00603C] font-bold rounded-lg text-[11px]">
                Especie: {val}
                <button onClick={() => setSelectedEspecies(selectedEspecies.filter(v => v !== val))} className="hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedClientes.map(val => (
              <span key={`cli-${val}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E3EFE7] text-[#00603C] font-bold rounded-lg text-[11px]">
                Cliente: {val}
                <button onClick={() => setSelectedClientes(selectedClientes.filter(v => v !== val))} className="hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedVariedades.map(val => (
              <span key={`var-${val}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-[#C9922E] font-bold rounded-lg text-[11px] border border-amber-200">
                Variedad: {val}
                <button onClick={() => setSelectedVariedades(selectedVariedades.filter(v => v !== val))} className="hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedCategorias.map(val => (
              <span key={`cat-${val}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-800 font-bold rounded-lg text-[11px]">
                Categoría: {val}
                <button onClick={() => setSelectedCategorias(selectedCategorias.filter(v => v !== val))} className="hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedTipos.map(val => (
              <span key={`tipo-${val}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-800 font-bold rounded-lg text-[11px]">
                Tipo: {val}
                <button onClick={() => setSelectedTipos(selectedTipos.filter(v => v !== val))} className="hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedTratamientos.map(val => (
              <span key={`trat-${val}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5E5DC] text-[#A0522D] font-bold rounded-lg text-[11px]">
                Tratamiento: {val}
                <button onClick={() => setSelectedTratamientos(selectedTratamientos.filter(v => v !== val))} className="hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {fechaDesde && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg text-[11px]">
                Desde: {fechaDesde}
                <button onClick={() => setFechaDesde('')} className="hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {fechaHasta && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg text-[11px]">
                Hasta: {fechaHasta}
                <button onClick={() => setFechaHasta('')} className="hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* KPI CARDS RESUMEN DE PRODUCCIÓN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Kilogramos */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Volumen Producido</span>
            <div className="p-2 bg-[#E3EFE7] rounded-xl text-[#00603C]">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl md:text-3xl font-bold text-[#00603C]">
              {formatNumberArg(totalKg, 0)}
            </span>
            <span className="text-xs font-sans font-medium text-gray-500">kg</span>
          </div>
          <p className="text-[11px] text-[#2E8B57] font-semibold mt-1">
            ≈ {totalToneladas} Toneladas métricas
          </p>
        </div>

        {/* Total Bolsas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bolsas Producidas</span>
            <div className="p-2 bg-amber-50 rounded-xl text-[#C9922E]">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl md:text-3xl font-bold text-[#C9922E]">
              {formatNumberArg(totalBolsas, 0)}
            </span>
            <span className="text-xs font-sans font-medium text-gray-500">bolsas</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            En lotes filtrados activos
          </p>
        </div>

        {/* Eventos de Producción / Lotes */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Lotes Producidos</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-700">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl md:text-3xl font-bold text-gray-900">
              {totalLotes}
            </span>
            <span className="text-xs font-sans font-medium text-gray-500">lotes</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Eventos de alta de producción
          </p>
        </div>

        {/* Promedio Kg por Lote */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Promedio por Lote</span>
            <div className="p-2 bg-[#F5E5DC] rounded-xl text-[#A0522D]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl md:text-3xl font-bold text-[#A0522D]">
              {formatNumberArg(promedioKgLote, 0)}
            </span>
            <span className="text-xs font-sans font-medium text-gray-500">kg/lote</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Volumen promedio procesado
          </p>
        </div>

        {/* Proporción de Producción Tratada */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Producción Tratada</span>
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-2xl md:text-3xl font-bold text-emerald-900">
              {pctProduccionTratada}%
            </span>
            <span className="text-xs font-sans font-semibold text-emerald-700">tratado</span>
          </div>
          
          {/* Barra de Proporción Tratado vs Sin Tratar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2.5 flex">
            <div
              style={{ width: `${pctProduccionTratada}%` }}
              className="bg-emerald-600 h-full transition-all duration-500"
            />
            <div
              style={{ width: `${pctProduccionSinTratar}%` }}
              className="bg-slate-300 h-full transition-all duration-500"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-600 font-semibold mt-1.5">
            <span className="text-emerald-800">{formatNumberArg(totalKgTratado, 0)} kg</span>
            <span className="text-slate-500">{formatNumberArg(totalKgSinTratar, 0)} kg S/T</span>
          </div>
        </div>

      </div>

      {/* SECCIÓN DE GRÁFICOS INTERACTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO PRINCIPAL DE AGRUPACIÓN (2 Cols en Desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00603C]" />
                Distribución de Producción
              </h3>
              <p className="text-[11px] text-gray-500">Visualización de volúmenes agrupados según filtros activos</p>
            </div>

            {/* Controles del Gráfico */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={groupByField}
                onChange={(e) => setGroupByField(e.target.value as any)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00603C]"
              >
                <option value="cliente">Por Cliente</option>
                <option value="especie">Por Especie</option>
                <option value="variedad">Por Variedad</option>
                <option value="categoria">Por Categoría</option>
                <option value="tipo">Por Tipo Lote</option>
                <option value="tratamientoStr">Por Tratamiento</option>
              </select>

              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 rounded-md transition ${chartType === 'bar' ? 'bg-white shadow-xs text-[#00603C]' : 'text-gray-500'}`}
                  title="Gráfico de Barras"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('pie')}
                  className={`p-1.5 rounded-md transition ${chartType === 'pie' ? 'bg-white shadow-xs text-[#00603C]' : 'text-gray-500'}`}
                  title="Gráfico de Torta"
                >
                  <PieChartIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Renderizado de Recharts */}
          <div className="h-72 w-full pt-2">
            {groupedChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                No hay datos de producción para los filtros seleccionados
              </div>
            ) : chartType === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#4B5563' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#4B5563' }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k kg`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="kgProducidos" radius={[6, 6, 0, 0]}>
                    {groupedChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groupedChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="kgProducidos"
                    nameKey="name"
                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {groupedChartData.map((_, index) => (
                      <Cell key={`pie-cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* EVOLUCIÓN TEMPORAL DE PRODUCCIÓN (1 Col) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C9922E]" />
              Evolución Temporal
            </h3>
            <p className="text-[11px] text-gray-500">Acumulado de producción por fechas</p>
          </div>

          <div className="h-72 w-full pt-2">
            {timeChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                Sin registros temporales
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00603C" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00603C" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#4B5563' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#4B5563' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="kg" stroke="#00603C" strokeWidth={2.5} fillOpacity={1} fill="url(#colorKg)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>



      {/* TABLA DETALLE DE LOTES DE PRODUCCIÓN */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Factory className="w-4 h-4 text-[#00603C]" />
              Detalle Consolidado de Eventos de Producción
            </h3>
            <p className="text-[11px] text-gray-500">
              Listado de lotes producidos matching con los {hasActiveFilters ? 'filtros activos' : 'todos los registros'}
            </p>
          </div>

          {/* Búsqueda dentro de la tabla */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Buscar lote, cliente, especie..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00603C]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Tabla Responsive */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#E3EFE7] text-[#00603C] uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha Prod.</th>
                <th className="py-3 px-4">N° Lote</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Especie</th>
                <th className="py-3 px-4">Variedad</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Tratamiento</th>
                <th className="py-3 px-4 text-right">Bolsas</th>
                <th className="py-3 px-4 text-right">Kg Producidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400 italic">
                    No se encontraron registros de producción para la búsqueda realizada.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => (
                  <tr key={`${r.id}-${idx}`} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-gray-600 whitespace-nowrap">
                      {r.fechaProduccion}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                      {r.loteNro}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#00603C]">
                      {r.cliente}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {r.especie}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700">
                      {r.variedad}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-bold rounded-md">
                        {r.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md">
                        {r.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-gray-600 max-w-xs truncate">
                      {r.tratamientoStr}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-800">
                      {formatNumberArg(r.bolsasProducidas, 0)} b.
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#00603C]">
                      {formatNumberArg(r.kgProducidos, 0)} kg
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
            <span>
              Página <strong className="text-gray-900">{currentPage}</strong> de <strong className="text-gray-900">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 font-bold rounded-lg transition"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 bg-[#00603C] hover:bg-[#254731] text-white disabled:opacity-50 font-bold rounded-lg transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
