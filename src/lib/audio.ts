// Grabaciones de speaking guardadas en IndexedDB (localStorage no admite audio de forma razonable).
// Las grabaciones solo existen en este navegador y no se incluyen en la copia JSON.

const DB_NAME = 'b1b2-english-audio';
const STORE = 'recordings';

export function recordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof indexedDB !== 'undefined'
  );
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB'));
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Error de IndexedDB'));
    t.oncomplete = () => db.close();
  });
}

export const saveRecording = (key: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, key));
export const loadRecording = (key: string) => tx<Blob | undefined>('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>);
export const deleteRecording = (key: string) => tx('readwrite', (s) => s.delete(key));
export const clearRecordings = () => tx('readwrite', (s) => s.clear());
