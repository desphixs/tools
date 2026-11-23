import { DEFAULT_SPEC_ID, getScreenshotSpec, type ScreenshotFamily, type ScreenshotOrientation } from "./catalog";

export type LayoutPreset = "full-bleed" | "device-frame" | "caption-led";
export type ExportFormat = "png" | "jpeg";
export type ImageFit = "cover" | "contain";
export type FontChoice = "sans" | "serif" | "mono";
export type TextAlignment = "left" | "center" | "right";
export type Decoration = "none" | "orb" | "rule";
export type GalleryElement = "headline" | "subtitle" | "device" | "screenshot";
export type ElementTransform = { centerX: number; centerY: number; scale: number; rotation: number };

export type GalleryStyle = {
  title: string;
  subtitle: string;
  font: FontChoice;
  fontSize: number;
  lineSpacing: number;
  alignment: TextAlignment;
  textColor: string;
  background: "solid" | "gradient" | "image";
  backgroundAssetId: string | null;
  backgroundStart: string;
  backgroundEnd: string;
  decoration: Decoration;
  decorationColor: string;
};

export type ScreenOverrides = Partial<Pick<GalleryStyle, "title" | "subtitle" | "fontSize" | "textColor" | "backgroundStart" | "backgroundEnd">>;

export type GalleryScreen = {
  id: string;
  assetId: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  fit: ImageFit;
  zoom: number;
  focalX: number;
  focalY: number;
  elementTransforms?: Partial<Record<GalleryElement, ElementTransform>>;
  overrides: ScreenOverrides;
};

export type GalleryProject = {
  kind: "app-store-screenshots-project";
  version: 1;
  id: string;
  name: string;
  specId: string;
  family: ScreenshotFamily;
  orientation: ScreenshotOrientation;
  layout: LayoutPreset;
  format: ExportFormat;
  quality: number;
  style: GalleryStyle;
  screens: GalleryScreen[];
  updatedAt: number;
};

export type ScreenshotAsset = {
  id: string;
  blob: Blob;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
};

export type PortableAsset = Omit<ScreenshotAsset, "blob"> & { dataUrl: string };
export type PortableProject = {
  kind: "app-store-screenshots-project";
  version: 1;
  createdAt: string;
  project: GalleryProject;
  assets: PortableAsset[];
};

export const MAX_SCREEN_COUNT = 10;
export const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
export const MAX_TOTAL_SOURCE_BYTES = 80 * 1024 * 1024;
export const MAX_SOURCE_DIMENSION = 16_000;
export const MAX_SOURCE_PIXELS = 32_000_000;
export const MAX_OUTPUT_PIXELS = 16_000_000;
export const MAX_PROJECT_FILE_BYTES = 120 * 1024 * 1024;
export const MAX_ZIP_FILE_BYTES = 160 * 1024 * 1024;

export function createId(prefix = "screen") {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}

export function createDefaultProject(): GalleryProject {
  return {
    kind: "app-store-screenshots-project",
    version: 1,
    id: createId("project"),
    name: "My App Store Set",
    specId: DEFAULT_SPEC_ID,
    family: "iphone",
    orientation: "portrait",
    layout: "device-frame",
    format: "png",
    quality: 0.92,
    style: {
      title: "Your app, at a glance",
      subtitle: "A clear, consistent story for your product page.",
      font: "sans",
      fontSize: 78,
      lineSpacing: 1.18,
      alignment: "center",
      textColor: "#19172a",
      background: "gradient",
      backgroundAssetId: null,
      backgroundStart: "#e9e4f8",
      backgroundEnd: "#f4e2dc",
      decoration: "none",
      decorationColor: "#7564c8",
    },
    screens: [],
    updatedAt: Date.now(),
  };
}

export function resolveScreenStyle(project: GalleryProject, screen: GalleryScreen): GalleryStyle {
  return { ...project.style, ...screen.overrides };
}

