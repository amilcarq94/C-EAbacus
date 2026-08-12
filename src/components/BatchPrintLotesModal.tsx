/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Lote } from '../types';
import { LogoSiloLoose } from './Logo';
import { Printer, X, FileText, CheckCircle2, Clock } from 'lucide-react';
import { formatNumberArg } from '../utils/formatters';

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
      // Opcional: auto-disparar print tras abrir o dejar que el usuario haga clic
    }
  }, [isOpen, lotes]);

  if (!isOpen || lotes.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto print:z-auto">
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
              Confirme para enviar a la impresora. Haga clic en <strong className="text-emerald-400 font-bold">Aceptar e Imprimir</strong> o <strong className="text-slate-300 font-bold">Cancelar</strong> para salir.
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

      {/* Estilos CSS Específicos para Impresión A4 */}
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
            margin: 6mm 10mm 6mm 10mm;
          }
          header, nav, footer, button, .print\\:hidden, #nav-tab-dashboard, #nav-tab-lotes, #nav-tab-despachos, #nav-tab-historial-salidas, #nav-tab-importar, #lotes-stats-summary-bar {
            display: none !important;
          }
          .batch-print-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          .batch-print-card {
            border: 2px solid #00603C !important;
            border-radius: 12px !important;
            padding: 20px !important;
            margin: 0 auto 0 auto !important;
            width: 100% !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .force-bg-green {
            background-color: #00603C !important;
            color: #ffffff !important;
          }
          .force-bg-light {
            background-color: #E3EFE7 !important;
          }
        }
      `}</style>

      {/* Contenedor Imprimible */}
      <div className="w-full max-w-4xl space-y-8 print:space-y-0 print:w-full print:max-w-none">
        {lotes.map((lote, index) => (
          <div
            key={lote.id || `lote-print-${index}`}
            className="bg-white p-6 md:p-8 border-2 border-[#00603C] rounded-2xl shadow-xl relative text-[#1A1A1A] font-sans batch-print-card batch-print-page-break"
          >
            {/* Sello de Marca de agua de fondo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <LogoSiloLoose size={340} color="#00603C" />
            </div>

            {/* Header de impresión */}
            <div className="flex justify-between items-center border-b border-[#00603C] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <LogoSiloLoose size={34} color="#00603C" />
                <div className="text-left">
                  <h1 className="font-serif text-base font-bold text-[#00603C] tracking-wide uppercase">
                    AGRO ABACUS S.A.
                  </h1>
                  <p className="text-[8px] font-semibold tracking-widest text-[#C9922E] uppercase">
                    ESTANCIA LA BARRANCOSA — PLANTA CLASIFICADORA
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-slate-500 text-[9px] leading-tight">
                <p className="font-bold text-[#00603C] uppercase tracking-wider text-[10px]">Ficha Técnica Oficial</p>
                <p className="mt-0.5">ID REGISTRO: {lote.id}</p>
                <p>Fecha impresión: {new Date().toLocaleDateString('es-AR')}</p>
              </div>
            </div>

            {/* Título de la Ficha */}
            <div className="text-center mb-3">
              <h2 className="font-serif text-base font-bold uppercase tracking-wider text-[#00603C] border-b border-[#C9922E] pb-0.5 inline-block">
                Ficha Oficial de Lote y Trazabilidad
              </h2>
            </div>

            {/* BANNER RECTANGULAR PRINCIPAL - NRO DE LOTE Y CLIENTE */}
            <div className="mb-4 border-2 border-[#00603C] rounded-xl overflow-hidden shadow-2xs bg-white">
              {/* LOTE BANNER */}
              <div className="bg-[#00603C] force-bg-green text-white px-6 py-3 text-center border-b-2 border-[#C9922E]">
                <span className="text-[9px] font-bold tracking-widest text-[#E3EFE7] block uppercase mb-0.5">
                  N° DE LOTE DE PLANTA CLASIFICADORA
                </span>
                <span className="text-6xl sm:text-7xl font-mono font-black tracking-wider leading-none block text-amber-300">
                  {lote.loteNro || 'S/N'}
                </span>
              </div>
              {/* CLIENTE BANNER */}
              <div className="bg-[#E3EFE7] bg-opacity-50 force-bg-light text-[#1A1A1A] px-6 py-2.5 text-center">
                <span className="text-[9px] font-black tracking-widest text-[#C9922E] block uppercase mb-0.5">
                  CLIENTE COMITENTE
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#00603C] tracking-tight block uppercase leading-tight">
                  {lote.cliente || 'Sin Cliente Asignado'}
                </span>
              </div>
            </div>

            {/* Grilla de Datos Principales */}
            <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Especie y Variedad</span>
                <span className="font-bold text-slate-900 text-sm">{lote.especie} {lote.variedad ? `(${lote.variedad})` : ''}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categoría / Tipo</span>
                <span className="font-bold text-slate-900">{lote.categoria || 'Original'} — <span className="text-emerald-800">{lote.tipo || 'Final'}</span></span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock en Bolsas / Kg</span>
                <span className="font-black font-mono text-[#00603C] text-sm">
                  {formatNumberArg(lote.stockBolsas, 0)} bolsas ({formatNumberArg(lote.stockKg, 0)} kg)
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ubicación Acopio</span>
                <span className="font-bold text-slate-900">
                  {lote.ubicacionAcopio || (lote.ala && lote.sector ? `Ala ${lote.ala} - Sector ${lote.sector}` : 'Sin ubicar')}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tratamiento Cura Semilla</span>
                <span className="font-bold text-slate-800">
                  {Array.isArray(lote.tratamiento) ? lote.tratamiento.join(', ') : (lote.tratamiento || 'Sin Tratar')}
                  {lote.producto && lote.producto !== 'Ninguno' ? ` (${lote.producto})` : ''}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado del Lote</span>
                <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-bold text-[10px] uppercase">
                    {lote.estado}
                  </span>
                  {lote.estadoRegistro === 'PRE-CARGA' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[10px] uppercase">
                      PRE-CARGA
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Trazabilidad y Orígenes */}
            <div className="space-y-3 mb-4 text-xs">
              {/* Silos de Origen */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-[#00603C] uppercase tracking-wider block mb-1">
                  Silos de Origen / Extracción
                </span>
                {lote.silosOrigen && lote.silosOrigen.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {lote.silosOrigen.map((s, sIdx) => (
                      <span key={sIdx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs">
                        Silo {s.siloId}: {formatNumberArg(s.kgExtraidos, 0)} kg
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic text-[11px]">No registra extracción directa de silos.</span>
                )}
              </div>

              {/* Bolsones de Campo */}
              {lote.origenesBolson && lote.origenesBolson.length > 0 && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                    Bolsones de Campo
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {lote.origenesBolson.map((b, bIdx) => (
                      <span key={bIdx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs">
                        Bolsón N° {b.bolsonNro || b.bolsonId} {b.sector ? `(Sector ${b.sector})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {lote.observaciones && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Observaciones / Notas Técnicas
                  </span>
                  <p className="text-slate-700 italic text-xs leading-relaxed">
                    "{lote.observaciones}"
                  </p>
                </div>
              )}
            </div>

            {/* Pie de Ficha con Firmas y Autorizaciones */}
            <div className="mt-6 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-[10px] font-bold text-slate-500 uppercase">
              <div>
                <div className="border-b border-slate-400 mb-1.5 h-10 w-36 mx-auto"></div>
                <span>Firma Operador / Encargado de Planta</span>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1.5 h-10 w-36 mx-auto"></div>
                <span>Firma Control de Calidad / Despacho</span>
              </div>
            </div>
          </div>
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
