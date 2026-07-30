import React, { useState, useMemo } from 'react';
import { BolsonCampo, MovimientoSilo } from '../types';
import { ClienteSelect } from './ClienteSelect';
import {
  Package,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Building2,
  Sprout,
  MapPin,
  Warehouse,
  Check,
  History,
  Clock,
  ArrowUpRight,
  FileText,
  Calendar,
  Truck,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface BolsaEnCampoViewProps {
  bolsones: BolsonCampo[];
  movimientosSilo?: MovimientoSilo[];
  clientes?: string[];
  especies?: string[];
}

export const CATEGORIAS_BOLSON = ['Fundadora', 'Preba', 'Original', 'Prima', 'Primu'];

export const BolsaEnCampoView: React.FC<BolsaEnCampoViewProps> = ({
  bolsones = [],
  movimientosSilo = [],
  clientes = ['San Diego Semillas', 'Eco Rural', 'Pampa', 'Stine', 'Elementa Foods'],
  especies = ['Soja', 'Trigo', 'Arveja']
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModalAddEdit, setShowModalAddEdit] = useState(false);
  const [showModalImport, setShowModalImport] = useState(false);
  const [bolsonAEditar, setBolsonAEditar] = useState<BolsonCampo | null>(null);
  const [bolsonHistorial, setBolsonHistorial] = useState<BolsonCampo | null>(null);

  // Form State
  const [formCampania, setFormCampania] = useState('2025/2026');
  const [formCliente, setFormCliente] = useState('San Diego Semilla');
  const [formNumeroBolson, setFormNumeroBolson] = useState('');
  const [formZona, setFormZona] = useState('');
  const [formCampo, setFormCampo] = useState('');
  const [formCultivo, setFormCultivo] = useState('Trigo');
  const [formVariedad, setFormVariedad] = useState('');
  const [formCategoria, setFormCategoria] = useState('Fundadora');
  const [formDeposito, setFormDeposito] = useState('');
  const [formEntradasKg, setFormEntradasKg] = useState<number>(0);
  const [formSalidasKg, setFormSalidasKg] = useState<number>(0);
  const [formError, setFormError] = useState('');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Partial<BolsonCampo>[]>([]);
  const [importNotice, setImportNotice] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // General Notification
  const [notificacion, setNotificacion] = useState('');

  // Modal confirmación eliminación
  const [bolsonAEliminar, setBolsonAEliminar] = useState<BolsonCampo | null>(null);

  // Reset y Abrir Modal (Creación)
  const handleOpenAddModal = () => {
    setBolsonAEditar(null);
    setFormCampania('2025/2026');
    setFormCliente(clientes[0] || 'San Diego Semilla');
    setFormNumeroBolson('');
    setFormZona('');
    setFormCampo('');
    setFormCultivo(especies[0] || 'Trigo');
    setFormVariedad('');
    setFormCategoria('Fundadora');
    setFormDeposito('');
    setFormEntradasKg(0);
    setFormSalidasKg(0);
    setFormError('');
    setShowModalAddEdit(true);
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (b: BolsonCampo) => {
    setBolsonAEditar(b);
    setFormCampania(b.campania || '2025/2026');
    setFormCliente(b.cliente || '');
    setFormNumeroBolson(b.numeroBolson || '');
    setFormZona(b.zona || '');
    setFormCampo(b.campo || '');
    setFormCultivo(b.cultivo || '');
    setFormVariedad(b.variedad || '');
    setFormCategoria(b.categoria || 'Fundadora');
    setFormDeposito(b.deposito || '');
    setFormEntradasKg(b.entradasKg || 0);
    setFormSalidasKg(b.salidasKg || 0);
    setFormError('');
    setShowModalAddEdit(true);
  };

  // Guardar Bolsón (Crear / Editar)
  const handleSaveBolson = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formNumeroBolson.trim()) {
      setFormError('El N° de Bolsón es obligatorio.');
      return;
    }

    if (!formCliente.trim()) {
      setFormError('El cliente es obligatorio.');
      return;
    }

    if (!formCultivo.trim()) {
      setFormError('El cultivo / especie es obligatorio.');
      return;
    }

    const entradas = Number(formEntradasKg) || 0;
    const salidas = Number(formSalidasKg) || 0;
    const stock = entradas - salidas;

    const id = bolsonAEditar ? bolsonAEditar.id : `BOLSON-${Date.now()}`;

    const newBolson: BolsonCampo = {
      id,
      campania: formCampania.trim() || '2025/2026',
      cliente: formCliente.trim(),
      numeroBolson: formNumeroBolson.trim(),
      zona: formZona.trim() || undefined,
      campo: formCampo.trim() || undefined,
      cultivo: formCultivo.trim(),
      variedad: formVariedad.trim(),
      categoria: formCategoria.trim() || 'Fundadora',
      deposito: formDeposito.trim() || undefined,
      entradasKg: entradas,
      salidasKg: salidas,
      stockKg: stock
    };

    try {
      await setDoc(doc(db, 'bolsones_campo', newBolson.id), newBolson, { merge: true });
      setShowModalAddEdit(false);
      setNotificacion(bolsonAEditar ? `Bolsón ${newBolson.numeroBolson} actualizado correctamente.` : `Nuevo Bolsón ${newBolson.numeroBolson} guardado en la base de datos.`);
      setTimeout(() => setNotificacion(''), 4000);
    } catch (err: any) {
      console.error('Error al guardar bolsón en Firestore:', err);
      setFormError('Error al guardar en la base de datos: ' + (err.message || err));
    }
  };

  // Confirmar Eliminación
  const handleConfirmDelete = async () => {
    if (!bolsonAEliminar) return;
    try {
      await deleteDoc(doc(db, 'bolsones_campo', bolsonAEliminar.id));
      setNotificacion(`Se eliminó el Bolsón ${bolsonAEliminar.numeroBolson} de la base de datos.`);
      setBolsonAEliminar(null);
      setTimeout(() => setNotificacion(''), 4000);
    } catch (err: any) {
      console.error('Error al eliminar bolsón:', err);
      alert('Error al eliminar: ' + (err.message || err));
    }
  };

  // Exportar Plantilla Excel
  const handleExportModelTemplate = () => {
    const templateData = [
      {
        'Campaña': '2025/2026',
        'Cliente *': 'San Diego Semilla',
        'N° de Bolsón *': 'Bolsón 12A',
        'Zona': 'Norte',
        'Campo': 'La Barrancosa',
        'Cultivo *': 'Trigo',
        'Variedad': 'CASUARINA',
        'Categoría': 'Fundadora',
        'Depósito': 'Depósito Central',
        'Entradas (kg)': 45000,
        'Salida (kg)': 0,
        'Stock (kg)': 45000
      },
      {
        'Campaña': '2025/2026',
        'Cliente *': 'Eco Rural',
        'N° de Bolsón *': 'Bolsón 05F',
        'Zona': 'Este',
        'Campo': 'El Potrero',
        'Cultivo *': 'Soja',
        'Variedad': 'PEHUEN',
        'Categoría': 'Original',
        'Depósito': 'Depósito Este',
        'Entradas (kg)': 50000,
        'Salida (kg)': 10000,
        'Stock (kg)': 40000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 16 }, { wch: 12 },
      { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Bolsa_en_Campo');
    XLSX.writeFile(wb, 'Modelo_Base_de_Datos_Bolsa_en_Campo.xlsx');
  };

  // Exportar Base Actual a Excel
  const handleExportCurrentDatabase = () => {
    if (bolsones.length === 0) {
      alert('No hay bolsones registrados para exportar.');
      return;
    }

    const exportData = bolsones.map((b, idx) => ({
      'N°': idx + 1,
      'Campaña': b.campania || '—',
      'Cliente': b.cliente || '—',
      'N° de Bolsón': b.numeroBolson || '—',
      'Zona': b.zona || '—',
      'Campo': b.campo || '—',
      'Cultivo': b.cultivo || '—',
      'Variedad': b.variedad || '—',
      'Categoría': b.categoria || '—',
      'Depósito': b.deposito || '—',
      'Entradas (kg)': b.entradasKg || 0,
      'Salida (kg)': b.salidasKg || 0,
      'Stock (kg)': b.stockKg !== undefined ? b.stockKg : ((b.entradasKg || 0) - (b.salidasKg || 0))
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 25 }, { wch: 16 }, { wch: 12 },
      { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bolsa_en_Campo');
    XLSX.writeFile(wb, `Base_Bolsa_en_Campo_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Leer Excel importado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportError('');
    setImportNotice('');
    setImportPreview([]);

    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);

        if (!rawData || rawData.length === 0) {
          setImportError('El archivo Excel está vacío o no tiene el formato esperado.');
          return;
        }

        const parsed: Partial<BolsonCampo>[] = [];

        rawData.forEach((row: any) => {
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              const matchedKey = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim() || rk.toLowerCase().trim().includes(k.toLowerCase().trim()));
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const campania = getVal(['campania', 'campaña']) || '2025/2026';
          const clienteVal = getVal(['cliente']);
          const numeroBolson = getVal(['n° de bolsón', 'n° de bolson', 'numero bolson', 'n° bolson', 'bolson', 'n°']);
          const zona = getVal(['zona']);
          const campo = getVal(['campo']);
          const cultivo = getVal(['cultivo', 'especie']);
          const variedad = getVal(['variedad']);
          const categoria = getVal(['categoria', 'categoría']) || 'Fundadora';
          const deposito = getVal(['deposito', 'depósito']);
          
          const getNum = (keys: string[]) => {
            const val = getVal(keys);
            if (!val) return 0;
            const cleaned = val.replace(/\./g, '').replace(',', '.');
            return parseFloat(cleaned) || 0;
          };

          const entradasKg = getNum(['entradas (kg)', 'entradas', 'entrada']);
          const salidasKg = getNum(['salida (kg)', 'salidas (kg)', 'salida', 'salidas']);
          const stockKg = entradasKg - salidasKg;

          if (numeroBolson || clienteVal || cultivo) {
            parsed.push({
              id: `BOLSON-IMP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              campania,
              cliente: clienteVal || 'San Diego Semilla',
              numeroBolson: numeroBolson || 'S/N',
              zona: zona || undefined,
              campo: campo || undefined,
              cultivo: cultivo || 'Trigo',
              variedad: variedad || '',
              categoria: categoria || 'Fundadora',
              deposito: deposito || undefined,
              entradasKg,
              salidasKg,
              stockKg
            });
          }
        });

        if (parsed.length === 0) {
          setImportError('No se identificaron columnas válidas (N° Bolsón, Cliente, Cultivo, etc.).');
        } else {
          setImportPreview(parsed);
          setImportNotice(`Se leyeron ${parsed.length} registros listos para importar.`);
        }
      } catch (err: any) {
        console.error('Error al leer Excel:', err);
        setImportError('Error al leer archivo Excel: ' + (err.message || err));
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirmar Importación
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    setImportError('');

    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const item of importPreview) {
        if (!item.numeroBolson) continue;
        const id = item.id || `BOLSON-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const docRef = doc(db, 'bolsones_campo', id);
        batch.set(docRef, item, { merge: true });
        count++;
      }

      await batch.commit();
      setIsImporting(false);
      setShowModalImport(false);
      setImportFile(null);
      setImportPreview([]);
      setNotificacion(`Se importaron ${count} bolsones correctamente.`);
      setTimeout(() => setNotificacion(''), 4000);
    } catch (err: any) {
      console.error('Error al importar en Firestore:', err);
      setIsImporting(false);
      setImportError('Error al guardar registros: ' + (err.message || err));
    }
  };

  const [selectedClienteFilter, setSelectedClienteFilter] = useState<string>('');

  // Clientes disponibles dinámicos para filtro de bolsones
  const clientesDisponiblesBolsas = useMemo(() => {
    const base = ['Pampa', 'Eco Rural', 'San Diego Semillas', 'Stine', 'Elementa Foods'];
    const fromBolsas = bolsones.map(b => b.cliente).filter(Boolean) as string[];
    return Array.from(new Set([...base, ...fromBolsas])).sort();
  }, [bolsones]);

  // Filtrar bolsones por búsqueda
  const filteredBolsones = bolsones.filter((b) => {
    if (selectedClienteFilter && b.cliente !== selectedClienteFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (b.numeroBolson && b.numeroBolson.toLowerCase().includes(term)) ||
      (b.cliente && b.cliente.toLowerCase().includes(term)) ||
      (b.cultivo && b.cultivo.toLowerCase().includes(term)) ||
      (b.variedad && b.variedad.toLowerCase().includes(term)) ||
      (b.campo && b.campo.toLowerCase().includes(term)) ||
      (b.zona && b.zona.toLowerCase().includes(term)) ||
      (b.categoria && b.categoria.toLowerCase().includes(term)) ||
      (b.deposito && b.deposito.toLowerCase().includes(term))
    );
  });

  // Totales
  const totalStockKg = filteredBolsones.reduce((acc, b) => acc + (b.stockKg !== undefined ? b.stockKg : ((b.entradasKg || 0) - (b.salidasKg || 0))), 0);
  const totalEntradasKg = filteredBolsones.reduce((acc, b) => acc + (b.entradasKg || 0), 0);
  const totalSalidasKg = filteredBolsones.reduce((acc, b) => acc + (b.salidasKg || 0), 0);

  return (
    <div className="space-y-6">
      {/* Banner de Notificaciones */}
      {notificacion && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-r-xl shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{notificacion}</span>
          </div>
          <button onClick={() => setNotificacion('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header y Acciones */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#00603C] flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Base de Datos - Bolsa en Campo
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Control y seguimiento de bolsones acopiados en campo por lote, variedad y depósito.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportModelTemplate}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
            title="Descargar plantilla de Excel para carga masiva"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Plantilla Excel</span>
          </button>

          <button
            onClick={() => setShowModalImport(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
            title="Importar bolsones desde archivo Excel"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Importar Ficha (Excel)</span>
          </button>

          <button
            onClick={handleExportCurrentDatabase}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#00603C] font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
            title="Exportar base actual a Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#00603C] hover:bg-[#004d30] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Bolsón</span>
          </button>
        </div>
      </div>

      {/* Resumen de totales y buscador */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Buscar Bolsón
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="N° bolsón, cliente, cultivo, variedad, campo..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filtro por Cliente
            </label>
            <select
              value={selectedClienteFilter}
              onChange={(e) => setSelectedClienteFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Todos los Clientes ({clientesDisponiblesBolsas.length})</option>
              {clientesDisponiblesBolsas.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Total Registrados</span>
            <span className="text-xl font-black font-mono text-emerald-900">{filteredBolsones.length}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block">Bolsones en filtro</span>
          </div>
          <Package className="w-8 h-8 text-emerald-600/40" />
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Entradas Totales</span>
            <span className="text-xl font-black font-mono text-blue-900">{totalEntradasKg.toLocaleString('es-AR')} kg</span>
            <span className="text-[10px] text-blue-600 font-semibold block">{(totalEntradasKg / 1000).toFixed(1)} Tn ingresadas</span>
          </div>
          <Sprout className="w-8 h-8 text-blue-600/40" />
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Stock Disponible</span>
            <span className="text-xl font-black font-mono text-amber-900">{totalStockKg.toLocaleString('es-AR')} kg</span>
            <span className="text-[10px] text-amber-700 font-semibold block">{(totalStockKg / 1000).toFixed(1)} Tn remanentes</span>
          </div>
          <Warehouse className="w-8 h-8 text-amber-600/40" />
        </div>
      </div>

      {/* Tabla de Bolsones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Listado de Bolsones en Campo
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            Mostrando {filteredBolsones.length} de {bolsones.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-3">Campaña</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">N° de Bolsón</th>
                <th className="py-3 px-3">Zona / Campo</th>
                <th className="py-3 px-3">Cultivo / Variedad</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3">Depósito</th>
                <th className="py-3 px-3 text-right">Entradas (kg)</th>
                <th className="py-3 px-3 text-right">Salida (kg)</th>
                <th className="py-3 px-3 text-right">Stock (kg)</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredBolsones.length > 0 ? (
                filteredBolsones.map((b) => {
                  const normNro = (b.numeroBolson || '').trim().toLowerCase();
                  const movsBolson = (movimientosSilo || []).filter(m =>
                    m.tipo === 'INGRESO' && (
                      (m.bolsonOrigenId && m.bolsonOrigenId === b.id) ||
                      (m.bolsonOrigenNro && m.bolsonOrigenNro.trim().toLowerCase() === normNro)
                    )
                  );
                  const salidasCalculadas = movsBolson.reduce((acc, m) => acc + (m.kg || 0), 0);
                  const salidasKg = Math.max(b.salidasKg || 0, salidasCalculadas);
                  const stock = Math.max(0, (b.entradasKg || 0) - salidasKg);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-600">
                        {b.campania || '2025/2026'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {b.cliente}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-emerald-800">
                        <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                          {b.numeroBolson}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <div>
                          <span className="font-semibold">{b.campo || '—'}</span>
                          {b.zona && <span className="text-[10px] text-slate-400 block">Zona: {b.zona}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {b.cultivo}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {b.variedad || 'Sin especificar'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                          {b.categoria || 'Fundadora'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {b.deposito || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                        {(b.entradasKg || 0).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700">
                        <button
                          onClick={() => setBolsonHistorial(b)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200 transition cursor-pointer"
                          title="Haga clic para ver el historial de ingresos a silos que descontaron stock"
                        >
                          {salidasKg.toLocaleString('es-AR')} kg
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-800">
                        <span className={`px-2 py-0.5 rounded border ${
                          stock > 0 ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          {stock.toLocaleString('es-AR')} kg
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setBolsonHistorial(b)}
                            className="px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                            title="Ver Historial de Movimientos por Bolsón"
                          >
                            <History className="w-3.5 h-3.5 text-blue-600" />
                            <span>Historial</span>
                            {movsBolson.length > 0 && (
                              <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                                {movsBolson.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Editar Bolsón"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setBolsonAEliminar(b)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Eliminar Bolsón"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 italic">
                    {searchTerm ? (
                      <div>No se encontraron bolsones que coincidan con "{searchTerm}".</div>
                    ) : (
                      <div>No hay bolsones registrados en la base de datos. Haga clic en "+ Nuevo Bolsón" o "Importar Ficha (Excel)".</div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NUEVO / EDITAR BOLSÓN */}
      {showModalAddEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#00603C] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Package className="w-5 h-5 text-emerald-300" />
                <span>{bolsonAEditar ? 'Editar Bolsón en Campo' : 'Nuevo Bolsón en Campo'}</span>
              </div>
              <button
                onClick={() => setShowModalAddEdit(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBolson} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Campaña
                  </label>
                  <input
                    type="text"
                    value={formCampania}
                    onChange={(e) => setFormCampania(e.target.value)}
                    placeholder="ej: 2025/2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <ClienteSelect
                  value={formCliente}
                  onChange={setFormCliente}
                  label="Cliente *"
                  selectClassName="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                  inputClassName="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    N° de Bolsón *
                  </label>
                  <input
                    type="text"
                    value={formNumeroBolson}
                    onChange={(e) => setFormNumeroBolson(e.target.value)}
                    placeholder="ej: Bolsón 12A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {CATEGORIAS_BOLSON.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Cultivo / Especie *
                  </label>
                  <input
                    type="text"
                    list="especies-list"
                    value={formCultivo}
                    onChange={(e) => setFormCultivo(e.target.value)}
                    placeholder="ej: Trigo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                  <datalist id="especies-list">
                    {especies.map(e => (
                      <option key={e} value={e} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Variedad
                  </label>
                  <input
                    type="text"
                    value={formVariedad}
                    onChange={(e) => setFormVariedad(e.target.value)}
                    placeholder="ej: CASUARINA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Campo
                  </label>
                  <input
                    type="text"
                    value={formCampo}
                    onChange={(e) => setFormCampo(e.target.value)}
                    placeholder="ej: La Barrancosa"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Zona
                  </label>
                  <input
                    type="text"
                    value={formZona}
                    onChange={(e) => setFormZona(e.target.value)}
                    placeholder="ej: Norte"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Depósito
                  </label>
                  <input
                    type="text"
                    value={formDeposito}
                    onChange={(e) => setFormDeposito(e.target.value)}
                    placeholder="ej: Central"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-emerald-800 mb-1">
                    Entradas (kg)
                  </label>
                  <input
                    type="number"
                    value={formEntradasKg}
                    onChange={(e) => setFormEntradasKg(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-800 mb-1">
                    Salida (kg)
                  </label>
                  <input
                    type="number"
                    value={formSalidasKg}
                    onChange={(e) => setFormSalidasKg(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Stock Calculado (kg)
                  </label>
                  <div className="w-full px-3 py-2 bg-emerald-100/80 border border-emerald-300 rounded-xl font-mono font-black text-emerald-900 text-xs flex items-center h-[38px]">
                    {(formEntradasKg - formSalidasKg).toLocaleString('es-AR')} kg
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalAddEdit(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00603C] hover:bg-[#004d30] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
                >
                  {bolsonAEditar ? 'Guardar Cambios' : 'Registrar Bolsón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR DESDE EXCEL */}
      {showModalImport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#00603C] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Upload className="w-5 h-5 text-emerald-300" />
                <span>Importar Bolsas en Campo desde Excel</span>
              </div>
              <button
                onClick={() => setShowModalImport(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importNotice}</span>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 transition">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800 mb-1">
                  Seleccione o arrastre una planilla Excel (.xlsx, .xls)
                </p>
                <p className="text-[11px] text-slate-500 mb-3">
                  Columnas esperadas: Campaña, Cliente, N° de Bolsón, Zona, Campo, Cultivo, Variedad, Categoría, Depósito, Entradas (kg), Salida (kg), Stock (kg).
                </p>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer"
                />
              </div>

              {/* Vista previa de importación */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Vista Previa ({importPreview.length} registros detectados)
                  </span>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                    {importPreview.slice(0, 10).map((p, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <strong className="text-slate-900 font-mono">{p.numeroBolson}</strong>
                          <span className="text-slate-500 text-[11px] ml-2">• {p.cliente} ({p.cultivo} {p.variedad})</span>
                        </div>
                        <div className="font-mono text-[11px] font-bold text-emerald-800">
                          Stock: {(p.stockKg || 0).toLocaleString('es-AR')} kg
                        </div>
                      </div>
                    ))}
                    {importPreview.length > 10 && (
                      <div className="p-2 text-center text-slate-400 italic text-[10px]">
                        ...y {importPreview.length - 10} bolsones más.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalImport(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={importPreview.length === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 bg-[#00603C] hover:bg-[#004d30] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isImporting ? 'Importando...' : `Confirmar Importación (${importPreview.length})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {bolsonAEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">¿Eliminar Bolsón en Campo?</h3>
              <p className="text-xs text-slate-500 mt-1">
                ¿Está seguro de eliminar el Bolsón <strong className="text-slate-800">{bolsonAEliminar.numeroBolson}</strong> de {bolsonAEliminar.cliente}? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setBolsonAEliminar(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE MOVIMIENTOS POR BOLSÓN */}
      {bolsonHistorial && (() => {
        const normNro = (bolsonHistorial.numeroBolson || '').trim().toLowerCase();
        const movsBolson = (movimientosSilo || [])
          .filter(m => m.tipo === 'INGRESO' && (
            (m.bolsonOrigenId && m.bolsonOrigenId === bolsonHistorial.id) ||
            (m.bolsonOrigenNro && m.bolsonOrigenNro.trim().toLowerCase() === normNro)
          ))
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        const totalDescontado = movsBolson.reduce((sum, m) => sum + (m.kg || 0), 0);
        const entradas = bolsonHistorial.entradasKg || 0;
        const stockRestante = Math.max(0, entradas - totalDescontado);

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-400">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base tracking-tight text-white">
                        Historial de Movimientos por Bolsón
                      </h3>
                      <span className="bg-emerald-500/20 text-emerald-300 font-mono text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                        {bolsonHistorial.numeroBolson}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Cliente: <strong className="text-white font-semibold">{bolsonHistorial.cliente}</strong> · Cultivo: <span className="text-emerald-300 font-medium">{bolsonHistorial.cultivo} {bolsonHistorial.variedad ? `(${bolsonHistorial.variedad})` : ''}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBolsonHistorial(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informative Rule Header */}
              <div className="bg-emerald-50/80 border-b border-emerald-100 px-5 py-2.5 text-[11px] text-emerald-900 flex items-center gap-2 shrink-0">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Regla de Stock:</strong> Únicamente los <strong>Ingresos en Silos</strong> descuentan stock de la bolsa en campo. El alta o edición de lotes es meramente informativo y no afecta las existencias del bolsón.
                </span>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-6 overflow-y-auto grow">
                {/* Tarjetas de Resumen de Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Carga Inicial (Entrada)
                    </span>
                    <span className="text-lg font-mono font-black text-slate-900 mt-1 block">
                      {entradas.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-500">kg</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {bolsonHistorial.campo ? `Campo: ${bolsonHistorial.campo}` : 'Bolsón registrado'}
                    </span>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                      Total Descontado (En Silos)
                    </span>
                    <span className="text-lg font-mono font-black text-amber-900 mt-1 block">
                      {totalDescontado.toLocaleString('es-AR')} <span className="text-xs font-normal text-amber-700">kg</span>
                    </span>
                    <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">
                      {movsBolson.length} ingreso(s) a silos registrado(s)
                    </span>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Stock Restante en Campo
                    </span>
                    <span className="text-lg font-mono font-black text-emerald-900 mt-1 block">
                      {stockRestante.toLocaleString('es-AR')} <span className="text-xs font-normal text-emerald-700">kg</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">
                      {stockRestante > 0 ? 'Disponible para descarga' : 'Bolsón Agotado (0 kg)'}
                    </span>
                  </div>
                </div>

                {/* Listado Cronológico de Movimientos */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Listado Cronológico de Ingresos en Silos
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Mostrando {movsBolson.length} movimiento(s)
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Silo Destino</th>
                          <th className="py-2.5 px-3 text-right">Kilos Descontados</th>
                          <th className="py-2.5 px-3">Cliente / Comitente</th>
                          <th className="py-2.5 px-3">Especie / Variedad</th>
                          <th className="py-2.5 px-3">Chofer / Camión</th>
                          <th className="py-2.5 px-3">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {movsBolson.length > 0 ? (
                          movsBolson.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-mono text-slate-700 font-medium whitespace-nowrap">
                                {m.fecha}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="bg-slate-900 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                                  {m.siloId}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700">
                                {m.kg.toLocaleString('es-AR')} kg
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {m.cliente || bolsonHistorial.cliente}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                <div>
                                  <span className="font-semibold">{m.especie || bolsonHistorial.cultivo}</span>
                                  {(m.variedad || bolsonHistorial.variedad) && (
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      {m.variedad || bolsonHistorial.variedad}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {m.choferNombre ? (
                                  <div>
                                    <span className="font-medium text-slate-800">{m.choferNombre}</span>
                                    {m.patenteChasis && (
                                      <span className="text-[10px] font-mono text-slate-400 block">
                                        {m.patenteChasis}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">
                                {m.observaciones || '—'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                              <div className="max-w-md mx-auto space-y-1">
                                <p className="font-semibold text-slate-600 text-xs">Sin registros de ingresos a silos</p>
                                <p className="text-[11px]">
                                  Este bolsón no ha sido utilizado aún para realizar Ingresos en Silos en la planta.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <p className="text-[11px] text-slate-500 font-medium">
                  Trazabilidad completa de descargas de bolsa en campo a silos de planta.
                </p>
                <button
                  onClick={() => setBolsonHistorial(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
                >
                  Cerrar Historial
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
