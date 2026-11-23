"use client";

import Link from "next/link";
import {
  ArrowDownToLine, ArrowLeft, ChevronDown, ChevronUp, Crop, Download, Eye, EyeOff,
  FileUp, Grid2X2, ImagePlus, LoaderCircle, Move, Plus, Redo2, RotateCcw, Trash2, Undo2, X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToolBrandMark } from "@/components/tool-brand-mark";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MAX_CANVAS_DIMENSION, MAX_CANVAS_PIXELS, MAX_CELLS, MAX_PROJECT_BYTES, MAX_SOURCE_DIMENSION,
  MAX_SOURCE_PIXELS, MAX_UPLOAD_BYTES, createDefaultComposition, createDiagonalCells,
  createGridCells, validateComposition, validateProject,
  type CollageAsset, type CollageCell, type CollageComposition, type CollageProjectFile,
} from "./model";
import { blobToDataUrl, collageStorage, createAssetId, dataUrlToBlob } from "./storage";
import { hitTestCell, renderComposition, type LoadedImage } from "./render";

type EditPanel = "layout" | "cell" | "background";
type CanvasDrag = {
  pointerId: number; cellId: string; startX: number; startY: number;
  initial: CollageCell; mode: "move" | "resize" | "crop"; started: boolean;
};

const canvasPresets = [
  { name: "Square", width: 1080, height: 1080 },
  { name: "Portrait", width: 1080, height: 1350 },
  { name: "Landscape", width: 1200, height: 675 },
  { name: "Story", width: 1080, height: 1920 },
] as const;

function readImage(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This image could not be opened. Try a PNG, JPEG, or WebP file.")); };
    image.src = url;
  });
}

function loadImage(blob: Blob): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve({ image, width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("A saved image could not be loaded.")); };
    image.src = url;
  });
}

function isTextInput(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)));
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1.5"><span className="flex items-center justify-between gap-2 text-xs font-medium"><span>{label}</span>{hint && <span className="font-normal text-muted-foreground">{hint}</span>}</span>{children}</label>;
}

function NumberField({ label, value, min, max, step = 1, suffix, onChange, onStart, onEnd }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string;
  onChange: (value: number) => void; onStart?: () => void; onEnd?: () => void;
}) {
  return <Field label={label}><div className="flex h-10 items-center overflow-hidden rounded-[var(--radius-control)] border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50"><input aria-label={label} type="number" value={Math.round(value * 100) / 100} min={min} max={max} step={step} onFocus={onStart} onBlur={onEnd} onPointerDown={onStart} onPointerUp={onEnd} onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") onStart?.(); }} onKeyUp={onEnd} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next))); }} className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />{suffix && <span className="pr-3 text-xs text-muted-foreground">{suffix}</span>}</div></Field>;
}

function RangeField({ label, value, min, max, step = 1, format = (number: number) => `${Math.round(number)}`, onChange, onStart, onEnd }: {
  label: string; value: number; min: number; max: number; step?: number; format?: (value: number) => string;
  onChange: (value: number) => void; onStart?: () => void; onEnd?: () => void;
}) {
  return <Field label={label} hint={format(value)}><input aria-label={label} type="range" value={value} min={min} max={max} step={step} onPointerDown={onStart} onPointerUp={onEnd} onKeyDown={(event) => { if (event.key.startsWith("Arrow")) onStart?.(); }} onKeyUp={onEnd} onBlur={onEnd} onChange={(event) => onChange(Number(event.target.value))} className="h-5 w-full cursor-pointer accent-primary" /></Field>;
}

function ColorField({ label, value, onChange, onStart, onEnd }: { label: string; value: string; onChange: (value: string) => void; onStart?: () => void; onEnd?: () => void }) {
  return <Field label={label}><div className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-input bg-background px-2"><input aria-label={`${label} color picker`} type="color" value={value} onPointerDown={onStart} onPointerUp={onEnd} onChange={(event) => onChange(event.target.value)} className="size-7 cursor-pointer rounded border-0 bg-transparent p-0" /><input aria-label={`${label} hex value`} value={value} maxLength={7} onFocus={onStart} onBlur={onEnd} onChange={(event) => /^#[0-9a-f]{0,6}$/i.test(event.target.value) && event.target.value.length === 7 && onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase outline-none" /></div></Field>;
}

function CanvasDimensionField({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const commit = (input: HTMLInputElement) => {
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed) || !onCommit(Math.round(parsed))) input.value = String(value);
  };
  return <Field label={label}><div className="flex h-10 items-center overflow-hidden rounded-[var(--radius-control)] border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50"><input ref={inputRef} key={`${label}-${value}`} aria-label={label} type="number" defaultValue={value} min={200} max={MAX_CANVAS_DIMENSION} onBlur={(event) => commit(event.currentTarget)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" /><span className="pr-3 text-xs text-muted-foreground">px</span></div></Field>;
}

