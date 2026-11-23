export const APP_STORE_SPEC_VERSION = "2026-11-23";

export type ScreenshotFamily = "iphone" | "ipad";
export type ScreenshotOrientation = "portrait" | "landscape";
export type ScreenshotRequirementId = "iphone-dynamic-island-medium" | "ipad-13-inch";

export type ScreenshotRequirement = {
  id: ScreenshotRequirementId;
  label: string;
  note: string;
  specIds: readonly string[];
};

export const SCREENSHOT_REQUIREMENTS: readonly ScreenshotRequirement[] = [
  {
    id: "iphone-dynamic-island-medium",
    label: "iPhone Dynamic Island (medium display)",
    note: "Required for iPhone apps; choose one of the listed sizes.",
    specIds: ["iphone-63-1179", "iphone-63-1206"],
  },
  {
    id: "ipad-13-inch",
    label: "iPad 13-inch display",
    note: "Required when the app supports iPadOS; choose one of the listed sizes.",
    specIds: ["ipad-13-2064", "ipad-13-2048"],
  },
];

export type ScreenshotSpec = {
  id: string;
  family: ScreenshotFamily;
  display: string;
  deviceExamples: string;
  width: number;
  height: number;
  requirementGroupId?: ScreenshotRequirementId;
  statusBar?: "with" | "without" | "optional";
};

