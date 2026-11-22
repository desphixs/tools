"use client";

import { Crop, ImagePlus, RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MAX_CANVAS_DIMENSION, type Composition, type ScreenshotSettings } from "../model";
import { ColorControl, FieldGrid, NumberControl, RangeControl, SectionHeading, SelectField, type ControlTransaction } from "./editor-controls";

type ScreenshotControlsProps = {
  composition: Composition;
  imageSize?: { width: number; height: number };
  lowResolution: boolean;
  cropMode: boolean;
  transaction: ControlTransaction;
  onUpload: () => void;
  onRemove: () => void;
  onToggleCrop: () => void;
  onPatch: (patch: Partial<ScreenshotSettings>) => void;
  onToggleAspectLock: (locked: boolean) => void;
  onShadowPreset: (preset: "none" | "subtle" | "soft" | "dramatic") => void;
  onReset: () => void;
};

export function ScreenshotControls({ composition, imageSize, lowResolution, cropMode, transaction, onUpload, onRemove, onToggleCrop, onPatch, onToggleAspectLock, onShadowPreset, onReset }: ScreenshotControlsProps) {
  const screenshot = composition.screenshot;
  const imageAspectRatio = imageSize ? imageSize.width / imageSize.height : screenshot.width / screenshot.height;

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <SectionHeading
        title="Screenshot"
        description="Place and style the main image."
        action={<Button size="icon-sm" variant="ghost" aria-label={screenshot.assetId ? "Replace screenshot" : "Upload screenshot"} onClick={onUpload}><ImagePlus /></Button>}
      />
      {!screenshot.assetId ? (
        <button type="button" onClick={onUpload} className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border bg-muted/40 px-4 text-center transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span className="flex size-10 items-center justify-center rounded-full bg-background text-primary shadow-[var(--shadow-control)]"><Upload className="size-4" /></span>
          <span className="text-sm font-medium">Add screenshot</span>
          <span className="text-xs text-muted-foreground">PNG, JPEG, or WebP · up to 40 MB</span>
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-muted/50 px-3 py-2.5">
            <div className="min-w-0"><p className="truncate text-xs font-medium">{imageSize ? `${imageSize.width} × ${imageSize.height} px` : "Loading screenshot…"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Drag on canvas to move or resize</p></div>
            <Button variant="ghost" size="icon-sm" aria-label="Remove screenshot" onClick={onRemove}><Trash2 /></Button>
          </div>
          {lowResolution && <p className="rounded-[var(--radius-control)] bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-200">This image is being enlarged beyond its pixel size and may look soft when exported.</p>}
          <div className="space-y-2">
            <Button type="button" variant={cropMode ? "secondary" : "outline"} size="sm" aria-pressed={cropMode} onClick={onToggleCrop}>
              <Crop /> {cropMode ? "Finish crop" : "Crop image"}
            </Button>
            <p className="text-[11px] leading-5 text-muted-foreground">{cropMode ? "Drag inside the frame to reposition the image. Arrow keys also work." : "Adjust the crop with the fields below or drag after selecting Crop image."}</p>
          </div>
          <FieldGrid>
            <NumberControl id="screenshot-x" label="Position X" value={Math.round(screenshot.x)} min={-2000} max={4000} onChange={(x) => onPatch({ x })} {...transaction} />
            <NumberControl id="screenshot-y" label="Position Y" value={Math.round(screenshot.y)} min={-2000} max={4000} onChange={(y) => onPatch({ y })} {...transaction} />
            <NumberControl id="screenshot-width" label="Width" value={Math.round(screenshot.width)} min={120} max={MAX_CANVAS_DIMENSION} onChange={(width) => onPatch({ width, ...(screenshot.aspectLocked ? { height: width / imageAspectRatio } : {}) })} {...transaction} />
            <NumberControl id="screenshot-height" label="Height" value={Math.round(screenshot.height)} min={90} max={MAX_CANVAS_DIMENSION} onChange={(height) => onPatch({ height, ...(screenshot.aspectLocked ? { width: height * imageAspectRatio } : {}) })} {...transaction} />
          </FieldGrid>
          <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-muted/60 px-3 py-2.5">
            <Label htmlFor="aspect-lock" className="text-xs font-medium">Lock to image ratio</Label>
            <Switch id="aspect-lock" checked={screenshot.aspectLocked} onCheckedChange={onToggleAspectLock} />
          </div>
          <SelectField label="Image fit" value={screenshot.fit} options={[["cover", "Fill frame"], ["contain", "Fit inside"]]} onChange={(fit) => onPatch({ fit: fit as ScreenshotSettings["fit"] })} transaction={transaction} />
          <RangeControl id="crop-zoom" label="Image zoom" value={screenshot.cropZoom * 100} min={50} max={300} format={(number) => `${Math.round(number)}%`} onChange={(value) => onPatch({ cropZoom: value / 100 })} {...transaction} />
          <FieldGrid>
            <NumberControl id="crop-x" label="Crop X (%)" value={screenshot.cropX} min={-300} max={300} onChange={(cropX) => onPatch({ cropX })} {...transaction} />
            <NumberControl id="crop-y" label="Crop Y (%)" value={screenshot.cropY} min={-300} max={300} onChange={(cropY) => onPatch({ cropY })} {...transaction} />
          </FieldGrid>
          <FieldGrid>
            <RangeControl id="rotation" label="Rotation" value={screenshot.rotation} min={-30} max={30} format={(number) => `${Math.round(number)}°`} onChange={(rotation) => onPatch({ rotation })} {...transaction} />
            <RangeControl id="screenshot-opacity" label="Opacity" value={screenshot.opacity} min={0} max={100} format={(number) => `${Math.round(number)}%`} onChange={(opacity) => onPatch({ opacity })} {...transaction} />
          </FieldGrid>
          <RangeControl id="frame-radius" label="Corner radius" value={screenshot.cornerRadius} min={0} max={100} format={(number) => `${Math.round(number)} px`} onChange={(cornerRadius) => onPatch({ cornerRadius })} {...transaction} />
          <div className="grid grid-cols-[1fr_88px] items-end gap-3">
            <RangeControl id="border-width" label="Border width" value={screenshot.borderWidth} min={0} max={24} format={(number) => `${Math.round(number)} px`} onChange={(borderWidth) => onPatch({ borderWidth })} {...transaction} />
            <ColorControl id="border-color" label="Border color" value={screenshot.borderColor} onChange={(borderColor) => onPatch({ borderColor })} {...transaction} />
          </div>
          <RangeControl id="border-opacity" label="Border opacity" value={screenshot.borderOpacity} min={0} max={100} format={(number) => `${Math.round(number)}%`} onChange={(borderOpacity) => onPatch({ borderOpacity })} {...transaction} />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Shadow</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["none", "subtle", "soft", "dramatic"] as const).map((preset) => <Button key={preset} variant="outline" size="sm" className="px-1.5 text-[11px] capitalize" onClick={() => onShadowPreset(preset)}>{preset}</Button>)}
            </div>
          </div>
          <Accordion>
            <AccordionItem value="shadow-settings">
              <AccordionTrigger className="text-xs">Shadow settings</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-3">
                <ColorControl id="shadow-color" label="Color" value={screenshot.shadowColor} onChange={(shadowColor) => onPatch({ shadowColor, shadowEnabled: true })} {...transaction} />
                <RangeControl id="shadow-opacity" label="Opacity" value={screenshot.shadowOpacity} min={0} max={100} format={(number) => `${Math.round(number)}%`} onChange={(shadowOpacity) => onPatch({ shadowOpacity, shadowEnabled: true })} {...transaction} />
                <RangeControl id="shadow-blur" label="Blur" value={screenshot.shadowBlur} min={0} max={100} format={(number) => `${Math.round(number)} px`} onChange={(shadowBlur) => onPatch({ shadowBlur, shadowEnabled: true })} {...transaction} />
                <FieldGrid>
                  <NumberControl id="shadow-width" label="Shadow width" value={Math.round(screenshot.shadowWidth ?? screenshot.width)} min={60} max={MAX_CANVAS_DIMENSION * 2} onChange={(shadowWidth) => onPatch({ shadowWidth, shadowEnabled: true })} {...transaction} />
                  <NumberControl id="shadow-height" label="Shadow height" value={Math.round(screenshot.shadowHeight ?? screenshot.height)} min={60} max={MAX_CANVAS_DIMENSION * 2} onChange={(shadowHeight) => onPatch({ shadowHeight, shadowEnabled: true })} {...transaction} />
                </FieldGrid>
                <FieldGrid>
                  <RangeControl id="shadow-x" label="Position X" value={screenshot.shadowX} min={-80} max={80} format={(number) => `${Math.round(number)} px`} onChange={(shadowX) => onPatch({ shadowX, shadowEnabled: true })} {...transaction} />
                  <RangeControl id="shadow-y" label="Position Y" value={screenshot.shadowY} min={-80} max={80} format={(number) => `${Math.round(number)} px`} onChange={(shadowY) => onPatch({ shadowY, shadowEnabled: true })} {...transaction} />
                </FieldGrid>
                <RangeControl id="shadow-spread" label="Spread" value={screenshot.shadowSpread} min={0} max={24} format={(number) => `${Math.round(number)} px`} onChange={(shadowSpread) => onPatch({ shadowSpread, shadowEnabled: true })} {...transaction} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onReset}><RotateCcw /> Reset screenshot style</Button>
        </>
      )}
    </div>
  );
}
