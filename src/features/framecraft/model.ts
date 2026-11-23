export type FramecraftAsset = {
  id: string;
  blob: Blob;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  updatedAt: number;
};

export type CanvasSettings = {
  width: number;
  height: number;
  preset: "landscape" | "square" | "portrait" | "custom";
  radius: number;
  transparentCorners: boolean;
};

export type BackgroundSettings = {
  type: "solid" | "gradient" | "image";
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  assetId: string | null;
  fit: "cover" | "contain";
  zoom: number;
  x: number;
  y: number;
  blur: number;
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  overlayType: "none" | "solid" | "gradient";
  overlayColor: string;
  overlayColorEnd: string;
  overlayAngle: number;
  overlayOpacity: number;
  vignette: number;
  texture: number;
};

export type ScreenshotSettings = {
  assetId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectLocked: boolean;
  rotation: number;
  opacity: number;
  cornerRadius: number;
  borderWidth: number;
  borderPosition: "inside" | "outside";
  borderColor: string;
  borderOpacity: number;
  fit: "cover" | "contain";
  cropZoom: number;
  cropX: number;
  cropY: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
  shadowWidth: number;
  shadowHeight: number;
  shadowSpread: number;
  innerShadowEnabled: boolean;
  innerShadowColor: string;
  innerShadowOpacity: number;
  innerShadowBlur: number;
  innerShadowX: number;
  innerShadowY: number;
  innerShadowSpread: number;
};

export type Composition = {
  version: 1;
  canvas: CanvasSettings;
  background: BackgroundSettings;
  screenshot: ScreenshotSettings;
};

export type ProjectFile = {
  kind: "framecraft-project";
  version: 1;
  createdAt: string;
  composition: Composition;
  assets: Array<Omit<FramecraftAsset, "blob"> & { dataUrl: string }>;
};

export type CompositionTemplate = {
  id: string;
  name: string;
  version: 1;
  composition: Composition;
  createdAt: number;
  updatedAt: number;
};

export type StoredDraft = {
  key: "active";
  composition: Composition;
  updatedAt: number;
};

export const MAX_CANVAS_DIMENSION = 4096;
export const MAX_CANVAS_PIXELS = 16_000_000;
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const MAX_SOURCE_DIMENSION = 16_000;
export const MAX_SOURCE_PIXELS = 32_000_000;

export function createDefaultComposition(): Composition {
  return {
    version: 1,
    canvas: {
      width: 1200,
      height: 675,
      preset: "landscape",
      radius: 0,
      transparentCorners: false,
    },
    background: {
      type: "gradient",
      color: "#e9e4f8",
      gradientFrom: "#e9e4f8",
      gradientTo: "#f3e2dc",
      gradientAngle: 135,
      assetId: null,
      fit: "cover",
      zoom: 1,
      x: 0,
      y: 0,
      blur: 0,
      opacity: 100,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      grayscale: 0,
      overlayType: "none",
      overlayColor: "#222033",
      overlayColorEnd: "#443a66",
      overlayAngle: 135,
      overlayOpacity: 0,
      vignette: 0,
      texture: 0,
    },
    screenshot: {
      assetId: null,
      x: 165,
      y: 125,
      width: 870,
      height: 425,
      aspectLocked: true,
      rotation: 0,
      opacity: 100,
      cornerRadius: 24,
      borderWidth: 0,
      borderPosition: "inside",
      borderColor: "#ffffff",
      borderOpacity: 100,
      fit: "cover",
      cropZoom: 1,
      cropX: 0,
      cropY: 0,
      shadowEnabled: true,
      shadowColor: "#211933",
      shadowOpacity: 24,
      shadowBlur: 36,
      shadowX: 0,
      shadowY: 22,
      shadowWidth: 870,
      shadowHeight: 425,
      shadowSpread: 0,
      innerShadowEnabled: false,
      innerShadowColor: "#000000",
      innerShadowOpacity: 24,
      innerShadowBlur: 24,
      innerShadowX: 0,
      innerShadowY: 0,
      innerShadowSpread: 0,
    },
  };
}

