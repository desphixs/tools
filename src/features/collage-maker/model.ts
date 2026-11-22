export type CollageAsset = {
  id: string;
  blob: Blob;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  updatedAt: number;
};

export type CellShape = "rectangle" | "rounded" | "circle" | "diamond";

export type CollageCell = {
  id: string;
  assetId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: CellShape;
  cornerRadius: number;
  fit: "cover" | "contain";
  cropZoom: number;
  cropX: number;
  cropY: number;
  opacity: number;
  borderWidth: number;
  borderColor: string;
};

export type CollageComposition = {
  version: 1;
  canvas: { width: number; height: number; radius: number };
  background: {
    type: "solid" | "gradient" | "image";
    color: string;
    gradientFrom: string;
    gradientTo: string;
    gradientAngle: number;
    imageId: string | null;
    imageFit: "cover" | "contain";
    imageZoom: number;
    imageX: number;
    imageY: number;
  };
  layout: {
    type: "grid" | "diagonal";
    rows: number;
    columns: number;
    gap: number;
    padding: number;
  };
  cells: CollageCell[];
};

export type CollageProjectFile = {
  kind: "collage-maker-project";
  version: 1;
  createdAt: string;
  composition: CollageComposition;
  assets: Array<Omit<CollageAsset, "blob"> & { dataUrl: string }>;
};

export const MAX_CANVAS_DIMENSION = 4096;
export const MAX_CANVAS_PIXELS = 16_000_000;
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 120 * 1024 * 1024;
export const MAX_CELLS = 36;
export const MAX_SOURCE_DIMENSION = 16_000;
export const MAX_SOURCE_PIXELS = 32_000_000;

export function createCell(index: number, x: number, y: number, width: number, height: number, id = crypto.randomUUID()): CollageCell {
  return {
    id, assetId: null, x, y, width, height, rotation: 0,
    shape: "rounded", cornerRadius: Math.min(24, Math.max(0, Math.min(width, height) * 0.08)),
    fit: "cover", cropZoom: 1, cropX: 0, cropY: 0, opacity: 100,
    borderWidth: 0, borderColor: "#ffffff",
  };
}

export function createDefaultComposition(): CollageComposition {
  const composition: CollageComposition = {
    version: 1,
    canvas: { width: 1200, height: 675, radius: 0 },
    background: { type: "solid", color: "#b9f1c2", gradientFrom: "#e5dcff", gradientTo: "#f2ded4", gradientAngle: 135, imageId: null, imageFit: "cover", imageZoom: 1, imageX: 0, imageY: 0 },
    layout: { type: "grid", rows: 2, columns: 4, gap: 28, padding: 72 },
    cells: [],
  };
  composition.cells = createGridCells(composition, 2, 4).map((cell, index) => ({ ...cell, id: `cell-${index + 1}` }));
  return composition;
}

export function createGridCells(composition: CollageComposition, rows: number, columns: number, previous = composition.cells): CollageCell[] {
  rows = Math.max(1, Math.min(6, Math.floor(rows)));
  columns = Math.max(1, Math.min(6, Math.floor(columns)));
  const { width, height } = composition.canvas;
  const { gap, padding } = composition.layout;
  const contentWidth = Math.max(40, width - padding * 2 - gap * (columns - 1));
  const contentHeight = Math.max(40, height - padding * 2 - gap * (rows - 1));
  const cellWidth = contentWidth / columns;
  const cellHeight = contentHeight / rows;
  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = padding + column * (cellWidth + gap);
    const y = padding + row * (cellHeight + gap);
    const existing = previous[index];
    return existing
      ? { ...existing, x, y, width: cellWidth, height: cellHeight, rotation: 0, cornerRadius: Math.min(existing.cornerRadius, Math.min(cellWidth, cellHeight) / 2) }
      : createCell(index, x, y, cellWidth, cellHeight, previous.length === 0 ? `cell-${index + 1}` : undefined);
  });
}