// Dimensions are transcribed from Apple's Screenshot specifications, checked 2026-11-23.
// Keep alternate resolutions as separate entries so the selected export size is never implicit.
export const SCREENSHOT_SPECS: readonly ScreenshotSpec[] = [
  { id: "iphone-63-1179", family: "iphone", display: "iPhone · Dynamic Island medium", deviceExamples: "iPhone 18 Pro, 17, 16, 15, 14 Pro", width: 1179, height: 2556, requirementGroupId: "iphone-dynamic-island-medium" },
  { id: "iphone-63-1206", family: "iphone", display: "iPhone · Dynamic Island medium", deviceExamples: "iPhone 18 Pro, 17, 16, 15, 14 Pro", width: 1206, height: 2622, requirementGroupId: "iphone-dynamic-island-medium" },
  { id: "iphone-69-1260", family: "iphone", display: "iPhone · Dynamic Island large", deviceExamples: "iPhone Air", width: 1260, height: 2736 },
  { id: "iphone-69-1290", family: "iphone", display: "iPhone · Dynamic Island large", deviceExamples: "iPhone 17 Pro Max, 16 Pro Max", width: 1290, height: 2796 },
  { id: "iphone-69-1320", family: "iphone", display: "iPhone · Dynamic Island large", deviceExamples: "iPhone 18 Pro Max, 16 Plus", width: 1320, height: 2868 },
  { id: "iphone-face-large-1284", family: "iphone", display: "iPhone · Face ID large", deviceExamples: "iPhone 14 Plus, 13 Pro Max, 12 Pro Max", width: 1284, height: 2778 },
  { id: "iphone-face-large-1242", family: "iphone", display: "iPhone · Face ID large", deviceExamples: "iPhone 11 Pro Max, XS Max, XR", width: 1242, height: 2688 },
  { id: "iphone-face-medium-1170", family: "iphone", display: "iPhone · Face ID medium", deviceExamples: "iPhone 17e, 16e, 14, 13, 12", width: 1170, height: 2532 },
  { id: "iphone-face-medium-1125", family: "iphone", display: "iPhone · Face ID medium", deviceExamples: "iPhone 11 Pro, XS, X", width: 1125, height: 2436 },
  { id: "iphone-face-medium-1080", family: "iphone", display: "iPhone · Face ID medium", deviceExamples: "iPhone 12 mini", width: 1080, height: 2340 },
  { id: "iphone-home-large", family: "iphone", display: "iPhone · Home button large", deviceExamples: "iPhone 8 Plus, 7 Plus", width: 1242, height: 2208 },
  { id: "iphone-home-medium", family: "iphone", display: "iPhone · Home button medium", deviceExamples: "iPhone SE (2nd / 3rd generation), iPhone 8", width: 750, height: 1334 },
  { id: "iphone-4-no-status", family: "iphone", display: "iPhone · 4-inch", deviceExamples: "iPhone SE (1st generation), iPhone 5", width: 640, height: 1096, statusBar: "without" },
  { id: "iphone-4-status", family: "iphone", display: "iPhone · 4-inch", deviceExamples: "iPhone SE (1st generation), iPhone 5", width: 640, height: 1136, statusBar: "with" },
  { id: "iphone-35-no-status", family: "iphone", display: "iPhone · 3.5-inch", deviceExamples: "iPhone 4S, iPhone 4", width: 640, height: 920, statusBar: "without" },
  { id: "iphone-35-status", family: "iphone", display: "iPhone · 3.5-inch", deviceExamples: "iPhone 4S, iPhone 4", width: 640, height: 960, statusBar: "with" },
  { id: "ipad-13-2064", family: "ipad", display: "iPad · 13-inch", deviceExamples: "iPad Pro / Air 13-inch", width: 2064, height: 2752, requirementGroupId: "ipad-13-inch" },
  { id: "ipad-13-2048", family: "ipad", display: "iPad · 13-inch", deviceExamples: "iPad Pro 12.9-inch and 13-inch", width: 2048, height: 2732, requirementGroupId: "ipad-13-inch" },
  { id: "ipad-11-pro", family: "ipad", display: "iPad · 11-inch", deviceExamples: "iPad Pro / Air 11-inch", width: 1668, height: 2388 },
  { id: "ipad-11-air-1640", family: "ipad", display: "iPad · 11-inch", deviceExamples: "iPad Air 11-inch", width: 1640, height: 2360 },
  { id: "ipad-11-air-1668", family: "ipad", display: "iPad · 11-inch", deviceExamples: "iPad Air 11-inch", width: 1668, height: 2420 },
  { id: "ipad-11-mini", family: "ipad", display: "iPad · 11-inch", deviceExamples: "iPad mini, iPad 10th generation", width: 1488, height: 2266 },
  { id: "ipad-11-1512", family: "ipad", display: "iPad · 11-inch", deviceExamples: "iPad Pro / Air 11-inch", width: 1512, height: 2316 },
  { id: "ipad-105", family: "ipad", display: "iPad · 10.5-inch", deviceExamples: "iPad Air (3rd generation), iPad Pro 10.5-inch", width: 1668, height: 2224 },
  { id: "ipad-97-status", family: "ipad", display: "iPad · 9.7-inch", deviceExamples: "iPad / iPad Air 9.7-inch", width: 1536, height: 2048, statusBar: "with" },
  { id: "ipad-97-no-status", family: "ipad", display: "iPad · 9.7-inch", deviceExamples: "iPad / iPad Air 9.7-inch", width: 1536, height: 2008, statusBar: "without" },
];

export const DEFAULT_SPEC_ID = "iphone-63-1179";

export function getScreenshotSpec(id: string) {
  return SCREENSHOT_SPECS.find((spec) => spec.id === id);
}

export function getRequirementGroup(id: ScreenshotRequirementId) {
  return SCREENSHOT_REQUIREMENTS.find((requirement) => requirement.id === id);
}

export function getRequirementForSpec(specId: string) {
  return SCREENSHOT_REQUIREMENTS.find((requirement) => requirement.specIds.includes(specId));
}

export function getSpecDimensions(spec: ScreenshotSpec, orientation: ScreenshotOrientation) {
  return orientation === "portrait"
    ? { width: spec.width, height: spec.height }
    : { width: spec.height, height: spec.width };
}

export function getSpecOptions(family: ScreenshotFamily) {
  return SCREENSHOT_SPECS.filter((spec) => spec.family === family);
}
