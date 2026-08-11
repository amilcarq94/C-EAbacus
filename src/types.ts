/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EspecieType = 'Soja' | 'Trigo' | 'Arveja' | 'Sin especificar';

export type TipoLoteType = 'Intermedio' | 'Final' | 'Procesado' | 'Semilla' | 'Descarte' | 'Bajo Consumo' | 'Mezcla' | 'Rechazo' | string;

export type TratamientoType = 'Tratado' | 'Sin Tratar' | 'Curado Completo' | 'Fungicida' | 'Insecticida' | 'Inoculado' | 'Polímero' | string;

export type CategoriaType = 'FUNDADORA' | 'PREBA' | 'ORIGINAL' | 'PRIMU' | 'Fundadora' | 'Preba' | 'Original' | 'Primera' | string;

export const CAPACIDAD_MAX_SILO = 180000; // 180.000 kg por silo
export const UMBRAL_ALERTA_SILO = 150000; // Alerta desde 150.000 kg (83.3%)

export type EstadoLoteType = 'Disponible' | 'Reservado' | 'Agotado' | 'A Consumo';

export type EstadoRegistroLote = 'PRE-CARGA' | 'REALIZADO' | 'EN_CURSO';

export interface AuditLogEntry {
  id: string;
  fechaHora: string; // Formato ISO 8601
  tipo: 'Stock' | 'Edición' | 'Creación';
  usuario: string; // ej: "Operario de Planta"
  descripcion: string;
  detalles?: string; // detalla los cambios o justificación
}

export interface MovimientoStock {
  id: string;
  fecha: string; // Formato YYYY-MM-DD
  tipo: 'Entrada' | 'Salida' | 'Entrada por Excel' | 'Entrada manual' | 'Ajuste';
  cantidadBolsas: number;
  kgPorBolsa: number;
  cantidadKg: number;
  detalle: string;
}

export interface OrigenBolsonItem {
  bolsonId?: string;
  bolsonNro?: string;
  sector?: string;
}

export interface Lote {
  id: string; // ID único interno, ej: `${cliente}_${loteNro}`
  loteNro: string; // N° de Lote real editado por el usuario (ej: 58FIN, 32INT)
  cliente: 'San Diego Semilla' | 'Eco Rural' | 'Pampa' | 'Stine' | 'Elementa Foods' | string;
  especie: EspecieType;
  variedad: string;
  tipo: TipoLoteType;
  categoria: CategoriaType;
  tratamiento: TratamientoType[]; // Múltiple o unitario de ['Tratado', 'Sin Tratar']
  producto: string;
  stockBolsas: number;
  kgPorBolsa: number; // Por defecto suele ser 40 o 50 kg
  stockKg: number;
  fechaIngreso: string; // YYYY-MM-DD
  campaniaId?: string; // ID de campaña ej: '2026-2027'
  estado: EstadoLoteType;
  estadoRegistro?: EstadoRegistroLote; // 'PRE-CARGA' | 'REALIZADO'
  fechaHoraProduccion?: string; // Formato YYYY-MM-DDTHH:mm o similar
  observaciones?: string; // Cuadro de observaciones opcional
  historial: MovimientoStock[];
  auditoria?: AuditLogEntry[];
  ala?: string; // ej: 'A' | 'B' | 'C' | 'D'
  sector?: string; // ej: '1' | '2' | '3'
  ordenProcesoId?: string; // ID de la Orden de Proceso vinculada
  numeroOrdenMovimiento?: string; // N° de Orden de Movimiento vinculada si aplica
  fechaTratamiento?: string; // YYYY-MM-DD
  fechaVencimientoTratamiento?: string; // YYYY-MM-DD
  silosOrigen?: SiloExtraccion[]; // Silos de origen y kg extraídos de cada uno
  siloOrigen?: SiloId | string; // Silo de origen principal
  bolsonOrigenId?: string; // ID único del bolsón de origen
  numeroBolsonOrigen?: string; // N° de Bolsón de origen
  bolsonOrigenNro?: string; // Aliased for consistency
  sectorBolsonOrigen?: string; // Sector de bolsón de origen ('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'Todos')
  origenesBolson?: OrigenBolsonItem[]; // Detalle dinámico de orígenes de bolsón con su sector
  ubicacionAcopio?: string; // Ubicación acopio (e.g., 'Ala A - Sector 1' o texto personalizado)
}

