import { getScreenshotSpec, getSpecDimensions } from "./catalog";
import { resolveScreenStyle, type ElementTransform, type GalleryElement, type GalleryProject, type GalleryScreen, MAX_OUTPUT_PIXELS } from "./model";

export type LoadedScreenshot = { image: CanvasImageSource; width: number; height: number };
export type RenderedElement = { type: GalleryElement; centerX: number; centerY: number; width: number; height: number; scale: number; rotation: number };
export type GalleryRenderResult = { textOverflow: boolean; unsafeElements: GalleryElement[]; elements: RenderedElement[] };

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function fillBackground(ctx: CanvasRenderingContext2D, width: number, height: number, project: GalleryProject, screen: GalleryScreen, backgroundImage?: LoadedScreenshot) {
  const style = resolveScreenStyle(project, screen);
  if (style.background === "image" && backgroundImage) {
    const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height);
    const imageWidth = backgroundImage.width * scale;
    const imageHeight = backgroundImage.height * scale;
    ctx.drawImage(backgroundImage.image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
    return;
  }
  if (style.background === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, style.backgroundStart);
    gradient.addColorStop(1, style.backgroundEnd);
    ctx.fillStyle = gradient;
  } else ctx.fillStyle = style.backgroundStart;
  ctx.fillRect(0, 0, width, height);
}

function drawDecoration(ctx: CanvasRenderingContext2D, project: GalleryProject, screen: GalleryScreen, width: number, height: number) {
  const style = resolveScreenStyle(project, screen);
  const short = Math.min(width, height);
  ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = style.decorationColor;
  if (style.decoration === "orb") {
    ctx.beginPath(); ctx.arc(width * 0.94, height * 0.18, short * 0.22, 0, Math.PI * 2); ctx.fill();
  } else if (style.decoration === "rule") {
    roundedRect(ctx, width * 0.43, height * 0.265, width * 0.14, Math.max(3, short * 0.004), short * 0.002);
    ctx.fill();
  }
  ctx.restore();
}

function fitRect(source: LoadedScreenshot, x: number, y: number, width: number, height: number, fit: GalleryScreen["fit"], zoom: number, focalX: number, focalY: number) {
  const scale = (fit === "cover" ? Math.max(width / source.width, height / source.height) : Math.min(width / source.width, height / source.height)) * zoom;
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  const horizontalSlack = width - drawWidth;
  const verticalSlack = height - drawHeight;
  return {
    x: x + horizontalSlack / 2 + horizontalSlack * (focalX / 200),
    y: y + verticalSlack / 2 + verticalSlack * (focalY / 200),
    width: drawWidth,
    height: drawHeight,
  };
}

