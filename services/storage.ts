
import { GeneratedImageBatch, FitCheckHistoryItem, Project } from '../types';

const DB_NAME = 'FlowstateDB';
const HISTORY_STORE = 'history';
const FITCHECK_STORE = 'fitcheck_history';
const PROJECTS_STORE = 'projects';
const DB_VERSION = 3; // Incremented version for new projects store

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
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        projectStore.createIndex('userId', 'userId', { unique: false });
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

// --- FLOWSTATE ENGINE PROJECTS ---

export const saveProject = async (project: Project): Promise<Project> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readwrite');
    const store = tx.objectStore(PROJECTS_STORE);
    const req = store.put(project);
    req.onsuccess = () => resolve(project);
    req.onerror = () => reject(req.error);
  });
};

export const getProjectsByUserId = async (userId: string): Promise<Project[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readonly');
    const store = tx.objectStore(PROJECTS_STORE);
    const index = store.index('userId');
    const req = index.getAll(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readwrite');
    const store = tx.objectStore(PROJECTS_STORE);
    const req = store.delete(projectId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};
