
import { GeneratedImageBatch, FitCheckHistoryItem } from '../types';

const DB_NAME = 'FlowstateDB';
const HISTORY_STORE = 'history';
const FITCHECK_STORE = 'fitcheck_history';
const DB_VERSION = 2; // Incremented version for new store

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FITCHECK_STORE)) {
        db.createObjectStore(FITCHECK_STORE, { keyPath: 'id' });
      }
    };
  });
};

// --- MOCKUP GENERATOR HISTORY ---

export const saveBatch = async (batch: GeneratedImageBatch): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(HISTORY_STORE, 'readwrite');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.put(batch);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB Save Error:", error);
    return Promise.resolve();
  }
};

export const getHistory = async (): Promise<GeneratedImageBatch[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(HISTORY_STORE, 'readonly');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as GeneratedImageBatch[];
        resolve(results.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB Load Error:", error);
    return [];
  }
};

// --- FIT CHECK HISTORY ---

export const saveFitCheck = async (item: FitCheckHistoryItem): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FITCHECK_STORE, 'readwrite');
      const store = transaction.objectStore(FITCHECK_STORE);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("FitCheck Save Error", error);
    return Promise.resolve();
  }
};

export const getFitCheckHistory = async (): Promise<FitCheckHistoryItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FITCHECK_STORE, 'readonly');
      const store = transaction.objectStore(FITCHECK_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as FitCheckHistoryItem[];
        resolve(results.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("FitCheck Load Error", error);
    return [];
  }
};
