/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lote, MovimientoStock, EstadoLoteType, AuditLogEntry } from '../types';
import { getLoteAuditoria } from '../utils/audit';
import { formatNumberArg, formatKg, formatBolsas, formatDateStr } from '../utils/formatters';
import { LogoSiloLoose } from './Logo';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Printer, Plus, AlertCircle, Trash2, ShieldCheck, Download, QrCode, Barcode, Clock, User, Edit2, X, Warehouse } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCodeModal } from './QrCodeModal';
import { BarcodeLabelModal } from './BarcodeLabelModal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CustomLineTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1A1A1A] text-white p-3 rounded-xl border border-gray-800 text-xs shadow-xl font-sans text-left">
        <p className="font-bold text-[#C9922E] uppercase tracking-wider mb-1.5">{formatDateStr(data.date)}</p>
        <p className="flex justify-between gap-6 my-0.5">
          <span className="text-gray-400 font-medium">Stock en Bolsas:</span>
          <span className="font-mono font-bold text-white">{formatNumberArg(data.bolsas, 0)} b.</span>
        </p>
        <p className="flex justify-between gap-6">
          <span className="text-gray-400 font-medium">Equivalente Kg:</span>
          <span className="font-mono font-bold text-white">{formatNumberArg(data.kg, 0)} kg</span>
        </p>
        {data.detalle && (
          <p className="text-[10px] text-gray-400 italic border-t border-gray-800 mt-1.5 pt-1 max-w-[200px] truncate">
            {data.detalle}
          </p>
        )}
      </div>
    );
  }
  return null;
};

interface LoteDetailProps {
  lote: Lote;
  onBack: () => void;
  onUpdateLoteStock: (loteId: string, nuevosMovimientos: MovimientoStock[], nuevoStockBolsas: number, nuevoStockKg: number, nuevoEstado: EstadoLoteType) => void;
  onRegistrarSalida?: (loteId: string) => void;
  onUpdateLoteLocation?: (loteId: string, ala: string, sector: string) => Promise<void>;
}

