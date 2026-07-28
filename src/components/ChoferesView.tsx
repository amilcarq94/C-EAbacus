import React, { useState } from 'react';
import { Chofer } from '../types';
import {
  Truck,
  Search,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  Phone,
  FileText,
  Building2,
  UserCheck,
  RefreshCw,
  Copy,
  Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface ChoferesViewProps {
  choferes: Chofer[];
  onUpdateChoferes?: (choferes: Chofer[]) => void;
}

export const ChoferesView: React.FC<ChoferesViewProps> = ({ choferes = [], onUpdateChoferes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModalAddEdit, setShowModalAddEdit] = useState(false);
  const [showModalImport, setShowModalImport] = useState(false);
  const [choferAEditar, setChoferAEditar] = useState<Chofer | null>(null);

  // Form State
  const [formNombre, setFormNombre] = useState('');
  const [formCuit, setFormCuit] = useState('');
  const [formTransporte, setFormTransporte] = useState('');
  const [formLicencia, setFormLicencia] = useState('');
  const [formPatenteCamion, setFormPatenteCamion] = useState('');
  const [formPatenteAcoplado, setFormPatenteAcoplado] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formError, setFormError] = useState('');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Partial<Chofer>[]>([]);
  const [importNotice, setImportNotice] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // General Notification
  const [notificacion, setNotificacion] = useState('');

  // Modal para confirmación de eliminación
  const [choferAEliminar, setChoferAEliminar] = useState<Chofer | null>(null);

  // Reset y Abrir Modal de Chofer (Creación)
  const handleOpenAddModal = () => {
    setChoferAEditar(null);
    setFormNombre('');
    setFormCuit('');
    setFormTransporte('');
    setFormLicencia('');
    setFormPatenteCamion('');
    setFormPatenteAcoplado('');
    setFormTelefono('');
    setFormError('');
    setShowModalAddEdit(true);
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (ch: Chofer) => {
    setChoferAEditar(ch);
    setFormNombre(ch.nombre || '');
    setFormCuit(ch.cuit || '');
    setFormTransporte(ch.transporte || '');
    setFormLicencia(ch.licencia || '');
    setFormTelefono(ch.telefono || '');
    
    // Separar patentes si vienen separadas por barra
    const patentesArr = (ch.patentes || '').split('/');
    setFormPatenteCamion(ch.patenteCamion || patentesArr[0]?.trim() || '');
    setFormPatenteAcoplado(ch.patenteAcoplado || patentesArr[1]?.trim() || '');
    
    setFormError('');
    setShowModalAddEdit(true);
  };

  // Guardar Chofer (Crear / Editar)
  const handleSaveChofer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formNombre.trim()) {
      setFormError('El nombre y apellido del chofer es obligatorio.');
      return;
    }

    if (!formCuit.trim()) {
      setFormError('El DNI o CUIT del chofer es obligatorio.');
      return;
    }

    if (!formTransporte.trim()) {
      setFormError('La empresa de transporte es obligatoria.');
      return;
    }

    // Combinar patentes
    const cam = formPatenteCamion.trim().toUpperCase();
    const acop = formPatenteAcoplado.trim().toUpperCase();
    let patentesComb = cam;
    if (acop) {
      patentesComb = cam ? `${cam} / ${acop}` : acop;
    }

    const choferId = choferAEditar
      ? choferAEditar.id
      : `CHOFER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newChofer: Chofer = {
      id: choferId,
      nombre: formNombre.trim(),
      cuit: formCuit.trim(),
      transporte: formTransporte.trim(),
      licencia: formLicencia.trim() || undefined,
      patenteCamion: cam || undefined,
      patenteAcoplado: acop || undefined,
      patentes: patentesComb || '—',
      telefono: formTelefono.trim() || undefined,
    };

    try {
      // Guardar en Firestore
      await setDoc(doc(db, 'choferes', choferId), newChofer);
      setShowModalAddEdit(false);
      setNotificacion(choferAEditar ? 'Chofer actualizado con éxito.' : 'Nuevo chofer registrado en la base de datos.');
      setTimeout(() => setNotificacion(''), 4000);
    } catch (err: any) {
      console.error('Error al guardar chofer en Firestore:', err);
      setFormError('Error al guardar en la base de datos: ' + (err.message || err));
    }
  };

  // Confirmar Eliminación
  const handleConfirmDelete = async () => {
    if (!choferAEliminar) return;
    try {
      await deleteDoc(doc(db, 'choferes', choferAEliminar.id));
      setNotificacion(`Se eliminó a ${choferAEliminar.nombre} de la base de datos.`);
      setChoferAEliminar(null);
      setTimeout(() => setNotificacion(''), 4000);
    } catch (err: any) {
      console.error('Error al eliminar chofer:', err);
      alert('Error al eliminar: ' + (err.message || err));
    }
  };

  // Exportar Modelo / Plantilla de Excel
  const handleExportModelTemplate = () => {
    const templateData = [
      {
        'Nombre y Apellido *': 'Carlos Eduardo Gómez',
        'DNI / CUIT *': '20-28491039-4',
        'Empresa de Transporte *': 'Transporte Expreso Pampa SRL',
        'Licencia / Carnet': 'B2-294021',
        'Patente Camión': 'AA 123 BB',
        'Patente Acoplado': 'CC 456 DD',
        'Teléfono Contacto': '2954-15492019'
      },
      {
        'Nombre y Apellido *': 'Juan Manuel Pérez',
        'DNI / CUIT *': '20-31849201-8',
        'Empresa de Transporte *': 'TransAgro SRL',
        'Licencia / Carnet': 'C3-382910',
        'Patente Camión': 'AB 987 CD',
        'Patente Acoplado': 'EF 321 GH',
        'Teléfono Contacto': '2302-15948302'
      },
      {
        'Nombre y Apellido *': 'Roberto Fernández',
        'DNI / CUIT *': '20-25948302-3',
        'Empresa de Transporte *': 'Logística del Campo SA',
        'Licencia / Carnet': 'B1-182940',
        'Patente Camión': 'AC 456 EF',
        'Patente Acoplado': '',
        'Teléfono Contacto': '2954-15839201'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 30 }, // Nombre
      { wch: 18 }, // DNI/CUIT
      { wch: 32 }, // Transporte
      { wch: 18 }, // Licencia
      { wch: 16 }, // Camion
      { wch: 16 }, // Acoplado
      { wch: 20 }  // Telefono
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Choferes');
    XLSX.writeFile(wb, 'Modelo_Base_de_Datos_Choferes.xlsx');
  };

  // Exportar Base de Datos Actual a Excel
  const handleExportCurrentDatabase = () => {
    if (choferes.length === 0) {
      alert('No hay choferes registrados para exportar.');
      return;
    }

    const exportData = choferes.map((c, idx) => ({
      'N°': idx + 1,
      'Nombre y Apellido': c.nombre,
      'DNI / CUIT': c.cuit || '—',
      'Empresa de Transporte': c.transporte || '—',
      'Licencia / Carnet': c.licencia || '—',
      'Patente Camión': c.patenteCamion || (c.patentes ? c.patentes.split('/')[0]?.trim() : '—'),
      'Patente Acoplado': c.patenteAcoplado || (c.patentes && c.patentes.includes('/') ? c.patentes.split('/')[1]?.trim() : '—'),
      'Patentes Combinadas': c.patentes || '—',
      'Teléfono / Contacto': c.telefono || '—'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 18 },
      { wch: 32 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Base_Choferes');
    XLSX.writeFile(wb, `Base_de_Datos_Choferes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Procesar archivo Excel para importar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportNotice('');
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          setImportError('El archivo Excel no contiene filas de datos.');
          setImportPreview([]);
          return;
        }

        const parsedChoferes: Partial<Chofer>[] = [];

        data.forEach((row, idx) => {
          // Búsqueda inteligente de columnas
          const getVal = (keys: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.toLowerCase().trim();
              if (keys.some((k) => cleanKey.includes(k))) {
                return String(row[key]).trim();
              }
            }
            return '';
          };

          const nombre = getVal(['nombre', 'chofer', 'driver', 'conductor', 'apellido']);
          const cuit = getVal(['cuit', 'dni', 'documento', 'identificacion']);
          const transporte = getVal(['transporte', 'empresa', 'razon social', 'flete']);
          const licencia = getVal(['licencia', 'carnet', 'conducir']);
          const patenteCamion = getVal(['camion', 'camión', 'tractor']);
          const patenteAcoplado = getVal(['acoplado', 'remolque', 'chasis']);
          let patentesComb = getVal(['patentes', 'patente', 'dominio']);
          const telefono = getVal(['telefono', 'teléfono', 'celular', 'contacto', 'movil']);

          if (!patentesComb && (patenteCamion || patenteAcoplado)) {
            patentesComb = patenteAcoplado ? `${patenteCamion} / ${patenteAcoplado}` : patenteCamion;
          }

          if (nombre || cuit || transporte) {
            parsedChoferes.push({
              nombre: nombre || `Chofer ${idx + 1}`,
              cuit: cuit || '—',
              transporte: transporte || 'Sin Transporte',
              licencia: licencia || undefined,
              patenteCamion: patenteCamion || undefined,
              patenteAcoplado: patenteAcoplado || undefined,
              patentes: patentesComb || '—',
              telefono: telefono || undefined
            });
          }
        });

        if (parsedChoferes.length === 0) {
          setImportError('No se pudieron reconocer columnas válidas (Nombre, DNI, Transporte) en el archivo Excel.');
          setImportPreview([]);
        } else {
          setImportPreview(parsedChoferes);
        }
      } catch (err: any) {
        console.error('Error al leer Excel:', err);
        setImportError('Error al leer el archivo Excel: ' + (err.message || err));
      }
    };

    reader.readAsBinaryString(file);
  };

  // Confirmar Importación e Insertar en Firestore
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    setImportError('');

    try {
      const batch = writeBatch(db);
      let importedCount = 0;

      for (const item of importPreview) {
        if (!item.nombre) continue;
        const id = `CHOFER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const docRef = doc(db, 'choferes', id);
        const fullChofer: Chofer = {
          id,
          nombre: item.nombre.trim(),
          cuit: (item.cuit || '—').trim(),
          transporte: (item.transporte || 'Sin Transporte').trim(),
          licencia: item.licencia ? item.licencia.trim() : undefined,
          patenteCamion: item.patenteCamion ? item.patenteCamion.trim() : undefined,
          patenteAcoplado: item.patenteAcoplado ? item.patenteAcoplado.trim() : undefined,
          patentes: (item.patentes || '—').trim(),
          telefono: item.telefono ? item.telefono.trim() : undefined
        };
        batch.set(docRef, fullChofer);
        importedCount++;
      }

      await batch.commit();
      setIsImporting(false);
      setShowModalImport(false);
      setImportPreview([]);
      setImportFile(null);
      setNotificacion(`¡Se importaron ${importedCount} choferes exitosamente a la base de datos!`);
      setTimeout(() => setNotificacion(''), 5000);
    } catch (err: any) {
      console.error('Error al guardar lote en Firestore:', err);
      setIsImporting(false);
      setImportError('Error en importación batch: ' + (err.message || err));
    }
  };

  // Filtrado de la lista
  const filteredChoferes = choferes.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.cuit && c.cuit.toLowerCase().includes(term)) ||
      (c.transporte && c.transporte.toLowerCase().includes(term)) ||
      (c.patentes && c.patentes.toLowerCase().includes(term)) ||
      (c.licencia && c.licencia.toLowerCase().includes(term)) ||
      (c.telefono && c.telefono.toLowerCase().includes(term))
    );
  });

  // Estadísticas únicas
  const totalTransportes = new Set(choferes.map((c) => c.transporte).filter(Boolean)).size;
  const totalConCuit = choferes.filter((c) => c.cuit && c.cuit !== '—').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Notificación Global de Éxito */}
      {notificacion && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 rounded-r-xl shadow-md flex items-center justify-between text-xs font-bold animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{notificacion}</span>
          </div>
          <button onClick={() => setNotificacion('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BANNER HEADER SUPERIOR DE TITULO Y ACCIONES */}
      <div className="bg-gradient-to-r from-[#00603C] via-[#004d30] to-[#1e3e2b] text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-[#00603C]/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs text-[#C9922E]">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-serif tracking-tight text-white">
                Base de Datos de Choferes y Transporte
              </h1>
              <span className="bg-[#C9922E] text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Maestro Data
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-medium mt-1">
              Registro centralizado de conductores, licencias, empresas de flete y patentes habilitadas
            </p>
          </div>
        </div>

        {/* Grupo de Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportModelTemplate}
            className="flex-1 md:flex-none px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Descargar Plantilla Excel estructurada para completar datos"
          >
            <Download className="w-4 h-4 text-[#C9922E]" />
            <span>Descargar Modelo</span>
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setImportPreview([]);
              setImportError('');
              setImportNotice('');
              setShowModalImport(true);
            }}
            className="flex-1 md:flex-none px-3.5 py-2 bg-[#C9922E] hover:bg-[#b07d24] text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Importar Ficha (Excel)</span>
          </button>

          <button
            onClick={handleExportCurrentDatabase}
            className="flex-1 md:flex-none px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Exportar base de datos actual a Excel"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Exportar Lista</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 md:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nuevo Chofer</span>
          </button>
        </div>
      </div>

      {/* METRICAS KPI CLAVE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Choferes Registrados
            </span>
            <span className="text-2xl font-black font-serif text-[#00603C] mt-0.5 block">
              {choferes.length}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-[#00603C] rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Empresas de Transporte
            </span>
            <span className="text-2xl font-black font-serif text-[#C9922E] mt-0.5 block">
              {totalTransportes}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-[#C9922E] rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              CUIT / DNI Verificados
            </span>
            <span className="text-2xl font-black font-serif text-blue-700 mt-0.5 block">
              {totalConCuit}
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* BARRA DE BUSQUEDA Y TABLA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header de Búsqueda */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, CUIT/DNI, Transporte, Patente o Teléfono..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Mostrando <strong className="text-slate-800">{filteredChoferes.length}</strong> de <strong className="text-slate-800">{choferes.length}</strong> registros
          </div>
        </div>

        {/* Tabla de Choferes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Chofer / Conductor</th>
                <th className="py-3 px-4">DNI / CUIT</th>
                <th className="py-3 px-4">Empresa / Transporte</th>
                <th className="py-3 px-4">Patentes (Camión/Acoplado)</th>
                <th className="py-3 px-4">Licencia / Carnet</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredChoferes.length > 0 ? (
                filteredChoferes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#00603C] flex items-center justify-center font-bold text-xs shrink-0">
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{c.nombre}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {c.cuit && c.cuit !== '—' ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                          {c.cuit}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No especificado</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{c.transporte || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-800">
                      {c.patentes && c.patentes !== '—' ? (
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200/80 font-bold">
                          {c.patentes}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sin patente</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {c.licencia ? (
                        <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                          {c.licencia}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-mono">
                      {c.telefono ? (
                        <div className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{c.telefono}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="Editar Chofer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setChoferAEliminar(c)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Eliminar Chofer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    {searchTerm ? (
                      <div>No se encontraron choferes que coincidan con "{searchTerm}".</div>
                    ) : (
                      <div>No hay choferes registrados en la base de datos. Haga clic en "+ Nuevo Chofer" o "Importar Ficha (Excel)".</div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NUEVO / EDITAR CHOFER */}
      {showModalAddEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-[#00603C] to-[#004d30] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl text-emerald-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-serif">
                    {choferAEditar ? 'Editar Chofer' : 'Registrar Nuevo Chofer'}
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    Sincronización directa con la Base de Datos Central
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalAddEdit(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChofer} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                  Nombre y Apellido Conductor *
                </label>
                <input
                  type="text"
                  placeholder="ej: Carlos Eduardo Gómez"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    DNI / CUIT *
                  </label>
                  <input
                    type="text"
                    placeholder="ej: 20-28491039-4"
                    value={formCuit}
                    onChange={(e) => setFormCuit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Licencia / Carnet
                  </label>
                  <input
                    type="text"
                    placeholder="ej: Cat. B2 / C3"
                    value={formLicencia}
                    onChange={(e) => setFormLicencia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                  Empresa de Transporte *
                </label>
                <input
                  type="text"
                  placeholder="ej: Transporte Expreso Pampa SRL"
                  value={formTransporte}
                  onChange={(e) => setFormTransporte(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Patente Camión
                  </label>
                  <input
                    type="text"
                    placeholder="ej: AA 123 BB"
                    value={formPatenteCamion}
                    onChange={(e) => setFormPatenteCamion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                    Patente Acoplado
                  </label>
                  <input
                    type="text"
                    placeholder="ej: CC 456 DD"
                    value={formPatenteAcoplado}
                    onChange={(e) => setFormPatenteAcoplado(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="ej: 2954-15492019"
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
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
                  {choferAEditar ? 'Guardar Cambios' : 'Registrar Chofer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR DESDE EXCEL */}
      {showModalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            
            <div className="bg-gradient-to-r from-[#C9922E] to-[#9b6f1e] text-slate-950 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-950/10 rounded-xl text-slate-950">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif text-slate-950">
                    Importar Ficha de Choferes desde Excel
                  </h3>
                  <p className="text-[11px] text-slate-900 font-medium">
                    Sube una lista en Excel o CSV para cargar choferes masivamente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalImport(false)}
                className="p-1 text-slate-900 hover:text-slate-950 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              {/* Instrucción y Botón de Descarga de Plantilla */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-amber-900">
                <div className="text-[11px] leading-relaxed">
                  <strong>Recomendación:</strong> Para garantizar un reconocimiento perfecto de las columnas, descarga nuestro modelo de tabla precargado y completa con tus datos.
                </div>
                <button
                  onClick={handleExportModelTemplate}
                  className="shrink-0 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Modelo Excel</span>
                </button>
              </div>

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Selector de Archivo Dropzone */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-amber-500 bg-slate-50 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <span className="font-bold text-slate-800 block text-sm">
                  {importFile ? importFile.name : 'Haz clic o arrastra aquí tu archivo Excel/CSV'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Formatos soportados: .xlsx, .xls, .csv
                </span>
              </div>

              {/* Vista Previa de Filas Mapeadas */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">
                      Vista previa de {importPreview.length} choferes reconocidos:
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Formato válido
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl text-[11px] divide-y divide-slate-100">
                    {importPreview.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-white flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{item.nombre}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            DNI: {item.cuit} · {item.transporte}
                          </div>
                        </div>
                        <div className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                          {item.patentes}
                        </div>
                      </div>
                    ))}
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
                  onClick={handleConfirmImport}
                  disabled={importPreview.length === 0 || isImporting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Importando a Base de Datos...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                      <span>Confirmar e Importar ({importPreview.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR CHOFER */}
      {choferAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-200" />
                <h3 className="font-bold text-base text-white font-serif">Eliminar Chofer</h3>
              </div>
              <button onClick={() => setChoferAEliminar(null)} className="text-red-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-700 font-medium">
                ¿Está seguro de eliminar a <strong className="text-slate-900 font-bold">{choferAEliminar.nombre}</strong> ({choferAEliminar.cuit}) de la base de datos de choferes?
              </p>
              <p className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                Esta acción eliminará el registro de la base de datos. Los registros de salidas o ingresos anteriores mantendrán sus datos impresos en los comprobantes.
              </p>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChoferAEliminar(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
