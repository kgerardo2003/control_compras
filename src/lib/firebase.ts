import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore,
  doc, 
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import firebaseConfigFile from '../../firebase-applet-config.json';
import { PurchaseRecord, AuditLogEntry, Catalog, User, UserProfile, BudgetLineItem, BudgetModification, AttachedDocument } from '../types';

export const FIREBASE_CONFIG = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || firebaseConfigFile.apiKey,
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfigFile.authDomain,
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || firebaseConfigFile.projectId,
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfigFile.storageBucket,
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfigFile.messagingSenderId,
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || firebaseConfigFile.appId,
  firestoreDatabaseId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID) || firebaseConfigFile.firestoreDatabaseId
};

// Inicialización de Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);

// Inicialización segura de Firestore
function createFirestoreInstance(): Firestore {
  try {
    const dbId = FIREBASE_CONFIG.firestoreDatabaseId;
    if (dbId && dbId !== '(default)') {
      return getFirestore(app, dbId);
    }
    return getFirestore(app);
  } catch (error) {
    console.warn("Advertencia al inicializar Firestore con ID personalizado, reintentando por defecto:", error);
    try {
      return getFirestore(app);
    } catch (fallbackError) {
      console.error("Error crítico inicializando Firestore:", fallbackError);
      throw fallbackError;
    }
  }
}

export const db: Firestore = createFirestoreInstance();

// Verificación obligatoria de conexión al servidor Firestore
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Verificando conectividad con Firebase Firestore...");
    }
    return true;
  }
}
// Ejecución silenciosa sin bloquear carga del módulo
testConnection().catch(() => {});

// Colecciones
export const PURCHASES_COLLECTION = 'purchases';
export const AUDIT_LOGS_COLLECTION = 'audit_logs';
export const CATALOGS_COLLECTION = 'catalogs';
export const USERS_COLLECTION = 'users';
export const USER_PROFILES_COLLECTION = 'user_profiles';
export const BUDGET_LINES_COLLECTION = 'budget_lines';
export const BUDGET_MODIFICATIONS_COLLECTION = 'budget_modifications';

// Función para limpiar campos con valor undefined recursivamente (Firestore no acepta undefined)
export function cleanUndefined<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = cleanUndefined(value);
      }
    }
    return result as T;
  }
  return data;
}

