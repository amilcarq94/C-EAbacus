/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Lote } from '../types';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { FichaTecnicaOficialCard } from './FichaTecnicaOficialCard';

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
              Ficha Oficial de Lote y Trazabilidad (Plantilla fija de impresión A4).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Cancelar</span>
          </button>

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
            margin: 8mm 10mm 8mm 10mm;
          }
          header, nav, footer, button, .print\\:hidden, #nav-tab-dashboard, #nav-tab-lotes, #nav-tab-despachos, #nav-tab-historial-salidas, #nav-tab-importar, #lotes-stats-summary-bar {
            display: none !important;
          }
          .batch-print-page-break {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            max-height: 275mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .batch-print-page-break:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* Contenedor Imprimible */}
      <div className="w-full max-w-4xl space-y-8 print:space-y-0 print:w-full print:max-w-none">
        {lotes.map((lote, index) => (
          <FichaTecnicaOficialCard
            key={lote.id || `lote-print-${index}`}
            lote={lote}
            index={index}
          />
        ))}
      </div>

      {/* Barra Inferior de Acciones (Oculta al Imprimir) */}
      <div className="w-full max-w-4xl bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between mt-6 sticky bottom-2 z-50 print:hidden">
        <div className="text-xs text-slate-300">
          ¿Listo para imprimir <strong className="text-amber-400 font-mono font-bold">{lotes.length}</strong> {lotes.length === 1 ? 'ficha técnica' : 'fichas técnicas'}?
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Cancelar</span>
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
