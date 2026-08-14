/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { LogoSiloLoose, LogoSiloSquare } from './Logo';
import { KeyRound, User, Briefcase, AlertTriangle, Smartphone, ArrowRight, ShieldCheck } from 'lucide-react';
import { getListaDespachantes } from '../utils/despachantes';

interface LoginProps {
  onLoginSuccess: (nombre: string, rol: string) => void;
  onAccederPlantaMovil?: () => void;
}

const BASE_PERFILES = [
  { nombre: 'Malcon Baez', rol: 'Jefe de Planta', requierePass: true },
  { nombre: 'Amilcar Quiroz', rol: 'Logística', requierePass: true },
  { nombre: 'Jose Ballarini', rol: 'Despachante', requierePass: false },
  { nombre: 'Anibal Grandolio', rol: 'Despachante', requierePass: false },
  { nombre: 'Cristian Grandolio', rol: 'Despachante', requierePass: false },
  { nombre: 'Manuel Gomez Riquel', rol: 'Despachante', requierePass: false }
];

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onAccederPlantaMovil }) => {
  const perfilesList = useMemo(() => {
    const allDespachantes = getListaDespachantes();
    const result = [...BASE_PERFILES];
    
    allDespachantes.forEach(name => {
      if (!result.some(p => p.nombre.toLowerCase() === name.toLowerCase())) {
        result.push({ nombre: name, rol: 'Despachante', requierePass: false });
      }
    });
    return result;
  }, []);

  const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>('Malcon Baez');
  const [password, setPassword] = useState<string>('');
  const [nombreManual, setNombreManual] = useState<string>('');
  const [rolManual, setRolManual] = useState<string>('Despachante');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear(); // 2026

  // Determinar si el usuario seleccionado requiere contraseña
  const requiresPassword = useMemo(() => {
    const norm = perfilSeleccionado.toLowerCase().trim();
    return norm.includes('malcon') || norm.includes('amilcar');
  }, [perfilSeleccionado]);

  const handleSelectQuickUser = (nombre: string) => {
    setPerfilSeleccionado(nombre);
    setPassword('');
    setError('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

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

    const normNombre = finalNombre.toLowerCase().trim();
    const cleanPass = password.trim().toLowerCase();

    // Verificación de contraseña exclusiva para Malcon Baez y Amilcar Quiroz
    if (normNombre.includes('malcon')) {
      const validMalconPass = [
        `baez${currentYear}`,
        'baez2026',
        'baez',
        'malcon2026',
        'abacus2026'
      ];
      if (!cleanPass || !validMalconPass.includes(cleanPass)) {
        setError('Contraseña incorrecta.');
        setLoading(false);
        passwordInputRef.current?.focus();
        return;
      }
    } else if (normNombre.includes('amilcar')) {
      const validAmilcarPass = [
        `quiroz${currentYear}`,
        'quiroz2026',
        'quiroz',
        'amilcar2026',
        'abacus2026'
      ];
      if (!cleanPass || !validAmilcarPass.includes(cleanPass)) {
        setError('Contraseña incorrecta.');
        setLoading(false);
        passwordInputRef.current?.focus();
        return;
      }
    }

    setTimeout(() => {
      onLoginSuccess(finalNombre, finalRol);
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Elemento decorativo del logo sutil en el fondo de login */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
        <LogoSiloLoose size={600} color="#00603C" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden relative z-10 transition-all duration-300">
        
        {/* Cabecera del panel de login */}
        <div className="bg-[#00603C] p-7 text-center relative">
          <div className="inline-flex items-center justify-center p-3.5 bg-[#F6EFDC] rounded-full shadow-md mb-3">
            <LogoSiloSquare size={44} color="#00603C" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white tracking-wide">
            AGRO ABACUS S.A.
          </h1>
          <p className="text-[11px] font-sans font-semibold tracking-widest text-[#C9922E] uppercase mt-1">
            Planta Clasificadora · La Barrancosa
          </p>
        </div>

        {/* Acceso Público Directo a Planta Móvil */}
        {onAccederPlantaMovil && (
          <div className="bg-emerald-50/90 border-b border-emerald-200 px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-950 leading-tight">
                  Planta Móvil Libre
                </p>
                <p className="text-[10px] text-emerald-700 font-medium">
                  Acceso público a Silos y Operaciones
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onAccederPlantaMovil}
              className="px-3 py-1.5 bg-[#00603C] hover:bg-[#254731] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
              <span>Entrar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Formulario de Login de Personal */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <span className="text-xs font-sans font-extrabold tracking-widest text-[#00603C] uppercase">
              ACCESO ADMINISTRATIVO Y OPERATIVO
            </span>
            <div className="h-0.5 w-12 bg-[#C9922E] mx-auto mt-1.5"></div>
          </div>

          {/* Botones de Acceso Rápido para Amilcar y Malcon (autocompletan usuario, contraseña manual) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">
              Acceso Rápido de Autorizados
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectQuickUser('Amilcar Quiroz')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                  perfilSeleccionado === 'Amilcar Quiroz'
                    ? 'bg-[#E3EFE7] border-[#00603C] text-[#00603C] ring-2 ring-[#00603C]/30 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#00603C] flex items-center justify-center font-bold text-xs shrink-0">
                  AQ
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Amilcar Quiroz</div>
                  <div className="text-[10px] text-slate-500 font-medium">Logística</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickUser('Malcon Baez')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                  perfilSeleccionado === 'Malcon Baez'
                    ? 'bg-[#E3EFE7] border-[#00603C] text-[#00603C] ring-2 ring-[#00603C]/30 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                  MB
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Malcon Baez</div>
                  <div className="text-[10px] text-slate-500 font-medium">Jefe Planta</div>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-xl flex items-start gap-2.5 text-xs border border-red-200 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {/* Seleccionar Personal */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                Usuario / Personal *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <select
                  value={perfilSeleccionado}
                  onChange={(e) => {
                    setPerfilSeleccionado(e.target.value);
                    setPassword('');
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#E3EFE7]/40 text-[#1A1A1A] text-sm font-semibold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] transition"
                >
                  {perfilesList.map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre} — {p.rol} {p.requierePass ? '(Requiere Clave)' : ''}
                    </option>
                  ))}
                  <option value="otro">Otro (Ingreso manual)...</option>
                </select>
              </div>
            </div>

            {/* Campos condicionales si es "Otro" */}
            {perfilSeleccionado === 'otro' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-[#E3EFE7]/40 text-[#1A1A1A] text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] transition"
                      placeholder="Ingrese su nombre completo"
                      required={perfilSeleccionado === 'otro'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1">
                    Rol de Operación *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <select
                      value={rolManual}
                      onChange={(e) => setRolManual(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#E3EFE7]/40 text-[#1A1A1A] text-sm font-semibold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] transition"
                    >
                      <option value="Jefe de Planta">Jefe de Planta</option>
                      <option value="Logística">Logística</option>
                      <option value="Despachante">Despachante</option>
                      <option value="Operario">Operario</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Campo Contraseña (requerido para Malcon Baez y Amilcar Quiroz) */}
            {requiresPassword && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  Contraseña *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <KeyRound className="w-4 h-4 text-[#00603C]" />
                  </span>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#E3EFE7]/40 text-[#1A1A1A] text-sm font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00603C] transition"
                    autoFocus
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00603C] hover:bg-[#254731] text-white font-sans text-sm font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#C9922E]" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-500 text-center font-sans tracking-wide">
        AGRO ABACUS S.A. · ESTANCIA LA BARRANCOSA · © {currentYear}
      </p>
    </div>
  );
};
