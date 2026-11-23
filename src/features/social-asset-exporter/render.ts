import { PLACEMENT_BY_ID, type PlacementId } from "./catalog";
import { MAX_OUTPUT_PIXELS, type EffectivePlacementSettings, type OutputMimeType, type SocialImageAsset, type SocialPackComposition } from "./model";

export type RenderImage = { image: HTMLImageElement; width: number; height: number };

export function getPreviewDimensions(width: number, height: number, maxSide = 1200) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function getCropLoss(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (Math.abs(sourceRatio - targetRatio) < 0.0001) return { direction: "none" as const, percent: 0 };
  if (sourceRatio > targetRatio) {
    return { direction: "width" as const, percent: Math.round((1 - targetRatio / sourceRatio) * 100) };
  }
  return { direction: "height" as const, percent: Math.round((1 - sourceRatio / targetRatio) * 100) };
}

export function getResolutionReport(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, fit: "fit" | "crop") {
  const scale = fit === "fit"
    ? Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
    : Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const sourceToOutputArea = (sourceWidth * sourceHeight) / (targetWidth * targetHeight);
  return {
    scale,
    upscales: scale > 1.001,
    downsampleRatio: sourceToOutputArea,
    meaningfulDownsample: sourceToOutputArea > 4,
  };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

export function getOverlayFontScale(settings: EffectivePlacementSettings, composition: SocialPackComposition, width: number, height: number, logo: RenderImage | null) {
  if (!settings.headline && !settings.caption) return 1;
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return 1;
  const pad = Math.max(28, width * (composition.brand.safeInset / 100));
  const logoSize = logo ? width * (composition.brand.logoScale / 100) : 0;
  const maxTextWidth = Math.max(1, width - pad * 2 - (logo ? logoSize + Math.max(12, pad * 0.3) : 0));
  const maxTextHeight = height - pad * 2;
  const family = composition.brand.font === "serif" ? "Georgia, serif" : composition.brand.font === "mono" ? "ui-monospace, monospace" : "system-ui, sans-serif";
  for (let iteration = 0; iteration <= 16; iteration += 1) {
    const factor = 1 - iteration * 0.04;
    if (factor < 0.36) break;
    const headlineSize = Math.max(12, width * 0.048 * factor);
    const captionSize = Math.max(10, width * 0.023 * factor);
    context.font = `700 ${headlineSize}px ${family}`;
    const headlines = wrapText(context, settings.headline, maxTextWidth);
    context.font = `500 ${captionSize}px ${family}`;
    const captions = wrapText(context, settings.caption, maxTextWidth);
    const totalHeight = headlines.length * headlineSize * 1.14 + captions.length * captionSize * 1.35 + (captions.length ? Math.max(5, width * 0.009) : 0);
    if (totalHeight <= maxTextHeight && Math.max(headlineSize, captionSize, logoSize) <= maxTextHeight) return factor;
  }
  return 0.36;
}

export function drawComposition(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  source: RenderImage,
  targetWidth: number,
  targetHeight: number,
  settings: EffectivePlacementSettings,
  composition: SocialPackComposition,
  logo: RenderImage | null,
) {
  const scaleX = canvasWidth / targetWidth;
  const scaleY = canvasHeight / targetHeight;
  ctx.save();
  ctx.scale(scaleX, scaleY);
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  if (settings.background) {
    ctx.fillStyle = settings.background;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (settings.fit === "fit") {
    const scale = Math.min(targetWidth / source.width, targetHeight / source.height);
    const drawWidth = source.width * scale;
    const drawHeight = source.height * scale;
    ctx.drawImage(source.image, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight);
  } else {
    const sourceRatio = source.width / source.height;
    const targetRatio = targetWidth / targetHeight;
    let cropWidth = source.width;
    let cropHeight = source.height;
    if (sourceRatio > targetRatio) cropWidth = source.height * targetRatio;
    else cropHeight = source.width / targetRatio;
    const centerX = settings.focalX * source.width;
    const centerY = settings.focalY * source.height;
    const sx = Math.max(0, Math.min(source.width - cropWidth, centerX - cropWidth / 2));
    const sy = Math.max(0, Math.min(source.height - cropHeight, centerY - cropHeight / 2));
    ctx.drawImage(source.image, sx, sy, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  }

  if (settings.headline || settings.caption || logo) {
    const anchor = composition.brand.textAnchor;
    const pad = Math.max(28, targetWidth * (composition.brand.safeInset / 100));
    const fontScale = getOverlayFontScale(settings, composition, targetWidth, targetHeight, logo);
    const headlineSize = Math.max(12, targetWidth * 0.048 * fontScale);
    const captionSize = Math.max(10, targetWidth * 0.023 * fontScale);
    const fontFamily = composition.brand.font === "serif" ? "Georgia, serif" : composition.brand.font === "mono" ? "ui-monospace, monospace" : "system-ui, sans-serif";
    const headlineLines = (() => {
      ctx.font = `700 ${headlineSize}px ${fontFamily}`;
      return wrapText(ctx, settings.headline, targetWidth - pad * 2);
    })();
    const captionLines = (() => {
      ctx.font = `500 ${captionSize}px ${fontFamily}`;
      return wrapText(ctx, settings.caption, targetWidth - pad * 2);
    })();
    const lineGap = Math.max(5, targetWidth * 0.009);
    const textHeight = headlineLines.length * headlineSize * 1.14 + captionLines.length * captionSize * 1.35 + (captionLines.length ? lineGap : 0);
    const logoSize = logo ? targetWidth * (composition.brand.logoScale / 100) : 0;
    const logoGap = logo ? Math.max(12, pad * 0.3) : 0;
    const blockHeight = Math.max(textHeight, logoSize) + pad * 2;
    const top = anchor === "top" ? 0 : targetHeight - blockHeight;
    const gradient = ctx.createLinearGradient(0, anchor === "top" ? 0 : targetHeight - blockHeight * 1.35, 0, anchor === "top" ? blockHeight * 1.35 : targetHeight);
    gradient.addColorStop(0, "rgba(0,0,0,0.58)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, anchor === "top" ? 0 : targetHeight - blockHeight * 1.35, targetWidth, blockHeight * 1.35);

    let textX = pad;
    if (logo && logoSize) {
      const logoY = top + (blockHeight - logoSize) / 2;
      const ratio = Math.min(logoSize / logo.width, logoSize / logo.height);
      const logoWidth = logo.width * ratio;
      const logoHeight = logo.height * ratio;
      ctx.drawImage(logo.image, textX, logoY, logoWidth, logoHeight);
      textX += logoSize + logoGap;
    }
    const maxTextWidth = targetWidth - textX - pad;
    let y = anchor === "top" ? top + pad : top + pad + headlineLines.length * headlineSize * 1.14;
    if (anchor === "top") {
      ctx.textBaseline = "top";
      ctx.fillStyle = composition.brand.textColor;
      ctx.font = `700 ${headlineSize}px ${fontFamily}`;
      headlineLines.forEach((line) => { ctx.fillText(line, textX, y, maxTextWidth); y += headlineSize * 1.14; });
      if (captionLines.length) y += lineGap;
      ctx.font = `500 ${captionSize}px ${fontFamily}`;
      captionLines.forEach((line) => { ctx.fillText(line, textX, y, maxTextWidth); y += captionSize * 1.35; });
    } else {
      ctx.textBaseline = "bottom";
      ctx.fillStyle = composition.brand.textColor;
      ctx.font = `500 ${captionSize}px ${fontFamily}`;
      captionLines.slice().reverse().forEach((line) => { ctx.fillText(line, textX, y, maxTextWidth); y -= captionSize * 1.35; });
      if (captionLines.length) y -= lineGap;
      ctx.font = `700 ${headlineSize}px ${fontFamily}`;
      headlineLines.slice().reverse().forEach((line) => { ctx.fillText(line, textX, y, maxTextWidth); y -= headlineSize * 1.14; });
    }
    ctx.fillStyle = composition.brand.accentColor;
    ctx.fillRect(pad, anchor === "top" ? blockHeight - 5 : targetHeight - blockHeight, Math.max(56, targetWidth * 0.08), Math.max(4, targetWidth * 0.004));
  }
  ctx.restore();
}

export function renderPreview(
  canvas: HTMLCanvasElement,
  source: RenderImage,
  placementId: PlacementId,
  settings: EffectivePlacementSettings,
  composition: SocialPackComposition,
  logo: RenderImage | null,
  maxSide = 1200,
) {
  const placement = PLACEMENT_BY_ID[placementId];
  const size = getPreviewDimensions(placement.width, placement.height, maxSide);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("This browser could not prepare a preview canvas.");
  drawComposition(ctx, size.width, size.height, source, placement.width, placement.height, settings, composition, logo);
}

export function hasVisualEdits(settings: EffectivePlacementSettings, composition: SocialPackComposition, logo: RenderImage | null) {
  return settings.headline.length > 0 || settings.caption.length > 0 || Boolean(logo);
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: OutputMimeType, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("The browser could not encode this image. Try fewer placements or a smaller source."));
      if (blob.type !== mimeType) return reject(new Error(`${mimeType.replace("image/", "").toUpperCase()} export is not available in this browser. Choose PNG or a supported format.`));
      resolve(blob);
    }, mimeType, quality);
  });
}

