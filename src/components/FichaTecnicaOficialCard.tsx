/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lote } from '../types';
import { LogoSiloLoose } from './Logo';
import { QrTrazabilidadLote } from './QrTrazabilidadLote';
import { formatNumberArg, formatDateStr } from '../utils/formatters';

interface FichaTecnicaOficialCardProps {
  lote: Lote;
  index?: number;
  id?: string;
}

/**
 * Ficha de Lote y Trazabilidad (Ficha Técnica)
 * Rediseño UI/UX Oficial Agro Abacus S.A. - Planta La Barrancosa
 */
export const FichaTecnicaOficialCard: React.FC<FichaTecnicaOficialCardProps> = ({ lote, index, id }) => {
  // 1. Fecha de realizado
  const fechaRealizadoDisplay =
    formatDateStr(
      lote.fechaIngreso ||
      (lote.fechaHoraProduccion ? lote.fechaHoraProduccion.split('T')[0] : '')
    ) || '14/08/2026';

  // 2. Especie
  const especieDisplay = lote.especie || 'Soja';

  // 3. Variedad
  const variedadDisplay =
    lote.variedad && lote.variedad !== 'Genérica' && lote.variedad !== 'Sin variedad'
      ? lote.variedad
      : '—';

  // 4. Categoría
  const categoriaDisplay = lote.categoria || 'Pre básica';

  // 5. Tipo de lote
  const tipoLoteDisplay = lote.tipo || 'Intermedio';

  // 6. Tratamiento
  const tratamientoDisplay = (() => {
    let t = 'Sin Tratar';
    if (Array.isArray(lote.tratamiento) && lote.tratamiento.length > 0) {
      t = lote.tratamiento.join(', ');
    } else if (typeof lote.tratamiento === 'string' && lote.tratamiento) {
      t = lote.tratamiento;
    }
    if (lote.producto && lote.producto !== 'Ninguno' && lote.producto !== 'Sin Tratar') {
      t += ` (${lote.producto})`;
    }
    return t;
  })();

  // 7. N° Orden de Proceso/Movimiento
  const ordenProcesoMovimientoDisplay =
    lote.ordenProcesoId ||
    (lote as any).ordenProceso ||
    (lote as any).numeroOrden ||
    lote.numeroOrdenMovimiento ||
    (lote as any).ordenProcesoMovimiento ||
    'Sin N°';

  // 8. N° Bolsón de origen (trazabilidad)
  const bolsonOrigenDisplay =
    (lote as any).numeroBolsonOrigen ||
    (lote as any).bolsonOrigenNro ||
    (lote.origenesBolson && lote.origenesBolson.length > 0
      ? lote.origenesBolson.map((b) => b.bolsonNro || b.bolsonId).filter(Boolean).join(', ')
      : '') ||
    'Sin dato';

  // 9. Sector de bolsón de origen
  const sectorBolsonOrigenDisplay =
    (lote as any).sectorBolsonOrigen ||
    (lote.origenesBolson && lote.origenesBolson[0]?.sector
      ? `Sector ${lote.origenesBolson[0].sector}`
      : lote.ala && lote.sector
      ? `Ala ${lote.ala} - Sector ${lote.sector}`
      : lote.sector
      ? `Sector ${lote.sector}`
      : 'Ala A - Sector 1');

  // 10. Cantidad de bolsas
  const stockBolsasNum = lote.stockBolsas !== undefined && lote.stockBolsas !== null ? lote.stockBolsas : 35;
  const cantidadBolsasDisplay = `${formatNumberArg(stockBolsasNum, 0)} bolsas`;

  // 11. Kg por bolsa
  const kgPorBolsaNum =
    lote.kgPorBolsa ||
    (stockBolsasNum > 0 && lote.stockKg ? Math.round(lote.stockKg / stockBolsasNum) : 800);
  const kgPorBolsaDisplay = `${formatNumberArg(kgPorBolsaNum, 0)} kg`;

  // 12. Ubicación de acopio
  const ubicacionAcopioDisplay =
    lote.ubicacionAcopio ||
    (lote.ala && lote.sector
      ? `Ala ${lote.ala} - Sector ${lote.sector}`
      : lote.sector
      ? `Sector ${lote.sector}`
      : 'Ala A - Sector 1');

  // Stock Total en Kg
  const stockKgNum = lote.stockKg !== undefined && lote.stockKg !== null ? lote.stockKg : stockBolsasNum * kgPorBolsaNum;

  // Datos estructurados en el orden exacto especificado
  const tablaDatos = [
    { label: 'Fecha de realizado', valor: fechaRealizadoDisplay },
    { label: 'Especie', valor: especieDisplay },
    { label: 'Variedad', valor: variedadDisplay },
    { label: 'Categoría', valor: categoriaDisplay },
    { label: 'Tipo de lote', valor: tipoLoteDisplay },
    { label: 'Tratamiento', valor: tratamientoDisplay },
    { label: 'N° Orden de Proceso/Movimiento', valor: ordenProcesoMovimientoDisplay },
    { label: 'N° Bolsón de origen (trazabilidad)', valor: bolsonOrigenDisplay },
    { label: 'Sector de bolsón de origen', valor: sectorBolsonOrigenDisplay },
    { label: 'Cantidad de bolsas', valor: cantidadBolsasDisplay },
    { label: 'Kg por bolsa', valor: kgPorBolsaDisplay },
    { label: 'Ubicación de acopio', valor: ubicacionAcopioDisplay },
  ];

  // Observaciones adicionales si existen o fueron editadas
  if (lote.observaciones && lote.observaciones.trim()) {
    tablaDatos.push({
      label: 'Observaciones',
      valor: lote.observaciones.trim(),
    });
  }

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

      {/* 2. TÍTULO DE DOCUMENTO CENTRADO */}
      <div className="text-center my-1.5">
        <h2
          className="font-serif font-extrabold uppercase tracking-widest text-[#006837] m-0"
          style={{ fontSize: '14px' }}
        >
          FICHA DE LOTE
        </h2>
      </div>

      {/* 3. TARJETA SUPERIOR (HERO BOX: DATOS DE LOTE + QR GIGANTE) */}
      <div
        className="bg-[#F8FAFC] rounded-xl p-4 mb-2.5 border border-[#E2E8F0] flex items-center justify-between gap-5"
      >
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

        {/* Columna Derecha: Contenedor del QR TRAZABILIDAD OFICIAL (Proporción 1:1, centrado verticalmente, zona silenciosa) */}
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
                  height: '22px',
                }}
              >
                <td
                  className="py-0.5 px-3.5 font-semibold text-[#475569] w-5/12 align-middle border-r border-[#E2E8F0]/70"
                  style={{ width: '42%', whiteSpace: 'nowrap' }}
                >
                  {fila.label}
                </td>
                <td
                  className="py-0.5 px-3.5 font-bold text-[#0F172A] w-7/12 align-middle truncate max-w-[300px]"
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