export const LoteDetail: React.FC<LoteDetailProps> = ({ lote, onBack, onUpdateLoteStock, onRegistrarSalida, onUpdateLoteLocation }) => {
  const [showAddMovModal, setShowAddMovModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedAla, setSelectedAla] = useState(lote.ala || '');
  const [selectedSector, setSelectedSector] = useState(lote.sector || '');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [tipoMov, setTipoMov] = useState<'Entrada manual' | 'Salida' | 'Ajuste'>('Entrada manual');
  const [bolsas, setBolsas] = useState<number>(50);
  const [kgBolsa, setKgBolsa] = useState<number>(lote.kgPorBolsa || 40);
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState('');

  // Modo Imprimir Ficha
  const [isPrintingMode, setIsPrintingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock' | 'audit'>('stock');

  // Calcular evolución del stock a lo largo del tiempo
  const sortedMovs = [...lote.historial].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const timeline: { date: string; bolsas: number; kg: number; detalle: string }[] = [];

  if (sortedMovs.length > 0) {
    try {
      const firstMovDate = new Date(sortedMovs[0].fecha);
      const prevDate = new Date(firstMovDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      timeline.push({
        date: prevDateStr,
        bolsas: 0,
        kg: 0,
        detalle: 'Lote inicializado'
      });
    } catch (e) {
      // Fallback
    }
  }

  let runningBolsas = 0;
  let runningKg = 0;

  sortedMovs.forEach((mov) => {
    const isAddition = mov.tipo.includes('Entrada') || mov.tipo === 'Reingreso';
    const bolsasChange = isAddition ? mov.cantidadBolsas : -mov.cantidadBolsas;
    const kgChange = isAddition ? mov.cantidadKg : -mov.cantidadKg;
    
    runningBolsas += bolsasChange;
    runningKg += kgChange;
    
    timeline.push({
      date: mov.fecha,
      bolsas: runningBolsas,
      kg: runningKg,
      detalle: mov.detalle || mov.tipo
    });
  });

  const getEstadoBadgeStyle = (estado: EstadoLoteType) => {
    switch (estado) {
      case 'Disponible':
        return 'bg-[#E3EFE7] text-[#00603C] border-[#00603C]';
      case 'Reservado':
        return 'bg-[#F6EFDC] text-[#C9922E] border-[#C9922E]';
      case 'A Consumo':
        return 'bg-purple-100 text-purple-900 border-purple-400';
      case 'Agotado':
        return 'bg-[#A0522D]/10 text-[#A0522D] border-[#A0522D]';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleAgregarMovimiento = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cantBolsas = Number(bolsas);
    const pesoBolsa = Number(kgBolsa);
    if (cantBolsas <= 0 || pesoBolsa <= 0) {
      setError('Las bolsas y el peso por bolsa deben ser valores positivos.');
      return;
    }

    if (tipoMov === 'Salida' && cantBolsas > lote.stockBolsas) {
      setError(`No hay suficiente stock. Intenta extraer ${cantBolsas} b. de un lote con sólo ${lote.stockBolsas} b. disponibles.`);
      return;
    }

    const totalKgMov = cantBolsas * pesoBolsa;
    
    // Calcular nuevos valores de stock
    let nuevoStockBolsas = lote.stockBolsas;
    let nuevoStockKg = lote.stockKg;

    if (tipoMov === 'Entrada manual') {
      nuevoStockBolsas += cantBolsas;
      nuevoStockKg += totalKgMov;
    } else if (tipoMov === 'Salida') {
      nuevoStockBolsas -= cantBolsas;
      nuevoStockKg -= totalKgMov;
    } else { // Ajuste
      // Si es ajuste, podemos permitir que el detalle o el usuario determine el sentido. 
      // Para simplificar, asumimos que "Ajuste" reduce el stock si se indica, o lo aumenta.
      // Por defecto, dejemos que un Ajuste reste stock en este formulario.
      nuevoStockBolsas -= cantBolsas;
      nuevoStockKg -= totalKgMov;
    }

    // Determinar nuevo estado del lote
    let nuevoEstado: EstadoLoteType = lote.estado;
    if (nuevoStockBolsas === 0) {
      nuevoEstado = 'Agotado';
    } else if (lote.estado === 'Agotado' && nuevoStockBolsas > 0) {
      nuevoEstado = 'Disponible';
    }

    // Agregar movimiento al historial
    const nuevoMovimiento: MovimientoStock = {
      id: `MOV-${Date.now()}`,
      fecha,
      tipo: tipoMov,
      cantidadBolsas: cantBolsas,
      kgPorBolsa: pesoBolsa,
      cantidadKg: totalKgMov,
      detalle: detalle.trim() || `${tipoMov} - Ajuste de inventario manual`
    };

    const nuevoHistorial = [nuevoMovimiento, ...lote.historial];

    onUpdateLoteStock(lote.id, nuevoHistorial, nuevoStockBolsas, nuevoStockKg, nuevoEstado);
    
    // Resetear formulario
    setShowAddMovModal(false);
    setBolsas(50);
    setDetalle('');
  };

  // Función para simular exportación e imprimir en pantalla
  const handlePrintFicha = () => {
    setIsPrintingMode(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  if (isPrintingMode) {
    // Vista limpia para imprimir (oculta controles innecesarios y optimiza para A4)
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 print:p-0 print:bg-white print:min-h-0">
        {/* Barra de Acciones de Impresión - Visible en pantalla, Oculta al imprimir */}
        <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E3EFE7] rounded-lg">
              <Printer className="w-5 h-5 text-[#00603C]" />
            </div>
            <div className="text-left">
              <h3 className="font-serif text-sm font-bold text-gray-800 uppercase tracking-wide">Vista de Impresión</h3>
              <p className="text-[11px] text-gray-500 font-medium">Ficha Oficial del Lote: <strong className="font-mono text-[#00603C]">{lote.loteNro}</strong></p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsPrintingMode(false)}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-lg transition cursor-pointer"
            >
              Volver
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#00603C] hover:bg-[#004D30] text-white rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ficha
            </button>
          </div>
        </div>

        {/* Contenedor del Reporte Oficial */}
        <div className="bg-white p-6 md:p-8 max-w-4xl mx-auto border-2 border-[#00603C] rounded-xl relative text-[#1A1A1A] font-sans print-a4-card">
        {/* Inyectamos estilos CSS directos para asegurar que imprima fondos a color y quepa en una hoja A4 */}
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
            header, nav, footer, button, .print\\:hidden, #nav-tab-dashboard, #nav-tab-lotes, #nav-tab-despachos, #nav-tab-historial-salidas, #nav-tab-importar {
              display: none !important;
            }
            #root, main {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: none !important;
            }
            .print-a4-card {
              border: 2px solid #00603C !important;
              border-radius: 12px !important;
              padding: 24px !important;
              margin: 0 auto !important;
              width: 100% !important;
              max-height: 275mm !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Forzar fondos en navegadores antiguos */
            .force-bg-green {
              background-color: #00603C !important;
              color: #ffffff !important;
            }
            .force-bg-light {
              background-color: #E3EFE7 !important;
            }
          }
        `}</style>

        {/* Sello de Marca de agua de fondo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
          <LogoSiloLoose size={360} color="#00603C" />
        </div>

        {/* Header de impresión */}
        <div className="flex justify-between items-center border-b border-[#00603C] pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoSiloLoose size={36} color="#00603C" />
              <div className="text-left">
                <h1 className="font-serif text-lg font-bold text-[#00603C] tracking-wide uppercase">
                  AGRO ABACUS S.A.
                </h1>
                <p className="text-[9px] font-semibold tracking-widest text-[#C9922E] uppercase">
                  ESTANCIA LA BARRANCOSA — PLANTA CLASIFICADORA
                </p>
              </div>
            </div>
          </div>
          <div className="text-right font-mono text-gray-500 text-[9px] leading-tight">
            <p className="font-bold text-[#00603C] uppercase tracking-wider text-[10px]">Ficha Técnica Oficial</p>
            <p className="mt-0.5">ID REGISTRO: {lote.id}</p>
            <p>Impreso: {new Date().toLocaleDateString('es-AR')}</p>
          </div>
        </div>

        {/* Título de la Ficha */}
        <div className="text-center mb-4">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-[#00603C] border-b border-[#C9922E] pb-1 inline-block">
            Ficha Oficial de Lote y Trazabilidad
          </h2>
        </div>

        {/* BANNER A LO ANCHO DE LA HOJA - NRO DE LOTE Y CLIENTE COMITENTE */}
        <div className="mb-4 border-2 border-[#00603C] rounded-xl overflow-hidden shadow-sm bg-white">
          {/* LOTE BANNER - FULL WIDTH */}
          <div className="bg-[#00603C] force-bg-green text-white px-6 py-3.5 text-center border-b-2 border-[#C9922E]">
            <span className="text-[10px] font-bold tracking-widest text-[#E3EFE7] block uppercase mb-0.5">
              N° DE LOTE DE PLANTA CLASIFICADORA
            </span>
            <span className="text-7xl md:text-8xl font-mono font-black tracking-tighter leading-none block">
              {lote.loteNro}
            </span>
          </div>
          {/* CLIENTE COMITENTE BANNER - FULL WIDTH */}
          <div className="bg-[#E3EFE7] bg-opacity-40 force-bg-light text-[#1A1A1A] px-6 py-3 text-center">
            <span className="text-[9px] font-black tracking-widest text-[#C9922E] block uppercase mb-0.5">
              CLIENTE COMITENTE
            </span>
            <span className="text-3xl md:text-4xl font-black text-[#00603C] tracking-tight block uppercase leading-tight">
              {lote.cliente}
            </span>
          </div>
        </div>

        {/* Datos Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-[#E3EFE7] bg-opacity-10 force-bg-light/10 p-4 rounded-xl border border-gray-100">
          <div className="space-y-2 text-left">
            <div>
              <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider leading-none">Grano / Especie</span>
              <span className="text-sm font-bold text-[#00603C] block mt-0.5">{lote.especie}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider leading-none">Variedad Sembrada</span>
              <span className="text-xs font-bold text-gray-800 block mt-0.5">{lote.variedad}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider leading-none">Tipo / Categoría</span>
              <span className="text-xs font-semibold text-gray-700 block mt-0.5">{lote.tipo}</span>
            </div>
          </div>

          <div className="space-y-2 text-left">
            <div>
              <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider leading-none">Fecha de Ingreso</span>
              <span className="text-xs font-medium text-gray-800 block mt-0.5">{formatDateStr(lote.fechaIngreso)}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider leading-none">Sector de Acopio</span>
              <span className="text-xs font-bold text-[#00603C] block mt-0.5">
                {lote.ala && lote.sector ? `ALA: ${lote.ala} / SECTOR: ${lote.sector}` : 'No especificado'}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider leading-none">Tratamiento Aplicado</span>
              <span className="text-xs font-medium text-gray-800 block mt-0.5">{lote.tratamiento.join(' + ') || 'Ninguno'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider leading-none">Químicos / Productos</span>
              <span className="text-xs font-medium text-gray-800 block mt-0.5">{lote.producto || 'Ninguno'}</span>
            </div>
          </div>
        </div>

        {/* Código QR de Consulta Digital Centrado y Aumentado */}
        <div className="flex flex-col items-center justify-center my-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-w-sm mx-auto text-center">
          <span className="text-[10px] font-black text-[#00603C] uppercase tracking-widest mb-1.5 block">
            Consulta Digital QR Oficial
          </span>
          <div className="bg-white p-2.5 border-2 border-[#00603C] rounded-2xl shadow-md mb-2 flex items-center justify-center">
            <QRCodeCanvas
              value={`${window.location.origin}${window.location.pathname}?lote=${lote.id}`}
              size={180}
              bgColor="#ffffff"
              fgColor="#00603C"
              level="H"
            />
          </div>
          <span className="text-[8px] font-bold text-[#C9922E] uppercase tracking-widest block mb-0.5">
            Escaneá el código QR
          </span>
          <span className="text-[8px] text-gray-400 font-medium leading-tight block max-w-[220px]">
            Acceso instantáneo a trazabilidad en vivo y estado de stock online
          </span>
        </div>

        {/* Saldos de Stock Destacados */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-center border-y border-[#00603C] py-3.5">
          <div className="border-r border-gray-200">
            <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider block">Stock Total en Bolsas</span>
            <span className="font-serif text-xl font-bold text-[#00603C] mt-0.5 block">
              {formatNumberArg(lote.stockBolsas, 0)} b.
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider block">Stock Equivalente (Kg)</span>
            <span className="font-serif text-xl font-bold text-[#C9922E] mt-0.5 block">
              {formatNumberArg(lote.stockKg, 0)} kg
            </span>
          </div>
        </div>

        {/* Observaciones en Impresión */}
        {lote.observaciones && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-left">
            <span className="text-[9px] font-bold text-[#C9922E] uppercase block tracking-wider mb-0.5">
              Observaciones / Notas de Calidad del Lote
            </span>
            <p className="text-[11px] text-gray-700 italic font-sans whitespace-pre-wrap leading-relaxed">
              {lote.observaciones}
            </p>
          </div>
        )}

        {/* Historial Corto para Impresión */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <h3 className="font-serif text-xs font-bold text-[#00603C] uppercase tracking-wider">
              Historial de Movimientos de Trazabilidad
            </h3>
            {lote.historial.length > 4 && (
              <span className="text-[8px] text-gray-400 italic">
                Mostrando últimos 4 de {lote.historial.length} movimientos
              </span>
            )}
          </div>
          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="border-b border-gray-300 font-bold text-gray-600">
                <th className="py-1">Fecha</th>
                <th className="py-1">Tipo de Movimiento</th>
                <th className="py-1 text-right">Bolsas</th>
                <th className="py-1 text-right">Kilogramos</th>
                <th className="py-1 pl-3">Detalle / Justificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lote.historial.slice(0, 4).map((m) => (
                <tr key={m.id} className="text-gray-700">
                  <td className="py-1 font-medium">{formatDateStr(m.fecha)}</td>
                  <td className="py-1 font-semibold">
                    <span className={m.tipo.includes('Entrada') ? 'text-[#00603C]' : 'text-[#A0522D]'}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="py-1 text-right font-bold">{m.cantidadBolsas}</td>
                  <td className="py-1 text-right font-mono">{formatNumberArg(m.cantidadKg, 0)} kg</td>
                  <td className="py-1 pl-3 text-gray-500 italic max-w-[200px] truncate">{m.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Firmas de Control */}
        <div className="grid grid-cols-2 gap-8 mt-6 text-center text-[10px]">
          <div>
            <div className="border-t border-gray-300 w-2/3 mx-auto pt-1.5">
              <p className="font-semibold text-gray-700">Firma Encargado de Planta</p>
              <p className="text-gray-400 text-[8px]">Agro Abacus S.A.</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-300 w-2/3 mx-auto pt-1.5">
              <p className="font-semibold text-gray-700">Firma de Recepción / Conductor</p>
              <p className="text-gray-400 text-[8px]">La Barrancosa</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[8px] text-gray-400 mt-5 italic">
          Documento oficial de control interno. Agro Abacus S.A. — Estancia La Barrancosa. Autorizado para libre exportación e impresión por todos los usuarios del sistema.
        </p>
      </div>
    </div>
    );
  }

  return (
    <div className="space-y-6" id="lote-detail-container">
      {/* Botón de Retorno y Títulos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-[#00603C] hover:text-[#254731] uppercase tracking-wider self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Listado
        </button>

        <div className="flex flex-wrap gap-2">
          {/* Botón Exportar Ficha de Lote - Habilitado y Autorizado para todos los usuarios */}
          <button
            onClick={handlePrintFicha}
            className="flex items-center gap-2 px-4 py-2 bg-[#00603C] text-white border border-[#00603C] rounded-lg hover:bg-[#254731] transition text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
            title="Exportar e imprimir la Ficha Técnica Oficial del Lote (Habilitado para todos los usuarios)"
          >
            <Printer className="w-4 h-4 text-[#C9922E]" />
            <span>Exportar e Imprimir Ficha de Lote</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E3EFE7] text-[#00603C] border border-[#00603C] border-opacity-25 rounded-lg hover:bg-[#cbe3d3] transition text-xs font-semibold"
            title="Generar Código QR"
          >
            <QrCode className="w-4 h-4 text-[#C9922E]" />
            Generar Código QR
          </button>

          <button
            onClick={() => setShowBarcodeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E3EFE7] text-[#00603C] border border-[#00603C] border-opacity-25 rounded-lg hover:bg-[#cbe3d3] transition text-xs font-semibold"
            title="Imprimir Código de Barras"
          >
            <Barcode className="w-4 h-4 text-[#C9922E]" />
            Imprimir Código de Barras
          </button>

          <button
            onClick={() => setShowAddMovModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E3EFE7] text-[#00603C] border border-[#00603C] border-opacity-25 rounded-lg hover:bg-[#cbe3d3] transition text-xs font-semibold"
          >
            <Plus className="w-4 h-4 text-[#C9922E]" />
            Ajustar Stock Manual
          </button>

          {onUpdateLoteLocation && (
            <button
              onClick={() => {
                setSelectedAla(lote.ala || '');
                setSelectedSector(lote.sector || '');
                setShowLocationModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#E3EFE7] text-[#00603C] border border-[#00603C] border-opacity-25 rounded-lg hover:bg-[#cbe3d3] transition text-xs font-semibold cursor-pointer"
              title="Asignar Ubicación por Ala y Sector"
            >
              <Warehouse className="w-4 h-4 text-[#C9922E]" />
              Asignar Ubicación
            </button>
          )}

          {onRegistrarSalida && lote.stockBolsas > 0 && (
            <button
              onClick={() => onRegistrarSalida(lote.id)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00603C] text-white rounded-lg hover:bg-[#254731] transition text-xs font-semibold"
              title="Registrar salida para este lote"
            >
              <ArrowDownRight className="w-4 h-4 text-[#C9922E]" />
              Registrar Salida
            </button>
          )}
        </div>
      </div>

      {/* Grid de Contenido de Ficha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Panel Izquierdo: Ficha Técnica */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
          
          {/* Marca de agua sutil en la tarjeta técnica */}
          <div className="absolute right-3 bottom-3 opacity-[0.04] pointer-events-none">
            <LogoSiloLoose size={120} color="#00603C" />
          </div>

          <div className="bg-[#00603C] p-5 text-white">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-emerald-200 tracking-wider">
                ID: {lote.id}
              </span>
              <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border bg-white text-[#00603C] border-white shadow-sm`}>
                {lote.estado}
              </span>
            </div>
            {/* N° DE LOTE GRANDE */}
            <div className="mt-4 mb-3">
              <span className="text-[10px] font-sans font-bold tracking-widest text-[#C9922E] uppercase block mb-0.5">NÚMERO DE LOTE</span>
              <h2 className="font-mono text-5xl sm:text-6xl font-black text-white tracking-tighter leading-none bg-black bg-opacity-20 px-3 py-2 rounded-xl inline-block border border-white border-opacity-10">
                {lote.loteNro}
              </h2>
            </div>
            <h3 className="font-serif text-xl font-bold">
              {lote.especie} · <span className="font-sans font-normal text-sm text-gray-200">{lote.variedad}</span>
            </h3>
            <p className="text-xs text-gray-300 mt-1">{lote.cliente}</p>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Tipo / Categoría</span>
              <span className="font-semibold text-gray-800 text-sm block mt-0.5">{lote.tipo}</span>
            </div>

            <div className="border-t border-gray-50 pt-3">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Tratamiento del Lote</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {lote.tratamiento.map((t, idx) => (
                  <span key={idx} className="bg-[#E3EFE7] text-[#00603C] px-2 py-0.5 rounded text-[10px] font-semibold">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-50 pt-3">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Producto Químico Aplicado</span>
              <span className="font-medium text-gray-700 text-sm block mt-0.5">{lote.producto}</span>
            </div>

            <div className="border-t border-gray-50 pt-3">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Fecha de Ingreso</span>
              <span className="font-medium text-gray-700 block mt-0.5">{formatDateStr(lote.fechaIngreso)}</span>
            </div>

            <div className="border-t border-gray-50 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Sector de Acopio / Ubicación</span>
                {onUpdateLoteLocation && (
                  <button
                    onClick={() => {
                      setSelectedAla(lote.ala || '');
                      setSelectedSector(lote.sector || '');
                      setShowLocationModal(true);
                    }}
                    className="text-[10px] font-bold text-[#C9922E] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    Asignar
                  </button>
                )}
              </div>
              <span className="font-semibold text-[#00603C] text-sm block mt-0.5 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-[#C9922E]" />
                {lote.ala && lote.sector ? `ALA: ${lote.ala} / SECTOR: ${lote.sector}` : 'No asignado'}
              </span>
            </div>

            <div className="border-t border-gray-50 pt-3">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Peso Promedio Bolsa</span>
              <span className="font-medium text-gray-700 block mt-0.5">{lote.kgPorBolsa || 40} kg por bolsa</span>
            </div>

            {/* Cuadro de Observaciones del Lote */}
            {lote.observaciones && (
              <div className="border-t border-gray-50 pt-3">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Observaciones / Notas</span>
                <div className="mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-sans leading-relaxed text-xs italic whitespace-pre-wrap">
                  {lote.observaciones}
                </div>
              </div>
            )}

            {/* Cuadro de Seguridad de Lote */}
            <div className="bg-[#F6EFDC] p-3.5 rounded-xl border border-[#C9922E] border-opacity-20 flex gap-2.5 mt-6">
              <ShieldCheck className="w-5 h-5 text-[#C9922E] shrink-0" />
              <div>
                <span className="font-bold text-[#C9922E] block uppercase tracking-wider text-[9px]">Garantía La Barrancosa</span>
                <span className="text-[10px] text-gray-600 block mt-0.5">Semilla clasificada con estándares de pureza y calidad Agro Abacus S.A.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Saldos y Tabla Historial */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tarjetas de Saldo de Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#E3EFE7] p-5 rounded-2xl border border-[#00603C] border-opacity-10 shadow-sm text-center">
              <span className="text-[10px] font-bold text-[#00603C] uppercase tracking-wider block">Existencias (Bolsas)</span>
              <span className="font-serif text-2xl font-bold text-[#00603C] mt-1.5 block">
                {formatNumberArg(lote.stockBolsas, 0)} b.
              </span>
            </div>
            <div className="bg-[#F6EFDC] p-5 rounded-2xl border border-[#C9922E] border-opacity-10 shadow-sm text-center">
              <span className="text-[10px] font-bold text-[#C9922E] uppercase tracking-wider block">Existencias (Kilogramos)</span>
              <span className="font-serif text-2xl font-bold text-[#C9922E] mt-1.5 block">
                {formatNumberArg(lote.stockKg, 0)} kg
              </span>
            </div>
          </div>

          {/* Historial de Movimientos y Auditoría de Eventos */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <h4 className="font-serif text-base font-bold text-[#1A1A1A] uppercase tracking-wide">
                Auditoría y Trazabilidad de Lote
              </h4>
              
              {/* Selector de Pestañas */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('stock')}
                  className={`px-3 py-1.5 rounded-md transition duration-200 ${
                    activeTab === 'stock'
                      ? 'bg-[#00603C] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Existencias y Stock
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-1.5 rounded-md transition duration-200 flex items-center gap-1.5 ${
                    activeTab === 'audit'
                      ? 'bg-[#00603C] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Bitácora Completa
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.25 text-[9px] font-bold rounded-full ${
                    activeTab === 'audit' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {getLoteAuditoria(lote).length}
                  </span>
                </button>
              </div>
            </div>

            {activeTab === 'stock' ? (
              <div className="space-y-6">
                {/* Gráfico de Evolución del Stock */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                    <div>
                      <span className="text-[10px] font-sans font-semibold tracking-wider text-[#00603C] uppercase block">
                        CURVA DE EXISTENCIAS
                      </span>
                      <h5 className="font-serif text-sm font-bold text-[#1A1A1A] mt-0.5">
                        Evolución Temporal de Stock (Bolsas)
                      </h5>
                    </div>
                    <div className="text-[10px] text-gray-500 font-sans bg-[#F6EFDC]/60 px-2.5 py-1 rounded-md border border-[#C9922E]/10 self-start">
                      Factor: <span className="font-mono font-bold">{lote.kgPorBolsa || 40} kg</span> por bolsa
                    </div>
                  </div>

                  <div className="h-[220px] w-full">
                    {timeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeline} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => formatDateStr(val)}
                            tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 500 }}
                          />
                          <YAxis 
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 500 }}
                            tickFormatter={(val) => `${formatNumberArg(val, 0)} b.`}
                          />
                          <Tooltip content={<CustomLineTooltip />} />
                          <Line 
                            type="monotone" 
                            dataKey="bolsas" 
                            stroke="#00603C" 
                            strokeWidth={2.5}
                            activeDot={{ r: 6 }}
                            dot={{ r: 4, strokeWidth: 1.5, fill: '#white', stroke: '#00603C' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                        Sin movimientos históricos suficientes para graficar.
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de Movimientos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                        <th className="py-2">Fecha</th>
                        <th className="py-2">Operación</th>
                        <th className="py-2 text-right">Bolsas</th>
                        <th className="py-2 text-right">Kilogramos</th>
                        <th className="py-2 pl-4">Detalle / Justificación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lote.historial.map((mov) => {
                        const isEntrada = mov.tipo.includes('Entrada');
                        return (
                          <tr key={mov.id} className="hover:bg-gray-50">
                            <td className="py-3 font-medium text-gray-600">{formatDateStr(mov.fecha)}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 font-bold ${isEntrada ? 'text-[#00603C]' : 'text-[#A0522D]'}`}>
                                {isEntrada ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {mov.tipo}
                              </span>
                            </td>
                            <td className="py-3 text-right font-bold text-gray-700">
                              {isEntrada ? '+' : '-'}{mov.cantidadBolsas}
                            </td>
                            <td className="py-3 text-right font-mono font-semibold text-gray-800">
                              {formatNumberArg(mov.cantidadKg, 0)} kg
                            </td>
                            <td className="py-3 pl-4 text-gray-500 italic max-w-xs truncate" title={mov.detalle}>
                              {mov.detalle}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flow-root max-h-[400px] overflow-y-auto pr-2">
                <ul className="-mb-8">
                  {getLoteAuditoria(lote).map((event, eventIdx, arr) => {
                    let iconBg = 'bg-gray-100';
                    let iconColor = 'text-gray-600';
                    
                    if (event.tipo === 'Creación') {
                      iconBg = 'bg-[#E3EFE7]';
                      iconColor = 'text-[#00603C]';
                    } else if (event.tipo === 'Edición') {
                      iconBg = 'bg-[#F6EFDC]';
                      iconColor = 'text-[#C9922E]';
                    } else if (event.tipo === 'Stock') {
                      iconBg = 'bg-[#F5E5DC]';
                      iconColor = 'text-[#A0522D]';
                    }

                    // Formatear fecha y hora
                    let displayTime = '';
                    let displayDate = '';
                    try {
                      const dt = new Date(event.fechaHora);
                      if (!isNaN(dt.getTime())) {
                        displayDate = dt.toLocaleDateString('es-AR');
                        displayTime = dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';
                      } else {
                        displayDate = event.fechaHora;
                      }
                    } catch (e) {
                      displayDate = event.fechaHora;
                    }

                    return (
                      <li key={event.id}>
                        <div className="relative pb-8">
                          {eventIdx !== arr.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white ${iconBg} ${iconColor}`}>
                                {event.tipo === 'Creación' && <ShieldCheck className="w-4 h-4" />}
                                {event.tipo === 'Edición' && <Edit2 className="w-4 h-4" />}
                                {event.tipo === 'Stock' && <Clock className="w-4 h-4" />}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                <div className="text-xs font-semibold text-gray-900">
                                  {event.descripcion}
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                                  <span>{displayDate}</span>
                                  <span className="text-gray-300">|</span>
                                  <span>{displayTime}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-flex items-center px-1.5 py-0.25 text-[9px] font-bold rounded-md border uppercase tracking-wider ${
                                  event.tipo === 'Creación'
                                    ? 'bg-[#E3EFE7] text-[#00603C] border-[#00603C]/10'
                                    : event.tipo === 'Edición'
                                    ? 'bg-[#F6EFDC] text-[#C9922E] border-[#C9922E]/10'
                                    : 'bg-[#F5E5DC] text-[#A0522D] border-[#A0522D]/10'
                                }`}>
                                  {event.tipo}
                                </span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                  <User className="w-3 h-3 text-gray-400" />
                                  {event.usuario}
                                </span>
                              </div>
                              {event.detalles && (
                                <p className="mt-2 text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-sans leading-relaxed whitespace-pre-wrap">
                                  {event.detalles}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal / Panel de Agregar Movimiento Manual */}
      {showAddMovModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="border-b border-gray-100 pb-3 mb-4 flex justify-between items-center">
              <h5 className="font-serif text-lg font-bold text-[#1A1A1A]">
                Ajustar Inventario Lote: {lote.id}
              </h5>
              <button
                onClick={() => setShowAddMovModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="bg-[#F5E5DC] text-[#A0522D] p-3 rounded-lg flex items-start gap-2 text-xs border border-red-100 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAgregarMovimiento} className="space-y-4 text-xs text-left">
              <div>
                <label className="block text-gray-700 font-bold mb-1 uppercase tracking-wide">Fecha de Registro</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 uppercase tracking-wide">Tipo de Operación</label>
                <select
                  value={tipoMov}
                  onChange={(e) => setTipoMov(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200"
                >
                  <option value="Entrada manual">Entrada manual (+ suma stock)</option>
                  <option value="Salida">Salida manual (- resta stock)</option>
                  <option value="Ajuste">Ajuste de Auditoría (- resta stock)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1 uppercase tracking-wide">Bolsas</label>
                  <input
                    type="number"
                    value={bolsas}
                    onChange={(e) => setBolsas(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1 uppercase tracking-wide">Kg por Bolsa</label>
                  <input
                    type="number"
                    value={kgBolsa}
                    onChange={(e) => setKgBolsa(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 uppercase tracking-wide">Concepto / Detalle *</label>
                <input
                  type="text"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200"
                  placeholder="Ej: Ajuste por rotura, ingreso manual adicional..."
                  required
                />
              </div>

              <div className="pt-4 border-t border-gray-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMovModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-semibold uppercase tracking-wider text-[10px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00603C] hover:bg-[#254731] text-white rounded-lg font-semibold uppercase tracking-wider text-[10px]"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQrModal && (
        <QrCodeModal
          lote={lote}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* Modal Barcode Label */}
      {showBarcodeModal && (
        <BarcodeLabelModal
          lote={lote}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}

      {/* Modal Asignar Ubicación */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" id="assign-location-modal">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00603C] to-[#254731] text-white p-5 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <Warehouse className="w-5 h-5 text-[#C9922E]" />
                <h3 className="font-serif text-base font-extrabold tracking-wide uppercase">
                  Asignar Ubicación de Acopio
                </h3>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              <div className="text-xs text-gray-500 font-medium leading-relaxed font-sans">
                Asigne el sector de depósito físico en la planta para el lote <strong className="font-mono text-gray-800">LOTE: {lote.loteNro}</strong>. Esto actualizará el mapa de calor y la ficha técnica oficial.
              </div>

              {/* Grid de Ala */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Seleccionar Ala (Sector Lateral)
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {['A', 'B', 'C', 'D'].map((alaLetter) => {
                    const isSelected = selectedAla === alaLetter;
                    return (
                      <button
                        key={alaLetter}
                        type="button"
                        onClick={() => setSelectedAla(alaLetter)}
                        className={`py-3.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#E3EFE7] border-[#00603C] text-[#00603C] font-extrabold shadow-xs ring-1 ring-[#00603C]'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 font-bold'
                        }`}
                      >
                        <span className="text-[9px] text-gray-400 font-semibold tracking-wider block">ALA</span>
                        <span className="text-xl font-mono leading-none">{alaLetter}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid de Sector */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Seleccionar Sector (Número de Celda)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {['1', '2', '3'].map((sectorNum) => {
                    const isSelected = selectedSector === sectorNum;
                    return (
                      <button
                        key={sectorNum}
                        type="button"
                        onClick={() => setSelectedSector(sectorNum)}
                        className={`py-3.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#F6EFDC] border-[#C9922E] text-[#C9922E] font-extrabold shadow-xs ring-1 ring-[#C9922E]'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 font-bold'
                        }`}
                      >
                        <span className="text-[9px] text-gray-400 font-semibold tracking-wider block">SECTOR</span>
                        <span className="text-xl font-mono leading-none">{sectorNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vista previa de ubicación */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Ubicación Resultante:</span>
                <span className="font-mono font-bold text-[#00603C] text-sm">
                  {selectedAla && selectedSector ? `ALA ${selectedAla} · SECTOR ${selectedSector}` : 'No seleccionada'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2 text-xs font-semibold font-sans uppercase tracking-wider text-gray-500 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedAla || !selectedSector}
                onClick={async () => {
                  if (onUpdateLoteLocation) {
                    await onUpdateLoteLocation(lote.id, selectedAla, selectedSector);
                  }
                  setShowLocationModal(false);
                }}
                className="px-5 py-2 text-xs font-semibold font-sans uppercase tracking-wider bg-[#00603C] text-white hover:bg-[#254731] rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <Warehouse className="w-4 h-4 text-[#C9922E]" />
                <span>Asignar Ubicación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
