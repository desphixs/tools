import { PLACEMENT_BY_ID, PLACEMENT_CATALOG_VERSION, SOCIAL_PLACEMENTS, type PlacementId } from "./catalog";

export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
export const MAX_LOGO_BYTES = 10 * 1024 * 1024;
export const MAX_SOURCE_SIDE = 16_000;
export const MAX_SOURCE_PIXELS = 32_000_000;
export const MAX_OUTPUT_PIXELS = 16_000_000;
export const MAX_PACK_OUTPUT_PIXELS = 24_000_000;
export const MAX_PROJECT_BYTES = 72 * 1024 * 1024;
export const MAX_PROJECT_ASSET_BYTES = 50 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
export const MAX_PACK_OUTPUTS = 4;
export const SOURCE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type SourceMimeType = (typeof SOURCE_MIME_TYPES)[number];
export type OutputMimeType = SourceMimeType;
export type ExportFit = "fit" | "crop";
export type OutputBackground = string | null;
export type FontChoice = "sans" | "serif" | "mono";
export type TextAnchor = "top" | "bottom";

export type SocialImageAsset = {
  id: string;
  name: string;
  mimeType: SourceMimeType;
  width: number;
  height: number;
  blob: Blob;
  updatedAt: number;
};

export type SharedPlacementSettings = {
  fit: ExportFit;
  focalX: number;
  focalY: number;
  background: OutputBackground;
};

export type PlacementOverride = Partial<SharedPlacementSettings> & {
  headline?: string;
  caption?: string;
};

export type BrandSettings = {
  accentColor: string;
  textColor: string;
  font: FontChoice;
  textAnchor: TextAnchor;
  logoScale: number;
  safeInset: number;
};

export type SocialPackComposition = {
  kind: "social-asset-pack";
  version: 1;
  catalogVersion: number;
  packName: string;
  selectedPlacementIds: PlacementId[];
  sourceId: string | null;
  logoId: string | null;
  shared: SharedPlacementSettings;
  brand: BrandSettings;
  headline: string;
  caption: string;
  outputFormat: OutputMimeType;
  quality: number;
  overrides: Partial<Record<PlacementId, PlacementOverride>>;
};

export type SocialPackDraft = {
  key: "active";
  composition: SocialPackComposition;
  assets: SocialImageAsset[];
  updatedAt: number;
};

export type SocialProjectFile = {
  kind: "social-asset-exporter-project";
  version: 1;
  createdAt: string;
  composition: SocialPackComposition;
  assets: Array<Omit<SocialImageAsset, "blob"> & { dataUrl: string }>;
};

export type EffectivePlacementSettings = SharedPlacementSettings & {
  headline: string;
  caption: string;
};

export function createDefaultComposition(): SocialPackComposition {
  return {
    kind: "social-asset-pack",
    version: 1,
    catalogVersion: 1,
    packName: "Social asset pack",
    selectedPlacementIds: ["pinterest-standard-pin", "youtube-video-thumbnail", "youtube-shorts-thumbnail", "linkedin-single-image-ad-landscape"],
    sourceId: null,
    logoId: null,
    shared: { fit: "fit", focalX: 0.5, focalY: 0.5, background: null },
    brand: { accentColor: "#7047eb", textColor: "#ffffff", font: "sans", textAnchor: "bottom", logoScale: 14, safeInset: 6 },
    headline: "",
    caption: "",
    outputFormat: "image/png",
    quality: 1,
    overrides: {},
  };
}

export function effectiveSettings(composition: SocialPackComposition, placementId: PlacementId): EffectivePlacementSettings {
  const override = composition.overrides[placementId] ?? {};
  return {
    fit: override.fit ?? composition.shared.fit,
    focalX: override.focalX ?? composition.shared.focalX,
    focalY: override.focalY ?? composition.shared.focalY,
    background: override.background === undefined ? composition.shared.background : override.background,
    headline: override.headline ?? composition.headline,
    caption: override.caption ?? composition.caption,
  };
}

