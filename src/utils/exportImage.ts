/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toJpeg } from 'html-to-image';

/**
 * Exporta un elemento HTML como imagen .JPG en alta resolución (2x DPI).
 * Soporta espacios de color modernos (oklab, oklch) y estilos de Tailwind CSS 4.
 */
export const exportCardAsJpg = async (
  elementIdOrElement: string | HTMLElement,
  fileName: string = 'Ficha_de_Lote'
): Promise<boolean> => {
  try {
    const targetElement =
      typeof elementIdOrElement === 'string'
        ? document.getElementById(elementIdOrElement)
        : elementIdOrElement;

    if (!targetElement) {
      console.error(`Elemento no encontrado para exportar a JPG: ${elementIdOrElement}`);
      return false;
    }

    const dataUrl = await toJpeg(targetElement, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    const downloadLink = document.createElement('a');
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    downloadLink.download = safeName.endsWith('.jpg') ? safeName : `${safeName}.jpg`;
    downloadLink.href = dataUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    return true;
  } catch (error) {
    console.error('Error al exportar ficha a JPG:', error);
    return false;
  }
};