export async function renderVariantBlob(
  sourceAsset: SocialImageAsset,
  source: RenderImage,
  placementId: PlacementId,
  settings: EffectivePlacementSettings,
  composition: SocialPackComposition,
  logo: RenderImage | null,
  mimeType: OutputMimeType,
  quality: number,
) {
  const placement = PLACEMENT_BY_ID[placementId];
  if (
    sourceAsset.width === placement.width && sourceAsset.height === placement.height &&
    sourceAsset.mimeType === mimeType && settings.fit === "fit" && !hasVisualEdits(settings, composition, logo)
  ) return { blob: sourceAsset.blob, exactOriginal: true };

  if (placement.width * placement.height > MAX_OUTPUT_PIXELS) throw new Error("This placement exceeds the browser output-pixel limit.");
  const canvas = document.createElement("canvas");
  canvas.width = placement.width;
  canvas.height = placement.height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("This browser could not allocate the output canvas. Try fewer placements or a smaller source.");
  drawComposition(ctx, canvas.width, canvas.height, source, placement.width, placement.height, settings, composition, logo);
  const blob = await canvasToBlob(canvas, mimeType, quality);
  return { blob, exactOriginal: false };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function placementDimensions(id: PlacementId) {
  const placement = PLACEMENT_BY_ID[id];
  return `${placement.width} × ${placement.height}`;
}
