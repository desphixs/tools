import type { EncoderRequest, EncoderResponse } from "./encoder-protocol";

export type GifEncoderSession = {
  addFrame: (pixels: Uint8ClampedArray, delay: number) => Promise<void>;
  finish: () => Promise<Blob>;
  cancel: () => void;
};

export function createGifEncoderSession(options: {
  width: number;
  height: number;
  totalFrames: number;
  loop: boolean;
  onProgress: (completed: number, total: number) => void;
}): Promise<GifEncoderSession> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./gif-encoder.worker.ts", import.meta.url), { type: "module" });
    let ready = false;
    let closed = false;
    let frameResolve: (() => void) | null = null;
    let frameReject: ((error: Error) => void) | null = null;
    let finishResolve: ((blob: Blob) => void) | null = null;
    let finishReject: ((error: Error) => void) | null = null;

    const terminate = () => {
      if (closed) return;
      closed = true;
      worker.terminate();
    };

    const fail = (error: Error) => {
      if (!ready) reject(error);
      frameReject?.(error);
      finishReject?.(error);
      terminate();
    };

    worker.onerror = (event) => fail(new Error(event.message || "The GIF encoder could not start."));
    worker.onmessage = (event: MessageEvent<EncoderResponse>) => {
      const message = event.data;
      if (message.type === "ready") {
        ready = true;
        resolve({
          addFrame: (pixels, delay) => new Promise<void>((frameResolvePromise, frameRejectPromise) => {
            if (closed) return frameRejectPromise(new Error("GIF encoding was cancelled."));
            frameResolve = frameResolvePromise;
            frameReject = frameRejectPromise;
            const request: EncoderRequest = { type: "frame", pixels, delay };
            worker.postMessage(request, [pixels.buffer as ArrayBuffer]);
          }),
          finish: () => new Promise<Blob>((finishResolvePromise, finishRejectPromise) => {
            if (closed) return finishRejectPromise(new Error("GIF encoding was cancelled."));
            finishResolve = finishResolvePromise;
            finishReject = finishRejectPromise;
            const request: EncoderRequest = { type: "finish" };
            worker.postMessage(request);
          }),
          cancel: () => {
            fail(new Error("GIF encoding was cancelled."));
          },
        });
        return;
      }
      if (message.type === "frame-encoded") {
        options.onProgress(message.completedFrames, message.totalFrames);
        frameResolve?.();
        frameResolve = null;
        frameReject = null;
        return;
      }
      if (message.type === "finished") {
        const blob = new Blob([message.bytes], { type: "image/gif" });
        finishResolve?.(blob);
        finishResolve = null;
        finishReject = null;
        terminate();
        return;
      }
      fail(new Error(message.message));
    };

    const request: EncoderRequest = {
      type: "init",
      width: options.width,
      height: options.height,
      totalFrames: options.totalFrames,
      loop: options.loop,
    };
    worker.postMessage(request);
  });
}