export function CollageEditor() {
  const [composition, setComposition] = useState(createDefaultComposition);
  const compositionRef = useRef(composition);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<CanvasDrag | null>(null);
  const transactionRef = useRef(false);
  const pastRef = useRef<CollageComposition[]>([]);
  const futureRef = useRef<CollageComposition[]>([]);
  const volatileAssetsRef = useRef(new Map<string, CollageAsset>());
  const fileImagesRef = useRef<HTMLInputElement>(null);
  const fileBackgroundRef = useRef<HTMLInputElement>(null);
  const fileProjectRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<Map<string, LoadedImage>>(new Map());
  const [assetRevision, setAssetRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(composition.cells[0]?.id ?? null);
  const [panel, setPanel] = useState<EditPanel>("layout");
  const [cropMode, setCropMode] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [storageReady, setStorageReady] = useState(false);
  const [recovery, setRecovery] = useState<CollageComposition | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [availableCanvasHeight, setAvailableCanvasHeight] = useState(520);
  const selectedCell = composition.cells.find((cell) => cell.id === selectedId) ?? null;

  const updateHistoryButtons = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const setCurrent = useCallback((next: CollageComposition, markDirty = true) => {
    compositionRef.current = next;
    setComposition(next);
    if (markDirty) { dirtyRef.current = true; setDirty(true); }
  }, []);

  const beginEdit = useCallback(() => {
    if (transactionRef.current) return;
    transactionRef.current = true;
    pastRef.current = [...pastRef.current.slice(-79), compositionRef.current];
    futureRef.current = [];
    updateHistoryButtons();
  }, [updateHistoryButtons]);

  const edit = useCallback((transform: (current: CollageComposition) => CollageComposition) => {
    if (!transactionRef.current) beginEdit();
    setCurrent(transform(compositionRef.current));
  }, [beginEdit, setCurrent]);

  const endEdit = useCallback(() => { transactionRef.current = false; }, []);

  const oneEdit = useCallback((transform: (current: CollageComposition) => CollageComposition) => {
    beginEdit();
    setCurrent(transform(compositionRef.current));
    endEdit();
  }, [beginEdit, endEdit, setCurrent]);

  const undo = useCallback(() => {
    endEdit();
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current = [...futureRef.current, compositionRef.current];
    setCurrent(previous);
    updateHistoryButtons();
  }, [endEdit, setCurrent, updateHistoryButtons]);

  const redo = useCallback(() => {
    endEdit();
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current = [...pastRef.current, compositionRef.current];
    setCurrent(next);
    updateHistoryButtons();
  }, [endEdit, setCurrent, updateHistoryButtons]);

  useEffect(() => { compositionRef.current = composition; }, [composition]);

  useEffect(() => {
    const updateWorkspaceSize = () => setAvailableCanvasHeight(Math.max(220, window.innerHeight - 330));
    const frame = window.requestAnimationFrame(updateWorkspaceSize);
    window.addEventListener("resize", updateWorkspaceSize);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", updateWorkspaceSize); };
  }, []);

  useEffect(() => {
    let active = true;
    collageStorage.getDraft().then((draft) => {
      if (active && draft && validateComposition(draft.composition)) setRecovery(draft.composition);
    }).catch(() => { if (active) setNotice("Browser storage is unavailable. Download a project file to keep a portable copy."); }).finally(() => { if (active) setStorageReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!storageReady || !dirty) return;
    const timer = window.setTimeout(() => {
      collageStorage.saveDraft(composition).catch(() => setNotice("Could not save the recovery draft. Download a project file to keep your work."));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [composition, dirty, storageReady]);

  const assetIdsKey = useMemo(() => [...new Set([composition.background.imageId, ...composition.cells.map((cell) => cell.assetId)].filter((id): id is string => Boolean(id)))].sort().join("|"), [composition.background.imageId, composition.cells]);
  useEffect(() => {
    let cancelled = false;
    async function loadUsedImages() {
      const ids = assetIdsKey ? assetIdsKey.split("|") : [];
      const entries = await Promise.all(ids.map(async (id) => {
        let asset = volatileAssetsRef.current.get(id);
        try { asset = await collageStorage.getAsset(id) ?? asset; } catch { /* session copy remains available */ }
        if (!asset) return [id, null] as const;
        return [id, await loadImage(asset.blob)] as const;
      }));
      if (cancelled) return;
      const next = new Map<string, LoadedImage>();
      for (const [id, image] of entries) if (image) next.set(id, image);
      setImages(next);
      if (ids.some((id) => !next.has(id))) setError("An image used by this collage is missing. Replace it or reopen a project file that contains it.");
    }
    loadUsedImages().catch(() => { if (!cancelled) setError("A saved image could not be opened. Replace it from the selected cell controls."); });
    return () => { cancelled = true; };
  }, [assetIdsKey, assetRevision]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let errorTimer: number | undefined;
    const selectionColor = getComputedStyle(document.documentElement).getPropertyValue("--canvas-selection").trim() || "#7047eb";
    try { renderComposition(canvas, composition, images, selectedId, !preview, undefined, selectionColor); }
    catch { errorTimer = window.setTimeout(() => setError("The preview could not be rendered. Try reducing the canvas size or reloading an image."), 0); }
    return () => { if (errorTimer !== undefined) window.clearTimeout(errorTimer); };
  }, [composition, images, selectedId, preview]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (isTextInput(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (mod && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
      const canvasFocused = event.target === canvasRef.current;
      if (preview || !selectedId) return;
      const step = event.shiftKey ? 10 : 1;
      if (event.key.startsWith("Arrow") && canvasFocused) {
        event.preventDefault();
        oneEdit((current) => ({ ...current, cells: current.cells.map((cell) => cell.id !== selectedId ? cell : { ...cell, x: cell.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: cell.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) }) }));
      } else if ((event.key === "Backspace" || event.key === "Delete") && canvasFocused && selectedCell?.assetId) {
        event.preventDefault();
        oneEdit((current) => ({ ...current, cells: current.cells.map((cell) => cell.id === selectedId ? { ...cell, assetId: null } : cell) }));
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [oneEdit, preview, redo, selectedCell?.assetId, selectedId, undo]);

  const patchCell = (patch: Partial<CollageCell>) => {
    if (!selectedId) return;
    edit((current) => ({ ...current, cells: current.cells.map((cell) => cell.id === selectedId ? { ...cell, ...patch } : cell) }));
  };

  const patchLayout = (patch: Partial<CollageComposition["layout"]>) => {
    edit((current) => {
      const layout = { ...current.layout, ...patch };
      const next = { ...current, layout };
      if (layout.type === "diagonal") {
        const cells = createDiagonalCells(next, current.cells.length || 25, current.cells);
        return { ...next, cells };
      }
      return { ...next, cells: createGridCells(next, layout.rows, layout.columns, current.cells) };
    });
  };

  const setLayoutType = (type: "grid" | "diagonal") => {
    oneEdit((current) => {
      const layout = { ...current.layout, type };
      const next = { ...current, layout };
      return { ...next, cells: type === "grid" ? createGridCells(next, layout.rows, layout.columns, current.cells) : createDiagonalCells(next, Math.max(25, current.cells.length), current.cells) };
    });
    setSelectedId(compositionRef.current.cells[0]?.id ?? null);
  };

  const setGridSize = (rows: number, columns: number) => {
    const count = Math.max(1, Math.min(MAX_CELLS, rows * columns));
    const safeColumns = Math.min(columns, count);
    const safeRows = Math.ceil(count / safeColumns);
    oneEdit((current) => {
      const layout = { ...current.layout, type: "grid" as const, rows: safeRows, columns: safeColumns };
      const next = { ...current, layout };
      const cells = createGridCells(next, safeRows, safeColumns, current.cells);
      return { ...next, cells };
    });
    setPanel("layout");
    setSelectedId(compositionRef.current.cells[0]?.id ?? null);
  };

  const saveAsset = useCallback(async (file: File): Promise<CollageAsset> => {
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error(`${file.name}: use a PNG, JPEG, or WebP image.`);
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: images must be 40 MB or smaller.`);
    const { width, height } = await readImage(file);
    if (width > MAX_SOURCE_DIMENSION || height > MAX_SOURCE_DIMENSION || width * height > MAX_SOURCE_PIXELS) throw new Error(`${file.name}: image dimensions are too large. Use an image under 16,000 pixels per side and 32 million pixels total.`);
    const asset = { id: createAssetId(), blob: file, name: file.name, mimeType: file.type, width, height, updatedAt: Date.now() };
    volatileAssetsRef.current.set(asset.id, asset);
    try { await collageStorage.saveAsset(asset); } catch { setNotice("Image is available for this session, but browser storage is unavailable. Download the collage project to keep it."); }
    return asset;
  }, []);

  const addImages = useCallback(async (files: FileList | File[], targetId?: string) => {
    const incoming = Array.from(files);
    const skippedFiles = incoming.some((file) => !/^image\/(png|jpeg|webp)$/i.test(file.type));
    const selectedFiles = incoming.filter((file) => /^image\/(png|jpeg|webp)$/i.test(file.type)).slice(0, MAX_CELLS);
    if (!selectedFiles.length) { if (incoming.length) setError("Use PNG, JPEG, or WebP images."); return; }
    setError(skippedFiles ? "Some files were skipped. Use PNG, JPEG, or WebP images." : null);
    setBusy("Adding images…");
    try {
      const added: CollageAsset[] = [];
      for (const file of selectedFiles) added.push(await saveAsset(file));
      let current = compositionRef.current;
      const targetIndex = targetId ? current.cells.findIndex((cell) => cell.id === targetId) : current.cells.findIndex((cell) => !cell.assetId);
      const target = targetIndex >= 0 ? targetIndex : 0;
      let slots = current.cells.map((cell) => cell.id);
      const capacity = current.cells.length;
      let required = 1 + added.reduce((count, _, i) => count + (i > 0 ? 1 : 0), 0);
      const emptyExceptTarget = current.cells.reduce((count, cell, index) => count + (index !== target && !cell.assetId ? 1 : 0), 0);
      if (added.length > emptyExceptTarget + 1) required = current.cells.length + added.length - emptyExceptTarget - 1;
      if (required > capacity) {
        if (required > MAX_CELLS) throw new Error(`A collage can contain up to ${MAX_CELLS} cells.`);
        const columns = Math.min(6, Math.ceil(Math.sqrt(required)));
        const rows = Math.ceil(required / columns);
        const layout = { ...current.layout, type: "grid" as const, rows, columns };
        const next = { ...current, layout };
        current = { ...next, cells: createGridCells(next, rows, columns, current.cells) };
        slots = current.cells.map((cell) => cell.id);
      }
      const ordered = [slots[target] ?? slots[0], ...slots.filter((_, index) => index !== target && !compositionRef.current.cells[index]?.assetId)];
      if (ordered.length < added.length) ordered.push(...slots.filter((id) => !ordered.includes(id)));
      oneEdit((latest) => {
        let next = current;
        const byId = new Map(next.cells.map((cell) => [cell.id, cell]));
        const assetsWithIds = added.map((asset) => asset.id);
        assetsWithIds.forEach((id, index) => {
          const cellId = ordered[index];
          if (!cellId) return;
          const cell = byId.get(cellId);
          if (cell) byId.set(cellId, { ...cell, assetId: id, cropZoom: 1, cropX: 0, cropY: 0, fit: "cover" });
        });
        next = { ...next, cells: next.cells.map((cell) => byId.get(cell.id) ?? cell) };
        // Keep concurrent edits that happened while the images were decoding.
        if (latest !== compositionRef.current) next = { ...next, background: latest.background, canvas: latest.canvas };
        return next;
      });
      const firstCellId = ordered[0];
      if (firstCellId) setSelectedId(firstCellId);
      setPanel("cell");
      setAssetRevision((value) => value + 1);
      if (selectedFiles.length < Array.from(files).filter((file) => file.type.startsWith("image/")).length) setNotice(`Added ${selectedFiles.length} images. A collage can contain up to ${MAX_CELLS} cells.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add these images."); }
    finally { setBusy(null); }
  }, [oneEdit, saveAsset]);

  useEffect(() => {
    const pasteImages = (event: ClipboardEvent) => {
      if (isTextInput(event.target)) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (!files.length) return;
      event.preventDefault();
      void addImages(files, selectedId ?? undefined);
    };
    window.addEventListener("paste", pasteImages);
    return () => window.removeEventListener("paste", pasteImages);
  }, [addImages, selectedId]);

  const addBackgroundImage = async (file?: File) => {
    if (!file) return;
    setBusy("Adding background…");
    setError(null);
    try {
      const asset = await saveAsset(file);
      oneEdit((current) => ({ ...current, background: { ...current.background, type: "image", imageId: asset.id } }));
      setAssetRevision((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add the background image."); }
    finally { setBusy(null); }
  };

  const createProjectFile = async (): Promise<CollageProjectFile> => {
    const current = compositionRef.current;
    const ids = [...new Set([current.background.imageId, ...current.cells.map((cell) => cell.assetId)].filter((id): id is string => Boolean(id)))];
    const assets: CollageProjectFile["assets"] = [];
    let totalBytes = 0;
    for (const id of ids) {
      const asset = volatileAssetsRef.current.get(id) ?? await collageStorage.getAsset(id);
      if (!asset) throw new Error("An image used in this collage is missing. Replace it before saving the project file.");
      totalBytes += asset.blob.size;
      if (totalBytes > MAX_PROJECT_BYTES) throw new Error("This project is too large to package. Remove some images or use smaller source files.");
      assets.push({ id: asset.id, name: asset.name, mimeType: asset.mimeType, width: asset.width, height: asset.height, updatedAt: asset.updatedAt, dataUrl: await blobToDataUrl(asset.blob) });
    }
    return { kind: "collage-maker-project", version: 1, createdAt: new Date().toISOString(), composition: current, assets };
  };

  const downloadProject = async () => {
    setBusy("Packaging project…");
    setError(null);
    try {
      const project = await createProjectFile();
      const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
      if (blob.size > MAX_PROJECT_BYTES * 1.4) throw new Error("The project file is too large to download. Remove some images or use smaller files.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `collage-${new Date().toISOString().slice(0, 10)}.collage`;
      link.click();
      URL.revokeObjectURL(url);
      dirtyRef.current = false;
      setDirty(false);
      await collageStorage.clearDraft().catch(() => undefined);
      setNotice("Project file downloaded. It includes the original images and can be reopened later.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the project file."); }
    finally { setBusy(null); }
  };

  const openProject = async (file?: File) => {
    if (!file) return;
    if (dirtyRef.current && !window.confirm("Open this project and replace your current collage? Download a project file first if you want to keep it.")) return;
    if (file.size > MAX_PROJECT_BYTES * 1.4) { setError("This project file is too large to open."); return; }
    setBusy("Opening project…");
    setError(null);
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (!validateProject(raw)) throw new Error("This is not a supported Collage Maker project file.");
      const referencedIds = new Set([raw.composition.background.imageId, ...raw.composition.cells.map((cell) => cell.assetId)].filter((id): id is string => Boolean(id)));
      const projectIds = new Set(raw.assets.map((asset) => asset.id));
      if (referencedIds.size !== projectIds.size || [...referencedIds].some((id) => !projectIds.has(id))) throw new Error("This project is missing one or more images used by the collage.");
      let totalBytes = 0;
      for (const item of raw.assets) {
        const blob = await dataUrlToBlob(item.dataUrl);
        if (blob.size > MAX_UPLOAD_BYTES) throw new Error("A project image exceeds the 40 MB image limit.");
        totalBytes += blob.size;
        if (totalBytes > MAX_PROJECT_BYTES) throw new Error("The project contains more than 120 MB of source images.");
        const dimensions = await readImage(blob);
        if (dimensions.width > MAX_SOURCE_DIMENSION || dimensions.height > MAX_SOURCE_DIMENSION || dimensions.width * dimensions.height > MAX_SOURCE_PIXELS) throw new Error("A project image has dimensions this browser cannot safely open.");
        const asset: CollageAsset = { id: item.id, name: item.name, mimeType: item.mimeType, width: dimensions.width, height: dimensions.height, updatedAt: item.updatedAt, blob };
        volatileAssetsRef.current.set(asset.id, asset);
        await collageStorage.saveAsset(asset).catch(() => setNotice("Project opened for this session. Browser storage is unavailable, so download a copy before closing."));
      }
      setComposition(raw.composition);
      compositionRef.current = raw.composition;
      dirtyRef.current = false;
      setDirty(false);
      pastRef.current = [];
      futureRef.current = [];
      endEdit();
      updateHistoryButtons();
      setSelectedId(raw.composition.cells[0]?.id ?? null);
      setPanel("layout");
      setAssetRevision((value) => value + 1);
      setRecovery(null);
      await collageStorage.clearDraft().catch(() => undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open this project file."); }
    finally { setBusy(null); }
  };

  const exportImage = async (format: "png" | "jpeg") => {
    setBusy("Preparing export…");
    setError(null);
    try {
      const current = compositionRef.current;
      if (current.canvas.width > MAX_CANVAS_DIMENSION || current.canvas.height > MAX_CANVAS_DIMENSION || current.canvas.width * current.canvas.height > MAX_CANVAS_PIXELS) throw new Error("The export dimensions are too large. Choose a smaller canvas size.");
      const exportImages = new Map(images);
      const requiredIds = [...new Set([current.background.imageId, ...current.cells.map((cell) => cell.assetId)].filter((id): id is string => Boolean(id)))];
      for (const id of requiredIds) {
        if (exportImages.has(id)) continue;
        const asset = volatileAssetsRef.current.get(id) ?? await collageStorage.getAsset(id);
        if (!asset) throw new Error("An image used in this collage is missing. Replace it before exporting.");
        exportImages.set(id, await loadImage(asset.blob));
      }
      const canvas = document.createElement("canvas");
      renderComposition(canvas, current, exportImages, null, false, format === "jpeg" ? "#ffffff" : undefined);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("The image could not be exported. Try a smaller canvas size.")), format === "png" ? "image/png" : "image/jpeg", 0.92));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `collage-${current.canvas.width}x${current.canvas.height}.${format === "jpeg" ? "jpg" : "png"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not export this collage."); }
    finally { setBusy(null); }
  };

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * compositionRef.current.canvas.width, y: ((event.clientY - rect.top) / rect.height) * compositionRef.current.canvas.height };
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (preview) return;
    const point = canvasPoint(event);
    const current = compositionRef.current;
    const target = [...current.cells].reverse().find((cell) => hitTestCell(cell, point.x, point.y).inside);
    if (!target) { setSelectedId(null); return; }
    setSelectedId(target.id);
    setPanel("cell");
    const hit = hitTestCell(target, point.x, point.y);
    dragRef.current = { pointerId: event.pointerId, cellId: target.id, startX: point.x, startY: point.y, initial: target, mode: cropMode && target.assetId ? "crop" : hit.resize ? "resize" : "move", started: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = canvasPoint(event);
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    if (!drag.started) {
      if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
      beginEdit();
      drag.started = true;
    }
    edit((current) => ({ ...current, cells: current.cells.map((cell) => {
      if (cell.id !== drag.cellId) return cell;
      if (drag.mode === "crop") return { ...cell, cropX: Math.max(-300, Math.min(300, drag.initial.cropX + dx / Math.max(1, cell.width) * 100)), cropY: Math.max(-300, Math.min(300, drag.initial.cropY + dy / Math.max(1, cell.height) * 100)) };
      if (drag.mode === "resize") return { ...cell, width: Math.max(32, Math.min(MAX_CANVAS_DIMENSION * 2, drag.initial.width + dx)), height: Math.max(32, Math.min(MAX_CANVAS_DIMENSION * 2, drag.initial.height + dy)) };
      return { ...cell, x: Math.max(-MAX_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION * 2, drag.initial.x + dx)), y: Math.max(-MAX_CANVAS_DIMENSION, Math.min(MAX_CANVAS_DIMENSION * 2, drag.initial.y + dy)) };
    }) }));
  };

  const pointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (dragRef.current.started) endEdit();
    dragRef.current = null;
  };

  const dropFiles = (event: React.DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const point = { x: ((event.clientX - event.currentTarget.getBoundingClientRect().left) / event.currentTarget.getBoundingClientRect().width) * compositionRef.current.canvas.width, y: ((event.clientY - event.currentTarget.getBoundingClientRect().top) / event.currentTarget.getBoundingClientRect().height) * compositionRef.current.canvas.height };
    const hit = [...compositionRef.current.cells].reverse().find((cell) => hitTestCell(cell, point.x, point.y).inside);
    void addImages(event.dataTransfer.files, hit?.id ?? selectedId ?? undefined);
  };

  const addGridRow = () => {
    const current = compositionRef.current;
    if (current.cells.length >= MAX_CELLS) { setError(`A collage can contain up to ${MAX_CELLS} cells.`); return; }
    const rows = current.layout.type === "grid" && current.layout.rows < 6 ? current.layout.rows + 1 : current.layout.rows;
    const columns = rows === current.layout.rows && current.layout.columns < 6 ? current.layout.columns + 1 : current.layout.columns;
    setGridSize(rows, columns);
  };

  const selectedIndex = selectedId ? composition.cells.findIndex((cell) => cell.id === selectedId) : -1;
  const changeLayer = (direction: -1 | 1) => {
    if (!selectedId) return;
    oneEdit((current) => {
      const cells = [...current.cells];
      const index = cells.findIndex((cell) => cell.id === selectedId);
      const nextIndex = Math.max(0, Math.min(cells.length - 1, index + direction));
      if (index < 0 || nextIndex === index) return current;
      [cells[index], cells[nextIndex]] = [cells[nextIndex], cells[index]];
      return { ...current, cells };
    });
  };

  const resetCollage = () => {
    if (!window.confirm("Reset the collage and remove all placed images? You can undo this.")) return;
    oneEdit(() => createDefaultComposition());
    setSelectedId(compositionRef.current.cells[0]?.id ?? null);
    setPanel("layout");
  };

  const chooseCanvasSize = (width: number, height: number) => {
    if (width < 200 || height < 200 || width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION || width * height > MAX_CANVAS_PIXELS) { setError("Canvas dimensions must be at least 200 px, no more than 4,096 px per side, and no more than 16 megapixels."); return false; }
    oneEdit((current) => {
      const canvas = { ...current.canvas, width, height };
      const next = { ...current, canvas };
      const cells = current.layout.type === "grid" ? createGridCells(next, current.layout.rows, current.layout.columns, current.cells) : createDiagonalCells(next, current.cells.length, current.cells);
      return { ...next, cells };
    });
    setError(null);
    return true;
  };

  const restoreRecovery = () => {
    if (!recovery) return;
    setCurrent(recovery);
    setSelectedId(recovery.cells[0]?.id ?? null);
    setRecovery(null);
    setPanel("layout");
    setAssetRevision((value) => value + 1);
  };

  const renderLayoutControls = () => (
    <div className="space-y-6 p-4 sm:p-5">
      <div><h2 className="text-sm font-semibold">Layout</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a pattern, then adjust spacing or move cells on the canvas.</p></div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={composition.layout.type === "grid" ? "secondary" : "outline"} className="h-auto flex-col gap-1 py-3" onClick={() => setLayoutType("grid")}><Grid2X2 className="size-4" /><span className="text-xs">Grid</span></Button>
        <Button variant={composition.layout.type === "diagonal" ? "secondary" : "outline"} className="h-auto flex-col gap-1 py-3" onClick={() => setLayoutType("diagonal")}><span className="text-lg leading-none">▨</span><span className="text-xs">Diagonal tiles</span></Button>
      </div>
      {composition.layout.type === "grid" ? <>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Rows" value={composition.layout.rows} min={1} max={6} onChange={(rows) => setGridSize(rows, composition.layout.columns)} />
          <NumberField label="Columns" value={composition.layout.columns} min={1} max={6} onChange={(columns) => setGridSize(composition.layout.rows, columns)} />
        </div>
        <div className="space-y-2"><span className="text-xs font-medium">Quick layouts</span><div className="grid grid-cols-4 gap-1.5">{[[2, 2], [2, 3], [2, 4], [3, 3], [3, 2], [3, 4], [4, 2], [4, 3]].map(([rows, columns]) => <Button key={`${rows}x${columns}`} size="sm" variant={composition.layout.rows === rows && composition.layout.columns === columns ? "secondary" : "outline"} className="px-1 text-xs" onClick={() => setGridSize(rows, columns)}>{rows} × {columns}</Button>)}</div></div>
      </> : <div className="rounded-[var(--radius-control)] bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">A repeating diagonal tile pattern. Drag any tile to make a custom arrangement.</div>}
      {composition.layout.type === "grid" && <Button variant="outline" size="sm" className="w-full" onClick={addGridRow} disabled={composition.cells.length >= MAX_CELLS}>{composition.layout.rows < 6 ? "Add row" : "Add column"}</Button>}
      <RangeField label="Cell spacing" value={composition.layout.gap} min={0} max={120} format={(value) => `${Math.round(value)} px`} onChange={(gap) => patchLayout({ gap })} onStart={beginEdit} onEnd={endEdit} />
      <RangeField label="Outer padding" value={composition.layout.padding} min={0} max={300} format={(value) => `${Math.round(value)} px`} onChange={(padding) => patchLayout({ padding })} onStart={beginEdit} onEnd={endEdit} />
      <div className="space-y-2"><span className="text-xs font-medium">Canvas size</span><div className="grid grid-cols-2 gap-2">{canvasPresets.map((preset) => <Button key={preset.name} size="sm" variant={composition.canvas.width === preset.width && composition.canvas.height === preset.height ? "secondary" : "outline"} className="justify-between" onClick={() => chooseCanvasSize(preset.width, preset.height)}><span>{preset.name}</span><span className="text-[10px] text-muted-foreground">{preset.width}×{preset.height}</span></Button>)}</div></div>
      <div className="grid grid-cols-2 gap-3"><CanvasDimensionField label="Width" value={composition.canvas.width} onCommit={(width) => chooseCanvasSize(width, composition.canvas.height)} /><CanvasDimensionField label="Height" value={composition.canvas.height} onCommit={(height) => chooseCanvasSize(composition.canvas.width, height)} /></div>
      <RangeField label="Canvas corner radius" value={composition.canvas.radius} min={0} max={120} format={(value) => `${Math.round(value)} px`} onChange={(radius) => edit((current) => ({ ...current, canvas: { ...current.canvas, radius } }))} onStart={beginEdit} onEnd={endEdit} />
      <div className="space-y-2"><Button variant="outline" className="w-full" onClick={() => fileImagesRef.current?.click()}><ImagePlus /> Add images</Button><p className="text-center text-[11px] text-muted-foreground">{composition.cells.filter((cell) => cell.assetId).length} of {composition.cells.length} cells filled</p></div>
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={resetCollage}><RotateCcw /> Reset collage</Button>
    </div>
  );

  const renderCellControls = () => (
    <div className="space-y-6 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">Selected cell</h2><p className="mt-1 text-xs text-muted-foreground">{selectedCell ? `Cell ${selectedIndex + 1} of ${composition.cells.length}` : "Choose a cell on the canvas."}</p></div>{selectedCell && <div className="flex gap-1"><Button size="icon-sm" variant="ghost" aria-label="Move cell backward" title="Move cell backward" disabled={selectedIndex <= 0} onClick={() => changeLayer(-1)}><ChevronDown /></Button><Button size="icon-sm" variant="ghost" aria-label="Move cell forward" title="Move cell forward" disabled={selectedIndex >= composition.cells.length - 1} onClick={() => changeLayer(1)}><ChevronUp /></Button></div>}</div>
      {!selectedCell ? <p className="rounded-[var(--radius-control)] bg-muted/60 p-3 text-xs text-muted-foreground">Click a cell to edit it, or add a new image to get started.</p> : <>
        <div className="space-y-2"><Button variant="outline" className="w-full" onClick={() => fileImagesRef.current?.click()}><ImagePlus /> {selectedCell.assetId ? "Replace image" : "Add image to cell"}</Button>{selectedCell.assetId && <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => oneEdit((current) => ({ ...current, cells: current.cells.map((cell) => cell.id === selectedId ? { ...cell, assetId: null } : cell) }))}><Trash2 /> Remove image</Button>}</div>
        <div className="grid grid-cols-2 gap-3"><Field label="Cell shape"><select value={selectedCell.shape} onChange={(event) => patchCell({ shape: event.target.value as CollageCell["shape"] })} className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-background px-2 text-sm"><option value="rectangle">Rectangle</option><option value="rounded">Rounded</option><option value="circle">Circle</option><option value="diamond">Diamond</option></select></Field><Field label="Image fit"><select value={selectedCell.fit} onChange={(event) => patchCell({ fit: event.target.value as CollageCell["fit"] })} className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-background px-2 text-sm"><option value="cover">Fill frame</option><option value="contain">Fit image</option></select></Field></div>
        {selectedCell.shape === "rounded" && <RangeField label="Corner radius" value={selectedCell.cornerRadius} min={0} max={Math.min(200, selectedCell.width / 2, selectedCell.height / 2)} format={(value) => `${Math.round(value)} px`} onChange={(cornerRadius) => patchCell({ cornerRadius })} onStart={beginEdit} onEnd={endEdit} />}
        {selectedCell.assetId && <><div className="flex items-center justify-between rounded-[var(--radius-control)] bg-muted/60 px-3 py-2.5"><div><span className="text-xs font-medium">Crop image</span><p className="mt-0.5 text-[11px] text-muted-foreground">Drag the image inside its cell</p></div><Button size="sm" variant={cropMode ? "secondary" : "outline"} onClick={() => setCropMode(!cropMode)}><Crop /> {cropMode ? "Done" : "Crop"}</Button></div>
          <RangeField label="Image zoom" value={selectedCell.cropZoom * 100} min={50} max={400} format={(value) => `${Math.round(value)}%`} onChange={(value) => patchCell({ cropZoom: value / 100 })} onStart={beginEdit} onEnd={endEdit} />
          <div className="grid grid-cols-2 gap-3"><NumberField label="Crop X" value={selectedCell.cropX} min={-300} max={300} suffix="%" onChange={(cropX) => patchCell({ cropX })} /><NumberField label="Crop Y" value={selectedCell.cropY} min={-300} max={300} suffix="%" onChange={(cropY) => patchCell({ cropY })} /></div>
        </>}
        <div className="space-y-2"><span className="text-xs font-medium">Position and size</span><div className="grid grid-cols-2 gap-3"><NumberField label="X position" value={selectedCell.x} min={-MAX_CANVAS_DIMENSION} max={MAX_CANVAS_DIMENSION * 2} suffix="px" onChange={(x) => patchCell({ x })} /><NumberField label="Y position" value={selectedCell.y} min={-MAX_CANVAS_DIMENSION} max={MAX_CANVAS_DIMENSION * 2} suffix="px" onChange={(y) => patchCell({ y })} /><NumberField label="Width" value={selectedCell.width} min={32} max={MAX_CANVAS_DIMENSION * 2} suffix="px" onChange={(width) => patchCell({ width })} /><NumberField label="Height" value={selectedCell.height} min={32} max={MAX_CANVAS_DIMENSION * 2} suffix="px" onChange={(height) => patchCell({ height })} /></div></div>
        <div className="grid grid-cols-2 gap-3"><NumberField label="Rotation" value={selectedCell.rotation} min={-180} max={180} suffix="°" onChange={(rotation) => patchCell({ rotation })} /><RangeField label="Opacity" value={selectedCell.opacity} min={0} max={100} format={(value) => `${Math.round(value)}%`} onChange={(opacity) => patchCell({ opacity })} onStart={beginEdit} onEnd={endEdit} /></div>
        <div className="space-y-3 border-t border-border pt-4"><h3 className="text-xs font-medium">Cell border</h3><div className="grid grid-cols-2 gap-3"><NumberField label="Border width" value={selectedCell.borderWidth} min={0} max={40} suffix="px" onChange={(borderWidth) => patchCell({ borderWidth })} /><ColorField label="Border color" value={selectedCell.borderColor} onChange={(borderColor) => patchCell({ borderColor })} /></div></div>
        <p className="text-[11px] leading-5 text-muted-foreground">Drag a cell to move it. Drag its lower corner to resize. Arrow keys nudge the selected cell; hold Shift for larger steps.</p>
      </>}
    </div>
  );

  const renderBackgroundControls = () => (
    <div className="space-y-6 p-4 sm:p-5">
      <div><h2 className="text-sm font-semibold">Background</h2><p className="mt-1 text-xs text-muted-foreground">Set the canvas color or use an image.</p></div>
      <div className="grid grid-cols-3 gap-2">{(["solid", "gradient", "image"] as const).map((type) => <Button key={type} size="sm" variant={composition.background.type === type ? "secondary" : "outline"} onClick={() => type === "image" && !composition.background.imageId ? fileBackgroundRef.current?.click() : oneEdit((current) => ({ ...current, background: { ...current.background, type } }))}>{type === "solid" ? "Solid" : type === "gradient" ? "Gradient" : "Image"}</Button>)}</div>
      {composition.background.type === "solid" ? <ColorField label="Canvas color" value={composition.background.color} onChange={(color) => edit((current) => ({ ...current, background: { ...current.background, color } }))} onStart={beginEdit} onEnd={endEdit} /> : composition.background.type === "gradient" ? <><div className="grid grid-cols-2 gap-3"><ColorField label="Start color" value={composition.background.gradientFrom} onChange={(gradientFrom) => edit((current) => ({ ...current, background: { ...current.background, gradientFrom } }))} onStart={beginEdit} onEnd={endEdit} /><ColorField label="End color" value={composition.background.gradientTo} onChange={(gradientTo) => edit((current) => ({ ...current, background: { ...current.background, gradientTo } }))} onStart={beginEdit} onEnd={endEdit} /></div><RangeField label="Gradient direction" value={composition.background.gradientAngle} min={0} max={360} format={(value) => `${Math.round(value)}°`} onChange={(gradientAngle) => edit((current) => ({ ...current, background: { ...current.background, gradientAngle } }))} onStart={beginEdit} onEnd={endEdit} /></> : <><Button variant="outline" className="w-full" onClick={() => fileBackgroundRef.current?.click()}><ImagePlus /> {composition.background.imageId ? "Replace background" : "Upload background"}</Button><Field label="Image fit"><select value={composition.background.imageFit} onChange={(event) => oneEdit((current) => ({ ...current, background: { ...current.background, imageFit: event.target.value as "cover" | "contain" } }))} className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-background px-2 text-sm"><option value="cover">Fill canvas</option><option value="contain">Fit image</option></select></Field><RangeField label="Image zoom" value={composition.background.imageZoom * 100} min={50} max={300} format={(value) => `${Math.round(value)}%`} onChange={(imageZoom) => edit((current) => ({ ...current, background: { ...current.background, imageZoom: imageZoom / 100 } }))} onStart={beginEdit} onEnd={endEdit} /><div className="grid grid-cols-2 gap-3"><RangeField label="Position X" value={composition.background.imageX} min={-100} max={100} format={(value) => `${Math.round(value)}%`} onChange={(imageX) => edit((current) => ({ ...current, background: { ...current.background, imageX } }))} onStart={beginEdit} onEnd={endEdit} /><RangeField label="Position Y" value={composition.background.imageY} min={-100} max={100} format={(value) => `${Math.round(value)}%`} onChange={(imageY) => edit((current) => ({ ...current, background: { ...current.background, imageY } }))} onStart={beginEdit} onEnd={endEdit} /></div></>}
      <div className="rounded-[var(--radius-control)] bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">The background shows through the gaps between image cells.</div>
    </div>
  );

  const guardHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (dirtyRef.current && !window.confirm("You have unsaved changes. Leave the editor? Download a project file to keep a portable copy.")) event.preventDefault();
  };

  return <main className="min-h-screen bg-background">
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 px-3 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2"><Link href="/" onClick={guardHome} aria-label="Back to tools" className="rounded-[var(--radius-control)] p-2 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><ArrowLeft className="size-4" /></Link><ToolBrandMark /><div className="min-w-0"><h1 className="truncate text-sm font-semibold">Collage Maker</h1><p className="hidden text-[11px] text-muted-foreground sm:block">{composition.canvas.width} × {composition.canvas.height} px{dirty ? " · Unsaved changes" : ""}</p></div></div>
        <div className="flex items-center gap-1 sm:gap-2"><Button size="icon-sm" variant="ghost" aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" disabled={!canUndo || Boolean(busy)} onClick={undo}><Undo2 /></Button><Button size="icon-sm" variant="ghost" aria-label="Redo" title="Redo (Ctrl/Cmd+Shift+Z)" disabled={!canRedo || Boolean(busy)} onClick={redo}><Redo2 /></Button><span className="mx-1 hidden h-6 w-px bg-border sm:block" /><Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => fileProjectRef.current?.click()}><FileUp /> Open</Button><Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => void downloadProject()} disabled={Boolean(busy)}><Download /> Save project</Button><Button size="icon-sm" variant="ghost" aria-label="Save project" title="Save project" className="sm:hidden" disabled={Boolean(busy)} onClick={() => void downloadProject()}><Download /></Button><Button size="sm" variant={preview ? "secondary" : "outline"} onClick={() => setPreview(!preview)}><Eye className="sm:mr-1" /><span className="hidden sm:inline">{preview ? "Edit" : "Preview"}</span></Button><div className="relative"><select aria-label="Export image" disabled={Boolean(busy)} onChange={(event) => { if (event.target.value) void exportImage(event.target.value as "png" | "jpeg"); event.currentTarget.value = ""; }} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"><option value="">Export</option><option value="png">PNG</option><option value="jpeg">JPEG</option></select><Button size="sm" disabled={Boolean(busy)}><ArrowDownToLine className="sm:mr-1" /><span className="hidden sm:inline">Export</span><ChevronDown className="ml-1 size-3" /></Button></div><Button size="icon-sm" variant="ghost" aria-label="Open project" title="Open project" className="sm:hidden" onClick={() => fileProjectRef.current?.click()}><FileUp /></Button></div>
      </div>
      {recovery && <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 text-xs"><span>A saved recovery draft is available from your last visit.</span><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={restoreRecovery}>Restore draft</Button><Button size="sm" variant="ghost" onClick={() => { setRecovery(null); void collageStorage.clearDraft(); }}>Discard</Button></div></div>}
      {error && <div role="alert" className="flex items-start justify-between gap-3 border-b border-destructive/25 bg-destructive/5 px-4 py-2 text-xs text-destructive"><span>{error}</span><Button size="icon-sm" variant="ghost" aria-label="Dismiss error" onClick={() => setError(null)}><X /></Button></div>}
      {notice && <div role="status" className="flex items-start justify-between gap-3 border-b border-border bg-muted/45 px-4 py-2 text-xs text-muted-foreground"><span>{notice}</span><Button size="icon-sm" variant="ghost" aria-label="Dismiss notice" onClick={() => setNotice(null)}><X /></Button></div>}
      <div className="grid flex-1 md:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Collage workspace" className="flex min-h-[50vh] flex-col bg-workspace md:min-h-[calc(100vh-8rem)]">
          <div className="flex min-h-11 items-center justify-between gap-2 border-b border-border/70 px-3 sm:px-5"><div className="flex items-center gap-1"><Button size="sm" variant={!cropMode ? "secondary" : "ghost"} onClick={() => setCropMode(false)} disabled={preview}><Move className="mr-1 size-3.5" /> Arrange</Button><Button size="sm" variant={cropMode ? "secondary" : "ghost"} onClick={() => setCropMode(true)} disabled={preview || !selectedCell?.assetId}><Crop className="mr-1 size-3.5" /> Crop</Button></div><div className="flex items-center gap-2"><span className="hidden text-[11px] text-muted-foreground sm:inline">{preview ? "Preview" : "Drag cells to arrange"}</span><Button size="sm" variant="outline" onClick={() => fileImagesRef.current?.click()} disabled={Boolean(busy)}><Plus className="mr-1 size-3.5" /> Add photos</Button></div></div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4 sm:p-8"><div className="relative max-w-full overflow-hidden rounded-md shadow-[var(--shadow-card)] ring-1 ring-black/10 dark:ring-white/10" style={{ aspectRatio: `${composition.canvas.width} / ${composition.canvas.height}`, width: `min(100%, 980px, ${availableCanvasHeight * composition.canvas.width / composition.canvas.height}px)` }}><canvas ref={canvasRef} aria-label="Collage canvas. Click a cell to select it. Drag to move, or drag the lower corner to resize." tabIndex={0} onPointerDown={(event) => { event.currentTarget.focus(); pointerDown(event); }} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onDragOver={(event) => event.preventDefault()} onDrop={dropFiles} className={`absolute inset-0 h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${preview ? "cursor-default" : cropMode ? "cursor-move" : "cursor-grab active:cursor-grabbing"}`} /></div></div>
          <div className="flex min-h-10 items-center justify-between border-t border-border/70 px-3 text-[11px] text-muted-foreground sm:px-5"><span>{composition.cells.filter((cell) => cell.assetId).length} images · {composition.cells.length} cells</span><span className="hidden sm:inline">Ctrl/Cmd + Z to undo · Delete removes an image</span><Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] md:hidden" onClick={() => setPreview(!preview)}>{preview ? <EyeOff /> : <Eye />}{preview ? "Edit" : "Preview"}</Button></div>
        </section>
        <section aria-label="Collage controls" className="border-t border-border bg-card md:min-h-[calc(100vh-8rem)] md:border-l md:border-t-0">
          <Tabs value={panel} onValueChange={(value) => setPanel(value as EditPanel)} className="h-full">
            <div className="sticky top-0 z-10 border-b border-border bg-card px-3 pt-3"><TabsList className="grid h-10 w-full grid-cols-3"><TabsTrigger value="layout">Layout</TabsTrigger><TabsTrigger value="cell">Cell</TabsTrigger><TabsTrigger value="background">Background</TabsTrigger></TabsList></div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pb-3"><TabsContent value="layout" className="m-0 outline-none">{renderLayoutControls()}</TabsContent><TabsContent value="cell" className="m-0 outline-none">{renderCellControls()}</TabsContent><TabsContent value="background" className="m-0 outline-none">{renderBackgroundControls()}</TabsContent></div>
          </Tabs>
        </section>
      </div>
    </div>
    <input ref={fileImagesRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(event) => { if (event.target.files) void addImages(event.target.files, selectedId ?? undefined); event.currentTarget.value = ""; }} />
    <input ref={fileBackgroundRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void addBackgroundImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    <input ref={fileProjectRef} type="file" accept=".collage,application/json" className="sr-only" onChange={(event) => { void openProject(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    {busy && <div role="status" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs shadow-[var(--shadow-popover)]"><LoaderCircle className="size-4 animate-spin" />{busy}</div>}
  </main>;
}
