export type VideoMetadata = { width: number; height: number; duration: number };

function abortError() {
  return new DOMException("The operation was cancelled.", "AbortError");
}

export async function readVideoMetadata(url: string): Promise<VideoMetadata> {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("This video took too long to load. Try a smaller MP4 or WebM file.")), 15_000);
      video.onloadedmetadata = () => { window.clearTimeout(timer); resolve(); };
      video.onerror = () => { window.clearTimeout(timer); reject(new Error("This video could not be opened. Try an MP4 or WebM file your browser can play.")); };
      video.src = url;
    });
    if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration)) {
      throw new Error("This video does not have readable dimensions or duration.");
    }
    return { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export async function loadExportVideo(url: string, signal: AbortSignal) {
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => { cleanup(); reject(abortError()); };
    const onLoaded = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("The video could not be decoded for export. Try another MP4 or WebM file.")); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("The video did not prepare for export in time. Try a shorter clip.")); }, 15_000);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
    video.src = url;
    video.load();
    if (signal.aborted) onAbort();
  });
  return video;
}

export async function seekVideoFrame(video: HTMLVideoElement, time: number, signal: AbortSignal) {
  if (signal.aborted) throw abortError();
  const boundedTime = Math.max(0, Math.min(time, Math.max(0, video.duration - 0.001)));
  if (Math.abs(video.currentTime - boundedTime) < 0.001) {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { cleanup(); reject(new Error("The video frame could not be decoded in time.")); }, 5_000);
      const onReady = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error("The video frame could not be decoded.")); };
      const onAbort = () => { cleanup(); reject(abortError()); };
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
        signal.removeEventListener("abort", onAbort);
      };
      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
      signal.addEventListener("abort", onAbort, { once: true });
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onReady();
      if (signal.aborted) onAbort();
    });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("The video could not seek to a frame. Try a different file or a shorter clip.")); }, 5_000);
    const onSeeked = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("The video stopped decoding during export. Try another file.")); };
    const onAbort = () => { cleanup(); reject(abortError()); };
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      video.currentTime = boundedTime;
    } catch {
      cleanup();
      reject(new Error("The video could not seek to a frame. Try another file."));
    }
    if (signal.aborted) onAbort();
  });
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error("The video frame could not be decoded.")); };
      const onAbort = () => { cleanup(); reject(abortError()); };
      const timer = window.setTimeout(() => { cleanup(); reject(new Error("The video frame could not be decoded in time.")); }, 5_000);
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
        signal.removeEventListener("abort", onAbort);
      };
      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
    });
  }
}

export function loadImage(url: string): Promise<{ image: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) return reject(new Error("This image has no readable dimensions."));
      resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => reject(new Error("An image could not be opened. Try PNG, JPEG, or WebP files."));
    image.src = url;
  });
}

