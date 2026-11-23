# Tools

A Next.js tools directory. It currently includes **Framecraft**, a product screenshot composer, **Collage Maker**, a multi-image collage editor, **Device Mockups**, and **GIF Maker**.

## Run locally

Use pnpm for package management. `pnpm-lock.yaml` is the primary lockfile.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev                 # Start the development server
pnpm lint                # Run ESLint
pnpm typecheck           # Type-check the application
pnpm build               # Create a production build
```

## Project structure

```text
src/
  app/                         App Router pages and global theme tokens
    tools/framecraft/          Framecraft route and loading state
    tools/collage-maker/       Collage Maker route and loading state
    tools/device-mockups/      Device Mockups route and loading state
    tools/gif-maker/           GIF Maker route and loading state
  components/                  Shared platform UI and shadcn/ui components
  features/framecraft/          Framecraft domain and editor logic
    components/                Canvas, background, screenshot and shared controls
    framecraft-editor.tsx       Editor state and orchestration
    model.ts                    Versioned composition and asset types
    presets.ts                  Canvas sizes and background presets
    render.ts                   Shared Canvas 2D preview and export renderer
    storage.ts                  Typed browser persistence boundary and IndexedDB adapter
  features/collage-maker/       Collage Maker domain, renderer, editor and storage
    collage-editor.tsx          Responsive editor state and interactions
    model.ts                    Versioned canvas, layout, cell and project types
    render.ts                   Shared Canvas 2D preview and export renderer
    storage.ts                  IndexedDB asset and recovery adapter
  features/device-mockups/      Device Mockups catalog, renderer, editor and storage
    device-mockups-editor.tsx   Catalog browsing, screen placement, projects and export
    model.ts                    Versioned template, composition and project types
    render.ts                   Perspective warp and preview/export renderer
    storage.ts                  Browser recovery and image data adapter
  features/gif-maker/           GIF Maker models, frame rendering, editor and encoder worker
    gif-maker-editor.tsx        Local source editing and export orchestration
    model.ts                    GIF settings, limits and frame sizing
    render.ts                   Shared source-to-output frame renderer
    encoder.ts                  Typed client-to-worker GIF encoding boundary
    gif-encoder.worker.ts       Frame palette mapping and GIF encoding
    media.ts                    Local video seeking and image loading
  lib/
    tools.ts                    Typed directory registry for available tools
docs/
  milestone-1.md                Product scope and phased implementation plan
  milestone-3.md                Device Mockups implementation plan
