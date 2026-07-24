/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Copy, Check, Download, Printer, X } from 'lucide-react';
import { Lote } from '../types';

interface QrCodeModalProps {
  lote: Lote;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ lote, onClose }) => {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generar la URL de trazabilidad del lote
  const qrUrl = `${window.location.origin}${window.location.pathname}?lote=${lote.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('No se pudo copiar el enlace', err);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR-Lote-${lote.id}.png`;
    link.href = url;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Lote ${lote.id}</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh;
              margin: 0;
              color: #1a1a1a;
            }
            .container {
              border: 3px solid #00603C;
              padding: 40px;
              border-radius: 16px;
              text-align: center;
              max-width: 400px;
            }
            h1 {
              font-size: 24px;
              margin: 0;
              color: #00603C;
              font-weight: 800;
            }
            h2 {
              font-size: 11px;
              color: #C9922E;
              margin-top: 4px;
              margin-bottom: 25px;
              letter-spacing: 1.5px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .info {
              margin-top: 25px;
              font-size: 18px;
              font-weight: 800;
              color: #1A1A1A;
            }
            .desc {
              font-size: 13px;
              color: #555;
              margin-top: 4px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>AGRO ABACUS</h1>
            <h2>Estancia La Barrancosa</h2>
            <img src="${canvasRef.current?.toDataURL('image/png')}" width="250" height="250" />
            <div class="info">LOTE: ${lote.id}</div>
            <div class="desc">${lote.especie} - ${lote.variedad}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-gray-100 flex flex-col items-center relative text-center my-auto max-h-[95vh] overflow-y-auto">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
          title="Cerrar Ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icono Cabecera */}
        <div className="p-2 bg-[#E3EFE7] text-[#00603C] rounded-full mb-2">
          <QrCode className="w-6 h-6" />
        </div>

        {/* Título */}
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
          Código QR de Trazabilidad
        </h3>
        <p className="text-[10px] font-mono font-bold text-[#C9922E] tracking-wider uppercase mt-0.5 mb-2">
          Lote: {lote.id}
        </p>
        
        <p className="text-[10px] text-gray-500 max-w-xs mb-3 leading-relaxed">
          Escanee este código para consultar la ficha técnica, disponibilidad y trazabilidad de este lote de manera instantánea.
        </p>

        {/* Contenedor QR */}
        <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-inner mb-3 flex justify-center items-center">
          <QRCodeCanvas
            ref={canvasRef}
            value={qrUrl}
            size={200}
            style={{ width: '140px', height: '140px' }}
            bgColor="#ffffff"
            fgColor="#00603C"
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Mostrar Enlace */}
        <div className="w-full bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center justify-between text-left text-[11px] text-gray-600 mb-3 font-mono overflow-hidden">
          <span className="truncate pr-3 select-all">{qrUrl}</span>
          <button
            onClick={handleCopyLink}
            className="shrink-0 p-1 bg-white text-gray-500 hover:text-[#00603C] hover:bg-gray-100 border border-gray-200 rounded-md transition flex items-center gap-1 font-sans font-bold cursor-pointer"
            title="Copiar Link"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-[9px] text-emerald-600">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[9px]">Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Botones de acción y de cerrar */}
        <div className="flex flex-col gap-2 w-full">
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-[#00603C] transition text-xs font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
            
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#00603C] text-white rounded-xl hover:bg-[#254731] transition text-xs font-bold shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#C9922E]" />
              Imprimir
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-xl text-xs font-bold font-sans tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5 mt-1 border border-gray-200/50"
            title="Cerrar Ventana"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cerrar Ventana</span>
          </button>
        </div>
      </div>
    </div>
  );
};