export function validateComposition(value: unknown): value is Composition {
  if (!value || typeof value !== "object") return false;
  const composition = value as Composition;
  const { canvas, background, screenshot } = composition;
  const finiteBetween = (candidate: unknown, min: number, max: number) => typeof candidate === "number" && Number.isFinite(candidate) && candidate >= min && candidate <= max;
  const validColor = (candidate: unknown) => typeof candidate === "string" && /^#[0-9a-f]{6}$/i.test(candidate);
  return (
    composition.version === 1 &&
    Number.isInteger(canvas?.width) && Number.isInteger(canvas?.height) &&
    canvas.width >= 200 && canvas.height >= 200 &&
    canvas.width <= MAX_CANVAS_DIMENSION && canvas.height <= MAX_CANVAS_DIMENSION &&
    canvas.width * canvas.height <= MAX_CANVAS_PIXELS &&
    finiteBetween(canvas.radius, 0, 1000) && typeof canvas.transparentCorners === "boolean" &&
    ["landscape", "square", "portrait", "custom"].includes(canvas.preset) &&
    ["solid", "gradient", "image"].includes(background?.type) &&
    (background.assetId === null || (typeof background.assetId === "string" && background.assetId.length > 0 && background.assetId.length <= 80)) &&
    (background.type !== "image" || typeof background.assetId === "string") &&
    validColor(background.color) && validColor(background.gradientFrom) && validColor(background.gradientTo) &&
    validColor(background.overlayColor) && validColor(background.overlayColorEnd) &&
    ["cover", "contain"].includes(background.fit) &&
    finiteBetween(background.zoom, 0.25, 5) && finiteBetween(background.x, -300, 300) && finiteBetween(background.y, -300, 300) &&
    finiteBetween(background.blur, 0, 64) && finiteBetween(background.opacity, 0, 100) &&
    finiteBetween(background.brightness, 0, 200) && finiteBetween(background.contrast, 0, 200) &&
    finiteBetween(background.saturation, 0, 200) && finiteBetween(background.grayscale, 0, 100) &&
    ["none", "solid", "gradient"].includes(background.overlayType) && finiteBetween(background.overlayAngle, 0, 360) &&
    finiteBetween(background.overlayOpacity, 0, 100) && finiteBetween(background.vignette, 0, 100) && finiteBetween(background.texture, 0, 100) &&
    finiteBetween(screenshot?.x, -MAX_CANVAS_DIMENSION * 2, MAX_CANVAS_DIMENSION * 3) &&
    finiteBetween(screenshot?.y, -MAX_CANVAS_DIMENSION * 2, MAX_CANVAS_DIMENSION * 3) &&
    finiteBetween(screenshot?.width, 60, MAX_CANVAS_DIMENSION * 2) && finiteBetween(screenshot?.height, 60, MAX_CANVAS_DIMENSION * 2) &&
    typeof screenshot.aspectLocked === "boolean" && finiteBetween(screenshot.rotation, -360, 360) &&
    finiteBetween(screenshot.opacity, 0, 100) && finiteBetween(screenshot.cornerRadius, 0, 1000) &&
    finiteBetween(screenshot.borderWidth, 0, 100) &&
    (screenshot.borderPosition === undefined || ["inside", "outside"].includes(screenshot.borderPosition)) &&
    validColor(screenshot.borderColor) && finiteBetween(screenshot.borderOpacity, 0, 100) &&
    ["cover", "contain"].includes(screenshot?.fit) && finiteBetween(screenshot.cropZoom, 0.25, 5) &&
    finiteBetween(screenshot.cropX, -300, 300) && finiteBetween(screenshot.cropY, -300, 300) &&
    (screenshot.assetId === null || (typeof screenshot.assetId === "string" && screenshot.assetId.length > 0 && screenshot.assetId.length <= 80)) &&
    typeof screenshot.shadowEnabled === "boolean" && validColor(screenshot.shadowColor) &&
    finiteBetween(screenshot.shadowOpacity, 0, 100) && finiteBetween(screenshot.shadowBlur, 0, 200) &&
    finiteBetween(screenshot.shadowX, -2000, 2000) && finiteBetween(screenshot.shadowY, -2000, 2000) &&
    finiteBetween(screenshot.shadowWidth ?? screenshot.width, 60, MAX_CANVAS_DIMENSION * 2) &&
    finiteBetween(screenshot.shadowHeight ?? screenshot.height, 60, MAX_CANVAS_DIMENSION * 2) &&
    finiteBetween(screenshot.shadowSpread, 0, 100) &&
    (screenshot.innerShadowEnabled === undefined || typeof screenshot.innerShadowEnabled === "boolean") &&
    (screenshot.innerShadowColor === undefined || validColor(screenshot.innerShadowColor)) &&
    (screenshot.innerShadowOpacity === undefined || finiteBetween(screenshot.innerShadowOpacity, 0, 100)) &&
    (screenshot.innerShadowBlur === undefined || finiteBetween(screenshot.innerShadowBlur, 0, 200)) &&
    (screenshot.innerShadowX === undefined || finiteBetween(screenshot.innerShadowX, -2000, 2000)) &&
    (screenshot.innerShadowY === undefined || finiteBetween(screenshot.innerShadowY, -2000, 2000)) &&
    (screenshot.innerShadowSpread === undefined || finiteBetween(screenshot.innerShadowSpread, 0, 100))
  );
}

