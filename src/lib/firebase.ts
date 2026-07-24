/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, doc, writeBatch, getDocs, runTransaction, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Lote, MovimientoStock, SalidaRegistrada, OrdenCarga, MovimientoSilo } from '../types';
import { getCampaniaIdFromDate } from '../utils/campanias';

// Configuración de Firebase obtenida de firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCt2aP7SXqvGvbJLGHwwlRxp8iHasDnEuc",
  authDomain: "gen-lang-client-0252455967.firebaseapp.com",
  projectId: "gen-lang-client-0252455967",
  storageBucket: "gen-lang-client-0252455967.firebasestorage.app",
  messagingSenderId: "1015042311245",
  appId: "1:1015042311245:web:414772be8eb99f1eff8804"
};

// Inicialización de la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore con la base de datos específica configurada y forzar long polling
const databaseId = "ai-studio-plantaclasificad-095097e1-a258-405e-860b-e197efbcd6bc";
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
} as any, databaseId);

// Inicializar Firebase Storage
export const storage = getStorage(app);

/**
 * Normaliza el ID de un lote a la combinación de cliente + "_" + numeroLote.
 * Se eliminan tildes, espacios y caracteres especiales, convirtiendo a minúsculas
 * (ej: "San Diego", "58FIN" -> "san-diego_58FIN")
 */
export function getLoteDocId(cliente: string, numeroLote: string): string {
  const cleanCliente = cliente
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-z0-9]+/g, "-") // reemplazar espacios y caracteres especiales por guiones
    .replace(/^-+|-+$/g, ""); // recortar guiones al inicio/fin
  
  const cleanLote = numeroLote.trim();
  return `${cleanCliente}_${cleanLote}`;
}

/**
 * Sube una cadena en formato Base64 (Data URL) a Firebase Storage.
 * Retorna la URL de descarga del archivo subido.
 */
export async function uploadBase64ToStorage(path: string, dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl; // Si no es base64, retornar como está
  }
  try {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, dataUrl, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error(`Error al subir archivo a Firebase Storage (${path}):`, error);
    throw error;
  }
}

/**
 * Seed inicial: Carga los lotes de stock informados si la colección 'lotes' en Firestore está vacía.
 */
export async function seedLotesIfEmpty(initialLotes: Lote[]): Promise<void> {
  try {
    const lotesRef = collection(db, 'lotes');
    const snapshot = await getDocs(lotesRef);
    
    if (snapshot.empty) {
      console.log('Seeding inicial de 112 lotes en Firestore...');
      
      // Firestore writeBatch soporta hasta 500 operaciones. Tenemos 112, por lo que una tanda es suficiente.
      const batch = writeBatch(db);
      const todayStr = new Date().toISOString().split('T')[0];
      
      for (const lote of initialLotes) {
        // Generar ID del documento
        const docId = getLoteDocId(lote.cliente, lote.loteNro);
        const docRef = doc(db, 'lotes', docId);
        
        // Recalcular campos requeridos por el usuario en base de datos real
        const stockKgTotal = lote.stockBolsas * lote.kgPorBolsa;
        const estado = (lote.stockBolsas > 0 ? "Disponible" : "Agotado");
        
        const fechaIng = lote.fechaIngreso || todayStr;
        const campaniaId = lote.campaniaId || getCampaniaIdFromDate(fechaIng);

        // Estructurar el documento para la colección 'lotes'
        const firestoreLote = {
          id: docId,
          especie: lote.especie,
          variedad: lote.variedad,
          numeroLote: lote.loteNro, // Campo requerido por el usuario como numeroLote
          cliente: lote.cliente,
          tipoLote: lote.tipo, // Campo requerido por el usuario como tipoLote
          categoria: lote.categoria,
          tratamiento: lote.tratamiento[0] || 'Sin Tratar', // Como string, ej: 'Tratado' o 'Sin Tratar'
          stockBolsas: lote.stockBolsas,
          kgPorBolsa: lote.kgPorBolsa,
          stockKgTotal: stockKgTotal,
          estado: estado,
          fechaIngreso: fechaIng,
          campaniaId: campaniaId,
          producto: lote.producto || 'Ninguno',
          ala: lote.ala || '',
          sector: lote.sector || ''
        };
        
        batch.set(docRef, firestoreLote);
        
        // Guardar su historial inicial en la subcolección 'movimientos'
        if (lote.historial && lote.historial.length > 0) {
          for (const mov of lote.historial) {
            const movRef = doc(collection(db, 'lotes', docId, 'movimientos'), mov.id);
            batch.set(movRef, {
              id: mov.id,
              fecha: mov.fecha || todayStr,
              tipo: mov.tipo,
              cantidadBolsas: mov.cantidadBolsas,
              kgPorBolsa: mov.kgPorBolsa,
              cantidadKg: mov.cantidadKg,
              detalle: mov.detalle || 'Stock inicial precargado'
            });
          }
        }
      }
      
      await batch.commit();
      console.log('Seeding completado con éxito!');
    } else {
      console.log('Colección "lotes" ya contiene datos, omitiendo seeding.');
    }
  } catch (error) {
    console.error('Error al realizar el seeding inicial en Firestore:', error);
  }
}

