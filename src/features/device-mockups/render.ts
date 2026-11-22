import type { MockupComposition, MockupTemplate } from "./model";

export type LoadedMockupImage = {
  image: CanvasImageSource;
  width: number;
  height: number;
};

export function loadMockupImage(src: string): Promise<LoadedMockupImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("This mockup image could not be loaded."));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

function solveHomography(from: [number, number][], to: [number, number][]) {
  const equations: number[][] = [];
  for (let index = 0; index < 4; index += 1) {
    const [x, y] = from[index];
    const [u, v] = to[index];
    equations.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    equations.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }

  for (let column = 0; column < 8; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 8; row += 1) {
      if (Math.abs(equations[row][column]) > Math.abs(equations[pivot][column])) pivot = row;
    }
    if (Math.abs(equations[pivot][column]) < 1e-10) throw new Error("The screen area has invalid perspective points.");
    [equations[column], equations[pivot]] = [equations[pivot], equations[column]];
    const divisor = equations[column][column];
    for (let cell = column; cell <= 8; cell += 1) equations[column][cell] /= divisor;
    for (let row = 0; row < 8; row += 1) {
      if (row === column) continue;
      const factor = equations[row][column];
      for (let cell = column; cell <= 8; cell += 1) equations[row][cell] -= factor * equations[column][cell];
    }
  }
  return [
    equations[0][8], equations[1][8], equations[2][8],
    equations[3][8], equations[4][8], equations[5][8],
    equations[6][8], equations[7][8], 1,
  ];
}

function sampleBilinear(source: Uint8ClampedArray, width: number, height: number, x: number, y: number, output: Uint8ClampedArray, offset: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const topLeft = (y0 * width + x0) * 4;
  const topRight = (y0 * width + x1) * 4;
  const bottomLeft = (y1 * width + x0) * 4;
  const bottomRight = (y1 * width + x1) * 4;
  const topWeight = 1 - fy;
  const leftWeight = 1 - fx;
  const topLeftWeight = leftWeight * topWeight;
  const topRightWeight = fx * topWeight;
  const bottomLeftWeight = leftWeight * fy;
  const bottomRightWeight = fx * fy;
  const alphaTopLeft = source[topLeft + 3] / 255;
  const alphaTopRight = source[topRight + 3] / 255;
  const alphaBottomLeft = source[bottomLeft + 3] / 255;
  const alphaBottomRight = source[bottomRight + 3] / 255;
  const alpha = alphaTopLeft * topLeftWeight + alphaTopRight * topRightWeight +
    alphaBottomLeft * bottomLeftWeight + alphaBottomRight * bottomRightWeight;
  output[offset + 3] = alpha * 255;
  output[offset] = alpha > 0
    ? (source[topLeft] * alphaTopLeft * topLeftWeight + source[topRight] * alphaTopRight * topRightWeight +
      source[bottomLeft] * alphaBottomLeft * bottomLeftWeight + source[bottomRight] * alphaBottomRight * bottomRightWeight) / alpha
    : 0;
  output[offset + 1] = alpha > 0
    ? (source[topLeft + 1] * alphaTopLeft * topLeftWeight + source[topRight + 1] * alphaTopRight * topRightWeight +
      source[bottomLeft + 1] * alphaBottomLeft * bottomLeftWeight + source[bottomRight + 1] * alphaBottomRight * bottomRightWeight) / alpha
    : 0;
  output[offset + 2] = alpha > 0
    ? (source[topLeft + 2] * alphaTopLeft * topLeftWeight + source[topRight + 2] * alphaTopRight * topRightWeight +
      source[bottomLeft + 2] * alphaBottomLeft * bottomLeftWeight + source[bottomRight + 2] * alphaBottomRight * bottomRightWeight) / alpha
    : 0;
}

function makeScreenSource(image: LoadedMockupImage, template: MockupTemplate, composition: MockupComposition, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image rendering is not available in this browser.");

  const radius = Math.min(canvas.width, canvas.height) * template.screenCornerRadius;
  context.beginPath();
  context.moveTo(radius, 0);
  context.lineTo(canvas.width - radius, 0);
  context.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
  context.lineTo(canvas.width, canvas.height - radius);
  context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
  context.lineTo(radius, canvas.height);
  context.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
  context.lineTo(0, radius);
  context.quadraticCurveTo(0, 0, radius, 0);
  context.closePath();
  context.save();
  context.clip();
  context.fillStyle = "#f4f4f2";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = (composition.fit === "fill"
    ? Math.max(canvas.width / image.width, canvas.height / image.height)
    : Math.min(canvas.width / image.width, canvas.height / image.height)) * composition.zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (canvas.width - drawWidth) / 2 + (composition.panX / 100) * canvas.width;
  const y = (canvas.height - drawHeight) / 2 + (composition.panY / 100) * canvas.height;
  context.drawImage(image.image, x, y, drawWidth, drawHeight);
  context.restore();
  return canvas;
}

