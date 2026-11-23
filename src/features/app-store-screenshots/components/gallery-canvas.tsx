"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { getScreenshotSpec, getSpecDimensions } from "../catalog";
import type { ElementTransform, GalleryElement, GalleryProject, GalleryScreen } from "../model";
import { drawGalleryScreen, type RenderedElement } from "../render";

const elementLabels: Record<GalleryElement, string> = {
  headline: "Headline",
  subtitle: "Subtitle",
  device: "Device frame",
  screenshot: "Screenshot image",
};

type TransformGesture = {
  pointerId: number;
  element: GalleryElement;
  mode: "move" | "resize" | "rotate";
  startX: number;
  startY: number;
  centerScreenX: number;
  centerScreenY: number;
  startDistance: number;
  startAngle: number;
  startTransform: ElementTransform;
};

export function GalleryCanvas({ project, screen, sourceUrl, backgroundUrl, showSafeArea = false, interactive = false, selectedElement = null, onOverflow, onUnsafeElements, onElements, onSelectElement, onTransformStart, onTransform, onTransformEnd, onEditElement }: {
  project: GalleryProject;
  screen?: GalleryScreen;
  sourceUrl?: string;
  backgroundUrl?: string;
  showSafeArea?: boolean;
  interactive?: boolean;
  selectedElement?: GalleryElement | null;
  onOverflow: (overflow: boolean) => void;
  onUnsafeElements?: (elements: GalleryElement[]) => void;
  onElements?: (elements: RenderedElement[]) => void;
  onSelectElement?: (element: GalleryElement) => void;
  onTransformStart?: () => void;
  onTransform?: (element: GalleryElement, transform: ElementTransform) => void;
  onTransformEnd?: () => void;
  onEditElement?: (element: GalleryElement) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<TransformGesture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef(new Map<string, Promise<HTMLImageElement>>());
  const [elements, setElements] = useState<RenderedElement[]>([]);
  const [guides, setGuides] = useState({ vertical: false, horizontal: false });
  const spec = getScreenshotSpec(project.specId);
  const dimensions = spec ? getSpecDimensions(spec, project.orientation) : { width: 1179, height: 2556 };

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return () => { cancelled = true; };
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    if (!screen || !sourceUrl) {
      ctx.fillStyle = project.style.backgroundStart; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(90,82,110,.12)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      setElements([]); onElements?.([]); onUnsafeElements?.([]); onOverflow(false); return () => { cancelled = true; };
    }
    const loadImage = (url: string) => {
      let pending = imageCacheRef.current.get(url);
      if (!pending) {
        pending = new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Could not load a local screenshot image."));
          image.src = url;
        });
        imageCacheRef.current.set(url, pending);
        void pending.catch(() => imageCacheRef.current.delete(url));
      }
      return pending;
    };
    const draw = async () => {
      try {
        const image = await loadImage(sourceUrl);
        const backdrop = project.style.background === "image" && backgroundUrl ? await loadImage(backgroundUrl).catch(() => undefined) : undefined;
        if (cancelled) return;
        const diagnostics = drawGalleryScreen(ctx, project, screen, { image, width: screen.width, height: screen.height }, dimensions.width, dimensions.height,
          backdrop ? { image: backdrop, width: backdrop.naturalWidth, height: backdrop.naturalHeight } : undefined);
        if (showSafeArea) {
          const insetX = dimensions.width * 0.06;
          const insetY = dimensions.height * 0.045;
          ctx.save(); ctx.strokeStyle = "#6b5bd1"; ctx.globalAlpha = 0.8; ctx.lineWidth = Math.max(2, dimensions.width / 1179);
          ctx.setLineDash([dimensions.width / 1179 * 8, dimensions.width / 1179 * 6]);
          ctx.strokeRect(insetX, insetY, dimensions.width - insetX * 2, dimensions.height - insetY * 2); ctx.restore();
        }
        setElements(diagnostics.elements); onElements?.(diagnostics.elements); onUnsafeElements?.(diagnostics.unsafeElements); onOverflow(diagnostics.textOverflow);
      } catch {
        if (cancelled) return;
        setElements([]); onElements?.([]); onUnsafeElements?.([]); onOverflow(false);
      }
    };
    void draw();
    return () => { cancelled = true; };
  }, [project, screen, sourceUrl, backgroundUrl, showSafeArea, dimensions.height, dimensions.width, onOverflow, onUnsafeElements, onElements]);

  const startGesture = (element: GalleryElement, mode: TransformGesture["mode"], event: PointerEvent<HTMLElement>) => {
    event.preventDefault(); event.stopPropagation();
    const geometry = elements.find((item) => item.type === element);
    const wrapper = wrapperRef.current;
    if (!geometry || !wrapper) return;
    const bounds = wrapper.getBoundingClientRect();
    const centerScreenX = bounds.left + geometry.centerX / 100 * bounds.width;
    const centerScreenY = bounds.top + geometry.centerY / 100 * bounds.height;
    const startTransform = { centerX: geometry.centerX, centerY: geometry.centerY, scale: geometry.scale, rotation: geometry.rotation };
    gestureRef.current = {
      pointerId: event.pointerId,
      element,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      centerScreenX,
      centerScreenY,
      startDistance: Math.max(1, Math.hypot(event.clientX - centerScreenX, event.clientY - centerScreenY)),
      startAngle: Math.atan2(event.clientY - centerScreenY, event.clientX - centerScreenX),
      startTransform,
    };
    setGuides({ vertical: false, horizontal: false });
    wrapper.setPointerCapture(event.pointerId);
    onSelectElement?.(element);
    onTransformStart?.();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!gesture || !bounds || event.pointerId !== gesture.pointerId || !onTransform) return;
    let transform = gesture.startTransform;
    if (gesture.mode === "move") {
      const centerX = gesture.startTransform.centerX + (event.clientX - gesture.startX) / bounds.width * 100;
      const centerY = gesture.startTransform.centerY + (event.clientY - gesture.startY) / bounds.height * 100;
      const vertical = Math.abs(centerX - 50) < 1.2;
      const horizontal = Math.abs(centerY - 50) < 1.2;
      setGuides({ vertical, horizontal });
      transform = {
        ...transform,
        centerX: Math.min(200, Math.max(-100, vertical ? 50 : centerX)),
        centerY: Math.min(200, Math.max(-100, horizontal ? 50 : centerY)),
      };
    } else if (gesture.mode === "resize") {
      const distance = Math.max(1, Math.hypot(event.clientX - gesture.centerScreenX, event.clientY - gesture.centerScreenY));
      transform = { ...transform, scale: Math.min(3, Math.max(0.25, gesture.startTransform.scale * distance / gesture.startDistance)) };
    } else {
      const angle = Math.atan2(event.clientY - gesture.centerScreenY, event.clientX - gesture.centerScreenX);
      const delta = (angle - gesture.startAngle) * 180 / Math.PI;
      const rawRotation = gesture.startTransform.rotation + delta;
      const rotation = ((rawRotation + 180) % 360 + 360) % 360 - 180;
      transform = { ...transform, rotation };
    }
    onTransform(gesture.element, transform);
  };

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (!gestureRef.current || gestureRef.current.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setGuides({ vertical: false, horizontal: false });
    if (wrapperRef.current?.hasPointerCapture(event.pointerId)) wrapperRef.current.releasePointerCapture(event.pointerId);
    onTransformEnd?.();
  };

  const nudge = (element: GalleryElement, direction: "left" | "right" | "up" | "down", amount: number) => {
    const geometry = elements.find((item) => item.type === element);
    if (!geometry || !onTransform) return;
    onSelectElement?.(element);
    onTransformStart?.();
    onTransform(element, {
      centerX: geometry.centerX + (direction === "left" ? -amount : direction === "right" ? amount : 0),
      centerY: geometry.centerY + (direction === "up" ? -amount : direction === "down" ? amount : 0),
      scale: geometry.scale,
      rotation: geometry.rotation,
    });
    onTransformEnd?.();
  };

  return <div ref={wrapperRef} className="relative inline-block max-h-[54dvh] max-w-full touch-none sm:max-h-[62vh]" onPointerMove={handlePointerMove} onPointerUp={finishGesture} onPointerCancel={finishGesture}>
    <canvas ref={canvasRef} aria-label={screen ? `Preview of screen ${project.screens.findIndex((item) => item.id === screen.id) + 1}` : "Empty screenshot preview"} className="block max-h-[54dvh] max-w-full rounded-[var(--radius-control)] object-contain shadow-[var(--shadow-control)] sm:max-h-[62vh]" />
    {interactive && screen && elements.length > 0 && <div className="pointer-events-none absolute inset-0" role="group" aria-label="Selectable screenshot elements">
      {guides.vertical && <div aria-hidden="true" className="absolute inset-y-0 left-1/2 z-40 border-l border-dashed border-primary/70" />}
      {guides.horizontal && <div aria-hidden="true" className="absolute inset-x-0 top-1/2 z-40 border-t border-dashed border-primary/70" />}
      {elements.map((element, index) => {
        const label = elementLabels[element.type];
        const selected = selectedElement === element.type;
        const width = element.width / dimensions.width * 100;
        const height = element.height / dimensions.height * 100;
        return <div key={element.type} role="group" aria-label={`${label} on screenshot`} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-[4px]" style={{ left: `${element.centerX}%`, top: `${element.centerY}%`, width: `${width}%`, height: `${height}%`, minWidth: "26px", minHeight: "26px", transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`, zIndex: index + 1 }}>
          <button type="button" aria-label={`Select ${label}; drag to move`} aria-pressed={selected} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" onFocus={() => onSelectElement?.(element.type)} onClick={() => onSelectElement?.(element.type)} onDoubleClick={() => { onSelectElement?.(element.type); onEditElement?.(element.type); }} onPointerDown={(event) => startGesture(element.type, "move", event)} onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
            const direction = event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : null;
            if (direction) { event.preventDefault(); nudge(element.type, direction, event.shiftKey ? 1 : 0.25); }
            else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectElement?.(element.type); }
          }} className={`pointer-events-auto absolute inset-0 rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-2 border-primary bg-primary/5" : "border border-transparent hover:border-primary/60"}`} />
          {selected && <>
            <button type="button" aria-label={`Resize ${label} from bottom right`} onPointerDown={(event) => startGesture(element.type, "resize", event)} className="pointer-events-auto absolute -bottom-3 -right-3 size-6 cursor-nwse-resize rounded-full border-2 border-primary bg-background shadow-[var(--shadow-control)] focus-visible:outline-2 focus-visible:outline-ring" />
            <button type="button" aria-label={`Resize ${label} from top left`} onPointerDown={(event) => startGesture(element.type, "resize", event)} className="pointer-events-auto absolute -left-3 -top-3 size-6 cursor-nwse-resize rounded-full border-2 border-primary bg-background shadow-[var(--shadow-control)] focus-visible:outline-2 focus-visible:outline-ring" />
            <button type="button" aria-label={`Resize ${label} from top right`} onPointerDown={(event) => startGesture(element.type, "resize", event)} className="pointer-events-auto absolute -right-3 -top-3 size-6 cursor-nesw-resize rounded-full border-2 border-primary bg-background shadow-[var(--shadow-control)] focus-visible:outline-2 focus-visible:outline-ring" />
            <button type="button" aria-label={`Resize ${label} from bottom left`} onPointerDown={(event) => startGesture(element.type, "resize", event)} className="pointer-events-auto absolute -bottom-3 -left-3 size-6 cursor-nesw-resize rounded-full border-2 border-primary bg-background shadow-[var(--shadow-control)] focus-visible:outline-2 focus-visible:outline-ring" />
            <button type="button" aria-label={`Rotate ${label}`} onPointerDown={(event) => startGesture(element.type, "rotate", event)} className="pointer-events-auto absolute -left-3 -top-9 flex size-6 cursor-grab items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-[var(--shadow-control)] focus-visible:outline-2 focus-visible:outline-ring"><RotateCw className="size-3.5" /></button>
            <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-4 h-2 w-px bg-primary" />
          </>}
        </div>;
      })}
    </div>}
  </div>;
}
