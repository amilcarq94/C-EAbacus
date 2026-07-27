/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LogoSiloLoose, LogoSiloSquare } from './Logo';
import { KeyRound, User, Briefcase, AlertTriangle } from 'lucide-react';
import { getListaDespachantes } from '../utils/despachantes';

interface LoginProps {
  onLoginSuccess: (nombre: string, rol: string) => void;
}

const BASE_PERFILES = [
  { nombre: 'Malcon Baez', rol: 'Jefe de Planta' },
  { nombre: 'Amilcar Quiroz', rol: 'Logística' },
  { nombre: 'Jose Ballarini', rol: 'Despachante' },
  { nombre: 'Anibal Grandolio', rol: 'Despachante' },
  { nombre: 'Cristian Grandolio', rol: 'Despachante' },
  { nombre: 'Manuel Gomez Riquel', rol: 'Despachante' }
];

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const perfilesList = useMemo(() => {
    const allDespachantes = getListaDespachantes();
    const result = [...BASE_PERFILES];
    
    // Agregar cualquier despachante adicional que no esté en BASE_PERFILES
    allDespachantes.forEach(name => {
      if (!result.some(p => p.nombre.toLowerCase() === name.toLowerCase())) {
        result.push({ nombre: name, rol: 'Despachante' });
      }
    });
    return result;
  }, []);

  const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>('Malcon Baez');
  const [nombreManual, setNombreManual] = useState<string>('');
  const [rolManual, setRolManual] = useState<string>('Despachante');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let finalNombre = '';
    let finalRol = '';

    if (perfilSeleccionado === 'otro') {
      if (!nombreManual.trim()) {
        setError('Por favor ingrese su nombre completo.');
        setLoading(false);
        return;
      }
      finalNombre = nombreManual.trim();
      finalRol = rolManual;
    } else {
      const perfil = perfilesList.find(p => p.nombre === perfilSeleccionado);
      if (!perfil) {
        setError('Perfil seleccionado no válido.');
        setLoading(false);
        return;
      }
      finalNombre = perfil.nombre;
      finalRol = perfil.rol;
    }

    // Ingreso directo sin contraseña para agilidad de planta
    setTimeout(() => {
      onLoginSuccess(finalNombre, finalRol);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Elemento decorativo del logo sutil en el fondo de login */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
        <LogoSiloLoose size={600} color="#00603C" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative z-10 transition-all duration-300">
        
        {/* Cabecera del panel de login */}
        <div className="bg-[#00603C] p-8 text-center relative">
          <div className="inline-flex items-center justify-center p-4 bg-[#F6EFDC] rounded-full shadow-md mb-4">
            <LogoSiloSquare size={48} color="#00603C" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white tracking-wide">
            AGRO ABACUS S.A.
          </h1>
          <p className="text-[11px] font-sans font-semibold tracking-widest text-[#C9922E] uppercase mt-1">
            Planta Clasificadora · La Barrancosa
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center">
            <span className="text-xs font-sans font-semibold tracking-widest text-[#00603C] uppercase">
              INGRESO DE PERSONAL
            </span>
            <div className="h-0.5 w-12 bg-[#C9922E] mx-auto mt-2"></div>
          </div>

          {error && (
            <div className="bg-[#F5E5DC] text-[#A0522D] p-3 rounded-lg flex items-start gap-2.5 text-xs border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Seleccionar Personal */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                Personal Planta / Operario *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <select
                  value={perfilSeleccionado}
                  onChange={(e) => setPerfilSeleccionado(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#E3EFE7] bg-opacity-40 text-[#1A1A1A] text-sm font-semibold rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] focus:border-transparent transition"
                >
                  {perfilesList.map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre} — {p.rol}
                    </option>
                  ))}
                  <option value="otro">Otro (Ingreso manual)...</option>
                </select>
              </div>
            </div>

            {/* Campos condicionales si es "Otro" */}
            {perfilSeleccionado === 'otro' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={nombreManual}
                      onChange={(e) => setNombreManual(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#E3EFE7] bg-opacity-40 text-[#1A1A1A] text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] focus:border-transparent transition"
                      placeholder="Ingrese su nombre completo"
                      required={perfilSeleccionado === 'otro'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                    Rol de Operación *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <select
                      value={rolManual}
                      onChange={(e) => setRolManual(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#E3EFE7] bg-opacity-40 text-[#1A1A1A] text-sm font-semibold rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] focus:border-transparent transition"
                    >
                      <option value="Jefe de Planta">Jefe de Planta</option>
                      <option value="Logística">Logística</option>
                      <option value="Despachante">Despachante</option>
                      <option value="Visitante">Visitante</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00603C] hover:bg-[#254731] text-white font-sans text-sm font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>

          {/* Ayuda sobre credenciales para facilitar pruebas */}
          <div className="bg-[#F6EFDC] p-3 rounded-lg text-[11px] text-gray-600 border border-amber-100">
            <span className="font-semibold text-[#C9922E] block mb-0.5 uppercase tracking-wider">
              Ingreso Autorizado Directo:
            </span>
            <span>Seleccione un perfil precargado o elija "Otro" para ingresar manualmente con su nombre completo y rol.</span>
          </div>
        </form>
      </div>

      <p className="mt-8 text-xs text-gray-500 text-center font-sans tracking-wide">
        AGRO ABACUS S.A. · ESTANCIA LA BARRANCOSA · © 2026
      </p>
    </div>
  );
};
