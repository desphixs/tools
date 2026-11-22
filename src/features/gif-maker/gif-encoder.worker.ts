import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { EncoderRequest, EncoderResponse } from "./encoder-protocol";

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<EncoderRequest>) => void) | null;
  postMessage: (response: EncoderResponse, transfer?: Transferable[]) => void;
};
let encoder: ReturnType<typeof GIFEncoder> | null = null;
let frameWidth = 0;
let frameHeight = 0;
let totalFrames = 0;
let completedFrames = 0;
let loop = true;

function respond(response: EncoderResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(response, transfer);
}

workerScope.onmessage = (event: MessageEvent<EncoderRequest>) => {
  try {
    const message = event.data;
    if (message.type === "init") {
      frameWidth = message.width;
      frameHeight = message.height;
      totalFrames = message.totalFrames;
      completedFrames = 0;
      loop = message.loop;
      encoder = GIFEncoder({ initialCapacity: frameWidth * frameHeight });
      respond({ type: "ready" });
      return;
    }

    if (!encoder) throw new Error("The GIF encoder is not ready.");

    if (message.type === "frame") {
      const palette = quantize(message.pixels, 256);
      const indexedPixels = applyPalette(message.pixels, palette);
      encoder.writeFrame(indexedPixels, frameWidth, frameHeight, {
        palette,
        delay: message.delay,
        ...(completedFrames === 0 ? { repeat: loop ? 0 : -1 } : {}),
      });
      completedFrames += 1;
      respond({ type: "frame-encoded", completedFrames, totalFrames });
      return;
    }

    encoder.finish();
    const bytes = encoder.bytes();
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    encoder = null;
    respond({ type: "finished", bytes: buffer }, [buffer]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GIF encoding failed.";
    respond({ type: "error", message });
  }
};

