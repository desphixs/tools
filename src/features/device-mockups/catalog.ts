import type { MockupCategory, MockupTemplate, NormalizedPoint } from "./model";

const catalogEntries: MockupTemplate[] = [
  {
    id: "laptop-desk-01",
    version: 1,
    name: "Laptop at a desk",
    category: "laptop",
    description: "Silver laptop in a bright home office.",
    previewSrc: "/mockups/laptop-desk-01/preview.webp",
    sceneSrc: "/mockups/laptop-desk-01/scene.webp",
    sceneWidth: 1536,
    sceneHeight: 1024,
    screenCorners: [
      { x: 0.219, y: 0.139 },
      { x: 0.777, y: 0.139 },
      { x: 0.777, y: 0.635 },
      { x: 0.219, y: 0.635 },
    ],
    screenAspectRatio: 1.69,
    screenCornerRadius: 0.02,
  },
  {
    id: "monitor-room-01",
    version: 1,
    name: "Monitor in a quiet workspace",
    category: "monitor",
    description: "Desktop monitor with soft rose tones.",
    previewSrc: "/mockups/monitor-room-01/preview.webp",
    sceneSrc: "/mockups/monitor-room-01/scene.webp",
    sceneWidth: 1536,
    sceneHeight: 1024,
    screenCorners: [
      { x: 0.165, y: 0.072 },
      { x: 0.824, y: 0.132 },
      { x: 0.829, y: 0.679 },
      { x: 0.169, y: 0.728 },
    ],
    screenAspectRatio: 1.66,
    screenCornerRadius: 0.014,
  },
];

export type MockupCatalog = {
  list(): Promise<readonly MockupTemplate[]>;
  get(id: string): Promise<MockupTemplate | null>;
};

function validPoint(point: NormalizedPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

function validScreenQuad(points: MockupTemplate["screenCorners"]) {
  if (!points.every(validPoint)) return false;

  let direction = 0;
  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const afterNext = points[(index + 2) % points.length];
    const cross = (next.x - current.x) * (afterNext.y - next.y) - (next.y - current.y) * (afterNext.x - next.x);
    if (Math.abs(cross) < 1e-6) return false;
    if (direction && Math.sign(cross) !== direction) return false;
    direction = Math.sign(cross);
    doubledArea += current.x * next.y - next.x * current.y;
  }

  const topY = (points[0].y + points[1].y) / 2;
  const bottomY = (points[2].y + points[3].y) / 2;
  const leftX = (points[0].x + points[3].x) / 2;
  const rightX = (points[1].x + points[2].x) / 2;
  return Math.abs(doubledArea) > 1e-4 && topY < bottomY && leftX < rightX;
}

function validAssetSource(source: string) {
  if (source.startsWith("/mockups/") && !source.split("/").includes("..")) return true;
  try {
    const url = new URL(source);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateTemplate(template: MockupTemplate) {
  return Boolean(template.id && /^[a-z0-9-]+$/.test(template.id) && template.version > 0 && template.name &&
    validAssetSource(template.previewSrc) && validAssetSource(template.sceneSrc) &&
    Number.isInteger(template.sceneWidth) && template.sceneWidth > 0 &&
    Number.isInteger(template.sceneHeight) && template.sceneHeight > 0 &&
    Number.isFinite(template.screenAspectRatio) && template.screenAspectRatio > 0 &&
    Number.isFinite(template.screenCornerRadius) && template.screenCornerRadius >= 0 && template.screenCornerRadius <= 0.08 &&
    validScreenQuad(template.screenCorners));
}

const bundledCatalog: MockupCatalog = {
  async list() {
    return catalogEntries.filter(validateTemplate);
  },
  async get(id) {
    return catalogEntries.find((template) => template.id === id && validateTemplate(template)) ?? null;
  },
};

export function listMockupTemplates() {
  return bundledCatalog.list();
}

export function getMockupTemplate(id: string) {
  return bundledCatalog.get(id);
}

export function getMockupCategories(templates: readonly MockupTemplate[]): MockupCategory[] {
  return [...new Set(templates.map((template) => template.category))];
}