export function normalizeComposition(composition: Composition): Composition {
  return {
    ...composition,
    screenshot: {
      ...composition.screenshot,
      shadowWidth: composition.screenshot.shadowWidth ?? composition.screenshot.width,
      shadowHeight: composition.screenshot.shadowHeight ?? composition.screenshot.height,
      borderPosition: composition.screenshot.borderPosition ?? "inside",
      innerShadowEnabled: composition.screenshot.innerShadowEnabled ?? false,
      innerShadowColor: composition.screenshot.innerShadowColor ?? "#000000",
      innerShadowOpacity: composition.screenshot.innerShadowOpacity ?? 24,
      innerShadowBlur: composition.screenshot.innerShadowBlur ?? 24,
      innerShadowX: composition.screenshot.innerShadowX ?? 0,
      innerShadowY: composition.screenshot.innerShadowY ?? 0,
      innerShadowSpread: composition.screenshot.innerShadowSpread ?? 0,
    },
  };
}

export function fitScreenshotToImage(
  composition: Composition,
  sourceWidth: number,
  sourceHeight: number,
  preferredWidth = composition.screenshot.width,
): Composition {
  if (sourceWidth <= 0 || sourceHeight <= 0 || preferredWidth <= 0) return composition;

  const settings = composition.screenshot;
  const maxWidth = Math.max(60, composition.canvas.width - 96);
  const maxHeight = Math.max(60, composition.canvas.height - 96);
  const scale = Math.min(preferredWidth / sourceWidth, maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const shadowWidth = settings.shadowWidth ?? settings.width;
  const shadowHeight = settings.shadowHeight ?? settings.height;
  const shadowWidthMatchesFrame = Math.abs(shadowWidth - settings.width) < 0.01;
  const shadowHeightMatchesFrame = Math.abs(shadowHeight - settings.height) < 0.01;

  return {
    ...composition,
    screenshot: {
      ...settings,
      x: settings.x + settings.width / 2 - width / 2,
      y: settings.y + settings.height / 2 - height / 2,
      width,
      height,
      shadowWidth: shadowWidthMatchesFrame ? width : shadowWidth,
      shadowHeight: shadowHeightMatchesFrame ? height : shadowHeight,
    },
  };
}

export function validateCompositionTemplate(value: unknown): value is CompositionTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const template = value as CompositionTemplate;
  return (
    template.version === 1 &&
    typeof template.id === "string" && template.id.length > 0 && template.id.length <= 80 &&
    typeof template.name === "string" && template.name.trim().length > 0 && template.name.length <= 48 &&
    typeof template.createdAt === "number" && Number.isFinite(template.createdAt) &&
    typeof template.updatedAt === "number" && Number.isFinite(template.updatedAt) &&
    validateComposition(template.composition) &&
    template.composition.screenshot.assetId === null
  );
}
