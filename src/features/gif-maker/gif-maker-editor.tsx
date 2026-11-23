"use client";

import Image from "next/image";
import {
  Download,
  FileImage,
  FileVideo,
  GripVertical,
  Images,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import type { DragEndEvent } from "@dnd-kit/react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_GIF_SETTINGS,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_FRAMES,
  MAX_IMAGE_PIXELS,
  MAX_OUTPUT_DIMENSION,
  MAX_SEQUENCE_PIXELS,
  MAX_TOTAL_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_CLIP_SECONDS,
  MAX_VIDEO_FPS,
  MIN_FRAME_DURATION,
  MIN_IMAGE_FRAMES,
  MIN_VIDEO_FPS,
  getOutputDimensions,
  getVideoFrameCount,
  getVideoFrameDelay,
  formatBytes,
  formatTime,
  isSupportedImageFile,
  isSupportedVideoFile,
  type Dimensions,
  type GifAspect,
  type GifFit,
  type GifMode,
  type GifSettings,
} from "./model";
import type React from "react";
import { createFrameCanvas, drawMediaFrame } from "./render";
import { createGifEncoderSession, type GifEncoderSession } from "./encoder";
import { loadExportVideo, loadImage, readVideoMetadata, seekVideoFrame } from "./media";

type VideoSource = {
  file: File;
  url: string;
  width: number;
  height: number;
  duration: number;
};

type ImageFrame = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  image: HTMLImageElement;
};

type GeneratedGif = { url: string; size: number; dimensions: Dimensions; frames: number };
type ActiveExport = { controller: AbortController; session: GifEncoderSession | null };

const selectClassName = "h-9 w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const fieldClassName = "block space-y-1.5 text-sm";
const labelClassName = "block text-xs font-medium text-foreground";
const rangeClassName = "h-5 w-full cursor-pointer accent-primary";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={fieldClassName}>
      <span className="flex items-center justify-between gap-2">
        <span className={labelClassName}>{label}</span>
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return minutes > 0 ? `${minutes}:${remaining.toFixed(1).padStart(4, "0")}` : `${remaining.toFixed(1)}s`;
}

function safeFileBase(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  return base || "gif-maker";
}

