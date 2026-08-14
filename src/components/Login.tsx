/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { LogoSiloLoose, LogoSiloSquare } from './Logo';
import { KeyRound, User, Briefcase, AlertTriangle, Smartphone, ArrowRight, ShieldCheck, ChevronDown, Lock, QrCode } from 'lucide-react';
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
  const [mostrarPanelLogin, setMostrarPanelLogin] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear(); // e.g. 2026

  // Determinar si el usuario seleccionado requiere contraseña
  const requiresPassword = useMemo(() => {
    const norm = perfilSeleccionado.toLowerCase().trim();
    return norm.includes('malcon') || norm.includes('amilcar');
  }, [perfilSeleccionado]);

  const handleSelectQuickUser = (nombre: string) => {
    setPerfilSeleccionado(nombre);
    setPassword('');
    setError('');
    setMostrarPanelLogin(true);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 150);
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

    // Verificación de contraseña exclusiva para Malcon Baez y Amilcar Quiroz (formato apellido + año)
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
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden select-none font-sans"
      style={{
        background: 'radial-gradient(ellipse at center, #005e38 0%, #013824 50%, #012418 100%)',
        color: '#ffffff'
      }}
    >
      {/* Marca de agua de fondo con el isotipo de la empresa */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none flex items-center justify-center overflow-hidden">
        <LogoSiloLoose size={800} color="#ffffff" />
      </div>

      {/* Contenedor principal de la Carátula de Inicio */}
      <div className="w-full max-w-lg bg-[#012418]/90 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#005e38]/60 overflow-hidden relative z-10 transition-all duration-300">
        
        {/* Panel Superior: Logo blanco en panel verde institucional */}
        <div className="bg-[#005e38] p-8 text-center relative border-b border-[#007a4a]/40 shadow-inner">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-2xl border border-white/20 shadow-md mb-4 backdrop-blur-xs">
            <LogoSiloSquare size={54} color="#ffffff" />
          </div>
          
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-wider uppercase leading-tight">
            AGRO ABACUS S.A.
          </h1>
          
          <p className="text-xs font-mono font-bold tracking-widest text-[#C9922E] uppercase mt-2">
            ESTANCIA LA BARRANCOSA
          </p>
          
          <p className="text-[11px] font-sans font-medium tracking-wide text-emerald-100/80 uppercase mt-1">
            Planta de Clasificación de Semillas
          </p>
        </div>

        {/* Cuerpo Principal de la Carátula */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Opción 1: BOTÓN PLANTA MÓVIL (Acceso Público Directo sin Login) */}
          {onAccederPlantaMovil && (
            <div className="bg-gradient-to-r from-emerald-900/60 to-emerald-950/80 border-2 border-emerald-500/60 hover:border-emerald-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)] group">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
                    <Smartphone className="w-5 h-5 text-emerald-300 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 block">
                      Acceso Público
                    </span>
                    <h2 className="text-lg font-bold text-white leading-tight">
                      Planta Móvil
                    </h2>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Sin Login
                </span>
              </div>

              <p className="text-xs text-emerald-200/80 mb-4 leading-relaxed font-sans">
                Consulta en vivo del estado de los 6 Silos, escáner de códigos QR de trazabilidad y Playa de espera.
              </p>

              <button
                type="button"
                onClick={onAccederPlantaMovil}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans text-sm font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>Ingresar a Planta Móvil</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Opción 2: BOTÓN / DESPLEGABLE INICIAR SESIÓN (Acceso Administrativo) */}
          <div className="border border-slate-700/60 rounded-2xl bg-slate-900/50 overflow-hidden">
            
            {/* Botón de apertura / cabecera de Iniciar Sesión */}
            <button
              type="button"
              onClick={() => setMostrarPanelLogin(!mostrarPanelLogin)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 text-amber-300 rounded-xl border border-slate-700">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Iniciar Sesión
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Acceso para Jefatura, Logística y Despachantes
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${mostrarPanelLogin ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>

            {/* Panel de Login Desplegado */}
            {mostrarPanelLogin && (
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 pt-2 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                
                {/* Accesos Rápidos para Amilcar Quiroz y Malcón Báez */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 text-center">
                    Accesos Rápidos
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectQuickUser('Amilcar Quiroz')}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        perfilSeleccionado === 'Amilcar Quiroz'
                          ? 'bg-[#005e38]/50 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-sm'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center font-bold text-xs shrink-0">
                        AQ
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">Amilcar Quiroz</div>
                        <div className="text-[10px] text-emerald-400 font-medium">Logística</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectQuickUser('Malcon Baez')}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        perfilSeleccionado === 'Malcon Baez'
                          ? 'bg-[#005e38]/50 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-sm'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-bold text-xs shrink-0">
                        MB
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">Malcón Báez</div>
                        <div className="text-[10px] text-amber-400 font-medium">Jefe de Planta</div>
                      </div>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-950/80 text-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs border border-red-500/50 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span className="leading-snug">{error}</span>
                  </div>
                )}

                {/* Selección de Usuario */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Usuario *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <select
                      value={perfilSeleccionado}
                      onChange={(e) => {
                        setPerfilSeleccionado(e.target.value);
                        setPassword('');
                        setError('');
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                    >
                      {perfilesList.map((p) => (
                        <option key={p.nombre} value={p.nombre} className="bg-slate-900 text-white">
                          {p.nombre} — {p.rol} {p.requierePass ? '(Requiere Clave)' : ''}
                        </option>
                      ))}
                      <option value="otro" className="bg-slate-900 text-white">Otro (Ingreso manual)...</option>
                    </select>
                  </div>
                </div>

                {/* Campos condicionales si es "Otro" */}
                {perfilSeleccionado === 'otro' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        value={nombreManual}
                        onChange={(e) => setNombreManual(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800 text-white text-sm rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                        placeholder="Ingrese su nombre completo"
                        required={perfilSeleccionado === 'otro'}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Rol *
                      </label>
                      <select
                        value={rolManual}
                        onChange={(e) => setRolManual(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                      >
                        <option value="Jefe de Planta" className="bg-slate-900 text-white">Jefe de Planta</option>
                        <option value="Logística" className="bg-slate-900 text-white">Logística</option>
                        <option value="Despachante" className="bg-slate-900 text-white">Despachante</option>
                        <option value="Operario" className="bg-slate-900 text-white">Operario</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Campo Contraseña (requerido para Amilcar y Malcon) SIN placeholder de ejemplo */}
                {requiresPassword && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <KeyRound className="w-4 h-4 text-emerald-400" />
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
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-white text-sm font-mono rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#005e38] hover:bg-[#007a4a] text-white font-sans text-sm font-bold py-3 px-4 rounded-xl shadow-lg border border-emerald-500/40 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
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
            )}
          </div>
        </div>

        {/* Pie de página institucional */}
        <div className="bg-[#011a11] px-6 py-3.5 border-t border-slate-800 text-center">
          <p className="text-[10px] font-mono text-emerald-300/60 uppercase tracking-widest">
            AGRO ABACUS S.A. · ESTANCIA LA BARRANCOSA · © {currentYear}
          </p>
        </div>
      </div>
    </div>
  );
};