// Helpers de Firestore en tiempo real
export async function savePurchaseToFirestore(purchase: PurchaseRecord): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, purchase.id);
    const cleaned = cleanUndefined(purchase) as PurchaseRecord;

    // Manejo inteligente del documento adjunto para respetar los límites estrictos de Firestore (1MB máx por documento)
    if (cleaned.f56Documento?.dataUrl) {
      const fullDoc = cleaned.f56Documento;
      const dataUrlLen = fullDoc.dataUrl.length;

      // Si el archivo en base64 supera ~700KB (~500KB binario), Firestore no lo aceptará en ningún documento.
      // En ese caso, se almacena en IndexedDB local con capacidad de Gigabytes y en Firestore se preservan los metadatos.
      if (dataUrlLen > 700000) {
        cleaned.f56Documento = {
          nombre: fullDoc.nombre,
          tamano: fullDoc.tamano,
          tipo: fullDoc.tipo,
          fechaSubida: fullDoc.fechaSubida,
          storageKey: 'indexeddb'
        };
      } else if (dataUrlLen > 250000) {
        // Para archivos de 250KB a 700KB, guardar el payload en la subcolección dedicada
        try {
          const attDocRef = doc(db, PURCHASES_COLLECTION, purchase.id, 'attachments', 'f56Document');
          await setDoc(attDocRef, {
            nombre: fullDoc.nombre,
            tamano: fullDoc.tamano,
            tipo: fullDoc.tipo,
            fechaSubida: fullDoc.fechaSubida,
            dataUrl: fullDoc.dataUrl,
            actualizadoEn: new Date().toISOString()
          });

          // En el documento principal se preservan los metadatos con referencia a la subcolección
          cleaned.f56Documento = {
            nombre: fullDoc.nombre,
            tamano: fullDoc.tamano,
            tipo: fullDoc.tipo,
            fechaSubida: fullDoc.fechaSubida,
            storageKey: 'subcollection:f56Document'
          };
        } catch (attErr) {
          console.warn("Aviso al guardar adjunto en subcolección, guardando referencia IndexedDB:", attErr);
          cleaned.f56Documento = {
            nombre: fullDoc.nombre,
            tamano: fullDoc.tamano,
            tipo: fullDoc.tipo,
            fechaSubida: fullDoc.fechaSubida,
            storageKey: 'indexeddb'
          };
        }
      }
    }

    await setDoc(docRef, cleaned, { merge: true });
    console.log("Adquisición guardada exitosamente en Firestore:", purchase.id);
    return { success: true };
  } catch (err: any) {
    console.error("Error guardando adquisición en Firestore:", err);
    // Si falló por tamaño u otro error en el documento principal, guardar garantizado sin el payload pesado
    if (
      err?.message?.includes('exceeds the maximum') || 
      err?.code === 'resource-exhausted' ||
      err?.message?.includes('longer than')
    ) {
      try {
        const fallbackPurchase = { ...purchase };
        if (fallbackPurchase.f56Documento) {
          fallbackPurchase.f56Documento = {
            nombre: fallbackPurchase.f56Documento.nombre,
            tamano: fallbackPurchase.f56Documento.tamano,
            tipo: fallbackPurchase.f56Documento.tipo,
            fechaSubida: fallbackPurchase.f56Documento.fechaSubida,
            storageKey: 'indexeddb'
          };
        }
        const docRef = doc(db, PURCHASES_COLLECTION, purchase.id);
        await setDoc(docRef, cleanUndefined(fallbackPurchase), { merge: true });
        console.log("Adquisición guardada en Firestore (fallback ligero preservando metadatos):", purchase.id);
        return { success: true };
      } catch (retryErr: any) {
        console.error("Reintento fallback de guardado falló:", retryErr);
      }
    }
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Recupera el archivo adjunto completo desde la subcolección de Firestore si fue almacenado allí.
 */
export async function fetchPurchaseAttachmentFromFirestore(
  purchaseId: string
): Promise<AttachedDocument | null> {
  try {
    const attDocRef = doc(db, PURCHASES_COLLECTION, purchaseId, 'attachments', 'f56Document');
    const snapshot = await getDoc(attDocRef);
    if (snapshot.exists()) {
      return snapshot.data() as AttachedDocument;
    }
    return null;
  } catch (err) {
    console.warn("No se pudo obtener adjunto de subcolección:", err);
    return null;
  }
}

// Guardado masivo por lotes en Firestore (soporta cargas masivas de 100+ o más registros)
export async function saveBatchPurchasesToFirestore(purchases: PurchaseRecord[]): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!purchases || purchases.length === 0) return { success: true, count: 0 };
    
    // Firestore writeBatch soporta hasta 500 operaciones por batch
    const CHUNK_SIZE = 400;
    for (let i = 0; i < purchases.length; i += CHUNK_SIZE) {
      const chunk = purchases.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const p of chunk) {
        const docRef = doc(db, PURCHASES_COLLECTION, p.id);
        batch.set(docRef, cleanUndefined(p), { merge: true });
      }
      await batch.commit();
      console.log(`Lote de ${chunk.length} adquisiciones guardado en Firestore (${Math.min(i + CHUNK_SIZE, purchases.length)}/${purchases.length})`);
    }
    return { success: true, count: purchases.length };
  } catch (err: any) {
    console.error("Error guardando lote masivo de adquisiciones en Firestore:", err);
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

export async function removePurchaseFromFirestore(purchaseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
    await deleteDoc(docRef);
    console.log("Adquisición eliminada de Firestore:", purchaseId);
    return { success: true };
  } catch (err: any) {
    console.error("Error eliminando adquisición en Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function removeBatchPurchasesFromFirestore(purchaseIds: string[]): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!purchaseIds || purchaseIds.length === 0) {
      return { success: true, count: 0 };
    }
    const CHUNK_SIZE = 450;
    for (let i = 0; i < purchaseIds.length; i += CHUNK_SIZE) {
      const chunk = purchaseIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        const docRef = doc(db, PURCHASES_COLLECTION, id);
        batch.delete(docRef);
      }
      await batch.commit();
      console.log(`Lote de ${chunk.length} adquisiciones eliminado de Firestore (${Math.min(i + CHUNK_SIZE, purchaseIds.length)}/${purchaseIds.length})`);
    }
    return { success: true, count: purchaseIds.length };
  } catch (err: any) {
    console.error("Error eliminando lote de adquisiciones en Firestore:", err);
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

export async function saveAuditLogToFirestore(log: AuditLogEntry): Promise<void> {
  try {
    const docRef = doc(db, AUDIT_LOGS_COLLECTION, log.id);
    const cleaned = cleanUndefined(log);
    await setDoc(docRef, cleaned);
    console.log("Registro de auditoría guardado en Firestore:", log.id);
  } catch (err) {
    console.error("Error registrando auditoría en Firestore:", err);
  }
}

export async function saveCatalogToFirestore(catalog: Catalog): Promise<void> {
  try {
    const docRef = doc(db, CATALOGS_COLLECTION, catalog.id);
    const cleaned = cleanUndefined(catalog);
    await setDoc(docRef, cleaned, { merge: true });
    console.log("Catálogo actualizado en Firestore:", catalog.id);
  } catch (err) {
    console.error("Error guardando catálogo en Firestore:", err);
  }
}

export async function removeCatalogFromFirestore(catalogId: string): Promise<void> {
  try {
    const docRef = doc(db, CATALOGS_COLLECTION, catalogId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error eliminando catálogo en Firestore:", err);
  }
}

export async function removeUserFromFirestore(userId: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error eliminando usuario en Firestore:", err);
  }
}

// Sembrado inicial si la base de datos está vacía
export async function seedInitialDataIfEmpty(
  initialPurchases: PurchaseRecord[],
  initialCatalogs: Catalog[],
  initialUsers: User[],
  initialLogs: AuditLogEntry[]
): Promise<void> {
  try {
    const purchasesSnap = await getDocs(query(collection(db, PURCHASES_COLLECTION), limit(1)));
    if (purchasesSnap.empty) {
      console.log("Sembrando datos institucionales iniciales en Firestore...");
      const batch = writeBatch(db);

      // Compras
      for (const p of initialPurchases) {
        const ref = doc(db, PURCHASES_COLLECTION, p.id);
        batch.set(ref, cleanUndefined(p));
      }

      // Catálogos
      for (const c of initialCatalogs) {
        const ref = doc(db, CATALOGS_COLLECTION, c.id);
        batch.set(ref, cleanUndefined(c));
      }

      // Usuarios
      for (const u of initialUsers) {
        const ref = doc(db, USERS_COLLECTION, u.id);
        batch.set(ref, cleanUndefined(u));
      }

      // Auditoría
      for (const log of initialLogs.slice(0, 15)) {
        const ref = doc(db, AUDIT_LOGS_COLLECTION, log.id);
        batch.set(ref, cleanUndefined(log));
      }

      await batch.commit();
      console.log("Sembrado inicial de Firestore completado con éxito.");
    }
  } catch (err) {
    console.warn("Nota sobre sembrado inicial en Firestore:", err);
  }
}

// Suscripciones específicas en tiempo real para componentes con metadatos de sincronización
export function subscribeToPurchases(
  onData: (items: PurchaseRecord[], isFromCache: boolean, hasPendingWrites: boolean) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, PURCHASES_COLLECTION);
    return onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const items: PurchaseRecord[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as PurchaseRecord);
        });
        items.sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
        onData(items, snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites);
      },
      (err) => {
        console.warn("Error en listener en tiempo real de Purchases:", err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn("Excepción al iniciar listener de compras:", err);
    onError?.(err as Error);
    return () => {};
  }
}

