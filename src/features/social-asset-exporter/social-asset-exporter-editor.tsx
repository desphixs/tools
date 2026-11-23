"use client";

import Link from "next/link";
import {
  ArrowDownToLine, ArrowLeft, Check, ChevronDown, CircleAlert, Crop, Eye, EyeOff, FileDown, FileUp,
  ImagePlus, LoaderCircle, Maximize2, Redo2, RotateCcw, Sparkles, Undo2, Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { SOCIAL_PLACEMENTS, PLACEMENT_BY_ID, SPEC_VERIFIED_ON, type PlacementId, type SocialPlacement } from "./catalog";
import {
  createDefaultComposition, effectiveSettings, isSupportedMimeType, MAX_LOGO_BYTES, MAX_OUTPUT_PIXELS, MAX_PACK_OUTPUT_PIXELS, MAX_PACK_OUTPUTS,
  MAX_PROJECT_ASSET_BYTES, MAX_SOURCE_BYTES, MAX_SOURCE_PIXELS, MAX_SOURCE_SIDE, type OutputMimeType, type SocialImageAsset,
  type SocialPackComposition,
} from "./model";
import { formatBytes, getCropLoss, getOverlayFontScale, getResolutionReport, renderPreview, renderVariantBlob, type RenderImage } from "./render";
import {
  assetTotalBytes, createAssetId, loadImage, readImage, socialAssetStorage, storageErrorMessage,
} from "./storage";
import { createProjectFile, readProjectFile, saveBlob } from "./project-file";
import { createZip } from "./zip";

type EditorSnapshot = { composition: SocialPackComposition; assets: SocialImageAsset[] };
type ControlScope = "all" | "variant";
type StoredOutputSize = Record<string, number>;

const inputClass = "h-10 w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
const rangeClass = "h-5 w-full cursor-pointer accent-primary";

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "social-pack";
}

function ratioText(width: number, height: number) {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(width, height);
  const reducedWidth = width / divisor;
  const reducedHeight = height / divisor;
  if (Math.max(reducedWidth, reducedHeight) <= 20) return `${reducedWidth}:${reducedHeight}`;
  return width >= height ? `${(width / height).toFixed(2)}:1` : `1:${(height / width).toFixed(2)}`;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="block min-w-0 space-y-1.5"><span className="flex items-center justify-between gap-2 text-xs font-medium"><span>{label}</span>{hint && <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>}</span>{children}</div>;
}

