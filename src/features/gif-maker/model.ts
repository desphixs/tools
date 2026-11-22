export type GifMode = "video" | "images";
export type GifAspect = "original" | "square" | "portrait" | "landscape";
export type GifFit = "cover" | "contain";

export type GifSettings = {
  aspect: GifAspect;
  fit: GifFit;
  outputSize: 320 | 480 | 640;
  loop: boolean;
  fps: number;
  frameDuration: number;
};

export type Dimensions = { width: number; height: number };

export const DEFAULT_GIF_SETTINGS: GifSettings = {
  aspect: "original",
  fit: "cover",
  outputSize: 320,
  loop: true,
  fps: 12,
  frameDuration: 100,
};

export const MIN_VIDEO_FPS = 5;
export const MAX_VIDEO_FPS = 15;
export const MAX_VIDEO_CLIP_SECONDS = 10;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_OUTPUT_DIMENSION = 640;
export const MIN_IMAGE_FRAMES = 2;
export const MAX_IMAGE_FRAMES = 30;
export const MIN_FRAME_DURATION = 50;
export const MAX_FRAME_DURATION = 2_000;
export const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
export const MAX_TOTAL_IMAGE_BYTES = 120 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 16_000;
export const MAX_IMAGE_PIXELS = 32_000_000;
export const MAX_SEQUENCE_PIXELS = 80_000_000;

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm)$/i;

export function isSupportedImageFile(file: File) {
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type.toLowerCase()) || IMAGE_EXTENSIONS.test(file.name);
}

export function isSupportedVideoFile(file: File) {
  return ["video/mp4", "video/webm"].includes(file.type.toLowerCase()) || VIDEO_EXTENSIONS.test(file.name);
}

export function getAspectRatio(aspect: GifAspect, sourceWidth: number, sourceHeight: number) {
  if (aspect === "square") return 1;
  if (aspect === "portrait") return 4 / 5;
  if (aspect === "landscape") return 16 / 9;
  return sourceWidth / sourceHeight;
}

export function getOutputDimensions(
  source: Dimensions,
  settings: Pick<GifSettings, "aspect" | "fit" | "outputSize">,
): Dimensions {
  const sourceWidth = Math.max(1, source.width);
  const sourceHeight = Math.max(1, source.height);
  const sourceLongEdge = Math.max(sourceWidth, sourceHeight);
  const maxEdge = Math.min(settings.outputSize, MAX_OUTPUT_DIMENSION, sourceLongEdge);

  if (settings.aspect === "original") {
    const scale = Math.min(1, maxEdge / sourceLongEdge);
    return {
      width: Math.max(1, Math.round(sourceWidth * scale)),
      height: Math.max(1, Math.round(sourceHeight * scale)),
    };
  }

  const ratio = getAspectRatio(settings.aspect, sourceWidth, sourceHeight);
  let edge = maxEdge;

  if (settings.fit === "cover") {
    const sourceRatio = sourceWidth / sourceHeight;
    const cropWidth = sourceRatio > ratio ? sourceHeight * ratio : sourceWidth;
    const cropHeight = sourceRatio > ratio ? sourceHeight : sourceWidth / ratio;
    const sourceCropLongEdge = ratio >= 1 ? cropWidth : cropHeight;
    edge = Math.min(edge, sourceCropLongEdge);
  }

  if (ratio >= 1) {
    return { width: Math.max(1, Math.round(edge)), height: Math.max(1, Math.round(edge / ratio)) };
  }
  return { width: Math.max(1, Math.round(edge * ratio)), height: Math.max(1, Math.round(edge)) };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = units[0];
  for (let index = 1; size >= 1024 && index < units.length; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${unit}`;
}

export function formatTime(seconds: number) {
  return `${seconds.toFixed(1)}s`;
}

export function getVideoFrameCount(start: number, end: number, fps: number) {
  return Math.floor(Math.max(0, end - start) * fps + 1e-7);
}

export function getVideoFrameDelay(frameIndex: number, fps: number) {
  const startCentiseconds = Math.round((frameIndex * 100) / fps);
  const endCentiseconds = Math.round(((frameIndex + 1) * 100) / fps);
  return (endCentiseconds - startCentiseconds) * 10;
}

