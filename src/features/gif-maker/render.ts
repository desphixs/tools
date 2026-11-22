import { getAspectRatio, getOutputDimensions, type Dimensions, type GifSettings } from "./model";

export function createFrameCanvas(source: Dimensions, settings: GifSettings) {
  const dimensions = getOutputDimensions(source, settings);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  return { canvas, dimensions };
}

export function drawMediaFrame(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceDimensions: Dimensions,
  settings: GifSettings,
) {
  const { width, height } = context.canvas;
  const sourceWidth = Math.max(1, sourceDimensions.width);
  const sourceHeight = Math.max(1, sourceDimensions.height);
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  if (settings.aspect === "original") {
    const scale = Math.min(width / sourceWidth, height / sourceHeight, 1);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    context.restore();
    return;
  }

  const targetRatio = getAspectRatio(settings.aspect, sourceWidth, sourceHeight);
  if (settings.fit === "cover") {
    let cropX = 0;
    let cropY = 0;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    const sourceRatio = sourceWidth / sourceHeight;
    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      cropX = (sourceWidth - cropWidth) / 2;
    } else {
      cropHeight = sourceWidth / targetRatio;
      cropY = (sourceHeight - cropHeight) / 2;
    }
    context.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, width, height);
  } else {
    const scale = Math.min(width / sourceWidth, height / sourceHeight, 1);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;
    context.drawImage(source, 0, 0, sourceWidth, sourceHeight, x, y, drawWidth, drawHeight);
  }
  context.restore();
}

