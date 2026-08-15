/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Lote, OrdenProceso } from '../types';
import { LogoSiloLoose } from './Logo';
import { formatNumberArg, formatDateStr } from '../utils/formatters';
import { exportCardAsJpg } from '../utils/exportImage';
import {
  Printer,
  Download,
  Image as ImageIcon,
  Edit2,
  CheckCircle,
  RotateCcw,
  X,
  Eye,
  Loader2,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';

export interface ImprimirFichaTecnicaProps {
  lote: Lote;
  ordenesProceso?: OrdenProceso[];
  isOpen?: boolean;
  onClose?: () => void;
  onSaveLote?: (updatedLote: Lote) => void;
  initialEditMode?: boolean;
}

/**
 * Obtiene la URL pública de trazabilidad basada en el ID del lote
 */
const getTraceUrl = (loteId: string): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname}?lote=${encodeURIComponent(loteId)}`;
  }
  return `https://agroabacus.com/?lote=${encodeURIComponent(loteId)}`;
};

/**
 * Componente independiente para Imprimir Ficha Técnica de Lote.
 *
 * Características:
 * 1. Genera un layout A4 limpio, sobrio y de alta legibilidad para impresión y exportación.
 * 2. Utiliza la librería 'qrcode.react' para insertar el QR de trazabilidad oficial (300x300px, color #006837, nivel H).
 * 3. Gestiona el estado de edición interactivo para campos como 'observaciones', ubicación, cliente, etc.
 * 4. Permite impresión directa A4 con estilos print optimizados y descarga en formato .JPG en alta resolución.
 */
