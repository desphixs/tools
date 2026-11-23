import { validateComposition, validateProjectReference, type SocialImageAsset, type SocialPackComposition, type SocialPackDraft } from "./model";

const DATABASE_NAME = "social-asset-exporter-local";
const DATABASE_VERSION = 1;
const STORE_DRAFTS = "drafts";

export interface SocialAssetStorage {
  saveDraft(draft: SocialPackDraft): Promise<void>;
  getDraft(): Promise<SocialPackDraft | undefined>;
  clearDraft(): Promise<void>;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) db.createObjectStore(STORE_DRAFTS, { keyPath: "key" });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, mode);
    const request = operation(tx.objectStore(STORE_DRAFTS));
    let result: T | undefined;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error ?? new Error("Browser storage operation failed."));
    tx.oncomplete = () => { db.close(); resolve(result as T); };
    tx.onerror = () => reject(tx.error ?? new Error("Browser storage transaction failed."));
    tx.onabort = () => { db.close(); reject(tx.error ?? request.error ?? new Error("Browser storage transaction was interrupted.")); };
  });
}

function validDraft(value: unknown): value is SocialPackDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as SocialPackDraft;
  return draft.key === "active" && validateComposition(draft.composition) && Array.isArray(draft.assets) &&
    draft.assets.every((asset: SocialImageAsset) => asset.blob instanceof Blob && asset.blob.size <= 40 * 1024 * 1024) &&
    validateProjectReference(draft.composition, draft.assets) && Number.isFinite(draft.updatedAt);
}

export const socialAssetStorage: SocialAssetStorage = {
  async saveDraft(draft) {
    const safeDraft = { ...draft, key: "active" as const, updatedAt: Date.now() };
    await withStore("readwrite", (store) => store.put(safeDraft));
  },
  async getDraft() {
    const draft = await withStore<unknown>("readonly", (store) => store.get("active"));
    return validDraft(draft) ? draft : undefined;
  },
  async clearDraft() { await withStore("readwrite", (store) => store.delete("active")); },
};

export function createAssetId() {
  return crypto.randomUUID();
}

export async function readImage(file: Blob): Promise<{ width: number; height: number }> {
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = signature.length >= 8 && signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47 && signature[4] === 0x0d && signature[5] === 0x0a && signature[6] === 0x1a && signature[7] === 0x0a;
  const isJpeg = signature.length >= 3 && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const isWebp = signature.length >= 12 && signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46 && signature[8] === 0x57 && signature[9] === 0x45 && signature[10] === 0x42 && signature[11] === 0x50;
  const detectedType = isPng ? "image/png" : isJpeg ? "image/jpeg" : isWebp ? "image/webp" : null;
  if (!detectedType || detectedType !== file.type) throw new Error("The image contents do not match the selected PNG, JPEG, or WebP file type.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Try a PNG, JPEG, or WebP file.");
  }
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

export function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("A saved image could not be loaded.")); };
    image.src = url;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image data."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image data."));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) throw new Error("Project images must be embedded PNG, JPEG, or WebP data.");
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("A project image could not be restored.");
  return response.blob();
}

export function storageErrorMessage(cause: unknown, fallback: string) {
  if (cause instanceof DOMException && cause.name === "QuotaExceededError") {
    return "Browser storage is full. Download a project file to keep a portable copy, then try again.";
  }
  if (cause instanceof DOMException && ["SecurityError", "InvalidStateError"].includes(cause.name)) {
    return "This browser blocked local storage. Your current edit remains available until you leave this page; download a project file to keep a copy.";
  }
  return cause instanceof Error ? cause.message : fallback;
}

export function assetTotalBytes(assets: readonly SocialImageAsset[]) {
  return assets.reduce((total, asset) => total + asset.blob.size, 0);
}

export function referencedAssets(assets: readonly SocialImageAsset[], composition: SocialPackComposition) {
  return assets.filter((asset) => asset.id === composition.sourceId || asset.id === composition.logoId);
}
