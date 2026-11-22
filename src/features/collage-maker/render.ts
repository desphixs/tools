import type { CollageCell, CollageComposition } from "./model";

export type LoadedImage = { image: CanvasImageSource; width: number; height: number };

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(Math.max(0, radius), width / 2, height / 2));
}

function drawGradient(ctx: CanvasRenderingContext2D, width: number, height: number, from: string, to: string, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  const length = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const cx = width / 2;
  const cy = height / 2;
  const dx = Math.cos(radians) * length / 2;
  const dy = Math.sin(radians) * length / 2;
  const gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function cellPath(ctx: CanvasRenderingContext2D, cell: CollageCell) {
  const x = -cell.width / 2;
  const y = -cell.height / 2;
  ctx.beginPath();
  if (cell.shape === "circle") ctx.ellipse(0, 0, cell.width / 2, cell.height / 2, 0, 0, Math.PI * 2);
  else if (cell.shape === "diamond") {
    ctx.moveTo(0, y);
    ctx.lineTo(cell.width / 2, 0);
    ctx.lineTo(0, cell.height / 2);
    ctx.lineTo(x, 0);
    ctx.closePath();
  } else if (cell.shape === "rounded") ctx.roundRect(x, y, cell.width, cell.height, Math.min(cell.cornerRadius, cell.width / 2, cell.height / 2));
  else ctx.rect(x, y, cell.width, cell.height);
}

function imageRect(image: LoadedImage, cell: CollageCell) {
  const scale = (cell.fit === "cover" ? Math.max(cell.width / image.width, cell.height / image.height) : Math.min(cell.width / image.width, cell.height / image.height)) * cell.cropZoom;
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: -cell.width / 2 + (cell.width - width) / 2 + (cell.cropX / 100) * cell.width, y: -cell.height / 2 + (cell.height - height) / 2 + (cell.cropY / 100) * cell.height, width, height };
}

function drawBackground(ctx: CanvasRenderingContext2D, composition: CollageComposition, images: Map<string, LoadedImage>) {
  const { width, height } = composition.canvas;
  const bg = composition.background;
  if (bg.type === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === "gradient") drawGradient(ctx, width, height, bg.gradientFrom, bg.gradientTo, bg.gradientAngle);
  else {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    const image = bg.imageId ? images.get(bg.imageId) : undefined;
    if (image) {
      const scale = (bg.imageFit === "cover" ? Math.max(width / image.width, height / image.height) : Math.min(width / image.width, height / image.height)) * bg.imageZoom;
      const w = image.width * scale;
      const h = image.height * scale;
      ctx.drawImage(image.image, (width - w) / 2 + (bg.imageX / 100) * width, (height - h) / 2 + (bg.imageY / 100) * height, w, h);
    }
  }
}

function drawCell(ctx: CanvasRenderingContext2D, cell: CollageCell, image: LoadedImage | undefined, selected: boolean, editable: boolean, selectionColor: string) {
  const cx = cell.x + cell.width / 2;
  const cy = cell.y + cell.height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((cell.rotation * Math.PI) / 180);
  cellPath(ctx, cell);
  if (!image && editable) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(75, 84, 112, 0.28)";
    ctx.lineWidth = 2;
    for (let x = -cell.width; x < cell.width * 2; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, -cell.height);
      ctx.lineTo(x + cell.height, cell.height);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.94)";
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(24, Math.max(11, Math.min(cell.width, cell.height) * 0.13)), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5f6473";
    ctx.font = `600 ${Math.max(16, Math.min(28, cell.width * 0.13))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+", 0, -1);
  }
  if (image) {
    if (cell.fit === "contain") {
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    cellPath(ctx, cell);
    ctx.clip();
    ctx.globalAlpha = cell.opacity / 100;
    const rect = imageRect(image, cell);
    ctx.drawImage(image.image, rect.x, rect.y, rect.width, rect.height);
  }
  if (cell.borderWidth > 0 && image) {
    cellPath(ctx, cell);
    ctx.strokeStyle = cell.borderColor;
    ctx.lineWidth = cell.borderWidth;
    ctx.globalAlpha = cell.opacity / 100;
    ctx.stroke();
  }
  if (selected && editable) {
    cellPath(ctx, cell);
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = Math.max(2, cell.width / 500);
    ctx.strokeStyle = selectionColor;
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    if (cell.shape === "rectangle" || cell.shape === "rounded") {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = selectionColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cell.width / 2, cell.height / 2, Math.max(8, Math.min(14, cell.width / 22)), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function renderComposition(canvas: HTMLCanvasElement, composition: CollageComposition, images: Map<string, LoadedImage>, selectedId: string | null = null, editable = true, matte?: string, selectionColor = "#7047eb") {
  const { width, height, radius } = composition.canvas;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas rendering is not available in this browser.");
  ctx.clearRect(0, 0, width, height);
  if (matte) { ctx.fillStyle = matte; ctx.fillRect(0, 0, width, height); }
  ctx.save();
  roundedRect(ctx, 0, 0, width, height, radius);
  ctx.clip();
  drawBackground(ctx, composition, images);
  if (composition.layout.type === "diagonal") {
    const inset = Math.min(composition.layout.padding, Math.min(width, height) * 0.45);
    ctx.save();
    ctx.beginPath();
    ctx.rect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.clip();
    for (const cell of composition.cells) drawCell(ctx, cell, cell.assetId ? images.get(cell.assetId) : undefined, cell.id === selectedId, editable, selectionColor);
    ctx.restore();
  } else {
    for (const cell of composition.cells) drawCell(ctx, cell, cell.assetId ? images.get(cell.assetId) : undefined, cell.id === selectedId, editable, selectionColor);
  }
  ctx.restore();
}

export function hitTestCell(cell: CollageCell, x: number, y: number) {
  const radians = (-cell.rotation * Math.PI) / 180;
  const cx = cell.x + cell.width / 2;
  const cy = cell.y + cell.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const localX = dx * Math.cos(radians) - dy * Math.sin(radians);
  const localY = dx * Math.sin(radians) + dy * Math.cos(radians);
  const halfWidth = cell.width / 2;
  const halfHeight = cell.height / 2;
  let inside = Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
  if (inside && cell.shape === "circle") inside = (localX / halfWidth) ** 2 + (localY / halfHeight) ** 2 <= 1;
  if (inside && cell.shape === "diamond") inside = Math.abs(localX) / halfWidth + Math.abs(localY) / halfHeight <= 1;
  if (inside && cell.shape === "rounded") {
    const radius = Math.min(cell.cornerRadius, halfWidth, halfHeight);
    const qx = Math.max(Math.abs(localX) - (halfWidth - radius), 0);
    const qy = Math.max(Math.abs(localY) - (halfHeight - radius), 0);
    inside = qx * qx + qy * qy <= radius * radius;
  }
  const resize = (cell.shape === "rectangle" || cell.shape === "rounded") && localX > halfWidth - 34 && localY > halfHeight - 34;
  return { inside, resize };
}