/**
 * Registra un movimiento y actualiza el stock del lote padre usando una transacción atómica.
 */
export async function registrarMovimientoTransaccion(
  loteId: string,
  movimiento: MovimientoStock
): Promise<void> {
  const loteRef = doc(db, 'lotes', loteId);
  const movRef = doc(collection(db, 'lotes', loteId, 'movimientos'), movimiento.id);
  
  await runTransaction(db, async (transaction) => {
    const loteDoc = await transaction.get(loteRef);
    if (!loteDoc.exists()) {
      throw new Error(`El lote ${loteId} no existe.`);
    }
    
    const data = loteDoc.data();
    const currentBolsas = data.stockBolsas || 0;
    const kgPorBolsa = data.kgPorBolsa || 800;
    
    // Determinar dirección del stock
    const isAddition = !movimiento.tipo.toLowerCase().includes('salida');
    const bolsasChange = isAddition ? movimiento.cantidadBolsas : -movimiento.cantidadBolsas;
    
    const nuevoStockBolsas = Math.max(0, currentBolsas + bolsasChange);
    const nuevoStockKgTotal = nuevoStockBolsas * kgPorBolsa;
    
    // Si se agotó, el estado pasa a "Agotado" automáticamente, de lo contrario si tiene stock y estaba Agotado, pasa a Disponible
    let nuevoEstado = data.estado;
    if (nuevoStockBolsas === 0) {
      nuevoEstado = 'Agotado';
    } else if (data.estado === 'Agotado') {
      nuevoEstado = 'Disponible';
    }
    
    // 1. Escribir el nuevo movimiento
    transaction.set(movRef, movimiento);
    
    // 2. Actualizar el lote padre
    transaction.update(loteRef, {
      stockBolsas: nuevoStockBolsas,
      stockKgTotal: nuevoStockKgTotal,
      estado: nuevoEstado
    });
  });
}

/**
 * Convierte un documento de Firestore a un objeto Lote de la aplicación.
 */