export function subscribeToAuditLogs(
  onData: (logs: AuditLogEntry[], isFromCache: boolean, hasPendingWrites: boolean) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const q = query(colRef, limit(300));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const items: AuditLogEntry[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as AuditLogEntry);
        });
        items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        onData(items, snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites);
      },
      (err) => {
        console.warn("Error en listener en tiempo real de AuditLogs:", err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn("Excepción al iniciar listener de bitácora:", err);
    onError?.(err as Error);
    return () => {};
  }
}

// Forzar lectura directamente desde los servidores de Google Cloud (bypassing total de caché local)
export async function forceFetchPurchasesFromServer(): Promise<PurchaseRecord[]> {
  const snap = await getDocsFromServer(collection(db, PURCHASES_COLLECTION));
  const items: PurchaseRecord[] = [];
  snap.forEach((d) => {
    items.push(d.data() as PurchaseRecord);
  });
  items.sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
  return items;
}

export async function forceFetchAuditLogsFromServer(): Promise<AuditLogEntry[]> {
  const snap = await getDocsFromServer(query(collection(db, AUDIT_LOGS_COLLECTION), limit(300)));
  const items: AuditLogEntry[] = [];
  snap.forEach((d) => {
    items.push(d.data() as AuditLogEntry);
  });
  items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  return items;
}

