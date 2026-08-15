/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Lote } from '../types';
import { Printer, X, CheckCircle2, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FichaTecnicaOficialCard } from './FichaTecnicaOficialCard';
import { exportCardAsJpg } from '../utils/exportImage';

interface BatchPrintLotesModalProps {
  isOpen: boolean;
  lotes: Lote[];
  onClose: () => void;
}

export const BatchPrintLotesModal: React.FC<BatchPrintLotesModalProps> = ({
  isOpen,
  lotes,
  onClose,
}) => {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  useEffect(() => {
    if (isOpen && lotes.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, lotes]);

  if (!isOpen || lotes.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSingleJpg = async (lote: Lote, index: number) => {
    const cardId = `ficha-batch-card-${lote.id || index}`;
    const safeLoteName = (lote.loteNro || lote.id || `Lote_${index + 1}`).replace(/\s+/g, '_');
    const fileName = `Ficha_Tecnica_${safeLoteName}`;
    setDownloadingIndex(index);
    await exportCardAsJpg(cardId, fileName);
    setDownloadingIndex(null);
  };

  const handleDownloadAllJpg = async () => {
    setIsDownloadingAll(true);
    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i];
      const cardId = `ficha-batch-card-${lote.id || i}`;
      const safeLoteName = (lote.loteNro || lote.id || `Lote_${i + 1}`).replace(/\s+/g, '_');
      const fileName = `Ficha_Tecnica_${safeLoteName}`;
      await exportCardAsJpg(cardId, fileName);
      // Small pause between multiple file downloads to let the browser process
      await new Promise(res => setTimeout(res, 300));
    }
    setIsDownloadingAll(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto print:z-auto batch-print-modal-container">
      {/* Barra Superior de Acciones (Oculta al Imprimir) */}
      <div className="w-full max-w-4xl bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sticky top-2 z-50 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#00603C] rounded-xl text-white shadow-xs">
            <Printer className="w-5 h-5 text-[#C9922E]" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm tracking-wide uppercase text-white flex items-center gap-2">
              <span>Vista previa de impresión de fichas</span>
              <span className="bg-emerald-800 text-emerald-200 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                {lotes.length} {lotes.length === 1 ? 'ficha' : 'fichas'}
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Ficha de Lote y Trazabilidad (Plantilla fija de impresión A4 o descarga en .JPG).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Cerrar</span>
          </button>

          {/* Botón Descargar en .JPG */}
          <button
            type="button"
            onClick={handleDownloadAllJpg}
            disabled={isDownloadingAll}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs uppercase tracking-wider rounded-xl border border-amber-500/40 transition cursor-pointer disabled:opacity-50"
            title="Descargar cada ficha en imagen de alta resolución .JPG"
          >
            {isDownloadingAll ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <ImageIcon className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {isDownloadingAll
                ? 'Descargando...'
                : lotes.length === 1
                ? 'Descargar .JPG'
                : `Descargar ${lotes.length} JPG`}
            </span>
          </button>

          {/* Botón Aceptar e Imprimir */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-[#00603C] hover:bg-[#254731] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer border border-emerald-500/30"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <Printer className="w-4 h-4 text-[#C9922E]" />
            <span>Aceptar e Imprimir ({lotes.length})</span>
          </button>
        </div>
      </div>

      {/* Estilos CSS Específicos para Impresión A4 de Hoja Única */}
      <style>{`
        @media print {
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          body > *:not(.batch-print-modal-container) {
            display: none !important;
          }
          header, nav, aside, footer, button, .print\\:hidden, #nav-tab-dashboard, #nav-tab-lotes, #nav-tab-despachos, #nav-tab-historial-salidas, #nav-tab-importar, #lotes-stats-summary-bar {
            display: none !important;
          }
          .batch-print-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            display: block !important;
            overflow: visible !important;
          }
          .batch-print-page-break {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 275mm !important;
            max-height: 275mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            margin-bottom: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .batch-print-page-break:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* Contenedor Imprimible */}
      <div className="w-full max-w-4xl space-y-8 print:space-y-0 print:w-full print:max-w-none">
        {lotes.map((lote, index) => {
          const cardDomId = `ficha-batch-card-${lote.id || index}`;
          const isDownloadingThis = downloadingIndex === index;
          return (
            <div key={lote.id || `lote-print-${index}`} className="relative group">
              {/* Botón flotante para descargar ficha individual en JPG (sólo en pantalla) */}
              <div className="flex justify-end mb-1 print:hidden">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleJpg(lote, index)}
                  disabled={isDownloadingThis}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-[#00603C] rounded-lg shadow-sm border border-slate-300 text-xs font-bold transition cursor-pointer"
                  title="Descargar esta ficha en formato imagen JPG"
                >
                  {isDownloadingThis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00603C]" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-[#00603C]" />
                  )}
                  <span>Descargar Ficha en .JPG</span>
                </button>
              </div>

              <FichaTecnicaOficialCard
                id={cardDomId}
                lote={lote}
                index={index}
              />
            </div>
          );
        })}
      </div>

      {/* Barra Inferior de Acciones (Oculta al Imprimir) */}
      <div className="w-full max-w-4xl bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 sticky bottom-2 z-50 print:hidden">
        <div className="text-xs text-slate-300">
          ¿Listo para imprimir <strong className="text-amber-400 font-mono font-bold">{lotes.length}</strong> {lotes.length === 1 ? 'ficha técnica' : 'fichas técnicas'}?
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Cerrar</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAllJpg}
            disabled={isDownloadingAll}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs uppercase tracking-wider rounded-xl border border-amber-500/40 transition cursor-pointer disabled:opacity-50"
          >
            {isDownloadingAll ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <ImageIcon className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {isDownloadingAll
                ? 'Descargando...'
                : lotes.length === 1
                ? 'Descargar .JPG'
                : `Descargar ${lotes.length} JPG`}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-[#00603C] hover:bg-[#254731] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer border border-emerald-500/30"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <Printer className="w-4 h-4 text-[#C9922E]" />
            <span>Aceptar e Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
