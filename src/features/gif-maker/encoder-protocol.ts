export type EncoderRequest =
  | { type: "init"; width: number; height: number; totalFrames: number; loop: boolean }
  | { type: "frame"; pixels: Uint8ClampedArray; delay: number }
  | { type: "finish" };

export type EncoderResponse =
  | { type: "ready" }
  | { type: "frame-encoded"; completedFrames: number; totalFrames: number }
  | { type: "finished"; bytes: ArrayBuffer }
  | { type: "error"; message: string };

