import { Chofer } from '../types';

/**
 * Normaliza una cadena quitando tildes, espacios extra y convirtiendo a minúsculas
 */
export function normalizeStr(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normaliza CUIT o DNI dejando únicamente los dígitos
 */
export function normalizeCuit(cuit?: string): string {
  if (!cuit) return '';
  return cuit.replace(/\D/g, '');
}

/**
 * Busca si un chofer ya existe en la lista por ID, CUIT/DNI o Nombre
 */
export function findExistingChofer(
  candidate: { id?: string; nombre?: string; cuit?: string },
  choferes: Chofer[]
): Chofer | undefined {
  if (!choferes || choferes.length === 0) return undefined;

  // 1. Coincidencia por ID explícito
  if (candidate.id) {
    const byId = choferes.find((c) => c.id === candidate.id);
    if (byId) return byId;
  }

  // 2. Coincidencia por CUIT / DNI si es válido y no '—'
  const normCuitCandidate = normalizeCuit(candidate.cuit);
  if (normCuitCandidate && normCuitCandidate !== '0') {
    const byCuit = choferes.find((c) => {
      const normC = normalizeCuit(c.cuit);
      return normC && normC !== '0' && normC === normCuitCandidate;
    });
    if (byCuit) return byCuit;
  }

  // 3. Coincidencia por Nombre (normalizado)
  const normNombreCandidate = normalizeStr(candidate.nombre);
  if (normNombreCandidate) {
    const byNombre = choferes.find(
      (c) => normalizeStr(c.nombre) === normNombreCandidate
    );
    if (byNombre) return byNombre;
  }

  return undefined;
}

/**
 * Fusiona los datos de un chofer sin sobreescribir campos completos existentes con datos vacíos o por defecto.
 */
export function mergeChoferData(
  existing: Chofer | undefined,
  incoming: Partial<Chofer> & { nombre: string }
): Chofer {
  if (!existing) {
    const id = incoming.id || `CHOFER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const cam = (incoming.patenteCamion || '').trim().toUpperCase();
    const acop = (incoming.patenteAcoplado || '').trim().toUpperCase();
    let patComb = (incoming.patentes || '').trim();
    if (!patComb || patComb === '—') {
      if (cam || acop) {
        patComb = acop ? `${cam} / ${acop}` : cam;
      } else {
        patComb = '—';
      }
    }

    return {
      id,
      nombre: incoming.nombre.trim(),
      cuit: (incoming.cuit && incoming.cuit.trim() !== '') ? incoming.cuit.trim() : '—',
      transporte: (incoming.transporte && incoming.transporte.trim() !== '') ? incoming.transporte.trim() : 'Sin Transporte',
      licencia: incoming.licencia?.trim() || undefined,
      patenteCamion: cam || undefined,
      patenteAcoplado: acop || undefined,
      patentes: patComb,
      telefono: incoming.telefono?.trim() || undefined,
    };
  }

  // Si YA EXISTE: Preservar datos completos del chofer existente y solo rellenar o actualizar con datos válidos no vacíos
  const isValidVal = (val?: string, invalidDefaults: string[] = ['—', 'sin transporte', '']) => {
    if (!val) return false;
    const clean = val.trim().toLowerCase();
    return !invalidDefaults.includes(clean);
  };

  // Patentes
  const incCam = (incoming.patenteCamion || '').trim().toUpperCase();
  const incAcop = (incoming.patenteAcoplado || '').trim().toUpperCase();
  const finalCam = isValidVal(incCam) ? incCam : existing.patenteCamion;
  const finalAcop = isValidVal(incAcop) ? incAcop : existing.patenteAcoplado;

  let finalPatentes = existing.patentes;
  if (isValidVal(incoming.patentes)) {
    finalPatentes = incoming.patentes!.trim();
  } else if (finalCam || finalAcop) {
    finalPatentes = finalAcop ? `${finalCam} / ${finalAcop}` : (finalCam || '—');
  }

  return {
    id: existing.id,
    nombre: existing.nombre.trim() || incoming.nombre.trim(),
    cuit: isValidVal(incoming.cuit) ? incoming.cuit!.trim() : (existing.cuit || '—'),
    transporte: isValidVal(incoming.transporte, ['—', 'sin transporte', ''])
      ? incoming.transporte!.trim()
      : (existing.transporte || 'Sin Transporte'),
    licencia: isValidVal(incoming.licencia) ? incoming.licencia!.trim() : existing.licencia,
    patenteCamion: finalCam,
    patenteAcoplado: finalAcop,
    patentes: finalPatentes,
    telefono: isValidVal(incoming.telefono) ? incoming.telefono!.trim() : existing.telefono,
  };
}
