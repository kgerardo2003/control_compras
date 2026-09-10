import { AttachedDocument } from '../types';
import { fetchPurchaseAttachmentFromFirestore } from '../lib/firebase';

const DB_NAME = 'OJ_Purchases_Attachments_DB';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

/**
 * Abre o inicializa la base de datos local IndexedDB para almacenamiento
 * ilimitado de archivos adjuntos (evita el límite de 5MB de localStorage y 1MB de Firestore).
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Error al abrir IndexedDB'));
    };
  });
}

/**
 * Guarda un documento adjunto en IndexedDB local vinculado al ID de la adquisición.
 */
export async function saveAttachmentToIndexedDB(
  purchaseId: string,
  document: AttachedDocument
): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: purchaseId,
        document,
        actualizadoEn: new Date().toISOString()
      };
      store.put(record);

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };

      tx.onerror = () => {
        console.warn('Error al guardar archivo en IndexedDB:', tx.error);
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Fallo en IndexedDB saveAttachment:', err);
    return false;
  }
}

/**
 * Recupera un documento adjunto desde IndexedDB local por ID de adquisición.
 */
export async function getAttachmentFromIndexedDB(
  purchaseId: string
): Promise<AttachedDocument | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(purchaseId);

      request.onsuccess = () => {
        db.close();
        if (request.result && request.result.document) {
          resolve(request.result.document);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Fallo en IndexedDB getAttachment:', err);
    return null;
  }
}

/**
 * Elimina un documento de IndexedDB local.
 */
export async function deleteAttachmentFromIndexedDB(purchaseId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(purchaseId);

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };

      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    return false;
  }
}

/**
 * Recupera un documento adjunto garantizando su dataUrl completo.
 * Busca secuencialmente en:
 * 1. El objeto recibido (si ya contiene dataUrl completo)
 * 2. Almacenamiento local IndexedDB
 * 3. Subcolección remota en Firestore
 */
export async function getAttachmentWithDataUrl(
  purchaseId: string,
  docMetadata?: AttachedDocument | null
): Promise<AttachedDocument | null> {
  if (!purchaseId && !docMetadata) return null;

  // 1. Si ya tiene dataUrl cargado no sintético y con datos sustanciales, conservarlo
  if (docMetadata?.dataUrl && docMetadata.dataUrl.length > 200) {
    return docMetadata;
  }

  // 2. Buscar en IndexedDB local
  if (purchaseId) {
    try {
      const fromIdb = await getAttachmentFromIndexedDB(purchaseId);
      if (fromIdb?.dataUrl && fromIdb.dataUrl.length > 50) {
        return {
          ...docMetadata,
          ...fromIdb,
          dataUrl: fromIdb.dataUrl
        };
      }
    } catch (err) {
      console.warn("IndexedDB getAttachment falló:", err);
    }

    // 3. Buscar en Firestore subcolección
    try {
      const fromCloud = await fetchPurchaseAttachmentFromFirestore(purchaseId);
      if (fromCloud?.dataUrl && fromCloud.dataUrl.length > 50) {
        // Respaldar inmediatamente en IndexedDB para disponibilidad offline y caché
        saveAttachmentToIndexedDB(purchaseId, fromCloud).catch(() => {});
        return {
          ...docMetadata,
          ...fromCloud,
          dataUrl: fromCloud.dataUrl
        };
      }
    } catch (err) {
      console.warn("Firestore fetchPurchaseAttachment falló:", err);
    }
  }

  return docMetadata || null;
}

/**
 * Comprime imágenes automáticamente en el navegador usando HTML5 Canvas
 * Convierte fotos de celulares o escaneos pesados (3MB+) a JPEG ligero (~150-250KB)
 * manteniendo total legibilidad de textos y sellos.
 */
export function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<{ dataUrl: string; size: number; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve({
              dataUrl: rawDataUrl,
              size: file.size,
              mimeType: file.type || 'image/jpeg'
            });
            return;
          }

          // Fondo blanco para evitar transparencias oscuras
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
          const approxBytes = Math.round((base64Length * 3) / 4);

          resolve({
            dataUrl,
            size: approxBytes,
            mimeType: 'image/jpeg'
          });
        } catch {
          // Fallback a original ante cualquier error de canvas
          resolve({
            dataUrl: rawDataUrl,
            size: file.size,
            mimeType: file.type || 'image/jpeg'
          });
        }
      };

      img.onerror = () => {
        // Fallback a original
        resolve({
          dataUrl: rawDataUrl,
          size: file.size,
          mimeType: file.type || 'image/jpeg'
        });
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      // Si falla FileReader como DataURL, leer arrayBuffer como fallback
      resolve({
        dataUrl: '',
        size: file.size,
        mimeType: file.type || 'image/jpeg'
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Lee cualquier archivo (PDF, Word, Excel, Imagen) y retorna un dataUrl con metadatos.
 * Optimiza automáticamente si es una imagen pesada.
 */
export async function processAttachedFile(file: File): Promise<AttachedDocument> {
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

  if (isImage && file.size > 250 * 1024) {
    try {
      const compressed = await compressImageFile(file);
      if (compressed.dataUrl && compressed.dataUrl.length > 50) {
        return {
          nombre: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          tamano: compressed.size,
          tipo: compressed.mimeType,
          fechaSubida: new Date().toISOString(),
          dataUrl: compressed.dataUrl
        };
      }
    } catch (err) {
      console.warn("Fallo compresión de imagen, usando lectura nativa:", err);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('No se pudo generar los datos digitales del archivo.'));
        return;
      }
      resolve({
        nombre: file.name,
        tamano: file.size,
        tipo: file.type || 'application/pdf',
        fechaSubida: new Date().toISOString(),
        dataUrl
      });
    };
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo en el dispositivo. Intente de nuevo o seleccione otro archivo.'));
    };
    reader.readAsDataURL(file);
  });
}
