"use client";

import { AlignCenterHorizontal, AlignCenterVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldGrid, NumberControl, RangeControl, SectionHeading, type ControlTransaction } from "./editor-controls";
import { MAX_CANVAS_DIMENSION, type CanvasSettings, type Composition } from "../model";
import { canvasPresets, type CanvasPreset } from "../presets";

type CanvasControlsProps = {
  composition: Composition;
  transaction: ControlTransaction;
  onSetPreset: (preset: CanvasPreset) => void;
  onSetDimension: (key: "width" | "height", value: number) => void;
  onPatch: (patch: Partial<CanvasSettings>) => void;
  onToggleTransparency: (checked: boolean) => void;
  onAlignScreenshot: (horizontal: "left" | "center" | "right", vertical: "top" | "center" | "bottom") => void;
  onReset: () => void;
};

export function CanvasControls({ composition, transaction, onSetPreset, onSetDimension, onPatch, onToggleTransparency, onAlignScreenshot, onReset }: CanvasControlsProps) {
  return (
    <div className="space-y-6 p-4 sm:p-5">
      <SectionHeading title="Canvas" description="Set the size and layout of the exported image." />
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(canvasPresets) as CanvasPreset[]).map((preset) => {
          const item = canvasPresets[preset];
          const active = composition.canvas.width === item.width && composition.canvas.height === item.height;
          return <Button key={preset} variant={active ? "secondary" : "outline"} className="h-auto flex-col gap-1 py-2.5" onClick={() => onSetPreset(preset)}><span className="text-xs">{item.label}</span><span className="text-[10px] text-muted-foreground">{item.ratio}</span></Button>;
        })}
      </div>
      <FieldGrid>
        <NumberControl id="canvas-width" label="Width (px)" value={composition.canvas.width} min={200} max={MAX_CANVAS_DIMENSION} onChange={(value) => onSetDimension("width", value)} {...transaction} />
        <NumberControl id="canvas-height" label="Height (px)" value={composition.canvas.height} min={200} max={MAX_CANVAS_DIMENSION} onChange={(value) => onSetDimension("height", value)} {...transaction} />
      </FieldGrid>
      <RangeControl id="canvas-radius" label="Canvas corners" value={composition.canvas.radius} min={0} max={120} format={(number) => `${Math.round(number)} px`} onChange={(value) => onPatch({ radius: value })} {...transaction} />
      <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-muted/60 px-3 py-2.5">
        <div><Label htmlFor="transparent-corners" className="text-xs font-medium">Transparent corners</Label><p className="mt-0.5 text-[11px] text-muted-foreground">Preserve transparency in PNG exports</p></div>
        <Switch id="transparent-corners" checked={composition.canvas.transparentCorners} onCheckedChange={onToggleTransparency} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Align screenshot</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => onAlignScreenshot("left", "center")}>Left</Button>
          <Button variant="outline" size="sm" onClick={() => onAlignScreenshot("center", "center")}><AlignCenterHorizontal className="mr-1 size-3.5" /> Center</Button>
          <Button variant="outline" size="sm" onClick={() => onAlignScreenshot("right", "center")}>Right</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => onAlignScreenshot("center", "top")}>Top</Button>
          <Button variant="outline" size="sm" onClick={() => onAlignScreenshot("center", "center")}><AlignCenterVertical className="mr-1 size-3.5" /> Middle</Button>
          <Button variant="outline" size="sm" onClick={() => onAlignScreenshot("center", "bottom")}>Bottom</Button>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onReset}><RotateCcw /> Reset composition</Button>
    </div>
  );
}