export interface LoteLimitsConfig {
  maxKgPorLote: number; // Por defecto: 28000 kg
  maxBolsasPorLote: number; // Por defecto: 35 bolsas
  kgPorBolsaDefault: number; // Por defecto: 800 kg
}

export const DEFAULT_LOTE_LIMITS: LoteLimitsConfig = {
  maxKgPorLote: 28000,
  maxBolsasPorLote: 35,
  kgPorBolsaDefault: 800,
};

export interface BolsonCampo {
  id: string; // ID único del bolsón
  campania: string; // ej: "2024/2025", "2025/2026"
  cliente: string; // ej: "San Diego Semilla"
  numeroBolson: string; // N° de Bolsón (ej: "Bolsón 01", "B-101")
  zona?: string; // Zona
  campo?: string; // Campo
  cultivo: string; // Cultivo / Especie (ej: "Soja", "Trigo", "Arveja")
  variedad: string; // Variedad (ej: "DM 46i20")
  categoria: CategoriaType | string; // Categoría ("Fundadora", "Preba", "Original", "Prima", "Primu", etc.)
  deposito?: string; // Depósito
  entradasKg: number; // Entradas (kg)
  salidasKg: number; // Salida (kg)
  stockKg: number; // Stock (kg) -> entradasKg - salidasKg
}

export interface Chofer {
  id: string;
  nombre: string;
  cuit: string;
  transporte: string;
  patenteChasis?: string;
  patenteAcoplado?: string;
  patenteCamion?: string;
  patentes?: string;
}

export type SiloId = 'Silo 1' | 'Silo 2' | 'Silo 3' | 'Silo 4' | 'Silo 5' | 'Silo 6';

export interface SiloExtraccion {
  siloId: SiloId;
  kgExtraidos: number;
  kg?: number;
}

export type MotivoSalidaManual = 'Consumo a granel' | 'Manipulación' | 'Traslado a silo' | 'Descontaminación varietal';

export type TipoMovimientoSilo = 'INGRESO' | 'EGRESO_OP' | 'EGRESO_MANUAL' | 'EGRESO_LOTE' | 'EGRESO' | 'AJUSTE_ZERO';

export interface MovimientoSilo {
  id: string;
  siloId: SiloId;
  fecha: string; // Formato YYYY-MM-DD
  tipo: TipoMovimientoSilo;
  kg: number; // Positivo para INGRESO, o cantidad descontada para EGRESO / AJUSTE

  // Campos para INGRESO:
  cliente?: string;
  especie?: string;
  variedad?: string;
  categoria?: string;
  campoOrigen?: string;
  bolsonOrigenId?: string;
  bolsonOrigenNro?: string;
  bolsonOrigenSector?: string;
  depositoOrigen?: string;
  humedad?: number; // Porcentaje de humedad manual (% ej: 13.5)

  // Campos de movimiento y transporte (Chofer, Patente, CUIT, Transporte):
  tipoTransporte?: 'CHOFER' | 'FLETE';
  chofer?: string;
  cuit?: string;
  patentes?: string;
  transporte?: string;

  // Campos para EGRESO_MANUAL:
  motivoManual?: MotivoSalidaManual | string;
  descontaminacionVarietal?: boolean;
  observaciones?: string;

  // Campos para EGRESO_OP / EGRESO_LOTE:
  ordenProcesoId?: string;
  numeroOrdenProceso?: string;
  loteId?: string;
  loteResultanteId?: string;
  loteNro?: string;

  // Campos para AJUSTE_ZERO (legacy / compatibilidad):
  usuario?: string;
  usuarioZero?: string;
  motivoAjuste?: string;
  motivoZero?: string;
  kgAntesAjuste?: number;
  timestamp?: string;
}

export type EnvaseType = 'Bolsa 25 kg' | 'Bolsa 30 kg' | 'Big Bag' | 'A granel' | string;