public/mockups/                 Bundled mockup scenes and thumbnails
```

Keep new tools under their own feature folders. Put reusable platform components in `src/components` and shared tool directory metadata in `src/lib/tools.ts`. Keep route modules thin and avoid sharing tool-specific code across features.

## Framecraft

Framecraft uses a single typed composition model for output size, background, screenshot frame, crop and appearance. The editor supports landscape, square, portrait and custom canvases; solid, gradient and image backgrounds; image adjustments and overlays; screenshot positioning, source-ratio locking, resizing, crop, border and shadow controls; undo/redo; original and finished previews; local templates; local project files; recovery drafts; PNG and JPEG export. Clicking the screenshot, image background, or canvas edge selects its controls. Shadow width and height start matched to the screenshot and can be adjusted independently.

The desktop editor uses a workspace beside its controls. On phones, the preview uses the available width and the controls move to an expandable bottom panel. The canvas can be manipulated with pointer or touch. Numeric fields and arrow keys provide alternatives for precise positioning and crop adjustments.

### Images, projects and templates

- Uploads accept PNG, JPEG and WebP files up to **40 MB each**. Images are limited to **16,000 pixels on either side** and **32 million pixels total**.
- Output canvases are limited to **4,096 pixels on either side** and **16 million pixels total**.
- Images, templates and recovery drafts are stored in browser IndexedDB. They are not uploaded by this application. Browser data may be cleared or evicted; recovery is best effort.
- If IndexedDB is unavailable, images can remain in memory for the current session, up to **80 MB**. Download a project file to preserve work beyond the session.
- A `.framecraft` project file contains the composition and source images. It is downloaded locally and can be reopened later. Imports are limited to **80 MB**.
- A template saves the canvas, background and screenshot styling without the main screenshot. Templates are stored in the current browser and can be removed when browser data is cleared.
- PNG preserves requested transparent corners. JPEG uses a white matte and offers a quality setting.

## Collage Maker

Collage Maker creates square, portrait, landscape, story, or custom-size compositions with up to 36 image cells. It includes equal grids, diagonal tiles, adjustable rows and columns, outer padding, cell gaps, cell shapes, independent image crop and fit, per-cell position, size, rotation, opacity and border controls, solid/gradient/image backgrounds, undo/redo, recovery drafts, portable `.collage` project files, and PNG/JPEG export. Cells can be selected and dragged directly on the canvas; their lower corner resizes them. Arrow keys move the selected cell, and numeric controls remain available for precise edits. The mobile editor keeps the canvas above a scrollable, tabbed control panel and keeps add, preview, undo, redo, and export actions in reach.

Collage Maker stores images and recovery drafts in its own IndexedDB database. Project files include the composition and source images so they can be reopened on another device. Image inputs accept PNG, JPEG, and WebP, up to 40 MB each. Canvases are limited to 4,096 pixels per side and 16 megapixels total; projects are limited to 120 MB of source images. Browser storage is best effort, so download a project file to keep a portable copy.

## GIF Maker

GIF Maker creates an animated GIF from a local MP4 or WebM clip or an ordered sequence of 2–30 PNG, JPEG, or WebP images. Video clips can be trimmed to 10 seconds, sampled at 5–15 fps, and exported at a maximum dimension of 640 pixels. The default maximum size is 320 pixels. Image frames can be reordered by dragging, keyboard sorting, or a per-frame options menu, and use one shared duration. Both modes support original, square, portrait, or landscape output, fit/crop, three output sizes, and loop-once or loop-forever behavior. On desktop, settings stay in a pinned sidebar with its own scroll area; on phones, they stack below the preview. The result is previewed and downloaded as a `.gif`.

Source media stays in memory on the device and is cleared when the page is left. Video input is limited to 100 MB; still images are limited to 40 MB each, 120 MB combined, 16,000 pixels per side, 32 megapixels each, and 80 megapixels across the sequence. GIF output uses a white matte, has no audio, and is limited to 256 colors per frame. Browser codec support varies, and the current encoder does not apply dithering, so video and photographic output can show color banding or flicker. These limits and quality tradeoffs are documented in [Milestone 2](docs/milestone-2.md).

## Device Mockups

Device Mockups places a local PNG, JPEG, or WebP screenshot into a curated laptop or monitor scene. Choose a mockup, add a screenshot, then adjust fill/fit, zoom, and horizontal or vertical position inside its screen. Use **Finished** to inspect the composition without editing guides, then download PNG or JPEG at the scene's native size or twice its resolution. A project file includes the screenshot and settings so it can be opened later.

The first catalog scenes are bundled in `public/mockups/` and have screen geometry in `src/features/device-mockups/catalog.ts`. Screenshots, local recovery drafts, and projects stay in the browser or in a project file; the app does not upload them. Local recovery is best-effort, so download a project file to keep a portable copy. The catalog and draft storage each have typed boundaries; future catalog hosting or account-backed project storage can be added without changing the perspective renderer. See [Milestone 3](docs/milestone-3.md) for the implementation plan and current decisions.

## Implementation notes

- **Rendering:** Framecraft and Collage Maker use the browser Canvas 2D API instead of adding Konva or Fabric. Each tool uses the same renderer for its editable preview and final output, so composition scaling, clipping and layer order have one source of truth. GIF Maker uses Canvas 2D to size and composite each frame before encoding. Workspace guides and selection handles are excluded from export. Framecraft's shadow spread is rendered by expanding a filled rounded shape because Canvas 2D does not expose a native shadow-spread setting.
- **GIF encoding:** GIF Maker uses `gifenc` in a feature-local Web Worker. The browser decodes local video and seeks to sampled frames; the app sends one composited frame at a time to the worker, which quantizes its palette and appends it to the GIF. This keeps CPU-heavy encoding away from the UI and avoids loading a general-purpose WebAssembly transcoder. `gifenc` has no built-in dithering or worker wrapper, so those quality limits and the worker boundary are explicit.
- **GIF image sorting:** GIF Maker uses `@dnd-kit/react` for pointer and touch drag-and-drop with keyboard sorting. A small frame options menu provides one-step moves without dragging.
- **Persistence:** Framecraft and Collage Maker use separate typed storage interfaces and IndexedDB databases. Their composition data and stable asset IDs do not depend on browser APIs, keeping each tool's domain model separate from persistence.
- **Device Mockups:** The catalog stores normalized display corners for each scene. Canvas 2D renders the screenshot into display space with a projective warp and rounded screen mask; the same function produces the preview and download. Static mockups are loaded through a catalog interface, and local recovery uses a feature-owned IndexedDB adapter. Catalog items use stable IDs and versions so a later hosted catalog can resolve the same project references.
- **Device Mockup assets:** The initial laptop and monitor scenes were generated specifically for this application and compressed to WebP. Their source and distribution notes are in [`public/mockups/README.md`](public/mockups/README.md).
- **UI:** shadcn/ui components provide common controls. Shared light and dark theme tokens live in `src/app/globals.css`; button, card, control and popover styles use those tokens. `next-themes` respects the system preference and saves an explicit theme choice.
- **Limits:** Canvas filters, memory use and export capacity vary by browser and device. Large images and output sizes can fail on constrained devices; the editor reports input, storage and export errors while preserving the current in-memory composition.

## Scope

This release has no accounts, server-side image processing, external uploads, cloud saving, analytics, billing or direct posting to X. Browser persistence and downloaded project files are separate: the browser copy is convenient and recoverable, while the downloaded project is the user's portable backup.