function warpIntoScene(ctx: CanvasRenderingContext2D, image: LoadedMockupImage, template: MockupTemplate, composition: MockupComposition) {
  const destination = template.screenCorners.map((point) => [point.x * ctx.canvas.width, point.y * ctx.canvas.height] as [number, number]);
  const [topLeft, topRight, bottomRight, bottomLeft] = destination;
  const topWidth = Math.hypot(topRight[0] - topLeft[0], topRight[1] - topLeft[1]);
  const bottomWidth = Math.hypot(bottomRight[0] - bottomLeft[0], bottomRight[1] - bottomLeft[1]);
  const sourceWidth = Math.max(1, Math.round((topWidth + bottomWidth) / 2));
  const sourceHeight = Math.max(1, Math.round(sourceWidth / template.screenAspectRatio));
  const source = makeScreenSource(image, template, composition, sourceWidth, sourceHeight);
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new Error("Image rendering is not available in this browser.");

  const minX = Math.max(0, Math.floor(Math.min(...destination.map(([x]) => x))));
  const minY = Math.max(0, Math.floor(Math.min(...destination.map(([, y]) => y))));
  const maxX = Math.min(ctx.canvas.width, Math.ceil(Math.max(...destination.map(([x]) => x))));
  const maxY = Math.min(ctx.canvas.height, Math.ceil(Math.max(...destination.map(([, y]) => y))));
  if (maxX <= minX || maxY <= minY) return;

  const sourceCorners: [number, number][] = [[0, 0], [sourceWidth, 0], [sourceWidth, sourceHeight], [0, sourceHeight]];
  const inverse = solveHomography(destination, sourceCorners);
  const sourcePixels = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;
  const warpedCanvas = document.createElement("canvas");
  warpedCanvas.width = maxX - minX;
  warpedCanvas.height = maxY - minY;
  const warpedContext = warpedCanvas.getContext("2d");
  if (!warpedContext) throw new Error("Image rendering is not available in this browser.");
  const warped = warpedContext.createImageData(maxX - minX, maxY - minY);
  const output = warped.data;
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const denominator = inverse[6] * px + inverse[7] * py + inverse[8];
      if (Math.abs(denominator) < 1e-10) continue;
      const sourceX = (inverse[0] * px + inverse[1] * py + inverse[2]) / denominator;
      const sourceY = (inverse[3] * px + inverse[4] * py + inverse[5]) / denominator;
      if (sourceX < 0 || sourceY < 0 || sourceX >= sourceWidth || sourceY >= sourceHeight) continue;
      const offset = ((y - minY) * (maxX - minX) + x - minX) * 4;
      sampleBilinear(sourcePixels, sourceWidth, sourceHeight, sourceX, sourceY, output, offset);
    }
  }
  warpedContext.putImageData(warped, 0, 0);
  ctx.drawImage(warpedCanvas, minX, minY);
}

function screenGuide(ctx: CanvasRenderingContext2D, template: MockupTemplate) {
  ctx.save();
  ctx.beginPath();
  template.screenCorners.forEach((point, index) => {
    const x = point.x * ctx.canvas.width;
    const y = point.y * ctx.canvas.height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = "rgba(22,18,31,0.82)";
  ctx.lineWidth = Math.max(3, ctx.canvas.width / 500);
  ctx.setLineDash([8 * (ctx.canvas.width / template.sceneWidth), 5 * (ctx.canvas.width / template.sceneWidth)]);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = Math.max(1, ctx.canvas.width / 1400);
  ctx.stroke();
  ctx.restore();
}

export function renderMockup(
  canvas: HTMLCanvasElement,
  template: MockupTemplate,
  scene: LoadedMockupImage,
  screenshot: LoadedMockupImage | null,
  composition: MockupComposition,
  showGuide = true,
  outputScale: number = 1,
) {
  const width = Math.max(1, Math.round(template.sceneWidth * outputScale));
  const height = Math.max(1, Math.round(template.sceneHeight * outputScale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
  if (!ctx) throw new Error("Canvas rendering is not available in this browser.");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(scene.image, 0, 0, width, height);
  if (screenshot) {
    warpIntoScene(ctx, screenshot, template, composition);
  }
  if (showGuide) screenGuide(ctx, template);
}

export function screenBounds(template: MockupTemplate) {
  const xs = template.screenCorners.map((point) => point.x);
  const ys = template.screenCorners.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}
