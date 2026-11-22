import type { MockupDraft } from "./model";

const DATABASE_NAME = "device-mockups-local";
const DATABASE_VERSION = 1;
const DRAFT_STORE = "drafts";

export interface DeviceMockupStorage {
  getDraft(): Promise<MockupDraft | undefined>;
  saveDraft(draft: MockupDraft): Promise<void>;
  clearDraft(): Promise<void>;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DRAFT_STORE)) {
        request.result.createObjectStore(DRAFT_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
  });
}

function run<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE, mode);
    const request = operation(transaction.objectStore(DRAFT_STORE));
    let result: T | undefined;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error ?? new Error("Local storage failed."));
    transaction.oncomplete = () => {
      db.close();
      resolve(result as T);
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Local storage transaction failed."));
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? request.error ?? new Error("Local storage transaction was interrupted."));
    };
  }));
}

export const deviceMockupStorage: DeviceMockupStorage = {
  getDraft() { return run("readonly", (store) => store.get("active")); },
  async saveDraft(draft) { await run("readwrite", (store) => store.put(draft)); },
  async clearDraft() { await run("readwrite", (store) => store.delete("active")); },
};

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image data could not be read."));
    reader.onerror = () => reject(reader.error ?? new Error("Image data could not be read."));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) throw new Error("Project image must be a PNG, JPEG, or WebP file.");
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Project image could not be restored.");
  return response.blob();
}

export function createMockupAssetId() {
  return crypto.randomUUID();
}