export function createDiagonalCells(composition: CollageComposition, count = 25, previous = composition.cells): CollageCell[] {
  const { width, height } = composition.canvas;
  const inset = Math.min(composition.layout.padding, Math.min(width, height) * 0.35);
  const side = Math.min(width - inset * 2, height - inset * 2) / 2.35;
  const spacing = side * Math.SQRT2 + composition.layout.gap;
  const total = Math.min(MAX_CELLS, Math.max(1, count));
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  const startX = width / 2 - ((cols - 1) * spacing) / 2;
  const startY = height / 2 - ((rows - 1) * spacing) / 2;
  return Array.from({ length: total }, (_, index) => {
    const row = Math.floor(index / cols);
    const column = index % cols;
    const existing = previous[index];
    return {
      ...(existing ?? createCell(index, 0, 0, side, side)),
      x: startX + column * spacing - side / 2,
      y: startY + row * spacing - side / 2,
      width: side,
      height: side,
      rotation: 45,
      shape: "rectangle" as const,
      cornerRadius: 0,
    };
  });
}

export function validateComposition(value: unknown): value is CollageComposition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as CollageComposition;
  const num = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const color = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  const id = (v: unknown) => v === null || (typeof v === "string" && v.length > 0 && v.length <= 80);
  return data.version === 1 &&
    Number.isInteger(data.canvas?.width) && Number.isInteger(data.canvas?.height) &&
    data.canvas.width >= 200 && data.canvas.width <= MAX_CANVAS_DIMENSION && data.canvas.height >= 200 && data.canvas.height <= MAX_CANVAS_DIMENSION && data.canvas.width * data.canvas.height <= MAX_CANVAS_PIXELS &&
    num(data.canvas.radius, 0, 1000) &&
    ["solid", "gradient", "image"].includes(data.background?.type) && color(data.background.color) && color(data.background.gradientFrom) && color(data.background.gradientTo) && num(data.background.gradientAngle, 0, 360) && id(data.background.imageId) && ["cover", "contain"].includes(data.background.imageFit) && num(data.background.imageZoom, 0.25, 5) && num(data.background.imageX, -300, 300) && num(data.background.imageY, -300, 300) &&
    ["grid", "diagonal"].includes(data.layout?.type) && num(data.layout.rows, 1, 6) && num(data.layout.columns, 1, 6) && num(data.layout.gap, 0, 400) && num(data.layout.padding, 0, 1000) &&
    Array.isArray(data.cells) && data.cells.length > 0 && data.cells.length <= MAX_CELLS && data.cells.every((cell) =>
      Boolean(cell && typeof cell === "object") && typeof cell.id === "string" && cell.id.length > 0 && cell.id.length <= 80 && id(cell.assetId) &&
      num(cell.x, -MAX_CANVAS_DIMENSION * 2, MAX_CANVAS_DIMENSION * 3) && num(cell.y, -MAX_CANVAS_DIMENSION * 2, MAX_CANVAS_DIMENSION * 3) && num(cell.width, 24, MAX_CANVAS_DIMENSION * 2) && num(cell.height, 24, MAX_CANVAS_DIMENSION * 2) && num(cell.rotation, -360, 360) &&
      ["rectangle", "rounded", "circle", "diamond"].includes(cell.shape) && num(cell.cornerRadius, 0, 2000) && ["cover", "contain"].includes(cell.fit) && num(cell.cropZoom, 0.25, 5) && num(cell.cropX, -300, 300) && num(cell.cropY, -300, 300) && num(cell.opacity, 0, 100) && num(cell.borderWidth, 0, 100) && color(cell.borderColor));
}

export function validateProject(value: unknown): value is CollageProjectFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const project = value as CollageProjectFile;
  return project.kind === "collage-maker-project" && project.version === 1 && typeof project.createdAt === "string" && validateComposition(project.composition) && Array.isArray(project.assets) && project.assets.length <= MAX_CELLS + 1 && project.assets.every((asset) => Boolean(asset && typeof asset === "object") && typeof asset.id === "string" && typeof asset.name === "string" && typeof asset.mimeType === "string" && /^image\/(png|jpeg|webp)$/i.test(asset.mimeType) && typeof asset.dataUrl === "string" && asset.dataUrl.length <= MAX_PROJECT_BYTES * 1.4) && new Set(project.assets.map((asset) => asset.id)).size === project.assets.length;
}
