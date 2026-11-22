import { validateCompositionTemplate, type Composition, type CompositionTemplate, type FramecraftAsset, type StoredDraft } from "./model";

const DATABASE_NAME = "framecraft-local";
const DATABASE_VERSION = 1;
const STORE_ASSETS = "assets";
const STORE_TEMPLATES = "templates";
const STORE_DRAFTS = "drafts";

export interface FramecraftStorage {
  saveAsset(asset: FramecraftAsset): Promise<void>;
  getAsset(id: string): Promise<FramecraftAsset | undefined>;
  deleteAsset(id: string): Promise<void>;
  saveDraft(composition: Composition): Promise<void>;
  getDraft(): Promise<StoredDraft | undefined>;
  clearDraft(): Promise<void>;
  saveTemplate(template: CompositionTemplate): Promise<void>;
  listTemplates(): Promise<CompositionTemplate[]>;
  deleteTemplate(id: string): Promise<void>;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) db.createObjectStore(STORE_ASSETS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) db.createObjectStore(STORE_TEMPLATES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) db.createObjectStore(STORE_DRAFTS, { keyPath: "key" });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage."));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = operation(tx.objectStore(storeName));
    let result: T | undefined;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error ?? new Error("Local storage operation failed."));
    tx.oncomplete = () => {
      db.close();
      resolve(result as T);
    };
    tx.onerror = () => reject(tx.error ?? new Error("Browser storage transaction failed."));
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? request.error ?? new Error("Browser storage transaction was interrupted."));
    };
  });
}

export const framecraftStorage: FramecraftStorage = {
  async saveAsset(asset) { await withStore(STORE_ASSETS, "readwrite", (store) => store.put(asset)); },
  getAsset(id) { return withStore(STORE_ASSETS, "readonly", (store) => store.get(id)); },
  async deleteAsset(id) { await withStore(STORE_ASSETS, "readwrite", (store) => store.delete(id)); },
  async saveDraft(composition) {
    await withStore(STORE_DRAFTS, "readwrite", (store) => store.put({ key: "active", composition, updatedAt: Date.now() } satisfies StoredDraft));
  },
  getDraft() { return withStore(STORE_DRAFTS, "readonly", (store) => store.get("active")); },
  async clearDraft() { await withStore(STORE_DRAFTS, "readwrite", (store) => store.delete("active")); },
  async saveTemplate(template) { await withStore(STORE_TEMPLATES, "readwrite", (store) => store.put(template)); },
  async listTemplates() {
    const templates = await withStore<CompositionTemplate[]>(STORE_TEMPLATES, "readonly", (store) => store.getAll());
    return templates
      .filter(validateCompositionTemplate)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteTemplate(id) { await withStore(STORE_TEMPLATES, "readwrite", (store) => store.delete(id)); },
};

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image data."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image data."));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) {
    throw new Error("Project images must be embedded PNG, JPEG, or WebP data.");
  }
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Project image could not be restored.");
  return response.blob();
}

export function createAssetId(): string {
  return crypto.randomUUID();
}
