"use client";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GalleryCanvas } from "./components/gallery-canvas";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Eye, FileImage, FolderOpen,
  ImagePlus, LoaderCircle, Redo2, RotateCcw, Trash2, Undo2, Upload, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import {
  APP_STORE_SPEC_VERSION, getRequirementForSpec, getScreenshotSpec, getSpecDimensions, getSpecOptions,
  type ScreenshotFamily, type ScreenshotOrientation,
} from "./catalog";
import {
  createDefaultProject, createId, formatFileSize, MAX_IMAGE_BYTES,
  MAX_PROJECT_FILE_BYTES, MAX_SCREEN_COUNT, MAX_SOURCE_DIMENSION, MAX_SOURCE_PIXELS,
  MAX_TOTAL_SOURCE_BYTES, MAX_ZIP_FILE_BYTES, validatePortableProject, validateProject,
  type ElementTransform, type ExportFormat, type GalleryElement, type GalleryProject, type GalleryScreen, type GalleryStyle,
  type PortableAsset, type PortableProject, type ScreenshotAsset,
} from "./model";
import { screenshotStorage } from "./storage";
import { createGalleryBlob, inspectCrop, inspectResolution, type RenderedElement } from "./render";
import { createZip, type ZipEntry } from "./zip";

type LiveAsset = ScreenshotAsset & { url: string };
type EditorTab = "design" | "screenshot" | "object";
const selectClass = "h-9 w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50";
const fieldClass = "block space-y-1.5 text-sm";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className={fieldClass}><span className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{label}</span>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</span>{children}</label>;
}

function TransformInput({ label, value, min, max, step, onCommit }: { label: string; value: number; min: number; max: number; step: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) { setDraft(String(value)); return; }
    const next = Math.min(max, Math.max(min, parsed));
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };
  return <Field label={label}><Input type="number" inputMode="decimal" value={draft} min={min} max={max} step={step} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { commit(); event.currentTarget.blur(); } }} /></Field>;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.rel = "noopener";
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeBase(name: string) {
  return name.trim().replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "app-store-set";
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not package a source image."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read a source image."));
    reader.readAsDataURL(blob);
  });
}

async function inspectImage(file: File) {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error(`${file.name}: use a PNG, JPEG, or WebP image.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: images must be 40 MB or smaller.`);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    if (image.naturalWidth > MAX_SOURCE_DIMENSION || image.naturalHeight > MAX_SOURCE_DIMENSION || image.naturalWidth * image.naturalHeight > MAX_SOURCE_PIXELS) {
      throw new Error(`${file.name}: use an image under 16,000 pixels per side and 32 million pixels total.`);
    }
    return { width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    if (error instanceof Error && error.message.includes("use an image under")) throw error;
    throw new Error(`${file.name}: this browser could not read the image.`);
  } finally { URL.revokeObjectURL(url); }
}

