import { SiloId, MovimientoSilo } from '../types';

export interface SiloActiveData {
  siloId: SiloId;
  stockKg: number;
  cliente: string;
  especie: string;
  variedad: string;
  categoria: string;
  isEmpty: boolean;
}

/**
 * Obtiene el resumen de datos activos (último lote de stock cargado) de un silo.
 */
export function getSiloActiveData(siloId: SiloId, movimientosSilo: MovimientoSilo[] = []): SiloActiveData {
  const movsAsc = (movimientosSilo || [])
    .filter((m) => m.siloId === siloId)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  let currentBalance = 0;
  let lastZeroIndex = -1;
  movsAsc.forEach((m, idx) => {
    if (m.tipo === 'INGRESO') {
      currentBalance += m.kg;
    } else if (m.tipo === 'EGRESO_OP' || (m.tipo as string).startsWith('EGRESO')) {
      currentBalance = Math.max(0, currentBalance - m.kg);
    } else if (m.tipo === 'AJUSTE_ZERO') {
      currentBalance = 0;
    }
    if (currentBalance === 0) {
      lastZeroIndex = idx;
    }
  });

  const movsBatchActual = movsAsc.slice(lastZeroIndex + 1);
  const ingresosBatchActual = movsBatchActual.filter((m) => m.tipo === 'INGRESO');

  if (currentBalance <= 0 || ingresosBatchActual.length === 0) {
    return {
      siloId,
      stockKg: 0,
      cliente: 'Sin asignación',
      especie: 'Sin Cereal / Vacío',
      variedad: '-',
      categoria: '-',
      isEmpty: true,
    };
  }

  const especiesSet = Array.from(new Set(ingresosBatchActual.map((i) => i.especie).filter(Boolean)));
  const clientesSet = Array.from(new Set(ingresosBatchActual.map((i) => i.cliente).filter(Boolean)));
  const variedadesSet = Array.from(new Set(ingresosBatchActual.map((i) => i.variedad).filter(Boolean)));
  const categoriasSet = Array.from(new Set(ingresosBatchActual.map((i) => i.categoria).filter(Boolean)));

  return {
    siloId,
    stockKg: currentBalance,
    cliente: clientesSet.length > 0 ? clientesSet.join(', ') : 'Sin asignación',
    especie: especiesSet.length > 0 ? especiesSet.join(', ') : 'Sin Cereal / Vacío',
    variedad: variedadesSet.length > 0 ? variedadesSet.join(', ') : '-',
    categoria: categoriasSet.length > 0 ? categoriasSet.join(', ') : '-',
    isEmpty: false,
  };
}

export interface SiloMatchResult {
  valid: boolean;
  errorMessage?: string;
  siloData?: SiloActiveData;
}

/**
 * Valida que el Cliente, Especie y Variedad del lote coincidan exactamente con los del Silo de Origen.
 */
export function validateSiloLoteMatch(
  siloId: SiloId,
  lote: { cliente?: string; especie?: string; variedad?: string },
  movimientosSilo: MovimientoSilo[] = []
): SiloMatchResult {
  const siloData = getSiloActiveData(siloId, movimientosSilo);

  if (siloData.isEmpty || siloData.stockKg <= 0) {
    return {
      valid: false,
      errorMessage: `El ${siloId} se encuentra vacío o sin stock disponible para vincular.`,
      siloData
    };
  }

  const norm = (str?: string) => (str || '').trim().toLowerCase();

  const loteCliente = (lote.cliente || '').trim();
  const loteEspecie = (lote.especie || '').trim();
  const loteVariedad = (lote.variedad || '').trim();

  const matchCliente = norm(siloData.cliente) === norm(loteCliente);
  const matchEspecie = norm(siloData.especie) === norm(loteEspecie);
  const matchVariedad = norm(siloData.variedad) === norm(loteVariedad);

  if (!matchCliente || !matchEspecie || !matchVariedad) {
    const diferencias: string[] = [];
    if (!matchCliente) diferencias.push(`Cliente: Silo "${siloData.cliente}" ≠ Lote "${loteCliente || 'Sin asignar'}"`);
    if (!matchEspecie) diferencias.push(`Especie: Silo "${siloData.especie}" ≠ Lote "${loteEspecie || 'Sin asignar'}"`);
    if (!matchVariedad) diferencias.push(`Variedad: Silo "${siloData.variedad}" ≠ Lote "${loteVariedad || 'Sin asignar'}"`);

    return {
      valid: false,
      errorMessage: `No se puede vincular el ${siloId} por diferencia en los orígenes vinculantes (Cliente / Especie / Variedad).\n${diferencias.join(' | ')}`,
      siloData
    };
  }

  return { valid: true, siloData };
}
