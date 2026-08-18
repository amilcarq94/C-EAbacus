/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lote } from '../types';
import { LogoSiloLoose } from './Logo';
import { QrTrazabilidadLote } from './QrTrazabilidadLote';
import { formatNumberArg } from '../utils/formatters';
import { useFichaLoteData } from '../hooks/useFichaLoteData';

interface FichaTecnicaOficialCardProps {
  lote: Lote;
  index?: number;
  id?: string;
}

/**
 * Ficha de Lote y Trazabilidad (Ficha Técnica Oficial)
 * Rediseño UI/UX Oficial Agro Abacus S.A. - Planta La Barrancosa
 */
export const FichaTecnicaOficialCard: React.FC<FichaTecnicaOficialCardProps> = ({ lote, index, id }) => {
  const {
    stockKgNum,
    stockBolsasNum,
    tablaDatos,
  } = useFichaLoteData(lote);

  const cardDomId = id || `ficha-card-${lote.id || index || '0'}`;

  return (
    <div
      id={cardDomId}
      className="bg-white rounded-2xl border-[1.5px] border-[#006837] shadow-sm relative text-[#0F172A] font-sans batch-print-page-break ficha-tecnica-a4-container"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        padding: '16px 20px',
        margin: '0 auto',
      }}
    >
      {/* 1. ENCABEZADO (HEADER) */}
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

      {/* 2. TÍTULO DE DOCUMENTO */}
      <div className="text-center my-1.5">
        <h2
          className="font-serif font-extrabold uppercase tracking-widest text-[#006837] m-0"
          style={{ fontSize: '14px' }}
        >
          FICHA DE LOTE
        </h2>
      </div>

      {/* 3. HERO BOX: DATOS PRINCIPALES + CÓDIGO QR */}
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
              title={lote.loteNro || 'L - 64'}
            >
              {lote.loteNro || 'L - 64'}
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
              title={lote.cliente || 'SAN DIEGO SEMILLAS'}
            >
              {lote.cliente || 'SAN DIEGO SEMILLAS'}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Contenedor del QR TRAZABILIDAD OFICIAL */}
        <div className="shrink-0 flex flex-col items-center justify-center">
          <QrTrazabilidadLote
            loteId={lote.id}
            size={300}
            className="w-[185px] h-[185px]"
          />
        </div>
      </div>

      {/* 4. TABLA DE DATOS OPERATIVOS */}
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
                  className="py-0.5 px-3.5 font-semibold text-[#475569] w-5/12 align-middle border-r border-[#E2E8F0]/70"
                  style={{ width: '42%', whiteSpace: 'nowrap' }}
                >
                  {fila.label}
                </td>
                <td
                  className={`py-0.5 px-3.5 font-bold text-[#0F172A] w-7/12 align-middle ${
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

      {/* 5. PIE DE FICHA (BANNER DE STOCK) */}
      <div
        className="w-full bg-[#006837] text-white text-center rounded-lg font-sans font-bold uppercase tracking-wider py-1.5 px-4 mb-1.5 shadow-xs"
        style={{
          backgroundColor: '#006837',
          color: '#FFFFFF',
          fontSize: '11.5px',
        }}
      >
        STOCK INICIAL: {formatNumberArg(stockKgNum, 0)} KG ({formatNumberArg(stockBolsasNum, 0)} BOLSAS)
      </div>

      {/* 6. NOTA AL PIE DE PÁGINA */}
      <div className="text-center pt-0.5">
        <p
          className="text-[#94A3B8] italic font-medium m-0"
          style={{ fontSize: '8.5px' }}
        >
          Agro Abacus S.A. — Planta de Clasificación de Semillas · Estancia La Barrancosa
        </p>
      </div>
    </div>
  );
};