export function validateProject(value: unknown): value is GalleryProject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as GalleryProject;
  const finite = (v: unknown, low: number, high: number) => typeof v === "number" && Number.isFinite(v) && v >= low && v <= high;
  const color = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  const transformsOk = (value: unknown) => value === undefined || !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value).every(([element, transform]) => {
      if (!["headline", "subtitle", "device", "screenshot"].includes(element) || !transform || typeof transform !== "object") return false;
      const item = transform as ElementTransform;
      return finite(item.centerX, -100, 200) && finite(item.centerY, -100, 200) && finite(item.scale, 0.25, 3) && finite(item.rotation, -180, 180);
    });
  const screenOk = (s: GalleryScreen) => !!s && typeof s === "object" &&
    typeof s.id === "string" && s.id.length > 0 && s.id.length <= 100 &&
    typeof s.assetId === "string" && s.assetId.length > 0 && s.assetId.length <= 100 &&
    typeof s.name === "string" && s.name.length <= 200 && /^image\/(png|jpeg|webp)$/i.test(s.mimeType) &&
    Number.isInteger(s.width) && Number.isInteger(s.height) && s.width > 0 && s.height > 0 &&
    finite(s.bytes, 1, MAX_IMAGE_BYTES) && ["cover", "contain"].includes(s.fit) &&
    finite(s.zoom, 1, 3) && finite(s.focalX, -100, 100) && finite(s.focalY, -100, 100) &&
    transformsOk(s.elementTransforms) &&
    s.overrides && typeof s.overrides === "object" &&
    (s.overrides.title === undefined || typeof s.overrides.title === "string" && s.overrides.title.length <= 120) &&
    (s.overrides.subtitle === undefined || typeof s.overrides.subtitle === "string" && s.overrides.subtitle.length <= 200) &&
    (s.overrides.fontSize === undefined || finite(s.overrides.fontSize, 24, 160)) &&
    (s.overrides.textColor === undefined || color(s.overrides.textColor)) &&
    (s.overrides.backgroundStart === undefined || color(s.overrides.backgroundStart)) &&
    (s.overrides.backgroundEnd === undefined || color(s.overrides.backgroundEnd));
  return p.kind === "app-store-screenshots-project" && p.version === 1 &&
    typeof p.id === "string" && p.id.length <= 100 && typeof p.name === "string" && p.name.trim().length > 0 && p.name.length <= 80 &&
    !!getScreenshotSpec(p.specId) && p.family === getScreenshotSpec(p.specId)?.family &&
    ["portrait", "landscape"].includes(p.orientation) && ["full-bleed", "device-frame", "caption-led"].includes(p.layout) &&
    ["png", "jpeg"].includes(p.format) && finite(p.quality, 0.5, 1) &&
    p.style && typeof p.style === "object" && typeof p.style.title === "string" && p.style.title.length <= 120 &&
    typeof p.style.subtitle === "string" && p.style.subtitle.length <= 200 && ["sans", "serif", "mono"].includes(p.style.font) &&
    finite(p.style.fontSize, 24, 160) && finite(p.style.lineSpacing, 0.9, 1.8) && ["left", "center", "right"].includes(p.style.alignment) &&
    color(p.style.textColor) && ["solid", "gradient", "image"].includes(p.style.background) &&
    (p.style.backgroundAssetId === null || typeof p.style.backgroundAssetId === "string" && p.style.backgroundAssetId.length > 0 && p.style.backgroundAssetId.length <= 100) &&
    (p.style.background !== "image" || typeof p.style.backgroundAssetId === "string" && p.style.backgroundAssetId.length > 0) && color(p.style.backgroundStart) && color(p.style.backgroundEnd) &&
    ["none", "orb", "rule"].includes(p.style.decoration) && color(p.style.decorationColor) &&
    Array.isArray(p.screens) && p.screens.length <= MAX_SCREEN_COUNT && p.screens.every(screenOk) &&
    new Set(p.screens.map((screen) => screen.id)).size === p.screens.length &&
    typeof p.updatedAt === "number" && Number.isFinite(p.updatedAt);
}

export function validatePortableProject(value: unknown): value is PortableProject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const file = value as PortableProject;
  return file.kind === "app-store-screenshots-project" && file.version === 1 &&
    typeof file.createdAt === "string" && validateProject(file.project) && Array.isArray(file.assets) &&
    file.project.screens.length > 0 && file.assets.length === new Set([...file.project.screens.map((screen) => screen.assetId), ...(file.project.style.backgroundAssetId ? [file.project.style.backgroundAssetId] : [])]).size && file.assets.every((asset) =>
      !!asset && typeof asset === "object" && typeof asset.id === "string" && typeof asset.name === "string" &&
      typeof asset.dataUrl === "string" && asset.dataUrl.length <= MAX_PROJECT_FILE_BYTES * 1.4 &&
      /^image\/(png|jpeg|webp)$/i.test(asset.mimeType) && Number.isInteger(asset.width) && Number.isInteger(asset.height) &&
      typeof asset.bytes === "number" && asset.bytes > 0 && asset.bytes <= MAX_IMAGE_BYTES) &&
    new Set(file.assets.map((asset) => asset.id)).size === file.assets.length &&
    [...file.project.screens.map((screen) => screen.assetId), ...(file.project.style.backgroundAssetId ? [file.project.style.backgroundAssetId] : [])].every((id) => file.assets.some((asset) => asset.id === id));
}

export function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
