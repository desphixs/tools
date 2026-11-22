export type MockupCategory = "laptop" | "monitor" | "phone" | "tablet";
export type ImageFit = "fill" | "fit";

export type NormalizedPoint = { x: number; y: number };

export type MockupTemplate = {
  id: string;
  version: number;
  name: string;
  category: MockupCategory;
  description: string;
  previewSrc: string;
  sceneSrc: string;
  sceneWidth: number;
  sceneHeight: number;
  screenCorners: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint];
  screenAspectRatio: number;
  screenCornerRadius: number;
};

export type MockupComposition = {
  version: 1;
  templateId: string | null;
  templateVersion: number | null;
  assetId: string | null;
  fit: ImageFit;
  zoom: number;
  panX: number;
  panY: number;
  outputScale: 1 | 2;
};

export type MockupAsset = {
  id: string;
  blob: Blob;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  updatedAt: number;
};

export type MockupDraft = {
  key: "active";
  composition: MockupComposition;
  asset: MockupAsset | null;
  updatedAt: number;
};

export type MockupProjectFile = {
  kind: "device-mockup-project";
  version: 1;
  createdAt: string;
  composition: MockupComposition;
  asset: (Omit<MockupAsset, "blob"> & { dataUrl: string }) | null;
};

export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const MAX_SOURCE_DIMENSION = 16_000;
export const MAX_SOURCE_PIXELS = 32_000_000;
export const MAX_PROJECT_BYTES = 80 * 1024 * 1024;

export function createDefaultComposition(): MockupComposition {
  return {
    version: 1,
    templateId: null,
    templateVersion: null,
    assetId: null,
    fit: "fill",
    zoom: 1,
    panX: 0,
    panY: 0,
    outputScale: 1,
  };
}

export function validateComposition(value: unknown): value is MockupComposition {
  if (!value || typeof value !== "object") return false;
  const composition = value as Partial<MockupComposition>;
  const validId = (id: unknown) => id === null || (typeof id === "string" && id.length > 0 && id.length <= 100);
  const hasTemplate = typeof composition.templateId === "string" && composition.templateId.length > 0;
  return composition.version === 1 &&
    validId(composition.templateId) &&
    (hasTemplate
      ? Number.isInteger(composition.templateVersion) && composition.templateVersion! > 0
      : composition.templateVersion === null) &&
    validId(composition.assetId) &&
    ["fill", "fit"].includes(composition.fit ?? "") &&
    Number.isFinite(composition.zoom) && composition.zoom! >= 1 && composition.zoom! <= 3 &&
    Number.isFinite(composition.panX) && composition.panX! >= -100 && composition.panX! <= 100 &&
    Number.isFinite(composition.panY) && composition.panY! >= -100 && composition.panY! <= 100 &&
    [1, 2].includes(composition.outputScale ?? 0);
}

export function validateMockupAsset(value: unknown): value is MockupAsset {
  if (!value || typeof value !== "object") return false;
  const asset = value as Partial<MockupAsset>;
  return typeof asset.id === "string" && asset.id.length > 0 &&
    asset.blob instanceof Blob && asset.blob.size <= MAX_UPLOAD_BYTES &&
    typeof asset.name === "string" && asset.name.length > 0 && asset.name.length <= 255 &&
    ["image/png", "image/jpeg", "image/webp"].includes(asset.mimeType ?? "") &&
    Number.isInteger(asset.width) && asset.width! > 0 && asset.width! <= MAX_SOURCE_DIMENSION &&
    Number.isInteger(asset.height) && asset.height! > 0 && asset.height! <= MAX_SOURCE_DIMENSION &&
    asset.width! * asset.height! <= MAX_SOURCE_PIXELS && Number.isFinite(asset.updatedAt);
}

export function validateProjectFile(value: unknown): value is MockupProjectFile {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<MockupProjectFile>;
  if (project.kind !== "device-mockup-project" || project.version !== 1 ||
    typeof project.createdAt !== "string" || !Number.isFinite(Date.parse(project.createdAt)) ||
    !validateComposition(project.composition)) return false;

  if (project.asset === null) return project.composition.assetId === null;
  const asset = project.asset;
  return Boolean(asset && project.composition.assetId === asset.id &&
    typeof asset.id === "string" && asset.id.length > 0 &&
    typeof asset.name === "string" && asset.name.length > 0 && asset.name.length <= 255 &&
    ["image/png", "image/jpeg", "image/webp"].includes(asset.mimeType) &&
    Number.isInteger(asset.width) && asset.width > 0 && asset.width <= MAX_SOURCE_DIMENSION &&
    Number.isInteger(asset.height) && asset.height > 0 && asset.height <= MAX_SOURCE_DIMENSION &&
    asset.width * asset.height <= MAX_SOURCE_PIXELS &&
    Number.isFinite(asset.updatedAt) &&
    typeof asset.dataUrl === "string" && asset.dataUrl.length <= MAX_PROJECT_BYTES * 1.5 &&
    new RegExp(`^data:${asset.mimeType.replace("/", "\\/")};base64,`, "i").test(asset.dataUrl));
}