function SortableImageFrameRow({
  image,
  index,
  count,
  disabled,
  onMoveTo,
}: {
  image: ImageFrame;
  index: number;
  count: number;
  disabled: boolean;
  onMoveTo: (position: number) => void;
}) {
  const { ref: setSortableRef, handleRef: setHandleRef, isDragging } = useSortable({ id: image.id, index, disabled });

  return (
    <div
      ref={setSortableRef}
      role="listitem"
      aria-posinset={index + 1}
      aria-setsize={count}
      className={`flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-background p-2 transition-[opacity,border-color,box-shadow] ${isDragging ? "border-primary/70 opacity-60 shadow-[var(--shadow-control)]" : ""}`}
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded border border-border bg-white">
        <Image src={image.url} alt="" fill unoptimized className="object-contain" sizes="40px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{index + 1}. {image.file.name}</p>
        <p className="text-[11px] text-muted-foreground">{image.width} × {image.height}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          ref={setHandleRef}
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 touch-none"
          aria-label={`Drag to reorder ${image.file.name}`}
          title="Drag to reorder"
          disabled={disabled}
          style={{ touchAction: "none" }}
        >
          <GripVertical aria-hidden="true" />
        </Button>
        <select
          aria-label={`Move ${image.file.name} to position`}
          title="Move to position"
          value={index}
          onChange={(event) => onMoveTo(Number(event.currentTarget.value))}
          disabled={disabled}
          className="h-10 w-16 rounded-[var(--radius-control)] border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {Array.from({ length: count }, (_, position) => (
            <option key={position} value={position}>{position + 1}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function createAbortMessage(error: unknown) {
  return error instanceof Error ? error.message : "GIF creation failed. Try again with a shorter clip or fewer images.";
}

export function GifMakerEditor() {
  const [mode, setMode] = useState<GifMode>("video");
  const [video, setVideo] = useState<VideoSource | null>(null);
  const [images, setImages] = useState<ImageFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [settings, setSettings] = useState<GifSettings>(DEFAULT_GIF_SETTINGS);
  const [generated, setGenerated] = useState<GeneratedGif | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparingSources, setPreparingSources] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const ownedSourceUrls = useRef(new Set<string>());
  const activeExport = useRef<ActiveExport | null>(null);

  const clearGenerated = useCallback(() => {
    setGenerated(null);
    setStatus("");
  }, []);

  useEffect(() => {
    const url = generated?.url;
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [generated?.url]);

  useEffect(() => () => {
    activeExport.current?.controller.abort();
    activeExport.current?.session?.cancel();
    for (const url of ownedSourceUrls.current) URL.revokeObjectURL(url);
    ownedSourceUrls.current.clear();
  }, []);

  const trackUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    ownedSourceUrls.current.add(url);
    return url;
  }, []);

  const releaseUrl = useCallback((url: string) => {
    if (!ownedSourceUrls.current.has(url)) return;
    URL.revokeObjectURL(url);
    ownedSourceUrls.current.delete(url);
  }, []);

  const updateSettings = useCallback((change: Partial<GifSettings>) => {
    setSettings((current) => ({ ...current, ...change }));
    clearGenerated();
    setError(null);
  }, [clearGenerated]);

  const onModeChange = useCallback((value: string | null) => {
    if (value !== "video" && value !== "images") return;
    setMode(value);
    setError(null);
    setNotice(null);
    clearGenerated();
  }, [clearGenerated]);

  const handleVideoFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError(null);
    setNotice(null);
    clearGenerated();
    if (!isSupportedVideoFile(file)) {
      setError("Choose an MP4 or WebM video. Other formats are not supported in this version.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`This video is larger than ${formatBytes(MAX_VIDEO_BYTES)}. Choose a smaller file.`);
      return;
    }
    const url = trackUrl(file);
    setPreparingSources(true);
    try {
      const metadata = await readVideoMetadata(url);
      if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
        throw new Error("This video's dimensions are too large to process in the browser. Choose a smaller video.");
      }
      const previous = video;
      setVideo({ file, url, ...metadata });
      setClipStart(0);
      setClipEnd(Math.min(metadata.duration, MAX_VIDEO_CLIP_SECONDS));
      if (previous) releaseUrl(previous.url);
      setNotice("Video loaded. Choose a clip up to 10 seconds long.");
    } catch (loadError) {
      releaseUrl(url);
      setError(createAbortMessage(loadError));
    } finally {
      setPreparingSources(false);
    }
  }, [clearGenerated, releaseUrl, trackUrl, video]);

  const handleImageFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!selectedFiles.length) return;
    setError(null);
    setNotice(null);
    clearGenerated();
    if (selectedFiles.length < MIN_IMAGE_FRAMES || selectedFiles.length > MAX_IMAGE_FRAMES) {
      setError(`Choose between ${MIN_IMAGE_FRAMES} and ${MAX_IMAGE_FRAMES} images for one GIF.`);
      return;
    }
    if (selectedFiles.some((file) => !isSupportedImageFile(file))) {
      setError("Choose PNG, JPEG, or WebP images only. The entire selection must use supported formats.");
      return;
    }
    if (selectedFiles.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError(`Each image must be ${formatBytes(MAX_IMAGE_BYTES)} or smaller.`);
      return;
    }
    if (selectedFiles.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_IMAGE_BYTES) {
      setError(`The selected images are larger than ${formatBytes(MAX_TOTAL_IMAGE_BYTES)} combined. Choose fewer or smaller files.`);
      return;
    }

    const urls: string[] = [];
    setPreparingSources(true);
    try {
      let totalPixels = 0;
      const nextImages = await Promise.all(selectedFiles.map(async (file, index) => {
        const url = trackUrl(file);
        urls.push(url);
        const loaded = await loadImage(url);
        if (loaded.width > MAX_IMAGE_DIMENSION || loaded.height > MAX_IMAGE_DIMENSION || loaded.width * loaded.height > MAX_IMAGE_PIXELS) {
          throw new Error(`${file.name} has dimensions that are too large to process in the browser.`);
        }
        totalPixels += loaded.width * loaded.height;
        if (totalPixels > MAX_SEQUENCE_PIXELS) {
          throw new Error("These images contain too many pixels to process together. Choose fewer or smaller images.");
        }
        return { id: `frame-${index + 1}:${file.name}`, file, url, width: loaded.width, height: loaded.height, image: loaded.image } satisfies ImageFrame;
      }));
      const previous = images;
      setImages(nextImages);
      setSelectedFrame(0);
      for (const image of previous) releaseUrl(image.url);
      setNotice(`${nextImages.length} images loaded in the selected order.`);
    } catch (loadError) {
      for (const url of urls) releaseUrl(url);
      setError(createAbortMessage(loadError));
    } finally {
      setPreparingSources(false);
    }
  }, [clearGenerated, images, releaseUrl, trackUrl]);

  const clearCurrentSource = useCallback(() => {
    clearGenerated();
    setError(null);
    setNotice("Source cleared.");
    if (mode === "video") {
      if (video) releaseUrl(video.url);
      setVideo(null);
      setClipStart(0);
      setClipEnd(0);
    } else {
      for (const image of images) releaseUrl(image.url);
      setImages([]);
      setSelectedFrame(0);
    }
  }, [clearGenerated, images, mode, releaseUrl, video]);

  const moveImage = useCallback((index: number, target: number) => {
    const image = images[index];
    if (!image || target < 0 || target >= images.length || target === index) return;
    setImages((current) => {
      if (!current[index] || !current[target]) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) return current;
      next.splice(target, 0, moved);
      return next;
    });
    setSelectedFrame((current) => {
      if (current === index) return target;
      if (index < current && current <= target) return current - 1;
      if (target <= current && current < index) return current + 1;
      return current;
    });
    clearGenerated();
    setError(null);
    setNotice(`${image.file.name} moved to position ${target + 1} of ${images.length}.`);
  }, [clearGenerated, images]);

  const handleImageDragEnd = useCallback((event: DragEndEvent) => {
    if (event.canceled) return;
    const source = event.operation.source;
    if (!isSortable(source)) return;
    const { initialIndex, index } = source;
    const movedImage = images[initialIndex];
    if (initialIndex === index || !movedImage || index < 0 || index >= images.length) return;

    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(initialIndex, 1);
      if (!moved) return current;
      next.splice(index, 0, moved);
      return next;
    });
    setSelectedFrame((current) => {
      if (current === initialIndex) return index;
      if (initialIndex < current && current <= index) return current - 1;
      if (index <= current && current < initialIndex) return current + 1;
      return current;
    });
    clearGenerated();
    setError(null);
    setNotice(`${movedImage.file.name} moved to position ${index + 1} of ${images.length}.`);
  }, [clearGenerated, images]);

  const setStartTime = useCallback((value: number) => {
    if (!video || !Number.isFinite(value)) return;
    const maxStart = Math.max(0, video.duration - 0.05);
    const nextStart = Math.max(0, Math.min(maxStart, value));
    const nextEnd = Math.max(nextStart + 0.05, Math.min(video.duration, nextStart + MAX_VIDEO_CLIP_SECONDS, Math.max(clipEnd, nextStart + 0.05)));
    setClipStart(nextStart);
    setClipEnd(nextEnd);
    clearGenerated();
  }, [clearGenerated, clipEnd, video]);

  const setEndTime = useCallback((value: number) => {
    if (!video || !Number.isFinite(value)) return;
    const nextEnd = Math.max(clipStart + 0.05, Math.min(video.duration, clipStart + MAX_VIDEO_CLIP_SECONDS, value));
    setClipEnd(nextEnd);
    clearGenerated();
  }, [clearGenerated, clipStart, video]);

  const sourceDimensions = mode === "video" && video
    ? { width: video.width, height: video.height }
    : mode === "images" && images[0]
      ? { width: images[0].width, height: images[0].height }
      : { width: 16, height: 9 };
  const outputDimensions = getOutputDimensions(sourceDimensions, settings);
  const videoFrames = video ? getVideoFrameCount(clipStart, clipEnd, settings.fps) : 0;
  const canCreate = mode === "video"
    ? Boolean(video && videoFrames >= 2 && clipEnd - clipStart <= MAX_VIDEO_CLIP_SECONDS + 0.001)
    : images.length >= MIN_IMAGE_FRAMES && images.length <= MAX_IMAGE_FRAMES;

  const cancelExport = useCallback(() => {
    activeExport.current?.controller.abort();
    activeExport.current?.session?.cancel();
    setStatus("Cancelling GIF creation…");
  }, []);

  const createGif = useCallback(async () => {
    if (!canCreate || busy) return;
    setError(null);
    setNotice(null);
    setGenerated(null);
    setBusy(true);
    setProgress(null);
    setStatus("Preparing frames…");
    const controller = new AbortController();
    const active: ActiveExport = { controller, session: null };
    activeExport.current = active;
    let exportVideo: HTMLVideoElement | null = null;
    let session: GifEncoderSession | null = null;

    try {
      const frameCount = mode === "video" ? videoFrames : images.length;
      if (mode === "video" && video && frameCount < 2) {
        throw new Error("Choose a longer clip or a higher frame rate so the GIF has at least two frames.");
      }
      if (frameCount < MIN_IMAGE_FRAMES || frameCount > 150) {
        throw new Error("This GIF would contain too many frames. Shorten the clip or lower the frame rate.");
      }
      if (mode === "video" && video) {
        exportVideo = await loadExportVideo(video.url, controller.signal);
      }
      const firstSource = mode === "video" ? video : images[0];
      if (!firstSource) throw new Error("Add a video or at least two images first.");
      const { canvas, dimensions } = createFrameCanvas(firstSource, settings);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas rendering is not available in this browser.");
      if (dimensions.width > MAX_OUTPUT_DIMENSION || dimensions.height > MAX_OUTPUT_DIMENSION) {
        throw new Error("The output dimensions are too large. Choose a smaller size.");
      }

      session = await createGifEncoderSession({
        width: dimensions.width,
        height: dimensions.height,
        totalFrames: frameCount,
        loop: settings.loop,
        onProgress: (completed, total) => setProgress(Math.round((completed / total) * 100)),
      });
      active.session = session;
      setStatus("Creating GIF…");

      if (mode === "video" && video && exportVideo) {
        for (let index = 0; index < frameCount; index += 1) {
          if (controller.signal.aborted) throw new DOMException("The operation was cancelled.", "AbortError");
          const time = clipStart + index / settings.fps;
          await seekVideoFrame(exportVideo, time, controller.signal);
          drawMediaFrame(context, exportVideo, { width: video.width, height: video.height }, settings);
          await session.addFrame(context.getImageData(0, 0, dimensions.width, dimensions.height).data, getVideoFrameDelay(index, settings.fps));
        }
      } else {
        for (const image of images) {
          if (controller.signal.aborted) throw new DOMException("The operation was cancelled.", "AbortError");
          drawMediaFrame(context, image.image, { width: image.width, height: image.height }, settings);
          await session.addFrame(context.getImageData(0, 0, dimensions.width, dimensions.height).data, settings.frameDuration);
        }
      }

      if (controller.signal.aborted) throw new DOMException("The operation was cancelled.", "AbortError");
      const blob = await session.finish();
      if (blob.size === 0) throw new Error("The GIF could not be created. Try different settings or smaller source files.");
      const url = URL.createObjectURL(blob);
      setGenerated({ url, size: blob.size, dimensions, frames: frameCount });
      setNotice("GIF ready to download.");
      setStatus("GIF created.");
      setProgress(100);
    } catch (exportError) {
      if (controller.signal.aborted || (exportError instanceof DOMException && exportError.name === "AbortError")) {
        setNotice("GIF creation cancelled. Your source and settings are still here.");
        setStatus("GIF creation cancelled.");
      } else {
        setError(createAbortMessage(exportError));
        setStatus("GIF creation failed.");
      }
    } finally {
      if (exportVideo) {
        exportVideo.pause();
        exportVideo.removeAttribute("src");
        exportVideo.load();
      }
      if (controller.signal.aborted) session?.cancel();
      if (activeExport.current === active) activeExport.current = null;
      setBusy(false);
      setProgress(null);
    }
  }, [busy, canCreate, clipStart, images, mode, settings, video, videoFrames]);

  const downloadGif = useCallback(() => {
    if (!generated) return;
    const anchor = document.createElement("a");
    anchor.href = generated.url;
    anchor.download = `${mode === "video" && video ? safeFileBase(video.file.name) : "gif-maker"}.gif`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [generated, mode, video]);

  const shownImage = images[selectedFrame] ?? images[0] ?? null;
  const stageStyle = { aspectRatio: `${outputDimensions.width} / ${outputDimensions.height}` };
  const sourceFit = settings.aspect === "original" ? "contain" : settings.fit;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader showToolsLink />
      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-12">
        <div className="mb-6 flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Image tools</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">GIF Maker</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Turn a short video or a set of images into a looping GIF. Your files stay on this device.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-5">
            <Card>
              <CardHeader className="gap-1 border-b border-border/70 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Source preview</CardTitle>
                  <CardDescription className="mt-1">
                    {mode === "video" && video
                      ? "Preview and trim your local video."
                      : mode === "images" && images.length > 0
                        ? "Preview and reorder your local image sequence."
                        : "Choose a source to start your animation."}
                  </CardDescription>
                  </div>
                  {mode === "video" && video && <span className="shrink-0 text-xs text-muted-foreground">{video.width} × {video.height}</span>}
                  {mode === "images" && images.length > 0 && <span className="shrink-0 text-xs text-muted-foreground">{images.length} frames</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-[var(--radius-control)] border border-border bg-muted/40 p-2 sm:p-4">
                  <div className="mx-auto flex w-full max-w-3xl items-center justify-center overflow-hidden rounded-[calc(var(--radius-control)-2px)] bg-white shadow-[var(--shadow-control)]" style={stageStyle}>
                    {mode === "video" && video ? (
                      <video
                        key={video.url}
                        src={video.url}
                        controls
                        playsInline
                        preload="metadata"
                        aria-label="Video source preview"
                        className="h-full w-full"
                        style={{ objectFit: sourceFit }}
                      />
                    ) : mode === "images" && shownImage ? (
                      <Image
                        src={shownImage.url}
                        alt={`Frame ${selectedFrame + 1} preview`}
                        width={shownImage.width}
                        height={shownImage.height}
                        unoptimized
                        className="h-full w-full"
                        style={{ objectFit: sourceFit }}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
                        {mode === "video" ? <FileVideo className="size-8 text-muted-foreground" aria-hidden="true" /> : <Images className="size-8 text-muted-foreground" aria-hidden="true" />}
                        <div>
                          <p className="text-sm font-medium">{mode === "video" ? "No video selected" : "No images selected"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{mode === "video" ? "Choose an MP4 or WebM video." : "Choose two or more PNG, JPEG, or WebP images."}</p>
                        </div>
                        <Button variant="outline" onClick={() => (mode === "video" ? videoInputRef.current : imageInputRef.current)?.click()} disabled={preparingSources || busy}>
                          <Plus data-icon="inline-start" /> Add {mode === "video" ? "video" : "images"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {mode === "video" && video && <><span>{formatDuration(video.duration)} source</span><span aria-hidden="true">·</span><span>Clip {formatTime(clipEnd - clipStart)}</span></>}
                    {mode === "images" && images.length > 0 && <><span>Frame {selectedFrame + 1} of {images.length}</span><span aria-hidden="true">·</span><span>{(images.length * settings.frameDuration / 1000).toFixed(1)}s total</span></>}
                    {!video && mode === "video" && <span>MP4 or WebM · up to 10 seconds per GIF</span>}
                    {!images.length && mode === "images" && <span>2–30 images · one shared frame duration</span>}
                  </div>
                  {(mode === "video" && video || mode === "images" && images.length > 0) && (
                    <div className="flex items-center gap-2">
                      {mode === "video" && <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} disabled={busy || preparingSources}>Replace</Button>}
                      {mode === "images" && <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={busy || preparingSources}>Replace images</Button>}
                      <Button variant="ghost" size="icon-sm" aria-label="Clear source" title="Clear source" onClick={clearCurrentSource} disabled={busy || preparingSources}><Trash2 /></Button>
                    </div>
                  )}
                </div>

                {mode === "images" && images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Image sequence preview">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setSelectedFrame(index)}
                        aria-label={`Show frame ${index + 1}`}
                        aria-pressed={selectedFrame === index}
                        disabled={busy}
                        className={`relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-control)] border bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selectedFrame === index ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                      >
                        <Image src={image.url} alt="" fill unoptimized className="object-contain" sizes="64px" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white">{index + 1}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {generated && (
              <Card>
                <CardHeader className="gap-1 border-b border-border/70 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Generated GIF</CardTitle>
                      <CardDescription className="mt-1">{generated.dimensions.width} × {generated.dimensions.height} · {generated.frames} frames · {formatBytes(generated.size)}</CardDescription>
                    </div>
                    <Button onClick={downloadGif}><Download data-icon="inline-start" /> Download GIF</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-border bg-muted/40 p-4 sm:min-h-64">
                    <Image src={generated.url} alt="Animated GIF preview" width={generated.dimensions.width} height={generated.dimensions.height} unoptimized className="max-h-[28rem] max-w-full object-contain" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div data-gif-settings-sidebar className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>GIF settings</CardTitle>
                <CardDescription>Choose a source and set the timing and output.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Tabs value={mode} onValueChange={onModeChange}>
                  <TabsList className="grid h-10 w-full grid-cols-2">
                    <TabsTrigger value="video" disabled={busy || preparingSources}><FileVideo data-icon="inline-start" /> From video</TabsTrigger>
                    <TabsTrigger value="images" disabled={busy || preparingSources}><Images data-icon="inline-start" /> From images</TabsTrigger>
                  </TabsList>
                  <TabsContent value="video" className="mt-4 space-y-4 outline-none">
                    <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,.mp4,.webm" className="sr-only" onChange={handleVideoFile} />
                    {!video ? (
                      <button type="button" onClick={() => videoInputRef.current?.click()} disabled={preparingSources || busy} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
                        {preparingSources ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <FileVideo className="size-5" aria-hidden="true" />}
                        <span className="font-medium text-foreground">{preparingSources ? "Loading video…" : "Choose video"}</span>
                        <span className="text-xs">MP4 or WebM, up to {formatBytes(MAX_VIDEO_BYTES)}</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border bg-muted/30 p-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <FileVideo className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <div className="min-w-0"><p className="truncate text-sm font-medium">{video.file.name}</p><p className="text-xs text-muted-foreground">{formatDuration(video.duration)} · {formatBytes(video.file.size)}</p></div>
                          </div>
                          <Button variant="ghost" size="icon-sm" aria-label="Remove video" onClick={clearCurrentSource} disabled={busy}><X /></Button>
                        </div>
                        <div className="space-y-3 rounded-[var(--radius-control)] border border-border p-3">
                          <div className="flex items-center justify-between"><p className="text-sm font-medium">Clip range</p><span className="text-xs text-muted-foreground">Up to {MAX_VIDEO_CLIP_SECONDS}s</span></div>
                          <Field label="Start time" hint={formatTime(clipStart)}>
                            <Input aria-label="Clip start time in seconds" type="number" min={0} max={Math.max(0, Math.min(video.duration, clipEnd - 0.05))} step={0.1} value={clipStart.toFixed(1)} onChange={(event) => setStartTime(Number(event.target.value))} disabled={busy} />
                          </Field>
                          <input aria-label="Clip start time" type="range" min={0} max={Math.max(0, Math.min(video.duration, clipEnd - 0.05))} step={0.1} value={Math.min(clipStart, Math.max(0, Math.min(video.duration, clipEnd - 0.05)))} onChange={(event) => setStartTime(Number(event.target.value))} className={rangeClassName} disabled={busy || video.duration <= 0.05} />
                          <Field label="End time" hint={formatTime(clipEnd)}>
                            <Input aria-label="Clip end time in seconds" type="number" min={Math.min(video.duration, clipStart + 0.05)} max={Math.min(video.duration, clipStart + MAX_VIDEO_CLIP_SECONDS)} step={0.1} value={clipEnd.toFixed(1)} onChange={(event) => setEndTime(Number(event.target.value))} disabled={busy} />
                          </Field>
                          <input aria-label="Clip end time" type="range" min={Math.min(video.duration, clipStart + 0.05)} max={Math.min(video.duration, clipStart + MAX_VIDEO_CLIP_SECONDS)} step={0.1} value={Math.max(Math.min(video.duration, clipStart + 0.05), Math.min(clipEnd, video.duration, clipStart + MAX_VIDEO_CLIP_SECONDS))} onChange={(event) => setEndTime(Number(event.target.value))} className={rangeClassName} disabled={busy || video.duration <= 0.05} />
                          <Field label="Frame rate" hint={`${settings.fps} fps`}>
                            <input aria-label="Frame rate" type="range" min={MIN_VIDEO_FPS} max={MAX_VIDEO_FPS} step={1} value={settings.fps} onChange={(event) => updateSettings({ fps: Number(event.target.value) })} className={rangeClassName} disabled={busy} />
                          </Field>
                          <p className="text-xs text-muted-foreground">About {videoFrames} frames. Higher frame rates and larger sizes take longer to export.</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="images" className="mt-4 space-y-4 outline-none">
                    <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple className="sr-only" onChange={handleImageFiles} />
                    {images.length === 0 ? (
                      <button type="button" onClick={() => imageInputRef.current?.click()} disabled={preparingSources || busy} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
                        {preparingSources ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <FileImage className="size-5" aria-hidden="true" />}
                        <span className="font-medium text-foreground">{preparingSources ? "Loading images…" : "Choose images"}</span>
                        <span className="text-xs">2–{MAX_IMAGE_FRAMES} PNG, JPEG, or WebP files</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full" onClick={() => imageInputRef.current?.click()} disabled={busy || preparingSources}><Plus data-icon="inline-start" /> Replace image sequence</Button>
                        <DragDropProvider onDragEnd={handleImageDragEnd}>
                          <div className="space-y-2 pr-1" role="list" aria-label="Image frame order">
                            {images.map((image, index) => (
                              <SortableImageFrameRow
                                key={image.id}
                                image={image}
                                index={index}
                                count={images.length}
                                disabled={busy || preparingSources}
                                onMoveTo={(position) => moveImage(index, position)}
                              />
                            ))}
                          </div>
                        </DragDropProvider>
                        <p className="text-xs text-muted-foreground">Drag a frame by its grip, or choose a position.</p>
                        <Field label="Duration per image" hint={`${settings.frameDuration} ms`}>
                          <div className="flex items-center gap-3">
                            <input aria-label="Duration per image" type="range" min={MIN_FRAME_DURATION} max={2_000} step={50} value={settings.frameDuration} onChange={(event) => updateSettings({ frameDuration: Number(event.target.value) })} className={rangeClassName} disabled={busy} />
                            <Input aria-label="Duration per image in milliseconds" type="number" min={MIN_FRAME_DURATION} max={2_000} step={50} value={settings.frameDuration} onChange={(event) => updateSettings({ frameDuration: Math.max(MIN_FRAME_DURATION, Math.min(2_000, Number(event.target.value) || MIN_FRAME_DURATION)) })} className="w-24 shrink-0" disabled={busy} />
                          </div>
                        </Field>
                        <p className="text-xs text-muted-foreground">Each image stays on screen for the same amount of time.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="border-t border-border pt-4">
                  <h3 className="mb-3 text-sm font-medium">Output</h3>
                  <div className="space-y-3">
                    <Field label="Aspect ratio">
                      <select aria-label="Aspect ratio" value={settings.aspect} onChange={(event) => updateSettings({ aspect: event.target.value as GifAspect })} className={selectClassName} disabled={busy}>
                        <option value="original">Original</option><option value="square">Square</option><option value="portrait">Portrait · 4:5</option><option value="landscape">Landscape · 16:9</option>
                      </select>
                    </Field>
                    {settings.aspect !== "original" && (
                      <Field label="Fit">
                        <select aria-label="Crop or fit" value={settings.fit} onChange={(event) => updateSettings({ fit: event.target.value as GifFit })} className={selectClassName} disabled={busy}>
                          <option value="cover">Fill frame · crop edges</option><option value="contain">Fit whole image · add white space</option>
                        </select>
                      </Field>
                    )}
                    <Field label="Maximum size" hint="No upscaling">
                      <select aria-label="Maximum output size" value={settings.outputSize} onChange={(event) => updateSettings({ outputSize: Number(event.target.value) as GifSettings["outputSize"] })} className={selectClassName} disabled={busy}>
                        <option value={320}>Small · 320 px</option><option value={480}>Medium · 480 px</option><option value={MAX_OUTPUT_DIMENSION}>Large · {MAX_OUTPUT_DIMENSION} px</option>
                      </select>
                    </Field>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border px-3 py-2.5 text-sm">
                      <span><span className="block font-medium">Loop forever</span><span className="text-xs text-muted-foreground">Turn off to play once.</span></span>
                      <input type="checkbox" checked={settings.loop} onChange={(event) => updateSettings({ loop: event.target.checked })} className="size-4 accent-primary" disabled={busy} />
                    </label>
                    <p className="text-xs text-muted-foreground">GIF uses up to 256 colors per frame. Transparent areas are filled with white.</p>
                  </div>
                </div>

                {error && <p className="rounded-[var(--radius-control)] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
                {notice && !error && <p className="text-sm text-muted-foreground" role="status">{notice}</p>}

                <div className="hidden lg:block">
                  {busy ? (
                    <div className="space-y-3 rounded-[var(--radius-control)] border border-border bg-muted/30 p-3" role="status" aria-live="polite">
                      <div className="flex items-center gap-2 text-sm font-medium"><LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />{status || "Creating GIF…"}</div>
                      {progress !== null && <div className="space-y-1"><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div><p className="text-right text-xs text-muted-foreground">{progress}%</p></div>}
                      <Button variant="outline" className="w-full" onClick={cancelExport}>Cancel</Button>
                    </div>
                  ) : (
                    <Button className="w-full" size="lg" onClick={createGif} disabled={!canCreate || preparingSources}>
                      <Sparkles data-icon="inline-start" /> Create GIF
                    </Button>
                  )}
                </div>
                {!canCreate && !busy && !preparingSources && (
                  <p className="text-center text-xs text-muted-foreground">{mode === "video" ? "Add a video and select a clip with at least two frames." : "Add at least two images to create a GIF."}</p>
                )}
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              <RotateCcw className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <p>Source files are held in memory while this page is open. Leaving the page clears your current edit.</p>
            </div>
          </div>
        </div>

      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-control)] backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          {busy ? (
            <div className="flex min-w-0 flex-1 items-center gap-3" role="status" aria-live="polite">
              <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{status || "Creating GIF…"}</p>
                {progress !== null && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>}
              </div>
            </div>
          ) : generated ? (
            <Button className="w-full" size="lg" onClick={downloadGif}><Download data-icon="inline-start" /> Download GIF</Button>
          ) : (
            <Button className="w-full" size="lg" onClick={createGif} disabled={!canCreate || preparingSources}>
              <Sparkles data-icon="inline-start" /> Create GIF
            </Button>
          )}
          {busy && <Button variant="outline" onClick={cancelExport}>Cancel</Button>}
        </div>
      </div>
    </div>
  );
}