function ColorField({ label, value, onChange, allowTransparent = false, transparent = false, onTransparentChange }: {
  label: string; value: string; onChange: (value: string) => void; allowTransparent?: boolean; transparent?: boolean; onTransparentChange?: (value: boolean) => void;
}) {
  return <div className="space-y-2">
    {allowTransparent && <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={transparent} onChange={(event) => onTransparentChange?.(event.target.checked)} className="size-4 accent-primary" />Transparent background</label>}
    {!transparent && <div className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-input bg-background px-2">
      <input aria-label={`${label} color picker`} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-7 cursor-pointer rounded border-0 bg-transparent p-0" />
      <input aria-label={`${label} hex value`} value={value} maxLength={7} onChange={(event) => /^#[0-9a-f]{0,6}$/i.test(event.target.value) && event.target.value.length === 7 && onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase outline-none" />
    </div>}
  </div>;
}

function PlacementCard({ placement, selected, active, onToggle, onOpen, source, composition, actualSize }: {
  placement: SocialPlacement; selected: boolean; active: boolean; onToggle: () => void; onOpen: () => void;
  source: SocialImageAsset | null; composition: SocialPackComposition; actualSize?: number;
}) {
  const settings = effectiveSettings(composition, placement.id as PlacementId);
  const format = composition.outputFormat.split("/")[1].toUpperCase();
  const resolution = source ? getResolutionReport(source.width, source.height, placement.width, placement.height, settings.fit) : null;
  const crop = source && settings.fit === "crop" ? getCropLoss(source.width, source.height, placement.width, placement.height) : null;
  const estimateFactor = composition.outputFormat === "image/png" ? 2 : composition.outputFormat === "image/jpeg" ? 0.6 : 0.5;
  const estimate = source ? Math.max(1024, Math.round(source.blob.size * (placement.width * placement.height / (source.width * source.height)) * estimateFactor)) : null;
  const sizeLabel = actualSize === undefined ? estimate === null ? "Add source for size estimate" : `~${formatBytes(estimate)} estimate` : formatBytes(actualSize);
  return <div className={`rounded-[var(--radius-control)] border p-2.5 transition-colors ${active ? "border-primary/70 bg-primary/5 ring-1 ring-primary/20" : "border-border bg-background hover:bg-muted/40"}`}>
    <div className="flex items-start gap-2">
      <input aria-label={`Include ${placement.platform} ${placement.name}`} type="checkbox" checked={selected} onChange={onToggle} className="mt-1 size-4 shrink-0 accent-primary" />
      <button type="button" onClick={onOpen} disabled={!selected} aria-current={active ? "true" : undefined} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
        <span className="flex items-center justify-between gap-2"><span className="truncate text-[11px] font-medium text-muted-foreground">{placement.platform}</span>{active && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Editing</span>}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold">{placement.name}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{placement.width} × {placement.height} · {ratioText(placement.width, placement.height)}</span>
      </button>
    </div>
    {selected && <div className="ml-6 mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
      {!source ? <span className="text-amber-700 dark:text-amber-300">Source needed</span> : resolution?.upscales ? <span className="text-amber-700 dark:text-amber-300">Upscales {resolution.scale.toFixed(2)}×</span> : resolution?.meaningfulDownsample ? <span>Large downsample</span> : <span className="text-emerald-700 dark:text-emerald-300">Ready</span>}
      {crop && crop.percent > 0 && <span>Crops {crop.percent}% {crop.direction}</span>}
      <span>{sizeLabel} · {format}</span>
    </div>}
  </div>;
}

function VariantPreviewTile({ id, source, logo, composition, onOpen }: {
  id: PlacementId; source: RenderImage; logo: RenderImage | null; composition: SocialPackComposition; onOpen: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placement = PLACEMENT_BY_ID[id];
  useEffect(() => {
    if (!canvasRef.current) return;
    const settings = effectiveSettings(composition, id);
    const renderSettings = composition.outputFormat === "image/jpeg" && settings.background === null ? { ...settings, background: "#ffffff" } : settings;
    renderPreview(canvasRef.current, source, id, renderSettings, composition, logo, 480);
  }, [composition, id, logo, source]);
  return <button type="button" onClick={onOpen} className="group min-w-0 overflow-hidden rounded-[var(--radius-control)] border border-border bg-card text-left shadow-[var(--shadow-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:border-primary/50">
    <div className="checkerboard flex max-h-72 min-h-36 items-center justify-center p-3"><canvas ref={canvasRef} aria-hidden="true" className="max-h-64 max-w-full rounded shadow-sm" style={{ aspectRatio: `${placement.width}/${placement.height}`, width: "auto", height: "auto" }} /></div>
    <div className="border-t border-border px-3 py-2"><p className="truncate text-xs font-semibold group-hover:text-primary">{placement.platform} · {placement.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{placement.width} × {placement.height} px · {ratioText(placement.width, placement.height)}</p></div>
  </button>;
}

export function SocialAssetExporterEditor() {
  const [composition, setComposition] = useState(createDefaultComposition);
  const [assets, setAssets] = useState<SocialImageAsset[]>([]);
  const [images, setImages] = useState<Record<string, RenderImage>>({});
  const [activePlacement, setActivePlacement] = useState<PlacementId>("pinterest-standard-pin");
  const [controlScope, setControlScope] = useState<ControlScope>("all");
  const [showGuides, setShowGuides] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showPackPreview, setShowPackPreview] = useState(false);
  const [acceptUpscale, setAcceptUpscale] = useState(false);
  const [recoverable, setRecoverable] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actualSizes, setActualSizes] = useState<StoredOutputSize>({});
  const [exportedCount, setExportedCount] = useState(0);
  const sourcePicker = useRef<HTMLInputElement>(null);
  const logoPicker = useRef<HTMLInputElement>(null);
  const projectPicker = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pastRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const transactionRef = useRef<EditorSnapshot | null>(null);
  const stateRef = useRef<EditorSnapshot>({ composition, assets });
  const hasUserChanges = useRef(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const sourceAsset = assets.find((asset) => asset.id === composition.sourceId) ?? null;
  const logoAsset = assets.find((asset) => asset.id === composition.logoId) ?? null;
  const sourceImage = sourceAsset ? images[sourceAsset.id] ?? null : null;
  const logoImage = logoAsset ? images[logoAsset.id] ?? null : null;
  const selectedIds = composition.selectedPlacementIds;
  const active = PLACEMENT_BY_ID[activePlacement];
  const currentSettings = effectiveSettings(composition, activePlacement);
  const selectedUpscales = selectedIds.filter((id) => {
    if (!sourceAsset) return false;
    const placement = PLACEMENT_BY_ID[id];
    return getResolutionReport(sourceAsset.width, sourceAsset.height, placement.width, placement.height, effectiveSettings(composition, id).fit).upscales;
  });
  const textScaleAdjustments = selectedIds.filter((id) => {
    if (!sourceAsset) return false;
    const placement = PLACEMENT_BY_ID[id];
    const settings = effectiveSettings(composition, id);
    return getOverlayFontScale(settings, composition, placement.width, placement.height, logoImage) < 0.75;
  });
  const allOutputsWithinPixels = selectedIds.every((id) => PLACEMENT_BY_ID[id].width * PLACEMENT_BY_ID[id].height <= MAX_OUTPUT_PIXELS) && selectedIds.reduce((pixels, id) => pixels + PLACEMENT_BY_ID[id].width * PLACEMENT_BY_ID[id].height, 0) <= MAX_PACK_OUTPUT_PIXELS;
  const canExport = Boolean(sourceAsset && sourceImage && (!composition.logoId || logoImage) && selectedIds.length && allOutputsWithinPixels && (!selectedUpscales.length || acceptUpscale) && !busy);
  const ratioDifference = sourceAsset ? Math.abs(sourceAsset.width / sourceAsset.height - active.width / active.height) : 0;
  const recommendedCropLoss = sourceAsset ? getCropLoss(sourceAsset.width, sourceAsset.height, active.width, active.height) : null;

  const applySnapshot = useCallback((snapshot: EditorSnapshot) => {
    stateRef.current = snapshot;
    setComposition(snapshot.composition);
    setAssets(snapshot.assets);
    const assetIds = new Set(snapshot.assets.map((asset) => asset.id));
    setImages((current) => Object.fromEntries(Object.entries(current).filter(([id]) => assetIds.has(id))));
    setActualSizes({});
    setExportedCount(0);
  }, []);

  const updateHistoryState = useCallback(() => {
    setHistoryState({ canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 });
  }, []);

  const commit = useCallback((nextComposition: SocialPackComposition, nextAssets = stateRef.current.assets) => {
    if (nextComposition === stateRef.current.composition && nextAssets === stateRef.current.assets) return;
    hasUserChanges.current = true;
    if (!transactionRef.current) pastRef.current = [...pastRef.current.slice(-39), stateRef.current];
    futureRef.current = [];
    applySnapshot({ composition: nextComposition, assets: nextAssets });
    updateHistoryState();
    setAcceptUpscale(false);
    setError(null);
    setNotice(null);
  }, [applySnapshot, updateHistoryState]);

  const beginTransaction = useCallback(() => {
    if (!transactionRef.current) transactionRef.current = stateRef.current;
  }, []);

  const endTransaction = useCallback(() => {
    const startingSnapshot = transactionRef.current;
    transactionRef.current = null;
    if (!startingSnapshot || (startingSnapshot.composition === stateRef.current.composition && startingSnapshot.assets === stateRef.current.assets)) return;
    pastRef.current = [...pastRef.current.slice(-39), startingSnapshot];
    futureRef.current = [];
    updateHistoryState();
  }, [updateHistoryState]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current = [...futureRef.current.slice(-39), stateRef.current];
    applySnapshot(previous);
    updateHistoryState();
    setAcceptUpscale(false);
  }, [applySnapshot, updateHistoryState]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current = [...pastRef.current.slice(-39), stateRef.current];
    applySnapshot(next);
    updateHistoryState();
    setAcceptUpscale(false);
  }, [applySnapshot, updateHistoryState]);

  useEffect(() => { stateRef.current = { composition, assets }; }, [composition, assets]);

  useEffect(() => {
    let cancelled = false;
    for (const asset of assets) {
      if (images[asset.id]) continue;
      void loadImage(asset.blob).then((image) => {
        if (!cancelled) setImages((current) => ({ ...current, [asset.id]: { image, width: image.naturalWidth, height: image.naturalHeight } }));
      }).catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : "An image could not be opened."));
    }
    return () => { cancelled = true; };
  }, [assets, images]);

  useEffect(() => {
    let activeEffect = true;
    void socialAssetStorage.getDraft().then(async (draft) => {
      if (!activeEffect || !draft || hasUserChanges.current || stateRef.current.composition.sourceId) {
        if (activeEffect) setStorageReady(true);
        return;
      }
      const loaded = await Promise.all(draft.assets.map(async (asset) => ({ asset, image: await loadImage(asset.blob) })));
      if (!activeEffect) return;
      applySnapshot({ composition: draft.composition, assets: draft.assets });
      setImages(Object.fromEntries(loaded.map(({ asset, image }) => [asset.id, { image, width: image.naturalWidth, height: image.naturalHeight }])));
      setRecoverable(true);
      setNotice("Recovered your last local pack.");
      setStorageReady(true);
    }).catch(() => { if (activeEffect) { setNotice("Local recovery is unavailable in this browser."); setStorageReady(true); } });
    return () => { activeEffect = false; };
    // Restore once on mount; state changes are saved by the separate effect.
  }, [applySnapshot]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => {
      void socialAssetStorage.saveDraft({ key: "active", composition, assets, updatedAt: Date.now() }).then(() => setRecoverable(true)).catch((cause) => setNotice(storageErrorMessage(cause, "Could not save a local recovery copy.")));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [composition, assets, storageReady]);

  useEffect(() => {
    if (!canvasRef.current || !sourceImage) return;
    let errorFrame = 0;
    try {
      const renderSettings = composition.outputFormat === "image/jpeg" && currentSettings.background === null
        ? { ...currentSettings, background: "#ffffff" }
        : currentSettings;
      renderPreview(canvasRef.current, sourceImage, activePlacement, renderSettings, composition, logoImage);
      if (showGuides) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.lineWidth = Math.max(1, canvas.width / 900);
          ctx.setLineDash([canvas.width / 120, canvas.width / 180]);
          const inset = composition.brand.safeInset / 100;
          ctx.strokeRect(canvas.width * inset, canvas.height * inset, canvas.width * (1 - inset * 2), canvas.height * (1 - inset * 2));
          ctx.restore();
        }
      }
    } catch (cause) {
      errorFrame = window.requestAnimationFrame(() => setError(cause instanceof Error ? cause.message : "The preview could not be rendered."));
    }
    return () => { if (errorFrame) window.cancelAnimationFrame(errorFrame); };
  }, [activePlacement, composition, currentSettings, logoImage, showGuides, sourceImage]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); undo(); }
      else if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) { event.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const updateField = useCallback((field: keyof SocialPackComposition, value: unknown) => {
    commit({ ...stateRef.current.composition, [field]: value } as SocialPackComposition);
  }, [commit]);

  const updateSharedSetting = useCallback((key: "fit" | "focalX" | "focalY" | "background", value: unknown) => {
    const current = stateRef.current.composition;
    if (controlScope === "all") commit({ ...current, shared: { ...current.shared, [key]: value } });
    else {
      const previous = current.overrides[activePlacement] ?? {};
      commit({ ...current, overrides: { ...current.overrides, [activePlacement]: { ...previous, [key]: value } } });
    }
  }, [activePlacement, commit, controlScope]);

  const updateText = useCallback((key: "headline" | "caption", value: string) => {
    const current = stateRef.current.composition;
    if (controlScope === "all") commit({ ...current, [key]: value });
    else {
      const previous = current.overrides[activePlacement] ?? {};
      commit({ ...current, overrides: { ...current.overrides, [activePlacement]: { ...previous, [key]: value } } });
    }
  }, [activePlacement, commit, controlScope]);

  const onSourceFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError(null);
    if (!isSupportedMimeType(file.type)) return setError("Choose a PNG, JPEG, or WebP image.");
    if (!file.size || file.size > MAX_SOURCE_BYTES) return setError("The master image must be 40 MB or smaller.");
    setBusy("Loading image…");
    try {
      const dimensions = await readImage(file);
      if (dimensions.width > MAX_SOURCE_SIDE || dimensions.height > MAX_SOURCE_SIDE || dimensions.width * dimensions.height > MAX_SOURCE_PIXELS) throw new Error("This image is larger than 16,000 px per side or 32 megapixels. Choose a smaller source image.");
      const asset: SocialImageAsset = { id: createAssetId(), name: file.name.slice(0, 255), mimeType: file.type, ...dimensions, blob: file, updatedAt: Date.now() };
      const current = stateRef.current;
      const nextAssets = [...current.assets.filter((item) => item.id === current.composition.logoId), asset];
      commit({ ...current.composition, sourceId: asset.id }, nextAssets);
      setActivePlacement(current.composition.selectedPlacementIds[0] ?? "pinterest-standard-pin");
      setNotice("Master image added. Every placement will render from this original.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This image could not be opened."); }
    finally { setBusy(null); }
  }, [commit]);

  const onLogoFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!isSupportedMimeType(file.type)) return setError("Choose a PNG, JPEG, or WebP logo image.");
    if (!file.size || file.size > MAX_LOGO_BYTES) return setError("The logo image must be 10 MB or smaller.");
    try {
      const dimensions = await readImage(file);
      if (dimensions.width > MAX_SOURCE_SIDE || dimensions.height > MAX_SOURCE_SIDE || dimensions.width * dimensions.height > MAX_SOURCE_PIXELS) throw new Error("This logo is larger than the image limit.");
      const asset: SocialImageAsset = { id: createAssetId(), name: file.name.slice(0, 255), mimeType: file.type, ...dimensions, blob: file, updatedAt: Date.now() };
      const current = stateRef.current;
      commit({ ...current.composition, logoId: asset.id }, [...current.assets.filter((item) => item.id === current.composition.sourceId), asset]);
      setNotice("Logo added to the shared brand overlay.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This logo could not be opened."); }
  }, [commit]);

  const onProjectFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setBusy("Opening project…");
    setError(null);
    try {
      const project = await readProjectFile(file);
      commit(project.composition, project.assets);
      setActivePlacement(project.composition.selectedPlacementIds[0]);
      setNotice("Project opened. Its source images remain local to this device.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This project could not be opened."); }
    finally { setBusy(null); }
  }, [commit]);

  const togglePlacement = useCallback((id: PlacementId) => {
    const current = stateRef.current.composition;
    const selected = current.selectedPlacementIds.includes(id);
    if (selected && current.selectedPlacementIds.length <= 1) return setError("Keep at least one placement in the pack.");
    if (!selected && current.selectedPlacementIds.length >= MAX_PACK_OUTPUTS) return setError("The first release supports up to four placements in one pack.");
    const next = selected ? current.selectedPlacementIds.filter((placementId) => placementId !== id) : [...current.selectedPlacementIds, id];
    commit({ ...current, selectedPlacementIds: next });
    if (!next.includes(activePlacement)) setActivePlacement(next[0]);
  }, [activePlacement, commit]);

  async function exportPack() {
    const current = stateRef.current;
    const source = current.assets.find((asset) => asset.id === current.composition.sourceId);
    if (!source) return setError("Add a master image before exporting the pack.");
    if (selectedUpscales.length && !acceptUpscale) return setError("Review the source upscaling warning and confirm before exporting.");
    const loadedSource = images[source.id];
    if (!loadedSource) return setError("The master image is still loading. Try export again in a moment.");
    const loadedLogo = current.composition.logoId ? images[current.composition.logoId] ?? null : null;
    if (current.composition.logoId && !loadedLogo) return setError("The brand logo is still loading. Try export again in a moment.");
    setBusy("Preparing image pack…");
    setError(null);
    setNotice(null);
    setActualSizes({});
    try {
      const outputs = [];
      const sizeMap: StoredOutputSize = {};
      for (const id of current.composition.selectedPlacementIds) {
        const placement = PLACEMENT_BY_ID[id];
        const settings = effectiveSettings(current.composition, id);
        const renderSettings = current.composition.outputFormat === "image/jpeg" && settings.background === null ? { ...settings, background: "#ffffff" } : settings;
        const rendered = await renderVariantBlob(source, loadedSource, id, renderSettings, current.composition, loadedLogo, current.composition.outputFormat, current.composition.quality);
        const extension = current.composition.outputFormat === "image/jpeg" ? "jpg" : current.composition.outputFormat.split("/")[1];
        const base = slugify(current.composition.packName);
        outputs.push({ path: `${placement.platform}/${placement.folder}/${base}__${id}.${extension}`, blob: rendered.blob });
        sizeMap[id] = rendered.blob.size;
        setBusy(`Rendered ${outputs.length} of ${current.composition.selectedPlacementIds.length}…`);
      }
      const archive = await createZip(outputs);
      saveBlob(archive, `${slugify(current.composition.packName)}-social-assets.zip`);
      setActualSizes(sizeMap);
      setExportedCount(outputs.length);
      setNotice(`Downloaded ${outputs.length} image${outputs.length === 1 ? "" : "s"} in a ${formatBytes(archive.size)} ZIP. Images were rendered directly from the master file.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The image pack could not be exported. Your work is still here."); }
    finally { setBusy(null); }
  }

  const saveProject = useCallback(async () => {
    const current = stateRef.current;
    setBusy("Saving project…");
    setError(null);
    try {
      const blob = await createProjectFile(current.composition, current.assets);
      saveBlob(blob, `${slugify(current.composition.packName)}.socialpack`);
      setNotice(`Saved a ${formatBytes(blob.size)} project file with its source image and settings.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The project file could not be saved."); }
    finally { setBusy(null); }
  }, []);

  const resetPack = useCallback(() => {
    const fresh = createDefaultComposition();
    hasUserChanges.current = true;
    pastRef.current = [...pastRef.current.slice(-39), stateRef.current];
    futureRef.current = [];
    applySnapshot({ composition: fresh, assets: [] });
    setImages({});
    setActivePlacement(fresh.selectedPlacementIds[0]);
    updateHistoryState();
    setAcceptUpscale(false);
    setNotice("Started a new pack.");
    setError(null);
  }, [applySnapshot, updateHistoryState]);

  const resetActiveOverrides = useCallback(() => {
    const overrides = { ...stateRef.current.composition.overrides };
    delete overrides[activePlacement];
    commit({ ...stateRef.current.composition, overrides });
    setNotice(`Removed ${active.name} overrides. It now uses shared settings.`);
  }, [active.name, activePlacement, commit]);

  const formatOptions = useMemo(() => [
    { value: "image/png" as const, label: "PNG · lossless" },
    { value: "image/jpeg" as const, label: "JPEG · lossy" },
    { value: "image/webp" as const, label: "WebP · lossy" },
  ], []);

  const detailsPanel = !presentationMode && <aside className="space-y-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-3" aria-label="Pack overview and settings">
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Pack overview</h2>
        <span className="text-xs text-muted-foreground">{selectedIds.length} of {MAX_PACK_OUTPUTS} selected</span>
      </div>
      <div className="space-y-2">
        {SOCIAL_PLACEMENTS.map((placement) => <PlacementCard key={placement.id} placement={placement} selected={selectedIds.includes(placement.id as PlacementId)} active={activePlacement === placement.id} onToggle={() => togglePlacement(placement.id as PlacementId)} onOpen={() => setActivePlacement(placement.id as PlacementId)} source={sourceAsset} composition={composition} actualSize={actualSizes[placement.id]} />)}
      </div>
    </section>

    <section className="rounded-[var(--radius-card)] border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-start justify-between gap-2"><div><h2 className="text-sm font-semibold">{active.name}</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{active.platform} · {active.width} × {active.height} px · {ratioText(active.width, active.height)}</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{active.sourceNote}</p></div><a href={active.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] text-muted-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring">Spec source</a></div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-muted p-1" aria-label="Apply control changes to">
        <button type="button" aria-pressed={controlScope === "all"} onClick={() => setControlScope("all")} className={`min-h-9 rounded-lg px-2 text-xs font-medium ${controlScope === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Shared defaults</button>
        <button type="button" aria-pressed={controlScope === "variant"} onClick={() => setControlScope("variant")} className={`min-h-9 rounded-lg px-2 text-xs font-medium ${controlScope === "variant" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Only this size</button>
      </div>
      <div className="space-y-3">
        <Field label="Image layout" hint={currentSettings.fit === "fit" ? "Whole image" : "Cropped to fill"}>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={currentSettings.fit === "fit" ? "default" : "outline"} className="h-10" aria-pressed={currentSettings.fit === "fit"} onClick={() => updateSharedSetting("fit", "fit")}><Maximize2 className="mr-1.5 size-3.5" />Fit</Button>
            <Button type="button" variant={currentSettings.fit === "crop" ? "default" : "outline"} className="h-10" aria-pressed={currentSettings.fit === "crop"} onClick={() => updateSharedSetting("fit", "crop")}><Crop className="mr-1.5 size-3.5" />Crop</Button>
          </div>
        </Field>
        {currentSettings.fit === "crop" && <div className="space-y-2 rounded-lg bg-muted/60 p-2.5">
          <p className="text-[11px] text-muted-foreground">Adjust the focal point. The crop uses the master image directly.</p>
          <Field label="Focal position · horizontal" hint={`${Math.round(currentSettings.focalX * 100)}%`}><input aria-label="Focal position horizontal" type="range" min="0" max="1" step="0.01" value={currentSettings.focalX} onPointerDown={beginTransaction} onPointerUp={endTransaction} onKeyDown={(event) => event.key.startsWith("Arrow") && beginTransaction()} onKeyUp={endTransaction} onBlur={endTransaction} onChange={(event) => updateSharedSetting("focalX", Number(event.target.value))} className={rangeClass} /><input aria-label="Focal position horizontal percent" className={`${inputClass} mt-1 h-9`} type="number" min="0" max="100" value={Math.round(currentSettings.focalX * 100)} onFocus={beginTransaction} onBlur={endTransaction} onChange={(event) => updateSharedSetting("focalX", Math.max(0, Math.min(100, Number(event.target.value))) / 100)} /></Field>
          <Field label="Focal position · vertical" hint={`${Math.round(currentSettings.focalY * 100)}%`}><input aria-label="Focal position vertical" type="range" min="0" max="1" step="0.01" value={currentSettings.focalY} onPointerDown={beginTransaction} onPointerUp={endTransaction} onKeyDown={(event) => event.key.startsWith("Arrow") && beginTransaction()} onKeyUp={endTransaction} onBlur={endTransaction} onChange={(event) => updateSharedSetting("focalY", Number(event.target.value))} className={rangeClass} /><input aria-label="Focal position vertical percent" className={`${inputClass} mt-1 h-9`} type="number" min="0" max="100" value={Math.round(currentSettings.focalY * 100)} onFocus={beginTransaction} onBlur={endTransaction} onChange={(event) => updateSharedSetting("focalY", Math.max(0, Math.min(100, Number(event.target.value))) / 100)} /></Field>
        </div>}
        {sourceAsset && <div className="rounded-lg border border-border bg-muted/30 p-2.5">
          <div className="flex items-start gap-2"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" /><div className="text-[11px] leading-relaxed text-muted-foreground">
            {ratioDifference < 0.04 ? <p>Ratios are close. Crop fills this placement with little trimming.</p> : <p>Fit keeps the full image. Crop would remove about {recommendedCropLoss?.percent}% of its {recommendedCropLoss?.direction}.</p>}
            {currentSettings.fit === "crop" && recommendedCropLoss && recommendedCropLoss.percent > 0 && <p className="mt-1 font-medium text-amber-700 dark:text-amber-300">Current crop removes about {recommendedCropLoss.percent}% of the source {recommendedCropLoss.direction}.</p>}
          </div></div>
        </div>}
        <Field label="Background" hint={composition.outputFormat === "image/jpeg" && currentSettings.background === null ? "JPEG uses white" : undefined}>
          <ColorField label="Background" value={currentSettings.background ?? "#ffffff"} onChange={(color) => updateSharedSetting("background", color)} allowTransparent transparent={currentSettings.background === null} onTransparentChange={(transparent) => updateSharedSetting("background", transparent ? null : "#ffffff")} />
        </Field>
        <details className="social-details group border-t border-border pt-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-1 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"><span>Shared overlay <span className="ml-1 font-normal text-muted-foreground">Optional text and brand</span></span><ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
          <div className="mt-2 space-y-2">
          <Field label="Headline"><input aria-label="Pack headline" className={inputClass} maxLength={120} value={currentSettings.headline} onFocus={beginTransaction} onBlur={endTransaction} onChange={(event) => updateText("headline", event.target.value)} placeholder="Optional headline" /></Field>
          <Field label="Caption"><textarea aria-label="Pack caption" className={`${inputClass} mt-2 min-h-18 py-2`} maxLength={240} value={currentSettings.caption} onFocus={beginTransaction} onBlur={endTransaction} onChange={(event) => updateText("caption", event.target.value)} placeholder="Optional caption" /></Field>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field label="Typeface"><select aria-label="Brand typeface" className={inputClass} value={composition.brand.font} onChange={(event) => updateField("brand", { ...composition.brand, font: event.target.value })}><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select></Field>
            <Field label="Text position"><select aria-label="Brand text position" className={inputClass} value={composition.brand.textAnchor} onChange={(event) => updateField("brand", { ...composition.brand, textAnchor: event.target.value })}><option value="bottom">Bottom</option><option value="top">Top</option></select></Field>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field label="Text color"><ColorField label="Text color" value={composition.brand.textColor} onChange={(textColor) => updateField("brand", { ...composition.brand, textColor })} /></Field>
            <Field label="Accent"><ColorField label="Brand accent" value={composition.brand.accentColor} onChange={(accentColor) => updateField("brand", { ...composition.brand, accentColor })} /></Field>
          </div>
          <Field label="Safe inset" hint={`${composition.brand.safeInset}%`}><input aria-label="Overlay safe inset percent" className={rangeClass} type="range" min="4" max="14" value={composition.brand.safeInset} onPointerDown={beginTransaction} onPointerUp={endTransaction} onKeyDown={(event) => event.key.startsWith("Arrow") && beginTransaction()} onKeyUp={endTransaction} onBlur={endTransaction} onChange={(event) => updateField("brand", { ...composition.brand, safeInset: Number(event.target.value) })} /></Field>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => logoPicker.current?.click()}><ImagePlus className="mr-1.5 size-3.5" />{logoAsset ? "Replace logo" : "Add logo"}</Button>
            {logoAsset && <Button type="button" size="sm" variant="ghost" onClick={() => {
              const current = stateRef.current;
              commit({ ...current.composition, logoId: null }, current.assets.filter((asset) => asset.id !== current.composition.logoId));
            }}>Remove logo</Button>}
            {controlScope === "variant" && composition.overrides[activePlacement] && <Button type="button" size="sm" variant="ghost" onClick={resetActiveOverrides}><RotateCcw className="mr-1 size-3" />Reset this size</Button>}
          </div>
          {logoAsset && <Field label="Logo width" hint={`${composition.brand.logoScale}% of output`}><input aria-label="Logo width percentage" className={rangeClass} type="range" min="6" max="24" value={composition.brand.logoScale} onPointerDown={beginTransaction} onPointerUp={endTransaction} onKeyDown={(event) => event.key.startsWith("Arrow") && beginTransaction()} onKeyUp={endTransaction} onBlur={endTransaction} onChange={(event) => updateField("brand", { ...composition.brand, logoScale: Number(event.target.value) })} /></Field>}
          </div>
        </details>
        <details className="social-details group border-t border-border pt-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-1 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"><span>Export format <span className="ml-1 font-normal text-muted-foreground">{composition.outputFormat.split("/")[1].toUpperCase()}</span></span><ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
          <div className="mt-2 space-y-2">
          <Field label="Image format"><select aria-label="Image output format" className={inputClass} value={composition.outputFormat} onChange={(event) => updateField("outputFormat", event.target.value as OutputMimeType)}>{formatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          {composition.outputFormat !== "image/png" && <>
            <Field label="Quality" hint={`${Math.round(composition.quality * 100)}%`}><input aria-label="Lossy image quality" type="range" min="0.8" max="1" step="0.01" value={composition.quality} onPointerDown={beginTransaction} onPointerUp={endTransaction} onKeyDown={(event) => event.key.startsWith("Arrow") && beginTransaction()} onKeyUp={endTransaction} onBlur={endTransaction} onChange={(event) => updateField("quality", Number(event.target.value))} className={rangeClass} /></Field>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Lossy conversion changes image data. Quality starts at the browser encoder maximum. No size target is applied.</p>
          </>}
          {composition.outputFormat === "image/jpeg" && <p className="mt-1 text-[10px] text-muted-foreground">JPEG cannot keep transparency; transparent areas export with a white background.</p>}
          </div>
        </details>
      </div>
    </section>
  </aside>;

  const targetChecker = <div className="flex flex-wrap gap-2" role="group" aria-label="Output variants">
    {selectedIds.map((id) => {
      const item = PLACEMENT_BY_ID[id];
      return <button key={id} type="button" aria-current={activePlacement === id ? "true" : undefined} onClick={() => setActivePlacement(id)} className={`flex min-h-11 min-w-20 flex-col items-center justify-center rounded-[var(--radius-control)] border px-3 py-1.5 text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${activePlacement === id ? "border-primary bg-primary/8 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
        <span className="font-semibold">{item.platform}</span><span>{item.width} × {item.height}</span>
      </button>;
    })}
  </div>;

  const safeGuides = showGuides && sourceImage ? `${composition.brand.safeInset}% inset guide on preview only` : "Preview guides off";
  const statusColor = error ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-foreground";

  return <div className="min-h-screen bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
    <AppHeader showToolsLink />
    <input ref={sourcePicker} type="file" accept="image/png,image/jpeg,image/webp" onChange={onSourceFile} className="sr-only" aria-label="Choose master image" />
    <input ref={logoPicker} type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogoFile} className="sr-only" aria-label="Choose brand logo" />
    <input ref={projectPicker} type="file" accept=".socialpack,application/json" onChange={onProjectFile} className="sr-only" aria-label="Open Social Asset Exporter project" />
    <main className="mx-auto max-w-[1600px] px-3 pb-20 pt-4 sm:px-5 lg:px-6 lg:pb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/" className="mb-2 inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-control)] text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"><ArrowLeft className="size-3.5" />All tools</Link>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Image tools</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input aria-label="Pack name" value={composition.packName} maxLength={120} onFocus={beginTransaction} onBlur={(event) => { if (!event.currentTarget.value.trim()) updateField("packName", "Social asset pack"); endTransaction(); }} onChange={(event) => updateField("packName", event.target.value)} className="min-w-0 max-w-full border-0 bg-transparent p-0 text-xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-2xl" />
            <span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">{selectedIds.length} placements</span>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">Turn one master image into a reviewed set for social placements.</p>
        </div>
      <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <Button type="button" variant="outline" onClick={resetPack}><RotateCcw className="mr-1.5 size-4" />New pack</Button>
          <Button type="button" variant="outline" onClick={() => projectPicker.current?.click()}><FileUp className="mr-1.5 size-4" />Open project</Button>
          <Button type="button" variant="outline" onClick={saveProject}><FileDown className="mr-1.5 size-4" />Save project</Button>
          <Button type="button" variant="outline" size="icon" aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" disabled={!historyState.canUndo} onClick={undo}><Undo2 /></Button>
          <Button type="button" variant="outline" size="icon" aria-label="Redo" title="Redo (Ctrl/Cmd+Shift+Z)" disabled={!historyState.canRedo} onClick={redo}><Redo2 /></Button>
          <Button type="button" variant="outline" onClick={() => setPresentationMode((value) => !value)} aria-pressed={presentationMode}>{presentationMode ? <EyeOff className="mr-1.5 size-4" /> : <Eye className="mr-1.5 size-4" />}{presentationMode ? "Show controls" : "Preview only"}</Button>
          <Button type="button" onClick={exportPack} disabled={!canExport} aria-label="Download selected social assets as a ZIP"><ArrowDownToLine className="mr-1.5 size-4" />Download set</Button>
        </div>
      </div>

      <div className={`grid items-start gap-3 ${presentationMode ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]"}`}>
        <section className="order-1 min-w-0" aria-label="Output preview">
          <div className="rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
              <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold">{active.platform} · {active.name}</h2>{presentationMode && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Preview</span>}</div><p className="mt-0.5 text-[11px] text-muted-foreground">{sourceAsset ? `${sourceAsset.width} × ${sourceAsset.height} master` : "Add a master image to preview the set"} · {safeGuides}</p></div>
              <div className="flex flex-wrap justify-end gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => setShowGuides((value) => !value)} aria-pressed={showGuides}>{showGuides ? "Hide guides" : "Show guides"}</Button>
                <Button type="button" size="sm" variant="outline" className="min-h-10" aria-pressed={showPackPreview} onClick={() => setShowPackPreview((value) => !value)}>{showPackPreview ? "Single size" : "Pack preview"}</Button>
                <Button type="button" size="sm" variant="outline" className="min-h-10" aria-pressed={presentationMode} onClick={() => setPresentationMode((value) => !value)}>{presentationMode ? <EyeOff className="mr-1.5 size-3.5" /> : <Eye className="mr-1.5 size-3.5" />}{presentationMode ? "Show controls" : "Preview only"}</Button>
              </div>
            </div>
            <div className="checkerboard flex min-h-[310px] items-center justify-center p-3 sm:min-h-[390px] sm:p-5 lg:min-h-[min(58vh,650px)]">
              {sourceImage ? <canvas ref={canvasRef} aria-label={`${active.platform} ${active.name} image preview`} role="img" className="max-h-[min(64vh,680px)] max-w-full rounded-sm shadow-[var(--shadow-control)]" style={{ aspectRatio: `${active.width}/${active.height}`, height: "auto", width: "auto", maxWidth: "100%" }} /> : sourceAsset ? <div role="status" className="flex w-full max-w-lg items-center justify-center gap-2 rounded-[var(--radius-card)] border border-border bg-background/85 px-5 py-10 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading preview from {sourceAsset.name}…</div> : <div className="flex w-full max-w-lg flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border bg-background/85 px-5 py-10 text-center sm:py-14">
                <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ImagePlus className="size-6" /></span>
                <h3 className="text-base font-semibold">Start with a master image</h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Choose one high-resolution design. Each placement will render directly from that original image.</p>
                <Button type="button" className="mt-4 min-h-11" onClick={() => sourcePicker.current?.click()}><Upload className="mr-1.5 size-4" />Add master image</Button>
                <p className="mt-2 text-[10px] text-muted-foreground">PNG, JPEG, or WebP · up to 40 MB · stays on this device</p>
              </div>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5 sm:px-4">
              {targetChecker}
              <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                {sourceImage && <Button type="button" variant="outline" size="sm" onClick={() => sourcePicker.current?.click()}><Upload className="mr-1 size-3.5" />{sourceAsset?.name ? "Replace master" : "Add master"}</Button>}
                <span className="hidden sm:inline">{active.width} × {active.height} px · {ratioText(active.width, active.height)}</span>
              </div>
            </div>
          </div>

          {showPackPreview && <section className="mt-3 rounded-[var(--radius-card)] border border-border bg-card p-3 shadow-[var(--shadow-card)]" aria-label="Whole pack preview">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Whole pack</h3><p className="text-[11px] text-muted-foreground">Each preview is rendered from the master image.</p></div><span className="text-[11px] text-muted-foreground">{selectedIds.length} outputs</span></div>
            {sourceImage ? <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">{selectedIds.map((id) => <VariantPreviewTile key={id} id={id} source={sourceImage} logo={logoImage} composition={composition} onOpen={() => { setActivePlacement(id); setShowPackPreview(false); }} />)}</div> : <p className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">Add the master image to preview this pack.</p>}
          </section>}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {sourceAsset ? <div className="rounded-[var(--radius-control)] border border-border bg-card px-3 py-2.5">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-semibold">{sourceAsset.name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Master · {sourceAsset.width} × {sourceAsset.height} px · {formatBytes(sourceAsset.blob.size)}</p></div><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Master image ready" /></div>
              {assetTotalBytes(assets) > MAX_PROJECT_ASSET_BYTES * 0.8 && <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">Project images approach the 50 MB portable project limit.</p>}
            </div> : <div className="rounded-[var(--radius-control)] border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">No master image selected.</div>}
            <div className="rounded-[var(--radius-control)] border border-border bg-card px-3 py-2.5">
              <p className="text-xs font-semibold">Preview and export</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">Lossless PNG can preserve rendered pixels. Resize, crop, overlays and lossy conversion change image data. Export renders each size from the master image.</p>
            </div>
          </div>
        </section>

        {!presentationMode && <div className="order-3 min-w-0">{detailsPanel}</div>}
      </div>

      {!presentationMode && <section className="mt-3 rounded-[var(--radius-card)] border border-border bg-card p-3" aria-label="Pack status and quality checks">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Before you download</h2>
            {!sourceAsset ? <p className="mt-1 text-xs text-muted-foreground">Add a master image to check the selected placements.</p> : <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              {selectedIds.map((id) => {
                const placement = PLACEMENT_BY_ID[id];
                const report = getResolutionReport(sourceAsset.width, sourceAsset.height, placement.width, placement.height, effectiveSettings(composition, id).fit);
                return <span key={id} className={`rounded-full border px-2 py-1 ${report.upscales ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200" : "border-border bg-muted/50 text-muted-foreground"}`}>
                  {report.upscales ? `Upscaling at ${placement.name}: ${report.scale.toFixed(2)}×` : report.meaningfulDownsample ? `Large downsample at ${placement.name}` : `Source resolution OK · ${placement.name}`}
                </span>;
              })}
            </div>}
            {selectedUpscales.length > 0 && sourceAsset && <label className="mt-3 flex min-h-10 max-w-3xl items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs"><input type="checkbox" checked={acceptUpscale} onChange={(event) => setAcceptUpscale(event.target.checked)} className="size-4 accent-primary" />I understand the source will be enlarged for {selectedUpscales.length} selected {selectedUpscales.length === 1 ? "placement" : "placements"}. Keep the resolution warning in the pack.</label>}
            {textScaleAdjustments.length > 0 && <p className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">Overlay text will be reduced to fit without clipping on: {textScaleAdjustments.map((id) => PLACEMENT_BY_ID[id].name).join(", ")}.</p>}
            {sourceAsset && <p className="mt-2 text-[10px] text-muted-foreground">Size estimates use the source byte/pixel ratio; image detail and browser encoding change the actual size.</p>}
          </div>
          <p className="max-w-xs text-[10px] leading-relaxed text-muted-foreground">Catalog specs verified {SPEC_VERIFIED_ON}. These recommended dimensions do not indicate platform acceptance.</p>
        </div>
      </section>}

      {error && <div role="alert" className={`mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border px-3 py-2.5 text-xs ${statusColor}`}><CircleAlert className="mt-0.5 size-4 shrink-0" /><p>{error}</p></div>}
      {notice && !error && <div role="status" className={`mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border px-3 py-2.5 text-xs ${statusColor}`}><Check className="mt-0.5 size-4 shrink-0" /><p>{notice}{recoverable && <span className="ml-1 text-muted-foreground">A recovery copy is saved in this browser.</span>}</p></div>}
      {busy && <div role="status" aria-live="polite" className="mt-3 flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{busy}</div>}

    {!presentationMode && <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => projectPicker.current?.click()}><FileUp className="mr-1.5 size-4" />Open project</Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={saveProject}><FileDown className="mr-1.5 size-4" />Save project</Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={undo} disabled={!historyState.canUndo}><Undo2 className="mr-1.5 size-4" />Undo</Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={redo} disabled={!historyState.canRedo}><Redo2 className="mr-1.5 size-4" />Redo</Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={resetPack}><RotateCcw className="mr-1.5 size-4" />New pack</Button>
      </div>}
      <p className="mt-3 text-[10px] text-muted-foreground">Local files only. No account, upload or social posting. {exportedCount > 0 ? `${exportedCount} outputs are ready in your last ZIP.` : "Download a project file to keep a portable copy."}</p>
    </main>

    {!presentationMode && <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg gap-2">
        <Button type="button" variant="outline" className="min-h-11" aria-label="Undo" title="Undo" disabled={!historyState.canUndo} onClick={undo}><Undo2 /></Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setPresentationMode(true)}><Eye className="mr-1 size-4" />Preview</Button>
        <Button type="button" className="min-h-11 flex-1" disabled={!canExport} onClick={exportPack}><ArrowDownToLine className="mr-1.5 size-4" />Download {selectedIds.length} sizes</Button>
      </div>
    </div>}
  </div>;
}