export function AppStoreScreenshotsEditor() {
  const [project, setProject] = useState<GalleryProject>(() => createDefaultProject());
  const [assets, setAssets] = useState<Record<string, LiveAsset>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<GalleryElement | null>(null);
  const [renderedElements, setRenderedElements] = useState<RenderedElement[]>([]);
  const [unsafeElements, setUnsafeElements] = useState<GalleryElement[]>([]);
  const [tab, setTab] = useState<EditorTab>("design");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<"saving" | "saved" | "session">("saving");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [overflow, setOverflow] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const projectRef = useRef(project);
  const assetsRef = useRef(assets);
  const undoStack = useRef<GalleryProject[]>([]);
  const redoStack = useRef<GalleryProject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const draggedId = useRef<string | null>(null);
  const transformStartProject = useRef<GalleryProject | null>(null);
  const assetUrls = useRef(new Set<string>());

  const projectAssetIds = (candidate: GalleryProject) => [...candidate.screens.map((screen) => screen.assetId), ...(candidate.style.backgroundAssetId ? [candidate.style.backgroundAssetId] : [])];
  const pruneUndoAssets = () => {
    const referenced = () => new Set([
      ...projectAssetIds(projectRef.current),
      ...undoStack.current.flatMap(projectAssetIds),
      ...redoStack.current.flatMap(projectAssetIds),
    ]);
    const totalReferencedBytes = (ids: Set<string>) => [...ids].reduce((sum, id) => sum + (assetsRef.current[id]?.bytes ?? 0), 0);
    while (totalReferencedBytes(referenced()) > MAX_TOTAL_SOURCE_BYTES * 2 && undoStack.current.length) undoStack.current.shift();
    while (totalReferencedBytes(referenced()) > MAX_TOTAL_SOURCE_BYTES * 2 && redoStack.current.length) redoStack.current.shift();
    const keep = referenced();
    const next: Record<string, LiveAsset> = {};
    for (const [id, asset] of Object.entries(assetsRef.current)) {
      if (keep.has(id)) next[id] = asset;
      else { URL.revokeObjectURL(asset.url); assetUrls.current.delete(asset.url); }
    }
    assetsRef.current = next; setAssets(next);
  };

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { assetsRef.current = assets; }, [assets]);

  const commit = useCallback((next: GalleryProject | ((current: GalleryProject) => GalleryProject)) => {
    const current = projectRef.current;
    const updated = typeof next === "function" ? next(current) : next;
    const complete = { ...updated, updatedAt: Date.now() };
    undoStack.current = [...undoStack.current.slice(-49), current];
    redoStack.current = [];
    projectRef.current = complete; setProject(complete); setError(null);
    pruneUndoAssets();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const fresh = createDefaultProject();
      try {
        const draft = await screenshotStorage.getDraft();
        if (cancelled) return;
        if (draft && validateProject(draft.project)) {
          const recovered: Record<string, LiveAsset> = {};
          const assetIds = new Set([...draft.project.screens.map((screen) => screen.assetId), ...(draft.project.style.backgroundAssetId ? [draft.project.style.backgroundAssetId] : [])]);
          for (const assetId of assetIds) {
            const asset = await screenshotStorage.getAsset(assetId);
            if (!asset) continue;
            const url = URL.createObjectURL(asset.blob); assetUrls.current.add(url);
            recovered[asset.id] = { ...asset, url };
          }
          if (cancelled) return;
          const validScreens = draft.project.screens.filter((screen) => recovered[screen.assetId]);
          const missingBackground = draft.project.style.background === "image" && !recovered[draft.project.style.backgroundAssetId ?? ""];
          const restored = { ...draft.project, screens: validScreens, style: missingBackground ? { ...draft.project.style, background: "gradient" as const, backgroundAssetId: null } : draft.project.style };
          projectRef.current = restored; setProject(restored); setAssets(recovered);
          setSelectedId(restored.screens[0]?.id ?? null);
          if (validScreens.length !== draft.project.screens.length || missingBackground) setNotice("Some source images are missing from browser storage. Add them again or open a portable project.");
          else if (validScreens.length) setNotice("Recovered your last local screenshot set.");
        } else {
          projectRef.current = fresh; setProject(fresh);
        }
      } catch {
        if (!cancelled) { projectRef.current = fresh; setProject(fresh); setSaved("session"); setNotice("Browser storage is unavailable. This set will stay in memory until you close the page; download a project to keep it."); }
      } finally { if (!cancelled) setReady(true); }
    }
    void restore();
    return () => { cancelled = true; for (const url of assetUrls.current) URL.revokeObjectURL(url); assetUrls.current.clear(); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaved("saving");
    const timer = window.setTimeout(() => {
      void screenshotStorage.saveDraft(project).then(async () => {
        const referenced = new Set([...projectAssetIds(project), ...undoStack.current.flatMap(projectAssetIds), ...redoStack.current.flatMap(projectAssetIds)]);
        try {
          const stored = await screenshotStorage.listAssets();
          await Promise.all(stored.filter((asset) => !referenced.has(asset.id)).map((asset) => screenshotStorage.deleteAsset(asset.id)));
        } catch { /* Local recovery is best effort; a stale asset is harmless. */ }
        setSaved("saved");
      }).catch(() => {
        setSaved("session"); setNotice("Could not save a local recovery draft. Your current edits remain available; download a project to keep them.");
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [project, ready]);

  const selectedIndex = Math.max(0, project.screens.findIndex((screen) => screen.id === selectedId));
  const selected = project.screens[selectedIndex];
  const selectedAsset = selected ? assets[selected.assetId] : undefined;
  const selectedElementGeometry = selectedElement ? renderedElements.find((element) => element.type === selectedElement) : undefined;
  const selectedStyle = selected ? { ...project.style, ...selected.overrides } : project.style;
  const selectedElementName = selectedElement ? ({ headline: "Headline", subtitle: "Subtitle", device: project.family === "iphone" ? "Phone frame" : "Tablet frame", screenshot: "Screenshot image" } satisfies Record<GalleryElement, string>)[selectedElement] : "";
  const currentElementTransform = selectedElement && selected
    ? selectedElementGeometry
      ? { centerX: selectedElementGeometry.centerX, centerY: selectedElementGeometry.centerY, scale: selectedElementGeometry.scale, rotation: selectedElementGeometry.rotation }
      : selected.elementTransforms?.[selectedElement] ?? { centerX: 50, centerY: 50, scale: 1, rotation: 0 }
    : null;
  const activeSpec = getScreenshotSpec(project.specId);
  const activeRequirement = getRequirementForSpec(project.specId);
  const output = activeSpec ? getSpecDimensions(activeSpec, project.orientation) : { width: 1179, height: 2556 };
  const totalBytes = useMemo(() => project.screens.reduce((sum, screen) => sum + screen.bytes, 0) + (project.style.backgroundAssetId ? assets[project.style.backgroundAssetId]?.bytes ?? 0 : 0), [project.screens, project.style.backgroundAssetId, assets]);
  const undo = () => {
    const previous = undoStack.current.pop(); if (!previous) return;
    redoStack.current = [...redoStack.current, projectRef.current];
    const restored = { ...previous, updatedAt: Date.now() }; projectRef.current = restored; setProject(restored); setError(null);
    pruneUndoAssets();
  };
  const redo = () => {
    const next = redoStack.current.pop(); if (!next) return;
    undoStack.current = [...undoStack.current, projectRef.current];
    const restored = { ...next, updatedAt: Date.now() }; projectRef.current = restored; setProject(restored); setError(null);
    pruneUndoAssets();
  };

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const current = projectRef.current;
    const incoming = Array.from(list);
    if (!incoming.length) return;
    const slots = MAX_SCREEN_COUNT - current.screens.length;
    if (slots <= 0) { setNotice("A screenshot set can contain up to 10 screens."); return; }
    const chosen = incoming.slice(0, slots);
    let nextScreens = [...current.screens];
    let currentAssets = { ...assetsRef.current };
    const backgroundBytes = current.style.backgroundAssetId ? currentAssets[current.style.backgroundAssetId]?.bytes ?? 0 : 0;
    let added = 0;
    for (const file of chosen) {
      try {
        if (nextScreens.reduce((sum, screen) => sum + screen.bytes, backgroundBytes) + file.size > MAX_TOTAL_SOURCE_BYTES) throw new Error("A screenshot set can contain up to 80 MB of source images. Use smaller images or remove a screen.");
        const { width, height } = await inspectImage(file);
        const id = createId("image");
        const asset: ScreenshotAsset = { id, blob: file, name: file.name, mimeType: file.type, width, height, bytes: file.size };
        const url = URL.createObjectURL(file); assetUrls.current.add(url);
        try { await screenshotStorage.saveAsset(asset); } catch { setNotice("Image is available in this session, but browser storage could not save it. Download a project file to keep it."); }
        currentAssets[id] = { ...asset, url };
        nextScreens = [...nextScreens, { id: createId(), assetId: id, name: file.name, mimeType: file.type, width, height, bytes: file.size, fit: "cover", zoom: 1, focalX: 0, focalY: 0, overrides: {} }];
        added += 1;
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this image."); }
    }
    if (added) {
      assetsRef.current = currentAssets; setAssets(currentAssets);
      const next = { ...current, screens: nextScreens, updatedAt: Date.now() };
      commit(next); setSelectedId(nextScreens[nextScreens.length - 1]?.id ?? null); setSelectedElement(null); setTab("design"); setNotice(`Added ${added} ${added === 1 ? "screen" : "screens"}.`);
    }
    if (incoming.length > chosen.length) setNotice("Only 10 screens fit in one App Store screenshot set.");
  }, [commit]);

  const removeSelected = () => {
    if (!selected) return;
    const nextScreens = project.screens.filter((screen) => screen.id !== selected.id);
    commit({ ...project, screens: nextScreens });
    setSelectedId(nextScreens[Math.min(selectedIndex, nextScreens.length - 1)]?.id ?? null);
    setSelectedElement(null); setTab("design");
    setNotice(nextScreens.length ? "Screen removed. Use Undo to restore it." : "The set is empty. Add at least one screenshot to export.");
  };

  const replaceSelectedFile = async (file?: File) => {
    const currentScreen = projectRef.current.screens.find((screen) => screen.id === selectedId);
    if (!file || !currentScreen) return;
    try {
      if (totalBytes - currentScreen.bytes + file.size > MAX_TOTAL_SOURCE_BYTES) throw new Error("A screenshot set can contain up to 80 MB of source images.");
      const { width, height } = await inspectImage(file);
      const id = createId("image");
      const asset: ScreenshotAsset = { id, blob: file, name: file.name, mimeType: file.type, width, height, bytes: file.size };
      const url = URL.createObjectURL(file); assetUrls.current.add(url);
      try { await screenshotStorage.saveAsset(asset); } catch { setNotice("Replacement is available in this session, but browser storage could not save it. Download a project file to keep it."); }
      const updatedAssets = { ...assetsRef.current, [id]: { ...asset, url } };
      assetsRef.current = updatedAssets; setAssets(updatedAssets);
      commit((current) => ({ ...current, screens: current.screens.map((screen) => screen.id === currentScreen.id ? { ...screen, assetId: id, name: file.name, mimeType: file.type, width, height, bytes: file.size, fit: "cover", zoom: 1, focalX: 0, focalY: 0 } : screen) }));
      setNotice(`Replaced screen ${currentScreen.name}. Use Undo to restore it.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not replace this screenshot."); }
    finally { if (replaceInputRef.current) replaceInputRef.current.value = ""; }
  };

  const addBackgroundFile = async (file?: File) => {
    if (!file) return;
    try {
      const previousBytes = projectRef.current.style.backgroundAssetId ? assetsRef.current[projectRef.current.style.backgroundAssetId]?.bytes ?? 0 : 0;
      if (totalBytes - previousBytes + file.size > MAX_TOTAL_SOURCE_BYTES) throw new Error("Screenshots and background images can total up to 80 MB.");
      const { width, height } = await inspectImage(file);
      const id = createId("background");
      const asset: ScreenshotAsset = { id, blob: file, name: file.name, mimeType: file.type, width, height, bytes: file.size };
      const url = URL.createObjectURL(file); assetUrls.current.add(url);
      try { await screenshotStorage.saveAsset(asset); } catch { setNotice("Background is available in this session, but browser storage could not save it. Download a project file to keep it."); }
      const updatedAssets = { ...assetsRef.current, [id]: { ...asset, url } };
      assetsRef.current = updatedAssets; setAssets(updatedAssets);
      commit((current) => ({ ...current, style: { ...current.style, background: "image", backgroundAssetId: id } }));
      setNotice("Added a local background image to the gallery.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this background image."); }
    finally { if (backgroundInputRef.current) backgroundInputRef.current.value = ""; }
  };

  const moveScreen = (id: string, destination: number) => {
    const from = projectRef.current.screens.findIndex((screen) => screen.id === id);
    const to = Math.max(0, Math.min(projectRef.current.screens.length - 1, destination));
    if (from < 0 || from === to) return;
    const screens = [...projectRef.current.screens]; const [item] = screens.splice(from, 1); screens.splice(to, 0, item);
    commit({ ...projectRef.current, screens }); setSelectedId(id);
    setNotice(`Moved screen to position ${to + 1} of ${screens.length}.`);
  };

  const changeScreen = (patch: Partial<GalleryScreen>) => {
    if (!selected) return;
    commit((current) => ({ ...current, screens: current.screens.map((screen) => screen.id === selected.id ? { ...screen, ...patch } : screen) }));
  };
  const changeStyle = (patch: Partial<GalleryStyle>) => commit((current) => ({ ...current, style: { ...current.style, ...patch } }));
  const changeSelectedOverride = (key: keyof GalleryScreen["overrides"], value: string | number | undefined) => {
    if (!selected) return;
    const overrides = { ...selected.overrides };
    if (value === undefined) delete overrides[key]; else Object.assign(overrides, { [key]: value });
    changeScreen({ overrides });
  };

  const selectScreen = (id: string) => { setSelectedId(id); setSelectedElement(null); if (tab === "object") setTab("design"); };
  const selectElement = (element: GalleryElement) => { setSelectedElement(element); setTab("object"); };
  const editElement = (element: GalleryElement) => {
    selectElement(element);
    if (element === "headline" || element === "subtitle") {
      window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-object-text="${element}"]`)?.focus());
    }
  };
  const startElementTransform = () => { transformStartProject.current = projectRef.current; };
  const previewElementTransform = (element: GalleryElement, transform: ElementTransform) => {
    if (!selectedId) return;
    const current = projectRef.current;
    const next = {
      ...current,
      screens: current.screens.map((screen) => screen.id === selectedId
        ? { ...screen, elementTransforms: { ...screen.elementTransforms, [element]: transform } }
        : screen),
    };
    projectRef.current = next; setProject(next); setError(null);
  };
  const finishElementTransform = () => {
    const original = transformStartProject.current;
    const current = projectRef.current;
    if (original && current !== original) {
      undoStack.current = [...undoStack.current.slice(-49), original];
      redoStack.current = [];
      const complete = { ...current, updatedAt: Date.now() };
      projectRef.current = complete; setProject(complete); setError(null);
      pruneUndoAssets();
    }
    transformStartProject.current = null;
  };
  const setElementTransform = (element: GalleryElement, transform: ElementTransform) => {
    if (!selected) return;
    commit((current) => ({
      ...current,
      screens: current.screens.map((screen) => screen.id === selected.id
        ? { ...screen, elementTransforms: { ...screen.elementTransforms, [element]: transform } }
        : screen),
    }));
  };
  const copyElementTransformToSet = () => {
    if (!selected || !selectedElement || !selectedElementGeometry) return;
    const transform = { centerX: selectedElementGeometry.centerX, centerY: selectedElementGeometry.centerY, scale: selectedElementGeometry.scale, rotation: selectedElementGeometry.rotation };
    commit((current) => ({
      ...current,
      screens: current.screens.map((screen) => ({ ...screen, elementTransforms: { ...screen.elementTransforms, [selectedElement]: transform } })),
    }));
    setNotice(`${selectedElement === "device" ? "Device frame" : selectedElement === "headline" ? "Headline" : selectedElement === "subtitle" ? "Subtitle" : "Screenshot image"} position copied to every screen.`);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) void addFiles(event.currentTarget.files);
    event.currentTarget.value = "";
  };
  const onDrop = (event: DragEvent) => {
    const files = event.dataTransfer.files;
    if (!files.length) return;
    event.preventDefault();
    if (draggedId.current) {
      const targetId = (event.target as HTMLElement).closest<HTMLElement>("[data-screen-id]")?.dataset.screenId;
      const targetIndex = projectRef.current.screens.findIndex((screen) => screen.id === targetId);
      if (targetIndex >= 0) moveScreen(draggedId.current, targetIndex);
      draggedId.current = null; return;
    }
    void addFiles(files);
  };
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.items).map((item) => item.getAsFile()).filter((file): file is File => !!file);
    if (files.length) void addFiles(files);
  };
  const screenDragStart = (event: DragEvent, id: string) => { draggedId.current = id; event.dataTransfer.effectAllowed = "move"; };
  const screenDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const from = draggedId.current;
    if (from) moveScreen(from, project.screens.findIndex((screen) => screen.id === targetId));
    draggedId.current = null;
  };

  const openPresentation = (index = selectedIndex) => { if (!project.screens.length) return; setPresentationIndex(index); setPresentation(true); };
  useEffect(() => {
    if (!presentation) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresentation(false);
      if (event.key === "ArrowRight") setPresentationIndex((index) => Math.min(projectRef.current.screens.length - 1, index + 1));
      if (event.key === "ArrowLeft") setPresentationIndex((index) => Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [presentation]);

  const outputName = (index: number) => `${String(index + 1).padStart(2, "0")}-${safeBase(project.name)}-${project.specId}-${project.orientation}.${project.format === "jpeg" ? "jpg" : "png"}`;
  const withLoadedImage = async (screen: GalleryScreen, callback: (image: { image: CanvasImageSource; width: number; height: number }, background?: { image: CanvasImageSource; width: number; height: number }) => Promise<Blob>, current = projectRef.current) => {
    const asset = assetsRef.current[screen.assetId];
    if (!asset) throw new Error(`${screen.name} is missing. Replace it before exporting.`);
    const backgroundAsset = current.style.background === "image" && current.style.backgroundAssetId ? assetsRef.current[current.style.backgroundAssetId] : undefined;
    if (current.style.background === "image" && !backgroundAsset) throw new Error("The background image is missing. Replace it or choose a color background.");
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(asset.blob);
      const backdrop = backgroundAsset ? await createImageBitmap(backgroundAsset.blob) : undefined;
      try { return await callback({ image: bitmap, width: bitmap.width, height: bitmap.height }, backdrop ? { image: backdrop, width: backdrop.width, height: backdrop.height } : undefined); }
      finally { bitmap.close(); backdrop?.close(); }
    }
    const image = new Image(); image.src = asset.url; await image.decode();
    if (!backgroundAsset) return callback({ image, width: image.naturalWidth, height: image.naturalHeight });
    const backdrop = new Image(); backdrop.src = backgroundAsset.url; await backdrop.decode();
    return callback({ image, width: image.naturalWidth, height: image.naturalHeight }, { image: backdrop, width: backdrop.naturalWidth, height: backdrop.naturalHeight });
  };

  const exportOne = async (screen = selected, index = selectedIndex) => {
    if (!screen) { setError("Add at least one screenshot before exporting."); return; }
    setBusy("Preparing screenshot…"); setError(null); setProgress(0);
    try {
      const current = projectRef.current;
      const blob = await withLoadedImage(screen, (image, background) => createGalleryBlob(current, screen, image, background), current);
      downloadBlob(blob, outputName(index)); setNotice(`Downloaded ${outputName(index)} · ${output.width} × ${output.height}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not export this screenshot."); }
    finally { setBusy(""); setProgress(0); }
  };

  const exportSet = async () => {
    const current = projectRef.current;
    if (!current.screens.length) { setError("Add at least one screenshot before exporting the set."); return; }
    setBusy("Rendering screenshot set…"); setError(null); setNotice(null); setProgress(0);
    try {
      const entries: ZipEntry[] = [];
      let total = 0;
      for (const [index, screen] of current.screens.entries()) {
        setProgress(Math.round(index / current.screens.length * 100));
        const blob = await withLoadedImage(screen, (image, background) => createGalleryBlob(current, screen, image, background), current);
        total += blob.size;
        if (total > MAX_ZIP_FILE_BYTES) throw new Error("This set exceeds the 160 MB ZIP limit. Choose JPEG output or download screens individually.");
        entries.push({ name: `${current.family}/${current.specId}/${current.orientation}/${outputName(index)}`, data: new Uint8Array(await blob.arrayBuffer()) });
        setProgress(Math.round((index + 1) / current.screens.length * 100));
      }
      const zip = createZip(entries, MAX_ZIP_FILE_BYTES);
      downloadBlob(zip, `${safeBase(current.name)}-${current.specId}-${current.orientation}.zip`);
      setNotice(`Downloaded ${entries.length} ${entries.length === 1 ? "screenshot" : "screenshots"} at ${output.width} × ${output.height}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not export this screenshot set."); }
    finally { setBusy(""); setProgress(0); }
  };

  const exportProject = async () => {
    const current = projectRef.current;
    if (!current.screens.length) { setError("Add a screenshot before saving a portable project."); return; }
    setBusy("Packaging project…"); setError(null);
    try {
      const packedAssets: PortableAsset[] = [];
      let sum = 0;
      const assetIds = new Set([...current.screens.map((screen) => screen.assetId), ...(current.style.backgroundAssetId ? [current.style.backgroundAssetId] : [])]);
      for (const assetId of assetIds) {
        const asset = assetsRef.current[assetId];
        if (!asset) throw new Error("A source image is missing. Replace it before saving the project.");
        sum += asset.bytes;
        if (sum > MAX_TOTAL_SOURCE_BYTES) throw new Error("This project exceeds the 80 MB source image limit.");
        packedAssets.push({ id: asset.id, name: asset.name, mimeType: asset.mimeType, width: asset.width, height: asset.height, bytes: asset.bytes, dataUrl: await blobToDataUrl(asset.blob) });
      }
      const file: PortableProject = { kind: "app-store-screenshots-project", version: 1, createdAt: new Date().toISOString(), project: current, assets: packedAssets };
      const content = JSON.stringify(file);
      const blob = new Blob([content], { type: "application/json" });
      if (blob.size > MAX_PROJECT_FILE_BYTES) throw new Error("This project file exceeds the 120 MB limit. Remove screens or use smaller source images.");
      downloadBlob(blob, `${safeBase(current.name)}.appshots`); setNotice(`Project saved · ${formatFileSize(blob.size)}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not package this project."); }
    finally { setBusy(""); }
  };

  const importProject = async (file?: File) => {
    if (!file) return;
    setError(null); setBusy("Opening project…");
    try {
      if (file.size > MAX_PROJECT_FILE_BYTES) throw new Error("This project file exceeds the 120 MB limit.");
      const raw: unknown = JSON.parse(await file.text());
      if (!validatePortableProject(raw)) throw new Error("This is not a supported App Store Screenshots project file.");
      const assetTotal = raw.assets.reduce((sum, asset) => sum + asset.bytes, 0);
      if (assetTotal > MAX_TOTAL_SOURCE_BYTES) throw new Error("This project contains more than 80 MB of source images.");
      const nextAssets: Record<string, LiveAsset> = {};
      for (const packed of raw.assets) {
        const comma = packed.dataUrl.indexOf(",");
        if (!packed.dataUrl.startsWith(`data:${packed.mimeType};base64,`) || comma < 0) throw new Error("A project image has an invalid encoding.");
        const binary = atob(packed.dataUrl.slice(comma + 1));
        const bytes = new Uint8Array(binary.length);
        for (let offset = 0; offset < binary.length; offset += 1024 * 1024) {
          const end = Math.min(binary.length, offset + 1024 * 1024);
          for (let index = offset; index < end; index += 1) bytes[index] = binary.charCodeAt(index);
        }
        if (bytes.byteLength !== packed.bytes || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("A project image does not match its recorded size.");
        const blob = new Blob([bytes], { type: packed.mimeType });
        const fileLike = new File([blob], packed.name, { type: packed.mimeType });
        const measured = await inspectImage(fileLike);
        if (measured.width !== packed.width || measured.height !== packed.height) throw new Error("A project image does not match its recorded dimensions.");
        const url = URL.createObjectURL(blob); assetUrls.current.add(url);
        const asset: ScreenshotAsset = { id: packed.id, name: packed.name, mimeType: packed.mimeType, width: measured.width, height: measured.height, bytes: blob.size, blob };
        nextAssets[asset.id] = { ...asset, url };
        try { await screenshotStorage.saveAsset(asset); } catch { setNotice("Project opened for this session, but browser storage is unavailable. Save the project file to keep it."); }
      }
      if (!validateProject(raw.project)) throw new Error("The project composition is invalid.");
      assetsRef.current = nextAssets; setAssets(nextAssets); commit(raw.project); setSelectedId(raw.project.screens[0]?.id ?? null); setSelectedElement(null); setTab("design");
      undoStack.current = []; redoStack.current = [];
      pruneUndoAssets();
      setNotice(`Opened ${raw.project.name}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open this project."); }
    finally { setBusy(""); if (projectInputRef.current) projectInputRef.current.value = ""; }
  };

  const reset = () => {
    const fresh = createDefaultProject(); commit(fresh); setSelectedId(null); setSelectedElement(null); setTab("design"); setNotice("Started a new screenshot set. Use Undo to restore the previous set.");
  };

  const availablePixels = output.width * output.height;
  const currentCrop = selected ? inspectCrop(selected, output.width, output.height) : false;
  const lowResolution = selected ? inspectResolution(selected, output.width, output.height) : false;
  const isDirtySet = project.screens.length > 0;
  const selectSpec = (specId: string) => {
    const spec = getScreenshotSpec(specId);
    if (spec) commit((current) => ({ ...current, specId: spec.id, family: spec.family }));
  };

  return (
    <div className="min-h-dvh bg-background" onDrop={onDrop} onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onPaste={onPaste}>
      <AppHeader showToolsLink />
      <input ref={backgroundInputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label="Choose a background image" className="sr-only" onChange={(event) => void addBackgroundFile(event.currentTarget.files?.[0])} />
      <input ref={projectInputRef} type="file" accept=".appshots,application/json" aria-label="Open an App Store Screenshots project" className="sr-only" onChange={(event) => void importProject(event.currentTarget.files?.[0])} />
      <main className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Image tools</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">App Store Screenshots</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Build a complete, ordered product-page gallery from your real app screens.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={undo} disabled={!undoStack.current.length || !!busy} aria-label="Undo"><Undo2 data-icon="inline-start" /> Undo</Button>
            <Button variant="outline" onClick={redo} disabled={!redoStack.current.length || !!busy} aria-label="Redo"><Redo2 data-icon="inline-start" /> Redo</Button>
            <Button variant="ghost" onClick={reset} disabled={!!busy}><RotateCcw data-icon="inline-start" /> New set</Button>
          </div>
        </div>

        <details className="mb-3 lg:hidden">
          <summary className="cursor-pointer rounded-[var(--radius-control)] border border-border bg-card px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring">
            Set target · {project.family === "iphone" ? "iPhone" : "iPad"} · {activeSpec?.display.replace("iPhone · ", "").replace("iPad · ", "")} · {project.orientation}
          </summary>
          <Card className="mt-2">
            <CardContent className="space-y-3 p-3">
              <Field label="Project name"><Input aria-label="Project name" maxLength={80} value={project.name} onChange={(event) => commit((current) => ({ ...current, name: event.target.value || "Untitled set" }))} /></Field>
              <Field label="Platform"><select className={selectClass} value={project.family} onChange={(event) => selectSpec(event.target.value === "ipad" ? "ipad-13-2064" : "iphone-63-1179")}><option value="iphone">Apple App Store · iPhone</option><option value="ipad">Apple App Store · iPad</option></select></Field>
              <Field label="Display size"><select className={selectClass} value={project.specId} onChange={(event) => selectSpec(event.target.value)}>{getSpecOptions(project.family).map((spec) => <option key={spec.id} value={spec.id}>{spec.display} · {spec.width} × {spec.height}{getRequirementForSpec(spec.id)?.status === "upcoming" ? " · upcoming requirement" : getRequirementForSpec(spec.id) ? " · required set option" : " · alternate"}</option>)}</select></Field>
              <Field label="Orientation"><div className="grid grid-cols-2 gap-1 rounded-[var(--radius-control)] border border-border bg-muted/40 p-1">{(["portrait", "landscape"] as const).map((orientation) => <button key={orientation} type="button" aria-pressed={project.orientation === orientation} onClick={() => commit((current) => ({ ...current, orientation }))} className={`h-9 rounded-[var(--radius-control)] px-3 text-sm capitalize focus-visible:outline-2 focus-visible:outline-ring ${project.orientation === orientation ? "bg-background text-foreground shadow-[var(--shadow-control)]" : "text-muted-foreground hover:text-foreground"}`}>{orientation}</button>)}</div></Field>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{activeRequirement ? activeRequirement.note : "Alternate supported size. App Store Connect may scale down a higher required resolution when app UI is consistent."}</p>
            </CardContent>
          </Card>
        </details>

        <Card className="mb-4 hidden overflow-visible lg:block">
          <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(170px,1fr)_minmax(190px,1fr)_minmax(220px,1.4fr)_auto] sm:items-end sm:p-4">
            <Field label="Project name"><Input aria-label="Project name" maxLength={80} value={project.name} onChange={(event) => commit((current) => ({ ...current, name: event.target.value || "Untitled set" }))} /></Field>
            <Field label="Platform"><select className={selectClass} value={project.family} onChange={(event) => {
              const family = event.target.value as ScreenshotFamily;
              selectSpec(family === "ipad" ? "ipad-13-2064" : "iphone-63-1179");
            }}><option value="iphone">Apple App Store · iPhone</option><option value="ipad">Apple App Store · iPad</option></select></Field>
            <Field label="Display size"><select className={selectClass} value={project.specId} onChange={(event) => selectSpec(event.target.value)}>{getSpecOptions(project.family).map((spec) => <option key={spec.id} value={spec.id}>{spec.display} · {spec.width} × {spec.height}{getRequirementForSpec(spec.id)?.status === "upcoming" ? " · upcoming requirement" : getRequirementForSpec(spec.id) ? " · required set option" : " · alternate"}</option>)}</select></Field>
            <Field label="Orientation"><div className="grid grid-cols-2 gap-1 rounded-[var(--radius-control)] border border-border bg-muted/40 p-1">
              {(["portrait", "landscape"] as const).map((orientation) => <button key={orientation} type="button" aria-pressed={project.orientation === orientation} onClick={() => commit((current) => ({ ...current, orientation }))} className={`h-7 rounded-[var(--radius-control)] px-3 text-xs capitalize focus-visible:outline-2 focus-visible:outline-ring ${project.orientation === orientation ? "bg-background text-foreground shadow-[var(--shadow-control)]" : "text-muted-foreground hover:text-foreground"}`}>{orientation}</button>)}
            </div></Field>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{activeRequirement ? activeRequirement.note : "Alternate supported size. App Store Connect may scale down a higher required resolution when app UI is consistent."}</p>
          </CardContent>
        </Card>

        <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
          <span className="text-xs text-muted-foreground" aria-live="polite">{saved === "saving" ? "Saving…" : saved === "saved" ? "Saved locally" : "Session only"}</span>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => projectInputRef.current?.click()} disabled={!!busy}><FolderOpen data-icon="inline-start" /> Open</Button><Button variant="outline" size="sm" onClick={() => void exportProject()} disabled={!isDirtySet || !!busy}><Download data-icon="inline-start" /> Save project</Button></div>
        </div>

        <div className="mb-4 hidden flex-wrap items-center justify-between gap-2 lg:flex">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1">{project.screens.length} / {MAX_SCREEN_COUNT} screens</span>
            <span>{output.width} × {output.height} px</span><span aria-hidden="true">·</span>
            <span aria-live="polite">{ready ? saved === "saving" ? "Saving locally…" : saved === "saved" ? "Saved locally" : "Session only" : "Loading local project…"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => projectInputRef.current?.click()} disabled={!!busy}><FolderOpen data-icon="inline-start" /> Open project</Button>
            <Button variant="outline" size="sm" onClick={() => void exportProject()} disabled={!isDirtySet || !!busy}><Download data-icon="inline-start" /> Save project</Button>
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div className="min-w-0"><CardTitle>{selected ? `Screen ${selectedIndex + 1}` : "Gallery preview"}</CardTitle><CardDescription className="mt-1">{selected ? `${selected.name} · ${selected.width} × ${selected.height}` : "Add screenshots to see your gallery take shape."}</CardDescription></div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => openPresentation()} disabled={!project.screens.length || !!busy}><Eye data-icon="inline-start" /> Present</Button>
                  {selected && <Button variant="ghost" size="icon" aria-label="Remove selected screen" onClick={removeSelected} disabled={!!busy}><Trash2 /></Button>}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-5">
                <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-border bg-muted/35 p-3 sm:min-h-[520px] sm:p-6">
                  {ready ? <GalleryCanvas project={project} screen={selected} sourceUrl={selectedAsset?.url} backgroundUrl={project.style.backgroundAssetId ? assets[project.style.backgroundAssetId]?.url : undefined} showSafeArea={showSafeArea} interactive onOverflow={setOverflow} onUnsafeElements={setUnsafeElements} onElements={setRenderedElements} selectedElement={selectedElement} onSelectElement={selectElement} onTransformStart={startElementTransform} onTransform={previewElementTransform} onTransformEnd={finishElementTransform} onEditElement={editElement} /> : <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Restoring local project…</div>}
                  {ready && !selected && <div className="absolute flex max-w-xs flex-col items-center gap-3 px-6 text-center">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><ImagePlus className="size-6" /></span>
                    <p className="text-sm font-medium">Add your first app screenshot</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">PNG, JPEG, or WebP · up to 40 MB per image</p>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={!!busy}><Upload data-icon="inline-start" /> Choose screenshots</Button>
                  </div>}
                </div>
                {selected && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{project.layout === "device-frame" ? "Device-frame preview" : project.layout === "caption-led" ? "Caption-led preview" : "Full-bleed preview"} · {project.format.toUpperCase()} · {output.width} × {output.height}</span>
                  <span>{selectedIndex + 1} of {project.screens.length}</span>
                </div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <div><CardTitle>Gallery order</CardTitle><CardDescription className="mt-1">Drag a screen or use the move controls.</CardDescription></div>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label="Choose one or more app screenshots" multiple className="sr-only" onChange={handleFileChange} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={project.screens.length >= MAX_SCREEN_COUNT || !!busy}><ImagePlus data-icon="inline-start" /> Add screens</Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {project.screens.length ? <div className="flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Screenshot gallery order">
                  {project.screens.map((screen, index) => {
                    const asset = assets[screen.assetId];
                    return <div key={screen.id} data-screen-id={screen.id} role="listitem" draggable onDragStart={(event) => screenDragStart(event, screen.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => screenDrop(event, screen.id)} className={`group relative w-[88px] shrink-0 rounded-[var(--radius-control)] border p-1.5 transition-colors sm:w-[112px] ${selectedId === screen.id ? "border-primary ring-2 ring-primary/25" : "border-border bg-muted/20"}`}>
                      <button type="button" onClick={() => selectScreen(screen.id)} onKeyDown={(event) => {
                        if (event.altKey && event.key === "ArrowUp") { event.preventDefault(); moveScreen(screen.id, index - 1); }
                        if (event.altKey && event.key === "ArrowDown") { event.preventDefault(); moveScreen(screen.id, index + 1); }
                      }} aria-label={`Select screen ${index + 1}, ${screen.name}`} aria-pressed={selectedId === screen.id} className="block w-full rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <div className="flex h-24 items-center justify-center overflow-hidden rounded bg-muted/50 sm:h-32">{asset ? <img src={asset.url} alt="" className="max-h-full max-w-full object-contain" /> : <FileImage className="size-5 text-muted-foreground" />}</div>
                        <span className="mt-1 block truncate text-left text-[11px] font-medium">{String(index + 1).padStart(2, "0")} · {screen.name}</span>
                      </button>
                      <div className="mt-1 flex justify-between gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={`Move screen ${index + 1} up`} disabled={index === 0 || !!busy} onClick={() => moveScreen(screen.id, index - 1)}><ArrowUp /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Move screen ${index + 1} down`} disabled={index === project.screens.length - 1 || !!busy} onClick={() => moveScreen(screen.id, index + 1)}><ArrowDown /></Button>
                      </div>
                      <label className="sr-only">Move {screen.name} to position</label>
                      <select aria-label={`Move screen ${index + 1} to position`} value={index} onChange={(event) => moveScreen(screen.id, Number(event.target.value))} className="sr-only">
                        {project.screens.map((_, position) => <option key={position} value={position}>{position + 1}</option>)}
                      </select>
                    </div>;
                  })}
                </div> : <button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Upload className="size-5" />Choose, paste, or drop screenshots</button>}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>Alt + ↑ / ↓ moves the selected screen. Touch users can use the arrows.</span><span>{formatFileSize(totalBytes)} of 80 MB source images</span></div>
                <p aria-live="polite" className="sr-only">{notice ?? ""}</p>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <Card>
              <CardHeader className="pb-3"><CardTitle>Screen design</CardTitle><CardDescription>Keep the same visual system across your set.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className={`grid ${selectedElement ? "grid-cols-3" : "grid-cols-2"} gap-1 rounded-[var(--radius-control)] bg-muted p-1`} role="tablist" aria-label="Design settings">
                  <button role="tab" aria-selected={tab === "design"} onClick={() => setTab("design")} className={`h-8 rounded-[var(--radius-control)] text-sm focus-visible:outline-2 focus-visible:outline-ring ${tab === "design" ? "bg-background shadow-[var(--shadow-control)]" : "text-muted-foreground"}`}>Gallery style</button>
                  <button role="tab" aria-selected={tab === "screenshot"} onClick={() => setTab("screenshot")} disabled={!selected} className={`h-8 rounded-[var(--radius-control)] text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${tab === "screenshot" ? "bg-background shadow-[var(--shadow-control)]" : "text-muted-foreground"}`}>Selected screen</button>
                  {selectedElement && <button role="tab" aria-selected={tab === "object"} onClick={() => setTab("object")} className={`h-8 rounded-[var(--radius-control)] text-sm focus-visible:outline-2 focus-visible:outline-ring ${tab === "object" ? "bg-background shadow-[var(--shadow-control)]" : "text-muted-foreground"}`}>Selected object</button>}
                </div>

                {tab === "design" ? <div className="space-y-4" role="tabpanel">
                  <Field label="Layout"><select className={selectClass} value={project.layout} onChange={(event) => { setSelectedElement(null); setTab("design"); commit((current) => ({ ...current, layout: event.target.value as GalleryProject["layout"] })); }}>
                    <option value="full-bleed">Full-bleed</option><option value="device-frame">Device frame</option><option value="caption-led">Caption-led</option>
                  </select></Field>
                  <p className="-mt-2 text-[11px] text-muted-foreground">{project.layout === "full-bleed" ? "Screenshot fills the canvas with a readable headline overlay." : project.layout === "caption-led" ? "Copy sits above a large screenshot panel." : project.family === "ipad" ? "Your screen sits inside a clean tablet frame." : "Your screen sits inside a clean phone frame."}</p>
                  <Field label="Headline"><Input maxLength={120} value={project.style.title} onChange={(event) => changeStyle({ title: event.target.value })} /></Field>
                  <Field label="Subtitle"><Input maxLength={200} value={project.style.subtitle} onChange={(event) => changeStyle({ subtitle: event.target.value })} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Typeface"><select className={selectClass} value={project.style.font} onChange={(event) => changeStyle({ font: event.target.value as GalleryStyle["font"] })}><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></Field>
                    <Field label="Alignment"><select className={selectClass} value={project.style.alignment} onChange={(event) => changeStyle({ alignment: event.target.value as GalleryStyle["alignment"] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></Field>
                  </div>
                  <Field label="Headline size" hint={`${project.style.fontSize}px`}><input aria-label="Headline size" type="range" min={40} max={120} step={2} value={project.style.fontSize} onChange={(event) => changeStyle({ fontSize: Number(event.target.value) })} className="h-5 w-full accent-primary" /></Field>
                  <Field label="Line spacing" hint={project.style.lineSpacing.toFixed(2)}><input aria-label="Line spacing" type="range" min={0.9} max={1.8} step={0.05} value={project.style.lineSpacing} onChange={(event) => changeStyle({ lineSpacing: Number(event.target.value) })} className="h-5 w-full accent-primary" /></Field>
                  <Field label="Text color"><div className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-input px-2"><input aria-label="Text color" type="color" value={project.style.textColor} onChange={(event) => changeStyle({ textColor: event.target.value })} className="size-7 cursor-pointer rounded border-0 bg-transparent" /><span className="text-xs text-muted-foreground">{project.style.textColor}</span></div></Field>
                  <Field label="Background"><select className={selectClass} value={project.style.background} onChange={(event) => {
                    const background = event.target.value as GalleryStyle["background"];
                    if (background === "image" && !project.style.backgroundAssetId) backgroundInputRef.current?.click();
                    else changeStyle({ background });
                  }}><option value="gradient">Soft gradient</option><option value="solid">Solid color</option><option value="image">Image</option></select></Field>
                  {project.style.background === "image" && <div className="space-y-2 rounded-[var(--radius-control)] border border-border bg-muted/30 p-3">
                    <p className="truncate text-xs text-muted-foreground">{project.style.backgroundAssetId ? assets[project.style.backgroundAssetId]?.name ?? "Background image missing" : "No background selected"}</p>
                    <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => backgroundInputRef.current?.click()}><ImagePlus data-icon="inline-start" /> {project.style.backgroundAssetId ? "Replace image" : "Choose image"}</Button><Button variant="ghost" onClick={() => changeStyle({ background: "gradient", backgroundAssetId: null })}>Remove</Button></div>
                    <p className="text-[11px] text-muted-foreground">The image fills the canvas. Choose an image with space behind your copy.</p>
                  </div>}
                  {project.style.background !== "image" && <div className="grid grid-cols-2 gap-3">
                    <Field label={project.style.background === "gradient" ? "Gradient start" : "Background color"}><input aria-label="Background start color" type="color" value={project.style.backgroundStart} onChange={(event) => changeStyle({ backgroundStart: event.target.value })} className="h-9 w-full rounded border border-input bg-background p-1" /></Field>
                    {project.style.background === "gradient" && <Field label="Gradient end"><input aria-label="Background end color" type="color" value={project.style.backgroundEnd} onChange={(event) => changeStyle({ backgroundEnd: event.target.value })} className="h-9 w-full rounded border border-input bg-background p-1" /></Field>}
                  </div>}
                  <div className="grid grid-cols-[1fr_120px] gap-3">
                    <Field label="Accent decoration"><select className={selectClass} value={project.style.decoration} onChange={(event) => changeStyle({ decoration: event.target.value as GalleryStyle["decoration"] })}><option value="none">None</option><option value="orb">Soft orb</option><option value="rule">Short rule</option></select></Field>
                    {project.style.decoration !== "none" && <Field label="Accent color"><input aria-label="Accent decoration color" type="color" value={project.style.decorationColor} onChange={(event) => changeStyle({ decorationColor: event.target.value })} className="h-9 w-full rounded border border-input bg-background p-1" /></Field>}
                  </div>
                  {selected && <div className="border-t border-border pt-3">
                    <p className="mb-2 text-xs font-medium">Per-screen copy override</p>
                    <Field label="Headline"><Input maxLength={120} placeholder={project.style.title} value={selected.overrides.title ?? ""} onChange={(event) => changeSelectedOverride("title", event.target.value)} /></Field>
                    <button type="button" onClick={() => changeSelectedOverride("title", undefined)} className="mt-1 text-[11px] text-primary hover:underline">Use gallery headline</button>
                  </div>}
                </div> : tab === "object" && selected && selectedElement && currentElementTransform ? <div className="space-y-4" role="tabpanel">
                  <div className="rounded-[var(--radius-control)] border border-border bg-muted/30 p-3">
                    <p className="text-sm font-medium">{selectedElementName}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Drag the object to move it. Use the corner node to resize and the top node to rotate. These controls work the same way.</p>
                  </div>
                  {(selectedElement === "headline" || selectedElement === "subtitle") && <>
                    <Field label="Text"><Input data-object-text={selectedElement} maxLength={selectedElement === "headline" ? 120 : 200} value={selectedElement === "headline" ? selectedStyle.title : selectedStyle.subtitle} onChange={(event) => changeSelectedOverride(selectedElement === "headline" ? "title" : "subtitle", event.target.value)} /></Field>
                    <Field label="Text color"><div className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-input px-2"><input aria-label="Selected object text color" type="color" value={selectedStyle.textColor} onChange={(event) => changeSelectedOverride("textColor", event.target.value)} className="size-7 cursor-pointer rounded border-0 bg-transparent" /><span className="text-xs text-muted-foreground">{selectedStyle.textColor}</span></div></Field>
                  </>}
                  <div className="grid grid-cols-2 gap-3">
                    <TransformInput label="Center X (%)" value={Number(currentElementTransform.centerX.toFixed(1))} min={-100} max={200} step={0.1} onCommit={(value) => setElementTransform(selectedElement, { ...currentElementTransform, centerX: value })} />
                    <TransformInput label="Center Y (%)" value={Number(currentElementTransform.centerY.toFixed(1))} min={-100} max={200} step={0.1} onCommit={(value) => setElementTransform(selectedElement, { ...currentElementTransform, centerY: value })} />
                    <TransformInput label="Scale (%)" value={Math.round(currentElementTransform.scale * 100)} min={25} max={300} step={1} onCommit={(value) => setElementTransform(selectedElement, { ...currentElementTransform, scale: value / 100 })} />
                    <TransformInput label="Rotation (°)" value={Math.round(currentElementTransform.rotation)} min={-180} max={180} step={1} onCommit={(value) => setElementTransform(selectedElement, { ...currentElementTransform, rotation: value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => commit((current) => ({ ...current, screens: current.screens.map((screen) => {
                      if (screen.id !== selected.id) return screen;
                      const elementTransforms = { ...screen.elementTransforms }; delete elementTransforms[selectedElement];
                      return { ...screen, elementTransforms };
                    }) }))}>Reset position</Button>
                    <Button variant="outline" onClick={copyElementTransformToSet} disabled={project.screens.length < 2}>Copy to all screens</Button>
                  </div>
                  {(selectedElement === "headline" || selectedElement === "subtitle") && <button type="button" onClick={() => {
                    changeSelectedOverride(selectedElement === "headline" ? "title" : "subtitle", undefined);
                    changeSelectedOverride("textColor", undefined);
                  }} className="text-xs text-primary hover:underline">Use gallery text and color</button>}
                </div> : selected ? <div className="space-y-4" role="tabpanel">
                  <div className="rounded-[var(--radius-control)] border border-border bg-muted/30 p-3"><p className="truncate text-sm font-medium">{selected.name}</p><p className="mt-1 text-xs text-muted-foreground">{selected.width} × {selected.height} · {formatFileSize(selected.bytes)}</p></div>
                  <input ref={replaceInputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label="Replace the selected screenshot" className="sr-only" onChange={(event) => void replaceSelectedFile(event.currentTarget.files?.[0])} />
                  <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => replaceInputRef.current?.click()} disabled={!!busy}><Upload data-icon="inline-start" /> Replace</Button><Button variant="outline" className="flex-1" onClick={removeSelected} disabled={!!busy}><Trash2 data-icon="inline-start" /> Remove</Button></div>
                  <Field label="Image fit"><select className={selectClass} value={selected.fit} onChange={(event) => changeScreen({ fit: event.target.value as GalleryScreen["fit"] })}><option value="cover">Fill frame · crop edges</option><option value="contain">Fit whole image · add space</option></select></Field>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">Original screenshot pixels stay unchanged. Fit may crop to fill the selected display; warnings below show when visible edges are removed.</p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-border px-3 py-2.5 text-xs"><input type="checkbox" checked={showSafeArea} onChange={(event) => setShowSafeArea(event.target.checked)} className="size-4 accent-primary" /><span>Show safe-area guide<span className="mt-0.5 block text-[11px] text-muted-foreground">The 6% inset is a preview guide and is not exported.</span></span></label>
                  <Field label="Crop zoom" hint={`${selected.zoom.toFixed(2)}×`}><input aria-label="Crop zoom" type="range" min={1} max={2.5} step={0.05} value={selected.zoom} onChange={(event) => changeScreen({ zoom: Number(event.target.value) })} className="h-5 w-full accent-primary" /></Field>
                  <Field label="Horizontal crop position" hint={`${selected.focalX}%`}><input aria-label="Horizontal crop position" type="range" min={-100} max={100} step={1} value={selected.focalX} onChange={(event) => changeScreen({ focalX: Number(event.target.value) })} className="h-5 w-full accent-primary" /></Field>
                  <Field label="Vertical crop position" hint={`${selected.focalY}%`}><input aria-label="Vertical crop position" type="range" min={-100} max={100} step={1} value={selected.focalY} onChange={(event) => changeScreen({ focalY: Number(event.target.value) })} className="h-5 w-full accent-primary" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Headline override"><Input value={selected.overrides.title ?? ""} maxLength={120} placeholder={project.style.title} onChange={(event) => changeSelectedOverride("title", event.target.value)} /></Field>
                    <Field label="Subtitle override"><Input value={selected.overrides.subtitle ?? ""} maxLength={200} placeholder={project.style.subtitle} onChange={(event) => changeSelectedOverride("subtitle", event.target.value)} /></Field>
                  </div>
                  <button type="button" onClick={() => changeScreen({ overrides: {} })} className="text-xs text-primary hover:underline">Reset screen overrides</button>
                </div> : <p className="text-sm text-muted-foreground" role="status">Add a screen to edit its fit and crop.</p>}

                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium">Export</p>
                  <Field label="File format"><select className={selectClass} value={project.format} onChange={(event) => commit((current) => ({ ...current, format: event.target.value as ExportFormat }))}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></Field>
                  {project.format === "jpeg" && <Field label="JPEG quality" hint={`${Math.round(project.quality * 100)}%`}><input aria-label="JPEG quality" type="range" min={0.6} max={1} step={0.01} value={project.quality} onChange={(event) => commit((current) => ({ ...current, quality: Number(event.target.value) }))} className="h-5 w-full accent-primary" /></Field>}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">Apple accepts opaque PNG and JPEG screenshots. Exports use the exact catalog dimensions; this tool cannot guarantee App Store approval.</p>
                  <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => void exportOne()} disabled={!selected || !!busy}><Download data-icon="inline-start" /> Current</Button><Button onClick={() => void exportSet()} disabled={!project.screens.length || !!busy}><Download data-icon="inline-start" /> Download set</Button></div>
                  {busy && <div className="space-y-2 rounded-[var(--radius-control)] border border-border bg-muted/30 p-3" role="status" aria-live="polite"><div className="flex items-center gap-2 text-xs font-medium"><LoaderCircle className="size-4 animate-spin" />{busy}</div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div></div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Set check</CardTitle><CardDescription>{project.screens.length} of 10 screenshot slots used</CardDescription></CardHeader>
              <CardContent className="space-y-2 text-xs">
                {!project.screens.length ? <p className="text-muted-foreground">Add at least one screen to export.</p> : <>
                  <p className="flex items-center justify-between gap-2"><span>{project.screens.length} screen{project.screens.length === 1 ? "" : "s"} ready</span><span className="text-muted-foreground">{formatFileSize(totalBytes)} source</span></p>
                  {selected && lowResolution && <p className="rounded-[var(--radius-control)] border border-amber-500/25 bg-amber-500/10 px-3 py-2 leading-relaxed text-amber-900 dark:text-amber-200">Source is smaller than the {output.width} × {output.height} export and may look soft.</p>}
                  {selected && currentCrop && <p className="rounded-[var(--radius-control)] border border-amber-500/25 bg-amber-500/10 px-3 py-2 leading-relaxed text-amber-900 dark:text-amber-200">This screen is cropped to fill its frame. Adjust fit, zoom, or position to change the visible area.</p>}
                  {selected && overflow && <p className="rounded-[var(--radius-control)] border border-amber-500/25 bg-amber-500/10 px-3 py-2 leading-relaxed text-amber-900 dark:text-amber-200">Copy is too long for its reserved text area and may be truncated. Shorten the headline or subtitle.</p>}
                  {selected && unsafeElements.length > 0 && <p className="rounded-[var(--radius-control)] border border-amber-500/25 bg-amber-500/10 px-3 py-2 leading-relaxed text-amber-900 dark:text-amber-200">{unsafeElements.map((element) => element === "device" ? "Device frame" : element === "screenshot" ? "Screenshot image" : element === "headline" ? "Headline" : "Subtitle").join(", ")}{unsafeElements.length === 1 ? " extends" : " extend"} outside the recommended safe area. Move or resize {unsafeElements.length === 1 ? "it" : "them"} before export.</p>}
                  <p className="flex items-start gap-2 text-muted-foreground"><span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />Dimensions and crop are checked locally. Review every screen before upload.</p>
                </>}
              </CardContent>
            </Card>
          </aside>
        </div>

        {error && <div className="mt-4 rounded-[var(--radius-control)] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{error}</div>}
        {notice && !error && <div className="mt-4 rounded-[var(--radius-control)] border border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground" role="status">{notice}</div>}
        <p className="mt-4 text-[11px] text-muted-foreground">Sources stay in this browser. Draft recovery uses local browser storage; export a project file for a portable backup. Specification catalog checked {APP_STORE_SPEC_VERSION} · {availablePixels.toLocaleString()} output pixels per screen.</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-control)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl gap-2">{project.screens.length ? <Button variant="outline" className="min-h-11 flex-1" onClick={() => openPresentation()} disabled={!!busy}><Eye data-icon="inline-start" /> Preview set</Button> : <Button variant="outline" className="min-h-11 flex-1" onClick={() => fileInputRef.current?.click()} disabled={!!busy}><ImagePlus data-icon="inline-start" /> Add screenshots</Button>}<Button className="min-h-11 flex-1" onClick={() => void exportSet()} disabled={!project.screens.length || !!busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Download data-icon="inline-start" />} Download set</Button></div>
      </div>

      {presentation && selected && <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Screenshot set presentation">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6"><div><p className="text-sm font-medium">{project.name}</p><p className="text-xs text-muted-foreground">Screen {presentationIndex + 1} of {project.screens.length} · {output.width} × {output.height}</p></div><Button variant="outline" onClick={() => setPresentation(false)}><X data-icon="inline-start" /> Close</Button></div>
        <div className="flex min-h-0 flex-1 items-center justify-center gap-3 overflow-hidden p-4 sm:gap-8 sm:p-8">
          <Button variant="outline" size="icon" aria-label="Previous screen" disabled={presentationIndex === 0} onClick={() => setPresentationIndex((index) => Math.max(0, index - 1))}><ArrowLeft /></Button>
          <div className="flex min-h-0 flex-1 items-center justify-center"><GalleryCanvas key={project.screens[presentationIndex]?.id} project={project} screen={project.screens[presentationIndex]} sourceUrl={assets[project.screens[presentationIndex]?.assetId]?.url} backgroundUrl={project.style.backgroundAssetId ? assets[project.style.backgroundAssetId]?.url : undefined} showSafeArea={showSafeArea} onOverflow={setOverflow} /></div>
          <Button variant="outline" size="icon" aria-label="Next screen" disabled={presentationIndex === project.screens.length - 1} onClick={() => setPresentationIndex((index) => Math.min(project.screens.length - 1, index + 1))}><ArrowRight /></Button>
        </div>
        <div className="flex justify-center gap-1 border-t border-border p-3" role="list" aria-label="Presentation screens">{project.screens.map((screen, index) => <button key={screen.id} type="button" aria-label={`Show screen ${index + 1}`} aria-current={index === presentationIndex ? "step" : undefined} onClick={() => setPresentationIndex(index)} className={`size-2 rounded-full focus-visible:outline-2 focus-visible:outline-ring ${index === presentationIndex ? "bg-primary" : "bg-muted-foreground/35"}`} />)}</div>
      </div>}
    </div>
  );
}
