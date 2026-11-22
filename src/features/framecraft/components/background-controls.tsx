"use client";

import { ImagePlus, Palette, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { BackgroundSettings, Composition } from "../model";
import { backgroundPresets } from "../presets";
import { ColorControl, FieldGrid, NumberControl, RangeControl, SectionHeading, SelectField, type ControlTransaction } from "./editor-controls";

type BackgroundControlsProps = {
  composition: Composition;
  imageReady: boolean;
  transaction: ControlTransaction;
  onUpload: () => void;
  onSelectType: (type: BackgroundSettings["type"]) => void;
  onPatch: (patch: Partial<BackgroundSettings>) => void;
  onSelectPreset: (preset: typeof backgroundPresets[number]) => void;
  onReset: () => void;
};

export function BackgroundControls({ composition, imageReady, transaction, onUpload, onSelectType, onPatch, onSelectPreset, onReset }: BackgroundControlsProps) {
  const background = composition.background;

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <SectionHeading
        title="Background"
        description="Choose a color, gradient, or image."
        action={<Button size="icon-sm" variant="ghost" aria-label="Upload background image" onClick={onUpload}><ImagePlus /></Button>}
      />
      <div className="grid grid-cols-2 gap-2">
        {(["solid", "gradient", "image"] as const).map((type) => (
          <Button key={type} size="sm" variant={background.type === type ? "secondary" : "outline"} onClick={() => onSelectType(type)} className={type === "image" ? "col-span-2" : "capitalize"}>
            {type === "image" ? <><Upload /> {background.assetId ? "Replace image" : "Upload image"}</> : type === "solid" ? "Solid" : "Gradient"}
          </Button>
        ))}
      </div>
      {background.type === "solid" ? (
        <ColorControl id="background-color" label="Background color" value={background.color} onChange={(color) => onPatch({ color })} {...transaction} />
      ) : background.type === "gradient" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <ColorControl id="gradient-start" label="Start color" value={background.gradientFrom} onChange={(gradientFrom) => onPatch({ gradientFrom })} {...transaction} />
            <ColorControl id="gradient-end" label="End color" value={background.gradientTo} onChange={(gradientTo) => onPatch({ gradientTo })} {...transaction} />
          </div>
          <RangeControl id="gradient-angle" label="Gradient direction" value={background.gradientAngle} min={0} max={360} format={(number) => `${Math.round(number)}°`} onChange={(gradientAngle) => onPatch({ gradientAngle })} {...transaction} />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {backgroundPresets.map((preset) => <button key={preset.name} type="button" onClick={() => onSelectPreset(preset)} className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border px-2 text-left text-[11px] hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="size-5 shrink-0 rounded-md" style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }} />{preset.name}</button>)}
            </div>
          </div>
        </>
      ) : (
        <>
          {background.assetId && <p className="truncate text-xs text-muted-foreground">{imageReady ? "Background image ready" : "Loading background image…"}</p>}
          <SelectField label="Image fit" value={background.fit} options={[["cover", "Cover"], ["contain", "Contain"]]} onChange={(fit) => onPatch({ fit: fit as BackgroundSettings["fit"] })} transaction={transaction} />
          <RangeControl id="bg-zoom" label="Zoom" value={background.zoom * 100} min={50} max={300} format={(number) => `${Math.round(number)}%`} onChange={(value) => onPatch({ zoom: value / 100 })} {...transaction} />
          <FieldGrid>
            <NumberControl id="bg-position-x" label="Position X (%)" value={background.x} min={-300} max={300} onChange={(x) => onPatch({ x })} {...transaction} />
            <NumberControl id="bg-position-y" label="Position Y (%)" value={background.y} min={-300} max={300} onChange={(y) => onPatch({ y })} {...transaction} />
          </FieldGrid>
          <RangeControl id="bg-opacity" label="Opacity" value={background.opacity} min={0} max={100} format={(number) => `${Math.round(number)}%`} onChange={(opacity) => onPatch({ opacity })} {...transaction} />
          <RangeControl id="bg-blur" label="Blur" value={background.blur} min={0} max={32} format={(number) => `${Math.round(number)} px`} onChange={(blur) => onPatch({ blur })} {...transaction} />
          <Accordion>
            <AccordionItem value="image-adjustments">
              <AccordionTrigger className="text-xs">Image adjustments</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-3">
                <RangeControl id="bg-brightness" label="Brightness" value={background.brightness} min={50} max={150} format={(number) => `${Math.round(number)}%`} onChange={(brightness) => onPatch({ brightness })} {...transaction} />
                <RangeControl id="bg-contrast" label="Contrast" value={background.contrast} min={50} max={150} format={(number) => `${Math.round(number)}%`} onChange={(contrast) => onPatch({ contrast })} {...transaction} />
                <RangeControl id="bg-saturation" label="Saturation" value={background.saturation} min={0} max={180} format={(number) => `${Math.round(number)}%`} onChange={(saturation) => onPatch({ saturation })} {...transaction} />
                <RangeControl id="bg-grayscale" label="Grayscale" value={background.grayscale} min={0} max={100} format={(number) => `${Math.round(number)}%`} onChange={(grayscale) => onPatch({ grayscale })} {...transaction} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
      <Accordion>
        <AccordionItem value="overlay">
          <AccordionTrigger className="text-xs"><span className="inline-flex items-center gap-2"><Palette className="size-3.5" /> Overlay and effects</span></AccordionTrigger>
          <AccordionContent className="space-y-4 pt-3">
            <SelectField label="Overlay" value={background.overlayType} options={[["none", "None"], ["solid", "Solid color"], ["gradient", "Gradient"]]} onChange={(overlayType) => onPatch({ overlayType: overlayType as BackgroundSettings["overlayType"] })} transaction={transaction} />
            {background.overlayType !== "none" && <>
              <ColorControl id="overlay-color" label="Overlay color" value={background.overlayColor} onChange={(overlayColor) => onPatch({ overlayColor })} {...transaction} />
              {background.overlayType === "gradient" && <ColorControl id="overlay-end" label="Gradient end" value={background.overlayColorEnd} onChange={(overlayColorEnd) => onPatch({ overlayColorEnd })} {...transaction} />}
              <RangeControl id="overlay-opacity" label="Overlay opacity" value={background.overlayOpacity} min={0} max={100} format={(number) => `${Math.round(number)}%`} onChange={(overlayOpacity) => onPatch({ overlayOpacity })} {...transaction} />
              {background.overlayType === "gradient" && <RangeControl id="overlay-angle" label="Overlay direction" value={background.overlayAngle} min={0} max={360} format={(number) => `${Math.round(number)}°`} onChange={(overlayAngle) => onPatch({ overlayAngle })} {...transaction} />}
            </>}
            <RangeControl id="vignette" label="Vignette" value={background.vignette} min={0} max={80} format={(number) => `${Math.round(number)}%`} onChange={(vignette) => onPatch({ vignette })} {...transaction} />
            <RangeControl id="texture" label="Texture" value={background.texture} min={0} max={100} format={(number) => `${Math.round(number)}%`} onChange={(texture) => onPatch({ texture })} {...transaction} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onReset}><RotateCcw /> Reset background</Button>
    </div>
  );
}
