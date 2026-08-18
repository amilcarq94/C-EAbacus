/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Printer, Download, X, Check, FileCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import { FichaTecnicaSiloCard, SiloFichaInfo } from './FichaTecnicaSiloCard';

interface FichaTecnicaSiloModalProps {
  ficha: SiloFichaInfo | null;
  onClose: () => void;
}

export const FichaTecnicaSiloModal: React.FC<FichaTecnicaSiloModalProps> = ({
  ficha,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!ficha) return null;

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

  const handleDownloadPng = async () => {
    const el = document.getElementById('ficha-silo-printable-card');
    if (!el) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Ficha_Tecnica_${ficha.siloId.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al descargar PNG de Ficha Silo:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      {/* Estilos CSS dedicados para impresión de Ficha Individual de Silo en Hoja A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body > *:not(.ficha-silo-modal-root) {
            display: none !important;
          }
          header, nav, aside, footer, button, .print\\:hidden, #nav-tab-dashboard, #nav-tab-lotes, #nav-tab-despachos, #nav-tab-historial-salidas, #nav-tab-importar {
            display: none !important;
          }
          .ficha-silo-modal-root {
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
          .ficha-silo-print-wrapper {
            width: 100% !important;
            max-width: 180mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="ficha-silo-modal-root flex flex-col items-center gap-4 max-h-[95vh] my-auto">
        {/* Barra de Acciones Superior */}
        <div className="flex items-center justify-between w-full max-w-[520px] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Ficha Técnica · {ficha.siloId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#005E38] hover:bg-[#004D2E] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Imprimir Ficha Técnica de Silo"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 border border-slate-700"
              title="Descargar Ficha en formato de imagen PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Generando...' : 'PNG'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tarjeta Visual de Ficha */}
        <div className="ficha-silo-print-wrapper w-full max-w-[520px]">
          <FichaTecnicaSiloCard
            elementId="ficha-silo-printable-card"
            ficha={ficha}
          />
        </div>

        {/* Barra de Botones Inferior: Imprimir / Aceptar / Cancelar (print:hidden) */}
        <div className="flex items-center justify-end gap-2.5 w-full max-w-[520px] bg-slate-100 p-3 rounded-2xl border border-slate-300 print:hidden shadow-md">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isDownloading}
            className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Descargar PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-[#005E38] hover:bg-[#004D2E] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aceptar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
