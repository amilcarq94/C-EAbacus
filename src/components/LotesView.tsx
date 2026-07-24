/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Lote, EstadoLoteType, TipoLoteType } from '../types';
import { formatNumberArg, formatKg, formatDateStr } from '../utils/formatters';
import { Search, Grid, List, Plus, Filter, Eye, Edit2, ArrowDownRight, Trash2, QrCode, Download, Lock, ShieldAlert, KeyRound, X, Flame, Warehouse, Layers, Info, SlidersHorizontal, Check, Pin, RotateCcw, ChevronDown, Package } from 'lucide-react';
import { QrCodeModal } from './QrCodeModal';

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (newSelected: string[]) => void;
  getOptionCount?: (opt: string) => number;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  label,
  options,
  selectedValues,
  onChange,
  getOptionCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!filterQuery.trim()) return options;
    return options.filter(opt => opt.toLowerCase().includes(filterQuery.toLowerCase()));
  }, [options, filterQuery]);

  const isAllSelected = options.length > 0 && selectedValues.length === options.length;

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const displayButtonText = useMemo(() => {
    if (selectedValues.length === 0) return `${label}: Todos`;
    if (selectedValues.length === 1) return `${label}: ${selectedValues[0]}`;
    return `${label}: ${selectedValues.length} sel.`;
  }, [label, selectedValues]);

  return (
    <div className="relative" id={`container-${id}`}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-xs rounded-xl border transition-all flex items-center justify-between h-10 font-medium cursor-pointer ${
          selectedValues.length > 0
            ? 'bg-[#E3EFE7] text-[#00603C] border-[#00603C]/40 font-bold shadow-2xs'
            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className="truncate pr-1">{displayButtonText}</span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <span className="bg-[#00603C] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {selectedValues.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-60 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-40 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-100">
              <span className="text-[11px] font-bold text-[#00603C] uppercase tracking-wider">{label}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-[#00603C] hover:underline cursor-pointer"
                >
                  {isAllSelected ? 'Ninguno' : 'Todos'}
                </button>
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {options.length > 5 && (
              <div className="mb-2">
                <input
                  type="text"
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00603C]"
                />
              </div>
            )}

            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="text-[11px] text-gray-400 py-2 text-center">Sin opciones</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedValues.includes(opt);
                  const count = getOptionCount ? getOptionCount(opt) : undefined;
                  return (
                    <label
                      key={opt}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                        isChecked ? 'bg-[#E3EFE7]/60 font-semibold text-[#00603C]' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOption(opt)}
                          className="w-3.5 h-3.5 rounded text-[#00603C] focus:ring-[#00603C] cursor-pointer"
                        />
                        <span className="truncate">{opt}</span>
                      </div>
                      {count !== undefined && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isChecked ? 'bg-[#00603C] text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {count}
                        </span>
                      )}
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

interface LotesViewProps {
  lotes: Lote[];
  onSelectLote: (lote: Lote) => void;
  onEditLote: (lote: Lote) => void;
  onAddLote: () => void;
  onRegistrarSalidaLote: (lote: Lote) => void;
  onDeleteLote: (id: string) => void;
  onDeleteMultipleLotes: (ids: string[]) => void;
  currentUser: { nombre: string; rol: string };
  onWipeStocks: () => Promise<void>;
}

export const LotesView: React.FC<LotesViewProps> = ({
  lotes,
  onSelectLote,
  onEditLote,
  onAddLote,
  onRegistrarSalidaLote,
  onDeleteLote,
  onDeleteMultipleLotes,
  currentUser,
  onWipeStocks,
}) => {
  // Constante para almacenamiento persistente del filtro fijado
  const PIN_STORAGE_KEY = 'agroabacus_pinned_lotes_filters_v2';

  // Cargar estado inicial fijado desde localStorage
  const getInitialFilterState = () => {
    try {
      const saved = localStorage.getItem(PIN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          isPinned: Boolean(parsed.isPinned),
          search: typeof parsed.search === 'string' ? parsed.search : '',
          filterClientes: Array.isArray(parsed.filterClientes) ? parsed.filterClientes : [],
          filterEspecies: Array.isArray(parsed.filterEspecies) ? parsed.filterEspecies : [],
          filterTipos: Array.isArray(parsed.filterTipos) ? parsed.filterTipos : [],
          filterCategorias: Array.isArray(parsed.filterCategorias) ? parsed.filterCategorias : [],
          filterTratamientos: Array.isArray(parsed.filterTratamientos) ? parsed.filterTratamientos : [],
          filterEstados: Array.isArray(parsed.filterEstados) ? parsed.filterEstados : [],
          filterAlas: Array.isArray(parsed.filterAlas) ? parsed.filterAlas : [],
          filterSectores: Array.isArray(parsed.filterSectores) ? parsed.filterSectores : [],
        };
      }
    } catch (e) {
      console.error('Error al cargar filtros fijados:', e);
    }
    return {
      isPinned: false,
      search: '',
      filterClientes: [],
      filterEspecies: [],
      filterTipos: [],
      filterCategorias: [],
      filterTratamientos: [],
      filterEstados: [],
      filterAlas: [],
      filterSectores: [],
    };
  };

  const initialFilters = useMemo(() => getInitialFilterState(), []);

  // Estados para búsqueda y filtrado múltiple
  const [search, setSearch] = useState<string>(initialFilters.search);
  const [filterClientes, setFilterClientes] = useState<string[]>(initialFilters.filterClientes);
  const [filterEspecies, setFilterEspecies] = useState<string[]>(initialFilters.filterEspecies);
  const [filterTipos, setFilterTipos] = useState<string[]>(initialFilters.filterTipos);
  const [filterCategorias, setFilterCategorias] = useState<string[]>(initialFilters.filterCategorias);
  const [filterTratamientos, setFilterTratamientos] = useState<string[]>(initialFilters.filterTratamientos);
  const [filterEstados, setFilterEstados] = useState<string[]>(initialFilters.filterEstados);
  const [filterAlas, setFilterAlas] = useState<string[]>(initialFilters.filterAlas);
  const [filterSectores, setFilterSectores] = useState<string[]>(initialFilters.filterSectores);
  const [isFilterPinned, setIsFilterPinned] = useState<boolean>(initialFilters.isPinned);

  const [selectedQrLote, setSelectedQrLote] = useState<Lote | null>(null);
  
  // Estado para selección de múltiples lotes
  const [selectedLoteIds, setSelectedLoteIds] = useState<string[]>([]);
  
  // Estado para tipo de vista (tarjetas, tabla o mapa de calor)
  const [viewType, setViewType] = useState<'grid' | 'table' | 'heatmap'>('grid');
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ ala: string; sector: string } | null>(null);

  // Estado para las columnas visibles en la vista de tabla
  const [visibleColumns, setVisibleColumns] = useState({
    loteId: true,
    cliente: true,
    especieVariedad: true,
    tipo: true,
    tratamiento: true,
    bolsas: true,
    kilogramos: true,
    estado: true,
    ubicacion: true,
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Estados para el borrado de stocks (Amilcar Quiroz)
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [wipeError, setWipeError] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  // Estado para la confirmación de borrado de un lote individual
  const [loteToDelete, setLoteToDelete] = useState<Lote | null>(null);

  // Guardar en localStorage cuando se fija o cuando cambian los filtros estando fijados
  useEffect(() => {
    if (isFilterPinned) {
      const stateToSave = {
        isPinned: true,
        search,
        filterClientes,
        filterEspecies,
        filterTipos,
        filterCategorias,
        filterTratamientos,
        filterEstados,
        filterAlas,
        filterSectores,
      };
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(stateToSave));
    } else {
      localStorage.removeItem(PIN_STORAGE_KEY);
    }
  }, [
    isFilterPinned,
    search,
    filterClientes,
    filterEspecies,
    filterTipos,
    filterCategorias,
    filterTratamientos,
    filterEstados,
    filterAlas,
    filterSectores,
  ]);

  const handleTogglePinFilter = () => {
    setIsFilterPinned(prev => !prev);
  };

  const handleClearAllFilters = () => {
    setSearch('');
    setFilterClientes([]);
    setFilterEspecies([]);
    setFilterTipos([]);
    setFilterCategorias([]);
    setFilterTratamientos([]);
    setFilterEstados([]);
    setFilterAlas([]);
    setFilterSectores([]);
  };

  const activeFiltersCount =
    (search ? 1 : 0) +
    filterClientes.length +
    filterEspecies.length +
    filterTipos.length +
    filterCategorias.length +
    filterTratamientos.length +
    filterEstados.length +
    filterAlas.length +
    filterSectores.length;

  const hasActiveFilters = activeFiltersCount > 0;

  // Helper para alternar selección individual
  const toggleSelectLote = (id: string) => {
    setSelectedLoteIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Helper para eliminación masiva
  const handleBulkDelete = () => {
    if (selectedLoteIds.length === 0) return;
    if (window.confirm(`¿Seguro que desea eliminar los ${selectedLoteIds.length} lotes seleccionados? Esta operación es irreversible.`)) {
      onDeleteMultipleLotes(selectedLoteIds);
      setSelectedLoteIds([]);
    }
  };

  // Normalizar para chequear si es Amilcar Quiroz (con/sin acentos)
  const isAmilcar = currentUser?.nombre?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("amilcar quiroz");

  // Opciones disponibles para cada filtro (extraídas dinámicamente)
  const clientesDisponibles = useMemo(() => {
    const base = ['San Diego Semilla', 'Eco Rural', 'Pampa', 'Stine', 'Elementa Foods'];
    const fromLotes = lotes.map(l => {
      const c = l.cliente || '';
      const upper = c.toUpperCase().trim();
      if (upper === 'SAN DIEGO' || upper === 'SAN DIEGO SEMILLAS') return 'San Diego Semilla';
      return c;
    }).filter(Boolean);
    return Array.from(new Set([...base, ...fromLotes]))
      .filter(c => c !== 'San Diego' && c !== 'San Diego Semillas')
      .sort();
  }, [lotes]);

  const especiesDisponibles = useMemo(() => {
    const fromLotes = lotes.map(l => l.especie).filter(Boolean) as string[];
    return Array.from(new Set(fromLotes)).sort();
  }, [lotes]);

  const tiposDisponibles = useMemo(() => ['Intermedio', 'Final'], []);

  const categoriasDisponibles = useMemo(() => {
    const fromLotes = lotes.map(l => l.categoria).filter(Boolean) as string[];
    return Array.from(new Set(fromLotes)).sort();
  }, [lotes]);

  const tratamientosDisponibles = useMemo(() => ['Tratado', 'Sin Tratar'], []);

  const estadosDisponibles = useMemo(() => ['Disponible', 'Reservado', 'A Consumo', 'Agotado'], []);

  const alasDisponibles = useMemo(() => {
    const base = ['A', 'B', 'C', 'D'];
    const fromLotes = lotes.map(l => l.ala).filter(Boolean) as string[];
    return Array.from(new Set([...base, ...fromLotes])).sort();
  }, [lotes]);

  const sectoresDisponibles = useMemo(() => {
    const base = ['1', '2', '3'];
    const fromLotes = lotes.map(l => l.sector).filter(Boolean) as string[];
    return Array.from(new Set([...base, ...fromLotes])).sort();
  }, [lotes]);

  // Lógica de Filtrado Múltiple
  const filteredLotes = useMemo(() => {
    return lotes.filter(l => {
      // 1. Buscador de Texto
      const searchLower = search.trim().toLowerCase();
      const matchSearch =
        !searchLower ||
        (l.cliente || '').toLowerCase().includes(searchLower) ||
        (l.loteNro || '').toLowerCase().includes(searchLower) ||
        (l.id || '').toLowerCase().includes(searchLower) ||
        (l.especie || '').toLowerCase().includes(searchLower) ||
        (l.variedad || '').toLowerCase().includes(searchLower) ||
        (l.producto || '').toLowerCase().includes(searchLower) ||
        (l.categoria || '').toLowerCase().includes(searchLower);

      if (!matchSearch) return false;

      // 2. Cliente (Selección Múltiple)
      const rawCliente = l.cliente || '';
      const upperCliente = rawCliente.toUpperCase().trim();
      const mappedCliente = (upperCliente === 'SAN DIEGO' || upperCliente === 'SAN DIEGO SEMILLAS') ? 'San Diego Semilla' : rawCliente;
      if (filterClientes.length > 0 && !filterClientes.includes(mappedCliente)) {
        return false;
      }

      // 3. Especie (Selección Múltiple)
      const esp = l.especie || 'Sin especificar';
      if (filterEspecies.length > 0 && !filterEspecies.includes(esp)) {
        return false;
      }

      // 4. Tipo de Lote (Selección Múltiple)
      if (filterTipos.length > 0 && !filterTipos.includes(l.tipo)) {
        return false;
      }

      // 5. Categoría (Selección Múltiple)
      const cat = l.categoria || 'PRIMU';
      if (filterCategorias.length > 0 && !filterCategorias.includes(cat)) {
        return false;
      }

      // 6. Tratamiento (Selección Múltiple: Tratado / Sin Tratar)
      if (filterTratamientos.length > 0) {
        const trats = Array.isArray(l.tratamiento) ? l.tratamiento : [l.tratamiento];
        const isTratado = trats.some(t => String(t).toLowerCase() === 'tratado' || (t && t !== 'Sin Tratar' && t !== 'Sin Tratamiento')) ||
                          Boolean(l.producto && !['Ninguno', 'Sin Tratamiento', 'FINAL', 'INTERMEDIO', ''].includes(l.producto));
        const isSinTratar = !isTratado;

        const matchesTratado = filterTratamientos.includes('Tratado') && isTratado;
        const matchesSinTratar = filterTratamientos.includes('Sin Tratar') && isSinTratar;
        const matchesLegacy = l.tratamiento && l.tratamiento.some(t => filterTratamientos.includes(t));

        if (!matchesTratado && !matchesSinTratar && !matchesLegacy) {
          return false;
        }
      }

      // 7. Estado (Selección Múltiple)
      if (filterEstados.length > 0 && !filterEstados.includes(l.estado)) {
        return false;
      }

      // 8. Ala (Selección Múltiple)
      const ala = l.ala || 'Sin asignar';
      if (filterAlas.length > 0 && !filterAlas.includes(ala)) {
        return false;
      }

      // 9. Sector (Selección Múltiple)
      const sector = l.sector || 'Sin asignar';
      if (filterSectores.length > 0 && !filterSectores.includes(sector)) {
        return false;
      }

      return true;
    });
  }, [lotes, search, filterClientes, filterEspecies, filterTipos, filterCategorias, filterTratamientos, filterEstados, filterAlas, filterSectores]);

  // Resumen dinámico de totales de stock agrupado por tipo de envase (kg por bolsa)
  const stockSummaryByEnvase = useMemo(() => {
    const map: Record<number, { kgPorBolsa: number; totalBolsas: number; totalKg: number; countLotes: number }> = {};
    let grandTotalBolsas = 0;
    let grandTotalKg = 0;

    filteredLotes.forEach(lote => {
      const kg = lote.kgPorBolsa || 0;
      const bolsas = lote.stockBolsas || 0;
      const totalKgLote = lote.stockKg !== undefined ? lote.stockKg : (bolsas * kg);

      if (!map[kg]) {
        map[kg] = { kgPorBolsa: kg, totalBolsas: 0, totalKg: 0, countLotes: 0 };
      }
      map[kg].totalBolsas += bolsas;
      map[kg].totalKg += totalKgLote;
      map[kg].countLotes += 1;

      grandTotalBolsas += bolsas;
      grandTotalKg += totalKgLote;
    });

    const groups = Object.values(map).sort((a, b) => a.kgPorBolsa - b.kgPorBolsa);

    return {
      groups,
      grandTotalBolsas,
      grandTotalKg,
      totalLotes: filteredLotes.length,
    };
  }, [filteredLotes]);

  const formatBolsasLabel = (count: number) => {
    const formatted = formatNumberArg(count);
    return count === 1 ? `${formatted} bolsa` : `${formatted} bolsas`;
  };

  const getEstadoBadgeStyle = (estado: EstadoLoteType) => {
    switch (estado) {
      case 'Disponible':
        return 'bg-[#E3EFE7] text-[#00603C] border-[#00603C]';
      case 'Reservado':
        return 'bg-[#F6EFDC] text-[#C9922E] border-[#C9922E]';
      case 'A Consumo':
        return 'bg-purple-100 text-purple-900 border-purple-400';
      case 'Agotado':
        return 'bg-[#A0522D]/10 text-[#A0522D] border-[#A0522D]';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Exportar a Excel (.xlsx) con ORDEN ESTRICTO de 15 columnas
  const handleExportExcel = () => {
    if (filteredLotes.length === 0) return;

    const dataToExport = filteredLotes.map(l => {
      let cliente = l.cliente || 'Sin cliente';
      if (cliente.toUpperCase() === 'SAN DIEGO' || cliente.toUpperCase() === 'SAN DIEGO SEMILLAS') {
        cliente = 'San Diego Semilla';
      }
      const tratamientoStr = (l.tratamiento && l.tratamiento.length > 0)
        ? l.tratamiento.join(', ')
        : 'Sin tratar';

      const alaStr = l.ala ? `ALA ${l.ala}` : 'Sin asignar';
      const sectorStr = l.sector ? `SECTOR ${l.sector}` : 'Sin asignar';
      const ubicacionStr = (l.ala && l.sector) ? `ALA ${l.ala} · SECTOR ${l.sector}` : 'Sin asignar';

      return {
        'Cliente': cliente,
        'Fecha de ingreso': l.fechaIngreso ? formatDateStr(l.fechaIngreso) : '—',
        'Especie': l.especie || 'Sin especificar',
        'Variedad': l.variedad || 'Sin variedad',
        'Stock bolsas': l.stockBolsas,
        'Kg por bolsa': l.kgPorBolsa,
        'Stock total': l.stockKg,
        'Tipo de lote': l.tipo || 'Final',
        'Categoría': l.categoria || 'PRIMU',
        'Tratamiento': tratamientoStr,
        'Producto tratamiento': l.producto || 'Ninguno',
        'Ala acopio': alaStr,
        'Sector acopio': sectorStr,
        'Ubicación acopio': ubicacionStr,
        'Estado': l.estado
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Configurar anchos de columna para lectura clara
    const keys = Object.keys(dataToExport[0] || {});
    const colWidths = keys.map(key => {
      const maxLen = Math.max(
        key.length,
        ...dataToExport.map(row => String((row as any)[key] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lotes Filtrados');
    
    XLSX.writeFile(workbook, `Reporte_Lotes_Filtrados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Exportar CSV delimitado por punto y coma (;) respetando exactamente las 15 columnas
  const handleExportCSV = () => {
    if (filteredLotes.length === 0) return;

    const headers = [
      'Cliente',
      'Fecha de ingreso',
      'Especie',
      'Variedad',
      'Stock bolsas',
      'Kg por bolsa',
      'Stock total',
      'Tipo de lote',
      'Categoría',
      'Tratamiento',
      'Producto tratamiento',
      'Ala acopio',
      'Sector acopio',
      'Ubicación acopio',
      'Estado'
    ];

    const rows = filteredLotes.map(l => {
      let cliente = l.cliente || 'Sin cliente';
      if (cliente.toUpperCase() === 'SAN DIEGO' || cliente.toUpperCase() === 'SAN DIEGO SEMILLAS') {
        cliente = 'San Diego Semilla';
      }
      const tratamientoStr = (l.tratamiento && l.tratamiento.length > 0)
        ? l.tratamiento.join(', ')
        : 'Sin tratar';

      const alaStr = l.ala ? `ALA ${l.ala}` : 'Sin asignar';
      const sectorStr = l.sector ? `SECTOR ${l.sector}` : 'Sin asignar';
      const ubicacionStr = (l.ala && l.sector) ? `ALA ${l.ala} · SECTOR ${l.sector}` : 'Sin asignar';

      return [
        cliente,
        l.fechaIngreso ? formatDateStr(l.fechaIngreso) : '—',
        l.especie || 'Sin especificar',
        l.variedad || 'Sin variedad',
        l.stockBolsas,
        l.kgPorBolsa,
        l.stockKg,
        l.tipo || 'Final',
        l.categoria || 'PRIMU',
        tratamientoStr,
        l.producto || 'Ninguno',
        alaStr,
        sectorStr,
        ubicacionStr,
        l.estado
      ];
    });

    const csvContent = [
      'sep=;',
      headers.join(';'),
      ...rows.map(row => row.map(val => {
        const str = String(val !== undefined && val !== null ? val : '');
        if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Lotes_Filtrados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calcular Datos del Mapa de Calor para el acopio
  const alas = ['A', 'B', 'C', 'D'];
  const sectores = ['1', '2', '3'];

  const cellsData: Array<{
    ala: string;
    sector: string;
    totalKg: number;
    totalBolsas: number;
    lotesCount: number;
    species: string[];
    lotes: Lote[];
  }> = [];

  for (const a of alas) {
    for (const s of sectores) {
      const cellLotes = lotes.filter(l => l.ala === a && l.sector === s);
      const totalKg = cellLotes.reduce((sum, l) => sum + (l.stockKg || 0), 0);
      const totalBolsas = cellLotes.reduce((sum, l) => sum + (l.stockBolsas || 0), 0);
      const species = Array.from(new Set(cellLotes.map(l => l.especie).filter((e): e is string => typeof e === 'string'))) as string[];
      cellsData.push({
        ala: a,
        sector: s,
        totalKg,
        totalBolsas,
        lotesCount: cellLotes.length,
        species,
        lotes: cellLotes,
      });
    }
  }

  const maxCellKg = Math.max(...cellsData.map(c => c.totalKg), 1);

  return (
    <div className="space-y-6" id="lotes-view-container">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <span className="text-xs font-sans font-semibold tracking-widest text-[#00603C] uppercase">
            MÓDULO DE ACOPIO
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#1A1A1A] mt-1">
            Gestión de Lotes
          </h2>
        </div>

        <div className="flex flex-wrap gap-2.5 self-start sm:self-center">
          {/* Botón Borrar Stocks */}
          <button
            id="btn-borrar-stocks"
            onClick={() => {
              if (isAmilcar) {
                setShowWipeModal(true);
                setWipeError('');
                setWipePassword('');
              }
            }}
            disabled={!isAmilcar}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold font-sans uppercase tracking-wider border rounded-lg transition cursor-pointer ${
              isAmilcar
                ? 'border-red-600 text-red-600 hover:bg-red-50'
                : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
            }`}
            title={
              isAmilcar
                ? "Borrar por completo toda la información y existencias de los lotes"
                : "Función reservada exclusivamente para el usuario Amilcar Quiroz"
            }
          >
            {isAmilcar ? (
              <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
            <span>Borrar Stocks e Información</span>
          </button>

          <div className="flex items-center gap-1.5 bg-[#E3EFE7]/40 p-1 rounded-xl border border-[#00603C]/20">
            <button
              id="btn-exportar-lotes-excel"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold font-sans uppercase tracking-wider bg-[#00603C] text-white hover:bg-[#254731] rounded-lg transition cursor-pointer shadow-2xs"
              title="Descargar archivo de Excel (.xlsx) nativo con datos en celdas individuales"
            >
              <Download className="w-4 h-4 text-[#C9922E]" />
              <span>Exportar a Excel (.xlsx)</span>
            </button>
            <button
              id="btn-exportar-lotes-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold font-sans uppercase tracking-wider text-[#00603C] hover:bg-[#00603C]/10 rounded-lg transition cursor-pointer"
              title="Exportar como CSV (.csv) para hojas de cálculo"
            >
              <span>CSV</span>
            </button>
          </div>

          <button
            id="btn-nuevo-lote-alta"
            onClick={onAddLote}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold font-sans uppercase tracking-wider bg-[#00603C] text-white rounded-lg hover:bg-[#254731] transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 text-[#C9922E]" />
            <span>Registrar Nuevo Lote</span>
            <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 text-[9px] bg-[#254731] text-[#E3EFE7] rounded border border-[#254731] font-mono normal-case">Ctrl+N</kbd>
          </button>
        </div>
      </div>

      {/* Panel de Filtros con Selección Múltiple y Botón Fijar Filtro */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00603C] uppercase tracking-wider">
              <Filter className="w-4 h-4 text-[#00603C]" />
              <span>Filtros de Búsqueda</span>
            </div>

            {/* Badge de Filtro Fijado */}
            {isFilterPinned && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C9922E]/15 text-[#C9922E] border border-[#C9922E]/40 animate-pulse">
                <Pin className="w-3 h-3 fill-[#C9922E]" />
                Filtro Fijado (Persistente)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Fijar / Desfijar Filtro */}
            <button
              id="btn-fijar-filtro-lotes"
              type="button"
              onClick={handleTogglePinFilter}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
                isFilterPinned
                  ? 'bg-[#C9922E] text-white hover:bg-[#a67520] ring-2 ring-[#C9922E]/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-[#00603C] hover:text-white border border-gray-200'
              }`}
              title={
                isFilterPinned
                  ? "El filtro está fijado persistentemente. Haz clic para desfijar."
                  : "Fijar el filtro actualmente aplicado para conservarlo al navegar o recargar"
              }
            >
              <Pin className={`w-3.5 h-3.5 ${isFilterPinned ? 'fill-current' : ''}`} />
              <span>{isFilterPinned ? 'Filtro Fijado' : 'Fijar Filtro'}</span>
            </button>

            {/* Botón Limpiar Filtros */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                title="Restablecer todos los filtros aplicados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid de Controles de Filtrado Múltiple */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
          
          {/* Buscador de Texto */}
          <div className="relative sm:col-span-2 md:col-span-1 lg:col-span-1 xl:col-span-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              id="input-buscador-lotes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#E3EFE7]/30 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] h-10"
              placeholder="Buscar por lote, cliente, etc..."
            />
          </div>

          {/* Filtro Cliente (Multi) */}
          <MultiSelectDropdown
            id="select-filtro-cliente"
            label="Cliente"
            options={clientesDisponibles}
            selectedValues={filterClientes}
            onChange={setFilterClientes}
            getOptionCount={(cl) => lotes.filter(l => {
              const c = l.cliente || '';
              const upper = c.toUpperCase().trim();
              const mapped = (upper === 'SAN DIEGO' || upper === 'SAN DIEGO SEMILLAS') ? 'San Diego Semilla' : c;
              return mapped === cl;
            }).length}
          />

          {/* Filtro Especie (Multi) */}
          <MultiSelectDropdown
            id="select-filtro-especie"
            label="Especie"
            options={especiesDisponibles}
            selectedValues={filterEspecies}
            onChange={setFilterEspecies}
            getOptionCount={(esp) => lotes.filter(l => (l.especie || 'Sin especificar') === esp).length}
          />

          {/* Filtro Tipo (Multi) */}
          <MultiSelectDropdown
            id="select-filtro-tipo"
            label="Tipo"
            options={tiposDisponibles}
            selectedValues={filterTipos}
            onChange={setFilterTipos}
            getOptionCount={(tp) => lotes.filter(l => l.tipo === tp).length}
          />

          {/* Filtro Categoría (Multi) */}
          <MultiSelectDropdown
            id="select-filtro-categoria"
            label="Categoría"
            options={categoriasDisponibles}
            selectedValues={filterCategorias}
            onChange={setFilterCategorias}
            getOptionCount={(cat) => lotes.filter(l => (l.categoria || 'PRIMU') === cat).length}
          />

          {/* Filtro Tratamiento (Multi) */}
          <MultiSelectDropdown
            id="select-filtro-tratamiento"
            label="Tratamiento"
            options={tratamientosDisponibles}
            selectedValues={filterTratamientos}
            onChange={setFilterTratamientos}
          />

          {/* Filtro Estado (Multi) */}
          <MultiSelectDropdown
            id="select-filtro-estado"
            label="Estado"
            options={estadosDisponibles}
            selectedValues={filterEstados}
            onChange={setFilterEstados}
            getOptionCount={(est) => lotes.filter(l => l.estado === est).length}
          />

          {/* Filtro Ala (Multi) */}
          <MultiSelectDropdown
            id="select-filtro-ala"
            label="Ala"
            options={alasDisponibles}
            selectedValues={filterAlas}
            onChange={setFilterAlas}
            getOptionCount={(a) => lotes.filter(l => l.ala === a).length}
          />

          {/* Filtro Sector (Multi) */}
          <MultiSelectDropdown
            id="select-filtro-sector"
            label="Sector"
            options={sectoresDisponibles}
            selectedValues={filterSectores}
            onChange={setFilterSectores}
            getOptionCount={(s) => lotes.filter(l => l.sector === s).length}
          />

        </div>

        {/* Etiquetas de Filtros Activos (Pills) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-50 text-[11px]">
            <span className="font-semibold text-gray-400 mr-1">Filtros activos:</span>

            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                Búsqueda: "{search}"
                <button type="button" onClick={() => setSearch('')} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterClientes.map(cl => (
              <span key={`pill-cl-${cl}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E3EFE7] text-[#00603C] font-semibold">
                Cliente: {cl}
                <button type="button" onClick={() => setFilterClientes(filterClientes.filter(v => v !== cl))} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterEspecies.map(esp => (
              <span key={`pill-esp-${esp}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E3EFE7] text-[#00603C] font-semibold">
                Especie: {esp}
                <button type="button" onClick={() => setFilterEspecies(filterEspecies.filter(v => v !== esp))} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterTipos.map(tp => (
              <span key={`pill-tp-${tp}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                Tipo: {tp}
                <button type="button" onClick={() => setFilterTipos(filterTipos.filter(v => v !== tp))} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterCategorias.map(cat => (
              <span key={`pill-cat-${cat}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                Cat: {cat}
                <button type="button" onClick={() => setFilterCategorias(filterCategorias.filter(v => v !== cat))} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterTratamientos.map(tr => (
              <span key={`pill-tr-${tr}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                Trat: {tr}
                <button type="button" onClick={() => setFilterTratamientos(filterTratamientos.filter(v => v !== tr))} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterEstados.map(est => (
              <span key={`pill-est-${est}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F6EFDC] text-[#C9922E] font-semibold">
                Estado: {est}
                <button type="button" onClick={() => setFilterEstados(filterEstados.filter(v => v !== est))} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterAlas.map(a => (
              <span key={`pill-a-${a}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                Ala {a}
                <button type="button" onClick={() => setFilterAlas(filterAlas.filter(v => v !== a))} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterSectores.map(s => (
              <span key={`pill-s-${s}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                Sector {s}
                <button type="button" onClick={() => setFilterSectores(filterSectores.filter(v => v !== s))} className="hover:text-red-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Cambiar de Vista */}
        <div className="flex justify-between items-center border-t border-gray-50 pt-3 text-xs text-gray-500">
          <div>
            Mostrando <span className="font-semibold text-[#00603C]">{filteredLotes.length}</span> de <span className="font-semibold text-gray-700">{lotes.length}</span> lotes acopiados
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de Columnas (Solo visible en Vista de Tabla) */}
            {viewType === 'table' && (
              <div className="relative" id="column-selector-container">
                <button
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition shadow-2xs font-semibold text-xs cursor-pointer"
                  title="Configurar columnas"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#C9922E]" />
                  <span>Columnas</span>
                </button>

                {showColumnSelector && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowColumnSelector(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-56 bg-white border border-gray-100 rounded-xl shadow-lg p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mostrar Columnas</span>
                        <button 
                          onClick={() => setVisibleColumns({
                            loteId: true,
                            cliente: true,
                            especieVariedad: true,
                            tipo: true,
                            tratamiento: true,
                            bolsas: true,
                            kilogramos: true,
                            estado: true,
                            ubicacion: true,
                          })}
                          className="text-[9px] font-black text-[#00603C] hover:underline cursor-pointer"
                        >
                          Restablecer
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {[
                          { key: 'loteId', label: 'ID Lote / Nro' },
                          { key: 'cliente', label: 'Cliente' },
                          { key: 'especieVariedad', label: 'Especie / Variedad' },
                          { key: 'tipo', label: 'Tipo' },
                          { key: 'tratamiento', label: 'Tratamiento' },
                          { key: 'bolsas', label: 'Bolsas (Stock)' },
                          { key: 'kilogramos', label: 'Kilogramos (Stock)' },
                          { key: 'estado', label: 'Estado' },
                          { key: 'ubicacion', label: 'Sector de Acopio' },
                        ].map(({ key, label }) => (
                          <label 
                            key={key} 
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700 cursor-pointer transition select-none"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns[key as keyof typeof visibleColumns]}
                              onChange={() => setVisibleColumns(prev => ({
                                ...prev,
                                [key]: !prev[key as keyof typeof visibleColumns]
                              }))}
                              className="rounded border-gray-300 text-[#00603C] focus:ring-[#00603C] h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="truncate">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg p-0.5 bg-gray-50">
              <button
                onClick={() => setViewType('grid')}
                className={`p-1.5 rounded-md transition ${viewType === 'grid' ? 'bg-[#00603C] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Vista de Tarjetas"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`p-1.5 rounded-md transition ${viewType === 'table' ? 'bg-[#00603C] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Vista de Tabla"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewType('heatmap')}
                className={`p-1.5 rounded-md transition ${viewType === 'heatmap' ? 'bg-[#00603C] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Mapa de Calor de Acopio"
              >
                <Flame className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de Totales de Stock por Tipo de Envase */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3" id="stock-by-envase-summary-panel">
        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#00603C] uppercase tracking-wider">
            <Package className="w-4.5 h-4.5 text-[#00603C]" />
            <span>Resumen de Stock por Tipo de Envase</span>
            {hasActiveFilters && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full normal-case">
                Resumen Filtrado
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
            <span>Totales acumulados:</span>
            <span className="font-extrabold text-[#00603C] bg-[#E3EFE7] px-2.5 py-0.5 rounded-md font-mono">
              {formatBolsasLabel(stockSummaryByEnvase.grandTotalBolsas)}
            </span>
            <span className="font-extrabold text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-md font-mono">
              {formatKg(stockSummaryByEnvase.grandTotalKg)}
            </span>
          </div>
        </div>

        {stockSummaryByEnvase.groups.length === 0 ? (
          <div className="text-xs text-gray-400 py-4 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            No hay lotes de acopio que coincidan con los filtros aplicados.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {stockSummaryByEnvase.groups.map(group => {
              const envaseTitulo = group.kgPorBolsa > 0 ? `Bolsas de ${group.kgPorBolsa} kg` : 'Sin peso de envase';
              return (
                <div 
                  key={`envase-${group.kgPorBolsa}`}
                  className="bg-gradient-to-br from-[#E3EFE7]/30 to-white p-3.5 rounded-xl border border-[#00603C]/20 hover:border-[#00603C]/50 hover:shadow-2xs transition-all flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center gap-1.5 mb-2">
                    <span className="text-xs font-extrabold text-[#00603C] truncate">
                      {envaseTitulo}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 shrink-0 font-mono">
                      {group.countLotes} {group.countLotes === 1 ? 'lote' : 'lotes'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-gray-500 font-medium">Cantidad:</span>
                      <span className="font-black text-gray-900 font-mono text-sm">
                        {formatBolsasLabel(group.totalBolsas)}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline text-xs border-t border-gray-100/80 pt-1">
                      <span className="text-gray-500 font-medium">Stock Total:</span>
                      <span className="font-black text-[#00603C] font-mono">
                        {formatKg(group.totalKg)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Ficha Resumen Total Acumulado cuando hay más de 1 tipo de envase */}
            {stockSummaryByEnvase.groups.length > 1 && (
              <div className="bg-[#00603C] text-white p-3.5 rounded-xl border border-[#00603C] shadow-2xs flex flex-col justify-between">
                <div className="flex justify-between items-center gap-1.5 mb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Total General
                  </span>
                  <span className="text-[10px] font-bold text-[#00603C] bg-white px-2 py-0.5 rounded-md shrink-0 font-mono">
                    {stockSummaryByEnvase.totalLotes} {stockSummaryByEnvase.totalLotes === 1 ? 'lote' : 'lotes'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-white/80 font-medium">Bolsas Totales:</span>
                    <span className="font-black text-white font-mono text-sm">
                      {formatBolsasLabel(stockSummaryByEnvase.grandTotalBolsas)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs border-t border-white/20 pt-1">
                    <span className="text-white/80 font-medium">Stock Total:</span>
                    <span className="font-black text-white font-mono">
                      {formatKg(stockSummaryByEnvase.grandTotalKg)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de Acciones de Selección Múltiple */}
      {selectedLoteIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 text-xs font-bold text-red-800 uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>{selectedLoteIds.length} lotes seleccionados</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedLoteIds([])}
              className="px-3.5 py-2 text-xs font-semibold font-sans uppercase tracking-wider text-gray-500 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              Despejar Selección
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold font-sans uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Seleccionados</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Estadísticas Resumen */}
      <div className="bg-[#00603C]/5 border border-[#00603C]/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center" id="lotes-stats-summary-bar">
        {/* Total Lotes */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#00603C]/10 text-[#00603C] rounded-lg">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block leading-none mb-0.5">Total Lotes</span>
            <span className="text-sm font-black text-[#00603C] font-mono">
              {filteredLotes.length === lotes.length ? `${lotes.length}` : `${filteredLotes.length} / ${lotes.length}`} Lotes
            </span>
          </div>
        </div>

        {/* Kilos Totales */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#C9922E]/10 text-[#C9922E] rounded-lg">
            <Flame className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block leading-none mb-0.5">Stock Total</span>
            <span className="text-sm font-black text-gray-800 font-mono">
              {formatKg(filteredLotes.reduce((sum, l) => sum + (l.stockKg || 0), 0))}
            </span>
          </div>
        </div>

        {/* Distribución por Ala */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Warehouse className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block leading-none mb-1">Distribución por Ala</span>
            <div className="flex gap-2.5 text-[10px] font-bold text-gray-600">
              {['A', 'B', 'C', 'D'].map(alaChar => {
                const count = filteredLotes.filter(l => l.ala === alaChar).length;
                return (
                  <span key={alaChar} className="bg-white px-1.5 py-0.5 rounded border border-gray-100 shadow-2xs">
                    Ala {alaChar}: <span className="text-[#00603C] font-mono font-extrabold">{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Resultados de Búsqueda */}
      {viewType === 'heatmap' ? (
        /* VISTA MAPA DE CALOR DE ACOPIO */
        <div className="space-y-6" id="heatmap-view-section">
          {/* Tarjetas de Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center gap-4">
              <div className="p-3 bg-[#E3EFE7] text-[#00603C] rounded-xl">
                <Warehouse className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Ocupación de Planta</span>
                <span className="text-lg font-black text-[#00603C] font-mono">
                  {cellsData.filter(c => c.totalKg > 0).length} / 12 <span className="text-xs font-normal text-gray-500">Sectores</span>
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center gap-4">
              <div className="p-3 bg-[#F6EFDC] text-[#C9922E] rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Kg en Acopio</span>
                <span className="text-lg font-black text-gray-800 font-mono">
                  {formatKg(lotes.reduce((sum, l) => sum + (l.stockKg || 0), 0))}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Grid className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Bolsas</span>
                <span className="text-lg font-black text-gray-800 font-mono">
                  {formatNumberArg(lotes.reduce((sum, l) => sum + (l.stockBolsas || 0), 0))} <span className="text-xs font-normal text-gray-500">und</span>
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center gap-4">
              <div className="p-3 bg-[#00603C]/10 text-[#00603C] rounded-xl">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Mayor Concentración</span>
                <span className="text-xs font-bold text-[#00603C] truncate block max-w-[150px] mt-0.5">
                  {(() => {
                    const sortedCells = [...cellsData].sort((a, b) => b.totalKg - a.totalKg);
                    if (sortedCells[0] && sortedCells[0].totalKg > 0) {
                      return `ALA ${sortedCells[0].ala} - SECTOR ${sortedCells[0].sector} (${formatKg(sortedCells[0].totalKg)})`;
                    }
                    return 'Ninguno';
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Grilla Mapa de Calor */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-gray-50">
              <div>
                <h3 className="font-serif text-lg font-extrabold text-gray-800 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#C9922E]" />
                  Distribución Física de Semilla (Mapa de Calor)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visualización de la carga actual de stock en cada una de las naves y celdas del depósito de acopio.
                </p>
              </div>

              {/* Referencia de Intensidad */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-gray-500">
                <span>INTENSIDAD:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-200"></span>
                  <span>Vacío</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#00603C]/10 border border-[#00603C]/20"></span>
                  <span>Bajo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#00603C]/30 border border-[#00603C]/40"></span>
                  <span>Medio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#00603C]/70 border border-[#00603C]"></span>
                  <span>Máximo</span>
                </div>
              </div>
            </div>

            {/* Grid del Depósito */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
              {/* Columna Cabeceras de Ala vacía (solo en pantallas md) */}
              <div className="hidden md:flex flex-col justify-around text-center py-4 text-xs font-black uppercase text-gray-400 font-sans tracking-widest bg-gray-50/50 rounded-2xl border border-gray-100/50 w-full min-h-[350px]">
                <div>Ala A</div>
                <div>Ala B</div>
                <div>Ala C</div>
                <div>Ala D</div>
              </div>

              {/* Los 3 Sectores */}
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sector headers */}
                <div className="sm:col-span-3 grid grid-cols-3 text-center text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                  <div>Sector 1</div>
                  <div>Sector 2</div>
                  <div>Sector 3</div>
                </div>

                {/* Renderizar las celdas en orden de fila (A1, A2, A3, B1...) */}
                {cellsData.map((cell, idx) => (
                  <div key={idx} className="relative">
                    {/* Indicador de Ala para móviles */}
                    <div className="md:hidden block text-[10px] font-bold text-[#00603C] uppercase mb-1 px-1">
                      Ala {cell.ala}
                    </div>
                    
                    <div
                      onClick={() => {
                        if (selectedHeatmapCell && selectedHeatmapCell.ala === cell.ala && selectedHeatmapCell.sector === cell.sector) {
                          setSelectedHeatmapCell(null);
                        } else {
                          setSelectedHeatmapCell({ ala: cell.ala, sector: cell.sector });
                        }
                      }}
                      className={`p-4 rounded-xl border-2 transition duration-200 text-center flex flex-col justify-between h-36 relative select-none ${
                        selectedHeatmapCell && selectedHeatmapCell.ala === cell.ala && selectedHeatmapCell.sector === cell.sector
                          ? 'border-[#C9922E] ring-2 ring-[#C9922E]/20 shadow-md z-10 scale-[1.02]'
                          : 'border-transparent'
                      } ${
                        cell.totalKg === 0
                          ? 'bg-gray-100/60 text-gray-400 border-gray-200/50 hover:bg-gray-200/50'
                          : cell.totalKg / maxCellKg <= 0.25
                          ? 'bg-[#00603C]/5 text-[#00603C] border-[#00603C]/10 hover:bg-[#00603C]/10'
                          : cell.totalKg / maxCellKg <= 0.6
                          ? 'bg-[#00603C]/20 text-[#00603C] border-[#00603C]/30 hover:bg-[#00603C]/25'
                          : 'bg-[#00603C]/70 text-white border-[#00603C]/90 hover:bg-[#00603C]/80 shadow-xs'
                      } cursor-pointer hover:scale-[1.01]`}
                    >
                      {/* Label: ALA & SECTOR */}
                      <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold opacity-80">
                        <span>ALA {cell.ala}</span>
                        <span>SECTOR {cell.sector}</span>
                      </div>

                      {/* Big Number: Kg */}
                      <div className="my-2">
                        <div className="text-sm sm:text-base font-extrabold tracking-tight font-mono leading-none">
                          {formatKg(cell.totalKg)}
                        </div>
                        <div className="text-[10px] font-medium opacity-90 mt-1 leading-none">
                          {formatNumberArg(cell.totalBolsas)} bolsas · {cell.lotesCount} {cell.lotesCount === 1 ? 'lote' : 'lotes'}
                        </div>
                      </div>

                      {/* Especie Pill */}
                      <div className="mt-1 flex justify-center">
                        {cell.totalKg === 0 ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded font-bold uppercase tracking-wider leading-none font-sans">Vacío</span>
                        ) : cell.species.length === 1 ? (
                          <span className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider leading-none truncate max-w-[120px] font-sans ${
                            cell.totalKg / maxCellKg > 0.6 ? 'bg-white text-[#00603C]' : 'bg-[#00603C] text-white'
                          }`}>
                            {cell.species[0] === 'Soja' ? '🌱 Soja' : cell.species[0] === 'Trigo' ? '🌾 Trigo' : cell.species[0] === 'Arveja' ? '🟢 Arveja' : `🌱 ${cell.species[0]}`}
                          </span>
                        ) : (
                          <span className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider leading-none font-sans ${
                            cell.totalKg / maxCellKg > 0.6 ? 'bg-[#C9922E] text-white border border-white' : 'bg-[#C9922E] text-white shadow-xs'
                          }`}>
                            ✨ MULTI ({cell.species.length})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#E3EFE7]/30 border border-[#E3EFE7] rounded-xl flex items-start gap-2.5 text-xs text-emerald-950">
              <Info className="w-4 h-4 text-[#00603C] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Consejo de navegación:</strong> Haga clic sobre cualquier celda del mapa de calor para ver los lotes detallados y realizar gestiones de stock en esa ubicación específica.
              </p>
            </div>
          </div>

          {/* Sección de Detalle de Celda Seleccionada */}
          {selectedHeatmapCell ? (
            <div className="bg-white rounded-3xl border border-[#C9922E]/30 p-6 shadow-sm space-y-4 animate-in fade-in duration-200" id="selected-heatmap-detail">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#C9922E] text-white text-xs font-mono font-black rounded-lg shadow-sm">
                      UBICACIÓN SELECCIONADA: ALA {selectedHeatmapCell.ala} - SECTOR {selectedHeatmapCell.sector}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Lotes acopiados actualmente en este sector físico.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedHeatmapCell(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
                >
                  Limpiar Selección / Mostrar Todos
                </button>
              </div>

              {/* Lista de lotes en la ubicación seleccionada */}
              {(() => {
                const activeCellLotes = lotes.filter(l => l.ala === selectedHeatmapCell.ala && l.sector === selectedHeatmapCell.sector);
                if (activeCellLotes.length === 0) {
                  return (
                    <div className="p-8 text-center text-gray-400">
                      <Warehouse className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-300" />
                      <p className="text-xs">Este sector se encuentra completamente vacío.</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeCellLotes.map(l => (
                      <div
                        key={l.id}
                        className="bg-gray-50/60 rounded-2xl border border-gray-100 p-4 hover:border-[#00603C]/30 hover:bg-white transition flex flex-col justify-between gap-3 shadow-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 bg-[#C9922E] text-white text-[10px] font-mono font-black rounded">
                              LOTE: {l.loteNro}
                            </span>
                            <h4 className="font-serif text-sm font-bold text-gray-800 mt-1.5 truncate max-w-[150px]">
                              {l.cliente}
                            </h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getEstadoBadgeStyle(l.estado)}`}>
                            {l.estado}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] py-1 border-t border-b border-gray-100">
                          <div>
                            <span className="text-gray-400 block uppercase font-bold text-[8px] tracking-wider">Variedad</span>
                            <span className="font-semibold text-gray-700 truncate block">{l.especie} {l.variedad}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block uppercase font-bold text-[8px] tracking-wider">Stock</span>
                            <span className="font-extrabold text-[#00603C] block">{formatKg(l.stockKg)}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-500 font-mono">
                            {formatNumberArg(l.stockBolsas)} bolsas
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onEditLote(l)}
                              className="p-1.5 text-gray-500 hover:text-[#00603C] rounded hover:bg-gray-100 transition"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedQrLote(l)}
                              className="p-1.5 text-gray-500 hover:text-[#00603C] rounded hover:bg-gray-100 transition"
                              title="QR"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#C9922E]" />
                            </button>
                            <button
                              onClick={() => onSelectLote(l)}
                              className="px-2 py-1 bg-[#00603C] text-white rounded text-[10px] font-semibold hover:bg-[#1a442b] transition flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-[#C9922E]" />
                              Ficha
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Mostrar resumen de depósitos cuando no hay celda seleccionada */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100/50">
              <div>
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3 font-sans">Información sobre Sectores de Acopio</h4>
                <div className="space-y-2.5 text-xs text-gray-600 leading-relaxed font-sans">
                  <p>
                    La planta clasificadora dispone de <strong>4 Alas (Naves Longitudinales: A, B, C, D)</strong> y <strong>3 Sectores (Celdas/Bahías de Almacenamiento: 1, 2, 3)</strong> por cada Ala.
                  </p>
                  <p>
                    El mapa de calor representa el nivel de carga física en Kilogramos en tiempo real de forma dinámica. La coloración se intensifica proporcionalmente en los sectores con mayor acumulación de mercadería.
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3 font-sans">Especies Almacenadas actualmente</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(lotes.map(l => l.especie).filter(Boolean))).map((esp, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white text-gray-700 rounded-xl border border-gray-200 text-xs font-bold shadow-2xs flex items-center gap-1.5 font-sans">
                      {esp === 'Soja' ? '🌱' : esp === 'Trigo' ? '🌾' : esp === 'Arveja' ? '🟢' : '🌱'} {esp}
                      <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                        {lotes.filter(l => l.especie === esp).length} lotes
                      </span>
                    </span>
                  ))}
                  {lotes.length === 0 && (
                    <span className="text-xs text-gray-400 italic font-sans">No hay especies registradas en depósito.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : filteredLotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-50 text-[#C9922E]" />
          <h4 className="font-serif text-lg font-bold text-gray-700 mb-1">Sin Resultados</h4>
          <p className="text-xs">No se encontraron lotes que coincidan con los filtros aplicados.</p>
        </div>
      ) : viewType === 'grid' ? (
        
        /* VISTA TARJETAS (GRID) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLotes.map(l => (
            <div
              key={l.id}
              className="bg-white rounded-2xl border border-gray-100 hover:border-[#00603C] hover:border-opacity-30 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden group"
            >
              {/* Encabezado Tarjeta */}
              <div className="p-5 border-b border-gray-50 bg-[#E3EFE7] bg-opacity-20 flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  {/* Casilla Check */}
                  <input
                    type="checkbox"
                    checked={selectedLoteIds.includes(l.id)}
                    onChange={() => toggleSelectLote(l.id)}
                    className="mt-1 rounded border-gray-300 text-[#00603C] focus:ring-[#00603C] h-4 w-4 cursor-pointer"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-[#C9922E] text-white text-xs sm:text-sm font-mono font-black rounded-lg shadow-sm tracking-wider">
                        LOTE: {l.loteNro}
                      </span>
                      {l.ala && l.sector && (
                        <span className="px-2.5 py-1 bg-[#00603C] text-white text-[10px] sm:text-[11px] font-mono font-black rounded-lg shadow-sm tracking-wider">
                          UBICACIÓN: {l.ala}-{l.sector}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-gray-500 font-semibold">
                        ID: {l.id}
                      </span>
                    </div>
                    <h4 className="font-serif text-base font-bold text-[#1A1A1A] mt-1 group-hover:text-[#00603C] transition">
                      {l.especie} · <span className="font-sans font-normal text-sm text-gray-600">{l.variedad}</span>
                    </h4>
                    <div className="text-xs font-semibold text-[#00603C] mt-1">
                      {l.cliente}
                    </div>
                  </div>
                </div>

                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getEstadoBadgeStyle(l.estado)}`}>
                  {l.estado}
                </span>
              </div>

              {/* Detalles Técnicos */}
              <div className="p-5 space-y-3.5 flex-grow">
                {/* Gran Stock Destacado */}
                <div className="flex justify-between items-end border-b border-dashed border-gray-100 pb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                    Existencias Disponibles
                  </span>
                  <div className="text-right">
                    <span className="font-serif text-xl font-bold text-[#1A1A1A] block">
                      {formatNumberArg(l.stockBolsas, 0)} <span className="text-xs font-sans font-medium text-gray-500">bolsas</span>
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#C9922E]">
                      {formatNumberArg(l.stockKg, 0)} kg
                    </span>
                  </div>
                </div>

                {/* Atributos Secundarios */}
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 block">Tipo de Semilla</span>
                    <span className="font-medium text-gray-700">{l.tipo}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 block">Ingreso</span>
                    <span className="font-medium text-gray-700">{formatDateStr(l.fechaIngreso)}</span>
                  </div>
                  {l.ala && l.sector && (
                    <div className="col-span-2">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 block">Sector de Acopio</span>
                      <span className="font-semibold text-[#00603C]">ALA: {l.ala} · SECTOR: {l.sector}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 block">Tratamiento</span>
                    <span className="font-medium text-gray-700 truncate block">
                      {l.tratamiento.join(' + ')} {l.producto !== 'Ninguno' && `(${l.producto})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones Rápidas del Lote */}
              <div className="p-4 bg-gray-50 border-t border-gray-50 flex items-center justify-between gap-1">
                {/* Eliminar Lote */}
                <button
                  onClick={() => setLoteToDelete(l)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="Eliminar Lote"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => onEditLote(l)}
                    className="p-2 text-gray-500 hover:text-[#00603C] rounded-lg hover:bg-[#E3EFE7] transition text-xs flex items-center gap-1"
                    title="Editar Lote"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>

                  <button
                    onClick={() => setSelectedQrLote(l)}
                    className="p-2 text-gray-500 hover:text-[#00603C] rounded-lg hover:bg-[#E3EFE7] transition text-xs flex items-center gap-1"
                    title="Generar QR"
                  >
                    <QrCode className="w-4 h-4 text-[#C9922E]" />
                    <span className="hidden sm:inline">QR</span>
                  </button>

                  {l.stockBolsas > 0 && (
                    <button
                      onClick={() => onRegistrarSalidaLote(l)}
                      className="p-2 text-gray-600 hover:text-[#C9922E] rounded-lg hover:bg-[#F6EFDC] transition text-xs flex items-center gap-1"
                      title="Registrar Despacho"
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      <span className="hidden sm:inline">Despachar</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectLote(l)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00603C] text-white rounded-lg hover:bg-[#254731] transition text-xs font-semibold"
                  >
                    <Eye className="w-4 h-4 text-[#C9922E]" />
                    Ver Ficha
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        
        /* VISTA TABLA (ESTILO DE TABLA INSTITUCIONAL) */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#00603C] text-white font-sans text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold text-center w-10">
                    <input
                      type="checkbox"
                      checked={filteredLotes.length > 0 && filteredLotes.every(l => selectedLoteIds.includes(l.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const currentIds = filteredLotes.map(l => l.id);
                          setSelectedLoteIds(prev => Array.from(new Set([...prev, ...currentIds])));
                        } else {
                          const currentIds = filteredLotes.map(l => l.id);
                          setSelectedLoteIds(prev => prev.filter(id => !currentIds.includes(id)));
                        }
                      }}
                      className="rounded border-gray-300 text-white focus:ring-offset-0 focus:ring-0 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  {visibleColumns.loteId && <th className="py-3.5 px-4 font-semibold">Lote ID</th>}
                  {visibleColumns.cliente && <th className="py-3.5 px-4 font-semibold">Cliente</th>}
                  {visibleColumns.especieVariedad && <th className="py-3.5 px-4 font-semibold">Especie / Variedad</th>}
                  {visibleColumns.tipo && <th className="py-3.5 px-4 font-semibold">Tipo</th>}
                  {visibleColumns.tratamiento && <th className="py-3.5 px-4 font-semibold">Tratamiento</th>}
                  {visibleColumns.bolsas && <th className="py-3.5 px-4 font-semibold text-right">Bolsas</th>}
                  {visibleColumns.kilogramos && <th className="py-3.5 px-4 font-semibold text-right">Kilogramos</th>}
                  {visibleColumns.estado && <th className="py-3.5 px-4 font-semibold text-center">Estado</th>}
                  {visibleColumns.ubicacion && <th className="py-3.5 px-4 font-semibold text-center">Ubicación</th>}
                  <th className="py-3.5 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredLotes.map((l, index) => (
                  <tr
                    key={l.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-[#E3EFE7] bg-opacity-30'}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedLoteIds.includes(l.id)}
                        onChange={() => toggleSelectLote(l.id)}
                        className="rounded border-gray-300 text-[#00603C] focus:ring-[#00603C] h-4 w-4 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.loteId && (
                      <td className="py-3 px-4">
                        <div className="font-mono font-black text-[#C9922E] text-base leading-none mb-1">LOTE: {l.loteNro}</div>
                        <div className="font-mono text-[9px] text-gray-500 font-semibold">ID: {l.id}</div>
                        {l.ala && l.sector && (
                          <div className="text-[10px] text-[#00603C] font-semibold mt-1">
                            Ala {l.ala} · Sector {l.sector}
                          </div>
                        )}
                      </td>
                    )}
                    {visibleColumns.cliente && <td className="py-3 px-4 font-semibold text-gray-800">{l.cliente}</td>}
                    {visibleColumns.especieVariedad && (
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{l.especie}</div>
                        <div className="text-[10px] text-gray-500">{l.variedad}</div>
                      </td>
                    )}
                    {visibleColumns.tipo && <td className="py-3 px-4 text-gray-600">{l.tipo}</td>}
                    {visibleColumns.tratamiento && (
                      <td className="py-3 px-4 text-gray-500">
                        <span className="block max-w-[150px] truncate" title={l.tratamiento.join(', ')}>
                          {l.tratamiento.join(', ')}
                          {l.producto !== 'Ninguno' && ` (${l.producto})`}
                        </span>
                      </td>
                    )}
                    {visibleColumns.bolsas && (
                      <td className="py-3 px-4 text-right font-bold text-gray-800">
                        {formatNumberArg(l.stockBolsas, 0)}
                      </td>
                    )}
                    {visibleColumns.kilogramos && (
                      <td className="py-3 px-4 text-right font-mono text-[#00603C] font-semibold">
                        {formatNumberArg(l.stockKg, 0)} kg
                      </td>
                    )}
                    {visibleColumns.estado && (
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${getEstadoBadgeStyle(l.estado)}`}>
                          {l.estado}
                        </span>
                      </td>
                    )}
                    {visibleColumns.ubicacion && (
                      <td className="py-3 px-4 text-center">
                        {l.ala && l.sector ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E3EFE7] text-[#00603C] font-mono font-bold text-xs border border-[#00603C]/15 shadow-2xs">
                            <Warehouse className="w-3.5 h-3.5 text-[#C9922E]" />
                            ALA {l.ala} · SECTOR {l.sector}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 text-[10px] font-sans italic border border-gray-200/50">
                            No asignado
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectLote(l)}
                          className="p-1 text-gray-500 hover:text-[#00603C] hover:bg-gray-100 rounded"
                          title="Ver Ficha Detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditLote(l)}
                          className="p-1 text-gray-500 hover:text-[#C9922E] hover:bg-gray-100 rounded"
                          title="Editar Lote"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedQrLote(l)}
                          className="p-1 text-gray-500 hover:text-[#00603C] hover:bg-gray-100 rounded"
                          title="Generar QR"
                        >
                          <QrCode className="w-4 h-4 text-[#C9922E]" />
                        </button>
                        {l.stockBolsas > 0 && (
                          <button
                            onClick={() => onRegistrarSalidaLote(l)}
                            className="p-1 text-gray-500 hover:text-green-700 hover:bg-gray-100 rounded"
                            title="Despachar"
                          >
                            <ArrowDownRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setLoteToDelete(l)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {selectedQrLote && (
        <QrCodeModal
          lote={selectedQrLote}
          onClose={() => setSelectedQrLote(null)}
        />
      )}

      {/* Modal para Borrar Stocks (Amilcar Quiroz con clave) */}
      {showWipeModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full overflow-hidden text-left">
            {/* Header */}
            <div className="bg-red-600 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#F6EFDC]" />
                <h3 className="font-serif text-lg font-bold tracking-wide uppercase">
                  Procedimiento de Emergencia
                </h3>
              </div>
              <button
                onClick={() => setShowWipeModal(false)}
                className="text-white hover:text-red-100 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl">
                <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">
                  ⚠️ ¡Atención Amilcar!
                </h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  Está a punto de <strong>borrar por completo toda la información de los lotes y sus existencias de stock</strong> en la planta. 
                </p>
                <p className="text-[11px] text-red-600 mt-2 italic">
                  Esta acción es irreversible y eliminará definitivamente todos los registros, procediendo al borrado físico de cada lote de la base de datos de Firestore. No quedará información histórica ni stock.
                </p>
              </div>

              {wipeError && (
                <div className="bg-[#F5E5DC] text-[#A0522D] p-3 rounded-lg text-xs font-semibold border border-red-100">
                  {wipeError}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Clave de Operación Autorizada *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={wipePassword}
                    onChange={(e) => setWipePassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    placeholder="Ingrese su clave secreta"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  Ingrese su clave de supervisor autorizada para continuar con la operación de emergencia.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                className="px-4 py-2 text-xs font-semibold font-sans uppercase tracking-wider text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setWipeError('');
                  const cleanPass = wipePassword.trim();
                  if (cleanPass === 'amilcar2026' || cleanPass === 'abacus2026' || cleanPass === 'amilcar123') {
                    setIsWiping(true);
                    try {
                      await onWipeStocks();
                      setShowWipeModal(false);
                    } catch (err) {
                      setWipeError('Error al procesar el vaciado de stock en el servidor.');
                    } finally {
                      setIsWiping(false);
                    }
                  } else {
                    setWipeError('Clave incorrecta. Acceso denegado.');
                  }
                }}
                disabled={isWiping}
                className="px-5 py-2 text-xs font-semibold font-sans uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                {isWiping ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar Vaciado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Lote */}
      {loteToDelete && (
        <div className="fixed inset-0 bg-[#1A1A1A]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" id="delete-lote-confirm-modal">
          <div className="bg-white rounded-2xl border border-red-100 shadow-2xl max-w-md w-full overflow-hidden text-left">
            {/* Header */}
            <div className="bg-red-50 text-red-800 p-5 flex justify-between items-center border-b border-red-100">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-serif text-base font-extrabold tracking-wide uppercase">
                  Confirmar Eliminación
                </h3>
              </div>
              <button
                onClick={() => setLoteToDelete(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600 leading-relaxed font-sans">
                ¿Está seguro de que desea eliminar permanentemente este lote de semilla? Esta acción es <strong>irreversible</strong> y borrará toda su información de la base de datos de Firestore.
              </div>

              {/* Ficha rápida del lote a eliminar */}
              <div className="bg-red-50/50 rounded-xl border border-red-100 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="px-2 py-0.5 bg-[#C9922E] text-white text-[10px] font-mono font-black rounded">
                    LOTE: {loteToDelete.loteNro}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getEstadoBadgeStyle(loteToDelete.estado)}`}>
                    {loteToDelete.estado}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-semibold font-mono">
                  ID: {loteToDelete.id}
                </div>
                <div className="border-t border-red-100/50 pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Cliente</span>
                    <span className="font-semibold text-gray-800 truncate block">{loteToDelete.cliente}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Especie / Variedad</span>
                    <span className="font-semibold text-gray-800 truncate block">{loteToDelete.especie} {loteToDelete.variedad}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Bolsas</span>
                    <span className="font-bold text-gray-800">{formatNumberArg(loteToDelete.stockBolsas)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Kilogramos</span>
                    <span className="font-bold text-[#00603C]">{formatKg(loteToDelete.stockKg)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLoteToDelete(null)}
                className="px-4 py-2 text-xs font-semibold font-sans uppercase tracking-wider text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLote(loteToDelete.id);
                  setLoteToDelete(null);
                }}
                className="px-5 py-2 text-xs font-semibold font-sans uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Lote</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