export interface SalidaRegistrada {
  id: string; // Autogenerado REM-XXXX
  fecha: string; // YYYY-MM-DD
  campaniaId?: string; // ID de campaña ej: '2026-2027'
  choferNombre: string;
  choferDni: string;
  patenteCamion?: string; // Campo opcional detallado en sugerencias
  cliente: string;
  loteId: string;
  tipoLote: TipoLoteType; // Heredado, solo lectura
  producto: string; // Heredado, solo lectura
  categoria: CategoriaType; // Heredado, solo lectura
  cantidadBolsas: number;
  envase: EnvaseType;
  kgPorBolsa: number; // Calculado de acuerdo al envase/lote
  totalKg: number;
  choferFirma?: string; // Firma digital en formato base64 png
  remitoClienteAdjunto?: { nombre: string; data: string; type: string }; // Remito adjunto por el cliente
}

export interface LoteOrigenItem {
  loteId: string;
  loteNro: string;
  variedad?: string;
  cantidadBolsas: number;
  kgTotales: number;
  kgExtraidos?: number;
  stockOriginalKg?: number;
}

export interface OrdenCarga {
  id: string; // OC-2026-XXXX
  fecha: string; // YYYY-MM-DD
  campaniaId?: string; // ID de campaña ej: '2026-2027'
  cliente: 'San Diego Semilla' | 'Eco Rural' | 'Pampa' | 'Stine' | 'Elementa Foods' | string;
  loteId: string;
  cantidadBolsas: number;
  kgTotales: number;
  tipo: TipoLoteType; // Heredado del lote
  categoria: CategoriaType; // Heredado del lote
  tratamiento: TratamientoType; // Heredado del lote
  despachante: string;
  autor: 'Malcon Baez' | 'Amilcar Quiroz'; // Autor de la orden
  estado: 'Disponible' | 'Aceptada' | 'Despachada';
  fotoRemito?: string; // Data URL de la imagen cargada
  firmaChofer?: string; // Data URL de la firma del chofer
  lotesOrigen?: LoteOrigenItem[];
}

export type TipoOrdenProceso = 'PRODUCCION' | 'MOVIMIENTO';
export type EstadoOrdenProceso = 'SIN INICIAR' | 'EN CURSO' | 'TERMINADO';

export interface ProductoTratamiento {
  id?: string;
  principioActivo: string;
  tipos: string[]; // e.g. ['Fungicida', 'Inoculante', 'Insecticidas', 'Polvo Terminación', 'Polímero Líquido', 'Otro']
  tipoOtro?: string;
}

export interface OrdenProceso {
  id: string; // ej: "OP-2026-001"
  numeroOrden: string; // N° de Orden de Proceso (numérico/texto único, ej: "1001")
  tipoOrden: TipoOrdenProceso; // 'PRODUCCION' | 'MOVIMIENTO'
  cliente?: string; // ej: 'San Diego Semilla'
  especie?: EspecieType | string; // ej: 'Soja' | 'Trigo' | 'Arveja'
  tipoMovimiento?: string; // "Intermedio a Final" | "Final a Final Tratado" (solo si MOVIMIENTO)
  numeroOrdenMovimiento?: string; // N° de Orden de Movimiento (solo si MOVIMIENTO)
  envaseDestino?: string; // "Bolsa x 25 Kg" | "Bolsa x 40 Kg" | "Big Bag x 800 Kg"
  tratamiento: string; // ej. "Acelerador / Fungicida" o "Sin tratamiento"
  variedad: string; // ej. "P46A03"
  producto: string; // "INTERMEDIO" | "FINAL" (Etiquetado como "Tipo de Lote")
  productos?: ProductoTratamiento[]; // Lista de hasta 4 productos agregados
  categoria: CategoriaType | string; // ej. "PRIMU"
  bbPedidos: number; // BB / bultos / bins pedidos (objetivo)
  hechos: number; // BB / bultos cumplidos hasta el momento
  estado: EstadoOrdenProceso; // 'SIN INICIAR' | 'EN CURSO' | 'TERMINADO'
  observaciones?: string;
  fechaCreacion: string; // YYYY-MM-DD
  campaniaId?: string; // ej: '2026-2027'
  silosOrigen?: SiloExtraccion[]; // Silos de origen y kg extraídos de cada uno
  lotesOrigen?: LoteOrigenItem[]; // Lotes de origen seleccionados para Orden de Movimiento (hasta 5)
  operarios?: number; // Personal asignado al proceso (ej. 2 o 3 operarios)
  horasTrabajadas?: number; // Horas efectivas de operación en planta (ej. 6.5 hs)
  horasHombre?: number; // Total Horas-Hombre calculadas (operarios * horasTrabajadas)
}


