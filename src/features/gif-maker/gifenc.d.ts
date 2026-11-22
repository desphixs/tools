declare module "gifenc" {
  export type GifPalette = number[][];
  export type GifFormat = "rgb565" | "rgb444" | "rgba4444";

  export type GifEncoder = {
    writeFrame(indexedPixels: Uint8Array, width: number, height: number, options?: {
      palette?: GifPalette;
      delay?: number;
      repeat?: number;
      dispose?: number;
    }): void;
    finish(): void;
    bytes(): Uint8Array;
  };

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoder;
  export function quantize(pixels: Uint8Array | Uint8ClampedArray, maxColors: number, options?: { format?: GifFormat }): GifPalette;
  export function applyPalette(pixels: Uint8Array | Uint8ClampedArray, palette: GifPalette, format?: GifFormat): Uint8Array;
}

