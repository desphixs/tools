import { MAX_LOGO_BYTES, MAX_PROJECT_ASSET_BYTES, MAX_PROJECT_BYTES, MAX_SOURCE_BYTES, MAX_SOURCE_PIXELS, MAX_SOURCE_SIDE, isSupportedMimeType, validateComposition, validateProjectReference, type SocialImageAsset, type SocialPackComposition, type SocialProjectFile } from "./model";
import { blobToDataUrl, dataUrlToBlob, readImage } from "./storage";

export async function createProjectFile(composition: SocialPackComposition, assets: SocialImageAsset[]): Promise<Blob> {
  if (!validateComposition(composition)) throw new Error("Give the pack a name and keep at least one supported placement selected before saving.");
  const referenced = assets.filter((asset) => asset.id === composition.sourceId || asset.id === composition.logoId);
  const total = referenced.reduce((sum, asset) => sum + asset.blob.size, 0);
  if (total > MAX_PROJECT_ASSET_BYTES || !validateProjectReference(composition, referenced)) {
    throw new Error("This pack is too large or has an invalid image reference. Remove the logo or choose a smaller source image.");
  }
  const project: SocialProjectFile = {
    kind: "social-asset-exporter-project",
    version: 1,
    createdAt: new Date().toISOString(),
    composition,
    assets: await Promise.all(referenced.map(async ({ blob, ...asset }) => ({ ...asset, dataUrl: await blobToDataUrl(blob) }))),
  };
  const blob = new Blob([JSON.stringify(project)], { type: "application/vnd.social-asset-exporter.project+json" });
  if (blob.size > MAX_PROJECT_BYTES) throw new Error("The project file would be too large to save. Remove the logo or choose a smaller source image.");
  return blob;
}

export async function readProjectFile(file: File): Promise<{ composition: SocialPackComposition; assets: SocialImageAsset[] }> {
  if (file.size > MAX_PROJECT_BYTES) throw new Error("This project exceeds the 72 MB import limit.");
  let raw: unknown;
  try { raw = JSON.parse(await file.text()); } catch { throw new Error("This project file is not valid JSON."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("This is not a supported Social Asset Exporter project.");
  const value = raw as Record<string, unknown>;
  if (value.kind !== "social-asset-exporter-project" || value.version !== 1 || !validateComposition(value.composition) || !Array.isArray(value.assets) || value.assets.length > 2) {
    throw new Error("This is not a supported Social Asset Exporter project.");
  }
  const seen = new Set<string>();
  const assets: SocialImageAsset[] = [];
  let totalBytes = 0;
  for (const entry of value.assets) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("This project contains an invalid image record.");
    const rawAsset = entry as Record<string, unknown>;
    const { id, name, mimeType, width, height, updatedAt, dataUrl } = rawAsset;
    if (
      typeof id !== "string" || id.length === 0 || id.length > 80 || seen.has(id) ||
      typeof name !== "string" || name.length > 255 || !isSupportedMimeType(mimeType) ||
      !Number.isInteger(width) || !Number.isInteger(height) || Number(width) < 1 || Number(height) < 1 ||
      Number(width) > MAX_SOURCE_SIDE || Number(height) > MAX_SOURCE_SIDE || Number(width) * Number(height) > MAX_SOURCE_PIXELS ||
      typeof updatedAt !== "number" || !Number.isFinite(updatedAt) || typeof dataUrl !== "string" || dataUrl.length > MAX_PROJECT_ASSET_BYTES * 1.5
    ) throw new Error("This project contains an invalid or oversized image.");
    seen.add(id);
    const blob = await dataUrlToBlob(dataUrl);
    const maxBytes = id === value.composition.logoId ? MAX_LOGO_BYTES : MAX_SOURCE_BYTES;
    if (blob.type !== mimeType || blob.size === 0 || blob.size > maxBytes) throw new Error("A project image has an unsupported type or exceeds its file-size limit.");
    totalBytes += blob.size;
    if (totalBytes > MAX_PROJECT_ASSET_BYTES) throw new Error("The project images exceed the combined size limit.");
    const actual = await readImage(blob);
    if (actual.width !== width || actual.height !== height) throw new Error("A project image does not match its saved dimensions.");
    assets.push({ id, name, mimeType, width: actual.width, height: actual.height, blob, updatedAt });
  }
  if (!validateProjectReference(value.composition, assets)) throw new Error("The project is missing a source image or contains duplicate assets.");
  if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) throw new Error("This project has invalid metadata.");
  return { composition: value.composition, assets };
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
