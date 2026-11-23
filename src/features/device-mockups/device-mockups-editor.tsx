"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileDown,
  FileUp,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Upload,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEventHandler, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { ToolBrandMark } from "@/components/tool-brand-mark";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  MAX_PROJECT_BYTES,
  MAX_SOURCE_DIMENSION,
  MAX_SOURCE_PIXELS,
  MAX_UPLOAD_BYTES,
  createDefaultComposition,
  validateComposition,
  validateMockupAsset,
  validateProjectFile,
  type MockupAsset,
  type MockupComposition,
  type MockupDraft,
  type MockupCategory,
  type MockupTemplate,
} from "./model";
import { getMockupCategories, getMockupTemplate, listMockupTemplates } from "./catalog";
import { deviceMockupStorage, blobToDataUrl, createMockupAssetId, dataUrlToBlob } from "./storage";
import { loadMockupImage, renderMockup, screenBounds, type LoadedMockupImage } from "./render";

type EditorSnapshot = { composition: MockupComposition; asset: MockupAsset | null };
type CategoryFilter = "all" | MockupCategory;
type ExportFormat = "image/png" | "image/jpeg";

const MAX_HISTORY = 60;
const SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const CATEGORY_LABELS: Record<MockupCategory, string> = {
  laptop: "Laptop",
  monitor: "Monitor",
  phone: "Phone",
  tablet: "Tablet",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function imageLabel(mimeType: string) {
  return mimeType === "image/jpeg" ? "JPEG" : mimeType === "image/webp" ? "WebP" : "PNG";
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sameSnapshot(a: EditorSnapshot, b: EditorSnapshot) {
  if (a.asset?.id !== b.asset?.id) return false;
  return Object.keys(a.composition).every((key) =>
    a.composition[key as keyof MockupComposition] === b.composition[key as keyof MockupComposition]
  );
}

function pointInsideQuad(x: number, y: number, corners: MockupTemplate["screenCorners"]) {
  let inside = false;
  for (let index = 0, previous = corners.length - 1; index < corners.length; previous = index, index += 1) {
    const currentPoint = corners[index];
    const previousPoint = corners[previous];
    const intersects = (currentPoint.y > y) !== (previousPoint.y > y) &&
      x < ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) / (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function RangeSetting({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  onStart,
  onEnd,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  onStart: () => void;
  onEnd: () => void;
}) {
  return (
    <div
      className="space-y-2.5"
      onPointerDownCapture={onStart}
      onPointerUpCapture={onEnd}
      onPointerCancelCapture={onEnd}
      onKeyDownCapture={onStart}
      onKeyUpCapture={onEnd}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onEnd();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
        <span className="text-xs tabular-nums text-foreground">{display}</span>
      </div>
      <Slider
        id={id}
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(typeof values === "number" ? values : values[0] ?? value)}
        onValueCommitted={onEnd}
      />
    </div>
  );
}

export function DeviceMockupsEditor() {
  const [templates, setTemplates] = useState<MockupTemplate[]>([]);
  const [composition, setComposition] = useState<MockupComposition>(createDefaultComposition());
  const [asset, setAsset] = useState<MockupAsset | null>(null);
  const [sceneImage, setSceneImage] = useState<LoadedMockupImage | null>(null);
  const [sceneTemplateId, setSceneTemplateId] = useState<string | null>(null);
  const [sceneFailedId, setSceneFailedId] = useState<string | null>(null);
  const [screenshotImage, setScreenshotImage] = useState<LoadedMockupImage | null>(null);
  const [screenshotAssetId, setScreenshotAssetId] = useState<string | null>(null);
  const [screenshotFailedId, setScreenshotFailedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [catalogReady, setCatalogReady] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [recovery, setRecovery] = useState<MockupDraft | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("image/png");
  const [busy, setBusy] = useState<"export" | "project" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [historyAvailability, setHistoryAvailability] = useState({ canUndo: false, canRedo: false });
  const [previewMode, setPreviewMode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const compositionRef = useRef(composition);
  const assetRef = useRef(asset);
  const dirtyRef = useRef(false);
  const pastRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const historyGroupRef = useRef<EditorSnapshot | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const selectedTemplate = templates.find((template) => template.id === composition.templateId) ?? null;
  const availableCategories = getMockupCategories(templates);
  const filteredTemplates = templates.filter((template) => categoryFilter === "all" || template.category === categoryFilter);

  const setSavedState = useCallback((next: MockupComposition, nextAsset: MockupAsset | null, markDirty: boolean) => {
    compositionRef.current = next;
    assetRef.current = nextAsset;
    dirtyRef.current = markDirty;
    setComposition(next);
    setAsset(nextAsset);
    setDirty(markDirty);
    if (markDirty) {
      setNotice(null);
      setError(null);
    }
  }, []);

  const captureSnapshot = useCallback((): EditorSnapshot => ({
    composition: compositionRef.current,
    asset: assetRef.current,
  }), []);

  const pushHistory = useCallback((stack: EditorSnapshot[], snapshot: EditorSnapshot) => {
    stack.push(snapshot);
    if (stack.length > MAX_HISTORY) stack.shift();
  }, []);

  const refreshHistoryAvailability = useCallback(() => {
    setHistoryAvailability({ canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 });
  }, []);

  const beginHistoryGroup = useCallback(() => {
    if (!historyGroupRef.current) historyGroupRef.current = captureSnapshot();
  }, [captureSnapshot]);

  const finishHistoryGroup = useCallback(() => {
    const start = historyGroupRef.current;
    if (!start) return;
    if (!sameSnapshot(start, captureSnapshot())) {
      pushHistory(pastRef.current, start);
      futureRef.current = [];
      refreshHistoryAvailability();
    }
    historyGroupRef.current = null;
  }, [captureSnapshot, pushHistory, refreshHistoryAvailability]);

  const applyEdit = useCallback((next: MockupComposition, nextAsset: MockupAsset | null = assetRef.current, grouped = false) => {
    const current = captureSnapshot();
    const nextSnapshot = { composition: next, asset: nextAsset };
    if (sameSnapshot(current, nextSnapshot)) return;
    if (historyGroupRef.current) {
      // The continuous edit will be committed as one history entry when the gesture ends.
    } else if (grouped) {
      historyGroupRef.current = current;
    } else {
      pushHistory(pastRef.current, current);
      futureRef.current = [];
      refreshHistoryAvailability();
    }
    setSavedState(next, nextAsset, true);
  }, [captureSnapshot, pushHistory, refreshHistoryAvailability, setSavedState]);

  const updateComposition = useCallback((patch: Partial<MockupComposition>, grouped = false) => {
    if (!grouped) finishHistoryGroup();
    applyEdit({ ...compositionRef.current, ...patch }, assetRef.current, grouped);
  }, [applyEdit, finishHistoryGroup]);

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    historyGroupRef.current = null;
    refreshHistoryAvailability();
  }, [refreshHistoryAvailability]);

  const restoreSnapshot = useCallback((snapshot: EditorSnapshot, markDirty = true) => {
    setSavedState(snapshot.composition, snapshot.asset, markDirty);
  }, [setSavedState]);

  const undo = useCallback(() => {
    finishHistoryGroup();
    const previous = pastRef.current.pop();
    if (!previous) return;
    pushHistory(futureRef.current, captureSnapshot());
    restoreSnapshot(previous);
    refreshHistoryAvailability();
  }, [captureSnapshot, finishHistoryGroup, pushHistory, refreshHistoryAvailability, restoreSnapshot]);

  const redo = useCallback(() => {
    finishHistoryGroup();
    const next = futureRef.current.pop();
    if (!next) return;
    pushHistory(pastRef.current, captureSnapshot());
    restoreSnapshot(next);
    refreshHistoryAvailability();
  }, [captureSnapshot, finishHistoryGroup, pushHistory, refreshHistoryAvailability, restoreSnapshot]);

  useEffect(() => {
    let active = true;
    async function loadInitialState() {
      try {
        const catalog = await listMockupTemplates();
        let draft: MockupDraft | undefined;
        try {
          draft = await deviceMockupStorage.getDraft();
        } catch {
          setNotice("Local draft recovery is unavailable in this browser. Download a project file to keep a copy.");
        }
        if (!active) return;
        setTemplates([...catalog]);
        setCatalogReady(true);
        if (draft && validateComposition(draft.composition) && (!draft.asset || validateMockupAsset(draft.asset)) &&
          draft.composition.assetId === (draft.asset?.id ?? null)) {
          setRecovery(draft);
        } else if (draft) {
          setNotice("A previous draft could not be restored. Open a downloaded project file if you have one.");
        }
        if (!draft && catalog[0]) {
          const initial = { ...createDefaultComposition(), templateId: catalog[0].id, templateVersion: catalog[0].version };
          compositionRef.current = initial;
          setComposition(initial);
        }
      } catch {
        if (active) setError("The mockup list could not be loaded. Refresh the page to try again.");
      } finally {
        if (active) {
          setCatalogReady(true);
          setStorageReady(true);
        }
      }
    }
    void loadInitialState();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!storageReady || !dirty) return;
    const timeout = window.setTimeout(() => {
      const draft: MockupDraft = {
        key: "active",
        composition,
        asset,
        updatedAt: Date.now(),
      };
      deviceMockupStorage.saveDraft(draft).catch(() => {
        setNotice("The recovery draft could not be saved. Download a project file to keep a copy.");
      });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [asset, composition, dirty, storageReady]);

  useEffect(() => {
    if (!selectedTemplate) {
      setSceneImage(null);
      setSceneTemplateId(null);
      setSceneFailedId(null);
      return;
    }
    let active = true;
    setSceneImage(null);
    setSceneTemplateId(null);
    setSceneFailedId(null);
    loadMockupImage(selectedTemplate.sceneSrc)
      .then((image) => {
        if (!active) return;
        setSceneImage(image);
        setSceneTemplateId(selectedTemplate.id);
      })
      .catch(() => {
        if (!active) return;
        setSceneFailedId(selectedTemplate.id);
        setError("This mockup scene could not be loaded.");
      });
    return () => { active = false; };
  }, [selectedTemplate?.id]);

  useEffect(() => {
    if (!asset) {
      setScreenshotImage(null);
      setScreenshotAssetId(null);
      setScreenshotFailedId(null);
      return;
    }
    let active = true;
    setScreenshotImage(null);
    setScreenshotAssetId(null);
    setScreenshotFailedId(null);
    const url = URL.createObjectURL(asset.blob);
    loadMockupImage(url)
      .then((image) => {
        if (!active) return;
        setScreenshotImage(image);
        setScreenshotAssetId(asset.id);
      })
      .catch(() => {
        if (!active) return;
        setScreenshotFailedId(asset.id);
        setError("The screenshot could not be opened. Try another PNG, JPEG, or WebP image.");
      });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [asset?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedTemplate || !sceneImage || sceneTemplateId !== selectedTemplate.id ||
      sceneImage.width !== selectedTemplate.sceneWidth || sceneImage.height !== selectedTemplate.sceneHeight ||
      (asset && (!screenshotImage || screenshotAssetId !== asset.id))) return;
    try {
      renderMockup(canvas, selectedTemplate, sceneImage, screenshotImage, composition, !previewMode, 1);
    } catch {
      setError("The mockup preview could not be rendered. Try another scene or screenshot.");
    }
  }, [asset, composition, previewMode, sceneImage, sceneTemplateId, screenshotImage, screenshotAssetId, selectedTemplate]);

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
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const selectTemplate = (template: MockupTemplate) => {
    finishHistoryGroup();
    updateComposition({ templateId: template.id, templateVersion: template.version });
  };

  const addImage = async (file: File) => {
    setError(null);
    setNotice(null);
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("This image is larger than 40 MB. Choose a smaller file.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const decoded = await loadMockupImage(objectUrl);
      if (decoded.width > MAX_SOURCE_DIMENSION || decoded.height > MAX_SOURCE_DIMENSION || decoded.width * decoded.height > MAX_SOURCE_PIXELS) {
        setError("This image is too large to edit. Use an image up to 16,000 pixels per side and 32 megapixels total.");
        return;
      }
      const nextAsset: MockupAsset = {
        id: createMockupAssetId(),
        blob: file,
        name: file.name || "screenshot",
        mimeType: file.type,
        width: decoded.width,
        height: decoded.height,
        updatedAt: Date.now(),
      };
      const nextComposition = {
        ...compositionRef.current,
        assetId: nextAsset.id,
        fit: "fill" as const,
        zoom: 1,
        panX: 0,
        panY: 0,
      };
      applyEdit(nextComposition, nextAsset);
    } catch {
      setError("This image could not be opened. Try another PNG, JPEG, or WebP file.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const openFilePicker = () => imageInputRef.current?.click();

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingFile(false);
    const file = [...event.dataTransfer.files].find((candidate) => SUPPORTED_MIME_TYPES.includes(candidate.type));
    if (file) void addImage(file);
    else setError("Drop a PNG, JPEG, or WebP screenshot here.");
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files ?? [])].find((candidate) => SUPPORTED_MIME_TYPES.includes(candidate.type));
      if (!file) return;
      event.preventDefault();
      void addImage(file);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const removeImage = () => {
    const next = { ...compositionRef.current, assetId: null, zoom: 1, panX: 0, panY: 0 };
    applyEdit(next, null);
  };

  const restoreDraft = () => {
    if (!recovery) return;
    const template = recovery.composition.templateId ? templates.find((item) => item.id === recovery.composition.templateId) : null;
    if (!template || template.version !== recovery.composition.templateVersion) {
      setNotice("That draft uses a mockup that is no longer available. Choose a current mockup or open a downloaded project.");
      setRecovery(null);
      return;
    }
    resetHistory();
    setSavedState(recovery.composition, recovery.asset, false);
    setRecovery(null);
    setNotice("Draft restored from this browser.");
  };

  const discardDraft = () => {
    setRecovery(null);
    deviceMockupStorage.clearDraft().catch(() => setNotice("The old recovery draft could not be cleared."));
    const first = templates[0];
    const initial = createDefaultComposition();
    if (first) {
      initial.templateId = first.id;
      initial.templateVersion = first.version;
    }
    resetHistory();
    setSavedState(initial, null, false);
  };

  const saveProject = async () => {
    setProjectMenuOpen(false);
    setBusy("project");
    setError(null);
    try {
      const currentAsset = assetRef.current;
      const project = {
        kind: "device-mockup-project" as const,
        version: 1 as const,
        createdAt: new Date().toISOString(),
        composition: compositionRef.current,
        asset: currentAsset ? {
          id: currentAsset.id,
          name: currentAsset.name,
          mimeType: currentAsset.mimeType,
          width: currentAsset.width,
          height: currentAsset.height,
          updatedAt: currentAsset.updatedAt,
          dataUrl: await blobToDataUrl(currentAsset.blob),
        } : null,
      };
      const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
      if (blob.size > MAX_PROJECT_BYTES) throw new Error("This project is larger than 80 MB and cannot be downloaded.");
      const date = new Date().toISOString().slice(0, 10);
      saveBlob(blob, `device-mockup-${date}.devicemockup`);
      dirtyRef.current = false;
      setDirty(false);
      await deviceMockupStorage.clearDraft().catch(() => undefined);
      setNotice("Project downloaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The project could not be downloaded.");
    } finally {
      setBusy(null);
    }
  };

  const openProject = async (file: File) => {
    setError(null);
    setNotice(null);
    if (dirtyRef.current && !window.confirm("Replace the current mockup? Unsaved changes will be lost.")) return;
    if (file.size > MAX_PROJECT_BYTES) {
      setError("This project is larger than 80 MB.");
      return;
    }
    setBusy("project");
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (!validateProjectFile(raw)) throw new Error("This is not a valid Device Mockups project file.");
      const template = raw.composition.templateId ? await getMockupTemplate(raw.composition.templateId) : null;
      if (!template || template.version !== raw.composition.templateVersion) {
        throw new Error("This project uses a mockup that is not available in this version of the app.");
      }
      let restoredAsset: MockupAsset | null = null;
      if (raw.asset) {
        const blob = await dataUrlToBlob(raw.asset.dataUrl);
        if (blob.size > MAX_UPLOAD_BYTES || blob.type !== raw.asset.mimeType) throw new Error("The project contains an unsupported or oversized screenshot.");
        const url = URL.createObjectURL(blob);
        try {
          const image = await loadMockupImage(url);
          if (image.width !== raw.asset.width || image.height !== raw.asset.height) throw new Error("The project screenshot dimensions do not match its metadata.");
        } finally {
          URL.revokeObjectURL(url);
        }
        restoredAsset = {
          id: raw.asset.id,
          name: raw.asset.name,
          mimeType: raw.asset.mimeType,
          width: raw.asset.width,
          height: raw.asset.height,
          updatedAt: raw.asset.updatedAt,
          blob,
        };
      }
      resetHistory();
      setSavedState(raw.composition, restoredAsset, false);
      await deviceMockupStorage.clearDraft().catch(() => undefined);
      setNotice("Project opened.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The project file could not be opened.");
    } finally {
      setBusy(null);
    }
  };

  const exportImage = async () => {
    if (!selectedTemplate || !sceneImage || sceneTemplateId !== selectedTemplate.id || !catalogReady) return;
    if (assetRef.current && (!screenshotImage || screenshotAssetId !== assetRef.current.id)) {
      setError("The screenshot is still loading. Try exporting again in a moment.");
      return;
    }
    setBusy("export");
    setError(null);
    setExportOpen(false);
    try {
      const canvas = document.createElement("canvas");
      renderMockup(canvas, selectedTemplate, sceneImage, screenshotImage, compositionRef.current, false, compositionRef.current.outputScale);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("The image could not be created.")), exportFormat, exportFormat === "image/jpeg" ? 0.92 : undefined);
      });
      const extension = exportFormat === "image/jpeg" ? "jpg" : "png";
      saveBlob(blob, `${selectedTemplate.id}.${extension}`);
      setNotice("Image downloaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The image could not be exported.");
    } finally {
      setBusy(null);
    }
  };

  const handleHomeNavigation: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (dirtyRef.current && !window.confirm("You have unsaved changes. Leave this editor?")) event.preventDefault();
  };

  const handleScreenPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (previewMode || !assetRef.current || !selectedTemplate || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) / Math.max(1, rect.height);
    if (!pointInsideQuad(x, y, selectedTemplate.screenCorners)) return;
    event.preventDefault();
    beginHistoryGroup();
    pointerRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.style.cursor = "grabbing";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleScreenPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const previous = pointerRef.current;
    if (!previous || !selectedTemplate) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(1, rect.width);
      const y = (event.clientY - rect.top) / Math.max(1, rect.height);
      event.currentTarget.style.cursor = !previewMode && assetRef.current && selectedTemplate && pointInsideQuad(x, y, selectedTemplate.screenCorners) ? "grab" : "default";
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const bounds = screenBounds(selectedTemplate);
    const changeX = ((event.clientX - previous.x) / Math.max(1, rect.width * bounds.width)) * 100;
    const changeY = ((event.clientY - previous.y) / Math.max(1, rect.height * bounds.height)) * 100;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    updateComposition({
      panX: clamp(compositionRef.current.panX + changeX, -100, 100),
      panY: clamp(compositionRef.current.panY + changeY, -100, 100),
    }, true);
  };

  const handleScreenPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    pointerRef.current = null;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) / Math.max(1, rect.height);
    event.currentTarget.style.cursor = !previewMode && assetRef.current && selectedTemplate && pointInsideQuad(x, y, selectedTemplate.screenCorners) ? "grab" : "default";
    finishHistoryGroup();
  };

  const handleCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (previewMode || !assetRef.current) return;
    const step = event.shiftKey ? 10 : 1;
    const patch = event.key === "ArrowLeft" ? { panX: clamp(compositionRef.current.panX - step, -100, 100) }
      : event.key === "ArrowRight" ? { panX: clamp(compositionRef.current.panX + step, -100, 100) }
        : event.key === "ArrowUp" ? { panY: clamp(compositionRef.current.panY - step, -100, 100) }
          : event.key === "ArrowDown" ? { panY: clamp(compositionRef.current.panY + step, -100, 100) }
            : null;
    if (patch) {
      event.preventDefault();
      updateComposition(patch);
    }
  };

  const beginScreenRangeEdit = () => beginHistoryGroup();
  const endScreenRangeEdit = () => finishHistoryGroup();

  const sceneFailed = Boolean(selectedTemplate && sceneFailedId === selectedTemplate.id);
  const screenshotFailed = Boolean(asset && screenshotFailedId === asset.id);
  const screenImageReady = !asset || screenshotAssetId === asset.id;
  const canvasContent = selectedTemplate && sceneImage && sceneTemplateId === selectedTemplate.id && screenImageReady ? (
    <canvas
      ref={canvasRef}
      aria-label={`${previewMode ? "Finished preview" : "Editable preview"}: ${selectedTemplate.name}${asset ? ". Use arrow keys to reposition the screenshot." : ""}`}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      role={asset && !previewMode ? "application" : "img"}
      tabIndex={asset && !previewMode ? 0 : -1}
      onPointerDown={handleScreenPointerDown}
      onPointerMove={handleScreenPointerMove}
      onPointerUp={handleScreenPointerUp}
      onPointerCancel={handleScreenPointerUp}
      onKeyDown={handleCanvasKeyDown}
      className={`block max-h-full max-w-full rounded-[var(--radius-control)] object-contain shadow-[var(--shadow-card)] outline-none focus-visible:ring-2 focus-visible:ring-ring ${asset && !previewMode ? "touch-none" : ""}`}
      style={{ width: "auto", height: "auto", aspectRatio: `${selectedTemplate.sceneWidth}/${selectedTemplate.sceneHeight}` }}
    />
  ) : (
    <div className="flex aspect-[3/2] w-full max-w-3xl flex-col items-center justify-center rounded-[var(--radius-card)] border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
      {sceneFailed || screenshotFailed || (catalogReady && !selectedTemplate)
        ? <ImagePlus className="mb-3 size-6 text-muted-foreground" aria-hidden="true" />
        : <LoaderCircle className="mb-3 size-5 animate-spin text-muted-foreground" aria-hidden="true" />}
      <p className="font-medium">
        {!catalogReady ? "Loading mockups" : sceneFailed ? "Mockup scene unavailable" : screenshotFailed ? "Screenshot unavailable" : selectedTemplate ? "Loading preview" : "No mockups available"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {sceneFailed ? "Refresh the page to try loading this scene again." : screenshotFailed ? "Choose a different PNG, JPEG, or WebP screenshot." : selectedTemplate ? "The selected preview is loading." : "Refresh the page to try loading the catalog again."}
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex min-h-16 flex-wrap items-center gap-3 border-b border-border px-4 py-2 sm:px-6">
        <Link href="/" onClick={handleHomeNavigation} aria-label="Back to tools" className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowLeft className="size-4" />
        </Link>
        <ToolBrandMark />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">Device Mockups</h1>
          <p className="text-xs text-muted-foreground">Place a screenshot inside a laptop or monitor scene.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Undo" title="Undo" disabled={!historyAvailability.canUndo} onClick={undo}><Undo2 /></Button>
          <Button variant="ghost" size="icon" aria-label="Redo" title="Redo" disabled={!historyAvailability.canRedo} onClick={redo}><Redo2 /></Button>
        </div>
        <Popover open={projectMenuOpen} onOpenChange={setProjectMenuOpen}>
          <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5 max-[420px]:size-8 max-[420px]:px-0" aria-label="Project files" />}>
            <FileDown />
            <span className="max-[420px]:sr-only">Project</span>
            <ChevronDown className="size-3.5 max-[420px]:hidden" />
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="space-y-3">
            <div>
              <h2 className="text-sm font-medium">Project files</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Save your screenshot and settings, or open a project from this device.</p>
            </div>
            <div className="grid gap-2">
              <Button variant="outline" className="h-auto justify-start gap-3 whitespace-normal px-3 py-2.5 text-left" disabled={busy !== null} onClick={() => void saveProject()}>
                <FileDown className="size-4 shrink-0" />
                <span className="grid gap-0.5"><span className="font-medium">Download project</span><span className="text-xs font-normal leading-4 text-muted-foreground">Keep this mockup and its screenshot in a project file.</span></span>
              </Button>
              <Button variant="outline" className="h-auto justify-start gap-3 whitespace-normal px-3 py-2.5 text-left" disabled={busy !== null} onClick={() => { setProjectMenuOpen(false); projectInputRef.current?.click(); }}>
                <FileUp className="size-4 shrink-0" />
                <span className="grid gap-0.5"><span className="font-medium">Open project</span><span className="text-xs font-normal leading-4 text-muted-foreground">Continue from a .devicemockup file.</span></span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Button size="sm" className="gap-1.5" disabled={!selectedTemplate || busy !== null} onClick={() => setExportOpen(true)}>
          {busy === "export" ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      <main className="grid flex-1 grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="order-3 border-t border-border bg-background xl:order-1 xl:border-t-0 xl:border-r xl:border-b-0">
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
            <div>
              <h2 className="text-sm font-semibold">Mockups</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Choose a scene</p>
            </div>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
              <SelectTrigger size="sm" aria-label="Filter mockups by device" className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All devices</SelectItem>
                {availableCategories.map((category) => <SelectItem key={category} value={category}>{CATEGORY_LABELS[category]}s</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3 xl:grid-cols-1 xl:overflow-y-auto xl:px-3">
            {filteredTemplates.map((template) => {
              const selected = template.id === selectedTemplate?.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectTemplate(template)}
                  className={`group min-w-0 overflow-hidden rounded-[var(--radius-control)] border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-primary bg-accent/40" : "border-border bg-card hover:border-ring/60"}`}
                >
                  <span className="relative block aspect-[16/10] overflow-hidden bg-muted">
                    <img src={template.previewSrc} alt="" className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                    {selected && <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
                  </span>
                  <span className="block px-2.5 py-2">
                    <span className="block truncate text-xs font-medium">{template.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{CATEGORY_LABELS[template.category]}</span>
                  </span>
                </button>
              );
            })}
            {catalogReady && filteredTemplates.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No mockups in this category yet.</p>}
          </div>
        </aside>

        <section className="order-1 flex min-h-[48vh] flex-col bg-workspace xl:order-2 xl:min-h-0" aria-label="Mockup preview">
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 text-xs text-muted-foreground">
            <span className="truncate">{selectedTemplate?.name ?? "Preview"}</span>
            <span className="shrink-0 tabular-nums">{selectedTemplate ? `${selectedTemplate.sceneWidth * composition.outputScale} × ${selectedTemplate.sceneHeight * composition.outputScale}` : ""}</span>
          </div>
          <div
            onDragEnter={(event) => { event.preventDefault(); setDraggingFile(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingFile(false); }}
            onDrop={handleDrop}
            className={`checkerboard relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 sm:p-8 ${draggingFile ? "ring-2 ring-inset ring-primary" : ""}`}
          >
            <div className="flex max-h-full max-w-full items-center justify-center">
              {canvasContent}
            </div>
            {draggingFile && <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-primary bg-background/75 text-sm font-medium">Drop screenshot to add it</div>}
          </div>
          <div className="flex min-h-9 items-center justify-between gap-3 border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="truncate">{asset ? "Drag the screenshot inside the screen to adjust its crop. Use arrow keys for precise movement." : "Add a screenshot to place it on the selected screen."}</span>
            <div role="group" aria-label="Preview mode" className="flex shrink-0 items-center gap-1">
              <Button size="xs" variant={previewMode ? "ghost" : "secondary"} aria-pressed={!previewMode} onClick={() => setPreviewMode(false)}>Edit</Button>
              <Button size="xs" variant={previewMode ? "secondary" : "ghost"} aria-pressed={previewMode} onClick={() => setPreviewMode(true)}>Finished</Button>
            </div>
          </div>
        </section>

        <aside className="order-2 flex flex-col border-t border-border bg-background xl:order-3 xl:border-t-0 xl:border-l">
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Screenshot</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{asset ? `${asset.width} × ${asset.height} · ${imageLabel(asset.mimeType)}` : "Add a product screenshot to the mockup."}</p>
              </div>
              {asset && <Button variant="ghost" size="icon-sm" aria-label="Remove screenshot" title="Remove screenshot" onClick={removeImage}><X /></Button>}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void addImage(file); event.currentTarget.value = ""; }}
            />
            <input
              ref={projectInputRef}
              type="file"
              accept=".devicemockup,application/json"
              className="sr-only"
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void openProject(file); event.currentTarget.value = ""; }}
            />
            <Button variant={asset ? "outline" : "default"} className="mt-3 w-full gap-2" onClick={openFilePicker} disabled={busy !== null}>
              {asset ? <Upload /> : <ImagePlus />}{asset ? "Replace screenshot" : "Choose screenshot"}
            </Button>
            {!asset && <p className="mt-2 text-center text-[11px] text-muted-foreground">You can also paste or drop an image.</p>}
          </div>

          <div className="flex-1 space-y-6 px-4 py-4">
            <section className="space-y-3" aria-labelledby="screen-fit-title">
              <div>
                <h3 id="screen-fit-title" className="text-xs font-semibold">Screen fit</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">The screenshot keeps its proportions. Fill crops edges; Fit may leave blank space.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={composition.fit === "fill" ? "secondary" : "outline"} size="sm" aria-pressed={composition.fit === "fill"} onClick={() => updateComposition({ fit: "fill", zoom: 1, panX: 0, panY: 0 })}>Fill screen</Button>
                <Button variant={composition.fit === "fit" ? "secondary" : "outline"} size="sm" aria-pressed={composition.fit === "fit"} onClick={() => updateComposition({ fit: "fit", zoom: 1, panX: 0, panY: 0 })}>Fit image</Button>
              </div>
            </section>

            {asset && <>
              <RangeSetting
                id="mockup-zoom"
                label="Zoom"
                value={composition.zoom}
                min={1}
                max={3}
                step={0.01}
                display={`${Math.round(composition.zoom * 100)}%`}
                onChange={(value) => updateComposition({ zoom: value }, true)}
                onStart={beginScreenRangeEdit}
                onEnd={endScreenRangeEdit}
              />
              <RangeSetting
                id="mockup-position-x"
                label="Horizontal position"
                value={composition.panX}
                min={-100}
                max={100}
                step={1}
                display={`${Math.round(composition.panX)}%`}
                onChange={(value) => updateComposition({ panX: value }, true)}
                onStart={beginScreenRangeEdit}
                onEnd={endScreenRangeEdit}
              />
              <RangeSetting
                id="mockup-position-y"
                label="Vertical position"
                value={composition.panY}
                min={-100}
                max={100}
                step={1}
                display={`${Math.round(composition.panY)}%`}
                onChange={(value) => updateComposition({ panY: value }, true)}
                onStart={beginScreenRangeEdit}
                onEnd={endScreenRangeEdit}
              />
              <Button variant="ghost" size="sm" className="gap-2 px-0 text-muted-foreground" onClick={() => updateComposition({ fit: "fill", zoom: 1, panX: 0, panY: 0 })}>
                <RotateCcw /> Reset crop
              </Button>
            </>}

            {selectedTemplate && <section className="space-y-3 border-t border-border pt-5" aria-labelledby="output-size-title">
              <div>
                <h3 id="output-size-title" className="text-xs font-semibold">Output size</h3>
                <p className="mt-1 text-xs text-muted-foreground">Use the scene size or export at twice its resolution.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={composition.outputScale === 1 ? "secondary" : "outline"} size="sm" aria-pressed={composition.outputScale === 1} onClick={() => updateComposition({ outputScale: 1 })}>1×</Button>
                <Button variant={composition.outputScale === 2 ? "secondary" : "outline"} size="sm" aria-pressed={composition.outputScale === 2} onClick={() => updateComposition({ outputScale: 2 })}>2×</Button>
              </div>
            </section>}
          </div>

          <p className="border-t border-border px-4 py-3 text-[11px] leading-5 text-muted-foreground">Screenshots and drafts stay in this browser. Download a project file to keep a portable copy.</p>
        </aside>
      </main>

      {(error || notice) && <div role={error ? "alert" : "status"} className={`fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-sm shadow-[var(--shadow-popover)] sm:left-1/2 sm:right-auto sm:w-auto sm:min-w-64 sm:max-w-xl sm:-translate-x-1/2 ${error ? "border-destructive/40 bg-destructive-surface text-destructive-foreground" : "border-border bg-popover text-popover-foreground"}`}>
        <span>{error ?? notice}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Dismiss message" onClick={() => { setError(null); setNotice(null); }}><X /></Button>
      </div>}

      <Dialog open={Boolean(recovery)} onOpenChange={(open) => { if (!open) discardDraft(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recover previous draft?</DialogTitle>
            <DialogDescription>A local draft is available from this browser. Browser storage can be cleared, so download a project file to keep a separate copy.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={discardDraft}>Start fresh</Button>
            <Button onClick={restoreDraft}>Restore draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export image</DialogTitle>
            <DialogDescription>{selectedTemplate ? `${selectedTemplate.sceneWidth * composition.outputScale} × ${selectedTemplate.sceneHeight * composition.outputScale} pixels` : "Choose a mockup before exporting."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-format">File format</Label>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                <SelectTrigger id="export-format" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image/png">PNG</SelectItem>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exportFormat === "image/jpeg" && <p className="text-xs leading-5 text-muted-foreground">JPEG uses 92% quality. The scene background is already opaque.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button onClick={() => void exportImage()} disabled={!selectedTemplate || !sceneImage || busy !== null}><Download /> Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