export function isSupportedMimeType(value: unknown): value is SourceMimeType {
  return typeof value === "string" && SOURCE_MIME_TYPES.includes(value as SourceMimeType);
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max;
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function validPlacementSettings(value: unknown): value is PlacementOverride {
  if (!record(value)) return false;
  const numeric = (key: string) => value[key] === undefined || (typeof value[key] === "number" && Number.isFinite(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= 1);
  return (
    (value.fit === undefined || value.fit === "fit" || value.fit === "crop") && numeric("focalX") && numeric("focalY") &&
    (value.background === undefined || value.background === null || validColor(value.background)) &&
    (value.headline === undefined || boundedText(value.headline, 120)) && (value.caption === undefined || boundedText(value.caption, 240))
  );
}

export function validateComposition(value: unknown): value is SocialPackComposition {
  if (!record(value) || !record(value.shared) || !record(value.brand) || !record(value.overrides)) return false;
  const composition = value as unknown as SocialPackComposition;
  const { shared, brand } = composition;
  const selected = composition.selectedPlacementIds;
  const assetId = (id: unknown) => id === null || (typeof id === "string" && id.length > 0 && id.length <= 80);
  return (
    composition.kind === "social-asset-pack" && composition.version === 1 && composition.catalogVersion === PLACEMENT_CATALOG_VERSION &&
    boundedText(composition.packName, 120) && composition.packName.trim().length > 0 &&
    Array.isArray(selected) && selected.length > 0 && selected.length <= MAX_PACK_OUTPUTS &&
    selected.every((id) => typeof id === "string" && Object.hasOwn(PLACEMENT_BY_ID, id)) && new Set(selected).size === selected.length &&
    selected.reduce((pixels, id) => pixels + PLACEMENT_BY_ID[id].width * PLACEMENT_BY_ID[id].height, 0) <= MAX_PACK_OUTPUT_PIXELS &&
    assetId(composition.sourceId) && assetId(composition.logoId) &&
    (shared.fit === "fit" || shared.fit === "crop") &&
    typeof shared.focalX === "number" && Number.isFinite(shared.focalX) && shared.focalX >= 0 && shared.focalX <= 1 &&
    typeof shared.focalY === "number" && Number.isFinite(shared.focalY) && shared.focalY >= 0 && shared.focalY <= 1 &&
    (shared.background === null || validColor(shared.background)) &&
    validColor(brand.accentColor) && validColor(brand.textColor) && ["sans", "serif", "mono"].includes(brand.font) &&
    ["top", "bottom"].includes(brand.textAnchor) && typeof brand.logoScale === "number" && brand.logoScale >= 6 && brand.logoScale <= 24 &&
    typeof brand.safeInset === "number" && brand.safeInset >= 4 && brand.safeInset <= 14 &&
    boundedText(composition.headline, 120) && boundedText(composition.caption, 240) &&
    isSupportedMimeType(composition.outputFormat) && typeof composition.quality === "number" && Number.isFinite(composition.quality) && composition.quality >= 0.8 && composition.quality <= 1 &&
    Object.entries(composition.overrides).every(([id, override]) => Object.hasOwn(PLACEMENT_BY_ID, id) && validPlacementSettings(override))
  );
}

export function validateAssetMetadata(value: unknown): value is Omit<SocialImageAsset, "blob"> & { blob?: Blob; dataUrl?: string } {
  if (!record(value)) return false;
  return (
    typeof value.id === "string" && value.id.length > 0 && value.id.length <= 80 &&
    boundedText(value.name, 255) && isSupportedMimeType(value.mimeType) &&
    Number.isInteger(value.width) && Number.isInteger(value.height) &&
    Number(value.width) >= 1 && Number(value.height) >= 1 && Number(value.width) <= MAX_SOURCE_SIDE && Number(value.height) <= MAX_SOURCE_SIDE &&
    Number(value.width) * Number(value.height) <= MAX_SOURCE_PIXELS && Number.isFinite(value.updatedAt) &&
    (value.blob === undefined || value.blob instanceof Blob) &&
    (value.dataUrl === undefined || typeof value.dataUrl === "string")
  );
}

export function validateProjectReference(composition: SocialPackComposition, assets: readonly SocialImageAsset[]) {
  const unique = new Set(assets.map((asset) => asset.id));
  if (unique.size !== assets.length) return false;
  if (composition.sourceId && !unique.has(composition.sourceId)) return false;
  if (composition.logoId && !unique.has(composition.logoId)) return false;
  return assets.every((asset) => validateAssetMetadata(asset));
}

export function getPlacement(id: PlacementId) {
  return PLACEMENT_BY_ID[id];
}

export function isPlacementId(value: unknown): value is PlacementId {
  return typeof value === "string" && SOCIAL_PLACEMENTS.some((placement) => placement.id === value);
}