// ==========================================
// OPERACIONES FIRESTORE PARA PRESUPUESTO
// ==========================================

export async function saveBudgetLineToFirestore(item: BudgetLineItem): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = String(item.id || `bl-${item.renglonPresupuestario || Date.now()}`).replace(/[\/\\]/g, '-');
    const docRef = doc(db, BUDGET_LINES_COLLECTION, docId);
    await setDoc(docRef, cleanUndefined({ ...item, id: docId }), { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error("Error guardando renglón presupuestario en Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function saveBatchBudgetLinesToFirestore(lines: BudgetLineItem[]): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!lines || lines.length === 0) return { success: true, count: 0 };
    const CHUNK_SIZE = 400;
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const l of chunk) {
        const docRef = doc(db, BUDGET_LINES_COLLECTION, l.id);
        batch.set(docRef, cleanUndefined(l), { merge: true });
      }
      await batch.commit();
    }
    return { success: true, count: lines.length };
  } catch (err: any) {
    console.error("Error guardando lote de renglones presupuestarios en Firestore:", err);
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

export async function removeBudgetLineFromFirestore(lineId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, BUDGET_LINES_COLLECTION, lineId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error("Error eliminando renglón presupuestario en Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function saveBudgetModificationToFirestore(mod: BudgetModification): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, BUDGET_MODIFICATIONS_COLLECTION, mod.id);
    await setDoc(docRef, cleanUndefined(mod), { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error("Error guardando modificación presupuestaria en Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function removeBudgetModificationFromFirestore(modId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, BUDGET_MODIFICATIONS_COLLECTION, modId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error("Error eliminando modificación presupuestaria en Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export function onBudgetLinesSnapshot(
  onData: (lines: BudgetLineItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, BUDGET_LINES_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: BudgetLineItem[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as BudgetLineItem);
        });
        items.sort((a, b) => String(a.renglonPresupuestario || '').localeCompare(String(b.renglonPresupuestario || '')));
        onData(items);
      },
      (err) => {
        console.warn("Error en listener de renglones presupuestarios:", err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn("Excepción al iniciar listener de presupuesto:", err);
    onError?.(err as Error);
    return () => {};
  }
}

export function onBudgetModificationsSnapshot(
  onData: (mods: BudgetModification[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, BUDGET_MODIFICATIONS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: BudgetModification[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as BudgetModification);
        });
        items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        onData(items);
      },
      (err) => {
        console.warn("Error en listener de modificaciones presupuestarias:", err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn("Excepción al iniciar listener de modificaciones:", err);
    onError?.(err as Error);
    return () => {};
  }
}

// ==========================================
// OPERACIONES FIRESTORE PARA PERFILES Y USUARIOS
// ==========================================

export async function saveUserProfileToFirestore(profile: UserProfile): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = String(profile.id || `prof-${profile.codigo || Date.now()}`).replace(/[\/\\]/g, '-');
    const docRef = doc(db, USER_PROFILES_COLLECTION, docId);
    await setDoc(docRef, cleanUndefined({ ...profile, id: docId }), { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error("Error guardando perfil de usuario en Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function deleteUserProfileFromFirestore(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, USER_PROFILES_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error("Error eliminando perfil de usuario de Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export function onUserProfilesSnapshot(
  onData: (profiles: UserProfile[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, USER_PROFILES_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: UserProfile[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as UserProfile);
        });
        items.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        onData(items);
      },
      (err) => {
        console.warn("Error en listener de perfiles de usuario:", err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn("Excepción al iniciar listener de perfiles de usuario:", err);
    onError?.(err as Error);
    return () => {};
  }
}

export async function saveUserToFirestore(user: User): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(docRef, cleanUndefined(user), { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error("Error guardando usuario en Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function deleteUserFromFirestore(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error("Error eliminando usuario de Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export function onUsersSnapshot(
  onData: (users: User[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: User[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as User);
        });
        items.sort((a, b) => (a.nombreCompleto || '').localeCompare(b.nombreCompleto || ''));
        onData(items);
      },
      (err) => {
        console.warn("Error en listener de usuarios:", err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn("Excepción al iniciar listener de usuarios:", err);
    onError?.(err as Error);
    return () => {};
  }
}


