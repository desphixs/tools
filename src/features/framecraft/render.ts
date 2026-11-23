import type { Composition, ScreenshotSettings } from "./model";

export type LoadedImage = { image: CanvasImageSource; width: number; height: number };

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(Math.max(radius, 0), width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function drawGradient(ctx: CanvasRenderingContext2D, width: number, height: number, from: string, to: string, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  const length = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const cx = width / 2;
  const cy = height / 2;
  const dx = Math.cos(radians) * length / 2;
  const dy = Math.sin(radians) * length / 2;
  const gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function fitRect(iw: number, ih: number, x: number, y: number, width: number, height: number, fit: "cover" | "contain", zoom: number, offsetX: number, offsetY: number) {
  const scale = (fit === "cover" ? Math.max(width / iw, height / ih) : Math.min(width / iw, height / ih)) * zoom;
  const drawWidth = iw * scale;
  const drawHeight = ih * scale;
  return {
    x: x + (width - drawWidth) / 2 + offsetX,
    y: y + (height - drawHeight) / 2 + offsetY,
    width: drawWidth,
    height: drawHeight,
  };
}

function drawBackground(ctx: CanvasRenderingContext2D, composition: Composition, images: Map<string, LoadedImage>) {
  const { width, height, transparentCorners } = composition.canvas;
  const bg = composition.background;

  if (transparentCorners) {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
  }

  if (bg.type === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === "gradient") {
    drawGradient(ctx, width, height, bg.gradientFrom, bg.gradientTo, bg.gradientAngle);
  } else if (bg.type === "image" && bg.assetId) {
    const loaded = images.get(bg.assetId);
    if (loaded) {
      ctx.save();
      roundedRectPath(ctx, 0, 0, width, height, composition.canvas.radius);
      ctx.clip();
      ctx.globalAlpha = bg.opacity / 100;
      ctx.filter = `blur(${bg.blur}px) brightness(${bg.brightness}%) contrast(${bg.contrast}%) saturate(${bg.saturation}%) grayscale(${bg.grayscale}%)`;
      const rect = fitRect(
        loaded.width,
        loaded.height,
        0,
        0,
        width,
        height,
        bg.fit,
        bg.zoom,
        (bg.x / 100) * width,
        (bg.y / 100) * height,
      );
      ctx.drawImage(loaded.image, rect.x, rect.y, rect.width, rect.height);
      ctx.restore();
      ctx.filter = "none";
    }
  }

  if (bg.texture > 0) {
    ctx.save();
    ctx.globalAlpha = (bg.texture / 100) * 0.14;
    const tile = document.createElement("canvas");
    tile.width = tile.height = 18;
    const tileContext = tile.getContext("2d");
    if (tileContext) {
      tileContext.fillStyle = "rgba(255,255,255,0.75)";
      tileContext.fillRect(2, 2, 1, 1);
      tileContext.fillRect(11, 7, 1, 1);
      tileContext.fillRect(6, 14, 1, 1);
      const pattern = ctx.createPattern(tile, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
    }
    ctx.restore();
  }

  if (bg.vignette > 0) {
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.14, width / 2, height / 2, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, "#00000000");
    vignette.addColorStop(1, `rgba(10, 8, 20, ${Math.min(0.82, bg.vignette / 100)})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  if (bg.overlayType === "solid" && bg.overlayOpacity > 0) {
    ctx.globalAlpha = bg.overlayOpacity / 100;
    ctx.fillStyle = bg.overlayColor;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  } else if (bg.overlayType === "gradient" && bg.overlayOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = bg.overlayOpacity / 100;
    drawGradient(ctx, width, height, bg.overlayColor, bg.overlayColorEnd, bg.overlayAngle);
    ctx.restore();
  }
}

function drawScreenshot(ctx: CanvasRenderingContext2D, settings: ScreenshotSettings, loaded: LoadedImage | undefined, selected: boolean, selectionColor: string) {
  if (!settings.assetId || !loaded) return;
  const { x, y, width, height, rotation } = settings;
  const cx = x + width / 2;
  const cy = y + height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = settings.opacity / 100;

  roundedRectPath(ctx, -width / 2, -height / 2, width, height, settings.cornerRadius);
  if (settings.shadowEnabled && settings.shadowOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = settings.shadowOpacity / 100;
    ctx.fillStyle = settings.shadowColor;
    ctx.shadowColor = settings.shadowColor;
    ctx.shadowBlur = settings.shadowBlur;
    ctx.shadowOffsetX = settings.shadowX;
    ctx.shadowOffsetY = settings.shadowY;
    const shadowWidth = settings.shadowWidth ?? width;
    const shadowHeight = settings.shadowHeight ?? height;
    const spread = settings.shadowSpread;
    roundedRectPath(
      ctx,
      -shadowWidth / 2 - spread,
      -shadowHeight / 2 - spread,
      shadowWidth + spread * 2,
      shadowHeight + spread * 2,
      settings.cornerRadius + spread,
    );
    ctx.fill();
    ctx.restore();
  }

  roundedRectPath(ctx, -width / 2, -height / 2, width, height, settings.cornerRadius);
  ctx.clip();
  if (settings.fit === "contain") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-width / 2, -height / 2, width, height);
  }
  const rect = fitRect(
    loaded.width,
    loaded.height,
    -width / 2,
    -height / 2,
    width,
    height,
    settings.fit,
    settings.cropZoom,
    (settings.cropX / 100) * width,
    (settings.cropY / 100) * height,
  );
  ctx.drawImage(loaded.image, rect.x, rect.y, rect.width, rect.height);
  if (settings.innerShadowEnabled && settings.innerShadowOpacity > 0) {
    const spread = Math.min(settings.innerShadowSpread, Math.max(0, Math.min(width, height) / 2 - 1));
    const innerWidth = Math.max(1, width - spread * 2);
    const innerHeight = Math.max(1, height - spread * 2);
    const shadowPadding = settings.innerShadowBlur * 3 + Math.abs(settings.innerShadowX) + Math.abs(settings.innerShadowY) + spread + 1;
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = settings.innerShadowOpacity / 100;
    ctx.shadowColor = settings.innerShadowColor;
    ctx.shadowBlur = settings.innerShadowBlur;
    ctx.shadowOffsetX = settings.innerShadowX;
    ctx.shadowOffsetY = settings.innerShadowY;
    ctx.fillStyle = settings.innerShadowColor;
    ctx.beginPath();
    ctx.rect(-width / 2 - shadowPadding, -height / 2 - shadowPadding, width + shadowPadding * 2, height + shadowPadding * 2);
    ctx.roundRect(-innerWidth / 2, -innerHeight / 2, innerWidth, innerHeight, Math.max(0, settings.cornerRadius - spread));
    ctx.fill("evenodd");
    ctx.restore();
  }
  ctx.restore();

  if (settings.borderWidth > 0 && settings.borderOpacity > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.globalAlpha = settings.borderOpacity / 100;
    const borderOffset = settings.borderWidth / 2 * (settings.borderPosition === "outside" ? -1 : 1);
    roundedRectPath(
      ctx,
      -width / 2 + borderOffset,
      -height / 2 + borderOffset,
      width - borderOffset * 2,
      height - borderOffset * 2,
      Math.max(0, settings.cornerRadius - borderOffset),
    );
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = settings.borderWidth;
    ctx.stroke();
    ctx.restore();
  }

  if (selected) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = selectionColor;
    ctx.lineWidth = Math.max(1.5, width / 450);
    ctx.setLineDash([8, 6]);
    roundedRectPath(ctx, -width / 2 - 2, -height / 2 - 2, width + 4, height + 4, settings.cornerRadius);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = selectionColor;
    ctx.lineWidth = Math.max(2, width / 300);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.max(7, width / 70), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export function renderComposition(
  canvas: HTMLCanvasElement,
  composition: Composition,
  images: Map<string, LoadedImage>,
  selected = false,
  comparison = false,
  jpegMatte?: string,
  showGuides = false,
  selectionColor = "#7047eb",
  outputScale = 1,
) {
  const { width, height, radius, transparentCorners } = composition.canvas;
  const outputWidth = Math.round(width * outputScale);
  const outputHeight = Math.round(height * outputScale);
  if (canvas.width !== outputWidth || canvas.height !== outputHeight) {
    canvas.width = outputWidth;
    canvas.height = outputHeight;
  }
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas rendering is not available in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (outputScale !== 1) ctx.scale(outputScale, outputScale);
  ctx.clearRect(0, 0, width, height);

  if (!transparentCorners || jpegMatte) {
    ctx.fillStyle = jpegMatte ?? (transparentCorners ? "#ffffff" : composition.background.color);
    ctx.fillRect(0, 0, width, height);
  }
  ctx.save();
  roundedRectPath(ctx, 0, 0, width, height, radius);
  ctx.clip();
  if (comparison && composition.screenshot.assetId) {
    const source = images.get(composition.screenshot.assetId);
    if (source) {
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, width, height);
      const fit = fitRect(source.width, source.height, 0, 0, width, height, "contain", 1, 0, 0);
      ctx.drawImage(source.image, fit.x, fit.y, fit.width, fit.height);
    }
  } else {
    drawBackground(ctx, composition, images);
    if (selected && showGuides && composition.screenshot.assetId) {
      const screenshot = composition.screenshot;
      const nearCenterX = Math.abs(screenshot.x + screenshot.width / 2 - width / 2) < width * 0.035;
      const nearCenterY = Math.abs(screenshot.y + screenshot.height / 2 - height / 2) < height * 0.035;
      ctx.save();
      ctx.strokeStyle = selectionColor;
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = Math.max(1, width / 1200);
      ctx.setLineDash([10, 9]);
      if (nearCenterX) {
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
      }
      if (nearCenterY) {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    drawScreenshot(ctx, composition.screenshot, composition.screenshot.assetId ? images.get(composition.screenshot.assetId) : undefined, selected, selectionColor);
  }
  ctx.restore();

  if (radius > 0 && !transparentCorners) {
    ctx.save();
    roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, radius);
    ctx.strokeStyle = "rgba(20,16,34,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

export function hitTestScreenshot(settings: ScreenshotSettings, x: number, y: number) {
  const radians = (-settings.rotation * Math.PI) / 180;
  const cx = settings.x + settings.width / 2;
  const cy = settings.y + settings.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const localX = dx * Math.cos(radians) - dy * Math.sin(radians) + settings.width / 2;
  const localY = dx * Math.sin(radians) + dy * Math.cos(radians) + settings.height / 2;
  return { inside: localX >= 0 && localX <= settings.width && localY >= 0 && localY <= settings.height, resize: localX > settings.width - 36 && localY > settings.height - 36 };
}
