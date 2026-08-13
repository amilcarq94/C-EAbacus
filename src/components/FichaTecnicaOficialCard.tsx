/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lote } from '../types';
import { LogoSiloLoose } from './Logo';
import { QRCodeCanvas } from 'qrcode.react';
import { formatNumberArg, formatDateStr } from '../utils/formatters';

interface FichaTecnicaOficialCardProps {
  lote: Lote;
  index?: number;
}

/**
 * Ficha Oficial de Lote y Trazabilidad (Ficha Técnica)
 * DISEÑO DEFINITIVO Y CERRADO (Hoja A4 exacta, sin desborde).
 */
export const FichaTecnicaOficialCard: React.FC<FichaTecnicaOficialCardProps> = ({ lote }) => {
  // 1. Fecha de realizado
  const fechaRealizadoDisplay =
    formatDateStr(
      lote.fechaIngreso ||
      (lote.fechaHoraProduccion ? lote.fechaHoraProduccion.split('T')[0] : '')
    ) || '-';

  // 2. Especie
  const especieDisplay = lote.especie || '-';

  // 3. Variedad
  const variedadDisplay = lote.variedad || 'Genérica';

  // 4. Categoría
  const categoriaDisplay = lote.categoria || 'Original';

  // 5. Tipo de lote
  const tipoLoteDisplay = lote.tipo || 'Clasificado';

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
      : 'Sin dato');

  // 10. Cantidad de bolsas
  const cantidadBolsasDisplay = `${formatNumberArg(lote.stockBolsas || 0, 0)} bolsas`;

  // 11. Kg por bolsa
  const kgPorBolsaDisplay = `${
    lote.kgPorBolsa ||
    (lote.stockBolsas > 0 ? Math.round(lote.stockKg / lote.stockBolsas) : 1000)
  } kg`;

  // 12. Ubicación de acopio
  const ubicacionAcopioDisplay =
    lote.ubicacionAcopio ||
    (lote.ala && lote.sector
      ? `Ala ${lote.ala} - Sector ${lote.sector}`
      : lote.sector
      ? `Sector ${lote.sector}`
      : 'Sin ubicar');

  // QR Payload
  const qrPayload = JSON.stringify({
    lote: lote.loteNro,
    cliente: lote.cliente,
    especie: lote.especie,
    variedad: lote.variedad,
    categoria: lote.categoria,
    tipo: lote.tipo,
    bolsas: lote.stockBolsas,
    kg: lote.stockKg,
    orden: ordenProcesoMovimientoDisplay,
    bolson: bolsonOrigenDisplay,
    id: lote.id,
  });

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

  return (
    <div
      className="bg-white rounded-2xl border-[1.5px] border-[#005E38] shadow-sm relative text-[#1A1A1A] font-sans batch-print-page-break ficha-tecnica-a4-container"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        padding: '20px 24px',
        margin: '0 auto',
      }}
    >
      {/* 1. Encabezado */}
      <div className="flex items-center justify-start gap-3.5 pb-2.5 mb-3 border-b-[1.5px] border-[#005E38]">
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

      {/* 2. Título de ficha */}
      <div className="text-center my-2.5">
        <h2
          className="font-serif font-extrabold uppercase tracking-wider text-[#005E38] m-0"
          style={{ fontSize: '14px' }}
        >
          FICHA OFICIAL DE LOTE Y TRAZABILIDAD
        </h2>
      </div>

      {/* 3. Bloque destacado (fondo gris claro) */}
      <div
        className="bg-slate-100 rounded-xl p-3.5 mb-3.5 border border-slate-200/80 flex items-center justify-between gap-4"
        style={{ backgroundColor: '#F1F5F9' }}
      >
        {/* Izquierda: N° DE LOTE y CLIENTE apilados y verticalmente centrados */}
        <div className="flex-1 min-w-0 text-left space-y-1.5">
          {/* N° DE LOTE */}
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">
              N° DE LOTE
            </span>
            <div
              className="font-mono font-black text-[#005E38] tracking-tight truncate leading-none"
              style={{ fontSize: '38pt', lineHeight: 1 }}
              title={lote.loteNro || 'S/N'}
            >
              {lote.loteNro || 'S/N'}
            </div>
          </div>

          {/* CLIENTE */}
          <div className="min-w-0 pt-0.5">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">
              CLIENTE
            </span>
            <div
              className="font-sans font-black text-slate-900 uppercase tracking-tight truncate leading-none"
              style={{ fontSize: '22pt', lineHeight: 1.05 }}
              title={lote.cliente || 'CLIENTE GENERAL'}
            >
              {lote.cliente || 'CLIENTE GENERAL'}
            </div>
          </div>
        </div>

        {/* Derecha: Código QR grande verticalmente centrado */}
        <div className="shrink-0 bg-white p-2 rounded-xl border border-slate-300 shadow-2xs flex items-center justify-center">
          <QRCodeCanvas
            value={qrPayload}
            size={120}
            bgColor="#ffffff"
            fgColor="#005E38"
            level="M"
          />
        </div>
      </div>

      {/* 4. Tabla de datos (dos columnas, filas alternadas, líneas finas grises) */}
      <div className="w-full rounded-lg overflow-hidden border border-slate-200 mb-3.5">
        <table className="w-full border-collapse text-left text-xs" style={{ fontSize: '11px' }}>
          <tbody>
            {tablaDatos.map((fila, idx) => (
              <tr
                key={fila.label}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F8FAFC',
                  borderBottom: idx === tablaDatos.length - 1 ? 'none' : '1px solid #E2E8F0',
                  height: '24px',
                }}
              >
                <td
                  className="py-1 px-3 font-semibold text-slate-600 w-5/12 align-middle border-r border-slate-200/60"
                  style={{ width: '42%', whiteSpace: 'nowrap' }}
                >
                  {fila.label}
                </td>
                <td
                  className="py-1 px-3 font-bold text-slate-900 w-7/12 align-middle truncate max-w-[280px]"
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

      {/* 5. Barra de stock (fondo verde institucional de ancho completo, texto blanco centrado en negrita) */}
      <div
        className="w-full bg-[#005E38] text-white text-center rounded-md font-bold uppercase tracking-wider py-2 px-3 mb-2 shadow-2xs"
        style={{
          backgroundColor: '#005E38',
          color: '#ffffff',
          fontSize: '12px',
        }}
      >
        STOCK INICIAL: {formatNumberArg(lote.stockKg, 0)} KG ({formatNumberArg(lote.stockBolsas || 0, 0)} BOLSAS)
      </div>

      {/* 6. Pie de página (texto pequeño, gris, centrado, en cursiva con el nombre de la empresa) */}
      <div className="text-center pt-1">
        <p
          className="text-slate-400 italic font-medium m-0"
          style={{ fontSize: '9px' }}
        >
          Agro Abacus S.A. — Planta de Clasificación de Semillas
        </p>
      </div>
    </div>
  );
};
