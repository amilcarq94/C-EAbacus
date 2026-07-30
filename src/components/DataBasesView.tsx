import React, { useState } from 'react';
import { Chofer, BolsonCampo, MovimientoSilo } from '../types';
import { ChoferesView } from './ChoferesView';
import { BolsaEnCampoView } from './BolsaEnCampoView';
import { Truck, Package, Database } from 'lucide-react';

interface DataBasesViewProps {
  choferes: Chofer[];
  bolsones: BolsonCampo[];
  movimientosSilo?: MovimientoSilo[];
  clientes?: string[];
  especies?: string[];
  initialSubTab?: 'choferes' | 'bolsa-campo';
  onSaveChofer?: (chofer: Chofer) => void;
  onImportChoferes?: (choferes: Chofer[]) => void;
}

export const DataBasesView: React.FC<DataBasesViewProps> = ({
  choferes = [],
  bolsones = [],
  movimientosSilo = [],
  clientes = [],
  especies = [],
  initialSubTab = 'choferes',
  onSaveChofer,
  onImportChoferes
}) => {
  const [subTab, setSubTab] = useState<'choferes' | 'bolsa-campo'>(initialSubTab);

  return (
    <div className="space-y-6">
      {/* Selector de Sub-Tab de Bases de Datos */}
      <div className="bg-slate-900/90 text-white p-2 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 pl-3">
          <Database className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
            Módulo General de Bases de Datos
          </span>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setSubTab('choferes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'choferes'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Choferes y Transporte</span>
            <span className="ml-1 text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full font-mono">
              {choferes.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('bolsa-campo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'bolsa-campo'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Bolsa en Campo</span>
            <span className="ml-1 text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full font-mono">
              {bolsones.length}
            </span>
          </button>
        </div>
      </div>

      {/* Renderizado de la Base de Datos Seleccionada */}
      {subTab === 'choferes' ? (
        <ChoferesView choferes={choferes} onSaveChofer={onSaveChofer} onImportChoferes={onImportChoferes} />
      ) : (
        <BolsaEnCampoView
          bolsones={bolsones}
          movimientosSilo={movimientosSilo}
          clientes={clientes}
          especies={especies}
        />
      )}
    </div>
  );
};