export function mapFirestoreToLote(id: string, data: any): Lote {
  const fechaIngreso = data.fechaIngreso || new Date().toISOString().split('T')[0];
  const campaniaId = data.campaniaId || getCampaniaIdFromDate(fechaIngreso);

  return {
    id: id,
    loteNro: data.numeroLote || '',
    cliente: data.cliente || '',
    especie: data.especie || 'Sin especificar',
    variedad: data.variedad || '',
    tipo: data.tipoLote || 'Final',
    categoria: data.categoria || 'Primu',
    tratamiento: Array.isArray(data.tratamiento) ? data.tratamiento : [data.tratamiento || 'Sin Tratar'],
    producto: data.producto || 'Ninguno',
    stockBolsas: data.stockBolsas || 0,
    kgPorBolsa: data.kgPorBolsa || 800,
    stockKg: data.stockKgTotal !== undefined ? data.stockKgTotal : (data.stockBolsas || 0) * (data.kgPorBolsa || 800),
    fechaIngreso: fechaIngreso,
    campaniaId: campaniaId,
    estado: data.estado || 'Disponible',
    historial: [], // Carga diferida
    auditoria: data.auditoria || [],
    observaciones: data.observaciones || '',
    ala: data.ala || '',
    sector: data.sector || '',
    ordenProcesoId: data.ordenProcesoId || '',
    numeroOrdenMovimiento: data.numeroOrdenMovimiento || ''
  };
}

/**
 * Convierte un objeto Lote de la aplicación a un documento para Firestore.
 */
export function mapLoteToFirestore(lote: Lote): any {
  const fechaIngreso = lote.fechaIngreso || new Date().toISOString().split('T')[0];
  const campaniaId = lote.campaniaId || getCampaniaIdFromDate(fechaIngreso);

  return {
    id: lote.id,
    especie: lote.especie,
    variedad: lote.variedad,
    numeroLote: lote.loteNro,
    cliente: lote.cliente,
    tipoLote: lote.tipo,
    categoria: lote.categoria,
    tratamiento: lote.tratamiento[0] || 'Sin Tratar',
    stockBolsas: lote.stockBolsas,
    kgPorBolsa: lote.kgPorBolsa,
    stockKgTotal: lote.stockBolsas * lote.kgPorBolsa,
    estado: lote.stockBolsas === 0 ? 'Agotado' : lote.estado,
    fechaIngreso: fechaIngreso,
    campaniaId: campaniaId,
    producto: lote.producto,
    auditoria: lote.auditoria || [],
    observaciones: lote.observaciones || '',
    ala: lote.ala || '',
    sector: lote.sector || '',
    ordenProcesoId: lote.ordenProcesoId || '',
    numeroOrdenMovimiento: lote.numeroOrdenMovimiento || ''
  };
}

/**
 * Seed de Órdenes de Proceso en Firestore si está vacía.
 */
export async function seedOrdenesProcesoIfEmpty(initialOrdenes: any[]): Promise<void> {
  try {
    const ordenesRef = collection(db, 'ordenes_proceso');
    const snapshot = await getDocs(ordenesRef);
    if (snapshot.empty) {
      console.log('Seeding inicial de órdenes de proceso en Firestore...');
      const batch = writeBatch(db);
      for (const ord of initialOrdenes) {
        const docRef = doc(db, 'ordenes_proceso', ord.id);
        const cleanOrd = JSON.parse(JSON.stringify(ord));
        batch.set(docRef, cleanOrd);
      }
      await batch.commit();
      console.log('Seeding de órdenes de proceso completado con éxito.');
    }
  } catch (error) {
    console.warn('Error en seeding de órdenes de proceso:', error);
  }
}

/**
 * Seed de Movimientos de Silos en Firestore si está vacía.
 */
export async function seedMovimientosSiloIfEmpty(initialMovs: MovimientoSilo[]): Promise<void> {
  try {
    const movsRef = collection(db, 'movimientos_silo');
    const snapshot = await getDocs(movsRef);
    if (snapshot.empty) {
      console.log('Seeding inicial de movimientos de silos en Firestore...');
      const batch = writeBatch(db);
      for (const mov of initialMovs) {
        const docRef = doc(db, 'movimientos_silo', mov.id);
        const cleanMov = JSON.parse(JSON.stringify(mov));
        batch.set(docRef, cleanMov);
      }
      await batch.commit();
      console.log('Seeding de movimientos de silos completado con éxito.');
    }
  } catch (error) {
    console.warn('Error en seeding de movimientos de silos:', error);
  }
}


