/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Logo 1: Isotipo Principal (Ábaco con líneas verdes gruesas y cuadrado contenedor como el logo de la empresa)
 */
export const LogoSiloSquare: React.FC<LogoProps> = ({ size = 48, className = '', color = '#00603C', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Cuadrado contenedor */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        stroke={color}
        strokeWidth="6"
        fill="none"
      />
      {/* Guías/Rieles verticales: doble línea a la izquierda, doble a la derecha */}
      <line x1="25" y1="6" x2="25" y2="94" stroke={color} strokeWidth="4" />
      <line x1="31" y1="6" x2="31" y2="94" stroke={color} strokeWidth="4" />

      <line x1="69" y1="6" x2="69" y2="94" stroke={color} strokeWidth="4" />
      <line x1="75" y1="6" x2="75" y2="94" stroke={color} strokeWidth="4" />

      {/* Cuentas/Beads: cápsulas horizontales que cruzan las guías */}
      {/* Lado izquierdo (abajo-medio y abajo) */}
      <rect x="7" y="50" width="42" height="22" rx="11" stroke={color} strokeWidth="5" fill="white" />
      <rect x="7" y="72" width="42" height="22" rx="11" stroke={color} strokeWidth="5" fill="white" />

      {/* Lado derecho (arriba y abajo) */}
      <rect x="51" y="8" width="42" height="22" rx="11" stroke={color} strokeWidth="5" fill="white" />
      <rect x="51" y="72" width="42" height="22" rx="11" stroke={color} strokeWidth="5" fill="white" />
    </svg>
  );
};

/**
 * Logo 2: Isotipo Suelto (El mismo ábaco de la empresa en versión suelta, sin cuadrado exterior)
 */
export const LogoSiloLoose: React.FC<LogoProps> = ({ size = 48, className = '', color = '#00603C', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Guías/Rieles verticales: doble línea a la izquierda, doble a la derecha */}
      <line x1="25" y1="6" x2="25" y2="94" stroke={color} strokeWidth="4" />
      <line x1="31" y1="6" x2="31" y2="94" stroke={color} strokeWidth="4" />

      <line x1="69" y1="6" x2="69" y2="94" stroke={color} strokeWidth="4" />
      <line x1="75" y1="6" x2="75" y2="94" stroke={color} strokeWidth="4" />

      {/* Cuentas/Beads: cápsulas horizontales que cruzan las guías */}
      {/* Lado izquierdo (abajo-medio y abajo) */}
      <rect x="7" y="50" width="42" height="22" rx="11" stroke={color} strokeWidth="5" fill="white" />
      <rect x="7" y="72" width="42" height="22" rx="11" stroke={color} strokeWidth="5" fill="white" />

      {/* Lado derecho (arriba y abajo) */}
      <rect x="51" y="8" width="42" height="22" rx="11" stroke={color} strokeWidth="5" fill="white" />
      <rect x="51" y="72" width="42" height="22" rx="11" stroke={color} strokeWidth="5" fill="white" />
    </svg>
  );
};

/**
 * Header Brand Logo Component combining LogoSiloSquare and typography
 */
export const HeaderBrand: React.FC = () => {
  return (
    <div className="flex items-center gap-3">
      <LogoSiloSquare size={44} color="#00603C" className="shrink-0" />
      <div className="flex flex-col">
        <span className="font-serif text-lg md:text-xl font-semibold tracking-tight text-[#00603C] leading-none uppercase">
          AGRO ABACUS
        </span>
        <span className="text-[10px] md:text-xs font-sans font-medium tracking-widest text-[#C9922E] uppercase mt-1">
          PLANTA CLASIFICADORA · LA BARRANCOSA
        </span>
      </div>
    </div>
  );
};