export const ImprimirFichaTecnica: React.FC<ImprimirFichaTecnicaProps> = ({
  lote,
  ordenesProceso,
  isOpen = true,
  onClose,
  onSaveLote,
  initialEditMode = false,
}) => {
  // Estado de edición para la Ficha Técnica (permite modificar datos antes de imprimir o descargar)
  const [draftLote, setDraftLote] = useState<Lote>({ ...lote });
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [isDownloadingJpg, setIsDownloadingJpg] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const cardDomId = `ficha-tecnica-print-${draftLote.id || 'current'}`;

  if (!isOpen) return null;

  // Actualizador genérico de campos
  const handleUpdateField = (field: keyof Lote | string, value: any) => {
    setDraftLote((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsModified(true);
  };

  // Restablecer valores a los originales del lote
  const handleResetToOriginal = () => {
    setDraftLote({ ...lote });
    setIsModified(false);
  };

  // Guardar cambios opcionalmente en el estado global
  const handleSaveDraft = () => {
    if (onSaveLote) {
      onSaveLote(draftLote);
    }
  };

  // Lanzar la impresión nativa del navegador con CSS A4 optimizado
  const handlePrint = () => {
    window.print();
  };

  // Descargar como imagen JPG de alta definición (2x DPI)
  const handleDownloadJpg = async () => {
    try {
      setIsDownloadingJpg(true);
      const safeLoteName = (draftLote.loteNro || draftLote.id || 'Lote').replace(/\s+/g, '_');
      const fileName = `Ficha_Tecnica_${safeLoteName}`;
      const success = await exportCardAsJpg(cardDomId, fileName);
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error al descargar Ficha Técnica en JPG:', err);
    } finally {
      setIsDownloadingJpg(false);
    }
  };

  // Cálculos y formateos de campos para la Ficha
  const fechaRealizadoDisplay =
    formatDateStr(
      draftLote.fechaIngreso ||
      (draftLote.fechaHoraProduccion ? draftLote.fechaHoraProduccion.split('T')[0] : '')
    ) || '14/08/2026';

  const especieDisplay = draftLote.especie || 'Soja';

  const variedadDisplay =
    draftLote.variedad && draftLote.variedad !== 'Genérica' && draftLote.variedad !== 'Sin variedad'
      ? draftLote.variedad
      : '—';

  const categoriaDisplay = draftLote.categoria || 'Pre básica';
  const tipoLoteDisplay = draftLote.tipo || 'Intermedio';

  const tratamientoDisplay = (() => {
    let t = 'Sin Tratar';
    if (Array.isArray(draftLote.tratamiento) && draftLote.tratamiento.length > 0) {
      t = draftLote.tratamiento.join(', ');
    } else if (typeof draftLote.tratamiento === 'string' && draftLote.tratamiento) {
      t = draftLote.tratamiento;
    }
    if (draftLote.producto && draftLote.producto !== 'Ninguno' && draftLote.producto !== 'Sin Tratar') {
      t += ` (${draftLote.producto})`;
    }
    return t;
  })();

  const ordenProcesoMovimientoDisplay =
    draftLote.ordenProcesoId ||
    (draftLote as any).ordenProceso ||
    (draftLote as any).numeroOrden ||
    draftLote.numeroOrdenMovimiento ||
    (draftLote as any).ordenProcesoMovimiento ||
    'Sin N°';

  const bolsonOrigenDisplay =
    (draftLote as any).numeroBolsonOrigen ||
    (draftLote as any).bolsonOrigenNro ||
    (draftLote.origenesBolson && draftLote.origenesBolson.length > 0
      ? draftLote.origenesBolson.map((b) => b.bolsonNro || b.bolsonId).filter(Boolean).join(', ')
      : '') ||
    'Sin dato';

  const sectorBolsonOrigenDisplay =
    (draftLote as any).sectorBolsonOrigen ||
    (draftLote.origenesBolson && draftLote.origenesBolson[0]?.sector
      ? `Sector ${draftLote.origenesBolson[0].sector}`
      : draftLote.ala && draftLote.sector
      ? `Ala ${draftLote.ala} - Sector ${draftLote.sector}`
      : draftLote.sector
      ? `Sector ${draftLote.sector}`
      : 'Ala A - Sector 1');

  const stockBolsasNum = draftLote.stockBolsas !== undefined && draftLote.stockBolsas !== null ? draftLote.stockBolsas : 35;
  const cantidadBolsasDisplay = `${formatNumberArg(stockBolsasNum, 0)} bolsas`;

  const kgPorBolsaNum =
    draftLote.kgPorBolsa ||
    (stockBolsasNum > 0 && draftLote.stockKg ? Math.round(draftLote.stockKg / stockBolsasNum) : 800);
  const kgPorBolsaDisplay = `${formatNumberArg(kgPorBolsaNum, 0)} kg`;

  const ubicacionAcopioDisplay =
    (draftLote as any).ubicacionAcopio ||
    (draftLote.ala && draftLote.sector
      ? `Ala ${draftLote.ala} - Sector ${draftLote.sector}`
      : draftLote.sector
      ? `Sector ${draftLote.sector}`
      : 'Ala A - Sector 1');

  const stockKgNum =
    draftLote.stockKg !== undefined && draftLote.stockKg !== null
      ? draftLote.stockKg
      : stockBolsasNum * kgPorBolsaNum;

  // Tabla estructurada con todos los parámetros técnicos
  const tablaDatos: { label: string; valor: string }[] = [
    { label: 'Fecha de realizado', valor: fechaRealizadoDisplay },
    { label: 'Especie', valor: especieDisplay },
    { label: 'Variedad', valor: variedadDisplay },
    { label: 'Categoría', valor: categoriaDisplay },
    { label: 'Tipo de lote', valor: tipoLoteDisplay },
    { label: 'Tratamiento', valor: tratamientoDisplay },
    { label: 'N° Orden de Proceso/Movimiento', valor: String(ordenProcesoMovimientoDisplay) },
    { label: 'N° Bolsón de origen (trazabilidad)', valor: String(bolsonOrigenDisplay) },
    { label: 'Sector de bolsón de origen', valor: String(sectorBolsonOrigenDisplay) },
    { label: 'Cantidad de bolsas', valor: cantidadBolsasDisplay },
    { label: 'Kg por bolsa', valor: kgPorBolsaDisplay },
    { label: 'Ubicación de acopio', valor: String(ubicacionAcopioDisplay) },
  ];

  // Observaciones especiales gestionadas en el formulario de edición
  if (draftLote.observaciones && draftLote.observaciones.trim()) {
    tablaDatos.push({
      label: 'Observaciones',
      valor: draftLote.observaciones.trim(),
    });
  }

  const qrTraceabilityUrl = getTraceUrl(draftLote.id);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto print:z-auto">
      {/* Estilos específicos de impresión A4 limpia */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, header, nav, aside, footer, .batch-print-modal-container {
            display: none !important;
          }
          #${cardDomId} {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: 1.5px solid #006837 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* 1. BARRA SUPERIOR DE ACCIONES (Controles, Modo Edición, Imprimir, Descargar JPG, Cerrar) */}
      <div className="w-full max-w-4xl bg-slate-900 text-white px-4 sm:px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 sticky top-2 z-50 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#006837] rounded-xl text-white shadow-xs">
            <FileText className="w-5 h-5 text-[#C9922E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">
                Ficha Técnica de Lote (A4)
              </h3>
              {isModified && (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border border-amber-400/30">
                  Modificada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Lote: <strong className="text-emerald-300 font-mono">{draftLote.loteNro}</strong> · {draftLote.cliente}
            </p>
          </div>
        </div>

        {/* Grupo de botones principales */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Botón Alternar Modo Edición / Vista Previa */}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer border ${
              isEditing
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="Editar campos técnicos y observaciones antes de imprimir"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Ocultar Edición' : 'Editar Ficha'}</span>
          </button>

          {/* Botón Descargar en Formato .JPG */}
          <button
            type="button"
            onClick={handleDownloadJpg}
            disabled={isDownloadingJpg}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-lg border border-amber-500/30 transition cursor-pointer disabled:opacity-50"
            title="Descargar la Ficha Técnica completa como archivo de imagen .JPG"
          >
            {isDownloadingJpg ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-[#C9922E]" />
            )}
            <span>{isDownloadingJpg ? 'Generando...' : 'Descargar JPG'}</span>
          </button>

          {/* Botón Imprimir A4 */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#006837] hover:bg-[#254731] text-white font-black text-xs uppercase tracking-wider rounded-lg border border-emerald-500/40 shadow-sm transition cursor-pointer"
            title="Imprimir documento en formato A4"
          >
            <Printer className="w-3.5 h-3.5 text-[#C9922E]" />
            <span>Imprimir A4</span>
          </button>

          {/* Botón Cerrar */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. PANEL DESPLEGABLE DE EDICIÓN DE CAMPOS (OBSERVACIONES, DATOS TÉCNICOS, STOCK) */}
      {isEditing && (
        <div className="w-full max-w-4xl bg-white rounded-2xl p-5 shadow-xl border border-gray-200 mb-4 print:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2 text-[#00603C]">
              <Edit2 className="w-4 h-4 text-[#C9922E]" />
              <h4 className="font-serif font-black text-xs uppercase tracking-wider">
                Panel de Edición Rápida de la Ficha Técnica
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {isModified && (
                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer Original</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleSaveDraft();
                  setIsEditing(false);
                }}
                className="px-3 py-1 bg-[#00603C] hover:bg-[#254731] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#C9922E]" />
                <span>Aplicar a Vista Previa</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">N° de Lote</label>
              <input
                type="text"
                value={draftLote.loteNro || ''}
                onChange={(e) => handleUpdateField('loteNro', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 focus:bg-white focus:border-[#00603C] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cliente</label>
              <input
                type="text"
                value={draftLote.cliente || ''}
                onChange={(e) => handleUpdateField('cliente', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Especie</label>
              <input
                type="text"
                value={draftLote.especie || ''}
                onChange={(e) => handleUpdateField('especie', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Variedad</label>
              <input
                type="text"
                value={draftLote.variedad || ''}
                onChange={(e) => handleUpdateField('variedad', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Categoría</label>
              <input
                type="text"
                value={draftLote.categoria || ''}
                onChange={(e) => handleUpdateField('categoria', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tipo de Lote</label>
              <input
                type="text"
                value={draftLote.tipo || ''}
                onChange={(e) => handleUpdateField('tipo', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tratamiento / Curado</label>
              <input
                type="text"
                value={Array.isArray(draftLote.tratamiento) ? draftLote.tratamiento.join(', ') : (draftLote.tratamiento as any) || ''}
                onChange={(e) => handleUpdateField('tratamiento', e.target.value.split(',').map(s => s.trim()))}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
                placeholder="Sin Tratar, Curado..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Producto Químico</label>
              <input
                type="text"
                value={draftLote.producto || ''}
                onChange={(e) => handleUpdateField('producto', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
                placeholder="Ninguno, Maxim XL..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">N° Orden Proceso/Mov.</label>
              <input
                type="text"
                value={draftLote.ordenProcesoId || (draftLote as any).numeroOrdenMovimiento || (draftLote as any).ordenProceso || ''}
                onChange={(e) => handleUpdateField('ordenProcesoId', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 font-mono focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">N° Bolsón de Origen</label>
              <input
                type="text"
                value={(draftLote as any).numeroBolsonOrigen || (draftLote as any).bolsonOrigenNro || ''}
                onChange={(e) => handleUpdateField('numeroBolsonOrigen', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 font-mono focus:bg-white focus:border-[#00603C] focus:outline-none"
                placeholder="Ej: B-12"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Sector Bolsón Origen</label>
              <input
                type="text"
                value={(draftLote as any).sectorBolsonOrigen || ''}
                onChange={(e) => handleUpdateField('sectorBolsonOrigen', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
                placeholder="Ej: Ala A - Sector 1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ubicación de Acopio</label>
              <input
                type="text"
                value={(draftLote as any).ubicacionAcopio || (draftLote.ala && draftLote.sector ? `Ala ${draftLote.ala} - Sector ${draftLote.sector}` : '')}
                onChange={(e) => handleUpdateField('ubicacionAcopio', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
                placeholder="Ej: Ala A - Sector 1"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cantidad Bolsas</label>
              <input
                type="number"
                min="0"
                value={draftLote.stockBolsas || 0}
                onChange={(e) => handleUpdateField('stockBolsas', Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 font-mono focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Kg por Bolsa</label>
              <input
                type="number"
                min="1"
                value={draftLote.kgPorBolsa || 40}
                onChange={(e) => handleUpdateField('kgPorBolsa', Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 font-mono focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Fecha de Realizado</label>
              <input
                type="date"
                value={draftLote.fechaIngreso || ''}
                onChange={(e) => handleUpdateField('fechaIngreso', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Stock Total (Kg)</label>
              <input
                type="number"
                value={draftLote.stockKg !== undefined ? draftLote.stockKg : (draftLote.stockBolsas || 0) * (draftLote.kgPorBolsa || 40)}
                onChange={(e) => handleUpdateField('stockKg', parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 font-mono focus:bg-white focus:border-[#00603C] focus:outline-none"
              />
            </div>

            {/* Campo clave: Observaciones / Notas de la Ficha Técnica */}
            <div className="sm:col-span-2 md:col-span-4">
              <label className="block text-[10px] font-bold uppercase text-[#00603C] mb-1 flex items-center justify-between">
                <span>Observaciones / Notas Especiales de la Ficha Técnica</span>
                <span className="text-[9px] text-gray-400 font-normal">Aparece en la tabla técnica del documento</span>
              </label>
              <textarea
                rows={2}
                value={draftLote.observaciones || ''}
                onChange={(e) => handleUpdateField('observaciones', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 text-xs focus:bg-white focus:border-[#00603C] focus:outline-none resize-none"
                placeholder="Ingrese observaciones técnicas, destino o especificaciones especiales de curado o acopio..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Alerta de éxito al descargar JPG */}
      {downloadSuccess && (
        <div className="w-full max-w-4xl bg-emerald-600 text-white px-4 py-2 rounded-xl mb-3 text-xs font-bold flex items-center justify-between animate-in fade-in duration-150 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Ficha Técnica exportada exitosamente como archivo .JPG en alta definición.</span>
          </div>
        </div>
      )}

      {/* 3. CONTENEDOR DE LA FICHA TÉCNICA (LAYOUT A4 LIMPIO) */}
      <div className="w-full max-w-4xl flex justify-center print:w-full print:max-w-none">
        <div
          ref={cardRef}
          id={cardDomId}
          className="bg-white rounded-2xl border-[1.5px] border-[#006837] shadow-xl relative text-[#0F172A] font-sans ficha-tecnica-a4-container"
          style={{
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '794px', // Proporción visual A4 estándar a 96DPI
            padding: '18px 22px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* ENCABEZADO OFICIAL */}
          <div className="flex items-center justify-start gap-3.5 pb-2 mb-2 border-b-[1.5px] border-[#006837]">
            <div className="shrink-0 flex items-center justify-center">
              <LogoSiloLoose size={40} color="#006837" />
            </div>
            <div className="text-left">
              <h1
                className="font-serif font-black text-[#006837] tracking-wider uppercase m-0 leading-tight"
                style={{ fontSize: '18px' }}
              >
                AGRO ABACUS S.A.
              </h1>
              <p
                className="text-[#64748B] font-semibold m-0 tracking-normal text-xs mt-0.5"
              >
                Planta de Clasificación de Semillas · Estancia La Barrancosa
              </p>
            </div>
          </div>

          {/* TÍTULO DE DOCUMENTO */}
          <div className="text-center my-1.5">
            <h2
              className="font-serif font-extrabold uppercase tracking-widest text-[#006837] m-0"
              style={{ fontSize: '14px' }}
            >
              FICHA DE LOTE
            </h2>
          </div>

          {/* HERO BOX: DATOS PRINCIPALES + CÓDIGO QR TRAZABILIDAD OFICIAL 300x300px CON COLOR #006837 */}
          <div className="bg-[#F8FAFC] rounded-xl p-4 mb-2.5 border border-[#E2E8F0] flex items-center justify-between gap-5">
            {/* Columna Izquierda: N° DE LOTE (60px) y CLIENTE (60px) */}
            <div className="flex-1 min-w-0 text-left space-y-2.5">
              {/* N° DE LOTE */}
              <div className="min-w-0">
                <span className="block text-[11px] font-mono font-bold text-[#64748B] uppercase tracking-wider leading-none mb-1">
                  N° DE LOTE
                </span>
                <div
                  className="font-mono font-black text-[#006837] tracking-tight truncate leading-none"
                  style={{ fontSize: '60px', lineHeight: 1 }}
                  title={draftLote.loteNro || 'L - 64'}
                >
                  {draftLote.loteNro || 'L - 64'}
                </div>
              </div>

              {/* CLIENTE */}
              <div className="min-w-0 pt-0.5">
                <span className="block text-[11px] font-mono font-bold text-[#64748B] uppercase tracking-wider leading-none mb-1">
                  CLIENTE
                </span>
                <div
                  className="font-sans font-black text-[#0F172A] uppercase tracking-tight truncate leading-none"
                  style={{ fontSize: '60px', lineHeight: 1.05 }}
                  title={draftLote.cliente || 'SAN DIEGO SEMILLAS'}
                >
                  {draftLote.cliente || 'SAN DIEGO SEMILLAS'}
                </div>
              </div>
            </div>

            {/* Columna Derecha: CÓDIGO QR TRAZABILIDAD (300x300px renderizado con qrcode.react en color #006837) */}
            <div className="shrink-0 flex flex-col items-center justify-center">
              <div
                className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col items-center justify-center w-[185px] h-[185px]"
                style={{ boxSizing: 'border-box' }}
              >
                <div
                  className="flex items-center justify-center overflow-hidden w-full h-full"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                >
                  <QRCodeSVG
                    value={qrTraceabilityUrl}
                    size={300}
                    bgColor="#FFFFFF"
                    fgColor="#006837"
                    level="H"
                    includeMargin={true}
                    className="w-full h-full aspect-square block"
                  />
                </div>
                <span
                  className="font-sans font-bold text-[#475569] uppercase tracking-wider mt-1.5 text-center block whitespace-nowrap"
                  style={{ fontSize: '10px', lineHeight: 1.2, letterSpacing: '0.08em' }}
                >
                  QR TRAZABILIDAD
                </span>
              </div>
            </div>
          </div>

          {/* TABLA DE DATOS OPERATIVOS Y OBSERVACIONES */}
          <div className="w-full rounded-lg overflow-hidden border border-[#E2E8F0] mb-2.5">
            <table className="w-full border-collapse text-left text-xs" style={{ fontSize: '10.5px' }}>
              <tbody>
                {tablaDatos.map((fila, idx) => (
                  <tr
                    key={fila.label}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      borderBottom: idx === tablaDatos.length - 1 ? 'none' : '1px solid #E2E8F0',
                      height: '22px',
                    }}
                  >
                    <td
                      className="py-0.5 px-3.5 font-semibold text-[#475569] align-middle border-r border-[#E2E8F0]/70"
                      style={{ width: '42%', whiteSpace: 'nowrap' }}
                    >
                      {fila.label}
                    </td>
                    <td
                      className="py-0.5 px-3.5 font-bold text-[#0F172A] align-middle break-words"
                      style={{ width: '58%' }}
                      title={fila.valor}
                    >
                      {fila.valor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PIE DE FICHA (BANNER DE STOCK) */}
          <div
            className="w-full text-white text-center rounded-lg font-sans font-bold uppercase tracking-wider py-1.5 px-4 mb-1.5 shadow-xs"
            style={{
              backgroundColor: '#006837',
              color: '#FFFFFF',
              fontSize: '11.5px',
            }}
          >
            STOCK INICIAL: {formatNumberArg(stockKgNum, 0)} KG ({formatNumberArg(stockBolsasNum, 0)} BOLSAS)
          </div>

          {/* NOTA AL PIE DE PÁGINA */}
          <div className="text-center pt-0.5">
            <p
              className="text-[#94A3B8] italic font-medium m-0"
              style={{ fontSize: '8.5px' }}
            >
              Agro Abacus S.A. — Planta de Clasificación de Semillas · Estancia La Barrancosa
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
