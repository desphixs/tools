import type { CollageAsset, CollageComposition } from "./model";

const DB_NAME = "collage-maker-local";
const DB_VERSION = 1;
const ASSETS = "assets";
const DRAFTS = "drafts";

export interface CollageStorage {
  saveAsset(asset: CollageAsset): Promise<void>;
  getAsset(id: string): Promise<CollageAsset | undefined>;
  saveDraft(composition: CollageComposition): Promise<void>;
  getDraft(): Promise<{ composition: CollageComposition; updatedAt: number } | undefined>;
  clearDraft(): Promise<void>;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS, { keyPath: "key" });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
  });
}

async function request<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = operation(tx.objectStore(storeName));
    let result: T;
    req.onsuccess = () => { result = req.result; };
    req.onerror = () => reject(req.error ?? new Error("Local storage operation failed."));
    tx.oncomplete = () => { db.close(); resolve(result!); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Local storage transaction was interrupted.")); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Local storage transaction failed.")); };
  });
}

export const collageStorage: CollageStorage = {
  async saveAsset(asset) { await request(ASSETS, "readwrite", (store) => store.put(asset)); },
  getAsset(id) { return request(ASSETS, "readonly", (store) => store.get(id)); },
  async saveDraft(composition) { await request(DRAFTS, "readwrite", (store) => store.put({ key: "active", composition, updatedAt: Date.now() })); },
  getDraft() { return request(DRAFTS, "readonly", (store) => store.get("active")); },
  async clearDraft() { await request(DRAFTS, "readwrite", (store) => store.delete("active")); },
};

export function createAssetId() { return crypto.randomUUID(); }

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image data."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image data."));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string) {
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) throw new Error("Project images must be PNG, JPEG, or WebP data.");
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Project image could not be restored.");
  return response.blob();
}
