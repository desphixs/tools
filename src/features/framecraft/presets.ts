export const canvasPresets = {
  landscape: { width: 1200, height: 675, label: "Landscape", ratio: "16:9" },
  square: { width: 1080, height: 1080, label: "Square", ratio: "1:1" },
  portrait: { width: 1080, height: 1350, label: "Portrait", ratio: "4:5" },
  rawaxys: { width: 1600, height: 1200, label: "RawAxys Library", ratio: "4:3" },
} as const;

export type CanvasPreset = keyof typeof canvasPresets;

export const backgroundPresets = [
  { name: "Soft violet", from: "#e4dcff", to: "#f4e5de", angle: 135 },
  { name: "Warm paper", from: "#eee5d7", to: "#faf5eb", angle: 125 },
  { name: "Blue hour", from: "#d4e7f4", to: "#e3dcf2", angle: 145 },
  { name: "Night", from: "#25243b", to: "#514162", angle: 135 },
] as const;
