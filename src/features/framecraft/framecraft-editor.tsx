"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  ChevronDown,
  CircleHelp,
  Crop,
  FolderOpen,
  FileDown,
  FileUp,
  ImagePlus,
  LayoutTemplate,
  LoaderCircle,
  Maximize2,
  Palette,
  Pencil,
  Redo2,
  Scan,
  Save,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_CANVAS_DIMENSION,
  MAX_CANVAS_PIXELS,
  MAX_SOURCE_DIMENSION,
  MAX_SOURCE_PIXELS,
  MAX_UPLOAD_BYTES,
  createDefaultComposition,
  fitScreenshotToImage,
  normalizeComposition,
  type Composition,
  type CompositionTemplate,
  type FramecraftAsset,
  type ProjectFile,
  validateComposition,
} from "./model";
import { framecraftStorage, blobToDataUrl, createAssetId, dataUrlToBlob } from "./storage";
import { hitTestScreenshot, renderComposition, type LoadedImage } from "./render";
import { RangeControl, SelectField } from "./components/editor-controls";
import { BackgroundControls } from "./components/background-controls";
import { CanvasControls } from "./components/canvas-controls";
import { ScreenshotControls } from "./components/screenshot-controls";
import { canvasPresets, type CanvasPreset } from "./presets";

type ImageLayer = "background" | "screenshot";
type ActiveLayer = ImageLayer | "canvas";
type ActivePanel = ActiveLayer;
type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  initial: Composition["screenshot"];
  mode: "move" | "resize" | "background" | "crop";
  started: boolean;
  initialBackgroundX?: number;
  initialBackgroundY?: number;
};

function readImage(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened. Try a PNG, JPEG, or WebP file."));
    };
    image.src = url;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function decodeProject(file: File): Promise<{ composition: Composition; assets: FramecraftAsset[] }> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("This project file is not valid JSON.");
  }
  if (!isRecord(raw) || raw.kind !== "framecraft-project" || raw.version !== 1 || !validateComposition(raw.composition) || !Array.isArray(raw.assets)) {
    throw new Error("This is not a supported Framecraft project file.");
  }
  if (typeof raw.createdAt !== "string" || !Number.isFinite(Date.parse(raw.createdAt)) || raw.assets.length > 2) {
    throw new Error("This project file has invalid metadata.");
  }

  const seenIds = new Set<string>();
  const assets: FramecraftAsset[] = [];
  for (const value of raw.assets) {
    if (!isRecord(value)) throw new Error("This project contains an invalid image record.");
    const { id, name, mimeType, width, height, updatedAt, dataUrl } = value;
    if (
      typeof id !== "string" || id.length === 0 || id.length > 80 || seenIds.has(id) ||
      typeof name !== "string" || name.length > 255 ||
      !["image/png", "image/jpeg", "image/webp"].includes(String(mimeType)) ||
      !Number.isInteger(width) || !Number.isInteger(height) ||
      Number(width) < 1 || Number(height) < 1 || Number(width) > MAX_SOURCE_DIMENSION || Number(height) > MAX_SOURCE_DIMENSION ||
      Number(width) * Number(height) > MAX_SOURCE_PIXELS ||
      typeof updatedAt !== "number" || !Number.isFinite(updatedAt) ||
      typeof dataUrl !== "string" || dataUrl.length > MAX_UPLOAD_BYTES * 1.5
    ) {
      throw new Error("This project contains an invalid or oversized image.");
    }
    seenIds.add(id);
    const blob = await dataUrlToBlob(dataUrl);
    if (blob.type !== mimeType || blob.size > MAX_UPLOAD_BYTES) throw new Error("This project contains an unsupported or oversized image.");
    const actualDimensions = await readImage(blob);
    if (actualDimensions.width !== width || actualDimensions.height !== height) throw new Error("An image does not match its saved dimensions.");
    assets.push({ id, blob, name, mimeType: String(mimeType), ...actualDimensions, updatedAt });
  }

  const referencedIds = [raw.composition.background.assetId, raw.composition.screenshot.assetId].filter((id): id is string => typeof id === "string");
  if (referencedIds.some((id) => !seenIds.has(id))) throw new Error("This project is missing an image it needs.");
  let composition = normalizeComposition(raw.composition);
  const screenshot = composition.screenshot;
  const screenshotAsset = assets.find((asset) => asset.id === screenshot.assetId);
  if (screenshotAsset && screenshot.aspectLocked) {
    composition = fitScreenshotToImage(composition, screenshotAsset.width, screenshotAsset.height);
  }
  return { composition, assets };
}

function imageStorageError(cause: unknown, fallback: string) {
  if (cause instanceof DOMException) {
    if (cause.name === "QuotaExceededError") return "Browser storage is full. Remove some saved data or download a project file before trying again.";
    if (cause.name === "SecurityError" || cause.name === "InvalidStateError") return "This browser blocked persistent storage. Download a project file to keep a copy.";
    return fallback;
  }
  return cause instanceof Error ? cause.message : fallback;
}

function getVolatileAssetBytes(assets: Map<string, FramecraftAsset>) {
  let total = 0;
  for (const asset of assets.values()) total += asset.blob.size;
  return total;
}

function createObjectUrlImage(blob: Blob): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("A saved image could not be loaded."));
    };
    image.src = url;
  });
}

