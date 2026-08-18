/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Lote, OrdenProceso } from '../types';
import { LogoSiloLoose } from './Logo';
import { QrTrazabilidadLote } from './QrTrazabilidadLote';
import { formatNumberArg } from '../utils/formatters';
import { exportCardAsJpg } from '../utils/exportImage';
import { useFichaLoteData } from '../hooks/useFichaLoteData';
import {
  Printer,
  Download,
  Edit2,
  CheckCircle,
  RotateCcw,
  X,
  Eye,
  FileText,
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
 * Componente independiente para Imprimir Ficha Técnica de Lote.
 *
 * Características:
 * 1. Genera un layout A4 limpio, sobrio y de alta legibilidad para impresión y exportación.
 * 2. Utiliza el componente oficial QrTrazabilidadLote (300x300px, color #006837, nivel H).
 * 3. Centraliza datos con useFichaLoteData para garantizar coherencia con todas las vistas.
 * 4. Gestiona edición interactiva de campos con límite de 200 caracteres en observaciones.
 * 5. Sincroniza fuentes antes de lanzar window.print().
 */
export const ImprimirFichaTecnica: React.FC<ImprimirFichaTecnicaProps> = ({
  lote,
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

  // Hook centralizado para datos y formateos de la Ficha
  const {
    stockKgNum,
    stockBolsasNum,
    tablaDatos,
  } = useFichaLoteData(draftLote);

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

  // Lanzar la impresión nativa del navegador asegurando carga de fuentes y QR
  const handlePrint = async () => {
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      window.print();
    } catch {
      window.print();
    }
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

      {/* 1. BARRA SUPERIOR DE ACCIONES */}
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
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingJpg ? 'Generando...' : 'Descargar JPG'}</span>
          </button>

          {/* Botón Imprimir A4 Oficial */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#006837] hover:bg-[#254731] text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-md transition cursor-pointer border border-emerald-400/40"
            title="Imprimir Ficha Técnica de Lote Oficial en hoja A4"
          >
            <Printer className="w-3.5 h-3.5 text-[#C9922E]" />
            <span>Imprimir A4</span>
          </button>

          {/* Botón Cerrar Modal */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer ml-1"
              title="Cerrar ventana de impresión"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. PANEL DE EDICIÓN FLOTANTE / EXPANDIBLE (Solo visible cuando isEditing === true) */}
      {isEditing && (
        <div className="w-full max-w-4xl bg-white text-slate-900 p-5 rounded-2xl shadow-xl border border-gray-200 mb-4 animate-in fade-in slide-in-from-top-2 duration-200 print:hidden">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#006837]" />
              <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                Modificar Campos Técnicos para la Ficha
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {isModified && (
                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                  title="Restablecer datos a los originales guardados del lote"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restablecer</span>
                </button>
              )}

              {onSaveLote && isModified && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
                  title="Guardar estos cambios en la base de datos principal"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Guardar en Base de Datos</span>
                </button>
              )}
            </div>
          </div>

          {/* Formulario de Campos Editables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">N° de Lote</label>
              <input
                type="text"
                value={draftLote.loteNro || ''}
                onChange={(e) => handleUpdateField('loteNro', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cliente</label>
              <input
                type="text"
                value={draftLote.cliente || ''}
                onChange={(e) => handleUpdateField('cliente', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Especie</label>
              <input
                type="text"
                value={draftLote.especie || ''}
                onChange={(e) => handleUpdateField('especie', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Variedad</label>
              <input
                type="text"
                value={draftLote.variedad || ''}
                onChange={(e) => handleUpdateField('variedad', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Categoría</label>
              <input
                type="text"
                value={draftLote.categoria || ''}
                onChange={(e) => handleUpdateField('categoria', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tipo de Lote</label>
              <input
                type="text"
                value={draftLote.tipo || ''}
                onChange={(e) => handleUpdateField('tipo', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tratamiento / Curado</label>
              <input
                type="text"
                value={Array.isArray(draftLote.tratamiento) ? draftLote.tratamiento.join(', ') : (draftLote.tratamiento as any) || ''}
                onChange={(e) => handleUpdateField('tratamiento', e.target.value.split(',').map(s => s.trim()))}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
                placeholder="Sin Tratar, Curado..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Producto Químico</label>
              <input
                type="text"
                value={draftLote.producto || ''}
                onChange={(e) => handleUpdateField('producto', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
                placeholder="Ninguno, Maxim XL..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">N° Orden Proceso/Mov.</label>
              <input
                type="text"
                value={draftLote.ordenProcesoId || (draftLote as any).numeroOrdenMovimiento || (draftLote as any).ordenProceso || ''}
                onChange={(e) => handleUpdateField('ordenProcesoId', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 font-mono focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">N° Bolsón de Origen</label>
              <input
                type="text"
                value={(draftLote as any).numeroBolsonOrigen || (draftLote as any).bolsonOrigenNro || ''}
                onChange={(e) => handleUpdateField('numeroBolsonOrigen', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
                placeholder="Ej: B-102, B-103"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Sector Bolsón Origen</label>
              <input
                type="text"
                value={(draftLote as any).sectorBolsonOrigen || ''}
                onChange={(e) => handleUpdateField('sectorBolsonOrigen', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
                placeholder="Ej: Sector 1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ubicación Acopio</label>
              <input
                type="text"
                value={(draftLote as any).ubicacionAcopio || ''}
                onChange={(e) => handleUpdateField('ubicacionAcopio', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
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
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 font-mono focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Kg por Bolsa</label>
              <input
                type="number"
                min="1"
                value={draftLote.kgPorBolsa || 800}
                onChange={(e) => handleUpdateField('kgPorBolsa', Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 font-mono focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Fecha de Realizado</label>
              <input
                type="date"
                value={draftLote.fechaIngreso || ''}
                onChange={(e) => handleUpdateField('fechaIngreso', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Stock Total (Kg)</label>
              <input
                type="number"
                value={draftLote.stockKg !== undefined ? draftLote.stockKg : (draftLote.stockBolsas || 0) * (draftLote.kgPorBolsa || 800)}
                onChange={(e) => handleUpdateField('stockKg', parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 font-mono focus:bg-white focus:border-[#006837] focus:outline-none"
              />
            </div>

            {/* Campo clave: Observaciones con límite de 200 caracteres */}
            <div className="sm:col-span-2 md:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase text-[#006837]">
                  Observaciones / Notas Especiales de la Ficha Técnica
                </label>
                <span className={`text-[9px] font-mono font-bold ${(draftLote.observaciones || '').length > 180 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {(draftLote.observaciones || '').length}/200 caracteres
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={200}
                value={draftLote.observaciones || ''}
                onChange={(e) => handleUpdateField('observaciones', e.target.value.slice(0, 200))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 text-xs focus:bg-white focus:border-[#006837] focus:outline-none resize-none"
                placeholder="Ingrese observaciones técnicas, destino o especificaciones especiales de curado o acopio (máx. 200 caracteres)..."
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

      {/* 3. VISTA PREVIA / HOJA OFICIAL A4 IMPRIMIBLE */}
      <div className="w-full flex justify-center print:w-full print:block">
        <div
          ref={cardRef}
          id={cardDomId}
          className="bg-white rounded-2xl border-[1.5px] border-[#006837] shadow-2xl relative text-[#0F172A] font-sans overflow-visible print:border-none print:shadow-none"
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

          {/* HERO BOX: DATOS PRINCIPALES + CÓDIGO QR TRAZABILIDAD OFICIAL */}
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

            {/* Columna Derecha: CÓDIGO QR TRAZABILIDAD OFICIAL */}
            <div className="shrink-0 flex flex-col items-center justify-center">
              <QrTrazabilidadLote
                loteId={draftLote.id}
                size={300}
                className="w-[185px] h-[185px]"
              />
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
                      minHeight: '22px',
                    }}
                  >
                    <td
                      className="py-0.5 px-3.5 font-semibold text-[#475569] align-middle border-r border-[#E2E8F0]/70"
                      style={{ width: '42%', whiteSpace: 'nowrap' }}
                    >
                      {fila.label}
                    </td>
                    <td
                      className={`py-0.5 px-3.5 font-bold text-[#0F172A] align-middle ${
                        fila.label === 'Observaciones' ? 'break-words' : 'truncate max-w-[320px]'
                      }`}
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
