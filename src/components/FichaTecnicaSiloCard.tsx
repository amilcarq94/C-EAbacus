/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogoSiloLoose } from './Logo';
import { formatNumberArg } from '../utils/formatters';

export interface SiloFichaInfo {
  siloId: string;
  cliente: string;
  especie: string;
  variedad: string;
  stockKg: number;
  humedad: string | number;
  categoria?: string;
  ultimoMovimiento?: string;
}

interface FichaTecnicaSiloCardProps {
  ficha: SiloFichaInfo;
  isMini?: boolean;
  elementId?: string;
  className?: string;
}

/**
 * Ficha Técnica Oficial de Silo (Individual y Mini para Grilla de 6)
 * Mismo formato y estética que la Ficha Técnica de Lotes:
 * - Encabezado con logo institucional Agro Abacus S.A.
 * - Tarjeta con borde verde #005E38
 * - Tabla de datos alternada
 * - 5 campos en orden: Cliente, Especie, Variedad, Kilos en stock, Humedad (promedio)
 * - Cliente destacado con color; demás campos del mismo tamaño de fuente
 */
export const FichaTecnicaSiloCard: React.FC<FichaTecnicaSiloCardProps> = ({
  ficha,
  isMini = false,
  elementId,
  className = '',
}) => {
  const clienteDisplay =
    ficha.cliente && ficha.cliente !== 'Sin asignación' && ficha.cliente !== 'Sin Asignar'
      ? ficha.cliente
      : 'Disponible / Sin Asignar';

  const especieDisplay =
    ficha.especie && ficha.especie !== 'Sin Cereal / Vacío' ? ficha.especie : '-';

  const variedadDisplay = ficha.variedad && ficha.variedad !== '-' ? ficha.variedad : '-';

  const stockKgDisplay = `${formatNumberArg(ficha.stockKg || 0, 0)} kg`;

  const humedadDisplay =
    ficha.humedad !== undefined && ficha.humedad !== null && String(ficha.humedad) !== '0.0'
      ? `${ficha.humedad}%`
      : '13.5%';

  const tablaDatos = [
    {
      label: 'Cliente',
      valor: clienteDisplay,
      isCliente: true,
    },
    {
      label: 'Especie',
      valor: especieDisplay,
      isCliente: false,
    },
    {
      label: 'Variedad',
      valor: variedadDisplay,
      isCliente: false,
    },
    {
      label: 'Kilos en stock',
      valor: stockKgDisplay,
      isCliente: false,
    },
    {
      label: 'Humedad (promedio)',
      valor: humedadDisplay,
      isCliente: false,
    },
  ];

  if (isMini) {
    // Versión Mini para Grilla de 6 Fichas en 1 Hoja A4
    return (
      <div
        id={elementId}
        className={`bg-white rounded-xl border-[1.5px] border-[#005E38] shadow-xs relative text-[#1A1A1A] font-sans flex flex-col justify-between overflow-hidden ${className}`}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: '10px 12px',
          height: '100%',
          maxHeight: '86mm',
        }}
      >
        {/* Rótulo superior discreto de Silo y Encabezado con Logo */}
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b-[1.2px] border-[#005E38]">
          <div className="flex items-center gap-2">
            <div className="shrink-0 flex items-center justify-center">
              <LogoSiloLoose size={22} color="#005E38" />
            </div>
            <div className="text-left">
              <h1
                className="font-serif font-black text-[#005E38] tracking-wider uppercase m-0 leading-tight"
                style={{ fontSize: '11px' }}
              >
                AGRO ABACUS S.A.
              </h1>
              <p className="text-slate-500 font-semibold m-0" style={{ fontSize: '8px' }}>
                Planta de Clasificación
              </p>
            </div>
          </div>
          {/* Rótulo discreto del número de silo */}
          <span
            className="px-2 py-0.5 bg-[#E3EFE7] border border-[#005E38]/40 text-[#005E38] font-mono font-black uppercase rounded-md shadow-2xs"
            style={{ fontSize: '9px' }}
          >
            {ficha.siloId}
          </span>
        </div>

        {/* Título de ficha mini */}
        <div className="text-center my-0.5">
          <h2
            className="font-serif font-extrabold uppercase tracking-wider text-[#005E38] m-0"
            style={{ fontSize: '9px' }}
          >
            FICHA TÉCNICA DE CONTROL DE SILO
          </h2>
        </div>

        {/* Tabla de 5 datos (Cliente destacado en color, todos con la misma fuente de tamaño uniforme) */}
        <div className="w-full rounded-md overflow-hidden border border-slate-200 my-1">
          <table className="w-full border-collapse text-left" style={{ fontSize: '9.5px' }}>
            <tbody>
              {tablaDatos.map((fila, idx) => (
                <tr
                  key={fila.label}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F8FAFC',
                    borderBottom: idx === tablaDatos.length - 1 ? 'none' : '1px solid #E2E8F0',
                    height: '19px',
                  }}
                >
                  <td
                    className="py-0.5 px-2 font-semibold text-slate-600 align-middle border-r border-slate-200/60"
                    style={{ width: '42%', whiteSpace: 'nowrap' }}
                  >
                    {fila.label}
                  </td>
                  <td
                    className="py-0.5 px-2 align-middle truncate max-w-[150px]"
                    style={{
                      width: '58%',
                      color: fila.isCliente ? '#005E38' : '#0F172A',
                      fontWeight: 800,
                    }}
                    title={fila.valor}
                  >
                    {fila.valor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Barra de Stock Mini */}
        <div
          className="w-full bg-[#005E38] text-white text-center rounded font-bold uppercase tracking-wider py-1 px-2 my-0.5 shadow-2xs"
          style={{
            backgroundColor: '#005E38',
            color: '#ffffff',
            fontSize: '9px',
          }}
        >
          STOCK EN SILO: {stockKgDisplay}
        </div>

        {/* Pie de página discreto */}
        <div className="text-center pt-0.5">
          <p className="text-slate-400 italic font-medium m-0" style={{ fontSize: '7.5px' }}>
            Agro Abacus S.A. — Planta de Clasificación de Semillas
          </p>
        </div>
      </div>
    );
  }

  // Versión Individual Completa (Estilo Ficha de Lote A4 / Card)
  return (
    <div
      id={elementId}
      className={`bg-white rounded-2xl border-[1.5px] border-[#005E38] shadow-sm relative text-[#1A1A1A] font-sans flex flex-col justify-between ${className}`}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '520px',
        padding: '24px 28px',
        margin: '0 auto',
      }}
    >
      {/* 1. Encabezado institucional con Logo y Rótulo Discreto */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b-[1.5px] border-[#005E38]">
        <div className="flex items-center gap-3.5">
          <div className="shrink-0 flex items-center justify-center">
            <LogoSiloLoose size={40} color="#005E38" />
          </div>
          <div className="text-left">
            <h1
              className="font-serif font-black text-[#005E38] tracking-wider uppercase m-0 leading-tight"
              style={{ fontSize: '18px' }}
            >
              AGRO ABACUS S.A.
            </h1>
            <p
              className="text-slate-600 font-semibold m-0 tracking-normal"
              style={{ fontSize: '11px' }}
            >
              Planta de Clasificación de Semillas
            </p>
          </div>
        </div>

        {/* Rótulo superior discreto con el número de Silo */}
        <span
          className="px-3 py-1 bg-[#E3EFE7] border border-[#005E38]/40 text-[#005E38] font-mono font-black uppercase rounded-lg shadow-2xs text-xs tracking-wider"
        >
          {ficha.siloId}
        </span>
      </div>

      {/* 2. Título de ficha */}
      <div className="text-center my-3">
        <h2
          className="font-serif font-extrabold uppercase tracking-wider text-[#005E38] m-0"
          style={{ fontSize: '14px' }}
        >
          FICHA TÉCNICA DE CONTROL DE SILO
        </h2>
      </div>

      {/* 3. Bloque Destacado de Cliente con Color */}
      <div
        className="bg-slate-100 rounded-xl p-4 mb-4 border border-slate-200/80 flex items-center justify-between gap-4"
        style={{ backgroundColor: '#F1F5F9' }}
      >
        <div className="flex-1 min-w-0 text-left space-y-1">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">
            CLIENTE
          </span>
          <div
            className="font-sans font-black text-[#005E38] uppercase tracking-tight truncate leading-tight"
            style={{ fontSize: '20px' }}
            title={clienteDisplay}
          >
            {clienteDisplay}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-1">
            ESTADO
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
              ficha.stockKg > 0
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            {ficha.stockKg > 0 ? 'Con Stock' : 'Vacío'}
          </span>
        </div>
      </div>

      {/* 4. Tabla de datos alternada con los 5 campos en orden estricto y mismo tamaño de fuente */}
      <div className="w-full rounded-lg overflow-hidden border border-slate-200 mb-4">
        <table className="w-full border-collapse text-left" style={{ fontSize: '12px' }}>
          <tbody>
            {tablaDatos.map((fila, idx) => (
              <tr
                key={fila.label}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F8FAFC',
                  borderBottom: idx === tablaDatos.length - 1 ? 'none' : '1px solid #E2E8F0',
                  height: '30px',
                }}
              >
                <td
                  className="py-1.5 px-3.5 font-semibold text-slate-600 align-middle border-r border-slate-200/60"
                  style={{ width: '42%', whiteSpace: 'nowrap' }}
                >
                  {fila.label}
                </td>
                <td
                  className="py-1.5 px-3.5 align-middle truncate max-w-[280px]"
                  style={{
                    width: '58%',
                    color: fila.isCliente ? '#005E38' : '#0F172A',
                    fontWeight: 800,
                    fontSize: '12px',
                  }}
                  title={fila.valor}
                >
                  {fila.valor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Barra de stock (fondo verde institucional de ancho completo, texto blanco centrado en negrita) */}
      <div
        className="w-full bg-[#005E38] text-white text-center rounded-lg font-bold uppercase tracking-wider py-2.5 px-3 mb-3 shadow-2xs"
        style={{
          backgroundColor: '#005E38',
          color: '#ffffff',
          fontSize: '12px',
        }}
      >
        STOCK EN SILO: {stockKgDisplay}
      </div>

      {/* 6. Pie de página institucional */}
      <div className="text-center pt-1">
        <p
          className="text-slate-400 italic font-medium m-0"
          style={{ fontSize: '10px' }}
        >
          Agro Abacus S.A. — Planta de Clasificación de Semillas
        </p>
      </div>
    </div>
  );
};