function drawFittedImage(ctx: CanvasRenderingContext2D, source: LoadedScreenshot, screen: GalleryScreen, rect: { x: number; y: number; width: number; height: number }, radius: number) {
  ctx.save();
  roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, radius);
  ctx.clip();
  if (screen.fit === "contain") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
  const fitted = fitRect(source, rect.x, rect.y, rect.width, rect.height, screen.fit, screen.zoom, screen.focalX, screen.focalY);
  ctx.drawImage(source.image, fitted.x, fitted.y, fitted.width, fitted.height);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines && clipped.length) {
    let last = clipped[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    clipped[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return { lines: clipped, overflow: lines.length > maxLines || lines.some((item) => ctx.measureText(item).width > maxWidth) };
}

function elementGeometry(type: GalleryElement, rect: { x: number; y: number; width: number; height: number }, transform: ElementTransform | undefined, canvasWidth: number, canvasHeight: number): RenderedElement {
  const scale = transform?.scale ?? 1;
  return {
    type,
    centerX: transform?.centerX ?? (rect.x + rect.width / 2) / canvasWidth * 100,
    centerY: transform?.centerY ?? (rect.y + rect.height / 2) / canvasHeight * 100,
    width: rect.width * scale,
    height: rect.height * scale,
    scale,
    rotation: transform?.rotation ?? 0,
  };
}

function withElementTransform(ctx: CanvasRenderingContext2D, geometry: RenderedElement, canvasWidth: number, canvasHeight: number, draw: () => void) {
  ctx.save();
  ctx.translate(geometry.centerX / 100 * canvasWidth, geometry.centerY / 100 * canvasHeight);
  ctx.rotate(geometry.rotation * Math.PI / 180);
  ctx.scale(geometry.scale, geometry.scale);
  draw();
  ctx.restore();
}

function drawTextElement(ctx: CanvasRenderingContext2D, text: string, font: string, color: string, alignment: GalleryProject["style"]["alignment"], fontSize: number, lineHeight: number, lines: string[], maxWidth: number, rect: { x: number; y: number; width: number; height: number }, type: "headline" | "subtitle", transform: ElementTransform | undefined, canvasWidth: number, canvasHeight: number) {
  if (!text.trim() || !lines.length) return null;
  const geometry = elementGeometry(type, rect, transform, canvasWidth, canvasHeight);
  const anchorX = alignment === "left" ? -rect.width / 2 : alignment === "right" ? rect.width / 2 : 0;
  withElementTransform(ctx, geometry, canvasWidth, canvasHeight, () => {
    ctx.fillStyle = color;
    ctx.globalAlpha = type === "subtitle" ? 0.82 : 1;
    ctx.textAlign = alignment;
    ctx.textBaseline = "top";
    ctx.font = `${type === "headline" ? "700" : "400"} ${fontSize}px ${font}`;
    lines.forEach((line, index) => ctx.fillText(line, anchorX, -rect.height / 2 + index * lineHeight, maxWidth));
  });
  return geometry;
}

function drawCopy(ctx: CanvasRenderingContext2D, project: GalleryProject, screen: GalleryScreen, canvasWidth: number, top: number, areaWidth: number, maxLines = 2) {
  const style = resolveScreenStyle(project, screen);
  const ratio = Math.min(canvasWidth, ctx.canvas.height) / 1179;
  const left = (canvasWidth - areaWidth) / 2;
  const titleSize = style.fontSize * ratio;
  const font = style.font === "serif" ? "Georgia, serif" : style.font === "mono" ? "ui-monospace, monospace" : "system-ui, sans-serif";
  ctx.font = `700 ${titleSize}px ${font}`;
  const title = wrapText(ctx, style.title, areaWidth, maxLines);
  const lineHeight = titleSize * style.lineSpacing;
  const anchorX = style.alignment === "left" ? left : style.alignment === "right" ? left + areaWidth : canvasWidth / 2;
  const titleWidth = Math.max(1, ...title.lines.map((line) => ctx.measureText(line).width));
  const titleRect = {
    x: style.alignment === "left" ? anchorX : style.alignment === "right" ? anchorX - titleWidth : anchorX - titleWidth / 2,
    y: top,
    width: titleWidth,
    height: Math.max(titleSize, title.lines.length * lineHeight),
  };
  const titleElement = drawTextElement(ctx, style.title, font, style.textColor, style.alignment, titleSize, lineHeight, title.lines, areaWidth, titleRect, "headline", screen.elementTransforms?.headline, canvasWidth, ctx.canvas.height);
  const subtitleSize = Math.max(18, titleSize * 0.37);
  const subtitleLineHeight = titleSize * 0.48;
  ctx.font = `400 ${subtitleSize}px ${font}`;
  const subtitle = wrapText(ctx, style.subtitle, areaWidth, 2);
  const subtitleTop = top + Math.max(title.lines.length, 1) * lineHeight + titleSize * 0.24;
  const subtitleWidth = Math.max(1, ...subtitle.lines.map((line) => ctx.measureText(line).width));
  const subtitleRect = {
    x: style.alignment === "left" ? anchorX : style.alignment === "right" ? anchorX - subtitleWidth : anchorX - subtitleWidth / 2,
    y: subtitleTop,
    width: subtitleWidth,
    height: Math.max(subtitleSize, subtitle.lines.length * subtitleLineHeight),
  };
  const subtitleElement = drawTextElement(ctx, style.subtitle, font, style.textColor, style.alignment, subtitleSize, subtitleLineHeight, subtitle.lines, areaWidth, subtitleRect, "subtitle", screen.elementTransforms?.subtitle, canvasWidth, ctx.canvas.height);
  return { overflow: title.overflow || subtitle.overflow, top: subtitleTop + subtitle.lines.length * subtitleLineHeight, elements: [titleElement, subtitleElement].filter((element): element is RenderedElement => !!element) };
}

function framePath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  roundedRect(ctx, x, y, width, height, radius);
}

function drawPhone(ctx: CanvasRenderingContext2D, image: LoadedScreenshot, screen: GalleryScreen, rect: { x: number; y: number; width: number; height: number }) {
  const { x, y, width, height } = rect;
  const radius = Math.min(width, height) * 0.14;
  ctx.save();
  ctx.shadowColor = "rgba(30, 25, 48, .22)";
  ctx.shadowBlur = Math.min(width, height) * 0.055;
  ctx.shadowOffsetY = Math.min(width, height) * 0.025;
  framePath(ctx, x, y, width, height, radius);
  ctx.fillStyle = "#17171c";
  ctx.fill();
  ctx.shadowColor = "transparent";
  const inset = Math.min(width, height) * 0.035;
  const display = { x: x + inset, y: y + inset, width: width - inset * 2, height: height - inset * 2 };
  framePath(ctx, display.x, display.y, display.width, display.height, radius * 0.78);
  ctx.save(); ctx.clip(); ctx.fillStyle = "#fff"; ctx.fillRect(display.x, display.y, display.width, display.height);
  drawFittedImage(ctx, image, screen, display, radius * 0.78); ctx.restore();
  // Original, generic speaker / camera detail; no Apple logo or product mark.
  if (height >= width) {
    ctx.fillStyle = "#17171c";
    roundedRect(ctx, x + width * 0.4, y + inset, width * 0.2, inset * 0.52, inset * 0.26);
    ctx.fill();
  }
  ctx.restore();
}

function drawTablet(ctx: CanvasRenderingContext2D, image: LoadedScreenshot, screen: GalleryScreen, rect: { x: number; y: number; width: number; height: number }) {
  const { x, y, width, height } = rect;
  const radius = Math.min(width, height) * 0.07;
  ctx.save();
  ctx.shadowColor = "rgba(30, 25, 48, .22)";
  ctx.shadowBlur = Math.min(width, height) * 0.055;
  ctx.shadowOffsetY = Math.min(width, height) * 0.025;
  framePath(ctx, x, y, width, height, radius); ctx.fillStyle = "#17171c"; ctx.fill();
  ctx.shadowColor = "transparent";
  const inset = Math.min(width, height) * 0.025;
  const display = { x: x + inset, y: y + inset, width: width - inset * 2, height: height - inset * 2 };
  framePath(ctx, display.x, display.y, display.width, display.height, radius * 0.78);
  ctx.save(); ctx.clip(); ctx.fillStyle = "#fff"; ctx.fillRect(display.x, display.y, display.width, display.height);
  drawFittedImage(ctx, image, screen, display, radius * 0.78); ctx.restore(); ctx.restore();
}

export function drawGalleryScreen(ctx: CanvasRenderingContext2D, project: GalleryProject, screen: GalleryScreen, image: LoadedScreenshot, width: number, height: number, backgroundImage?: LoadedScreenshot): GalleryRenderResult {
  if (width * height > MAX_OUTPUT_PIXELS) throw new Error("This output exceeds the browser-safe pixel limit.");
  const spec = getScreenshotSpec(project.specId);
  if (!spec) throw new Error("The selected App Store size is no longer available in this specification catalog.");
  const expected = getSpecDimensions(spec, project.orientation);
  if (width !== expected.width || height !== expected.height) throw new Error("Preview and export dimensions must match the selected App Store size.");
  ctx.clearRect(0, 0, width, height);
  fillBackground(ctx, width, height, project, screen, backgroundImage);
  if (project.layout !== "full-bleed") drawDecoration(ctx, project, screen, width, height);
  const landscape = width > height;
  const short = Math.min(width, height);
  const copyTop = Math.max(short * 0.075, height * 0.055);
  const isPhone = project.family === "iphone";
  let textResult: { overflow: boolean; top: number; elements: RenderedElement[] } = { overflow: false, top: short * 0.2, elements: [] };
  const elements: RenderedElement[] = [];

  if (project.layout === "full-bleed") {
    drawFittedImage(ctx, image, screen, { x: 0, y: 0, width, height }, 0);
    const overlay = ctx.createLinearGradient(0, 0, 0, height * 0.48);
    const color = resolveScreenStyle(project, screen).textColor;
    const channels = color.match(/[0-9a-f]{2}/gi)?.map((value) => Number.parseInt(value, 16)) ?? [25, 23, 42];
    const brightness = (channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114) / 255;
    overlay.addColorStop(0, brightness > 0.68 ? "rgba(0,0,0,.58)" : "rgba(255,255,255,.88)");
    overlay.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = overlay; ctx.fillRect(0, 0, width, height * 0.48);
    drawDecoration(ctx, project, screen, width, height);
    textResult = drawCopy(ctx, project, screen, width, copyTop, width * 0.82, 2);
    elements.push(...textResult.elements);
  } else if (project.layout === "caption-led") {
    const margin = short * 0.075;
    const textAreaWidth = width - margin * 2;
    textResult = drawCopy(ctx, project, screen, width, copyTop, textAreaWidth, 2);
    elements.push(...textResult.elements);
    const imageTop = Math.max(textResult.top + short * 0.055, height * (landscape ? 0.33 : 0.31));
    const imageRect = { x: short * 0.07, y: imageTop, width: width - short * 0.14, height: height - imageTop - short * 0.065 };
    const screenshotElement = elementGeometry("screenshot", imageRect, screen.elementTransforms?.screenshot, width, height);
    withElementTransform(ctx, screenshotElement, width, height, () => drawFittedImage(ctx, image, screen, { x: -imageRect.width / 2, y: -imageRect.height / 2, width: imageRect.width, height: imageRect.height }, short * 0.035));
    elements.push(screenshotElement);
  } else {
    const margin = short * 0.075;
    const textAreaWidth = width - margin * 2;
    textResult = drawCopy(ctx, project, screen, width, copyTop, textAreaWidth, 2);
    const top = Math.max(textResult.top + short * 0.055, height * (landscape ? 0.35 : 0.31));
    const availableHeight = height - top - short * 0.045;
    const availableWidth = width * (isPhone ? 0.54 : 0.84);
    let frameWidth: number;
    let frameHeight: number;
    if (isPhone) {
      if (landscape) { frameWidth = Math.min(availableWidth, availableHeight * 2.12); frameHeight = frameWidth / 2.12; }
      else { frameHeight = Math.min(availableHeight, availableWidth / 0.485); frameWidth = frameHeight * 0.485; }
    } else {
      if (landscape) { frameWidth = Math.min(availableWidth, availableHeight * 1.43); frameHeight = frameWidth / 1.43; }
      else { frameWidth = Math.min(availableWidth, availableHeight * 0.74); frameHeight = frameWidth / 0.74; }
    }
    const frameRect = { x: (width - frameWidth) / 2, y: top + Math.max(0, (availableHeight - frameHeight) / 2), width: frameWidth, height: frameHeight };
    const deviceElement = elementGeometry("device", frameRect, screen.elementTransforms?.device, width, height);
    withElementTransform(ctx, deviceElement, width, height, () => {
      const localRect = { x: -frameRect.width / 2, y: -frameRect.height / 2, width: frameRect.width, height: frameRect.height };
      if (isPhone) drawPhone(ctx, image, screen, localRect); else drawTablet(ctx, image, screen, localRect);
    });
    elements.push(...textResult.elements, deviceElement);
  }
  const unsafeElements = elements.filter((element) => {
    const radians = element.rotation * Math.PI / 180;
    const halfWidth = element.width / 2; const halfHeight = element.height / 2;
    const extentX = Math.abs(Math.cos(radians)) * halfWidth + Math.abs(Math.sin(radians)) * halfHeight;
    const extentY = Math.abs(Math.sin(radians)) * halfWidth + Math.abs(Math.cos(radians)) * halfHeight;
    const centerX = element.centerX / 100 * width; const centerY = element.centerY / 100 * height;
    return centerX - extentX < width * 0.06 || centerX + extentX > width * 0.94 || centerY - extentY < height * 0.045 || centerY + extentY > height * 0.955;
  }).map((element) => element.type);
  return { textOverflow: textResult.overflow, unsafeElements, elements };
}

export async function createGalleryBlob(project: GalleryProject, screen: GalleryScreen, image: LoadedScreenshot, backgroundImage?: LoadedScreenshot): Promise<Blob> {
  const spec = getScreenshotSpec(project.specId);
  if (!spec) throw new Error("The selected App Store display size is invalid.");
  const { width, height } = getSpecDimensions(spec, project.orientation);
  if (width * height > MAX_OUTPUT_PIXELS) throw new Error("The selected target is too large for a safe browser export.");
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("This browser could not create an export canvas.");
  drawGalleryScreen(ctx, project, screen, image, width, height, backgroundImage);
  const mimeType = project.format === "jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, project.quality));
  canvas.width = 0; canvas.height = 0;
  if (!blob) throw new Error("The browser could not encode this screenshot. Try JPEG or a smaller source image.");
  if (blob.type && blob.type !== mimeType) throw new Error("This browser did not support the selected export format.");
  return blob;
}

export function inspectCrop(screen: GalleryScreen, targetWidth: number, targetHeight: number) {
  if (screen.zoom > 1.001 || Math.abs(screen.focalX) > 0.1 || Math.abs(screen.focalY) > 0.1) return true;
  const sourceRatio = screen.width / screen.height;
  const targetRatio = targetWidth / targetHeight;
  if (screen.fit === "contain") return false;
  return Math.abs(sourceRatio - targetRatio) > 0.015 || screen.zoom > 1.001 || Math.abs(screen.focalX) > 0.1 || Math.abs(screen.focalY) > 0.1;
}

export function inspectResolution(screen: GalleryScreen, targetWidth: number, targetHeight: number) {
  const sourceLong = Math.max(screen.width, screen.height);
  const targetLong = Math.max(targetWidth, targetHeight);
  return sourceLong < targetLong;
}
