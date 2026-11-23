import type { GalleryProject, ScreenshotAsset } from "./model";

export type ScreenshotDraft = { key: "active"; project: GalleryProject; updatedAt: number };

export interface ScreenshotStorage {
  saveAsset(asset: ScreenshotAsset): Promise<void>;
  getAsset(id: string): Promise<ScreenshotAsset | undefined>;
  listAssets(): Promise<ScreenshotAsset[]>;
  deleteAsset(id: string): Promise<void>;
  saveDraft(project: GalleryProject): Promise<void>;
  getDraft(): Promise<ScreenshotDraft | undefined>;
  clearDraft(): Promise<void>;
}

const DATABASE = "app-store-screenshots-local";
const VERSION = 1;
const ASSETS = "assets";
const DRAFTS = "drafts";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS, { keyPath: "key" });
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage."));
  });
}

async function request<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = operation(tx.objectStore(storeName));
    let result: T;
    req.onsuccess = () => { result = req.result; };
    req.onerror = () => reject(req.error ?? new Error("Browser storage request failed."));
    tx.oncomplete = () => { db.close(); resolve(result!); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Browser storage transaction failed.")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Browser storage transaction was interrupted.")); };
  });
}

export const screenshotStorage: ScreenshotStorage = {
  async saveAsset(asset) { await request(ASSETS, "readwrite", (store) => store.put(asset)); },
  getAsset(id) { return request(ASSETS, "readonly", (store) => store.get(id)); },
  listAssets() { return request(ASSETS, "readonly", (store) => store.getAll()); },
  async deleteAsset(id) { await request(ASSETS, "readwrite", (store) => store.delete(id)); },
  async saveDraft(project) { await request(DRAFTS, "readwrite", (store) => store.put({ key: "active", project, updatedAt: Date.now() } satisfies ScreenshotDraft)); },
  getDraft() { return request(DRAFTS, "readonly", (store) => store.get("active")); },
  async clearDraft() { await request(DRAFTS, "readwrite", (store) => store.delete("active")); },
};
