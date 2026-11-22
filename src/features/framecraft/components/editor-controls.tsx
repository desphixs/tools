"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export type ControlTransaction = {
  onStart: () => void;
  onEnd: () => void;
};

export function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  format = (number: number) => `${Math.round(number)}`,
  onChange,
  onStart,
  onEnd,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
} & ControlTransaction) {
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
        <span className="min-w-10 text-right text-xs tabular-nums text-foreground">{format(value)}</span>
      </div>
      <Slider
        id={id}
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(typeof values === "number" ? values : values[0] ?? value)}
      />
    </div>
  );
}

export function NumberControl({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onStart,
  onEnd,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
} & ControlTransaction) {
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const displayedValue = focused && draft !== null ? draft : String(value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={displayedValue}
        onFocus={() => { setFocused(true); onStart(); }}
        onBlur={() => {
          setFocused(false);
          const finalValue = Number(draft);
          if (!Number.isFinite(finalValue) || draft?.trim() === "" || (min !== undefined && finalValue < min) || (max !== undefined && finalValue > max)) setDraft(null);
          else setDraft(null);
          onEnd();
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const numeric = Number(next);
          if (next.trim() !== "" && Number.isFinite(numeric) && (min === undefined || numeric >= min) && (max === undefined || numeric <= max)) onChange(numeric);
        }}
        className="h-9 tabular-nums"
      />
    </div>
  );
}

export function ColorControl({
  id,
  label,
  value,
  onChange,
  onStart,
  onEnd,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
} & ControlTransaction) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const displayedValue = focused ? draft : value;
  const validColor = /^#[0-9a-f]{6}$/i.test(displayedValue);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}
          onFocus={() => { setDraft(value); setFocused(true); onStart(); }}
          onBlur={() => { setFocused(false); onEnd(); }}
          onChange={(event) => { setDraft(event.target.value); onChange(event.target.value); }}
          className="h-9 w-10 cursor-pointer rounded-[var(--radius-control)] border border-input bg-background p-1"
        />
        <Input
          id={id}
          value={displayedValue}
          aria-invalid={!validColor && focused}
          onFocus={() => { setDraft(value); setFocused(true); onStart(); }}
          onBlur={() => {
            setFocused(false);
            if (!validColor) setDraft(value);
            else onChange(displayedValue.toUpperCase());
            onEnd();
          }}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toUpperCase());
          }}
          className="h-9 font-mono text-xs uppercase"
        />
      </div>
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SelectField({ label, value, options, onChange, transaction }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void; transaction?: ControlTransaction }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(next) => {
        if (!next) return;
        transaction?.onStart();
        onChange(next);
        transaction?.onEnd();
      }}>
        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([option, text]) => <SelectItem key={option} value={option}>{text}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