export function FramecraftEditor() {
  const [composition, setComposition] = useState(createDefaultComposition);
  const compositionRef = useRef(composition);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const transactionRef = useRef(false);
  const pastRef = useRef<Composition[]>([]);
  const futureRef = useRef<Composition[]>([]);
  const fileScreenshotRef = useRef<HTMLInputElement>(null);
  const fileBackgroundRef = useRef<HTMLInputElement>(null);
  const fileProjectRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<Map<string, LoadedImage>>(new Map());
  const volatileAssetsRef = useRef(new Map<string, FramecraftAsset>());
  const [assetRevision, setAssetRevision] = useState(0);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("screenshot");
  const [activePanel, setActivePanel] = useState<ActivePanel>("screenshot");
  const [cropMode, setCropMode] = useState(false);
  const [compare, setCompare] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [workspaceZoom, setWorkspaceZoom] = useState(100);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [storageReady, setStorageReady] = useState(false);
  const [recovery, setRecovery] = useState<Composition | null>(null);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [templates, setTemplates] = useState<CompositionTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateListOpen, setTemplateListOpen] = useState(false);
  const [renameTemplateTarget, setRenameTemplateTarget] = useState<CompositionTemplate | null>(null);
  const [renameName, setRenameName] = useState("");
  const [missingScreenshotOpen, setMissingScreenshotOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [jpegQuality, setJpegQuality] = useState(92);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState({ canUndo: false, canRedo: false });

  const refreshHistoryAvailability = useCallback(() => {
    setHistoryAvailability({ canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 });
  }, []);

  const setCurrent = useCallback((next: Composition) => {
    compositionRef.current = next;
    setComposition(next);
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  const beginEdit = useCallback(() => {
    if (transactionRef.current) return;
    transactionRef.current = true;
    pastRef.current = [...pastRef.current.slice(-79), compositionRef.current];
    futureRef.current = [];
    refreshHistoryAvailability();
  }, [refreshHistoryAvailability]);

  const edit = useCallback((transform: (current: Composition) => Composition) => {
    if (!transactionRef.current) beginEdit();
    setCurrent(transform(compositionRef.current));
  }, [beginEdit, setCurrent]);

  const endEdit = useCallback(() => {
    transactionRef.current = false;
  }, []);

  const oneEdit = useCallback((transform: (current: Composition) => Composition) => {
    beginEdit();
    setCurrent(transform(compositionRef.current));
    transactionRef.current = false;
  }, [beginEdit, setCurrent]);

  const undo = useCallback(() => {
    endEdit();
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current = [...futureRef.current, compositionRef.current];
    compositionRef.current = previous;
    setComposition(previous);
    dirtyRef.current = true;
    setDirty(true);
    refreshHistoryAvailability();
  }, [endEdit, refreshHistoryAvailability]);

  const redo = useCallback(() => {
    endEdit();
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current = [...pastRef.current, compositionRef.current];
    compositionRef.current = next;
    setComposition(next);
    dirtyRef.current = true;
    setDirty(true);
    refreshHistoryAvailability();
  }, [endEdit, refreshHistoryAvailability]);

  const { canUndo, canRedo } = historyAvailability;

  useEffect(() => {
    compositionRef.current = composition;
  }, [composition]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [draft, localTemplates] = await Promise.all([framecraftStorage.getDraft(), framecraftStorage.listTemplates()]);
        if (!active) return;
        setTemplates(localTemplates);
        if (draft && validateComposition(draft.composition)) setRecovery(normalizeComposition(draft.composition));
        else if (draft) setNotice("An incomplete recovery draft could not be restored. Open a downloaded project file if you have one.");
      } catch {
        if (active) setNotice("Local storage is unavailable. You can still use the editor and download a project file.");
      } finally {
        if (active) setStorageReady(true);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!storageReady || !dirty) return;
    const timer = window.setTimeout(() => {
      framecraftStorage.saveDraft(composition).catch((cause) => {
        setNotice(imageStorageError(cause, "Could not save the recovery draft. Download a project file to keep a copy."));
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [composition, dirty, storageReady]);

  useEffect(() => {
    const assetIds = [...new Set([composition.background.assetId, composition.screenshot.assetId].filter((id): id is string => Boolean(id)))];
    let cancelled = false;
    async function loadImages() {
      const entries = await Promise.all(assetIds.map(async (id) => {
        let asset = volatileAssetsRef.current.get(id);
        try {
          asset = await framecraftStorage.getAsset(id) ?? asset;
        } catch {
          // Keep session-only assets available when browser storage is blocked.
        }
        if (!asset) return [id, null] as const;
        return [id, await createObjectUrlImage(asset.blob)] as const;
      }));
      if (cancelled) return;
      const next = new Map<string, LoadedImage>();
      for (const [id, image] of entries) if (image) next.set(id, image);
      setImages(next);
      if (assetIds.some((id) => !next.has(id))) {
        setError("An image used by this composition is missing from browser storage. Replace the image or choose another template.");
      }
    }
    loadImages().catch(() => {
      if (!cancelled) setError("A saved image could not be opened. You can replace it from the image controls.");
    });
    return () => { cancelled = true; };
  }, [composition.background.assetId, composition.screenshot.assetId, assetRevision]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let errorTimer: number | undefined;
    try {
      const selectionColor = getComputedStyle(document.documentElement).getPropertyValue("--canvas-selection").trim() || "#7047eb";
      renderComposition(canvas, composition, images, !preview && !compare && activeLayer === "screenshot", compare, undefined, showGuides, selectionColor);
    } catch {
      errorTimer = window.setTimeout(() => setError("The preview could not be rendered. Try reducing the canvas size or reloading the image."), 0);
    }
    return () => { if (errorTimer !== undefined) window.clearTimeout(errorTimer); };
  }, [composition, images, activeLayer, compare, preview, showGuides]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editingText = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z" && !editingText) {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (mod && event.key.toLowerCase() === "y" && !editingText) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo, undo]);

  const patchCanvas = (patch: Partial<Composition["canvas"]>) => edit((current) => ({ ...current, canvas: { ...current.canvas, ...patch } }));
  const patchBackground = (patch: Partial<Composition["background"]>) => edit((current) => ({ ...current, background: { ...current.background, ...patch } }));
  const patchScreenshot = (patch: Partial<Composition["screenshot"]>) => edit((current) => {
    const settings = current.screenshot;
    const shadowWidthMatchesFrame = Math.abs((settings.shadowWidth ?? settings.width) - settings.width) < 0.01;
    const shadowHeightMatchesFrame = Math.abs((settings.shadowHeight ?? settings.height) - settings.height) < 0.01;
    const screenshot = { ...settings, ...patch };
    if ("width" in patch && shadowWidthMatchesFrame) screenshot.shadowWidth = screenshot.width;
    if ("height" in patch && shadowHeightMatchesFrame) screenshot.shadowHeight = screenshot.height;
    return { ...current, screenshot };
  });

  const selectPanel = (panel: ActivePanel) => {
    setActivePanel(panel);
    setActiveLayer(panel);
    setMobilePanelOpen(true);
    if (panel !== "screenshot") setCropMode(false);
  };

  const toggleScreenshotAspectLock = (locked: boolean) => oneEdit((current) => {
    const next = { ...current, screenshot: { ...current.screenshot, aspectLocked: locked } };
    if (!locked || !current.screenshot.assetId) return next;
    const source = images.get(current.screenshot.assetId);
    return source ? fitScreenshotToImage(next, source.width, source.height) : next;
  });

  const setPreset = (preset: CanvasPreset) => {
    const nextSize = canvasPresets[preset];
    oneEdit((current) => ({
      ...current,
      canvas: { ...current.canvas, width: nextSize.width, height: nextSize.height, preset },
    }));
  };

  const setCanvasDimension = (key: "width" | "height", value: number) => {
    if (!Number.isInteger(value) || value < 200 || value > MAX_CANVAS_DIMENSION) return;
    const current = compositionRef.current;
    const width = key === "width" ? value : current.canvas.width;
    const height = key === "height" ? value : current.canvas.height;
    if (width * height > MAX_CANVAS_PIXELS) {
      setError(`Canvas size is limited to ${MAX_CANVAS_PIXELS.toLocaleString()} pixels. Reduce one dimension.`);
      return;
    }
    oneEdit((state) => ({
      ...state,
      canvas: { ...state.canvas, width, height, preset: "custom" },
    }));
  };

  const addImage = useCallback(async (file: File, target: ImageLayer) => {
    setError(null);
    setNotice(null);
    if (!file.type.startsWith("image/") || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("This image is larger than 40 MB. Choose a smaller file.");
      return;
    }
    setBusy("Loading image…");
    try {
      const dimensions = await readImage(file);
      if (dimensions.width > MAX_SOURCE_DIMENSION || dimensions.height > MAX_SOURCE_DIMENSION || dimensions.width * dimensions.height > MAX_SOURCE_PIXELS) {
        throw new Error("This image has too many pixels to edit smoothly. Export or resize a smaller copy first.");
      }
      const id = createAssetId();
      const asset: FramecraftAsset = { id, blob: file, name: file.name, mimeType: file.type, ...dimensions, updatedAt: Date.now() };
      try {
        await framecraftStorage.saveAsset(asset);
      } catch {
        const sessionLimit = MAX_UPLOAD_BYTES * 2;
        if (getVolatileAssetBytes(volatileAssetsRef.current) + file.size > sessionLimit) {
          throw new Error("Browser storage is unavailable and the session image limit has been reached. Download your project or reload before adding another image.");
        }
        volatileAssetsRef.current.set(id, asset);
        setNotice("Browser storage is unavailable. This image lasts for this session only; download a project file to keep it.");
      }
      setAssetRevision((v) => v + 1);
      if (target === "background") {
        oneEdit((current) => ({ ...current, background: { ...current.background, type: "image", assetId: id, zoom: 1, x: 0, y: 0 } }));
        setActiveLayer("background");
        setActivePanel("background");
        setCropMode(false);
      } else {
        oneEdit((current) => {
          const next = {
            ...current,
            screenshot: {
              ...current.screenshot,
              assetId: id,
              cropZoom: 1,
              cropX: 0,
              cropY: 0,
            },
          };
          return !current.screenshot.assetId || current.screenshot.aspectLocked
            ? fitScreenshotToImage(next, dimensions.width, dimensions.height)
            : next;
        });
        setActiveLayer("screenshot");
        setActivePanel("screenshot");
        setCropMode(false);
      }
    } catch (cause) {
      setError(imageStorageError(cause, "The image could not be saved locally."));
    } finally {
      setBusy(null);
    }
  }, [oneEdit]);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName))) return;
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.kind === "file" && item.type.startsWith("image/"))
        ?.getAsFile();
      if (!file) return;
      event.preventDefault();
      void addImage(file, activeLayer === "background" ? "background" : "screenshot");
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeLayer, addImage]);

  const createProject = async (): Promise<ProjectFile> => {
    const ids = [...new Set([composition.background.assetId, composition.screenshot.assetId].filter((id): id is string => Boolean(id)))];
    const assets = await Promise.all(ids.map(async (id) => {
      let asset = volatileAssetsRef.current.get(id);
      try {
        asset = await framecraftStorage.getAsset(id) ?? asset;
      } catch {
        // The project can still be downloaded from session-only assets.
      }
      if (!asset) throw new Error("An image used by this composition is missing from browser storage.");
      return {
        id: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        updatedAt: asset.updatedAt,
        dataUrl: await blobToDataUrl(asset.blob),
      };
    }));
    return { kind: "framecraft-project", version: 1, createdAt: new Date().toISOString(), composition, assets };
  };

  const saveProject = async () => {
    setError(null);
    setBusy("Preparing project…");
    try {
      const project = await createProject();
      const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `framecraft-${new Date().toISOString().slice(0, 10)}.framecraft`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      dirtyRef.current = false;
      setDirty(false);
      await framecraftStorage.clearDraft().catch(() => undefined);
      setNotice("Project downloaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The project could not be downloaded.");
    } finally {
      setBusy(null);
    }
  };

  const openProject = async (file: File) => {
    setError(null);
    if (dirtyRef.current && !window.confirm("Replace the current composition with this project? Unsaved edits will be lost.")) return;
    if (file.size > 80 * 1024 * 1024) {
      setError("This project file is larger than 80 MB.");
      return;
    }
    setBusy("Opening project…");
    const storedIds: string[] = [];
    let projectIsSessionOnly = false;
    try {
      const decoded = await decodeProject(file);
      const idMap = new Map(decoded.assets.map((asset) => [asset.id, createAssetId()]));
      try {
        for (const asset of decoded.assets) {
          const id = idMap.get(asset.id)!;
          await framecraftStorage.saveAsset({ ...asset, id });
          storedIds.push(id);
        }
      } catch {
        await Promise.allSettled(storedIds.map((id) => framecraftStorage.deleteAsset(id)));
        storedIds.length = 0;
        const projectBytes = decoded.assets.reduce((total, asset) => total + asset.blob.size, 0);
        if (getVolatileAssetBytes(volatileAssetsRef.current) + projectBytes > MAX_UPLOAD_BYTES * 2) {
          throw new Error("Browser storage is unavailable and this project is too large to keep in memory. Free browser storage and try again.");
        }
        for (const asset of decoded.assets) {
          const id = idMap.get(asset.id)!;
          volatileAssetsRef.current.set(id, { ...asset, id });
        }
        projectIsSessionOnly = true;
      }
      const composition: Composition = {
        ...decoded.composition,
        background: {
          ...decoded.composition.background,
          assetId: decoded.composition.background.assetId ? idMap.get(decoded.composition.background.assetId)! : null,
        },
        screenshot: {
          ...decoded.composition.screenshot,
          assetId: decoded.composition.screenshot.assetId ? idMap.get(decoded.composition.screenshot.assetId)! : null,
        },
      };
      compositionRef.current = composition;
      setComposition(composition);
      pastRef.current = [];
      futureRef.current = [];
      refreshHistoryAvailability();
      dirtyRef.current = projectIsSessionOnly;
      setDirty(projectIsSessionOnly);
      await framecraftStorage.clearDraft().catch(() => undefined);
      setAssetRevision((v) => v + 1);
      setActiveLayer("screenshot");
      setActivePanel("screenshot");
      setCropMode(false);
      setNotice(projectIsSessionOnly ? "Project opened for this session. Download a project file to keep a copy." : "Project opened.");
    } catch (cause) {
      if (storedIds.length) await Promise.allSettled(storedIds.map((id) => framecraftStorage.deleteAsset(id)));
      setError(imageStorageError(cause, "The project file could not be opened."));
    } finally {
      setBusy(null);
    }
  };

  const saveTemplate = async () => {
    const cleanName = templateName.trim();
    if (!cleanName) return;
    setBusy("Saving template…");
    setError(null);
    const now = Date.now();
    try {
      const existing = templates.find((template) => template.id === selectedTemplateId);
      const templateComposition: Composition = {
        ...compositionRef.current,
        screenshot: { ...compositionRef.current.screenshot, assetId: null, cropZoom: 1, cropX: 0, cropY: 0 },
      };
      const next: CompositionTemplate = {
        id: existing?.id ?? createAssetId(),
        name: cleanName,
        version: 1,
        composition: templateComposition,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await framecraftStorage.saveTemplate(next);
      setTemplates(await framecraftStorage.listTemplates());
      setTemplateDialogOpen(false);
      setSelectedTemplateId(next.id);
      setNotice("Template saved on this device.");
    } catch (cause) {
      setError(imageStorageError(cause, "The template could not be saved. Your composition is still open."));
    } finally {
      setBusy(null);
    }
  };

  const applyTemplate = (template: CompositionTemplate) => {
    const current = compositionRef.current;
    const next = normalizeComposition({
      ...template.composition,
      screenshot: {
        ...template.composition.screenshot,
        assetId: current.screenshot.assetId,
        cropZoom: 1,
        cropX: 0,
        cropY: 0,
      },
    });
    oneEdit(() => next);
    setAssetRevision((v) => v + 1);
    setActiveLayer("screenshot");
    setActivePanel("screenshot");
    setCropMode(false);
    setTemplateListOpen(false);
    setNotice(`Applied “${template.name}”.`);
    setMissingScreenshotOpen(!current.screenshot.assetId);
  };

  const renameTemplate = async () => {
    const template = renameTemplateTarget;
    const name = renameName.trim();
    if (!template || !name) return;
    try {
      await framecraftStorage.saveTemplate({ ...template, name, updatedAt: Date.now() });
      setTemplates(await framecraftStorage.listTemplates());
      setRenameTemplateTarget(null);
    } catch (cause) {
      setError(imageStorageError(cause, "The template could not be updated."));
    }
  };

  const deleteTemplate = async (template: CompositionTemplate) => {
    if (!window.confirm(`Delete “${template.name}”?`)) return;
    try {
      await framecraftStorage.deleteTemplate(template.id);
      setTemplates(await framecraftStorage.listTemplates());
      if (selectedTemplateId === template.id) setSelectedTemplateId("");
    } catch (cause) {
      setError(imageStorageError(cause, "The template could not be deleted."));
    }
  };

  const exportImage = async () => {
    setBusy("Rendering image…");
    setError(null);
    try {
      const current = compositionRef.current;
      const neededAssetIds = [current.background.assetId, current.screenshot.assetId].filter((id): id is string => Boolean(id));
      if (neededAssetIds.some((id) => !images.has(id))) throw new Error("Wait for the image preview to finish loading, then export again.");
      const output = document.createElement("canvas");
      const matte = exportFormat === "jpeg" ? "#ffffff" : undefined;
      renderComposition(output, compositionRef.current, images, false, false, matte);
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob((result) => result ? resolve(result) : reject(new Error("The browser could not create the image. Try a smaller canvas.")), exportFormat === "jpeg" ? "image/jpeg" : "image/png", jpegQuality / 100));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `framecraft-${compositionRef.current.canvas.width}x${compositionRef.current.canvas.height}.${exportFormat === "jpeg" ? "jpg" : "png"}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportDialogOpen(false);
      setNotice("Image downloaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The image could not be exported.");
    } finally {
      setBusy(null);
    }
  };

  const recoverDraft = () => {
    if (!recovery) return;
    const restored = normalizeComposition(recovery);
    compositionRef.current = restored;
    setComposition(restored);
    pastRef.current = [];
    futureRef.current = [];
    refreshHistoryAvailability();
    dirtyRef.current = true;
    setDirty(true);
    setActiveLayer("screenshot");
    setActivePanel("screenshot");
    setRecovery(null);
    setAssetRevision((v) => v + 1);
    setNotice("Draft restored. Download a project file to keep a copy.");
  };

  const discardDraft = () => {
    setRecovery(null);
    framecraftStorage.clearDraft().catch(() => setNotice("The previous recovery draft could not be cleared."));
  };

  const guardHomeNavigation: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (dirtyRef.current && !window.confirm("You have unsaved changes. Leave this editor?")) event.preventDefault();
  };

  const updateShadowPreset = (preset: "none" | "subtle" | "soft" | "dramatic") => {
    const values = {
      none: { shadowEnabled: false, shadowBlur: 0, shadowOpacity: 0, shadowX: 0, shadowY: 0, shadowSpread: 0 },
      subtle: { shadowEnabled: true, shadowBlur: 20, shadowOpacity: 16, shadowX: 0, shadowY: 10, shadowSpread: 0 },
      soft: { shadowEnabled: true, shadowBlur: 36, shadowOpacity: 24, shadowX: 0, shadowY: 22, shadowSpread: 2 },
      dramatic: { shadowEnabled: true, shadowBlur: 58, shadowOpacity: 38, shadowX: 0, shadowY: 30, shadowSpread: 5 },
    }[preset];
    oneEdit((current) => ({ ...current, screenshot: { ...current.screenshot, ...values } }));
  };

  const resetComposition = () => {
    if (!window.confirm("Reset the canvas and all image settings? You can undo this.")) return;
    oneEdit(() => createDefaultComposition());
  };

  const alignScreenshot = (horizontal: "left" | "center" | "right", vertical: "top" | "center" | "bottom") => {
    oneEdit((current) => ({
      ...current,
      screenshot: {
        ...current.screenshot,
        x: horizontal === "left" ? 48 : horizontal === "right" ? current.canvas.width - current.screenshot.width - 48 : (current.canvas.width - current.screenshot.width) / 2,
        y: vertical === "top" ? 48 : vertical === "bottom" ? current.canvas.height - current.screenshot.height - 48 : (current.canvas.height - current.screenshot.height) / 2,
      },
    }));
  };

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * compositionRef.current.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * compositionRef.current.canvas.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (preview || compare) return;
    event.currentTarget.focus();
    const point = pointerPosition(event);
    const current = compositionRef.current;
    const screenshotHit = current.screenshot.assetId ? hitTestScreenshot(current.screenshot, point.x, point.y) : { inside: false, resize: false };
    if (screenshotHit.inside) {
      selectPanel("screenshot");
      dragRef.current = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        initial: current.screenshot,
        mode: cropMode ? "crop" : screenshotHit.resize ? "resize" : "move",
        started: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const edge = Math.max(12, Math.min(current.canvas.width, current.canvas.height) * 0.025);
    const onCanvasEdge = point.x <= edge || point.y <= edge || point.x >= current.canvas.width - edge || point.y >= current.canvas.height - edge;
    if (onCanvasEdge) {
      selectPanel("canvas");
      return;
    }
    if (current.background.type === "image" && current.background.assetId) {
      selectPanel("background");
      dragRef.current = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        initial: current.screenshot,
        initialBackgroundX: current.background.x,
        initialBackgroundY: current.background.y,
        mode: "background",
        started: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    selectPanel("background");
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = pointerPosition(event);
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    if (!drag.started) {
      if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
      beginEdit();
      drag.started = true;
    }
    if (drag.mode === "background") {
      edit((current) => ({ ...current, background: { ...current.background, x: (drag.initialBackgroundX ?? 0) + (dx / current.canvas.width) * 100, y: (drag.initialBackgroundY ?? 0) + (dy / current.canvas.height) * 100 } }));
      return;
    }
    if (drag.mode === "crop") {
      edit((current) => ({
        ...current,
        screenshot: {
          ...current.screenshot,
          cropX: Math.max(-300, Math.min(300, drag.initial.cropX + (dx / drag.initial.width) * 100)),
          cropY: Math.max(-300, Math.min(300, drag.initial.cropY + (dy / drag.initial.height) * 100)),
        },
      }));
      return;
    }
    edit((current) => {
      const start = drag.initial;
      if (drag.mode === "move") {
        let x = start.x + dx;
        let y = start.y + dy;
        if (showGuides) {
          const threshold = current.canvas.width * 0.012;
          if (Math.abs(x + start.width / 2 - current.canvas.width / 2) < threshold) x = (current.canvas.width - start.width) / 2;
          if (Math.abs(y + start.height / 2 - current.canvas.height / 2) < threshold) y = (current.canvas.height - start.height) / 2;
          if (Math.abs(x) < threshold) x = 0;
          if (Math.abs(y) < threshold) y = 0;
          if (Math.abs(x + start.width - current.canvas.width) < threshold) x = current.canvas.width - start.width;
          if (Math.abs(y + start.height - current.canvas.height) < threshold) y = current.canvas.height - start.height;
        }
        return { ...current, screenshot: { ...current.screenshot, x, y } };
      }
      const nextWidth = Math.max(120, start.width + dx);
      const source = start.assetId ? images.get(start.assetId) : undefined;
      const sourceRatio = source ? source.width / source.height : start.width / start.height;
      const nextHeight = start.aspectLocked ? nextWidth / sourceRatio : Math.max(90, start.height + dy);
      const shadowWidthMatchesFrame = Math.abs((start.shadowWidth ?? start.width) - start.width) < 0.01;
      const shadowHeightMatchesFrame = Math.abs((start.shadowHeight ?? start.height) - start.height) < 0.01;
      return {
        ...current,
        screenshot: {
          ...current.screenshot,
          width: nextWidth,
          height: nextHeight,
          shadowWidth: shadowWidthMatchesFrame ? nextWidth : start.shadowWidth ?? start.width,
          shadowHeight: shadowHeightMatchesFrame ? nextHeight : start.shadowHeight ?? start.height,
        },
      };
    });
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (dragRef.current.started) endEdit();
    dragRef.current = null;
  };

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!composition.screenshot.assetId || activeLayer !== "screenshot" || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    beginEdit();
    const amount = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    edit((current) => ({
      ...current,
      screenshot: cropMode
        ? { ...current.screenshot, cropX: Math.max(-300, Math.min(300, current.screenshot.cropX + dx)), cropY: Math.max(-300, Math.min(300, current.screenshot.cropY + dy)) }
        : { ...current.screenshot, x: current.screenshot.x + dx, y: current.screenshot.y + dy },
    }));
  };

  const handleCanvasKeyUp = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) endEdit();
  };

  const loadFile = (file: File | undefined, target: ImageLayer) => { if (file) void addImage(file, target); };
  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    loadFile(file, activeLayer === "background" ? "background" : "screenshot");
  };

  const sourceImage = composition.screenshot.assetId ? images.get(composition.screenshot.assetId) : undefined;
  useEffect(() => {
    if (!sourceImage || !composition.screenshot.aspectLocked) return;
    const sourceAspect = sourceImage.width / sourceImage.height;
    const frameAspect = composition.screenshot.width / composition.screenshot.height;
    if (Math.abs(sourceAspect - frameAspect) < 0.001) return;
    setCurrent(fitScreenshotToImage(composition, sourceImage.width, sourceImage.height));
  }, [sourceImage, composition, setCurrent]);

  const sourceScale = sourceImage
    ? (composition.screenshot.fit === "cover"
      ? Math.max(composition.screenshot.width / sourceImage.width, composition.screenshot.height / sourceImage.height)
      : Math.min(composition.screenshot.width / sourceImage.width, composition.screenshot.height / sourceImage.height)) * composition.screenshot.cropZoom
    : 0;
  const lowResolution = Boolean(sourceImage && sourceScale > 1.01);
  const message = error ?? notice;

  const actionControlProps = { onStart: beginEdit, onEnd: endEdit };
  const canvasControls = (
    <CanvasControls
      composition={composition}
      transaction={actionControlProps}
      onSetPreset={setPreset}
      onSetDimension={setCanvasDimension}
      onPatch={patchCanvas}
      onToggleTransparency={(checked) => oneEdit((current) => ({ ...current, canvas: { ...current.canvas, transparentCorners: checked } }))}
      onAlignScreenshot={alignScreenshot}
      onReset={resetComposition}
    />
  );
  const backgroundControls = (
    <BackgroundControls
      composition={composition}
      imageReady={Boolean(composition.background.assetId && images.has(composition.background.assetId))}
      transaction={actionControlProps}
      onUpload={() => fileBackgroundRef.current?.click()}
      onSelectType={(type) => {
        setCropMode(false);
        if (type === "image" && !composition.background.assetId) fileBackgroundRef.current?.click();
        else oneEdit((current) => ({ ...current, background: { ...current.background, type } }));
      }}
      onPatch={patchBackground}
      onSelectPreset={(preset) => oneEdit((current) => ({
        ...current,
        background: { ...current.background, type: "gradient", gradientFrom: preset.from, gradientTo: preset.to, gradientAngle: preset.angle },
      }))}
      onReset={() => oneEdit((current) => ({ ...current, background: createDefaultComposition().background }))}
    />
  );
  const screenshotControls = (
    <ScreenshotControls
      composition={composition}
      imageSize={sourceImage ? { width: sourceImage.width, height: sourceImage.height } : undefined}
      lowResolution={lowResolution}
      cropMode={cropMode}
      transaction={actionControlProps}
      onUpload={() => fileScreenshotRef.current?.click()}
      onRemove={() => { setCropMode(false); oneEdit((current) => ({ ...current, screenshot: { ...current.screenshot, assetId: null } })); }}
      onToggleCrop={() => setCropMode((enabled) => !enabled)}
      onPatch={patchScreenshot}
      onToggleAspectLock={toggleScreenshotAspectLock}
      onShadowPreset={updateShadowPreset}
      onReset={() => { setCropMode(false); oneEdit((current) => ({ ...current, screenshot: { ...createDefaultComposition().screenshot, assetId: current.screenshot.assetId } })); }}
    />
  );
  const headerActions = (
    <>
      <Button variant="ghost" size="icon" className="max-[360px]:size-7" aria-label="Undo" disabled={!canUndo} onClick={undo}><Undo2 /></Button>
      <Button variant="ghost" size="icon" className="max-[360px]:size-7" aria-label="Redo" disabled={!canRedo} onClick={redo}><Redo2 /></Button>
      <span className="mx-1 h-6 w-px bg-border max-[360px]:mx-0.5" aria-hidden="true" />
      <Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex" onClick={() => { setTemplateName(""); setSelectedTemplateId(""); setTemplateDialogOpen(true); }}><Save /> Save template</Button>
      <Button variant="ghost" size="icon" className="sm:hidden max-[360px]:size-7" aria-label="Save template" onClick={() => { setTemplateName(""); setSelectedTemplateId(""); setTemplateDialogOpen(true); }}><Save /></Button>
      <Button variant="outline" size="sm" className="hidden gap-2 md:inline-flex" onClick={() => setTemplateListOpen(true)}><LayoutTemplate /> Templates</Button>
      <Button variant="ghost" size="icon" className="md:hidden max-[360px]:size-7" aria-label="Open templates" onClick={() => setTemplateListOpen(true)}><LayoutTemplate /></Button>
      <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
        <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5 max-[360px]:size-7 max-[360px]:px-0" aria-label="Project files" />}>
          <FolderOpen />
          <span className="max-[360px]:sr-only">Project</span>
          <ChevronDown className="size-3.5 max-[360px]:hidden" />
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-medium">Project files</h2>
            <p className="text-xs leading-5 text-muted-foreground">Save the full composition with its images, or open a saved project.</p>
          </div>
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="h-auto w-full justify-start gap-3 whitespace-normal px-3 py-2.5 text-left"
              onClick={() => {
                setProjectPopoverOpen(false);
                void saveProject();
              }}
            >
              <FileDown className="mt-0.5 size-4 shrink-0" />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">Download project</span>
                <span className="text-xs font-normal leading-4 text-muted-foreground">Save this composition and its images as a .framecraft file.</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto w-full justify-start gap-3 whitespace-normal px-3 py-2.5 text-left"
              onClick={() => {
                setProjectPopoverOpen(false);
                fileProjectRef.current?.click();
              }}
            >
              <FileUp className="mt-0.5 size-4 shrink-0" />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">Open project</span>
                <span className="text-xs font-normal leading-4 text-muted-foreground">Continue from a .framecraft file on your device.</span>
              </span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button size="sm" className="gap-2 max-[360px]:gap-1 max-[360px]:px-2" onClick={() => setExportDialogOpen(true)}><ArrowDownToLine /> Export</Button>
    </>
  );

  const previewActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => { setPreview(false); setCompare(false); }}>Back to editor</Button>
      <Button size="sm" className="gap-2" onClick={() => setExportDialogOpen(true)}><ArrowDownToLine /> Export</Button>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showToolsLink onHomeClick={guardHomeNavigation} />
      <input ref={fileScreenshotRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { loadFile(event.target.files?.[0], "screenshot"); event.currentTarget.value = ""; }} />
      <input ref={fileBackgroundRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { loadFile(event.target.files?.[0], "background"); event.currentTarget.value = ""; }} />
      <input ref={fileProjectRef} type="file" accept=".framecraft,application/json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void openProject(file); event.currentTarget.value = ""; }} />

      <div className="flex h-[calc(100dvh-4rem)] min-h-[640px] flex-col">
        <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-y-1 border-b border-border/80 px-3 py-1 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/" onClick={guardHomeNavigation} aria-label="Back to tools" className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"><ArrowLeft className="size-4" /></Link>
            <span className="h-5 w-px bg-border" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex items-center gap-2"><h1 className="truncate text-sm font-semibold">Framecraft</h1>{dirty && <span className="size-1.5 rounded-full bg-amber-500" title="Unsaved changes" aria-label="Unsaved changes" />}</div>
              <p className="hidden text-[11px] text-muted-foreground sm:block">Screenshot composer</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {preview ? previewActions : headerActions}
          </div>
        </div>

        {message && (
          <div role={error ? "alert" : "status"} className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-xs ${error ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-primary/15 bg-primary/5 text-foreground"}`}>
            <span>{message}</span><Button size="icon-xs" variant="ghost" aria-label="Dismiss message" onClick={() => { setError(null); setNotice(null); }}>×</Button>
          </div>
        )}

        <main className="flex min-h-0 flex-1 flex-col md:flex-row">
      <section className="relative flex min-h-[280px] flex-1 flex-col bg-workspace sm:min-h-[330px] md:min-w-0" aria-label="Composition workspace">
            <div className="flex h-11 shrink-0 items-center justify-between px-3 sm:px-5">
              <div className="flex items-center gap-1">
              <Button variant={!preview ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => { setCompare(false); setPreview(false); }}>Edit</Button>
              <Button variant={compare ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => { setCompare(true); setPreview(true); }}>Original</Button>
              <Button variant={preview && !compare ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => { setPreview(true); setCompare(false); }}>Finished</Button>
              <Button variant={showGuides ? "secondary" : "ghost"} size="icon-sm" className="ml-1 h-7 w-7" aria-label={`${showGuides ? "Hide" : "Show"} snapping guides`} aria-pressed={showGuides} onClick={() => setShowGuides((value) => !value)}><Scan /></Button>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Button size="icon-xs" variant="ghost" className="max-[360px]:hidden" aria-label="Zoom out" disabled={workspaceZoom <= 50} onClick={() => setWorkspaceZoom((zoom) => Math.max(50, zoom - 10))}><ZoomOut /></Button>
                <button type="button" onClick={() => setWorkspaceZoom(100)} className="min-w-9 rounded px-1 py-1 tabular-nums hover:bg-muted" aria-label="Fit canvas to workspace">{workspaceZoom}%</button>
                <Button size="icon-xs" variant="ghost" className="max-[360px]:hidden" aria-label="Zoom in" disabled={workspaceZoom >= 150} onClick={() => setWorkspaceZoom((zoom) => Math.min(150, zoom + 10))}><ZoomIn /></Button>
                <span className="ml-1 hidden sm:inline">{composition.canvas.width} × {composition.canvas.height}</span>
                <span className="hidden lg:inline">PNG · JPEG</span>
              </div>
            </div>
            <div
              className="checkerboard flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-6"
              onDrop={handleCanvasDrop}
              onDragOver={(event) => event.preventDefault()}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                selectPanel("canvas");
              }}
            >
              <div className="relative w-full transition-transform motion-reduce:transition-none" style={{ maxWidth: 980, aspectRatio: `${composition.canvas.width} / ${composition.canvas.height}`, maxHeight: "100%", transform: `scale(${workspaceZoom / 100})`, transformOrigin: "center" }}>
                <canvas
                  ref={canvasRef}
                  aria-label={compare ? "Original screenshot preview" : cropMode ? "Composition canvas. Use arrow keys to reposition the screenshot crop." : "Composition canvas. Use arrow keys to move the selected screenshot."}
                  tabIndex={preview || compare ? -1 : 0}
                  width={composition.canvas.width}
                  height={composition.canvas.height}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onKeyDown={handleCanvasKeyDown}
                  onKeyUp={handleCanvasKeyUp}
                  className={`absolute inset-0 h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${composition.canvas.transparentCorners ? "checkerboard" : ""} ${preview || compare || activeLayer === "canvas" ? "cursor-default" : activeLayer === "background" && composition.background.type === "image" || cropMode ? "cursor-move" : composition.screenshot.assetId ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${preview ? "ring-1 ring-border/40" : "ring-1 ring-border/35"}`}
                />
                {!composition.screenshot.assetId && !compare && !preview && (
                  <button type="button" onClick={() => fileScreenshotRef.current?.click()} className="absolute inset-0 m-auto flex h-12 w-fit items-center gap-2 rounded-[var(--radius-control)] bg-background/90 px-4 text-sm font-medium shadow-[var(--shadow-card)] ring-1 ring-border backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <ImagePlus className="size-4 text-primary" /> Add screenshot
                  </button>
                )}
                {compare && <span className="absolute left-3 top-3 rounded-[var(--radius-control)] bg-background/90 px-2.5 py-1 text-xs font-medium shadow-[var(--shadow-control)]">Original screenshot</span>}
              </div>
            </div>
            <div className="flex h-10 shrink-0 items-center justify-between px-3 text-[11px] text-muted-foreground sm:px-5">
              <span className="hidden items-center gap-1.5 sm:inline-flex"><CircleHelp className="size-3.5" />{cropMode ? "Drag inside the frame or use arrow keys to adjust the crop" : "Drag to move · drag corner to resize · arrow keys for precise movement"}</span>
              <span className="sm:hidden">Use settings below to adjust the image</span>
              <Button variant="ghost" size="sm" className={`h-7 gap-1.5 px-2 text-[11px] ${preview ? "invisible" : ""}`} onClick={() => setMobilePanelOpen((open) => !open)} aria-expanded={mobilePanelOpen}>
                {mobilePanelOpen ? "Hide controls" : "Show controls"}<ChevronDown className={`size-3.5 transition-transform md:hidden ${mobilePanelOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </section>

          <aside className={`${preview ? "hidden" : "flex"} w-full shrink-0 flex-col border-t border-border bg-card md:w-[370px] md:border-l md:border-t-0 ${mobilePanelOpen ? "max-h-[40vh]" : "max-h-[50px] overflow-hidden"} md:max-h-none md:overflow-visible`} aria-label="Editor controls">
            <Tabs value={activePanel} onValueChange={(value) => {
              const panel = value as ActivePanel;
              selectPanel(panel);
            }} className="min-h-0 flex-1 gap-0">
              <TabsList className="h-12 w-full justify-start rounded-none border-b border-border bg-transparent px-3 max-[360px]:px-1 sm:px-4">
                <TabsTrigger value="background" className="min-w-0 flex-1 gap-1.5 px-2 text-xs max-[360px]:gap-0 max-[360px]:px-1"><Palette className="size-3.5 max-[360px]:hidden" /> Background</TabsTrigger>
                <TabsTrigger value="screenshot" className="min-w-0 flex-1 gap-1.5 px-2 text-xs max-[360px]:gap-0 max-[360px]:px-1"><Crop className="size-3.5 max-[360px]:hidden" /> Screenshot</TabsTrigger>
                <TabsTrigger value="canvas" className="min-w-0 flex-1 gap-1.5 px-2 text-xs max-[360px]:gap-0 max-[360px]:px-1"><Maximize2 className="size-3.5 max-[360px]:hidden" /> Canvas</TabsTrigger>
              </TabsList>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <TabsContent value="background" className="m-0 outline-none">{backgroundControls}</TabsContent>
                <TabsContent value="screenshot" className="m-0 outline-none">{screenshotControls}</TabsContent>
                <TabsContent value="canvas" className="m-0 outline-none">{canvasControls}</TabsContent>
              </div>
              <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">This browser keeps images, drafts and templates. Download a project file to keep a copy.</p>
            </Tabs>
          </aside>
        </main>
      </div>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedTemplateId ? "Update template" : "Save template"}</DialogTitle><DialogDescription>Save the background and screenshot styling on this device. The screenshot itself is not included.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="template-name">Template name</Label><Input id="template-name" autoFocus value={templateName} maxLength={48} onChange={(event) => setTemplateName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveTemplate(); }} placeholder="e.g. Product launch" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button><Button disabled={!templateName.trim() || busy !== null} onClick={() => void saveTemplate()}>{busy === "Saving template…" ? <LoaderCircle className="animate-spin" /> : <Save />} Save template</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameTemplateTarget)} onOpenChange={(open) => { if (!open) setRenameTemplateTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename template</DialogTitle><DialogDescription>Change the name shown in your saved templates.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="rename-template-name">Template name</Label><Input id="rename-template-name" autoFocus value={renameName} maxLength={48} onChange={(event) => setRenameName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void renameTemplate(); }} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setRenameTemplateTarget(null)}>Cancel</Button><Button disabled={!renameName.trim()} onClick={() => void renameTemplate()}>Save name</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={missingScreenshotOpen} onOpenChange={setMissingScreenshotOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a screenshot</DialogTitle><DialogDescription>The template is ready. Add a screenshot to finish the composition.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setMissingScreenshotOpen(false)}>Later</Button><Button onClick={() => { setMissingScreenshotOpen(false); fileScreenshotRef.current?.click(); }}><ImagePlus /> Choose screenshot</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateListOpen} onOpenChange={setTemplateListOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Saved templates</DialogTitle><DialogDescription>Templates are stored in this browser on this device.</DialogDescription></DialogHeader>
          {templates.length === 0 ? <div className="rounded-[var(--radius-control)] bg-muted/60 p-5 text-center text-sm text-muted-foreground">No templates saved yet.</div> : (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border p-2">
                  <button type="button" onClick={() => applyTemplate(template)} className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1.5 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                    <span className="size-10 shrink-0 rounded-md ring-1 ring-border" style={{ background: template.composition.background.type === "gradient" ? `linear-gradient(${template.composition.background.gradientAngle}deg, ${template.composition.background.gradientFrom}, ${template.composition.background.gradientTo})` : template.composition.background.color }} />
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{template.name}</span><span className="block text-xs text-muted-foreground">{template.composition.canvas.width} × {template.composition.canvas.height}</span></span>
                  </button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Rename ${template.name}`} onClick={() => { setTemplateListOpen(false); setRenameName(template.name); setRenameTemplateTarget(template); }}><Pencil /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Update ${template.name} from current composition`} onClick={() => { setSelectedTemplateId(template.id); setTemplateName(template.name); setTemplateListOpen(false); setTemplateDialogOpen(true); }}><Save /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${template.name}`} onClick={() => void deleteTemplate(template)}><Trash2 /></Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] leading-5 text-muted-foreground">Clearing browser data can remove these templates. Download a project file to keep a separate copy.</p>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Export image</DialogTitle><DialogDescription>{composition.canvas.width} × {composition.canvas.height} pixels. The export is rendered locally in your browser.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <SelectField label="File format" value={exportFormat} options={[["png", "PNG · transparency supported"], ["jpeg", "JPEG · white background"]]} onChange={(value) => setExportFormat(value as "png" | "jpeg")} />
            {exportFormat === "jpeg" && <RangeControl id="jpeg-quality" label="JPEG quality" value={jpegQuality} min={50} max={100} format={(n) => `${Math.round(n)}%`} onChange={setJpegQuality} onStart={() => {}} onEnd={() => {}} />}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button><Button disabled={busy !== null} onClick={() => void exportImage()}>{busy === "Rendering image…" ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />} Download image</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(recovery)} onOpenChange={(open) => { if (!open) setRecovery(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recover previous draft?</DialogTitle><DialogDescription>A local draft is available from your last session. Browser storage can be cleared, so download a project file to keep a permanent copy.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={discardDraft}>Start fresh</Button><Button onClick={recoverDraft}><Check /> Restore draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {busy && <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs text-background shadow-[var(--shadow-popover)]"><LoaderCircle className="size-3.5 animate-spin" />{busy}</div>}
    </div>
  );
}
